import type { Metadata } from "next";
import { redirect } from "next/navigation";
import DashboardView from "@/components/dashboard-view";
import { isDemoMode } from "@/lib/config";
import { makeDemoInvestments, type Investment } from "@/lib/finance";
import { getSupabaseServer } from "@/lib/server/supabase";

export const metadata: Metadata = { title: "Mi panel", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  if (isDemoMode) return <DashboardView demo userEmail="demo@jh-inversiones.local" investments={makeDemoInvestments()} renderedAt={Date.now()} />;
  const supabase = await getSupabaseServer();
  if (!supabase) redirect("/acceso");
  const {data: {user}} = await supabase.auth.getUser();
  if (!user) redirect("/acceso?next=%2Fdashboard");
  const {data: investments, error} = await supabase.from("investments")
    .select("id,plan_id,principal_cop,illustrative_return_pct,started_at,ends_at,status")
    .eq("user_id", user.id).order("created_at",{ascending:false});
  if (error) throw new Error("No fue posible cargar las posiciones del usuario.");
  const {data: claims} = await supabase.from("claims")
    .select("investment_id,status").eq("user_id",user.id);
  const statuses = new Map((claims||[]).map(claim=>[claim.investment_id,claim.status]));
  const positions: Investment[] = (investments||[]).map(investment=>({
    ...investment,
    principal_cop: Number(investment.principal_cop),
    illustrative_return_pct: Number(investment.illustrative_return_pct),
    claim_status: statuses.get(investment.id)||null,
  }));
  return <DashboardView demo={false} userEmail={user.email||"Usuario"} investments={positions} renderedAt={Date.now()}/>;
}
