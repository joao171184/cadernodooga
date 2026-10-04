import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Loader2, Mail, Send, XCircle } from "lucide-react";
import { toast } from "sonner";
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
    return <div className="flex justify-center rounded-xl border border-border p-4"><Loader2 size={16} className="animate-spin text-muted-foreground" /></div>;
  }
  if (state === "missing") {
    return (
      <section className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs">
        <p className="font-bold">Avisos por e-mail ainda não instalados.</p>
        <p className="mt-1 text-muted-foreground">Rode a migração <code>drizzle/migrations/0006_lead_notifications.sql</code> no editor SQL do Lovable Cloud.</p>
      </section>
    );
  }
  if (state === "failed") {
    return <p className="text-xs text-destructive">Não foi possível carregar os avisos por e-mail.</p>;
  }

  return (
    <section className="space-y-4 rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-center gap-3">
        <h3 className="flex items-center gap-1.5 text-[11px] font-bold uppercase text-muted-foreground">
          <Mail size={13} /> Aviso por e-mail de novos pedidos (Brevo)
        </h3>
        <label className="ml-auto flex items-center gap-2 text-xs font-semibold">
          <Switch checked={enabled} onCheckedChange={setEnabled} aria-label="Ligar avisos por e-mail" />
          Avisos ligados
        </label>
      </div>

      <ul className="flex flex-wrap gap-2 text-[11px]">
        <StatusPill ok={!!status?.key_configured} text={status?.key_configured ? "Chave do Brevo guardada" : "Chave do Brevo não configurada"} />
        <StatusPill ok={(status?.recipients ?? 0) > 0} text={`${status?.recipients ?? 0} destinatário(s)`} />
        <StatusPill ok={!!senderEmail.trim()} text={senderEmail.trim() ? "Remetente definido" : "Sem remetente"} />
      </ul>

      <div className="grid gap-3 md:grid-cols-2">
        <Field label="E-mail remetente" htmlFor="n-sender" error={senderError} hint="Precisa estar verificado no Brevo (ex.: avisos@cadernodooga.com.br).">
          <input id="n-sender" type="email" className={inputClass} value={senderEmail} placeholder="avisos@cadernodooga.com.br"
            onChange={(e) => setSenderEmail(e.target.value)} />
        </Field>
        <Field label="Nome do remetente" htmlFor="n-name">
          <input id="n-name" className={inputClass} value={senderName} maxLength={70} onChange={(e) => setSenderName(e.target.value)} />
        </Field>
      </div>

      <p className="text-[11px] text-muted-foreground">
        O e-mail traz só o nome, a empresa e o interesse de quem pediu, com um link para este painel. Telefone, e-mail e
        mensagem ficam apenas aqui.
      </p>

      <div className="flex flex-wrap justify-end gap-2">
        <button className={btnGhost} onClick={sendTest} disabled={testing}>
          {testing ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />} Enviar e-mail de teste
        </button>
        <button className={btnPrimary} onClick={save} disabled={saving}>
          {saving && <Loader2 size={12} className="animate-spin" />} Salvar avisos
        </button>
      </div>

      {last && (
        <p className="border-t border-border pt-3 text-xs">
          <span className="font-bold uppercase text-muted-foreground">Último envio: </span>
          <span className="text-muted-foreground">{formatLocalDateTime(last.created_at)} · {last.kind === "test" ? "Teste" : "Pedido"} · </span>
          <span className={lastLabel?.ok === false ? "text-destructive" : lastLabel?.ok ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}>
            {lastLabel?.text}
          </span>
          <span className="text-muted-foreground"> (lista completa em “Histórico de envios”)</span>
        </p>
      )}
    </section>
  );
}

function StatusPill({ ok, text }: { ok: boolean; text: string }) {
  return (
    <li className={`flex items-center gap-1 rounded-full border px-2 py-0.5 ${ok ? "border-emerald-500/30 text-emerald-700 dark:text-emerald-300" : "border-amber-500/40 text-amber-700 dark:text-amber-300"}`}>
      {ok ? <CheckCircle2 size={12} /> : <XCircle size={12} />} {text}
    </li>
  );
}
