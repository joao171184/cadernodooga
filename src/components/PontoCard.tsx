import { Play, Pause, Star } from "lucide-react";
import type { Ponto } from "@/data/pontos";

interface PontoCardProps {
  ponto: Ponto;
  isPlaying: boolean;
  isFavorite: boolean;
  onTogglePlay: (id: string) => void;
  onToggleFavorite: (id: string) => void;
}

const categoryColorMap: Record<string, string> = {
  Exu: "bg-[hsl(var(--category-exu))]",
  Ogum: "bg-[hsl(var(--category-ogum))]",
  Oxóssi: "bg-[hsl(var(--category-oxossi))]",
  Xangô: "bg-[hsl(var(--category-xango))]",
  Iemanjá: "bg-[hsl(var(--category-iemanja))]",
  Oxum: "bg-[hsl(var(--category-oxum))]",
  "Preto-Velho": "bg-[hsl(var(--category-preto-velho))]",
};

const PontoCard = ({ ponto, isPlaying, isFavorite, onTogglePlay, onToggleFavorite }: PontoCardProps) => {
  const categoryColor = categoryColorMap[ponto.categoria] || "bg-primary";

  return (
    <div className="bg-card rounded-lg border border-border shadow-sm overflow-hidden">
      <div className="p-4 sm:p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-card-foreground leading-tight">{ponto.nome}</h3>
            <span
              className={`inline-block mt-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold text-primary-foreground ${categoryColor}`}
            >
              {ponto.categoria}
            </span>
          </div>
          <button
            onClick={() => onToggleFavorite(ponto.id)}
            className="flex-shrink-0 p-2 -m-1 rounded-full transition-colors active:scale-95"
            aria-label={isFavorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
          >
            <Star
              size={24}
              className={isFavorite ? "fill-accent text-accent" : "text-muted-foreground"}
            />
          </button>
        </div>

        {/* Letra */}
        <pre className="text-sm text-card-foreground/80 whitespace-pre-wrap font-sans leading-relaxed mb-4 bg-muted/50 rounded-md p-3">
          {ponto.letra}
        </pre>

        {/* Play button */}
        <button
          onClick={() => onTogglePlay(ponto.id)}
          className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-lg text-base font-semibold transition-all active:scale-[0.98] ${
            isPlaying
              ? "bg-primary/10 text-primary border-2 border-primary"
              : "bg-primary text-primary-foreground"
          }`}
        >
          {isPlaying ? <Pause size={22} /> : <Play size={22} />}
          {isPlaying ? "Pausar" : "Ouvir Ponto"}
        </button>
      </div>
    </div>
  );
};

export default PontoCard;
