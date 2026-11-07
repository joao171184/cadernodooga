import { describe, expect, it } from "vitest";
import { initialVersion, publishedVersions, validateVersions } from "./pointVersions";
const base = initialVersion({ letra: "PRIMEIRA LINHA\nSEGUNDA LINHA", audio: "https://youtu.be/123", toque: "ijexa", classificacoes: ["chamada"] });
describe("point versions", () => {
  it("preserves original lyrics, media, rhythm and classifications", () => {
    expect(base.letra).toBe("PRIMEIRA LINHA\nSEGUNDA LINHA");
    expect(base.video_url).toBe("https://youtu.be/123");
    expect(base.toque).toBe("ijexa");
    expect(base.classificacoes).toEqual(["chamada"]);
  });
  it("returns a single published version unchanged", () => expect(publishedVersions([base])).toEqual([base]));
  it("places the published principal first", () => {
    const other = { ...base, title: "second", ordem: 2 };
    expect(publishedVersions([{ ...base, title: "first", is_principal: false }, other]).map(v => v.title)).toEqual(["second", "first"]);
  });
  it("sorts by administrator order without a principal", () => {
    expect(publishedVersions([3, 1, 2].map(ordem => ({ ...base, is_principal: false, ordem }))).map(v => v.ordem)).toEqual([1, 2, 3]);
  });
  it("never shows drafts, including a draft principal", () => {
    expect(publishedVersions([{ ...base, status: "draft" }, { ...base, title: "public", is_principal: false }]).map(v => v.title)).toEqual(["public"]);
  });
  it("requires a published version for published points", () => expect(validateVersions([{ ...base, status: "draft" }], true)).toBe("Um ponto publicado precisa de ao menos uma versão publicada."));
  it("allows drafts for pending points", () => expect(validateVersions([{ ...base, status: "draft" }], false)).toBeNull());
  it("requires at least one version", () => expect(validateVersions([], false)).toBe("Adicione ao menos uma versão."));
  it("allows no more than one principal", () => expect(validateVersions([base, base], true)).toBe("Escolha uma única versão principal."));
});