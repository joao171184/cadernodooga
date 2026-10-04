/** Fuso usado no cadastro de campanhas e nos relatórios diários. */
export const AD_TIME_ZONE = "America/Sao_Paulo";

function zoneOffsetMinutes(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return Math.round((asUtc - date.getTime()) / 60000);
}

/** "2026-10-04T14:30" no horário de Brasília → ISO UTC. Retorna null se inválido. */
export function localInputToUtcIso(value: string, timeZone = AD_TIME_ZONE): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!m) return null;
  const [y, mo, d, h, mi] = m.slice(1).map(Number);
  const guess = Date.UTC(y, mo - 1, d, h, mi);
  if (Number.isNaN(guess)) return null;
  const offset = zoneOffsetMinutes(new Date(guess), timeZone);
  return new Date(guess - offset * 60000).toISOString();
}

/** ISO UTC → valor para <input type="datetime-local"> no horário de Brasília. */
export function utcIsoToLocalInput(iso: string, timeZone = AD_TIME_ZONE): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const shifted = new Date(date.getTime() + zoneOffsetMinutes(date, timeZone) * 60000);
  return shifted.toISOString().slice(0, 16);
}

/** Data (AAAA-MM-DD) no horário de Brasília, como o banco agrupa as métricas. */
export function localDay(date: Date, timeZone = AD_TIME_ZONE): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

export function formatLocalDateTime(iso: string, timeZone = AD_TIME_ZONE): string {
  return new Intl.DateTimeFormat("pt-BR", { timeZone, dateStyle: "short", timeStyle: "short" }).format(new Date(iso));
}
