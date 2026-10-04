import { useCallback, useEffect, useRef, useState } from "react";
import { ExternalLink, RotateCw, Volume2 } from "lucide-react";

const TIKTOK_ORIGIN = "https://www.tiktok.com";
const READY_TIMEOUT_MS = 8000;

interface Props {
  src: string;
  title: string;
  externalUrl?: string;
  className?: string;
}

type Status = "loading" | "ready" | "error";

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

/** Player oficial do TikTok (player/v1): https://developers.tiktok.com/doc/embed-player */
export function TikTokPlayer({ src, title, externalUrl, className = "rounded-2xl" }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const readyRef = useRef(false);
  const [status, setStatus] = useState<Status>("loading");
  const [needsUnmute, setNeedsUnmute] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const send = useCallback((type: string, value?: unknown) => {
    iframeRef.current?.contentWindow?.postMessage({ type, value, "x-tiktok-player": true }, TIKTOK_ORIGIN);
  }, []);

  useEffect(() => {
    readyRef.current = false;
    setStatus("loading");
    setNeedsUnmute(false);
    const timeout = setTimeout(() => setStatus((s) => (s === "loading" ? "error" : s)), READY_TIMEOUT_MS);

    const onMessage = (e: MessageEvent) => {
      if (e.origin !== TIKTOK_ORIGIN || e.source !== iframeRef.current?.contentWindow) return;
      const msg = parseMessage(e.data);
      if (!msg?.["x-tiktok-player"]) return;
      switch (msg.type) {
        case "onPlayerReady":
          readyRef.current = true;
          setStatus("ready");
          send("unMute");
          send("play");
          break;
        case "onMute":
          setNeedsUnmute(!!msg.value);
          break;
        case "onVolumeChange":
          if (msg.value === 0) setNeedsUnmute(true);
          break;
        case "onPlayerError":
        case "onError":
          // Depois do onPlayerReady, o erro típico é autoplay bloqueado: um toque resolve.
          if (readyRef.current) setNeedsUnmute(true);
          else setStatus("error");
          break;
      }
    };

    window.addEventListener("message", onMessage);
    return () => {
      clearTimeout(timeout);
      window.removeEventListener("message", onMessage);
    };
  }, [src, reloadKey, send]);

  const handleUnmute = () => {
    send("unMute");
    send("play");
    setNeedsUnmute(false);
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

      {status === "error" && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-black/85 p-6 text-center text-white">
          <p className="text-sm font-semibold">O TikTok não respondeu agora.</p>
          <button
            onClick={() => setReloadKey((k) => k + 1)}
            className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-xs font-bold uppercase text-black"
          >
            <RotateCw size={14} /> Tentar de novo
          </button>
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
