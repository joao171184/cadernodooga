import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { ChevronDown, ChevronRight, Sparkles, Lock, LogOut, Shield, Eye } from "lucide-react";
import { categoriaTree, type CategoriaNode } from "@/data/pontos";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

export function AppSidebar() {
  const { state, setOpenMobile } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const currentPath = decodeURIComponent(location.pathname);
  const [openFolders, setOpenFolders] = useState<Set<string>>(new Set(["Orixás", "Guias de Direita", "Guias de Esquerda"]));
  const [showLogin, setShowLogin] = useState(false);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState(false);
  const { role, isLoggedIn, isAdmin, login, logout } = useAuth();

  const toggleFolder = (nome: string) => {
    setOpenFolders((prev) => {
      const next = new Set(prev);
      if (next.has(nome)) next.delete(nome);
      else next.add(nome);
      return next;
    });
  };

  const handleNavClick = () => {
    setOpenMobile(false);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const success = login(password);
    if (success) {
      setShowLogin(false);
      setPassword("");
      setLoginError(false);
    } else {
      setLoginError(true);
    }
  };

  const renderNode = (node: CategoriaNode) => {
    const hasChildren = node.filhos && node.filhos.length > 0;
    const isOpen = openFolders.has(node.nome);

    if (hasChildren) {
      return (
        <div key={node.nome} className="mb-1">
          <button
            onClick={() => toggleFolder(node.nome)}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-bold text-foreground hover:bg-muted/60 transition-all"
          >
            <span className="text-base">{node.emoji}</span>
            {!collapsed && (
              <>
                <span className="flex-1 text-left uppercase tracking-wide text-xs">{node.nome}</span>
                {isOpen ? <ChevronDown size={14} className="text-muted-foreground" /> : <ChevronRight size={14} className="text-muted-foreground" />}
              </>
            )}
          </button>
          {isOpen && !collapsed && (
            <div className="ml-3 pl-3 border-l-2 border-accent/20 space-y-0.5 mt-1">
              {node.filhos!.map((child) => {
                const url = `/guia/${encodeURIComponent(node.nome)}/${encodeURIComponent(child.nome)}`;
                const isActive = currentPath === `/guia/${node.nome}/${child.nome}`;
                return (
                  <SidebarMenuItem key={child.nome}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={url}
                        end
                        onClick={handleNavClick}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-sm ${
                          isActive
                            ? "bg-accent/20 text-accent-foreground font-bold"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        }`}
                        activeClassName=""
                      >
                        <span className="text-sm">{child.emoji}</span>
                        <span>{child.nome}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </div>
          )}
        </div>
      );
    }

    const url = `/guia/${encodeURIComponent(node.nome)}`;
    const isActive = currentPath === `/guia/${node.nome}`;
    return (
      <SidebarMenuItem key={node.nome}>
        <SidebarMenuButton asChild>
          <NavLink
            to={url}
            end
            onClick={handleNavClick}
            className={`flex items-center gap-2 px-3 py-2.5 rounded-xl transition-all text-sm font-bold ${
              isActive
                ? "bg-accent/20 text-accent-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
            activeClassName=""
          >
            <span className="text-base">{node.emoji}</span>
            {!collapsed && <span className="uppercase tracking-wide text-xs">{node.nome}</span>}
          </NavLink>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-border">
      <SidebarHeader className="p-4">
        {!collapsed && (
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">🪘</span>
            <div>
              <h2 className="font-display text-lg font-bold text-foreground leading-tight">
                Caderno do Ogã
              </h2>
              <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Sparkles size={8} />
                Pontos Cantados
              </p>
            </div>
          </div>
        )}
        {collapsed && <span className="text-xl mx-auto">🪘</span>}
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink
                    to="/"
                    end
                    onClick={handleNavClick}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl transition-all text-sm font-bold ${
                      currentPath === "/"
                        ? "bg-accent/20 text-accent-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                    activeClassName=""
                  >
                    <span className="text-base">📖</span>
                    {!collapsed && <span className="uppercase tracking-wide text-xs">Todos os Pontos</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {categoriaTree.map((node) => renderNode(node))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3 space-y-2">
        {!collapsed && (
          <>
            {isLoggedIn ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-muted/60 text-xs">
                  {isAdmin ? (
                    <Shield size={14} className="text-accent" />
                  ) : (
                    <Eye size={14} className="text-muted-foreground" />
                  )}
                  <span className="font-bold uppercase tracking-wide flex-1">
                    {isAdmin ? "Administrador" : "Visitante"}
                  </span>
                </div>
                <button
                  onClick={logout}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all"
                >
                  <LogOut size={14} />
                  SAIR
                </button>
              </div>
            ) : showLogin ? (
              <form onSubmit={handleLogin} className="space-y-2">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setLoginError(false); }}
                  placeholder="DIGITE A SENHA..."
                  className={`w-full px-3 py-2.5 rounded-xl bg-muted text-foreground text-xs outline-none focus:ring-2 focus:ring-accent/50 border uppercase ${
                    loginError ? "border-destructive" : "border-border"
                  }`}
                  autoFocus
                />
                {loginError && (
                  <p className="text-[10px] text-destructive font-medium px-1">Senha incorreta</p>
                )}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => { setShowLogin(false); setPassword(""); setLoginError(false); }}
                    className="flex-1 py-2 rounded-xl text-xs font-bold text-muted-foreground bg-muted hover:bg-muted/80 transition-all"
                  >
                    CANCELAR
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 rounded-xl text-xs font-bold text-primary-foreground bg-primary hover:bg-primary/90 transition-all"
                  >
                    ENTRAR
                  </button>
                </div>
              </form>
            ) : (
              <button
                onClick={() => setShowLogin(true)}
                className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold text-muted-foreground hover:bg-muted hover:text-foreground transition-all border border-border"
              >
                <Lock size={14} />
                ENTRAR
              </button>
            )}
            <p className="text-[10px] text-muted-foreground/50 text-center">
              Axé 🙏
            </p>
          </>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
