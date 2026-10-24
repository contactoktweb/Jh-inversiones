import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/server/admin";
import { DEMO_RATES_COOKIE, getDemoRates, getSession } from "@/lib/server/session";
import { isValidDayKey, isValidRate, todayKey } from "@/lib/rates";

export const runtime="nodejs";
function sameOrigin(request:Request){const origin=request.headers.get("origin");if(!origin)return true;try{return new URL(origin).host===request.headers.get("host");}catch{return false;}}

/** Guarda el porcentaje de ganancia de un día. Solo administradores. */
export async function POST(request:Request){
  if(!sameOrigin(request))return NextResponse.json({error:"Origen no autorizado."},{status:403});
  const session=await getSession();
  if(!session)return NextResponse.json({error:"Tu sesión expiró."},{status:401});
  if(session.role!=="admin")return NextResponse.json({error:"Solo un administrador puede configurar las tasas."},{status:403});
  let body:unknown;
  try{body=await request.json()}catch{return NextResponse.json({error:"Solicitud inválida."},{status:400});}
  const {date,ratePct}=(body&&typeof body==="object"?body:{}) as {date?:unknown;ratePct?:unknown};
  if(!isValidDayKey(date))return NextResponse.json({error:"Fecha inválida."},{status:400});
  if(date>todayKey())return NextResponse.json({error:"Solo puedes configurar el día de hoy o días anteriores."},{status:400});
  if(!isValidRate(ratePct))return NextResponse.json({error:"El porcentaje debe estar entre 0 y 100."},{status:400});
  const rate=Math.round(ratePct*1000)/1000;
  if(session.kind==="demo"){
    const rates={...(await getDemoRates()),[date]:rate};
    const response=NextResponse.json({message:`Tasa del ${date} guardada: ${rate}%.`,date,ratePct:rate});
    response.cookies.set(DEMO_RATES_COOKIE,JSON.stringify(rates),{httpOnly:true,sameSite:"lax",secure:process.env.NODE_ENV==="production",path:"/",maxAge:60*60*24*120});
    return response;
  }
  try{
    const {error}=await getSupabaseAdmin().from("daily_rates").upsert({rate_date:date,rate_pct:rate,set_by:session.userId,updated_at:new Date().toISOString()});
    if(error)throw error;
    return NextResponse.json({message:`Tasa del ${date} guardada: ${rate}%.`,date,ratePct:rate});
  }catch(e){console.error("rate_error",e instanceof Error?e.message:"Error inesperado");return NextResponse.json({error:"No se pudo guardar la tasa."},{status:502});}
}
