CREATE OR REPLACE FUNCTION public.get_signup_stats(_from date, _to date)
RETURNS TABLE(day date, signups bigint)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  IF NOT public.is_ads_admin() THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  SELECT (u.created_at AT TIME ZONE 'America/Sao_Paulo')::date AS day, count(*)::bigint AS signups
  FROM auth.users u
  WHERE (u.created_at AT TIME ZONE 'America/Sao_Paulo')::date BETWEEN _from AND _to
  GROUP BY (u.created_at AT TIME ZONE 'America/Sao_Paulo')::date
  ORDER BY day;
END;
$function$;
REVOKE ALL ON FUNCTION public.get_signup_stats(date, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_signup_stats(date, date) TO authenticated, service_role;