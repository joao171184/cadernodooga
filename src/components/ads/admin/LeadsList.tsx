import { useCallback, useEffect, useMemo, useState } from "react";
import { Ban, CheckCheck, ChevronDown, Inbox, Loader2, Mail, Phone, RefreshCw, Search, Trash2, UserCheck } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { adsDb, type AdLeadRow, type LeadStatus } from "@/integrations/supabase/adsTypes";
import { INTEREST_LABEL, LEAD_STATUS, filterLeads, replyMailto } from "@/lib/ads/leads";
import { formatLocalDateTime } from "@/lib/ads/time";
import { dbErrorMessage } from "./useAdsAdmin";
import { btnDanger, btnGhost, inputClass } from "./ui";

const STATUS_SURFACE: Record<LeadStatus, string> = {
  new: "bg-feedback-info text-feedback-info-fg border-feedback-info-fg/25",
  contacted: "bg-feedback-warning text-feedback-warning-fg border-feedback-warning-fg/25",
  closed: "bg-feedback-success text-feedback-success-fg border-feedback-success-fg/25",
  spam: "bg-feedback-danger text-feedback-danger-fg border-feedback-danger-fg/25",
};

const STATUS_ORDER: LeadStatus[] = ["new", "contacted", "closed", "spam"];

export function LeadsList() {
  const [leads, setLeads] = useState<AdLeadRow[]>([]);
  const [filter, setFilter] = useState<"" | LeadStatus>("");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [confirmRemove, setConfirmRemove] = useState<AdLeadRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await adsDb.from("ad_leads").select("*").order("created_at", { ascending: false }).limit(500);
    if (error) toast.error("Não foi possível carregar os pedidos.");
    setLeads(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const counts = useMemo(() => {
    const c: Record<LeadStatus, number> = { new: 0, contacted: 0, closed: 0, spam: 0 };
    for (const l of leads) c[l.status] += 1;
    return c;
  }, [leads]);

  const visible = useMemo(() => filterLeads(leads, filter, query), [leads, filter, query]);

  const update = async (lead: AdLeadRow, status: LeadStatus) => {
    const { error } = await adsDb.from("ad_leads").update({ status }).eq("id", lead.id);
    if (error) return toast.error(dbErrorMessage(error));
    setLeads((ls) => ls.map((l) => (l.id === lead.id ? { ...l, status } : l)));
    toast.success(`Marcado como “${LEAD_STATUS[status]}”.`);
  };

  const remove = async (lead: AdLeadRow) => {
    const { error } = await adsDb.from("ad_leads").delete().eq("id", lead.id);
    if (error) return toast.error(dbErrorMessage(error));
    setLeads((ls) => ls.filter((l) => l.id !== lead.id));
    toast.success("Pedido apagado.");
  };

  const toggle = (id: string) =>
    setOpen((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  return (
    <TooltipProvider delayDuration={300}>
      <div className="space-y-panel">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {STATUS_ORDER.map((s) => {
            const selected = filter === s;
            return (
              <button
                key={s}
                type="button"
                onClick={() => setFilter((f) => (f === s ? "" : s))}
                aria-pressed={selected}
                className={`rounded-panel border p-3 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${STATUS_SURFACE[s]} ${selected ? "ring-2 ring-ring ring-offset-2 ring-offset-background" : "hover:brightness-95"}`}
              >
                <p className="text-[10px] font-bold uppercase tracking-wide opacity-80">{LEAD_STATUS[s]}</p>
                <p className="font-display text-2xl font-bold tabular-nums">{counts[s]}</p>
              </button>
            );
          })}
        </div>

        <div className="flex flex-col gap-2 rounded-panel border border-panel-border bg-panel-card p-3 sm:flex-row sm:items-center">
          <div className="relative min-w-0 flex-1">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <input
              type="search"
              aria-label="Buscar pedido"
              placeholder="Buscar por nome, empresa ou e-mail…"
              className={`${inputClass} pl-9`}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <button type="button" className={btnGhost} onClick={() => void load()} disabled={loading} aria-label="Atualizar pedidos">
                {loading ? <Loader2 size={12} className="animate-spin" aria-hidden /> : <RefreshCw size={12} aria-hidden />}
                Atualizar
              </button>
            </TooltipTrigger>
            <TooltipContent>Recarregar lista</TooltipContent>
          </Tooltip>
        </div>

        <p className="text-[11px] text-muted-foreground">
          {filter
            ? `Mostrando ${visible.length} pedido(s) “${LEAD_STATUS[filter]}”.`
            : `Mostrando ${visible.length} pedido(s); spam fica oculto (clique no contador para ver).`}
          {" "}Apague os que não forem mais necessários (LGPD).
        </p>

        {loading && leads.length === 0 ? (
          <ul className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <li key={i} className="rounded-panel border border-panel-border bg-panel-card p-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-5 w-16 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-panel border border-dashed border-panel-border bg-panel-card px-6 py-14 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-feedback-info text-feedback-info-fg">
              <Inbox size={22} aria-hidden />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">
                {leads.length === 0 ? "Nenhum pedido ainda" : "Nenhum resultado"}
              </p>
              <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                {leads.length === 0
                  ? "Pedidos da página Anuncie aparecem aqui."
                  : "Ajuste o filtro ou a busca para ver outros pedidos."}
              </p>
            </div>
          </div>
        ) : (
          <ul className="space-y-2">
            {visible.map((l) => {
              const expanded = open.has(l.id);
              return (
                <li
                  key={l.id}
                  className={`rounded-panel border bg-panel-card shadow-sm transition-shadow hover:shadow-md ${l.status === "new" ? "border-feedback-info-fg/40" : "border-panel-border"}`}
                >
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 rounded-panel p-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    onClick={() => toggle(l.id)}
                    aria-expanded={expanded}
                  >
                    <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${STATUS_SURFACE[l.status]}`}>
                      {LEAD_STATUS[l.status]}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold text-foreground">{l.name}{l.company && ` · ${l.company}`}</span>
                      <span className="block truncate text-[11px] text-muted-foreground">
                        {formatLocalDateTime(l.created_at)}{l.interest && ` · ${INTEREST_LABEL[l.interest] ?? l.interest}`}
                      </span>
                    </span>
                    <ChevronDown size={16} className={`shrink-0 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`} aria-hidden />
                  </button>

                  {expanded && (
                    <div className="space-y-3 border-t border-panel-border p-3">
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                        <a href={`mailto:${l.email}`} className="flex items-center gap-1 font-medium text-accent-strong hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm">
                          <Mail size={12} aria-hidden /> {l.email}
                        </a>
                        {l.phone && (
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <Phone size={12} aria-hidden /> {l.phone}
                          </span>
                        )}
                      </div>
                      <p className="whitespace-pre-wrap rounded-panel border border-panel-border/60 bg-panel-raised p-3 text-sm text-foreground">{l.message}</p>
                      <div className="grid grid-cols-2 gap-1.5 sm:flex sm:flex-wrap">
                        <a
                          className={btnGhost}
                          href={replyMailto(l)}
                          onClick={() => { if (l.status === "new") void update(l, "contacted"); }}
                        >
                          <Mail size={12} aria-hidden /> Responder
                        </a>
                        {l.status !== "contacted" && (
                          <button type="button" className={btnGhost} onClick={() => void update(l, "contacted")}>
                            <UserCheck size={12} aria-hidden /> Em contato
                          </button>
                        )}
                        {l.status !== "closed" && (
                          <button type="button" className={btnGhost} onClick={() => void update(l, "closed")}>
                            <CheckCheck size={12} aria-hidden /> Concluir
                          </button>
                        )}
                        {l.status !== "spam" ? (
                          <button type="button" className={btnGhost} onClick={() => void update(l, "spam")}>
                            <Ban size={12} aria-hidden /> Spam
                          </button>
                        ) : (
                          <button type="button" className={btnGhost} onClick={() => void update(l, "new")}>
                            Não é spam
                          </button>
                        )}
                        <button type="button" className={`${btnDanger} sm:ml-auto`} onClick={() => setConfirmRemove(l)}>
                          <Trash2 size={12} aria-hidden /> Apagar
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        <AlertDialog open={!!confirmRemove} onOpenChange={(o) => { if (!o) setConfirmRemove(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Apagar pedido?</AlertDialogTitle>
              <AlertDialogDescription>
                {confirmRemove
                  ? `O pedido de ${confirmRemove.name} será removido definitivamente (LGPD).`
                  : null}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                className="bg-feedback-danger-fg text-primary-foreground hover:bg-feedback-danger-fg/90"
                onClick={() => {
                  const lead = confirmRemove;
                  setConfirmRemove(null);
                  if (lead) void remove(lead);
                }}
              >
                Apagar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  );
}
