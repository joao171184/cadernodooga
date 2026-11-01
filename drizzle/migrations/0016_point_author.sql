ALTER TABLE public.pontos ADD COLUMN autor text NOT NULL DEFAULT '';
COMMENT ON COLUMN public.pontos.autor IS 'Optional credited author, independent of the singer and account creator.';
DO $$
DECLARE definition text;
BEGIN
 SELECT pg_get_functiondef('public.save_ponto_with_versions(jsonb,jsonb)'::regprocedure) INTO definition;
 IF position('puxador,toque,status' in definition)=0 OR position('puxador=COALESCE(_point->>''puxador'',''''),toque=' in definition)=0 THEN
   RAISE EXCEPTION 'Unexpected save function definition';
 END IF;
 definition := replace(definition, 'puxador,toque,status', 'puxador,autor,toque,status');
 definition := replace(definition, 'COALESCE(_point->>''puxador'',''''),NULLIF(mainv', 'COALESCE(_point->>''puxador'',''''),trim(COALESCE(_point->>''autor'','''')),NULLIF(mainv');
 definition := replace(definition, 'puxador=COALESCE(_point->>''puxador'',''''),toque=', 'puxador=COALESCE(_point->>''puxador'',''''),autor=CASE WHEN _point ? ''autor'' THEN trim(COALESCE(_point->>''autor'','''')) ELSE oldp.autor END,toque=');
 EXECUTE definition;
END $$;