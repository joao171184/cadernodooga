import { Heart, Pencil, Trash2, Mic2, ArrowUp, ArrowDown, Volume2, Pause, Drum } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { getEmbedInfo, type EmbedKind } from "@/lib/embed";
import { type Ponto, TOQUE_OPTIONS } from "@/contexts/PontosContext";
import { YoutubeGlyph, SpotifyGlyph } from "@/components/MediaIcons";

interface PontoCardProps {
  ponto: Ponto;
  isPlaying: boolean;
  isFavorite: boolean;
  onTogglePlay: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onEdit?: (ponto: Ponto) => void;
  onDelete?: (id: string) => void;
  onMoveUp?: (id: string) => void;
  onMoveDown?: (id: string) => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
}

const PontoCard = ({ ponto, isPlaying, isFavorite, onTogglePlay, onToggleFavorite, onEdit, onDelete, onMoveUp, onMoveDown, canMoveUp, canMoveDown }: PontoCardProps) => {
  const { isAdmin } = useAuth();
  const embed = getEmbedInfo(ponto.audio);
  const hasMedia = embed.kind !== "none";
  const subs = ponto.subcategorias;
  const toqueLabel = TOQUE_OPTIONS.find((t) => t.value === ponto.toque)?.label;

  return (
    <div className={`bg-card rounded-2xl border border-border shadow-sm overflow-hidden transition-all duration-200 ${isPlaying ? "ring-2 ring-accent/40 shadow-lg" : "hover:shadow-md"}`}>
      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-display text-base sm:text-lg font-bold text-card-foreground leading-tight uppercase">
              {ponto.nome}
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              {ponto.categoria}{subs.length > 0 ? ` › ${subs.join(" • ")}` : ""}
            </p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2">
              {toqueLabel && (
                <div className="flex items-center gap-1.5 text-xs">
                  <Drum size={12} className="text-accent shrink-0" />
                  <span className="text-muted-foreground uppercase tracking-wide font-semibold">Toque:</span>
                  <span className="text-card-foreground font-medium">{toqueLabel}</span>
                </div>
              )}
              {ponto.puxador && (
                <div className="flex items-center gap-1.5 text-xs">
                  <Mic2 size={12} className="text-accent shrink-0" />
                  <span className="text-muted-foreground uppercase tracking-wide font-semibold">Puxa:</span>
                  <span className="text-card-foreground font-medium truncate">{ponto.puxador}</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            {isAdmin && onMoveUp && (
              <button
                onClick={() => onMoveUp(ponto.id)}
                disabled={!canMoveUp}
                className="p-2 rounded-lg hover:bg-muted transition-all active:scale-90 disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label="Mover para cima"
              >
                <ArrowUp size={16} className="text-muted-foreground" />
              </button>
            )}
            {isAdmin && onMoveDown && (
              <button
                onClick={() => onMoveDown(ponto.id)}
                disabled={!canMoveDown}
                className="p-2 rounded-lg hover:bg-muted transition-all active:scale-90 disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label="Mover para baixo"
              >
                <ArrowDown size={16} className="text-muted-foreground" />
              </button>
            )}
            {isAdmin && onEdit && (
              <button
                onClick={() => onEdit(ponto)}
                className="p-2 rounded-lg hover:bg-muted transition-all active:scale-90"
                aria-label="Editar ponto"
              >
                <Pencil size={16} className="text-muted-foreground" />
              </button>
            )}
            {isAdmin && onDelete && (
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
            {hasMedia && (
              <MediaIconButton
                kind={embed.kind}
                isPlaying={isPlaying}
                onClick={() => onTogglePlay(ponto.id)}
              />
            )}
          </div>
        </div>

        <div className="relative">
          <div className="absolute left-0 top-0 bottom-0 w-1 rounded-full bg-accent/30" />
          <pre className="text-sm sm:text-base text-card-foreground/80 whitespace-pre-wrap font-[inherit] leading-relaxed pl-4 py-1 uppercase">
            {ponto.letra}
          </pre>
        </div>
      </div>
    </div>
  );
};

function MediaIconButton({
  kind, isPlaying, onClick,
}: { kind: EmbedKind; isPlaying: boolean; onClick: () => void }) {
  const labelMap: Record<EmbedKind, string> = {
    youtube: "YouTube",
    spotify: "Spotify",
    audio: "Áudio",
    none: "",
  };
  const label = labelMap[kind];

  return (
    <button
      onClick={onClick}
      aria-label={isPlaying ? `Pausar (${label})` : `Ouvir no ${label}`}
      title={isPlaying ? "Pausar" : `Ouvir no ${label}`}
      className={`p-1.5 rounded-lg transition-all active:scale-90 hover:bg-muted ${
        isPlaying ? "ring-2 ring-accent/60 bg-accent/10" : ""
      }`}
    >
      {isPlaying ? (
        <div className="w-5 h-5 rounded-md bg-accent text-accent-foreground flex items-center justify-center">
          <Pause size={12} />
        </div>
      ) : kind === "youtube" ? (
        <YoutubeGlyph size={20} />
      ) : kind === "spotify" ? (
        <SpotifyGlyph size={20} />
      ) : (
        <div className="w-5 h-5 rounded-md bg-primary text-primary-foreground flex items-center justify-center">
          <Volume2 size={12} />
        </div>
      )}
    </button>
  );
}

export default PontoCard;
