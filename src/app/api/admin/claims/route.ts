import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/server/admin";
import { DEMO_CLAIMS_COOKIE, demoCookieOptions, getDemoClaims, getSession } from "@/lib/server/session";

export const runtime="nodejs";
function sameOrigin(request:Request){const origin=request.headers.get("origin");if(!origin)return true;try{return new URL(origin).host===request.headers.get("host");}catch{return false;}}
const MESSAGES={approved:"Solicitud aprobada.",settled:"Retiro marcado como desembolsado.",rejected:"Solicitud rechazada."} as const;

/** El administrador aprueba, rechaza o marca como desembolsada una solicitud de retiro. */
export async function POST(request:Request){
  if(!sameOrigin(request))return NextResponse.json({error:"Origen no autorizado."},{status:403});
  const session=await getSession();
  if(!session)return NextResponse.json({error:"Tu sesión expiró."},{status:401});
  if(session.role!=="admin")return NextResponse.json({error:"Solo un administrador puede gestionar retiros."},{status:403});
  let body:unknown;
  try{body=await request.json()}catch{return NextResponse.json({error:"Solicitud inválida."},{status:400});}
  const {investmentId,status}=(body&&typeof body==="object"?body:{}) as {investmentId?:unknown;status?:unknown};
  if(typeof investmentId!=="string"||investmentId.length>64)return NextResponse.json({error:"Identificador inválido."},{status:400});
  if(status!=="approved"&&status!=="settled"&&status!=="rejected")return NextResponse.json({error:"Estado inválido."},{status:400});

  if(session.kind==="demo"){
    const claims=await getDemoClaims();
    const claim=claims[investmentId];
    if(!claim)return NextResponse.json({error:"Solicitud no encontrada."},{status:404});
    if(claim.status==="settled")return NextResponse.json({error:"Este retiro ya fue desembolsado."},{status:409});
    const response=NextResponse.json({message:MESSAGES[status]});
    response.cookies.set(DEMO_CLAIMS_COOKIE,JSON.stringify({...claims,[investmentId]:{...claim,status}}),demoCookieOptions(30));
    return response;
  }

  try{
    const admin=getSupabaseAdmin();
    const {data:claim}=await admin.from("claims").select("id,status").eq("investment_id",investmentId).maybeSingle();
    if(!claim)return NextResponse.json({error:"Solicitud no encontrada."},{status:404});
    if(claim.status==="settled")return NextResponse.json({error:"Este retiro ya fue desembolsado."},{status:409});
    const {error}=await admin.from("claims").update({status,resolved_at:new Date().toISOString(),resolved_by:session.userId}).eq("id",claim.id);
    if(error)throw error;
    if(status==="settled"){
      const {error:closeError}=await admin.from("investments").update({status:"closed"}).eq("id",investmentId);
      if(closeError)throw closeError;
    }
    return NextResponse.json({message:MESSAGES[status]});
  }catch(e){console.error("admin_claim_error",e instanceof Error?e.message:"Error inesperado");return NextResponse.json({error:"No se pudo actualizar la solicitud."},{status:502});}
}
