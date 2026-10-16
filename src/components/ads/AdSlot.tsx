import { useState } from "react";
import type { ServedAd } from "@/integrations/supabase/adsTypes";
import { ADS_FETCH_LIMIT } from "@/lib/ads/client";
import { canShowAdSense } from "@/lib/ads/adsense";
import { AdCarousel } from "./AdCarousel";
import { AdSenseUnit } from "./AdSenseUnit";
import { useAdConfig, useAdConsent, usePlacementAds } from "./useAds";

interface Props {
  placement: string;
  /** Anúncio já sorteado pelo pai (vários espaços iguais na mesma página). `null` = sem anúncio direto. */
  ad?: ServedAd | null;
  variant?: "banner" | "card";
  className?: string;
}

/**
 * Espaço publicitário por posição:
 * 1) anúncios próprios ativos → carrossel
 * 2) senão AdSense (se configurado + consentimento)
 * 3) se o Google não preencher → esconde (sem quadro vazio)
 */
export function AdSlot({ placement, ad: provided, variant = "banner", className = "" }: Props) {
  const config = useAdConfig();
  const consent = useAdConsent();
  const placementRow = config?.placements.get(placement);
  const enabled = !!placementRow?.enabled;
  const [adsenseFailed, setAdsenseFailed] = useState(false);

  // Busca só quando o pai não sorteou: `undefined` = fetch; `null` = sem próprio (AdSense ou esconde).
  const fetched = usePlacementAds(placement, ADS_FETCH_LIMIT, enabled && provided === undefined);
  const ownAds: ServedAd[] | undefined =
    provided === undefined ? fetched : provided ? [provided] : [];

  if (!config || !placementRow?.enabled) return null;
  if (ownAds === undefined) return null;

  if (ownAds.length > 0) {
    return (
      <AdCarousel
        ads={ownAds}
        placement={placement}
        format={placementRow}
        variant={variant}
        className={className}
      />
    );
  }

  if (canShowAdSense(config.settings, placementRow, consent) && !adsenseFailed) {
    return (
      <AdSenseUnit
        client={config.settings.adsense_client!}
        slot={placementRow.adsense_slot!}
        minHeight={Math.min(placementRow.desktop_height, 280)}
        variant={variant}
        className={className}
        onUnavailable={() => setAdsenseFailed(true)}
      />
    );
  }

  return null;
}
