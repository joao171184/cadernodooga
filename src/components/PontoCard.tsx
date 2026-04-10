import { Play, Pause, Star, Heart } from "lucide-react";
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

const categoryEmoji: Record<string, string> = {
  Exu: "🔱",
  Ogum: "⚔️",
  Oxóssi: "🏹",
  Xangô: "⚡",
  Iemanjá: "🌊",
  Oxum: "🪞",
  "Preto-Velho": "🕯️",
};

const PontoCard = ({ ponto, isPlaying, isFavorite, onTogglePlay, onToggleFavorite }: PontoCardProps) => {
  const categoryColor = categoryColorMap[ponto.categoria] || "bg-primary";
  const emoji = categoryEmoji[ponto.categoria] || "🎵";

  return (
    <div className={`bg-card rounded-2xl border border-border shadow-sm overflow-hidden transition-all duration-200 ${isPlaying ? "ring-2 ring-accent/40 shadow-lg" : "hover:shadow-md"}`}>
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-display text-lg font-bold text-card-foreground leading-tight">
              {ponto.nome}
            </h3>
            <div className="flex items-center gap-2 mt-2">
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold text-primary-foreground ${categoryColor}`}
              >
                <span>{emoji}</span>
                {ponto.categoria}
              </span>
            </div>
          </div>
          <button
            onClick={() => onToggleFavorite(ponto.id)}
            className={`flex-shrink-0 p-2.5 rounded-xl transition-all active:scale-90 ${
              isFavorite ? "bg-accent/15" : "hover:bg-muted"
            }`}
            aria-label={isFavorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
          >
            <Heart
              size={22}
              className={`transition-colors ${isFavorite ? "fill-accent text-accent" : "text-muted-foreground"}`}
            />
          </button>
        </div>

        {/* Letra */}
        <div className="relative mb-4">
          <div className="absolute left-0 top-0 bottom-0 w-1 rounded-full bg-accent/30" />
          <pre className="text-sm text-card-foreground/75 whitespace-pre-wrap font-[inherit] leading-relaxed pl-4 py-1">
            {ponto.letra}
          </pre>
        </div>

        {/* Play button */}
        <button
          onClick={() => onTogglePlay(ponto.id)}
          className={`w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl text-sm font-bold transition-all active:scale-[0.98] ${
            isPlaying
              ? "bg-accent/15 text-accent-foreground border-2 border-accent"
              : "bg-primary text-primary-foreground shadow-sm hover:shadow-md"
          }`}
        >
          {isPlaying ? (
            <>
              <Pause size={20} />
              Pausar
            </>
          ) : (
            <>
              <Play size={20} className="ml-0.5" />
              Ouvir Ponto
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default PontoCard;
