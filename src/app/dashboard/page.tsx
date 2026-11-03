import type { Metadata } from "next";
import { redirect } from "next/navigation";
import DashboardView from "@/components/dashboard-view";
import type { Investment } from "@/lib/finance";
import { getSupabaseServer } from "@/lib/server/supabase";
import { attachClaims, getRates, getSession } from "@/lib/server/session";

export const metadata: Metadata = { title: "Mi panel", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/acceso?next=%2Fdashboard");
  if (session.role === "admin") redirect("/admin");
  const supabase = (await getSupabaseServer())!;
  const [rates, {data: investments, error}, {data: claims}] = await Promise.all([
    getRates(),
    supabase.from("investments").select("id,plan_id,principal_usd,started_at,ends_at,status,payment_method")
      .eq("user_id", session.userId).order("created_at",{ascending:false}),
    supabase.from("claims").select("investment_id,status,created_at,expected_amount_usd").eq("user_id",session.userId),
  ]);
  if (error) throw new Error("No fue posible cargar las inversiones del usuario.");
  const positions: Investment[] = attachClaims((investments||[]).map(investment=>({...investment, principal_usd: Number(investment.principal_usd)})), claims);
  return <DashboardView userEmail={session.email} investments={positions} rates={rates} renderedAt={Date.now()}/>;
}
