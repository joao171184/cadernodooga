import { useEffect, useState } from "react";
import { Archive, Building2, Loader2, Mail, Pencil, Phone, Plus, RotateCcw, User } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { adsDb, type AdAdvertiserRow } from "@/integrations/supabase/adsTypes";
import { computeCampaignStatus } from "@/lib/ads/status";
import { validateAdvertiser, type AdvertiserInput } from "@/lib/ads/validation";
import { dbErrorMessage, type AdsAdminData } from "./useAdsAdmin";
import { Field, btnDanger, btnGhost, btnPrimary, inputClass } from "./ui";

const EMPTY: AdvertiserInput = { name: "", contactName: "", contactEmail: "", contactPhone: "", notes: "" };

const AVATAR_TONES = [
  "bg-status-active text-status-active-fg",
  "bg-status-scheduled text-status-scheduled-fg",
  "bg-status-paused text-status-paused-fg",
  "bg-status-draft text-status-draft-fg",
  "bg-feedback-info text-feedback-info-fg",
  "bg-feedback-success text-feedback-success-fg",
] as const;

function initialOf(name: string): string {
  const t = name.trim();
  if (!t) return "?";
  return t.charAt(0).toLocaleUpperCase("pt-BR");
}

function toneFor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h + name.charCodeAt(i) * (i + 1)) % AVATAR_TONES.length;
  return AVATAR_TONES[h];
}

export function AdvertisersTab({
  advertisers,
  campaigns,
  reload,
  loading,
}: AdsAdminData & { reload: () => Promise<void>; loading?: boolean }) {
  const [editing, setEditing] = useState<AdAdvertiserRow | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<AdvertiserInput>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof AdvertiserInput, string>>>({});
  const [saving, setSaving] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState<AdAdvertiserRow | null>(null);
  const now = new Date();

  useEffect(() => {
    if (!open) return;
    setForm(editing
      ? { name: editing.name, contactName: editing.contact_name, contactEmail: editing.contact_email, contactPhone: editing.contact_phone, notes: editing.notes }
      : EMPTY);
    setErrors({});
  }, [open, editing]);

  const save = async () => {
    const errs = validateAdvertiser(form);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSaving(true);
    const row = {
      name: form.name.trim(),
      contact_name: form.contactName.trim(),
      contact_email: form.contactEmail.trim().toLowerCase(),
      contact_phone: form.contactPhone.trim(),
      notes: form.notes.trim(),
    };
    const { error } = editing
      ? await adsDb.from("ad_advertisers").update(row).eq("id", editing.id)
      : await adsDb.from("ad_advertisers").insert(row);
    setSaving(false);
    if (error) return toast.error(dbErrorMessage(error));
    toast.success(editing ? "Anunciante atualizado." : "Anunciante cadastrado.");
    setOpen(false);
    await reload();
  };

  const toggleArchive = async (a: AdAdvertiserRow) => {
    const { error } = await adsDb.from("ad_advertisers").update({ archived: !a.archived }).eq("id", a.id);
    if (error) return toast.error(dbErrorMessage(error));
    toast.success(a.archived ? "Anunciante restaurado." : "Anunciante arquivado. As campanhas dele saem do ar.");
    await reload();
  };

  const set = (k: keyof AdvertiserInput, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const activeCount = (id: string) =>
    campaigns.filter((c) => c.advertiser_id === id && computeCampaignStatus(c, now) === "active").length;

  return (
    <TooltipProvider delayDuration={300}>
      <div className="space-y-panel">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-xs text-muted-foreground">{advertisers.length} anunciante(s)</p>
          <button type="button" className={`${btnPrimary} ml-auto`} onClick={() => { setEditing(null); setOpen(true); }}>
            <Plus size={14} aria-hidden /> Novo anunciante
          </button>
        </div>

        {loading ? (
          <ul className="grid gap-3 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <li key={i} className="rounded-panel border border-panel-border bg-panel-card p-4">
                <div className="flex gap-3">
                  <Skeleton className="h-11 w-11 shrink-0 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-3 w-1/2" />
                    <Skeleton className="h-8 w-full" />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : advertisers.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-panel border border-dashed border-panel-border bg-panel-card px-6 py-14 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-status-scheduled text-status-scheduled-fg">
              <Building2 size={22} aria-hidden />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Nenhum anunciante cadastrado</p>
              <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                Cadastre parceiros para vincular às campanhas.
              </p>
            </div>
            <button type="button" className={btnPrimary} onClick={() => { setEditing(null); setOpen(true); }}>
              <Plus size={14} aria-hidden /> Novo anunciante
            </button>
          </div>
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {advertisers.map((a) => {
              const active = activeCount(a.id);
              const total = campaigns.filter((c) => c.advertiser_id === a.id).length;
              return (
                <li
                  key={a.id}
                  className={`rounded-panel border border-panel-border bg-panel-card p-4 shadow-sm transition-shadow hover:shadow-md ${a.archived ? "opacity-70" : ""}`}
                >
                  <div className="flex gap-3">
                    <div
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold ${toneFor(a.name)}`}
                      aria-hidden
                    >
                      {initialOf(a.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-bold text-foreground">{a.name}</p>
                        {a.archived && (
                          <span className="rounded-full border border-status-archived-fg/25 bg-status-archived px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-status-archived-fg">
                            Arquivado
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-[11px] font-semibold text-status-active-fg">
                        {active} {active === 1 ? "campanha ativa" : "campanhas ativas"}
                        <span className="font-normal text-muted-foreground"> · {total} no total</span>
                      </p>
                      <ul className="mt-2 space-y-1 text-[11px] text-muted-foreground">
                        <li className="flex items-center gap-1.5 min-w-0">
                          <User size={12} className="shrink-0 opacity-70" aria-hidden />
                          <span className="truncate">{a.contact_name || "Sem pessoa de contato"}</span>
                        </li>
                        <li className="flex items-center gap-1.5 min-w-0">
                          <Mail size={12} className="shrink-0 opacity-70" aria-hidden />
                          <span className="truncate">{a.contact_email || "Sem e-mail"}</span>
                        </li>
                        <li className="flex items-center gap-1.5 min-w-0">
                          <Phone size={12} className="shrink-0 opacity-70" aria-hidden />
                          <span className="truncate">{a.contact_phone || "Sem telefone"}</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-1.5">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          className={btnGhost}
                          onClick={() => { setEditing(a); setOpen(true); }}
                        >
                          <Pencil size={12} aria-hidden /> Editar
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>Editar anunciante</TooltipContent>
                    </Tooltip>
                    {a.archived ? (
                      <button type="button" className={btnGhost} onClick={() => void toggleArchive(a)}>
                        <RotateCcw size={12} aria-hidden /> Restaurar
                      </button>
                    ) : (
                      <button type="button" className={btnDanger} onClick={() => setConfirmArchive(a)}>
                        <Archive size={12} aria-hidden /> Arquivar
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <Dialog open={open} onOpenChange={(o) => { if (!o && !saving) setOpen(false); }}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold tracking-normal normal-case">
                {editing ? "Editar anunciante" : "Novo anunciante"}
              </DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-1">
              <Field label="Nome *" htmlFor="partner-name" error={errors.name}>
                <input id="partner-name" className={inputClass} value={form.name} maxLength={120} onChange={(e) => set("name", e.target.value)} />
              </Field>
              <Field label="Pessoa de contato" htmlFor="partner-cname" error={errors.contactName}>
                <input id="partner-cname" className={inputClass} value={form.contactName} maxLength={120} onChange={(e) => set("contactName", e.target.value)} />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="E-mail" htmlFor="partner-email" error={errors.contactEmail}>
                  <input id="partner-email" type="email" className={inputClass} value={form.contactEmail} maxLength={254} onChange={(e) => set("contactEmail", e.target.value)} />
                </Field>
                <Field label="Telefone" htmlFor="partner-phone" error={errors.contactPhone}>
                  <input id="partner-phone" className={inputClass} value={form.contactPhone} maxLength={40} onChange={(e) => set("contactPhone", e.target.value)} />
                </Field>
              </div>
              <Field label="Observações internas" htmlFor="partner-notes" error={errors.notes}>
                <textarea id="partner-notes" rows={4} className={`${inputClass} min-h-[6rem] resize-y`} value={form.notes} maxLength={2000} onChange={(e) => set("notes", e.target.value)} />
              </Field>
            </div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" className={btnGhost} onClick={() => setOpen(false)} disabled={saving}>Cancelar</button>
              <button type="button" className={btnPrimary} onClick={() => void save()} disabled={saving}>
                {saving && <Loader2 size={14} className="animate-spin" aria-hidden />} Salvar
              </button>
            </div>
          </DialogContent>
        </Dialog>

        <AlertDialog open={!!confirmArchive} onOpenChange={(o) => { if (!o) setConfirmArchive(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Arquivar anunciante?</AlertDialogTitle>
              <AlertDialogDescription>
                {confirmArchive
                  ? `“${confirmArchive.name}” será arquivado e as campanhas dele saem do ar. Você pode restaurar depois.`
                  : null}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                className="bg-feedback-danger-fg text-primary-foreground hover:bg-feedback-danger-fg/90"
                onClick={() => {
                  const a = confirmArchive;
                  setConfirmArchive(null);
                  if (a) void toggleArchive(a);
                }}
              >
                Arquivar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  );
}
