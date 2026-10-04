import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, Loader2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { MIN_PASSWORD_LENGTH, translateAuthError } from "@/lib/authErrors";
import { RECOVERY_FLAG_KEY } from "@/lib/authConfirm";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [pwd, setPwd] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    // Só libera o formulário para uma sessão aberta pelo link de recuperação,
    // nunca para uma sessão comum já logada.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        sessionStorage.setItem(RECOVERY_FLAG_KEY, "1");
        setReady(true);
      }
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session && sessionStorage.getItem(RECOVERY_FLAG_KEY) === "1") setReady(true);
      setChecked(true);
    });
    const t = setTimeout(() => setChecked(true), 3000);
    return () => {
      subscription.unsubscribe();
      clearTimeout(t);
    };
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwd.length < MIN_PASSWORD_LENGTH) {
      return toast.error(
        `A nova senha precisa ter no mínimo ${MIN_PASSWORD_LENGTH} caracteres (senhas antigas mais curtas não são mais aceitas)`,
      );
    }
    if (pwd !== pwd2) return toast.error("As senhas não coincidem");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pwd });
    if (error) {
      setBusy(false);
      return toast.error(translateAuthError(error.message, (error as { code?: string }).code));
    }
    sessionStorage.removeItem(RECOVERY_FLAG_KEY);
    // Encerra as demais sessões abertas com a senha antiga.
    await supabase.auth.signOut({ scope: "others" }).catch(() => {});
    setBusy(false);
    toast.success("Senha redefinida!");
    navigate("/", { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <form onSubmit={submit} className="w-full max-w-sm bg-card rounded-2xl border border-border p-6 space-y-4">
        <h1 className="font-display text-xl font-bold uppercase">Nova senha</h1>
        {!ready ? (
          checked ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Link inválido ou expirado. Solicite um novo link em "Esqueci minha senha" na tela de login.
              </p>
              <button
                type="button"
                onClick={() => navigate("/login", { replace: true })}
                className="w-full py-3 rounded-xl bg-primary text-primary-foreground text-sm font-bold uppercase"
              >
                Ir para o login
              </button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Validando link…</p>
          )
        ) : (
          <>
            <PwdInput value={pwd} onChange={setPwd} placeholder="Nova senha" show={showPwd} onToggle={() => setShowPwd((s) => !s)} />
            <PwdInput value={pwd2} onChange={setPwd2} placeholder="Confirme a nova senha" show={showPwd} onToggle={() => setShowPwd((s) => !s)} />
            <button disabled={busy} className="w-full py-3 rounded-xl bg-primary text-primary-foreground text-sm font-bold uppercase flex items-center justify-center gap-2 disabled:opacity-60">
              {busy && <Loader2 size={14} className="animate-spin" />} Redefinir
            </button>
          </>
        )}
      </form>
    </div>
  );
}

function PwdInput({
  value, onChange, placeholder, show, onToggle,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  show: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="relative">
      <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        autoComplete="new-password"
        maxLength={128}
        required
        className="w-full pl-10 pr-11 py-3 rounded-xl bg-muted text-foreground text-sm border border-border outline-none focus:ring-2 focus:ring-accent/50"
      />
      <button
        type="button"
        onClick={onToggle}
        aria-label={show ? "Ocultar senha" : "Mostrar senha"}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-background/50 transition-all"
      >
        {show ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
}
