"use client";
import { useState } from "react";
import Link from "next/link";
import { Ban, CalendarClock, Download, Search, Wallet } from "lucide-react";
import { formatDate, formatUsd, PAYMENT_METHOD_LABELS, type Investment } from "@/lib/finance";
import { calculateEarnings, MAX_TERM_DAYS, MIN_TERM_DAYS, type DailyRates } from "@/lib/rates";
import { ActionDialog, AnimatePresence, ClaimBadge, Feedback, Filters, InvestmentBadge, matches, useAdminAction, useDialog } from "./ui";

type Tab = "active" | "pending_payment" | "closed" | "cancelled" | "all";

/** Tabla de inversiones; con `compact` se usa en la ficha de un cliente. */
export default function AdminInvestments({ investments, rates, renderedAt, compact = false }: { investments: Investment[]; rates: DailyRates; renderedAt: number; compact?: boolean }) {
  const action = useAdminAction();
  const dialog = useDialog<Investment>();
  const termDialog = useDialog<Investment & { calc: ReturnType<typeof calculateEarnings> }>();
  const [tab, setTab] = useState<Tab>(compact ? "all" : "active");
  const [query, setQuery] = useState("");
  const rows = investments.map(i => ({ ...i, calc: calculateEarnings(i, rates, renderedAt) }));
  const count = (s: string) => rows.filter(r => r.status === s).length;
  const visible = rows.filter(r => (tab === "all" || r.status === tab) && matches(query, r.owner_email, r.owner_name, r.payment_reference));
  const capital = visible.filter(r => r.status === "active").reduce((s, r) => s + r.principal_usd, 0);

  return <>
    <Feedback message={action.message} error={action.error} />
    <section className="dash-panel dash-table-panel"><div className="panel-heading"><h2>{compact ? "Inversiones" : "Todas las inversiones"}</h2><span><Wallet size={15} /> Capital activo: {formatUsd(capital)}</span></div>
      {!compact && <div className="admin-toolbar"><Filters value={tab} onChange={setTab} options={[{ value: "active", label: "Activas", count: count("active") }, { value: "pending_payment", label: "Pago pendiente", count: count("pending_payment") }, { value: "closed", label: "Cerradas", count: count("closed") }, { value: "cancelled", label: "Canceladas", count: count("cancelled") }, { value: "all", label: "Todas", count: rows.length }]} />
        <div className="admin-toolbar-right"><label className="admin-search"><Search size={15} /><input placeholder="Buscar cliente o referencia" value={query} onChange={e => setQuery(e.target.value)} /></label><a className="admin-export" href="/api/admin/export?tipo=inversiones"><Download size={14} /> CSV</a></div></div>}
      {visible.length === 0 ? <p className="chart-note">No hay inversiones con estos filtros.</p> :
        <div className="table-scroll"><table className="invest-table"><thead><tr>{!compact && <th>CLIENTE</th>}<th>PLAN</th><th>MONTO</th><th>PAGO</th><th>INICIO</th><th>DÍAS</th><th>GANANCIA</th><th>RETIRO DESDE</th><th>ESTADO</th><th></th></tr></thead><tbody>
          {visible.map(r => <tr key={r.id}>{!compact && <td>{r.user_id ? <Link className="admin-link" href={`/admin/clientes/${r.user_id}`}>{r.owner_name || r.owner_email}</Link> : r.owner_email}</td>}
            <td>{r.plan_name || r.plan_id}</td><td className="cell-strong">{formatUsd(r.principal_usd)}</td>
            <td>{PAYMENT_METHOD_LABELS[r.payment_method || ""] || r.payment_method}<small className="cell-sub"><code>{r.payment_reference}</code></small></td>
            <td>{r.status === "pending_payment" ? "—" : formatDate(r.started_at)}</td><td>{r.calc.daysElapsed}</td>
            <td className="gain-value">{r.status === "active" || r.status === "closed" ? `+${formatUsd(r.calc.earnings)}` : "—"}</td>
            <td>{r.status === "active" ? formatDate(r.calc.availableAt) : "—"}{(r.status === "active" || r.status === "pending_payment") && <small className={`cell-sub${r.calc.termDays !== MIN_TERM_DAYS ? " term-custom" : ""}`}>Plazo: {r.calc.termDays} días</small>}</td>
            <td><InvestmentBadge item={r} />{r.claim_status && <div><ClaimBadge status={r.claim_status} /></div>}{r.admin_note && <small className="cell-sub">{r.admin_note}</small>}</td>
            <td>{(r.status === "active" || r.status === "pending_payment") && <div className="table-actions">{r.claim_status !== "pending" && r.claim_status !== "approved" && <button className="act-primary" disabled={action.busy} onClick={() => termDialog.open(r)}><CalendarClock size={14} /> Plazo</button>}<button className="act-danger" disabled={action.busy} onClick={() => dialog.open(r)}><Ban size={14} /> Cancelar</button></div>}</td></tr>)}
        </tbody></table></div>}
    </section>
    <AnimatePresence>{termDialog.state && <ActionDialog title="Cambiar plazo mínimo de retiro" tone="primary" confirmLabel="Guardar plazo" onClose={termDialog.close}
      description={<><p>Inversión de <strong>{formatUsd(termDialog.state.principal_usd)}</strong> de {termDialog.state.owner_name || termDialog.state.owner_email}. Plazo actual: <strong>{termDialog.state.calc.termDays} días</strong>{termDialog.state.status === "active" ? <> (retiro desde el {formatDate(termDialog.state.calc.availableAt)})</> : <> (empezará a contar cuando confirmes el pago)</>}.</p><p>Los días se cuentan desde el inicio de la inversión. Si el nuevo plazo ya se cumplió, el cliente podrá solicitar el retiro de inmediato. El cliente recibe un correo con la nueva fecha.</p></>}
      fields={[{ name: "termDays", label: "Nuevo plazo mínimo (días)", type: "number", min: 1, max: MAX_TERM_DAYS, required: true, defaultValue: String(termDialog.state.calc.termDays), hint: `Por defecto ${MIN_TERM_DAYS} días. Entre 1 y ${MAX_TERM_DAYS}.` }, { name: "note", label: "Nota interna (opcional)" }]}
      onConfirm={v => action.run("/api/admin/investments", { action: "term", investmentId: termDialog.state!.id, termDays: Number(v.termDays), note: v.note })} />}</AnimatePresence>
    <AnimatePresence>{dialog.state && <ActionDialog title="Cancelar inversión" tone="danger" confirmLabel="Cancelar inversión" onClose={dialog.close}
      description={<><p>La inversión de <strong>{formatUsd(dialog.state.principal_usd)}</strong> de {dialog.state.owner_email} dejará de generar ganancias y no podrá solicitar retiro.</p><p>Úsalo solo para devoluciones o errores. Si ya pagaste al cliente, usa mejor el flujo de Retiros. Si generó una comisión por referido aún no pagada, se anula.</p></>}
      fields={[{ name: "note", label: "Motivo", required: true, multiline: true }]}
      onConfirm={v => action.run("/api/admin/investments", { action: "cancel", investmentId: dialog.state!.id, note: v.note })} />}</AnimatePresence>
  </>;
}
