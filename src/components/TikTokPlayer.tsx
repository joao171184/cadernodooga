import { useCallback, useEffect, useRef, useState } from "react";
import { ExternalLink, RotateCw, Volume2 } from "lucide-react";

const TIKTOK_ORIGIN = "https://www.tiktok.com";
const READY_TIMEOUT_MS = 8000;
const SOUND_GRACE_MS = 4000;
const PLAYING = 1;
const PAUSED = 2;

interface Props {
  src: string;
  title: string;
  externalUrl?: string;
  className?: string;
}

type Status = "loading" | "ready" | "error" | "unavailable";

interface PlayerMessage {
  "x-tiktok-player"?: boolean;
  type?: string;
  value?: unknown;
}

function parseMessage(data: unknown): PlayerMessage | null {
  if (typeof data === "string") {
    try {
      return JSON.parse(data) as PlayerMessage;
    } catch {
      return null;
    }
  }
  return data && typeof data === "object" ? (data as PlayerMessage) : null;
}

function errorCode(value: unknown): number | null {
  if (typeof value === "number") return value;
  if (value && typeof value === "object") {
    const code = (value as { errorCode?: unknown; code?: unknown }).errorCode ?? (value as { code?: unknown }).code;
    if (typeof code === "number") return code;
  }
  return null;
}

/** Player oficial do TikTok (player/v1): https://developers.tiktok.com/doc/embed-player */
export function TikTokPlayer({ src, title, externalUrl, className = "rounded-2xl" }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const readyRef = useRef(false);
  const playingRef = useRef(false);
  const unmuteAtRef = useRef(0);
  const fallbackRef = useRef<ReturnType<typeof setTimeout>>();
  const [status, setStatus] = useState<Status>("loading");
  const [needsUnmute, setNeedsUnmute] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const send = useCallback((type: string, value?: unknown) => {
    iframeRef.current?.contentWindow?.postMessage({ type, value, "x-tiktok-player": true }, TIKTOK_ORIGIN);
  }, []);

  // Navegadores pausam o vídeo quando o som é ativado sem gesto do usuário dentro do iframe.
  // Nesse caso toca mudo e pede um toque para ativar o som.
  const fallbackToMuted = useCallback(() => {
    clearTimeout(fallbackRef.current);
    unmuteAtRef.current = 0;
    send("mute");
    send("play");
    setNeedsUnmute(true);
  }, [send]);

  const tryPlayWithSound = useCallback(() => {
    unmuteAtRef.current = Date.now();
    playingRef.current = false;
    send("unMute");
    send("play");
    clearTimeout(fallbackRef.current);
    fallbackRef.current = setTimeout(() => {
      if (!playingRef.current) fallbackToMuted();
    }, SOUND_GRACE_MS);
  }, [send, fallbackToMuted]);

  useEffect(() => {
    readyRef.current = false;
    playingRef.current = false;
    unmuteAtRef.current = 0;
    setStatus("loading");
    setNeedsUnmute(false);
    const timeout = setTimeout(() => setStatus((s) => (s === "loading" ? "error" : s)), READY_TIMEOUT_MS);
    const inSoundGrace = () => unmuteAtRef.current > 0 && Date.now() - unmuteAtRef.current < SOUND_GRACE_MS;

    const onMessage = (e: MessageEvent) => {
      if (e.origin !== TIKTOK_ORIGIN || e.source !== iframeRef.current?.contentWindow) return;
      const msg = parseMessage(e.data);
      if (!msg?.["x-tiktok-player"]) return;
      switch (msg.type) {
        case "onPlayerReady":
          readyRef.current = true;
          setStatus("ready");
          tryPlayWithSound();
          break;
        case "onStateChange":
          if (msg.value === PLAYING) {
            playingRef.current = true;
          } else if (msg.value === PAUSED && !playingRef.current && inSoundGrace()) {
            fallbackToMuted();
          }
          break;
        case "onMute":
          // O player anuncia "mudo" logo ao carregar, antes de processar o unMute enviado.
          if (msg.value && inSoundGrace()) break;
          setNeedsUnmute(!!msg.value);
          break;
        case "onPlayerError":
        case "onError": {
          const code = errorCode(msg.value);
          if (code !== null && code >= 1000 && code < 1100) setStatus("unavailable");
          else if (readyRef.current) fallbackToMuted();
          else setStatus("error");
          break;
        }
      }
    };

    window.addEventListener("message", onMessage);
    return () => {
      clearTimeout(timeout);
      clearTimeout(fallbackRef.current);
      window.removeEventListener("message", onMessage);
    };
  }, [src, reloadKey, tryPlayWithSound, fallbackToMuted]);

  const handleUnmute = () => {
    setNeedsUnmute(false);
    tryPlayWithSound();
  };

  return (
    <div
      className={`relative w-full mx-auto overflow-hidden bg-black ${className}`}
      style={{ maxWidth: 325, height: "min(75vh, 740px)" }}
    >
      <iframe
        key={reloadKey}
        ref={iframeRef}
        src={src}
        title={title}
        className="w-full h-full border-0"
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
        scrolling="no"
      />

      {status === "ready" && needsUnmute && (
        <button
          onClick={handleUnmute}
          className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-black/60 text-white animate-in fade-in"
          aria-label="Ativar som"
        >
          <Volume2 size={40} />
          <span className="text-sm font-bold uppercase">Ativar som</span>
        </button>
      )}

      {(status === "error" || status === "unavailable") && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-black/85 p-6 text-center text-white">
          <p className="text-sm font-semibold">
            {status === "unavailable"
              ? "Este vídeo não está mais disponível no TikTok."
              : "O TikTok não respondeu agora."}
          </p>
          {status === "error" && (
            <p className="max-w-[16rem] text-xs text-white/70">
              Se você usa bloqueador de anúncios ou proteção de rastreamento, libere este site e tente de novo.
            </p>
          )}
          {status === "error" && (
            <button
              onClick={() => setReloadKey((k) => k + 1)}
              className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-xs font-bold uppercase text-black"
            >
              <RotateCw size={14} /> Tentar de novo
            </button>
          )}
          {externalUrl && (
            <a
              href={externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs font-bold uppercase underline"
            >
              <ExternalLink size={12} /> Abrir no TikTok
            </a>
          )}
        </div>
      )}
    </div>
  );
}
