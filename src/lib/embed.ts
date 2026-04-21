// Detecta YouTube/Spotify URLs e gera URL de embed para iframe.

export type EmbedKind = "youtube" | "spotify" | "audio" | "none";

export interface EmbedInfo {
  kind: EmbedKind;
  src: string; // src de iframe (yt/spotify) ou URL direta de áudio
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

  // URL de áudio direta (mp3/ogg/wav)
  if (/\.(mp3|ogg|wav|m4a)(\?|$)/i.test(u) || u.startsWith("audio/")) {
    return { kind: "audio", src: u };
  }

  return { kind: "none", src: "" };
}
