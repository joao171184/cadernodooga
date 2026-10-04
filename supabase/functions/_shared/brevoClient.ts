// Envio transacional pela API do Brevo. Nunca registra conteúdo, links ou a chave.

export const BREVO_ENDPOINT = "https://api.brevo.com/v3/smtp/email";

export interface BrevoMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
  tag: string;
}

export interface BrevoConfig {
  apiKey: string;
  senderEmail: string;
  senderName: string;
  timeoutMs?: number;
}

export type BrevoResult = { ok: true } | { ok: false; reason: "timeout" | "network" | "http"; status?: number };

export async function sendBrevoEmail(
  message: BrevoMessage,
  config: BrevoConfig,
  fetchImpl: typeof fetch = fetch,
): Promise<BrevoResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeoutMs ?? 4000);
  try {
    const res = await fetchImpl(BREVO_ENDPOINT, {
      method: "POST",
      headers: {
        "api-key": config.apiKey,
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        sender: { email: config.senderEmail, name: config.senderName },
        to: [{ email: message.to }],
        subject: message.subject,
        htmlContent: message.html,
        textContent: message.text,
        tags: [message.tag],
      }),
      signal: controller.signal,
    });
    if (!res.ok) return { ok: false, reason: "http", status: res.status };
    return { ok: true };
  } catch (e) {
    const aborted = (e as { name?: string })?.name === "AbortError";
    return { ok: false, reason: aborted ? "timeout" : "network" };
  } finally {
    clearTimeout(timer);
  }
}
