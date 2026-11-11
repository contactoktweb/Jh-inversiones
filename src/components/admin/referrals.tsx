"use client";
import { useState } from "react";
import Link from "next/link";
import { BadgeDollarSign, Ban, CheckCircle2, Download, Gift, Percent, Save, Search, Users } from "lucide-react";
import { formatDate, formatUsd } from "@/lib/finance";
import { COMMISSION_STATUS_LABELS } from "@/lib/referrals";
import type { CommissionRow } from "@/lib/server/admin-data";
import { ActionDialog, AnimatePresence, Feedback, Filters, matches, useAdminAction, useDialog } from "./ui";

export type ReferrerSummary = { id: string; email: string; name: string | null; code: string; referred: number; pending: number; paid: number };
type Tab = "pending" | "paid" | "cancelled" | "all";
const statusClass = (status: string) => status === "paid" ? "claim-settled" : status === "cancelled" ? "claim-rejected" : "claim-pending";

export default function AdminReferrals({ pct, commissions, referrers, referredCount }: { pct: number; commissions: CommissionRow[]; referrers: ReferrerSummary[]; referredCount: number }) {
  const settings = useAdminAction();
  const action = useAdminAction();
  const dialog = useDialog<{ kind: "pay" | "cancel"; row: CommissionRow }>();
  const [value, setValue] = useState(String(pct));
  const [tab, setTab] = useState<Tab>("pending");
  const [query, setQuery] = useState("");
  const count = (s: string) => commissions.filter(c => c.status === s).length;
  const total = (s: string) => commissions.filter(c => c.status === s).reduce((sum, c) => sum + c.amount_usd, 0);
  const visible = commissions.filter(c => (tab === "all" || c.status === tab) && matches(query, c.referrer_email, c.referrer_name, c.referred_email, c.referred_name, c.investment_reference));

  return <>
    <section className="metrics-grid" aria-label="Resumen de referidos">
      <article className="metric-card"><div className="metric-label"><BadgeDollarSign size={16} /> POR PAGAR</div><div className="metric-value">{formatUsd(total("pending"))}</div><div className="metric-foot">{count("pending")} {count("pending") === 1 ? "comisión" : "comisiones"}</div></article>
      <article className="metric-card"><div className="metric-label"><CheckCircle2 size={16} /> PAGADO</div><div className="metric-value">{formatUsd(total("paid"))}</div><div className="metric-foot">{count("paid")} pagadas</div></article>
      <article className="metric-card"><div className="metric-label"><Users size={16} /> CLIENTES REFERIDOS</div><div className="metric-value">{referredCount}</div><div className="metric-foot">{referrers.length} {referrers.length === 1 ? "persona refiere" : "personas refieren"}</div></article>
    </section>

    <section className="dash-panel panel-gap"><div className="panel-heading"><h2>Comisión por referido</h2><span><Percent size={15} /> {pct > 0 ? `${pct}% vigente` : "Pausado"}</span></div>
      <p className="chart-note top-note">Cada vez que confirmas el pago de una persona referida (o registras un pago manual a su nombre), quien la invitó gana este porcentaje del monto invertido. Escribe <strong>0</strong> para pausar el programa. El cambio aplica a las inversiones que confirmes desde ahora; las comisiones ya generadas no cambian. Los pagos de prueba no generan comisión.</p>
      <form className="rate-form" onSubmit={e => { e.preventDefault(); settings.run("/api/admin/referrals", { action: "pct", pct: Number(value) }); }}>
        <label htmlFor="referral-pct">Porcentaje de comisión</label>
        <div className="rate-form-row"><div className="rate-input"><input id="referral-pct" type="number" min={0} max={100} step={0.001} required value={value} onChange={e => setValue(e.target.value)} /><span>%</span></div>
          <button className="rate-primary" disabled={settings.busy}><Save size={16} />{settings.busy ? "Guardando…" : "Guardar porcentaje"}</button></div>
      </form>
      <Feedback message={settings.message} error={settings.error} />
    </section>

    <Feedback message={action.message} error={action.error} />
    <section className="dash-panel dash-table-panel panel-gap"><div className="panel-heading"><h2>Comisiones</h2><span><Gift size={15} /> Se pagan a los datos de pago de quien refirió</span></div>
      <div className="admin-toolbar"><Filters value={tab} onChange={setTab} options={[{ value: "pending", label: "Por pagar", count: count("pending") }, { value: "paid", label: "Pagadas", count: count("paid") }, { value: "cancelled", label: "Anuladas", count: count("cancelled") }, { value: "all", label: "Todas", count: commissions.length }]} />
        <div className="admin-toolbar-right"><label className="admin-search"><Search size={15} /><input placeholder="Cliente o referencia" value={query} onChange={e => setQuery(e.target.value)} /></label><a className="admin-export" href="/api/admin/export?tipo=referidos"><Download size={14} /> CSV</a></div></div>
      {visible.length === 0 ? <p className="chart-note">No hay comisiones con estos filtros.</p> :
        <div className="table-scroll"><table className="invest-table"><thead><tr><th>FECHA</th><th>GANA</th><th>REFERIDO</th><th>INVERSIÓN</th><th>COMISIÓN</th><th>DÓNDE PAGAR</th><th>ESTADO</th><th></th></tr></thead><tbody>
          {visible.map(c => <tr key={c.id}><td>{formatDate(c.created_at)}</td>
            <td><Link className="admin-link" href={`/admin/clientes/${c.referrer_id}`}>{c.referrer_name || c.referrer_email}</Link>{c.referrer_name && <small className="cell-sub">{c.referrer_email}</small>}</td>
            <td><Link className="admin-link" href={`/admin/clientes/${c.referred_id}`}>{c.referred_name || c.referred_email}</Link></td>
            <td>{formatUsd(c.base_usd)}<small className="cell-sub">{c.rate_pct}%{c.investment_reference && <> · <code>{c.investment_reference}</code></>}</small></td>
            <td className="cell-strong">{formatUsd(c.amount_usd)}</td>
            <td className="payout-cell">{c.referrer_payout || <small className="cell-sub">Sin datos: pídeselos al cliente</small>}</td>
            <td><span className={`badge-status ${statusClass(c.status)}`}><i />{COMMISSION_STATUS_LABELS[c.status]}</span>{c.payout_reference && <small className="cell-sub">Comprobante {c.payout_reference}</small>}{c.admin_note && <small className="cell-sub">{c.admin_note}</small>}</td>
            <td>{c.status === "pending" && <div className="table-actions"><button className="act-success" disabled={action.busy} onClick={() => dialog.open({ kind: "pay", row: c })}><CheckCircle2 size={14} /> Marcar pagada</button><button className="act-danger" disabled={action.busy} onClick={() => dialog.open({ kind: "cancel", row: c })}><Ban size={14} /> Anular</button></div>}</td></tr>)}
        </tbody></table></div>}
    </section>

    <section className="dash-panel dash-table-panel panel-gap"><div className="panel-heading"><h2>Quiénes refieren</h2><span><Users size={15} /> {referrers.length}</span></div>
      {referrers.length === 0 ? <p className="chart-note">Todavía nadie se ha registrado con el código de otra persona.</p> :
        <div className="table-scroll"><table className="invest-table"><thead><tr><th>CLIENTE</th><th>CÓDIGO</th><th>REFERIDOS</th><th>POR PAGAR</th><th>PAGADO</th></tr></thead><tbody>
          {referrers.map(r => <tr key={r.id}><td><Link className="admin-link" href={`/admin/clientes/${r.id}`}>{r.name || r.email}</Link>{r.name && <small className="cell-sub">{r.email}</small>}</td><td><code>{r.code}</code></td><td>{r.referred}</td><td className="cell-strong">{formatUsd(r.pending)}</td><td>{formatUsd(r.paid)}</td></tr>)}
        </tbody></table></div>}
    </section>

    <AnimatePresence>{dialog.state && (dialog.state.kind === "pay"
      ? <ActionDialog title="Marcar comisión como pagada" tone="success" confirmLabel="Confirmar pago" onClose={dialog.close}
        description={<><p>Paga <strong>{formatUsd(dialog.state.row.amount_usd)}</strong> a {dialog.state.row.referrer_name || dialog.state.row.referrer_email} y luego registra aquí el comprobante.</p>{dialog.state.row.referrer_payout ? <p>Dónde pagar: <strong>{dialog.state.row.referrer_payout}</strong></p> : <p>Este cliente no tiene datos de pago en «Mi cuenta»: pídeselos antes de pagar.</p>}<p>El cliente recibe un correo con el comprobante.</p></>}
        fields={[{ name: "reference", label: "Comprobante del pago", required: true, placeholder: "N.º de transferencia o recibo" }, { name: "note", label: "Nota (opcional)" }]}
        onConfirm={v => action.run("/api/admin/referrals", { action: "pay", commissionId: dialog.state!.row.id, reference: v.reference, note: v.note })} />
      : <ActionDialog title="Anular comisión" tone="danger" confirmLabel="Anular comisión" onClose={dialog.close}
        description={<p>La comisión de <strong>{formatUsd(dialog.state.row.amount_usd)}</strong> para {dialog.state.row.referrer_email} quedará anulada y no se pagará. El cliente verá el motivo.</p>}
        fields={[{ name: "note", label: "Motivo", required: true, multiline: true }]}
        onConfirm={v => action.run("/api/admin/referrals", { action: "cancel", commissionId: dialog.state!.row.id, note: v.note })} />)}</AnimatePresence>
  </>;
}
