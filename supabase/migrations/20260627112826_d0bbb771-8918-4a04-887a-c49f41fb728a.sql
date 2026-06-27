CREATE OR REPLACE FUNCTION public.current_company_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT company_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;
REVOKE EXECUTE ON FUNCTION public.current_company_id() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.current_company_id() TO authenticated, service_role;