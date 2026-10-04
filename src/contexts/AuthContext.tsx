import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";
import { authRedirectOrigin } from "@/lib/siteUrl";
import { clearApiCaches } from "@/lib/pwaCachePolicy";
import {
  EMAIL_SEND_FAILED_MESSAGE,
  isAccountExistsError,
  translateAuthError,
} from "@/lib/authErrors";

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
  requestPasswordReset: (email: string) => Promise<{ error: string | null }>;
  resendConfirmation: (email: string) => Promise<{ error: string | null }>;
  logout: () => Promise<void>;
  refreshPermissions: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const isConfirmed = (u: User | null | undefined) => !!u?.email_confirmed_at;

/** Erros de envio de e-mail (Brevo/hook) não podem ser mascarados como sucesso. */
const isEmailSendError = (msg?: string | null) =>
  !!msg && translateAuthError(msg) === EMAIL_SEND_FAILED_MESSAGE;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [permissions, setPermissions] = useState<Set<PermissionKey>>(new Set());
  const [loading, setLoading] = useState(true);

  // Papel e permissões aqui só controlam a interface; quem decide é o RLS no banco.
  const loadRoleAndPerms = useCallback(async (uid: string | null) => {
    if (!uid) {
      setRole(null);
      setIsSuperAdmin(false);
      setPermissions(new Set());
      return;
    }
    const [{ data: roleRow }, { data: superAdmin }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", uid).maybeSingle(),
      supabase.rpc("is_super_admin", { _user_id: uid }),
    ]);
    const isSuper = superAdmin === true;
    setIsSuperAdmin(isSuper);
    let r: AppRole = (roleRow?.role as AppRole) ?? "visitante";
    if (isSuper) r = "admin";
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

  // getSession e o evento inicial do onAuthStateChange chegam juntos: um único carregamento por usuário.
  const roleLoad = useRef<{ uid: string; promise: Promise<void> } | null>(null);
  const ensureRoleAndPerms = useCallback((uid: string) => {
    if (roleLoad.current?.uid === uid) return roleLoad.current.promise;
    const promise = loadRoleAndPerms(uid).catch(() => { console.error("Falha ao carregar permissões"); });
    roleLoad.current = { uid, promise };
    return promise;
  }, [loadRoleAndPerms]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, sess) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user && isConfirmed(sess.user)) {
        const uid = sess.user.id;
        setTimeout(() => { ensureRoleAndPerms(uid).finally(() => setLoading(false)); }, 0);
      } else {
        roleLoad.current = null;
        setRole(null);
        setIsSuperAdmin(false);
        setPermissions(new Set());
        setLoading(false);
      }
    });

    supabase.auth.getSession()
      .then(async ({ data: { session: sess }, error }) => {
        if (error) {
          // Token corrompido/expirado: limpa e segue
          console.warn("Sessão inválida, limpando");
          await supabase.auth.signOut().catch(() => {});
        }
        setSession(sess ?? null);
        setUser(sess?.user ?? null);
        if (sess?.user && isConfirmed(sess.user)) await ensureRoleAndPerms(sess.user.id);
      })
      .catch(async () => {
        console.warn("Falha em getSession, limpando storage");
        try { await supabase.auth.signOut(); } catch { /* sem sessão */ }
      })
      .finally(() => {
        setLoading(false);
      });

    return () => subscription.unsubscribe();
  }, [ensureRoleAndPerms]);

  // Realtime: quando admin muda a matriz, recarrega permissões na hora.
  useEffect(() => {
    if (!user || !isConfirmed(user)) return;
    const ch = supabase
      .channel("perms-sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "role_permissions" }, () => {
        loadRoleAndPerms(user.id);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "user_roles", filter: `user_id=eq.${user.id}` }, () => {
        loadRoleAndPerms(user.id);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, loadRoleAndPerms]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: translateAuthError(error.message) };
    if (!isConfirmed(data.user)) {
      await supabase.auth.signOut().catch(() => {});
      return { error: translateAuthError("Email not confirmed") };
    }
    return { error: null };
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${authRedirectOrigin()}/` },
    });
    if (error) {
      if (isAccountExistsError(error.message)) return { error: null, needsConfirm: true };
      return { error: translateAuthError(error.message, error.code), needsConfirm: false };
    }
    if (data.session && !isConfirmed(data.user)) {
      await supabase.auth.signOut().catch(() => {});
      return { error: null, needsConfirm: true };
    }
    return { error: null, needsConfirm: !data.session };
  }, []);

  const requestPasswordReset = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${authRedirectOrigin()}/reset-password`,
    });
    if (error && (isEmailSendError(error.message) || /rate limit|too many|security purposes/i.test(error.message))) {
      return { error: translateAuthError(error.message) };
    }
    return { error: null };
  }, []);

  const resendConfirmation = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: `${authRedirectOrigin()}/` },
    });
    if (error && (isEmailSendError(error.message) || /rate limit|too many|security purposes/i.test(error.message))) {
      return { error: translateAuthError(error.message) };
    }
    return { error: null };
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    await clearApiCaches();
  }, []);

  const refreshPermissions = useCallback(async () => {
    if (user && isConfirmed(user)) await loadRoleAndPerms(user.id);
  }, [user, loadRoleAndPerms]);

  const isLoggedIn = !!session && isConfirmed(user);
  const isAdmin = isLoggedIn && (role === "admin" || isSuperAdmin);

  const can = useCallback(
    (key: PermissionKey) => {
      if (isAdmin) return true;
      return isLoggedIn && permissions.has(key);
    },
    [isAdmin, isLoggedIn, permissions]
  );

  return (
    <AuthContext.Provider
      value={{
        user, session, role, isLoggedIn, isSuperAdmin: isLoggedIn && isSuperAdmin, isAdmin, loading,
        permissions, can, signIn, signUp, requestPasswordReset, resendConfirmation, logout, refreshPermissions,
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
