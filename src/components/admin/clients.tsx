"use client";
import { useState } from "react";
import Link from "next/link";
import { Download, Search, ShieldCheck, ShieldOff, UserCheck, UserX, Users } from "lucide-react";
import { formatDate, formatUsd } from "@/lib/finance";
import type { ClientProfile } from "@/lib/server/admin-data";
import { ActionDialog, AnimatePresence, Feedback, Filters, matches, useAdminAction, useDialog } from "./ui";

export type ClientRow = ClientProfile & { activeCount: number; capital: number; earnings: number; pendingPayments: number; openClaims: number };
type Tab = "user" | "suspended" | "admin" | "all";

export function ClientsTable({ clients }: { clients: ClientRow[] }) {
  const [tab, setTab] = useState<Tab>("user");
  const [query, setQuery] = useState("");
  const visible = clients.filter(c => (tab === "all" || (tab === "suspended" ? c.status === "suspended" : c.role === tab)) && matches(query, c.email, c.full_name, c.phone, c.country));
  return <section className="dash-panel dash-table-panel"><div className="panel-heading"><h2>Clientes</h2><span><Users size={15} /> {clients.filter(c => c.role === "user").length} inversionistas</span></div>
    <div className="admin-toolbar"><Filters value={tab} onChange={setTab} options={[{ value: "user", label: "Inversionistas", count: clients.filter(c => c.role === "user").length }, { value: "suspended", label: "Suspendidos", count: clients.filter(c => c.status === "suspended").length }, { value: "admin", label: "Administradores", count: clients.filter(c => c.role === "admin").length }, { value: "all", label: "Todos" }]} />
      <div className="admin-toolbar-right"><label className="admin-search"><Search size={15} /><input placeholder="Nombre, correo, teléfono…" value={query} onChange={e => setQuery(e.target.value)} /></label><a className="admin-export" href="/api/admin/export?tipo=clientes"><Download size={14} /> CSV</a></div></div>
    {visible.length === 0 ? <p className="chart-note">No hay cuentas con estos filtros.</p> :
      <div className="table-scroll"><table className="invest-table"><thead><tr><th>CLIENTE</th><th>CONTACTO</th><th>REGISTRO</th><th>ACTIVAS</th><th>CAPITAL</th><th>GANANCIA</th><th>PENDIENTES</th><th>ESTADO</th></tr></thead><tbody>
        {visible.map(c => <tr key={c.id}><td><Link className="admin-link" href={`/admin/clientes/${c.id}`}>{c.full_name || c.email}</Link>{c.full_name && <small className="cell-sub">{c.email}</small>}</td>
          <td>{c.phone || "—"}{c.country && <small className="cell-sub">{c.country}</small>}</td><td>{formatDate(c.created_at)}</td><td>{c.activeCount}</td>
          <td className="cell-strong">{formatUsd(c.capital)}</td><td className="gain-value">+{formatUsd(c.earnings)}</td>
          <td>{c.pendingPayments || c.openClaims ? <small>{c.pendingPayments ? `${c.pendingPayments} pago(s) ` : ""}{c.openClaims ? `${c.openClaims} retiro(s)` : ""}</small> : "—"}</td>
          <td><span className={`badge-status ${c.status === "suspended" ? "claim-rejected" : c.role === "admin" ? "claim-approved" : "mature"}`}><i />{c.status === "suspended" ? "SUSPENDIDA" : c.role === "admin" ? "ADMIN" : "ACTIVA"}</span></td></tr>)}
      </tbody></table></div>}
  </section>;
}

type UserAction = "suspend" | "activate" | "make_admin" | "remove_admin";
const DIALOG: Record<UserAction, { title: string; text: string; label: string; tone: "primary" | "danger" | "success" }> = {
  suspend: { title: "Suspender cuenta", text: "El cliente podrá entrar y ver su panel, pero no podrá invertir ni solicitar retiros hasta que lo reactives.", label: "Suspender", tone: "danger" },
  activate: { title: "Reactivar cuenta", text: "El cliente podrá volver a invertir y solicitar retiros.", label: "Reactivar", tone: "success" },
  make_admin: { title: "Dar rol de administrador", text: "Tendrá acceso completo a este panel: tasas, pagos, retiros y clientes.", label: "Hacer administrador", tone: "primary" },
  remove_admin: { title: "Quitar rol de administrador", text: "Volverá a ser una cuenta de inversionista. (Si es uno de los administradores principales de la plataforma, seguirá siéndolo.)", label: "Quitar rol", tone: "danger" },
};

export function ClientActions({ client, isSelf }: { client: ClientProfile; isSelf: boolean }) {
  const action = useAdminAction();
  const dialog = useDialog<UserAction>();
  if (isSelf) return <p className="chart-note">Esta es tu propia cuenta.</p>;
  return <>
    <div className="table-actions">
      {client.status === "active" ? <button className="act-danger" onClick={() => dialog.open("suspend")}><UserX size={14} /> Suspender</button> : <button className="act-success" onClick={() => dialog.open("activate")}><UserCheck size={14} /> Reactivar</button>}
      {client.role === "user" ? <button className="act-primary" onClick={() => dialog.open("make_admin")}><ShieldCheck size={14} /> Hacer administrador</button> : <button className="act-danger" onClick={() => dialog.open("remove_admin")}><ShieldOff size={14} /> Quitar administrador</button>}
    </div>
    <Feedback message={action.message} error={action.error} />
    <AnimatePresence>{dialog.state && <ActionDialog title={DIALOG[dialog.state].title} tone={DIALOG[dialog.state].tone} confirmLabel={DIALOG[dialog.state].label} onClose={dialog.close}
      description={<p><strong>{client.email}</strong>: {DIALOG[dialog.state].text}</p>}
      onConfirm={() => action.run("/api/admin/users", { userId: client.id, action: dialog.state })} />}</AnimatePresence>
  </>;
}
