import { authorCredit } from "@/lib/pointAuthor";

export function PointAuthorship({ autor, footerId = "direitos-autorais" }: { autor?: string | null; footerId?: string }) {
  const credit = authorCredit(autor);
  return (
    <p className="min-w-0 max-w-full text-sm text-muted-foreground [overflow-wrap:anywhere]">
      <span className="font-semibold">Autoria: </span>
      <span className="text-foreground font-medium">{credit?.name ?? "Não identificada"}</span>
      {!credit && <>{" "}<a
        href={`#${footerId}`}
        className="text-xs underline underline-offset-4 hover:text-accent-strong"
        onClick={(event) => {
          const footer = document.getElementById(footerId);
          if (!footer) return;
          event.preventDefault();
          window.dispatchEvent(new Event("copyright-scroll-request"));
          requestAnimationFrame(() => requestAnimationFrame(() => {
            footer.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
          }));
        }}
      >(Sabe quem é o autor? Avise-nos)</a></>}
    </p>
  );
}