import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Banknote, CalendarClock, CreditCard, TrendingUp, Users, Wallet } from "lucide-react";
import { AdminShell } from "@/components/admin/ui";
import RatesPanel from "@/components/admin/rates";
import ActivityList from "@/components/admin/activity-list";
import { formatDate, formatUsd } from "@/lib/finance";
import { calculateEarnings } from "@/lib/rates";
import { loadAdminData, loadAudit } from "@/lib/server/admin-data";
import { requireAdminPage } from "@/lib/server/admin-page";
import { getRates } from "@/lib/server/session";

export const metadata: Metadata = { title: "Administración", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminHome() {
  const { session, badges } = await requireAdminPage("/admin");
  const [{ investments, profiles }, rates, audit] = await Promise.all([loadAdminData(), getRates(), loadAudit(8)]);
  const now = Date.now();
  const rows = investments.map(i => ({ ...i, calc: calculateEarnings(i, rates, now) }));
  const active = rows.filter(i => i.status === "active");
  const capital = active.reduce((s, i) => s + i.principal_usd, 0);
  const earnings = active.reduce((s, i) => s + i.calc.earnings, 0);
  const pendingPayments = rows.filter(i => i.status === "pending_payment");
  const openClaims = rows.filter(i => i.claim_status === "pending" || i.claim_status === "approved");
  const owed = openClaims.reduce((s, i) => s + (i.claim_amount_usd ?? i.calc.total), 0);
  const paidOut = rows.filter(i => i.claim_status === "settled").reduce((s, i) => s + (i.claim_amount_usd ?? 0), 0);
  const clients = profiles.filter(p => p.role === "user");
  const week = now + 7 * 86_400_000;
  const maturing = active.filter(i => !i.claim_status && i.calc.availableAt > now && i.calc.availableAt <= week).sort((a, b) => a.calc.availableAt - b.calc.availableAt);

  return <AdminShell email={session.email} badges={badges} eyebrow="PANEL DE ADMINISTRACIÓN" title="Resumen de la plataforma." subtitle="Lo que necesitas revisar hoy, en un solo lugar.">
    {pendingPayments.length > 0 && <div className="rate-alert" role="alert"><CreditCard size={18} /><span><strong>{pendingPayments.length} {pendingPayments.length === 1 ? "pago pendiente" : "pagos pendientes"}</strong> de confirmar por {formatUsd(pendingPayments.reduce((s, i) => s + i.principal_usd, 0))}.</span><Link href="/admin/pagos" className="alert-link">Revisar pagos</Link></div>}
    {openClaims.length > 0 && <div className="withdraw-alert" role="alert"><Banknote size={18} /><span><strong>{openClaims.length} {openClaims.length === 1 ? "solicitud de retiro pendiente" : "solicitudes de retiro pendientes"}</strong> de desembolso por {formatUsd(owed)}.</span><Link href="/admin/retiros">Revisar y desembolsar</Link></div>}
    <section className="metrics-grid metrics-6" aria-label="Resumen de la plataforma">
      <article className="metric-card main-metric"><div className="metric-ambient" /><div className="metric-label"><Wallet size={16} /> CAPITAL ACTIVO</div><div className="metric-value">{formatUsd(capital)}</div><div className="metric-foot">{active.length} inversiones activas</div></article>
      <article className="metric-card"><div className="metric-label"><TrendingUp size={16} /> GANANCIAS ACUMULADAS</div><div className="metric-value">{formatUsd(earnings)}</div><div className="metric-foot positive">Total adeudado: {formatUsd(capital + earnings)}</div></article>
      <article className="metric-card"><div className="metric-label"><Users size={16} /> CLIENTES</div><div className="metric-value">{clients.length}</div><div className="metric-foot">{clients.filter(c => c.status === "suspended").length} suspendidos</div></article>
      <article className="metric-card"><div className="metric-label"><CreditCard size={16} /> PAGOS POR CONFIRMAR</div><div className="metric-value">{formatUsd(pendingPayments.reduce((s, i) => s + i.principal_usd, 0))}</div><div className="metric-foot">{pendingPayments.length} transferencias</div></article>
      <article className="metric-card"><div className="metric-label"><Banknote size={16} /> RETIROS POR PAGAR</div><div className="metric-value">{formatUsd(owed)}</div><div className="metric-foot">{openClaims.length} solicitudes</div></article>
      <article className="metric-card"><div className="metric-label"><Banknote size={16} /> TOTAL DESEMBOLSADO</div><div className="metric-value">{formatUsd(paidOut)}</div><div className="metric-foot">Retiros pagados</div></article>
    </section>
    <div className="panel-gap"><RatesPanel rates={rates} prompt /></div>
    <div className="dash-body-grid">
      <section className="dash-panel"><div className="panel-heading"><h2>Cumplen el mes esta semana</h2><span><CalendarClock size={15} /> Próximos 7 días</span></div>
        {maturing.length === 0 ? <p className="chart-note">Ninguna inversión cumple el plazo mínimo en los próximos 7 días.</p> :
          <ul className="info-list">{maturing.map(i => <li key={i.id}><span>{i.owner_name || i.owner_email}<br /><small>{formatUsd(i.principal_usd)} · ganancia {formatUsd(i.calc.earnings)}</small></span><strong>{formatDate(i.calc.availableAt)}</strong></li>)}</ul>}
      </section>
      <section className="dash-panel"><div className="panel-heading"><h2>Actividad reciente</h2><Link href="/admin/actividad">Ver todo <ArrowUpRight size={15} /></Link></div><ActivityList entries={audit} /></section>
    </div>
  </AdminShell>;
}
