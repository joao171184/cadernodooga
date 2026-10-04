import type { AdLeadRow, LeadStatus } from "@/integrations/supabase/adsTypes";

export const LEAD_STATUS: Record<LeadStatus, string> = {
  new: "Novo",
  contacted: "Em contato",
  closed: "Concluído",
  spam: "Spam",
};

export const INTEREST_LABEL: Record<string, string> = {
  "topo-lista": "Faixa no topo da lista",
  "lista-entre-cards": "Card entre os pontos",
  "ponto-apos-letra": "Página do ponto",
  patrocinio: "Patrocínio",
};

/** Link "Responder por e-mail" já com assunto e saudação. */
export function replyMailto(lead: Pick<AdLeadRow, "email" | "name">): string {
  const subject = encodeURIComponent("Publicidade no Caderno do Ogã");
  const body = encodeURIComponent(`Olá, ${lead.name}!\n\nObrigado pelo interesse em anunciar no Caderno do Ogã.\n\n`);
  return `mailto:${encodeURIComponent(lead.email)}?subject=${subject}&body=${body}`;
}

/** Spam fica oculto quando nenhum status está selecionado. */
export function filterLeads<T extends Pick<AdLeadRow, "status" | "name" | "company" | "email">>(
  leads: T[],
  status: LeadStatus | "",
  query: string,
): T[] {
  const q = query.trim().toLowerCase();
  return leads.filter((l) => {
    if (status ? l.status !== status : l.status === "spam") return false;
    if (!q) return true;
    return [l.name, l.company, l.email].some((v) => v.toLowerCase().includes(q));
  });
}
