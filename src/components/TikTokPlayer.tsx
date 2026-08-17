import { useCallback, useEffect, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";

interface Props {
  src: string;
  title: string;
}

export function TikTokPlayer({ src, title }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [needsUnmute, setNeedsUnmute] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);

  const post = useCallback((messages: unknown[]) => {
    const win = iframeRef.current?.contentWindow;
    if (!win) return;
    try {
      messages.forEach((m) => win.postMessage(m, "*"));
    } catch { /* cross-origin fallback */ }
  }, []);

  const applyAudio = useCallback(
    (nextMuted: boolean, nextVolume: number) => {
      post([
        { type: "player:mute", value: nextMuted ? 1 : 0 },
        { type: "player:volume", value: nextMuted ? 0 : nextVolume },
        { method: "setVolume", value: nextMuted ? 0 : nextVolume },
        { method: nextMuted ? "mute" : "unmute" },
      ]);
    },
    [post],
  );

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const tryUnmute = () => applyAudio(false, 1);

    const timer = setTimeout(tryUnmute, 1200);
    const interval = setInterval(tryUnmute, 2500);

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
  }, [src, applyAudio]);

  const handleUnmute = () => {
    setMuted(false);
    applyAudio(false, volume || 1);
    post([{ type: "player:play" }]);
    setNeedsUnmute(false);
  };

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    applyAudio(next, volume);
  };

  const handleVolume = (value: number) => {
    setVolume(value);
    const nextMuted = value === 0;
    setMuted(nextMuted);
    applyAudio(nextMuted, value);
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

      <div className="absolute bottom-3 left-3 right-3 z-20 flex items-center gap-3 rounded-full bg-background/70 backdrop-blur-md px-3 py-2 border border-border">
        <button
          onClick={toggleMute}
          className="text-foreground shrink-0"
          aria-label={muted ? "Ativar som" : "Silenciar"}
        >
          {muted || volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
        </button>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={muted ? 0 : volume}
          onChange={(e) => handleVolume(Number(e.target.value))}
          aria-label="Volume"
          className="w-full accent-primary cursor-pointer"
        />
      </div>

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
