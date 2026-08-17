import { X, Heart, Share2, Drum, Mic2 } from "lucide-react";
import { type Ponto, TOQUE_OPTIONS, CLASSIFICACAO_OPTIONS } from "@/contexts/PontosContext";
import { getEmbedInfo } from "@/lib/embed";
import { TikTokPlayer } from "@/components/TikTokPlayer";
import { useEffect } from "react";

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
    <div className="fixed inset-0 z-[100] bg-background overflow-y-auto animate-in fade-in duration-200">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-md border-b border-border">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-2">
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

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-10 pb-32">
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
          <pre className="text-xl sm:text-2xl md:text-3xl text-foreground whitespace-pre-wrap font-[inherit] leading-relaxed pl-6 py-2 uppercase font-medium tracking-wide">
            {ponto.letra}
          </pre>
        </div>

        {embed.kind !== "none" && (
          <div className="mt-10">
            {embed.kind === "youtube" && (
              <div className="aspect-video rounded-2xl overflow-hidden bg-black">
                <iframe src={embed.src} title={ponto.nome} className="w-full h-full" allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen />
              </div>
            )}
            {embed.kind === "spotify" && (
              <iframe src={embed.src} title={ponto.nome} className="w-full rounded-2xl" height={232} allow="autoplay; clipboard-write; encrypted-media; picture-in-picture" />
            )}
            {embed.kind === "tiktok" && (
              embed.src ? (
                <div
                  className="relative w-full mx-auto rounded-2xl overflow-hidden bg-black"
                  style={{ maxWidth: 325, height: "min(75vh, 740px)" }}
                >
                  <iframe
                    src={embed.src}
                    title={ponto.nome}
                    className="w-full h-full border-0"
                    allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                    allowFullScreen
                    scrolling="no"
                  />
                </div>
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
    </div>
  );
}
