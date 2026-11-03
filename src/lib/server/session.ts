import "server-only";
import { getSupabaseServer } from "./supabase";
import type { ClaimStatus, DailyRates } from "@/lib/rates";

export type Role = "user" | "admin";
export type Session = { role: Role; email: string; userId: string };
export type ClaimRow = { investment_id: string; status: ClaimStatus; created_at: string; expected_amount_usd: number | string };

/** Correos con rol de administrador definidos en ADMIN_EMAILS (separados por comas). */
const adminEmails = new Set((process.env.ADMIN_EMAILS || "").split(",").map(e => e.trim().toLowerCase()).filter(Boolean));

/** Sesión validada con auth.getUser(); el rol sale de profiles.role o de ADMIN_EMAILS (solo correos confirmados). */
export async function getSession(): Promise<Session | null> {
  const supabase = await getSupabaseServer();
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  const email = user.email || "";
  const envAdmin = Boolean(user.email_confirmed_at) && adminEmails.has(email.toLowerCase());
  return { role: profile?.role === "admin" || envAdmin ? "admin" : "user", email, userId: user.id };
}

/** Tasas diarias guardadas por el administrador (tabla daily_rates). */
export async function getRates(): Promise<DailyRates> {
  const supabase = await getSupabaseServer();
  if (!supabase) return {};
  const { data, error } = await supabase.from("daily_rates").select("rate_date,rate_pct");
  if (error) throw new Error("No fue posible cargar las tasas diarias.");
  return Object.fromEntries((data || []).map(row => [row.rate_date, Number(row.rate_pct)]));
}

/** Añade a cada inversión los datos de su solicitud de retiro, si existe. */
export function attachClaims<T extends { id: string }>(investments: T[], claims: ClaimRow[] | null) {
  const byInvestment = new Map((claims || []).map(claim => [claim.investment_id, claim]));
  return investments.map(item => {
    const claim = byInvestment.get(item.id);
    return { ...item, claim_status: claim?.status || null, claim_requested_at: claim?.created_at || null, claim_amount_usd: claim ? Number(claim.expected_amount_usd) : null };
  });
}
