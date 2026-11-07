import { NextResponse } from "next/server";
import { formatUsd } from "@/lib/finance";
import { getSupabaseAdmin } from "@/lib/server/admin";
import { logAudit } from "@/lib/server/audit";
import { fail, guard, isUuid, optionalText, readJson } from "@/lib/server/http";
import { sendEmail } from "@/lib/server/notify";

export const runtime="nodejs";
const MESSAGES={approved:"Solicitud aprobada.",settled:"Retiro marcado como desembolsado.",rejected:"Solicitud rechazada."} as const;

/** El administrador aprueba, rechaza o marca como desembolsada una solicitud de retiro. */
export async function POST(request:Request){
  const {session,error}=await guard(request,"admin");
  if(error)return error;
  const body=await readJson(request);
  if(!body||!isUuid(body.investmentId))return fail("Identificador inválido.",400);
  const status=body.status, note=optionalText(body.note,500), payoutReference=optionalText(body.payoutReference,120);
  if(status!=="approved"&&status!=="settled"&&status!=="rejected")return fail("Estado inválido.",400);
  if(status==="rejected"&&!note)return fail("Escribe el motivo del rechazo: el cliente lo verá.",400);
  try{
    const admin=getSupabaseAdmin();
    const {data:claim}=await admin.from("claims").select("id,status,user_id,expected_amount_usd").eq("investment_id",body.investmentId).maybeSingle();
    if(!claim)return fail("Solicitud no encontrada.",404);
    if(claim.status==="settled")return fail("Este retiro ya fue desembolsado.",409);
    if(claim.status==="rejected")return fail("Esta solicitud ya fue rechazada.",409);
    if(status==="approved"&&claim.status!=="pending")return fail("La solicitud ya está aprobada.",409);
    const {error:updateError}=await admin.from("claims").update({status,resolved_at:new Date().toISOString(),resolved_by:session.userId,admin_note:note,...(payoutReference?{payout_reference:payoutReference}:{})}).eq("id",claim.id);
    if(updateError)throw updateError;
    if(status==="settled"){
      const {error:closeError}=await admin.from("investments").update({status:"closed"}).eq("id",body.investmentId);
      if(closeError)throw closeError;
    }
    const amount=formatUsd(Number(claim.expected_amount_usd));
    await logAudit(session,`claim.${status}`,"claim",claim.id,{investment_id:body.investmentId,amount_usd:Number(claim.expected_amount_usd),payout_reference:payoutReference,note});
    const {data:owner}=await admin.from("profiles").select("email").eq("id",claim.user_id).maybeSingle();
    const lines=status==="settled"?[`Realizamos el desembolso de tu retiro por <strong>${amount}</strong>.`,...(payoutReference?[`Comprobante: ${payoutReference}`]:[])]:status==="approved"?[`Tu solicitud de retiro por <strong>${amount}</strong> fue aprobada. El desembolso está en proceso.`]:[`Tu solicitud de retiro por <strong>${amount}</strong> fue rechazada.`,`Motivo: ${note}`,"Puedes volver a solicitarla desde tu panel."];
    await sendEmail(owner?.email||"",status==="settled"?"Retiro desembolsado":status==="approved"?"Retiro aprobado":"Retiro rechazado",lines,{label:"Ver mi panel",path:"/dashboard"});
    return NextResponse.json({message:MESSAGES[status]});
  }catch(e){console.error("admin_claim_error",e instanceof Error?e.message:e);return fail("No se pudo actualizar la solicitud.",502);}
}
