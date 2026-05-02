
-- 1) Enum + tabela de classificações (Chamada / Elevação / Sustentação)
DO $$ BEGIN
  CREATE TYPE public.classificacao_tipo AS ENUM ('chamada', 'elevacao', 'sustentacao');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS public.ponto_classificacoes (
  ponto_id uuid NOT NULL REFERENCES public.pontos(id) ON DELETE CASCADE,
  classificacao public.classificacao_tipo NOT NULL,
  PRIMARY KEY (ponto_id, classificacao)
);

ALTER TABLE public.ponto_classificacoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "View ponto_classificacoes if can view ponto" ON public.ponto_classificacoes;
CREATE POLICY "View ponto_classificacoes if can view ponto"
ON public.ponto_classificacoes FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.pontos p
  WHERE p.id = ponto_classificacoes.ponto_id
    AND (p.status = 'approved'::ponto_status
      OR p.created_by = auth.uid()
      OR public.has_role(auth.uid(), 'admin'::app_role)
      OR public.is_super_admin(auth.uid()))
));

DROP POLICY IF EXISTS "Insert ponto_classificacoes if owner or admin" ON public.ponto_classificacoes;
CREATE POLICY "Insert ponto_classificacoes if owner or admin"
ON public.ponto_classificacoes FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM public.pontos p
  WHERE p.id = ponto_classificacoes.ponto_id
    AND (p.created_by = auth.uid()
      OR public.has_role(auth.uid(), 'admin'::app_role)
      OR public.is_super_admin(auth.uid()))
));

DROP POLICY IF EXISTS "Delete ponto_classificacoes if owner or admin" ON public.ponto_classificacoes;
CREATE POLICY "Delete ponto_classificacoes if owner or admin"
ON public.ponto_classificacoes FOR DELETE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.pontos p
  WHERE p.id = ponto_classificacoes.ponto_id
    AND (p.created_by = auth.uid()
      OR public.has_role(auth.uid(), 'admin'::app_role)
      OR public.is_super_admin(auth.uid()))
));

ALTER PUBLICATION supabase_realtime ADD TABLE public.ponto_classificacoes;

-- 2) Função has_permission(user, permission)
CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _permission text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.is_super_admin(_user_id)
    OR public.has_role(_user_id, 'admin'::app_role)
    OR EXISTS (
      SELECT 1
      FROM public.role_permissions rp
      JOIN public.user_roles ur ON ur.role = rp.role
      WHERE ur.user_id = _user_id
        AND rp.permission = _permission
        AND rp.allowed = true
    );
$$;

-- 3) RLS de pontos respeita matriz de permissões
DROP POLICY IF EXISTS "Authenticated can create pontos" ON public.pontos;
CREATE POLICY "Authenticated can create pontos"
ON public.pontos FOR INSERT TO authenticated
WITH CHECK (
  created_by = auth.uid()
  AND public.has_permission(auth.uid(), 'add_pontos')
);

DROP POLICY IF EXISTS "Owner or admin can update pontos" ON public.pontos;
CREATE POLICY "Owner or admin can update pontos"
ON public.pontos FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.is_super_admin(auth.uid())
  OR (public.has_permission(auth.uid(), 'edit_pontos'))
  OR (created_by = auth.uid() AND status = 'pending'::ponto_status)
);

DROP POLICY IF EXISTS "Owner or admin can delete pontos" ON public.pontos;
CREATE POLICY "Owner or admin can delete pontos"
ON public.pontos FOR DELETE TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.is_super_admin(auth.uid())
  OR (public.has_permission(auth.uid(), 'delete_pontos'))
  OR (created_by = auth.uid() AND status = 'pending'::ponto_status)
);

-- 4) Realtime para role_permissions (recarrega permissões instantaneamente)
ALTER PUBLICATION supabase_realtime ADD TABLE public.role_permissions;

-- 5) Renumerar `ordem` dos pontos por categoria (mantém ordem atual de exibição)
WITH numbered AS (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY categoria ORDER BY ordem ASC, created_at ASC) * 10 AS new_ordem
  FROM public.pontos
)
UPDATE public.pontos p
SET ordem = n.new_ordem
FROM numbered n
WHERE p.id = n.id;

-- 6) Renumerar `ordem` das categorias (top-level e por parent_id)
WITH numbered_cats AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY COALESCE(parent_id::text, '__root__')
           ORDER BY ordem ASC, nome ASC
         ) * 10 AS new_ordem
  FROM public.categorias
)
UPDATE public.categorias c
SET ordem = n.new_ordem
FROM numbered_cats n
WHERE c.id = n.id;
