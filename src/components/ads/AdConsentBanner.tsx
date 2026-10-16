import { adsenseConfigured } from "@/lib/ads/adsense";
import { setAdConsent } from "@/lib/ads/consent";
import { useAdConfig, useAdConsent } from "./useAds";

/**
 * Pedido de preferência antes de carregar o script do Google.
 * Parceiros diretos não usam cookies de medição do Google.
 */
export function AdConsentBanner() {
  const config = useAdConfig();
  const consent = useAdConsent();
  if (!config || !adsenseConfigured(config.settings) || consent !== null) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Preferências de conteúdo"
      className="fixed inset-x-3 bottom-3 z-[60] mx-auto max-w-xl rounded-2xl border border-border bg-card p-4 text-card-foreground shadow-2xl sm:inset-x-auto sm:right-4"
      data-promo="consent"
    >
      <p className="text-sm font-semibold">Conteúdo e cookies</p>
      <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
        Para manter o Caderno do Ogã gratuito, podemos exibir conteúdo do Google, que pode usar cookies para medir e
        personalizar a experiência. Você pode recusar: o site continua funcionando normalmente.
        Destaques de parceiros não usam esses cookies.
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

/** Link para rever a escolha (rodapé). Só aparece com o Google ligado no painel. */
export function AdConsentReset({ className = "" }: { className?: string }) {
  const config = useAdConfig();
  if (!config || !adsenseConfigured(config.settings)) return null;
  return (
    <button onClick={() => setAdConsent(null)} className={className}>
      Preferências de conteúdo
    </button>
  );
}
