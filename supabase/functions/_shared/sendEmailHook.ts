// Orquestração do Send Email Hook: assinatura -> payload -> templates -> Brevo.
// Os tokens são gerados, guardados (hash), expirados e invalidados pelo Supabase Auth.

import { verifyWebhook, type WebhookHeaders } from "./webhookSignature.ts";
import { buildConfirmUrl, normalizeSiteOrigin, type LinkAction } from "./emailLinks.ts";
import { renderEmail } from "./emailTemplates.ts";
import { sendBrevoEmail, type BrevoMessage } from "./brevoClient.ts";

export interface SendEmailEnv {
  BREVO_API_KEY?: string;
  BREVO_SENDER_EMAIL?: string;
  BREVO_SENDER_NAME?: string;
  PUBLIC_SITE_URL?: string;
  SEND_EMAIL_HOOK_SECRET?: string;
}

export interface SendEmailDeps {
  fetch?: typeof fetch;
  nowSeconds?: number;
  log?: (message: string) => void;
}

export interface HookResponse {
  status: number;
  body: Record<string, unknown>;
}

interface HookPayload {
  user: { email?: string; new_email?: string };
  email_data: {
    token?: string;
    token_hash?: string;
    token_new?: string;
    token_hash_new?: string;
    redirect_to?: string;
    email_action_type?: string;
  };
}

const LINK_ACTIONS = new Set<LinkAction>(["signup", "invite", "magiclink", "recovery", "email_change", "email"]);
const EMAIL_RE = /^[^\s@<>"']{1,64}@[^\s@<>"']{1,255}$/;

const hookError = (status: number, message: string): HookResponse => ({
  status,
  body: { error: { http_code: status, message } },
});

function isPayload(value: unknown): value is HookPayload {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    !!v.user && typeof v.user === "object" &&
    !!v.email_data && typeof v.email_data === "object" &&
    typeof (v.email_data as Record<string, unknown>).email_action_type === "string"
  );
}

function plan(payload: HookPayload, siteOrigin: string): { to: string; action: string; link?: string | null; code?: string | null }[] | null {
  const { user, email_data: d } = payload;
  const action = d.email_action_type!;
  const current = user.email;

  if (action === "email_change") {
    const out: { to: string; action: string; link: string | null }[] = [];
    const secure = !!(d.token_hash && d.token_hash_new);
    if (secure) {
      // Nomes invertidos por compatibilidade: token_hash_new -> e-mail atual; token_hash -> novo.
      if (current) out.push({ to: current, action, link: buildConfirmUrl(siteOrigin, d.token_hash_new!, "email_change", d.redirect_to) });
      if (user.new_email) out.push({ to: user.new_email, action, link: buildConfirmUrl(siteOrigin, d.token_hash!, "email_change", d.redirect_to) });
    } else {
      const hash = d.token_hash || d.token_hash_new;
      const to = user.new_email || current;
      if (to && hash) out.push({ to, action, link: buildConfirmUrl(siteOrigin, hash, "email_change", d.redirect_to) });
    }
    return out.length && out.every((m) => m.link) ? out : null;
  }

  if (!current) return null;

  if (LINK_ACTIONS.has(action as LinkAction)) {
    if (!d.token_hash) return null;
    const link = buildConfirmUrl(siteOrigin, d.token_hash, action as LinkAction, d.redirect_to);
    return link ? [{ to: current, action, link }] : null;
  }
  if (action === "reauthentication") {
    return d.token && /^\d{6,10}$/.test(d.token) ? [{ to: current, action, code: d.token }] : null;
  }
  if (action.endsWith("_notification")) {
    return [{ to: current, action }];
  }
  return null;
}

export async function handleSendEmailHook(
  rawBody: string,
  headers: WebhookHeaders,
  env: SendEmailEnv,
  deps: SendEmailDeps = {},
): Promise<HookResponse> {
  const log = deps.log ?? ((m: string) => console.error(m));

  const siteOrigin = normalizeSiteOrigin(env.PUBLIC_SITE_URL);
  if (!env.BREVO_API_KEY || !env.BREVO_SENDER_EMAIL || !env.SEND_EMAIL_HOOK_SECRET || !siteOrigin) {
    log("send-email: configuração ausente ou inválida");
    return hookError(500, "Serviço de e-mail indisponível");
  }

  if (rawBody.length > 64 * 1024) return hookError(413, "Payload muito grande");

  const valid = await verifyWebhook(rawBody, headers, env.SEND_EMAIL_HOOK_SECRET, deps.nowSeconds);
  if (!valid) {
    log("send-email: assinatura inválida");
    return hookError(401, "Assinatura inválida");
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return hookError(400, "Payload inválido");
  }
  if (!isPayload(payload)) return hookError(400, "Payload inválido");

  const messages = plan(payload, siteOrigin);
  const action = payload.email_data.email_action_type!;
  if (!messages) {
    log(`send-email: payload sem dados suficientes (${action.slice(0, 40)})`);
    return hookError(400, "Payload inválido");
  }

  for (const m of messages) {
    if (!EMAIL_RE.test(m.to)) return hookError(400, "Payload inválido");
    const rendered = renderEmail(m.action, { siteOrigin, link: m.link, code: m.code });
    if (!rendered) return hookError(400, "Tipo de e-mail não suportado");

    const message: BrevoMessage = { to: m.to, tag: m.action, ...rendered };
    const result = await sendBrevoEmail(
      message,
      {
        apiKey: env.BREVO_API_KEY,
        senderEmail: env.BREVO_SENDER_EMAIL,
        senderName: env.BREVO_SENDER_NAME || "Caderno do Ogã",
      },
      deps.fetch,
    );
    if (!result.ok) {
      log(`send-email: falha no Brevo (${m.action}, ${result.reason}${result.status ? ` ${result.status}` : ""})`);
      return hookError(502, "Não foi possível enviar o e-mail agora");
    }
  }

  return { status: 200, body: {} };
}
