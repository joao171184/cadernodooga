import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";

export type UserRole = "admin" | "viewer" | null;

interface AuthContextType {
  role: UserRole;
  user: User | null;
  session: Session | null;
  isAdmin: boolean;
  isViewer: boolean;
  isLoggedIn: boolean;
  loading: boolean;
  loginViewer: (password: string) => boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string) => Promise<{ error: string | null; needsConfirm: boolean }>;
  logout: () => Promise<void>;
}

const VIEWER_PASSWORD = "102030";
const VIEWER_KEY = "user-role-viewer";

const AuthContext = createContext<AuthContextType | null>(null);

function loadViewer(): boolean {
  try {
    return localStorage.getItem(VIEWER_KEY) === "1";
  } catch {
    return false;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [viewerMode, setViewerMode] = useState<boolean>(loadViewer);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listener primeiro
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
      setUser(sess?.user ?? null);
    });

    // Depois carrega sessão atual
    supabase.auth.getSession().then(({ data: { session: sess } }) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const loginViewer = useCallback((password: string): boolean => {
    if (password === VIEWER_PASSWORD) {
      setViewerMode(true);
      try { localStorage.setItem(VIEWER_KEY, "1"); } catch {}
      return true;
    }
    return false;
  }, []);

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
    return {
      error: error?.message ?? null,
      needsConfirm: !error && !data.session,
    };
  }, []);

  const logout = useCallback(async () => {
    if (session) await supabase.auth.signOut();
    setViewerMode(false);
    try { localStorage.removeItem(VIEWER_KEY); } catch {}
  }, [session]);

  const isAdmin = !!session;
  const isViewer = !session && viewerMode;
  const isLoggedIn = isAdmin || isViewer;
  const role: UserRole = isAdmin ? "admin" : isViewer ? "viewer" : null;

  return (
    <AuthContext.Provider
      value={{
        role,
        user,
        session,
        isAdmin,
        isViewer,
        isLoggedIn,
        loading,
        loginViewer,
        signIn,
        signUp,
        logout,
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
