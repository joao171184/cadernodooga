-- Serving público com nomes neutros (evita EasyList em /ads/, get_ads_*, etc.).
-- Mantém tabelas ad_* e RPCs antigos para o painel admin.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('parceiros', 'parceiros', true, 1048576, ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif'])
ON CONFLICT (id) DO UPDATE
  SET public = EXCLUDED.public,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

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

ALTER TABLE public.ad_campaigns DROP CONSTRAINT IF EXISTS ad_campaigns_image_path_check;
ALTER TABLE public.ad_campaigns DROP CONSTRAINT IF EXISTS ad_campaigns_image_mobile_path_check;

UPDATE public.ad_campaigns
SET image_path = regexp_replace(image_path, '^campaigns/', 'destaques/'),
    image_mobile_path = CASE
      WHEN image_mobile_path IS NULL THEN NULL
      ELSE regexp_replace(image_mobile_path, '^campaigns/', 'destaques/')
    END
WHERE image_path LIKE 'campaigns/%'
   OR coalesce(image_mobile_path, '') LIKE 'campaigns/%';

ALTER TABLE public.ad_campaigns
  ADD CONSTRAINT ad_campaigns_image_path_check
    CHECK (image_path ~ '^(campaigns|destaques)/[A-Za-z0-9_-]{1,80}\.(png|jpg|webp|gif)$');
ALTER TABLE public.ad_campaigns
  ADD CONSTRAINT ad_campaigns_image_mobile_path_check
    CHECK (
      image_mobile_path IS NULL
      OR image_mobile_path ~ '^(campaigns|destaques)/[A-Za-z0-9_-]{1,80}\.(png|jpg|webp|gif)$'
    );

UPDATE storage.objects
SET bucket_id = 'parceiros',
    name = regexp_replace(name, '^campaigns/', 'destaques/')
WHERE bucket_id = 'ads' AND name LIKE 'campaigns/%';

UPDATE storage.objects
SET name = regexp_replace(name, '^campaigns/', 'destaques/')
WHERE bucket_id = 'parceiros' AND name LIKE 'campaigns/%';

CREATE OR REPLACE FUNCTION public.get_parceiro_config()
RETURNS json
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT json_build_object(
    'settings', (SELECT to_jsonb(s) FROM public.ad_settings s LIMIT 1),
    'placements', COALESCE(
      (SELECT jsonb_agg(to_jsonb(p) ORDER BY p.sort) FROM public.ad_placements p),
      '[]'::jsonb
    )
  );
$$;
REVOKE EXECUTE ON FUNCTION public.get_parceiro_config() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_parceiro_config() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_parceiros_for_slot(_slot text, _count int DEFAULT 1)
RETURNS TABLE (
  id uuid,
  image_path text,
  image_mobile_path text,
  alt_text text,
  target_url text,
  advertiser_name text,
  revenue_type text
)
LANGUAGE sql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.get_ads_for_placement(_slot, _count);
$$;
REVOKE EXECUTE ON FUNCTION public.get_parceiros_for_slot(text, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_parceiros_for_slot(text, int) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.record_parceiro_event(
  _campaign_id uuid,
  _placement text,
  _kind text,
  _session text
)
RETURNS boolean
LANGUAGE sql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.record_ad_event(_campaign_id, _placement, _kind, _session);
$$;
REVOKE EXECUTE ON FUNCTION public.record_parceiro_event(uuid, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_parceiro_event(uuid, text, text, text) TO anon, authenticated;
