import { X, Heart, Share2, Drum, Mic2, Copy, Sun, SunDim, ChevronsDown, Pause } from "lucide-react";
import { toast } from "sonner";
import { NotasWidget } from "@/components/NotasWidget";
import { type Ponto, TOQUE_OPTIONS, CLASSIFICACAO_OPTIONS } from "@/contexts/PontosContext";
import { getEmbedInfo } from "@/lib/embed";
import { TikTokPlayer } from "@/components/TikTokPlayer";
import { useEffect, useRef, useState } from "react";

interface Props {
  ponto: Ponto;
  isFavorite: boolean;
  onClose: () => void;
  onToggleFavorite: (id: string) => void;
  canFavorite: boolean;
}

export function PontoFullscreen({ ponto, isFavorite, onClose, onToggleFavorite, canFavorite }: Props) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(false);
  const [wake, setWake] = useState(false);
  const wakeRef = useRef<any>(null);
  const wakeSupported = typeof navigator !== "undefined" && "wakeLock" in navigator;

  useEffect(() => {
    if (!autoScroll) return;
    let raf = 0, last = 0, acc = 0;
    let speed = 1;
    try { speed = JSON.parse(localStorage.getItem("auto-scroll-prefs") || "{}").speed || 1; } catch {}
    const tick = (ts: number) => {
      const el = scrollRef.current;
      if (!el) return;
      if (!last) last = ts;
      acc += (30 * speed * (ts - last)) / 1000; last = ts;
      if (acc >= 1) {
        const px = Math.floor(acc); acc -= px;
        el.scrollTop += px;
        if (el.scrollTop + el.clientHeight >= el.scrollHeight - 1) { setAutoScroll(false); return; }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [autoScroll]);

  useEffect(() => {
    if (!wake) return;
    let cancelled = false;
    (navigator as any).wakeLock?.request("screen").then((l: any) => {
      if (cancelled) l.release(); else wakeRef.current = l;
    }).catch(() => { setWake(false); toast.error("Não foi possível manter a tela ligada"); });
    return () => { cancelled = true; wakeRef.current?.release?.(); wakeRef.current = null; };
  }, [wake]);

  const handleCopy = async () => {
    try { await navigator.clipboard.writeText(ponto.letra); toast.success("Letra copiada!", { duration: 2000 }); }
    catch { toast.error("Não foi possível copiar a letra"); }
  };

  const subs = ponto.subcategorias;
  const toqueLabel = TOQUE_OPTIONS.find((t) => t.value === ponto.toque)?.label;
  const classifLabels = ponto.classificacoes
    .map((c) => CLASSIFICACAO_OPTIONS.find((o) => o.value === c))
    .filter(Boolean) as { value: string; label: string }[];
  const embed = getEmbedInfo(ponto.audio);

  const handleShare = async () => {
    const url = `${window.location.origin}/ponto/${ponto.slug}`;
    try {
      if (navigator.share) await navigator.share({ title: ponto.nome, url, text: url });
      else window.open(`https://wa.me/?text=${encodeURIComponent(url)}`, "_blank", "noopener,noreferrer");
    } catch { /* cancelado */ }
  };

  return (
    <div
      ref={scrollRef}
      role="dialog"
      aria-modal="true"
      aria-label={`Leitura: ${ponto.nome}`}
      className="fixed inset-0 z-[100] bg-background overflow-y-auto overflow-x-hidden overscroll-contain animate-in fade-in duration-200"
      style={{ paddingLeft: "env(safe-area-inset-left)", paddingRight: "env(safe-area-inset-right)" }}
    >
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-md border-b border-border" style={{ paddingTop: "env(safe-area-inset-top)" }}>
        <div className="max-w-3xl mx-auto px-3 sm:px-4 py-2 flex items-center justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-muted-foreground font-bold uppercase truncate">
              {ponto.categoria}{subs.length ? ` › ${subs.join(" • ")}` : ""}
            </p>
            <h2 className="font-display text-base sm:text-lg font-bold text-foreground uppercase truncate">
              {ponto.nome}
            </h2>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {canFavorite && (
              <button
                onClick={() => onToggleFavorite(ponto.id)}
                className={`p-2 rounded-lg transition-all active:scale-90 ${isFavorite ? "bg-accent/15" : "hover:bg-muted"}`}
                aria-label="Favoritar"
              >
                <Heart size={20} className={isFavorite ? "fill-accent text-accent" : "text-muted-foreground"} />
              </button>
            )}
            <button
              onClick={handleCopy}
              className="p-2 rounded-lg hover:bg-muted transition-all active:scale-90"
              aria-label="Copiar letra"
              title="Copiar letra"
            >
              <Copy size={20} className="text-muted-foreground" />
            </button>
            {wakeSupported && (
              <button
                onClick={() => setWake((w) => !w)}
                className={`p-2 rounded-lg transition-all active:scale-90 ${wake ? "bg-accent/15" : "hover:bg-muted"}`}
                aria-label={wake ? "Desligar tela sempre ligada" : "Manter tela ligada"}
                aria-pressed={wake}
                title={wake ? "Tela sempre ligada: ativa" : "Manter tela ligada"}
              >
                {wake ? <Sun size={20} className="text-accent" /> : <SunDim size={20} className="text-muted-foreground" />}
              </button>
            )}
            <button
              onClick={handleShare}
              className="p-2 rounded-lg hover:bg-muted transition-all active:scale-90"
              aria-label="Compartilhar"
            >
              <Share2 size={20} className="text-muted-foreground" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-muted transition-all active:scale-90"
              aria-label="Fechar"
            >
              <X size={22} />
            </button>
          </div>
        </div>
      </div>

      <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-10 pb-40">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-6">
          {toqueLabel && (
            <div className="flex items-center gap-1.5 text-sm">
              <Drum size={14} className="text-accent" />
              <span className="text-muted-foreground uppercase font-semibold text-xs">Toque:</span>
              <span className="text-foreground font-medium">{toqueLabel}</span>
            </div>
          )}
          {ponto.puxador && (
            <div className="flex items-center gap-1.5 text-sm">
              <Mic2 size={14} className="text-accent" />
              <span className="text-muted-foreground uppercase font-semibold text-xs">Puxa:</span>
              <span className="text-foreground font-medium">{ponto.puxador}</span>
            </div>
          )}
          {classifLabels.map((c) => (
            <span
              key={c.value}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-accent/15 text-accent border border-accent/30"
            >
              {c.label}
            </span>
          ))}
        </div>

        <div className="relative">
          <div className="absolute left-0 top-0 bottom-0 w-1.5 rounded-full bg-accent/40" />
          <pre className="text-xl sm:text-2xl md:text-3xl text-foreground whitespace-pre-wrap break-words font-[inherit] leading-relaxed pl-6 py-2 uppercase font-medium tracking-wide">
            {ponto.letra}
          </pre>
        </div>

        {embed.kind !== "none" && (
          <div className="mt-10">
            {embed.kind === "youtube" && (
              <div className="aspect-video rounded-2xl overflow-hidden bg-black">
                <iframe src={embed.src} title={ponto.nome} className="w-full h-full" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" />
              </div>
            )}
            {embed.kind === "spotify" && (
              <iframe src={embed.src} title={ponto.nome} className="w-full rounded-2xl" height={232} allow="autoplay; clipboard-write; encrypted-media; picture-in-picture" />
            )}
            {embed.kind === "tiktok" && (
              embed.src ? (
                <TikTokPlayer src={embed.src} title={ponto.nome} externalUrl={embed.externalUrl} />
              ) : (
                <a
                  href={embed.externalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl bg-foreground text-background text-sm font-bold uppercase"
                >
                  Abrir no TikTok
                </a>
              )
            )}
            {embed.kind === "audio" && (
              <audio src={embed.src} controls className="w-full" />
            )}
          </div>
        )}
      </div>
      <div
        className="fixed right-3 sm:right-4 z-[110] flex flex-col items-end gap-2"
        style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 20px)" }}
      >
        <NotasWidget />
        <button
          onClick={() => setAutoScroll((a) => !a)}
          aria-label={autoScroll ? "Pausar rolagem automática" : "Iniciar rolagem automática"}
          aria-pressed={autoScroll}
          className={`w-12 h-12 rounded-full shadow-2xl border-2 flex items-center justify-center transition-all active:scale-95 ${
            autoScroll ? "bg-accent text-accent-foreground border-accent" : "bg-card text-foreground border-border hover:border-accent/50"
          }`}
        >
          {autoScroll ? <Pause size={18} /> : <ChevronsDown size={20} />}
        </button>
      </div>
    </div>
  );
}
