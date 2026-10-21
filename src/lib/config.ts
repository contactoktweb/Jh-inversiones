export const hasSupabaseConfig = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);
export const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true" || !hasSupabaseConfig;
export const paymentsApproved = process.env.PAYMENTS_APPROVED === "true";
export const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
