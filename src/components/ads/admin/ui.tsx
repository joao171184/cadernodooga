import type { ReactNode } from "react";
import type { CampaignStatus } from "@/lib/ads/status";
import { CAMPAIGN_STATUS_LABEL } from "@/lib/ads/status";

export const inputClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-accent/50 disabled:opacity-60";

export const btnPrimary =
  "inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-bold uppercase text-primary-foreground transition-all active:scale-95 disabled:opacity-60";
export const btnGhost =
  "inline-flex items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-bold uppercase text-foreground hover:bg-muted transition-all active:scale-95 disabled:opacity-60";

export function Field({ label, htmlFor, error, hint, children }: {
  label: string; htmlFor: string; error?: string; hint?: ReactNode; children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1 block text-[11px] font-bold uppercase text-foreground">{label}</label>
      {children}
      {hint && !error && <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>}
      {error && <p className="mt-1 text-[11px] text-destructive">{error}</p>}
    </div>
  );
}

const STATUS_STYLE: Record<CampaignStatus, string> = {
  draft: "bg-muted text-muted-foreground border-border",
  scheduled: "bg-blue-500/10 text-blue-600 dark:text-blue-300 border-blue-500/30",
  active: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  paused: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30",
  ended: "bg-destructive/10 text-destructive border-destructive/30",
  archived: "bg-muted text-muted-foreground border-border line-through",
};

export function StatusBadge({ status }: { status: CampaignStatus }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${STATUS_STYLE[status]}`}>
      {CAMPAIGN_STATUS_LABEL[status]}
    </span>
  );
}

export function formatCents(cents: number | null): string {
  if (cents == null) return "—";
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
