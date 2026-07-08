import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Check, X, ChevronDown, ChevronRight, FolderTree, ArrowUp, ArrowDown, ListFilter } from "lucide-react";
import { useCategorias, type CategoriaNode } from "@/contexts/CategoriasContext";
import { ICON_CATALOG, resolveIcon } from "@/lib/categoryIcons";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onClose: () => void;
}

function IconPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const Selected = resolveIcon(value, "");
  return (
    <div className="space-y-2">
      <div className="w-14 h-14 rounded-xl bg-muted border border-border flex items-center justify-center">
        <Selected size={26} className="text-accent" strokeWidth={2} />
      </div>
      <div className="grid grid-cols-7 gap-1 max-h-32 overflow-y-auto p-1 rounded-lg bg-muted/50 border border-border">
        {ICON_CATALOG.map(({ key, Icon, label }) => (
          <button
            key={key}
            type="button"
            title={label}
            onClick={() => onChange(key)}
            className={`w-7 h-7 rounded-md flex items-center justify-center transition-all ${
              value === key ? "bg-accent text-accent-foreground" : "hover:bg-muted text-foreground/70"
            }`}
          >
            <Icon size={14} strokeWidth={2} />
          </button>
        ))}
      </div>
    </div>
  );
}

export function CategoriasManagerDialog({ open, onClose }: Props) {
  const { categorias, addCategoria, addSubcategoria, renameCategoria, setCategoriaCor, setMostrarFiltrosClassificacao, deleteCategoria, moveCategoria } = useCategorias();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [newCatNome, setNewCatNome] = useState("");
  const [newCatEmoji, setNewCatEmoji] = useState("crown");
  const [newCatCor, setNewCatCor] = useState("#d97706");
  const [addSubFor, setAddSubFor] = useState<string | null>(null); // parent id
  const [newSubNome, setNewSubNome] = useState("");
  const [newSubEmoji, setNewSubEmoji] = useState("feather");
  const [newSubCor, setNewSubCor] = useState("#d97706");
  const [editing, setEditing] = useState<{ id: string } | null>(null);
  const [editNome, setEditNome] = useState("");
  const [editEmoji, setEditEmoji] = useState("");
  const [editCor, setEditCor] = useState<string>("#d97706");


  const toggle = (id: string) => {
    setExpanded((p) => {
      const s = new Set(p);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  };

  const startEdit = (node: CategoriaNode) => {
    setEditing({ id: node.id });
    setEditNome(node.nome);
    setEditEmoji(node.emoji);
    setEditCor(node.cor || "#d97706");
  };

  const saveEdit = async () => {
    if (!editing || !editNome.trim()) return;
    await renameCategoria(editing.id, editNome.trim(), editEmoji || "•", editCor || null);
    setEditing(null);
    toast.success("Atualizado");
  };

  const handleAddCat = async () => {
    const n = newCatNome.trim();
    if (!n) return;
    if (categorias.some((c) => c.nome === n)) {
      toast.error("Já existe uma categoria com esse nome");
      return;
    }
    const { error } = await addCategoria(n, newCatEmoji || "•", newCatCor || null);
    if (error) return toast.error("Erro: " + error);
    setNewCatNome("");
    setNewCatEmoji("crown");
    toast.success("Categoria criada");
  };

  const handleAddSub = async (parentId: string) => {
    const n = newSubNome.trim();
    if (!n) return;
    const { error } = await addSubcategoria(parentId, n, newSubEmoji || "•", newSubCor || null);
    if (error) return toast.error("Erro: " + error);
    setNewSubNome("");
    setNewSubEmoji("feather");
    setAddSubFor(null);
    toast.success("Subcategoria criada");
  };


  const handleDelete = async (node: CategoriaNode, isSub: boolean) => {
    const msg = isSub
      ? `Excluir a subpasta "${node.nome}"?`
      : `Excluir a pasta "${node.nome}" e todas as suas subpastas? Os pontos não são apagados, mas perdem o vínculo.`;
    if (!window.confirm(msg)) return;
    await deleteCategoria(node.id);
    toast.success("Excluído");
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-lg uppercase flex items-center gap-2">
            <FolderTree size={20} className="text-accent" />
            Painel de Categorias
          </DialogTitle>
        </DialogHeader>

        {/* Add new top-level */}
        <div className="rounded-xl border border-dashed border-border p-3 space-y-3">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Nova categoria</p>
          <div className="flex gap-2 items-start">
            <div>
              <IconPicker value={newCatEmoji} onChange={setNewCatEmoji} />
            </div>
            <div className="flex-1 space-y-2">
              <input
                type="text"
                value={newCatNome}
                onChange={(e) => setNewCatNome(e.target.value)}
                placeholder="Nome (ex: Boiadeiros)"
                className="w-full px-3 py-2.5 rounded-xl bg-muted text-foreground text-sm outline-none focus:ring-2 focus:ring-accent/50 border border-border"
              />
              <label className="flex items-center gap-2 text-xs font-bold uppercase text-muted-foreground">
                Cor:
                <input type="color" value={newCatCor} onChange={(e) => setNewCatCor(e.target.value)} className="w-10 h-8 rounded cursor-pointer border border-border bg-transparent" />
                <span className="font-mono normal-case">{newCatCor}</span>
              </label>
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
          {categorias.map((cat, ci) => {
            const isOpen = expanded.has(cat.id);
            const isEditing = editing && editing.id === cat.id;
            return (
              <div key={cat.id} className="rounded-xl border border-border bg-card">
                <div className="flex items-center gap-2 p-2.5">
                  <button onClick={() => toggle(cat.id)} className="p-1 rounded hover:bg-muted">
                    {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </button>

                  {isEditing ? (
                    <div className="flex-1 space-y-2">
                      <input
                        type="text"
                        value={editNome}
                        onChange={(e) => setEditNome(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg bg-muted text-sm border border-border"
                      />
                      <IconPicker value={editEmoji} onChange={setEditEmoji} />
                      <label className="flex items-center gap-2 text-xs font-bold uppercase text-muted-foreground">
                        Cor:
                        <input type="color" value={editCor} onChange={(e) => setEditCor(e.target.value)} className="w-10 h-8 rounded cursor-pointer border border-border bg-transparent" />
                        <span className="font-mono normal-case">{editCor}</span>
                      </label>
                      <div className="flex gap-2">
                        <button onClick={saveEdit} className="flex-1 py-2 rounded-lg bg-accent text-accent-foreground text-xs font-bold uppercase flex items-center justify-center gap-1.5"><Check size={14} /> Salvar</button>
                        <button onClick={() => setEditing(null)} className="flex-1 py-2 rounded-lg bg-muted text-muted-foreground text-xs font-bold uppercase flex items-center justify-center gap-1.5"><X size={14} /> Cancelar</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {(() => { const I = resolveIcon(cat.emoji, cat.nome); return <I size={20} className="text-accent shrink-0" strokeWidth={2} />; })()}
                      <span className="flex-1 font-bold text-sm uppercase truncate">{cat.nome}</span>
                      <input
                        type="color"
                        value={cat.cor || "#d97706"}
                        onChange={(e) => setCategoriaCor(cat.id, e.target.value)}
                        className="w-7 h-7 rounded-md cursor-pointer border border-border bg-transparent"
                        title="Cor da categoria"
                        aria-label="Cor da categoria"
                      />

                      <button
                        onClick={() => setMostrarFiltrosClassificacao(cat.id, !cat.mostrarFiltrosClassificacao)}
                        className={`p-1.5 rounded-lg transition-all ${
                          cat.mostrarFiltrosClassificacao ? "bg-accent/15 text-accent" : "hover:bg-muted text-muted-foreground"
                        }`}
                        aria-label="Mostrar filtros"
                        title={cat.mostrarFiltrosClassificacao ? "Filtros ligados" : "Filtros desligados"}
                      >
                        <ListFilter size={14} />
                      </button>
                      <button
                        onClick={() => moveCategoria(cat.id, -1, null)}
                        disabled={ci === 0}
                        className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground disabled:opacity-30 disabled:cursor-not-allowed"
                        aria-label="Mover para cima"
                        title="Mover para cima"
                      >
                        <ArrowUp size={14} />
                      </button>
                      <button
                        onClick={() => moveCategoria(cat.id, 1, null)}
                        disabled={ci === categorias.length - 1}
                        className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground disabled:opacity-30 disabled:cursor-not-allowed"
                        aria-label="Mover para baixo"
                        title="Mover para baixo"
                      >
                        <ArrowDown size={14} />
                      </button>
                      <button
                        onClick={() => { setAddSubFor(addSubFor === cat.id ? null : cat.id); if (!isOpen) toggle(cat.id); }}
                        className="p-2 rounded-lg hover:bg-muted text-muted-foreground"
                        aria-label="Adicionar subcategoria"
                        title="Adicionar subcategoria"
                      >
                        <Plus size={16} />
                      </button>
                      <button
                        onClick={() => startEdit(cat)}
                        className="p-2 rounded-lg hover:bg-muted text-muted-foreground"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(cat, false)}
                        className="p-2 rounded-lg hover:bg-destructive/10 text-destructive/70"
                      >
                        <Trash2 size={14} />
                      </button>
                    </>
                  )}
                </div>

                {isOpen && (
                  <div className="px-3 pb-3 space-y-2">
                    {cat.filhos.map((sub, si) => {
                      const isSubEditing = editing && editing.id === sub.id;
                      return (
                        <div key={sub.id} className="flex items-start gap-2 pl-6 py-1.5">
                          {isSubEditing ? (
                            <div className="flex-1 space-y-2">
                              <input
                                type="text"
                                value={editNome}
                                onChange={(e) => setEditNome(e.target.value)}
                                className="w-full px-3 py-1.5 rounded-lg bg-muted text-sm border border-border"
                              />
                              <IconPicker value={editEmoji} onChange={setEditEmoji} />
                              <label className="flex items-center gap-2 text-xs font-bold uppercase text-muted-foreground">
                                Cor:
                                <input type="color" value={editCor} onChange={(e) => setEditCor(e.target.value)} className="w-10 h-8 rounded cursor-pointer border border-border bg-transparent" />
                                <span className="font-mono normal-case">{editCor}</span>
                              </label>
                              <div className="flex gap-2">
                                <button onClick={saveEdit} className="flex-1 py-2 rounded-lg bg-accent text-accent-foreground text-xs font-bold uppercase flex items-center justify-center gap-1.5"><Check size={14} /> Salvar</button>
                                <button onClick={() => setEditing(null)} className="flex-1 py-2 rounded-lg bg-muted text-muted-foreground text-xs font-bold uppercase flex items-center justify-center gap-1.5"><X size={14} /> Cancelar</button>
                              </div>
                            </div>
                          ) : (
                            <>
                              {(() => { const I = resolveIcon(sub.emoji, sub.nome); return <I size={16} className="text-accent shrink-0 mt-1" strokeWidth={2} />; })()}
                              <span className="flex-1 text-sm truncate mt-0.5">{sub.nome}</span>
                              <input
                                type="color"
                                value={sub.cor || "#d97706"}
                                onChange={(e) => setCategoriaCor(sub.id, e.target.value)}
                                className="w-6 h-6 rounded cursor-pointer border border-border bg-transparent"
                                title="Cor"
                                aria-label="Cor"
                              />

                              <button
                                onClick={() => moveCategoria(sub.id, -1, cat.id)}
                                disabled={si === 0}
                                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground disabled:opacity-30 disabled:cursor-not-allowed"
                                aria-label="Mover para cima"
                              >
                                <ArrowUp size={12} />
                              </button>
                              <button
                                onClick={() => moveCategoria(sub.id, 1, cat.id)}
                                disabled={si === cat.filhos.length - 1}
                                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground disabled:opacity-30 disabled:cursor-not-allowed"
                                aria-label="Mover para baixo"
                              >
                                <ArrowDown size={12} />
                              </button>
                              <button
                                onClick={() => startEdit(sub)}
                                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"
                              >
                                <Pencil size={13} />
                              </button>
                              <button
                                onClick={() => handleDelete(sub, true)}
                                className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive/70"
                              >
                                <Trash2 size={13} />
                              </button>
                            </>
                          )}
                        </div>
                      );
                    })}

                    {addSubFor === cat.id && (
                      <div className="rounded-lg border border-dashed border-border p-3 ml-6 space-y-2">
                        <div className="flex gap-2 items-start">
                          <div>
                            <IconPicker value={newSubEmoji} onChange={setNewSubEmoji} />
                          </div>
                          <div className="flex-1 space-y-2">
                            <input
                              type="text"
                              value={newSubNome}
                              onChange={(e) => setNewSubNome(e.target.value)}
                              placeholder="Nome da subcategoria (ex: Chamada)"
                              className="w-full px-3 py-2 rounded-lg bg-muted text-sm border border-border"
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={() => { setAddSubFor(null); setNewSubNome(""); }}
                                className="flex-1 py-1.5 rounded-lg text-xs font-bold text-muted-foreground bg-muted uppercase"
                              >Cancelar</button>
                              <button
                                onClick={() => handleAddSub(cat.id)}
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
            Salvo no servidor — aparece para todos.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
