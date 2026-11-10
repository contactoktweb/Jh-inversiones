import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/server/admin";
import { logAudit } from "@/lib/server/audit";
import { fail, guard, readJson } from "@/lib/server/http";
import { isImageDataUrl } from "@/lib/images";

export const runtime="nodejs";
const EDITABLE=["transfer_instructions"] as const;

/** Guarda los ajustes editables desde /admin/ajustes. */
export async function POST(request:Request){
  const {session,error}=await guard(request,"admin");
  if(error)return error;
  const body=await readJson(request);
  if(!body)return fail("Solicitud inválida.",400);
  const now=new Date().toISOString();
  const rows=EDITABLE.filter(key=>typeof body[key]==="string").map(key=>({key:key as string,value:(body[key] as string).trim().slice(0,2000),updated_by:session.userId,updated_at:now}));
  // Foto con los datos de pago: "" la quita; si no, debe ser una imagen válida.
  const image=body.transfer_image;
  if(typeof image==="string"){
    if(image!==""&&!isImageDataUrl(image))return fail("La foto no es válida o pesa demasiado.",400);
    rows.push({key:"transfer_image",value:image,updated_by:session.userId,updated_at:now});
  }
  if(!rows.length)return fail("No hay cambios para guardar.",400);
  try{
    const {error:upsertError}=await getSupabaseAdmin().from("settings").upsert(rows);
    if(upsertError)throw upsertError;
    await logAudit(session,"settings.update","settings",null,Object.fromEntries(rows.map(r=>[r.key,r.key==="transfer_image"?(r.value?"foto actualizada":"foto eliminada"):r.value])));
    return NextResponse.json({message:"Ajustes guardados."});
  }catch(e){console.error("admin_settings_error",e instanceof Error?e.message:e);return fail("No se pudieron guardar los ajustes.",502);}
}
