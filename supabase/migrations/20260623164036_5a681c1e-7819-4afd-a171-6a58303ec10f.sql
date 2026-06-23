
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.is_super_admin(uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.has_permission(uuid, text) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.pontos_set_slug() FROM anon, authenticated, public;
