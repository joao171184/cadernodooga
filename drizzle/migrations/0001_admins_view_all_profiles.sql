CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
 RETURNS boolean LANGUAGE sql STABLE SET search_path TO 'public'
AS $$
  SELECT _user_id = auth.uid()
     AND lower(coalesce(auth.jwt() ->> 'email', '')) IN ('joao.pedro.am.171@gmail.com');
$$;

CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));