import "server-only";
import { getSupabaseAdmin } from "./admin";
import { attachClaims, CLAIM_COLUMNS, type ClaimRow } from "./session";
import type { Investment } from "@/lib/finance";

export type ClientProfile = {
  id: string; email: string; role: "user" | "admin"; status: "active" | "suspended";
  full_name: string | null; phone: string | null; country: string | null; payout_details: string | null; created_at: string;
};
export type AuditEntry = { id: number; actor_email: string; action: string; entity: string; entity_id: string | null; details: Record<string, unknown>; created_at: string };

const INVESTMENT_COLUMNS = "id,user_id,plan_id,principal_usd,started_at,ends_at,status,payment_method,payment_reference,created_at,confirmed_at,admin_note";

/** Todo lo que necesita el panel de administración, leído con la service role key (solo en el servidor). */
export async function loadAdminData() {
  const admin = getSupabaseAdmin();
  const [{ data: investments, error }, { data: profiles, error: profilesError }, { data: claims }] = await Promise.all([
    admin.from("investments").select(INVESTMENT_COLUMNS).order("created_at", { ascending: false }),
    admin.from("profiles").select("id,email,role,status,full_name,phone,country,payout_details,created_at").order("created_at", { ascending: false }),
    admin.from("claims").select(CLAIM_COLUMNS),
  ]);
  if (error || profilesError) throw new Error("No fue posible cargar los datos de administración.");
  const byId = new Map((profiles || []).map(p => [p.id, p]));
  const rows: Investment[] = attachClaims((investments || []).map(row => ({
    ...row,
    principal_usd: Number(row.principal_usd),
    owner_email: byId.get(row.user_id)?.email || row.user_id,
    owner_name: byId.get(row.user_id)?.full_name || null,
  })), claims as ClaimRow[] | null);
  return { investments: rows, profiles: (profiles || []) as ClientProfile[] };
}

export async function loadAudit(limit = 300): Promise<AuditEntry[]> {
  const { data, error } = await getSupabaseAdmin().from("admin_audit").select("id,actor_email,action,entity,entity_id,details,created_at").order("created_at", { ascending: false }).limit(limit);
  if (error) throw new Error("No fue posible cargar el registro de actividad.");
  return (data || []) as AuditEntry[];
}

/** Números para las insignias del menú (pagos y retiros pendientes). */
export async function loadAdminCounts() {
  const admin = getSupabaseAdmin();
  const [payments, claims] = await Promise.all([
    admin.from("investments").select("id", { count: "exact", head: true }).eq("status", "pending_payment"),
    admin.from("claims").select("id", { count: "exact", head: true }).in("status", ["pending", "approved"]),
  ]);
  return { pendingPayments: payments.count || 0, pendingClaims: claims.count || 0 };
}
