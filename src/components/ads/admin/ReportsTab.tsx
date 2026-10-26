import { useCallback, useEffect, useMemo, useState } from "react";
import { Eye, FileDown, Info, Loader2, MousePointerClick, Percent, Trophy } from "lucide-react";
import { brDate, buildReportPdf, downloadBlob } from "@/lib/pdfReport";
import {
  Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { adsDb, type AdStatsDailyRow } from "@/integrations/supabase/adsTypes";
import { formatCtr, groupMetrics, totals } from "@/lib/ads/reports";
import { localDay } from "@/lib/ads/time";
import type { AdsAdminData } from "./useAdsAdmin";
import { inputClass } from "./ui";

type MetricRow = { key: string; impressions: number; clicks: number; ctr: number };

function MetricsTable({ title, rows, label }: {
  title: string;
  rows: MetricRow[];
  label: (key: string) => string;
}) {
  const bestKey = useMemo(() => {
    if (!rows.length) return null;
    let best = rows[0];
    for (const r of rows) {
      if (r.impressions > best.impressions || (r.impressions === best.impressions && r.ctr > best.ctr)) {
        best = r;
      }
    }
    return best.key;
  }, [rows]);

  return (
    <section className="rounded-panel border border-panel-border bg-panel-card shadow-sm">
      <h3 className="border-b border-panel-border px-3 py-2.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{title}</h3>
      {rows.length === 0 ? (
        <p className="p-6 text-center text-xs text-muted-foreground">Sem dados no período.</p>
      ) : (
        <div className="max-h-72 overflow-auto">
          <table className="w-full text-xs">
            <thead className="sticky top-0 z-10 bg-panel-raised shadow-sm">
              <tr className="text-left text-muted-foreground">
                <th className="px-3 py-2 font-semibold">Nome</th>
                <th className="px-3 py-2 text-right font-semibold">Impressões</th>
                <th className="px-3 py-2 text-right font-semibold">Cliques</th>
                <th className="px-3 py-2 text-right font-semibold">CTR</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const best = r.key === bestKey;
                return (
                  <tr
                    key={r.key}
                    className={`border-t border-panel-border ${best ? "bg-status-active/60" : "hover:bg-muted/40"}`}
                  >
                    <td className="px-3 py-2 text-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        {best && (
                          <Trophy size={12} className="shrink-0 text-status-active-fg" aria-label="Melhor resultado" />
                        )}
                        {label(r.key)}
                      </span>
                    </td>
                    <td className={`px-3 py-2 text-right tabular-nums ${best ? "font-bold text-status-active-fg" : ""}`}>
                      {r.impressions.toLocaleString("pt-BR")}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{r.clicks.toLocaleString("pt-BR")}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatCtr(r.ctr)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function formatDayLabel(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

export function ReportsTab({ campaigns, advertisers, placements, focusCampaignId }: AdsAdminData & { focusCampaignId?: string }) {
  const today = localDay(new Date());
  const [from, setFrom] = useState(localDay(new Date(Date.now() - 29 * 86_400_000)));
  const [to, setTo] = useState(today);
  const [campaignId, setCampaignId] = useState("");
  const [rows, setRows] = useState<AdStatsDailyRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (focusCampaignId) setCampaignId(focusCampaignId);
  }, [focusCampaignId]);

  const load = useCallback(async () => {
    setLoading(true);
    let q = adsDb.from("ad_stats_daily").select("*").gte("day", from).lte("day", to).order("day");
    if (campaignId) q = q.eq("campaign_id", campaignId);
    const { data, error } = await q;
    setFailed(!!error);
    setRows(data ?? []);
    setLoading(false);
  }, [from, to, campaignId]);

  useEffect(() => { void load(); }, [load]);

  const campaignById = useMemo(() => new Map(campaigns.map((c) => [c.id, c])), [campaigns]);
  const advName = (id: string) => advertisers.find((a) => a.id === id)?.name ?? "—";
  const sum = totals(rows);

  const byDay = useMemo(
    () => groupMetrics(rows, (r) => r.day).sort((a, b) => a.key.localeCompare(b.key)),
    [rows],
  );

  const chartData = useMemo(
    () => byDay.map((d) => ({
      day: d.key,
      label: formatDayLabel(d.key),
      impressoes: d.impressions,
      cliques: d.clicks,
    })),
    [byDay],
  );

  const kpis = [
    {
      key: "impressions",
      label: "Impressões",
      value: sum.impressions.toLocaleString("pt-BR"),
      icon: Eye,
      surface: "bg-feedback-info text-feedback-info-fg border-feedback-info-fg/25",
    },
    {
      key: "clicks",
      label: "Cliques",
      value: sum.clicks.toLocaleString("pt-BR"),
      icon: MousePointerClick,
      surface: "bg-feedback-success text-feedback-success-fg border-feedback-success-fg/25",
    },
    {
      key: "ctr",
      label: "CTR",
      value: formatCtr(sum.ctr),
      icon: Percent,
      surface: "bg-status-draft text-status-draft-fg border-status-draft-fg/25",
    },
  ] as const;

  return (
    <div className="space-y-panel">
      <div className="flex flex-col gap-2 rounded-panel border border-panel-border bg-panel-card p-3 lg:flex-row lg:flex-nowrap lg:items-end">
        <label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
          De
          <input type="date" className={`${inputClass} mt-1 w-full lg:w-auto`} value={from} max={to} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
          Até
          <input type="date" className={`${inputClass} mt-1 w-full lg:w-auto`} value={to} min={from} max={today} onChange={(e) => setTo(e.target.value)} />
        </label>
        <label className="min-w-0 flex-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
          Campanha
          <select aria-label="Campanha" className={`${inputClass} mt-1`} value={campaignId} onChange={(e) => setCampaignId(e.target.value)}>
            <option value="">Todas as campanhas</option>
            {campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        {loading && <Loader2 size={16} className="mb-2 animate-spin text-muted-foreground shrink-0" aria-label="Carregando" />}
        <button
          type="button"
          disabled={loading}
          onClick={() => {
            const camp = campaignId ? campaignById.get(campaignId) : undefined;
            const byPlacement = groupMetrics(rows, (r) => r.placement_key);
            const byCamp = groupMetrics(rows, (r) => r.campaign_id);
            const plName = (k: string) => placements.find((p) => p.key === k)?.name ?? k;
            const blob = buildReportPdf({
              title: "RELATÓRIO DE PUBLICIDADE",
              subtitle: `Período: ${brDate(from)} a ${brDate(to)}`,
              summary: [
                ["Campanha", camp ? camp.name : "Todas as campanhas"],
                ...(camp ? [["Anunciante", advName(camp.advertiser_id)] as [string, string]] : []),
                ["Impressões", sum.impressions.toLocaleString("pt-BR")],
                ["Cliques", sum.clicks.toLocaleString("pt-BR")],
                ["CTR", formatCtr(sum.ctr)],
              ],
              sections: [
                { title: "Por dia", head: ["Data", "Impressões", "Cliques", "CTR"],
                  body: byDay.map((d) => [brDate(d.key), d.impressions, d.clicks, formatCtr(d.ctr)]) },
                { title: "Por espaço", head: ["Espaço", "Impressões", "Cliques", "CTR"],
                  body: byPlacement.map((d) => [plName(d.key), d.impressions, d.clicks, formatCtr(d.ctr)]) },
                ...(camp ? [] : [{ title: "Por campanha", head: ["Campanha", "Impressões", "Cliques", "CTR"],
                  body: byCamp.map((d) => [campaignById.get(d.key)?.name ?? "—", d.impressions, d.clicks, formatCtr(d.ctr)]) }]),
              ],
            });
            downloadBlob(blob, `publicidade_${camp ? camp.name.replace(/\W+/g, "_") + "_" : ""}${from}_a_${to}.pdf`);
          }}
          className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-bold uppercase text-primary-foreground disabled:opacity-50"
        >
          <FileDown size={14} /> Baixar PDF
        </button>
      </div>

      {failed && (
        <p className="rounded-panel border border-feedback-danger-fg/30 bg-feedback-danger px-3 py-2 text-xs text-feedback-danger-fg">
          Não foi possível carregar os relatórios.
        </p>
      )}

      {loading && !rows.length ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-panel" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {kpis.map(({ key, label, value, icon: Icon, surface }) => (
            <div key={key} className={`rounded-panel border p-3 shadow-sm ${surface}`}>
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-panel bg-panel-card/50">
                  <Icon size={16} aria-hidden />
                </span>
                <p className="text-[10px] font-bold uppercase tracking-wide opacity-90">{label}</p>
              </div>
              <p className="mt-2 font-display text-2xl font-bold tabular-nums">{value}</p>
            </div>
          ))}
        </div>
      )}

      <section className="rounded-panel border border-panel-border bg-panel-card p-3 shadow-sm">
        <h3 className="mb-3 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Evolução por dia</h3>
        {loading && !chartData.length ? (
          <Skeleton className="h-64 w-full rounded-panel" />
        ) : chartData.length === 0 ? (
          <p className="py-12 text-center text-xs text-muted-foreground">Sem dados no período para o gráfico.</p>
        ) : (
          <div className="h-64 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="fillImpressoes" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--feedback-info-fg))" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="hsl(var(--feedback-info-fg))" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="fillCliques" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--feedback-success-fg))" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="hsl(var(--feedback-success-fg))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-panel-border" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                <YAxis tick={{ fontSize: 11 }} width={40} className="text-muted-foreground" allowDecimals={false} />
                <RechartsTooltip
                  contentStyle={{
                    background: "hsl(var(--panel-card-raised))",
                    border: "1px solid hsl(var(--panel-border))",
                    borderRadius: "var(--panel-radius)",
                    fontSize: 12,
                  }}
                  labelFormatter={(_, payload) => {
                    const day = payload?.[0]?.payload?.day as string | undefined;
                    return day ? day.split("-").reverse().join("/") : "";
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area
                  type="monotone"
                  dataKey="impressoes"
                  name="Impressões"
                  stroke="hsl(var(--feedback-info-fg))"
                  fill="url(#fillImpressoes)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="cliques"
                  name="Cliques"
                  stroke="hsl(var(--feedback-success-fg))"
                  fill="url(#fillCliques)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      <div className="grid gap-3 lg:grid-cols-2">
        <MetricsTable title="Por campanha" rows={groupMetrics(rows, (r) => r.campaign_id)} label={(id) => campaignById.get(id)?.name ?? "Campanha removida"} />
        <MetricsTable
          title="Por anunciante"
          rows={groupMetrics(rows, (r) => campaignById.get(r.campaign_id)?.advertiser_id ?? "?")}
          label={(id) => (id === "?" ? "—" : advName(id))}
        />
        <MetricsTable title="Por espaço" rows={groupMetrics(rows, (r) => r.placement_key)} label={(k) => placements.find((p) => p.key === k)?.name ?? k} />
        <MetricsTable
          title="Por dia"
          rows={[...byDay].sort((a, b) => b.key.localeCompare(a.key))}
          label={(d) => d.split("-").reverse().join("/")}
        />
      </div>

      <section className="rounded-panel border border-panel-border bg-panel-raised p-4 text-xs leading-relaxed text-muted-foreground">
        <p className="mb-2 flex items-center gap-1.5 font-bold uppercase tracking-wide text-foreground">
          <Info size={14} aria-hidden /> Como os números são calculados
        </p>
        <ul className="list-disc space-y-1 pl-4">
          <li><strong>Dados próprios</strong>, só de destaques diretos, medidos por este site.</li>
          <li><strong>Impressão</strong>: o destaque ficou ao menos 50% visível na tela por 1 segundo.</li>
          <li><strong>Clique</strong>: clique no destaque por quem o viu na última hora.</li>
          <li>Cada impressão e cada clique contam no máximo uma vez a cada 30 minutos por sessão anônima do navegador. Robôs conhecidos e administradores logados não contam.</li>
          <li><strong>CTR</strong> = cliques ÷ impressões.</li>
          <li>Os dias seguem o horário de Brasília. Não guardamos IP, nome ou e-mail de quem vê os destaques.</li>
          <li><strong>Google AdSense</strong>: os números do AdSense não aparecem aqui. Consulte-os no painel do Google AdSense.</li>
        </ul>
      </section>
    </div>
  );
}
