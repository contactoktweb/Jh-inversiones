import type { Metadata } from "next";
import { redirect } from "next/navigation";
import AccountView from "@/components/account-view";
import { getSupabaseServer } from "@/lib/server/supabase";
import { getSession } from "@/lib/server/session";

export const metadata: Metadata = { title: "Mi cuenta", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const session = await getSession();
  if (!session) redirect("/acceso?next=%2Fcuenta");
  if (session.role === "admin") redirect("/admin");
  const supabase = (await getSupabaseServer())!;
  const { data: profile } = await supabase.from("profiles").select("full_name,phone,country,payout_details,created_at").eq("id", session.userId).maybeSingle();
  return <AccountView email={session.email} suspended={session.status === "suspended"} profile={{ fullName: profile?.full_name || "", phone: profile?.phone || "", country: profile?.country || "", payoutDetails: profile?.payout_details || "" }} memberSince={profile?.created_at || null} />;
}
