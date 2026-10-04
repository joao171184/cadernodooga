import { describe, it, expect } from "vitest";
import { pontoSaveErrorMessage, validatePontoFields } from "./pontoValidation";

const base = { nome: "OGUM", letra: "LETRA", puxador: "", audio: "" };

describe("validatePontoFields", () => {
  it("aceita ponto sem link ou com link https", () => {
    expect(validatePontoFields(base)).toBeNull();
    expect(validatePontoFields({ ...base, audio: "https://youtu.be/UHwNtZdtAPY" })).toBeNull();
  });

  it("rejeita links que não são https", () => {
    for (const audio of ["javascript:alert(1)", "http://youtu.be/abc", "https://x.com/a b", 'https://x.com/"><script>']) {
      expect(validatePontoFields({ ...base, audio })).toMatch(/https/);
    }
  });

  it("aceita só links que o site consegue tocar com a CSP atual", () => {
    expect(validatePontoFields({ ...base, audio: "https://www.tiktok.com/@a/video/123456" })).toBeNull();
    expect(validatePontoFields({ ...base, audio: "https://open.spotify.com/track/abc123" })).toBeNull();
    expect(validatePontoFields({ ...base, audio: "https://exemplo.com/ponto.mp3" })).toMatch(/YouTube/);
    expect(validatePontoFields({ ...base, audio: "https://exemplo.com/pagina" })).toMatch(/YouTube/);
  });

  it("rejeita campos maiores que o limite do banco", () => {
    expect(validatePontoFields({ ...base, nome: "A".repeat(301) })).toMatch(/nome/);
    expect(validatePontoFields({ ...base, puxador: "A".repeat(301) })).toMatch(/puxa/);
  });
});

describe("pontoSaveErrorMessage", () => {
  it("não expõe a mensagem técnica do banco", () => {
    expect(pontoSaveErrorMessage({ code: "23514" })).toMatch(/inválido/);
    expect(pontoSaveErrorMessage({ code: "42501" })).toMatch(/permissão/);
    expect(pontoSaveErrorMessage(null)).toBe("Não foi possível salvar o ponto. Tente novamente.");
  });
});
