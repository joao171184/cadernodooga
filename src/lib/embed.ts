// Detecta YouTube/Spotify/TikTok URLs e gera URL de embed para iframe.
// O valor vem do banco (campo `audio`), então é tratado como entrada não confiável:
// só URLs https de hosts conhecidos viram iframe/link.

export type EmbedKind = "youtube" | "spotify" | "tiktok" | "audio" | "none";

export interface EmbedInfo {
  kind: EmbedKind;
  src: string; // src de iframe (yt/spotify/tiktok) ou URL direta de áudio
  externalUrl?: string; // p/ TikTok: link original
  videoId?: string; // p/ TikTok: id usado no embed
}

const NONE: EmbedInfo = { kind: "none", src: "" };

const YOUTUBE_HOSTS = new Set(["youtube.com", "www.youtube.com", "m.youtube.com", "music.youtube.com"]);
const TIKTOK_HOSTS = new Set(["tiktok.com", "www.tiktok.com", "m.tiktok.com"]);
const TIKTOK_SHORT_HOSTS = new Set(["vm.tiktok.com", "vt.tiktok.com"]);

function parseHttpsUrl(value: string): URL | null {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password) return null;
    return url;
  } catch {
    return null;
  }
}

export function getEmbedInfo(url: string): EmbedInfo {
  if (!url) return NONE;
  const u = url.trim();

  if (/^audio\/[\w\-./]+\.(mp3|ogg|wav|m4a)$/i.test(u) && !u.includes("..")) {
    return { kind: "audio", src: `/${u}` };
  }

  const parsed = parseHttpsUrl(u);
  if (!parsed) return NONE;
  const host = parsed.hostname.toLowerCase();
  const path = parsed.pathname;

  // YouTube
  let ytId: string | null = null;
  if (host === "youtu.be") {
    ytId = path.match(/^\/([A-Za-z0-9_-]{6,})/)?.[1] ?? null;
  } else if (YOUTUBE_HOSTS.has(host)) {
    ytId =
      (path === "/watch" ? parsed.searchParams.get("v") : null) ??
      path.match(/^\/(?:embed|shorts|live)\/([A-Za-z0-9_-]{6,})/)?.[1] ??
      null;
    if (ytId && !/^[A-Za-z0-9_-]{6,}$/.test(ytId)) ytId = null;
  }
  if (ytId) {
    return { kind: "youtube", src: `https://www.youtube.com/embed/${ytId}?autoplay=1&rel=0` };
  }

  // Spotify (track / episode / playlist / album)
  if (host === "open.spotify.com") {
    const sp = path.match(/^\/(?:intl-[a-z]+\/)?(track|episode|playlist|album)\/([A-Za-z0-9]+)/);
    if (sp) return { kind: "spotify", src: `https://open.spotify.com/embed/${sp[1]}/${sp[2]}` };
    return NONE;
  }

  // TikTok (video direto: /video/<id> ou /@user/video/<id>)
  if (TIKTOK_HOSTS.has(host)) {
    const tt = path.match(/^\/(?:@[\w.-]+\/)?video\/(\d+)/);
    if (!tt) return NONE;
    return {
      kind: "tiktok",
      src: `https://www.tiktok.com/embed/v2/${tt[1]}`,
      externalUrl: parsed.href,
      videoId: tt[1],
    };
  }
  // TikTok shortlink (vm.tiktok.com / vt.tiktok.com): não dá pra extrair id sem fetch
  if (TIKTOK_SHORT_HOSTS.has(host)) {
    return { kind: "tiktok", src: "", externalUrl: parsed.href };
  }

  // URL de áudio direta (mp3/ogg/wav/m4a)
  if (/\.(mp3|ogg|wav|m4a)$/i.test(path)) {
    return { kind: "audio", src: parsed.href };
  }

  return NONE;
}
