import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, act, fireEvent } from "@testing-library/react";
import { TikTokPlayer } from "./TikTokPlayer";

const SRC = "https://www.tiktok.com/player/v1/7234567890123456789?autoplay=1";

function setup() {
  render(<TikTokPlayer src={SRC} title="Ponto" externalUrl="https://www.tiktok.com/@u/video/1" />);
  const iframe = screen.getByTitle("Ponto") as HTMLIFrameElement;
  const post = vi.fn();
  Object.defineProperty(iframe.contentWindow!, "postMessage", { value: post, configurable: true });
  const emit = (data: unknown, origin = "https://www.tiktok.com", source: Window | null = iframe.contentWindow) =>
    act(() => {
      window.dispatchEvent(new MessageEvent("message", { data, origin, source }));
    });
  return { iframe, post, emit };
}

afterEach(() => vi.useRealTimers());

describe("TikTokPlayer", () => {
  it("ativa o som e dá play quando o player fica pronto", () => {
    const { post, emit } = setup();
    emit({ "x-tiktok-player": true, type: "onPlayerReady" });
    const types = post.mock.calls.map(([msg]) => msg.type);
    expect(types).toEqual(["unMute", "play"]);
    expect(post.mock.calls[0][1]).toBe("https://www.tiktok.com");
  });

  it("ignora mensagens de outra origem ou de outra janela", () => {
    const { post, emit } = setup();
    emit({ "x-tiktok-player": true, type: "onPlayerReady" }, "https://evil.example");
    emit({ "x-tiktok-player": true, type: "onPlayerReady" }, "https://www.tiktok.com", window);
    expect(post).not.toHaveBeenCalled();
  });

  it("mostra 'Ativar som' se o navegador manteve mudo", () => {
    const { post, emit } = setup();
    emit(JSON.stringify({ "x-tiktok-player": true, type: "onPlayerReady" }));
    emit({ "x-tiktok-player": true, type: "onMute", value: true });
    post.mockClear();
    fireEvent.click(screen.getByRole("button", { name: "Ativar som" }));
    expect(post.mock.calls.map(([msg]) => msg.type)).toEqual(["unMute", "play"]);
    expect(screen.queryByRole("button", { name: "Ativar som" })).toBeNull();
  });

  it("mostra erro com 'Tentar de novo' se o player não responder", () => {
    vi.useFakeTimers();
    setup();
    act(() => {
      vi.advanceTimersByTime(8000);
    });
    expect(screen.getByText("O TikTok não respondeu agora.")).toBeTruthy();
    expect(screen.getByRole("link", { name: /Abrir no TikTok/ }).getAttribute("href")).toBe("https://www.tiktok.com/@u/video/1");
    fireEvent.click(screen.getByRole("button", { name: /Tentar de novo/ }));
    expect(screen.queryByText("O TikTok não respondeu agora.")).toBeNull();
  });

  it("mostra erro quando o player falha antes de carregar", () => {
    const { emit } = setup();
    emit({ "x-tiktok-player": true, type: "onPlayerError", value: 1001 });
    expect(screen.getByText("O TikTok não respondeu agora.")).toBeTruthy();
  });
});
