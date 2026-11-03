import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import Stripe from "stripe";
import { planForAmount } from "@/lib/plans";
import { MAX_INVESTMENT_USD, MIN_INVESTMENT_USD, MIN_TERM_DAYS } from "@/lib/rates";
import { paymentMode, paymentsApproved, siteUrl } from "@/lib/config";
import { getSupabaseAdmin } from "@/lib/server/admin";
import { getSession } from "@/lib/server/session";

export const runtime="nodejs";
function sameOrigin(request: Request) {
  const origin=request.headers.get("origin");
  if(!origin)return true;
  try{return new URL(origin).host===request.headers.get("host");}catch{return false;}
}

/** Inicia el pago de una inversión. En modo de prueba el pago se acepta y la inversión se crea al instante. */
export async function POST(request: Request){
  if(!sameOrigin(request))return NextResponse.json({error:"Origen no autorizado."},{status:403});
  const session=await getSession();
  if(!session)return NextResponse.json({error:"Debes iniciar sesión para invertir."},{status:401});
  if(session.role!=="user")return NextResponse.json({error:"Las cuentas de administrador no pueden invertir."},{status:403});
  let body:unknown;
  try{body=await request.json()}catch{return NextResponse.json({error:"JSON inválido."},{status:400});}
  const {amountUsd:amount,acceptTerms}=(body&&typeof body==="object"?body:{}) as {amountUsd?:unknown;acceptTerms?:unknown};
  if(typeof amount!=="number"||!Number.isInteger(amount)||amount<MIN_INVESTMENT_USD||amount>MAX_INVESTMENT_USD)
    return NextResponse.json({error:`El monto debe ser un número entero entre ${MIN_INVESTMENT_USD} y ${MAX_INVESTMENT_USD.toLocaleString("en-US")} USD.`},{status:400});
  if(acceptTerms!==true)return NextResponse.json({error:"Debes aceptar los términos para continuar."},{status:400});
  // El monto se valida en el servidor; el plan y el plazo se derivan de él, nunca del navegador.
  const plan=planForAmount(amount);

  if(paymentMode==="test"){
    try{
      const now=new Date();
      const reference=`test_${randomUUID()}`;
      const {data,error}=await getSupabaseAdmin().from("investments").insert({
        user_id:session.userId,plan_id:plan.id,principal_usd:amount,
        started_at:now.toISOString(),ends_at:new Date(now.getTime()+MIN_TERM_DAYS*86_400_000).toISOString(),
        payment_method:"test",payment_reference:reference,status:"active",
      }).select("id").single();
      if(error)throw error;
      return NextResponse.json({status:"accepted",test:true,message:"Pago de prueba aceptado",investmentId:data.id,reference,amountUsd:amount,planName:plan.name});
    }catch(e){console.error("test_payment_error",e instanceof Error?e.message:"Error inesperado");return NextResponse.json({error:"No fue posible registrar la inversión. Intenta de nuevo."},{status:502});}
  }

  if(!paymentsApproved)return NextResponse.json({error:"Los pagos con tarjeta aún no están habilitados."},{status:503});
  if(!process.env.STRIPE_SECRET_KEY)return NextResponse.json({error:"Pasarela de pago sin configurar."},{status:503});
  try{
    const stripe=new Stripe(process.env.STRIPE_SECRET_KEY);
    const checkout=await stripe.checkout.sessions.create({
      mode:"payment",
      payment_method_types:["card"],
      customer_email:session.email,
      client_reference_id:session.userId,
      metadata:{plan_id:plan.id,amount_usd:String(amount)},
      line_items:[{price_data:{currency:"usd",unit_amount:amount*100,product_data:{name:`JH · ${plan.name}`,description:`Plazo mínimo de ${plan.durationDays} días. Los resultados no están garantizados.`}},quantity:1}],
      success_url:`${siteUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:`${siteUrl}/invertir?monto=${amount}`,
    });
    return NextResponse.json({status:"redirect",url:checkout.url});
  }catch(e){console.error("checkout_error",e instanceof Error?e.message:"Error inesperado");return NextResponse.json({error:"No fue posible crear la sesión de pago."},{status:502});}
}
