// Links de e-mail montados apenas a partir da URL pública configurada no servidor.
// O host da requisição e o redirect_to recebido nunca definem o domínio do link.

export type LinkAction = "signup" | "invite" | "magiclink" | "recovery" | "email_change" | "email";

const TOKEN_HASH_RE = /^[A-Za-z0-9_-]{8,256}$/;
const SAFE_PATH_RE = /^\/(?!\/)[A-Za-z0-9\-._~/]*$/;

/** Normaliza PUBLIC_SITE_URL para uma origem. Só https (ou http://localhost para dev). */
export function normalizeSiteOrigin(raw: string | undefined | null): string | null {
  if (!raw) return null;
  try {
    const url = new URL(raw.trim());
    const isLocal = url.protocol === "http:" && (url.hostname === "localhost" || url.hostname === "127.0.0.1");
    if (url.protocol !== "https:" && !isLocal) return null;
    if (url.username || url.password) return null;
    return url.origin;
  } catch {
    return null;
  }
}

/** Caminho de retorno seguro: só se o redirect_to apontar para a mesma origem. */
export function safeNextPath(redirectTo: string | undefined | null, siteOrigin: string): string | null {
  if (!redirectTo) return null;
  try {
    const url = new URL(redirectTo, siteOrigin);
    if (url.origin !== siteOrigin) return null;
    if (!SAFE_PATH_RE.test(url.pathname)) return null;
    if (url.pathname.startsWith("/auth/confirm")) return null;
    return url.pathname;
  } catch {
    return null;
  }
}

export function buildConfirmUrl(
  siteOrigin: string,
  tokenHash: string,
  type: LinkAction,
  redirectTo?: string | null,
): string | null {
  if (!TOKEN_HASH_RE.test(tokenHash)) return null;
  const url = new URL("/auth/confirm", siteOrigin);
  url.searchParams.set("token_hash", tokenHash);
  url.searchParams.set("type", type);
  const next = safeNextPath(redirectTo, siteOrigin);
  if (next && next !== "/") url.searchParams.set("next", next);
  return url.toString();
}
