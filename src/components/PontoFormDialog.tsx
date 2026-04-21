import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useCategorias } from "@/contexts/CategoriasContext";
import type { Ponto } from "@/data/pontos";

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
  const [subcategoria, setSubcategoria] = useState("");
  const [letra, setLetra] = useState("");
  const [audio, setAudio] = useState("");

  useEffect(() => {
    if (ponto) {
      setNome(ponto.nome);
      setCategoria(ponto.categoria);
      setSubcategoria(ponto.subcategoria);
      setLetra(ponto.letra);
      setAudio(ponto.audio);
    } else {
      setNome("");
      setCategoria(defaultCategoria || "");
      setSubcategoria(defaultSubcategoria || "");
      setLetra("");
      setAudio("");
    }
  }, [ponto, open, defaultCategoria, defaultSubcategoria]);

  const subcategorias = categorias.find((c) => c.nome === categoria)?.filhos || [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !letra.trim() || !categoria) return;
    onSave({
      ...(ponto ? { id: ponto.id } : {}),
      nome: nome.trim(),
      categoria,
      subcategoria,
      letra: letra.toUpperCase(),
      audio: audio.trim(),
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                Categoria
              </label>
              <select
                value={categoria}
                onChange={(e) => { setCategoria(e.target.value); setSubcategoria(""); }}
                className="w-full px-3 py-3 rounded-xl bg-muted text-foreground text-sm outline-none focus:ring-2 focus:ring-accent/50 border border-border"
                required
              >
                <option value="">Selecione...</option>
                {categorias.map((c) => (
                  <option key={c.nome} value={c.nome}>{c.emoji} {c.nome}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                Subcategoria
              </label>
              <select
                value={subcategoria}
                onChange={(e) => setSubcategoria(e.target.value)}
                className="w-full px-3 py-3 rounded-xl bg-muted text-foreground text-sm outline-none focus:ring-2 focus:ring-accent/50 border border-border"
                disabled={subcategorias.length === 0}
              >
                <option value="">
                  {subcategorias.length === 0 ? "N/A" : "Selecione..."}
                </option>
                {subcategorias.map((s) => (
                  <option key={s.nome} value={s.nome}>{s.emoji} {s.nome}</option>
                ))}
              </select>
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
              className="flex-1 py-3 rounded-xl text-sm font-bold text-muted-foreground bg-muted hover:bg-muted/80 transition-all active:scale-[0.98]"
            >
              CANCELAR
            </button>
            <button
              type="submit"
              className="flex-1 py-3 rounded-xl text-sm font-bold text-primary-foreground bg-primary hover:bg-primary/90 transition-all active:scale-[0.98] shadow-sm"
            >
              {ponto ? "SALVAR" : "ADICIONAR"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
