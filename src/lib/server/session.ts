import "server-only";
import { cookies } from "next/headers";
import { getSupabaseServer } from "./supabase";
import { isValidDayKey, isValidRate, recentDayKeys, type DailyRates } from "@/lib/rates";

export type Role = "user" | "admin";
export type Session =
  | { kind: "demo"; role: Role; email: string }
  | { kind: "real"; role: Role; email: string; userId: string };

export const DEMO_ROLE_COOKIE = "jh_demo_role";
export const DEMO_RATES_COOKIE = "jh_demo_rates";
export const DEMO_EMAILS: Record<Role, string> = { user: "demo@jh-inversiones.local", admin: "admin@jh-inversiones.local" };
/** Días de historial de tasas que se conservan en la cookie de demostración. */
const DEMO_RATES_DAYS = 120;

/**
 * Sesión actual. El acceso rápido de demostración tiene prioridad y solo
 * expone datos ficticios; las cuentas reales se validan con auth.getUser().
 */
export async function getSession(): Promise<Session | null> {
  const store = await cookies();
  const demoRole = store.get(DEMO_ROLE_COOKIE)?.value;
  if (demoRole === "user" || demoRole === "admin") return { kind: "demo", role: demoRole, email: DEMO_EMAILS[demoRole] };
  const supabase = await getSupabaseServer();
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  return { kind: "real", role: profile?.role === "admin" ? "admin" : "user", email: user.email || "Usuario", userId: user.id };
}

export function parseDemoRates(raw: string | undefined): DailyRates {
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    const keep = new Set(recentDayKeys(DEMO_RATES_DAYS));
    return Object.fromEntries(Object.entries(parsed).filter(([key, value]) => isValidDayKey(key) && keep.has(key) && isValidRate(value)));
  } catch { return {}; }
}

export async function getDemoRates() {
  return parseDemoRates((await cookies()).get(DEMO_RATES_COOKIE)?.value);
}

/** Tasas guardadas: cookie en demostración, tabla daily_rates en modo real. */
export async function getRates(session: Session): Promise<DailyRates> {
  if (session.kind === "demo") return getDemoRates();
  const supabase = await getSupabaseServer();
  if (!supabase) return {};
  const { data, error } = await supabase.from("daily_rates").select("rate_date,rate_pct");
  if (error) throw new Error("No fue posible cargar las tasas diarias.");
  return Object.fromEntries((data || []).map(row => [row.rate_date, Number(row.rate_pct)]));
}
