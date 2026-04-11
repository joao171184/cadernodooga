import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

export type UserRole = "admin" | "viewer" | null;

interface AuthContextType {
  role: UserRole;
  isAdmin: boolean;
  isViewer: boolean;
  isLoggedIn: boolean;
  login: (password: string) => boolean;
  logout: () => void;
}

const PASSWORDS: Record<string, UserRole> = {
  admin: "admin",
  "102030": "viewer",
};

const AUTH_KEY = "caderno-oga-role";

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

  const login = useCallback((password: string): boolean => {
    const matched = PASSWORDS[password];
    if (matched) {
      setRole(matched);
      localStorage.setItem(AUTH_KEY, matched);
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
