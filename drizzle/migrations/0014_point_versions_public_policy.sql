ALTER POLICY "Published versions or authorized editor" ON public.ponto_versions USING (
 EXISTS (SELECT 1 FROM public.pontos p WHERE p.id = point_id AND (
  (p.status = 'approved' AND ponto_versions.status = 'published') OR
  CASE WHEN auth.uid() IS NOT NULL THEN (public.has_permission(auth.uid(), 'edit_pontos') OR (p.created_by = auth.uid() AND p.status = 'pending')) ELSE false END
 ))
);