"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { Ban, CircleCheck, Clock3, Download, Image as ImageIcon, Plus, Search, X } from "lucide-react";
import { formatDate, formatDateTime, formatUsd, PAYMENT_METHOD_LABELS, type Investment } from "@/lib/finance";
import { MIN_INVESTMENT_USD } from "@/lib/rates";
import { ActionDialog, AnimatePresence, Feedback, Filters, InvestmentBadge, matches, useAdminAction, useDialog } from "./ui";

type Dialog = { kind: "confirm" | "reject" | "proof"; item: Investment };

export default function AdminPayments({ investments, clientEmails }: { investments: Investment[]; clientEmails: string[] }) {
  const action = useAdminAction();
  const manual = useAdminAction();
  const dialog = useDialog<Dialog>();
  const [method, setMethod] = useState<"all" | "test" | "transfer" | "manual" | "stripe">("all");
  const [query, setQuery] = useState("");
  const [form, setForm] = useState({ email: "", amount: "", reference: "", startedAt: "", note: "" });
  // Primero las que el cliente ya avisó que pagó (las más antiguas arriba), luego las que aún no avisa.
  const pending = investments.filter(i => i.status === "pending_payment").sort((a, b) =>
    a.payment_reported_at && b.payment_reported_at ? a.payment_reported_at.localeCompare(b.payment_reported_at) : a.payment_reported_at ? -1 : b.payment_reported_at ? 1 : 0);
  const reported = pending.filter(i => i.payment_reported_at).length;
  const history = investments.filter(i => i.status !== "pending_payment" && (method === "all" || i.payment_method === method) && matches(query, i.owner_email, i.owner_name, i.payment_reference));
  const count = (m: string) => investments.filter(i => i.status !== "pending_payment" && i.payment_method === m).length;

  return <>
    <Feedback message={action.message} error={action.error} />
    <section className="dash-panel" id="pendientes"><div className="panel-heading"><h2>Transferencias por confirmar</h2><span>{reported} por verificar · {pending.length} pendientes · {formatUsd(pending.reduce((s, i) => s + i.principal_usd, 0))}</span></div>
      <p className="chart-note top-note">Cuando un cliente pulsa <strong>«Ya realicé la transferencia»</strong> te llega un correo y aquí aparece como <strong>AVISÓ QUE PAGÓ</strong>, con su comprobante si lo adjuntó. Revisa tu cuenta bancaria: si el dinero llegó con la referencia indicada, pulsa <strong>Confirmar pago</strong> y la inversión se activa por ese monto.</p>
      {pending.length === 0 ? <div className="empty-state"><CircleCheck size={32} /><h3>No hay pagos pendientes</h3><p>Las inversiones registradas por transferencia aparecerán aquí.</p></div> :
        <div className="table-scroll"><table className="invest-table"><thead><tr><th>REGISTRADA</th><th>CLIENTE</th><th>MONTO</th><th>REFERENCIA</th><th>AVISO DEL CLIENTE</th><th>ACCIONES</th></tr></thead><tbody>
          {pending.map(i => <tr key={i.id}><td>{formatDateTime(i.created_at || i.started_at)}</td><td><span className="cell-strong">{i.owner_name || i.owner_email}</span>{i.owner_name && <small className="cell-sub">{i.owner_email}</small>}</td><td className="cell-strong">{formatUsd(i.principal_usd)}</td><td><code>{i.payment_reference}</code></td>
            <td><div className="report-cell">{i.payment_reported_at ? <><span className="report-flag"><CircleCheck size={12} /> AVISÓ QUE PAGÓ</span><small className="cell-sub">{formatDateTime(i.payment_reported_at)}</small>{i.payment_report_note && <small className="cell-sub">«{i.payment_report_note}»</small>}{i.has_proof ? <button type="button" className="proof-link" onClick={() => dialog.open({ kind: "proof", item: i })}><ImageIcon size={13} /> Ver comprobante</button> : <small className="cell-sub">Sin comprobante</small>}</> : <span className="report-flag waiting"><Clock3 size={12} /> AÚN NO AVISA</span>}</div></td>
            <td><div className="table-actions"><button className="act-success" disabled={action.busy} onClick={() => dialog.open({ kind: "confirm", item: i })}><CircleCheck size={14} /> Confirmar pago</button><button className="act-danger" disabled={action.busy} onClick={() => dialog.open({ kind: "reject", item: i })}><Ban size={14} /> Rechazar</button></div></td></tr>)}
        </tbody></table></div>}
    </section>

    <section className="dash-panel panel-gap" id="manual"><div className="panel-heading"><h2>Registrar un pago manual</h2><span><Plus size={15} /> Pago recibido por fuera de la plataforma</span></div>
      <p className="chart-note top-note">Úsalo si un cliente te pagó en efectivo, por otro banco o por cualquier medio externo. El cliente debe tener una cuenta creada. La inversión queda activa desde la fecha de inicio que indiques.</p>
      <form className="form-grid" onSubmit={async e => { e.preventDefault(); if (await manual.run("/api/admin/investments", { action: "create", email: form.email, amountUsd: Number(form.amount), reference: form.reference, startedAt: form.startedAt, note: form.note })) setForm({ email: "", amount: "", reference: "", startedAt: "", note: "" }); }}>
        <label>Correo del cliente<input required type="email" list="client-emails" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="cliente@correo.com" /></label>
        <datalist id="client-emails">{clientEmails.map(e => <option key={e} value={e} />)}</datalist>
        <label>Monto (USD)<input required type="number" min={MIN_INVESTMENT_USD} step={1} value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="500" /></label>
        <label>Referencia del pago<input required maxLength={80} value={form.reference} onChange={e => setForm({ ...form, reference: e.target.value })} placeholder="N.º de transferencia o recibo" /></label>
        <label>Fecha de inicio (opcional)<input type="date" value={form.startedAt} onChange={e => setForm({ ...form, startedAt: e.target.value })} /></label>
        <label className="span-2">Nota interna (opcional)<input maxLength={500} value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} /></label>
        <div className="span-2 form-actions"><button className="rate-primary" disabled={manual.busy}><Plus size={16} />{manual.busy ? "Registrando…" : "Registrar inversión"}</button>{manual.message && <p role="status" className={`claim-feedback ${manual.error ? "error" : ""}`}>{manual.message}</p>}</div>
      </form>
    </section>

    <section className="dash-panel panel-gap" id="historial"><div className="panel-heading"><h2>Historial de pagos</h2><a className="admin-export" href="/api/admin/export?tipo=inversiones"><Download size={14} /> Exportar CSV</a></div>
      <div className="admin-toolbar"><Filters value={method} onChange={setMethod} options={[{ value: "all", label: "Todos" }, { value: "transfer", label: "Transferencia", count: count("transfer") }, { value: "manual", label: "Manual", count: count("manual") }, { value: "test", label: "Prueba", count: count("test") }, { value: "stripe", label: "Pasarela", count: count("stripe") }]} />
        <label className="admin-search"><Search size={15} /><input placeholder="Buscar cliente o referencia" value={query} onChange={e => setQuery(e.target.value)} /></label></div>
      {history.length === 0 ? <p className="chart-note">No hay pagos con estos filtros.</p> :
        <div className="table-scroll"><table className="invest-table"><thead><tr><th>FECHA</th><th>CLIENTE</th><th>MONTO</th><th>MÉTODO</th><th>REFERENCIA</th><th>ESTADO</th></tr></thead><tbody>
          {history.map(i => <tr key={i.id}><td>{formatDate(i.confirmed_at || i.created_at || i.started_at)}</td><td>{i.owner_email}</td><td className="cell-strong">{formatUsd(i.principal_usd)}</td><td>{PAYMENT_METHOD_LABELS[i.payment_method || ""] || i.payment_method}</td><td><code>{i.payment_reference}</code></td><td><InvestmentBadge item={i} />{i.admin_note && <small className="cell-sub">{i.admin_note}</small>}</td></tr>)}
        </tbody></table></div>}
    </section>

    <AnimatePresence>{dialog.state && (dialog.state.kind === "proof"
      ? <motion.div key="p" className="rate-modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={dialog.close}>
          <motion.div className="rate-modal proof-modal" role="dialog" aria-modal="true" aria-label="Comprobante de pago" onClick={e => e.stopPropagation()} initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 24, opacity: 0 }}>
            <button type="button" className="modal-close" aria-label="Cerrar" onClick={dialog.close}><X size={18} /></button>
            <h2>Comprobante de pago</h2>
            <p className="modal-description">{dialog.state.item.owner_email} · {formatUsd(dialog.state.item.principal_usd)} · referencia <strong>{dialog.state.item.payment_reference}</strong></p>
            <a href={`/api/admin/payments/proof?id=${dialog.state.item.id}`} target="_blank" rel="noreferrer"><img src={`/api/admin/payments/proof?id=${dialog.state.item.id}`} alt="Comprobante enviado por el cliente" /></a>
            <div className="rate-modal-actions"><button type="button" className="rate-primary tone-success" onClick={() => dialog.open({ kind: "confirm", item: dialog.state!.item })}><CircleCheck size={15} /> Confirmar pago</button><button type="button" className="rate-ghost" onClick={dialog.close}>Cerrar</button></div>
          </motion.div>
        </motion.div>
      : dialog.state.kind === "confirm"
      ? <ActionDialog key="c" title="Confirmar pago" tone="success" confirmLabel="Sí, confirmar pago" onClose={dialog.close}
          description={<><p>¿Recibiste <strong>{formatUsd(dialog.state.item.principal_usd)}</strong> de <strong>{dialog.state.item.owner_email}</strong> con la referencia <strong>{dialog.state.item.payment_reference}</strong>?</p><p>La inversión se activará hoy y el plazo de 30 días empieza a contar.</p></>}
          fields={[{ name: "note", label: "Nota interna (opcional)" }]}
          onConfirm={v => action.run("/api/admin/payments", { investmentId: dialog.state!.item.id, action: "confirm", note: v.note })} />
      : <ActionDialog key="r" title="Rechazar pago" tone="danger" confirmLabel="Rechazar y cancelar" onClose={dialog.close}
          description={<p>La inversión de <strong>{formatUsd(dialog.state.item.principal_usd)}</strong> de {dialog.state.item.owner_email} quedará <strong>cancelada</strong>. El cliente verá el motivo.</p>}
          fields={[{ name: "note", label: "Motivo", required: true, multiline: true, placeholder: "Ej.: no recibimos la transferencia en 5 días." }]}
          onConfirm={v => action.run("/api/admin/payments", { investmentId: dialog.state!.item.id, action: "reject", note: v.note })} />)}
    </AnimatePresence>
  </>;
}
