import { useEffect, useState } from "react";
import { FileDown, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { brDate, buildReportPdf, downloadBlob } from "@/lib/pdfReport";
import { Button } from "@/components/ui/button";

const iso = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });

export function LoginReport() {
  const today = iso(new Date());
  const [from, setFrom] = useState(iso(new Date(Date.now() - 29 * 86_400_000)));
  const [to, setTo] = useState(today);
  const [mode, setMode] = useState<"logins" | "cadastros">("logins");
  const [refresh, setRefresh] = useState(0);
  const [rows, setRows] = useState<{ day: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(false);
      setRows([]);
      try {
        const args = { _from: from, _to: to };
        const result = mode === "logins"
          ? await supabase.rpc("get_login_stats", args)
          : await supabase.rpc("get_signup_stats", args);
        if (cancelled) return;
        if (result.error) throw result.error;
        setRows((result.data ?? []).map((r) => ({
          day: r.day,
          count: Number("logins" in r ? r.logins : r.signups),
        })).sort((a, b) => b.day.localeCompare(a.day)));
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [from, to, mode, refresh]);

  const total = rows.reduce((s, r) => s + r.count, 0);
  const max = Math.max(1, ...rows.map((r) => r.count));
  const isLogin = mode === "logins";
  const title = isLogin ? "RELATÓRIO DE LOGINS POR DIA" : "RELATÓRIO DE CADASTROS POR DIA";

  const exportPdf = () => {
    const blob = buildReportPdf({
      title,
      subtitle: `Período: ${brDate(from)} a ${brDate(to)}`,
      summary: [[isLogin ? "Total de logins" : "Total de cadastros", String(total)], [isLogin ? "Dias com acesso" : "Dias com cadastros", String(rows.length)],
        ["Média por dia", rows.length ? (total / rows.length).toFixed(1) : "0"]],
      sections: [{ title: isLogin ? "Logins por dia" : "Cadastros por dia", head: ["Data", isLogin ? "Pessoas que entraram" : "Contas criadas"], body: rows.map((r) => [brDate(r.day), r.count]) }],
    });
    downloadBlob(blob, `${mode}_${from}_a_${to}.pdf`);
  };

  const input = "mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm";
  return (
    <div className="space-y-3">
      <div className="flex gap-2" role="group" aria-label="Tipo de relatório">
        {(["logins", "cadastros"] as const).map((value) => (
          <Button key={value} type="button" variant={mode === value ? "default" : "outline"}
            aria-pressed={mode === value} onClick={() => setMode(value)}
            className={`h-auto rounded-full px-3.5 py-2 text-[11px] font-bold uppercase ${mode === value ? "shadow-sm" : "bg-card text-muted-foreground border-border hover:border-accent/30"}`}>
            {value === "logins" ? "Logins" : "Cadastros"}
          </Button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <label className="text-[11px] font-bold uppercase text-muted-foreground">De
          <input type="date" className={input} value={from} max={to} onChange={(e) => setFrom(e.target.value)} /></label>
        <label className="text-[11px] font-bold uppercase text-muted-foreground">Até
          <input type="date" className={input} value={to} min={from} max={today} onChange={(e) => setTo(e.target.value)} /></label>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-bold uppercase" aria-live="polite">{loading ? "Carregando..." : error ? "Total indisponível" : `Total: ${total} ${mode}`}</p>
        <div className="flex items-center gap-2">
        <Button type="button" variant="outline" size="icon" onClick={() => { setTo(iso(new Date())); setRefresh((r) => r + 1); }} disabled={loading}
          aria-label="Recarregar relatório" title="Recarregar"
          className="h-8 w-8 text-muted-foreground">
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
        </Button>
        <Button type="button" size="sm" onClick={exportPdf} disabled={loading || error}
          className="h-8 gap-1.5 text-xs font-bold uppercase">
          <FileDown size={14} /> Baixar PDF
        </Button>
        </div>
      </div>
      {error && <p className="text-xs text-destructive">Não foi possível carregar o relatório.</p>}
      <div className="max-h-72 overflow-auto rounded-md border border-border">
        {rows.length === 0 && !loading && !error ? <p className="p-4 text-center text-xs text-muted-foreground">Sem {mode} no período.</p> :
          rows.map((r) => (
            <div key={r.day} className="flex items-center gap-2 border-b border-border px-3 py-1.5 text-xs last:border-0">
              <span className="w-20 shrink-0">{brDate(r.day)}</span>
              <div className="h-2 flex-1 rounded bg-muted"><div className="h-2 rounded bg-primary" style={{ width: `${(r.count / max) * 100}%` }} /></div>
              <span className="w-10 text-right font-bold">{r.count}</span>
            </div>
          ))}
      </div>
    </div>
  );
}
