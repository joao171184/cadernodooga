import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ServedAd } from "@/integrations/supabase/adsTypes";
import type { AdConfig } from "@/lib/ads/client";
import { AdSlot } from "./AdSlot";

const state = vi.hoisted(() => ({
  config: undefined as unknown,
  consent: null as string | null,
  ads: undefined as unknown,
  isAdmin: false,
  record: vi.fn(),
}));

vi.mock("./useAds", () => ({
  useAdConfig: () => state.config,
  useAdConsent: () => state.consent,
  usePlacementAds: () => state.ads,
  useViewableOnce: () => {},
}));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ isAdmin: state.isAdmin }) }));
vi.mock("@/lib/ads/client", () => ({
  adImageUrl: (p: string) => `https://cdn.test/${p}`,
  recordAdEvent: (...args: unknown[]) => state.record(...args),
}));
vi.mock("./AdSenseUnit", () => ({ AdSenseUnit: () => <div data-testid="adsense" /> }));

const placement = {
  key: "topo-lista", name: "Topo", description: "", enabled: true, desktop_width: 1200, desktop_height: 150,
  mobile_width: 640, mobile_height: 200, adsense_enabled: true, adsense_slot: "1234567890", sort: 1,
};

function config(adsense: boolean, enabled = true): AdConfig {
  return {
    settings: { id: true, adsense_enabled: adsense, adsense_client: "ca-pub-1234567890123456", in_feed_interval: 12, updated_at: "" },
    placements: new Map([["topo-lista", { ...placement, enabled }]]),
  } as AdConfig;
}

const ad: ServedAd = {
  id: "c1", image_path: "campaigns/a.png", image_mobile_path: null, alt_text: "Loja de velas",
  target_url: "https://loja.com", advertiser_name: "Loja", revenue_type: "direct",
};

beforeEach(() => {
  state.config = config(false);
  state.consent = null;
  state.ads = undefined;
  state.isAdmin = false;
  state.record.mockReset();
});

describe("AdSlot", () => {
  it("não ocupa espaço sem anúncio e sem AdSense", () => {
    state.ads = [];
    const { container } = render(<AdSlot placement="topo-lista" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("não ocupa espaço quando a configuração falha (migração não aplicada)", () => {
    state.config = null;
    const { container } = render(<AdSlot placement="topo-lista" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("não ocupa espaço com o espaço desligado", () => {
    state.config = config(false, false);
    state.ads = [ad];
    const { container } = render(<AdSlot placement="topo-lista" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("mostra o anúncio direto identificado, com link patrocinado, e conta o clique", () => {
    state.ads = [ad];
    render(<AdSlot placement="topo-lista" />);
    expect(screen.getByText("Publicidade")).toBeInTheDocument();
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "https://loja.com");
    expect(link.getAttribute("rel")).toContain("sponsored");
    expect(screen.getByAltText("Loja de velas")).toBeInTheDocument();
    fireEvent.click(link);
    expect(state.record).toHaveBeenCalledWith("c1", "topo-lista", "click");
  });

  it("não conta cliques de administradores", () => {
    state.ads = [ad];
    state.isAdmin = true;
    render(<AdSlot placement="topo-lista" />);
    fireEvent.click(screen.getByRole("link"));
    expect(state.record).not.toHaveBeenCalled();
  });

  it("usa AdSense só quando configurado e com consentimento", () => {
    state.ads = [];
    state.config = config(true);
    const { rerender } = render(<AdSlot placement="topo-lista" />);
    expect(screen.queryByTestId("adsense")).toBeNull();
    state.consent = "granted";
    rerender(<AdSlot placement="topo-lista" />);
    expect(screen.getByTestId("adsense")).toBeInTheDocument();
  });

  it("prefere o anúncio direto ao AdSense", () => {
    state.ads = [ad];
    state.config = config(true);
    state.consent = "granted";
    render(<AdSlot placement="topo-lista" />);
    expect(screen.queryByTestId("adsense")).toBeNull();
    expect(screen.getByRole("link")).toBeInTheDocument();
  });
});
