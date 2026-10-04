import type { NotifyLogItem, NotifySendResult } from "@/integrations/supabase/adsTypes";

export const NOTIFY_SEND_MESSAGE: Record<NotifySendResult, string> = {
  sent: "E-mail de teste enviado ao Brevo. Confira a caixa de entrada (e o spam) dos destinatários.",
  disabled: "Os avisos estão desligados.",
  no_sender: "Informe e salve o e-mail remetente antes.",
  no_key: "A chave do Brevo ainda não foi guardada no banco. Veja as instruções abaixo.",
  no_recipients: "Escolha ao menos um destinatário.",
  rate_limited: "Limite de 5 testes por hora atingido. Tente mais tarde.",
};

/** Resultado de um envio, pela resposta HTTP do Brevo. */
export function deliveryLabel(d: Pick<NotifyLogItem, "status_code" | "timed_out" | "error">): { text: string; ok: boolean | null } {
  const msg = d.error ?? "";
  if (d.status_code != null && d.status_code >= 200 && d.status_code < 300) return { text: "Aceito pelo Brevo", ok: true };
  if (/unrecogni[sz]ed IP|authorised_ips|authorized_ips/i.test(msg)) {
    return { text: "IP bloqueado no Brevo (desative o bloqueio em Segurança → IPs autorizados)", ok: false };
  }
  if (d.status_code === 401) return { text: "Chave do Brevo inválida ou revogada", ok: false };
  if (d.status_code === 403) return { text: "Brevo bloqueou (conta não ativada para envios)", ok: false };
  if (d.status_code === 400) return { text: "Brevo recusou (confira se o remetente está verificado)", ok: false };
  if (d.status_code === 429) return { text: "Limite de envio do Brevo atingido", ok: false };
  if (d.status_code != null) return { text: `Erro do Brevo (HTTP ${d.status_code})`, ok: false };
  if (d.timed_out || d.error) return { text: "Sem resposta do Brevo", ok: false };
  return { text: "Aguardando resposta", ok: null };
}
