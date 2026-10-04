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

  const ev = (type: string, value?: unknown) => ({ "x-tiktok-player": true, type, value });

  it("toca com som sem mostrar o aviso quando o navegador permite", () => {
    vi.useFakeTimers();
    const { post, emit } = setup();
    emit(JSON.stringify(ev("onPlayerReady")));
    emit(ev("onMute", true));
    emit(ev("onStateChange", 3));
    emit(ev("onMute", false));
    emit(ev("onStateChange", 1));
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.queryByRole("button", { name: "Ativar som" })).toBeNull();
    expect(post.mock.calls.map(([msg]) => msg.type)).toEqual(["unMute", "play"]);
  });

  it("volta a tocar mudo e pede um toque quando o navegador pausa ao ativar o som", () => {
    const { post, emit } = setup();
    emit(ev("onPlayerReady"));
    emit(ev("onMute", true));
    emit(ev("onStateChange", 3));
    emit(ev("onMute", false));
    post.mockClear();
    emit(ev("onStateChange", 2));
    expect(post.mock.calls.map(([msg]) => msg.type)).toEqual(["mute", "play"]);
    emit(ev("onMute", true));
    post.mockClear();
    fireEvent.click(screen.getByRole("button", { name: "Ativar som" }));
    expect(post.mock.calls.map(([msg]) => msg.type)).toEqual(["unMute", "play"]);
    expect(screen.queryByRole("button", { name: "Ativar som" })).toBeNull();
  });

  it("pede um toque se o vídeo não começar a tocar com som", () => {
    vi.useFakeTimers();
    const { post, emit } = setup();
    emit(ev("onPlayerReady"));
    post.mockClear();
    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(post.mock.calls.map(([msg]) => msg.type)).toEqual(["mute", "play"]);
    expect(screen.getByRole("button", { name: "Ativar som" })).toBeTruthy();
  });

  it("respeita a pausa do usuário depois que o vídeo já tocou", () => {
    const { post, emit } = setup();
    emit(ev("onPlayerReady"));
    emit(ev("onStateChange", 1));
    post.mockClear();
    emit(ev("onStateChange", 2));
    expect(post).not.toHaveBeenCalled();
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

  it("avisa quando o vídeo foi removido do TikTok", () => {
    const { emit } = setup();
    emit(ev("onPlayerError", { errorCode: 1001, errorType: "INVALID_VIDEO" }));
    expect(screen.getByText("Este vídeo não está mais disponível no TikTok.")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Tentar de novo/ })).toBeNull();
  });

  it("mostra erro quando o player falha antes de carregar", () => {
    const { emit } = setup();
    emit(ev("onPlayerError", { errorCode: 2001 }));
    expect(screen.getByText("O TikTok não respondeu agora.")).toBeTruthy();
  });
});
