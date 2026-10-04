import { useCallback, useEffect, useMemo, useState } from "react";
import { Info, Loader2 } from "lucide-react";
import { adsDb, type AdStatsDailyRow } from "@/integrations/supabase/adsTypes";
import { formatCtr, groupMetrics, totals } from "@/lib/ads/reports";
import { localDay } from "@/lib/ads/time";
import type { AdsAdminData } from "./useAdsAdmin";
import { inputClass } from "./ui";

function MetricsTable({ title, rows, label }: {
  title: string;
  rows: { key: string; impressions: number; clicks: number; ctr: number }[];
  label: (key: string) => string;
}) {
  return (
    <section className="rounded-xl border border-border bg-card">
      <h3 className="border-b border-border px-3 py-2 text-[11px] font-bold uppercase text-muted-foreground">{title}</h3>
      {rows.length === 0 ? (
        <p className="p-4 text-center text-xs text-muted-foreground">Sem dados no período.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-muted-foreground">
                <th className="px-3 py-2 font-semibold">Nome</th>
                <th className="px-3 py-2 text-right font-semibold">Impressões</th>
                <th className="px-3 py-2 text-right font-semibold">Cliques</th>
                <th className="px-3 py-2 text-right font-semibold">CTR</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.key} className="border-t border-border">
                  <td className="px-3 py-2 text-foreground">{label(r.key)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{r.impressions.toLocaleString("pt-BR")}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{r.clicks.toLocaleString("pt-BR")}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatCtr(r.ctr)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export function ReportsTab({ campaigns, advertisers, placements }: AdsAdminData) {
  const today = localDay(new Date());
  const [from, setFrom] = useState(localDay(new Date(Date.now() - 29 * 86_400_000)));
  const [to, setTo] = useState(today);
  const [campaignId, setCampaignId] = useState("");
  const [rows, setRows] = useState<AdStatsDailyRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

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

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-2">
        <label className="text-[11px] font-bold uppercase text-muted-foreground">
          De <input type="date" className={`${inputClass} w-auto`} value={from} max={to} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label className="text-[11px] font-bold uppercase text-muted-foreground">
          Até <input type="date" className={`${inputClass} w-auto`} value={to} min={from} max={today} onChange={(e) => setTo(e.target.value)} />
        </label>
        <select aria-label="Campanha" className={`${inputClass} w-auto`} value={campaignId} onChange={(e) => setCampaignId(e.target.value)}>
          <option value="">Todas as campanhas</option>
          {campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        {loading && <Loader2 size={16} className="animate-spin text-muted-foreground" />}
      </div>

      {failed && <p className="text-xs text-destructive">Não foi possível carregar os relatórios.</p>}

      <div className="grid grid-cols-3 gap-3">
        {[
          ["Impressões", sum.impressions.toLocaleString("pt-BR")],
          ["Cliques", sum.clicks.toLocaleString("pt-BR")],
          ["CTR", formatCtr(sum.ctr)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-border bg-card p-3">
            <p className="text-[10px] font-bold uppercase text-muted-foreground">{label}</p>
            <p className="font-display text-xl font-bold text-foreground tabular-nums">{value}</p>
          </div>
        ))}
      </div>

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
          rows={groupMetrics(rows, (r) => r.day).sort((a, b) => b.key.localeCompare(a.key))}
          label={(d) => d.split("-").reverse().join("/")}
        />
      </div>

      <section className="rounded-xl border border-border bg-muted/40 p-4 text-xs leading-relaxed text-muted-foreground">
        <p className="mb-2 flex items-center gap-1.5 font-bold uppercase text-foreground"><Info size={14} /> Como os números são calculados</p>
        <ul className="list-disc space-y-1 pl-4">
          <li><strong>Dados próprios</strong>, só de anúncios diretos, medidos por este site.</li>
          <li><strong>Impressão</strong>: o anúncio ficou ao menos 50% visível na tela por 1 segundo.</li>
          <li><strong>Clique</strong>: clique no anúncio por quem o viu na última hora.</li>
          <li>Cada impressão e cada clique contam no máximo uma vez a cada 30 minutos por sessão anônima do navegador. Robôs conhecidos e administradores logados não contam.</li>
          <li><strong>CTR</strong> = cliques ÷ impressões.</li>
          <li>Os dias seguem o horário de Brasília. Não guardamos IP, nome ou e-mail de quem vê os anúncios.</li>
          <li><strong>Google AdSense</strong>: os números do AdSense não aparecem aqui. Consulte-os no painel do Google AdSense (adsense.google.com).</li>
        </ul>
      </section>
    </div>
  );
}
