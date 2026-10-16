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
  /** Chamado quando o Google não preenche o bloco ou o script falha. */
  onUnavailable?: () => void;
}

/** Bloco oficial do AdSense. Sem rastreamento próprio de cliques ou impressões (política do Google). */
export function AdSenseUnit({
  client,
  slot,
  minHeight,
  variant = "banner",
  className = "",
  onUnavailable,
}: Props) {
  const pushed = useRef(false);
  const unavailable = useRef(false);
  const insRef = useRef<HTMLModElement>(null);
  const [hidden, setHidden] = useState(false);
  const onUnavailableRef = useRef(onUnavailable);
  onUnavailableRef.current = onUnavailable;

  const markUnavailable = () => {
    if (unavailable.current) return;
    unavailable.current = true;
    setHidden(true);
    onUnavailableRef.current?.();
  };

  useEffect(() => {
    let alive = true;
    loadAdSenseScript(client)
      .then(() => {
        if (!alive || pushed.current) return;
        pushed.current = true;
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      })
      .catch(() => {
        if (alive) markUnavailable();
      });
    return () => {
      alive = false;
    };
  }, [client, slot]);

  // O Google marca data-ad-status="unfilled" quando não tem anúncio.
  useEffect(() => {
    const ins = insRef.current;
    if (!ins || typeof MutationObserver === "undefined") return;
    const check = () => {
      if (ins.getAttribute("data-ad-status") === "unfilled") markUnavailable();
    };
    check();
    const mo = new MutationObserver(check);
    mo.observe(ins, { attributes: true, attributeFilter: ["data-ad-status"] });
    return () => mo.disconnect();
  }, []);

  return (
    <aside
      aria-label="Publicidade do Google"
      hidden={hidden}
      className={`${variant === "card" ? "bg-card rounded-2xl border border-border shadow-sm p-3 sm:p-4 self-start" : ""} ${className}`}
    >
      <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
        <span className="rounded bg-muted px-1.5 py-0.5">Publicidade · Google</span>
      </div>
      <ins
        ref={insRef}
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
