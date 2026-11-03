import type { Metadata } from "next";
import { redirect } from "next/navigation";
import AdminView from "@/components/admin-view";
import type { Investment } from "@/lib/finance";
import { getSupabaseAdmin } from "@/lib/server/admin";
import { attachClaims, getRates, getSession } from "@/lib/server/session";

export const metadata: Metadata = { title: "Administración", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await getSession();
  if (!session) redirect("/acceso?rol=admin&next=%2Fadmin");
  if (session.role !== "admin") redirect("/dashboard");
  const admin = getSupabaseAdmin();
  const [rates, {data: investments, error}, {data: profiles}, {data: claims}] = await Promise.all([
    getRates(),
    admin.from("investments").select("id,user_id,plan_id,principal_usd,started_at,ends_at,status,payment_method").order("created_at",{ascending:false}),
    admin.from("profiles").select("id,email"),
    admin.from("claims").select("investment_id,status,created_at,expected_amount_usd"),
  ]);
  if (error) throw new Error("No fue posible cargar las inversiones.");
  const emails = new Map((profiles||[]).map(p=>[p.id,p.email]));
  const positions: Investment[] = attachClaims((investments||[]).map(({user_id,...investment})=>({
    ...investment,
    principal_usd: Number(investment.principal_usd),
    owner_email: emails.get(user_id)||user_id,
  })), claims);
  return <AdminView adminEmail={session.email} investments={positions} rates={rates} renderedAt={Date.now()}/>;
}
