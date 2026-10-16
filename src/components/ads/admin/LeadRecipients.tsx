import { useCallback, useEffect, useMemo, useState } from "react";
import { Bell, Loader2, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { adsDb } from "@/integrations/supabase/adsTypes";
import { dbErrorMessage } from "./useAdsAdmin";
import { inputClass } from "./ui";

type Profile = { id: string; email: string };

const MAX_SUGGESTIONS = 8;

export function LeadRecipients({ onChange }: { onChange?: () => void }) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [recipientIds, setRecipientIds] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [p, r] = await Promise.all([
      supabase.from("profiles").select("id, email").order("email"),
      adsDb.from("ad_lead_recipients").select("user_id").order("created_at"),
    ]);
    if (p.error || r.error) toast.error("Não foi possível carregar os destinatários.");
    setProfiles(p.data ?? []);
    setRecipientIds((r.data ?? []).map((x) => x.user_id));
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const byId = useMemo(() => new Map(profiles.map((p) => [p.id, p])), [profiles]);
  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const chosen = new Set(recipientIds);
    return profiles.filter((p) => !chosen.has(p.id) && p.email.toLowerCase().includes(q)).slice(0, MAX_SUGGESTIONS);
  }, [query, profiles, recipientIds]);

  const add = async (p: Profile) => {
    setBusy(p.id);
    const { error } = await adsDb.from("ad_lead_recipients").insert({ user_id: p.id });
    setBusy(null);
    if (error) return toast.error(dbErrorMessage(error));
    setRecipientIds((ids) => [...ids, p.id]);
    setQuery("");
    toast.success("Destinatário adicionado.");
    onChange?.();
  };

  const remove = async (id: string) => {
    setBusy(id);
    const { error } = await adsDb.from("ad_lead_recipients").delete().eq("user_id", id);
    setBusy(null);
    if (error) return toast.error(dbErrorMessage(error));
    setRecipientIds((ids) => ids.filter((x) => x !== id));
    toast.success("Destinatário removido.");
    onChange?.();
  };

  return (
    <section className="space-y-4 rounded-panel border border-panel-border bg-panel-card p-4 shadow-sm">
      <header className="flex gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-panel bg-status-paused text-status-paused-fg">
          <Bell size={18} aria-hidden />
        </span>
        <div>
          <h3 className="text-sm font-semibold text-foreground">Quem recebe os avisos</h3>
          <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
            Só os usuários escolhidos aqui recebem o aviso por e-mail. Cada um recebe um e-mail separado e não vê os outros.
          </p>
        </div>
      </header>

      {loading ? (
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-8 w-40 rounded-full" />
          <Skeleton className="h-8 w-48 rounded-full" />
        </div>
      ) : recipientIds.length === 0 ? (
        <p className="rounded-panel border border-dashed border-panel-border bg-panel-raised px-3 py-4 text-center text-xs text-muted-foreground">
          Nenhum destinatário escolhido ainda.
        </p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {recipientIds.map((id) => (
            <li
              key={id}
              className="flex items-center gap-1 rounded-full border border-panel-border bg-panel-raised px-3 py-1.5 text-xs text-foreground"
            >
              {byId.get(id)?.email ?? "Usuário sem e-mail visível"}
              <button
                type="button"
                className="rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                onClick={() => void remove(id)}
                disabled={busy === id}
                aria-label={`Remover ${byId.get(id)?.email ?? "destinatário"}`}
              >
                {busy === id ? <Loader2 size={12} className="animate-spin" /> : <X size={12} />}
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="relative max-w-md">
        <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-foreground" htmlFor="recipient-search">
          Adicionar destinatário
        </label>
        <input
          id="recipient-search"
          type="search"
          aria-label="Buscar usuário cadastrado por e-mail"
          placeholder="Buscar usuário cadastrado por e-mail…"
          className={inputClass}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {query.trim() && (
          <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-panel border border-panel-border bg-popover shadow-lg">
            {suggestions.length === 0 ? (
              <li className="px-3 py-2 text-xs text-muted-foreground">Nenhum usuário encontrado.</li>
            ) : (
              suggestions.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
                    onClick={() => void add(p)}
                    disabled={busy === p.id}
                  >
                    <span className="truncate">{p.email}</span>
                    {busy === p.id ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                  </button>
                </li>
              ))
            )}
          </ul>
        )}
      </div>
    </section>
  );
}
