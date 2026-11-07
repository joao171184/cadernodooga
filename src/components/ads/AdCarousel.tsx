import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ServedAd } from "@/integrations/supabase/adsTypes";
import { useAuth } from "@/contexts/AuthContext";
import { adImageUrl, recordAdEvent } from "@/lib/ads/client";
import { AdCreative, type AdFormat } from "./AdCreative";
import { useAdConfig, useViewableOnce } from "./useAds";

const DEFAULT_ROTATE_MS = 6000;
const FADE_MS = 400;
const NAV_PLACEMENTS = new Set(["topo-lista", "ponto-apos-letra"]);
const SWIPE_PX = 40;

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
  const config = useAdConfig();
  const secs = config?.settings.rotate_seconds;
  const ROTATE_MS = (secs && secs >= 2 && secs <= 60 ? secs : DEFAULT_ROTATE_MS / 1000) * 1000;
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
  const [navTick, setNavTick] = useState(0);
  const showNav = multi && NAV_PLACEMENTS.has(placement);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const swiped = useRef(false);

  const go = (delta: number) => {
    setOpaque(false);
    setTimeout(() => {
      setIndex((i) => (i + delta + ads.length) % ads.length);
      setOpaque(true);
    }, 150);
    setNavTick((t) => t + 1); // reinicia o tempo da troca automática
  };

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
  }, [paused, ads.length, ROTATE_MS, navTick]);

  if (!ad) return null;

  const onImpression = () => {
    if (isAdmin || seen.current.has(ad.id)) return;
    seen.current.add(ad.id);
    recordAdEvent(ad.id, placement, "impression");
  };

  return (
    <div
      className="group relative min-w-0"
      data-promo="carousel"
      onMouseEnter={() => setHoverPaused(true)}
      onMouseLeave={() => setHoverPaused(false)}
      onTouchStart={showNav ? (e) => {
        const t = e.touches[0];
        touchStart.current = { x: t.clientX, y: t.clientY };
        swiped.current = false;
      } : undefined}
      onTouchEnd={showNav ? (e) => {
        const s0 = touchStart.current;
        touchStart.current = null;
        if (!s0) return;
        const t = e.changedTouches[0];
        const dx = t.clientX - s0.x;
        const dy = t.clientY - s0.y;
        if (Math.abs(dx) > SWIPE_PX && Math.abs(dx) > Math.abs(dy)) {
          swiped.current = true;
          go(dx < 0 ? 1 : -1);
        }
      } : undefined}
      onClickCapture={showNav ? (e) => {
        if (swiped.current) {
          e.preventDefault();
          e.stopPropagation();
          swiped.current = false;
        }
      } : undefined}
      style={showNav ? { touchAction: "pan-y" } : undefined}
    >
      <div className="transition-opacity duration-500 ease-in-out" style={{ opacity: opaque ? 1 : 0 }}>
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
      {showNav && (
        <>
          <button
            type="button"
            onClick={() => go(-1)}
            aria-label="Anúncio anterior"
            className="hidden [@media(hover:hover)_and_(pointer:fine)]:flex absolute left-2 top-1/2 -translate-y-1/2 z-10 h-9 w-9 items-center justify-center rounded-full bg-background/80 text-foreground border border-border shadow-md backdrop-blur hover:bg-background transition-all duration-200 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto focus-visible:opacity-100 focus-visible:pointer-events-auto"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            aria-label="Próximo anúncio"
            className="hidden [@media(hover:hover)_and_(pointer:fine)]:flex absolute right-2 top-1/2 -translate-y-1/2 z-10 h-9 w-9 items-center justify-center rounded-full bg-background/80 text-foreground border border-border shadow-md backdrop-blur hover:bg-background transition-all duration-200 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto focus-visible:opacity-100 focus-visible:pointer-events-auto"
          >
            <ChevronRight size={20} />
          </button>
        </>
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
