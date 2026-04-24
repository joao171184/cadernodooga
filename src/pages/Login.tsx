import { useState } from "react";
import { Navigate } from "react-router-dom";
import { Mail, Lock, UserPlus, LogIn, Loader2, Instagram, Heart, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { ThemeToggle } from "@/components/ThemeToggle";
import logoImg from "@/assets/logo.png";

type Mode = "signin" | "signup";

const FRASES = [
  "“Onde há fé, há axé.”",
  "“Salve a força dos guias e dos orixás.”",
  "“O ogã guarda o ritmo, o ritmo guarda o terreiro.”",
  "“Atotô, Saravá, Okê Arô — a gira começa com fé.”",
];

const Login = () => {
  const { isLoggedIn, signIn, signUp } = useAuth();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [showPwd2, setShowPwd2] = useState(false);
  const [busy, setBusy] = useState(false);
  const [frase] = useState(() => FRASES[Math.floor(Math.random() * FRASES.length)]);

  if (isLoggedIn) return <Navigate to="/" replace />;

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await signIn(email.trim(), password);
    setBusy(false);
    if (error) {
      const msg = error.toLowerCase().includes("invalid")
        ? "E-mail ou senha incorretos"
        : error.toLowerCase().includes("not confirmed")
        ? "Confirme seu e-mail antes de entrar"
        : error;
      toast.error(msg);
    } else {
      toast.success("Bem-vindo 🪘");
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("A senha precisa ter no mínimo 6 caracteres");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("As senhas não coincidem");
      return;
    }
    setBusy(true);
    const { error, needsConfirm } = await signUp(email.trim(), password);
    setBusy(false);
    if (error) {
      const msg = error.toLowerCase().includes("registered")
        ? "Este e-mail já está cadastrado"
        : error;
      toast.error(msg);
      return;
    }
    if (needsConfirm) {
      toast.success("Conta criada!", {
        description: "Enviamos um e-mail de confirmação. Confirme para poder entrar.",
      });
      setMode("signin");
      setPassword("");
      setConfirmPassword("");
    } else {
      toast.success("Conta criada e login efetuado!");
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center px-4 py-8 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/90 to-accent/40" />
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-0 -left-20 w-[28rem] h-[28rem] rounded-full bg-accent/40 blur-[120px]" />
        <div className="absolute bottom-0 -right-20 w-[32rem] h-[32rem] rounded-full bg-primary-foreground/20 blur-[140px]" />
        <div className="absolute top-1/3 left-1/2 w-[24rem] h-[24rem] rounded-full bg-accent/30 blur-[120px] -translate-x-1/2" />
      </div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,_hsl(var(--primary-foreground))_1px,_transparent_0)] [background-size:32px_32px] opacity-[0.04]" />

      <div className="absolute top-5 right-5 z-10">
        <ThemeToggle variant="login" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-28 h-28 rounded-3xl bg-primary-foreground/10 backdrop-blur-md border border-primary-foreground/20 mb-4 shadow-2xl overflow-hidden p-2">
            <img src={logoImg} alt="Caderno do Ogã" className="w-full h-full object-contain" />
          </div>
          <h1 className="font-display text-4xl sm:text-5xl font-bold text-primary-foreground tracking-tight drop-shadow-lg">
            Caderno do Ogã
          </h1>
          <p className="text-xs text-primary-foreground/60 mt-2 uppercase tracking-[0.3em] font-semibold">
            Pontos Cantados • Axé
          </p>
          <p className="text-sm text-primary-foreground/80 mt-5 italic font-display max-w-sm mx-auto">
            {frase}
          </p>
        </div>

        <div className="bg-card/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-primary-foreground/10 p-6 sm:p-7">
          {/* Tabs */}
          <div className="flex gap-1 p-1 rounded-xl bg-muted mb-5">
            <button
              type="button"
              onClick={() => setMode("signin")}
              className={`flex-1 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                mode === "signin"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <LogIn size={14} /> Login
            </button>
            <button
              type="button"
              onClick={() => setMode("signup")}
              className={`flex-1 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                mode === "signup"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <UserPlus size={14} /> Criar Conta
            </button>
          </div>

          {mode === "signin" ? (
            <form onSubmit={handleSignIn} className="space-y-4">
              <Field icon={<Mail size={16} />} label="E-mail" type="email" value={email} onChange={setEmail} placeholder="seu@email.com" autoFocus />
              <PasswordField label="Senha" value={password} onChange={setPassword} show={showPwd} onToggle={() => setShowPwd((s) => !s)} placeholder="••••••••" />
              <SubmitButton label="Entrar" busy={busy} icon={<LogIn size={16} />} />
            </form>
          ) : (
            <form onSubmit={handleSignUp} className="space-y-4">
              <Field icon={<Mail size={16} />} label="E-mail" type="email" value={email} onChange={setEmail} placeholder="seu@email.com" autoFocus />
              <PasswordField label="Senha" value={password} onChange={setPassword} show={showPwd} onToggle={() => setShowPwd((s) => !s)} placeholder="MÍNIMO 6 CARACTERES" />
              <PasswordField label="Confirmar senha" value={confirmPassword} onChange={setConfirmPassword} show={showPwd2} onToggle={() => setShowPwd2((s) => !s)} placeholder="REPITA A SENHA" />
              <SubmitButton label="Criar conta" busy={busy} icon={<UserPlus size={16} />} />
            </form>
          )}
        </div>

        <div className="mt-6 flex flex-col items-center gap-2">
          <p className="text-[10px] text-primary-foreground/50 uppercase tracking-widest">
            🙏 Que a gira seja firme
          </p>
          <a
            href="https://www.instagram.com/46marques__/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-[11px] text-primary-foreground/70 hover:text-primary-foreground transition-colors"
          >
            Feito com <Heart size={11} className="fill-accent text-accent" /> por João Pedro Marques
            <Instagram size={11} />
          </a>
        </div>
      </div>
    </div>
  );
};

function Field({
  icon, label, type, value, onChange, placeholder, autoFocus,
}: {
  icon: React.ReactNode; label: string; type: string; value: string;
  onChange: (v: string) => void; placeholder?: string; autoFocus?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
        {label}
      </label>
      <div className="relative">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground">{icon}</span>
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          required
          className="w-full pl-10 pr-4 py-3 rounded-xl bg-muted text-foreground text-sm outline-none focus:ring-2 focus:ring-accent/50 border border-border"
        />
      </div>
    </div>
  );
}

function PasswordField({
  label, value, onChange, placeholder, show, onToggle,
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; show: boolean; onToggle: () => void;
}) {
  return (
    <div>
      <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
        {label}
      </label>
      <div className="relative">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground">
          <Lock size={16} />
        </span>
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required
          className="w-full pl-10 pr-11 py-3 rounded-xl bg-muted text-foreground text-sm outline-none focus:ring-2 focus:ring-accent/50 border border-border"
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
    </div>
  );
}

function SubmitButton({ label, busy, icon }: { label: string; busy?: boolean; icon?: React.ReactNode }) {
  return (
    <button
      type="submit"
      disabled={busy}
      className="w-full py-3 rounded-xl text-sm font-bold text-primary-foreground bg-gradient-to-r from-primary to-primary/85 hover:shadow-lg transition-all active:scale-[0.98] uppercase flex items-center justify-center gap-2 disabled:opacity-60 shadow-md"
    >
      {busy ? <Loader2 size={16} className="animate-spin" /> : icon}
      {label}
    </button>
  );
}

export default Login;
