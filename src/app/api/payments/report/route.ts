import { NextResponse } from "next/server";
import { formatUsd } from "@/lib/finance";
import { decodeImage, isImageDataUrl } from "@/lib/images";
import { getSupabaseAdmin } from "@/lib/server/admin";
import { fail, guard, isUuid, optionalText, readJson } from "@/lib/server/http";
import { escapeHtml, notifyAdmin } from "@/lib/server/notify";

export const runtime = "nodejs";

/** Códigos de Postgres/PostgREST cuando falta una tabla o columna (esquema sin actualizar). */
const SCHEMA_OUTDATED = new Set(["42P01", "42703", "PGRST204", "PGRST205"]);

/** El cliente avisa que ya transfirió (comprobante opcional). Se avisa al administrador por correo. */
export async function POST(request: Request) {
  const { session, error } = await guard(request, "user");
  if (error) return error;
  const body = await readJson(request);
  if (!body || !isUuid(body.investmentId)) return fail("Solicitud inválida.", 400);
  const note = optionalText(body.note, 300);
  const image = body.image ?? null;
  if (image !== null && !isImageDataUrl(image)) return fail("La foto no es válida o pesa demasiado. Prueba con otra captura.", 400);
  const admin = getSupabaseAdmin();
  try {
    const { data: investment } = await admin.from("investments").select("id,user_id,status,principal_usd,payment_reference,payment_method,plan:plans(name)").eq("id", body.investmentId).eq("user_id", session.userId).maybeSingle();
    if (!investment) return fail("Inversión no encontrada.", 404);
    if (investment.status !== "pending_payment") return fail("Esta inversión ya no está pendiente de pago.", 409);
    if (image) {
      const { error: proofError } = await admin.from("payment_proofs").upsert({ investment_id: investment.id, user_id: session.userId, image, created_at: new Date().toISOString() });
      if (proofError) throw proofError;
    }
    const { error: updateError } = await admin.from("investments").update({ payment_reported_at: new Date().toISOString(), payment_report_note: note }).eq("id", investment.id).eq("status", "pending_payment");
    if (updateError) throw updateError;

    const amount = formatUsd(Number(investment.principal_usd));
    const planName = (investment.plan as unknown as { name: string } | null)?.name || "";
    const decoded = image ? decodeImage(image) : null;
    await notifyAdmin(`Transferencia por verificar: ${amount}`, [
      `<strong>${escapeHtml(session.fullName || session.email)}</strong> (${escapeHtml(session.email)}) avisa que ya transfirió <strong>${amount}</strong>${planName ? ` para el plan ${escapeHtml(planName)}` : ""}.`,
      `Referencia: <strong>${escapeHtml(investment.payment_reference)}</strong>${note ? `<br>Comentario del cliente: ${escapeHtml(note)}` : ""}`,
      decoded ? "Adjuntamos la foto del comprobante que envió el cliente." : "El cliente no adjuntó comprobante.",
      "Revisa tu cuenta bancaria. Si el dinero llegó, aprueba el pago en Administración → Pagos y la inversión se activará con ese monto.",
    ], "/admin/pagos", decoded ? [{ filename: `comprobante-${investment.payment_reference}.${decoded.ext}`, content: decoded.bytes.toString("base64"), contentType: decoded.type }] : undefined);
    return NextResponse.json({ message: "Avisamos a la administración. Verificará el pago y activará tu inversión." });
  } catch (e) {
    const code = (e as { code?: string })?.code;
    console.error("payment_report_error", code, e instanceof Error ? e.message : (e as { message?: string })?.message);
    if (code && SCHEMA_OUTDATED.has(code)) return fail("La plataforma necesita una actualización de la base de datos. Avisa a la administración.", 503);
    return fail("No pudimos enviar el aviso. Intenta de nuevo.", 502);
  }
}
