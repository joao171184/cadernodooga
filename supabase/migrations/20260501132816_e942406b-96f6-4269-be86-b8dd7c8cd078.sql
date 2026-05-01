-- 1) Fix role_permissions: add unique constraint so upsert works
ALTER TABLE public.role_permissions
  ADD CONSTRAINT role_permissions_role_permission_key UNIQUE (role, permission);

-- 2) Toque enum
CREATE TYPE public.toque_tipo AS ENUM ('ijexa', 'nago', 'congo', 'barravento', 'samba');

-- 3) Status enum
CREATE TYPE public.ponto_status AS ENUM ('pending', 'approved', 'rejected');

-- 4) Categorias (globais)
CREATE TABLE public.categorias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  emoji TEXT NOT NULL DEFAULT '•',
  parent_id UUID REFERENCES public.categorias(id) ON DELETE CASCADE,
  ordem INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (parent_id, nome)
);

ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view categorias"
  ON public.categorias FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin can insert categorias"
  ON public.categorias FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.is_super_admin(auth.uid()));

CREATE POLICY "Admin can update categorias"
  ON public.categorias FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.is_super_admin(auth.uid()));

CREATE POLICY "Admin can delete categorias"
  ON public.categorias FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.is_super_admin(auth.uid()));

-- 5) Pontos
CREATE TABLE public.pontos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  categoria TEXT NOT NULL,
  letra TEXT NOT NULL,
  audio TEXT NOT NULL DEFAULT '',
  puxador TEXT NOT NULL DEFAULT '',
  toque public.toque_tipo,
  status public.ponto_status NOT NULL DEFAULT 'pending',
  ordem INT NOT NULL DEFAULT 0,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  approved_by UUID,
  approved_at TIMESTAMPTZ
);

ALTER TABLE public.pontos ENABLE ROW LEVEL SECURITY;

-- View: aprovados para todos logados; pendentes só dono ou admin
CREATE POLICY "Approved visible to authenticated"
  ON public.pontos FOR SELECT
  TO authenticated
  USING (
    status = 'approved'
    OR created_by = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
    OR public.is_super_admin(auth.uid())
  );

-- Insert: qualquer usuário logado pode propor (vai como pending)
CREATE POLICY "Authenticated can create pontos"
  ON public.pontos FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

-- Update: dono pode editar enquanto pendente; admin pode editar/aprovar tudo
CREATE POLICY "Owner or admin can update pontos"
  ON public.pontos FOR UPDATE
  TO authenticated
  USING (
    (created_by = auth.uid() AND status = 'pending')
    OR public.has_role(auth.uid(), 'admin')
    OR public.is_super_admin(auth.uid())
  );

-- Delete: dono ou admin
CREATE POLICY "Owner or admin can delete pontos"
  ON public.pontos FOR DELETE
  TO authenticated
  USING (
    created_by = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
    OR public.is_super_admin(auth.uid())
  );

-- 6) Subcategorias por ponto (N:N)
CREATE TABLE public.ponto_subcategorias (
  ponto_id UUID NOT NULL REFERENCES public.pontos(id) ON DELETE CASCADE,
  subcategoria TEXT NOT NULL,
  PRIMARY KEY (ponto_id, subcategoria)
);

ALTER TABLE public.ponto_subcategorias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View ponto_subcategorias if can view ponto"
  ON public.ponto_subcategorias FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.pontos p
      WHERE p.id = ponto_id
        AND (
          p.status = 'approved'
          OR p.created_by = auth.uid()
          OR public.has_role(auth.uid(), 'admin')
          OR public.is_super_admin(auth.uid())
        )
    )
  );

CREATE POLICY "Insert ponto_subcategorias if owner or admin"
  ON public.ponto_subcategorias FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.pontos p
      WHERE p.id = ponto_id
        AND (
          p.created_by = auth.uid()
          OR public.has_role(auth.uid(), 'admin')
          OR public.is_super_admin(auth.uid())
        )
    )
  );

CREATE POLICY "Delete ponto_subcategorias if owner or admin"
  ON public.ponto_subcategorias FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.pontos p
      WHERE p.id = ponto_id
        AND (
          p.created_by = auth.uid()
          OR public.has_role(auth.uid(), 'admin')
          OR public.is_super_admin(auth.uid())
        )
    )
  );

-- 7) Favoritos por usuário
CREATE TABLE public.favoritos (
  user_id UUID NOT NULL,
  ponto_id UUID NOT NULL REFERENCES public.pontos(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, ponto_id)
);

ALTER TABLE public.favoritos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own favoritos"
  ON public.favoritos FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users insert own favoritos"
  ON public.favoritos FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users delete own favoritos"
  ON public.favoritos FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- 8) Trigger updated_at em pontos
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_pontos_updated_at
  BEFORE UPDATE ON public.pontos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 9) Seed de categorias padrão (apenas se a tabela estiver vazia)
DO $$
DECLARE
  v_orixas UUID;
  v_dir UUID;
  v_esq UUID;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.categorias) THEN
    INSERT INTO public.categorias (nome, emoji, ordem) VALUES ('Abertura','🕊️',1);
    INSERT INTO public.categorias (nome, emoji, ordem) VALUES ('Esquenta','🔥',2);

    INSERT INTO public.categorias (nome, emoji, ordem) VALUES ('Orixás','⚡',3) RETURNING id INTO v_orixas;
    INSERT INTO public.categorias (nome, emoji, parent_id, ordem) VALUES
      ('Exu','🔱',v_orixas,1),('Ogum','⚔️',v_orixas,2),('Oxóssi','🏹',v_orixas,3),
      ('Xangô','⚡',v_orixas,4),('Iansã','🌪️',v_orixas,5),('Iemanjá','🌊',v_orixas,6),
      ('Oxum','🪞',v_orixas,7),('Nanã','🌙',v_orixas,8),('Omolu','🩹',v_orixas,9),
      ('Oxalá','☀️',v_orixas,10);

    INSERT INTO public.categorias (nome, emoji, ordem) VALUES ('Guias de Direita','🙏',4) RETURNING id INTO v_dir;
    INSERT INTO public.categorias (nome, emoji, parent_id, ordem) VALUES
      ('Caboclo','🪶',v_dir,1),('Preto-Velho','🕯️',v_dir,2),('Criança','🧸',v_dir,3),
      ('Boiadeiro','🤠',v_dir,4),('Marinheiro','⚓',v_dir,5),('Baiano','🎶',v_dir,6);

    INSERT INTO public.categorias (nome, emoji, ordem) VALUES ('Guias de Esquerda','🔥',5) RETURNING id INTO v_esq;
    INSERT INTO public.categorias (nome, emoji, parent_id, ordem) VALUES
      ('Exu','🔱',v_esq,1),('Pomba Gira','🌹',v_esq,2),('Exu Mirim','😈',v_esq,3);
  END IF;
END $$;