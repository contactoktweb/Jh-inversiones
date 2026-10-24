// Tasas diarias configuradas por el administrador y cálculo de ganancias.
// Las ganancias se calculan como interés simple: cada día completo suma
// capital × tasa del día. El día en curso se acumula proporcionalmente.
export const DEFAULT_DAILY_RATE_PCT = 1.5;
export const MIN_TERM_DAYS = 30;
export const MIN_INVESTMENT_USD = 50;
export const MAX_DAILY_RATE_PCT = 100;
export const RATES_TIMEZONE = "America/Bogota";

const DAY = 86_400_000;

/** Mapa "AAAA-MM-DD" → porcentaje diario. Los días ausentes usan la tasa por defecto. */
export type DailyRates = Record<string, number>;

const keyFormatter = new Intl.DateTimeFormat("en-CA", { timeZone: RATES_TIMEZONE, year: "numeric", month: "2-digit", day: "2-digit" });
export const dayKey = (date: Date | number | string) => keyFormatter.format(new Date(date));
export const todayKey = (now = Date.now()) => dayKey(now);

export const isValidDayKey = (value: unknown): value is string =>
  typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T12:00:00Z`));

export const isValidRate = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= MAX_DAILY_RATE_PCT;

export const rateFor = (rates: DailyRates, key: string) => rates[key] ?? DEFAULT_DAILY_RATE_PCT;

/** Claves de los últimos `count` días, del más reciente al más antiguo. */
export function recentDayKeys(count: number, now = Date.now()) {
  return Array.from({ length: count }, (_, i) => dayKey(now - i * DAY));
}

export type EarningsPosition = { principal_usd: number; started_at: string; status: string };

export function calculateEarnings(position: EarningsPosition, rates: DailyRates, now = Date.now()) {
  const started = new Date(position.started_at).getTime();
  const elapsed = Math.max(0, now - started);
  const fullDays = Math.floor(elapsed / DAY);
  let earnings = 0;
  for (let i = 0; i < fullDays; i++) earnings += position.principal_usd * rateFor(rates, dayKey(started + i * DAY)) / 100;
  const currentRate = rateFor(rates, dayKey(started + fullDays * DAY));
  const partial = (elapsed - fullDays * DAY) / DAY;
  earnings += position.principal_usd * currentRate / 100 * partial;
  const availableAt = started + MIN_TERM_DAYS * DAY;
  const termProgress = Math.min(1, elapsed / (MIN_TERM_DAYS * DAY));
  return {
    earnings,
    total: position.principal_usd + earnings,
    daysElapsed: fullDays,
    daysRemaining: Math.max(0, Math.ceil((availableAt - now) / DAY)),
    availableAt,
    termProgress,
    currentRate,
    canWithdraw: termProgress >= 1 && position.status === "active",
  };
}

/** Ganancia acumulada de varias posiciones al final de cada uno de los últimos `days` días. */
export function earningsSeries(positions: EarningsPosition[], rates: DailyRates, days: number, now = Date.now()) {
  return Array.from({ length: days }, (_, i) => {
    const at = now - (days - 1 - i) * DAY;
    return { at, value: positions.reduce((sum, p) => sum + (new Date(p.started_at).getTime() <= at ? calculateEarnings(p, rates, at).earnings : 0), 0) };
  });
}
