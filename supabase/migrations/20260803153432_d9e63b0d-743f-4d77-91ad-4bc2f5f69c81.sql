CREATE OR REPLACE FUNCTION public.pontos_set_slug()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  base text;
  candidate text;
  n int := 1;
  needs_new boolean := false;
BEGIN
  IF TG_OP = 'INSERT' THEN
    needs_new := (NEW.slug IS NULL OR NEW.slug = '');
  ELSE
    -- slug definido manualmente nesta atualização: respeita
    IF NEW.slug IS DISTINCT FROM OLD.slug AND NEW.slug IS NOT NULL AND NEW.slug <> '' THEN
      RETURN NEW;
    END IF;
    needs_new := (NEW.slug IS NULL OR NEW.slug = '' OR NEW.nome IS DISTINCT FROM OLD.nome);
  END IF;

  IF NOT needs_new THEN
    RETURN NEW;
  END IF;

  base := public.slugify(NEW.nome);
  IF base IS NULL OR base = '' THEN
    base := 'ponto';
  END IF;

  candidate := base;
  WHILE EXISTS (
    SELECT 1 FROM public.pontos
    WHERE slug = candidate
      AND (TG_OP = 'INSERT' OR id <> NEW.id)
  ) LOOP
    n := n + 1;
    candidate := base || '-' || n;
  END LOOP;

  NEW.slug := candidate;
  RETURN NEW;
END;
$function$;