import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/ui";
import RatesPanel from "@/components/admin/rates";
import { requireAdminPage } from "@/lib/server/admin-page";
import { getRates } from "@/lib/server/session";

export const metadata: Metadata = { title: "Ganancia diaria · Administración", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminRatesPage() {
  const { session, badges } = await requireAdminPage("/admin/tasas");
  const rates = await getRates();
  return <AdminShell email={session.email} badges={badges} eyebrow="GANANCIA DIARIA" title="Tasa del día." subtitle="Fija cada día el porcentaje de ganancia. Puedes corregir días anteriores desde el historial.">
    <RatesPanel rates={rates} historyDays={60} prompt />
  </AdminShell>;
}
