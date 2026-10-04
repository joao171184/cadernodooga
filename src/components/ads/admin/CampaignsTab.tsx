import { useMemo, useState } from "react";
import {
  AlertTriangle, Archive, ArrowDown, ArrowUp, CalendarRange, Copy, LayoutGrid, List, MoreHorizontal,
  Pause, Pencil, Play, Plus, RotateCcw, Search, X,
} from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { adsDb, type AdCampaignRow, type CampaignStatusStored } from "@/integrations/supabase/adsTypes";
import { adImageUrl } from "@/lib/ads/client";
import {
  EMPTY_FILTERS, filterCampaigns, hasActiveFilters, impressionProgress, sortCampaigns, statusCounts,
  type CampaignFilters, type SortDir, type SortKey,
} from "@/lib/ads/campaigns";
import { CAMPAIGN_STATUS_LABEL, computeCampaignStatus, isEndingSoon, needsArchiving, type CampaignStatus } from "@/lib/ads/status";
import { formatLocalDateTime, localInputToUtcIso } from "@/lib/ads/time";
import { ctr, formatCtr } from "@/lib/ads/reports";
import { CampaignFormDialog } from "./CampaignFormDialog";
import { dbErrorMessage, type AdsAdminData } from "./useAdsAdmin";
import { StatusBadge, btnGhost, btnPrimary, formatCents, inputClass } from "./ui";

interface Props extends AdsAdminData {
  reload: () => Promise<void>;
}

type View = "cards" | "table";
const VIEW_KEY = "ads-campaigns-view";
const SUMMARY: CampaignStatus[] = ["active", "scheduled", "paused", "ended", "draft", "archived"];

function readView(): View {
  try {
    return localStorage.getItem(VIEW_KEY) === "table" ? "table" : "cards";
  } catch {
    return "cards";
  }
}

export function CampaignsTab({ advertisers, campaigns, placements, reload }: Props) {
  const [filters, setFilters] = useState<CampaignFilters>(EMPTY_FILTERS);
  const [fromDay, setFromDay] = useState("");
  const [toDay, setToDay] = useState("");
  const [showPeriod, setShowPeriod] = useState(false);
  const [view, setView] = useState<View>(readView);
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({ key: "status", dir: "asc" });
  const [form, setForm] = useState<{ open: boolean; campaign: AdCampaignRow | null; template: AdCampaignRow | null }>({
    open: false, campaign: null, template: null,
  });
  const [busy, setBusy] = useState<string | null>(null);

  const now = new Date();
  const advName = (id: string) => advertisers.find((a) => a.id === id)?.name ?? "—";
  const placeName = (key: string) => placements.find((p) => p.key === key)?.name ?? key;

  const counts = useMemo(() => statusCounts(campaigns), [campaigns]);
  const endingSoon = campaigns.filter((c) => isEndingSoon(c, now));
  const toArchive = campaigns.filter((c) => needsArchiving(c, now));

  const effective: CampaignFilters = {
    ...filters,
    from: fromDay ? localInputToUtcIso(`${fromDay}T00:00`) : null,
    to: toDay ? localInputToUtcIso(`${toDay}T23:59`) : null,
  };
  const filtered = sortCampaigns(filterCampaigns(campaigns, effective), sort.key, sort.dir);
  const anyFilter = hasActiveFilters(effective);

  const patch = (p: Partial<CampaignFilters>) => setFilters((f) => ({ ...f, ...p }));
  const clearFilters = () => { setFilters(EMPTY_FILTERS); setFromDay(""); setToDay(""); };
  const changeView = (v: View) => {
    setView(v);
    try { localStorage.setItem(VIEW_KEY, v); } catch { /* modo privado */ }
  };
  const toggleSort = (key: SortKey) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: key === "name" || key === "status" ? "asc" : "desc" }));

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

  const openNew = () => setForm({ open: true, campaign: null, template: null });
  const openEdit = (c: AdCampaignRow) => setForm({ open: true, campaign: c, template: null });
  const openDuplicate = (c: AdCampaignRow) => setForm({ open: true, campaign: null, template: c });

  const actions = (c: AdCampaignRow) => (
    <div className="flex items-center gap-1.5">
      <button className={btnGhost} onClick={() => openEdit(c)}><Pencil size={12} /> Editar</button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className={`${btnGhost} px-2`} aria-label={`Mais ações para ${c.name}`} disabled={busy === c.id}>
            <MoreHorizontal size={14} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {c.status === "active" && (
            <DropdownMenuItem onSelect={() => setStatus(c, "paused", "Campanha pausada.")}><Pause size={14} /> Pausar</DropdownMenuItem>
          )}
          {(c.status === "paused" || c.status === "draft") && (
            <DropdownMenuItem onSelect={() => setStatus(c, "active", "Campanha ativada.")}><Play size={14} /> Ativar</DropdownMenuItem>
          )}
          <DropdownMenuItem onSelect={() => openDuplicate(c)}><Copy size={14} /> Duplicar</DropdownMenuItem>
          <DropdownMenuSeparator />
          {c.status !== "archived" ? (
            <DropdownMenuItem onSelect={() => setStatus(c, "archived", "Campanha arquivada.")}><Archive size={14} /> Arquivar</DropdownMenuItem>
          ) : (
            <DropdownMenuItem onSelect={() => setStatus(c, "paused", "Campanha restaurada como pausada.")}><RotateCcw size={14} /> Restaurar</DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );

  const sortHeader = (key: SortKey, label: string, align = "text-left") => (
    <th className={`px-3 py-2 font-semibold ${align}`}>
      <button className="inline-flex items-center gap-1 uppercase hover:text-foreground" onClick={() => toggleSort(key)}>
        {label}
        {sort.key === key && (sort.dir === "asc" ? <ArrowUp size={11} /> : <ArrowDown size={11} />)}
      </button>
    </th>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-xs text-muted-foreground">{campaigns.length} campanha(s) cadastrada(s)</p>
        <button className={`${btnPrimary} ml-auto`} onClick={openNew}><Plus size={14} /> Nova campanha</button>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {SUMMARY.map((s) => (
          <button
            key={s}
            onClick={() => patch({ status: filters.status === s ? "" : s })}
            aria-pressed={filters.status === s}
            className={`rounded-xl border p-2.5 text-left transition-colors ${filters.status === s ? "border-primary bg-primary/10" : "border-border bg-card hover:bg-muted"}`}
          >
            <p className="truncate text-[10px] font-bold uppercase text-muted-foreground">{CAMPAIGN_STATUS_LABEL[s]}</p>
            <p className="font-display text-xl font-bold tabular-nums text-foreground">{counts[s]}</p>
          </button>
        ))}
      </div>

      {(endingSoon.length > 0 || toArchive.length > 0) && (
        <div role="status" className="space-y-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs">
          <p className="flex items-center gap-1.5 font-bold uppercase text-amber-800 dark:text-amber-200">
            <AlertTriangle size={14} /> Precisa de atenção
          </p>
          <ul className="space-y-1">
            {endingSoon.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center gap-2">
                <span className="min-w-0 flex-1 text-amber-900 dark:text-amber-100">
                  <strong>{c.name}</strong> ({advName(c.advertiser_id)}) termina em {formatLocalDateTime(c.ends_at)}
                </span>
                <button className="font-bold uppercase text-accent hover:underline" onClick={() => openEdit(c)}>Renovar</button>
              </li>
            ))}
            {toArchive.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center gap-2">
                <span className="min-w-0 flex-1 text-destructive">
                  <strong>{c.name}</strong> já saiu do ar (período ou limite encerrado)
                </span>
                <button className="font-bold uppercase text-accent hover:underline" onClick={() => openEdit(c)}>Renovar</button>
                <button className="font-bold uppercase text-muted-foreground hover:underline" disabled={busy === c.id}
                  onClick={() => setStatus(c, "archived", "Campanha arquivada.")}>Arquivar</button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="space-y-2 rounded-xl border border-border bg-card p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[180px] flex-1">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input type="search" aria-label="Buscar campanha" placeholder="Buscar campanha…" className={`${inputClass} pl-9`}
              value={filters.query} onChange={(e) => patch({ query: e.target.value })} />
          </div>
          <select aria-label="Filtrar por anunciante" className={`${inputClass} w-auto`} value={filters.advertiserId}
            onChange={(e) => patch({ advertiserId: e.target.value })}>
            <option value="">Todos os anunciantes</option>
            {advertisers.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          <select aria-label="Filtrar por espaço" className={`${inputClass} w-auto`} value={filters.placementKey}
            onChange={(e) => patch({ placementKey: e.target.value })}>
            <option value="">Todos os espaços</option>
            {placements.map((p) => <option key={p.key} value={p.key}>{p.name}</option>)}
          </select>
          <select aria-label="Filtrar por status" className={`${inputClass} w-auto`} value={filters.status}
            onChange={(e) => patch({ status: e.target.value as CampaignStatus | "" })}>
            <option value="">Todos os status</option>
            {(Object.keys(CAMPAIGN_STATUS_LABEL) as CampaignStatus[]).map((s) => <option key={s} value={s}>{CAMPAIGN_STATUS_LABEL[s]}</option>)}
          </select>
          <button className={`${btnGhost} ${showPeriod || fromDay || toDay ? "border-primary" : ""}`} onClick={() => setShowPeriod((v) => !v)}
            aria-expanded={showPeriod}>
            <CalendarRange size={12} /> Período
          </button>
        </div>

        {showPeriod && (
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-1.5 text-[11px] font-bold uppercase text-muted-foreground">
              De <input type="date" className={`${inputClass} w-auto`} value={fromDay} max={toDay || undefined} onChange={(e) => setFromDay(e.target.value)} />
            </label>
            <label className="flex items-center gap-1.5 text-[11px] font-bold uppercase text-muted-foreground">
              Até <input type="date" className={`${inputClass} w-auto`} value={toDay} min={fromDay || undefined} onChange={(e) => setToDay(e.target.value)} />
            </label>
            <span className="text-[11px] text-muted-foreground">Mostra campanhas no ar em algum momento do período.</span>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3 border-t border-border pt-2 text-[11px] text-muted-foreground">
          <span>Mostrando {filtered.length} de {campaigns.length}</span>
          <label className="flex items-center gap-1.5">
            <input type="checkbox" checked={filters.showArchived} onChange={(e) => patch({ showArchived: e.target.checked })} />
            Mostrar arquivadas
          </label>
          {anyFilter && (
            <button className="flex items-center gap-1 font-bold uppercase text-accent hover:underline" onClick={clearFilters}>
              <X size={11} /> Limpar filtros
            </button>
          )}
          <div className="ml-auto flex rounded-lg border border-border p-0.5" role="group" aria-label="Modo de visualização">
            <button onClick={() => changeView("cards")} aria-pressed={view === "cards"} aria-label="Ver em cards"
              className={`rounded-md p-1.5 ${view === "cards" ? "bg-muted text-foreground" : ""}`}><LayoutGrid size={14} /></button>
            <button onClick={() => changeView("table")} aria-pressed={view === "table"} aria-label="Ver em tabela"
              className={`rounded-md p-1.5 ${view === "table" ? "bg-muted text-foreground" : ""}`}><List size={14} /></button>
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-xl border border-border p-8 text-center text-sm text-muted-foreground">
          {campaigns.length === 0 ? "Nenhuma campanha cadastrada ainda." : "Nenhuma campanha com esses filtros."}
        </p>
      ) : view === "cards" ? (
        <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((c) => {
            const status = computeCampaignStatus(c, now);
            const progress = impressionProgress(c);
            return (
              <li key={c.id} className="flex flex-col overflow-hidden rounded-xl border border-border bg-card">
                <div className="relative aspect-[3/1] bg-muted">
                  <img src={adImageUrl(c.image_path)} alt="" loading="lazy" className="h-full w-full object-cover" />
                  <span className="absolute left-2 top-2"><StatusBadge status={status} /></span>
                </div>
                <div className="flex flex-1 flex-col gap-1.5 p-3">
                  <p className="truncate text-sm font-bold text-foreground" title={c.name}>{c.name}</p>
                  <p className="truncate text-[11px] text-muted-foreground">{advName(c.advertiser_id)} · {placeName(c.placement_key)} · peso {c.weight}</p>
                  <p className="text-[11px] text-muted-foreground">{formatLocalDateTime(c.starts_at)} → {formatLocalDateTime(c.ends_at)}</p>
                  <div className="grid grid-cols-3 gap-2 rounded-lg bg-muted/50 p-2 text-center">
                    <div><p className="text-[9px] font-bold uppercase text-muted-foreground">Impressões</p><p className="text-xs font-bold tabular-nums">{c.impressions_total.toLocaleString("pt-BR")}</p></div>
                    <div><p className="text-[9px] font-bold uppercase text-muted-foreground">Cliques</p><p className="text-xs font-bold tabular-nums">{c.clicks_total.toLocaleString("pt-BR")}</p></div>
                    <div><p className="text-[9px] font-bold uppercase text-muted-foreground">CTR</p><p className="text-xs font-bold tabular-nums">{formatCtr(ctr(c.clicks_total, c.impressions_total))}</p></div>
                  </div>
                  {progress != null && (
                    <div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100}
                        aria-label="Limite de impressões usado">
                        <div className={`h-full ${progress >= 1 ? "bg-destructive" : progress > 0.8 ? "bg-amber-500" : "bg-primary"}`} style={{ width: `${progress * 100}%` }} />
                      </div>
                      <p className="mt-0.5 text-[10px] text-muted-foreground">{Math.round(progress * 100)}% de {c.max_impressions!.toLocaleString("pt-BR")} impressões</p>
                    </div>
                  )}
                  {c.budget_cents != null && <p className="text-[11px] text-muted-foreground">Valor contratado: {formatCents(c.budget_cents)}</p>}
                  <div className="mt-auto pt-1.5">{actions(c)}</div>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full text-xs">
            <thead className="text-[10px] text-muted-foreground">
              <tr className="border-b border-border">
                {sortHeader("name", "Campanha")}
                {sortHeader("status", "Status")}
                <th className="px-3 py-2 text-left font-semibold uppercase">Espaço</th>
                {sortHeader("ends_at", "Término")}
                {sortHeader("impressions", "Impressões", "text-right")}
                {sortHeader("ctr", "CTR", "text-right")}
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="border-b border-border last:border-0 hover:bg-muted/40">
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <img src={adImageUrl(c.image_path)} alt="" loading="lazy" className="h-8 w-14 shrink-0 rounded border border-border object-cover" />
                      <div className="min-w-0">
                        <p className="max-w-[220px] truncate font-bold text-foreground" title={c.name}>{c.name}</p>
                        <p className="max-w-[220px] truncate text-[10px] text-muted-foreground">{advName(c.advertiser_id)}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2"><StatusBadge status={computeCampaignStatus(c, now)} /></td>
                  <td className="px-3 py-2 text-muted-foreground">{placeName(c.placement_key)}</td>
                  <td className="whitespace-nowrap px-3 py-2 tabular-nums text-muted-foreground">{formatLocalDateTime(c.ends_at)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {c.impressions_total.toLocaleString("pt-BR")}
                    {c.max_impressions ? <span className="text-muted-foreground"> / {c.max_impressions.toLocaleString("pt-BR")}</span> : null}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatCtr(ctr(c.clicks_total, c.impressions_total))}</td>
                  <td className="px-3 py-2"><div className="flex justify-end">{actions(c)}</div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <CampaignFormDialog
        open={form.open}
        campaign={form.campaign}
        template={form.template}
        advertisers={advertisers}
        placements={placements}
        onClose={() => setForm((f) => ({ ...f, open: false }))}
        onSaved={() => void reload()}
      />
    </div>
  );
}
