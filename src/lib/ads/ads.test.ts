import { describe, expect, it } from "vitest";
import { localDay, localInputToUtcIso, utcIsoToLocalInput } from "./time";
import { computeCampaignStatus, isEndingSoon, needsArchiving } from "./status";
import { imageRatioWarning, validateCampaign, validateImageFile, validateLead, validateTargetUrl } from "./validation";
import { ctr, formatCtr, groupMetrics, totals } from "./reports";
import { adsenseConfigured, canShowAdSense } from "./adsense";

describe("horário de Brasília", () => {
  it("converte datetime-local para UTC e volta", () => {
    expect(localInputToUtcIso("2026-10-04T14:30")).toBe("2026-10-04T17:30:00.000Z");
    expect(utcIsoToLocalInput("2026-10-04T17:30:00.000Z")).toBe("2026-10-04T14:30");
  });

  it("rejeita entradas inválidas", () => {
    expect(localInputToUtcIso("04/10/2026 14:30")).toBeNull();
    expect(utcIsoToLocalInput("nada")).toBe("");
  });

  it("agrupa o dia pelo fuso de Brasília, não pelo UTC", () => {
    expect(localDay(new Date("2026-10-05T02:00:00Z"))).toBe("2026-10-04");
    expect(localDay(new Date("2026-10-05T03:00:00Z"))).toBe("2026-10-05");
  });
});

describe("status da campanha", () => {
  const base = {
    status: "active" as const,
    starts_at: "2026-10-01T03:00:00Z",
    ends_at: "2026-10-10T03:00:00Z",
    max_impressions: null,
    impressions_total: 0,
  };
  const at = (iso: string) => new Date(iso);

  it("agendada antes do início, ativa no período e encerrada sozinha no fim", () => {
    expect(computeCampaignStatus(base, at("2026-09-30T00:00:00Z"))).toBe("scheduled");
    expect(computeCampaignStatus(base, at("2026-10-05T00:00:00Z"))).toBe("active");
    expect(computeCampaignStatus(base, at("2026-10-10T03:00:00Z"))).toBe("ended");
  });

  it("encerra ao atingir o limite de impressões", () => {
    const c = { ...base, max_impressions: 100, impressions_total: 100 };
    expect(computeCampaignStatus(c, at("2026-10-05T00:00:00Z"))).toBe("ended");
  });

  it("respeita rascunho, pausa e arquivo", () => {
    const now = at("2026-10-05T00:00:00Z");
    expect(computeCampaignStatus({ ...base, status: "draft" }, now)).toBe("draft");
    expect(computeCampaignStatus({ ...base, status: "paused" }, now)).toBe("paused");
    expect(computeCampaignStatus({ ...base, status: "archived" }, now)).toBe("archived");
  });

  it("avisa sobre campanhas perto do fim e encerradas sem arquivar", () => {
    expect(isEndingSoon(base, at("2026-10-08T00:00:00Z"))).toBe(true);
    expect(isEndingSoon(base, at("2026-10-02T00:00:00Z"))).toBe(false);
    expect(needsArchiving(base, at("2026-10-11T00:00:00Z"))).toBe(true);
    expect(needsArchiving({ ...base, status: "archived" }, at("2026-10-11T00:00:00Z"))).toBe(false);
  });
});

describe("validação", () => {
  it("aceita só links https sem credenciais", () => {
    expect(validateTargetUrl("https://loja.com.br/oferta?x=1")).toBeNull();
    expect(validateTargetUrl("http://loja.com.br")).not.toBeNull();
    expect(validateTargetUrl("javascript:alert(1)")).not.toBeNull();
    expect(validateTargetUrl("https://user:pw@loja.com")).not.toBeNull();
    expect(validateTargetUrl("")).not.toBeNull();
  });

  it("limita tipo e tamanho da imagem", () => {
    expect(validateImageFile({ type: "image/png", size: 1000 })).toBeNull();
    expect(validateImageFile({ type: "image/svg+xml", size: 1000 })).not.toBeNull();
    expect(validateImageFile({ type: "image/jpeg", size: 2 * 1024 * 1024 })).not.toBeNull();
  });

  it("avisa sobre proporção errada", () => {
    expect(imageRatioWarning({ width: 1200, height: 150 }, { width: 1200, height: 150 })).toBeNull();
    expect(imageRatioWarning({ width: 500, height: 500 }, { width: 1200, height: 150 })).not.toBeNull();
  });

  it("valida o cadastro da campanha", () => {
    const ok = {
      advertiserId: "a", name: "Campanha", placementKey: "topo-lista", altText: "Loja de artigos",
      targetUrl: "https://loja.com", startsAt: "2026-10-01T03:00:00Z", endsAt: "2026-10-10T03:00:00Z",
      weight: 5, maxImpressions: null, budgetCents: null, hasImage: true,
    };
    expect(validateCampaign(ok)).toEqual({});
    const bad = validateCampaign({ ...ok, endsAt: ok.startsAt, weight: 11, maxImpressions: 0, hasImage: false });
    expect(Object.keys(bad).sort()).toEqual(["endsAt", "hasImage", "maxImpressions", "weight"]);
  });

  it("exige consentimento e e-mail válido no Anuncie conosco", () => {
    const lead = { name: "Ana", company: "", email: "ana@exemplo.com", phone: "", interest: "", message: "Quero anunciar no site", consent: true };
    expect(validateLead(lead)).toEqual({});
    expect(validateLead({ ...lead, consent: false, email: "x" })).toHaveProperty("consent");
    expect(validateLead({ ...lead, email: "x" })).toHaveProperty("email");
  });
});

describe("relatórios", () => {
  it("calcula CTR sem dividir por zero", () => {
    expect(ctr(0, 0)).toBe(0);
    expect(ctr(5, 200)).toBe(0.025);
    expect(formatCtr(0.025)).toBe("2,50%");
  });

  it("soma e agrupa por chave", () => {
    const rows = [
      { campaign_id: "a", impressions: 100, clicks: 2 },
      { campaign_id: "b", impressions: 300, clicks: 3 },
      { campaign_id: "a", impressions: 100, clicks: 4 },
    ];
    expect(totals(rows)).toEqual({ impressions: 500, clicks: 9, ctr: 9 / 500 });
    expect(groupMetrics(rows, (r) => r.campaign_id)).toEqual([
      { key: "b", impressions: 300, clicks: 3, ctr: 0.01 },
      { key: "a", impressions: 200, clicks: 6, ctr: 0.03 },
    ]);
  });
});

describe("AdSense", () => {
  const settings = { adsense_enabled: true, adsense_client: "ca-pub-1234567890123456" };
  const placement = { enabled: true, adsense_enabled: true, adsense_slot: "1234567890" };

  it("fica desligado sem configuração válida", () => {
    expect(adsenseConfigured(null)).toBe(false);
    expect(adsenseConfigured({ adsense_enabled: false, adsense_client: settings.adsense_client })).toBe(false);
    expect(adsenseConfigured({ adsense_enabled: true, adsense_client: "pub-123" })).toBe(false);
    expect(adsenseConfigured(settings)).toBe(true);
  });

  it("só aparece com consentimento e bloco válido no espaço", () => {
    expect(canShowAdSense(settings, placement, "granted")).toBe(true);
    expect(canShowAdSense(settings, placement, null)).toBe(false);
    expect(canShowAdSense(settings, placement, "denied")).toBe(false);
    expect(canShowAdSense(settings, { ...placement, adsense_slot: null }, "granted")).toBe(false);
    expect(canShowAdSense(settings, { ...placement, enabled: false }, "granted")).toBe(false);
  });
});
