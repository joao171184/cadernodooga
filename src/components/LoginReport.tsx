import { useCallback, useEffect, useState } from "react";
import { FileDown, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { brDate, buildReportPdf, downloadBlob } from "@/lib/pdfReport";

const iso = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });

export function LoginReport() {
  const today = iso(new Date());
  const [from, setFrom] = useState(iso(new Date(Date.now() - 29 * 86_400_000)));
  const [to, setTo] = useState(today);
  const [rows, setRows] = useState<{ day: string; logins: number }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("get_login_stats", { _from: from, _to: to });
    setError(!!error);
    setRows((data ?? []).map((r) => ({ day: r.day, logins: Number(r.logins) })).sort((a, b) => b.day.localeCompare(a.day)));
    setLoading(false);
  }, [from, to]);
  useEffect(() => { void load(); }, [load]);

  const total = rows.reduce((s, r) => s + r.logins, 0);
  const max = Math.max(1, ...rows.map((r) => r.logins));

  const exportPdf = () => {
    const blob = buildReportPdf({
      title: "RELATÓRIO DE LOGINS POR DIA",
      subtitle: `Período: ${brDate(from)} a ${brDate(to)}`,
      summary: [["Total de logins", String(total)], ["Dias com acesso", String(rows.length)],
        ["Média por dia", rows.length ? (total / rows.length).toFixed(1) : "0"]],
      sections: [{ title: "Logins por dia", head: ["Data", "Pessoas que entraram"], body: rows.map((r) => [brDate(r.day), r.logins]) }],
    });
    downloadBlob(blob, `logins_${from}_a_${to}.pdf`);
  };

  const input = "mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm";
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <label className="text-[11px] font-bold uppercase text-muted-foreground">De
          <input type="date" className={input} value={from} max={to} onChange={(e) => setFrom(e.target.value)} /></label>
        <label className="text-[11px] font-bold uppercase text-muted-foreground">Até
          <input type="date" className={input} value={to} min={from} max={today} onChange={(e) => setTo(e.target.value)} /></label>
      </div>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-bold uppercase">Total: {total} logins {loading && <Loader2 size={14} className="inline animate-spin" />}</p>
        <button type="button" onClick={exportPdf} disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-bold uppercase text-primary-foreground disabled:opacity-50">
          <FileDown size={14} /> Baixar PDF
        </button>
      </div>
      {error && <p className="text-xs text-destructive">Não foi possível carregar o relatório.</p>}
      <div className="max-h-72 overflow-auto rounded-md border border-border">
        {rows.length === 0 && !loading ? <p className="p-4 text-center text-xs text-muted-foreground">Sem logins no período.</p> :
          rows.map((r) => (
            <div key={r.day} className="flex items-center gap-2 border-b border-border px-3 py-1.5 text-xs last:border-0">
              <span className="w-20 shrink-0">{brDate(r.day)}</span>
              <div className="h-2 flex-1 rounded bg-muted"><div className="h-2 rounded bg-primary" style={{ width: `${(r.logins / max) * 100}%` }} /></div>
              <span className="w-10 text-right font-bold">{r.logins}</span>
            </div>
          ))}
      </div>
    </div>
  );
}
