import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [pwd, setPwd] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // O Supabase processa o hash de recovery automaticamente; aguarda sessão.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwd.length < 6) return toast.error("Mínimo 6 caracteres");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pwd });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Senha redefinida!");
    navigate("/", { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <form onSubmit={submit} className="w-full max-w-sm bg-card rounded-2xl border border-border p-6 space-y-4">
        <h1 className="font-display text-xl font-bold uppercase">Nova senha</h1>
        {!ready ? (
          <p className="text-sm text-muted-foreground">Validando link…</p>
        ) : (
          <>
            <div className="relative">
              <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="password"
                value={pwd}
                onChange={(e) => setPwd(e.target.value)}
                placeholder="Nova senha"
                required
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-muted text-foreground text-sm border border-border outline-none focus:ring-2 focus:ring-accent/50"
              />
            </div>
            <button disabled={busy} className="w-full py-3 rounded-xl bg-primary text-primary-foreground text-sm font-bold uppercase flex items-center justify-center gap-2 disabled:opacity-60">
              {busy && <Loader2 size={14} className="animate-spin" />} Redefinir
            </button>
          </>
        )}
      </form>
    </div>
  );
}
