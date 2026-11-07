import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/ui";
import AdminInvestments from "@/components/admin/investments";
import { loadAdminData } from "@/lib/server/admin-data";
import { requireAdminPage } from "@/lib/server/admin-page";
import { getRates } from "@/lib/server/session";

export const metadata: Metadata = { title: "Inversiones · Administración", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminInvestmentsPage() {
  const { session, badges } = await requireAdminPage("/admin/inversiones");
  const [{ investments }, rates] = await Promise.all([loadAdminData(), getRates()]);
  return <AdminShell email={session.email} badges={badges} eyebrow="INVERSIONES" title="Inversiones." subtitle="Estado, ganancias y fechas de todas las inversiones de la plataforma.">
    <AdminInvestments investments={investments} rates={rates} renderedAt={Date.now()} />
  </AdminShell>;
}
