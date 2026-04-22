import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useCategorias } from "@/contexts/CategoriasContext";
import type { Ponto } from "@/data/pontos";
import { X, Check } from "lucide-react";

interface PontoFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (ponto: Omit<Ponto, "id"> & { id?: string }) => void;
  ponto?: Ponto | null;
  defaultCategoria?: string;
  defaultSubcategoria?: string;
}

export function PontoFormDialog({ open, onClose, onSave, ponto, defaultCategoria, defaultSubcategoria }: PontoFormDialogProps) {
  const { categorias } = useCategorias();
  const [nome, setNome] = useState("");
  const [categoria, setCategoria] = useState("");
  const [subcategorias, setSubcategorias] = useState<string[]>([]);
  const [letra, setLetra] = useState("");
  const [audio, setAudio] = useState("");
  const [puxador, setPuxador] = useState("");

  useEffect(() => {
    if (ponto) {
      setNome(ponto.nome);
      setCategoria(ponto.categoria);
      const subs = ponto.subcategorias && ponto.subcategorias.length > 0
        ? ponto.subcategorias
        : ponto.subcategoria ? [ponto.subcategoria] : [];
      setSubcategorias(subs);
      setLetra(ponto.letra);
      setAudio(ponto.audio);
      setPuxador(ponto.puxador || "");
    } else {
      setNome("");
      setCategoria(defaultCategoria || "");
      setSubcategorias(defaultSubcategoria ? [defaultSubcategoria] : []);
      setLetra("");
      setAudio("");
      setPuxador("");
    }
  }, [ponto, open, defaultCategoria, defaultSubcategoria]);

  const subOptions = categorias.find((c) => c.nome === categoria)?.filhos || [];

  const toggleSub = (nome: string) => {
    setSubcategorias((prev) =>
      prev.includes(nome) ? prev.filter((s) => s !== nome) : [...prev, nome]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !letra.trim() || !categoria) return;
    onSave({
      ...(ponto ? { id: ponto.id } : {}),
      nome: nome.trim(),
      categoria,
      subcategoria: subcategorias[0] || "",
      subcategorias,
      letra: letra.toUpperCase(),
      audio: audio.trim(),
      puxador: puxador.trim(),
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
                <option key={c.nome} value={c.nome}>{c.emoji} {c.nome}</option>
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
                      key={s.nome}
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
              {subcategorias.length > 0 && (
                <p className="text-[11px] text-muted-foreground mt-1.5">
                  Aparecerá em: {subcategorias.join(", ")}
                </p>
              )}
            </div>
          )}

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
            <p className="text-[11px] text-muted-foreground/70 mt-1.5">
              Cole o link do YouTube ou Spotify. Toca dentro do app, sem sair da gira.
            </p>
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
