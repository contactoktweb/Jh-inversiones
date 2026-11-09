import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSupabaseAdmin } from "@/lib/server/admin";
import { logAudit } from "@/lib/server/audit";
import { fail, guard, readJson } from "@/lib/server/http";
import { getPlans } from "@/lib/server/plans";
import { MAX_INVESTMENT_USD, MIN_INVESTMENT_USD } from "@/lib/rates";

export const runtime="nodejs";

const text=(v:unknown,max:number)=>typeof v==="string"?v.trim().slice(0,max):"";
const slug=(name:string)=>name.normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,30)||"plan";
const refresh=()=>{revalidatePath("/");revalidatePath("/terminos");};

/**
 * Planes de inversión (/admin/planes).
 * action: "save" (crear si no hay id, o editar) · "toggle" (mostrar/ocultar) · "delete" (solo si no tiene inversiones).
 */
export async function POST(request:Request){
  const {session,error}=await guard(request,"admin");
  if(error)return error;
  const body=await readJson(request);
  if(!body)return fail("Solicitud inválida.",400);
  const admin=getSupabaseAdmin();
  const plans=await getPlans();
  const id=typeof body.id==="string"?body.id:"";
  const current=id?plans.find(p=>p.id===id):undefined;
  if(id&&!current)return fail("Plan no encontrado.",404);
  try{
    if(body.action==="save"){
      const name=text(body.name,40), eyebrow=text(body.eyebrow,40), caption=text(body.caption,160);
      const minUsd=body.minUsd;
      const features=(Array.isArray(body.features)?body.features:[]).map(f=>text(f,80)).filter(Boolean).slice(0,8);
      const highlighted=body.highlighted===true;
      const sortOrder=Number.isInteger(body.sortOrder)?Math.max(0,Math.min(999,body.sortOrder as number)):(current?.sortOrder??plans.length+1);
      if(!name)return fail("Escribe el nombre del plan.",400);
      if(typeof minUsd!=="number"||!Number.isInteger(minUsd)||minUsd<MIN_INVESTMENT_USD||minUsd>MAX_INVESTMENT_USD)
        return fail(`El monto «desde» debe ser un número entero entre ${MIN_INVESTMENT_USD} y ${MAX_INVESTMENT_USD.toLocaleString("en-US")} USD.`,400);
      const active=current?current.active:true;
      if(active&&plans.some(p=>p.active&&p.id!==id&&p.minUsd===minUsd))return fail(`Ya hay otro plan visible que empieza en ${minUsd} USD. Usa un monto distinto.`,409);
      const row={name,eyebrow,caption,min_usd:minUsd,features,highlighted,sort_order:sortOrder,updated_by:session.userId,updated_at:new Date().toISOString()};
      let planId=id;
      if(current){
        const {error:e}=await admin.from("plans").update(row).eq("id",id);
        if(e)throw e;
      }else{
        planId=`${slug(name)}-${randomBytes(2).toString("hex")}`;
        const {error:e}=await admin.from("plans").insert({id:planId,...row,active:true});
        if(e)throw e;
      }
      await logAudit(session,current?"plan.update":"plan.create","plan",planId,{name,min_usd:minUsd,highlighted,features});
      refresh();
      return NextResponse.json({message:current?`Plan «${name}» actualizado.`:`Plan «${name}» creado.`,id:planId});
    }
    if(!current)return fail("Indica el plan.",400);
    if(body.action==="toggle"){
      const show=!current.active;
      if(!show&&plans.filter(p=>p.active).length<=1)return fail("Debe quedar al menos un plan visible.",409);
      if(show&&plans.some(p=>p.active&&p.minUsd===current.minUsd))return fail(`Ya hay otro plan visible que empieza en ${current.minUsd} USD. Cambia el monto antes de mostrarlo.`,409);
      const {error:e}=await admin.from("plans").update({active:show,updated_by:session.userId,updated_at:new Date().toISOString()}).eq("id",id);
      if(e)throw e;
      await logAudit(session,show?"plan.show":"plan.hide","plan",id,{name:current.name});
      refresh();
      return NextResponse.json({message:show?`El plan «${current.name}» vuelve a estar visible.`:`El plan «${current.name}» quedó oculto.`});
    }
    if(body.action==="delete"){
      const {count}=await admin.from("investments").select("id",{count:"exact",head:true}).eq("plan_id",id);
      if(count)return fail(`Este plan tiene ${count} inversión(es) y no se puede eliminar. Puedes ocultarlo.`,409);
      if(current.active&&plans.filter(p=>p.active).length<=1)return fail("Debe quedar al menos un plan visible.",409);
      const {error:e}=await admin.from("plans").delete().eq("id",id);
      if(e)throw e;
      await logAudit(session,"plan.delete","plan",id,{name:current.name});
      refresh();
      return NextResponse.json({message:`Plan «${current.name}» eliminado.`});
    }
    return fail("Acción no válida.",400);
  }catch(e){console.error("admin_plans_error",e instanceof Error?e.message:e);return fail("No se pudo guardar el plan.",502);}
}
