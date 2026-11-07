"use client";
import { useState } from "react";
import { Ban, Banknote, Check, CircleCheck, Download, Search } from "lucide-react";
import { formatDate, formatUsd, type Investment } from "@/lib/finance";
import { ActionDialog, AnimatePresence, ClaimBadge, Feedback, Filters, matches, useAdminAction, useDialog } from "./ui";

type Row = Investment & { amount: number };
type Dialog = { kind: "approved" | "settled" | "rejected"; item: Row };
type Tab = "open" | "pending" | "approved" | "settled" | "rejected" | "all";

export default function AdminClaims({ rows }: { rows: Row[] }) {
  const action = useAdminAction();
  const dialog = useDialog<Dialog>();
  const [tab, setTab] = useState<Tab>("open");
  const [query, setQuery] = useState("");
  const count = (s: string) => rows.filter(r => r.claim_status === s).length;
  const visible = rows.filter(r => (tab === "all" || (tab === "open" ? r.claim_status === "pending" || r.claim_status === "approved" : r.claim_status === tab)) && matches(query, r.owner_email, r.owner_name, r.claim_payout_details));
  const owed = rows.filter(r => r.claim_status === "pending" || r.claim_status === "approved").reduce((s, r) => s + r.amount, 0);
  const send = (status: Dialog["kind"], v: Record<string, string>) => action.run("/api/admin/claims", { investmentId: dialog.state!.item.id, status, note: v.note, payoutReference: v.payoutReference });

  return <>
    <Feedback message={action.message} error={action.error} />
    <section className="dash-panel"><div className="panel-heading"><h2>Solicitudes de retiro</h2><span><Banknote size={15} /> Por pagar: {formatUsd(owed)}</span></div>
      <p className="chart-note top-note">El cliente indica dónde recibir el dinero. Haz el pago por tu banco o billetera y luego pulsa <strong>Marcar desembolsado</strong> con el número de comprobante: el cliente lo verá en su panel.</p>
      <div className="admin-toolbar"><Filters value={tab} onChange={setTab} options={[{ value: "open", label: "Por resolver", count: count("pending") + count("approved") }, { value: "pending", label: "Pendientes", count: count("pending") }, { value: "approved", label: "Aprobados", count: count("approved") }, { value: "settled", label: "Desembolsados", count: count("settled") }, { value: "rejected", label: "Rechazados", count: count("rejected") }, { value: "all", label: "Todos" }]} />
        <div className="admin-toolbar-right"><label className="admin-search"><Search size={15} /><input placeholder="Buscar cliente" value={query} onChange={e => setQuery(e.target.value)} /></label><a className="admin-export" href="/api/admin/export?tipo=retiros"><Download size={14} /> CSV</a></div></div>
      {visible.length === 0 ? <div className="empty-state"><Banknote size={32} /><h3>No hay solicitudes aquí</h3><p>Cuando un inversionista solicite su retiro aparecerá en «Por resolver».</p></div> :
        <div className="table-scroll"><table className="invest-table"><thead><tr><th>SOLICITADO</th><th>CLIENTE</th><th>CAPITAL</th><th>GANANCIAS</th><th>A PAGAR</th><th>DÓNDE PAGAR</th><th>ESTADO</th><th>ACCIONES</th></tr></thead><tbody>
          {visible.map(r => <tr key={r.id}><td>{formatDate(r.claim_requested_at || Date.now())}</td><td><span className="cell-strong">{r.owner_name || r.owner_email}</span>{r.owner_name && <small className="cell-sub">{r.owner_email}</small>}</td><td>{formatUsd(r.principal_usd)}{r.payment_method === "test" && <small className="cell-sub test-tag">Pago de prueba: no ingresó dinero</small>}</td><td className="gain-value">+{formatUsd(r.amount - r.principal_usd)}</td><td className="cell-strong">{formatUsd(r.amount)}</td><td><div className="cell-pre">{r.claim_payout_details || "—"}</div></td>
            <td><ClaimBadge status={r.claim_status!} />{r.claim_payout_reference && <small className="cell-sub">Comprobante: {r.claim_payout_reference}</small>}{r.claim_admin_note && <small className="cell-sub">Nota: {r.claim_admin_note}</small>}</td>
            <td>{(r.claim_status === "pending" || r.claim_status === "approved") ? <div className="table-actions">
              {r.claim_status === "pending" && <button className="act-primary" disabled={action.busy} onClick={() => dialog.open({ kind: "approved", item: r })}><Check size={14} /> Aprobar</button>}
              <button className="act-success" disabled={action.busy} onClick={() => dialog.open({ kind: "settled", item: r })}><CircleCheck size={14} /> Marcar desembolsado</button>
              <button className="act-danger" disabled={action.busy} onClick={() => dialog.open({ kind: "rejected", item: r })}><Ban size={14} /> Rechazar</button></div>
              : <span className="claim-done">{r.claim_status === "settled" ? `Pagado ${r.claim_resolved_at ? formatDate(r.claim_resolved_at) : ""}` : "Cerrada"}</span>}</td></tr>)}
        </tbody></table></div>}
    </section>
    <AnimatePresence>{dialog.state && (
      dialog.state.kind === "approved" ? <ActionDialog key="a" title="Aprobar retiro" confirmLabel="Aprobar" onClose={dialog.close}
        description={<p>Confirmas que el retiro de <strong>{formatUsd(dialog.state.item.amount)}</strong> de {dialog.state.item.owner_email} procede. Queda en «desembolso en proceso» hasta que marques el pago.</p>}
        fields={[{ name: "note", label: "Nota para el cliente (opcional)" }]} onConfirm={v => send("approved", v)} />
      : dialog.state.kind === "settled" ? <ActionDialog key="s" title="Marcar como desembolsado" tone="success" confirmLabel="Confirmar desembolso" onClose={dialog.close}
        description={<>{dialog.state.item.payment_method === "test" && <p className="test-warning">Atención: esta inversión se hizo con <strong>pago de prueba</strong>; nunca ingresó dinero real.</p>}<p>¿Ya pagaste <strong>{formatUsd(dialog.state.item.amount)}</strong> a {dialog.state.item.owner_email}?</p><p className="cell-pre">{dialog.state.item.claim_payout_details}</p><p>La inversión quedará cerrada.</p></>}
        fields={[{ name: "payoutReference", label: "N.º de comprobante o transacción", placeholder: "Ej.: TRX-123456" }, { name: "note", label: "Nota para el cliente (opcional)" }]} onConfirm={v => send("settled", v)} />
      : <ActionDialog key="r" title="Rechazar retiro" tone="danger" confirmLabel="Rechazar" onClose={dialog.close}
        description={<p>El cliente verá el motivo y podrá volver a solicitar el retiro. Sus ganancias vuelven a sumar.</p>}
        fields={[{ name: "note", label: "Motivo", required: true, multiline: true, placeholder: "Ej.: los datos bancarios están incompletos." }]} onConfirm={v => send("rejected", v)} />)}
    </AnimatePresence>
  </>;
}
