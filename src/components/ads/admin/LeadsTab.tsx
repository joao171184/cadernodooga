import { useCallback, useEffect, useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { adsDb, type AdLeadRow, type LeadStatus } from "@/integrations/supabase/adsTypes";
import { formatLocalDateTime } from "@/lib/ads/time";
import { dbErrorMessage } from "./useAdsAdmin";
import { LeadRecipients } from "./LeadRecipients";
import { btnGhost, inputClass } from "./ui";

const LEAD_STATUS: Record<LeadStatus, string> = {
  new: "Novo",
  contacted: "Em contato",
  closed: "Concluído",
  spam: "Spam",
};

export function LeadsTab() {
  const [leads, setLeads] = useState<AdLeadRow[]>([]);
  const [filter, setFilter] = useState<"" | LeadStatus>("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    let q = adsDb.from("ad_leads").select("*").order("created_at", { ascending: false }).limit(200);
    if (filter) q = q.eq("status", filter);
    const { data, error } = await q;
    if (error) toast.error("Não foi possível carregar os pedidos.");
    setLeads(data ?? []);
    setLoading(false);
  }, [filter]);

  useEffect(() => { void load(); }, [load]);

  const update = async (lead: AdLeadRow, status: LeadStatus) => {
    const { error } = await adsDb.from("ad_leads").update({ status }).eq("id", lead.id);
    if (error) return toast.error(dbErrorMessage(error));
    setLeads((ls) => ls.map((l) => (l.id === lead.id ? { ...l, status } : l)));
  };

  const remove = async (lead: AdLeadRow) => {
    if (!window.confirm(`Apagar o pedido de ${lead.name}? Os dados serão removidos definitivamente.`)) return;
    const { error } = await adsDb.from("ad_leads").delete().eq("id", lead.id);
    if (error) return toast.error(dbErrorMessage(error));
    setLeads((ls) => ls.filter((l) => l.id !== lead.id));
    toast.success("Pedido apagado.");
  };

  return (
    <div className="space-y-4">
      <LeadRecipients />
      <div className="flex items-center gap-2">
        <select aria-label="Filtrar pedidos" className={`${inputClass} w-auto`} value={filter} onChange={(e) => setFilter(e.target.value as LeadStatus | "")}>
          <option value="">Todos</option>
          {(Object.keys(LEAD_STATUS) as LeadStatus[]).map((s) => <option key={s} value={s}>{LEAD_STATUS[s]}</option>)}
        </select>
        {loading && <Loader2 size={16} className="animate-spin text-muted-foreground" />}
        <p className="ml-auto text-[11px] text-muted-foreground">Pedidos enviados pela página “Anuncie conosco”. Apague os que não forem mais necessários (LGPD).</p>
      </div>
      {!loading && leads.length === 0 ? (
        <p className="rounded-xl border border-border p-8 text-center text-sm text-muted-foreground">Nenhum pedido.</p>
      ) : (
        <ul className="space-y-3">
          {leads.map((l) => (
            <li key={l.id} className="rounded-xl border border-border bg-card p-3">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-bold text-foreground">{l.name}{l.company && ` · ${l.company}`}</p>
                <span className="text-[11px] text-muted-foreground">{formatLocalDateTime(l.created_at)}</span>
                <select aria-label="Status do pedido" className={`${inputClass} ml-auto w-auto py-1 text-xs`} value={l.status}
                  onChange={(e) => update(l, e.target.value as LeadStatus)}>
                  {(Object.keys(LEAD_STATUS) as LeadStatus[]).map((s) => <option key={s} value={s}>{LEAD_STATUS[s]}</option>)}
                </select>
                <button className={btnGhost} onClick={() => remove(l)} aria-label="Apagar pedido"><Trash2 size={12} /></button>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                <a href={`mailto:${l.email}`} className="text-accent hover:underline">{l.email}</a>
                {l.phone && ` · ${l.phone}`}
                {l.interest && ` · Interesse: ${l.interest}`}
              </p>
              <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">{l.message}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
