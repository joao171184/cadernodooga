import { describe, expect, it } from "vitest";
import { deliveryLabel } from "./notify";

const base = { created_at: "2026-10-04T17:00:00Z", kind: "lead" as const, status_code: null, timed_out: null, error: null };

describe("deliveryLabel", () => {
  it("traduz a resposta do Brevo", () => {
    expect(deliveryLabel({ ...base, status_code: 201 })).toEqual({ text: "Aceito pelo Brevo", ok: true });
    expect(deliveryLabel({ ...base, status_code: 401 }).ok).toBe(false);
    expect(deliveryLabel({ ...base, status_code: 400 }).text).toMatch(/remetente/);
    expect(deliveryLabel({ ...base, status_code: 500 }).text).toBe("Erro do Brevo (HTTP 500)");
  });

  it("distingue falha de rede de envio ainda sem resposta", () => {
    expect(deliveryLabel({ ...base, timed_out: true }).ok).toBe(false);
    expect(deliveryLabel(base)).toEqual({ text: "Aguardando resposta", ok: null });
  });

  it("identifica bloqueio de IP mesmo com HTTP 401", () => {
    const d = { ...base, status_code: 401, error: "We have detected you are using an unrecognised IP address 2600:1f13::1" };
    expect(deliveryLabel(d).text).toMatch(/IP bloqueado/);
    expect(deliveryLabel({ ...base, status_code: 401, error: "Key not found" }).text).toMatch(/Chave/);
  });
});
