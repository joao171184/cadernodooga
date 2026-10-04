-- Histórico de envios dos avisos (Brevo): resultado guardado de forma permanente,
-- listagem com filtros e remoção pelo painel. Requer a 0006. Idempotente. ROLLBACK no fim.
-- As respostas do pg_net (net._http_response) expiram em poucas horas; por isso o código
-- e a mensagem do Brevo são copiados para ad_notify_log. Nunca guarda a chave nem destinatários.

ALTER TABLE public.ad_notify_log
  ADD COLUMN IF NOT EXISTS status_code int,
  ADD COLUMN IF NOT EXISTS timed_out boolean,
  ADD COLUMN IF NOT EXISTS error text CHECK (error IS NULL OR char_length(error) <= 300);

-- Mensagem legível da resposta do Brevo ({"message": "..."}), ou o texto bruto se não for JSON.
CREATE OR REPLACE FUNCTION public.ads_response_message(_content text, _error text)
RETURNS text LANGUAGE plpgsql IMMUTABLE SET search_path = public AS $$
BEGIN
  IF _content IS NOT NULL AND _content <> '' THEN
    BEGIN
      RETURN left(coalesce(_content::jsonb ->> 'message', _content), 300);
    EXCEPTION WHEN OTHERS THEN
      RETURN left(_content, 300);
    END;
  END IF;
  RETURN left(_error, 300);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.ads_response_message(text, text) FROM PUBLIC, anon, authenticated;

-- Copia para o histórico as respostas que o pg_net já recebeu.
CREATE OR REPLACE FUNCTION public.ads_notify_sync_log()
RETURNS void LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.ad_notify_log l
  SET status_code = r.status_code,
      timed_out = r.timed_out,
      error = CASE WHEN r.status_code BETWEEN 200 AND 299 THEN NULL
                   ELSE public.ads_response_message(r.content, r.error_msg) END
  FROM net._http_response r
  WHERE r.id = l.request_id
    AND l.status_code IS NULL
    AND l.timed_out IS NULL
    AND (r.status_code IS NOT NULL OR r.timed_out IS TRUE OR r.error_msg IS NOT NULL);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.ads_notify_sync_log() FROM PUBLIC, anon, authenticated;

-- Filtro comum: _kind 'lead' | 'test' | NULL; _result 'ok' | 'error' | 'pending' | NULL.
CREATE OR REPLACE FUNCTION public.ads_notify_log_matches(l public.ad_notify_log, _kind text, _result text)
RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT (_kind IS NULL OR l.kind = _kind)
    AND (
      _result IS NULL
      OR (_result = 'ok' AND l.status_code BETWEEN 200 AND 299)
      OR (_result = 'error' AND ((l.status_code IS NOT NULL AND l.status_code NOT BETWEEN 200 AND 299)
                                 OR l.timed_out IS TRUE OR (l.status_code IS NULL AND l.error IS NOT NULL)))
      OR (_result = 'pending' AND l.status_code IS NULL AND l.timed_out IS NOT TRUE AND l.error IS NULL)
    );
$$;
REVOKE EXECUTE ON FUNCTION public.ads_notify_log_matches(public.ad_notify_log, text, text) FROM PUBLIC, anon, authenticated;

-- Situação para o painel: agora também sincroniza e devolve o último envio já com resultado.
CREATE OR REPLACE FUNCTION public.ads_notify_status()
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_ads_admin() THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  PERFORM public.ads_notify_sync_log();
  RETURN jsonb_build_object(
    'key_configured', EXISTS (
      SELECT 1 FROM vault.decrypted_secrets WHERE name = 'brevo_ads_api_key' AND coalesce(decrypted_secret, '') <> ''
    ),
    'recipients', (SELECT count(*) FROM public.ad_lead_recipients),
    'recent', coalesce((
      SELECT jsonb_agg(x ORDER BY x.created_at DESC)
      FROM (
        SELECT id, created_at, kind, status_code, timed_out, error
        FROM public.ad_notify_log
        ORDER BY created_at DESC
        LIMIT 1
      ) x
    ), '[]'::jsonb)
  );
END;
$$;

-- Histórico com filtros. _limit NULL = todos (até 1000).
CREATE OR REPLACE FUNCTION public.ads_notify_history(_kind text DEFAULT NULL, _result text DEFAULT NULL, _limit int DEFAULT 10)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  lim int := least(greatest(coalesce(_limit, 1000), 1), 1000);
BEGIN
  IF NOT public.is_ads_admin() THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  PERFORM public.ads_notify_sync_log();
  RETURN jsonb_build_object(
    'total', (SELECT count(*) FROM public.ad_notify_log l WHERE public.ads_notify_log_matches(l, _kind, _result)),
    'items', coalesce((
      SELECT jsonb_agg(x ORDER BY x.created_at DESC)
      FROM (
        SELECT l.id, l.created_at, l.kind, l.status_code, l.timed_out, l.error
        FROM public.ad_notify_log l
        WHERE public.ads_notify_log_matches(l, _kind, _result)
        ORDER BY l.created_at DESC
        LIMIT lim
      ) x
    ), '[]'::jsonb)
  );
END;
$$;
REVOKE EXECUTE ON FUNCTION public.ads_notify_history(text, text, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ads_notify_history(text, text, int) TO authenticated;

-- Remove registros do histórico: pelos ids informados, ou todos os que batem com o filtro.
-- Não afeta e-mails já enviados nem os pedidos. Retorna quantos foram apagados.
CREATE OR REPLACE FUNCTION public.ads_notify_delete(_ids bigint[] DEFAULT NULL, _kind text DEFAULT NULL, _result text DEFAULT NULL)
RETURNS int
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n int;
BEGIN
  IF NOT public.is_ads_admin() THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  IF _ids IS NOT NULL THEN
    DELETE FROM public.ad_notify_log WHERE id = ANY (_ids);
  ELSE
    DELETE FROM public.ad_notify_log l WHERE public.ads_notify_log_matches(l, _kind, _result);
  END IF;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.ads_notify_delete(bigint[], text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ads_notify_delete(bigint[], text, text) TO authenticated;

-- Guarda já o que o pg_net ainda tem dos envios feitos antes desta migração.
SELECT public.ads_notify_sync_log();

-- ROLLBACK:
-- DROP FUNCTION IF EXISTS public.ads_notify_delete(bigint[], text, text);
-- DROP FUNCTION IF EXISTS public.ads_notify_history(text, text, int);
-- DROP FUNCTION IF EXISTS public.ads_notify_log_matches(public.ad_notify_log, text, text);
-- DROP FUNCTION IF EXISTS public.ads_notify_sync_log();
-- DROP FUNCTION IF EXISTS public.ads_response_message(text, text);
-- ALTER TABLE public.ad_notify_log DROP COLUMN IF EXISTS status_code, DROP COLUMN IF EXISTS timed_out, DROP COLUMN IF EXISTS error;
-- Depois, rode de novo a definição de ads_notify_status da 0006.
