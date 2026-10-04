import { useMemo, useState } from "react";
import { AlertTriangle, Archive, Pause, Pencil, Play, Plus, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { adsDb, type AdCampaignRow, type CampaignStatusStored } from "@/integrations/supabase/adsTypes";
import { adImageUrl } from "@/lib/ads/client";
import { CAMPAIGN_STATUS_LABEL, computeCampaignStatus, isEndingSoon, needsArchiving, type CampaignStatus } from "@/lib/ads/status";
import { formatLocalDateTime, localInputToUtcIso } from "@/lib/ads/time";
import { ctr, formatCtr } from "@/lib/ads/reports";
import { CampaignFormDialog } from "./CampaignFormDialog";
import { dbErrorMessage, type AdsAdminData } from "./useAdsAdmin";
import { StatusBadge, btnGhost, btnPrimary, formatCents, inputClass } from "./ui";

interface Props extends AdsAdminData {
  reload: () => Promise<void>;
}

export function CampaignsTab({ advertisers, campaigns, placements, reload }: Props) {
  const [fAdvertiser, setFAdvertiser] = useState("");
  const [fPlacement, setFPlacement] = useState("");
  const [fStatus, setFStatus] = useState<"" | CampaignStatus>("");
  const [fFrom, setFFrom] = useState("");
  const [fTo, setFTo] = useState("");
  const [editing, setEditing] = useState<AdCampaignRow | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const now = new Date();
  const advName = (id: string) => advertisers.find((a) => a.id === id)?.name ?? "—";
  const placeName = (key: string) => placements.find((p) => p.key === key)?.name ?? key;

  const endingSoon = campaigns.filter((c) => isEndingSoon(c, now));
  const toArchive = campaigns.filter((c) => needsArchiving(c, now));

  const filtered = useMemo(() => {
    const from = fFrom ? new Date(localInputToUtcIso(`${fFrom}T00:00`) ?? 0) : null;
    const to = fTo ? new Date(localInputToUtcIso(`${fTo}T23:59`) ?? 0) : null;
    return campaigns.filter((c) => {
      if (fAdvertiser && c.advertiser_id !== fAdvertiser) return false;
      if (fPlacement && c.placement_key !== fPlacement) return false;
      if (fStatus && computeCampaignStatus(c) !== fStatus) return false;
      if (from && new Date(c.ends_at) < from) return false;
      if (to && new Date(c.starts_at) > to) return false;
      return true;
    });
  }, [campaigns, fAdvertiser, fPlacement, fStatus, fFrom, fTo]);

  const setStatus = async (c: AdCampaignRow, status: CampaignStatusStored, msg: string) => {
    setBusy(c.id);
    const { error } = await adsDb.from("ad_campaigns").update({ status }).eq("id", c.id);
    setBusy(null);
    if (error) toast.error(dbErrorMessage(error));
    else {
      toast.success(msg);
      await reload();
    }
  };

  const openNew = () => { setEditing(null); setFormOpen(true); };

  return (
    <div className="space-y-4">
      {(endingSoon.length > 0 || toArchive.length > 0) && (
        <div className="space-y-2">
          {endingSoon.length > 0 && (
            <div role="status" className="flex gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-200">
              <AlertTriangle size={16} className="shrink-0" />
              <div>
                <p className="font-bold uppercase">Terminam nos próximos 3 dias</p>
                <ul className="mt-1 list-disc pl-4">
                  {endingSoon.map((c) => <li key={c.id}>{c.name} ({advName(c.advertiser_id)}) — até {formatLocalDateTime(c.ends_at)}</li>)}
                </ul>
              </div>
            </div>
          )}
          {toArchive.length > 0 && (
            <div role="status" className="flex gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
              <AlertTriangle size={16} className="shrink-0" />
              <div>
                <p className="font-bold uppercase">Encerradas (já saíram do ar)</p>
                <p className="mt-0.5">Arquive ou renove o período/limite: {toArchive.map((c) => c.name).join(", ")}.</p>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-end gap-2">
        <select aria-label="Filtrar por anunciante" className={`${inputClass} w-auto`} value={fAdvertiser} onChange={(e) => setFAdvertiser(e.target.value)}>
          <option value="">Todos os anunciantes</option>
          {advertisers.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <select aria-label="Filtrar por espaço" className={`${inputClass} w-auto`} value={fPlacement} onChange={(e) => setFPlacement(e.target.value)}>
          <option value="">Todos os espaços</option>
          {placements.map((p) => <option key={p.key} value={p.key}>{p.name}</option>)}
        </select>
        <select aria-label="Filtrar por status" className={`${inputClass} w-auto`} value={fStatus} onChange={(e) => setFStatus(e.target.value as CampaignStatus | "")}>
          <option value="">Todos os status</option>
          {(Object.keys(CAMPAIGN_STATUS_LABEL) as CampaignStatus[]).map((s) => <option key={s} value={s}>{CAMPAIGN_STATUS_LABEL[s]}</option>)}
        </select>
        <label className="text-[11px] font-bold uppercase text-muted-foreground">
          De <input type="date" className={`${inputClass} w-auto`} value={fFrom} onChange={(e) => setFFrom(e.target.value)} />
        </label>
        <label className="text-[11px] font-bold uppercase text-muted-foreground">
          Até <input type="date" className={`${inputClass} w-auto`} value={fTo} onChange={(e) => setFTo(e.target.value)} />
        </label>
        <button className={`${btnPrimary} ml-auto`} onClick={openNew}><Plus size={14} /> Nova campanha</button>
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-xl border border-border p-8 text-center text-sm text-muted-foreground">
          {campaigns.length === 0 ? "Nenhuma campanha cadastrada ainda." : "Nenhuma campanha com esses filtros."}
        </p>
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {filtered.map((c) => {
            const status = computeCampaignStatus(c, now);
            return (
              <li key={c.id} className="flex gap-3 rounded-xl border border-border bg-card p-3">
                <img src={adImageUrl(c.image_path)} alt="" loading="lazy" className="h-16 w-24 shrink-0 rounded-md border border-border object-cover" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-bold text-foreground">{c.name}</p>
                    <StatusBadge status={status} />
                  </div>
                  <p className="truncate text-[11px] text-muted-foreground">{advName(c.advertiser_id)} · {placeName(c.placement_key)} · peso {c.weight}</p>
                  <p className="text-[11px] text-muted-foreground">{formatLocalDateTime(c.starts_at)} → {formatLocalDateTime(c.ends_at)}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {c.impressions_total.toLocaleString("pt-BR")}{c.max_impressions ? ` / ${c.max_impressions.toLocaleString("pt-BR")}` : ""} impressões ·{" "}
                    {c.clicks_total.toLocaleString("pt-BR")} cliques · CTR {formatCtr(ctr(c.clicks_total, c.impressions_total))}
                    {c.budget_cents != null && ` · ${formatCents(c.budget_cents)}`}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <button className={btnGhost} onClick={() => { setEditing(c); setFormOpen(true); }}><Pencil size={12} /> Editar</button>
                    {c.status === "active" && (
                      <button className={btnGhost} disabled={busy === c.id} onClick={() => setStatus(c, "paused", "Campanha pausada.")}><Pause size={12} /> Pausar</button>
                    )}
                    {(c.status === "paused" || c.status === "draft") && (
                      <button className={btnGhost} disabled={busy === c.id} onClick={() => setStatus(c, "active", "Campanha ativada.")}><Play size={12} /> Ativar</button>
                    )}
                    {c.status !== "archived" ? (
                      <button className={btnGhost} disabled={busy === c.id} onClick={() => setStatus(c, "archived", "Campanha arquivada.")}><Archive size={12} /> Arquivar</button>
                    ) : (
                      <button className={btnGhost} disabled={busy === c.id} onClick={() => setStatus(c, "paused", "Campanha restaurada como pausada.")}><RotateCcw size={12} /> Restaurar</button>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <CampaignFormDialog
        open={formOpen}
        campaign={editing}
        advertisers={advertisers}
        placements={placements}
        onClose={() => setFormOpen(false)}
        onSaved={() => void reload()}
      />
    </div>
  );
}
