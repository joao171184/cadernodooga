import { useEffect, useState } from "react";
import { Archive, Loader2, Pencil, Plus, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { adsDb, type AdAdvertiserRow } from "@/integrations/supabase/adsTypes";
import { validateAdvertiser, type AdvertiserInput } from "@/lib/ads/validation";
import { dbErrorMessage, type AdsAdminData } from "./useAdsAdmin";
import { Field, btnGhost, btnPrimary, inputClass } from "./ui";

const EMPTY: AdvertiserInput = { name: "", contactName: "", contactEmail: "", contactPhone: "", notes: "" };

export function AdvertisersTab({ advertisers, campaigns, reload }: AdsAdminData & { reload: () => Promise<void> }) {
  const [editing, setEditing] = useState<AdAdvertiserRow | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<AdvertiserInput>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof AdvertiserInput, string>>>({});
  const [saving, setSaving] = useState(false);

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

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button className={btnPrimary} onClick={() => { setEditing(null); setOpen(true); }}><Plus size={14} /> Novo anunciante</button>
      </div>
      {advertisers.length === 0 ? (
        <p className="rounded-xl border border-border p-8 text-center text-sm text-muted-foreground">Nenhum anunciante cadastrado.</p>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {advertisers.map((a) => {
            const count = campaigns.filter((c) => c.advertiser_id === a.id).length;
            return (
              <li key={a.id} className={`rounded-xl border border-border bg-card p-3 ${a.archived ? "opacity-60" : ""}`}>
                <p className="text-sm font-bold text-foreground">{a.name}{a.archived && " (arquivado)"}</p>
                <p className="text-[11px] text-muted-foreground">
                  {[a.contact_name, a.contact_email, a.contact_phone].filter(Boolean).join(" · ") || "Sem contato cadastrado"}
                </p>
                <p className="text-[11px] text-muted-foreground">{count} {count === 1 ? "campanha" : "campanhas"}</p>
                <div className="mt-2 flex gap-1.5">
                  <button className={btnGhost} onClick={() => { setEditing(a); setOpen(true); }}><Pencil size={12} /> Editar</button>
                  <button className={btnGhost} onClick={() => toggleArchive(a)}>
                    {a.archived ? <><RotateCcw size={12} /> Restaurar</> : <><Archive size={12} /> Arquivar</>}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Dialog open={open} onOpenChange={(o) => { if (!o && !saving) setOpen(false); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display uppercase">{editing ? "Editar anunciante" : "Novo anunciante"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <Field label="Nome *" htmlFor="a-name" error={errors.name}>
              <input id="a-name" className={inputClass} value={form.name} maxLength={120} onChange={(e) => set("name", e.target.value)} />
            </Field>
            <Field label="Pessoa de contato" htmlFor="a-cname" error={errors.contactName}>
              <input id="a-cname" className={inputClass} value={form.contactName} maxLength={120} onChange={(e) => set("contactName", e.target.value)} />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="E-mail" htmlFor="a-email" error={errors.contactEmail}>
                <input id="a-email" type="email" className={inputClass} value={form.contactEmail} maxLength={254} onChange={(e) => set("contactEmail", e.target.value)} />
              </Field>
              <Field label="Telefone" htmlFor="a-phone" error={errors.contactPhone}>
                <input id="a-phone" className={inputClass} value={form.contactPhone} maxLength={40} onChange={(e) => set("contactPhone", e.target.value)} />
              </Field>
            </div>
            <Field label="Observações internas" htmlFor="a-notes" error={errors.notes}>
              <textarea id="a-notes" rows={3} className={inputClass} value={form.notes} maxLength={2000} onChange={(e) => set("notes", e.target.value)} />
            </Field>
          </div>
          <div className="flex justify-end gap-2">
            <button className={btnGhost} onClick={() => setOpen(false)} disabled={saving}>Cancelar</button>
            <button className={btnPrimary} onClick={save} disabled={saving}>{saving && <Loader2 size={14} className="animate-spin" />} Salvar</button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
