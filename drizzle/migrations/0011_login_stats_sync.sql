CREATE OR REPLACE FUNCTION public.get_login_stats(_from date, _to date)
RETURNS TABLE(day date, logins bigint) LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_ads_admin() THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  INSERT INTO public.user_logins_daily (user_id, day)
  SELECT u.id, (u.last_sign_in_at AT TIME ZONE 'America/Sao_Paulo')::date FROM auth.users u WHERE u.last_sign_in_at IS NOT NULL
  ON CONFLICT DO NOTHING;
  RETURN QUERY SELECT l.day, count(*)::bigint FROM public.user_logins_daily l
    WHERE l.day BETWEEN _from AND _to GROUP BY l.day ORDER BY l.day;
END;
$$;
REVOKE ALL ON FUNCTION public.get_login_stats(date, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_login_stats(date, date) TO authenticated;