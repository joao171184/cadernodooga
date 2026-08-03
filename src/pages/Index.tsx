import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { Search, Music, Plus, Settings, LogOut, Instagram, Heart, Inbox, Loader2, Drum, Check, LogIn, UserCircle2, Eye, ShieldCheck, Menu } from "lucide-react";
import { useSidebar } from "@/components/ui/sidebar";
import logoImg from "@/assets/logo.png";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import PontoCard from "@/components/PontoCard";
import { PontoFormDialog } from "@/components/PontoFormDialog";
import { SettingsDialog } from "@/components/SettingsDialog";
import { MediaPlayer } from "@/components/MediaPlayer";
import { PontoFullscreen } from "@/components/PontoFullscreen";
import { AutoScrollControl } from "@/components/AutoScrollControl";
import { Skeleton } from "@/components/ui/skeleton";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth, type PermissionKey } from "@/contexts/AuthContext";
import { usePontos, type Ponto, type Classificacao, type ToqueTipo, CLASSIFICACAO_OPTIONS, TOQUE_OPTIONS } from "@/contexts/PontosContext";
import { useCategorias } from "@/contexts/CategoriasContext";
import { ThemeToggle } from "@/components/ThemeToggle";
import { toast } from "sonner";

type ClassifFilter = "all" | Classificacao;
type ToqueFilter = "all" | ToqueTipo;

const Index = () => {
  const { isAdmin, isLoggedIn, user, logout, can } = useAuth();
  const { toggleSidebar } = useSidebar();
  const [visitorMode, setVisitorMode] = useState(false);
  const effectiveIsAdmin = isAdmin && !visitorMode;
  const effectiveCan = useCallback((key: PermissionKey) => !visitorMode && (isAdmin || can(key)), [visitorMode, isAdmin, can]);
  const navigate = useNavigate();
  const canAdd = effectiveCan("add_pontos");
  const canManageCats = effectiveCan("manage_categories");
  const showSettings = canManageCats || effectiveIsAdmin;
  const { categoria, subcategoria } = useParams<{ categoria?: string; subcategoria?: string }>();
  const location = useLocation();
  const isFavoritosRoute = location.pathname === "/favoritos";
  const [search, setSearch] = useState("");
  const [showFavorites, setShowFavorites] = useState(false);
  useEffect(() => { setShowFavorites(isFavoritosRoute); }, [isFavoritosRoute]);
  const [classifFilter, setClassifFilter] = useState<ClassifFilter>("all");
  const [toqueFilter, setToqueFilter] = useState<ToqueFilter>("all");
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingPonto, setEditingPonto] = useState<Ponto | null>(null);
  const [adminOpen, setAdminOpen] = useState(false);
  const [fullscreenPonto, setFullscreenPonto] = useState<Ponto | null>(null);
  const dragId = useRef<string | null>(null);
  const [dragList, setDragList] = useState<Ponto[] | null>(null);

  const { pontos, pendentes, favoritos, toqueOrdens, loading, savePonto, deletePonto, toggleFavorito, movePontoInList, reorderPontosInList } = usePontos();
  const { categorias } = useCategorias();
  const activeCategoria = categorias.find((c) => c.nome === categoria);
  const showClassifFilters = !categoria || (activeCategoria?.mostrarFiltrosClassificacao ?? true);
  const hasSubcategorias = (activeCategoria?.filhos?.length ?? 0) > 0;

  // Mapa nome-categoria => cor (inclui subs)
  const categoryColorMap = useMemo(() => {
    const m = new Map<string, string>();
    const norm2 = (s: string) => (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    categorias.forEach((c) => {
      if (c.cor) m.set(norm2(c.nome), c.cor);
      c.filhos.forEach((f) => {
        if (f.cor) m.set(norm2(f.nome), f.cor);
      });
    });
    return m;
  }, [categorias]);


  // Ao trocar de categoria/subcategoria, volta para "Todos" (incluindo filtro de toque)
  useEffect(() => {
    setClassifFilter("all");
    setToqueFilter("all");
  }, [categoria, subcategoria]);

  // Notificação convidando visitantes a fazerem login (só uma vez por sessão)
  useEffect(() => {
    if (isLoggedIn) return;
    if (sessionStorage.getItem("login-prompt-shown") === "1") return;
    const t = setTimeout(() => {
      toast("🪘 Faça login para uma imersão completa", {
        description: "Salve favoritos, adicione pontos e aproveite tudo do caderno.",
        duration: 8000,
        action: {
          label: "Entrar",
          onClick: () => navigate("/login"),
        },
      });
      sessionStorage.setItem("login-prompt-shown", "1");
    }, 1200);
    return () => clearTimeout(t);
  }, [isLoggedIn, navigate]);

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

  const norm = (s: string) =>
    (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  const sameText = (a?: string | null, b?: string | null) => norm(a || "") === norm(b || "");

  const filtered = useMemo(() => {
    const q = norm(search.trim());
    let list = pontos;

    if (categoria && subcategoria) {
      list = list.filter((p) => sameText(p.categoria, categoria) && p.subcategorias.some((s) => sameText(s, subcategoria)));
    } else if (categoria) {
      list = list.filter((p) => sameText(p.categoria, categoria));
    }

    if (showFavorites) {
      list = list.filter((p) => favoritos.has(p.id));
    }
    if (showClassifFilters && classifFilter !== "all") {
      list = list.filter((p) => p.classificacoes.includes(classifFilter));
    }
    if (toqueFilter !== "all") {
      list = list.filter((p) => p.toque === toqueFilter);
      // Ordena pela ordem específica deste toque (sem ordem definida cai no fim)
      list = [...list].sort((a, b) => {
        const oa = toqueOrdens.get(a.id)?.[toqueFilter] ?? Number.POSITIVE_INFINITY;
        const ob = toqueOrdens.get(b.id)?.[toqueFilter] ?? Number.POSITIVE_INFINITY;
        if (oa !== ob) return oa - ob;
        return a.ordem - b.ordem;
      });
    }
    if (!q) return list;
    return list.filter(
      (p) =>
        norm(p.nome).includes(q) ||
        norm(p.categoria).includes(q) ||
        norm(p.letra).includes(q) ||
        (p.subcategorias || []).some((s) => norm(s).includes(q))
    );
  }, [search, showFavorites, showClassifFilters, classifFilter, toqueFilter, favoritos, categoria, subcategoria, pontos, toqueOrdens]);

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
    if (list) await reorderPontosInList(list, { toque: toqueFilter === "all" ? null : toqueFilter });
  }, [dragList, reorderPontosInList, toqueFilter]);

  const playingPonto = playingId ? pontos.find((p) => p.id === playingId) : null;

  const pageTitle = isFavoritosRoute ? "Meu Terreiro" : (subcategoria || categoria || "Todos os Pontos");
  const pageSubtitle = isFavoritosRoute ? "Seus pontos favoritos" : (subcategoria ? categoria : "Caderno do Ogã");

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Helmet>
        <title>Caderno do Ogã — Pontos Cantados de Umbanda</title>
        <meta
          name="description"
          content="Caderno do Ogã: acervo de pontos cantados de Umbanda com letra, áudio e classificação por orixás, guias e toques. Busque, ouça e cante."
        />
        <meta name="keywords" content="pontos cantados, umbanda, orixás, guias de direita, ciganos, guias de esquerda, exu, pombagira, fundamentos, curimba, atabaque" />

        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Caderno do Ogã" />
        <meta property="og:title" content="Caderno do Ogã — Pontos Cantados de Umbanda" />
        <meta
          property="og:description"
          content="Acervo de pontos cantados de Umbanda com letra, áudio e classificação por orixás, guias e toques."
        />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: "Caderno do Ogã",
            alternateName: "Caderno do Oga",
            url: "https://cadernodooga.com.br/",
            inLanguage: "pt-BR",
            description:
              "Acervo de pontos cantados de Umbanda com letra, áudio e classificação por orixás, guias e toques.",
            potentialAction: {
              "@type": "SearchAction",
              target: "https://cadernodooga.com.br/?q={search_term_string}",
              "query-input": "required name=search_term_string",
            },
          })}
        </script>
      </Helmet>
      {/* Header */}
      <header className="bg-primary shadow-xl">
        <div className="px-3 sm:px-4 pt-3 pb-3 sm:pt-4 sm:pb-4">
          <div className="flex items-center gap-2 sm:gap-3 mb-3">
            <button
              onClick={toggleSidebar}
              className="flex items-center gap-1.5 px-2.5 sm:px-2 py-2 rounded-xl bg-primary-foreground/15 hover:bg-primary-foreground/25 text-primary-foreground border border-primary-foreground/20 shadow-sm transition-all active:scale-95 -ml-0.5"
              aria-label="Abrir menu de categorias"
              title="Abrir menu"
            >
              <Menu size={18} />
              <span className="text-[11px] font-bold uppercase tracking-wider sm:hidden">Menu</span>
            </button>
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

            {isLoggedIn && effectiveIsAdmin && pendentes.length > 0 && (
              <button
                onClick={() => navigate("/pendentes")}
                className="relative flex items-center gap-1.5 px-2.5 py-2 rounded-xl bg-amber-500 text-white text-xs font-bold transition-all active:scale-95 shadow-sm uppercase"
                title="Pontos pendentes de aprovação"
                aria-label="Pontos pendentes"
              >
                <Inbox size={14} />
                <span className="bg-white text-amber-600 rounded-full px-1.5 min-w-[20px] text-center">
                  {pendentes.length}
                </span>
              </button>
            )}

            {isLoggedIn && canAdd && (
              <button
                onClick={() => { setEditingPonto(null); setFormOpen(true); }}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-xl bg-accent text-accent-foreground text-xs font-bold transition-all active:scale-95 shadow-sm uppercase"
                title="Novo ponto"
                aria-label="Novo ponto"
              >
                <Plus size={16} />
                <span className="hidden sm:inline">Novo</span>
              </button>
            )}

            {isLoggedIn && isAdmin && (
              <button
                onClick={() => setVisitorMode((v) => !v)}
                className={`flex items-center justify-center p-2 rounded-xl transition-all active:scale-95 border ${
                  visitorMode
                    ? "bg-amber-500 text-white border-amber-500 shadow-sm"
                    : "bg-primary-foreground/10 hover:bg-primary-foreground/20 text-primary-foreground border-primary-foreground/10"
                }`}
                title={visitorMode ? "Voltar ao modo admin" : "Ver como visitante"}
                aria-label={visitorMode ? "Voltar ao modo admin" : "Ver como visitante"}
              >
              {visitorMode ? <ShieldCheck size={16} /> : <Eye size={16} />}
              </button>
            )}

            {isLoggedIn && showSettings && (
              <button
                onClick={() => setAdminOpen(true)}
                className="flex items-center justify-center p-2 rounded-xl bg-primary-foreground/10 hover:bg-primary-foreground/20 text-primary-foreground transition-all active:scale-95 border border-primary-foreground/10"
                title="Configurações"
                aria-label="Configurações"
              >
                <Settings size={16} />
              </button>
            )}

            <ThemeToggle />

            {!isLoggedIn ? (
              <button
                onClick={() => navigate("/login")}
                className="flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl bg-accent text-accent-foreground text-xs font-bold transition-all active:scale-95 shadow-sm uppercase"
                title="Entrar"
                aria-label="Entrar"
              >
                <LogIn size={16} />
                <span>Entrar</span>
              </button>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-xl bg-primary-foreground/10 hover:bg-primary-foreground/20 text-primary-foreground text-xs font-bold transition-all active:scale-95 uppercase border border-primary-foreground/10"
                    title="Conta"
                    aria-label="Conta"
                  >
                    <UserCircle2 size={18} />
                    <span className="hidden md:inline max-w-[160px] truncate">
                      {user?.email?.split("@")[0] ?? "Conta"}
                    </span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  {user?.email && (
                    <>
                      <DropdownMenuLabel className="text-[11px] font-bold uppercase truncate">
                        {user.email}
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                    </>
                  )}
                  <DropdownMenuItem
                    onClick={logout}
                    className="gap-2 text-xs font-bold uppercase text-destructive focus:text-destructive"
                  >
                    <LogOut size={14} />
                    Sair
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
          {/* Search */}
          <div className="relative">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-primary-foreground/40" />
            <input
              type="text"
              placeholder="BUSCAR PONTO OU TRECHO DA LETRA..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-primary-foreground/10 text-primary-foreground placeholder:text-primary-foreground/35 text-sm outline-none focus:ring-2 focus:ring-accent/50 backdrop-blur-sm transition-all border border-primary-foreground/10 uppercase"
            />
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 px-3 sm:px-4 py-4 sm:py-5 pb-32">
        {/* Toolbar: favoritos + classificações + count */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {showClassifFilters && (
            <>
              <ClassifChip label="Todos" active={classifFilter === "all"} onClick={() => setClassifFilter("all")} />
              {CLASSIFICACAO_OPTIONS.map((c) => (
                <ClassifChip key={c.value} label={c.label} active={classifFilter === c.value} onClick={() => setClassifFilter(c.value)} />
              ))}
            </>
          )}

          <div className="ml-auto flex items-center gap-2">
            <p className="text-xs text-muted-foreground font-medium whitespace-nowrap">
              {filtered.length} {filtered.length === 1 ? "ponto" : "pontos"}
            </p>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase transition-all active:scale-95 ${
                    toqueFilter !== "all"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-card text-muted-foreground border border-border hover:border-accent/30"
                  }`}
                  aria-label="Filtrar por toque"
                  title="Filtrar por toque"
                >
                  <Drum size={14} />
                  <span>{toqueFilter === "all" ? "Toque" : (TOQUE_OPTIONS.find(t => t.value === toqueFilter)?.label ?? "Toque")}</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem onClick={() => setToqueFilter("all")} className="gap-2 text-xs font-bold uppercase">
                  <Check size={14} className={toqueFilter === "all" ? "opacity-100" : "opacity-0"} />
                  TODOS OS TOQUES
                </DropdownMenuItem>
                {TOQUE_OPTIONS.map((t) => (
                  <DropdownMenuItem key={t.value} onClick={() => setToqueFilter(t.value)} className="gap-2 text-xs font-bold uppercase">
                    <Check size={14} className={toqueFilter === t.value ? "opacity-100" : "opacity-0"} />
                    {t.label.toUpperCase()}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

          </div>
        </div>

        {/* Cards */}
        <div className={`${hasSubcategorias ? "space-y-3 sm:space-y-4 max-w-2xl" : "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4 max-w-6xl"}`}>
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="bg-card rounded-2xl border border-border shadow-sm p-4 sm:p-5">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex-1 min-w-0 space-y-2">
                    <Skeleton className="h-5 w-2/3" />
                    <Skeleton className="h-3 w-1/3" />
                    <div className="flex gap-2 pt-1">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                  </div>
                  <Skeleton className="h-8 w-8 rounded-lg" />
                </div>
                <div className="pl-4 space-y-2">
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-11/12" />
                  <Skeleton className="h-3 w-4/5" />
                  <Skeleton className="h-3 w-3/4" />
                </div>
              </div>
            ))
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground col-span-full">
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
            visibleList.map((ponto, i) => {
              const nkey = (ponto.categoria || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
              const subKey = ponto.subcategorias[0]
                ? ponto.subcategorias[0].toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
                : null;
              const color =
                (subKey && categoryColorMap.get(subKey)) ||
                categoryColorMap.get(nkey) ||
                null;
              return (
                <PontoCard
                  key={ponto.id}
                  ponto={ponto}
                  highlight={search.trim()}
                  isPlaying={playingId === ponto.id}
                  isFavorite={favoritos.has(ponto.id)}
                  visitorMode={visitorMode}
                  showFavorite={isFavoritosRoute}
                  categoryColor={color}
                  index={i}
                  onTogglePlay={togglePlay}
                  onToggleFavorite={toggleFavorito}
                  onEdit={handleEditPonto}
                  onDelete={handleDeletePonto}
                  onMoveUp={(id) => movePontoInList(id, -1, visibleList, { toque: toqueFilter === "all" ? null : toqueFilter })}
                  onMoveDown={(id) => movePontoInList(id, 1, visibleList, { toque: toqueFilter === "all" ? null : toqueFilter })}
                  onDragStart={effectiveIsAdmin ? handleDragStart : undefined}
                  onDragOver={effectiveIsAdmin ? handleDragOver : undefined}
                  onDrop={effectiveIsAdmin ? handleDrop : undefined}
                  onOpenFullscreen={(p) => setFullscreenPonto(p)}
                  canMoveUp={i > 0}
                  canMoveDown={i < visibleList.length - 1}
                />
              );
            })
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

      {fullscreenPonto && (
        <PontoFullscreen
          ponto={fullscreenPonto}
          isFavorite={favoritos.has(fullscreenPonto.id)}
          onToggleFavorite={toggleFavorito}
          canFavorite={effectiveIsAdmin || can("favorite")}
          onClose={() => setFullscreenPonto(null)}
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
