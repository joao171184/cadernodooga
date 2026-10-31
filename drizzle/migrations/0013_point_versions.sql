CREATE TABLE public.ponto_versions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 point_id uuid NOT NULL REFERENCES public.pontos(id) ON DELETE CASCADE,
 title text NOT NULL DEFAULT '',
 letra text NOT NULL DEFAULT '',
 toque public.toque_tipo,
 classificacoes public.classificacao_tipo[] NOT NULL DEFAULT '{}',
 video_url text NOT NULL DEFAULT '',
 observacoes text NOT NULL DEFAULT '',
 ordem integer NOT NULL DEFAULT 0,
 is_principal boolean NOT NULL DEFAULT false,
 status text NOT NULL DEFAULT 'draft' CHECK (status IN ('published','draft')),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.ponto_versions TO anon, authenticated;
GRANT ALL ON public.ponto_versions TO service_role;
ALTER TABLE public.ponto_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Published versions or authorized editor" ON public.ponto_versions FOR SELECT USING (
 EXISTS (SELECT 1 FROM public.pontos p WHERE p.id = point_id AND (
  (p.status = 'approved' AND ponto_versions.status = 'published') OR
  (auth.uid() IS NOT NULL AND (public.has_permission(auth.uid(), 'edit_pontos') OR (p.created_by = auth.uid() AND p.status = 'pending')))
 ))
);
CREATE INDEX ponto_versions_point_order_idx ON public.ponto_versions(point_id, ordem, created_at);
CREATE UNIQUE INDEX ponto_versions_one_principal_idx ON public.ponto_versions(point_id) WHERE is_principal;
INSERT INTO public.ponto_versions (point_id, letra, toque, classificacoes, video_url, is_principal, status, created_at, updated_at)
SELECT p.id, p.letra, p.toque, COALESCE((SELECT array_agg(c.classificacao ORDER BY c.classificacao) FROM public.ponto_classificacoes c WHERE c.ponto_id=p.id), '{}'), p.audio, true, 'published', p.created_at, p.updated_at FROM public.pontos p;

CREATE FUNCTION public.point_versions_require_published() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE pid uuid;
BEGIN
 IF TG_TABLE_NAME='pontos' THEN pid := NEW.id; ELSE pid := COALESCE(NEW.point_id, OLD.point_id); END IF;
 IF EXISTS (SELECT 1 FROM public.pontos WHERE id=pid AND status='approved') AND NOT EXISTS (SELECT 1 FROM public.ponto_versions WHERE point_id=pid AND status='published') THEN
  RAISE EXCEPTION 'Um ponto publicado precisa de ao menos uma versão publicada' USING ERRCODE='23514';
 END IF;
 RETURN NULL;
END; $$;
CREATE CONSTRAINT TRIGGER point_versions_published_guard AFTER INSERT OR UPDATE OR DELETE ON public.ponto_versions DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.point_versions_require_published();
CREATE CONSTRAINT TRIGGER points_published_versions_guard AFTER INSERT OR UPDATE ON public.pontos DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.point_versions_require_published();

CREATE FUNCTION public.point_versions_sync_legacy() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE vid uuid;
BEGIN
 IF current_setting('app.saving_point_versions', true) = 'true' THEN RETURN NEW; END IF;
 SELECT id INTO vid FROM public.ponto_versions WHERE point_id=NEW.id ORDER BY (status='published') DESC, is_principal DESC, ordem, created_at LIMIT 1;
 IF vid IS NULL THEN
  INSERT INTO public.ponto_versions(point_id,letra,toque,video_url,is_principal,status) VALUES(NEW.id,NEW.letra,NEW.toque,NEW.audio,true,'published');
 ELSE
  UPDATE public.ponto_versions SET letra=NEW.letra,toque=NEW.toque,video_url=NEW.audio,updated_at=now() WHERE id=vid;
 END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER point_versions_legacy_sync AFTER INSERT OR UPDATE OF letra, toque, audio ON public.pontos FOR EACH ROW EXECUTE FUNCTION public.point_versions_sync_legacy();
CREATE FUNCTION public.point_versions_sync_classifications() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE pid uuid; vid uuid;
BEGIN
 IF current_setting('app.saving_point_versions', true) = 'true' THEN RETURN NULL; END IF;
 pid := COALESCE(NEW.ponto_id, OLD.ponto_id);
 SELECT id INTO vid FROM public.ponto_versions WHERE point_id=pid ORDER BY (status='published') DESC,is_principal DESC,ordem,created_at LIMIT 1;
 UPDATE public.ponto_versions SET classificacoes=COALESCE((SELECT array_agg(classificacao ORDER BY classificacao) FROM public.ponto_classificacoes WHERE ponto_id=pid),'{}'),updated_at=now() WHERE id=vid;
 RETURN NULL;
END; $$;
CREATE TRIGGER point_versions_legacy_classifications AFTER INSERT OR UPDATE OR DELETE ON public.ponto_classificacoes FOR EACH ROW EXECUTE FUNCTION public.point_versions_sync_classifications();

CREATE FUNCTION public.save_ponto_with_versions(_point jsonb, _versions jsonb) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE uid uuid := auth.uid(); pid uuid; oldp public.pontos; mainv jsonb; v jsonb; privileged boolean; pointstatus public.ponto_status; idx integer := 0; version_id uuid;
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'Não autenticado' USING ERRCODE='42501'; END IF;
 privileged := public.has_role(uid,'admin') OR public.is_super_admin(uid);
 pid := NULLIF(_point->>'id','')::uuid;
 IF pid IS NULL THEN
  IF NOT public.has_permission(uid,'add_pontos') THEN RAISE EXCEPTION 'Sem permissão para adicionar pontos' USING ERRCODE='42501'; END IF;
 ELSE
  SELECT * INTO oldp FROM public.pontos WHERE id=pid FOR UPDATE;
  IF NOT FOUND OR NOT (public.has_permission(uid,'edit_pontos') OR (oldp.created_by=uid AND oldp.status='pending')) THEN RAISE EXCEPTION 'Sem permissão para editar ponto' USING ERRCODE='42501'; END IF;
 END IF;
 IF jsonb_typeof(_versions) IS DISTINCT FROM 'array' OR jsonb_array_length(_versions)=0 THEN RAISE EXCEPTION 'Adicione ao menos uma versão' USING ERRCODE='23514'; END IF;
 IF (SELECT count(*) FROM jsonb_array_elements(_versions) x WHERE COALESCE((x->>'is_principal')::boolean,false)) > 1 THEN RAISE EXCEPTION 'Escolha uma única versão principal' USING ERRCODE='23514'; END IF;
 pointstatus := CASE WHEN privileged THEN 'approved'::public.ponto_status ELSE 'pending'::public.ponto_status END;
 IF pointstatus='approved' AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements(_versions) x WHERE x->>'status'='published') THEN RAISE EXCEPTION 'Um ponto publicado precisa de ao menos uma versão publicada' USING ERRCODE='23514'; END IF;
 FOR v IN SELECT value FROM jsonb_array_elements(_versions) LOOP
  IF v->>'status' NOT IN ('published','draft') OR v->>'status' IS NULL OR length(trim(COALESCE(v->>'letra','')))=0 OR length(v->>'letra')>50000 OR length(COALESCE(v->>'title',''))>300 OR length(COALESCE(v->>'observacoes',''))>10000 THEN RAISE EXCEPTION 'Revise os dados da versão' USING ERRCODE='23514'; END IF;
  IF COALESCE(v->>'video_url','') <> '' AND NOT ((length(v->>'video_url')<=2048 AND v->>'video_url' ~ '^https://[^[:space:]<>"''`]+$') OR v->>'video_url' ~ '^audio/[A-Za-z0-9_./-]+$') THEN RAISE EXCEPTION 'Link inválido' USING ERRCODE='23514'; END IF;
  IF NULLIF(v->>'id','') IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.ponto_versions WHERE id=(v->>'id')::uuid AND point_id=pid) THEN RAISE EXCEPTION 'Versão não pertence ao ponto' USING ERRCODE='42501'; END IF;
 END LOOP;
 SELECT value INTO mainv FROM jsonb_array_elements(_versions) WITH ORDINALITY x(value, n) ORDER BY (value->>'status'='published') DESC,COALESCE((value->>'is_principal')::boolean,false) DESC,n LIMIT 1;
 PERFORM set_config('app.saving_point_versions','true',true);
 IF pid IS NULL THEN
  INSERT INTO public.pontos(nome,categoria,letra,audio,puxador,toque,status,created_by,approved_by,approved_at,ordem)
  VALUES(trim(_point->>'nome'),_point->>'categoria',upper(mainv->>'letra'),COALESCE(mainv->>'video_url',''),COALESCE(_point->>'puxador',''),NULLIF(mainv->>'toque','')::public.toque_tipo,pointstatus,uid,CASE WHEN privileged THEN uid END,CASE WHEN privileged THEN now() END,COALESCE((SELECT max(ordem)+10 FROM public.pontos),10)) RETURNING id INTO pid;
 ELSE
  UPDATE public.pontos SET nome=trim(_point->>'nome'),categoria=_point->>'categoria',letra=upper(mainv->>'letra'),audio=COALESCE(mainv->>'video_url',''),puxador=COALESCE(_point->>'puxador',''),toque=NULLIF(mainv->>'toque','')::public.toque_tipo,status=pointstatus,approved_by=CASE WHEN privileged THEN uid END,approved_at=CASE WHEN privileged THEN now() END WHERE id=pid;
 END IF;
 -- Replace the collection atomically, retaining existing IDs and creation dates.
 DELETE FROM public.ponto_versions WHERE point_id=pid AND id NOT IN (SELECT NULLIF(x->>'id','')::uuid FROM jsonb_array_elements(_versions) x WHERE NULLIF(x->>'id','') IS NOT NULL);
 UPDATE public.ponto_versions SET is_principal=false WHERE point_id=pid;
 FOR v IN SELECT value FROM jsonb_array_elements(_versions) LOOP
  version_id := COALESCE(NULLIF(v->>'id','')::uuid,gen_random_uuid());
  INSERT INTO public.ponto_versions(id,point_id,title,letra,toque,classificacoes,video_url,observacoes,ordem,is_principal,status)
  VALUES(version_id,pid,COALESCE(v->>'title',''),upper(v->>'letra'),NULLIF(v->>'toque','')::public.toque_tipo,ARRAY(SELECT jsonb_array_elements_text(COALESCE(v->'classificacoes','[]'))::public.classificacao_tipo),COALESCE(v->>'video_url',''),COALESCE(v->>'observacoes',''),idx,COALESCE((v->>'is_principal')::boolean,false),v->>'status')
  ON CONFLICT(id) DO UPDATE SET title=EXCLUDED.title,letra=EXCLUDED.letra,toque=EXCLUDED.toque,classificacoes=EXCLUDED.classificacoes,video_url=EXCLUDED.video_url,observacoes=EXCLUDED.observacoes,ordem=EXCLUDED.ordem,is_principal=EXCLUDED.is_principal,status=EXCLUDED.status,updated_at=now();
  idx := idx+1;
 END LOOP;
 DELETE FROM public.ponto_subcategorias WHERE ponto_id=pid;
 INSERT INTO public.ponto_subcategorias(ponto_id,subcategoria) SELECT pid,value FROM jsonb_array_elements_text(COALESCE(_point->'subcategorias','[]'));
 DELETE FROM public.ponto_classificacoes WHERE ponto_id=pid;
 INSERT INTO public.ponto_classificacoes(ponto_id,classificacao) SELECT pid,value::public.classificacao_tipo FROM jsonb_array_elements_text(COALESCE(mainv->'classificacoes','[]'));
 PERFORM set_config('app.saving_point_versions','false',true);
 RETURN pid;
END; $$;
REVOKE ALL ON FUNCTION public.save_ponto_with_versions(jsonb,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_ponto_with_versions(jsonb,jsonb) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.point_versions_require_published() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.point_versions_sync_legacy() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.point_versions_sync_classifications() FROM PUBLIC;