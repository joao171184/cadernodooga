
REVOKE EXECUTE ON FUNCTION public.slugify(text) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.get_my_role() FROM anon, public;
