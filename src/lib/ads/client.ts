import { adsDb, type AdPlacementRow, type AdSettingsRow, type ServedAd } from "@/integrations/supabase/adsTypes";
import { adSessionId, isLikelyBot } from "./session";

export const AD_BUCKET = "ads";

export interface AdConfig {
  settings: AdSettingsRow;
  placements: Map<string, AdPlacementRow>;
}

let configPromise: Promise<AdConfig | null> | null = null;

/** Configuração pública (espaços + AdSense). Uma vez por carregamento; null se indisponível. */
export function loadAdConfig(): Promise<AdConfig | null> {
  if (!configPromise) {
    configPromise = Promise.all([
      adsDb.from("ad_settings").select("*").maybeSingle(),
      adsDb.from("ad_placements").select("*").order("sort"),
    ])
      .then(([s, p]) => {
        if (s.error || p.error || !s.data) return null;
        return { settings: s.data, placements: new Map((p.data ?? []).map((row) => [row.key, row])) };
      })
      .catch(() => null);
  }
  return configPromise;
}

export function resetAdConfigCache() {
  configPromise = null;
}

export async function fetchAds(placement: string, count = 1): Promise<ServedAd[]> {
  try {
    const { data, error } = await adsDb.rpc("get_ads_for_placement", { _placement: placement, _count: count });
    if (error || !Array.isArray(data)) return [];
    return data;
  } catch {
    return [];
  }
}

export function adImageUrl(path: string): string {
  return adsDb.storage.from(AD_BUCKET).getPublicUrl(path).data.publicUrl;
}

/** Envia impressão/clique. O banco deduplica e ignora robôs e admins; aqui só evitamos chamadas inúteis. */
export function recordAdEvent(campaignId: string, placement: string, kind: "impression" | "click") {
  if (typeof navigator !== "undefined" && isLikelyBot(navigator)) return;
  void adsDb
    .rpc("record_ad_event", { _campaign_id: campaignId, _placement: placement, _kind: kind, _session: adSessionId() })
    .then(() => undefined, () => undefined);
}
