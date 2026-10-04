import type { AdStatsDailyRow } from "@/integrations/supabase/adsTypes";

export interface MetricTotals {
  impressions: number;
  clicks: number;
  ctr: number;
}

/** CTR = cliques ÷ impressões (0 quando não há impressões). */
export function ctr(clicks: number, impressions: number): number {
  return impressions > 0 ? clicks / impressions : 0;
}

export function formatCtr(value: number): string {
  return `${(value * 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
}

export function totals(rows: Pick<AdStatsDailyRow, "impressions" | "clicks">[]): MetricTotals {
  const impressions = rows.reduce((s, r) => s + r.impressions, 0);
  const clicks = rows.reduce((s, r) => s + r.clicks, 0);
  return { impressions, clicks, ctr: ctr(clicks, impressions) };
}

/** Agrupa linhas diárias por uma chave (campanha, anunciante, espaço ou dia), ordenado por impressões. */
export function groupMetrics<T extends Pick<AdStatsDailyRow, "impressions" | "clicks">>(
  rows: T[],
  keyOf: (row: T) => string,
): { key: string; impressions: number; clicks: number; ctr: number }[] {
  const map = new Map<string, { impressions: number; clicks: number }>();
  for (const r of rows) {
    const k = keyOf(r);
    const cur = map.get(k) ?? { impressions: 0, clicks: 0 };
    cur.impressions += r.impressions;
    cur.clicks += r.clicks;
    map.set(k, cur);
  }
  return [...map.entries()]
    .map(([key, v]) => ({ key, ...v, ctr: ctr(v.clicks, v.impressions) }))
    .sort((a, b) => b.impressions - a.impressions || a.key.localeCompare(b.key));
}
