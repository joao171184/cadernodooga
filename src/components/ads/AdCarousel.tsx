import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ServedAd } from "@/integrations/supabase/adsTypes";
import { useAuth } from "@/contexts/AuthContext";
import { adImageUrl, recordAdEvent } from "@/lib/ads/client";
import { Button } from "@/components/ui/button";
import { AdCreative, type AdFormat } from "./AdCreative";
import { useViewableOnce } from "./useAds";

/** Intervalo fixo de troca do carrossel. */
const ROTATE_MS = 7000;

interface Props {
  ads: ServedAd[];
  placement: string;
  format: AdFormat;
  variant?: "banner" | "card";
  className?: string;
}

/**
 * Um anúncio fixo, ou carrossel na ordem já sorteada (peso no SQL).
 * Controles abaixo da imagem para não bloquear o clique no link.
 */
export function AdCarousel({ ads, placement, format, variant = "banner", className = "" }: Props) {
  const { isAdmin } = useAuth();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const multi = ads.length > 1;
  const ad = ads[index] ?? ads[0];

  useEffect(() => {
    if (!multi || paused) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % ads.length);
    }, ROTATE_MS);
    return () => window.clearInterval(id);
  }, [multi, paused, ads.length]);

  if (!ad) return null;

  const go = (delta: number) => setIndex((i) => (i + delta + ads.length) % ads.length);

  return (
    <div
      className="min-w-0"
      style={{
        ["--promo-slot-ratio" as string]: `${format.desktop_width} / ${format.desktop_height}`,
      }}
      data-promo="carousel"
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
        <div className="mt-1.5 flex items-center justify-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8"
            aria-label="Anúncio anterior"
            onClick={() => go(-1)}
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </Button>
          <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground tabular-nums" aria-live="polite">
            {index + 1} / {ads.length}
          </span>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8"
            aria-label="Próximo anúncio"
            onClick={() => go(1)}
          >
            <ChevronRight className="h-4 w-4" aria-hidden />
          </Button>
        </div>
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
