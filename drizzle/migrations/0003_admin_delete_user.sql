-- Exclusão de contas por administradores via RPC (substitui a Edge Function admin-delete-user,
-- que depende de deploy manual no Lovable Cloud).
-- profiles, user_roles e user_notas são removidos em cascata pelas FKs para auth.users.

CREATE OR REPLACE FUNCTION public.admin_delete_user(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  caller uuid := auth.uid();
BEGIN
  IF caller IS NULL THEN
    RAISE EXCEPTION 'Não autenticado' USING ERRCODE = '28000';
  END IF;
  IF NOT (public.has_role(caller, 'admin'::public.app_role) OR public.is_super_admin(caller)) THEN
    RAISE EXCEPTION 'Apenas administradores podem excluir contas' USING ERRCODE = '42501';
  END IF;
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Requisição inválida' USING ERRCODE = '22023';
  END IF;
  IF _user_id = caller THEN
    RAISE EXCEPTION 'Você não pode excluir sua própria conta' USING ERRCODE = '42501';
  END IF;
  IF EXISTS (SELECT 1 FROM public.super_admins s WHERE s.user_id = _user_id)
     AND NOT public.is_super_admin(caller) THEN
    RAISE EXCEPTION 'Esta conta não pode ser excluída' USING ERRCODE = '42501';
  END IF;

  DELETE FROM auth.users WHERE id = _user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Conta não encontrada' USING ERRCODE = 'P0002';
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_delete_user(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_delete_user(uuid) TO authenticated;

-- ROLLBACK: DROP FUNCTION IF EXISTS public.admin_delete_user(uuid);
