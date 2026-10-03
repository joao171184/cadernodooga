// Detecta YouTube/Spotify/TikTok URLs e gera URL de embed para iframe.

export type EmbedKind = "youtube" | "spotify" | "tiktok" | "audio" | "none";

export interface EmbedInfo {
  kind: EmbedKind;
  src: string; // src de iframe (yt/spotify/tiktok) ou URL direta de áudio
  externalUrl?: string; // p/ TikTok: link original
  videoId?: string; // p/ TikTok: id usado no embed
}

export function getEmbedInfo(url: string): EmbedInfo {
  if (!url) return { kind: "none", src: "" };
  const u = url.trim();

  // YouTube
  const yt = u.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/);
  if (yt) {
    return {
      kind: "youtube",
      src: `https://www.youtube.com/embed/${yt[1]}?autoplay=1&rel=0`,
    };
  }

  // Spotify (track / episode / playlist / album)
  const sp = u.match(/open\.spotify\.com\/(intl-[a-z]+\/)?(track|episode|playlist|album)\/([A-Za-z0-9]+)/);
  if (sp) {
    return {
      kind: "spotify",
      src: `https://open.spotify.com/embed/${sp[2]}/${sp[3]}`,
    };
  }

  // TikTok (video direto: /video/<id> ou /@user/video/<id>)
  const tt = u.match(/tiktok\.com\/(?:@[\w.\-]+\/)?video\/(\d+)/);
  if (tt) {
    return {
      kind: "tiktok",
      src: `https://www.tiktok.com/embed/v2/${tt[1]}`,
      externalUrl: u,
      videoId: tt[1],
    };
  }
  // TikTok shortlink (vm.tiktok.com / vt.tiktok.com): não dá pra extrair id sem fetch
  if (/(?:vm|vt)\.tiktok\.com\//.test(u)) {
    return { kind: "tiktok", src: "", externalUrl: u };
  }

  // URL de áudio direta (mp3/ogg/wav)
  if (/\.(mp3|ogg|wav|m4a)(\?|$)/i.test(u) || u.startsWith("audio/")) {
    return { kind: "audio", src: u };
  }

  return { kind: "none", src: "" };
}
