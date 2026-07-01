CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT _user_id = auth.uid()
     AND lower(coalesce(auth.jwt() ->> 'email', '')) = 'joao.pedro.am@icloud.com';
$$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT _user_id = auth.uid()
     AND EXISTS (
       SELECT 1
       FROM public.user_roles
       WHERE user_id = _user_id
         AND role = _role
     );
$$;

CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _permission text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT public.is_super_admin(_user_id)
    OR public.has_role(_user_id, 'admin'::public.app_role)
    OR (
      _user_id = auth.uid()
      AND EXISTS (
        SELECT 1
        FROM public.role_permissions rp
        JOIN public.user_roles ur ON ur.role = rp.role
        WHERE ur.user_id = _user_id
          AND rp.permission = _permission
          AND rp.allowed = true
      )
    );
$$;

CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS public.app_role
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT CASE
    WHEN public.is_super_admin(auth.uid()) THEN 'admin'::public.app_role
    ELSE (
      SELECT role
      FROM public.user_roles
      WHERE user_id = auth.uid()
      LIMIT 1
    )
  END;
$$;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_super_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_permission(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated;