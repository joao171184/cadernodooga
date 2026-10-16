import { useCallback, useEffect, useState } from "react";
import { History, Loader2, RefreshCw, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  adsDb,
  type NotifyKindFilter,
  type NotifyLogItem,
  type NotifyResultFilter,
} from "@/integrations/supabase/adsTypes";
import { deliveryLabel } from "@/lib/ads/notify";
import { formatLocalDateTime } from "@/lib/ads/time";
import { dbErrorMessage } from "./useAdsAdmin";
import { btnDanger, btnGhost, inputClass } from "./ui";

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
  const [confirmClear, setConfirmClear] = useState(false);

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
    toast.success("Registro removido.");
  };

  const clearFiltered = async () => {
    const { data, error } = await adsDb.rpc("ads_notify_delete", { _kind: kind || null, _result: result || null });
    if (error) return toast.error(dbErrorMessage(error));
    toast.success(`${data ?? 0} registro(s) apagado(s).`);
    void load();
  };

  if (state === "missing") {
    return (
      <section className="rounded-panel border border-feedback-warning-fg/30 bg-feedback-warning p-4 text-xs text-feedback-warning-fg">
        <p className="font-bold">Histórico completo ainda não instalado.</p>
        <p className="mt-1 opacity-90">
          Rode a migração <code>drizzle/migrations/0007_notify_log_history.sql</code> no editor SQL do Lovable Cloud.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-4 rounded-panel border border-panel-border bg-panel-card p-4 shadow-sm">
      <header className="flex gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-panel bg-status-ended text-status-ended-fg">
          <History size={18} aria-hidden />
        </span>
        <div>
          <h3 className="text-sm font-semibold text-foreground">Histórico de envios</h3>
          <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
            Registro dos e-mails de teste e de novos pedidos. Apagar aqui não desfaz e-mails já enviados.
          </p>
        </div>
      </header>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <select
          aria-label="Filtrar por tipo"
          className={`${inputClass} w-full sm:w-auto py-1.5 text-xs`}
          value={kind}
          onChange={(e) => setKind(e.target.value as NotifyKindFilter | "")}
        >
          <option value="">Todos os tipos</option>
          <option value="lead">Pedidos</option>
          <option value="test">Testes</option>
        </select>
        <select
          aria-label="Filtrar por resultado"
          className={`${inputClass} w-full sm:w-auto py-1.5 text-xs`}
          value={result}
          onChange={(e) => setResult(e.target.value as NotifyResultFilter | "")}
        >
          <option value="">Todos os resultados</option>
          <option value="ok">Só aceitos</option>
          <option value="error">Só com erro</option>
          <option value="pending">Aguardando resposta</option>
        </select>
        <button type="button" className={btnGhost} onClick={() => void load()} disabled={busy} aria-label="Atualizar histórico">
          {busy ? <Loader2 size={12} className="animate-spin" aria-hidden /> : <RefreshCw size={12} aria-hidden />}
          Atualizar
        </button>
        <button
          type="button"
          className={`${btnDanger} sm:ml-auto`}
          onClick={() => setConfirmClear(true)}
          disabled={busy || total === 0}
        >
          <Trash2 size={12} aria-hidden /> {kind || result ? "Limpar filtrados" : "Limpar histórico"}
        </button>
      </div>

      {state === "failed" ? (
        <p className="text-xs text-feedback-danger-fg">Não foi possível carregar o histórico.</p>
      ) : state === "loading" ? (
        <div className="space-y-2 py-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="rounded-panel border border-dashed border-panel-border bg-panel-raised py-8 text-center text-xs text-muted-foreground">
          Nenhum envio {kind || result ? "com esses filtros" : "registrado"}.
        </p>
      ) : (
        <ul className="divide-y divide-panel-border rounded-panel border border-panel-border text-xs">
          {items.map((d) => {
            const label = deliveryLabel(d);
            return (
              <li key={d.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 hover:bg-muted/40">
                <span className="w-32 shrink-0 tabular-nums text-muted-foreground">{formatLocalDateTime(d.created_at)}</span>
                <span
                  className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                    d.kind === "test"
                      ? "border-status-ended-fg/25 bg-status-ended text-status-ended-fg"
                      : "border-feedback-info-fg/25 bg-feedback-info text-feedback-info-fg"
                  }`}
                >
                  {d.kind === "test" ? "Teste" : "Pedido"}
                </span>
                <span
                  title={label.ok === false && d.error ? d.error : undefined}
                  className={`min-w-0 flex-1 ${label.ok === false ? "text-feedback-danger-fg" : label.ok ? "text-feedback-success-fg" : "text-muted-foreground"}`}
                >
                  {label.text}
                </span>
                <button
                  type="button"
                  className="rounded-panel p-1 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => void removeOne(d.id)}
                  aria-label={`Remover envio de ${formatLocalDateTime(d.created_at)}`}
                >
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
            <button
              type="button"
              className="font-semibold text-accent-strong hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
              onClick={() => setShowAll((v) => !v)}
            >
              {showAll ? "Mostrar menos" : "Mostrar todos"}
            </button>
          )}
        </div>
      )}

      <AlertDialog open={confirmClear} onOpenChange={setConfirmClear}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Limpar histórico?</AlertDialogTitle>
            <AlertDialogDescription>
              {kind || result
                ? "Apaga os registros que aparecem com estes filtros. Os e-mails já enviados e os pedidos não são afetados."
                : "Apaga todo o histórico de envios. Os e-mails já enviados e os pedidos não são afetados."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-feedback-danger-fg text-primary-foreground hover:bg-feedback-danger-fg/90"
              onClick={() => {
                setConfirmClear(false);
                void clearFiltered();
              }}
            >
              Limpar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
