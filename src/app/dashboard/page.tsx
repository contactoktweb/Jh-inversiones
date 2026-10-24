import type { Metadata } from "next";
import { redirect } from "next/navigation";
import DashboardView from "@/components/dashboard-view";
import { makeDemoInvestments, type Investment } from "@/lib/finance";
import { getSupabaseServer } from "@/lib/server/supabase";
import { getRates, getSession } from "@/lib/server/session";

export const metadata: Metadata = { title: "Mi panel", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/acceso?next=%2Fdashboard");
  if (session.role === "admin") redirect("/admin");
  const rates = await getRates(session);
  if (session.kind === "demo") return <DashboardView demo userEmail={session.email} investments={makeDemoInvestments()} rates={rates} renderedAt={Date.now()} />;
  const supabase = await getSupabaseServer();
  if (!supabase) redirect("/acceso");
  const {data: investments, error} = await supabase.from("investments")
    .select("id,plan_id,principal_usd,started_at,ends_at,status")
    .eq("user_id", session.userId).order("created_at",{ascending:false});
  if (error) throw new Error("No fue posible cargar las inversiones del usuario.");
  const {data: claims} = await supabase.from("claims")
    .select("investment_id,status").eq("user_id",session.userId);
  const statuses = new Map((claims||[]).map(claim=>[claim.investment_id,claim.status]));
  const positions: Investment[] = (investments||[]).map(investment=>({
    ...investment,
    principal_usd: Number(investment.principal_usd),
    claim_status: statuses.get(investment.id)||null,
  }));
  return <DashboardView demo={false} userEmail={session.email} investments={positions} rates={rates} renderedAt={Date.now()}/>;
}
