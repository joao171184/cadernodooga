const SESSION_KEY = "ads-session";

/**
 * Identificador anônimo só desta aba/sessão (sessionStorage), usado para não contar a mesma
 * impressão ou clique duas vezes. Some ao fechar o navegador e não identifica a pessoa.
 */
export function adSessionId(): string {
  try {
    const existing = sessionStorage.getItem(SESSION_KEY);
    if (existing && /^[A-Za-z0-9-]{16,64}$/.test(existing)) return existing;
    const id = crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, id);
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

const BOT_UA = /(bot|crawler|spider|slurp|headless|lighthouse|preview|facebookexternalhit)/i;

export function isLikelyBot(nav: Pick<Navigator, "userAgent"> & { webdriver?: boolean } = navigator): boolean {
  return !!nav.webdriver || BOT_UA.test(nav.userAgent || "");
}
