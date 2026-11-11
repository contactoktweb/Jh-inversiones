import { NextResponse } from "next/server";
import { formatUsd } from "@/lib/finance";
import { getSupabaseAdmin } from "@/lib/server/admin";
import { logAudit } from "@/lib/server/audit";
import { fail, guard, isUuid, optionalText, readJson } from "@/lib/server/http";
import { sendEmail } from "@/lib/server/notify";
import { findReferrer } from "@/lib/server/referrals";

export const runtime = "nodejs";

/**
 * Programa de referidos (administración):
 *  - pct: porcentaje de comisión (0 = pausado; solo afecta a las inversiones que se confirmen desde ahora).
 *  - pay: marcar una comisión como pagada (con comprobante); avisa por correo a quien la gana.
 *  - cancel: anular una comisión pendiente (con motivo).
 *  - assign: cambiar o quitar quién refirió a un cliente (por código).
 */
export async function POST(request: Request) {
  const { session, error } = await guard(request, "admin");
  if (error) return error;
  const body = await readJson(request);
  if (!body) return fail("Solicitud inválida.", 400);
  const admin = getSupabaseAdmin();
  try {
    if (body.action === "pct") {
      const pct = body.pct;
      if (typeof pct !== "number" || !Number.isFinite(pct) || pct < 0 || pct > 100 || Math.abs(Math.round(pct * 1000) - pct * 1000) > 1e-6) return fail("El porcentaje debe estar entre 0 y 100 (hasta 3 decimales).", 400);
      const { data: previous } = await admin.from("settings").select("value").eq("key", "referral_commission_pct").maybeSingle();
      const { error: saveError } = await admin.from("settings").upsert({ key: "referral_commission_pct", value: String(pct), updated_by: session.userId, updated_at: new Date().toISOString() });
      if (saveError) throw saveError;
      await logAudit(session, "settings.update", "settings", "referral_commission_pct", { referral_commission_pct: pct, previous: previous?.value ?? null });
      return NextResponse.json({ message: pct > 0 ? `Comisión por referido: ${pct}% de cada inversión confirmada.` : "Programa de referidos pausado: no se generarán comisiones nuevas." });
    }

    if (body.action === "pay" || body.action === "cancel") {
      if (!isUuid(body.commissionId)) return fail("Identificador inválido.", 400);
      const note = optionalText(body.note, 500);
      const reference = optionalText(body.reference, 120);
      if (body.action === "pay" && !reference) return fail("Escribe el comprobante del pago (n.º de transferencia, recibo…).", 400);
      if (body.action === "cancel" && !note) return fail("Escribe el motivo de la anulación.", 400);
      const { data: commission } = await admin.from("referral_commissions").select("id,referrer_id,amount_usd,status").eq("id", body.commissionId).maybeSingle();
      if (!commission) return fail("Comisión no encontrada.", 404);
      if (commission.status !== "pending") return fail("Esta comisión ya fue pagada o anulada.", 409);
      const paid = body.action === "pay";
      const { data: updated, error: updateError } = await admin.from("referral_commissions")
        .update({ status: paid ? "paid" : "cancelled", resolved_at: new Date().toISOString(), resolved_by: session.userId, payout_reference: paid ? reference : null, admin_note: note })
        .eq("id", commission.id).eq("status", "pending").select("id").maybeSingle();
      if (updateError) throw updateError;
      if (!updated) return fail("Esta comisión ya fue pagada o anulada.", 409);
      const amount = formatUsd(Number(commission.amount_usd));
      await logAudit(session, paid ? "referral.paid" : "referral.cancelled", "referral_commission", commission.id, { amount_usd: Number(commission.amount_usd), reference, note });
      const { data: referrer } = await admin.from("profiles").select("email").eq("id", commission.referrer_id).maybeSingle();
      if (paid) await sendEmail(referrer?.email || "", "Comisión pagada", [`Te pagamos tu comisión por referido de <strong>${amount}</strong>.`, `Comprobante: <strong>${reference}</strong>.`], { label: "Ver mis referidos", path: "/referidos" });
      return NextResponse.json({ message: paid ? `Comisión de ${amount} marcada como pagada.` : `Comisión de ${amount} anulada.` });
    }

    if (body.action === "assign") {
      if (!isUuid(body.userId)) return fail("Identificador inválido.", 400);
      const code = typeof body.code === "string" ? body.code.trim() : "";
      const { data: client } = await admin.from("profiles").select("id,email,role,referred_by").eq("id", body.userId).maybeSingle();
      if (!client) return fail("Cliente no encontrado.", 404);
      let referrerId: string | null = null, referrerEmail: string | null = null;
      if (code) {
        const referrer = await findReferrer(code);
        if (!referrer) return fail("No existe una cuenta de inversionista con ese código.", 404);
        if (referrer.id === client.id) return fail("Un cliente no puede ser su propio referido.", 400);
        referrerId = referrer.id; referrerEmail = referrer.email;
      }
      if (referrerId === client.referred_by) return fail("No hay cambios.", 400);
      const { error: updateError } = await admin.from("profiles").update({ referred_by: referrerId, referred_at: referrerId ? new Date().toISOString() : null }).eq("id", client.id);
      if (updateError) throw updateError;
      await logAudit(session, "referral.assign", "profile", client.id, { client: client.email, referrer: referrerEmail, code: code || null });
      return NextResponse.json({ message: referrerId ? `Ahora ${client.email} figura como referido de ${referrerEmail}. Las comisiones se generan con las inversiones que se confirmen desde ahora.` : `${client.email} ya no figura como referido de nadie.` });
    }

    return fail("Acción inválida.", 400);
  } catch (e) {
    console.error("admin_referrals_error", e instanceof Error ? e.message : e);
    return fail("No se pudo completar la operación.", 502);
  }
}
