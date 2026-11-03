import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { getSupabaseServer } from "@/lib/server/supabase";

const TYPES: EmailOtpType[] = ["signup", "recovery", "invite", "magiclink", "email_change", "email"];

/**
 * Enlaces de los correos de Supabase (confirmación de cuenta y recuperación de contraseña).
 * Usa token_hash, así que funciona aunque el enlace se abra en otro navegador o dispositivo.
 * Plantillas: {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=<tipo>
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const candidate = url.searchParams.get("next") || (type === "recovery" ? "/restablecer" : "/dashboard");
  const next = candidate.startsWith("/") && !candidate.startsWith("//") && !candidate.includes("\\") ? candidate : "/dashboard";
  if (tokenHash && type && TYPES.includes(type)) {
    const supabase = await getSupabaseServer();
    if (supabase) {
      const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
      if (!error) return NextResponse.redirect(new URL(next, url.origin));
    }
  }
  return NextResponse.redirect(new URL("/acceso?error=enlace", url.origin));
}
