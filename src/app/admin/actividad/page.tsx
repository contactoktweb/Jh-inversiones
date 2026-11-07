import type { Metadata } from "next";
import { Download } from "lucide-react";
import { AdminShell } from "@/components/admin/ui";
import ActivityList from "@/components/admin/activity-list";
import { loadAudit } from "@/lib/server/admin-data";
import { requireAdminPage } from "@/lib/server/admin-page";

export const metadata: Metadata = { title: "Actividad · Administración", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminActivityPage() {
  const { session, badges } = await requireAdminPage("/admin/actividad");
  const audit = await loadAudit(300);
  return <AdminShell email={session.email} badges={badges} eyebrow="REGISTRO DE ACTIVIDAD" title="Actividad." subtitle="Cada acción administrativa queda registrada con quién la hizo y cuándo. No se puede editar ni borrar desde el panel.">
    <section className="dash-panel"><div className="panel-heading"><h2>Últimas {audit.length} acciones</h2><a className="admin-export" href="/api/admin/export?tipo=actividad"><Download size={14} /> Exportar CSV</a></div><ActivityList entries={audit} /></section>
  </AdminShell>;
}
