import { describe, expect, it } from "vitest";
import type { AdCampaignRow } from "@/integrations/supabase/adsTypes";
import { EMPTY_FILTERS, filterCampaigns, hasActiveFilters, impressionProgress, sortCampaigns, statusCounts } from "./campaigns";
import { filterLeads, replyMailto } from "./leads";

const now = new Date("2026-10-05T12:00:00Z");

function campaign(p: Partial<AdCampaignRow>): AdCampaignRow {
  return {
    id: p.name ?? "c",
    name: "Campanha",
    advertiser_id: "a1",
    placement_key: "topo-lista",
    status: "active",
    starts_at: "2026-10-01T03:00:00Z",
    ends_at: "2026-10-10T03:00:00Z",
    max_impressions: null,
    impressions_total: 0,
    clicks_total: 0,
    weight: 1,
    ...p,
  } as AdCampaignRow;
}

const list = [
  campaign({ name: "Loja Axé", impressions_total: 100, clicks_total: 5 }),
  campaign({ name: "Atabaque Bom", advertiser_id: "a2", placement_key: "ponto-apos-letra", impressions_total: 300, clicks_total: 3 }),
  campaign({ name: "Velha", status: "archived" }),
  campaign({ name: "Futura", starts_at: "2026-11-01T03:00:00Z", ends_at: "2026-11-30T03:00:00Z" }),
];

describe("filtros de campanhas", () => {
  it("oculta arquivadas por padrão e mostra quando pedido", () => {
    expect(filterCampaigns(list, EMPTY_FILTERS, now).map((c) => c.name)).not.toContain("Velha");
    expect(filterCampaigns(list, { ...EMPTY_FILTERS, showArchived: true }, now)).toHaveLength(4);
    expect(filterCampaigns(list, { ...EMPTY_FILTERS, status: "archived" }, now).map((c) => c.name)).toEqual(["Velha"]);
  });

  it("filtra por busca, anunciante, espaço e status calculado", () => {
    expect(filterCampaigns(list, { ...EMPTY_FILTERS, query: "axé" }, now).map((c) => c.name)).toEqual(["Loja Axé"]);
    expect(filterCampaigns(list, { ...EMPTY_FILTERS, advertiserId: "a2" }, now)).toHaveLength(1);
    expect(filterCampaigns(list, { ...EMPTY_FILTERS, placementKey: "ponto-apos-letra" }, now)).toHaveLength(1);
    expect(filterCampaigns(list, { ...EMPTY_FILTERS, status: "scheduled" }, now).map((c) => c.name)).toEqual(["Futura"]);
  });

  it("período mostra campanhas que se sobrepõem a ele", () => {
    const nov = { ...EMPTY_FILTERS, from: "2026-11-10T03:00:00Z", to: "2026-11-12T03:00:00Z" };
    expect(filterCampaigns(list, nov, now).map((c) => c.name)).toEqual(["Futura"]);
  });

  it("detecta filtros ativos", () => {
    expect(hasActiveFilters(EMPTY_FILTERS)).toBe(false);
    expect(hasActiveFilters({ ...EMPTY_FILTERS, query: "  " })).toBe(false);
    expect(hasActiveFilters({ ...EMPTY_FILTERS, advertiserId: "a1" })).toBe(true);
  });

  it("conta campanhas por status", () => {
    const counts = statusCounts(list, now);
    expect(counts).toMatchObject({ active: 2, archived: 1, scheduled: 1, paused: 0 });
  });

  it("ordena por impressões, CTR e nome", () => {
    expect(sortCampaigns(list, "impressions", "desc", now)[0].name).toBe("Atabaque Bom");
    expect(sortCampaigns(list, "ctr", "desc", now)[0].name).toBe("Loja Axé");
    expect(sortCampaigns(list, "name", "asc", now).map((c) => c.name)).toEqual(["Atabaque Bom", "Futura", "Loja Axé", "Velha"]);
    expect(sortCampaigns(list, "status", "asc", now).at(-1)?.name).toBe("Velha");
  });

  it("calcula progresso do limite de impressões", () => {
    expect(impressionProgress({ impressions_total: 50, max_impressions: null })).toBeNull();
    expect(impressionProgress({ impressions_total: 50, max_impressions: 200 })).toBe(0.25);
    expect(impressionProgress({ impressions_total: 500, max_impressions: 200 })).toBe(1);
  });
});

describe("pedidos de anúncio", () => {
  const leads = [
    { status: "new" as const, name: "Ana", company: "Loja Ana", email: "ana@x.com" },
    { status: "spam" as const, name: "Bot", company: "", email: "bot@x.com" },
    { status: "closed" as const, name: "Caio", company: "Terreiro", email: "caio@x.com" },
  ];

  it("esconde spam sem filtro de status e busca por nome, empresa ou e-mail", () => {
    expect(filterLeads(leads, "", "").map((l) => l.name)).toEqual(["Ana", "Caio"]);
    expect(filterLeads(leads, "spam", "").map((l) => l.name)).toEqual(["Bot"]);
    expect(filterLeads(leads, "", "terreiro").map((l) => l.name)).toEqual(["Caio"]);
    expect(filterLeads(leads, "", "ANA@").map((l) => l.name)).toEqual(["Ana"]);
  });

  it("monta o mailto de resposta com assunto e saudação", () => {
    const url = replyMailto({ name: "Ana", email: "ana@x.com" });
    expect(url.startsWith("mailto:ana%40x.com?subject=")).toBe(true);
    expect(decodeURIComponent(url)).toContain("Publicidade no Caderno do Ogã");
    expect(decodeURIComponent(url)).toContain("Olá, Ana!");
  });
});
