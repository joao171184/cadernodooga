import type { AdCampaignRow } from "@/integrations/supabase/adsTypes";

export type CampaignStatus = "draft" | "scheduled" | "active" | "paused" | "ended" | "archived";

export const CAMPAIGN_STATUS_LABEL: Record<CampaignStatus, string> = {
  draft: "Rascunho",
  scheduled: "Agendado",
  active: "Ativo",
  paused: "Pausado",
  ended: "Encerrado",
  archived: "Arquivado",
};

type StatusInput = Pick<AdCampaignRow, "status" | "starts_at" | "ends_at" | "max_impressions" | "impressions_total">;

export function reachedLimit(c: Pick<AdCampaignRow, "max_impressions" | "impressions_total">): boolean {
  return c.max_impressions != null && c.impressions_total >= c.max_impressions;
}

/** Status exibido: mesmas regras que o banco usa para decidir se o anúncio é servido. */
export function computeCampaignStatus(c: StatusInput, now: Date = new Date()): CampaignStatus {
  if (c.status === "archived") return "archived";
  if (c.status === "draft") return "draft";
  const t = now.getTime();
  if (t >= new Date(c.ends_at).getTime() || reachedLimit(c)) return "ended";
  if (c.status === "paused") return "paused";
  if (t < new Date(c.starts_at).getTime()) return "scheduled";
  return "active";
}

export const ENDING_SOON_DAYS = 3;

/** Campanha no ar (ou agendada) que termina nos próximos dias. */
export function isEndingSoon(c: StatusInput, now: Date = new Date(), days = ENDING_SOON_DAYS): boolean {
  const s = computeCampaignStatus(c, now);
  if (s !== "active" && s !== "scheduled" && s !== "paused") return false;
  const left = new Date(c.ends_at).getTime() - now.getTime();
  return left > 0 && left <= days * 86_400_000;
}

/** Encerrada mas ainda marcada como ativa/pausada: precisa de atenção (arquivar ou renovar). */
export function needsArchiving(c: StatusInput, now: Date = new Date()): boolean {
  return (c.status === "active" || c.status === "paused") && computeCampaignStatus(c, now) === "ended";
}
