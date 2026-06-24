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
  toqueOrdens: Map<string, Partial<Record<ToqueTipo, number>>>;
  loading: boolean;
  refresh: () => Promise<void>;
  savePonto: (data: PontoInput) => Promise<{ error: string | null; pending: boolean }>;
  deletePonto: (id: string) => Promise<void>;
  approvePonto: (id: string) => Promise<void>;
  rejectPonto: (id: string) => Promise<void>;
  toggleFavorito: (id: string) => Promise<void>;
  movePontoInList: (id: string, dir: -1 | 1, scopedList: Ponto[], scope?: { toque?: ToqueTipo | null }) => Promise<void>;
  reorderPontosInList: (orderedList: Ponto[], scope?: { toque?: ToqueTipo | null }) => Promise<void>;
}

const PontosContext = createContext<Ctx | null>(null);

export function PontosProvider({ children }: { children: ReactNode }) {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const [pontos, setPontos] = useState<Ponto[]>([]);
  const [pendentes, setPendentes] = useState<Ponto[]>([]);
  const [favoritos, setFavoritos] = useState<Set<string>>(new Set());
  const [toqueOrdens, setToqueOrdens] = useState<Map<string, Partial<Record<ToqueTipo, number>>>>(new Map());
  const [loading, setLoading] = useState(true);

  const hasLoadedRef = useRef(false);
  const suppressRefreshUntilRef = useRef<number>(0);
  const refresh = useCallback(async () => {
    if (authLoading) return;
    if (!hasLoadedRef.current) setLoading(true);

    const [{ data: rawPontos }, { data: subs }, { data: classes }, { data: favs }, { data: toqueOrds }] = await Promise.all([
      supabase.from("pontos").select("*").order("ordem", { ascending: true }).order("created_at", { ascending: true }),
      supabase.from("ponto_subcategorias").select("*"),
      supabase.from("ponto_classificacoes").select("*"),
      user
        ? supabase.from("favoritos").select("ponto_id").eq("user_id", user.id)
        : Promise.resolve({ data: [] as { ponto_id: string }[] }),
      supabase.from("ponto_toque_ordem").select("*"),
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
    const tMap = new Map<string, Partial<Record<ToqueTipo, number>>>();
    (toqueOrds ?? []).forEach((r) => {
      const entry = tMap.get(r.ponto_id) ?? {};
      entry[r.toque as ToqueTipo] = r.ordem;
      tMap.set(r.ponto_id, entry);
    });
    setToqueOrdens(tMap);
    hasLoadedRef.current = true;
    setLoading(false);
  }, [user, authLoading]);

  useEffect(() => { refresh(); }, [refresh]);

  // Realtime: re-fetch on any change (com janela de supressão pós-reorder)
  useEffect(() => {
    if (!user) return;
    const maybeRefresh = () => {
      if (Date.now() < suppressRefreshUntilRef.current) return;
      refresh();
    };
    const ch = supabase
      .channel("pontos-sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "pontos" }, maybeRefresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "ponto_subcategorias" }, maybeRefresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "ponto_classificacoes" }, maybeRefresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "ponto_toque_ordem" }, maybeRefresh)
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
  }, [user, isAdmin, pontos, refresh]);

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

  const reorderPontosInList = useCallback<Ctx["reorderPontosInList"]>(async (orderedList, scope) => {
    const toque = scope?.toque ?? null;
    suppressRefreshUntilRef.current = Date.now() + 2000;

    if (toque) {
      // Salva ordem apenas para o toque ativo, sem mexer em nada mais
      const updates = orderedList.map((p, i) => ({
        ponto_id: p.id,
        toque,
        ordem: (i + 1) * 10,
      }));
      setToqueOrdens((prev) => {
        const next = new Map(prev);
        updates.forEach((u) => {
          const entry = { ...(next.get(u.ponto_id) ?? {}) };
          entry[toque] = u.ordem;
          next.set(u.ponto_id, entry);
        });
        return next;
      });
      await supabase.from("ponto_toque_ordem").upsert(updates, { onConflict: "ponto_id,toque" });
    } else {
      // "Todos os toques" — atualiza apenas os itens movidos, sem renumerar os demais
      const idToNewOrdem = new Map<string, number>();
      orderedList.forEach((p, i) => idToNewOrdem.set(p.id, (i + 1) * 10));
      setPontos((prev) => {
        const updated = prev.map((p) =>
          idToNewOrdem.has(p.id) ? { ...p, ordem: idToNewOrdem.get(p.id)! } : p
        );
        return updated.sort((a, b) => a.ordem - b.ordem);
      });
      await Promise.all(Array.from(idToNewOrdem.entries()).map(([id, ordem]) =>
        supabase.from("pontos").update({ ordem }).eq("id", id)
      ));
    }

    suppressRefreshUntilRef.current = Date.now() + 1500;
  }, []);

  const movePontoInList = useCallback<Ctx["movePontoInList"]>(async (id, dir, scopedList, scope) => {
    const idx = scopedList.findIndex((p) => p.id === id);
    if (idx < 0) return;
    const target = idx + dir;
    if (target < 0 || target >= scopedList.length) return;
    const reordered = [...scopedList];
    const [moved] = reordered.splice(idx, 1);
    reordered.splice(target, 0, moved);
    await reorderPontosInList(reordered, scope);
  }, [reorderPontosInList]);

  return (
    <PontosContext.Provider value={{
      pontos, pendentes, favoritos, toqueOrdens, loading,
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
