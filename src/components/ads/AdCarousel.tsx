import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ServedAd } from "@/integrations/supabase/adsTypes";
import { useAuth } from "@/contexts/AuthContext";
import { adImageUrl, recordAdEvent } from "@/lib/ads/client";
import { Button } from "@/components/ui/button";
import { AdCreative, type AdFormat } from "./AdCreative";
import { useViewableOnce } from "./useAds";

const ROTATE_MIN_MS = 6000;
const ROTATE_SPAN_MS = 2000;

interface Props {
  ads: ServedAd[];
  placement: string;
  format: AdFormat;
  variant?: "banner" | "card";
  className?: string;
}

/** Um anúncio fixo, ou carrossel com ordem já sorteada, troca automática e controles acessíveis. */
export function AdCarousel({ ads, placement, format, variant = "banner", className = "" }: Props) {
  const { isAdmin } = useAuth();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const intervalMs = useRef(ROTATE_MIN_MS + Math.floor(Math.random() * (ROTATE_SPAN_MS + 1)));
  const multi = ads.length > 1;
  const ad = ads[index] ?? ads[0];

  useEffect(() => {
    if (!multi || paused) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % ads.length);
    }, intervalMs.current);
    return () => window.clearInterval(id);
  }, [multi, paused, ads.length]);

  if (!ad) return null;

  const go = (delta: number) => setIndex((i) => (i + delta + ads.length) % ads.length);

  return (
    <div
      className="relative"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setPaused(false);
      }}
    >
      <DirectAd
        key={ad.id}
        ad={ad}
        placement={placement}
        format={format}
        variant={variant}
        className={className}
        track={!isAdmin}
      />
      {multi && (
        <div className="pointer-events-none absolute inset-x-0 top-1/2 z-[1] flex -translate-y-1/2 justify-between px-1">
          <Button
            type="button"
            variant="secondary"
            size="icon"
            className="pointer-events-auto h-8 w-8 rounded-full border border-border bg-background/90 shadow-sm"
            aria-label="Anúncio anterior"
            onClick={() => go(-1)}
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="icon"
            className="pointer-events-auto h-8 w-8 rounded-full border border-border bg-background/90 shadow-sm"
            aria-label="Próximo anúncio"
            onClick={() => go(1)}
          >
            <ChevronRight className="h-4 w-4" aria-hidden />
          </Button>
        </div>
      )}
      {multi && (
        <p className="sr-only" aria-live="polite">
          Anúncio {index + 1} de {ads.length}
        </p>
      )}
    </div>
  );
}

function DirectAd({
  ad,
  placement,
  format,
  variant,
  className,
  track,
}: {
  ad: ServedAd;
  placement: string;
  format: AdFormat;
  variant: "banner" | "card";
  className: string;
  track: boolean;
}) {
  const ref = useRef<HTMLElement>(null);
  useViewableOnce(ref, () => recordAdEvent(ad.id, placement, "impression"), track);

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
      onClick={track ? () => recordAdEvent(ad.id, placement, "click") : undefined}
    />
  );
}
