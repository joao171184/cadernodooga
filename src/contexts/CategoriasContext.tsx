import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface CategoriaNode {
  id: string;
  nome: string;
  emoji: string;
  filhos: CategoriaNode[];
}

interface Ctx {
  categorias: CategoriaNode[];
  loading: boolean;
  refresh: () => Promise<void>;
  addCategoria: (nome: string, emoji: string) => Promise<{ error: string | null }>;
  addSubcategoria: (parentId: string, nome: string, emoji: string) => Promise<{ error: string | null }>;
  renameCategoria: (id: string, nome: string, emoji: string) => Promise<void>;
  deleteCategoria: (id: string) => Promise<void>;
  moveCategoria: (id: string, dir: -1 | 1, parentId: string | null) => Promise<void>;
}

const CategoriasContext = createContext<Ctx | null>(null);

export function CategoriasProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [categorias, setCategorias] = useState<CategoriaNode[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("categorias")
      .select("*")
      .order("ordem", { ascending: true })
      .order("nome", { ascending: true });

    const rows = data ?? [];
    const byId = new Map<string, CategoriaNode>();
    rows.forEach((r) => byId.set(r.id, { id: r.id, nome: r.nome, emoji: r.emoji, filhos: [] }));
    const roots: CategoriaNode[] = [];
    rows.forEach((r) => {
      const node = byId.get(r.id)!;
      if (r.parent_id) {
        const parent = byId.get(r.parent_id);
        if (parent) parent.filhos.push(node);
      } else {
        roots.push(node);
      }
    });
    setCategorias(roots);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh, user]);

  // Realtime
  useEffect(() => {
    const ch = supabase
      .channel("cats-sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "categorias" }, () => { refresh(); })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [refresh]);

  const addCategoria = useCallback(async (nome: string, emoji: string) => {
    const { error } = await supabase.from("categorias").insert({ nome, emoji, ordem: categorias.length + 1 });
    if (!error) await refresh();
    return { error: error?.message ?? null };
  }, [categorias.length, refresh]);

  const addSubcategoria = useCallback(async (parentId: string, nome: string, emoji: string) => {
    const parent = categorias.find((c) => c.id === parentId);
    const ordem = (parent?.filhos.length ?? 0) + 1;
    const { error } = await supabase.from("categorias").insert({ nome, emoji, parent_id: parentId, ordem });
    if (!error) await refresh();
    return { error: error?.message ?? null };
  }, [categorias, refresh]);

  const renameCategoria = useCallback(async (id: string, nome: string, emoji: string) => {
    await supabase.from("categorias").update({ nome, emoji }).eq("id", id);
    await refresh();
  }, [refresh]);

  const deleteCategoria = useCallback(async (id: string) => {
    await supabase.from("categorias").delete().eq("id", id);
    await refresh();
  }, [refresh]);

  const moveCategoria = useCallback(async (id: string, dir: -1 | 1, parentId: string | null) => {
    // Lista escopada (irmãos): roots ou filhos do parentId
    const flatRoots = categorias;
    const siblings = parentId
      ? (flatRoots.find((c) => c.id === parentId)?.filhos ?? [])
      : flatRoots;
    const idx = siblings.findIndex((c) => c.id === id);
    if (idx < 0) return;
    const target = idx + dir;
    if (target < 0 || target >= siblings.length) return;
    const reordered = [...siblings];
    const [moved] = reordered.splice(idx, 1);
    reordered.splice(target, 0, moved);
    await Promise.all(
      reordered.map((c, i) =>
        supabase.from("categorias").update({ ordem: (i + 1) * 10 }).eq("id", c.id)
      )
    );
    await refresh();
  }, [categorias, refresh]);

  return (
    <CategoriasContext.Provider value={{
      categorias, loading, refresh,
      addCategoria, addSubcategoria, renameCategoria, deleteCategoria, moveCategoria,
    }}>
      {children}
    </CategoriasContext.Provider>
  );
}

export function useCategorias() {
  const ctx = useContext(CategoriasContext);
  if (!ctx) throw new Error("useCategorias must be used within CategoriasProvider");
  return ctx;
}
