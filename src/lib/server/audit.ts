import "server-only";
import { getSupabaseAdmin } from "./admin";
import type { Session } from "./session";

/** Registra una acción administrativa en admin_audit. Nunca interrumpe la operación si falla. */
export async function logAudit(session: Session, action: string, entity: string, entityId: string | null, details: Record<string, unknown> = {}) {
  try {
    const { error } = await getSupabaseAdmin().from("admin_audit").insert({ actor_id: session.userId, actor_email: session.email, action, entity, entity_id: entityId, details });
    if (error) throw error;
  } catch (e) { console.error("audit_error", e instanceof Error ? e.message : e); }
}

export { AUDIT_LABELS } from "@/lib/audit-labels";
