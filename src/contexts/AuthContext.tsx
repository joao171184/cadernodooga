import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";

export type AppRole = "admin" | "oga" | "visitante";
export type PermissionKey =
  | "view_pontos"
  | "play_audio"
  | "favorite"
  | "add_pontos"
  | "edit_pontos"
  | "delete_pontos"
  | "manage_categories"
  | "manage_users";

export const ALL_PERMISSIONS: { key: PermissionKey; label: string }[] = [
  { key: "view_pontos", label: "Ver pontos" },
  { key: "play_audio", label: "Ouvir áudio" },
  { key: "favorite", label: "Favoritar" },
  { key: "add_pontos", label: "Adicionar pontos" },
  { key: "edit_pontos", label: "Editar pontos" },
  { key: "delete_pontos", label: "Excluir pontos" },
  { key: "manage_categories", label: "Gerenciar categorias" },
  { key: "manage_users", label: "Gerenciar usuários" },
];

const SUPER_ADMIN_EMAIL = "joao.pedro.am@icloud.com";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: AppRole | null;
  isLoggedIn: boolean;
  isSuperAdmin: boolean;
  isAdmin: boolean;
  loading: boolean;
  permissions: Set<PermissionKey>;
  can: (key: PermissionKey) => boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string) => Promise<{ error: string | null; needsConfirm: boolean }>;
  logout: () => Promise<void>;
  refreshPermissions: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [permissions, setPermissions] = useState<Set<PermissionKey>>(new Set());
  const [loading, setLoading] = useState(true);

  const loadRoleAndPerms = useCallback(async (uid: string | null, email: string | null | undefined) => {
    if (!uid) {
      setRole(null);
      setPermissions(new Set());
      return;
    }
    // role
    const { data: roleRow } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", uid)
      .maybeSingle();
    let r: AppRole = (roleRow?.role as AppRole) ?? "visitante";
    if (email === SUPER_ADMIN_EMAIL) r = "admin";
    setRole(r);

    // permissions
    if (r === "admin") {
      setPermissions(new Set(ALL_PERMISSIONS.map((p) => p.key)));
    } else {
      const { data: perms } = await supabase
        .from("role_permissions")
        .select("permission, allowed")
        .eq("role", r);
      const set = new Set<PermissionKey>();
      (perms ?? []).forEach((p) => {
        if (p.allowed) set.add(p.permission as PermissionKey);
      });
      setPermissions(set);
    }
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, sess) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      // defer DB calls
      if (sess?.user) {
        setTimeout(() => { loadRoleAndPerms(sess.user.id, sess.user.email); }, 0);
      } else {
        setRole(null);
        setPermissions(new Set());
      }
    });

    supabase.auth.getSession().then(async ({ data: { session: sess } }) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) await loadRoleAndPerms(sess.user.id, sess.user.email);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [loadRoleAndPerms]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    const redirectUrl = `${window.location.origin}/`;
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: redirectUrl },
    });
    return { error: error?.message ?? null, needsConfirm: !error && !data.session };
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const refreshPermissions = useCallback(async () => {
    if (user) await loadRoleAndPerms(user.id, user.email);
  }, [user, loadRoleAndPerms]);

  const isSuperAdmin = user?.email === SUPER_ADMIN_EMAIL;
  const isAdmin = role === "admin" || isSuperAdmin;
  const isLoggedIn = !!session;

  const can = useCallback(
    (key: PermissionKey) => {
      if (isAdmin) return true;
      return permissions.has(key);
    },
    [isAdmin, permissions]
  );

  return (
    <AuthContext.Provider
      value={{
        user, session, role, isLoggedIn, isSuperAdmin, isAdmin, loading,
        permissions, can, signIn, signUp, logout, refreshPermissions,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
