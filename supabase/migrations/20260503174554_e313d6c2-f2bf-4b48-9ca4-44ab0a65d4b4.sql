ALTER TABLE public.categorias
ADD COLUMN IF NOT EXISTS mostrar_filtros_classificacao boolean NOT NULL DEFAULT true;

CREATE OR REPLACE FUNCTION public.set_ponto_ordem_final()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.ordem IS NULL OR NEW.ordem <= 0 THEN
    SELECT COALESCE(MAX(p.ordem), 0) + 10
    INTO NEW.ordem
    FROM public.pontos p
    WHERE p.categoria = NEW.categoria;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_ponto_ordem_final_before_insert ON public.pontos;
CREATE TRIGGER set_ponto_ordem_final_before_insert
BEFORE INSERT ON public.pontos
FOR EACH ROW
EXECUTE FUNCTION public.set_ponto_ordem_final();

WITH ordered AS (
  SELECT
    id,
    ROW_NUMBER() OVER (PARTITION BY categoria ORDER BY ordem ASC, created_at ASC, id ASC) * 10 AS nova_ordem
  FROM public.pontos
)
UPDATE public.pontos p
SET ordem = ordered.nova_ordem
FROM ordered
WHERE p.id = ordered.id;