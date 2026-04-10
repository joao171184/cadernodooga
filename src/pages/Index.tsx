import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { Search, Star, Music, Sparkles } from "lucide-react";
import { pontos } from "@/data/pontos";
import PontoCard from "@/components/PontoCard";

const FAVORITES_KEY = "pontos-favoritos";

const loadFavorites = (): Set<string> => {
  try {
    const saved = localStorage.getItem(FAVORITES_KEY);
    return saved ? new Set(JSON.parse(saved)) : new Set();
  } catch {
    return new Set();
  }
};

const Index = () => {
  const [search, setSearch] = useState("");
  const [showFavorites, setShowFavorites] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(loadFavorites);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify([...favorites]));
  }, [favorites]);

  const toggleFavorite = useCallback((id: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const togglePlay = useCallback((id: string) => {
    if (playingId === id) {
      audioRef.current?.pause();
      setPlayingId(null);
      return;
    }
    if (audioRef.current) {
      audioRef.current.pause();
    }
    const ponto = pontos.find((p) => p.id === id);
    if (!ponto) return;
    const audio = new Audio(ponto.audio);
    audio.onended = () => setPlayingId(null);
    audio.play().catch(() => {});
    audioRef.current = audio;
    setPlayingId(id);
  }, [playingId]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    let list = pontos;
    if (showFavorites) {
      list = list.filter((p) => favorites.has(p.id));
    }
    if (!q) return list;
    return list.filter(
      (p) =>
        p.nome.toLowerCase().includes(q) ||
        p.categoria.toLowerCase().includes(q) ||
        p.letra.toLowerCase().includes(q)
    );
  }, [search, showFavorites, favorites]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-primary shadow-xl">
        <div className="max-w-lg mx-auto px-5 pt-6 pb-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-accent/20 flex items-center justify-center text-2xl shadow-inner">
              🪘
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold text-primary-foreground tracking-tight">
                Caderno do Ogã
              </h1>
              <p className="text-xs text-primary-foreground/50 font-medium flex items-center gap-1">
                <Sparkles size={10} />
                Pontos Cantados
              </p>
            </div>
          </div>
          {/* Search */}
          <div className="relative">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-primary-foreground/40" />
            <input
              type="text"
              placeholder="Buscar ponto, orixá ou trecho da letra..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-primary-foreground/10 text-primary-foreground placeholder:text-primary-foreground/35 text-sm outline-none focus:ring-2 focus:ring-accent/50 backdrop-blur-sm transition-all border border-primary-foreground/10"
            />
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-lg mx-auto px-4 py-5 pb-10">
        {/* Favorites toggle + count */}
        <div className="flex items-center justify-between mb-5">
          <button
            onClick={() => setShowFavorites(!showFavorites)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all active:scale-95 shadow-sm ${
              showFavorites
                ? "bg-accent text-accent-foreground shadow-md"
                : "bg-card text-muted-foreground border border-border hover:border-accent/30"
            }`}
          >
            <Star size={16} className={showFavorites ? "fill-accent-foreground" : ""} />
            Favoritos {favorites.size > 0 && `(${favorites.size})`}
          </button>
          <p className="text-xs text-muted-foreground font-medium">
            {filtered.length} {filtered.length === 1 ? "ponto" : "pontos"}
          </p>
        </div>

        {/* Cards */}
        <div className="space-y-4">
          {filtered.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Music size={44} className="mx-auto mb-4 opacity-20" />
              <p className="text-base font-medium">Nenhum ponto encontrado</p>
              <p className="text-sm mt-1 opacity-70">Tente outra busca</p>
            </div>
          ) : (
            filtered.map((ponto) => (
              <PontoCard
                key={ponto.id}
                ponto={ponto}
                isPlaying={playingId === ponto.id}
                isFavorite={favorites.has(ponto.id)}
                onTogglePlay={togglePlay}
                onToggleFavorite={toggleFavorite}
              />
            ))
          )}
        </div>
      </main>
    </div>
  );
};

export default Index;
