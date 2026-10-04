import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, MailCheck } from "lucide-react";
import { toast } from "sonner";
import type { EmailOtpType } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { translateAuthError } from "@/lib/authErrors";
import { RECOVERY_FLAG_KEY, parseConfirmParams, type ParsedConfirmLink } from "@/lib/authConfirm";

const LABELS: Partial<Record<EmailOtpType, { title: string; button: string }>> = {
  signup: { title: "Confirmar seu e-mail", button: "Confirmar e-mail" },
  recovery: { title: "Redefinir sua senha", button: "Continuar" },
  email_change: { title: "Confirmar troca de e-mail", button: "Confirmar troca" },
};

/**
 * Página de destino dos links enviados por e-mail. O token só é usado quando a pessoa
 * clica no botão, para que scanners de links em e-mails não consumam o link.
 */
export default function AuthConfirm() {
  const navigate = useNavigate();
  const [link] = useState<ParsedConfirmLink | null>(() => parseConfirmParams(window.location.search));
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    // Remove o token da barra de endereço/histórico assim que ele é lido.
    if (window.location.search) window.history.replaceState(null, "", window.location.pathname);
  }, []);

  const confirm = async () => {
    if (!link || busy) return;
    setBusy(true);
    const { error } = await supabase.auth.verifyOtp({ token_hash: link.tokenHash, type: link.type });
    setBusy(false);
    if (error) {
      setFailed(true);
      toast.error(translateAuthError(error.message) ?? "Link inválido ou expirado");
      return;
    }
    if (link.type === "recovery") {
      sessionStorage.setItem(RECOVERY_FLAG_KEY, "1");
      navigate("/reset-password", { replace: true });
      return;
    }
    toast.success(link.type === "signup" ? "E-mail confirmado! 🪘" : "Confirmado!");
    navigate(link.next, { replace: true });
  };

  const labels = (link && LABELS[link.type]) ?? { title: "Confirmar acesso", button: "Continuar" };
  const invalid = !link || failed;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm bg-card rounded-2xl border border-border p-6 space-y-4 text-center">
        <MailCheck className="mx-auto text-accent" size={36} />
        {invalid ? (
          <>
            <h1 className="font-display text-xl font-bold uppercase">Link inválido ou expirado</h1>
            <p className="text-sm text-muted-foreground">
              Este link não é mais válido. Ele pode ter expirado ou já ter sido usado. Solicite um novo na tela de login.
            </p>
            <button
              onClick={() => navigate("/login", { replace: true })}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground text-sm font-bold uppercase"
            >
              Ir para o login
            </button>
          </>
        ) : (
          <>
            <h1 className="font-display text-xl font-bold uppercase">{labels.title}</h1>
            <p className="text-sm text-muted-foreground">Clique no botão abaixo para concluir.</p>
            <button
              onClick={confirm}
              disabled={busy}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground text-sm font-bold uppercase flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {busy && <Loader2 size={14} className="animate-spin" />} {labels.button}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
