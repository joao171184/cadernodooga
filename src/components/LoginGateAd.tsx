import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Lock, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const SHOW_AFTER_MS = 5000;
const SKIP_SECONDS = 5;

/** Anúncio em tela cheia para visitantes sem login, 5s após entrar no site. */
export function LoginGateAd() {
  const { isLoggedIn, loading } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [left, setLeft] = useState(SKIP_SECONDS);
  const onLogin = pathname.startsWith("/login");

  useEffect(() => {
    if (loading || isLoggedIn || onLogin) { setOpen(false); return; }
    if (sessionStorage.getItem("login-gate-seen")) return;
    const t = setTimeout(() => { setOpen(true); setLeft(SKIP_SECONDS); sessionStorage.setItem("login-gate-seen", "1"); }, SHOW_AFTER_MS);
    return () => clearTimeout(t);
  }, [loading, isLoggedIn, onLogin]);

  useEffect(() => {
    if (!open || left <= 0) return;
    const t = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [open, left]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-background/95 backdrop-blur-md p-6" role="dialog" aria-modal="true">
      <button
        onClick={() => left <= 0 && setOpen(false)}
        disabled={left > 0}
        className="absolute top-4 right-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted text-foreground text-sm font-bold uppercase disabled:opacity-60"
        aria-label="Pular anúncio"
      >
        {left > 0 ? `Pular em ${left}s` : <>Pular <X size={16} /></>}
      </button>
      <div className="max-w-md text-center space-y-6">
        <div className="mx-auto w-20 h-20 rounded-full bg-accent/15 flex items-center justify-center">
          <Lock size={36} className="text-accent" />
        </div>
        <h2 className="font-display text-2xl sm:text-3xl font-bold uppercase text-foreground">Veja os pontos inteiros</h2>
        <p className="text-base sm:text-lg text-muted-foreground uppercase">
          Faça login e veja todos os pontos completos gratuitamente. É só entrar!
        </p>
        <button
          onClick={() => { setOpen(false); navigate("/login"); }}
          className="w-full py-4 rounded-2xl bg-accent text-accent-foreground text-lg font-bold uppercase shadow-lg active:scale-95"
        >
          Entrar grátis
        </button>
      </div>
    </div>
  );
}
