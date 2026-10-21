import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getPlan } from "@/lib/plans";
import { getSupabaseAdmin } from "@/lib/server/admin";
import { paymentsApproved, isDemoMode } from "@/lib/config";

export const runtime="nodejs";
export async function POST(request:Request){
  if(isDemoMode||!paymentsApproved)return NextResponse.json({error:"Procesamiento deshabilitado."},{status:503});
  const key=process.env.STRIPE_SECRET_KEY;
  const secret=process.env.STRIPE_WEBHOOK_SECRET;
  const signature=request.headers.get("stripe-signature");
  if(!key||!secret||!signature)return NextResponse.json({error:"Webhook incompleto."},{status:400});
  const stripe=new Stripe(key);
  let event:Stripe.Event;
  try{const raw=await request.text();event=stripe.webhooks.constructEvent(raw,signature,secret);}catch{return NextResponse.json({error:"Firma inválida."},{status:400});}
  if(event.type!=="checkout.session.completed"&&event.type!=="checkout.session.async_payment_succeeded")return NextResponse.json({received:true});
  const session=event.data.object as Stripe.Checkout.Session;
  if(session.mode!=="payment"||session.payment_status!=="paid")return NextResponse.json({received:true});
  const userId=session.client_reference_id;
  const planId=session.metadata?.plan_id;
  const plan=planId?getPlan(planId):undefined;
  if(!userId||!plan||session.currency!=="cop"||session.amount_total!==plan.priceCop*100){
    console.error("webhook_unexpected_session",session.id);
    return NextResponse.json({error:"Datos de pago no corresponden al plan."},{status:400});
  }
  const now=new Date();
  const ends=new Date(now.getTime()+plan.durationDays*86_400_000);
  try{
    const admin=getSupabaseAdmin();
    const {error}=await admin.from("investments").insert({
      user_id:userId,plan_id:plan.id,principal_cop:plan.priceCop,
      illustrative_return_pct:plan.illustrativeReturnPct,
      started_at:now.toISOString(),ends_at:ends.toISOString(),
      stripe_session_id:session.id,status:"active",
    });
    if(error&&error.code!=="23505")throw error;
    return NextResponse.json({received:true});
  }catch(e){console.error("webhook_persist_error",e instanceof Error?e.message:"Error desconocido");return NextResponse.json({error:"No se pudo confirmar el registro."},{status:500});}
}
