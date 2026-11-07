export const hasSupabaseConfig = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

/**
 * Métodos de pago que ve el cliente en /invertir (NEXT_PUBLIC_PAYMENT_METHODS, separados por comas):
 *  - test:     pago de prueba, se acepta al instante sin cobrar.
 *  - transfer: transferencia bancaria; la inversión queda pendiente hasta que el administrador confirma el pago.
 *  - stripe:   pasarela de pago con tarjeta (fase pendiente; exige PAYMENTS_APPROVED=true y claves de Stripe).
 * Por defecto: test,transfer.
 */
export type PaymentMethod = "test" | "transfer" | "stripe";
const ALL_METHODS: PaymentMethod[] = ["test", "transfer", "stripe"];
const configured = (process.env.NEXT_PUBLIC_PAYMENT_METHODS || (process.env.NEXT_PUBLIC_PAYMENT_MODE === "stripe" ? "stripe" : "test,transfer"))
  .split(",").map(m => m.trim().toLowerCase()).filter((m): m is PaymentMethod => (ALL_METHODS as string[]).includes(m));
export const paymentMethods: PaymentMethod[] = configured.length ? [...new Set(configured)] : ["test", "transfer"];
export const paymentsApproved = process.env.PAYMENTS_APPROVED === "true";
export const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
