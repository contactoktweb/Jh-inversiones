import { NextResponse } from "next/server";
import { formatUsd } from "@/lib/finance";
import { MAX_INVESTMENT_USD, MIN_INVESTMENT_USD } from "@/lib/rates";
import { getSupabaseAdmin } from "@/lib/server/admin";
import { logAudit } from "@/lib/server/audit";
import { fail, guard, isUuid, optionalText, readJson } from "@/lib/server/http";
import { sendEmail } from "@/lib/server/notify";
import { createManualInvestment, PaymentError } from "@/lib/server/payments";

export const runtime="nodejs";

/** Registrar una inversión manual (pago recibido por fuera) o cancelar una inversión. */
export async function POST(request:Request){
  const {session,error}=await guard(request,"admin");
  if(error)return error;
  const body=await readJson(request);
  if(!body)return fail("Solicitud inválida.",400);
  const admin=getSupabaseAdmin();
  try{
    if(body.action==="create"){
      const email=typeof body.email==="string"?body.email.trim().toLowerCase():"";
      const amount=body.amountUsd, reference=optionalText(body.reference,80), note=optionalText(body.note,500);
      if(!email)return fail("Escribe el correo del cliente.",400);
      if(typeof amount!=="number"||!Number.isInteger(amount)||amount<MIN_INVESTMENT_USD||amount>MAX_INVESTMENT_USD)return fail(`El monto debe ser un entero entre ${MIN_INVESTMENT_USD} y ${MAX_INVESTMENT_USD.toLocaleString("en-US")} USD.`,400);
      if(!reference)return fail("Escribe la referencia del pago (n.º de transferencia, recibo…).",400);
      const startedAt=typeof body.startedAt==="string"&&body.startedAt?new Date(`${body.startedAt}T12:00:00Z`):new Date();
      if(Number.isNaN(startedAt.getTime())||startedAt.getTime()>Date.now()+86_400_000)return fail("La fecha de inicio no es válida.",400);
      const {data:client}=await admin.from("profiles").select("id,email,role").ilike("email",email).maybeSingle();
      if(!client)return fail("No existe una cuenta con ese correo. El cliente debe registrarse primero.",404);
      if(client.role==="admin")return fail("No se pueden registrar inversiones a cuentas de administrador.",400);
      const created=await createManualInvestment(client.id,amount,reference,startedAt,session.userId,note);
      await logAudit(session,"investment.create_manual","investment",created.id,{client:client.email,amount_usd:amount,reference,started_at:startedAt.toISOString(),note});
      await sendEmail(client.email,"Inversión registrada",[`Registramos tu inversión de <strong>${formatUsd(amount)}</strong> en el plan ${created.planName}.`,"Ya puedes verla en tu panel."],{label:"Ver mi inversión",path:"/dashboard"});
      return NextResponse.json({message:`Inversión de ${formatUsd(amount)} registrada para ${client.email}.`,investmentId:created.id});
    }
    if(body.action==="cancel"){
      if(!isUuid(body.investmentId))return fail("Identificador inválido.",400);
      const note=optionalText(body.note,500);
      if(!note)return fail("Escribe el motivo de la cancelación.",400);
      const {data:investment}=await admin.from("investments").select("id,status,principal_usd,payment_reference").eq("id",body.investmentId).maybeSingle();
      if(!investment)return fail("Inversión no encontrada.",404);
      if(investment.status==="cancelled"||investment.status==="closed")return fail("Esta inversión ya está cerrada o cancelada.",409);
      const {data:claim}=await admin.from("claims").select("status").eq("investment_id",investment.id).maybeSingle();
      if(claim&&(claim.status==="pending"||claim.status==="approved"))return fail("Tiene un retiro en curso: resuélvelo primero en Retiros.",409);
      const {error:updateError}=await admin.from("investments").update({status:"cancelled",cancelled_at:new Date().toISOString(),admin_note:note}).eq("id",investment.id);
      if(updateError)throw updateError;
      await logAudit(session,"investment.cancel","investment",investment.id,{amount_usd:Number(investment.principal_usd),reference:investment.payment_reference,previous_status:investment.status,note});
      return NextResponse.json({message:"Inversión cancelada."});
    }
    return fail("Acción inválida.",400);
  }catch(e){
    if(e instanceof PaymentError)return fail(e.message,e.status);
    console.error("admin_investment_error",e instanceof Error?e.message:e);return fail("No se pudo completar la operación.",502);
  }
}
