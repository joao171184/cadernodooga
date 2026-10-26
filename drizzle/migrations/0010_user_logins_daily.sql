CREATE TABLE public.user_logins_daily (
  user_id uuid NOT NULL,
  day date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, day)
);
GRANT SELECT ON public.user_logins_daily TO authenticated;
GRANT ALL ON public.user_logins_daily TO service_role;
ALTER TABLE public.user_logins_daily ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read logins" ON public.user_logins_daily FOR SELECT TO authenticated USING (public.is_ads_admin());

CREATE OR REPLACE FUNCTION public.record_login()
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO public.user_logins_daily (user_id, day)
  SELECT auth.uid(), (now() AT TIME ZONE 'America/Sao_Paulo')::date
  WHERE auth.uid() IS NOT NULL
  ON CONFLICT DO NOTHING;
$$;
REVOKE ALL ON FUNCTION public.record_login() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_login() TO authenticated;

CREATE OR REPLACE FUNCTION public.get_login_stats(_from date, _to date)
RETURNS TABLE(day date, logins bigint) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_ads_admin() THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  RETURN QUERY SELECT l.day, count(*)::bigint FROM public.user_logins_daily l
    WHERE l.day BETWEEN _from AND _to GROUP BY l.day ORDER BY l.day;
END;
$$;
REVOKE ALL ON FUNCTION public.get_login_stats(date, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_login_stats(date, date) TO authenticated;

INSERT INTO public.user_logins_daily (user_id, day)
SELECT id, (last_sign_in_at AT TIME ZONE 'America/Sao_Paulo')::date FROM auth.users WHERE last_sign_in_at IS NOT NULL
ON CONFLICT DO NOTHING;