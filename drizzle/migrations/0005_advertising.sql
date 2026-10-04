-- Publicidade: anunciantes, campanhas, espaços, métricas, pedidos de anunciantes e configuração.
-- Só admins gerenciam. Visitantes nunca leem campanhas diretamente: recebem só o necessário
-- para exibir o anúncio pela função get_ads_for_placement.
-- Não altera tabelas existentes. Idempotente. ROLLBACK no fim do arquivo.

-- Quem pode gerenciar publicidade (mesmo critério de admin da migração 0004).
CREATE OR REPLACE FUNCTION public.is_ads_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL
    AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.is_super_admin(auth.uid()));
$$;
REVOKE EXECUTE ON FUNCTION public.is_ads_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_ads_admin() TO authenticated;

-- ---------------------------------------------------------------- Espaços
CREATE TABLE IF NOT EXISTS public.ad_placements (
  key text PRIMARY KEY CHECK (key ~ '^[a-z0-9-]{2,40}$'),
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 80),
  description text NOT NULL DEFAULT '' CHECK (char_length(description) <= 300),
  enabled boolean NOT NULL DEFAULT true,
  desktop_width int NOT NULL CHECK (desktop_width BETWEEN 100 AND 4000),
  desktop_height int NOT NULL CHECK (desktop_height BETWEEN 50 AND 4000),
  mobile_width int NOT NULL CHECK (mobile_width BETWEEN 100 AND 4000),
  mobile_height int NOT NULL CHECK (mobile_height BETWEEN 50 AND 4000),
  adsense_enabled boolean NOT NULL DEFAULT false,
  adsense_slot text CHECK (adsense_slot IS NULL OR adsense_slot ~ '^[0-9]{6,20}$'),
  sort int NOT NULL DEFAULT 0
);

INSERT INTO public.ad_placements (key, name, description, desktop_width, desktop_height, mobile_width, mobile_height, sort) VALUES
  ('topo-lista', 'Faixa abaixo da busca', 'Página inicial e pastas: faixa entre os filtros e a lista de pontos.', 1200, 150, 640, 200, 1),
  ('lista-entre-cards', 'Entre os cards de pontos', 'Card patrocinado intercalado na lista de pontos.', 600, 500, 600, 500, 2),
  ('ponto-apos-letra', 'Página do ponto, após a letra', 'Página individual do ponto, entre a letra e o vídeo.', 1200, 300, 640, 320, 3)
ON CONFLICT (key) DO NOTHING;

-- ---------------------------------------------------------------- Configuração (singleton, valores públicos por natureza)
CREATE TABLE IF NOT EXISTS public.ad_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  adsense_enabled boolean NOT NULL DEFAULT false,
  adsense_client text CHECK (adsense_client IS NULL OR adsense_client ~ '^ca-pub-[0-9]{10,20}$'),
  in_feed_interval int NOT NULL DEFAULT 12 CHECK (in_feed_interval BETWEEN 4 AND 50),
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.ad_settings (id) VALUES (true) ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------- Anunciantes
CREATE TABLE IF NOT EXISTS public.ad_advertisers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 120),
  contact_name text NOT NULL DEFAULT '' CHECK (char_length(contact_name) <= 120),
  contact_email text NOT NULL DEFAULT '' CHECK (
    contact_email = '' OR (char_length(contact_email) <= 254 AND contact_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$')
  ),
  contact_phone text NOT NULL DEFAULT '' CHECK (char_length(contact_phone) <= 40),
  notes text NOT NULL DEFAULT '' CHECK (char_length(notes) <= 2000),
  archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------- Campanhas
-- status guardado: draft | active | paused | archived.
-- "agendado" e "encerrado" são calculados pelas datas e pelo limite de impressões.
CREATE TABLE IF NOT EXISTS public.ad_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_id uuid NOT NULL REFERENCES public.ad_advertisers(id) ON DELETE RESTRICT,
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 120),
  placement_key text NOT NULL REFERENCES public.ad_placements(key) ON UPDATE CASCADE,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'archived')),
  revenue_type text NOT NULL DEFAULT 'direct' CHECK (revenue_type IN ('direct', 'sponsorship', 'affiliate')),
  image_path text NOT NULL CHECK (image_path ~ '^campaigns/[A-Za-z0-9_-]{1,80}\.(png|jpg|webp|gif)$'),
  image_mobile_path text CHECK (image_mobile_path IS NULL OR image_mobile_path ~ '^campaigns/[A-Za-z0-9_-]{1,80}\.(png|jpg|webp|gif)$'),
  alt_text text NOT NULL CHECK (char_length(btrim(alt_text)) BETWEEN 3 AND 200),
  target_url text NOT NULL CHECK (
    char_length(target_url) <= 2048 AND target_url ~ '^https://[A-Za-z0-9.-]+\.[A-Za-z]{2,}(:[0-9]{2,5})?([/?#][^\s]*)?$'
  ),
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  weight smallint NOT NULL DEFAULT 1 CHECK (weight BETWEEN 1 AND 10),
  max_impressions int CHECK (max_impressions IS NULL OR max_impressions > 0),
  budget_cents int CHECK (budget_cents IS NULL OR budget_cents >= 0),
  impressions_total int NOT NULL DEFAULT 0,
  clicks_total int NOT NULL DEFAULT 0,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_at > starts_at)
);
CREATE INDEX IF NOT EXISTS ad_campaigns_serving_idx ON public.ad_campaigns (placement_key, status, starts_at, ends_at);

-- ---------------------------------------------------------------- Métricas agregadas por dia (horário de Brasília)
CREATE TABLE IF NOT EXISTS public.ad_stats_daily (
  campaign_id uuid NOT NULL REFERENCES public.ad_campaigns(id) ON DELETE CASCADE,
  day date NOT NULL,
  placement_key text NOT NULL,
  impressions int NOT NULL DEFAULT 0,
  clicks int NOT NULL DEFAULT 0,
  PRIMARY KEY (campaign_id, day, placement_key)
);

-- Deduplicação de eventos: identificador anônimo de sessão, guardado com hash e apagado em 2 dias.
CREATE TABLE IF NOT EXISTS public.ad_event_dedupe (
  campaign_id uuid NOT NULL,
  kind text NOT NULL,
  visitor_hash text NOT NULL,
  window_start timestamptz NOT NULL,
  PRIMARY KEY (campaign_id, kind, visitor_hash, window_start)
);
CREATE INDEX IF NOT EXISTS ad_event_dedupe_window_idx ON public.ad_event_dedupe (window_start);

-- ---------------------------------------------------------------- Pedidos "Anuncie conosco"
CREATE TABLE IF NOT EXISTS public.ad_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 2 AND 120),
  company text NOT NULL DEFAULT '' CHECK (char_length(company) <= 120),
  email text NOT NULL CHECK (char_length(email) <= 254 AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  phone text NOT NULL DEFAULT '' CHECK (char_length(phone) <= 40),
  interest text NOT NULL DEFAULT '' CHECK (char_length(interest) <= 60),
  message text NOT NULL CHECK (char_length(btrim(message)) BETWEEN 10 AND 2000),
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'closed', 'spam')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ad_leads_created_idx ON public.ad_leads (created_at DESC);

-- Quem deve ser avisado de novos pedidos: usuários do site escolhidos no painel.
-- Guarda só o id; o e-mail vem de profiles. Apagar o usuário remove o destinatário.
-- Ainda não há envio de e-mail: a lista fica pronta para quando houver.
CREATE TABLE IF NOT EXISTS public.ad_lead_recipients (
  user_id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  added_by uuid REFERENCES auth.users (id) ON DELETE SET NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------- updated_at
CREATE OR REPLACE FUNCTION public.ads_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.ads_touch_updated_at() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS ad_advertisers_touch ON public.ad_advertisers;
CREATE TRIGGER ad_advertisers_touch BEFORE UPDATE ON public.ad_advertisers
  FOR EACH ROW EXECUTE FUNCTION public.ads_touch_updated_at();
DROP TRIGGER IF EXISTS ad_campaigns_touch ON public.ad_campaigns;
CREATE TRIGGER ad_campaigns_touch BEFORE UPDATE ON public.ad_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.ads_touch_updated_at();
DROP TRIGGER IF EXISTS ad_settings_touch ON public.ad_settings;
CREATE TRIGGER ad_settings_touch BEFORE UPDATE ON public.ad_settings
  FOR EACH ROW EXECUTE FUNCTION public.ads_touch_updated_at();

-- Contadores só mudam pela função de eventos, nunca pelo painel.
CREATE OR REPLACE FUNCTION public.ad_campaigns_protect_counters()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF current_setting('ads.counting', true) IS DISTINCT FROM 'on' THEN
    IF TG_OP = 'INSERT' THEN
      NEW.impressions_total := 0;
      NEW.clicks_total := 0;
    ELSE
      NEW.impressions_total := OLD.impressions_total;
      NEW.clicks_total := OLD.clicks_total;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.ad_campaigns_protect_counters() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS ad_campaigns_counters ON public.ad_campaigns;
CREATE TRIGGER ad_campaigns_counters BEFORE INSERT OR UPDATE ON public.ad_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.ad_campaigns_protect_counters();

-- ---------------------------------------------------------------- RLS
ALTER TABLE public.ad_placements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_advertisers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_stats_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_event_dedupe ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_lead_recipients ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.ad_placements, public.ad_settings, public.ad_advertisers, public.ad_campaigns,
  public.ad_stats_daily, public.ad_event_dedupe, public.ad_leads, public.ad_lead_recipients
  FROM PUBLIC, anon, authenticated;

-- Espaços e configuração: leitura pública (sem segredos); escrita só admin.
GRANT SELECT ON public.ad_placements, public.ad_settings TO anon, authenticated;
GRANT UPDATE ON public.ad_placements, public.ad_settings TO authenticated;
DROP POLICY IF EXISTS "Public reads placements" ON public.ad_placements;
CREATE POLICY "Public reads placements" ON public.ad_placements FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "Admins update placements" ON public.ad_placements;
CREATE POLICY "Admins update placements" ON public.ad_placements FOR UPDATE TO authenticated
  USING (public.is_ads_admin()) WITH CHECK (public.is_ads_admin());
DROP POLICY IF EXISTS "Public reads ad settings" ON public.ad_settings;
CREATE POLICY "Public reads ad settings" ON public.ad_settings FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "Admins update ad settings" ON public.ad_settings;
CREATE POLICY "Admins update ad settings" ON public.ad_settings FOR UPDATE TO authenticated
  USING (public.is_ads_admin()) WITH CHECK (public.is_ads_admin());

-- Anunciantes e campanhas: só admin.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ad_advertisers, public.ad_campaigns TO authenticated;
DROP POLICY IF EXISTS "Admins manage advertisers" ON public.ad_advertisers;
CREATE POLICY "Admins manage advertisers" ON public.ad_advertisers FOR ALL TO authenticated
  USING (public.is_ads_admin()) WITH CHECK (public.is_ads_admin());
DROP POLICY IF EXISTS "Admins manage campaigns" ON public.ad_campaigns;
CREATE POLICY "Admins manage campaigns" ON public.ad_campaigns FOR ALL TO authenticated
  USING (public.is_ads_admin()) WITH CHECK (public.is_ads_admin());

-- Métricas: admin lê; ninguém escreve direto (só a função de eventos).
GRANT SELECT ON public.ad_stats_daily TO authenticated;
DROP POLICY IF EXISTS "Admins read ad stats" ON public.ad_stats_daily;
CREATE POLICY "Admins read ad stats" ON public.ad_stats_daily FOR SELECT TO authenticated USING (public.is_ads_admin());

-- Pedidos: entram só pela função submit_ad_lead; admin lê, muda status e apaga.
GRANT SELECT, UPDATE, DELETE ON public.ad_leads TO authenticated;
DROP POLICY IF EXISTS "Admins read leads" ON public.ad_leads;
CREATE POLICY "Admins read leads" ON public.ad_leads FOR SELECT TO authenticated USING (public.is_ads_admin());
DROP POLICY IF EXISTS "Admins update leads" ON public.ad_leads;
CREATE POLICY "Admins update leads" ON public.ad_leads FOR UPDATE TO authenticated
  USING (public.is_ads_admin()) WITH CHECK (public.is_ads_admin());
DROP POLICY IF EXISTS "Admins delete leads" ON public.ad_leads;
CREATE POLICY "Admins delete leads" ON public.ad_leads FOR DELETE TO authenticated USING (public.is_ads_admin());

-- Destinatários dos avisos: só admin vê e altera.
GRANT SELECT, INSERT, DELETE ON public.ad_lead_recipients TO authenticated;
DROP POLICY IF EXISTS "Admins manage lead recipients" ON public.ad_lead_recipients;
CREATE POLICY "Admins manage lead recipients" ON public.ad_lead_recipients FOR ALL TO authenticated
  USING (public.is_ads_admin()) WITH CHECK (public.is_ads_admin());

-- ad_event_dedupe: sem políticas e sem grants; só funções SECURITY DEFINER acessam.

-- ---------------------------------------------------------------- Seleção de anúncios
-- Elegível: status ativo, dentro do período (now() é absoluto; o fuso só importa na hora de cadastrar),
-- espaço habilitado, anunciante não arquivado e limite de impressões não atingido.
-- Sorteio ponderado (Efraimidis-Spirakis): peso definido no painel, com reforço de 50% para quem
-- recebeu menos impressões que a média do espaço, para equilibrar a exposição.
CREATE OR REPLACE FUNCTION public.get_ads_for_placement(_placement text, _count int DEFAULT 1)
RETURNS TABLE (id uuid, image_path text, image_mobile_path text, alt_text text, target_url text,
               advertiser_name text, revenue_type text)
LANGUAGE sql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH eligible AS (
    SELECT c.*, a.name AS adv_name
    FROM public.ad_campaigns c
    JOIN public.ad_advertisers a ON a.id = c.advertiser_id
    JOIN public.ad_placements p ON p.key = c.placement_key
    WHERE c.placement_key = _placement
      AND p.enabled
      AND NOT a.archived
      AND c.status = 'active'
      AND now() >= c.starts_at
      AND now() < c.ends_at
      AND (c.max_impressions IS NULL OR c.impressions_total < c.max_impressions)
  ), scored AS (
    SELECT e.*,
      e.weight * CASE WHEN e.impressions_total < avg(e.impressions_total) OVER () THEN 1.5 ELSE 1 END AS eff_weight
    FROM eligible e
  )
  SELECT s.id, s.image_path, s.image_mobile_path, s.alt_text, s.target_url, s.adv_name, s.revenue_type
  FROM scored s
  ORDER BY -ln(greatest(random(), 1e-9)) / s.eff_weight
  LIMIT least(greatest(coalesce(_count, 1), 1), 10);
$$;
REVOKE EXECUTE ON FUNCTION public.get_ads_for_placement(text, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_ads_for_placement(text, int) TO anon, authenticated;

-- ---------------------------------------------------------------- Registro de impressões e cliques
-- Uma impressão e um clique por campanha a cada 30 minutos por sessão anônima.
-- Clique só conta se a mesma sessão teve impressão da campanha na última hora.
-- Robôs identificados pelo User-Agent são ignorados. Nenhum IP ou dado pessoal é guardado.
CREATE OR REPLACE FUNCTION public.record_ad_event(_campaign_id uuid, _placement text, _kind text, _session text)
RETURNS boolean
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ua text := lower(coalesce(current_setting('request.headers', true)::json ->> 'user-agent', ''));
  win timestamptz := to_timestamp(floor(extract(epoch FROM now()) / 1800) * 1800);
  vhash text;
  inserted int;
  today date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
BEGIN
  IF _kind NOT IN ('impression', 'click') THEN RETURN false; END IF;
  IF _session IS NULL OR _session !~ '^[A-Za-z0-9-]{16,64}$' THEN RETURN false; END IF;
  IF ua = '' OR ua ~ '(bot|crawler|spider|slurp|headless|lighthouse|preview|facebookexternalhit|curl|wget|python|scrapy)' THEN
    RETURN false;
  END IF;
  IF public.is_ads_admin() THEN RETURN false; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.ad_campaigns c
    WHERE c.id = _campaign_id AND c.placement_key = _placement AND c.status = 'active'
      AND now() >= c.starts_at AND now() < c.ends_at
  ) THEN
    RETURN false;
  END IF;

  vhash := md5(_session || ':' || _campaign_id::text);

  IF _kind = 'click' AND NOT EXISTS (
    SELECT 1 FROM public.ad_event_dedupe d
    WHERE d.campaign_id = _campaign_id AND d.kind = 'impression' AND d.visitor_hash = vhash
      AND d.window_start >= win - interval '1 hour'
  ) THEN
    RETURN false;
  END IF;

  INSERT INTO public.ad_event_dedupe (campaign_id, kind, visitor_hash, window_start)
  VALUES (_campaign_id, _kind, vhash, win)
  ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS inserted = ROW_COUNT;
  IF inserted = 0 THEN RETURN false; END IF;

  INSERT INTO public.ad_stats_daily AS s (campaign_id, day, placement_key, impressions, clicks)
  VALUES (_campaign_id, today, _placement,
          CASE WHEN _kind = 'impression' THEN 1 ELSE 0 END,
          CASE WHEN _kind = 'click' THEN 1 ELSE 0 END)
  ON CONFLICT (campaign_id, day, placement_key) DO UPDATE
    SET impressions = s.impressions + EXCLUDED.impressions,
        clicks = s.clicks + EXCLUDED.clicks;

  PERFORM set_config('ads.counting', 'on', true);
  UPDATE public.ad_campaigns
    SET impressions_total = impressions_total + CASE WHEN _kind = 'impression' THEN 1 ELSE 0 END,
        clicks_total = clicks_total + CASE WHEN _kind = 'click' THEN 1 ELSE 0 END
    WHERE id = _campaign_id;
  PERFORM set_config('ads.counting', 'off', true);

  IF random() < 0.01 THEN
    DELETE FROM public.ad_event_dedupe WHERE window_start < now() - interval '2 days';
  END IF;
  RETURN true;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.record_ad_event(uuid, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_ad_event(uuid, text, text, text) TO anon, authenticated;

-- ---------------------------------------------------------------- Formulário "Anuncie conosco"
-- Proteções: campo isca (honeypot), tempo mínimo de preenchimento, consentimento obrigatório,
-- limite por e-mail (3/dia) e limite global (30/hora). Respostas genéricas para não vazar regras.
CREATE OR REPLACE FUNCTION public.submit_ad_lead(
  _name text, _company text, _email text, _phone text, _interest text, _message text,
  _consent boolean, _honeypot text, _elapsed_ms int
)
RETURNS text
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  e text := lower(btrim(coalesce(_email, '')));
BEGIN
  IF coalesce(_honeypot, '') <> '' OR coalesce(_elapsed_ms, 0) < 3000 THEN
    RETURN 'ok';
  END IF;
  IF _consent IS NOT TRUE THEN RETURN 'consent'; END IF;
  IF char_length(btrim(coalesce(_name, ''))) NOT BETWEEN 2 AND 120
    OR char_length(e) > 254 OR e !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
    OR char_length(btrim(coalesce(_message, ''))) NOT BETWEEN 10 AND 2000
    OR char_length(coalesce(_company, '')) > 120
    OR char_length(coalesce(_phone, '')) > 40
    OR char_length(coalesce(_interest, '')) > 60 THEN
    RETURN 'invalid';
  END IF;
  IF (SELECT count(*) FROM public.ad_leads WHERE email = e AND created_at > now() - interval '1 day') >= 3
    OR (SELECT count(*) FROM public.ad_leads WHERE created_at > now() - interval '1 hour') >= 30 THEN
    RETURN 'rate_limited';
  END IF;

  INSERT INTO public.ad_leads (name, company, email, phone, interest, message)
  VALUES (btrim(_name), btrim(coalesce(_company, '')), e, btrim(coalesce(_phone, '')),
          btrim(coalesce(_interest, '')), btrim(_message));
  RETURN 'ok';
END;
$$;
REVOKE EXECUTE ON FUNCTION public.submit_ad_lead(text, text, text, text, text, text, boolean, text, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_ad_lead(text, text, text, text, text, text, boolean, text, int) TO anon, authenticated;

-- ---------------------------------------------------------------- Armazenamento das imagens
-- Bucket público (as imagens são exibidas no site), até 1 MB, só imagens. Envio/alteração só por admin.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('ads', 'ads', true, 1048576, ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif'])
ON CONFLICT (id) DO UPDATE
  SET public = EXCLUDED.public, file_size_limit = EXCLUDED.file_size_limit, allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Admins upload ad images" ON storage.objects;
CREATE POLICY "Admins upload ad images" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'ads' AND public.is_ads_admin());
DROP POLICY IF EXISTS "Admins update ad images" ON storage.objects;
CREATE POLICY "Admins update ad images" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'ads' AND public.is_ads_admin()) WITH CHECK (bucket_id = 'ads' AND public.is_ads_admin());
DROP POLICY IF EXISTS "Admins delete ad images" ON storage.objects;
CREATE POLICY "Admins delete ad images" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'ads' AND public.is_ads_admin());

-- ROLLBACK (apaga anúncios, métricas e pedidos):
-- DROP POLICY IF EXISTS "Admins upload ad images" ON storage.objects;
-- DROP POLICY IF EXISTS "Admins update ad images" ON storage.objects;
-- DROP POLICY IF EXISTS "Admins delete ad images" ON storage.objects;
-- (o bucket 'ads' precisa ser esvaziado e removido pelo painel de Storage)
-- DROP FUNCTION IF EXISTS public.submit_ad_lead(text, text, text, text, text, text, boolean, text, int);
-- DROP FUNCTION IF EXISTS public.record_ad_event(uuid, text, text, text);
-- DROP FUNCTION IF EXISTS public.get_ads_for_placement(text, int);
-- DROP TABLE IF EXISTS public.ad_lead_recipients, public.ad_leads, public.ad_event_dedupe, public.ad_stats_daily, public.ad_campaigns,
--   public.ad_advertisers, public.ad_settings, public.ad_placements;
-- DROP FUNCTION IF EXISTS public.ad_campaigns_protect_counters();
-- DROP FUNCTION IF EXISTS public.ads_touch_updated_at();
-- DROP FUNCTION IF EXISTS public.is_ads_admin();
