
CREATE TABLE public.ponto_toque_ordem (
  ponto_id uuid NOT NULL REFERENCES public.pontos(id) ON DELETE CASCADE,
  toque public.toque_tipo NOT NULL,
  ordem integer NOT NULL DEFAULT 0,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (ponto_id, toque)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ponto_toque_ordem TO authenticated;
GRANT ALL ON public.ponto_toque_ordem TO service_role;

ALTER TABLE public.ponto_toque_ordem ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View ponto_toque_ordem if can view ponto"
ON public.ponto_toque_ordem FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.pontos p
  WHERE p.id = ponto_toque_ordem.ponto_id
    AND (p.status = 'approved'::ponto_status
         OR p.created_by = auth.uid()
         OR has_role(auth.uid(), 'admin'::app_role)
         OR is_super_admin(auth.uid()))
));

CREATE POLICY "Insert ponto_toque_ordem if owner or admin"
ON public.ponto_toque_ordem FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM public.pontos p
  WHERE p.id = ponto_toque_ordem.ponto_id
    AND (p.created_by = auth.uid()
         OR has_role(auth.uid(), 'admin'::app_role)
         OR is_super_admin(auth.uid())
         OR has_permission(auth.uid(), 'edit_pontos'::text))
));

CREATE POLICY "Update ponto_toque_ordem if owner or admin"
ON public.ponto_toque_ordem FOR UPDATE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.pontos p
  WHERE p.id = ponto_toque_ordem.ponto_id
    AND (p.created_by = auth.uid()
         OR has_role(auth.uid(), 'admin'::app_role)
         OR is_super_admin(auth.uid())
         OR has_permission(auth.uid(), 'edit_pontos'::text))
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.pontos p
  WHERE p.id = ponto_toque_ordem.ponto_id
    AND (p.created_by = auth.uid()
         OR has_role(auth.uid(), 'admin'::app_role)
         OR is_super_admin(auth.uid())
         OR has_permission(auth.uid(), 'edit_pontos'::text))
));

CREATE POLICY "Delete ponto_toque_ordem if owner or admin"
ON public.ponto_toque_ordem FOR DELETE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.pontos p
  WHERE p.id = ponto_toque_ordem.ponto_id
    AND (p.created_by = auth.uid()
         OR has_role(auth.uid(), 'admin'::app_role)
         OR is_super_admin(auth.uid())
         OR has_permission(auth.uid(), 'edit_pontos'::text))
));
