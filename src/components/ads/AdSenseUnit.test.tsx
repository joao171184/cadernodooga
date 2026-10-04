import { act, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdSenseUnit } from "./AdSenseUnit";

const load = vi.hoisted(() => ({ result: Promise.resolve() as Promise<void> }));
vi.mock("@/lib/ads/adsense", () => ({ loadAdSenseScript: () => load.result }));

beforeEach(() => {
  load.result = Promise.resolve();
  window.adsbygoogle = [];
});

const renderUnit = () =>
  render(<AdSenseUnit client="ca-pub-1234567890123456" slot="6660811452" minHeight={150} />);

describe("AdSenseUnit", () => {
  it("monta o bloco oficial e pede um anúncio ao Google", async () => {
    const { container } = renderUnit();
    const ins = container.querySelector("ins.adsbygoogle")!;
    expect(ins).toHaveAttribute("data-ad-slot", "6660811452");
    expect(ins).toHaveAttribute("data-full-width-responsive", "true");
    await waitFor(() => expect(window.adsbygoogle).toHaveLength(1));
    expect(screen.getByLabelText("Publicidade do Google")).toBeVisible();
  });

  it("esconde o espaço quando o Google não tem anúncio", async () => {
    const { container } = renderUnit();
    await act(async () => {
      container.querySelector("ins")!.setAttribute("data-ad-status", "unfilled");
    });
    await waitFor(() => expect(container.querySelector("aside")).toHaveAttribute("hidden"));
  });

  it("esconde o espaço quando o script não carrega", async () => {
    load.result = Promise.reject(new Error("bloqueado"));
    const { container } = renderUnit();
    await waitFor(() => expect(container.querySelector("aside")).toHaveAttribute("hidden"));
    expect(window.adsbygoogle).toHaveLength(0);
  });
});
