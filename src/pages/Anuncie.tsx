import { useRef, useState, type FormEvent } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Loader2, Megaphone } from "lucide-react";
import { PublicHeader } from "@/components/PublicHeader";
import { adsDb } from "@/integrations/supabase/adsTypes";
import { LEAD_RESULT_MESSAGE, validateLead, type LeadInput } from "@/lib/ads/validation";

const INTERESTS = [
  { value: "", label: "Ainda não sei" },
  { value: "topo-lista", label: "Faixa no topo da lista de pontos" },
  { value: "lista-entre-cards", label: "Card entre os pontos" },
  { value: "ponto-apos-letra", label: "Página do ponto, após a letra" },
  { value: "patrocinio", label: "Patrocínio" },
];

const EMPTY: LeadInput = { name: "", company: "", email: "", phone: "", interest: "", message: "", consent: false };

const inputClass =
  "w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-accent/50";

export default function Anuncie() {
  const [form, setForm] = useState<LeadInput>(EMPTY);
  const [honeypot, setHoneypot] = useState("");
  const [errors, setErrors] = useState<Partial<Record<keyof LeadInput, string>>>({});
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const openedAt = useRef(Date.now());

  const set = <K extends keyof LeadInput>(key: K, value: LeadInput[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const errs = validateLead(form);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSending(true);
    setResult(null);
    try {
      const { data, error } = await adsDb.rpc("submit_ad_lead", {
        _name: form.name.trim(),
        _company: form.company.trim(),
        _email: form.email.trim(),
        _phone: form.phone.trim(),
        _interest: form.interest,
        _message: form.message.trim(),
        _consent: form.consent,
        _honeypot: honeypot,
        _elapsed_ms: Date.now() - openedAt.current,
      });
      if (error) throw error;
      const code = typeof data === "string" ? data : "invalid";
      setResult({ ok: code === "ok", message: LEAD_RESULT_MESSAGE[code] ?? LEAD_RESULT_MESSAGE.invalid });
      if (code === "ok") setForm(EMPTY);
    } catch {
      setResult({ ok: false, message: "Não foi possível enviar agora. Tente novamente em instantes." });
    } finally {
      setSending(false);
    }
  };

  const field = (key: keyof LeadInput) => ({
    id: `lead-${key}`,
    "aria-invalid": !!errors[key] || undefined,
    "aria-describedby": errors[key] ? `lead-${key}-error` : undefined,
  });
  const err = (key: keyof LeadInput) =>
    errors[key] ? <p id={`lead-${key}-error`} className="mt-1 text-xs text-destructive">{errors[key]}</p> : null;

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Anuncie no Caderno do Ogã</title>
        <meta name="description" content="Divulgue seu terreiro, loja de artigos religiosos, curso ou evento para quem canta pontos de Umbanda." />
      </Helmet>
      <PublicHeader />

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-10 pb-24">
        <Link to="/" className="inline-flex items-center gap-1.5 text-xs font-bold uppercase text-muted-foreground hover:text-foreground">
          <ArrowLeft size={14} /> Voltar aos pontos
        </Link>

        <div className="mt-4 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent/15 text-accent">
            <Megaphone size={22} />
          </span>
          <h1 className="font-display text-2xl sm:text-3xl font-bold uppercase text-foreground">Anuncie conosco</h1>
        </div>
        <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
          O Caderno do Ogã é usado por ogãs, curimbeiros e médiuns para estudar e cantar pontos. Divulgue seu terreiro,
          loja de artigos religiosos, curso ou evento em espaços discretos, identificados como publicidade, que não
          atrapalham a leitura nem as giras. Conte o que deseja e responderemos pelo e-mail informado.
        </p>

        {result?.ok ? (
          <div role="status" className="mt-8 rounded-2xl border border-accent/30 bg-accent/10 p-6 text-center">
            <CheckCircle2 size={36} className="mx-auto text-accent" />
            <p className="mt-3 text-sm font-semibold text-foreground">{result.message}</p>
            <button onClick={() => setResult(null)} className="mt-4 text-xs font-bold uppercase text-accent hover:underline">
              Enviar outra mensagem
            </button>
          </div>
        ) : (
          <form onSubmit={submit} noValidate className="mt-8 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="lead-name" className="mb-1 block text-xs font-bold uppercase text-foreground">Seu nome *</label>
                <input {...field("name")} className={inputClass} value={form.name} maxLength={120} autoComplete="name"
                  onChange={(e) => set("name", e.target.value)} />
                {err("name")}
              </div>
              <div>
                <label htmlFor="lead-company" className="mb-1 block text-xs font-bold uppercase text-foreground">Empresa ou terreiro</label>
                <input {...field("company")} className={inputClass} value={form.company} maxLength={120} autoComplete="organization"
                  onChange={(e) => set("company", e.target.value)} />
                {err("company")}
              </div>
              <div>
                <label htmlFor="lead-email" className="mb-1 block text-xs font-bold uppercase text-foreground">E-mail *</label>
                <input {...field("email")} type="email" className={inputClass} value={form.email} maxLength={254} autoComplete="email"
                  onChange={(e) => set("email", e.target.value)} />
                {err("email")}
              </div>
              <div>
                <label htmlFor="lead-phone" className="mb-1 block text-xs font-bold uppercase text-foreground">WhatsApp ou telefone</label>
                <input {...field("phone")} type="tel" className={inputClass} value={form.phone} maxLength={40} autoComplete="tel"
                  onChange={(e) => set("phone", e.target.value)} />
                {err("phone")}
              </div>
            </div>
            <div>
              <label htmlFor="lead-interest" className="mb-1 block text-xs font-bold uppercase text-foreground">Interesse</label>
              <select {...field("interest")} className={inputClass} value={form.interest} onChange={(e) => set("interest", e.target.value)}>
                {INTERESTS.map((i) => <option key={i.value} value={i.value}>{i.label}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="lead-message" className="mb-1 block text-xs font-bold uppercase text-foreground">Mensagem *</label>
              <textarea {...field("message")} rows={5} className={inputClass} value={form.message} maxLength={2000}
                placeholder="O que você quer divulgar, período desejado, público…"
                onChange={(e) => set("message", e.target.value)} />
              {err("message")}
            </div>

            {/* Campo isca: invisível para pessoas, robôs costumam preencher. */}
            <div aria-hidden="true" className="absolute -left-[10000px] h-px w-px overflow-hidden">
              <label htmlFor="lead-website">Site</label>
              <input id="lead-website" tabIndex={-1} autoComplete="off" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} />
            </div>

            <div>
              <label className="flex items-start gap-2 text-xs text-muted-foreground leading-relaxed">
                <input
                  {...field("consent")}
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 accent-[hsl(var(--accent))]"
                  checked={form.consent}
                  onChange={(e) => set("consent", e.target.checked)}
                />
                <span>
                  Autorizo o uso destes dados apenas para responder sobre publicidade no Caderno do Ogã. Eles não são
                  compartilhados com terceiros e podem ser apagados a pedido (LGPD).
                </span>
              </label>
              {err("consent")}
            </div>

            {result && !result.ok && (
              <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {result.message}
              </p>
            )}

            <button
              type="submit"
              disabled={sending}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold uppercase text-primary-foreground transition-all active:scale-95 disabled:opacity-60 sm:w-auto"
            >
              {sending && <Loader2 size={16} className="animate-spin" />}
              Enviar
            </button>
          </form>
        )}
      </main>
    </div>
  );
}
