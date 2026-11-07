import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/ui";
import AdminPayments from "@/components/admin/payments";
import { loadAdminData } from "@/lib/server/admin-data";
import { requireAdminPage } from "@/lib/server/admin-page";

export const metadata: Metadata = { title: "Pagos · Administración", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminPaymentsPage() {
  const { session, badges } = await requireAdminPage("/admin/pagos");
  const { investments, profiles } = await loadAdminData();
  return <AdminShell email={session.email} badges={badges} eyebrow="PAGOS" title="Pagos de inversiones." subtitle="Confirma transferencias, registra pagos manuales y consulta el historial.">
    <AdminPayments investments={investments} clientEmails={profiles.filter(p => p.role === "user").map(p => p.email)} />
  </AdminShell>;
}
