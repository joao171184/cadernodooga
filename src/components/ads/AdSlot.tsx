import { useState } from "react";
import type { ServedAd } from "@/integrations/supabase/adsTypes";
import { ADS_FETCH_LIMIT } from "@/lib/ads/client";
import { canShowAdSense } from "@/lib/ads/adsense";
import { AdCarousel } from "./AdCarousel";
import { AdSenseUnit } from "./AdSenseUnit";
import { useAdConfig, useAdConsent, usePlacementAds } from "./useAds";

interface Props {
  placement: string;
  /** Anúncio já sorteado pelo pai. `null` = sem próprio exclusivo (tenta AdSense, depois reserva). */
  ad?: ServedAd | null;
  /** Pool para repetir quando AdSense não está ativo ou não preenche. */
  reservePool?: ServedAd[];
  /** Índice no pool de reserva (ex.: posição do bloco na lista). */
  reserveIndex?: number;
  variant?: "banner" | "card";
  className?: string;
}

/**
 * Espaço por posição:
 * 1) próprio (único ou carrossel)
 * 2) AdSense (se configurado + consentimento)
 * 3) reserva (repetir próprios) se houver pool
 * 4) esconde
 */
export function AdSlot({
  placement,
  ad: provided,
  reservePool,
  reserveIndex = 0,
  variant = "banner",
  className = "",
}: Props) {
  const config = useAdConfig();
  const consent = useAdConsent();
  const placementRow = config?.placements.get(placement);
  const enabled = !!placementRow?.enabled;
  const [adsenseFailed, setAdsenseFailed] = useState(false);

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

  const showGoogle = canShowAdSense(config.settings, placementRow, consent) && !adsenseFailed;
  if (showGoogle) {
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

  if (reservePool && reservePool.length > 0) {
    const reserved = reservePool[Math.abs(reserveIndex) % reservePool.length];
    return (
      <AdCarousel
        ads={[reserved]}
        placement={placement}
        format={placementRow}
        variant={variant}
        className={className}
      />
    );
  }

  return null;
}
