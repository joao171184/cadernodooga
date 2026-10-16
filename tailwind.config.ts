import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
          strong: "hsl(var(--accent-strong))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        status: {
          active: "hsl(var(--status-active))",
          "active-fg": "hsl(var(--status-active-fg))",
          scheduled: "hsl(var(--status-scheduled))",
          "scheduled-fg": "hsl(var(--status-scheduled-fg))",
          paused: "hsl(var(--status-paused))",
          "paused-fg": "hsl(var(--status-paused-fg))",
          ended: "hsl(var(--status-ended))",
          "ended-fg": "hsl(var(--status-ended-fg))",
          draft: "hsl(var(--status-draft))",
          "draft-fg": "hsl(var(--status-draft-fg))",
          archived: "hsl(var(--status-archived))",
          "archived-fg": "hsl(var(--status-archived-fg))",
        },
        feedback: {
          warning: "hsl(var(--feedback-warning))",
          "warning-fg": "hsl(var(--feedback-warning-fg))",
          danger: "hsl(var(--feedback-danger))",
          "danger-fg": "hsl(var(--feedback-danger-fg))",
          success: "hsl(var(--feedback-success))",
          "success-fg": "hsl(var(--feedback-success-fg))",
          info: "hsl(var(--feedback-info))",
          "info-fg": "hsl(var(--feedback-info-fg))",
        },
        panel: {
          bg: "hsl(var(--panel-bg))",
          card: "hsl(var(--panel-card))",
          raised: "hsl(var(--panel-card-raised))",
          border: "hsl(var(--panel-border))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        panel: "var(--panel-radius)",
      },
      spacing: {
        panel: "var(--panel-gap)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.4s ease-out",
      },

    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
