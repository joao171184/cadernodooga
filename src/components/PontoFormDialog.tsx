import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useCategorias } from "@/contexts/CategoriasContext";
import {
  type Ponto,
  type PontoInput,
} from "@/contexts/PontosContext";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { PointVersionsEditor } from "@/components/PointVersionsEditor";
import { initialVersion, validateVersions, publishedVersions, type PointVersion } from "@/lib/pointVersions";
import { useAuth } from "@/contexts/AuthContext";
import { X, Check } from "lucide-react";
import { toast } from "sonner";
import { PONTO_LIMITS, validatePontoFields } from "@/lib/pontoValidation";

interface PontoFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (ponto: PontoInput) => void | boolean | Promise<void | boolean>;
  ponto?: Ponto | null;
  defaultCategoria?: string;
  defaultSubcategoria?: string;
}

export function PontoFormDialog({ open, onClose, onSave, ponto, defaultCategoria, defaultSubcategoria }: PontoFormDialogProps) {
  const { categorias } = useCategorias();
  const { isAdmin } = useAuth();
  const [versions, setVersions] = useState<PointVersion[]>([]);
  const [nome, setNome] = useState("");
  const [categoria, setCategoria] = useState("");
  const [subcategorias, setSubcategorias] = useState<string[]>([]);
  const [puxador, setPuxador] = useState("");
  const [autor, setAutor] = useState("");
  const [saving, setSaving] = useState(false);
  const [versionsLoading, setVersionsLoading] = useState(false);
  const [versionsLoadFailed, setVersionsLoadFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setVersionsLoadFailed(false);
    if (open && ponto) {
      setVersionsLoading(true);
      supabase.from("ponto_versions").select("*").eq("point_id", ponto.id).order("ordem").then(({ data, error }) => {
        if (cancelled) return;
        if (error || !data?.length) { setVersionsLoadFailed(true); toast.error("Não foi possível carregar as versões. Feche e tente novamente."); }
        else setVersions(data.map(v => ({ ...v, status: v.status as PointVersion["status"] })));
        setVersionsLoading(false);
      });
    } else setVersionsLoading(false);
    setVersions(ponto ? (ponto.versions?.length ? ponto.versions.map(v => ({ ...v })) : [initialVersion(ponto)]) : [initialVersion({ letra: "", audio: "", toque: null, classificacoes: [] })]);
    if (ponto) {
      setNome(ponto.nome);
      setCategoria(ponto.categoria);
      setSubcategorias(ponto.subcategorias);
      setPuxador(ponto.puxador);
      setAutor(ponto.autor ?? "");
    } else {
      setNome("");
      setCategoria(defaultCategoria || "");
      setSubcategorias(defaultSubcategoria ? [defaultSubcategoria] : []);
      setPuxador("");
      setAutor("");
    }
    return () => { cancelled = true; };
  }, [ponto, open, defaultCategoria, defaultSubcategoria]);

  const subOptions = categorias.find((c) => c.nome === categoria)?.filhos ?? [];

  const toggleSub = (nome: string) => {
    setSubcategorias((prev) =>
      prev.includes(nome) ? prev.filter((s) => s !== nome) : [...prev, nome]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !categoria || saving || versionsLoading || versionsLoadFailed) return;
    const versionError = validateVersions(versions, isAdmin);
    if (versionError) { toast.error(versionError); return; }
    for (const version of versions) {
      const error = validatePontoFields({ nome: nome.trim(), letra: version.letra, puxador: puxador.trim(), audio: version.video_url.startsWith("audio/") ? "" : version.video_url });
      if (error) { toast.error(error); return; }
    }
    const main = publishedVersions(versions)[0] ?? versions[0];
    if (!main) return;
    const invalid = validatePontoFields({ nome: nome.trim(), letra: main.letra, puxador: puxador.trim(), audio: main.video_url.startsWith("audio/") ? "" : main.video_url });
    if (invalid) { toast.error(invalid); return; }
    setSaving(true);
    const ok = await Promise.resolve(onSave({
      ...(ponto ? { id: ponto.id } : {}),
      nome: nome.trim(),
      categoria,
      subcategorias,
      versions,
      classificacoes: main.classificacoes,
      letra: main.letra.toUpperCase(),
      audio: main.video_url.trim(),
      puxador: puxador.trim(),
      autor: autor.trim(),
      toque: main.toque,
    })).catch(() => {
      toast.error("Não foi possível salvar o ponto. Tente novamente.");
      return false;
    }).finally(() => setSaving(false));
    if (ok !== false) onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg w-[calc(100%-2rem)] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-lg">
            {ponto ? "Editar Ponto" : "Novo Ponto"}
          </DialogTitle>
          <DialogDescription className="sr-only">Formulário com os dados do ponto cantado</DialogDescription>
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
              maxLength={PONTO_LIMITS.nome}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="characters"
              spellCheck={false}
              className="w-full px-4 py-3 rounded-xl bg-muted text-foreground text-sm outline-none focus:ring-2 focus:ring-accent/50 border border-border uppercase"
              placeholder="EX: OGUM DE RONDA"
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
                <option key={c.id} value={c.nome}>{c.nome}</option>
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
                    <Button
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
                      <span>{s.nome}</span>
                    </Button>
                  );
                })}
              </div>
            </div>
          )}

          <div>
            <label htmlFor="ponto-autor" className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
              Autoria do Ponto (Opcional)
            </label>
            <input
              id="ponto-autor"
              type="text"
              value={autor}
              onChange={(e) => setAutor(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-muted text-foreground text-sm outline-none focus:ring-2 focus:ring-accent/50 border border-border"
              placeholder="Ex: Ogan Lucas Menino"
            />
          </div>

          {versionsLoading ? <p role="status" className="text-sm text-muted-foreground">Carregando versões…</p> : !versionsLoadFailed && <PointVersionsEditor versions={versions} onChange={setVersions} />}

          <div>
            <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
              Quem puxa o ponto (opcional)
            </label>
            <input
              type="text"
              value={puxador}
              onChange={(e) => setPuxador(e.target.value)}
              maxLength={PONTO_LIMITS.puxador}
              className="w-full px-4 py-3 rounded-xl bg-muted text-foreground text-sm outline-none focus:ring-2 focus:ring-accent/50 border border-border"
              placeholder="Ex: Pai João, Mãe Maria, Ogã Pedro..."
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl text-sm font-bold text-muted-foreground bg-muted hover:bg-muted/80 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <X size={16} /> CANCELAR
            </Button>
            <Button
              type="submit"
              disabled={saving || versionsLoading || versionsLoadFailed}
              className="flex-1 py-3 rounded-xl text-sm font-bold text-primary-foreground bg-primary hover:bg-primary/90 transition-all active:scale-[0.98] shadow-sm flex items-center justify-center gap-2 disabled:opacity-60"
            >
              <Check size={16} /> {ponto ? "SALVAR" : "ADICIONAR"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
