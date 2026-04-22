import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";

interface Props {
  className?: string;
  variant?: "header" | "login";
}

export function ThemeToggle({ className = "", variant = "header" }: Props) {
  const { theme, toggle } = useTheme();
  const isDark = theme === "dark";

  if (variant === "login") {
    return (
      <button
        onClick={toggle}
        aria-label={isDark ? "Mudar para modo claro" : "Mudar para modo escuro"}
        title={isDark ? "Modo claro" : "Modo escuro"}
        className={`p-2.5 rounded-full bg-background/20 backdrop-blur-md border border-primary-foreground/20 text-primary-foreground hover:bg-background/30 transition-all active:scale-95 ${className}`}
      >
        {isDark ? <Sun size={18} /> : <Moon size={18} />}
      </button>
    );
  }

  return (
    <button
      onClick={toggle}
      aria-label={isDark ? "Mudar para modo claro" : "Mudar para modo escuro"}
      title={isDark ? "Modo claro" : "Modo escuro"}
      className={`p-2 rounded-xl text-primary-foreground hover:bg-primary-foreground/10 transition-all active:scale-95 ${className}`}
    >
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
