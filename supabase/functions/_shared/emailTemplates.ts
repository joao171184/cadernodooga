// Templates dos e-mails transacionais (pt-BR). Todo valor dinâmico é escapado.

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

export interface TemplateContext {
  siteOrigin: string;
  link?: string | null;
  code?: string | null;
  email?: string | null;
}

const BRAND = "Caderno do Ogã";

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function layout(title: string, paragraphs: string[], cta?: { label: string; href: string }, code?: string | null) {
  const body = paragraphs.map((p) => `<p style="margin:0 0 16px;line-height:1.5">${escapeHtml(p)}</p>`).join("");
  const button = cta
    ? `<p style="margin:24px 0"><a href="${escapeHtml(cta.href)}" style="background:#3a1f15;color:#ffffff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block">${escapeHtml(cta.label)}</a></p>
       <p style="margin:0 0 16px;font-size:12px;color:#666;line-height:1.5">Se o botão não funcionar, copie e cole este endereço no navegador:<br><span style="word-break:break-all">${escapeHtml(cta.href)}</span></p>`
    : "";
  const codeBlock = code
    ? `<p style="margin:24px 0;font-size:28px;letter-spacing:6px;font-weight:bold">${escapeHtml(code)}</p>`
    : "";
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title></head>
<body style="margin:0;padding:24px;background:#f5f1ee;font-family:Arial,Helvetica,sans-serif;color:#222">
<div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:12px;padding:28px">
<h1 style="font-size:20px;margin:0 0 20px">${escapeHtml(title)}</h1>
${body}${codeBlock}${button}
<p style="margin:24px 0 0;font-size:12px;color:#888">${escapeHtml(BRAND)} — e-mail automático, não responda.</p>
</div></body></html>`;
}

function textVersion(title: string, paragraphs: string[], link?: string | null, code?: string | null) {
  return [title, "", ...paragraphs, code ? `\nCódigo: ${code}` : "", link ? `\n${link}` : "", `\n— ${BRAND}`]
    .filter((l) => l !== "")
    .join("\n");
}

function build(
  subject: string,
  title: string,
  paragraphs: string[],
  ctx: TemplateContext,
  ctaLabel?: string,
): RenderedEmail {
  const cta = ctaLabel && ctx.link ? { label: ctaLabel, href: ctx.link } : undefined;
  return {
    subject,
    html: layout(title, paragraphs, cta, ctx.code),
    text: textVersion(title, paragraphs, cta?.href, ctx.code),
  };
}

const IGNORE = "Se você não fez essa solicitação, ignore este e-mail.";
const SECURITY = "Se não foi você, redefina sua senha imediatamente e entre em contato com o administrador.";

export function renderEmail(action: string, ctx: TemplateContext): RenderedEmail | null {
  switch (action) {
    case "signup":
      if (!ctx.link) return null;
      return build(
        `Confirme seu e-mail — ${BRAND}`,
        "Confirme seu cadastro",
        ["Recebemos um pedido de criação de conta com este e-mail.", "Clique no botão abaixo para confirmar. O link expira em breve e só pode ser usado uma vez.", IGNORE],
        ctx,
        "Confirmar e-mail",
      );
    case "recovery":
      if (!ctx.link) return null;
      return build(
        `Redefinição de senha — ${BRAND}`,
        "Redefinir sua senha",
        ["Recebemos um pedido para redefinir a senha da sua conta.", "Clique no botão abaixo para escolher uma nova senha. O link expira em breve e só pode ser usado uma vez.", IGNORE],
        ctx,
        "Redefinir senha",
      );
    case "email_change":
      if (!ctx.link) return null;
      return build(
        `Confirme a troca de e-mail — ${BRAND}`,
        "Confirmar troca de e-mail",
        ["Recebemos um pedido para alterar o e-mail da sua conta.", "Clique no botão abaixo para confirmar a alteração.", IGNORE],
        ctx,
        "Confirmar troca",
      );
    case "invite":
    case "magiclink":
    case "email":
      if (!ctx.link) return null;
      return build(
        `Acesso à sua conta — ${BRAND}`,
        "Acessar sua conta",
        ["Use o botão abaixo para acessar sua conta. O link expira em breve e só pode ser usado uma vez.", IGNORE],
        ctx,
        "Acessar",
      );
    case "reauthentication":
      if (!ctx.code) return null;
      return build(
        `Código de verificação — ${BRAND}`,
        "Confirme que é você",
        ["Use o código abaixo para confirmar a operação solicitada.", IGNORE],
        { ...ctx, link: null },
      );
    case "password_changed_notification":
      return build(
        `Sua senha foi alterada — ${BRAND}`,
        "Senha alterada",
        ["A senha da sua conta acabou de ser alterada.", SECURITY],
        { ...ctx, link: null, code: null },
      );
    case "email_changed_notification":
      return build(
        `O e-mail da sua conta foi alterado — ${BRAND}`,
        "E-mail alterado",
        ["O e-mail de acesso da sua conta foi alterado.", SECURITY],
        { ...ctx, link: null, code: null },
      );
    default:
      if (action.endsWith("_notification")) {
        return build(
          `Alerta de segurança — ${BRAND}`,
          "Alteração na sua conta",
          ["Uma configuração de segurança da sua conta foi alterada.", SECURITY],
          { ...ctx, link: null, code: null },
        );
      }
      return null;
  }
}
