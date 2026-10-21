import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getPlan } from "@/lib/plans";
import { isDemoMode, paymentsApproved, siteUrl } from "@/lib/config";
import { getSupabaseServer } from "@/lib/server/supabase";

export const runtime="nodejs";
function sameOrigin(request: Request) {
  const origin=request.headers.get("origin");
  if(!origin)return true;
  try{return new URL(origin).host===request.headers.get("host");}catch{return false;}
}
export async function POST(request: Request){
  if(!sameOrigin(request))return NextResponse.json({error:"Origen no autorizado."},{status:403});
  if(isDemoMode)return NextResponse.json({demo:true,message:"La demostración no genera ningún cobro."});
  if(!paymentsApproved)return NextResponse.json({error:"Pagos deshabilitados hasta completar la validación legal y del proveedor de pagos."},{status:503});
  if(!process.env.STRIPE_SECRET_KEY)return NextResponse.json({error:"Pasarela de pago sin configurar."},{status:503});
  const supabase=await getSupabaseServer();
  if(!supabase)return NextResponse.json({error:"Servicio de identidad no configurado."},{status:503});
  const {data:{user},error:authError}=await supabase.auth.getUser();
  if(authError||!user)return NextResponse.json({error:"Debes iniciar sesión."},{status:401});
  let body:unknown;
  try{body=await request.json()}catch{return NextResponse.json({error:"JSON inválido."},{status:400});}
  const planId=(body&&typeof body==="object"&&"planId" in body&&(body as {planId:unknown}).planId);
  if(typeof planId!=="string")return NextResponse.json({error:"Selecciona un plan válido."},{status:400});
  const plan=getPlan(planId);
  if(!plan)return NextResponse.json({error:"Plan inexistente."},{status:400});
  try{
    const stripe=new Stripe(process.env.STRIPE_SECRET_KEY);
    // Monto y plazo siempre determinados por el servidor, jamás recibidos del navegador.
    const session=await stripe.checkout.sessions.create({
      mode:"payment",
      payment_method_types:["card"],
      customer_email:user.email,
      client_reference_id:user.id,
      metadata:{plan_id:plan.id},
      line_items:[{price_data:{currency:"cop",unit_amount:plan.priceCop*100,product_data:{name:`JH · ${plan.name}`,description:`Periodo de ${plan.durationDays} días. Los resultados no están garantizados.`}},quantity:1}],
      success_url:`${siteUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:`${siteUrl}/#planes`,
    });
    return NextResponse.json({url:session.url});
  }catch(e){console.error("checkout_error",e instanceof Error?e.message:"Error inesperado");return NextResponse.json({error:"No fue posible crear la sesión de pago."},{status:502});}
}
