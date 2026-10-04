import { useEffect, useMemo, useState } from "react";
import { Loader2, Monitor, Smartphone, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  adsDb,
  type AdAdvertiserRow,
  type AdCampaignRow,
  type AdPlacementRow,
  type CampaignStatusStored,
  type RevenueType,
} from "@/integrations/supabase/adsTypes";
import { AdCreative, REVENUE_LABEL } from "@/components/ads/AdCreative";
import { AD_BUCKET, adImageUrl } from "@/lib/ads/client";
import { localInputToUtcIso, utcIsoToLocalInput } from "@/lib/ads/time";
import {
  AD_IMAGE_TYPES,
  imageRatioWarning,
  validateCampaign,
  validateImageFile,
  type CampaignErrors,
} from "@/lib/ads/validation";
import { dbErrorMessage } from "./useAdsAdmin";
import { Field, btnGhost, btnPrimary, inputClass } from "./ui";

interface Props {
  open: boolean;
  campaign: AdCampaignRow | null;
  advertisers: AdAdvertiserRow[];
  placements: AdPlacementRow[];
  onClose: () => void;
  onSaved: () => void;
}

interface PickedImage {
  file: File;
  url: string;
  warning: string | null;
}

const DAY = 86_400_000;

function defaultRange() {
  const start = new Date(Math.ceil(Date.now() / 3_600_000) * 3_600_000);
  return { start: utcIsoToLocalInput(start.toISOString()), end: utcIsoToLocalInput(new Date(start.getTime() + 30 * DAY).toISOString()) };
}

function parseBudget(value: string): number | null | "invalid" {
  const v = value.trim();
  if (!v) return null;
  const n = Number(v.replace(/\./g, "").replace(",", "."));
  if (!Number.isFinite(n) || n < 0) return "invalid";
  return Math.round(n * 100);
}

function readDimensions(url: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => resolve({ width: 0, height: 0 });
    img.src = url;
  });
}

async function uploadImage(file: File): Promise<string> {
  const ext = AD_IMAGE_TYPES[file.type];
  const path = `campaigns/${crypto.randomUUID()}.${ext}`;
  const { error } = await adsDb.storage.from(AD_BUCKET).upload(path, file, {
    contentType: file.type,
    cacheControl: "31536000",
    upsert: false,
  });
  if (error) throw error;
  return path;
}

export function CampaignFormDialog({ open, campaign, advertisers, placements, onClose, onSaved }: Props) {
  const [advertiserId, setAdvertiserId] = useState("");
  const [name, setName] = useState("");
  const [placementKey, setPlacementKey] = useState("");
  const [revenueType, setRevenueType] = useState<RevenueType>("direct");
  const [altText, setAltText] = useState("");
  const [targetUrl, setTargetUrl] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [weight, setWeight] = useState(1);
  const [maxImpressions, setMaxImpressions] = useState("");
  const [budget, setBudget] = useState("");
  const [status, setStatus] = useState<CampaignStatusStored>("draft");
  const [desktopImg, setDesktopImg] = useState<PickedImage | null>(null);
  const [mobileImg, setMobileImg] = useState<PickedImage | null>(null);
  const [removeMobile, setRemoveMobile] = useState(false);
  const [errors, setErrors] = useState<CampaignErrors & { image?: string; mobileImage?: string }>({});
  const [saving, setSaving] = useState(false);
  const [previewMobile, setPreviewMobile] = useState(false);

  useEffect(() => {
    if (!open) return;
    const range = defaultRange();
    setAdvertiserId(campaign?.advertiser_id ?? advertisers.find((a) => !a.archived)?.id ?? "");
    setName(campaign?.name ?? "");
    setPlacementKey(campaign?.placement_key ?? placements[0]?.key ?? "");
    setRevenueType(campaign?.revenue_type ?? "direct");
    setAltText(campaign?.alt_text ?? "");
    setTargetUrl(campaign?.target_url ?? "");
    setStart(campaign ? utcIsoToLocalInput(campaign.starts_at) : range.start);
    setEnd(campaign ? utcIsoToLocalInput(campaign.ends_at) : range.end);
    setWeight(campaign?.weight ?? 1);
    setMaxImpressions(campaign?.max_impressions ? String(campaign.max_impressions) : "");
    setBudget(campaign?.budget_cents != null ? (campaign.budget_cents / 100).toFixed(2).replace(".", ",") : "");
    setStatus(campaign?.status === "archived" ? "paused" : campaign?.status ?? "draft");
    setDesktopImg(null);
    setMobileImg(null);
    setRemoveMobile(false);
    setErrors({});
    setPreviewMobile(false);
  }, [open, campaign, advertisers, placements]);

  useEffect(() => () => {
    if (desktopImg) URL.revokeObjectURL(desktopImg.url);
  }, [desktopImg]);
  useEffect(() => () => {
    if (mobileImg) URL.revokeObjectURL(mobileImg.url);
  }, [mobileImg]);

  const placement = placements.find((p) => p.key === placementKey);

  const pick = async (file: File | undefined, kind: "desktop" | "mobile") => {
    if (!file) return;
    const problem = validateImageFile(file);
    const key = kind === "desktop" ? "image" : "mobileImage";
    if (problem) {
      setErrors((e) => ({ ...e, [key]: problem }));
      return;
    }
    const url = URL.createObjectURL(file);
    const dims = await readDimensions(url);
    if (!dims.width) {
      URL.revokeObjectURL(url);
      setErrors((e) => ({ ...e, [key]: "Não foi possível ler a imagem." }));
      return;
    }
    const expected = placement
      ? kind === "desktop"
        ? { width: placement.desktop_width, height: placement.desktop_height }
        : { width: placement.mobile_width, height: placement.mobile_height }
      : null;
    const picked = { file, url, warning: expected ? imageRatioWarning(dims, expected) : null };
    setErrors((e) => ({ ...e, [key]: undefined, hasImage: undefined }));
    if (kind === "desktop") setDesktopImg(picked);
    else {
      setMobileImg(picked);
      setRemoveMobile(false);
    }
  };

  const desktopUrl = desktopImg?.url ?? (campaign ? adImageUrl(campaign.image_path) : null);
  const mobileUrl = removeMobile ? null : mobileImg?.url ?? (campaign?.image_mobile_path ? adImageUrl(campaign.image_mobile_path) : null);
  const advertiserName = advertisers.find((a) => a.id === advertiserId)?.name ?? "Anunciante";
  const activeAdvertisers = useMemo(
    () => advertisers.filter((a) => !a.archived || a.id === campaign?.advertiser_id),
    [advertisers, campaign],
  );

  const save = async () => {
    const startsAt = localInputToUtcIso(start);
    const endsAt = localInputToUtcIso(end);
    const budgetCents = parseBudget(budget);
    const maxImp = maxImpressions.trim() ? Number(maxImpressions) : null;
    const errs = validateCampaign({
      advertiserId, name, placementKey, altText, targetUrl, startsAt, endsAt, weight,
      maxImpressions: maxImp,
      budgetCents: budgetCents === "invalid" ? -1 : budgetCents,
      hasImage: !!desktopUrl,
    });
    if (Object.keys(errs).length) {
      setErrors((e) => ({ ...e, ...errs }));
      toast.error("Confira os campos destacados.");
      return;
    }

    setSaving(true);
    const uploaded: string[] = [];
    try {
      const imagePath = desktopImg ? await uploadImage(desktopImg.file) : campaign!.image_path;
      if (desktopImg) uploaded.push(imagePath);
      let mobilePath = removeMobile ? null : campaign?.image_mobile_path ?? null;
      if (mobileImg) {
        mobilePath = await uploadImage(mobileImg.file);
        uploaded.push(mobilePath);
      }

      const row = {
        advertiser_id: advertiserId,
        name: name.trim(),
        placement_key: placementKey,
        status,
        revenue_type: revenueType,
        image_path: imagePath,
        image_mobile_path: mobilePath,
        alt_text: altText.trim(),
        target_url: targetUrl.trim(),
        starts_at: startsAt!,
        ends_at: endsAt!,
        weight,
        max_impressions: maxImp,
        budget_cents: budgetCents === "invalid" ? null : budgetCents,
      };
      const { error } = campaign
        ? await adsDb.from("ad_campaigns").update(row).eq("id", campaign.id)
        : await adsDb.from("ad_campaigns").insert(row);
      if (error) throw error;

      if (campaign) {
        const stale = [
          desktopImg ? campaign.image_path : null,
          (mobileImg || removeMobile) ? campaign.image_mobile_path : null,
        ].filter((p): p is string => !!p);
        if (stale.length) void adsDb.storage.from(AD_BUCKET).remove(stale);
      }
      toast.success(campaign ? "Campanha atualizada." : "Campanha criada.");
      onSaved();
      onClose();
    } catch (err) {
      if (uploaded.length) void adsDb.storage.from(AD_BUCKET).remove(uploaded);
      const e = err as { code?: string; message?: string; statusCode?: string };
      toast.error(e?.statusCode === "413" ? "Imagem grande demais (máximo 1 MB)." : dbErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && !saving) onClose(); }}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display uppercase">{campaign ? "Editar campanha" : "Nova campanha"}</DialogTitle>
          <DialogDescription>Datas e horários no fuso de Brasília. O anúncio sai do ar sozinho no término.</DialogDescription>
        </DialogHeader>

        {advertisers.length === 0 ? (
          <p className="rounded-lg border border-border bg-muted/50 p-4 text-sm">
            Cadastre um anunciante na aba <strong>Anunciantes</strong> antes de criar campanhas.
          </p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Anunciante" htmlFor="c-adv" error={errors.advertiserId}>
              <select id="c-adv" className={inputClass} value={advertiserId} onChange={(e) => setAdvertiserId(e.target.value)}>
                <option value="">Escolha…</option>
                {activeAdvertisers.map((a) => <option key={a.id} value={a.id}>{a.name}{a.archived ? " (arquivado)" : ""}</option>)}
              </select>
            </Field>
            <Field label="Nome da campanha" htmlFor="c-name" error={errors.name}>
              <input id="c-name" className={inputClass} value={name} maxLength={120} onChange={(e) => setName(e.target.value)} />
            </Field>
            <Field label="Espaço" htmlFor="c-place" error={errors.placementKey}
              hint={placement ? `Imagem recomendada: ${placement.desktop_width}×${placement.desktop_height} (celular ${placement.mobile_width}×${placement.mobile_height})` : undefined}>
              <select id="c-place" className={inputClass} value={placementKey} onChange={(e) => setPlacementKey(e.target.value)}>
                {placements.map((p) => <option key={p.key} value={p.key}>{p.name} ({p.key}){p.enabled ? "" : " — desligado"}</option>)}
              </select>
            </Field>
            <Field label="Tipo" htmlFor="c-type" hint="Define o selo exibido no anúncio.">
              <select id="c-type" className={inputClass} value={revenueType} onChange={(e) => setRevenueType(e.target.value as RevenueType)}>
                {(Object.keys(REVENUE_LABEL) as RevenueType[]).map((t) => <option key={t} value={t}>{REVENUE_LABEL[t]}</option>)}
              </select>
            </Field>

            <Field label="Imagem (computador) *" htmlFor="c-img" error={errors.image || errors.hasImage} hint={desktopImg?.warning ?? "PNG, JPG, WEBP ou GIF até 1 MB."}>
              <label className={`${btnGhost} w-full cursor-pointer`}>
                <Upload size={14} /> {desktopUrl ? "Trocar imagem" : "Enviar imagem"}
                <input id="c-img" type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="sr-only"
                  onChange={(e) => { void pick(e.target.files?.[0], "desktop"); e.target.value = ""; }} />
              </label>
            </Field>
            <Field label="Imagem para celular (opcional)" htmlFor="c-img-m" error={errors.mobileImage} hint={mobileImg?.warning ?? "Sem ela, o celular usa a imagem do computador."}>
              <div className="flex gap-2">
                <label className={`${btnGhost} flex-1 cursor-pointer`}>
                  <Upload size={14} /> {mobileUrl ? "Trocar" : "Enviar"}
                  <input id="c-img-m" type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="sr-only"
                    onChange={(e) => { void pick(e.target.files?.[0], "mobile"); e.target.value = ""; }} />
                </label>
                {mobileUrl && (
                  <button type="button" className={btnGhost} aria-label="Remover imagem de celular"
                    onClick={() => { setMobileImg(null); setRemoveMobile(true); }}>
                    <X size={14} />
                  </button>
                )}
              </div>
            </Field>

            <Field label="Texto alternativo da imagem" htmlFor="c-alt" error={errors.altText} hint="Lido por leitores de tela. Ex.: “Loja Axé: velas e guias com 10% de desconto”.">
              <input id="c-alt" className={inputClass} value={altText} maxLength={200} onChange={(e) => setAltText(e.target.value)} />
            </Field>
            <Field label="Link de destino" htmlFor="c-url" error={errors.targetUrl} hint="Somente https://. Abre em nova aba, marcado como patrocinado.">
              <input id="c-url" type="url" inputMode="url" className={inputClass} value={targetUrl} maxLength={2048}
                placeholder="https://" onChange={(e) => setTargetUrl(e.target.value)} />
            </Field>

            <Field label="Início" htmlFor="c-start" error={errors.startsAt}>
              <input id="c-start" type="datetime-local" className={inputClass} value={start} onChange={(e) => setStart(e.target.value)} />
            </Field>
            <Field label="Término" htmlFor="c-end" error={errors.endsAt}>
              <input id="c-end" type="datetime-local" className={inputClass} value={end} onChange={(e) => setEnd(e.target.value)} />
            </Field>

            <Field label={`Prioridade na rotação: ${weight}`} htmlFor="c-weight" error={errors.weight}
              hint="Com vários anúncios no mesmo espaço, peso 2 aparece cerca de duas vezes mais que peso 1.">
              <input id="c-weight" type="range" min={1} max={10} value={weight} onChange={(e) => setWeight(Number(e.target.value))} className="w-full accent-[hsl(var(--primary))]" />
            </Field>
            <Field label="Limite de impressões (opcional)" htmlFor="c-max" error={errors.maxImpressions} hint="Ao atingir, o anúncio sai do ar.">
              <input id="c-max" type="number" min={1} step={1} className={inputClass} value={maxImpressions} onChange={(e) => setMaxImpressions(e.target.value)} />
            </Field>
            <Field label="Valor contratado em R$ (opcional)" htmlFor="c-budget" error={errors.budgetCents} hint="Só para controle; não interfere na exibição.">
              <input id="c-budget" inputMode="decimal" className={inputClass} value={budget} placeholder="0,00" onChange={(e) => setBudget(e.target.value)} />
            </Field>
            <Field label="Status ao salvar" htmlFor="c-status">
              <select id="c-status" className={inputClass} value={status} onChange={(e) => setStatus(e.target.value as CampaignStatusStored)}>
                <option value="draft">Rascunho (não aparece)</option>
                <option value="active">Ativo (aparece dentro do período)</option>
                <option value="paused">Pausado</option>
              </select>
            </Field>

            <div className="md:col-span-2 rounded-xl border border-dashed border-border p-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[11px] font-bold uppercase text-muted-foreground">Pré-visualização</p>
                <div className="flex gap-1">
                  <button type="button" onClick={() => setPreviewMobile(false)} aria-pressed={!previewMobile}
                    className={`rounded-md p-1.5 ${!previewMobile ? "bg-muted text-foreground" : "text-muted-foreground"}`} aria-label="Computador">
                    <Monitor size={14} />
                  </button>
                  <button type="button" onClick={() => setPreviewMobile(true)} aria-pressed={previewMobile}
                    className={`rounded-md p-1.5 ${previewMobile ? "bg-muted text-foreground" : "text-muted-foreground"}`} aria-label="Celular">
                    <Smartphone size={14} />
                  </button>
                </div>
              </div>
              {desktopUrl && placement ? (
                <div className={`mx-auto ${previewMobile ? "max-w-[360px]" : placement.key === "lista-entre-cards" ? "max-w-[380px]" : "max-w-full"}`}>
                  <AdCreative
                    imageUrl={desktopUrl}
                    mobileImageUrl={mobileUrl}
                    alt={altText || "Pré-visualização"}
                    targetUrl=""
                    advertiserName={advertiserName}
                    revenueType={revenueType}
                    format={placement}
                    variant={placement.key === "lista-entre-cards" ? "card" : "banner"}
                    forceMobile={previewMobile}
                    onClick={undefined}
                  />
                </div>
              ) : (
                <p className="py-6 text-center text-xs text-muted-foreground">Envie a imagem para ver como o anúncio ficará.</p>
              )}
            </div>
          </div>
        )}

        <div className="mt-2 flex justify-end gap-2">
          <button type="button" className={btnGhost} onClick={onClose} disabled={saving}>Cancelar</button>
          <button type="button" className={btnPrimary} onClick={save} disabled={saving || advertisers.length === 0}>
            {saving && <Loader2 size={14} className="animate-spin" />} Salvar
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
