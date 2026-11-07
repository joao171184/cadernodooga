import { ArrowDown, ArrowUp, Plus, Trash2, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TOQUE_OPTIONS, CLASSIFICACAO_OPTIONS } from "@/contexts/PontosContext";
import { type PointVersion, initialVersion } from "@/lib/pointVersions";
import { PONTO_LIMITS } from "@/lib/pontoValidation";

export function PointVersionsEditor({ versions, onChange }: { versions: PointVersion[]; onChange: (versions: PointVersion[]) => void }) {
  const update = (i: number, patch: Partial<PointVersion>) => onChange(versions.map((v, n) => n === i ? { ...v, ...patch } : v));
  const move = (i: number, direction: number) => {
    const next = [...versions]; const target = i + direction;
    if (target < 0 || target >= next.length) return;
    [next[i], next[target]] = [next[target], next[i]];
    onChange(next.map((v, n) => ({ ...v, ordem: n })));
  };
  const field = "w-full rounded-md border border-border bg-muted px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
  return <section className="space-y-4 border-t border-border pt-4" aria-label="Versões deste ponto">
    <h3 className="font-display font-bold">Versões deste ponto</h3>
    {versions.map((v, i) => <fieldset key={v.id ?? `new-${i}`} className="space-y-3 border-b border-border pb-4 min-w-0">
      <legend className="text-sm font-bold mb-2">Versão {i + 1}</legend>
      <div className="flex flex-wrap items-center gap-1">
        <Button variant="ghost" size="icon" type="button" disabled={i === 0} aria-label={`Mover versão ${i + 1} para cima`} title="Mover para cima" onClick={() => move(i, -1)}><ArrowUp /></Button>
        <Button variant="ghost" size="icon" type="button" disabled={i === versions.length - 1} aria-label={`Mover versão ${i + 1} para baixo`} title="Mover para baixo" onClick={() => move(i, 1)}><ArrowDown /></Button>
        <Button variant={v.is_principal ? "secondary" : "ghost"} size="sm" type="button" aria-pressed={v.is_principal} onClick={() => onChange(versions.map((item, n) => ({ ...item, is_principal: n === i ? !v.is_principal : false })))}><Star className={v.is_principal ? "fill-accent text-accent-strong" : ""} />Principal</Button>
        <Button variant="ghost" size="icon" type="button" disabled={versions.length === 1} className="ml-auto text-destructive" aria-label={`Excluir versão ${i + 1}`} title="Excluir versão" onClick={() => {
          if (window.confirm(`Excluir a versão ${i + 1}? A exclusão será aplicada ao salvar o ponto.`)) onChange(versions.filter((_, n) => n !== i).map((item, n) => ({ ...item, ordem: n })));
        }}><Trash2 /></Button>
      </div>
      <label className="block text-xs font-semibold">Título da versão (opcional)<input value={v.title} maxLength={300} className={field} onChange={e => update(i, { title: e.target.value })} /></label>
      <label className="block text-xs font-semibold">Status<select className={field} value={v.status} onChange={e => update(i, { status: e.target.value as PointVersion["status"] })}><option value="published">Publicada</option><option value="draft">Rascunho</option></select></label>
      <label className="block text-xs font-semibold">Letra completa<textarea rows={7} required maxLength={PONTO_LIMITS.letra} className={`${field} whitespace-pre-wrap uppercase leading-relaxed`} value={v.letra} onChange={e => update(i, { letra: e.target.value.toUpperCase() })} /></label>
      <label className="block text-xs font-semibold">Toque<select className={field} value={v.toque ?? ""} onChange={e => update(i, { toque: e.target.value ? e.target.value as PointVersion["toque"] : null })}><option value="">Não definido</option>{TOQUE_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}</select></label>
      <div className="flex flex-wrap gap-3">{CLASSIFICACAO_OPTIONS.map(c => <label key={c.value} className="flex items-center gap-2 text-xs"><input type="checkbox" checked={v.classificacoes.includes(c.value)} onChange={e => update(i, { classificacoes: e.target.checked ? [...v.classificacoes, c.value] : v.classificacoes.filter(x => x !== c.value) })} />{c.label}</label>)}</div>
      <label className="block text-xs font-semibold">Link do YouTube, Spotify ou TikTok (opcional)<input type="text" inputMode="url" maxLength={PONTO_LIMITS.audio} className={field} value={v.video_url} onChange={e => update(i, { video_url: e.target.value })} /></label>
      <label className="block text-xs font-semibold">Observações (opcional)<textarea rows={2} maxLength={10000} className={field} value={v.observacoes} onChange={e => update(i, { observacoes: e.target.value })} /></label>
    </fieldset>)}
    <Button type="button" variant="outline" onClick={() => onChange([...versions, { ...initialVersion({ letra: "", audio: "", toque: null, classificacoes: [] }), is_principal: false, status: "draft", ordem: versions.length }])}><Plus />Adicionar versão</Button>
  </section>;
}