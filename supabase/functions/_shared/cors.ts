// CORS por allowlist. ALLOWED_ORIGINS = lista separada por vírgula de origens exatas.
// Sem a variável (ex.: Lovable Cloud sem acesso a secrets), vale o domínio de produção.

export const DEFAULT_ALLOWED_ORIGINS = [
  "https://cadernodooga.com.br",
  "https://www.cadernodooga.com.br",
];

export function parseAllowedOrigins(
  raw: string | undefined | null,
  fallback: string[] = DEFAULT_ALLOWED_ORIGINS,
): string[] {
  const parsed = (raw ?? "")
    .split(",")
    .map((o) => o.trim().replace(/\/+$/, ""))
    .filter((o) => /^https?:\/\/[^/\s]+$/.test(o));
  return parsed.length > 0 ? parsed : [...fallback];
}

export function corsHeadersFor(
  requestOrigin: string | null,
  allowedOrigins: string[],
): Record<string, string> {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
  if (requestOrigin && allowedOrigins.includes(requestOrigin)) {
    headers["Access-Control-Allow-Origin"] = requestOrigin;
  }
  return headers;
}
