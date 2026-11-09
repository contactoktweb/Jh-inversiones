import { formatDateTime, formatUsd } from "@/lib/finance";
import type { AuditEntry } from "@/lib/server/admin-data";

const LABELS: Record<string, string> = {
  "rate.set": "Fijó la tasa diaria", "payment.confirm": "Confirmó un pago", "payment.reject": "Rechazó un pago",
  "investment.create_manual": "Registró una inversión manual", "investment.cancel": "Canceló una inversión",
  "claim.approved": "Aprobó un retiro", "claim.settled": "Marcó un retiro como desembolsado", "claim.rejected": "Rechazó un retiro",
  "user.suspend": "Suspendió una cuenta", "user.activate": "Reactivó una cuenta", "user.make_admin": "Dio rol de administrador",
  "user.remove_admin": "Quitó rol de administrador", "settings.update": "Actualizó los ajustes",
  "plan.create": "Creó un plan", "plan.update": "Editó un plan", "plan.hide": "Ocultó un plan", "plan.show": "Volvió a mostrar un plan", "plan.delete": "Eliminó un plan",
};
export const auditLabel = (action: string) => LABELS[action] || action;

/** Resume en una línea los detalles de una acción. */
export function auditSummary(entry: AuditEntry) {
  const d = entry.details || {};
  const parts: string[] = [];
  if (entry.action === "rate.set") parts.push(`${entry.entity_id}: ${d.rate_pct}%`);
  if (entry.entity === "plan" && typeof d.name === "string") parts.push(typeof d.min_usd === "number" ? `${d.name} · desde ${formatUsd(d.min_usd)}` : d.name);
  if (typeof d.client === "string") parts.push(d.client);
  if (typeof d.email === "string") parts.push(d.email);
  if (typeof d.amount_usd === "number") parts.push(formatUsd(d.amount_usd));
  if (typeof d.reference === "string") parts.push(`ref. ${d.reference}`);
  if (typeof d.payout_reference === "string") parts.push(`comprobante ${d.payout_reference}`);
  if (typeof d.note === "string") parts.push(`“${d.note}”`);
  if (entry.action === "settings.update") parts.push(Object.keys(d).join(", "));
  return parts.join(" · ");
}

export default function ActivityList({ entries }: { entries: AuditEntry[] }) {
  if (!entries.length) return <p className="chart-note">Todavía no hay acciones registradas.</p>;
  return <ul className="activity-list">{entries.map(e => <li key={e.id}><span className="activity-dot" /><div><strong>{auditLabel(e.action)}</strong><small>{auditSummary(e)}</small><small>por {e.actor_email}</small></div><time dateTime={e.created_at}>{formatDateTime(e.created_at)}</time></li>)}</ul>;
}
