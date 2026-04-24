import { useState, useCallback, useMemo, useEffect } from "react";
import { Search, Star, Music, Plus, Settings, LogOut, Instagram, Heart } from "lucide-react";
import logoImg from "@/assets/logo.png";
import { useParams } from "react-router-dom";
import { loadPontos, savePontos, type Ponto } from "@/data/pontos";
import PontoCard from "@/components/PontoCard";
import { PontoFormDialog } from "@/components/PontoFormDialog";
import { SettingsDialog } from "@/components/SettingsDialog";
import { MediaPlayer } from "@/components/MediaPlayer";
import { AutoScrollControl } from "@/components/AutoScrollControl";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { ThemeToggle } from "@/components/ThemeToggle";

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
  const { isAdmin, logout, can } = useAuth();
  const canAdd = can("add_pontos");
  const canManageCats = can("manage_categories");
  const showSettings = canManageCats || isAdmin;
  const { categoria, subcategoria } = useParams<{ categoria?: string; subcategoria?: string }>();
  const [search, setSearch] = useState("");
  const [showFavorites, setShowFavorites] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(loadFavorites);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [pontos, setPontos] = useState<Ponto[]>(loadPontos);
  const [formOpen, setFormOpen] = useState(false);
  const [editingPonto, setEditingPonto] = useState<Ponto | null>(null);
  const [adminOpen, setAdminOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify([...favorites]));
  }, [favorites]);

  useEffect(() => {
    savePontos(pontos);
  }, [pontos]);

  const toggleFavorite = useCallback((id: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const togglePlay = useCallback((id: string) => {
    setPlayingId((curr) => (curr === id ? null : id));
  }, []);

  const handleSavePonto = useCallback((data: Omit<Ponto, "id"> & { id?: string }) => {
    if (data.id) {
      setPontos((prev) => prev.map((p) => (p.id === data.id ? { ...p, ...data } as Ponto : p)));
    } else {
      const newPonto: Ponto = {
        ...data,
        id: `ponto-${Date.now()}`,
      };
      setPontos((prev) => [...prev, newPonto]);
    }
  }, []);

  const handleDeletePonto = useCallback((id: string) => {
    if (window.confirm("Tem certeza que deseja excluir este ponto?")) {
      setPontos((prev) => prev.filter((p) => p.id !== id));
      setPlayingId((curr) => (curr === id ? null : curr));
    }
  }, []);

  const handleEditPonto = useCallback((ponto: Ponto) => {
    setEditingPonto(ponto);
    setFormOpen(true);
  }, []);

  const movePonto = useCallback((id: string, dir: -1 | 1) => {
    setPontos((prev) => {
      const idx = prev.findIndex((p) => p.id === id);
      if (idx < 0) return prev;
      const target = idx + dir;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    let list = pontos;

    if (categoria && subcategoria) {
      list = list.filter((p) => {
        if (p.categoria !== categoria) return false;
        const subs = p.subcategorias && p.subcategorias.length > 0
          ? p.subcategorias
          : p.subcategoria ? [p.subcategoria] : [];
        return subs.includes(subcategoria);
      });
    } else if (categoria) {
      list = list.filter((p) => p.categoria === categoria);
    }

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
  }, [search, showFavorites, favorites, categoria, subcategoria, pontos]);

  const playingPonto = playingId ? pontos.find((p) => p.id === playingId) : null;

  const pageTitle = subcategoria || categoria || "Todos os Pontos";
  const pageSubtitle = subcategoria ? categoria : "Caderno do Ogã";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-primary shadow-xl">
        <div className="px-3 sm:px-4 pt-3 pb-3 sm:pt-4 sm:pb-4">
          <div className="flex items-center gap-2 sm:gap-3 mb-3">
            <SidebarTrigger className="text-primary-foreground hover:bg-primary-foreground/10 rounded-lg p-2 -ml-1" />
            <img
              src={logoImg}
              alt="Caderno do Ogã"
              className="w-10 h-10 rounded-xl object-cover bg-primary-foreground/10 shrink-0 hidden sm:block"
            />
            <div className="flex-1 min-w-0">
              <h1 className="font-display text-lg sm:text-xl font-bold text-primary-foreground tracking-tight uppercase truncate">
                {pageTitle}
              </h1>
              <p className="text-[10px] text-primary-foreground/45 font-medium uppercase">
                {pageSubtitle}
              </p>
            </div>
            {showSettings && (
              <>
                <button
                  onClick={() => setAdminOpen(true)}
                  className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary-foreground/10 hover:bg-primary-foreground/20 text-primary-foreground text-xs font-bold transition-all active:scale-95 uppercase border border-primary-foreground/10"
                  title="Configurações"
                >
                  <Settings size={14} />
                  <span>Configurações</span>
                </button>
                <button
                  onClick={() => setAdminOpen(true)}
                  className="sm:hidden p-2 rounded-xl text-primary-foreground hover:bg-primary-foreground/10 transition-all active:scale-95"
                  aria-label="Configurações"
                >
                  <Settings size={18} />
                </button>
              </>
            )}
            {canAdd && (
              <button
                onClick={() => { setEditingPonto(null); setFormOpen(true); }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-accent text-accent-foreground text-xs font-bold transition-all active:scale-95 shadow-sm uppercase"
                title="Adicionar novo ponto"
              >
                <Plus size={16} />
                <span className="hidden sm:inline">Novo Ponto</span>
              </button>
            )}
            <ThemeToggle />
            <button
              onClick={logout}
              className="p-2 rounded-xl text-primary-foreground hover:bg-primary-foreground/10 transition-all active:scale-95"
              aria-label="Sair"
              title="Sair"
            >
              <LogOut size={18} />
            </button>
          </div>
          {/* Search */}
          <div className="relative">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-primary-foreground/40" />
            <input
              type="text"
              placeholder="BUSCAR PONTO OU TRECHO DA LETRA..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-primary-foreground/10 text-primary-foreground placeholder:text-primary-foreground/35 text-sm outline-none focus:ring-2 focus:ring-accent/50 backdrop-blur-sm transition-all border border-primary-foreground/10 uppercase"
            />
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 px-3 sm:px-4 py-4 sm:py-5 pb-32">
        {/* Favorites toggle + count */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setShowFavorites(!showFavorites)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-bold transition-all active:scale-95 shadow-sm uppercase ${
              showFavorites
                ? "bg-accent text-accent-foreground shadow-md"
                : "bg-card text-muted-foreground border border-border hover:border-accent/30"
            }`}
          >
            <Star size={14} className={showFavorites ? "fill-accent-foreground" : ""} />
            Favoritos {favorites.size > 0 && `(${favorites.size})`}
          </button>
          <p className="text-xs text-muted-foreground font-medium">
            {filtered.length} {filtered.length === 1 ? "ponto" : "pontos"}
          </p>
        </div>

        {/* Cards */}
        <div className="space-y-3 sm:space-y-4 max-w-2xl">
          {filtered.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Music size={44} className="mx-auto mb-4 opacity-20" />
              <p className="text-base font-medium uppercase">Nenhum ponto encontrado</p>
              <p className="text-sm mt-1 opacity-70">Tente outra busca ou adicione um novo ponto</p>
              {canAdd && (
                <button
                  onClick={() => { setEditingPonto(null); setFormOpen(true); }}
                  className="mt-4 inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-bold transition-all active:scale-95 uppercase"
                >
                  <Plus size={18} />
                  Adicionar Ponto
                </button>
              )}
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
                onEdit={handleEditPonto}
                onDelete={handleDeletePonto}
              />
            ))
          )}
        </div>
      </main>

      {/* Media Player */}
      {playingPonto && (
        <MediaPlayer
          url={playingPonto.audio}
          title={playingPonto.nome}
          onClose={() => setPlayingId(null)}
        />
      )}

      {/* Form Dialog */}
      <PontoFormDialog
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditingPonto(null); }}
        onSave={handleSavePonto}
        ponto={editingPonto}
        defaultCategoria={categoria}
        defaultSubcategoria={subcategoria}
      />

      {/* Configurações */}
      {showSettings && (
        <SettingsDialog open={adminOpen} onClose={() => setAdminOpen(false)} />
      )}

      {/* Footer com créditos */}
      <footer className="mt-auto border-t border-border bg-card/50 backdrop-blur-sm">
        <div className="px-4 py-5 max-w-2xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span>Feito com</span>
            <Heart size={12} className="fill-accent text-accent" />
            <span>por <span className="font-bold text-foreground">João Pedro de Andrade Marques</span></span>
          </div>
          <a
            href="https://www.instagram.com/46marques__/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent/15 hover:bg-accent/25 text-accent text-xs font-bold transition-all active:scale-95"
          >
            <Instagram size={14} />
            <span>@46marques__</span>
          </a>
        </div>
      </footer>
    </div>
  );
};

export default Index;
