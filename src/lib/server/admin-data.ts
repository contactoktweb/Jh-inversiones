import "server-only";
import { getSupabaseAdmin } from "./admin";
import { attachClaims, CLAIM_COLUMNS, type ClaimRow } from "./session";
import type { Investment } from "@/lib/finance";

export type ClientProfile = {
  id: string; email: string; role: "user" | "admin"; status: "active" | "suspended";
  full_name: string | null; phone: string | null; country: string | null; payout_details: string | null; created_at: string;
  referral_code: string; referred_by: string | null; referred_at: string | null;
};
export type CommissionRow = {
  id: string; referrer_id: string; referred_id: string; investment_id: string; base_usd: number; rate_pct: number; amount_usd: number;
  status: "pending" | "paid" | "cancelled"; created_at: string; resolved_at: string | null; payout_reference: string | null; admin_note: string | null;
  referrer_email: string; referrer_name: string | null; referrer_payout: string | null; referred_email: string; referred_name: string | null; investment_reference: string | null;
};
export type AuditEntry = { id: number; actor_email: string; action: string; entity: string; entity_id: string | null; details: Record<string, unknown>; created_at: string };

const INVESTMENT_COLUMNS = "id,user_id,plan_id,principal_usd,started_at,ends_at,term_days,status,payment_method,payment_reference,created_at,confirmed_at,admin_note,payment_reported_at,payment_report_note,plan:plans(name)";

/** Todo lo que necesita el panel de administración, leído con la service role key (solo en el servidor). */
export async function loadAdminData() {
  const admin = getSupabaseAdmin();
  const [{ data: investments, error }, { data: profiles, error: profilesError }, { data: claims }, { data: proofs }] = await Promise.all([
    admin.from("investments").select(INVESTMENT_COLUMNS).order("created_at", { ascending: false }),
    admin.from("profiles").select("id,email,role,status,full_name,phone,country,payout_details,created_at,referral_code,referred_by,referred_at").order("created_at", { ascending: false }),
    admin.from("claims").select(CLAIM_COLUMNS),
    admin.from("payment_proofs").select("investment_id"),
  ]);
  const withProof = new Set((proofs || []).map(p => p.investment_id as string));
  if (error || profilesError) throw new Error("No fue posible cargar los datos de administración.");
  const byId = new Map((profiles || []).map(p => [p.id, p]));
  const rows: Investment[] = attachClaims((investments || []).map(({ plan, ...row }) => ({
    ...row,
    plan_name: (plan as unknown as { name: string } | null)?.name || row.plan_id,
    principal_usd: Number(row.principal_usd),
    owner_email: byId.get(row.user_id)?.email || row.user_id,
    owner_name: byId.get(row.user_id)?.full_name || null,
    has_proof: withProof.has(row.id),
  })), claims as ClaimRow[] | null);
  return { investments: rows, profiles: (profiles || []) as ClientProfile[] };
}

export async function loadAudit(limit = 300): Promise<AuditEntry[]> {
  const { data, error } = await getSupabaseAdmin().from("admin_audit").select("id,actor_email,action,entity,entity_id,details,created_at").order("created_at", { ascending: false }).limit(limit);
  if (error) throw new Error("No fue posible cargar el registro de actividad.");
  return (data || []) as AuditEntry[];
}

/** Comisiones por referidos con los datos de quien gana y de quien invirtió. */
export async function loadCommissions(): Promise<CommissionRow[]> {
  const admin = getSupabaseAdmin();
  const [{ data, error }, { data: profiles }] = await Promise.all([
    admin.from("referral_commissions").select("id,referrer_id,referred_id,investment_id,base_usd,rate_pct,amount_usd,status,created_at,resolved_at,payout_reference,admin_note,investment:investments(payment_reference)").order("created_at", { ascending: false }),
    admin.from("profiles").select("id,email,full_name,payout_details"),
  ]);
  if (error) throw new Error("No fue posible cargar las comisiones.");
  const byId = new Map((profiles || []).map(p => [p.id, p]));
  return (data || []).map(({ investment, ...c }) => ({
    ...c, base_usd: Number(c.base_usd), rate_pct: Number(c.rate_pct), amount_usd: Number(c.amount_usd),
    referrer_email: byId.get(c.referrer_id)?.email || c.referrer_id, referrer_name: byId.get(c.referrer_id)?.full_name || null, referrer_payout: byId.get(c.referrer_id)?.payout_details || null,
    referred_email: byId.get(c.referred_id)?.email || c.referred_id, referred_name: byId.get(c.referred_id)?.full_name || null,
    investment_reference: (investment as unknown as { payment_reference: string } | null)?.payment_reference || null,
  })) as CommissionRow[];
}

/** Números para las insignias del menú (pagos, retiros y comisiones pendientes). */
export async function loadAdminCounts() {
  const admin = getSupabaseAdmin();
  const [payments, claims, commissions] = await Promise.all([
    admin.from("investments").select("id", { count: "exact", head: true }).eq("status", "pending_payment"),
    admin.from("claims").select("id", { count: "exact", head: true }).in("status", ["pending", "approved"]),
    admin.from("referral_commissions").select("id", { count: "exact", head: true }).eq("status", "pending"),
  ]);
  return { pendingPayments: payments.count || 0, pendingClaims: claims.count || 0, pendingCommissions: commissions.count || 0 };
}
