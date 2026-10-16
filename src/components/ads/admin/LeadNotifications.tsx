import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Loader2, Mail, Send, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { adsDb, type AdNotifyStatus } from "@/integrations/supabase/adsTypes";
import { deliveryLabel, NOTIFY_SEND_MESSAGE } from "@/lib/ads/notify";
import { formatLocalDateTime } from "@/lib/ads/time";
import { dbErrorMessage } from "./useAdsAdmin";
import { Field, btnGhost, btnPrimary, inputClass } from "./ui";

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const MISSING_CODES = new Set(["42P01", "PGRST205", "PGRST202", "42883"]);

export function LeadNotifications({ refreshKey = 0 }: { refreshKey?: number }) {
  const [enabled, setEnabled] = useState(false);
  const [senderEmail, setSenderEmail] = useState("");
  const [senderName, setSenderName] = useState("Caderno do Ogã");
  const [status, setStatus] = useState<AdNotifyStatus | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "missing" | "failed">("loading");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  const load = useCallback(async () => {
    const [s, st] = await Promise.all([
      adsDb.from("ad_notify_settings").select("*").maybeSingle(),
      adsDb.rpc("ads_notify_status"),
    ]);
    const err = s.error || st.error;
    if (err) {
      setState(MISSING_CODES.has(err.code ?? "") ? "missing" : "failed");
      return;
    }
    setEnabled(s.data?.enabled ?? false);
    setSenderEmail(s.data?.sender_email ?? "");
    setSenderName(s.data?.sender_name ?? "Caderno do Ogã");
    setStatus(st.data ?? null);
    setState("ready");
  }, []);

  const loadStatus = useCallback(async () => {
    const { data, error } = await adsDb.rpc("ads_notify_status");
    if (!error) setStatus(data ?? null);
  }, []);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { if (refreshKey > 0) void loadStatus(); }, [refreshKey, loadStatus]);

  const last = status?.recent[0];
  const lastLabel = last ? deliveryLabel(last) : null;

  const senderError = senderEmail.trim() && !EMAIL_RE.test(senderEmail.trim()) ? "E-mail inválido." : undefined;

  const save = async () => {
    const email = senderEmail.trim();
    if (senderError) return toast.error(senderError);
    if (!senderName.trim()) return toast.error("Informe o nome do remetente.");
    if (enabled && !email) return toast.error("Informe o e-mail remetente para ligar os avisos.");
    if (enabled && !status?.key_configured) return toast.error("Guarde a chave do Brevo no banco antes de ligar os avisos.");
    setSaving(true);
    const { error } = await adsDb
      .from("ad_notify_settings")
      .update({ enabled, sender_email: email || null, sender_name: senderName.trim() })
      .eq("id", true);
    setSaving(false);
    if (error) return toast.error(dbErrorMessage(error));
    toast.success("Avisos salvos.");
    void load();
  };

  const sendTest = async () => {
    setTesting(true);
    const { data, error } = await adsDb.rpc("ads_send_test_notification");
    setTesting(false);
    if (error) return toast.error(dbErrorMessage(error));
    const msg = NOTIFY_SEND_MESSAGE[data] ?? "Não foi possível enviar o teste.";
    if (data === "sent") {
      toast.success(msg);
      setTimeout(() => void loadStatus(), 4000);
    } else {
      toast.error(msg);
    }
  };

  if (state === "loading") {
    return (
      <section className="space-y-3 rounded-panel border border-panel-border bg-panel-card p-4">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-10 w-40 ml-auto" />
      </section>
    );
  }
  if (state === "missing") {
    return (
      <section className="rounded-panel border border-feedback-warning-fg/30 bg-feedback-warning p-4 text-xs text-feedback-warning-fg">
        <p className="font-bold">Avisos por e-mail ainda não instalados.</p>
        <p className="mt-1 opacity-90">
          Rode a migração <code>drizzle/migrations/0006_lead_notifications.sql</code> no editor SQL do Lovable Cloud.
        </p>
      </section>
    );
  }
  if (state === "failed") {
    return (
      <p className="rounded-panel border border-feedback-danger-fg/30 bg-feedback-danger px-3 py-2 text-xs text-feedback-danger-fg">
        Não foi possível carregar os avisos por e-mail.
      </p>
    );
  }

  return (
    <section className="relative space-y-4 rounded-panel border border-panel-border bg-panel-card p-4 pb-20 shadow-sm">
      <header className="flex flex-wrap items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-panel bg-feedback-info text-feedback-info-fg">
          <Mail size={18} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-foreground">Aviso por e-mail de novos pedidos</h3>
          <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
            Integração com Brevo. O e-mail traz nome, empresa e interesse, com link para este painel. Telefone, e-mail e
            mensagem ficam só aqui.
          </p>
        </div>
        <label className="flex items-center gap-2 text-xs font-semibold">
          <Switch checked={enabled} onCheckedChange={setEnabled} aria-label="Ligar avisos por e-mail" />
          Avisos ligados
        </label>
      </header>

      <ul className="flex flex-wrap gap-2 text-[11px]">
        <StatusPill ok={!!status?.key_configured} text={status?.key_configured ? "Chave do Brevo guardada" : "Chave do Brevo não configurada"} />
        <StatusPill ok={(status?.recipients ?? 0) > 0} text={`${status?.recipients ?? 0} destinatário(s)`} />
        <StatusPill ok={!!senderEmail.trim()} text={senderEmail.trim() ? "Remetente definido" : "Sem remetente"} />
      </ul>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="E-mail remetente" htmlFor="notify-sender" error={senderError} hint="Precisa estar verificado no Brevo (ex.: avisos@cadernodooga.com.br).">
          <input
            id="notify-sender"
            type="email"
            className={inputClass}
            value={senderEmail}
            placeholder="avisos@cadernodooga.com.br"
            onChange={(e) => setSenderEmail(e.target.value)}
          />
        </Field>
        <Field label="Nome do remetente" htmlFor="notify-name">
          <input id="notify-name" className={inputClass} value={senderName} maxLength={70} onChange={(e) => setSenderName(e.target.value)} />
        </Field>
      </div>

      {last && (
        <p className="rounded-panel border border-panel-border bg-panel-raised px-3 py-2 text-xs">
          <span className="font-bold uppercase tracking-wide text-muted-foreground">Último envio: </span>
          <span className="text-muted-foreground">{formatLocalDateTime(last.created_at)} · {last.kind === "test" ? "Teste" : "Pedido"} · </span>
          <span className={lastLabel?.ok === false ? "text-feedback-danger-fg" : lastLabel?.ok ? "text-feedback-success-fg" : "text-muted-foreground"}>
            {lastLabel?.text}
          </span>
          <span className="text-muted-foreground"> (lista em “Histórico de envios”)</span>
        </p>
      )}

      <div className="absolute inset-x-0 bottom-0 flex flex-wrap justify-end gap-2 rounded-b-panel border-t border-panel-border bg-panel-raised/95 p-3 backdrop-blur-md">
        <button type="button" className={btnGhost} onClick={() => void sendTest()} disabled={testing}>
          {testing ? <Loader2 size={12} className="animate-spin" aria-hidden /> : <Send size={12} aria-hidden />}
          Enviar e-mail de teste
        </button>
        <button type="button" className={btnPrimary} onClick={() => void save()} disabled={saving}>
          {saving && <Loader2 size={12} className="animate-spin" aria-hidden />} Salvar avisos
        </button>
      </div>
    </section>
  );
}

function StatusPill({ ok, text }: { ok: boolean; text: string }) {
  return (
    <li
      className={`flex items-center gap-1 rounded-full border px-2 py-0.5 ${
        ok
          ? "border-feedback-success-fg/30 bg-feedback-success text-feedback-success-fg"
          : "border-feedback-warning-fg/40 bg-feedback-warning text-feedback-warning-fg"
      }`}
    >
      {ok ? <CheckCircle2 size={12} aria-hidden /> : <XCircle size={12} aria-hidden />} {text}
    </li>
  );
}
