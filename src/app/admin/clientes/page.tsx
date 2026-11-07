import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/ui";
import { ClientsTable } from "@/components/admin/clients";
import { calculateEarnings } from "@/lib/rates";
import { loadAdminData } from "@/lib/server/admin-data";
import { requireAdminPage } from "@/lib/server/admin-page";
import { getRates } from "@/lib/server/session";

export const metadata: Metadata = { title: "Clientes · Administración", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminClientsPage() {
  const { session, badges } = await requireAdminPage("/admin/clientes");
  const [{ investments, profiles }, rates] = await Promise.all([loadAdminData(), getRates()]);
  const now = Date.now();
  const clients = profiles.map(p => {
    const own = investments.filter(i => i.user_id === p.id);
    const active = own.filter(i => i.status === "active");
    return { ...p, activeCount: active.length, capital: active.reduce((s, i) => s + i.principal_usd, 0), earnings: active.reduce((s, i) => s + calculateEarnings(i, rates, now).earnings, 0), pendingPayments: own.filter(i => i.status === "pending_payment").length, openClaims: own.filter(i => i.claim_status === "pending" || i.claim_status === "approved").length };
  });
  return <AdminShell email={session.email} badges={badges} eyebrow="CLIENTES" title="Clientes." subtitle="Cuentas registradas, sus datos de contacto y su capital.">
    <ClientsTable clients={clients} />
  </AdminShell>;
}
