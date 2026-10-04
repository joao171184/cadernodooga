import { adsenseConfigured } from "@/lib/ads/adsense";
import { setAdConsent } from "@/lib/ads/consent";
import { useAdConfig, useAdConsent } from "./useAds";

/**
 * Pede consentimento antes de carregar o AdSense (cookies de publicidade).
 * Só aparece quando o AdSense está ligado no painel; anúncios diretos não usam cookies.
 */
export function AdConsentBanner() {
  const config = useAdConfig();
  const consent = useAdConsent();
  if (!config || !adsenseConfigured(config.settings) || consent !== null) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Consentimento de publicidade"
      className="fixed inset-x-3 bottom-3 z-[60] mx-auto max-w-xl rounded-2xl border border-border bg-card p-4 text-card-foreground shadow-2xl sm:inset-x-auto sm:right-4"
    >
      <p className="text-sm font-semibold">Anúncios e cookies</p>
      <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
        Para manter o Caderno do Ogã gratuito, exibimos anúncios do Google, que podem usar cookies para medir e
        personalizar a publicidade. Você pode recusar: o site continua funcionando normalmente.
        Anúncios diretos de parceiros não usam cookies.
      </p>
      <div className="mt-3 flex justify-end gap-2">
        <button
          onClick={() => setAdConsent("denied")}
          className="rounded-lg border border-border px-3 py-2 text-xs font-bold uppercase hover:bg-muted"
        >
          Recusar
        </button>
        <button
          onClick={() => setAdConsent("granted")}
          className="rounded-lg bg-primary px-3 py-2 text-xs font-bold uppercase text-primary-foreground"
        >
          Aceitar
        </button>
      </div>
    </div>
  );
}

/** Link para rever a escolha (rodapé). Só aparece com o AdSense ligado. */
export function AdConsentReset({ className = "" }: { className?: string }) {
  const config = useAdConfig();
  if (!config || !adsenseConfigured(config.settings)) return null;
  return (
    <button onClick={() => setAdConsent(null)} className={className}>
      Preferências de anúncios
    </button>
  );
}
