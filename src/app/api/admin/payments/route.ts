import { NextResponse } from "next/server";
import { formatUsd } from "@/lib/finance";
import { getSupabaseAdmin } from "@/lib/server/admin";
import { logAudit } from "@/lib/server/audit";
import { fail, guard, isUuid, optionalText, readJson } from "@/lib/server/http";
import { sendEmail } from "@/lib/server/notify";
import { confirmPayment } from "@/lib/server/payments";

export const runtime="nodejs";

/** Confirmar (activar) o rechazar una inversión pendiente de pago por transferencia. */
export async function POST(request:Request){
  const {session,error}=await guard(request,"admin");
  if(error)return error;
  const body=await readJson(request);
  if(!body||!isUuid(body.investmentId))return fail("Identificador inválido.",400);
  const action=body.action, note=optionalText(body.note,500);
  if(action!=="confirm"&&action!=="reject")return fail("Acción inválida.",400);
  if(action==="reject"&&!note)return fail("Escribe el motivo del rechazo.",400);
  const admin=getSupabaseAdmin();
  try{
    const {data:investment}=await admin.from("investments").select("id,user_id,status,principal_usd,payment_reference").eq("id",body.investmentId).maybeSingle();
    if(!investment)return fail("Inversión no encontrada.",404);
    if(investment.status!=="pending_payment")return fail("Esta inversión ya no está pendiente de pago.",409);
    const {data:owner}=await admin.from("profiles").select("email").eq("id",investment.user_id).maybeSingle();
    const amount=formatUsd(Number(investment.principal_usd));
    if(action==="confirm"){
      const confirmed=await confirmPayment(investment.id,session.userId);
      if(!confirmed)return fail("Esta inversión ya no está pendiente de pago.",409);
      await logAudit(session,"payment.confirm","investment",investment.id,{amount_usd:Number(investment.principal_usd),reference:investment.payment_reference,note});
      await sendEmail(owner?.email||"","Pago confirmado",[`Confirmamos tu pago de <strong>${amount}</strong> (referencia ${investment.payment_reference}).`,"Tu inversión ya está activa y empieza a sumar ganancias desde hoy."],{label:"Ver mi inversión",path:"/dashboard"});
      return NextResponse.json({message:`Pago confirmado. La inversión de ${amount} quedó activa.`});
    }
    const {error:updateError}=await admin.from("investments").update({status:"cancelled",cancelled_at:new Date().toISOString(),admin_note:note}).eq("id",investment.id).eq("status","pending_payment");
    if(updateError)throw updateError;
    await logAudit(session,"payment.reject","investment",investment.id,{amount_usd:Number(investment.principal_usd),reference:investment.payment_reference,note});
    await sendEmail(owner?.email||"","Pago no confirmado",[`No pudimos confirmar el pago de tu inversión de <strong>${amount}</strong> (referencia ${investment.payment_reference}).`,`Motivo: ${note}`]);
    return NextResponse.json({message:"Pago rechazado. La inversión quedó cancelada."});
  }catch(e){console.error("admin_payment_error",e instanceof Error?e.message:e);return fail("No se pudo actualizar el pago.",502);}
}
