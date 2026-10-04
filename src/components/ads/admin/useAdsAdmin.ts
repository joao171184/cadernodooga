import { useCallback, useEffect, useState } from "react";
import {
  adsDb,
  type AdAdvertiserRow,
  type AdCampaignRow,
  type AdPlacementRow,
  type AdSettingsRow,
} from "@/integrations/supabase/adsTypes";

export interface AdsAdminData {
  advertisers: AdAdvertiserRow[];
  campaigns: AdCampaignRow[];
  placements: AdPlacementRow[];
  settings: AdSettingsRow | null;
}

const EMPTY: AdsAdminData = { advertisers: [], campaigns: [], placements: [], settings: null };

/** Dados do painel. `missing` = a migração 0005 ainda não foi aplicada no banco. */
export function useAdsAdmin() {
  const [data, setData] = useState<AdsAdminData>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<"missing" | "failed" | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    const [adv, camp, plc, set] = await Promise.all([
      adsDb.from("ad_advertisers").select("*").order("name"),
      adsDb.from("ad_campaigns").select("*").order("created_at", { ascending: false }),
      adsDb.from("ad_placements").select("*").order("sort"),
      adsDb.from("ad_settings").select("*").maybeSingle(),
    ]);
    const firstError = adv.error || camp.error || plc.error || set.error;
    if (firstError) {
      setError(firstError.code === "42P01" || firstError.code === "PGRST205" ? "missing" : "failed");
    } else {
      setError(null);
      setData({
        advertisers: adv.data ?? [],
        campaigns: camp.data ?? [],
        placements: plc.data ?? [],
        settings: set.data ?? null,
      });
    }
    setLoading(false);
  }, []);

  useEffect(() => { void reload(); }, [reload]);

  return { ...data, loading, error, reload };
}

export function dbErrorMessage(error: { code?: string; message?: string } | null | undefined): string {
  if (!error) return "Não foi possível salvar. Tente novamente.";
  if (error.code === "42501") return "Você não tem permissão para esta ação.";
  if (error.code === "23514") return "Algum campo não passou na validação do servidor. Confira os dados.";
  if (error.code === "23503") return "Este registro está em uso por outra informação e não pode ser removido.";
  return "Não foi possível salvar. Tente novamente.";
}
