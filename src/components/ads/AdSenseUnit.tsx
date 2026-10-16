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

/** Espera o Google marcar filled; unfilled/erro esconde. Timeout só como rede de segurança. */
const FILL_TIMEOUT_MS = 12_000;

function devLog(slot: string, status: string) {
  if (import.meta.env.DEV) {
    console.info(`[AdSense] slot=${slot} status=${status}`);
  }
}

/** Bloco oficial do AdSense (`adsbygoogle` é exigido pelo Google). */
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

  const markUnavailable = (reason: string) => {
    if (unavailable.current) return;
    unavailable.current = true;
    devLog(slot, reason);
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
        devLog(slot, "pushed");
      })
      .catch(() => {
        if (alive) markUnavailable("script-error");
      });
    return () => {
      alive = false;
    };
  }, [client, slot]);

  useEffect(() => {
    const ins = insRef.current;
    if (!ins) return;
    let done = false;
    const finish = () => {
      done = true;
      mo?.disconnect();
      window.clearTimeout(timer);
    };
    const check = () => {
      const status = ins.getAttribute("data-ad-status");
      if (!status) return;
      if (status === "unfilled") {
        markUnavailable("unfilled");
        finish();
        return;
      }
      if (status === "filled") {
        devLog(slot, "filled");
        finish();
      }
    };
    const mo =
      typeof MutationObserver !== "undefined"
        ? new MutationObserver(check)
        : null;
    mo?.observe(ins, { attributes: true, attributeFilter: ["data-ad-status"] });
    const timer = window.setTimeout(() => {
      if (!done && ins.getAttribute("data-ad-status") !== "filled") {
        markUnavailable(ins.getAttribute("data-ad-status") ?? "timeout");
      }
    }, FILL_TIMEOUT_MS);
    check();
    return () => {
      mo?.disconnect();
      window.clearTimeout(timer);
    };
  }, [slot]);

  return (
    <aside
      aria-label="Conteúdo Google"
      hidden={hidden}
      className={`${variant === "card" ? "bg-card rounded-2xl border border-border shadow-sm p-3 sm:p-4 self-start" : ""} ${className}`}
      data-promo="google"
    >
      <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
        <span className="rounded bg-muted px-1.5 py-0.5">Google</span>
      </div>
      <ins
        ref={insRef}
        className="adsbygoogle"
        style={{ display: "block", minHeight, width: "100%" }}
        data-ad-client={client}
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </aside>
  );
}
