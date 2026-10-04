// @vitest-environment node
import { describe, it, expect, vi } from "vitest";
import { handleSendEmailHook, type SendEmailEnv } from "./sendEmailHook";
import { decodeWebhookSecret, signWebhook, verifyWebhook } from "./webhookSignature";
import { buildConfirmUrl, normalizeSiteOrigin, safeNextPath } from "./emailLinks";
import { escapeHtml, renderEmail } from "./emailTemplates";
import { BREVO_ENDPOINT, sendBrevoEmail } from "./brevoClient";

// Dados 100% artificiais.
const SECRET = "v1,whsec_" + Buffer.from("segredo-de-teste-com-32-bytes!!!").toString("base64");
const NOW = 1_800_000_000;
const TOKEN_HASH = "pkce_0123456789abcdef0123456789abcdef";
const OTP = "123456";

const ENV: SendEmailEnv = {
  BREVO_API_KEY: "xkeysib-fake-test-key",
  BREVO_SENDER_EMAIL: "nao-responda@exemplo.test",
  BREVO_SENDER_NAME: "Teste",
  PUBLIC_SITE_URL: "https://cadernodooga.com.br",
  SEND_EMAIL_HOOK_SECRET: SECRET,
};

function payload(action: string, extra: Record<string, unknown> = {}, user: Record<string, unknown> = {}) {
  return JSON.stringify({
    user: { id: "00000000-0000-4000-8000-000000000001", email: "pessoa@exemplo.test", ...user },
    email_data: {
      token: OTP,
      token_hash: TOKEN_HASH,
      redirect_to: "https://cadernodooga.com.br/",
      email_action_type: action,
      site_url: "https://evil.example",
      token_new: "",
      token_hash_new: "",
      ...extra,
    },
  });
}

async function signed(body: string, ts = NOW) {
  const sig = await signWebhook(decodeWebhookSecret(SECRET)!, "msg_1", String(ts), body);
  return { id: "msg_1", timestamp: String(ts), signature: `v1,${sig}` };
}

function okFetch() {
  return vi.fn(async () => new Response("{}", { status: 201 })) as unknown as typeof fetch & ReturnType<typeof vi.fn>;
}

function sentBodies(f: ReturnType<typeof vi.fn>) {
  return f.mock.calls.map((c) => JSON.parse((c[1] as RequestInit).body as string));
}

describe("verifyWebhook", () => {
  it("aceita assinatura válida e rejeita adulterada, expirada ou ausente", async () => {
    const body = payload("signup");
    const h = await signed(body);
    expect(await verifyWebhook(body, h, SECRET, NOW)).toBe(true);
    expect(await verifyWebhook(body + " ", h, SECRET, NOW)).toBe(false);
    expect(await verifyWebhook(body, { ...h, signature: "v1,AAAA" }, SECRET, NOW)).toBe(false);
    expect(await verifyWebhook(body, h, SECRET, NOW + 301)).toBe(false);
    expect(await verifyWebhook(body, { ...h, signature: null }, SECRET, NOW)).toBe(false);
    expect(await verifyWebhook(body, h, "v1,whsec_" + Buffer.from("outro-segredo-qualquer-32-bytes!").toString("base64"), NOW)).toBe(false);
  });
});

describe("emailLinks", () => {
  it("monta links só com a origem configurada", () => {
    expect(normalizeSiteOrigin("http://cadernodooga.com.br")).toBeNull();
    expect(normalizeSiteOrigin("https://user:pw@cadernodooga.com.br")).toBeNull();
    expect(normalizeSiteOrigin("https://cadernodooga.com.br/qualquer")).toBe("https://cadernodooga.com.br");
    const url = new URL(buildConfirmUrl("https://cadernodooga.com.br", TOKEN_HASH, "recovery")!);
    expect(url.origin).toBe("https://cadernodooga.com.br");
    expect(url.pathname).toBe("/auth/confirm");
    expect(url.searchParams.get("type")).toBe("recovery");
  });

  it("ignora redirect_to de outro domínio (open redirect)", () => {
    const o = "https://cadernodooga.com.br";
    expect(safeNextPath("https://evil.example/phish", o)).toBeNull();
    expect(safeNextPath("//evil.example/x", o)).toBeNull();
    expect(safeNextPath("javascript:alert(1)", o)).toBeNull();
    expect(safeNextPath("https://cadernodooga.com.br/favoritos", o)).toBe("/favoritos");
    expect(buildConfirmUrl(o, "token com espaço", "signup")).toBeNull();
  });
});

describe("emailTemplates", () => {
  it("escapa HTML e usa URL absoluta", () => {
    expect(escapeHtml(`<a href="x">'&`)).toBe("&lt;a href=&quot;x&quot;&gt;&#39;&amp;");
    const r = renderEmail("signup", {
      siteOrigin: "https://cadernodooga.com.br",
      link: 'https://cadernodooga.com.br/auth/confirm?token_hash=a&type=signup"><script>',
    })!;
    expect(r.html).not.toContain("<script>");
    expect(r.html).toContain("https://cadernodooga.com.br/auth/confirm");
    expect(r.text).toContain("https://cadernodooga.com.br/auth/confirm");
    expect(renderEmail("password_changed_notification", { siteOrigin: "https://x.test" })!.html).not.toMatch(/token|senha:/i);
    expect(renderEmail("tipo_desconhecido", { siteOrigin: "https://x.test" })).toBeNull();
  });
});

describe("handleSendEmailHook", () => {
  it("envia confirmação de cadastro via Brevo com link do site oficial", async () => {
    const f = okFetch();
    const body = payload("signup");
    const res = await handleSendEmailHook(body, await signed(body), ENV, { fetch: f, nowSeconds: NOW, log: () => {} });
    expect(res).toEqual({ status: 200, body: {} });
    expect(f).toHaveBeenCalledTimes(1);
    expect(f.mock.calls[0][0]).toBe(BREVO_ENDPOINT);
    const init = f.mock.calls[0][1] as RequestInit;
    expect((init.headers as Record<string, string>)["api-key"]).toBe(ENV.BREVO_API_KEY);
    const sent = sentBodies(f)[0];
    expect(sent.to).toEqual([{ email: "pessoa@exemplo.test" }]);
    expect(sent.sender.email).toBe(ENV.BREVO_SENDER_EMAIL);
    expect(sent.htmlContent).toContain(`https://cadernodooga.com.br/auth/confirm?token_hash=${TOKEN_HASH}&amp;type=signup`);
    expect(sent.htmlContent).not.toContain("evil.example");
  });

  it("rejeita assinatura inválida sem enviar nada", async () => {
    const f = okFetch();
    const body = payload("recovery");
    const res = await handleSendEmailHook(body, { id: "x", timestamp: String(NOW), signature: "v1,ZmFrZQ==" }, ENV, {
      fetch: f, nowSeconds: NOW, log: () => {},
    });
    expect(res.status).toBe(401);
    expect(f).not.toHaveBeenCalled();
  });

  it("falha do Brevo devolve erro genérico e não vaza token nos logs", async () => {
    const logs: string[] = [];
    const errSpy = vi.spyOn(console, "error").mockImplementation((...a) => { logs.push(a.join(" ")); });
    const logSpy = vi.spyOn(console, "log").mockImplementation((...a) => { logs.push(a.join(" ")); });
    const f = vi.fn(async () => new Response("erro interno", { status: 500 })) as unknown as typeof fetch;
    const body = payload("recovery");
    const res = await handleSendEmailHook(body, await signed(body), ENV, { fetch: f, nowSeconds: NOW });
    expect(res.status).toBe(502);
    expect(JSON.stringify(res.body)).not.toMatch(/pessoa@|token|xkeysib/i);
    const all = logs.join("\n");
    expect(all).toContain("falha no Brevo");
    expect(all).not.toContain(TOKEN_HASH);
    expect(all).not.toContain(OTP);
    expect(all).not.toContain(ENV.BREVO_API_KEY!);
    expect(all).not.toContain("pessoa@exemplo.test");
    errSpy.mockRestore();
    logSpy.mockRestore();
  });

  it("timeout ou erro de rede do Brevo é tratado como falha", async () => {
    const hanging = vi.fn((_u: string, init: RequestInit) =>
      new Promise((_r, reject) => init.signal!.addEventListener("abort", () => reject(Object.assign(new Error("x"), { name: "AbortError" })))),
    ) as unknown as typeof fetch;
    const msg = { to: "pessoa@exemplo.test", subject: "s", html: "h", text: "t", tag: "signup" };
    const cfg = { apiKey: "k", senderEmail: "s@exemplo.test", senderName: "S", timeoutMs: 20 };
    expect(await sendBrevoEmail(msg, cfg, hanging)).toEqual({ ok: false, reason: "timeout" });

    const offline = vi.fn(async () => { throw new TypeError("network"); }) as unknown as typeof fetch;
    const body = payload("signup");
    const res = await handleSendEmailHook(body, await signed(body), ENV, { fetch: offline, nowSeconds: NOW, log: () => {} });
    expect(res.status).toBe(502);
  });

  it("troca de e-mail segura envia os hashes corretos para cada endereço", async () => {
    const f = okFetch();
    const body = payload(
      "email_change",
      { token_hash: "hash_para_novo_email_0001", token_hash_new: "hash_para_email_atual_0002", token_new: "654321" },
      { new_email: "novo@exemplo.test" },
    );
    const res = await handleSendEmailHook(body, await signed(body), ENV, { fetch: f, nowSeconds: NOW, log: () => {} });
    expect(res.status).toBe(200);
    const sent = sentBodies(f);
    expect(sent).toHaveLength(2);
    const atual = sent.find((s) => s.to[0].email === "pessoa@exemplo.test")!;
    const novo = sent.find((s) => s.to[0].email === "novo@exemplo.test")!;
    expect(atual.htmlContent).toContain("hash_para_email_atual_0002");
    expect(novo.htmlContent).toContain("hash_para_novo_email_0001");
  });

  it("sem configuração não envia e responde erro genérico", async () => {
    const f = okFetch();
    const body = payload("signup");
    const res = await handleSendEmailHook(body, await signed(body), { ...ENV, BREVO_API_KEY: "" }, { fetch: f, nowSeconds: NOW, log: () => {} });
    expect(res.status).toBe(500);
    expect(f).not.toHaveBeenCalled();
    const bad = await handleSendEmailHook(body, await signed(body), { ...ENV, PUBLIC_SITE_URL: "http://evil.example" }, { fetch: f, nowSeconds: NOW, log: () => {} });
    expect(bad.status).toBe(500);
  });

  it("payload malformado ou com token_hash inválido é rejeitado", async () => {
    const f = okFetch();
    for (const body of ["{", JSON.stringify({ user: {} }), payload("signup", { token_hash: "<script>" }), payload("signup", {}, { email: "a b@x" })]) {
      const res = await handleSendEmailHook(body, await signed(body), ENV, { fetch: f, nowSeconds: NOW, log: () => {} });
      expect(res.status).toBe(400);
    }
    expect(f).not.toHaveBeenCalled();
  });

  it("reautenticação envia apenas o código, sem link", async () => {
    const f = okFetch();
    const body = payload("reauthentication");
    await handleSendEmailHook(body, await signed(body), ENV, { fetch: f, nowSeconds: NOW, log: () => {} });
    const sent = sentBodies(f)[0];
    expect(sent.htmlContent).toContain(OTP);
    expect(sent.htmlContent).not.toContain("/auth/confirm");
  });
});
