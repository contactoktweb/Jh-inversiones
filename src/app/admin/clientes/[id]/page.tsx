import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AdminShell } from "@/components/admin/ui";
import { ClientActions } from "@/components/admin/clients";
import AdminInvestments from "@/components/admin/investments";
import { formatDate, formatUsd } from "@/lib/finance";
import { calculateEarnings } from "@/lib/rates";
import { loadAdminData } from "@/lib/server/admin-data";
import { requireAdminPage } from "@/lib/server/admin-page";
import { getRates } from "@/lib/server/session";

export const metadata: Metadata = { title: "Cliente · Administración", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { session, badges } = await requireAdminPage(`/admin/clientes/${id}`);
  const [{ investments, profiles }, rates] = await Promise.all([loadAdminData(), getRates()]);
  const client = profiles.find(p => p.id === id);
  if (!client) notFound();
  const now = Date.now();
  const own = investments.filter(i => i.user_id === id);
  const active = own.filter(i => i.status === "active");
  const capital = active.reduce((s, i) => s + i.principal_usd, 0);
  const earnings = active.reduce((s, i) => s + calculateEarnings(i, rates, now).earnings, 0);
  const paid = own.filter(i => i.claim_status === "settled").reduce((s, i) => s + (i.claim_amount_usd ?? 0), 0);
  return <AdminShell email={session.email} badges={badges} eyebrow="FICHA DEL CLIENTE" title={client.full_name || client.email} subtitle={<Link className="admin-link" href="/admin/clientes"><ArrowLeft size={14} /> Volver a clientes</Link>}>
    <div className="dash-body-grid">
      <section className="dash-panel"><div className="panel-heading"><h2>Datos</h2><span className={`badge-status ${client.status === "suspended" ? "claim-rejected" : "mature"}`}><i />{client.status === "suspended" ? "SUSPENDIDA" : client.role === "admin" ? "ADMINISTRADOR" : "ACTIVA"}</span></div>
        <ul className="info-list">
          <li><span>Correo</span><strong>{client.email}</strong></li>
          <li><span>Nombre</span><strong>{client.full_name || "—"}</strong></li>
          <li><span>Teléfono</span><strong>{client.phone || "—"}</strong></li>
          <li><span>País</span><strong>{client.country || "—"}</strong></li>
          <li><span>Registro</span><strong>{formatDate(client.created_at)}</strong></li>
          <li><span>Datos para retiros</span><strong>{client.payout_details || "—"}</strong></li>
        </ul>
      </section>
      <section className="dash-panel"><div className="panel-heading"><h2>Resumen</h2></div>
        <ul className="info-list">
          <li><span>Capital activo</span><strong>{formatUsd(capital)}</strong></li>
          <li><span>Ganancias acumuladas</span><strong>{formatUsd(earnings)}</strong></li>
          <li><span>Total retirado</span><strong>{formatUsd(paid)}</strong></li>
          <li><span>Inversiones</span><strong>{own.length}</strong></li>
        </ul>
        <div className="panel-gap"><ClientActions client={client} isSelf={client.id === session.userId} /></div>
      </section>
    </div>
    <div className="panel-gap"><AdminInvestments investments={own} rates={rates} renderedAt={now} compact /></div>
  </AdminShell>;
}
