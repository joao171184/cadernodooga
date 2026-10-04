-- Aviso por e-mail (Brevo) de novos pedidos do "Anuncie conosco".
-- Envia só para os usuários escolhidos em ad_lead_recipients (migração 0005), um e-mail por destinatário.
-- Não mexe em autenticação nem nos e-mails de login (continuam no Lovable Cloud).
-- A chave do Brevo fica no Vault com o nome 'brevo_ads_api_key'; nunca no código.
-- O envio é assíncrono (pg_net): falha no Brevo nunca impede o pedido de ser gravado.
-- Requer a 0005. Idempotente. ROLLBACK no fim do arquivo.

CREATE EXTENSION IF NOT EXISTS pg_net;

-- ---------------------------------------------------------------- Configuração (só admin)
CREATE TABLE IF NOT EXISTS public.ad_notify_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  enabled boolean NOT NULL DEFAULT false,
  sender_email text CHECK (
    sender_email IS NULL OR (char_length(sender_email) <= 254 AND sender_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$')
  ),
  sender_name text NOT NULL DEFAULT 'Caderno do Ogã' CHECK (char_length(btrim(sender_name)) BETWEEN 1 AND 70),
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.ad_notify_settings (id) VALUES (true) ON CONFLICT (id) DO NOTHING;

DROP TRIGGER IF EXISTS ad_notify_settings_touch ON public.ad_notify_settings;
CREATE TRIGGER ad_notify_settings_touch BEFORE UPDATE ON public.ad_notify_settings
  FOR EACH ROW EXECUTE FUNCTION public.ads_touch_updated_at();

-- Registro dos envios (para o painel mostrar se o Brevo aceitou). Sem conteúdo nem destinatários.
CREATE TABLE IF NOT EXISTS public.ad_notify_log (
  id bigserial PRIMARY KEY,
  kind text NOT NULL CHECK (kind IN ('lead', 'test')),
  request_id bigint,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ad_notify_log_created_idx ON public.ad_notify_log (created_at DESC);

ALTER TABLE public.ad_notify_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_notify_log ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ad_notify_settings, public.ad_notify_log FROM PUBLIC, anon, authenticated;
REVOKE ALL ON SEQUENCE public.ad_notify_log_id_seq FROM PUBLIC, anon, authenticated;

GRANT SELECT, UPDATE ON public.ad_notify_settings TO authenticated;
DROP POLICY IF EXISTS "Admins read notify settings" ON public.ad_notify_settings;
CREATE POLICY "Admins read notify settings" ON public.ad_notify_settings FOR SELECT TO authenticated
  USING (public.is_ads_admin());
DROP POLICY IF EXISTS "Admins update notify settings" ON public.ad_notify_settings;
CREATE POLICY "Admins update notify settings" ON public.ad_notify_settings FOR UPDATE TO authenticated
  USING (public.is_ads_admin()) WITH CHECK (public.is_ads_admin());
-- ad_notify_log: sem políticas; o painel lê pela função ads_notify_status.

-- ---------------------------------------------------------------- Envio
CREATE OR REPLACE FUNCTION public.ads_html_escape(_s text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT replace(replace(replace(replace(replace(coalesce(_s, ''),
    '&', '&amp;'), '<', '&lt;'), '>', '&gt;'), '"', '&quot;'), '''', '&#39;');
$$;
REVOKE EXECUTE ON FUNCTION public.ads_html_escape(text) FROM PUBLIC, anon, authenticated;

-- Retorna: sent | disabled | no_sender | no_key | no_recipients
CREATE OR REPLACE FUNCTION public.ads_send_lead_email(_name text, _company text, _interest text, _kind text)
RETURNS text
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s public.ad_notify_settings;
  api_key text;
  rcpt text;
  sent int := 0;
  req bigint;
  who text := left(regexp_replace(btrim(coalesce(_name, '')), '\s+', ' ', 'g'), 80);
  org text := left(regexp_replace(btrim(coalesce(_company, '')), '\s+', ' ', 'g'), 80);
  subj text;
  html text;
  txt text;
  panel constant text := 'https://cadernodooga.com.br/admin/publicidade';
BEGIN
  SELECT * INTO s FROM public.ad_notify_settings WHERE id;
  IF _kind = 'lead' AND NOT coalesce(s.enabled, false) THEN RETURN 'disabled'; END IF;
  IF s.sender_email IS NULL THEN RETURN 'no_sender'; END IF;

  SELECT decrypted_secret INTO api_key FROM vault.decrypted_secrets WHERE name = 'brevo_ads_api_key' LIMIT 1;
  IF coalesce(api_key, '') = '' THEN RETURN 'no_key'; END IF;

  IF _kind = 'test' THEN
    subj := 'Teste: avisos do Anuncie conosco';
    txt := 'Este é um e-mail de teste dos avisos de novos pedidos de publicidade. Painel: ' || panel;
    html := '<p>Este é um e-mail de teste dos avisos de novos pedidos de publicidade do Caderno do Ogã.</p>'
      || '<p><a href="' || panel || '">Abrir o painel de publicidade</a></p>';
  ELSE
    subj := 'Novo pedido de publicidade: ' || who || CASE WHEN org <> '' THEN ' (' || org || ')' ELSE '' END;
    txt := 'Novo pedido pelo Anuncie conosco.' || E'\n'
      || 'Nome: ' || who || E'\n'
      || CASE WHEN org <> '' THEN 'Empresa: ' || org || E'\n' ELSE '' END
      || CASE WHEN coalesce(_interest, '') <> '' THEN 'Interesse: ' || left(_interest, 60) || E'\n' ELSE '' END
      || 'Veja os dados de contato no painel: ' || panel;
    html := '<p>Novo pedido pelo <strong>Anuncie conosco</strong>.</p><ul>'
      || '<li>Nome: ' || public.ads_html_escape(who) || '</li>'
      || CASE WHEN org <> '' THEN '<li>Empresa: ' || public.ads_html_escape(org) || '</li>' ELSE '' END
      || CASE WHEN coalesce(_interest, '') <> '' THEN '<li>Interesse: ' || public.ads_html_escape(left(_interest, 60)) || '</li>' ELSE '' END
      || '</ul><p>Os dados de contato e a mensagem estão no painel:</p>'
      || '<p><a href="' || panel || '">Abrir o painel de publicidade</a></p>';
  END IF;

  FOR rcpt IN
    SELECT DISTINCT lower(p.email)
    FROM public.ad_lead_recipients r
    JOIN public.profiles p ON p.id = r.user_id
    WHERE coalesce(p.email, '') <> ''
  LOOP
    SELECT net.http_post(
      url := 'https://api.brevo.com/v3/smtp/email',
      headers := jsonb_build_object('api-key', api_key, 'Content-Type', 'application/json', 'Accept', 'application/json'),
      body := jsonb_build_object(
        'sender', jsonb_build_object('email', s.sender_email, 'name', s.sender_name),
        'to', jsonb_build_array(jsonb_build_object('email', rcpt)),
        'subject', subj,
        'htmlContent', html,
        'textContent', txt,
        'tags', jsonb_build_array('anuncie-conosco')
      ),
      timeout_milliseconds := 10000
    ) INTO req;
    INSERT INTO public.ad_notify_log (kind, request_id) VALUES (_kind, req);
    sent := sent + 1;
  END LOOP;

  IF sent = 0 THEN RETURN 'no_recipients'; END IF;
  DELETE FROM public.ad_notify_log WHERE created_at < now() - interval '30 days';
  RETURN 'sent';
END;
$$;
REVOKE EXECUTE ON FUNCTION public.ads_send_lead_email(text, text, text, text) FROM PUBLIC, anon, authenticated;

-- Trigger: qualquer erro vira aviso no log do banco; o pedido é gravado mesmo assim.
CREATE OR REPLACE FUNCTION public.ads_notify_new_lead()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  BEGIN
    PERFORM public.ads_send_lead_email(NEW.name, NEW.company, NEW.interest, 'lead');
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'ads_notify_new_lead falhou: %', SQLERRM;
  END;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.ads_notify_new_lead() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS ad_leads_notify ON public.ad_leads;
CREATE TRIGGER ad_leads_notify AFTER INSERT ON public.ad_leads
  FOR EACH ROW EXECUTE FUNCTION public.ads_notify_new_lead();

-- ---------------------------------------------------------------- Painel
-- Situação dos avisos: chave configurada (sem revelar o valor), destinatários e últimos envios.
CREATE OR REPLACE FUNCTION public.ads_notify_status()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_ads_admin() THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  RETURN jsonb_build_object(
    'key_configured', EXISTS (
      SELECT 1 FROM vault.decrypted_secrets WHERE name = 'brevo_ads_api_key' AND coalesce(decrypted_secret, '') <> ''
    ),
    'recipients', (SELECT count(*) FROM public.ad_lead_recipients),
    'recent', coalesce((
      SELECT jsonb_agg(x ORDER BY x.created_at DESC)
      FROM (
        SELECT l.created_at, l.kind, r.status_code, r.timed_out, left(r.error_msg, 200) AS error
        FROM public.ad_notify_log l
        LEFT JOIN net._http_response r ON r.id = l.request_id
        ORDER BY l.created_at DESC
        LIMIT 10
      ) x
    ), '[]'::jsonb)
  );
END;
$$;
REVOKE EXECUTE ON FUNCTION public.ads_notify_status() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ads_notify_status() TO authenticated;

-- E-mail de teste para os destinatários (máximo 5 por hora).
CREATE OR REPLACE FUNCTION public.ads_send_test_notification()
RETURNS text
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_ads_admin() THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  IF (SELECT count(*) FROM public.ad_notify_log WHERE kind = 'test' AND created_at > now() - interval '1 hour') >= 5 THEN
    RETURN 'rate_limited';
  END IF;
  RETURN public.ads_send_lead_email(NULL, NULL, NULL, 'test');
END;
$$;
REVOKE EXECUTE ON FUNCTION public.ads_send_test_notification() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ads_send_test_notification() TO authenticated;

-- ---------------------------------------------------------------- Chave do Brevo (rodar à parte, uma vez)
-- Cole a chave só no editor SQL do Lovable, nunca em arquivos:
--   SELECT vault.create_secret('CHAVE_DO_BREVO', 'brevo_ads_api_key', 'Brevo: avisos do Anuncie conosco');
-- Para trocar a chave:
--   SELECT vault.update_secret((SELECT id FROM vault.secrets WHERE name = 'brevo_ads_api_key'), 'CHAVE_NOVA');
-- Para remover:
--   DELETE FROM vault.secrets WHERE name = 'brevo_ads_api_key';

-- ROLLBACK:
-- DROP TRIGGER IF EXISTS ad_leads_notify ON public.ad_leads;
-- DROP FUNCTION IF EXISTS public.ads_send_test_notification();
-- DROP FUNCTION IF EXISTS public.ads_notify_status();
-- DROP FUNCTION IF EXISTS public.ads_notify_new_lead();
-- DROP FUNCTION IF EXISTS public.ads_send_lead_email(text, text, text, text);
-- DROP FUNCTION IF EXISTS public.ads_html_escape(text);
-- DROP TABLE IF EXISTS public.ad_notify_log, public.ad_notify_settings;
-- DELETE FROM vault.secrets WHERE name = 'brevo_ads_api_key';
-- DROP EXTENSION IF EXISTS pg_net;  -- só se nada mais usar
