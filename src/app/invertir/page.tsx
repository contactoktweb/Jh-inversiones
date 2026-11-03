import type { Metadata } from "next";
import { redirect } from "next/navigation";
import InvestCheckout from "@/components/invest-checkout";
import { paymentMode } from "@/lib/config";
import { MAX_INVESTMENT_USD, MIN_INVESTMENT_USD, rateFor, todayKey } from "@/lib/rates";
import { getRates, getSession } from "@/lib/server/session";

export const metadata: Metadata = { title: "Invertir", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function InvestPage({ searchParams }: { searchParams: Promise<{ monto?: string }> }) {
  const { monto } = await searchParams;
  const parsed = Math.round(Number(monto));
  const amount = Number.isFinite(parsed) ? Math.min(MAX_INVESTMENT_USD, Math.max(MIN_INVESTMENT_USD, parsed)) : MIN_INVESTMENT_USD;
  const session = await getSession();
  if (!session) redirect(`/acceso?next=${encodeURIComponent(`/invertir?monto=${amount}`)}`);
  if (session.role === "admin") redirect("/admin");
  const rates = await getRates();
  return <InvestCheckout initialAmount={amount} email={session.email} todayRate={rateFor(rates, todayKey())} testMode={paymentMode === "test"} />;
}
