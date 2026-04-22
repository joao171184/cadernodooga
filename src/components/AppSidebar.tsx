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
import { ChevronDown, ChevronRight, Shield, Eye, BookOpen } from "lucide-react";
import { type CategoriaNode } from "@/data/pontos";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useCategorias } from "@/contexts/CategoriasContext";
import { getCategoryIcon } from "@/lib/categoryIcons";

export function AppSidebar() {
  const { state, setOpenMobile } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const currentPath = decodeURIComponent(location.pathname);
  const [openFolders, setOpenFolders] = useState<Set<string>>(new Set(["Orixás", "Guias de Direita", "Guias de Esquerda"]));
  const { isAdmin } = useAuth();
  const { categorias } = useCategorias();

  const toggleFolder = (nome: string) => {
    setOpenFolders((prev) => {
      const next = new Set(prev);
      if (next.has(nome)) next.delete(nome);
      else next.add(nome);
      return next;
    });
  };

  const handleNavClick = () => setOpenMobile(false);

  const renderNode = (node: CategoriaNode) => {
    const hasChildren = node.filhos && node.filhos.length > 0;
    const isOpen = openFolders.has(node.nome);
    const Icon = getCategoryIcon(node.nome);

    if (hasChildren) {
      return (
        <div key={node.nome} className="mb-0.5">
          <button
            onClick={() => toggleFolder(node.nome)}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold text-sidebar-foreground hover:bg-sidebar-accent transition-all"
            title={node.nome}
          >
            <Icon size={18} className="text-sidebar-primary shrink-0" strokeWidth={2} />
            {!collapsed && (
              <>
                <span className="flex-1 text-left tracking-wide text-[13px] font-display">{node.nome}</span>
                {isOpen ? <ChevronDown size={14} className="text-muted-foreground" /> : <ChevronRight size={14} className="text-muted-foreground" />}
              </>
            )}
          </button>
          {isOpen && !collapsed && (
            <div className="ml-3 pl-3 border-l-2 border-sidebar-primary/20 space-y-0.5 mt-0.5">
              {node.filhos!.map((child) => {
                const url = `/guia/${encodeURIComponent(node.nome)}/${encodeURIComponent(child.nome)}`;
                const isActive = currentPath === `/guia/${node.nome}/${child.nome}`;
                const ChildIcon = getCategoryIcon(child.nome);
                return (
                  <SidebarMenuItem key={child.nome}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={url}
                        end
                        onClick={handleNavClick}
                        className={`flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all text-[13px] ${
                          isActive
                            ? "bg-sidebar-primary/15 text-sidebar-primary font-semibold"
                            : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                        }`}
                        activeClassName=""
                      >
                        <ChildIcon size={15} strokeWidth={2} className="shrink-0" />
                        <span className="truncate">{child.nome}</span>
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
            title={node.nome}
            className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all text-sm font-semibold ${
              isActive
                ? "bg-sidebar-primary/15 text-sidebar-primary"
                : "text-sidebar-foreground hover:bg-sidebar-accent"
            }`}
            activeClassName=""
          >
            <Icon size={18} strokeWidth={2} className="shrink-0" />
            {!collapsed && <span className="tracking-wide text-[13px] font-display">{node.nome}</span>}
          </NavLink>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        {!collapsed ? (
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-sidebar-primary/15 flex items-center justify-center text-xl">
              🪘
            </div>
            <div className="min-w-0">
              <h2 className="font-display text-base font-bold text-sidebar-foreground leading-tight truncate">
                Caderno do Ogã
              </h2>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">
                Pontos Cantados
              </p>
            </div>
          </div>
        ) : (
          <span className="text-xl mx-auto">🪘</span>
        )}
      </SidebarHeader>

      <SidebarContent className="scrollbar-none overflow-y-auto">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink
                    to="/"
                    end
                    onClick={handleNavClick}
                    title="Todos os Pontos"
                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all text-sm font-semibold ${
                      currentPath === "/"
                        ? "bg-sidebar-primary/15 text-sidebar-primary"
                        : "text-sidebar-foreground hover:bg-sidebar-accent"
                    }`}
                    activeClassName=""
                  >
                    <BookOpen size={18} strokeWidth={2} className="shrink-0" />
                    {!collapsed && <span className="tracking-wide text-[13px] font-display">Todos os Pontos</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {categorias.map((node) => renderNode(node))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3 border-t border-sidebar-border">
        {!collapsed ? (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-sidebar-accent text-xs">
            {isAdmin ? <Shield size={14} className="text-sidebar-primary" /> : <Eye size={14} className="text-muted-foreground" />}
            <span className="font-semibold uppercase tracking-wide flex-1 text-sidebar-foreground">
              {isAdmin ? "Administrador" : "Visitante"}
            </span>
          </div>
        ) : (
          <div className="flex justify-center">
            {isAdmin ? <Shield size={14} className="text-sidebar-primary" /> : <Eye size={14} className="text-muted-foreground" />}
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
