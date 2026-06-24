ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cpf TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS profiles_cpf_company_uniq ON public.profiles (company_id, cpf) WHERE cpf IS NOT NULL;