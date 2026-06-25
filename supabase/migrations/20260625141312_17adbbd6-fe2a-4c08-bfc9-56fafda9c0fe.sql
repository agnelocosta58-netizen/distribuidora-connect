
-- Drop unused rateio (will be replaced by expenses/cost allocations)
DROP TABLE IF EXISTS public.rateio_participants CASCADE;
DROP TABLE IF EXISTS public.rateio_groups CASCADE;

-- Sale paid timestamp
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS pago_em TIMESTAMPTZ;

-- Product real cost from allocation
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS custo_real NUMERIC(14,4);

-- Expenses
CREATE TABLE public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  descricao TEXT NOT NULL,
  categoria TEXT NOT NULL,
  valor NUMERIC(14,2) NOT NULL CHECK (valor >= 0),
  competencia DATE NOT NULL DEFAULT CURRENT_DATE,
  recorrente BOOLEAN NOT NULL DEFAULT false,
  observacao TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expenses TO authenticated;
GRANT ALL ON public.expenses TO service_role;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "expenses_company_select" ON public.expenses FOR SELECT TO authenticated
  USING (company_id = public.current_company_id());
CREATE POLICY "expenses_company_all" ON public.expenses FOR ALL TO authenticated
  USING (company_id = public.current_company_id() AND public.has_any_role(auth.uid(), ARRAY['admin','gerente']::app_role[]))
  WITH CHECK (company_id = public.current_company_id());
CREATE TRIGGER expenses_updated BEFORE UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Cost allocations
CREATE TYPE public.allocation_method AS ENUM ('quantidade','faturamento','categoria','percentual');

CREATE TABLE public.cost_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  periodo_inicio DATE NOT NULL,
  periodo_fim DATE NOT NULL,
  metodo public.allocation_method NOT NULL DEFAULT 'quantidade',
  total_despesas NUMERIC(14,2) NOT NULL DEFAULT 0,
  observacao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cost_allocations TO authenticated;
GRANT ALL ON public.cost_allocations TO service_role;
ALTER TABLE public.cost_allocations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cost_alloc_company_all" ON public.cost_allocations FOR ALL TO authenticated
  USING (company_id = public.current_company_id())
  WITH CHECK (company_id = public.current_company_id());
CREATE TRIGGER cost_alloc_updated BEFORE UPDATE ON public.cost_allocations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.product_cost_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  allocation_id UUID NOT NULL REFERENCES public.cost_allocations(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  quantidade_vendida NUMERIC(14,3) NOT NULL DEFAULT 0,
  faturamento NUMERIC(14,2) NOT NULL DEFAULT 0,
  percentual NUMERIC(7,4) NOT NULL DEFAULT 0,
  valor_rateado NUMERIC(14,4) NOT NULL DEFAULT 0,
  custo_real NUMERIC(14,4) NOT NULL DEFAULT 0,
  margem_real NUMERIC(7,4) NOT NULL DEFAULT 0,
  lucro_liquido NUMERIC(14,4) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (allocation_id, product_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_cost_allocations TO authenticated;
GRANT ALL ON public.product_cost_allocations TO service_role;
ALTER TABLE public.product_cost_allocations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pca_company_all" ON public.product_cost_allocations FOR ALL TO authenticated
  USING (company_id = public.current_company_id())
  WITH CHECK (company_id = public.current_company_id());

-- Realtime for pix payment confirmation
ALTER PUBLICATION supabase_realtime ADD TABLE public.pix_transactions;
ALTER TABLE public.pix_transactions REPLICA IDENTITY FULL;

-- Recompute function: distributes total expenses across products in period
CREATE OR REPLACE FUNCTION public.recompute_cost_allocation(_allocation_id UUID, _percent_map JSONB DEFAULT NULL)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  alloc RECORD;
  total_expenses NUMERIC;
  total_qty NUMERIC;
  total_rev NUMERIC;
BEGIN
  SELECT * INTO alloc FROM public.cost_allocations WHERE id = _allocation_id;
  IF alloc IS NULL THEN RAISE EXCEPTION 'allocation not found'; END IF;

  SELECT COALESCE(SUM(valor),0) INTO total_expenses
    FROM public.expenses
    WHERE company_id = alloc.company_id
      AND competencia BETWEEN alloc.periodo_inicio AND alloc.periodo_fim;

  UPDATE public.cost_allocations SET total_despesas = total_expenses WHERE id = _allocation_id;

  DELETE FROM public.product_cost_allocations WHERE allocation_id = _allocation_id;

  -- Aggregate sales per product in period
  WITH per_prod AS (
    SELECT si.product_id,
           SUM(si.quantidade) AS qtd,
           SUM(si.total) AS faturamento
    FROM public.sale_items si
    JOIN public.sales s ON s.id = si.sale_id
    WHERE s.company_id = alloc.company_id
      AND s.created_at::date BETWEEN alloc.periodo_inicio AND alloc.periodo_fim
      AND s.status <> 'cancelado'
    GROUP BY si.product_id
  )
  SELECT COALESCE(SUM(qtd),0), COALESCE(SUM(faturamento),0) INTO total_qty, total_rev FROM per_prod;

  INSERT INTO public.product_cost_allocations (
    allocation_id, product_id, company_id, quantidade_vendida, faturamento, percentual,
    valor_rateado, custo_real, margem_real, lucro_liquido
  )
  SELECT
    _allocation_id,
    p.id,
    alloc.company_id,
    COALESCE(pp.qtd, 0),
    COALESCE(pp.faturamento, 0),
    CASE alloc.metodo
      WHEN 'quantidade' THEN CASE WHEN total_qty > 0 THEN COALESCE(pp.qtd,0)/total_qty ELSE 0 END
      WHEN 'faturamento' THEN CASE WHEN total_rev > 0 THEN COALESCE(pp.faturamento,0)/total_rev ELSE 0 END
      WHEN 'percentual' THEN COALESCE((_percent_map->>p.id::text)::numeric, 0) / 100.0
      ELSE 0
    END AS pct,
    0, 0, 0, 0
  FROM public.products p
  LEFT JOIN per_prod pp ON pp.product_id = p.id
  WHERE p.company_id = alloc.company_id AND p.ativo = true;

  UPDATE public.product_cost_allocations pca
  SET valor_rateado = ROUND(total_expenses * pca.percentual, 4),
      custo_real = ROUND(COALESCE(p.preco_custo,0) + total_expenses * pca.percentual / NULLIF(pca.quantidade_vendida, 0), 4),
      margem_real = CASE WHEN p.preco_venda > 0
        THEN ROUND((p.preco_venda - (COALESCE(p.preco_custo,0) + total_expenses * pca.percentual / NULLIF(pca.quantidade_vendida, 0))) / p.preco_venda, 4)
        ELSE 0 END,
      lucro_liquido = ROUND((p.preco_venda - (COALESCE(p.preco_custo,0) + total_expenses * pca.percentual / NULLIF(pca.quantidade_vendida, 0))) * pca.quantidade_vendida, 4)
  FROM public.products p
  WHERE pca.allocation_id = _allocation_id AND pca.product_id = p.id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.recompute_cost_allocation(UUID, JSONB) TO authenticated;
