import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { Search, Star, Music } from "lucide-react";
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
      <header className="sticky top-0 z-10 bg-primary text-primary-foreground px-4 py-4 shadow-md">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-2 mb-3">
            <Music size={26} />
            <h1 className="text-xl font-bold tracking-tight">Pontos Cantados</h1>
          </div>
          {/* Search */}
          <div className="relative">
            <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-primary-foreground/60" />
            <input
              type="text"
              placeholder="Buscar por nome, orixá ou trecho..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-lg bg-primary-foreground/15 text-primary-foreground placeholder:text-primary-foreground/50 text-base outline-none focus:ring-2 focus:ring-primary-foreground/30 backdrop-blur-sm"
            />
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-lg mx-auto px-4 py-4 pb-8">
        {/* Favorites toggle */}
        <button
          onClick={() => setShowFavorites(!showFavorites)}
          className={`flex items-center gap-2 mb-4 px-4 py-2.5 rounded-full text-sm font-semibold transition-all active:scale-95 ${
            showFavorites
              ? "bg-accent text-accent-foreground shadow-sm"
              : "bg-card text-muted-foreground border border-border"
          }`}
        >
          <Star size={18} className={showFavorites ? "fill-accent-foreground" : ""} />
          Favoritos {favorites.size > 0 && `(${favorites.size})`}
        </button>

        {/* Results count */}
        <p className="text-xs text-muted-foreground mb-3 px-1">
          {filtered.length} {filtered.length === 1 ? "ponto encontrado" : "pontos encontrados"}
        </p>

        {/* Cards */}
        <div className="space-y-4">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Music size={48} className="mx-auto mb-3 opacity-30" />
              <p className="text-base">Nenhum ponto encontrado</p>
              <p className="text-sm mt-1">Tente outra busca</p>
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
