import type { AdPlacementRow, AdSettingsRow } from "@/integrations/supabase/adsTypes";
import type { AdConsent } from "./consent";

const CLIENT_RE = /^ca-pub-[0-9]{10,20}$/;
const SLOT_RE = /^[0-9]{6,20}$/;

/** AdSense ligado no painel, com ID de editor válido. Não considera consentimento. */
export function adsenseConfigured(settings: Pick<AdSettingsRow, "adsense_enabled" | "adsense_client"> | null | undefined): boolean {
  return !!settings?.adsense_enabled && !!settings.adsense_client && CLIENT_RE.test(settings.adsense_client);
}

/** Pode mostrar AdSense neste espaço: configurado, espaço com bloco válido e consentimento dado. */
export function canShowAdSense(
  settings: Pick<AdSettingsRow, "adsense_enabled" | "adsense_client"> | null | undefined,
  placement: Pick<AdPlacementRow, "enabled" | "adsense_enabled" | "adsense_slot"> | null | undefined,
  consent: AdConsent | null,
): boolean {
  return (
    adsenseConfigured(settings) &&
    !!placement?.enabled &&
    !!placement.adsense_enabled &&
    !!placement.adsense_slot &&
    SLOT_RE.test(placement.adsense_slot) &&
    consent === "granted"
  );
}

let scriptPromise: Promise<void> | null = null;

/** Carrega o script oficial do AdSense uma única vez (só chamado após consentimento). */
export function loadAdSenseScript(client: string): Promise<void> {
  if (!CLIENT_RE.test(client)) return Promise.reject(new Error("ID de editor inválido"));
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.async = true;
      s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(client)}`;
      s.crossOrigin = "anonymous";
      s.onload = () => resolve();
      s.onerror = () => {
        scriptPromise = null;
        reject(new Error("AdSense indisponível"));
      };
      document.head.appendChild(s);
    });
  }
  return scriptPromise;
}
