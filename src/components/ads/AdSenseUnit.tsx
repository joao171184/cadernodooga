import { useEffect, useRef, useState } from "react";
import { loadAdSenseScript } from "@/lib/ads/adsense";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

interface Props {
  client: string;
  slot: string;
  minHeight: number;
  variant?: "banner" | "card";
  className?: string;
}

/** Bloco oficial do AdSense. Sem rastreamento próprio de cliques ou impressões (política do Google). */
export function AdSenseUnit({ client, slot, minHeight, variant = "banner", className = "" }: Props) {
  const pushed = useRef(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    loadAdSenseScript(client)
      .then(() => {
        if (!alive || pushed.current) return;
        pushed.current = true;
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      })
      .catch(() => { if (alive) setFailed(true); });
    return () => { alive = false; };
  }, [client, slot]);

  if (failed) return null;
  return (
    <aside
      aria-label="Publicidade do Google"
      className={`${variant === "card" ? "bg-card rounded-2xl border border-border shadow-sm p-3 sm:p-4 self-start" : ""} ${className}`}
    >
      <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
        <span className="rounded bg-muted px-1.5 py-0.5">Publicidade · Google</span>
      </div>
      <ins
        className="adsbygoogle"
        style={{ display: "block", minHeight }}
        data-ad-client={client}
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </aside>
  );
}
