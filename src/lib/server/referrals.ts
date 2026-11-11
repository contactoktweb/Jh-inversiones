import "server-only";
import { getSupabaseAdmin } from "./admin";
import { escapeHtml, sendEmail } from "./notify";
import { formatUsd } from "@/lib/finance";
import { DEFAULT_REFERRAL_PCT, normalizeReferralCode, referralAmount } from "@/lib/referrals";

/**
 * Programa de referidos.
 * - Cada cuenta tiene un código (profiles.referral_code). Quien se registra con un código queda
 *   vinculado a esa persona (profiles.referred_by).
 * - Cada inversión confirmada de una persona referida genera una comisión para quien la refirió:
 *   porcentaje fijado en /admin/referidos × monto invertido. La administración la paga y la marca como pagada.
 */

/** Cuenta dueña de un código; solo cuentas de inversionista pueden referir. */
export async function findReferrer(code: unknown) {
  const normalized = normalizeReferralCode(code);
  if (!normalized) return null;
  const { data } = await getSupabaseAdmin().from("profiles").select("id,email,full_name,role,referral_code").eq("referral_code", normalized).maybeSingle();
  return data && data.role === "user" ? data : null;
}

/** Porcentaje de comisión vigente (0 = programa pausado). */
export async function getReferralPct() {
  const { data } = await getSupabaseAdmin().from("settings").select("value").eq("key", "referral_commission_pct").maybeSingle();
  const pct = data ? Number(data.value) : DEFAULT_REFERRAL_PCT;
  return Number.isFinite(pct) && pct >= 0 && pct <= 100 ? pct : DEFAULT_REFERRAL_PCT;
}

/** Vincula una cuenta con quien la refirió. */
export async function linkReferral(userId: string, referrerId: string) {
  if (userId === referrerId) return;
  await getSupabaseAdmin().from("profiles").update({ referred_by: referrerId, referred_at: new Date().toISOString() }).eq("id", userId);
}

/**
 * Crea la comisión de una inversión recién activada (pago confirmado o registro manual).
 * No hace nada si quien invirtió no fue referido, si el programa está pausado o si es un pago de prueba.
 * Nunca interrumpe la operación principal si falla.
 */
export async function createReferralCommission(investmentId: string) {
  try {
    const admin = getSupabaseAdmin();
    const { data: investment } = await admin.from("investments").select("id,user_id,principal_usd,payment_method,status,payment_reference").eq("id", investmentId).maybeSingle();
    if (!investment || investment.status !== "active" || investment.payment_method === "test") return null;
    const { data: investor } = await admin.from("profiles").select("email,full_name,referred_by").eq("id", investment.user_id).maybeSingle();
    if (!investor?.referred_by) return null;
    const pct = await getReferralPct();
    const base = Number(investment.principal_usd);
    const amount = referralAmount(base, pct);
    if (amount <= 0) return null;
    const { data: created, error } = await admin.from("referral_commissions").insert({
      referrer_id: investor.referred_by, referred_id: investment.user_id, investment_id: investment.id,
      base_usd: base, rate_pct: pct, amount_usd: amount, status: "pending",
    }).select("id").maybeSingle();
    if (error) { if (error.code !== "23505") throw error; return null; }
    const { data: referrer } = await admin.from("profiles").select("email").eq("id", investor.referred_by).maybeSingle();
    await sendEmail(referrer?.email || "", `Ganaste una comisión de ${formatUsd(amount)}`, [
      `<strong>${escapeHtml(investor.full_name || investor.email)}</strong>, a quien invitaste con tu código, hizo una inversión de <strong>${formatUsd(base)}</strong>.`,
      `Tu comisión del ${pct}% es de <strong>${formatUsd(amount)}</strong>. La administración te la pagará a los datos de pago de «Mi cuenta».`,
    ], { label: "Ver mis referidos", path: "/referidos" });
    return created?.id as string | undefined ?? null;
  } catch (e) {
    console.error("referral_commission_error", e instanceof Error ? e.message : e);
    return null;
  }
}

/** Anula la comisión pendiente de una inversión cancelada. */
export async function cancelReferralCommission(investmentId: string, note: string) {
  await getSupabaseAdmin().from("referral_commissions")
    .update({ status: "cancelled", resolved_at: new Date().toISOString(), admin_note: note })
    .eq("investment_id", investmentId).eq("status", "pending");
}
