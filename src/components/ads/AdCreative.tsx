import { forwardRef, type CSSProperties } from "react";
import type { RevenueType } from "@/integrations/supabase/adsTypes";

/** Rótulos neutros (evitam filtros EasyList com “publicidade” / “patrocinado”). */
export const REVENUE_LABEL: Record<RevenueType, string> = {
  direct: "Parceiro",
  sponsorship: "Destaque",
  affiliate: "Indicação",
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

/** Criativo de parceiro: imagem com link, selo e espaço reservado. */
export const AdCreative = forwardRef<HTMLElement, Props>(function AdCreative(
  { imageUrl, mobileImageUrl, alt, targetUrl, advertiserName, revenueType, format, variant = "banner", forceMobile, onClick, className = "" },
  ref,
) {
  const href = targetUrl.trim();
  const desktopRatio = `${format.desktop_width} / ${format.desktop_height}`;
  const mobileRatio = mobileImageUrl ? `${format.mobile_width} / ${format.mobile_height}` : desktopRatio;
  const ratio = forceMobile ? mobileRatio : desktopRatio;
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
        loading="eager"
        decoding="async"
        style={{ aspectRatio: ratio } as CSSProperties}
        className="block w-full h-auto object-cover"
      />
    </picture>
  );
  const label = (
    <div className="flex items-center justify-between gap-2 mb-1.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
      <span className="rounded bg-muted px-1.5 py-0.5">{REVENUE_LABEL[revenueType]}</span>
      <span className="truncate">{advertiserName}</span>
    </div>
  );

  return (
    <aside
      ref={ref}
      aria-label={`${REVENUE_LABEL[revenueType]}: ${advertiserName}`}
      className={`promo-card ${card ? "bg-card rounded-2xl border border-border shadow-sm p-3 sm:p-4 self-start" : ""} ${className}`}
      data-promo="parceiro"
    >
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          onClick={onClick}
          onAuxClick={(e) => { if (e.button === 1) onClick?.(); }}
          className="block rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          {label}
          <span className={frameClass}>{picture}</span>
        </a>
      ) : (
        <>
          {label}
          <div className={frameClass}>{picture}</div>
        </>
      )}
    </aside>
  );
});
