import type { AdCampaignRow } from "@/integrations/supabase/adsTypes";
import { computeCampaignStatus, type CampaignStatus } from "./status";
import { ctr } from "./reports";

export interface CampaignFilters {
  query: string;
  advertiserId: string;
  placementKey: string;
  status: CampaignStatus | "";
  /** Início e fim do período em ISO UTC (campanhas que se sobrepõem a ele). */
  from: string | null;
  to: string | null;
  showArchived: boolean;
}

export const EMPTY_FILTERS: CampaignFilters = {
  query: "", advertiserId: "", placementKey: "", status: "", from: null, to: null, showArchived: false,
};

export function hasActiveFilters(f: CampaignFilters): boolean {
  return !!(f.query.trim() || f.advertiserId || f.placementKey || f.status || f.from || f.to || f.showArchived);
}

/** Arquivadas ficam ocultas, a não ser que o filtro peça por elas. */
export function filterCampaigns(campaigns: AdCampaignRow[], f: CampaignFilters, now: Date = new Date()): AdCampaignRow[] {
  const q = f.query.trim().toLowerCase();
  const from = f.from ? new Date(f.from).getTime() : null;
  const to = f.to ? new Date(f.to).getTime() : null;
  return campaigns.filter((c) => {
    const status = computeCampaignStatus(c, now);
    if (f.status ? status !== f.status : status === "archived" && !f.showArchived) return false;
    if (q && !c.name.toLowerCase().includes(q)) return false;
    if (f.advertiserId && c.advertiser_id !== f.advertiserId) return false;
    if (f.placementKey && c.placement_key !== f.placementKey) return false;
    if (from != null && new Date(c.ends_at).getTime() < from) return false;
    if (to != null && new Date(c.starts_at).getTime() > to) return false;
    return true;
  });
}

export function statusCounts(campaigns: AdCampaignRow[], now: Date = new Date()): Record<CampaignStatus, number> {
  const counts: Record<CampaignStatus, number> = { draft: 0, scheduled: 0, active: 0, paused: 0, ended: 0, archived: 0 };
  for (const c of campaigns) counts[computeCampaignStatus(c, now)] += 1;
  return counts;
}

export type SortKey = "name" | "status" | "ends_at" | "impressions" | "ctr";
export type SortDir = "asc" | "desc";

const STATUS_ORDER: Record<CampaignStatus, number> = { active: 0, scheduled: 1, paused: 2, draft: 3, ended: 4, archived: 5 };

export function sortCampaigns(list: AdCampaignRow[], key: SortKey, dir: SortDir, now: Date = new Date()): AdCampaignRow[] {
  const value = (c: AdCampaignRow): number | string => {
    switch (key) {
      case "name": return c.name.toLowerCase();
      case "status": return STATUS_ORDER[computeCampaignStatus(c, now)];
      case "ends_at": return new Date(c.ends_at).getTime();
      case "impressions": return c.impressions_total;
      case "ctr": return ctr(c.clicks_total, c.impressions_total);
    }
  };
  const sign = dir === "asc" ? 1 : -1;
  return [...list].sort((a, b) => {
    const va = value(a);
    const vb = value(b);
    const cmp = typeof va === "string" ? va.localeCompare(vb as string, "pt-BR") : va - (vb as number);
    return cmp * sign || a.name.localeCompare(b.name, "pt-BR");
  });
}

/** Fração (0–1) do limite de impressões já usada; null sem limite. */
export function impressionProgress(c: Pick<AdCampaignRow, "impressions_total" | "max_impressions">): number | null {
  if (!c.max_impressions) return null;
  return Math.min(1, c.impressions_total / c.max_impressions);
}
