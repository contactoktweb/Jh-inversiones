import { NextResponse } from "next/server";
import { calculateEarnings } from "@/lib/rates";
import { CLAIM_STATUS_LABELS, INVESTMENT_STATUS_LABELS, PAYMENT_METHOD_LABELS } from "@/lib/finance";
import { getPlan } from "@/lib/plans";
import { loadAdminData, loadAudit } from "@/lib/server/admin-data";
import { AUDIT_LABELS } from "@/lib/server/audit";
import { getRates, getSession } from "@/lib/server/session";

export const runtime="nodejs";
export const dynamic="force-dynamic";

const cell=(value:unknown)=>{const text=value==null?"":String(value);return /[",\n;]/.test(text)?`"${text.replace(/"/g,'""')}"`:text;};
const csv=(header:string[],rows:unknown[][])=>"﻿"+[header,...rows].map(r=>r.map(cell).join(",")).join("\n");
const money=(n:number)=>n.toFixed(2);

/** Descarga en CSV (abre en Excel/Sheets): ?tipo=inversiones | retiros | clientes | actividad */
export async function GET(request:Request){
  const session=await getSession();
  if(!session||session.role!=="admin")return NextResponse.json({error:"Solo administradores."},{status:403});
  const type=new URL(request.url).searchParams.get("tipo")||"inversiones";
  const now=Date.now();
  let content="";
  if(type==="actividad"){
    const audit=await loadAudit(5000);
    content=csv(["fecha","administrador","acción","entidad","id","detalles"],audit.map(a=>[new Date(a.created_at).toISOString(),a.actor_email,AUDIT_LABELS[a.action]||a.action,a.entity,a.entity_id,JSON.stringify(a.details)]));
  }else{
    const [{investments,profiles},rates]=await Promise.all([loadAdminData(),getRates()]);
    if(type==="clientes"){
      content=csv(["correo","nombre","teléfono","país","rol","estado","registro","inversiones activas","capital activo USD","datos de pago"],profiles.map(p=>{const own=investments.filter(i=>i.user_id===p.id&&i.status==="active");return [p.email,p.full_name,p.phone,p.country,p.role,p.status,new Date(p.created_at).toISOString(),own.length,money(own.reduce((s,i)=>s+i.principal_usd,0)),p.payout_details];}));
    }else if(type==="retiros"){
      content=csv(["solicitado","cliente","capital USD","total a pagar USD","estado","datos de pago del cliente","comprobante","nota","resuelto"],investments.filter(i=>i.claim_status).map(i=>[i.claim_requested_at,i.owner_email,money(i.principal_usd),money(i.claim_amount_usd??0),CLAIM_STATUS_LABELS[i.claim_status!],i.claim_payout_details,i.claim_payout_reference,i.claim_admin_note,i.claim_resolved_at]));
    }else{
      content=csv(["creada","cliente","plan","monto USD","método de pago","referencia","estado","inicio","retiro desde","ganancia USD","nota"],investments.map(i=>{const c=calculateEarnings(i,rates,now);return [i.created_at,i.owner_email,getPlan(i.plan_id)?.name||i.plan_id,money(i.principal_usd),PAYMENT_METHOD_LABELS[i.payment_method||""]||i.payment_method,i.payment_reference,INVESTMENT_STATUS_LABELS[i.status]||i.status,i.started_at,new Date(c.availableAt).toISOString(),money(c.earnings),i.admin_note];}));
    }
  }
  const date=new Date().toISOString().slice(0,10);
  return new NextResponse(content,{headers:{"Content-Type":"text/csv; charset=utf-8","Content-Disposition":`attachment; filename="jh-${type}-${date}.csv"`,"Cache-Control":"no-store"}});
}
