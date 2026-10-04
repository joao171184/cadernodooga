import { forwardRef, type CSSProperties } from "react";
import type { RevenueType } from "@/integrations/supabase/adsTypes";

export const REVENUE_LABEL: Record<RevenueType, string> = {
  direct: "Publicidade",
  sponsorship: "Patrocinado",
  affiliate: "Link de afiliado",
};

export interface AdFormat {
  desktop_width: number;
  desktop_height: number;
  mobile_width: number;
  mobile_height: number;
}

interface Props {
  imageUrl: string;
  mobileImageUrl?: string | null;
  alt: string;
  /** Vazio = pré-visualização, sem link. */
  targetUrl: string;
  advertiserName: string;
  revenueType: RevenueType;
  format: AdFormat;
  variant?: "banner" | "card";
  /** Pré-visualização do painel: força o formato de celular. */
  forceMobile?: boolean;
  onClick?: () => void;
  className?: string;
}

/** Anúncio direto: imagem com link patrocinado, selo visível e espaço reservado (sem pular o layout). */
export const AdCreative = forwardRef<HTMLElement, Props>(function AdCreative(
  { imageUrl, mobileImageUrl, alt, targetUrl, advertiserName, revenueType, format, variant = "banner", forceMobile, onClick, className = "" },
  ref,
) {
  const desktopRatio = `${format.desktop_width} / ${format.desktop_height}`;
  const mobileRatio = mobileImageUrl ? `${format.mobile_width} / ${format.mobile_height}` : desktopRatio;
  const style = { "--ad-ratio-m": mobileRatio, "--ad-ratio-d": forceMobile ? mobileRatio : desktopRatio } as CSSProperties;
  const src = forceMobile && mobileImageUrl ? mobileImageUrl : imageUrl;
  const card = variant === "card";
  const frameClass =
    "block overflow-hidden rounded-xl border border-border bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-accent";
  const picture = (
    <picture>
      {!forceMobile && mobileImageUrl && <source media="(max-width: 639px)" srcSet={mobileImageUrl} />}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        style={style}
        className="block w-full h-auto object-cover [aspect-ratio:var(--ad-ratio-m)] sm:[aspect-ratio:var(--ad-ratio-d)]"
      />
    </picture>
  );

  return (
    <aside
      ref={ref}
      aria-label={`${REVENUE_LABEL[revenueType]}: ${advertiserName}`}
      className={`${card ? "bg-card rounded-2xl border border-border shadow-sm p-3 sm:p-4 self-start" : ""} ${className}`}
    >
      <div className="flex items-center justify-between gap-2 mb-1.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
        <span className="rounded bg-muted px-1.5 py-0.5">{REVENUE_LABEL[revenueType]}</span>
        <span className="truncate">{advertiserName}</span>
      </div>
      {targetUrl ? (
        <a
          href={targetUrl}
          target="_blank"
          rel="sponsored noopener noreferrer"
          onClick={onClick}
          onAuxClick={(e) => { if (e.button === 1) onClick?.(); }}
          className={frameClass}
        >
          {picture}
        </a>
      ) : (
        <div className={frameClass}>{picture}</div>
      )}
    </aside>
  );
});
