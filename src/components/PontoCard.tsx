import { Heart, Pencil, Trash2, Mic2, ArrowUp, ArrowDown, Volume2, Pause, Drum, Share2, Copy } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { getEmbedInfo, type EmbedKind } from "@/lib/embed";
import { type Ponto, TOQUE_OPTIONS, CLASSIFICACAO_OPTIONS } from "@/contexts/PontosContext";
import { YoutubeGlyph, SpotifyGlyph, TikTokGlyph } from "@/components/MediaIcons";

interface PontoCardProps {
  ponto: Ponto;
  isPlaying: boolean;
  isFavorite: boolean;
  visitorMode?: boolean;
  showFavorite?: boolean;
  highlight?: string;
  categoryColor?: string | null;
  index?: number;
  onTogglePlay: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onEdit?: (ponto: Ponto) => void;
  onDelete?: (id: string) => void;
  onMoveUp?: (id: string) => void;
  onMoveDown?: (id: string) => void;
  onDragStart?: (id: string) => void;
  onDragOver?: (id: string) => void;
  onDrop?: () => void;
  onOpenFullscreen?: (ponto: Ponto) => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
}


const norm = (s: string) => (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

function renderHighlighted(text: string, query?: string) {
  const q = (query || "").trim();
  if (!q) return text;
  const nText = norm(text);
  const nQuery = norm(q);
  if (!nQuery || !nText.includes(nQuery)) return text;
  const parts: React.ReactNode[] = [];
  let i = 0;
  let idx = nText.indexOf(nQuery);
  let k = 0;
  while (idx !== -1) {
    if (idx > i) parts.push(text.slice(i, idx));
    parts.push(
      <mark key={k++} className="bg-accent/40 text-accent-foreground font-bold rounded px-0.5">
        {text.slice(idx, idx + nQuery.length)}
      </mark>
    );
    i = idx + nQuery.length;
    idx = nText.indexOf(nQuery, i);
  }
  if (i < text.length) parts.push(text.slice(i));
  return parts;
}

const PontoCard = ({ ponto, isPlaying, isFavorite, visitorMode = false, showFavorite = false, highlight, categoryColor, index = 0, onTogglePlay, onToggleFavorite, onEdit, onDelete, onMoveUp, onMoveDown, onDragStart, onDragOver, onDrop, onOpenFullscreen, canMoveUp, canMoveDown }: PontoCardProps) => {
  const handleShare = async () => {
    const url = `${window.location.origin}/ponto/${ponto.slug}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: ponto.nome, url, text: url });
      } else {
        window.open(`https://wa.me/?text=${encodeURIComponent(url)}`, "_blank", "noopener,noreferrer");
      }
    } catch {
      // usuário cancelou
    }
  };

  const handleCopyLetra = async () => {
    try {
      await navigator.clipboard.writeText(ponto.letra);
      toast.success("Letra copiada!");
    } catch {
      toast.error("Não foi possível copiar a letra.");
    }
  };

  const { isAdmin, can } = useAuth();
  const embed = getEmbedInfo(ponto.audio);
  const hasMedia = embed.kind !== "none";
  const subs = ponto.subcategorias;
  const toqueLabel = TOQUE_OPTIONS.find((t) => t.value === ponto.toque)?.label;
  const classifLabels = ponto.classificacoes
    .map((c) => CLASSIFICACAO_OPTIONS.find((o) => o.value === c))
    .filter(Boolean) as { value: string; label: string }[];

  const canEdit = !!onEdit && !visitorMode && (isAdmin || can("edit_pontos"));
  const canDelete = !!onDelete && !visitorMode && (isAdmin || can("delete_pontos"));
  const canFavorite = !visitorMode && (isAdmin || can("favorite"));
  const canPlay = true; // Player liberado para todos, inclusive visitantes

  const color = categoryColor || null;
  const cardStyle: React.CSSProperties = color
    ? {
        borderColor: `${color}55`,
        boxShadow: isPlaying
          ? `0 0 0 2px ${color}66, 0 10px 30px -10px ${color}80`
          : `0 4px 20px -6px ${color}55`,
      }
    : {};
  const accentBarStyle: React.CSSProperties = color ? { backgroundColor: `${color}80` } : {};


  return (
    <div
      draggable={!!onDragStart}
      onDragStart={() => onDragStart?.(ponto.id)}
      onDragOver={(e) => { e.preventDefault(); onDragOver?.(ponto.id); }}
      onDrop={onDrop}
      style={{ ...cardStyle, animationDelay: `${Math.min(index, 12) * 40}ms` }}
      className={`bg-card/60 backdrop-blur-xl supports-[backdrop-filter]:bg-card/50 rounded-2xl border border-border shadow-sm overflow-hidden transition-all duration-300 animate-fade-in opacity-0 [animation-fill-mode:forwards] ${onDragStart ? "cursor-grab active:cursor-grabbing" : ""} ${isPlaying ? "ring-2 ring-accent/40" : "hover:shadow-md"}`}
    >

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
            {classifLabels.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {classifLabels.map((c) => (
                  <span
                    key={c.value}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-accent/15 text-accent border border-accent/30"
                  >
                    {c.label}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {isAdmin && !visitorMode && onMoveUp && (
              <button
                onClick={() => onMoveUp(ponto.id)}
                disabled={!canMoveUp}
                className="p-2 rounded-lg hover:bg-muted transition-all active:scale-90 disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label="Mover para cima"
              >
                <ArrowUp size={16} className="text-muted-foreground" />
              </button>
            )}
            {isAdmin && !visitorMode && onMoveDown && (
              <button
                onClick={() => onMoveDown(ponto.id)}
                disabled={!canMoveDown}
                className="p-2 rounded-lg hover:bg-muted transition-all active:scale-90 disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label="Mover para baixo"
              >
                <ArrowDown size={16} className="text-muted-foreground" />
              </button>
            )}
            {canEdit && (
              <button
                onClick={() => onEdit!(ponto)}
                className="p-2 rounded-lg hover:bg-muted transition-all active:scale-90"
                aria-label="Editar ponto"
              >
                <Pencil size={16} className="text-muted-foreground" />
              </button>
            )}
            {canDelete && (
              <button
                onClick={() => onDelete!(ponto.id)}
                className="p-2 rounded-lg hover:bg-destructive/10 transition-all active:scale-90"
                aria-label="Excluir ponto"
              >
                <Trash2 size={16} className="text-destructive/70" />
              </button>
            )}
            {canFavorite && (
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
            )}
            <button
              onClick={handleShare}
              className="p-2 rounded-lg hover:bg-muted transition-all active:scale-90"
              aria-label="Compartilhar ponto"
              title="Compartilhar"
            >
              <Share2 size={16} className="text-muted-foreground" />
            </button>
            {hasMedia && canPlay && (
              <MediaIconButton
                kind={embed.kind}
                isPlaying={isPlaying}
                onClick={() => onTogglePlay(ponto.id)}
              />
            )}
          </div>
        </div>

        <div
          className={`relative ${onOpenFullscreen ? "cursor-zoom-in" : ""}`}
          onClick={onOpenFullscreen ? () => onOpenFullscreen(ponto) : undefined}
          role={onOpenFullscreen ? "button" : undefined}
          title={onOpenFullscreen ? "Abrir em tela cheia" : undefined}
        >
          <div className="absolute left-0 top-0 bottom-0 w-1 rounded-full bg-accent/30" style={accentBarStyle} />
          <pre className="text-sm sm:text-base text-card-foreground/80 whitespace-pre-wrap font-[inherit] leading-relaxed pl-4 py-1 uppercase">
            {renderHighlighted(ponto.letra, highlight)}
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
    tiktok: "TikTok",
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
      ) : kind === "tiktok" ? (
        <span className="text-foreground"><TikTokGlyph size={20} /></span>
      ) : (
        <div className="w-5 h-5 rounded-md bg-primary text-primary-foreground flex items-center justify-center">
          <Volume2 size={12} />
        </div>
      )}
    </button>
  );
}

export default PontoCard;
