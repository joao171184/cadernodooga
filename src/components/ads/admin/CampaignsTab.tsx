import { useMemo, useState } from "react";
import {
  AlertTriangle, Archive, ArrowDown, ArrowUp, BarChart3, CalendarRange, Copy, LayoutGrid, List,
  Pause, Pencil, Play, Plus, RotateCcw, Search, X,
} from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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
import { STATUS_SURFACE, StatusBadge, btnDanger, btnGhost, btnPrimary, formatCents, inputClass } from "./ui";

interface Props extends AdsAdminData {
  reload: () => Promise<void>;
  loading?: boolean;
  onOpenReport?: (campaignId: string) => void;
}

type View = "cards" | "table";
const VIEW_KEY = "panel-campaigns-view";
const SUMMARY: CampaignStatus[] = ["active", "scheduled", "paused", "ended", "draft", "archived"];

function readView(): View {
  try {
    const v = localStorage.getItem(VIEW_KEY) ?? localStorage.getItem("ads-campaigns-view");
    return v === "table" ? "table" : "cards";
  } catch {
    return "cards";
  }
}

export function CampaignsTab({ advertisers, campaigns, placements, reload, loading, onOpenReport }: Props) {
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
  const [confirmArchive, setConfirmArchive] = useState<AdCampaignRow | null>(null);

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

  const actions = (c: AdCampaignRow) => {
    const computed = computeCampaignStatus(c, now);
    const canPause = c.status === "active";
    const canActivate = c.status === "paused" || c.status === "draft";
    return (
      <div className="grid grid-cols-2 gap-1.5">
        <button type="button" className={btnGhost} onClick={() => openEdit(c)} disabled={busy === c.id}>
          <Pencil size={12} aria-hidden /> Editar
        </button>
        {canPause && (
          <button type="button" className={btnGhost} onClick={() => setStatus(c, "paused", "Campanha pausada.")} disabled={busy === c.id}>
            <Pause size={12} aria-hidden /> Pausar
          </button>
        )}
        {canActivate && (
          <button type="button" className={btnGhost} onClick={() => setStatus(c, "active", "Campanha ativada.")} disabled={busy === c.id}>
            <Play size={12} aria-hidden /> Ativar
          </button>
        )}
        <button type="button" className={btnGhost} onClick={() => openDuplicate(c)} disabled={busy === c.id}>
          <Copy size={12} aria-hidden /> Duplicar
        </button>
        <button type="button" className={btnGhost} onClick={() => openEdit(c)} disabled={busy === c.id}>
          <RotateCcw size={12} aria-hidden /> Renovar
        </button>
        <button
          type="button"
          className={btnGhost}
          onClick={() => onOpenReport?.(c.id)}
          disabled={busy === c.id || !onOpenReport}
        >
          <BarChart3 size={12} aria-hidden /> Relatório
        </button>
        {computed !== "archived" ? (
          <button type="button" className={btnDanger} onClick={() => setConfirmArchive(c)} disabled={busy === c.id}>
            <Archive size={12} aria-hidden /> Arquivar
          </button>
        ) : (
          <button type="button" className={btnGhost} onClick={() => setStatus(c, "paused", "Campanha restaurada como pausada.")} disabled={busy === c.id}>
            <RotateCcw size={12} aria-hidden /> Restaurar
          </button>
        )}
      </div>
    );
  };

  const sortHeader = (key: SortKey, label: string, align = "text-left") => (
    <th className={`px-3 py-2 font-semibold ${align}`}>
      <button type="button" className="inline-flex items-center gap-1 uppercase tracking-wide hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm" onClick={() => toggleSort(key)}>
        {label}
        {sort.key === key && (sort.dir === "asc" ? <ArrowUp size={11} /> : <ArrowDown size={11} />)}
      </button>
    </th>
  );

  return (
    <TooltipProvider delayDuration={300}>
      <div className="space-y-panel">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-xs text-muted-foreground">{campaigns.length} campanha(s) cadastrada(s)</p>
          <button type="button" className={`${btnPrimary} ml-auto`} onClick={openNew}><Plus size={14} aria-hidden /> Nova campanha</button>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {SUMMARY.map((s) => {
            const selected = filters.status === s;
            return (
              <button
                key={s}
                type="button"
                onClick={() => patch({ status: selected ? "" : s })}
                aria-pressed={selected}
                className={`rounded-panel border p-2.5 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${STATUS_SURFACE[s]} ${selected ? "ring-2 ring-ring ring-offset-2 ring-offset-background" : "hover:brightness-95"}`}
              >
                <p className="truncate text-[10px] font-bold uppercase tracking-wide opacity-80">{CAMPAIGN_STATUS_LABEL[s]}</p>
                <p className="font-display text-xl font-bold tabular-nums">{counts[s]}</p>
              </button>
            );
          })}
        </div>

        {(endingSoon.length > 0 || toArchive.length > 0) && (
          <div role="status" className="space-y-1.5 rounded-panel border border-feedback-warning-fg/30 bg-feedback-warning p-3 text-xs text-feedback-warning-fg">
            <p className="flex items-center gap-1.5 font-bold uppercase tracking-wide">
              <AlertTriangle size={14} aria-hidden /> Precisa de atenção
            </p>
            <ul className="space-y-1">
              {endingSoon.map((c) => (
                <li key={c.id} className="flex flex-wrap items-center gap-2">
                  <span className="min-w-0 flex-1">
                    <strong>{c.name}</strong> ({advName(c.advertiser_id)}) termina em {formatLocalDateTime(c.ends_at)}
                  </span>
                  <button type="button" className="font-semibold text-accent-strong hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm" onClick={() => openEdit(c)}>Renovar</button>
                </li>
              ))}
              {toArchive.map((c) => (
                <li key={c.id} className="flex flex-wrap items-center gap-2">
                  <span className="min-w-0 flex-1 text-feedback-danger-fg">
                    <strong>{c.name}</strong> já saiu do ar (período ou limite encerrado)
                  </span>
                  <button type="button" className="font-semibold text-accent-strong hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm" onClick={() => openEdit(c)}>Renovar</button>
                  <button type="button" className="font-semibold text-muted-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm" disabled={busy === c.id}
                    onClick={() => setConfirmArchive(c)}>Arquivar</button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="space-y-2 rounded-panel border border-panel-border bg-panel-card p-3">
          <div className="flex flex-col gap-2 lg:flex-row lg:flex-nowrap lg:items-center">
            <div className="relative min-w-0 flex-1">
              <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <input type="search" aria-label="Buscar campanha" placeholder="Buscar campanha…" className={`${inputClass} pl-9`}
                value={filters.query} onChange={(e) => patch({ query: e.target.value })} />
            </div>
            <select aria-label="Filtrar por anunciante" className={`${inputClass} lg:w-44 shrink-0`} value={filters.advertiserId}
              onChange={(e) => patch({ advertiserId: e.target.value })}>
              <option value="">Todos os anunciantes</option>
              {advertisers.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
            <select aria-label="Filtrar por espaço" className={`${inputClass} lg:w-40 shrink-0`} value={filters.placementKey}
              onChange={(e) => patch({ placementKey: e.target.value })}>
              <option value="">Todos os espaços</option>
              {placements.map((p) => <option key={p.key} value={p.key}>{p.name}</option>)}
            </select>
            <select aria-label="Filtrar por status" className={`${inputClass} lg:w-36 shrink-0`} value={filters.status}
              onChange={(e) => patch({ status: e.target.value as CampaignStatus | "" })}>
              <option value="">Todos os status</option>
              {(Object.keys(CAMPAIGN_STATUS_LABEL) as CampaignStatus[]).map((s) => <option key={s} value={s}>{CAMPAIGN_STATUS_LABEL[s]}</option>)}
            </select>
            <button type="button" className={`${btnGhost} shrink-0 ${showPeriod || fromDay || toDay ? "border-primary" : ""}`} onClick={() => setShowPeriod((v) => !v)}
              aria-expanded={showPeriod}>
              <CalendarRange size={12} aria-hidden /> Período
            </button>
          </div>

          {showPeriod && (
            <div className="flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                De <input type="date" className={`${inputClass} w-auto`} value={fromDay} max={toDay || undefined} onChange={(e) => setFromDay(e.target.value)} />
              </label>
              <label className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                Até <input type="date" className={`${inputClass} w-auto`} value={toDay} min={fromDay || undefined} onChange={(e) => setToDay(e.target.value)} />
              </label>
              <span className="text-[11px] text-muted-foreground">Mostra campanhas no ar em algum momento do período.</span>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 border-t border-panel-border pt-2 text-[11px] text-muted-foreground">
            <span>Mostrando {filtered.length} de {campaigns.length}</span>
            <label className="flex items-center gap-1.5">
              <input type="checkbox" checked={filters.showArchived} onChange={(e) => patch({ showArchived: e.target.checked })} />
              Mostrar arquivadas
            </label>
            {anyFilter && (
              <button type="button" className="flex items-center gap-1 font-semibold text-accent-strong hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm" onClick={clearFilters}>
                <X size={11} aria-hidden /> Limpar filtros
              </button>
            )}
            <div className="ml-auto flex rounded-panel border border-panel-border p-0.5" role="group" aria-label="Modo de visualização">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" onClick={() => changeView("cards")} aria-pressed={view === "cards"} aria-label="Ver em cards"
                    className={`rounded-md p-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${view === "cards" ? "bg-muted text-foreground" : "hover:bg-muted/60"}`}>
                    <LayoutGrid size={14} />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Cards</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" onClick={() => changeView("table")} aria-pressed={view === "table"} aria-label="Ver em tabela"
                    className={`rounded-md p-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${view === "table" ? "bg-muted text-foreground" : "hover:bg-muted/60"}`}>
                    <List size={14} />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Tabela</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>

        {loading ? (
          <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <li key={i} className="overflow-hidden rounded-panel border border-panel-border bg-panel-card">
                <Skeleton className="aspect-[16/5] w-full rounded-none" />
                <div className="space-y-2 p-3">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-16 w-full" />
                </div>
              </li>
            ))}
          </ul>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-panel border border-dashed border-panel-border bg-panel-card px-6 py-14 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-status-draft text-status-draft-fg">
              <LayoutGrid size={22} aria-hidden />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">
                {campaigns.length === 0 ? "Nenhuma campanha ainda" : "Nenhum resultado"}
              </p>
              <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                {campaigns.length === 0
                  ? "Crie a primeira campanha para destacar parceiros nos espaços do site."
                  : "Ajuste ou limpe os filtros para ver outras campanhas."}
              </p>
            </div>
            {campaigns.length === 0 ? (
              <button type="button" className={btnPrimary} onClick={openNew}><Plus size={14} aria-hidden /> Nova campanha</button>
            ) : (
              <button type="button" className={btnGhost} onClick={clearFilters}><X size={12} aria-hidden /> Limpar filtros</button>
            )}
          </div>
        ) : view === "cards" ? (
          <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((c) => {
              const status = computeCampaignStatus(c, now);
              const progress = impressionProgress(c);
              return (
                <li key={c.id} className="flex flex-col overflow-hidden rounded-panel border border-panel-border bg-panel-card shadow-sm transition-shadow hover:shadow-md">
                  <div className="relative aspect-[16/5] bg-muted">
                    <img
                      src={adImageUrl(c.image_path)}
                      alt=""
                      loading="eager"
                      decoding="async"
                      className="h-full w-full object-contain"
                    />
                    <span className="absolute left-2 top-2"><StatusBadge status={status} /></span>
                  </div>
                  <div className="flex flex-1 flex-col gap-1.5 p-3">
                    <p className="truncate text-sm font-bold text-foreground" title={c.name}>{c.name}</p>
                    <p className="truncate text-[11px] text-muted-foreground">{advName(c.advertiser_id)} · {placeName(c.placement_key)} · peso {c.weight}</p>
                    <p className="text-[11px] text-muted-foreground">{formatLocalDateTime(c.starts_at)} → {formatLocalDateTime(c.ends_at)}</p>
                    <div className="grid grid-cols-3 gap-2 rounded-panel bg-panel-raised p-2 text-center border border-panel-border/60">
                      <div><p className="text-[9px] font-bold uppercase tracking-wide text-feedback-info-fg">Impressões</p><p className="text-xs font-bold tabular-nums text-foreground">{c.impressions_total.toLocaleString("pt-BR")}</p></div>
                      <div><p className="text-[9px] font-bold uppercase tracking-wide text-feedback-success-fg">Cliques</p><p className="text-xs font-bold tabular-nums text-foreground">{c.clicks_total.toLocaleString("pt-BR")}</p></div>
                      <div><p className="text-[9px] font-bold uppercase tracking-wide text-status-draft-fg">CTR</p><p className="text-xs font-bold tabular-nums text-foreground">{formatCtr(ctr(c.clicks_total, c.impressions_total))}</p></div>
                    </div>
                    {progress != null && (
                      <div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100}
                          aria-label="Limite de impressões usado">
                          <div className={`h-full ${progress >= 1 ? "bg-feedback-danger-fg" : progress > 0.8 ? "bg-feedback-warning-fg" : "bg-primary"}`} style={{ width: `${progress * 100}%` }} />
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
          <div className="overflow-x-auto rounded-panel border border-panel-border bg-panel-card">
            <table className="w-full text-xs">
              <thead className="sticky top-0 z-10 bg-panel-raised text-[10px] text-muted-foreground shadow-sm">
                <tr className="border-b border-panel-border">
                  {sortHeader("name", "Campanha")}
                  {sortHeader("status", "Status")}
                  <th className="px-3 py-2 text-left font-semibold uppercase tracking-wide">Espaço</th>
                  {sortHeader("ends_at", "Término")}
                  {sortHeader("impressions", "Impressões", "text-right")}
                  {sortHeader("ctr", "CTR", "text-right")}
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id} className="border-b border-panel-border last:border-0 hover:bg-muted/40">
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <img src={adImageUrl(c.image_path)} alt="" loading="eager" decoding="async" className="h-8 w-14 shrink-0 rounded border border-panel-border bg-muted object-contain" />
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
                    <td className="min-w-[220px] px-3 py-2"><div className="flex justify-end">{actions(c)}</div></td>
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

        <AlertDialog open={!!confirmArchive} onOpenChange={(o) => { if (!o) setConfirmArchive(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Arquivar campanha?</AlertDialogTitle>
              <AlertDialogDescription>
                {confirmArchive
                  ? `“${confirmArchive.name}” sai do ar e deixa de ser exibida. Você pode restaurar depois.`
                  : null}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                className="bg-feedback-danger-fg text-primary-foreground hover:bg-feedback-danger-fg/90"
                onClick={() => {
                  const c = confirmArchive;
                  setConfirmArchive(null);
                  if (c) void setStatus(c, "archived", "Campanha arquivada.");
                }}
              >
                Arquivar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  );
}
