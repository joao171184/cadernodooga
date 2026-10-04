import { useEffect, useRef, useState, type RefObject } from "react";
import type { ServedAd } from "@/integrations/supabase/adsTypes";
import { fetchAds, loadAdConfig, type AdConfig } from "@/lib/ads/client";
import { getAdConsent, onAdConsentChange, type AdConsent } from "@/lib/ads/consent";

export function useAdConfig(): AdConfig | null | undefined {
  const [config, setConfig] = useState<AdConfig | null | undefined>(undefined);
  useEffect(() => {
    let alive = true;
    loadAdConfig().then((c) => { if (alive) setConfig(c); });
    return () => { alive = false; };
  }, []);
  return config;
}

export function useAdConsent(): AdConsent | null {
  const [consent, setConsent] = useState<AdConsent | null>(() => getAdConsent());
  useEffect(() => onAdConsentChange(() => setConsent(getAdConsent())), []);
  return consent;
}

/** Anúncios sorteados para o espaço; novo sorteio a cada montagem (carregamento da página). */
export function usePlacementAds(placement: string, count = 1, enabled = true): ServedAd[] | undefined {
  const [ads, setAds] = useState<ServedAd[] | undefined>(undefined);
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    fetchAds(placement, count).then((list) => { if (alive) setAds(list); });
    return () => { alive = false; };
  }, [placement, count, enabled]);
  return ads;
}

/** Dispara uma vez quando ao menos metade do elemento fica visível por 1 segundo. */
export function useViewableOnce(ref: RefObject<Element>, onViewable: () => void, active = true) {
  const fired = useRef(false);
  const cb = useRef(onViewable);
  cb.current = onViewable;
  useEffect(() => {
    const el = ref.current;
    if (!active || !el || fired.current || typeof IntersectionObserver === "undefined") return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
          timer ??= setTimeout(() => {
            if (fired.current) return;
            fired.current = true;
            io.disconnect();
            cb.current();
          }, 1000);
        } else if (timer) {
          clearTimeout(timer);
          timer = undefined;
        }
      },
      { threshold: [0, 0.5, 1] },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      if (timer) clearTimeout(timer);
    };
  }, [ref, active]);
}
