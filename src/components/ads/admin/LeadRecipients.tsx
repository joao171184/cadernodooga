import { useCallback, useEffect, useMemo, useState } from "react";
import { Bell, Loader2, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { adsDb } from "@/integrations/supabase/adsTypes";
import { dbErrorMessage } from "./useAdsAdmin";
import { inputClass } from "./ui";

type Profile = { id: string; email: string };

const MAX_SUGGESTIONS = 8;

export function LeadRecipients() {
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
  };

  const remove = async (id: string) => {
    setBusy(id);
    const { error } = await adsDb.from("ad_lead_recipients").delete().eq("user_id", id);
    setBusy(null);
    if (error) return toast.error(dbErrorMessage(error));
    setRecipientIds((ids) => ids.filter((x) => x !== id));
  };

  return (
    <section className="space-y-3 rounded-xl border border-border bg-card p-4">
      <div>
        <h3 className="flex items-center gap-1.5 text-[11px] font-bold uppercase text-muted-foreground">
          <Bell size={13} /> Quem recebe os avisos de novos pedidos
          {loading && <Loader2 size={12} className="animate-spin" />}
        </h3>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Só os usuários escolhidos aqui serão avisados; os demais administradores, não. O envio de e-mail ainda não
          está ligado: por enquanto, acompanhe os pedidos nesta aba.
        </p>
      </div>

      {recipientIds.length === 0 ? (
        <p className="text-xs text-muted-foreground">Nenhum destinatário escolhido.</p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {recipientIds.map((id) => (
            <li key={id} className="flex items-center gap-1 rounded-full border border-border bg-muted px-3 py-1 text-xs">
              {byId.get(id)?.email ?? "Usuário sem e-mail visível"}
              <button
                className="rounded-full p-0.5 hover:bg-background disabled:opacity-50"
                onClick={() => remove(id)}
                disabled={busy === id}
                aria-label={`Remover ${byId.get(id)?.email ?? "destinatário"}`}
              >
                <X size={12} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="relative max-w-md">
        <input
          type="search"
          aria-label="Buscar usuário cadastrado por e-mail"
          placeholder="Buscar usuário cadastrado por e-mail…"
          className={inputClass}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {query.trim() && (
          <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-border bg-popover shadow-lg">
            {suggestions.length === 0 ? (
              <li className="px-3 py-2 text-xs text-muted-foreground">Nenhum usuário encontrado.</li>
            ) : (
              suggestions.map((p) => (
                <li key={p.id}>
                  <button
                    className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs text-foreground hover:bg-muted disabled:opacity-60"
                    onClick={() => add(p)}
                    disabled={busy === p.id}
                  >
                    <span className="truncate">{p.email}</span>
                    <Plus size={12} />
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
