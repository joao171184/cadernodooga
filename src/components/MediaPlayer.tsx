import { X, ExternalLink } from "lucide-react";
import { getEmbedInfo } from "@/lib/embed";

interface Props {
  url: string;
  title: string;
  onClose: () => void;
}

export function MediaPlayer({ url, title, onClose }: Props) {
  const info = getEmbedInfo(url);

  if (info.kind === "none") return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t-2 border-accent shadow-2xl">
      <div className="max-w-2xl mx-auto p-3">
        <div className="flex items-center justify-between mb-2 gap-2">
          <p className="text-xs font-bold text-card-foreground uppercase truncate">{title}</p>
          <button
            onClick={onClose}
            className="p-2 -mr-1 rounded-lg hover:bg-muted shrink-0"
            aria-label="Fechar player"
          >
            <X size={18} />
          </button>
        </div>
        {info.kind === "youtube" && (
          <div className="aspect-video rounded-xl overflow-hidden bg-black">
            <iframe
              src={info.src}
              title={title}
              className="w-full h-full"
              allow="autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
            />
          </div>
        )}
        {info.kind === "spotify" && (
          <iframe
            src={info.src}
            title={title}
            className="w-full rounded-xl"
            height={152}
            allow="autoplay; clipboard-write; encrypted-media; picture-in-picture"
          />
        )}
        {info.kind === "tiktok" && (
          info.src ? (
            <div
              className="relative w-full mx-auto rounded-xl overflow-hidden bg-black"
              style={{ maxWidth: 325, height: "min(75vh, 740px)" }}
            >
              <iframe
                src={info.src}
                title={title}
                className="w-full h-full border-0"
                allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                allowFullScreen
                scrolling="no"
              />
              {info.externalUrl && (
                <a
                  href={info.externalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute bottom-2 right-2 flex items-center gap-1 px-2 py-1 rounded-md bg-black/70 text-white text-[10px] font-bold uppercase"
                >
                  <ExternalLink size={10} /> Abrir TikTok
                </a>
              )}
            </div>
          ) : (
            <a
              href={info.externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-4 rounded-xl bg-black text-white text-sm font-bold uppercase"
            >
              <ExternalLink size={16} /> Abrir no TikTok
            </a>
          )
        )}
        {info.kind === "audio" && (
          <audio src={info.src} controls autoPlay className="w-full" />
        )}
      </div>
    </div>
  );
}
