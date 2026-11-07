import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { initialVersion, publishedVersions, type PointVersion } from "@/lib/pointVersions";
import type { Ponto } from "@/contexts/PontosContext";

export function usePointVersion<T extends Pick<Ponto, "letra" | "audio" | "toque" | "classificacoes"> & { versions?: PointVersion[] }>(point: T) {
  const versions = publishedVersions(point.versions ?? []);
  const [selected, setSelected] = useState(0);
  const index = selected < versions.length ? selected : 0;
  const version = versions[index] ?? initialVersion(point);
  const change = (next: number) => setSelected((next + versions.length) % versions.length);
  const [start, setStart] = useState<{ x: number; y: number } | null>(null);
  const swipe = versions.length > 1 ? {
    onTouchStart: (e: React.TouchEvent) => { const t = e.touches[0]; setStart({ x: t.clientX, y: t.clientY }); },
    onTouchEnd: (e: React.TouchEvent) => {
      const t = e.changedTouches[0];
      if (start && Math.abs(t.clientX - start.x) > 50 && Math.abs(t.clientX - start.x) > Math.abs(t.clientY - start.y)) change(index + (t.clientX < start.x ? 1 : -1));
      setStart(null);
    },
  } : {};
  return { point: { ...point, letra: version.letra, audio: version.video_url, toque: version.toque, classificacoes: version.classificacoes }, version, versions, index, change, swipe };
}

export function PointVersionNavigation({ versions, index, change }: { versions: PointVersion[]; index: number; change: (index: number) => void }) {
  if (versions.length < 2) return null;
  return <nav aria-label="Versões deste ponto" className="mt-3 flex flex-wrap items-center justify-end gap-1" onClick={e => e.stopPropagation()} onKeyDown={e => {
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") { e.preventDefault(); change(index + (e.key === "ArrowRight" ? 1 : -1)); }
    if (e.key === "Home") { e.preventDefault(); change(0); }
    if (e.key === "End") { e.preventDefault(); change(versions.length - 1); }
  }}>
    <span className="sr-only" aria-live="polite">Versão {index + 1} de {versions.length}</span>
    <Button type="button" size="icon" variant="ghost" aria-label="Versão anterior" title="Versão anterior" onClick={() => change(index - 1)}><ChevronLeft /></Button>
    {versions.map((v, i) => <Button key={v.id ?? i} type="button" size="icon" variant="ghost" className="h-9 w-8" aria-label={`Abrir versão ${i + 1}${v.title ? `: ${v.title}` : ""}`} aria-current={i === index ? "true" : undefined} onClick={() => change(i)}>
      <span className={`rounded-full border border-accent-strong ${i === index ? "h-3 w-3 bg-accent-strong" : "h-2 w-2 bg-transparent"}`} />
    </Button>)}
    <Button type="button" size="icon" variant="ghost" aria-label="Próxima versão" title="Próxima versão" onClick={() => change(index + 1)}><ChevronRight /></Button>
  </nav>;
}