import "server-only";
import { getSupabaseServer } from "./supabase";
import type { ClaimStatus, DailyRates } from "@/lib/rates";

export type Role = "user" | "admin";
export type Session = {
  role: Role;
  email: string;
  userId: string;
  status: "active" | "suspended";
  fullName: string | null;
};
export type ClaimRow = {
  investment_id: string; status: ClaimStatus; created_at: string; expected_amount_usd: number | string;
  payout_details?: string | null; payout_reference?: string | null; admin_note?: string | null; resolved_at?: string | null;
};

/** Correos con rol de administrador definidos en ADMIN_EMAILS (separados por comas). */
const adminEmails = () => new Set((process.env.ADMIN_EMAILS || "").split(",").map(e => e.trim().toLowerCase()).filter(Boolean));

/** Sesión validada con auth.getUser(); el rol sale de profiles.role o de ADMIN_EMAILS (solo correos confirmados). */
export async function getSession(): Promise<Session | null> {
  const supabase = await getSupabaseServer();
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from("profiles").select("role,status,full_name").eq("id", user.id).maybeSingle();
  const email = user.email || "";
  const envAdmin = Boolean(user.email_confirmed_at) && adminEmails().has(email.toLowerCase());
  return {
    role: profile?.role === "admin" || envAdmin ? "admin" : "user",
    email,
    userId: user.id,
    // Un administrador definido por ADMIN_EMAILS no puede quedar bloqueado por error.
    status: profile?.status === "suspended" && !envAdmin ? "suspended" : "active",
    fullName: profile?.full_name || null,
  };
}

/** Tasas diarias guardadas por el administrador (tabla daily_rates). */
export async function getRates(): Promise<DailyRates> {
  const supabase = await getSupabaseServer();
  if (!supabase) return {};
  const { data, error } = await supabase.from("daily_rates").select("rate_date,rate_pct");
  if (error) throw new Error("No fue posible cargar las tasas diarias.");
  return Object.fromEntries((data || []).map(row => [row.rate_date, Number(row.rate_pct)]));
}

/** Valor de un ajuste (tabla settings), por ejemplo las instrucciones de transferencia. */
/** Dirección de la foto con los datos de pago (vacía si el administrador no subió ninguna). */
export async function getTransferImageUrl(): Promise<string> {
  const supabase = await getSupabaseServer();
  if (!supabase) return "";
  const { data } = await supabase.from("settings").select("updated_at").eq("key", "transfer_image").neq("value", "").maybeSingle();
  return data ? `/api/transfer-image?v=${new Date(data.updated_at).getTime()}` : "";
}

export async function getSetting(key: string): Promise<string> {
  const supabase = await getSupabaseServer();
  if (!supabase) return "";
  const { data } = await supabase.from("settings").select("value").eq("key", key).maybeSingle();
  return data?.value || "";
}

export const CLAIM_COLUMNS = "investment_id,status,created_at,expected_amount_usd,payout_details,payout_reference,admin_note,resolved_at";

/** Añade a cada inversión los datos de su solicitud de retiro, si existe. */
export function attachClaims<T extends { id: string }>(investments: T[], claims: ClaimRow[] | null) {
  const byInvestment = new Map((claims || []).map(claim => [claim.investment_id, claim]));
  return investments.map(item => {
    const claim = byInvestment.get(item.id);
    return {
      ...item,
      claim_status: claim?.status || null,
      claim_requested_at: claim?.created_at || null,
      claim_amount_usd: claim ? Number(claim.expected_amount_usd) : null,
      claim_payout_details: claim?.payout_details || null,
      claim_payout_reference: claim?.payout_reference || null,
      claim_admin_note: claim?.admin_note || null,
      claim_resolved_at: claim?.resolved_at || null,
    };
  });
}
