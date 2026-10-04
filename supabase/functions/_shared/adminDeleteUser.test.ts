// @vitest-environment node
import { describe, it, expect, vi } from "vitest";
import { handleAdminDelete, type AdminDeleteDeps } from "./adminDeleteUser";
import { DEFAULT_ALLOWED_ORIGINS, corsHeadersFor, parseAllowedOrigins } from "./cors";

const ADMIN = "11111111-1111-4111-8111-111111111111";
const VICTIM = "22222222-2222-4222-8222-222222222222";
const SUPER = "33333333-3333-4333-8333-333333333333";
const OTHER_ADMIN = "44444444-4444-4444-8444-444444444444";

const TOKENS: Record<string, string> = { "jwt-admin": ADMIN, "jwt-user": VICTIM, "jwt-super": SUPER };
const ADMINS = new Set([ADMIN, OTHER_ADMIN, SUPER]);

function deps(overrides: Partial<AdminDeleteDeps> = {}) {
  return {
    getCallerId: vi.fn(async (t: string) => TOKENS[t] ?? null),
    getCallerAccess: vi.fn(async (t: string, id: string) => ({ admin: ADMINS.has(id), superAdmin: t === "jwt-super" })),
    getTargetAccess: vi.fn(async (id: string) => ({ admin: ADMINS.has(id), superAdmin: id === SUPER })),
    deleteUser: vi.fn(async () => ({ ok: true })),
    logError: vi.fn(),
    ...overrides,
  };
}

describe("handleAdminDelete", () => {
  it("bloqueia anônimo, token inválido e usuário comum", async () => {
    const d = deps();
    expect((await handleAdminDelete(null, { userId: VICTIM }, d)).status).toBe(401);
    expect((await handleAdminDelete("Bearer jwt-falso", { userId: VICTIM }, d)).status).toBe(401);
    expect((await handleAdminDelete("Bearer jwt-user", { userId: ADMIN }, d)).status).toBe(403);
    expect(d.deleteUser).not.toHaveBeenCalled();
  });

  it("não confia em papel enviado no corpo", async () => {
    const d = deps();
    const r = await handleAdminDelete("Bearer jwt-user", { userId: ADMIN, role: "admin", isSuperAdmin: true }, d);
    expect(r.status).toBe(403);
    expect(d.deleteUser).not.toHaveBeenCalled();
  });

  it("valida o userId e impede auto-exclusão", async () => {
    const d = deps();
    for (const userId of [undefined, 123, "abc", "'; drop table users; --", `${VICTIM}x`]) {
      expect((await handleAdminDelete("Bearer jwt-admin", { userId }, d)).status).toBe(400);
    }
    expect((await handleAdminDelete("Bearer jwt-admin", { userId: ADMIN }, d)).status).toBe(400);
    expect((await handleAdminDelete("Bearer jwt-admin", null, d)).status).toBe(400);
    expect(d.deleteUser).not.toHaveBeenCalled();
  });

  it("admin exclui usuário comum e outro admin", async () => {
    const d = deps();
    expect(await handleAdminDelete("Bearer jwt-admin", { userId: VICTIM }, d)).toEqual({ status: 200, body: { ok: true } });
    expect((await handleAdminDelete("Bearer jwt-admin", { userId: OTHER_ADMIN }, d)).status).toBe(200);
    expect(d.deleteUser).toHaveBeenCalledTimes(2);
  });

  it("conta listada como super-admin só pode ser excluída por outro super-admin", async () => {
    const d = deps();
    expect((await handleAdminDelete("Bearer jwt-admin", { userId: SUPER }, d)).status).toBe(403);
    expect((await handleAdminDelete("Bearer jwt-super", { userId: OTHER_ADMIN }, d)).status).toBe(200);
  });

  it("erros internos não vazam", async () => {
    const failing = deps({ deleteUser: vi.fn(async () => ({ ok: false })) });
    const r = await handleAdminDelete("Bearer jwt-admin", { userId: VICTIM }, failing);
    expect(r).toEqual({ status: 500, body: { error: "Não foi possível excluir a conta" } });
  });
});

describe("cors", () => {
  it("só ecoa origens da allowlist e nunca usa curinga", () => {
    const allowed = parseAllowedOrigins("https://cadernodooga.com.br, https://www.cadernodooga.com.br/, *, javascript:x");
    expect(allowed).toEqual(["https://cadernodooga.com.br", "https://www.cadernodooga.com.br"]);
    expect(corsHeadersFor("https://cadernodooga.com.br", allowed)["Access-Control-Allow-Origin"]).toBe("https://cadernodooga.com.br");
    expect(corsHeadersFor("https://evil.example", allowed)["Access-Control-Allow-Origin"]).toBeUndefined();
    expect(Object.values(corsHeadersFor(null, allowed))).not.toContain("*");
  });

  it("sem ALLOWED_ORIGINS válido usa apenas o domínio de produção", () => {
    expect(parseAllowedOrigins(undefined)).toEqual(DEFAULT_ALLOWED_ORIGINS);
    expect(parseAllowedOrigins("*, javascript:x")).toEqual(DEFAULT_ALLOWED_ORIGINS);
    expect(parseAllowedOrigins("https://staging.example")).toEqual(["https://staging.example"]);
  });
});
