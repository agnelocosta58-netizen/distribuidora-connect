
CREATE TYPE public.variant_pack AS ENUM ('unidade','fardo','caixa');
CREATE TYPE public.variant_temp AS ENUM ('quente','gelado');

CREATE TABLE public.product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  tipo public.variant_pack NOT NULL,
  temperatura public.variant_temp NOT NULL,
  unidades_por_pacote INTEGER NOT NULL DEFAULT 1,
  codigo_barras TEXT,
  estoque NUMERIC(12,3) NOT NULL DEFAULT 0,
  estoque_minimo NUMERIC(12,3) NOT NULL DEFAULT 0,
  preco_custo NUMERIC(12,2) NOT NULL DEFAULT 0,
  preco_venda NUMERIC(12,2) NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (product_id, tipo, temperatura)
);
CREATE INDEX idx_variants_company ON public.product_variants(company_id);
CREATE INDEX idx_variants_product ON public.product_variants(product_id);
CREATE INDEX idx_variants_barcode ON public.product_variants(company_id, codigo_barras);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_variants TO authenticated;
GRANT ALL ON public.product_variants TO service_role;

ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant select" ON public.product_variants FOR SELECT TO authenticated
  USING (company_id = public.current_company_id());
CREATE POLICY "tenant write" ON public.product_variants FOR ALL TO authenticated
  USING (company_id = public.current_company_id() AND public.has_any_role(auth.uid(), ARRAY['admin','gerente']::public.app_role[]))
  WITH CHECK (company_id = public.current_company_id());

CREATE TRIGGER trg_variants_updated_at BEFORE UPDATE ON public.product_variants
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Allow movements & sale items to reference a variant (nullable for legacy rows)
ALTER TABLE public.stock_movements
  ADD COLUMN variant_id UUID REFERENCES public.product_variants(id) ON DELETE SET NULL;
ALTER TABLE public.sale_items
  ADD COLUMN variant_id UUID REFERENCES public.product_variants(id) ON DELETE SET NULL;

-- Update existing triggers to also adjust variant stock when variant_id is set
CREATE OR REPLACE FUNCTION public.apply_stock_movement()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.tipo IN ('entrada','devolucao') THEN
    UPDATE public.products SET estoque = estoque + NEW.quantidade WHERE id = NEW.product_id;
    IF NEW.variant_id IS NOT NULL THEN
      UPDATE public.product_variants SET estoque = estoque + NEW.quantidade WHERE id = NEW.variant_id;
    END IF;
  ELSIF NEW.tipo = 'saida' THEN
    UPDATE public.products SET estoque = estoque - NEW.quantidade WHERE id = NEW.product_id;
    IF NEW.variant_id IS NOT NULL THEN
      UPDATE public.product_variants SET estoque = estoque - NEW.quantidade WHERE id = NEW.variant_id;
    END IF;
  ELSIF NEW.tipo = 'ajuste' THEN
    UPDATE public.products SET estoque = NEW.quantidade WHERE id = NEW.product_id;
    IF NEW.variant_id IS NOT NULL THEN
      UPDATE public.product_variants SET estoque = NEW.quantidade WHERE id = NEW.variant_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.apply_sale_item_stock()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.products SET estoque = estoque - NEW.quantidade WHERE id = NEW.product_id;
    IF NEW.variant_id IS NOT NULL THEN
      UPDATE public.product_variants SET estoque = estoque - NEW.quantidade WHERE id = NEW.variant_id;
    END IF;
    INSERT INTO public.stock_movements (company_id, product_id, variant_id, tipo, quantidade, preco_unitario, sale_id, user_id)
      VALUES (NEW.company_id, NEW.product_id, NEW.variant_id, 'venda', NEW.quantidade, NEW.preco_unitario, NEW.sale_id, auth.uid());
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.products SET estoque = estoque + OLD.quantidade WHERE id = OLD.product_id;
    IF OLD.variant_id IS NOT NULL THEN
      UPDATE public.product_variants SET estoque = estoque + OLD.quantidade WHERE id = OLD.variant_id;
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;
