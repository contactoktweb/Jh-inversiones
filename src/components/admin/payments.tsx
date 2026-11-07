"use client";
import { useState } from "react";
import { Ban, CircleCheck, Download, Plus, Search } from "lucide-react";
import { formatDate, formatDateTime, formatUsd, PAYMENT_METHOD_LABELS, type Investment } from "@/lib/finance";
import { MIN_INVESTMENT_USD } from "@/lib/rates";
import { ActionDialog, AnimatePresence, Feedback, Filters, InvestmentBadge, matches, useAdminAction, useDialog } from "./ui";

type Dialog = { kind: "confirm" | "reject"; item: Investment };

export default function AdminPayments({ investments, clientEmails }: { investments: Investment[]; clientEmails: string[] }) {
  const action = useAdminAction();
  const manual = useAdminAction();
  const dialog = useDialog<Dialog>();
  const [method, setMethod] = useState<"all" | "test" | "transfer" | "manual" | "stripe">("all");
  const [query, setQuery] = useState("");
  const [form, setForm] = useState({ email: "", amount: "", reference: "", startedAt: "", note: "" });
  const pending = investments.filter(i => i.status === "pending_payment");
  const history = investments.filter(i => i.status !== "pending_payment" && (method === "all" || i.payment_method === method) && matches(query, i.owner_email, i.owner_name, i.payment_reference));
  const count = (m: string) => investments.filter(i => i.status !== "pending_payment" && i.payment_method === m).length;

  return <>
    <Feedback message={action.message} error={action.error} />
    <section className="dash-panel" id="pendientes"><div className="panel-heading"><h2>Transferencias por confirmar</h2><span>{pending.length} pendientes · {formatUsd(pending.reduce((s, i) => s + i.principal_usd, 0))}</span></div>
      <p className="chart-note top-note">Cuando veas el dinero en tu cuenta bancaria con la referencia indicada, pulsa <strong>Confirmar pago</strong>: la inversión se activa y empieza a ganar desde ese momento.</p>
      {pending.length === 0 ? <div className="empty-state"><CircleCheck size={32} /><h3>No hay pagos pendientes</h3><p>Las inversiones registradas por transferencia aparecerán aquí.</p></div> :
        <div className="table-scroll"><table className="invest-table"><thead><tr><th>REGISTRADA</th><th>CLIENTE</th><th>MONTO</th><th>REFERENCIA</th><th>ACCIONES</th></tr></thead><tbody>
          {pending.map(i => <tr key={i.id}><td>{formatDateTime(i.created_at || i.started_at)}</td><td><span className="cell-strong">{i.owner_name || i.owner_email}</span>{i.owner_name && <small className="cell-sub">{i.owner_email}</small>}</td><td className="cell-strong">{formatUsd(i.principal_usd)}</td><td><code>{i.payment_reference}</code></td>
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

    <AnimatePresence>{dialog.state && (dialog.state.kind === "confirm"
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
