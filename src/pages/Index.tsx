import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { Search, Star, Music, Plus, Settings, LogOut, Instagram, Heart, Inbox, Loader2 } from "lucide-react";
import logoImg from "@/assets/logo.png";
import { useParams, useNavigate } from "react-router-dom";
import PontoCard from "@/components/PontoCard";
import { PontoFormDialog } from "@/components/PontoFormDialog";
import { SettingsDialog } from "@/components/SettingsDialog";
import { MediaPlayer } from "@/components/MediaPlayer";
import { AutoScrollControl } from "@/components/AutoScrollControl";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { usePontos, type Ponto, type Classificacao, CLASSIFICACAO_OPTIONS } from "@/contexts/PontosContext";
import { useCategorias } from "@/contexts/CategoriasContext";
import { ThemeToggle } from "@/components/ThemeToggle";
import { toast } from "sonner";

type ClassifFilter = "all" | Classificacao;

const Index = () => {
  const { isAdmin, logout, can } = useAuth();
  const navigate = useNavigate();
  const canAdd = can("add_pontos");
  const canManageCats = can("manage_categories");
  const showSettings = canManageCats || isAdmin;
  const { categoria, subcategoria } = useParams<{ categoria?: string; subcategoria?: string }>();
  const [search, setSearch] = useState("");
  const [showFavorites, setShowFavorites] = useState(false);
  const [classifFilter, setClassifFilter] = useState<ClassifFilter>("all");
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingPonto, setEditingPonto] = useState<Ponto | null>(null);
  const [adminOpen, setAdminOpen] = useState(false);
  const dragId = useRef<string | null>(null);
  const [dragList, setDragList] = useState<Ponto[] | null>(null);

  const { pontos, pendentes, favoritos, loading, savePonto, deletePonto, toggleFavorito, movePontoInList, reorderPontosInList } = usePontos();
  const { categorias } = useCategorias();
  const activeCategoria = categorias.find((c) => c.nome === categoria);
  const showClassifFilters = !categoria || (activeCategoria?.mostrarFiltrosClassificacao ?? true);

  const togglePlay = useCallback((id: string) => {
    setPlayingId((curr) => (curr === id ? null : id));
  }, []);

  const handleSavePonto = useCallback(async (data: Parameters<typeof savePonto>[0]) => {
    const { error, pending } = await savePonto(data);
    if (error) { toast.error("Erro: " + error); return; }
    if (pending) toast.success("Ponto enviado para aprovação do admin");
    else toast.success("Ponto salvo");
  }, [savePonto]);

  const handleDeletePonto = useCallback(async (id: string) => {
    if (window.confirm("Tem certeza que deseja excluir este ponto?")) {
      try {
        await deletePonto(id);
        setPlayingId((curr) => (curr === id ? null : curr));
        toast.success("Ponto excluído");
      } catch (e) {
        const msg = (e as { message?: string })?.message ?? "erro";
        toast.error("Não foi possível excluir: " + msg);
      }
    }
  }, [deletePonto]);

  const handleEditPonto = useCallback((ponto: Ponto) => {
    setEditingPonto(ponto);
    setFormOpen(true);
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    let list = pontos;

    if (categoria && subcategoria) {
      list = list.filter((p) => p.categoria === categoria && p.subcategorias.includes(subcategoria));
    } else if (categoria) {
      list = list.filter((p) => p.categoria === categoria);
    }

    if (showFavorites) {
      list = list.filter((p) => favoritos.has(p.id));
    }
    if (showClassifFilters && classifFilter !== "all") {
      list = list.filter((p) => p.classificacoes.includes(classifFilter));
    }
    if (!q) return list;
    return list.filter(
      (p) =>
        p.nome.toLowerCase().includes(q) ||
        p.categoria.toLowerCase().includes(q) ||
        p.letra.toLowerCase().includes(q)
    );
  }, [search, showFavorites, showClassifFilters, classifFilter, favoritos, categoria, subcategoria, pontos]);

  const visibleList = dragList ?? filtered;

  const handleDragStart = useCallback((id: string) => {
    dragId.current = id;
    setDragList(filtered);
  }, [filtered]);

  const handleDragOver = useCallback((overId: string) => {
    const activeId = dragId.current;
    if (!activeId || activeId === overId) return;
    setDragList((current) => {
      const list = current ?? filtered;
      const from = list.findIndex((p) => p.id === activeId);
      const to = list.findIndex((p) => p.id === overId);
      if (from < 0 || to < 0) return list;
      const next = [...list];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }, [filtered]);

  const handleDrop = useCallback(async () => {
    const list = dragList;
    dragId.current = null;
    setDragList(null);
    if (list) await reorderPontosInList(list);
  }, [dragList, reorderPontosInList]);

  const playingPonto = playingId ? pontos.find((p) => p.id === playingId) : null;

  const pageTitle = subcategoria || categoria || "Todos os Pontos";
  const pageSubtitle = subcategoria ? categoria : "Caderno do Ogã";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="bg-primary shadow-xl">
        <div className="px-3 sm:px-4 pt-3 pb-3 sm:pt-4 sm:pb-4">
          <div className="flex items-center gap-2 sm:gap-3 mb-3">
            <SidebarTrigger className="text-primary-foreground hover:bg-primary-foreground/10 rounded-lg p-2 -ml-1" />
            <img
              src={logoImg}
              alt="Caderno do Ogã"
              className="w-10 h-10 rounded-xl object-cover bg-primary-foreground/10 shrink-0 hidden sm:block"
            />
            <div className="flex-1 min-w-0">
              <h1 className="font-display text-base sm:text-xl font-bold text-primary-foreground tracking-tight uppercase truncate">
                {pageTitle}
              </h1>
              <p className="text-[10px] text-primary-foreground/45 font-medium uppercase truncate">
                {pageSubtitle}
              </p>
            </div>

            {isAdmin && pendentes.length > 0 && (
              <button
                onClick={() => navigate("/pendentes")}
                className="relative flex items-center gap-1.5 px-2.5 py-2 rounded-xl bg-amber-500 text-white text-xs font-bold transition-all active:scale-95 shadow-sm uppercase"
                title="Pontos pendentes de aprovação"
              >
                <Inbox size={14} />
                <span className="hidden md:inline">Pendentes</span>
                <span className="bg-white text-amber-600 rounded-full px-1.5 min-w-[20px] text-center">{pendentes.length}</span>
              </button>
            )}

            {showSettings && (
              <button
                onClick={() => setAdminOpen(true)}
                className="p-2 sm:px-3 rounded-xl bg-primary-foreground/10 hover:bg-primary-foreground/20 text-primary-foreground text-xs font-bold transition-all active:scale-95 uppercase border border-primary-foreground/10 flex items-center gap-1.5"
                title="Configurações"
                aria-label="Configurações"
              >
                <Settings size={16} />
                <span className="hidden md:inline">Configurações</span>
              </button>
            )}
            {canAdd && (
              <button
                onClick={() => { setEditingPonto(null); setFormOpen(true); }}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-xl bg-accent text-accent-foreground text-xs font-bold transition-all active:scale-95 shadow-sm uppercase"
                title="Adicionar novo ponto"
                aria-label="Adicionar novo ponto"
              >
                <Plus size={16} />
                <span className="hidden md:inline">Novo Ponto</span>
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
        {/* Toolbar: favoritos + classificações + count */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <button
            onClick={() => setShowFavorites(!showFavorites)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold transition-all active:scale-95 shadow-sm uppercase ${
              showFavorites
                ? "bg-accent text-accent-foreground shadow-md"
                : "bg-card text-muted-foreground border border-border hover:border-accent/30"
            }`}
          >
            <Star size={14} className={showFavorites ? "fill-accent-foreground" : ""} />
            Favoritos {favoritos.size > 0 && `(${favoritos.size})`}
          </button>

          {showClassifFilters && (
            <>
              <ClassifChip label="Todos" active={classifFilter === "all"} onClick={() => setClassifFilter("all")} />
              {CLASSIFICACAO_OPTIONS.map((c) => (
                <ClassifChip key={c.value} label={c.label} active={classifFilter === c.value} onClick={() => setClassifFilter(c.value)} />
              ))}
            </>
          )}

          <p className="ml-auto text-xs text-muted-foreground font-medium">
            {filtered.length} {filtered.length === 1 ? "ponto" : "pontos"}
          </p>
        </div>

        {/* Cards */}
        <div className="space-y-3 sm:space-y-4 max-w-2xl">
          {loading ? (
            <div className="text-center py-16 text-muted-foreground">
              <Loader2 size={32} className="mx-auto animate-spin opacity-60" />
              <p className="text-sm mt-3 uppercase">Carregando pontos...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Music size={44} className="mx-auto mb-4 opacity-20" />
              <p className="text-base font-medium uppercase">Nenhum ponto nesta pasta</p>
              <p className="text-sm mt-1 opacity-70 uppercase">Tente outra busca ou outro filtro</p>
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
            visibleList.map((ponto, i) => (
              <PontoCard
                key={ponto.id}
                ponto={ponto}
                isPlaying={playingId === ponto.id}
                isFavorite={favoritos.has(ponto.id)}
                onTogglePlay={togglePlay}
                onToggleFavorite={toggleFavorito}
                onEdit={handleEditPonto}
                onDelete={handleDeletePonto}
                onMoveUp={(id) => movePontoInList(id, -1, visibleList)}
                onMoveDown={(id) => movePontoInList(id, 1, visibleList)}
                onDragStart={isAdmin ? handleDragStart : undefined}
                onDragOver={isAdmin ? handleDragOver : undefined}
                onDrop={isAdmin ? handleDrop : undefined}
                canMoveUp={i > 0}
                canMoveDown={i < visibleList.length - 1}
              />
            ))
          )}
        </div>
      </main>

      {/* Auto-scroll */}
      <AutoScrollControl />

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

function ClassifChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-[11px] font-bold uppercase transition-all active:scale-95 ${
        active
          ? "bg-primary text-primary-foreground shadow-sm"
          : "bg-card text-muted-foreground border border-border hover:border-accent/30"
      }`}
    >
      {label}
    </button>
  );
}

export default Index;
