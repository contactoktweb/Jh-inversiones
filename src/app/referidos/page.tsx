import type { Metadata } from "next";
import { redirect } from "next/navigation";
import ReferralsView, { type ReferralCommission, type ReferredPerson } from "@/components/referrals-view";
import { siteUrl } from "@/lib/config";
import { referralDisplayName } from "@/lib/referrals";
import { getSupabaseAdmin } from "@/lib/server/admin";
import { getReferralPct } from "@/lib/server/referrals";
import { getSession } from "@/lib/server/session";

export const metadata: Metadata = { title: "Referidos", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function ReferralsPage() {
  const session = await getSession();
  if (!session) redirect("/acceso?next=%2Freferidos");
  if (session.role === "admin") redirect("/admin/referidos");
  const admin = getSupabaseAdmin();
  const [{ data: me }, { data: referred }, { data: commissions }, pct] = await Promise.all([
    admin.from("profiles").select("referral_code").eq("id", session.userId).single(),
    admin.from("profiles").select("id,email,full_name,created_at").eq("referred_by", session.userId).order("created_at", { ascending: false }),
    admin.from("referral_commissions").select("id,referred_id,base_usd,rate_pct,amount_usd,status,created_at,resolved_at,payout_reference,admin_note").eq("referrer_id", session.userId).order("created_at", { ascending: false }),
    getReferralPct(),
  ]);
  // A quien refirió solo se le muestra un nombre corto (sin datos de contacto completos).
  const names = new Map((referred || []).map(p => [p.id, referralDisplayName(p.full_name, p.email)]));
  const invested = new Set((commissions || []).filter(c => c.status !== "cancelled").map(c => c.referred_id));
  const people: ReferredPerson[] = (referred || []).map(p => ({ id: p.id, name: names.get(p.id)!, joinedAt: p.created_at, invested: invested.has(p.id) }));
  const rows: ReferralCommission[] = (commissions || []).map(c => ({
    id: c.id, referredName: names.get(c.referred_id) || "—", baseUsd: Number(c.base_usd), ratePct: Number(c.rate_pct), amountUsd: Number(c.amount_usd),
    status: c.status, createdAt: c.created_at, resolvedAt: c.resolved_at, payoutReference: c.payout_reference, note: c.admin_note,
  }));
  const origin = process.env.NEXT_PUBLIC_SITE_URL ? siteUrl : "";
  return <ReferralsView email={session.email} code={me?.referral_code || ""} siteOrigin={origin} pct={pct} people={people} commissions={rows} />;
}
