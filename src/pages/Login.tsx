import { useState } from "react";
import { Navigate } from "react-router-dom";
import { Shield, Eye, ArrowLeft, Mail, Lock, UserPlus, LogIn, Loader2, Instagram, Heart } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { ThemeToggle } from "@/components/ThemeToggle";
import logoImg from "@/assets/logo.png";

type Mode = null | "viewer" | "signin" | "signup";

const FRASES = [
  "“Onde há fé, há axé.”",
  "“Salve a força dos guias e dos orixás.”",
  "“O ogã guarda o ritmo, o ritmo guarda o terreiro.”",
  "“Atotô, Saravá, Okê Arô — a gira começa com fé.”",
];

const Login = () => {
  const { isLoggedIn, loginViewer, signIn, signUp } = useAuth();
  const [mode, setMode] = useState<Mode>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [viewerPassword, setViewerPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [frase] = useState(() => FRASES[Math.floor(Math.random() * FRASES.length)]);

  if (isLoggedIn) return <Navigate to="/" replace />;

  const handleViewerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const ok = loginViewer(viewerPassword);
    if (!ok) {
      toast.error("Senha incorreta");
      setViewerPassword("");
    } else {
      toast.success("Modo visualização ativado");
    }
  };

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
      toast.success("Bem-vindo, Ogã 🪘");
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("A senha precisa ter no mínimo 6 caracteres");
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
        description: "Verifique seu e-mail para confirmar o cadastro.",
        duration: 6000,
      });
      setMode("signin");
      setPassword("");
    } else {
      toast.success("Conta criada e login efetuado!");
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center px-4 py-8 overflow-hidden">
      {/* Fundo desfocado em camadas */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/90 to-accent/40" />
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-0 -left-20 w-[28rem] h-[28rem] rounded-full bg-accent/40 blur-[120px]" />
        <div className="absolute bottom-0 -right-20 w-[32rem] h-[32rem] rounded-full bg-primary-foreground/20 blur-[140px]" />
        <div className="absolute top-1/3 left-1/2 w-[24rem] h-[24rem] rounded-full bg-accent/30 blur-[120px] -translate-x-1/2" />
      </div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,_hsl(var(--primary-foreground))_1px,_transparent_0)] [background-size:32px_32px] opacity-[0.04]" />

      {/* Toggle de tema */}
      <div className="absolute top-5 right-5 z-10">
        <ThemeToggle variant="login" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Header */}
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

        {/* Card */}
        <div className="bg-card/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-primary-foreground/10 p-6 sm:p-7">
          {mode === null && (
            <div className="space-y-3">
              <button
                onClick={() => setMode("signin")}
                className="w-full text-left p-4 rounded-2xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground hover:shadow-lg transition-all active:scale-[0.98] flex items-center gap-4 shadow-md"
              >
                <div className="w-12 h-12 rounded-xl bg-primary-foreground/15 flex items-center justify-center shrink-0">
                  <Shield size={22} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-display font-bold text-base uppercase">Acesso Admin</div>
                  <div className="text-xs opacity-80 mt-0.5">Entre com sua conta para gerenciar</div>
                </div>
              </button>

              <button
                onClick={() => setMode("signup")}
                className="w-full text-left p-4 rounded-2xl bg-accent/15 hover:bg-accent/25 transition-all active:scale-[0.98] flex items-center gap-4 border border-accent/30"
              >
                <div className="w-12 h-12 rounded-xl bg-accent/25 flex items-center justify-center shrink-0">
                  <UserPlus size={22} className="text-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-display font-bold text-base text-card-foreground uppercase">Criar Conta</div>
                  <div className="text-xs text-muted-foreground mt-0.5">Cadastre-se com confirmação por e-mail</div>
                </div>
              </button>

              <div className="relative my-2 flex items-center gap-3">
                <div className="flex-1 h-px bg-border" />
                <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">ou</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              <button
                onClick={() => setMode("viewer")}
                className="w-full text-left p-4 rounded-2xl bg-muted hover:bg-muted/80 transition-all active:scale-[0.98] flex items-center gap-4"
              >
                <div className="w-12 h-12 rounded-xl bg-background flex items-center justify-center shrink-0">
                  <Eye size={22} className="text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-display font-bold text-base text-card-foreground uppercase">Apenas Visualizar</div>
                  <div className="text-xs text-muted-foreground mt-0.5">Ler, buscar, favoritar e ouvir</div>
                </div>
              </button>
            </div>
          )}

          {mode === "viewer" && (
            <form onSubmit={handleViewerSubmit} className="space-y-4">
              <BackButton onClick={() => { setMode(null); setViewerPassword(""); }} />
              <Header icon={<Eye size={22} className="text-muted-foreground" />} title="Apenas Visualizar" />
              <Field
                icon={<Lock size={16} />}
                label="Senha de visitante"
                type="password"
                value={viewerPassword}
                onChange={setViewerPassword}
                placeholder="DIGITE A SENHA"
                autoFocus
              />
              <SubmitButton label="Entrar" />
            </form>
          )}

          {mode === "signin" && (
            <form onSubmit={handleSignIn} className="space-y-4">
              <BackButton onClick={() => { setMode(null); setEmail(""); setPassword(""); }} />
              <Header icon={<Shield size={22} className="text-accent" />} title="Acesso Admin" />
              <Field icon={<Mail size={16} />} label="E-mail" type="email" value={email} onChange={setEmail} placeholder="seu@email.com" autoFocus />
              <Field icon={<Lock size={16} />} label="Senha" type="password" value={password} onChange={setPassword} placeholder="••••••••" />
              <SubmitButton label="Entrar" busy={busy} icon={<LogIn size={16} />} />
              <button
                type="button"
                onClick={() => { setMode("signup"); setPassword(""); }}
                className="block w-full text-center text-xs text-muted-foreground hover:text-foreground mt-1"
              >
                Não tem conta? <span className="font-bold text-accent">Cadastre-se</span>
              </button>
            </form>
          )}

          {mode === "signup" && (
            <form onSubmit={handleSignUp} className="space-y-4">
              <BackButton onClick={() => { setMode(null); setEmail(""); setPassword(""); }} />
              <Header icon={<UserPlus size={22} className="text-accent" />} title="Criar Conta" />
              <Field icon={<Mail size={16} />} label="E-mail" type="email" value={email} onChange={setEmail} placeholder="seu@email.com" autoFocus />
              <Field icon={<Lock size={16} />} label="Senha" type="password" value={password} onChange={setPassword} placeholder="MÍNIMO 6 CARACTERES" />
              <p className="text-[11px] text-muted-foreground -mt-2">
                Você receberá um e-mail de confirmação para ativar sua conta.
              </p>
              <SubmitButton label="Criar conta" busy={busy} icon={<UserPlus size={16} />} />
              <button
                type="button"
                onClick={() => { setMode("signin"); setPassword(""); }}
                className="block w-full text-center text-xs text-muted-foreground hover:text-foreground mt-1"
              >
                Já tem conta? <span className="font-bold text-accent">Entrar</span>
              </button>
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

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground uppercase"
    >
      <ArrowLeft size={14} /> Voltar
    </button>
  );
}

function Header({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-3">
      {icon}
      <h2 className="font-display font-bold text-lg text-card-foreground uppercase">{title}</h2>
    </div>
  );
}

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
