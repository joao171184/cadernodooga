import { useEffect, useRef, useState } from "react";
import type { ServedAd } from "@/integrations/supabase/adsTypes";
import { useAuth } from "@/contexts/AuthContext";
import { adImageUrl, recordAdEvent } from "@/lib/ads/client";
import { AdCreative, type AdFormat } from "./AdCreative";
import { useViewableOnce } from "./useAds";

const ROTATE_MS = 6000;
const FADE_MS = 400;

interface Props {
  ads: ServedAd[];
  placement: string;
  format: AdFormat;
  variant?: "banner" | "card";
  className?: string;
}

/**
 * Um anúncio fixo, ou carrossel automático (6s) com fade.
 * Ordem já vem sorteada com peso do SQL. Sem setas/contador.
 */
export function AdCarousel({ ads, placement, format, variant = "banner", className = "" }: Props) {
  const { isAdmin } = useAuth();
  const [index, setIndex] = useState(0);
  const [opaque, setOpaque] = useState(true);
  const [hoverPaused, setHoverPaused] = useState(false);
  const [tabHidden, setTabHidden] = useState(
    () => typeof document !== "undefined" && document.hidden,
  );
  const [reducedMotion, setReducedMotion] = useState(false);
  const seen = useRef(new Set<string>());
  const multi = ads.length > 1;
  const paused = !multi || hoverPaused || tabHidden || reducedMotion;
  const ad = ads[index] ?? ads[0];

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncMq = () => setReducedMotion(mq.matches);
    syncMq();
    mq.addEventListener("change", syncMq);
    const onVis = () => setTabHidden(document.hidden);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      mq.removeEventListener("change", syncMq);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  useEffect(() => {
    if (paused) {
      setOpaque(true);
      return;
    }
    let fadeTimer: ReturnType<typeof setTimeout> | undefined;
    const id = window.setInterval(() => {
      setOpaque(false);
      fadeTimer = setTimeout(() => {
        setIndex((i) => (i + 1) % ads.length);
        setOpaque(true);
      }, FADE_MS);
    }, ROTATE_MS);
    return () => {
      window.clearInterval(id);
      if (fadeTimer) clearTimeout(fadeTimer);
    };
  }, [paused, ads.length]);

  if (!ad) return null;

  const onImpression = () => {
    if (isAdmin || seen.current.has(ad.id)) return;
    seen.current.add(ad.id);
    recordAdEvent(ad.id, placement, "impression");
  };

  return (
    <div
      className="min-w-0 transition-opacity duration-500 ease-in-out"
      style={{ opacity: opaque ? 1 : 0 }}
      data-promo="carousel"
      onMouseEnter={() => setHoverPaused(true)}
      onMouseLeave={() => setHoverPaused(false)}
    >
      <DirectAd
        key={ad.id}
        ad={ad}
        placement={placement}
        format={format}
        variant={variant}
        className={className}
        trackClick={!isAdmin}
        onImpression={onImpression}
      />
    </div>
  );
}

function DirectAd({
  ad,
  placement,
  format,
  variant,
  className,
  trackClick,
  onImpression,
}: {
  ad: ServedAd;
  placement: string;
  format: AdFormat;
  variant: "banner" | "card";
  className: string;
  trackClick: boolean;
  onImpression: () => void;
}) {
  const ref = useRef<HTMLElement>(null);
  useViewableOnce(ref, onImpression, true);

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
      onClick={trackClick ? () => recordAdEvent(ad.id, placement, "click") : undefined}
    />
  );
}
