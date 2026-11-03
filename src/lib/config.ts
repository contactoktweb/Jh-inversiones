export const hasSupabaseConfig = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);
/**
 * Forma de cobro: "test" acepta un pago de prueba (no se cobra dinero) y crea la inversión;
 * "stripe" usa Stripe Checkout y exige PAYMENTS_APPROVED=true.
 */
export const paymentMode: "test" | "stripe" = process.env.NEXT_PUBLIC_PAYMENT_MODE === "stripe" ? "stripe" : "test";
export const paymentsApproved = process.env.PAYMENTS_APPROVED === "true";
export const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
