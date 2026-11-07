import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/ui";
import AdminClaims from "@/components/admin/claims";
import { calculateEarnings } from "@/lib/rates";
import { loadAdminData } from "@/lib/server/admin-data";
import { requireAdminPage } from "@/lib/server/admin-page";
import { getRates } from "@/lib/server/session";

export const metadata: Metadata = { title: "Retiros · Administración", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminClaimsPage() {
  const { session, badges } = await requireAdminPage("/admin/retiros");
  const [{ investments }, rates] = await Promise.all([loadAdminData(), getRates()]);
  const now = Date.now();
  const rows = investments.filter(i => i.claim_status)
    .map(i => ({ ...i, amount: i.claim_amount_usd ?? calculateEarnings(i, rates, now).total }))
    .sort((a, b) => Date.parse(b.claim_requested_at || "") - Date.parse(a.claim_requested_at || ""));
  return <AdminShell email={session.email} badges={badges} eyebrow="RETIROS" title="Solicitudes de retiro." subtitle="Aprueba, paga y deja constancia del comprobante de cada retiro.">
    <AdminClaims rows={rows} />
  </AdminShell>;
}
