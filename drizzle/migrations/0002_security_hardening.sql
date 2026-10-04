-- Endurecimento de segurança (auditoria 2026-10).
-- Revise e aplique primeiro em ambiente de teste. Rollback no final do arquivo.

-- ============ 1) Super-admin por tabela, não por e-mail no JWT ============
CREATE TABLE IF NOT EXISTS public.super_admins (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.super_admins ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.super_admins FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.super_admins TO service_role;

-- Migra os super-admins atuais, somente contas com e-mail confirmado.
INSERT INTO public.super_admins (user_id)
SELECT id FROM auth.users
WHERE lower(email) IN ('joao.pedro.am.171@gmail.com', 'joao.pedro.am@icloud.com')
  AND email_confirmed_at IS NOT NULL
ON CONFLICT (user_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT _user_id IS NOT NULL
     AND _user_id = auth.uid()
     AND EXISTS (
       SELECT 1
       FROM public.super_admins s
       JOIN auth.users u ON u.id = s.user_id
       WHERE s.user_id = _user_id
         AND u.email_confirmed_at IS NOT NULL
     );
$$;
REVOKE EXECUTE ON FUNCTION public.is_super_admin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_super_admin(uuid) TO authenticated;

-- ============ 2) Cadastro nunca concede papel privilegiado ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email) VALUES (NEW.id, NEW.email);
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'visitante'::public.app_role);
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- ============ 3) Moderação de pontos imposta no servidor ============
CREATE OR REPLACE FUNCTION public.pontos_enforce_moderation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  privileged boolean;
BEGIN
  -- service_role / manutenção direta no banco
  IF uid IS NULL THEN
    RETURN NEW;
  END IF;

  privileged := public.has_role(uid, 'admin'::public.app_role) OR public.is_super_admin(uid);

  IF TG_OP = 'INSERT' THEN
    NEW.created_by := uid;
    IF NOT privileged THEN
      NEW.status := 'pending'::public.ponto_status;
      NEW.approved_by := NULL;
      NEW.approved_at := NULL;
    END IF;
    RETURN NEW;
  END IF;

  NEW.created_by := OLD.created_by;

  IF NOT privileged THEN
    IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status <> 'pending'::public.ponto_status THEN
      RAISE EXCEPTION 'Somente administradores podem aprovar ou rejeitar pontos'
        USING ERRCODE = '42501';
    END IF;
    IF NEW.status = 'pending'::public.ponto_status THEN
      NEW.approved_by := NULL;
      NEW.approved_at := NULL;
    ELSE
      NEW.approved_by := OLD.approved_by;
      NEW.approved_at := OLD.approved_at;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.pontos_enforce_moderation() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS pontos_enforce_moderation_trg ON public.pontos;
CREATE TRIGGER pontos_enforce_moderation_trg
BEFORE INSERT OR UPDATE ON public.pontos
FOR EACH ROW EXECUTE FUNCTION public.pontos_enforce_moderation();

-- ============ 4) Tabelas filhas: dono só altera enquanto o ponto está pendente ============
DROP POLICY IF EXISTS "Insert ponto_subcategorias if owner or admin" ON public.ponto_subcategorias;
CREATE POLICY "Insert ponto_subcategorias if owner or admin"
ON public.ponto_subcategorias FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM public.pontos p
  WHERE p.id = ponto_subcategorias.ponto_id
    AND ((p.created_by = auth.uid() AND p.status = 'pending'::public.ponto_status)
      OR public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.is_super_admin(auth.uid())
      OR public.has_permission(auth.uid(), 'edit_pontos'))
));

DROP POLICY IF EXISTS "Delete ponto_subcategorias if owner or admin" ON public.ponto_subcategorias;
CREATE POLICY "Delete ponto_subcategorias if owner or admin"
ON public.ponto_subcategorias FOR DELETE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.pontos p
  WHERE p.id = ponto_subcategorias.ponto_id
    AND ((p.created_by = auth.uid() AND p.status = 'pending'::public.ponto_status)
      OR public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.is_super_admin(auth.uid())
      OR public.has_permission(auth.uid(), 'edit_pontos'))
));

DROP POLICY IF EXISTS "Update ponto_subcategorias if owner or admin" ON public.ponto_subcategorias;
CREATE POLICY "Update ponto_subcategorias if owner or admin"
ON public.ponto_subcategorias FOR UPDATE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.pontos p
  WHERE p.id = ponto_subcategorias.ponto_id
    AND ((p.created_by = auth.uid() AND p.status = 'pending'::public.ponto_status)
      OR public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.is_super_admin(auth.uid())
      OR public.has_permission(auth.uid(), 'edit_pontos'))
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.pontos p
  WHERE p.id = ponto_subcategorias.ponto_id
    AND ((p.created_by = auth.uid() AND p.status = 'pending'::public.ponto_status)
      OR public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.is_super_admin(auth.uid())
      OR public.has_permission(auth.uid(), 'edit_pontos'))
));

DROP POLICY IF EXISTS "Insert ponto_classificacoes if owner or admin" ON public.ponto_classificacoes;
CREATE POLICY "Insert ponto_classificacoes if owner or admin"
ON public.ponto_classificacoes FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM public.pontos p
  WHERE p.id = ponto_classificacoes.ponto_id
    AND ((p.created_by = auth.uid() AND p.status = 'pending'::public.ponto_status)
      OR public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.is_super_admin(auth.uid())
      OR public.has_permission(auth.uid(), 'edit_pontos'))
));

DROP POLICY IF EXISTS "Delete ponto_classificacoes if owner or admin" ON public.ponto_classificacoes;
CREATE POLICY "Delete ponto_classificacoes if owner or admin"
ON public.ponto_classificacoes FOR DELETE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.pontos p
  WHERE p.id = ponto_classificacoes.ponto_id
    AND ((p.created_by = auth.uid() AND p.status = 'pending'::public.ponto_status)
      OR public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.is_super_admin(auth.uid())
      OR public.has_permission(auth.uid(), 'edit_pontos'))
));

DROP POLICY IF EXISTS "Insert ponto_toque_ordem if owner or admin" ON public.ponto_toque_ordem;
CREATE POLICY "Insert ponto_toque_ordem if owner or admin"
ON public.ponto_toque_ordem FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM public.pontos p
  WHERE p.id = ponto_toque_ordem.ponto_id
    AND ((p.created_by = auth.uid() AND p.status = 'pending'::public.ponto_status)
      OR public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.is_super_admin(auth.uid())
      OR public.has_permission(auth.uid(), 'edit_pontos'))
));

DROP POLICY IF EXISTS "Update ponto_toque_ordem if owner or admin" ON public.ponto_toque_ordem;
CREATE POLICY "Update ponto_toque_ordem if owner or admin"
ON public.ponto_toque_ordem FOR UPDATE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.pontos p
  WHERE p.id = ponto_toque_ordem.ponto_id
    AND ((p.created_by = auth.uid() AND p.status = 'pending'::public.ponto_status)
      OR public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.is_super_admin(auth.uid())
      OR public.has_permission(auth.uid(), 'edit_pontos'))
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.pontos p
  WHERE p.id = ponto_toque_ordem.ponto_id
    AND ((p.created_by = auth.uid() AND p.status = 'pending'::public.ponto_status)
      OR public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.is_super_admin(auth.uid())
      OR public.has_permission(auth.uid(), 'edit_pontos'))
));

DROP POLICY IF EXISTS "Delete ponto_toque_ordem if owner or admin" ON public.ponto_toque_ordem;
CREATE POLICY "Delete ponto_toque_ordem if owner or admin"
ON public.ponto_toque_ordem FOR DELETE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.pontos p
  WHERE p.id = ponto_toque_ordem.ponto_id
    AND ((p.created_by = auth.uid() AND p.status = 'pending'::public.ponto_status)
      OR public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.is_super_admin(auth.uid())
      OR public.has_permission(auth.uid(), 'edit_pontos'))
));

-- ============ 5) Visitante anônimo nunca escreve ============
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON ALL TABLES IN SCHEMA public FROM anon;

-- ============ 6) Validação de dados no banco ============
-- NOT VALID: linhas antigas não são verificadas agora, mas toda nova escrita é.
ALTER TABLE public.pontos
  DROP CONSTRAINT IF EXISTS pontos_audio_safe_url,
  DROP CONSTRAINT IF EXISTS pontos_nome_len,
  DROP CONSTRAINT IF EXISTS pontos_letra_len,
  DROP CONSTRAINT IF EXISTS pontos_puxador_len,
  DROP CONSTRAINT IF EXISTS pontos_categoria_len;
ALTER TABLE public.categorias
  DROP CONSTRAINT IF EXISTS categorias_nome_len,
  DROP CONSTRAINT IF EXISTS categorias_emoji_len,
  DROP CONSTRAINT IF EXISTS categorias_cor_hex;
ALTER TABLE public.ponto_subcategorias DROP CONSTRAINT IF EXISTS ponto_subcategorias_len;
ALTER TABLE public.user_notas DROP CONSTRAINT IF EXISTS user_notas_content_len;

ALTER TABLE public.pontos
  ADD CONSTRAINT pontos_audio_safe_url CHECK (
    audio = ''
    OR (char_length(audio) <= 2048 AND audio ~ '^https://[^[:space:]<>"''`]+$')
    OR audio ~ '^audio/[A-Za-z0-9_./-]+$'
  ) NOT VALID,
  ADD CONSTRAINT pontos_nome_len CHECK (char_length(nome) BETWEEN 1 AND 300) NOT VALID,
  ADD CONSTRAINT pontos_letra_len CHECK (char_length(letra) <= 50000) NOT VALID,
  ADD CONSTRAINT pontos_puxador_len CHECK (char_length(puxador) <= 300) NOT VALID,
  ADD CONSTRAINT pontos_categoria_len CHECK (char_length(categoria) <= 120) NOT VALID;

ALTER TABLE public.categorias
  ADD CONSTRAINT categorias_nome_len CHECK (char_length(nome) BETWEEN 1 AND 120) NOT VALID,
  ADD CONSTRAINT categorias_emoji_len CHECK (char_length(emoji) <= 64) NOT VALID,
  ADD CONSTRAINT categorias_cor_hex CHECK (cor IS NULL OR cor ~ '^#[0-9A-Fa-f]{6}$') NOT VALID;

ALTER TABLE public.ponto_subcategorias
  ADD CONSTRAINT ponto_subcategorias_len CHECK (char_length(subcategoria) <= 120) NOT VALID;

ALTER TABLE public.user_notas
  ADD CONSTRAINT user_notas_content_len CHECK (char_length(content) <= 100000) NOT VALID;

-- ============ ROLLBACK (executar manualmente se necessário) ============
-- ALTER TABLE public.user_notas DROP CONSTRAINT IF EXISTS user_notas_content_len;
-- ALTER TABLE public.ponto_subcategorias DROP CONSTRAINT IF EXISTS ponto_subcategorias_len;
-- ALTER TABLE public.categorias DROP CONSTRAINT IF EXISTS categorias_nome_len,
--   DROP CONSTRAINT IF EXISTS categorias_emoji_len, DROP CONSTRAINT IF EXISTS categorias_cor_hex;
-- ALTER TABLE public.pontos DROP CONSTRAINT IF EXISTS pontos_audio_safe_url,
--   DROP CONSTRAINT IF EXISTS pontos_nome_len, DROP CONSTRAINT IF EXISTS pontos_letra_len,
--   DROP CONSTRAINT IF EXISTS pontos_puxador_len, DROP CONSTRAINT IF EXISTS pontos_categoria_len;
-- DROP TRIGGER IF EXISTS pontos_enforce_moderation_trg ON public.pontos;
-- DROP FUNCTION IF EXISTS public.pontos_enforce_moderation();
-- Políticas das tabelas filhas: recriar a partir de
--   supabase/migrations/20260502120516_*.sql, 20260602233819_*.sql e 20260604125947_*.sql.
-- is_super_admin: recriar a partir de drizzle/migrations/0001_admins_view_all_profiles.sql.
-- handle_new_user: recriar a partir de supabase/migrations/20260423162419_*.sql.
-- DROP TABLE IF EXISTS public.super_admins;
-- Grants de escrita para anon não precisam voltar (não havia política de escrita para anon).
