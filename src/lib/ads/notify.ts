import type { AdNotifyStatus, NotifySendResult } from "@/integrations/supabase/adsTypes";

export const NOTIFY_SEND_MESSAGE: Record<NotifySendResult, string> = {
  sent: "E-mail de teste enviado ao Brevo. Confira a caixa de entrada (e o spam) dos destinatários.",
  disabled: "Os avisos estão desligados.",
  no_sender: "Informe e salve o e-mail remetente antes.",
  no_key: "A chave do Brevo ainda não foi guardada no banco. Veja as instruções abaixo.",
  no_recipients: "Escolha ao menos um destinatário.",
  rate_limited: "Limite de 5 testes por hora atingido. Tente mais tarde.",
};

type Delivery = AdNotifyStatus["recent"][number];

/** Resultado de um envio, pela resposta HTTP do Brevo guardada pelo pg_net (por algumas horas). */
export function deliveryLabel(d: Delivery): { text: string; ok: boolean | null } {
  if (d.status_code === 201 || d.status_code === 202) return { text: "Aceito pelo Brevo", ok: true };
  if (d.status_code === 401) return { text: "Chave do Brevo inválida ou revogada", ok: false };
  if (d.status_code === 403) return { text: "Brevo bloqueou (conta não ativada ou IP não autorizado)", ok: false };
  if (d.status_code === 400) return { text: "Brevo recusou (confira se o remetente está verificado)", ok: false };
  if (d.status_code === 429) return { text: "Limite de envio do Brevo atingido", ok: false };
  if (d.status_code != null) return { text: `Erro do Brevo (HTTP ${d.status_code})`, ok: false };
  if (d.timed_out || d.error) return { text: "Sem resposta do Brevo", ok: false };
  return { text: "Sem resposta registrada", ok: null };
}
