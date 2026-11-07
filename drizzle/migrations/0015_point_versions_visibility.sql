CREATE FUNCTION public.can_read_point_version(_point_id uuid, _status text) RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE p public.pontos; uid uuid := auth.uid();
BEGIN
 SELECT * INTO p FROM public.pontos WHERE id=_point_id;
 IF NOT FOUND THEN RETURN false; END IF;
 IF p.status='approved' AND _status='published' THEN RETURN true; END IF;
 IF uid IS NULL THEN RETURN false; END IF;
 RETURN public.has_permission(uid,'edit_pontos') OR (p.created_by=uid AND p.status='pending');
END; $$;
REVOKE ALL ON FUNCTION public.can_read_point_version(uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_read_point_version(uuid,text) TO anon,authenticated,service_role;
ALTER POLICY "Published versions or authorized editor" ON public.ponto_versions USING (public.can_read_point_version(point_id,status));