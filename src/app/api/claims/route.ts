import { NextResponse } from "next/server";
import { Resend } from "resend";
import { isDemoMode } from "@/lib/config";
import { getSupabaseServer } from "@/lib/server/supabase";
import { getSupabaseAdmin } from "@/lib/server/admin";
import { formatUsd } from "@/lib/finance";
import { calculateEarnings } from "@/lib/rates";
import { getRates } from "@/lib/server/session";

export const runtime="nodejs";
function escapeHtml(s:string){return s.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]||c));}
function sameOrigin(request:Request){const origin=request.headers.get("origin");if(!origin)return true;try{return new URL(origin).host===request.headers.get("host");}catch{return false;}}

export async function POST(request:Request){
  if(!sameOrigin(request))return NextResponse.json({error:"Origen no autorizado."},{status:403});
  if(isDemoMode)return NextResponse.json({demo:true,message:"Simulación: no se ha enviado ningún correo."});
  if(!process.env.RESEND_API_KEY||!process.env.ADMIN_NOTIFICATION_EMAIL||!process.env.RESEND_FROM_EMAIL)
    return NextResponse.json({error:"El servicio de notificaciones aún no está configurado."},{status:503});
  const supabase=await getSupabaseServer();
  if(!supabase)return NextResponse.json({error:"Acceso no disponible."},{status:503});
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)return NextResponse.json({error:"Tu sesión expiró."},{status:401});
  let body:unknown;
  try{body=await request.json()}catch{return NextResponse.json({error:"Solicitud inválida."},{status:400});}
  const id=(body&&typeof body==="object"&&"investmentId" in body&&(body as {investmentId:unknown}).investmentId);
  if(typeof id!=="string"||!/^[0-9a-f-]{36}$/i.test(id))return NextResponse.json({error:"Identificador inválido."},{status:400});
  // La consulta con RLS garantiza que el usuario sea propietario de la posición.
  const {data:row,error:lookupError}=await supabase.from("investments")
    .select("id,plan_id,principal_usd,started_at,ends_at,status")
    .eq("id",id).eq("user_id",user.id).maybeSingle();
  if(lookupError||!row)return NextResponse.json({error:"Plan no encontrado."},{status:404});
  const position={...row,principal_usd:Number(row.principal_usd)};
  const calc=calculateEarnings(position,await getRates({kind:"real",role:"user",email:user.email||"",userId:user.id}));
  if(!calc.canWithdraw)return NextResponse.json({error:"Esta inversión todavía no cumple el plazo mínimo de 30 días."},{status:409});
  try{
    const admin=getSupabaseAdmin();
    const {data:prior}=await admin.from("claims").select("id,email_status").eq("investment_id",id).maybeSingle();
    if(prior?.email_status==="sent")return NextResponse.json({message:"Tu solicitud ya está registrada y notificada."});
    let claimId=prior?.id;
    if(!claimId){
      const {data:created,error:insertError}=await admin.from("claims").insert({
        user_id:user.id,investment_id:id,expected_amount_usd:calc.total,
        status:"pending",email_status:"pending",
      }).select("id").single();
      if(insertError){
        if(insertError.code==="23505")return NextResponse.json({message:"Tu solicitud ya está siendo procesada."});
        throw insertError;
      }
      claimId=created.id;
    }
    const resend=new Resend(process.env.RESEND_API_KEY);
    const result=await resend.emails.send({
      from:process.env.RESEND_FROM_EMAIL!,to:process.env.ADMIN_NOTIFICATION_EMAIL!,
      subject:`JH Inversiones · Solicitud de retiro ${id.slice(0,8)}`,
      html:`<div style="font-family:sans-serif;line-height:1.7"><h2>Nueva solicitud de retiro</h2><p><strong>Usuario:</strong> ${escapeHtml(user.email||user.id)}</p><p><strong>ID de posición:</strong> ${escapeHtml(id)}</p><p><strong>Plan:</strong> ${escapeHtml(position.plan_id)}</p><p><strong>Capital:</strong> ${escapeHtml(formatUsd(position.principal_usd))}</p><p><strong>Ganancias:</strong> ${escapeHtml(formatUsd(calc.earnings))}</p><p><strong>Total solicitado:</strong> ${escapeHtml(formatUsd(calc.total))}</p><p>La solicitud requiere validación administrativa. Este correo no ordena ni confirma ningún pago.</p></div>`,
    });
    if(result.error){await admin.from("claims").update({email_status:"failed"}).eq("id",claimId);throw new Error("No se pudo entregar el correo de notificación.");}
    await admin.from("claims").update({email_status:"sent"}).eq("id",claimId);
    return NextResponse.json({message:"Solicitud de retiro recibida. Un administrador la revisará."});
  }catch(e){console.error("claim_error",e instanceof Error?e.message:"Error inesperado");return NextResponse.json({error:"No pudimos completar la notificación. Puedes reintentar más tarde."},{status:502});}
}
