import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useCategorias } from "@/contexts/CategoriasContext";
import {
  TOQUE_OPTIONS,
  CLASSIFICACAO_OPTIONS,
  type Ponto,
  type PontoInput,
  type ToqueTipo,
  type Classificacao,
} from "@/contexts/PontosContext";
import { X, Check } from "lucide-react";

interface PontoFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (ponto: PontoInput) => void | Promise<void>;
  ponto?: Ponto | null;
  defaultCategoria?: string;
  defaultSubcategoria?: string;
}

export function PontoFormDialog({ open, onClose, onSave, ponto, defaultCategoria, defaultSubcategoria }: PontoFormDialogProps) {
  const { categorias } = useCategorias();
  const [nome, setNome] = useState("");
  const [categoria, setCategoria] = useState("");
  const [subcategorias, setSubcategorias] = useState<string[]>([]);
  const [classificacoes, setClassificacoes] = useState<Classificacao[]>([]);
  const [letra, setLetra] = useState("");
  const [audio, setAudio] = useState("");
  const [puxador, setPuxador] = useState("");
  const [toque, setToque] = useState<ToqueTipo | "">("");

  useEffect(() => {
    if (ponto) {
      setNome(ponto.nome);
      setCategoria(ponto.categoria);
      setSubcategorias(ponto.subcategorias);
      setClassificacoes(ponto.classificacoes);
      setLetra(ponto.letra);
      setAudio(ponto.audio);
      setPuxador(ponto.puxador);
      setToque(ponto.toque ?? "");
    } else {
      setNome("");
      setCategoria(defaultCategoria || "");
      setSubcategorias(defaultSubcategoria ? [defaultSubcategoria] : []);
      setClassificacoes([]);
      setLetra("");
      setAudio("");
      setPuxador("");
      setToque("");
    }
  }, [ponto, open, defaultCategoria, defaultSubcategoria]);

  const subOptions = categorias.find((c) => c.nome === categoria)?.filhos ?? [];

  const toggleSub = (nome: string) => {
    setSubcategorias((prev) =>
      prev.includes(nome) ? prev.filter((s) => s !== nome) : [...prev, nome]
    );
  };

  const toggleClassif = (c: Classificacao) => {
    setClassificacoes((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !letra.trim() || !categoria) return;
    await onSave({
      ...(ponto ? { id: ponto.id } : {}),
      nome: nome.trim(),
      categoria,
      subcategorias,
      classificacoes,
      letra: letra.toUpperCase(),
      audio: audio.trim(),
      puxador: puxador.trim(),
      toque: toque || null,
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-lg">
            {ponto ? "Editar Ponto" : "Novo Ponto"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
              Nome do Ponto
            </label>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-muted text-foreground text-sm outline-none focus:ring-2 focus:ring-accent/50 border border-border"
              placeholder="Ex: Ogum de Ronda"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
              Categoria
            </label>
            <select
              value={categoria}
              onChange={(e) => { setCategoria(e.target.value); setSubcategorias([]); }}
              className="w-full px-3 py-3 rounded-xl bg-muted text-foreground text-sm outline-none focus:ring-2 focus:ring-accent/50 border border-border"
              required
            >
              <option value="">Selecione...</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.nome}>{c.emoji} {c.nome}</option>
              ))}
            </select>
          </div>

          {subOptions.length > 0 && (
            <div>
              <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                Subcategorias <span className="normal-case text-muted-foreground/70 font-normal">(pode escolher mais de uma)</span>
              </label>
              <div className="flex flex-wrap gap-2 p-2 rounded-xl bg-muted/40 border border-border">
                {subOptions.map((s) => {
                  const active = subcategorias.includes(s.nome);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => toggleSub(s.nome)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all active:scale-95 ${
                        active
                          ? "bg-accent text-accent-foreground shadow-sm"
                          : "bg-background text-foreground/70 border border-border hover:border-accent/50"
                      }`}
                    >
                      {active ? <Check size={12} /> : null}
                      <span>{s.emoji} {s.nome}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
              Classificação <span className="normal-case text-muted-foreground/70 font-normal">(opcional, pode escolher mais de uma)</span>
            </label>
            <div className="flex flex-wrap gap-2 p-2 rounded-xl bg-muted/40 border border-border">
              {CLASSIFICACAO_OPTIONS.map((c) => {
                const active = classificacoes.includes(c.value);
                return (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => toggleClassif(c.value)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all active:scale-95 ${
                      active
                        ? "bg-accent text-accent-foreground shadow-sm"
                        : "bg-background text-foreground/70 border border-border hover:border-accent/50"
                    }`}
                  >
                    {active && <Check size={12} />}
                    <span>{c.emoji} {c.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
              Tipo de Toque
            </label>
            <div className="flex flex-wrap gap-2 p-2 rounded-xl bg-muted/40 border border-border">
              <button
                type="button"
                onClick={() => setToque("")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all active:scale-95 ${
                  toque === ""
                    ? "bg-accent text-accent-foreground shadow-sm"
                    : "bg-background text-foreground/70 border border-border hover:border-accent/50"
                }`}
              >
                — Não definido
              </button>
              {TOQUE_OPTIONS.map((t) => {
                const active = toque === t.value;
                return (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setToque(t.value)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all active:scale-95 ${
                      active
                        ? "bg-accent text-accent-foreground shadow-sm"
                        : "bg-background text-foreground/70 border border-border hover:border-accent/50"
                    }`}
                  >
                    {active && <Check size={12} />}
                    <span>🪘 {t.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
              Letra do Ponto
            </label>
            <textarea
              value={letra}
              onChange={(e) => setLetra(e.target.value.toUpperCase())}
              rows={8}
              className="w-full px-4 py-3 rounded-xl bg-muted text-foreground text-sm outline-none focus:ring-2 focus:ring-accent/50 border border-border font-mono leading-relaxed uppercase"
              placeholder="DIGITE A LETRA DO PONTO AQUI..."
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
              Quem puxa o ponto (opcional)
            </label>
            <input
              type="text"
              value={puxador}
              onChange={(e) => setPuxador(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-muted text-foreground text-sm outline-none focus:ring-2 focus:ring-accent/50 border border-border"
              placeholder="Ex: Pai João, Mãe Maria, Ogã Pedro..."
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
              Link do YouTube ou Spotify (opcional)
            </label>
            <input
              type="text"
              value={audio}
              onChange={(e) => setAudio(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-muted text-foreground text-sm outline-none focus:ring-2 focus:ring-accent/50 border border-border"
              placeholder="https://youtube.com/... ou https://open.spotify.com/track/..."
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl text-sm font-bold text-muted-foreground bg-muted hover:bg-muted/80 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <X size={16} /> CANCELAR
            </button>
            <button
              type="submit"
              className="flex-1 py-3 rounded-xl text-sm font-bold text-primary-foreground bg-primary hover:bg-primary/90 transition-all active:scale-[0.98] shadow-sm flex items-center justify-center gap-2"
            >
              <Check size={16} /> {ponto ? "SALVAR" : "ADICIONAR"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
