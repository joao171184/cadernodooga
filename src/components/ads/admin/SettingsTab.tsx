import { useEffect, useState } from "react";
import { AlertTriangle, Loader2, MapPin, Sparkles } from "lucide-react";
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
    r.adsense_slot && !SLOT_RE.test(r.adsense_slot) ? "Só números (ID do bloco)." : undefined;

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
    <div className="relative space-y-panel pb-20">
      <section className="space-y-4 rounded-panel border border-panel-border bg-panel-card p-4 shadow-sm">
        <header className="flex gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-panel bg-status-scheduled text-status-scheduled-fg">
            <MapPin size={18} aria-hidden />
          </span>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Espaços do site</h3>
            <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
              Ligue ou desligue cada posição e defina com que frequência os cards aparecem na lista de pontos.
            </p>
          </div>
        </header>

        <Field
          label="Intervalo dos cards na lista"
          htmlFor="cfg-interval"
          hint="Um destaque a cada N pontos na lista (máximo de 6 por página)."
        >
          <input
            id="cfg-interval"
            type="number"
            min={4}
            max={50}
            className={`${inputClass} w-28`}
            value={interval}
            onChange={(e) => setIntervalValue(Number(e.target.value))}
          />
        </Field>

        <ul className="divide-y divide-panel-border rounded-panel border border-panel-border bg-panel-raised/40">
          {rows.map((r) => (
            <li key={r.key} className="grid gap-3 p-3 md:grid-cols-[1fr_auto] md:items-start">
              <div>
                <p className="text-sm font-bold text-foreground">{r.name}</p>
                <p className="text-[11px] text-muted-foreground">
                  {r.description} Imagem: {r.desktop_width}×{r.desktop_height} (celular {r.mobile_width}×{r.mobile_height}).
                </p>
                <code className="mt-1 inline-block text-[10px] text-muted-foreground">{r.key}</code>
              </div>
              <div className="flex flex-col gap-2 sm:items-end">
                <label className="flex items-center gap-2 text-xs font-semibold">
                  <Switch checked={r.enabled} onCheckedChange={(v) => patchRow(r.key, { enabled: v })} aria-label={`Espaço ${r.name} ligado`} />
                  Espaço ligado
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  <label className="flex items-center gap-2 text-xs font-semibold">
                    <Switch checked={r.adsense_enabled} onCheckedChange={(v) => patchRow(r.key, { adsense_enabled: v })} aria-label={`AdSense em ${r.name}`} />
                    AdSense
                  </label>
                  <input
                    aria-label={`ID do bloco AdSense de ${r.name}`}
                    placeholder="ID do bloco"
                    className={`${inputClass} w-36`}
                    value={r.adsense_slot ?? ""}
                    onChange={(e) => patchRow(r.key, { adsense_slot: e.target.value })}
                  />
                </div>
                {slotError(r) && <p className="text-[11px] text-feedback-danger-fg">{slotError(r)}</p>}
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-4 rounded-panel border border-panel-border bg-panel-card p-4 shadow-sm">
        <header className="flex gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-panel bg-status-draft text-status-draft-fg">
            <Sparkles size={18} aria-hidden />
          </span>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Google AdSense</h3>
            <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
              Usado só quando não há destaque direto elegível no espaço, e só depois que o visitante aceita cookies.
              O ID de editor e os IDs de bloco são públicos; não são senhas.
            </p>
          </div>
        </header>

        <label className="flex items-center gap-2 text-xs font-semibold">
          <Switch checked={adsenseEnabled} onCheckedChange={setAdsenseEnabled} aria-label="Ligar AdSense" />
          AdSense ligado
        </label>
        <Field label="ID de editor (ca-pub-…)" htmlFor="cfg-client" error={clientError}>
          <input
            id="cfg-client"
            className={`${inputClass} max-w-sm`}
            value={client}
            placeholder="ca-pub-0000000000000000"
            onChange={(e) => setClient(e.target.value)}
          />
        </Field>
        <div className="flex gap-2 rounded-panel border border-feedback-warning-fg/30 bg-feedback-warning p-3 text-[11px] text-feedback-warning-fg">
          <AlertTriangle size={14} className="shrink-0 mt-0.5" aria-hidden />
          <p>
            Antes de ligar: conta aprovada no Google, arquivo <code>public/ads.txt</code> publicado e CSP do{" "}
            <code>vercel.json</code> liberando os domínios do Google. Veja o passo a passo em{" "}
            <code>docs/PUBLICIDADE.md</code>.
          </p>
        </div>
      </section>

      <div className="sticky bottom-4 z-10 flex justify-end rounded-panel border border-panel-border bg-panel-raised/95 p-3 shadow-lg backdrop-blur-md">
        <button type="button" className={btnPrimary} onClick={() => void save()} disabled={saving}>
          {saving && <Loader2 size={14} className="animate-spin" aria-hidden />} Salvar configurações
        </button>
      </div>
    </div>
  );
}
