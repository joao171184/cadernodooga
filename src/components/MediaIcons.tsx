// Ícones SVG oficiais YouTube, Spotify e TikTok.
// Usados nos cards de pontos para indicar a origem do áudio.

export function YoutubeGlyph({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path
        fill="#FF0000"
        d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.5 12 3.5 12 3.5s-7.505 0-9.377.55A3.016 3.016 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136C4.495 20.5 12 20.5 12 20.5s7.505 0 9.376-.55a3.016 3.016 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814Z"
      />
      <path fill="#FFFFFF" d="M9.75 15.568V8.432L15.818 12l-6.068 3.568Z" />
    </svg>
  );
}

export function SpotifyGlyph({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <circle cx="12" cy="12" r="12" fill="#1ED760" />
      <path
        fill="#000000"
        d="M17.6 16.55a.75.75 0 0 1-1.03.25c-2.82-1.72-6.37-2.11-10.55-1.16a.75.75 0 1 1-.33-1.46c4.57-1.04 8.5-.6 11.66 1.34.36.21.47.68.25 1.03Zm1.5-3.06a.94.94 0 0 1-1.29.31c-3.23-1.99-8.16-2.57-11.99-1.41a.94.94 0 1 1-.55-1.79c4.39-1.34 9.83-.69 13.55 1.6.44.27.58.85.28 1.29Zm.13-3.18C15.4 7.99 8.69 7.78 5.05 8.88a1.13 1.13 0 1 1-.66-2.16c4.18-1.27 11.6-1.02 15.93 1.55a1.13 1.13 0 1 1-1.16 1.94Z"
      />
    </svg>
  );
}

export function TikTokGlyph({ size = 18 }: { size?: number }) {
  // Logo TikTok com shift cyan/magenta característico.
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect width="24" height="24" rx="5" fill="#000000" />
      <path
        fill="#25F4EE"
        d="M14.6 5.5h-1.7v10.4a2.1 2.1 0 1 1-2.1-2.1c.18 0 .36.02.53.07v-1.74a3.85 3.85 0 1 0 3.27 3.81V9.7a5.18 5.18 0 0 0 3.04.98V8.94a3.43 3.43 0 0 1-3.04-3.44Z"
      />
      <path
        fill="#FE2C55"
        d="M15.4 4.7h-1.7v10.4a2.1 2.1 0 1 1-2.1-2.1c.18 0 .36.02.53.07V11.3a3.85 3.85 0 1 0 3.27 3.81V8.9a5.18 5.18 0 0 0 3.04.98V8.14a3.43 3.43 0 0 1-3.04-3.44Z"
      />
      <path
        fill="#FFFFFF"
        d="M15 5.1h-1.7v10.4a2.1 2.1 0 1 1-2.1-2.1c.18 0 .36.02.53.07v-1.74a3.85 3.85 0 1 0 3.27 3.81V9.3a5.18 5.18 0 0 0 3.04.98V8.54A3.43 3.43 0 0 1 15 5.1Z"
      />
    </svg>
  );
}
