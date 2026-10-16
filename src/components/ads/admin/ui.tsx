import type { ReactNode } from "react";
import type { CampaignStatus } from "@/lib/ads/status";
import { CAMPAIGN_STATUS_LABEL } from "@/lib/ads/status";

export const inputClass =
  "w-full rounded-panel border border-panel-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-60";

export const btnPrimary =
  "inline-flex items-center justify-center gap-1.5 rounded-panel bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.98] disabled:opacity-60";
export const btnGhost =
  "inline-flex items-center justify-center gap-1.5 rounded-panel border border-panel-border bg-panel-card px-3 py-2 text-xs font-semibold text-foreground shadow-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.98] disabled:opacity-60";
export const btnDanger =
  "inline-flex items-center justify-center gap-1.5 rounded-panel border border-feedback-danger-fg/30 bg-feedback-danger px-3 py-2 text-xs font-semibold text-feedback-danger-fg shadow-sm transition-colors hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.98] disabled:opacity-60";

export function Field({ label, htmlFor, error, hint, children }: {
  label: string; htmlFor: string; error?: string; hint?: ReactNode; children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-foreground">{label}</label>
      {children}
      {hint && !error && <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>}
      {error && <p className="mt-1 text-[11px] text-feedback-danger-fg">{error}</p>}
    </div>
  );
}

export const STATUS_SURFACE: Record<CampaignStatus, string> = {
  active: "bg-status-active text-status-active-fg border-status-active-fg/25",
  scheduled: "bg-status-scheduled text-status-scheduled-fg border-status-scheduled-fg/25",
  paused: "bg-status-paused text-status-paused-fg border-status-paused-fg/25",
  ended: "bg-status-ended text-status-ended-fg border-status-ended-fg/25",
  draft: "bg-status-draft text-status-draft-fg border-status-draft-fg/25",
  archived: "bg-status-archived text-status-archived-fg border-status-archived-fg/25",
};

export function StatusBadge({ status }: { status: CampaignStatus }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${STATUS_SURFACE[status]} ${status === "archived" ? "line-through" : ""}`}>
      {CAMPAIGN_STATUS_LABEL[status]}
    </span>
  );
}

export function formatCents(cents: number | null): string {
  if (cents == null) return "—";
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
