import { useCallback, useEffect, useMemo, useState } from "react";
import { Ban, CheckCheck, ChevronDown, Loader2, Mail, Phone, RefreshCw, Search, Trash2, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { adsDb, type AdLeadRow, type LeadStatus } from "@/integrations/supabase/adsTypes";
import { INTEREST_LABEL, LEAD_STATUS, filterLeads, replyMailto } from "@/lib/ads/leads";
import { formatLocalDateTime } from "@/lib/ads/time";
import { dbErrorMessage } from "./useAdsAdmin";
import { btnGhost, inputClass } from "./ui";

const STATUS_STYLE: Record<LeadStatus, string> = {
  new: "border-accent/40 bg-accent/10 text-accent",
  contacted: "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-300",
  closed: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  spam: "border-border bg-muted text-muted-foreground",
};

export function LeadsList() {
  const [leads, setLeads] = useState<AdLeadRow[]>([]);
  const [filter, setFilter] = useState<"" | LeadStatus>("");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

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
    if (!window.confirm(`Apagar o pedido de ${lead.name}? Os dados serão removidos definitivamente.`)) return;
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
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {(Object.keys(LEAD_STATUS) as LeadStatus[]).map((s) => (
          <button
            key={s}
            onClick={() => setFilter((f) => (f === s ? "" : s))}
            aria-pressed={filter === s}
            className={`rounded-xl border p-3 text-left transition-colors ${filter === s ? "border-primary bg-primary/10" : "border-border bg-card hover:bg-muted"}`}
          >
            <p className="text-[10px] font-bold uppercase text-muted-foreground">{LEAD_STATUS[s]}</p>
            <p className="font-display text-2xl font-bold tabular-nums text-foreground">{counts[s]}</p>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input type="search" aria-label="Buscar pedido" placeholder="Buscar por nome, empresa ou e-mail…"
            className={`${inputClass} pl-9`} value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <button className={btnGhost} onClick={() => void load()} disabled={loading} aria-label="Atualizar pedidos">
          {loading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />} Atualizar
        </button>
      </div>

      <p className="text-[11px] text-muted-foreground">
        {filter ? `Mostrando ${visible.length} pedido(s) “${LEAD_STATUS[filter]}”.` : `Mostrando ${visible.length} pedido(s); spam fica oculto (clique no contador para ver).`}
        {" "}Apague os que não forem mais necessários (LGPD).
      </p>

      {!loading && visible.length === 0 ? (
        <p className="rounded-xl border border-border p-8 text-center text-sm text-muted-foreground">
          {leads.length === 0 ? "Nenhum pedido recebido ainda." : "Nenhum pedido com esses filtros."}
        </p>
      ) : (
        <ul className="space-y-2">
          {visible.map((l) => {
            const expanded = open.has(l.id);
            return (
              <li key={l.id} className={`rounded-xl border bg-card ${l.status === "new" ? "border-accent/40" : "border-border"}`}>
                <button className="flex w-full items-center gap-3 p-3 text-left" onClick={() => toggle(l.id)} aria-expanded={expanded}>
                  <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${STATUS_STYLE[l.status]}`}>
                    {LEAD_STATUS[l.status]}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-foreground">{l.name}{l.company && ` · ${l.company}`}</span>
                    <span className="block truncate text-[11px] text-muted-foreground">
                      {formatLocalDateTime(l.created_at)}{l.interest && ` · ${INTEREST_LABEL[l.interest] ?? l.interest}`}
                    </span>
                  </span>
                  <ChevronDown size={16} className={`shrink-0 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`} />
                </button>

                {expanded && (
                  <div className="space-y-3 border-t border-border p-3">
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                      <a href={`mailto:${l.email}`} className="flex items-center gap-1 text-accent hover:underline"><Mail size={12} /> {l.email}</a>
                      {l.phone && <span className="flex items-center gap-1 text-muted-foreground"><Phone size={12} /> {l.phone}</span>}
                    </div>
                    <p className="whitespace-pre-wrap rounded-lg bg-muted/50 p-3 text-sm text-foreground">{l.message}</p>
                    <div className="flex flex-wrap gap-1.5">
                      <a className={btnGhost} href={replyMailto(l)} onClick={() => { if (l.status === "new") void update(l, "contacted"); }}>
                        <Mail size={12} /> Responder por e-mail
                      </a>
                      {l.status !== "contacted" && (
                        <button className={btnGhost} onClick={() => update(l, "contacted")}><UserCheck size={12} /> Em contato</button>
                      )}
                      {l.status !== "closed" && (
                        <button className={btnGhost} onClick={() => update(l, "closed")}><CheckCheck size={12} /> Concluir</button>
                      )}
                      {l.status !== "spam" ? (
                        <button className={btnGhost} onClick={() => update(l, "spam")}><Ban size={12} /> Spam</button>
                      ) : (
                        <button className={btnGhost} onClick={() => update(l, "new")}>Não é spam</button>
                      )}
                      <button className={`${btnGhost} ml-auto text-destructive`} onClick={() => remove(l)}><Trash2 size={12} /> Apagar</button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
