
CREATE TYPE public.rateio_status AS ENUM ('aberto','fechado','cancelado');
CREATE TYPE public.pix_key_type AS ENUM ('cpf','cnpj','email','telefone','aleatoria');
CREATE TYPE public.pix_tx_status AS ENUM ('pendente','pago','cancelado','expirado');

CREATE TABLE public.rateio_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  descricao TEXT,
  valor_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  status public.rateio_status NOT NULL DEFAULT 'aberto',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rateio_groups TO authenticated;
GRANT ALL ON public.rateio_groups TO service_role;
ALTER TABLE public.rateio_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant select" ON public.rateio_groups FOR SELECT TO authenticated USING (company_id = public.current_company_id());
CREATE POLICY "tenant write" ON public.rateio_groups FOR ALL TO authenticated
  USING (company_id = public.current_company_id())
  WITH CHECK (company_id = public.current_company_id());
CREATE TRIGGER trg_rateio_groups_updated_at BEFORE UPDATE ON public.rateio_groups
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.rateio_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES public.rateio_groups(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  valor_devido NUMERIC(12,2) NOT NULL DEFAULT 0,
  valor_pago NUMERIC(12,2) NOT NULL DEFAULT 0,
  pago_em TIMESTAMPTZ,
  observacao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_rateio_part_group ON public.rateio_participants(group_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rateio_participants TO authenticated;
GRANT ALL ON public.rateio_participants TO service_role;
ALTER TABLE public.rateio_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant select" ON public.rateio_participants FOR SELECT TO authenticated USING (company_id = public.current_company_id());
CREATE POLICY "tenant write" ON public.rateio_participants FOR ALL TO authenticated
  USING (company_id = public.current_company_id())
  WITH CHECK (company_id = public.current_company_id());
CREATE TRIGGER trg_rateio_part_updated_at BEFORE UPDATE ON public.rateio_participants
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.pix_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  tipo public.pix_key_type NOT NULL,
  chave TEXT NOT NULL,
  banco TEXT,
  titular TEXT,
  padrao BOOLEAN NOT NULL DEFAULT false,
  ativa BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, chave)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pix_keys TO authenticated;
GRANT ALL ON public.pix_keys TO service_role;
ALTER TABLE public.pix_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant select" ON public.pix_keys FOR SELECT TO authenticated USING (company_id = public.current_company_id());
CREATE POLICY "tenant write" ON public.pix_keys FOR ALL TO authenticated
  USING (company_id = public.current_company_id() AND public.has_any_role(auth.uid(), ARRAY['admin','gerente']::public.app_role[]))
  WITH CHECK (company_id = public.current_company_id());
CREATE TRIGGER trg_pix_keys_updated_at BEFORE UPDATE ON public.pix_keys
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.pix_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  sale_id UUID,
  pix_key_id UUID REFERENCES public.pix_keys(id) ON DELETE SET NULL,
  valor NUMERIC(12,2) NOT NULL,
  status public.pix_tx_status NOT NULL DEFAULT 'pendente',
  txid TEXT,
  qr_payload TEXT,
  provider TEXT,
  provider_payload JSONB,
  pago_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_pix_tx_company ON public.pix_transactions(company_id);
CREATE INDEX idx_pix_tx_sale ON public.pix_transactions(sale_id);
CREATE INDEX idx_pix_tx_txid ON public.pix_transactions(txid);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pix_transactions TO authenticated;
GRANT ALL ON public.pix_transactions TO service_role;
ALTER TABLE public.pix_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant select" ON public.pix_transactions FOR SELECT TO authenticated USING (company_id = public.current_company_id());
CREATE POLICY "tenant write" ON public.pix_transactions FOR ALL TO authenticated
  USING (company_id = public.current_company_id())
  WITH CHECK (company_id = public.current_company_id());
CREATE TRIGGER trg_pix_tx_updated_at BEFORE UPDATE ON public.pix_transactions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
