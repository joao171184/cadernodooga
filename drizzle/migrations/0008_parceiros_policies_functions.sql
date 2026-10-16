DROP POLICY IF EXISTS "Admins upload parceiro images" ON storage.objects;
CREATE POLICY "Admins upload parceiro images" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'parceiros' AND public.is_ads_admin());
DROP POLICY IF EXISTS "Admins update parceiro images" ON storage.objects;
CREATE POLICY "Admins update parceiro images" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'parceiros' AND public.is_ads_admin())
  WITH CHECK (bucket_id = 'parceiros' AND public.is_ads_admin());
DROP POLICY IF EXISTS "Admins delete parceiro images" ON storage.objects;
CREATE POLICY "Admins delete parceiro images" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'parceiros' AND public.is_ads_admin());
DROP POLICY IF EXISTS "Public read parceiro images" ON storage.objects;
CREATE POLICY "Public read parceiro images" ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'parceiros');

CREATE OR REPLACE FUNCTION public.get_parceiro_config()
RETURNS json LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT json_build_object(
    'settings', (SELECT to_jsonb(s) FROM public.ad_settings s LIMIT 1),
    'placements', COALESCE((SELECT jsonb_agg(to_jsonb(p) ORDER BY p.sort) FROM public.ad_placements p), '[]'::jsonb)
  );
$$;
REVOKE EXECUTE ON FUNCTION public.get_parceiro_config() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_parceiro_config() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_parceiros_for_slot(_slot text, _count int DEFAULT 1)
RETURNS TABLE (id uuid, image_path text, image_mobile_path text, alt_text text, target_url text, advertiser_name text, revenue_type text)
LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path = public
AS $$ SELECT * FROM public.get_ads_for_placement(_slot, _count); $$;
REVOKE EXECUTE ON FUNCTION public.get_parceiros_for_slot(text, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_parceiros_for_slot(text, int) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.record_parceiro_event(_campaign_id uuid, _placement text, _kind text, _session text)
RETURNS boolean LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path = public
AS $$ SELECT public.record_ad_event(_campaign_id, _placement, _kind, _session); $$;
REVOKE EXECUTE ON FUNCTION public.record_parceiro_event(uuid, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_parceiro_event(uuid, text, text, text) TO anon, authenticated;