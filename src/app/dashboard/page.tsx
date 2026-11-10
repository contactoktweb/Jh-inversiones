import type { Metadata } from "next";
import { redirect } from "next/navigation";
import DashboardView from "@/components/dashboard-view";
import type { Investment } from "@/lib/finance";
import { getSupabaseServer } from "@/lib/server/supabase";
import { attachClaims, CLAIM_COLUMNS, getRates, getSession, getTransferImageUrl, type ClaimRow } from "@/lib/server/session";

export const metadata: Metadata = { title: "Mi panel", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/acceso?next=%2Fdashboard");
  if (session.role === "admin") redirect("/admin");
  const supabase = (await getSupabaseServer())!;
  const [rates, {data: investments, error}, {data: claims}, {data: profile}, {data: setting}, transferImage] = await Promise.all([
    getRates(),
    supabase.from("investments").select("id,plan_id,principal_usd,started_at,ends_at,status,payment_method,payment_reference,created_at,admin_note,payment_reported_at,plan:plans(name)")
      .eq("user_id", session.userId).order("created_at",{ascending:false}),
    supabase.from("claims").select(CLAIM_COLUMNS).eq("user_id",session.userId),
    supabase.from("profiles").select("payout_details").eq("id",session.userId).maybeSingle(),
    supabase.from("settings").select("value").eq("key","transfer_instructions").maybeSingle(),
    getTransferImageUrl(),
  ]);
  if (error) throw new Error("No fue posible cargar las inversiones del usuario.");
  const positions: Investment[] = attachClaims((investments||[]).map(({plan,...investment})=>({...investment, plan_name:(plan as unknown as {name:string}|null)?.name||investment.plan_id, principal_usd: Number(investment.principal_usd)})), claims as ClaimRow[] | null);
  return <DashboardView userEmail={session.email} fullName={session.fullName} payoutDetails={profile?.payout_details||""} transferInstructions={setting?.value||""} transferImage={transferImage} suspended={session.status==="suspended"} investments={positions} rates={rates} renderedAt={Date.now()}/>;
}
