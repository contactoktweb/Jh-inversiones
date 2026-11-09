import type { Metadata } from "next";
import { redirect } from "next/navigation";
import InvestCheckout from "@/components/invest-checkout";
import { paymentMethods } from "@/lib/config";
import { MAX_INVESTMENT_USD, rateFor, todayKey } from "@/lib/rates";
import { minInvestment } from "@/lib/plans";
import { getPlans } from "@/lib/server/plans";
import { getRates, getSession, getSetting } from "@/lib/server/session";

export const metadata: Metadata = { title: "Invertir", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function InvestPage({ searchParams }: { searchParams: Promise<{ monto?: string }> }) {
  const { monto } = await searchParams;
  const plans = await getPlans();
  const minimum = minInvestment(plans);
  const parsed = Math.round(Number(monto));
  const amount = Number.isFinite(parsed) ? Math.min(MAX_INVESTMENT_USD, Math.max(minimum, parsed)) : minimum;
  const session = await getSession();
  if (!session) redirect(`/acceso?next=${encodeURIComponent(`/invertir?monto=${amount}`)}`);
  if (session.role === "admin") redirect("/admin");
  if (session.status === "suspended") redirect("/dashboard");
  const [rates, transferInstructions] = await Promise.all([getRates(), paymentMethods.includes("transfer") ? getSetting("transfer_instructions") : Promise.resolve("")]);
  return <InvestCheckout initialAmount={amount} email={session.email} todayRate={rateFor(rates, todayKey())} methods={paymentMethods} transferInstructions={transferInstructions} plans={plans} />;
}
