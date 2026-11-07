import "server-only";
import { randomBytes, randomUUID } from "node:crypto";
import Stripe from "stripe";
import { getSupabaseAdmin } from "./admin";
import type { Session } from "./session";
import { formatUsd } from "@/lib/finance";
import { planForAmount } from "@/lib/plans";
import { MIN_TERM_DAYS } from "@/lib/rates";
import { paymentsApproved, siteUrl, type PaymentMethod } from "@/lib/config";

/**
 * Módulo de pagos. Cada método crea la inversión de una forma distinta:
 *  - test      → inversión ACTIVA al instante («Pago de prueba aceptado»), sin cobro.
 *  - transfer  → inversión en PAGO PENDIENTE con un código de referencia; el administrador
 *                la activa en /admin/pagos cuando ve el dinero en su cuenta.
 *  - stripe    → FASE PENDIENTE: redirige a la pasarela; el webhook firmado crea la inversión.
 * Para conectar otra pasarela ver docs/pasarela-de-pagos.md.
 */
export type PaymentResult =
  | { kind: "accepted"; investmentId: string; reference: string; amountUsd: number; planName: string }
  | { kind: "pending"; investmentId: string; reference: string; amountUsd: number; planName: string }
  | { kind: "redirect"; url: string };

export class PaymentError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

const DAY = 86_400_000;
const termDates = (from = new Date()) => ({ started_at: from.toISOString(), ends_at: new Date(from.getTime() + MIN_TERM_DAYS * DAY).toISOString() });

/** Código corto y legible para que el cliente lo ponga en la descripción de su transferencia. */
export function transferReference() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return "JH-" + Array.from(randomBytes(6), b => alphabet[b % alphabet.length]).join("");
}

export async function startPayment(session: Session, amountUsd: number, method: PaymentMethod): Promise<PaymentResult> {
  const plan = planForAmount(amountUsd);
  const admin = getSupabaseAdmin();

  if (method === "test" || method === "transfer") {
    for (let attempt = 0; attempt < 3; attempt++) {
      const reference = method === "test" ? `test_${randomUUID()}` : transferReference();
      const { data, error } = await admin.from("investments").insert({
        user_id: session.userId, plan_id: plan.id, principal_usd: amountUsd, ...termDates(),
        payment_method: method, payment_reference: reference,
        status: method === "test" ? "active" : "pending_payment",
        confirmed_at: method === "test" ? new Date().toISOString() : null,
      }).select("id").single();
      if (error?.code === "23505") continue; // referencia repetida: se genera otra
      if (error) throw error;
      return { kind: method === "test" ? "accepted" : "pending", investmentId: data.id, reference, amountUsd, planName: plan.name };
    }
    throw new PaymentError("No fue posible generar la referencia de pago. Intenta de nuevo.", 500);
  }

  // ── FASE PENDIENTE: pasarela de pago con tarjeta (Stripe Checkout de ejemplo) ──
  if (!paymentsApproved || !process.env.STRIPE_SECRET_KEY) throw new PaymentError("El pago con tarjeta aún no está habilitado.", 503);
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const checkout = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    customer_email: session.email,
    client_reference_id: session.userId,
    metadata: { plan_id: plan.id, amount_usd: String(amountUsd) },
    line_items: [{ price_data: { currency: "usd", unit_amount: amountUsd * 100, product_data: { name: `JH · ${plan.name}`, description: `Inversión de ${formatUsd(amountUsd)}. Plazo mínimo de ${MIN_TERM_DAYS} días.` } }, quantity: 1 }],
    success_url: `${siteUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${siteUrl}/invertir?monto=${amountUsd}`,
  });
  if (!checkout.url) throw new PaymentError("La pasarela no devolvió una dirección de pago.", 502);
  return { kind: "redirect", url: checkout.url };
}

/** El administrador confirma que recibió el dinero: la inversión se activa y el plazo empieza a contar desde hoy. */
export async function confirmPayment(investmentId: string, adminId: string) {
  const now = new Date();
  const { data, error } = await getSupabaseAdmin().from("investments")
    .update({ status: "active", ...termDates(now), confirmed_at: now.toISOString(), confirmed_by: adminId })
    .eq("id", investmentId).eq("status", "pending_payment").select("id,user_id,principal_usd,payment_reference").maybeSingle();
  if (error) throw error;
  return data;
}

/** Inversión registrada a mano por el administrador (pago recibido por fuera de la plataforma). */
export async function createManualInvestment(userId: string, amountUsd: number, reference: string, startedAt: Date, adminId: string, note: string | null) {
  const plan = planForAmount(amountUsd);
  const { data, error } = await getSupabaseAdmin().from("investments").insert({
    user_id: userId, plan_id: plan.id, principal_usd: amountUsd, ...termDates(startedAt),
    payment_method: "manual", payment_reference: reference, status: "active",
    confirmed_at: new Date().toISOString(), confirmed_by: adminId, admin_note: note,
  }).select("id").single();
  if (error?.code === "23505") throw new PaymentError("Ya existe una inversión con esa referencia de pago.", 409);
  if (error) throw error;
  return { id: data.id as string, planName: plan.name };
}
