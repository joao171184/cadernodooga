import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Check, X, ChevronDown, ChevronRight } from "lucide-react";
import { useCategorias } from "@/contexts/CategoriasContext";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onClose: () => void;
}

const EMOJI_SUGGESTIONS = ["🔱","⚔️","🏹","⚡","🌪️","🌊","🪞","🌙","🩹","☀️","🪶","🕯️","🧸","🤠","⚓","🎶","🌹","😈","🔥","🕊️","🙏","✨","🌿","🦅","🐍","🌟","💫","🪘"];

function EmojiPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-2">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-16 px-2 py-2 rounded-lg bg-muted text-center text-lg outline-none focus:ring-2 focus:ring-accent/50 border border-border"
        maxLength={4}
      />
      <div className="flex flex-wrap gap-1">
        {EMOJI_SUGGESTIONS.map((e) => (
          <button
            key={e}
            type="button"
            onClick={() => onChange(e)}
            className="w-8 h-8 rounded-lg hover:bg-muted transition-all text-base"
          >
            {e}
          </button>
        ))}
      </div>
    </div>
  );
}

export function CategoriasManagerDialog({ open, onClose }: Props) {
  const { categorias, addCategoria, addSubcategoria, renameCategoria, renameSubcategoria, deleteCategoria, deleteSubcategoria } = useCategorias();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [newCatNome, setNewCatNome] = useState("");
  const [newCatEmoji, setNewCatEmoji] = useState("✨");
  const [addSubFor, setAddSubFor] = useState<string | null>(null);
  const [newSubNome, setNewSubNome] = useState("");
  const [newSubEmoji, setNewSubEmoji] = useState("🪶");
  const [editing, setEditing] = useState<{ parent?: string; nome: string } | null>(null);
  const [editNome, setEditNome] = useState("");
  const [editEmoji, setEditEmoji] = useState("");

  const toggle = (n: string) => {
    setExpanded((p) => {
      const s = new Set(p);
      s.has(n) ? s.delete(n) : s.add(n);
      return s;
    });
  };

  const startEdit = (parent: string | undefined, nome: string, emoji: string) => {
    setEditing({ parent, nome });
    setEditNome(nome);
    setEditEmoji(emoji);
  };

  const saveEdit = () => {
    if (!editing || !editNome.trim()) return;
    if (editing.parent) {
      renameSubcategoria(editing.parent, editing.nome, editNome.trim(), editEmoji || "•");
    } else {
      renameCategoria(editing.nome, editNome.trim(), editEmoji || "•");
    }
    setEditing(null);
    toast.success("Atualizado");
  };

  const handleAddCat = () => {
    const n = newCatNome.trim();
    if (!n) return;
    if (categorias.some((c) => c.nome === n)) {
      toast.error("Já existe uma categoria com esse nome");
      return;
    }
    addCategoria(n, newCatEmoji || "•");
    setNewCatNome("");
    setNewCatEmoji("✨");
    toast.success("Categoria criada");
  };

  const handleAddSub = (parent: string) => {
    const n = newSubNome.trim();
    if (!n) return;
    addSubcategoria(parent, n, newSubEmoji || "•");
    setNewSubNome("");
    setNewSubEmoji("🪶");
    setAddSubFor(null);
    toast.success("Subcategoria criada");
  };

  const handleDeleteCat = (nome: string) => {
    if (window.confirm(`Excluir a pasta "${nome}" e todas as suas subpastas? Os pontos não são apagados, mas perdem o vínculo.`)) {
      deleteCategoria(nome);
      toast.success("Categoria excluída");
    }
  };

  const handleDeleteSub = (parent: string, nome: string) => {
    if (window.confirm(`Excluir a subpasta "${nome}"?`)) {
      deleteSubcategoria(parent, nome);
      toast.success("Subcategoria excluída");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-lg uppercase">Painel de Categorias</DialogTitle>
        </DialogHeader>

        {/* Add new top-level */}
        <div className="rounded-xl border border-dashed border-border p-3 space-y-3">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Nova categoria</p>
          <div className="flex gap-2 items-start">
            <div>
              <EmojiPicker value={newCatEmoji} onChange={setNewCatEmoji} />
            </div>
            <div className="flex-1 space-y-2">
              <input
                type="text"
                value={newCatNome}
                onChange={(e) => setNewCatNome(e.target.value)}
                placeholder="Nome (ex: Boiadeiros)"
                className="w-full px-3 py-2.5 rounded-xl bg-muted text-foreground text-sm outline-none focus:ring-2 focus:ring-accent/50 border border-border"
              />
              <button
                onClick={handleAddCat}
                className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold uppercase active:scale-[0.98]"
              >
                <Plus size={14} /> Adicionar Categoria
              </button>
            </div>
          </div>
        </div>

        {/* Tree */}
        <div className="space-y-2 mt-2">
          {categorias.map((cat) => {
            const hasChildren = cat.filhos !== undefined;
            const isOpen = expanded.has(cat.nome);
            const isEditing = editing && !editing.parent && editing.nome === cat.nome;
            return (
              <div key={cat.nome} className="rounded-xl border border-border bg-card">
                <div className="flex items-center gap-2 p-2.5">
                  {hasChildren ? (
                    <button onClick={() => toggle(cat.nome)} className="p-1 rounded hover:bg-muted">
                      {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </button>
                  ) : <div className="w-6" />}

                  {isEditing ? (
                    <>
                      <input
                        type="text"
                        value={editEmoji}
                        onChange={(e) => setEditEmoji(e.target.value)}
                        className="w-12 px-1 py-1.5 rounded-lg bg-muted text-center text-base border border-border"
                        maxLength={4}
                      />
                      <input
                        type="text"
                        value={editNome}
                        onChange={(e) => setEditNome(e.target.value)}
                        className="flex-1 px-3 py-1.5 rounded-lg bg-muted text-sm border border-border"
                      />
                      <button onClick={saveEdit} className="p-2 rounded-lg hover:bg-accent/20 text-accent"><Check size={16} /></button>
                      <button onClick={() => setEditing(null)} className="p-2 rounded-lg hover:bg-muted"><X size={16} /></button>
                    </>
                  ) : (
                    <>
                      <span className="text-lg">{cat.emoji}</span>
                      <span className="flex-1 font-bold text-sm uppercase">{cat.nome}</span>
                      {hasChildren && (
                        <button
                          onClick={() => { setAddSubFor(addSubFor === cat.nome ? null : cat.nome); toggle(cat.nome); }}
                          className="p-2 rounded-lg hover:bg-muted text-muted-foreground"
                          aria-label="Adicionar subcategoria"
                        >
                          <Plus size={16} />
                        </button>
                      )}
                      <button
                        onClick={() => startEdit(undefined, cat.nome, cat.emoji)}
                        className="p-2 rounded-lg hover:bg-muted text-muted-foreground"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => handleDeleteCat(cat.nome)}
                        className="p-2 rounded-lg hover:bg-destructive/10 text-destructive/70"
                      >
                        <Trash2 size={14} />
                      </button>
                    </>
                  )}
                </div>

                {hasChildren && isOpen && (
                  <div className="px-3 pb-3 space-y-2">
                    {(cat.filhos || []).map((sub) => {
                      const isSubEditing = editing && editing.parent === cat.nome && editing.nome === sub.nome;
                      return (
                        <div key={sub.nome} className="flex items-center gap-2 pl-6 py-1.5">
                          {isSubEditing ? (
                            <>
                              <input
                                type="text"
                                value={editEmoji}
                                onChange={(e) => setEditEmoji(e.target.value)}
                                className="w-12 px-1 py-1.5 rounded-lg bg-muted text-center text-base border border-border"
                                maxLength={4}
                              />
                              <input
                                type="text"
                                value={editNome}
                                onChange={(e) => setEditNome(e.target.value)}
                                className="flex-1 px-3 py-1.5 rounded-lg bg-muted text-sm border border-border"
                              />
                              <button onClick={saveEdit} className="p-2 rounded-lg hover:bg-accent/20 text-accent"><Check size={16} /></button>
                              <button onClick={() => setEditing(null)} className="p-2 rounded-lg hover:bg-muted"><X size={16} /></button>
                            </>
                          ) : (
                            <>
                              <span className="text-base">{sub.emoji}</span>
                              <span className="flex-1 text-sm">{sub.nome}</span>
                              <button
                                onClick={() => startEdit(cat.nome, sub.nome, sub.emoji)}
                                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"
                              >
                                <Pencil size={13} />
                              </button>
                              <button
                                onClick={() => handleDeleteSub(cat.nome, sub.nome)}
                                className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive/70"
                              >
                                <Trash2 size={13} />
                              </button>
                            </>
                          )}
                        </div>
                      );
                    })}

                    {addSubFor === cat.nome && (
                      <div className="rounded-lg border border-dashed border-border p-3 ml-6 space-y-2">
                        <div className="flex gap-2 items-start">
                          <div>
                            <EmojiPicker value={newSubEmoji} onChange={setNewSubEmoji} />
                          </div>
                          <div className="flex-1 space-y-2">
                            <input
                              type="text"
                              value={newSubNome}
                              onChange={(e) => setNewSubNome(e.target.value)}
                              placeholder="Nome da subcategoria"
                              className="w-full px-3 py-2 rounded-lg bg-muted text-sm border border-border"
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={() => { setAddSubFor(null); setNewSubNome(""); }}
                                className="flex-1 py-1.5 rounded-lg text-xs font-bold text-muted-foreground bg-muted uppercase"
                              >Cancelar</button>
                              <button
                                onClick={() => handleAddSub(cat.nome)}
                                className="flex-1 py-1.5 rounded-lg text-xs font-bold text-primary-foreground bg-primary uppercase"
                              >Adicionar</button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="pt-3">
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl text-sm font-bold text-primary-foreground bg-primary uppercase active:scale-[0.98]"
          >
            Concluir
          </button>
          <p className="text-[11px] text-muted-foreground/70 text-center mt-2">
            Tudo é salvo automaticamente no seu dispositivo.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
