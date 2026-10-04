// Política de cache do service worker para a API REST do Supabase.
// `isPublicApiRequest` é serializada pelo Workbox (toString): não pode referenciar nada fora do corpo.

export const API_CACHE_NAME = "api-publica-v2";
/** Caches antigos que podiam conter dados privados (antes da allowlist de tabelas). */
export const LEGACY_API_CACHES = ["api-dados"];

export function isPublicApiRequest({ url, request }: { url: URL; request: Request }): boolean {
  return (
    request.method === "GET" &&
    /^\/rest\/v1\/(pontos|categorias|ponto_subcategorias|ponto_classificacoes|ponto_toque_ordem)$/.test(url.pathname)
  );
}

async function deleteCaches(names: string[]): Promise<void> {
  const store = (globalThis as { caches?: { delete(name: string): Promise<boolean> } }).caches;
  if (!store) return;
  await Promise.allSettled(names.map((n) => store.delete(n)));
}

export function purgeLegacyApiCaches(): Promise<void> {
  return deleteCaches(LEGACY_API_CACHES);
}

/** Apaga dados de API em cache (chamado no logout para não deixar dados no aparelho). */
export function clearApiCaches(): Promise<void> {
  return deleteCaches([API_CACHE_NAME, ...LEGACY_API_CACHES]);
}
