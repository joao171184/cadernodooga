// Verificação de assinatura no padrão Standard Webhooks (usado pelos Auth Hooks do Supabase).
// HMAC-SHA256 sobre `${id}.${timestamp}.${payload}`, via Web Crypto (Deno e Node 18+).

const DEFAULT_TOLERANCE_SECONDS = 5 * 60;

export interface WebhookHeaders {
  id: string | null;
  timestamp: string | null;
  signature: string | null;
}

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function bytesToBase64(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function decodeWebhookSecret(secret: string): Uint8Array | null {
  const raw = secret.trim().replace(/^v1,/, "").replace(/^whsec_/, "");
  if (!raw) return null;
  try {
    const bytes = base64ToBytes(raw);
    return bytes.length >= 16 ? bytes : null;
  } catch {
    return null;
  }
}

export async function signWebhook(
  secret: Uint8Array,
  id: string,
  timestamp: string,
  payload: string,
): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    secret,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${id}.${timestamp}.${payload}`));
  return bytesToBase64(new Uint8Array(sig));
}

export async function verifyWebhook(
  payload: string,
  headers: WebhookHeaders,
  secret: string,
  nowSeconds: number = Math.floor(Date.now() / 1000),
  toleranceSeconds: number = DEFAULT_TOLERANCE_SECONDS,
): Promise<boolean> {
  const { id, timestamp, signature } = headers;
  if (!id || !timestamp || !signature) return false;
  if (!/^\d{1,12}$/.test(timestamp)) return false;
  if (Math.abs(nowSeconds - Number(timestamp)) > toleranceSeconds) return false;

  const key = decodeWebhookSecret(secret);
  if (!key) return false;

  const expected = await signWebhook(key, id, timestamp, payload);
  return signature
    .split(" ")
    .map((part) => part.trim())
    .filter((part) => part.startsWith("v1,"))
    .some((part) => timingSafeEqual(part.slice(3), expected));
}
