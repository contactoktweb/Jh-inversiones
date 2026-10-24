import { NextResponse } from "next/server";
import { Resend } from "resend";
import { getSupabaseServer } from "@/lib/server/supabase";
import { getSupabaseAdmin } from "@/lib/server/admin";
import { formatUsd, makeDemoInvestments } from "@/lib/finance";
import { calculateEarnings } from "@/lib/rates";
import { DEMO_CLAIMS_COOKIE, demoCookieOptions, getDemoClaims, getRates, getSession, withClaims } from "@/lib/server/session";

export const runtime="nodejs";
function escapeHtml(s:string){return s.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]||c));}
function sameOrigin(request:Request){const origin=request.headers.get("origin");if(!origin)return true;try{return new URL(origin).host===request.headers.get("host");}catch{return false;}}
const SUCCESS="Solicitud de retiro enviada. El administrador fue notificado y realizará el desembolso tras revisarla.";

/** Solicitud de retiro (capital + ganancias) de una inversión que ya cumplió el plazo mínimo. */
export async function POST(request:Request){
  if(!sameOrigin(request))return NextResponse.json({error:"Origen no autorizado."},{status:403});
  const session=await getSession();
  if(!session)return NextResponse.json({error:"Tu sesión expiró."},{status:401});
  if(session.role!=="user")return NextResponse.json({error:"Solo los inversionistas pueden solicitar retiros."},{status:403});
  let body:unknown;
  try{body=await request.json()}catch{return NextResponse.json({error:"Solicitud inválida."},{status:400});}
  const id=(body&&typeof body==="object"&&"investmentId" in body&&(body as {investmentId:unknown}).investmentId);
  if(typeof id!=="string"||id.length>64)return NextResponse.json({error:"Identificador inválido."},{status:400});
  const rates=await getRates(session);

  if(session.kind==="demo"){
    const claims=await getDemoClaims();
    const position=withClaims(makeDemoInvestments(),claims).find(x=>x.id===id);
    if(!position)return NextResponse.json({error:"Inversión no encontrada."},{status:404});
    const calc=calculateEarnings(position,rates);
    if(!calc.canWithdraw)return NextResponse.json({error:position.claim_status&&position.claim_status!=="rejected"?"Ya tienes una solicitud de retiro para esta inversión.":"Esta inversión todavía no cumple el plazo mínimo de 30 días."},{status:409});
    const amount=Math.round(calc.total*100)/100;
    const response=NextResponse.json({message:SUCCESS,amountUsd:amount});
    response.cookies.set(DEMO_CLAIMS_COOKIE,JSON.stringify({...claims,[id]:{status:"pending",requested_at:new Date().toISOString(),amount_usd:amount}}),demoCookieOptions(30));
    return response;
  }

  if(!/^[0-9a-f-]{36}$/i.test(id))return NextResponse.json({error:"Identificador inválido."},{status:400});
  const supabase=await getSupabaseServer();
  if(!supabase)return NextResponse.json({error:"Acceso no disponible."},{status:503});
  // La consulta con RLS garantiza que el usuario sea propietario de la inversión.
  const {data:row,error:lookupError}=await supabase.from("investments")
    .select("id,plan_id,principal_usd,started_at,ends_at,status")
    .eq("id",id).eq("user_id",session.userId).maybeSingle();
  if(lookupError||!row)return NextResponse.json({error:"Inversión no encontrada."},{status:404});
  try{
    const admin=getSupabaseAdmin();
    const {data:prior}=await admin.from("claims").select("id,status").eq("investment_id",id).maybeSingle();
    if(prior&&prior.status!=="rejected")return NextResponse.json({error:"Ya tienes una solicitud de retiro para esta inversión."},{status:409});
    const position={...row,principal_usd:Number(row.principal_usd)};
    const calc=calculateEarnings(position,rates);
    if(!calc.canWithdraw)return NextResponse.json({error:"Esta inversión todavía no cumple el plazo mínimo de 30 días."},{status:409});
    const amount=Math.round(calc.total*100)/100;
    const record={user_id:session.userId,investment_id:id,expected_amount_usd:amount,status:"pending",email_status:"pending",created_at:new Date().toISOString(),resolved_at:null,resolved_by:null};
    const {data:saved,error:saveError}=prior
      ?await admin.from("claims").update(record).eq("id",prior.id).select("id").single()
      :await admin.from("claims").insert(record).select("id").single();
    if(saveError){
      if(saveError.code==="23505")return NextResponse.json({error:"Tu solicitud ya está siendo procesada."},{status:409});
      throw saveError;
    }
    // La solicitud queda visible en el panel del administrador; el correo es un aviso adicional.
    if(process.env.RESEND_API_KEY&&process.env.ADMIN_NOTIFICATION_EMAIL&&process.env.RESEND_FROM_EMAIL){
      const result=await new Resend(process.env.RESEND_API_KEY).emails.send({
        from:process.env.RESEND_FROM_EMAIL,to:process.env.ADMIN_NOTIFICATION_EMAIL,
        subject:`JH Inversiones · Solicitud de retiro por ${formatUsd(amount)}`,
        html:`<div style="font-family:sans-serif;line-height:1.7"><h2>Nueva solicitud de retiro</h2><p><strong>Usuario:</strong> ${escapeHtml(session.email)}</p><p><strong>Inversión:</strong> ${escapeHtml(id)}</p><p><strong>Capital:</strong> ${escapeHtml(formatUsd(position.principal_usd))}</p><p><strong>Ganancias:</strong> ${escapeHtml(formatUsd(calc.earnings))}</p><p><strong>Total a desembolsar:</strong> ${escapeHtml(formatUsd(amount))}</p><p>Revisa la solicitud en el panel de administración y márcala como desembolsada al realizar el pago.</p></div>`,
      }).catch(()=>({error:true}));
      await admin.from("claims").update({email_status:result.error?"failed":"sent"}).eq("id",saved.id);
    }
    return NextResponse.json({message:SUCCESS,amountUsd:amount});
  }catch(e){console.error("claim_error",e instanceof Error?e.message:"Error inesperado");return NextResponse.json({error:"No pudimos registrar la solicitud. Intenta de nuevo más tarde."},{status:502});}
}
