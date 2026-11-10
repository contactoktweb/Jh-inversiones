import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/server/admin";
import { confirmLink, isEmail, publicOrigin } from "@/lib/server/auth-email";
import { fail, readJson, sameOrigin } from "@/lib/server/http";
import { emailEnabled, sendEmail } from "@/lib/server/notify";

/** «¿Olvidaste tu contraseña?»: el enlace lo genera Supabase y el correo sale por la API de Resend. */
export async function POST(request: Request) {
  if (!sameOrigin(request)) return fail("Origen no autorizado.", 403);
  const body = await readJson(request);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!isEmail(email)) return fail("Escribe un correo válido.", 400);
  if (!emailEnabled()) return fail("El envío de correos no está configurado. Contacta a soporte.", 503);

  // Si el correo no está registrado no se envía nada, pero la respuesta es la misma (no revela qué cuentas existen).
  const { data, error } = await getSupabaseAdmin().auth.admin.generateLink({ type: "recovery", email });
  if (!error && data.properties?.hashed_token) {
    const sent = await sendEmail(email, "Restablece tu contraseña", [
      "Recibimos una solicitud para cambiar la contraseña de tu cuenta.",
      "Pulsa el botón para crear una nueva. El enlace sirve una sola vez y vence en 1 hora.",
      "Si no lo pediste, ignora este mensaje: tu contraseña no cambia.",
    ], { label: "Crear nueva contraseña", path: confirmLink(publicOrigin(request), data.properties.hashed_token, "recovery") });
    if (!sent) return fail("No pudimos enviar el correo. Intenta más tarde o contacta a soporte.", 502);
  }
  return NextResponse.json({ ok: true });
}
