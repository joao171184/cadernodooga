import { Play, Pause, Heart, Pencil, Trash2, Mic2, ArrowUp, ArrowDown, Youtube, Music2, Volume2 } from "lucide-react";
import type { Ponto } from "@/data/pontos";
import { useAuth } from "@/contexts/AuthContext";
import { getEmbedInfo, type EmbedKind } from "@/lib/embed";

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
  const subs = ponto.subcategorias && ponto.subcategorias.length > 0
    ? ponto.subcategorias
    : ponto.subcategoria ? [ponto.subcategoria] : [];

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
            {ponto.puxador && (
              <div className="flex items-center gap-1.5 mt-2 text-xs">
                <Mic2 size={12} className="text-accent shrink-0" />
                <span className="text-muted-foreground uppercase tracking-wide font-semibold">Puxa:</span>
                <span className="text-card-foreground font-medium truncate">{ponto.puxador}</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-1">
            {isAdmin && onMoveUp && (
              <button
                onClick={() => onMoveUp(ponto.id)}
                disabled={!canMoveUp}
                className="p-2 rounded-lg hover:bg-muted transition-all active:scale-90 disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label="Mover para cima"
                title="Mover para cima"
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
                title="Mover para baixo"
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
          </div>
        </div>

        <div className="relative mb-4">
          <div className="absolute left-0 top-0 bottom-0 w-1 rounded-full bg-accent/30" />
          <pre className="text-sm sm:text-base text-card-foreground/80 whitespace-pre-wrap font-[inherit] leading-relaxed pl-4 py-1 uppercase">
            {ponto.letra}
          </pre>
        </div>

        {hasMedia && (
          <div className="flex justify-center">
            <MediaButton
              kind={embed.kind}
              isPlaying={isPlaying}
              onClick={() => onTogglePlay(ponto.id)}
            />
          </div>
        )}
      </div>
    </div>
  );
};

function MediaButton({
  kind, isPlaying, onClick,
}: { kind: EmbedKind; isPlaying: boolean; onClick: () => void }) {
  const cfg = getMediaCfg(kind);
  return (
    <button
      onClick={onClick}
      aria-label={isPlaying ? `Pausar (${cfg.label})` : `Ouvir no ${cfg.label}`}
      title={isPlaying ? "Pausar" : `Ouvir no ${cfg.label}`}
      className={`relative w-14 h-14 rounded-full flex items-center justify-center shadow-md transition-all active:scale-90 hover:scale-105 ${cfg.bg} ${cfg.text} ${
        isPlaying ? "ring-4 ring-offset-2 ring-offset-card animate-pulse " + cfg.ring : ""
      }`}
    >
      {isPlaying ? <Pause size={22} /> : <cfg.Icon size={26} className={cfg.iconExtra} />}
    </button>
  );
}

function getMediaCfg(kind: EmbedKind) {
  switch (kind) {
    case "youtube":
      return {
        label: "YouTube",
        Icon: Youtube,
        bg: "bg-[#FF0000] hover:bg-[#e60000]",
        text: "text-white",
        ring: "ring-[#FF0000]/50",
        iconExtra: "",
      };
    case "spotify":
      return {
        label: "Spotify",
        Icon: Music2,
        bg: "bg-[#1DB954] hover:bg-[#1aa34a]",
        text: "text-white",
        ring: "ring-[#1DB954]/50",
        iconExtra: "fill-current",
      };
    default:
      return {
        label: "Áudio",
        Icon: Volume2,
        bg: "bg-primary hover:bg-primary/90",
        text: "text-primary-foreground",
        ring: "ring-primary/50",
        iconExtra: "",
      };
  }
}

export default PontoCard;
