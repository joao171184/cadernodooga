GRANT UPDATE ON public.ponto_subcategorias TO authenticated;
GRANT ALL ON public.ponto_subcategorias TO service_role;

CREATE POLICY "Update ponto_subcategorias if owner or admin"
ON public.ponto_subcategorias
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.pontos p
    WHERE p.id = ponto_subcategorias.ponto_id
      AND (
        p.created_by = auth.uid()
        OR public.has_role(auth.uid(), 'admin'::public.app_role)
        OR public.is_super_admin(auth.uid())
        OR public.has_permission(auth.uid(), 'edit_pontos')
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.pontos p
    WHERE p.id = ponto_subcategorias.ponto_id
      AND (
        p.created_by = auth.uid()
        OR public.has_role(auth.uid(), 'admin'::public.app_role)
        OR public.is_super_admin(auth.uid())
        OR public.has_permission(auth.uid(), 'edit_pontos')
      )
  )
);