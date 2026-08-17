import { useCallback, useEffect, useRef, useState } from "react";
import { Volume2 } from "lucide-react";

interface Props {
  src: string;
  title: string;
}

export function TikTokPlayer({ src, title }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [needsUnmute, setNeedsUnmute] = useState(false);

  const post = useCallback((messages: unknown[]) => {
    const win = iframeRef.current?.contentWindow;
    if (!win) return;
    try {
      messages.forEach((m) => win.postMessage(m, "*"));
    } catch { /* cross-origin fallback */ }
  }, []);

  const unmute = useCallback(() => {
    post([
      { type: "player:mute", value: 0 },
      { type: "player:volume", value: 1 },
      { method: "setVolume", value: 1 },
      { method: "unmute" },
      { type: "player:play" },
    ]);
  }, [post]);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const timer = setTimeout(unmute, 1200);
    const interval = setInterval(unmute, 2500);

    const onMessage = (e: MessageEvent) => {
      if (e.source !== iframe.contentWindow) return;
      let data: any = e.data;
      if (typeof data === "string") {
        try {
          data = JSON.parse(data);
        } catch {
          return;
        }
      }
      if (data?.muted || data?.volume === 0) setNeedsUnmute(true);
    };

    window.addEventListener("message", onMessage);
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
      window.removeEventListener("message", onMessage);
    };
  }, [src, unmute]);

  const handleUnmute = () => {
    unmute();
    setNeedsUnmute(false);
  };

  return (
    <div
      className="relative w-full mx-auto rounded-2xl overflow-hidden bg-black"
      style={{ maxWidth: 325, height: "min(75vh, 740px)" }}
    >
      <iframe
        ref={iframeRef}
        src={src}
        title={title}
        className="w-full h-full border-0"
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
        allowFullScreen
        scrolling="no"
      />

      {needsUnmute && (
        <button
          onClick={handleUnmute}
          className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-black/60 text-white animate-in fade-in"
          aria-label="Ativar som"
        >
          <Volume2 size={40} />
          <span className="text-sm font-bold uppercase">Ativar som</span>
        </button>
      )}
    </div>
  );
}
