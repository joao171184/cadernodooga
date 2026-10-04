import { useCallback, useEffect, useState } from "react";
import { Loader2, RefreshCw, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import {
  adsDb,
  type NotifyKindFilter,
  type NotifyLogItem,
  type NotifyResultFilter,
} from "@/integrations/supabase/adsTypes";
import { deliveryLabel } from "@/lib/ads/notify";
import { formatLocalDateTime } from "@/lib/ads/time";
import { dbErrorMessage } from "./useAdsAdmin";
import { btnGhost, inputClass } from "./ui";

const PAGE = 10;
const MISSING_CODES = new Set(["PGRST202", "42883"]);

type Item = NotifyLogItem & { id: number };

export function NotifyHistory() {
  const [kind, setKind] = useState<"" | NotifyKindFilter>("");
  const [result, setResult] = useState<"" | NotifyResultFilter>("");
  const [showAll, setShowAll] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [total, setTotal] = useState(0);
  const [state, setState] = useState<"loading" | "ready" | "missing" | "failed">("loading");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    const { data, error } = await adsDb.rpc("ads_notify_history", {
      _kind: kind || null,
      _result: result || null,
      _limit: showAll ? null : PAGE,
    });
    setBusy(false);
    if (error) {
      setState(MISSING_CODES.has(error.code ?? "") ? "missing" : "failed");
      return;
    }
    setItems(data?.items ?? []);
    setTotal(data?.total ?? 0);
    setState("ready");
  }, [kind, result, showAll]);

  useEffect(() => { void load(); }, [load]);

  const removeOne = async (id: number) => {
    const { error } = await adsDb.rpc("ads_notify_delete", { _ids: [id] });
    if (error) return toast.error(dbErrorMessage(error));
    setItems((xs) => xs.filter((x) => x.id !== id));
    setTotal((t) => Math.max(0, t - 1));
  };

  const clearFiltered = async () => {
    const scope = kind || result ? "os registros que aparecem com estes filtros" : "todo o histórico de envios";
    if (!window.confirm(`Apagar ${scope}? Os e-mails já enviados e os pedidos não são afetados.`)) return;
    const { data, error } = await adsDb.rpc("ads_notify_delete", { _kind: kind || null, _result: result || null });
    if (error) return toast.error(dbErrorMessage(error));
    toast.success(`${data ?? 0} registro(s) apagado(s).`);
    void load();
  };

  if (state === "missing") {
    return (
      <section className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs">
        <p className="font-bold">Histórico completo ainda não instalado.</p>
        <p className="mt-1 text-muted-foreground">Rode a migração <code>drizzle/migrations/0007_notify_log_history.sql</code> no editor SQL do Lovable Cloud.</p>
      </section>
    );
  }

  return (
    <section className="space-y-3 rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-center gap-2">
        <select aria-label="Filtrar por tipo" className={`${inputClass} w-auto py-1.5 text-xs`} value={kind}
          onChange={(e) => setKind(e.target.value as NotifyKindFilter | "")}>
          <option value="">Todos os tipos</option>
          <option value="lead">Pedidos</option>
          <option value="test">Testes</option>
        </select>
        <select aria-label="Filtrar por resultado" className={`${inputClass} w-auto py-1.5 text-xs`} value={result}
          onChange={(e) => setResult(e.target.value as NotifyResultFilter | "")}>
          <option value="">Todos os resultados</option>
          <option value="ok">Só aceitos</option>
          <option value="error">Só com erro</option>
          <option value="pending">Aguardando resposta</option>
        </select>
        <button className={btnGhost} onClick={() => void load()} disabled={busy} aria-label="Atualizar histórico">
          {busy ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />} Atualizar
        </button>
        <button className={`${btnGhost} ml-auto text-destructive`} onClick={clearFiltered} disabled={busy || total === 0}>
          <Trash2 size={12} /> {kind || result ? "Limpar filtrados" : "Limpar histórico"}
        </button>
      </div>

      {state === "failed" ? (
        <p className="text-xs text-destructive">Não foi possível carregar o histórico.</p>
      ) : state === "loading" ? (
        <div className="flex justify-center py-6"><Loader2 size={16} className="animate-spin text-muted-foreground" /></div>
      ) : items.length === 0 ? (
        <p className="py-6 text-center text-xs text-muted-foreground">Nenhum envio {kind || result ? "com esses filtros" : "registrado"}.</p>
      ) : (
        <ul className="divide-y divide-border text-xs">
          {items.map((d) => {
            const label = deliveryLabel(d);
            return (
              <li key={d.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
                <span className="w-32 shrink-0 tabular-nums text-muted-foreground">{formatLocalDateTime(d.created_at)}</span>
                <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${d.kind === "test" ? "border-border text-muted-foreground" : "border-accent/40 text-accent"}`}>
                  {d.kind === "test" ? "Teste" : "Pedido"}
                </span>
                <span
                  title={label.ok === false && d.error ? d.error : undefined}
                  className={`min-w-0 flex-1 ${label.ok === false ? "text-destructive" : label.ok ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}
                >
                  {label.text}
                </span>
                <button className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground" onClick={() => removeOne(d.id)}
                  aria-label={`Remover envio de ${formatLocalDateTime(d.created_at)}`}>
                  <X size={12} />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {state === "ready" && total > 0 && (
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span>Mostrando {items.length} de {total}</span>
          {total > PAGE && (
            <button className="font-bold uppercase text-accent hover:underline" onClick={() => setShowAll((v) => !v)}>
              {showAll ? "Mostrar menos" : "Mostrar todos"}
            </button>
          )}
        </div>
      )}
    </section>
  );
}
