import "server-only";
import { cookies } from "next/headers";
import { getSupabaseServer } from "./supabase";
import { isValidDayKey, isValidRate, recentDayKeys, type ClaimStatus, type DailyRates } from "@/lib/rates";
import { makeDemoAdminInvestments, type Investment } from "@/lib/finance";

export type Role = "user" | "admin";
export type Session =
  | { kind: "demo"; role: Role; email: string }
  | { kind: "real"; role: Role; email: string; userId: string };

export const DEMO_ROLE_COOKIE = "jh_demo_role";
export const DEMO_RATES_COOKIE = "jh_demo_rates";
export const DEMO_CLAIMS_COOKIE = "jh_demo_claims";
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

export type ClaimRecord = { status: ClaimStatus; requested_at: string; amount_usd?: number | null };
export const CLAIM_STATUSES: ClaimStatus[] = ["pending", "approved", "rejected", "settled"];

/** Solicitudes de retiro de la demostración (cookie del navegador), con una de ejemplo para el administrador. */
export async function getDemoClaims(): Promise<Record<string, ClaimRecord>> {
  const ids = new Set(makeDemoAdminInvestments().map(x => x.id));
  const claims: Record<string, ClaimRecord> = { "demo-cliente-3": { status: "pending", requested_at: new Date(Date.now() - 2 * 86_400_000).toISOString() } };
  try {
    const parsed: unknown = JSON.parse((await cookies()).get(DEMO_CLAIMS_COOKIE)?.value || "{}");
    if (parsed && typeof parsed === "object") for (const [id, value] of Object.entries(parsed)) {
      const claim = value as Partial<ClaimRecord>;
      if (ids.has(id) && CLAIM_STATUSES.includes(claim.status as ClaimStatus) && typeof claim.requested_at === "string" && !Number.isNaN(Date.parse(claim.requested_at)))
        claims[id] = { status: claim.status as ClaimStatus, requested_at: claim.requested_at, amount_usd: typeof claim.amount_usd === "number" ? claim.amount_usd : null };
    }
  } catch { /* cookie dañada: se ignora */ }
  return claims;
}

export const demoCookieOptions = (days: number) => ({ httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * days });

export function withClaims(investments: Investment[], claims: Record<string, ClaimRecord>): Investment[] {
  return investments.map(item => {
    const claim = claims[item.id];
    return claim ? { ...item, status: claim.status === "settled" ? "closed" : item.status, claim_status: claim.status, claim_requested_at: claim.requested_at, claim_amount_usd: claim.amount_usd ?? null } : item;
  });
}
