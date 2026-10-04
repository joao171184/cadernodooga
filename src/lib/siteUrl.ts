// URL pública confiável usada em links de autenticação. Em produção nunca vem do host atual.

const DEFAULT_SITE_URL = "https://cadernodooga.com.br";

function normalize(raw: string | undefined): string {
  try {
    const url = new URL(raw || DEFAULT_SITE_URL);
    if (url.protocol !== "https:" && url.hostname !== "localhost") return DEFAULT_SITE_URL;
    return url.origin;
  } catch {
    return DEFAULT_SITE_URL;
  }
}

export const SITE_URL = normalize(import.meta.env.VITE_PUBLIC_SITE_URL);

/** Origem para redirectTo: em dev usa o localhost atual; em produção, sempre SITE_URL. */
export function authRedirectOrigin(): string {
  if (import.meta.env.DEV && typeof window !== "undefined") return window.location.origin;
  return SITE_URL;
}
