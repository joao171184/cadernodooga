import { useState } from "react";
import { Navigate } from "react-router-dom";
import { Shield, Eye, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

type Intent = "admin" | "viewer" | null;

const Login = () => {
  const { isLoggedIn, login } = useAuth();
  const [intent, setIntent] = useState<Intent>(null);
  const [password, setPassword] = useState("");

  if (isLoggedIn) return <Navigate to="/" replace />;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!intent) return;
    const ok = login(password, intent);
    if (!ok) {
      toast.error("Senha incorreta", { description: "Verifique a senha e tente novamente." });
      setPassword("");
    } else {
      toast.success(intent === "admin" ? "Bem-vindo, Administrador" : "Modo visualização ativado");
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-primary via-primary to-primary/80 px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-6xl mb-3">🪘</div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-primary-foreground tracking-tight">
            Caderno do Ogã
          </h1>
          <p className="text-sm text-primary-foreground/70 mt-2 uppercase tracking-widest">
            Pontos Cantados • Axé 🙏
          </p>
        </div>

        {intent === null ? (
          <div className="space-y-3">
            <button
              onClick={() => setIntent("admin")}
              className="w-full text-left p-5 rounded-2xl bg-card hover:bg-card/90 shadow-xl transition-all active:scale-[0.98] flex items-center gap-4"
            >
              <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center shrink-0">
                <Shield className="text-accent" size={24} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-display font-bold text-card-foreground uppercase">Acesso Admin</div>
                <div className="text-xs text-muted-foreground mt-0.5">Gerenciar pontos e categorias</div>
              </div>
            </button>

            <button
              onClick={() => setIntent("viewer")}
              className="w-full text-left p-5 rounded-2xl bg-card hover:bg-card/90 shadow-xl transition-all active:scale-[0.98] flex items-center gap-4"
            >
              <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center shrink-0">
                <Eye className="text-muted-foreground" size={24} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-display font-bold text-card-foreground uppercase">Apenas Visualizar</div>
                <div className="text-xs text-muted-foreground mt-0.5">Ler, buscar, favoritar e ouvir</div>
              </div>
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-card rounded-2xl shadow-xl p-6 space-y-4">
            <button
              type="button"
              onClick={() => { setIntent(null); setPassword(""); }}
              className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground uppercase"
            >
              <ArrowLeft size={14} />
              Voltar
            </button>
            <div className="flex items-center gap-3">
              {intent === "admin" ? (
                <Shield className="text-accent" size={22} />
              ) : (
                <Eye className="text-muted-foreground" size={22} />
              )}
              <h2 className="font-display font-bold text-lg text-card-foreground uppercase">
                {intent === "admin" ? "Acesso Admin" : "Apenas Visualizar"}
              </h2>
            </div>
            <div>
              <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                Senha
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-muted text-foreground text-sm outline-none focus:ring-2 focus:ring-accent/50 border border-border"
                placeholder="DIGITE A SENHA"
                autoFocus
                required
              />
            </div>
            <button
              type="submit"
              className="w-full py-3 rounded-xl text-sm font-bold text-primary-foreground bg-primary hover:bg-primary/90 transition-all active:scale-[0.98] uppercase"
            >
              Entrar
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default Login;
