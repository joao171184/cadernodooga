import { createContext, useContext, useEffect, useRef, useState, useCallback, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Database } from "@/integrations/supabase/types";

export type ToqueTipo = Database["public"]["Enums"]["toque_tipo"];
export type PontoStatus = Database["public"]["Enums"]["ponto_status"];
export type Classificacao = Database["public"]["Enums"]["classificacao_tipo"];

export const TOQUE_OPTIONS: { value: ToqueTipo; label: string }[] = [
  { value: "ijexa", label: "Ijexá" },
  { value: "nago", label: "Nagô" },
  { value: "congo", label: "Congo" },
  { value: "barravento", label: "Barravento" },
  { value: "samba", label: "Samba" },
];

export const CLASSIFICACAO_OPTIONS: { value: Classificacao; label: string }[] = [
  { value: "chamada", label: "Chamada" },
  { value: "elevacao", label: "Subida" },
  { value: "sustentacao", label: "Sustentação" },
];

export interface Ponto {
  id: string;
  nome: string;
  categoria: string;
  subcategorias: string[];
  classificacoes: Classificacao[];
  letra: string;
  audio: string;
  puxador: string;
  toque: ToqueTipo | null;
  status: PontoStatus;
  ordem: number;
  created_by: string;
}

export type PontoInput = {
  id?: string;
  nome: string;
  categoria: string;
  subcategorias: string[];
  classificacoes: Classificacao[];
  letra: string;
  audio: string;
  puxador: string;
  toque: ToqueTipo | null;
};

interface Ctx {
  pontos: Ponto[];
  pendentes: Ponto[];
  favoritos: Set<string>;
  loading: boolean;
  refresh: () => Promise<void>;
  savePonto: (data: PontoInput) => Promise<{ error: string | null; pending: boolean }>;
  deletePonto: (id: string) => Promise<void>;
  approvePonto: (id: string) => Promise<void>;
  rejectPonto: (id: string) => Promise<void>;
  toggleFavorito: (id: string) => Promise<void>;
  movePontoInList: (id: string, dir: -1 | 1, scopedList: Ponto[]) => Promise<void>;
  reorderPontosInList: (orderedList: Ponto[]) => Promise<void>;
}

const PontosContext = createContext<Ctx | null>(null);

export function PontosProvider({ children }: { children: ReactNode }) {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const [pontos, setPontos] = useState<Ponto[]>([]);
  const [pendentes, setPendentes] = useState<Ponto[]>([]);
  const [favoritos, setFavoritos] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const hasLoadedRef = useRef(false);
  const refresh = useCallback(async () => {
    if (authLoading) return;
    if (!user) {
      setPontos([]); setPendentes([]); setFavoritos(new Set()); setLoading(false);
      return;
    }
    if (!hasLoadedRef.current) setLoading(true);

    const [{ data: rawPontos }, { data: subs }, { data: classes }, { data: favs }] = await Promise.all([
      supabase.from("pontos").select("*").order("ordem", { ascending: true }).order("created_at", { ascending: true }),
      supabase.from("ponto_subcategorias").select("*"),
      supabase.from("ponto_classificacoes").select("*"),
      supabase.from("favoritos").select("ponto_id").eq("user_id", user.id),
    ]);

    const subMap = new Map<string, string[]>();
    (subs ?? []).forEach((s) => {
      const arr = subMap.get(s.ponto_id) ?? [];
      arr.push(s.subcategoria);
      subMap.set(s.ponto_id, arr);
    });

    const classMap = new Map<string, Classificacao[]>();
    (classes ?? []).forEach((c) => {
      const arr = classMap.get(c.ponto_id) ?? [];
      arr.push(c.classificacao as Classificacao);
      classMap.set(c.ponto_id, arr);
    });

    const all: Ponto[] = (rawPontos ?? []).map((p) => ({
      id: p.id,
      nome: p.nome,
      categoria: p.categoria,
      subcategorias: subMap.get(p.id) ?? [],
      classificacoes: classMap.get(p.id) ?? [],
      letra: p.letra,
      audio: p.audio,
      puxador: p.puxador,
      toque: p.toque,
      status: p.status,
      ordem: p.ordem,
      created_by: p.created_by,
    }));

    setPontos(all.filter((p) => p.status === "approved"));
    setPendentes(all.filter((p) => p.status === "pending"));
    setFavoritos(new Set((favs ?? []).map((f) => f.ponto_id)));
    hasLoadedRef.current = true;
    setLoading(false);
  }, [user, authLoading]);

  useEffect(() => { refresh(); }, [refresh]);

  // Realtime: re-fetch on any change
  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel("pontos-sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "pontos" }, () => { refresh(); })
      .on("postgres_changes", { event: "*", schema: "public", table: "ponto_subcategorias" }, () => { refresh(); })
      .on("postgres_changes", { event: "*", schema: "public", table: "ponto_classificacoes" }, () => { refresh(); })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, refresh]);

  const savePonto = useCallback<Ctx["savePonto"]>(async (data) => {
    if (!user) return { error: "Não autenticado", pending: false };

    const goesPending = !isAdmin;
    const payload = {
      nome: data.nome,
      categoria: data.categoria,
      letra: data.letra,
      audio: data.audio,
      puxador: data.puxador,
      toque: data.toque,
      created_by: user.id,
      status: (isAdmin ? "approved" : "pending") as PontoStatus,
      approved_by: isAdmin ? user.id : null,
      approved_at: isAdmin ? new Date().toISOString() : null,
    };

    let pontoId: string;
    if (data.id) {
      const { error } = await supabase.from("pontos").update(payload).eq("id", data.id);
      if (error) return { error: error.message, pending: false };
      pontoId = data.id;
      await supabase.from("ponto_subcategorias").delete().eq("ponto_id", pontoId);
      await supabase.from("ponto_classificacoes").delete().eq("ponto_id", pontoId);
    } else {
      const ordem = pontos.length ? Math.max(...pontos.map((p) => p.ordem)) + 10 : 10;
      const { data: ins, error } = await supabase.from("pontos").insert({ ...payload, ordem }).select("id").single();
      if (error || !ins) return { error: error?.message ?? "Erro", pending: false };
      pontoId = ins.id;
    }

    if (data.subcategorias.length > 0) {
      const rows = data.subcategorias.map((s) => ({ ponto_id: pontoId, subcategoria: s }));
      await supabase.from("ponto_subcategorias").insert(rows);
    }
    if (data.classificacoes.length > 0) {
      const rows = data.classificacoes.map((c) => ({ ponto_id: pontoId, classificacao: c }));
      await supabase.from("ponto_classificacoes").insert(rows);
    }

    await refresh();
    return { error: null, pending: goesPending };
  }, [user, isAdmin, refresh]);

  const deletePonto = useCallback(async (id: string) => {
    const { error } = await supabase.from("pontos").delete().eq("id", id);
    if (error) throw error;
    await refresh();
  }, [refresh]);

  const approvePonto = useCallback(async (id: string) => {
    if (!user) return;
    await supabase.from("pontos").update({
      status: "approved" as PontoStatus,
      approved_by: user.id,
      approved_at: new Date().toISOString(),
    }).eq("id", id);
    await refresh();
  }, [user, refresh]);

  const rejectPonto = useCallback(async (id: string) => {
    await supabase.from("pontos").delete().eq("id", id);
    await refresh();
  }, [refresh]);

  const toggleFavorito = useCallback(async (id: string) => {
    if (!user) return;
    if (favoritos.has(id)) {
      await supabase.from("favoritos").delete().eq("user_id", user.id).eq("ponto_id", id);
      setFavoritos((s) => { const n = new Set(s); n.delete(id); return n; });
    } else {
      await supabase.from("favoritos").insert({ user_id: user.id, ponto_id: id });
      setFavoritos((s) => new Set(s).add(id));
    }
  }, [user, favoritos]);

  // Move within current visible scope. Renumera ordem usando o scopedList
  // recebido (já filtrado por categoria/subcategoria/classificação).
  const reorderPontosInList = useCallback<Ctx["reorderPontosInList"]>(async (orderedList) => {
    const orderSlots = [...orderedList].map((p) => p.ordem).sort((a, b) => a - b);
    const idToNewOrdem = new Map<string, number>();
    orderedList.forEach((p, i) => idToNewOrdem.set(p.id, orderSlots[i] ?? (i + 1) * 10));
    // Optimistic local update — evita "voltar pro topo" causado por refresh
    setPontos((prev) => {
      const updated = prev.map((p) =>
        idToNewOrdem.has(p.id) ? { ...p, ordem: idToNewOrdem.get(p.id)! } : p
      );
      return updated.sort((a, b) => a.ordem - b.ordem);
    });
    await Promise.all(
      orderedList.map((p, i) => supabase.from("pontos").update({ ordem: orderSlots[i] ?? (i + 1) * 10 }).eq("id", p.id))
    );
  }, []);

  const movePontoInList = useCallback<Ctx["movePontoInList"]>(async (id, dir, scopedList) => {
    const idx = scopedList.findIndex((p) => p.id === id);
    if (idx < 0) return;
    const target = idx + dir;
    if (target < 0 || target >= scopedList.length) return;
    const reordered = [...scopedList];
    const [moved] = reordered.splice(idx, 1);
    reordered.splice(target, 0, moved);
    await reorderPontosInList(reordered);
  }, [reorderPontosInList]);

  return (
    <PontosContext.Provider value={{
      pontos, pendentes, favoritos, loading,
      refresh, savePonto, deletePonto, approvePonto, rejectPonto, toggleFavorito, movePontoInList, reorderPontosInList,
    }}>
      {children}
    </PontosContext.Provider>
  );
}

export function usePontos() {
  const ctx = useContext(PontosContext);
  if (!ctx) throw new Error("usePontos must be used within PontosProvider");
  return ctx;
}
