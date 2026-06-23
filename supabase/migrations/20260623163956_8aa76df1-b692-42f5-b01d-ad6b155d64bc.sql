
-- Extensão para remover acentos
CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA extensions;

-- slugify helper
CREATE OR REPLACE FUNCTION public.slugify(_text text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public, extensions
AS $$
  SELECT trim(both '-' from
    regexp_replace(
      regexp_replace(
        lower(extensions.unaccent(coalesce(_text, ''))),
        '[^a-z0-9]+', '-', 'g'
      ),
      '-+', '-', 'g'
    )
  );
$$;

-- Coluna slug
ALTER TABLE public.pontos ADD COLUMN IF NOT EXISTS slug text;

-- Trigger que mantém slug único a partir de nome
CREATE OR REPLACE FUNCTION public.pontos_set_slug()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  base text;
  candidate text;
  n int := 1;
BEGIN
  IF NEW.slug IS NOT NULL AND NEW.slug <> '' AND (TG_OP = 'UPDATE' AND NEW.slug = OLD.slug) THEN
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
$$;

DROP TRIGGER IF EXISTS pontos_set_slug_trg ON public.pontos;
CREATE TRIGGER pontos_set_slug_trg
BEFORE INSERT OR UPDATE OF nome, slug ON public.pontos
FOR EACH ROW EXECUTE FUNCTION public.pontos_set_slug();

-- Backfill dos slugs existentes (linha por linha para usar a lógica de unicidade)
DO $$
DECLARE
  r RECORD;
  base text;
  candidate text;
  n int;
BEGIN
  FOR r IN SELECT id, nome FROM public.pontos WHERE slug IS NULL OR slug = '' ORDER BY created_at LOOP
    base := public.slugify(r.nome);
    IF base IS NULL OR base = '' THEN base := 'ponto'; END IF;
    candidate := base;
    n := 1;
    WHILE EXISTS (SELECT 1 FROM public.pontos WHERE slug = candidate) LOOP
      n := n + 1;
      candidate := base || '-' || n;
    END LOOP;
    UPDATE public.pontos SET slug = candidate WHERE id = r.id;
  END LOOP;
END $$;

ALTER TABLE public.pontos ALTER COLUMN slug SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS pontos_slug_key ON public.pontos(slug);

-- Acesso público de leitura para renderizar /ponto/:slug
GRANT SELECT ON public.pontos TO anon;
GRANT SELECT ON public.ponto_subcategorias TO anon;
GRANT SELECT ON public.ponto_classificacoes TO anon;
GRANT SELECT ON public.ponto_toque_ordem TO anon;
GRANT SELECT ON public.categorias TO anon;

CREATE POLICY "Anon can view approved pontos"
ON public.pontos
FOR SELECT
TO anon
USING (status = 'approved');

CREATE POLICY "Anon can view subcategorias of approved pontos"
ON public.ponto_subcategorias
FOR SELECT
TO anon
USING (EXISTS (
  SELECT 1 FROM public.pontos p
  WHERE p.id = ponto_subcategorias.ponto_id AND p.status = 'approved'
));

CREATE POLICY "Anon can view classificacoes of approved pontos"
ON public.ponto_classificacoes
FOR SELECT
TO anon
USING (EXISTS (
  SELECT 1 FROM public.pontos p
  WHERE p.id = ponto_classificacoes.ponto_id AND p.status = 'approved'
));

CREATE POLICY "Anon can view toque_ordem of approved pontos"
ON public.ponto_toque_ordem
FOR SELECT
TO anon
USING (EXISTS (
  SELECT 1 FROM public.pontos p
  WHERE p.id = ponto_toque_ordem.ponto_id AND p.status = 'approved'
));

CREATE POLICY "Anon can view categorias"
ON public.categorias
FOR SELECT
TO anon
USING (true);
