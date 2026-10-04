import { useEffect, useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { adsDb, type AdPlacementRow } from "@/integrations/supabase/adsTypes";
import { resetAdConfigCache } from "@/lib/ads/client";
import { dbErrorMessage, type AdsAdminData } from "./useAdsAdmin";
import { Field, btnPrimary, inputClass } from "./ui";

const CLIENT_RE = /^ca-pub-[0-9]{10,20}$/;
const SLOT_RE = /^[0-9]{6,20}$/;

export function SettingsTab({ settings, placements, reload }: AdsAdminData & { reload: () => Promise<void> }) {
  const [adsenseEnabled, setAdsenseEnabled] = useState(false);
  const [client, setClient] = useState("");
  const [interval, setIntervalValue] = useState(12);
  const [rows, setRows] = useState<AdPlacementRow[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setAdsenseEnabled(settings?.adsense_enabled ?? false);
    setClient(settings?.adsense_client ?? "");
    setIntervalValue(settings?.in_feed_interval ?? 12);
    setRows(placements.map((p) => ({ ...p })));
  }, [settings, placements]);

  const patchRow = (key: string, patch: Partial<AdPlacementRow>) =>
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  const clientError = client && !CLIENT_RE.test(client.trim()) ? "Formato esperado: ca-pub- seguido de números." : undefined;
  const slotError = (r: AdPlacementRow) =>
    r.adsense_slot && !SLOT_RE.test(r.adsense_slot) ? "Só números (ID do bloco de anúncios)." : undefined;

  const save = async () => {
    if (clientError || rows.some(slotError)) return toast.error("Confira os campos destacados.");
    if (adsenseEnabled && !client.trim()) return toast.error("Informe o ID de editor para ligar o AdSense.");
    if (!Number.isInteger(interval) || interval < 4 || interval > 50) return toast.error("Intervalo entre 4 e 50 cards.");
    setSaving(true);
    const results = await Promise.all([
      adsDb.from("ad_settings").update({
        adsense_enabled: adsenseEnabled,
        adsense_client: client.trim() || null,
        in_feed_interval: interval,
      }).eq("id", true),
      ...rows.map((r) =>
        adsDb.from("ad_placements").update({
          enabled: r.enabled,
          adsense_enabled: r.adsense_enabled,
          adsense_slot: r.adsense_slot?.trim() || null,
        }).eq("key", r.key),
      ),
    ]);
    setSaving(false);
    const failed = results.find((r) => r.error);
    if (failed) return toast.error(dbErrorMessage(failed.error));
    resetAdConfigCache();
    toast.success("Configurações salvas.");
    await reload();
  };

  return (
    <div className="space-y-6">
      <section className="space-y-3 rounded-xl border border-border bg-card p-4">
        <h3 className="text-[11px] font-bold uppercase text-muted-foreground">Espaços publicitários</h3>
        <Field label="Intervalo dos cards patrocinados" htmlFor="s-interval" hint="Um anúncio a cada N pontos na lista (máximo de 6 por página).">
          <input id="s-interval" type="number" min={4} max={50} className={`${inputClass} w-28`} value={interval}
            onChange={(e) => setIntervalValue(Number(e.target.value))} />
        </Field>
        <ul className="divide-y divide-border">
          {rows.map((r) => (
            <li key={r.key} className="grid gap-3 py-3 md:grid-cols-[1fr_auto_auto] md:items-center">
              <div>
                <p className="text-sm font-bold text-foreground">{r.name} <code className="text-[11px] font-normal text-muted-foreground">{r.key}</code></p>
                <p className="text-[11px] text-muted-foreground">{r.description} Imagem: {r.desktop_width}×{r.desktop_height} (celular {r.mobile_width}×{r.mobile_height}).</p>
              </div>
              <label className="flex items-center gap-2 text-xs font-semibold">
                <Switch checked={r.enabled} onCheckedChange={(v) => patchRow(r.key, { enabled: v })} aria-label={`Espaço ${r.name} ligado`} />
                Espaço ligado
              </label>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 text-xs font-semibold">
                  <Switch checked={r.adsense_enabled} onCheckedChange={(v) => patchRow(r.key, { adsense_enabled: v })} aria-label={`AdSense em ${r.name}`} />
                  AdSense
                </label>
                <input aria-label={`ID do bloco AdSense de ${r.name}`} placeholder="ID do bloco" className={`${inputClass} w-36`}
                  value={r.adsense_slot ?? ""} onChange={(e) => patchRow(r.key, { adsense_slot: e.target.value })} />
              </div>
              {slotError(r) && <p className="text-[11px] text-destructive md:col-span-3">{slotError(r)}</p>}
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3 rounded-xl border border-border bg-card p-4">
        <h3 className="text-[11px] font-bold uppercase text-muted-foreground">Google AdSense</h3>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Usado só quando não há anúncio direto elegível no espaço, e só depois que o visitante aceita os cookies de
          publicidade. O ID de editor e os IDs de bloco são públicos (aparecem no código de qualquer site com AdSense);
          não são senhas.
        </p>
        <label className="flex items-center gap-2 text-xs font-semibold">
          <Switch checked={adsenseEnabled} onCheckedChange={setAdsenseEnabled} aria-label="Ligar AdSense" />
          AdSense ligado
        </label>
        <Field label="ID de editor (ca-pub-…)" htmlFor="s-client" error={clientError}>
          <input id="s-client" className={`${inputClass} max-w-sm`} value={client} placeholder="ca-pub-0000000000000000"
            onChange={(e) => setClient(e.target.value)} />
        </Field>
        <div className="flex gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-[11px] text-amber-800 dark:text-amber-200">
          <AlertTriangle size={14} className="shrink-0" />
          <p>
            Antes de ligar: a conta precisa estar aprovada pelo Google, o arquivo <code>public/ads.txt</code> precisa
            estar publicado e a política de segurança (CSP) do <code>vercel.json</code> precisa liberar os domínios do
            Google. Sem isso o AdSense não carrega. Veja o passo a passo em <code>docs/PUBLICIDADE.md</code>.
          </p>
        </div>
      </section>

      <div className="flex justify-end">
        <button className={btnPrimary} onClick={save} disabled={saving}>{saving && <Loader2 size={14} className="animate-spin" />} Salvar configurações</button>
      </div>
    </div>
  );
}
