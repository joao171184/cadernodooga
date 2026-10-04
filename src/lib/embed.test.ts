import { describe, it, expect } from "vitest";
import { getEmbedInfo } from "./embed";

describe("getEmbedInfo", () => {
  it("aceita URLs legítimas", () => {
    expect(getEmbedInfo("https://youtu.be/dQw4w9WgXcQ")).toMatchObject({
      kind: "youtube",
      src: "https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1&rel=0",
    });
    expect(getEmbedInfo("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10").kind).toBe("youtube");
    expect(getEmbedInfo("https://www.youtube.com/shorts/abcdefGHIJ").kind).toBe("youtube");
    expect(getEmbedInfo("https://open.spotify.com/intl-pt/track/4uLU6hMCjMI75M1A2tKUQC")).toMatchObject({
      kind: "spotify",
      src: "https://open.spotify.com/embed/track/4uLU6hMCjMI75M1A2tKUQC",
    });
    expect(getEmbedInfo("https://www.tiktok.com/@user.name/video/7234567890123456789")).toMatchObject({
      kind: "tiktok",
      src: "https://www.tiktok.com/player/v1/7234567890123456789?autoplay=1&music_info=1&description=1&rel=0",
      externalUrl: "https://www.tiktok.com/@user.name/video/7234567890123456789",
    });
    expect(getEmbedInfo("https://vm.tiktok.com/ZMabc123/")).toMatchObject({
      kind: "tiktok",
      src: "",
      externalUrl: "https://vm.tiktok.com/ZMabc123/",
    });
    expect(getEmbedInfo("https://cdn.example.com/pontos/ogum.mp3")).toMatchObject({
      kind: "audio",
      src: "https://cdn.example.com/pontos/ogum.mp3",
    });
  });

  it.each([
    "javascript:alert(1)//tiktok.com/video/1",
    "javascript:alert(1)//vm.tiktok.com/x",
    "JaVaScRiPt:alert(document.cookie)//youtu.be/dQw4w9WgXcQ",
    "data:text/html,<script>alert(1)</script>//tiktok.com/video/1",
    "vbscript:msgbox(1)//vm.tiktok.com/",
    "http://www.tiktok.com/@u/video/123",
    "http://cdn.example.com/a.mp3",
    "https://evil-tiktok.com/@u/video/123",
    "https://tiktok.com.evil.com/@u/video/123",
    "https://evil.com/?u=https://vm.tiktok.com/abc",
    "https://evil.com/youtu.be/dQw4w9WgXcQ",
    "https://user:pass@www.tiktok.com/@u/video/123",
    "audio/../../etc/passwd.mp3",
    "//www.tiktok.com/@u/video/123",
  ])("rejeita %s", (input) => {
    const info = getEmbedInfo(input);
    expect(info.kind).toBe("none");
    expect(info.externalUrl).toBeUndefined();
  });

  it("nunca devolve externalUrl fora de https", () => {
    const inputs = [
      "https://www.tiktok.com/@u/video/123",
      "https://vt.tiktok.com/abc",
      " https://vm.tiktok.com/abc ",
    ];
    for (const i of inputs) {
      const ext = getEmbedInfo(i).externalUrl;
      expect(ext?.startsWith("https://")).toBe(true);
    }
  });
});
