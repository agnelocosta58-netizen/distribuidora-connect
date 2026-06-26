
-- 1) Scope role checks to current company
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
      AND company_id = public.current_company_id()
  );
$$;

CREATE OR REPLACE FUNCTION public.has_any_role(_user_id uuid, _roles app_role[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role = ANY(_roles)
      AND company_id = public.current_company_id()
  );
$$;

-- current_company_id reads own profile (own-profile SELECT policy exists) — safe as INVOKER
CREATE OR REPLACE FUNCTION public.current_company_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT company_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;

-- 2) Remove always-true companies INSERT policy (handle_new_user trigger creates the company)
DROP POLICY IF EXISTS "cria empresa no signup" ON public.companies;

-- 3) Remove self-insert escalation on user_roles (initial role assigned by handle_new_user trigger)
DROP POLICY IF EXISTS "inserir proprio role no signup" ON public.user_roles;

-- 4) Restrict EXECUTE on internal SECURITY DEFINER functions (triggers + admin RPC)
REVOKE EXECUTE ON FUNCTION public.apply_stock_movement() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.apply_sale_item_stock() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.recompute_cost_allocation(uuid, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.recompute_cost_allocation(uuid, jsonb) TO service_role;

-- 5) Scope company-assets storage bucket to caller's company (path prefix = company_id)
DROP POLICY IF EXISTS "company-assets delete" ON storage.objects;
DROP POLICY IF EXISTS "company-assets insert" ON storage.objects;
DROP POLICY IF EXISTS "company-assets read"   ON storage.objects;
DROP POLICY IF EXISTS "company-assets update" ON storage.objects;

CREATE POLICY "company-assets read" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'company-assets'
    AND (storage.foldername(name))[1] = (public.current_company_id())::text
  );

CREATE POLICY "company-assets insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'company-assets'
    AND (storage.foldername(name))[1] = (public.current_company_id())::text
  );

CREATE POLICY "company-assets update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'company-assets'
    AND (storage.foldername(name))[1] = (public.current_company_id())::text
  )
  WITH CHECK (
    bucket_id = 'company-assets'
    AND (storage.foldername(name))[1] = (public.current_company_id())::text
  );

CREATE POLICY "company-assets delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'company-assets'
    AND (storage.foldername(name))[1] = (public.current_company_id())::text
  );
