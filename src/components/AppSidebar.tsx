import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { Home, Star, Sparkles } from "lucide-react";

const guias = [
  { titulo: "Todos os Pontos", url: "/", emoji: "📖", icon: Home },
  { titulo: "Exu", url: "/guia/Exu", emoji: "🔱" },
  { titulo: "Ogum", url: "/guia/Ogum", emoji: "⚔️" },
  { titulo: "Oxóssi", url: "/guia/Oxóssi", emoji: "🏹" },
  { titulo: "Xangô", url: "/guia/Xangô", emoji: "⚡" },
  { titulo: "Iemanjá", url: "/guia/Iemanjá", emoji: "🌊" },
  { titulo: "Oxum", url: "/guia/Oxum", emoji: "🪞" },
  { titulo: "Preto-Velho", url: "/guia/Preto-Velho", emoji: "🕯️" },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const currentPath = decodeURIComponent(location.pathname);

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
          <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground/70">
            Guias
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {guias.map((guia) => {
                const isActive = currentPath === guia.url;
                return (
                  <SidebarMenuItem key={guia.url}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={guia.url}
                        end
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm font-medium ${
                          isActive
                            ? "bg-accent/20 text-accent-foreground font-semibold"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        }`}
                        activeClassName=""
                      >
                        <span className="text-lg">{guia.emoji}</span>
                        {!collapsed && <span>{guia.titulo}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3">
        {!collapsed && (
          <p className="text-[10px] text-muted-foreground/50 text-center">
            Axé 🙏
          </p>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
