import { formatDateTime, formatUsd } from "@/lib/finance";
import type { AuditEntry } from "@/lib/server/admin-data";
import { auditLabel } from "@/lib/audit-labels";


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
  if (entry.action === "investment.term") parts.push(`plazo ${d.previous_term_days ?? "?"} → ${d.term_days} días`);
  if (typeof d.referrer === "string") parts.push(`refirió: ${d.referrer}`);
  if (entry.action === "referral.assign" && d.referrer === null) parts.push("sin referido");
  if (entry.action === "settings.update") parts.push(Object.keys(d).filter(k => k !== "previous").map(k => k === "referral_commission_pct" ? `comisión por referido ${d[k]}%` : k).join(", "));
  return parts.join(" · ");
}

export default function ActivityList({ entries }: { entries: AuditEntry[] }) {
  if (!entries.length) return <p className="chart-note">Todavía no hay acciones registradas.</p>;
  return <ul className="activity-list">{entries.map(e => <li key={e.id}><span className="activity-dot" /><div><strong>{auditLabel(e.action)}</strong><small>{auditSummary(e)}</small><small>por {e.actor_email}</small></div><time dateTime={e.created_at}>{formatDateTime(e.created_at)}</time></li>)}</ul>;
}
