
CREATE TABLE public.bank_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'mercado_pago',
  access_token TEXT,
  api_key TEXT,
  public_key TEXT,
  client_id TEXT,
  client_secret TEXT,
  webhook_secret TEXT,
  ambiente TEXT NOT NULL DEFAULT 'producao' CHECK (ambiente IN ('producao','sandbox')),
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bank_integrations TO authenticated;
GRANT ALL ON public.bank_integrations TO service_role;

ALTER TABLE public.bank_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company admins manage bank integrations"
  ON public.bank_integrations FOR ALL TO authenticated
  USING (company_id = public.current_company_id() AND public.has_any_role(auth.uid(), ARRAY['admin','gerente']::app_role[]))
  WITH CHECK (company_id = public.current_company_id() AND public.has_any_role(auth.uid(), ARRAY['admin','gerente']::app_role[]));

CREATE TRIGGER bank_integrations_updated_at
  BEFORE UPDATE ON public.bank_integrations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX bank_integrations_company_active_idx
  ON public.bank_integrations(company_id, ativo, provider);
