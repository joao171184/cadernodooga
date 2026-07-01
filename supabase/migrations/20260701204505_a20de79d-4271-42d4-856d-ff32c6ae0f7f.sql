GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_super_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_permission(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated;

-- Garante que funções usadas por políticas públicas de leitura não quebrem visitantes,
-- sem dar permissão de edição/criação para visitantes.
GRANT EXECUTE ON FUNCTION public.slugify(text) TO anon, authenticated;

-- Reforça grants de Data API das tabelas já existentes, sem alterar dados.
GRANT SELECT ON public.pontos TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pontos TO authenticated;
GRANT ALL ON public.pontos TO service_role;

GRANT SELECT ON public.ponto_subcategorias TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ponto_subcategorias TO authenticated;
GRANT ALL ON public.ponto_subcategorias TO service_role;

GRANT SELECT ON public.ponto_classificacoes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ponto_classificacoes TO authenticated;
GRANT ALL ON public.ponto_classificacoes TO service_role;

GRANT SELECT ON public.ponto_toque_ordem TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ponto_toque_ordem TO authenticated;
GRANT ALL ON public.ponto_toque_ordem TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.favoritos TO authenticated;
GRANT ALL ON public.favoritos TO service_role;

GRANT SELECT ON public.categorias TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categorias TO authenticated;
GRANT ALL ON public.categorias TO service_role;

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

GRANT SELECT ON public.role_permissions TO authenticated;
GRANT ALL ON public.role_permissions TO service_role;