-- Admins (não só super-admins) podem trocar o grupo de outros usuários e editar a matriz de permissões.
-- Ninguém altera o próprio papel por aqui, para não ficar sem administradores por engano.
-- Idempotente. ROLLBACK no fim do arquivo.

DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
CREATE POLICY "Admins can insert roles" ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (
    (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.is_super_admin(auth.uid()))
    AND user_id <> auth.uid()
  );

DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;
CREATE POLICY "Admins can update roles" ON public.user_roles FOR UPDATE TO authenticated
  USING (
    (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.is_super_admin(auth.uid()))
    AND user_id <> auth.uid()
  )
  WITH CHECK (
    (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.is_super_admin(auth.uid()))
    AND user_id <> auth.uid()
  );

DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;
CREATE POLICY "Admins can delete roles" ON public.user_roles FOR DELETE TO authenticated
  USING (
    (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.is_super_admin(auth.uid()))
    AND user_id <> auth.uid()
  );

DROP POLICY IF EXISTS "Admins can insert permissions" ON public.role_permissions;
CREATE POLICY "Admins can insert permissions" ON public.role_permissions FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can update permissions" ON public.role_permissions;
CREATE POLICY "Admins can update permissions" ON public.role_permissions FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.is_super_admin(auth.uid()))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can delete permissions" ON public.role_permissions;
CREATE POLICY "Admins can delete permissions" ON public.role_permissions FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.is_super_admin(auth.uid()));

GRANT INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.role_permissions TO authenticated;

-- ROLLBACK:
-- DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
-- DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;
-- DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;
-- DROP POLICY IF EXISTS "Admins can insert permissions" ON public.role_permissions;
-- DROP POLICY IF EXISTS "Admins can update permissions" ON public.role_permissions;
-- DROP POLICY IF EXISTS "Admins can delete permissions" ON public.role_permissions;
