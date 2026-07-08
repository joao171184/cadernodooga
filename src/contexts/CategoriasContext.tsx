import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface CategoriaNode {
  id: string;
  nome: string;
  emoji: string;
  cor: string | null;
  mostrarFiltrosClassificacao: boolean;
  filhos: CategoriaNode[];
}


interface Ctx {
  categorias: CategoriaNode[];
  loading: boolean;
  refresh: () => Promise<void>;
  addCategoria: (nome: string, emoji: string, cor?: string | null) => Promise<{ error: string | null }>;
  addSubcategoria: (parentId: string, nome: string, emoji: string, cor?: string | null) => Promise<{ error: string | null }>;
  renameCategoria: (id: string, nome: string, emoji: string, cor?: string | null) => Promise<void>;
  setCategoriaCor: (id: string, cor: string | null) => Promise<void>;
  setMostrarFiltrosClassificacao: (id: string, value: boolean) => Promise<void>;
  deleteCategoria: (id: string) => Promise<void>;
  moveCategoria: (id: string, dir: -1 | 1, parentId: string | null) => Promise<void>;
}


const CategoriasContext = createContext<Ctx | null>(null);

export function CategoriasProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [categorias, setCategorias] = useState<CategoriaNode[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (authLoading) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("categorias")
      .select("*")
      .order("ordem", { ascending: true })
      .order("nome", { ascending: true });

    if (error) {
      console.error("Erro ao carregar categorias", error);
      setCategorias([]);
      setLoading(false);
      return;
    }

    const rows = data ?? [];
    const byId = new Map<string, CategoriaNode>();
    rows.forEach((r) => {
      const row = r as typeof r & { mostrar_filtros_classificacao?: boolean; cor?: string | null };
      byId.set(r.id, {
        id: r.id,
        nome: r.nome,
        emoji: r.emoji,
        cor: row.cor ?? null,
        mostrarFiltrosClassificacao: row.mostrar_filtros_classificacao ?? true,
        filhos: [],
      });
    });

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
  }, [authLoading, user]);

  useEffect(() => { refresh(); }, [refresh, user]);

  // Realtime
  useEffect(() => {
    const ch = supabase
      .channel("cats-sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "categorias" }, () => { refresh(); })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [refresh]);

  const addCategoria = useCallback(async (nome: string, emoji: string, cor: string | null = null) => {
    const { error } = await (supabase.from("categorias") as any).insert({ nome, emoji, cor, ordem: categorias.length + 1 });
    if (!error) await refresh();
    return { error: error?.message ?? null };
  }, [categorias.length, refresh]);

  const addSubcategoria = useCallback(async (parentId: string, nome: string, emoji: string, cor: string | null = null) => {
    const parent = categorias.find((c) => c.id === parentId);
    const ordem = (parent?.filhos.length ?? 0) + 1;
    const { error } = await (supabase.from("categorias") as any).insert({ nome, emoji, cor, parent_id: parentId, ordem });
    if (!error) await refresh();
    return { error: error?.message ?? null };
  }, [categorias, refresh]);

  const renameCategoria = useCallback(async (id: string, nome: string, emoji: string, cor?: string | null) => {
    // Encontrar nome antigo e se é raiz ou subcategoria
    let oldName: string | null = null;
    let parentName: string | null = null;
    for (const root of categorias) {
      if (root.id === id) { oldName = root.nome; break; }
      const child = root.filhos.find((f) => f.id === id);
      if (child) { oldName = child.nome; parentName = root.nome; break; }
    }
    const payload: any = { nome, emoji };
    if (cor !== undefined) payload.cor = cor;
    await (supabase.from("categorias") as any).update(payload).eq("id", id);
    // Propagar rename para os pontos vinculados
    if (oldName && oldName !== nome) {
      if (parentName) {
        const { data: pts } = await supabase.from("pontos").select("id").eq("categoria", parentName);
        const ids = (pts ?? []).map((p) => p.id);
        if (ids.length > 0) {
          await supabase
            .from("ponto_subcategorias")
            .update({ subcategoria: nome })
            .in("ponto_id", ids)
            .eq("subcategoria", oldName);
        }
      } else {
        await supabase.from("pontos").update({ categoria: nome }).eq("categoria", oldName);
      }
    }
    await refresh();
  }, [categorias, refresh]);

  const setCategoriaCor = useCallback(async (id: string, cor: string | null) => {
    await (supabase.from("categorias") as any).update({ cor }).eq("id", id);
    await refresh();
  }, [refresh]);

  const setMostrarFiltrosClassificacao = useCallback(async (id: string, value: boolean) => {
    const payload: { mostrar_filtros_classificacao: boolean } = { mostrar_filtros_classificacao: value };
    await (supabase.from("categorias") as any).update(payload).eq("id", id);
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
      addCategoria, addSubcategoria, renameCategoria, setMostrarFiltrosClassificacao, deleteCategoria, moveCategoria,
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
