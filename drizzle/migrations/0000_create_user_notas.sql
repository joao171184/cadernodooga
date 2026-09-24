CREATE TABLE public.user_notas (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_notas TO authenticated;
GRANT ALL ON public.user_notas TO service_role;
ALTER TABLE public.user_notas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own notas select" ON public.user_notas FOR SELECT TO authenticated
  USING (user_id = auth.uid() AND (public.has_role(auth.uid(),'oga') OR public.has_role(auth.uid(),'admin') OR public.is_super_admin(auth.uid())));
CREATE POLICY "Own notas insert" ON public.user_notas FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND (public.has_role(auth.uid(),'oga') OR public.has_role(auth.uid(),'admin') OR public.is_super_admin(auth.uid())));
CREATE POLICY "Own notas update" ON public.user_notas FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND (public.has_role(auth.uid(),'oga') OR public.has_role(auth.uid(),'admin') OR public.is_super_admin(auth.uid())))
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "Own notas delete" ON public.user_notas FOR DELETE TO authenticated
  USING (user_id = auth.uid() AND (public.has_role(auth.uid(),'oga') OR public.has_role(auth.uid(),'admin') OR public.is_super_admin(auth.uid())));
CREATE TRIGGER user_notas_updated BEFORE UPDATE ON public.user_notas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();