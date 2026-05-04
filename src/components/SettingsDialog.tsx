import { useEffect, useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { FolderTree, Eye, ShieldCheck, Loader2, Save, Users, Trash2 } from "lucide-react";
import { useAuth, ALL_PERMISSIONS, type AppRole, type PermissionKey } from "@/contexts/AuthContext";
import { useCategorias } from "@/contexts/CategoriasContext";
import { CategoriasManagerDialog } from "@/components/CategoriasManagerDialog";
import { supabase } from "@/integrations/supabase/client";
import { resolveIcon } from "@/lib/categoryIcons";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onClose: () => void;
}

const VISIBILITY_KEY = "caderno-oga-visibility";

type Visibility = {
  hideCategoriesForOga: string[];
  hideCategoriesForVisitante: string[];
  hideSearch: { oga: boolean; visitante: boolean };
  hideFavorites: { oga: boolean; visitante: boolean };
  hidePlayer: { oga: boolean; visitante: boolean };
};

const defaultVisibility: Visibility = {
  hideCategoriesForOga: [],
  hideCategoriesForVisitante: [],
  hideSearch: { oga: false, visitante: false },
  hideFavorites: { oga: false, visitante: false },
  hidePlayer: { oga: false, visitante: false },
};

export function loadVisibility(): Visibility {
  try {
    const v = localStorage.getItem(VISIBILITY_KEY);
    return v ? { ...defaultVisibility, ...JSON.parse(v) } : defaultVisibility;
  } catch {
    return defaultVisibility;
  }
}

export function SettingsDialog({ open, onClose }: Props) {
  const { isSuperAdmin } = useAuth();
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl mx-4 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-lg uppercase">Configurações</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="estrutura" className="w-full">
          <TabsList className={`grid w-full ${isSuperAdmin ? "grid-cols-3" : "grid-cols-2"}`}>
            <TabsTrigger value="estrutura" className="gap-1.5 text-xs uppercase font-bold">
              <FolderTree size={14} /> Estrutura
            </TabsTrigger>
            <TabsTrigger value="visibilidade" className="gap-1.5 text-xs uppercase font-bold">
              <Eye size={14} /> Visibilidade
            </TabsTrigger>
            {isSuperAdmin && (
              <TabsTrigger value="acessos" className="gap-1.5 text-xs uppercase font-bold">
                <ShieldCheck size={14} /> Acessos
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="estrutura" className="mt-4">
            <EstruturaPanel />
          </TabsContent>
          <TabsContent value="visibilidade" className="mt-4">
            <VisibilidadePanel />
          </TabsContent>
          {isSuperAdmin && (
            <TabsContent value="acessos" className="mt-4">
              <AcessosPanel />
            </TabsContent>
          )}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- ESTRUTURA ---------- */
function EstruturaPanel() {
  const [openInner, setOpenInner] = useState(false);
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Gerencie categorias, subcategorias e seus ícones.
      </p>
      <button
        onClick={() => setOpenInner(true)}
        className="w-full py-3 rounded-xl text-sm font-bold text-primary-foreground bg-primary uppercase active:scale-[0.98] flex items-center justify-center gap-2"
      >
        <FolderTree size={16} /> Abrir gerenciador de categorias
      </button>
      <CategoriasManagerDialog open={openInner} onClose={() => setOpenInner(false)} />
    </div>
  );
}

/* ---------- VISIBILIDADE ---------- */
function VisibilidadePanel() {
  const { categorias } = useCategorias();
  const [vis, setVis] = useState<Visibility>(loadVisibility);

  const save = (next: Visibility) => {
    setVis(next);
    localStorage.setItem(VISIBILITY_KEY, JSON.stringify(next));
    toast.success("Visibilidade atualizada");
  };

  const toggleCat = (role: "oga" | "visitante", nome: string) => {
    const key = role === "oga" ? "hideCategoriesForOga" : "hideCategoriesForVisitante";
    const list = new Set(vis[key]);
    if (list.has(nome)) list.delete(nome);
    else list.add(nome);
    save({ ...vis, [key]: [...list] });
  };

  const toggleFlag = (
    section: "hideSearch" | "hideFavorites" | "hidePlayer",
    role: "oga" | "visitante"
  ) => {
    save({ ...vis, [section]: { ...vis[section], [role]: !vis[section][role] } });
  };

  return (
    <div className="space-y-5">
      <p className="text-xs text-muted-foreground">
        Marque para <span className="font-bold">ocultar</span> o item para o papel.
      </p>

      <Section title="Recursos da interface">
        <FlagRow label="Esconder barra de busca" vis={vis} section="hideSearch" toggle={toggleFlag} />
        <FlagRow label="Esconder favoritos" vis={vis} section="hideFavorites" toggle={toggleFlag} />
        <FlagRow label="Esconder player" vis={vis} section="hidePlayer" toggle={toggleFlag} />
      </Section>

      <Section title="Esconder categorias">
        <div className="grid grid-cols-[1fr,auto,auto] gap-2 text-[11px] font-bold uppercase text-muted-foreground border-b border-border pb-1">
          <span>Categoria</span>
          <span className="w-12 text-center">Ogã</span>
          <span className="w-12 text-center">Visit.</span>
        </div>
        {categorias.map((c) => {
          const I = resolveIcon(c.emoji, c.nome);
          return (
            <div key={c.nome} className="grid grid-cols-[1fr,auto,auto] gap-2 items-center py-1.5">
              <span className="text-sm flex items-center gap-2">
                <I size={14} className="text-accent" strokeWidth={2} />
                {c.nome}
              </span>
              <ToggleButton
                checked={vis.hideCategoriesForOga.includes(c.nome)}
                onChange={() => toggleCat("oga", c.nome)}
              />
              <ToggleButton
                checked={vis.hideCategoriesForVisitante.includes(c.nome)}
                onChange={() => toggleCat("visitante", c.nome)}
              />
            </div>
          );
        })}
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border p-4 space-y-2">
      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{title}</h4>
      {children}
    </div>
  );
}

function FlagRow({
  label, vis, section, toggle,
}: {
  label: string;
  vis: Visibility;
  section: "hideSearch" | "hideFavorites" | "hidePlayer";
  toggle: (s: typeof section, r: "oga" | "visitante") => void;
}) {
  return (
    <div className="grid grid-cols-[1fr,auto,auto] gap-2 items-center py-1.5">
      <span className="text-sm">{label}</span>
      <ToggleButton checked={vis[section].oga} onChange={() => toggle(section, "oga")} labelHint="Ogã" />
      <ToggleButton checked={vis[section].visitante} onChange={() => toggle(section, "visitante")} labelHint="Visitante" />
    </div>
  );
}

function ToggleButton({ checked, onChange, labelHint }: { checked: boolean; onChange: () => void; labelHint?: string }) {
  return (
    <button
      type="button"
      onClick={onChange}
      title={labelHint}
      className={`w-12 h-7 rounded-md border text-xs font-bold transition-all ${
        checked
          ? "bg-accent text-accent-foreground border-accent"
          : "bg-muted text-muted-foreground border-border hover:border-accent/40"
      }`}
    >
      {checked ? "ON" : "OFF"}
    </button>
  );
}

/* ---------- ACESSOS ---------- */
type ProfileRow = { id: string; email: string; role: AppRole };

function AcessosPanel() {
  const { refreshPermissions, user } = useAuth();
  const [users, setUsers] = useState<ProfileRow[]>([]);
  const [perms, setPerms] = useState<Record<AppRole, Record<string, boolean>>>({
    admin: {}, oga: {}, visitante: {},
  });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [profilesRes, rolesRes, permsRes] = await Promise.all([
        supabase.from("profiles").select("id, email").order("created_at", { ascending: true }),
        supabase.from("user_roles").select("user_id, role"),
        supabase.from("role_permissions").select("role, permission, allowed"),
      ]);

      if (permsRes.error) throw permsRes.error;
      const profiles = profilesRes.data ?? [];
      const roles = rolesRes.data ?? [];
      const rolePerms = permsRes.data ?? [];

      const roleMap = new Map(roles.map((r) => [r.user_id, r.role as AppRole]));
      const list: ProfileRow[] = profiles.map((p) => ({
        id: p.id,
        email: p.email,
        role: roleMap.get(p.id) ?? "visitante",
      }));
      // Garante que o próprio super admin sempre apareça
      if (user && !list.some((u) => u.id === user.id)) {
        list.unshift({ id: user.id, email: user.email ?? "(você)", role: "admin" });
      }
      setUsers(list);

      const next: Record<AppRole, Record<string, boolean>> = { admin: {}, oga: {}, visitante: {} };
      rolePerms.forEach((rp) => {
        const r = rp.role as AppRole;
        next[r][rp.permission] = rp.allowed;
      });
      setPerms(next);
    } catch (e) {
      const msg = (e as { message?: string })?.message ?? "Erro ao carregar";
      setLoadError(msg);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const changeUserRole = async (userId: string, newRole: AppRole) => {
    const { error: delErr } = await supabase.from("user_roles").delete().eq("user_id", userId);
    if (delErr) return toast.error("Erro: " + delErr.message);
    const { error: insErr } = await supabase.from("user_roles").insert({ user_id: userId, role: newRole });
    if (insErr) return toast.error("Erro: " + insErr.message);
    setUsers((u) => u.map((x) => (x.id === userId ? { ...x, role: newRole } : x)));
    toast.success("Papel atualizado");
  };

  const deleteUser = async (u: ProfileRow) => {
    if (u.id === user?.id) {
      return toast.error("Você não pode excluir sua própria conta");
    }
    if (!window.confirm(`Excluir definitivamente a conta de ${u.email}? Esta ação não pode ser desfeita.`)) return;
    const { data, error } = await supabase.functions.invoke("admin-delete-user", {
      body: { userId: u.id },
    });
    if (error || (data && (data as { error?: string }).error)) {
      const msg = (data as { error?: string } | null)?.error || error?.message || "Erro desconhecido";
      return toast.error("Erro ao excluir: " + msg);
    }
    setUsers((arr) => arr.filter((x) => x.id !== u.id));
    toast.success("Conta excluída");
  };

  const togglePerm = (role: AppRole, key: PermissionKey) => {
    if (role === "admin") return; // travado
    setPerms((p) => ({ ...p, [role]: { ...p[role], [key]: !p[role][key] } }));
  };

  const saveAllPerms = async () => {
    setSaving(true);
    const rows: { role: AppRole; permission: string; allowed: boolean }[] = [];
    (["admin", "oga", "visitante"] as AppRole[]).forEach((role) => {
      ALL_PERMISSIONS.forEach((p) => {
        rows.push({
          role,
          permission: p.key,
          allowed: role === "admin" ? true : !!perms[role][p.key],
        });
      });
    });
    const { error } = await supabase.from("role_permissions").upsert(rows, { onConflict: "role,permission" });
    setSaving(false);
    if (error) return toast.error("Erro ao salvar: " + error.message);
    toast.success("Permissões salvas");
    await refreshPermissions();
  };

  if (loading) {
    return (
      <div className="py-12 flex items-center justify-center text-muted-foreground">
        <Loader2 className="animate-spin mr-2" size={18} /> Carregando...
      </div>
    );
  }
  if (loadError) {
    return (
      <div className="py-8 text-center space-y-3">
        <p className="text-sm text-destructive">Erro ao carregar: {loadError}</p>
        <button onClick={load} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold uppercase">
          Tentar de novo
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Usuários */}
      <Section title="Usuários cadastrados">
        {users.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">Nenhum usuário cadastrado ainda.</p>
        ) : (
          users.map((u) => (
            <div key={u.id} className="flex items-center gap-2 py-2 border-b border-border last:border-0">
              <Users size={14} className="text-muted-foreground shrink-0" />
              <span className="flex-1 text-sm truncate">
                {u.email}
                {u.id === user?.id && <span className="ml-2 text-[10px] text-accent font-bold uppercase">(você)</span>}
              </span>
              <select
                value={u.role}
                onChange={(e) => changeUserRole(u.id, e.target.value as AppRole)}
                className="text-xs font-bold uppercase px-2 py-1.5 rounded-lg bg-muted border border-border outline-none focus:ring-2 focus:ring-accent/50"
              >
                <option value="admin">Admin</option>
                <option value="oga">Ogã</option>
                <option value="visitante">Visitante</option>
              </select>
              <button
                onClick={() => deleteUser(u)}
                disabled={u.id === user?.id}
                className="p-1.5 rounded-lg text-destructive/70 hover:bg-destructive/10 hover:text-destructive transition-all active:scale-90 disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label="Excluir conta"
                title={u.id === user?.id ? "Não é possível excluir sua própria conta" : "Excluir conta"}
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))
        )}
      </Section>

      {/* Matriz */}
      <Section title="Matriz de permissões">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[11px] font-bold uppercase text-muted-foreground">
                <th className="text-left py-2 pr-2">Permissão</th>
                <th className="w-16 text-center">Admin</th>
                <th className="w-16 text-center">Ogã</th>
                <th className="w-16 text-center">Visit.</th>
              </tr>
            </thead>
            <tbody>
              {ALL_PERMISSIONS.map((p) => (
                <tr key={p.key} className="border-t border-border">
                  <td className="py-2 pr-2">{p.label}</td>
                  <td className="text-center py-2">
                    <span className="inline-block w-12 h-7 rounded-md bg-primary/15 text-primary border border-primary/30 text-xs font-bold leading-7">
                      ON
                    </span>
                  </td>
                  <td className="text-center py-2">
                    <ToggleButton checked={!!perms.oga[p.key]} onChange={() => togglePerm("oga", p.key)} />
                  </td>
                  <td className="text-center py-2">
                    <ToggleButton checked={!!perms.visitante[p.key]} onChange={() => togglePerm("visitante", p.key)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[11px] text-muted-foreground/80 mt-2">
          Admin tem todas as permissões (não editável).
        </p>
        <button
          onClick={saveAllPerms}
          disabled={saving}
          className="w-full mt-3 py-2.5 rounded-xl text-xs font-bold text-primary-foreground bg-primary uppercase active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          Salvar permissões
        </button>
      </Section>
    </div>
  );
}
