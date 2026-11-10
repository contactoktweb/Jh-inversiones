import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/server/admin";
import { confirmLink, isEmail, publicOrigin, requireEmailConfirmation } from "@/lib/server/auth-email";
import { fail, readJson, sameOrigin } from "@/lib/server/http";
import { emailEnabled, escapeHtml, sendEmail } from "@/lib/server/notify";

/**
 * Registro de clientes. Supabase no envía ningún correo: los correos salen por la API de Resend.
 * - Por defecto la cuenta queda lista y el cliente entra de inmediato (se envía un correo de bienvenida).
 * - Con REQUIRE_EMAIL_CONFIRMATION=true se envía «Confirma tu cuenta» y debe abrir el enlace antes de entrar.
 */
export async function POST(request: Request) {
  if (!sameOrigin(request)) return fail("Origen no autorizado.", 403);
  const body = await readJson(request);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  if (!isEmail(email)) return fail("Escribe un correo válido.", 400);
  if (password.length < 8 || password.length > 72) return fail("La contraseña debe tener entre 8 y 72 caracteres.", 400);

  const admin = getSupabaseAdmin();
  const origin = publicOrigin(request);
  const exists = "Ya existe una cuenta con este correo. Inicia sesión o recupera tu contraseña.";

  if (requireEmailConfirmation() && emailEnabled()) {
    const { data, error } = await admin.auth.admin.generateLink({ type: "signup", email, password });
    if (error) return /already|exists|registered/i.test(error.message) ? fail(exists, 409) : fail("No pudimos crear la cuenta. Intenta de nuevo.", 500);
    const sent = await sendEmail(email, "Confirma tu cuenta", [
      "Gracias por registrarte. Confirma tu correo para activar tu cuenta.",
      "Si no creaste esta cuenta, ignora este mensaje.",
    ], { label: "Confirmar mi cuenta", path: confirmLink(origin, data.properties.hashed_token, "signup") });
    if (!sent) {
      await admin.auth.admin.deleteUser(data.user.id);
      return fail("No pudimos enviar el correo de confirmación. Intenta más tarde o contacta a soporte.", 502);
    }
    return NextResponse.json({ ok: true, confirm: true });
  }

  const { error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) return /already|exists|registered/i.test(error.message) ? fail(exists, 409) : fail("No pudimos crear la cuenta. Intenta de nuevo.", 500);
  await sendEmail(email, "Bienvenido", [
    `Tu cuenta <strong>${escapeHtml(email)}</strong> quedó creada.`,
    "Desde tu panel puedes invertir y ver tus ganancias día a día.",
  ], { label: "Ir a mi panel", path: "/dashboard" });
  return NextResponse.json({ ok: true, confirm: false });
}
