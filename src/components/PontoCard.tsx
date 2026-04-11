import { Play, Pause, Heart, Pencil, Trash2 } from "lucide-react";
import type { Ponto } from "@/data/pontos";

interface PontoCardProps {
  ponto: Ponto;
  isPlaying: boolean;
  isFavorite: boolean;
  onTogglePlay: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onEdit?: (ponto: Ponto) => void;
  onDelete?: (id: string) => void;
}

const PontoCard = ({ ponto, isPlaying, isFavorite, onTogglePlay, onToggleFavorite, onEdit, onDelete }: PontoCardProps) => {
  return (
    <div className={`bg-card rounded-2xl border border-border shadow-sm overflow-hidden transition-all duration-200 ${isPlaying ? "ring-2 ring-accent/40 shadow-lg" : "hover:shadow-md"}`}>
      <div className="p-4 sm:p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-display text-base sm:text-lg font-bold text-card-foreground leading-tight uppercase">
              {ponto.nome}
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              {ponto.categoria}{ponto.subcategoria ? ` › ${ponto.subcategoria}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-1">
            {onEdit && (
              <button
                onClick={() => onEdit(ponto)}
                className="p-2 rounded-lg hover:bg-muted transition-all active:scale-90"
                aria-label="Editar ponto"
              >
                <Pencil size={16} className="text-muted-foreground" />
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => onDelete(ponto.id)}
                className="p-2 rounded-lg hover:bg-destructive/10 transition-all active:scale-90"
                aria-label="Excluir ponto"
              >
                <Trash2 size={16} className="text-destructive/70" />
              </button>
            )}
            <button
              onClick={() => onToggleFavorite(ponto.id)}
              className={`p-2 rounded-lg transition-all active:scale-90 ${
                isFavorite ? "bg-accent/15" : "hover:bg-muted"
              }`}
              aria-label={isFavorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
            >
              <Heart
                size={18}
                className={`transition-colors ${isFavorite ? "fill-accent text-accent" : "text-muted-foreground"}`}
              />
            </button>
          </div>
        </div>

        {/* Letra */}
        <div className="relative mb-4">
          <div className="absolute left-0 top-0 bottom-0 w-1 rounded-full bg-accent/30" />
          <pre className="text-sm sm:text-base text-card-foreground/80 whitespace-pre-wrap font-[inherit] leading-relaxed pl-4 py-1 uppercase">
            {ponto.letra}
          </pre>
        </div>

        {/* Play button */}
        <button
          onClick={() => onTogglePlay(ponto.id)}
          className={`w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl text-sm font-bold transition-all active:scale-[0.98] uppercase ${
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
