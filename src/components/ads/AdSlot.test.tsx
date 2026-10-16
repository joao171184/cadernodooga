import { act, fireEvent, render, screen } from "@testing-library/react";
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
  adsenseUnavailable: null as null | (() => void),
}));

vi.mock("./useAds", () => ({
  useAdConfig: () => state.config,
  useAdConsent: () => state.consent,
  usePlacementAds: () => state.ads,
  useViewableOnce: () => {},
}));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ isAdmin: state.isAdmin }) }));
vi.mock("@/lib/ads/client", () => ({
  ADS_FETCH_LIMIT: 10,
  adImageUrl: (p: string) => `https://cdn.test/storage/v1/object/public/ads/campaigns/${p.replace(/^(campaigns|destaques)\//, "")}`,
  recordAdEvent: (...args: unknown[]) => state.record(...args),
}));
vi.mock("./AdSenseUnit", () => ({
  AdSenseUnit: ({ onUnavailable }: { onUnavailable?: () => void }) => {
    state.adsenseUnavailable = onUnavailable ?? null;
    return <div data-testid="adsense" />;
  },
}));

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
  id: "c1", image_path: "destaques/a.png", image_mobile_path: null, alt_text: "Loja de velas",
  target_url: "https://loja.com", advertiser_name: "Loja", revenue_type: "direct",
};

const ad2: ServedAd = {
  id: "c2", image_path: "destaques/b.png", image_mobile_path: null, alt_text: "Ateliê",
  target_url: "https://atelie.com", advertiser_name: "Ateliê", revenue_type: "sponsorship",
};

beforeEach(() => {
  state.config = config(false);
  state.consent = null;
  state.ads = undefined;
  state.isAdmin = false;
  state.record.mockReset();
  state.adsenseUnavailable = null;
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

  it("mostra o destaque do parceiro com link e conta o clique", () => {
    state.ads = [ad];
    render(<AdSlot placement="topo-lista" />);
    expect(screen.getByText("Parceiro")).toBeInTheDocument();
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "https://loja.com");
    expect(link.getAttribute("rel")).toBe("noopener noreferrer");
    expect(screen.getByAltText("Loja de velas")).toHaveAttribute(
      "src",
      "https://cdn.test/storage/v1/object/public/ads/campaigns/a.png",
    );
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

  it("prefere o anúncio próprio ao AdSense", () => {
    state.ads = [ad];
    state.config = config(true);
    state.consent = "granted";
    render(<AdSlot placement="topo-lista" />);
    expect(screen.queryByTestId("adsense")).toBeNull();
    expect(screen.getByRole("link")).toHaveAttribute("href", "https://loja.com");
  });

  it("usa AdSense só sem anúncio próprio, e some se o Google não preencher", () => {
    state.ads = [];
    state.config = config(true);
    state.consent = "granted";
    render(<AdSlot placement="topo-lista" />);
    expect(screen.getByTestId("adsense")).toBeInTheDocument();

    act(() => {
      state.adsenseUnavailable?.();
    });
    expect(screen.queryByTestId("adsense")).toBeNull();
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("com vários anúncios próprios mostra o primeiro sem setas nem contador", () => {
    state.ads = [ad, ad2];
    render(<AdSlot placement="topo-lista" />);
    expect(screen.getByAltText("Loja de velas")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Anúncio anterior" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Próximo anúncio" })).toBeNull();
    expect(screen.queryByText(/^\d+\s*\/\s*\d+$/)).toBeNull();
  });

  it("com ad definido pelo pai usa só esse anúncio", () => {
    state.ads = [ad, ad2];
    render(<AdSlot placement="topo-lista" ad={ad2} />);
    expect(screen.getByAltText("Ateliê")).toBeInTheDocument();
    expect(screen.queryByAltText("Loja de velas")).toBeNull();
  });

  it("com ad=null pula o próprio e vai ao AdSense", () => {
    state.ads = [ad];
    state.config = config(true);
    state.consent = "granted";
    render(<AdSlot placement="topo-lista" ad={null} />);
    expect(screen.getByTestId("adsense")).toBeInTheDocument();
    expect(screen.queryByRole("link")).toBeNull();
  });
});
