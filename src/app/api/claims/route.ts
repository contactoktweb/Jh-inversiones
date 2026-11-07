import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/server/supabase";
import { getSupabaseAdmin } from "@/lib/server/admin";
import { formatUsd } from "@/lib/finance";
import { calculateEarnings } from "@/lib/rates";
import { fail, guard, isUuid, optionalText, readJson } from "@/lib/server/http";
import { escapeHtml, notifyAdmin } from "@/lib/server/notify";
import { getRates } from "@/lib/server/session";

export const runtime="nodejs";
const SUCCESS="Solicitud de retiro enviada. El administrador fue notificado y realizará el desembolso tras revisarla.";

/** Solicitud de retiro (capital + ganancias) de una inversión que ya cumplió el plazo mínimo. */
export async function POST(request:Request){
  const {session,error}=await guard(request,"user");
  if(error)return error;
  const body=await readJson(request);
  if(!body||!isUuid(body.investmentId))return fail("Identificador inválido.",400);
  const payoutDetails=optionalText(body.payoutDetails,1000);
  if(!payoutDetails||payoutDetails.length<6)return fail("Indica dónde quieres recibir el dinero (banco y número de cuenta, billetera…).",400);
  const supabase=await getSupabaseServer();
  if(!supabase)return fail("Acceso no disponible.",503);
  // La consulta con RLS garantiza que el usuario sea propietario de la inversión.
  const {data:row,error:lookupError}=await supabase.from("investments")
    .select("id,plan_id,principal_usd,started_at,ends_at,status")
    .eq("id",body.investmentId).eq("user_id",session.userId).maybeSingle();
  if(lookupError||!row)return fail("Inversión no encontrada.",404);
  try{
    const admin=getSupabaseAdmin();
    const {data:prior}=await admin.from("claims").select("id,status").eq("investment_id",row.id).maybeSingle();
    if(prior&&prior.status!=="rejected")return fail("Ya tienes una solicitud de retiro para esta inversión.",409);
    const position={...row,principal_usd:Number(row.principal_usd)};
    const calc=calculateEarnings(position,await getRates());
    if(!calc.canWithdraw)return fail(row.status!=="active"?"Esta inversión no está activa.":"Esta inversión todavía no cumple el plazo mínimo de 30 días.",409);
    const amount=Math.round(calc.total*100)/100;
    const record={user_id:session.userId,investment_id:row.id,expected_amount_usd:amount,status:"pending",email_status:"pending",created_at:new Date().toISOString(),resolved_at:null,resolved_by:null,payout_details:payoutDetails,payout_reference:null,admin_note:null};
    const {data:saved,error:saveError}=prior
      ?await admin.from("claims").update(record).eq("id",prior.id).select("id").single()
      :await admin.from("claims").insert(record).select("id").single();
    if(saveError){
      if(saveError.code==="23505")return fail("Tu solicitud ya está siendo procesada.",409);
      throw saveError;
    }
    // Guarda los datos de pago en el perfil para la próxima vez.
    await admin.from("profiles").update({payout_details:payoutDetails,updated_at:new Date().toISOString()}).eq("id",session.userId);
    // La solicitud queda visible en el panel del administrador; el correo es un aviso adicional.
    const sent=await notifyAdmin(`Solicitud de retiro por ${formatUsd(amount)}`,[`<strong>${escapeHtml(session.email)}</strong> solicitó el retiro de su inversión.`,`Capital: ${formatUsd(position.principal_usd)} · Ganancias: ${formatUsd(calc.earnings)} · <strong>Total a desembolsar: ${formatUsd(amount)}</strong>`,`Datos de pago: ${escapeHtml(payoutDetails)}`],"/admin/retiros");
    await admin.from("claims").update({email_status:sent?"sent":"failed"}).eq("id",saved.id);
    return NextResponse.json({message:SUCCESS,amountUsd:amount});
  }catch(e){console.error("claim_error",e instanceof Error?e.message:e);return fail("No pudimos registrar la solicitud. Intenta de nuevo más tarde.",502);}
}
