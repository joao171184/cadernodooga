import { adsDb, type AdPlacementRow, type AdSettingsRow, type ServedAd } from "@/integrations/supabase/adsTypes";
import { adSessionId, isLikelyBot } from "./session";

export { shuffleAds } from "./shuffle";

/** Bucket físico no Storage (legado). URL pública usa proxy same-origin /media/destaques. */
export const AD_BUCKET = "ads";
/** Prefixo lógico gravado em image_path (neutro para bloqueadores). */
export const AD_IMAGE_DIR = "destaques";
/** Path físico no bucket enquanto os arquivos não migram para parceiros/. */
export const AD_STORAGE_DIR = "campaigns";

export interface AdConfig {
  settings: AdSettingsRow;
  placements: Map<string, AdPlacementRow>;
}

let configPromise: Promise<AdConfig | null> | null = null;

function parseParceiroConfig(raw: unknown): AdConfig | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as { settings?: AdSettingsRow | null; placements?: AdPlacementRow[] | null };
  if (!obj.settings) return null;
  return {
    settings: obj.settings,
    placements: new Map((obj.placements ?? []).map((row) => [row.key, row])),
  };
}

/** Configuração pública via RPC neutra (fallback para tabelas se a migração ainda não rodou). */
export function loadAdConfig(): Promise<AdConfig | null> {
  if (!configPromise) {
    configPromise = adsDb
      .rpc("get_parceiro_config")
      .then(({ data, error }) => {
        if (!error && data) return parseParceiroConfig(data);
        return Promise.all([
          adsDb.from("ad_settings").select("*").maybeSingle(),
          adsDb.from("ad_placements").select("*").order("sort"),
        ]).then(([s, p]) => {
          if (s.error || p.error || !s.data) return null;
          return { settings: s.data, placements: new Map((p.data ?? []).map((row) => [row.key, row])) };
        });
      })
      .catch(() => null);
  }
  return configPromise;
}

export function resetAdConfigCache() {
  configPromise = null;
}

/** Máximo aceito pelo RPC de serving. */
export const ADS_FETCH_LIMIT = 10;

export async function fetchAds(placement: string, count = ADS_FETCH_LIMIT): Promise<ServedAd[]> {
  const n = Math.min(Math.max(count, 1), ADS_FETCH_LIMIT);
  try {
    const primary = await adsDb.rpc("get_parceiros_for_slot", { _slot: placement, _count: n });
    if (!primary.error && Array.isArray(primary.data)) return primary.data;
    const legacy = await adsDb.rpc("get_ads_for_placement", { _placement: placement, _count: n });
    if (legacy.error || !Array.isArray(legacy.data)) return [];
    return legacy.data;
  } catch {
    return [];
  }
}

/** Path físico no Storage a partir do path lógico do banco. */
export function storagePathFromDb(path: string): string {
  return path.replace(/^\/+/, "").replace(new RegExp(`^${AD_IMAGE_DIR}/`), `${AD_STORAGE_DIR}/`);
}

/** Path lógico para gravar no banco a partir do arquivo enviado. */
export function dbPathFromUpload(storagePath: string): string {
  return storagePath.replace(/^\/+/, "").replace(new RegExp(`^${AD_STORAGE_DIR}/`), `${AD_IMAGE_DIR}/`);
}

/**
 * URL da imagem para o visitante: same-origin `/media/destaques/...`
 * (o proxy no Vite/Vercel busca o arquivo no Storage sem `/ads/` na URL do browser).
 */
export function adImageUrl(path: string): string {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  const file = path.replace(/^\/+/, "").replace(/^(campaigns|destaques)\//, "");
  return `/media/destaques/${file}`;
}

/** Envia impressão/clique. O banco deduplica e ignora robôs e admins. */
export function recordAdEvent(campaignId: string, placement: string, kind: "impression" | "click") {
  if (typeof navigator !== "undefined" && isLikelyBot(navigator)) return;
  const args = { _campaign_id: campaignId, _placement: placement, _kind: kind, _session: adSessionId() };
  void adsDb
    .rpc("record_parceiro_event", args)
    .then((res) => {
      if (res.error) {
        void adsDb.rpc("record_ad_event", args).then(() => undefined, () => undefined);
      }
    }, () => {
      void adsDb.rpc("record_ad_event", args).then(() => undefined, () => undefined);
    });
}
