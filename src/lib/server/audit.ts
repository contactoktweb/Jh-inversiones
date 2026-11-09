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

export const AUDIT_LABELS: Record<string, string> = {
  "rate.set": "Fijó la tasa diaria",
  "payment.confirm": "Confirmó un pago",
  "payment.reject": "Rechazó un pago",
  "investment.create_manual": "Registró una inversión manual",
  "investment.cancel": "Canceló una inversión",
  "claim.approved": "Aprobó un retiro",
  "claim.settled": "Marcó un retiro como desembolsado",
  "claim.rejected": "Rechazó un retiro",
  "user.suspend": "Suspendió una cuenta",
  "user.activate": "Reactivó una cuenta",
  "user.make_admin": "Dio rol de administrador",
  "user.remove_admin": "Quitó rol de administrador",
  "settings.update": "Actualizó los ajustes",
  "plan.create": "Creó un plan",
  "plan.update": "Editó un plan",
  "plan.hide": "Ocultó un plan",
  "plan.show": "Volvió a mostrar un plan",
  "plan.delete": "Eliminó un plan",
};
