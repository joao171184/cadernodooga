import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

export type UserRole = "admin" | "viewer" | null;

interface AuthContextType {
  role: UserRole;
  isAdmin: boolean;
  isViewer: boolean;
  isLoggedIn: boolean;
  login: (password: string, intent: "admin" | "viewer") => boolean;
  logout: () => void;
}

const ADMIN_PASSWORD = "admin123";
const VIEWER_PASSWORD = "102030";

const AUTH_KEY = "user-role";

function loadRole(): UserRole {
  try {
    const saved = localStorage.getItem(AUTH_KEY);
    if (saved === "admin" || saved === "viewer") return saved;
  } catch {}
  return null;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<UserRole>(loadRole);

  const login = useCallback((password: string, intent: "admin" | "viewer"): boolean => {
    if (intent === "admin" && password === ADMIN_PASSWORD) {
      setRole("admin");
      localStorage.setItem(AUTH_KEY, "admin");
      return true;
    }
    if (intent === "viewer" && password === VIEWER_PASSWORD) {
      setRole("viewer");
      localStorage.setItem(AUTH_KEY, "viewer");
      return true;
    }
    return false;
  }, []);

  const logout = useCallback(() => {
    setRole(null);
    localStorage.removeItem(AUTH_KEY);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        role,
        isAdmin: role === "admin",
        isViewer: role === "viewer",
        isLoggedIn: role !== null,
        login,
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
