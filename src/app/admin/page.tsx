import type { Metadata } from "next";
import { redirect } from "next/navigation";
import AdminView from "@/components/admin-view";
import { makeDemoAdminInvestments, type Investment } from "@/lib/finance";
import { getSupabaseAdmin } from "@/lib/server/admin";
import { getRates, getSession } from "@/lib/server/session";

export const metadata: Metadata = { title: "Administración", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await getSession();
  if (!session) redirect("/acceso?rol=admin");
  if (session.role !== "admin") redirect("/dashboard");
  const rates = await getRates(session);
  if (session.kind === "demo") return <AdminView demo adminEmail={session.email} investments={makeDemoAdminInvestments()} rates={rates} renderedAt={Date.now()} />;
  const admin = getSupabaseAdmin();
  const [{data: investments, error}, {data: profiles}] = await Promise.all([
    admin.from("investments").select("id,user_id,plan_id,principal_usd,started_at,ends_at,status").order("created_at",{ascending:false}),
    admin.from("profiles").select("id,email"),
  ]);
  if (error) throw new Error("No fue posible cargar las inversiones.");
  const emails = new Map((profiles||[]).map(p=>[p.id,p.email]));
  const positions: Investment[] = (investments||[]).map(({user_id,...investment})=>({
    ...investment,
    principal_usd: Number(investment.principal_usd),
    owner_email: emails.get(user_id)||user_id,
  }));
  return <AdminView demo={false} adminEmail={session.email} investments={positions} rates={rates} renderedAt={Date.now()}/>;
}
