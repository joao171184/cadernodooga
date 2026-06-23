import { Link } from "react-router-dom";
import { LogIn, LayoutGrid } from "lucide-react";
import logoImg from "@/assets/logo.png";
import { useAuth } from "@/contexts/AuthContext";

export function PublicHeader() {
  const { isLoggedIn } = useAuth();

  return (
    <header className="sticky top-0 z-20 bg-background/95 backdrop-blur-md border-b border-border">
      <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
        <Link to="/" className="flex items-center gap-2 min-w-0 group">
          <img src={logoImg} alt="Caderno do Ogã" className="w-8 h-8 rounded-md shrink-0" />
          <span className="font-display text-sm sm:text-base font-bold uppercase tracking-wide text-foreground truncate group-hover:text-accent transition-colors">
            Caderno do Ogã
          </span>
        </Link>

        {isLoggedIn ? (
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent/15 hover:bg-accent/25 text-accent border border-accent/30 text-xs font-bold uppercase tracking-wide transition-all active:scale-95"
          >
            <LayoutGrid size={14} />
            <span className="hidden sm:inline">Meu caderno</span>
            <span className="sm:hidden">Caderno</span>
          </Link>
        ) : (
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent hover:bg-accent/90 text-accent-foreground text-xs font-bold uppercase tracking-wide transition-all active:scale-95"
          >
            <LogIn size={14} />
            Entrar
          </Link>
        )}
      </div>
    </header>
  );
}
