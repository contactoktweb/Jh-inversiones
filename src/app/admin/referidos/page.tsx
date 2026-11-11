import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/ui";
import AdminReferrals, { type ReferrerSummary } from "@/components/admin/referrals";
import { loadAdminData, loadCommissions } from "@/lib/server/admin-data";
import { requireAdminPage } from "@/lib/server/admin-page";
import { getReferralPct } from "@/lib/server/referrals";

export const metadata: Metadata = { title: "Referidos · Administración", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminReferralsPage() {
  const { session, badges } = await requireAdminPage("/admin/referidos");
  const [commissions, { profiles }, pct] = await Promise.all([loadCommissions(), loadAdminData(), getReferralPct()]);
  const referrers: ReferrerSummary[] = profiles.filter(p => profiles.some(q => q.referred_by === p.id)).map(p => {
    const own = commissions.filter(c => c.referrer_id === p.id);
    const total = (status: string) => own.filter(c => c.status === status).reduce((s, c) => s + c.amount_usd, 0);
    return { id: p.id, email: p.email, name: p.full_name, code: p.referral_code, referred: profiles.filter(q => q.referred_by === p.id).length, pending: total("pending"), paid: total("paid") };
  }).sort((a, b) => b.referred - a.referred || b.pending + b.paid - (a.pending + a.paid));
  return <AdminShell email={session.email} badges={badges} eyebrow="REFERIDOS" title="Referidos." subtitle="Comisiones para quienes invitan a nuevos inversionistas con su código.">
    <AdminReferrals pct={pct} commissions={commissions} referrers={referrers} referredCount={profiles.filter(p => p.referred_by).length} />
  </AdminShell>;
}
