import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/server/admin";
import { fail, guard, optionalText, readJson } from "@/lib/server/http";

export const runtime="nodejs";

/** El cliente actualiza sus datos personales y dónde recibir sus retiros. */
export async function POST(request:Request){
  const {session,error}=await guard(request,"user");
  if(error)return error;
  const body=await readJson(request);
  if(!body)return fail("Solicitud inválida.",400);
  const fullName=optionalText(body.fullName,120);
  if(!fullName||fullName.length<3)return fail("Escribe tu nombre completo.",400);
  const phone=optionalText(body.phone,40);
  if(phone&&!/^[+\d][\d\s()-]{5,}$/.test(phone))return fail("El teléfono no es válido.",400);
  try{
    const {error:updateError}=await getSupabaseAdmin().from("profiles").update({
      full_name:fullName,phone,country:optionalText(body.country,60),payout_details:optionalText(body.payoutDetails,1000),updated_at:new Date().toISOString(),
    }).eq("id",session.userId);
    if(updateError)throw updateError;
    return NextResponse.json({message:"Datos guardados."});
  }catch(e){console.error("profile_error",e instanceof Error?e.message:e);return fail("No se pudieron guardar tus datos.",502);}
}
