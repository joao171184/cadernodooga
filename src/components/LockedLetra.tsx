import { ReactNode } from "react";

import { useAuth } from "@/contexts/AuthContext";

/** Mostra a letra inteira para quem está logado; para visitantes, metade fica borrada. */
export function LockedLetra({
  letra, className, render,
}: { letra: string; className: string; render?: (t: string) => ReactNode }) {
  const { isLoggedIn, loading } = useAuth();
  const r = render ?? ((t: string) => t);
  if (isLoggedIn || loading) return <pre className={className}>{r(letra)}</pre>;
  const lines = letra.split("\n");
  const cut = Math.max(1, Math.ceil(lines.length / 2));
  const visible = lines.slice(0, cut).join("\n");
  const hidden = lines.slice(cut).join("\n") || "...";
  return (
    <div>
      <pre className={className}>{r(visible)}</pre>
      <div className="select-none" aria-hidden="true">
        <pre className={`${className} blur-[6px] pointer-events-none`}>{hidden}</pre>
      </div>
    </div>
  );
}

export function guestLetra(letra: string, isLoggedIn: boolean) {
  if (isLoggedIn) return letra;
  const lines = letra.split("\n");
  return lines.slice(0, Math.max(1, Math.ceil(lines.length / 2))).join("\n");
}
