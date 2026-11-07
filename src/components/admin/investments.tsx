"use client";
import { useState } from "react";
import Link from "next/link";
import { Ban, Download, Search, Wallet } from "lucide-react";
import { formatDate, formatUsd, PAYMENT_METHOD_LABELS, type Investment } from "@/lib/finance";
import { getPlan } from "@/lib/plans";
import { calculateEarnings, type DailyRates } from "@/lib/rates";
import { ActionDialog, AnimatePresence, ClaimBadge, Feedback, Filters, InvestmentBadge, matches, useAdminAction, useDialog } from "./ui";

type Tab = "active" | "pending_payment" | "closed" | "cancelled" | "all";

/** Tabla de inversiones; con `compact` se usa en la ficha de un cliente. */
export default function AdminInvestments({ investments, rates, renderedAt, compact = false }: { investments: Investment[]; rates: DailyRates; renderedAt: number; compact?: boolean }) {
  const action = useAdminAction();
  const dialog = useDialog<Investment>();
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
            <td>{getPlan(r.plan_id)?.name || r.plan_id}</td><td className="cell-strong">{formatUsd(r.principal_usd)}</td>
            <td>{PAYMENT_METHOD_LABELS[r.payment_method || ""] || r.payment_method}<small className="cell-sub"><code>{r.payment_reference}</code></small></td>
            <td>{r.status === "pending_payment" ? "—" : formatDate(r.started_at)}</td><td>{r.calc.daysElapsed}</td>
            <td className="gain-value">{r.status === "active" || r.status === "closed" ? `+${formatUsd(r.calc.earnings)}` : "—"}</td>
            <td>{r.status === "active" ? formatDate(r.calc.availableAt) : "—"}</td>
            <td><InvestmentBadge item={r} />{r.claim_status && <div><ClaimBadge status={r.claim_status} /></div>}{r.admin_note && <small className="cell-sub">{r.admin_note}</small>}</td>
            <td>{(r.status === "active" || r.status === "pending_payment") && <div className="table-actions"><button className="act-danger" disabled={action.busy} onClick={() => dialog.open(r)}><Ban size={14} /> Cancelar</button></div>}</td></tr>)}
        </tbody></table></div>}
    </section>
    <AnimatePresence>{dialog.state && <ActionDialog title="Cancelar inversión" tone="danger" confirmLabel="Cancelar inversión" onClose={dialog.close}
      description={<><p>La inversión de <strong>{formatUsd(dialog.state.principal_usd)}</strong> de {dialog.state.owner_email} dejará de generar ganancias y no podrá solicitar retiro.</p><p>Úsalo solo para devoluciones o errores. Si ya pagaste al cliente, usa mejor el flujo de Retiros.</p></>}
      fields={[{ name: "note", label: "Motivo", required: true, multiline: true }]}
      onConfirm={v => action.run("/api/admin/investments", { action: "cancel", investmentId: dialog.state!.id, note: v.note })} />}</AnimatePresence>
  </>;
}
