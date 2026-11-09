import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/ui";
import AdminPlans from "@/components/admin/plans";
import { getSupabaseAdmin } from "@/lib/server/admin";
import { requireAdminPage } from "@/lib/server/admin-page";
import { getPlans } from "@/lib/server/plans";

export const metadata: Metadata = { title: "Planes · Administración", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminPlansPage() {
  const { session, badges } = await requireAdminPage("/admin/planes");
  const [plans, { data: rows }] = await Promise.all([getPlans(), getSupabaseAdmin().from("investments").select("plan_id")]);
  const usage: Record<string, number> = {};
  for (const r of rows || []) usage[r.plan_id] = (usage[r.plan_id] || 0) + 1;
  return <AdminShell email={session.email} badges={badges} eyebrow="PLANES" title="Planes." subtitle="Crea, edita, ordena u oculta los planes que se muestran en la página de inicio.">
    <AdminPlans plans={plans} usage={usage} />
  </AdminShell>;
}
