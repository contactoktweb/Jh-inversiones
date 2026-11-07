import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/server/admin";
import { logAudit } from "@/lib/server/audit";
import { fail, guard, isUuid, readJson } from "@/lib/server/http";

export const runtime="nodejs";
const ACTIONS={suspend:{status:"suspended"},activate:{status:"active"},make_admin:{role:"admin"},remove_admin:{role:"user"}} as const;
const MESSAGES={suspend:"Cuenta suspendida.",activate:"Cuenta reactivada.",make_admin:"Ahora es administrador.",remove_admin:"Ya no es administrador."} as const;

/** Suspender/reactivar una cuenta o cambiar su rol. */
export async function POST(request:Request){
  const {session,error}=await guard(request,"admin");
  if(error)return error;
  const body=await readJson(request);
  if(!body||!isUuid(body.userId))return fail("Identificador inválido.",400);
  const action=body.action as keyof typeof ACTIONS;
  if(!(action in ACTIONS))return fail("Acción inválida.",400);
  if(body.userId===session.userId)return fail("No puedes cambiar tu propia cuenta desde aquí.",400);
  try{
    const admin=getSupabaseAdmin();
    const {data:profile}=await admin.from("profiles").select("id,email").eq("id",body.userId).maybeSingle();
    if(!profile)return fail("Cuenta no encontrada.",404);
    const {error:updateError}=await admin.from("profiles").update({...ACTIONS[action],updated_at:new Date().toISOString()}).eq("id",profile.id);
    if(updateError)throw updateError;
    await logAudit(session,`user.${action}`,"user",profile.id,{email:profile.email});
    return NextResponse.json({message:MESSAGES[action]});
  }catch(e){console.error("admin_user_error",e instanceof Error?e.message:e);return fail("No se pudo actualizar la cuenta.",502);}
}
