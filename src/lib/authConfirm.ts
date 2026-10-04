import type { EmailOtpType } from "@supabase/supabase-js";

export const RECOVERY_FLAG_KEY = "auth-recovery-verified";

const ALLOWED_TYPES: EmailOtpType[] = ["signup", "recovery", "email_change", "invite", "magiclink", "email"];
const TOKEN_HASH_RE = /^[A-Za-z0-9_-]{8,256}$/;
const SAFE_NEXT_RE = /^\/(?!\/)[A-Za-z0-9\-._~/]*$/;

export interface ParsedConfirmLink {
  tokenHash: string;
  type: EmailOtpType;
  next: string;
}

/** Valida os parâmetros do link de e-mail; `next` só aceita caminho interno. */
export function parseConfirmParams(search: string): ParsedConfirmLink | null {
  const params = new URLSearchParams(search);
  const tokenHash = params.get("token_hash") ?? "";
  const type = params.get("type") as EmailOtpType | null;
  const nextRaw = params.get("next") ?? "/";
  if (!TOKEN_HASH_RE.test(tokenHash) || !type || !ALLOWED_TYPES.includes(type)) return null;
  const next = SAFE_NEXT_RE.test(nextRaw) && !nextRaw.startsWith("/auth/") ? nextRaw : "/";
  return { tokenHash, type, next };
}
