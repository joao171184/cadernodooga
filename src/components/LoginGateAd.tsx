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

  const [seen, setSeen] = useState(false);
  useEffect(() => {
    if (loading || isLoggedIn || onLogin) { setOpen(false); return; }
    if (seen) return;
    const t = setTimeout(() => { setOpen(true); setLeft(SKIP_SECONDS); setSeen(true); }, SHOW_AFTER_MS);
    return () => clearTimeout(t);
  }, [loading, isLoggedIn, onLogin, seen]);

  useEffect(() => {
    if (!open || left <= 0) return;
    const t = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [open, left]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-background/40 backdrop-blur-md p-6" role="dialog" aria-modal="true">
      <div className="relative w-full max-w-[320px] aspect-[3/4.6] max-h-[85vh] flex flex-col items-center justify-center gap-5 text-center rounded-3xl border border-border bg-card shadow-2xl p-6">
        <button
          onClick={() => left <= 0 && setOpen(false)}
          disabled={left > 0}
          className="absolute top-3 right-3 inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-muted text-foreground text-xs font-bold uppercase disabled:opacity-60"
          aria-label="Pular anúncio"
        >
          {left > 0 ? `Pular em ${left}s` : <>Pular <X size={14} /></>}
        </button>
        <div className="w-16 h-16 rounded-full bg-accent/15 flex items-center justify-center">
          <Lock size={30} className="text-accent" />
        </div>
        <h2 className="font-display text-xl font-bold uppercase text-foreground">Quer ter uma imersão completa?</h2>
        <p className="text-sm text-muted-foreground uppercase leading-relaxed">
          Ver os pontos inteiros, favoritar pontos e muito mais — grátis. É só fazer o login!
        </p>
        <button
          onClick={() => { setOpen(false); navigate("/login"); }}
          className="w-full py-3 rounded-2xl bg-accent text-accent-foreground text-base font-bold uppercase shadow-lg active:scale-95"
        >
          Fazer login
        </button>
      </div>
    </div>
  );
}
