// @vitest-environment node
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { isPublicApiRequest } from "@/lib/pwaCachePolicy";

const root = resolve(__dirname, "../..");
const read = (p: string) => readFileSync(resolve(root, p), "utf8");

type HeaderRule = { source: string; headers: { key: string; value: string }[] };
const vercel = JSON.parse(read("vercel.json")) as { headers: HeaderRule[] };

function headersFor(path: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const rule of vercel.headers) {
    // Mesma semântica de regex usada pela Vercel em `source`.
    if (new RegExp(`^${rule.source}$`).test(path)) {
      for (const h of rule.headers) out[h.key.toLowerCase()] = h.value;
    }
  }
  return out;
}

describe("headers de segurança (vercel.json)", () => {
  it.each(["/", "/ponto/abc", "/login", "/auth/confirm"])("%s recebe headers e CSP", (path) => {
    const h = headersFor(path);
    expect(h["x-content-type-options"]).toBe("nosniff");
    expect(h["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(h["x-frame-options"]).toBe("DENY");
    expect(h["strict-transport-security"]).toMatch(/max-age=\d+/);
    const csp = h["content-security-policy"];
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toMatch(/script-src 'self'( https:\/\/static\.cloudflareinsights\.com)?(;|$)/);
    expect(csp).not.toMatch(/script-src[^;]*'unsafe-(inline|eval)'/);
    expect(csp).not.toMatch(/connect-src[^;]*\s\*/);
  });

  it("CSP não deixa imagens, áudios ou conexões saírem para qualquer site (reduz exfiltração de token em caso de XSS)", () => {
    const csp = headersFor("/")["content-security-policy"];
    const directive = (name: string) => csp.match(new RegExp(`${name} ([^;]*)`))?.[1].split(/\s+/) ?? [];
    for (const name of ["img-src", "media-src", "connect-src", "frame-src"]) {
      const sources = directive(name);
      expect(sources.length, name).toBeGreaterThan(0);
      expect(sources, name).not.toContain("https:");
      expect(sources, name).not.toContain("*");
    }
  });

  it("service worker não recebe a CSP de página (precisa buscar áudios de outras origens)", () => {
    expect(headersFor("/sw.js")["content-security-policy"]).toBeUndefined();
  });

  it("index.html não tem script inline executável (compatível com script-src 'self')", () => {
    const html = read("index.html");
    const inline = [...html.matchAll(/<script(?![^>]*\bsrc=)([^>]*)>/g)]
      .map((m) => m[1])
      .filter((attrs) => !/type="application\/ld\+json"/.test(attrs));
    expect(inline).toEqual([]);
  });
});

describe("cache do PWA", () => {
  const req = (path: string, method = "GET") => ({
    url: new URL(`https://abc.supabase.co${path}`),
    request: { method } as Request,
  });

  it("guarda só tabelas públicas", () => {
    expect(isPublicApiRequest(req("/rest/v1/pontos"))).toBe(true);
    expect(isPublicApiRequest(req("/rest/v1/categorias"))).toBe(true);
    for (const t of [
      "user_notas", "profiles", "user_roles", "role_permissions", "favoritos", "super_admins",
      "ad_campaigns", "ad_advertisers", "ad_leads", "ad_stats_daily", "ad_settings", "ad_placements",
      "rpc/get_ads_for_placement",
    ]) {
      expect(isPublicApiRequest(req(`/rest/v1/${t}`))).toBe(false);
    }
    expect(isPublicApiRequest(req("/rest/v1/rpc/is_super_admin"))).toBe(false);
    expect(isPublicApiRequest(req("/rest/v1/pontos", "POST"))).toBe(false);
    expect(isPublicApiRequest(req("/auth/v1/user"))).toBe(false);
  });

  it("predicado é autocontido (o Workbox serializa a função)", () => {
    const fn = new Function(`return (${isPublicApiRequest.toString()})`)() as typeof isPublicApiRequest;
    expect(fn(req("/rest/v1/pontos"))).toBe(true);
    expect(fn(req("/rest/v1/user_notas"))).toBe(false);
  });
});

describe("segredos e configuração", () => {
  it(".env está ignorado e .env.example não tem valores reais", () => {
    const gi = read(".gitignore");
    expect(gi).toMatch(/^\.env$/m);
    expect(gi).toMatch(/^!\.env\.example$/m);
    const example = read(".env.example");
    expect(example).not.toMatch(/eyJ[A-Za-z0-9_-]{20,}/);
    expect(example).not.toMatch(/xkeysib-[A-Za-z0-9]/);
    expect(example).toMatch(/^BREVO_API_KEY=$/m);
  });

  it("nenhuma chave JWT fixa no código-fonte do app e das funções", () => {
    for (const f of ["scripts/generate-sitemap.ts", "src/integrations/supabase/client.ts", "supabase/functions/admin-delete-user/index.ts", "supabase/functions/send-email/index.ts"]) {
      expect(read(f)).not.toMatch(/eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/);
    }
  });

  it("e-mail de super-admin não está fixo no frontend nem na Edge Function", () => {
    for (const f of ["src/contexts/AuthContext.tsx", "supabase/functions/admin-delete-user/index.ts"]) {
      expect(read(f)).not.toMatch(/joao\.pedro/i);
    }
  });
});
