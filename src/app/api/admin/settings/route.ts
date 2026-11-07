import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/server/admin";
import { logAudit } from "@/lib/server/audit";
import { fail, guard, readJson } from "@/lib/server/http";

export const runtime="nodejs";
const EDITABLE=["transfer_instructions"] as const;

/** Guarda los ajustes editables desde /admin/ajustes. */
export async function POST(request:Request){
  const {session,error}=await guard(request,"admin");
  if(error)return error;
  const body=await readJson(request);
  if(!body)return fail("Solicitud inválida.",400);
  const rows=EDITABLE.filter(key=>typeof body[key]==="string").map(key=>({key,value:(body[key] as string).trim().slice(0,2000),updated_by:session.userId,updated_at:new Date().toISOString()}));
  if(!rows.length)return fail("No hay cambios para guardar.",400);
  try{
    const {error:upsertError}=await getSupabaseAdmin().from("settings").upsert(rows);
    if(upsertError)throw upsertError;
    await logAudit(session,"settings.update","settings",null,Object.fromEntries(rows.map(r=>[r.key,r.value])));
    return NextResponse.json({message:"Ajustes guardados."});
  }catch(e){console.error("admin_settings_error",e instanceof Error?e.message:e);return fail("No se pudieron guardar los ajustes.",502);}
}
