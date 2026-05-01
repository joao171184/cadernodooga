import { useState } from "react";
import { ArrowLeft, Check, X, Loader2, Inbox, Mic2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { usePontos } from "@/contexts/PontosContext";
import { toast } from "sonner";

const Pendentes = () => {
  const navigate = useNavigate();
  const { isAdmin, loading: authLoading } = useAuth();
  const { pendentes, loading, approvePonto, rejectPonto } = usePontos();
  const [busy, setBusy] = useState<string | null>(null);

  if (authLoading) return null;
  if (!isAdmin) {
    navigate("/", { replace: true });
    return null;
  }

  const handleApprove = async (id: string) => {
    setBusy(id);
    await approvePonto(id);
    setBusy(null);
    toast.success("Ponto aprovado");
  };

  const handleReject = async (id: string) => {
    if (!window.confirm("Rejeitar este ponto? Ele será apagado.")) return;
    setBusy(id);
    await rejectPonto(id);
    setBusy(null);
    toast.success("Ponto rejeitado");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-10 bg-primary shadow-xl">
        <div className="px-3 sm:px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate("/")}
            className="p-2 rounded-xl text-primary-foreground hover:bg-primary-foreground/10"
            aria-label="Voltar"
          >
            <ArrowLeft size={20} />
          </button>
          <Inbox size={20} className="text-primary-foreground" />
          <h1 className="flex-1 font-display text-lg font-bold text-primary-foreground uppercase">
            Pontos Pendentes
          </h1>
          <span className="text-xs font-bold text-primary-foreground/80 px-2 py-1 rounded-md bg-primary-foreground/10">
            {pendentes.length}
          </span>
        </div>
      </header>

      <main className="flex-1 px-3 sm:px-4 py-5 max-w-2xl mx-auto w-full pb-16">
        {loading ? (
          <div className="text-center py-16 text-muted-foreground">
            <Loader2 size={32} className="mx-auto animate-spin opacity-60" />
          </div>
        ) : pendentes.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Inbox size={44} className="mx-auto mb-4 opacity-20" />
            <p className="text-base font-medium uppercase">Nenhum ponto pendente</p>
            <p className="text-sm mt-1 opacity-70">Tudo em dia! 🎉</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pendentes.map((p) => (
              <div key={p.id} className="bg-card rounded-2xl border border-border shadow-sm p-4 sm:p-5">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-display text-base sm:text-lg font-bold uppercase">{p.nome}</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {p.categoria}{p.subcategorias.length > 0 ? ` › ${p.subcategorias.join(" • ")}` : ""}
                    </p>
                    {p.puxador && (
                      <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
                        <Mic2 size={12} className="text-accent" />
                        <span className="font-semibold uppercase">Puxa:</span>
                        <span>{p.puxador}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="relative mb-4">
                  <div className="absolute left-0 top-0 bottom-0 w-1 rounded-full bg-amber-500/40" />
                  <pre className="text-sm whitespace-pre-wrap font-[inherit] leading-relaxed pl-4 uppercase text-card-foreground/80">
                    {p.letra}
                  </pre>
                </div>
                <div className="flex gap-2">
                  <button
                    disabled={busy === p.id}
                    onClick={() => handleReject(p.id)}
                    className="flex-1 py-2.5 rounded-xl text-xs font-bold uppercase bg-destructive/10 text-destructive hover:bg-destructive/20 active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <X size={14} /> Rejeitar
                  </button>
                  <button
                    disabled={busy === p.id}
                    onClick={() => handleApprove(p.id)}
                    className="flex-1 py-2.5 rounded-xl text-xs font-bold uppercase bg-primary text-primary-foreground active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {busy === p.id ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                    Aprovar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Pendentes;
