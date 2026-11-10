import type { Metadata } from "next";
import { Download } from "lucide-react";
import { AdminShell } from "@/components/admin/ui";
import TransferSettings from "@/components/admin/settings";
import { contact } from "@/lib/brand";
import { paymentMethods, paymentsApproved } from "@/lib/config";
import { PAYMENT_METHOD_LABELS } from "@/lib/finance";
import { DEFAULT_DAILY_RATE_PCT, MAX_INVESTMENT_USD, MIN_TERM_DAYS } from "@/lib/rates";
import { minInvestment } from "@/lib/plans";
import { getPlans } from "@/lib/server/plans";
import { requireAdminPage } from "@/lib/server/admin-page";
import { emailEnabled } from "@/lib/server/notify";
import { getSetting, getTransferImageUrl } from "@/lib/server/session";

export const metadata: Metadata = { title: "Ajustes · Administración", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const { session, badges } = await requireAdminPage("/admin/ajustes");
  const [transfer, transferImage, plans] = await Promise.all([getSetting("transfer_instructions"), getTransferImageUrl(), getPlans()]);
  const adminEmails = (process.env.ADMIN_EMAILS || "").split(",").map(e => e.trim()).filter(Boolean);
  return <AdminShell email={session.email} badges={badges} eyebrow="AJUSTES" title="Ajustes." subtitle="Datos de pago y configuración actual de la plataforma.">
    <div className="dash-body-grid">
      <section className="dash-panel"><div className="panel-heading"><h2>Datos para transferencias</h2></div><TransferSettings initial={transfer} initialImage={transferImage} /></section>
      <section className="dash-panel"><div className="panel-heading"><h2>Configuración actual</h2><span>Solo lectura</span></div>
        <ul className="info-list">
          <li><span>Métodos de pago activos</span><strong>{paymentMethods.map(m => PAYMENT_METHOD_LABELS[m]).join(", ")}</strong></li>
          <li><span>Pasarela con tarjeta</span><strong>{paymentMethods.includes("stripe") && paymentsApproved ? "Activa" : "Pendiente (última fase)"}</strong></li>
          <li><span>Correos de aviso</span><strong>{emailEnabled() ? "Activos" : "No configurados"}</strong></li>
          <li><span>Correo que recibe los avisos</span><strong>{process.env.ADMIN_NOTIFICATION_EMAIL || "—"}</strong></li>
          <li><span>Administradores principales</span><strong>{adminEmails.join(", ") || "—"}</strong></li>
          <li><span>Contacto público</span><strong>{[contact.email, contact.whatsappLabel].filter(Boolean).join(" · ") || "—"}</strong></li>
          <li><span>Inversión mínima (según Planes) / máxima</span><strong>${minInvestment(plans)} / ${MAX_INVESTMENT_USD.toLocaleString("en-US")} USD</strong></li>
          <li><span>Plazo mínimo</span><strong>{MIN_TERM_DAYS} días</strong></li>
          <li><span>Tasa diaria por defecto</span><strong>{DEFAULT_DAILY_RATE_PCT}%</strong></li>
        </ul>
        <p className="chart-note">Estos valores forman parte de la configuración de la plataforma. Si necesitas cambiar alguno, pídeselo a tu soporte técnico.</p>
      </section>
    </div>
    <section className="dash-panel panel-gap"><div className="panel-heading"><h2>Exportar datos</h2><span>Archivos CSV para Excel o Google Sheets</span></div>
      <div className="table-actions export-row">{[["inversiones", "Inversiones"], ["retiros", "Retiros"], ["clientes", "Clientes"], ["actividad", "Actividad"]].map(([type, label]) => <a key={type} className="admin-export" href={`/api/admin/export?tipo=${type}`}><Download size={14} /> {label}</a>)}</div>
    </section>
  </AdminShell>;
}
