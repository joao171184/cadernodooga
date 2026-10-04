import { useRef } from "react";
import type { ServedAd } from "@/integrations/supabase/adsTypes";
import { useAuth } from "@/contexts/AuthContext";
import { adImageUrl, recordAdEvent } from "@/lib/ads/client";
import { canShowAdSense } from "@/lib/ads/adsense";
import { AdCreative } from "./AdCreative";
import { AdSenseUnit } from "./AdSenseUnit";
import { useAdConfig, useAdConsent, usePlacementAds, useViewableOnce } from "./useAds";

interface Props {
  placement: string;
  /** Anúncio já sorteado pelo pai (vários espaços iguais na mesma página). `null` = sem anúncio direto. */
  ad?: ServedAd | null;
  variant?: "banner" | "card";
  className?: string;
}

/**
 * Espaço publicitário: anúncio direto elegível → AdSense (se configurado e com consentimento) → nada.
 * Nunca deixa um buraco vazio no layout.
 */
export function AdSlot({ placement, ad: provided, variant = "banner", className = "" }: Props) {
  const config = useAdConfig();
  const consent = useAdConsent();
  const placementRow = config?.placements.get(placement);
  const ownAds = usePlacementAds(placement, 1, provided === undefined && !!placementRow?.enabled);
  const ad = provided === undefined ? ownAds?.[0] ?? (ownAds ? null : undefined) : provided;

  if (!config || !placementRow?.enabled || ad === undefined) return null;

  if (ad) return <DirectAd ad={ad} placement={placement} format={placementRow} variant={variant} className={className} />;

  if (canShowAdSense(config.settings, placementRow, consent)) {
    return (
      <AdSenseUnit
        client={config.settings.adsense_client!}
        slot={placementRow.adsense_slot!}
        minHeight={Math.min(placementRow.desktop_height, 280)}
        variant={variant}
        className={className}
      />
    );
  }
  return null;
}

function DirectAd({
  ad, placement, format, variant, className,
}: {
  ad: ServedAd;
  placement: string;
  format: { desktop_width: number; desktop_height: number; mobile_width: number; mobile_height: number };
  variant: "banner" | "card";
  className: string;
}) {
  const { isAdmin } = useAuth();
  const ref = useRef<HTMLElement>(null);
  useViewableOnce(ref, () => recordAdEvent(ad.id, placement, "impression"), !isAdmin);

  return (
    <AdCreative
      ref={ref}
      imageUrl={adImageUrl(ad.image_path)}
      mobileImageUrl={ad.image_mobile_path ? adImageUrl(ad.image_mobile_path) : null}
      alt={ad.alt_text}
      targetUrl={ad.target_url}
      advertiserName={ad.advertiser_name}
      revenueType={ad.revenue_type}
      format={format}
      variant={variant}
      className={className}
      onClick={isAdmin ? undefined : () => recordAdEvent(ad.id, placement, "click")}
    />
  );
}
