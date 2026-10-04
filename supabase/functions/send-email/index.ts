// Supabase Auth "Send Email Hook": envia confirmação de cadastro, reset de senha etc. via Brevo.
// Ativar em Authentication > Hooks > Send Email, apontando para esta função.
import { handleSendEmailHook } from "../_shared/sendEmailHook.ts";

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return Response.json({ error: { http_code: 405, message: "Método não permitido" } }, { status: 405 });
  }

  const rawBody = await req.text();
  const result = await handleSendEmailHook(
    rawBody,
    {
      id: req.headers.get("webhook-id"),
      timestamp: req.headers.get("webhook-timestamp"),
      signature: req.headers.get("webhook-signature"),
    },
    {
      BREVO_API_KEY: Deno.env.get("BREVO_API_KEY"),
      BREVO_SENDER_EMAIL: Deno.env.get("BREVO_SENDER_EMAIL"),
      BREVO_SENDER_NAME: Deno.env.get("BREVO_SENDER_NAME"),
      PUBLIC_SITE_URL: Deno.env.get("PUBLIC_SITE_URL"),
      SEND_EMAIL_HOOK_SECRET: Deno.env.get("SEND_EMAIL_HOOK_SECRET"),
    },
  );

  return Response.json(result.body, { status: result.status, headers: { "Cache-Control": "no-store" } });
});
