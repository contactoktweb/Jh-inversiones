import { NextResponse } from "next/server";
import { MAX_INVESTMENT_USD, MIN_INVESTMENT_USD } from "@/lib/rates";
import { paymentMethods, type PaymentMethod } from "@/lib/config";
import { fail, guard, readJson } from "@/lib/server/http";
import { PaymentError, startPayment } from "@/lib/server/payments";

export const runtime="nodejs";

/** Inicia el pago de una inversión con el método elegido (ver src/lib/server/payments.ts). */
export async function POST(request: Request){
  const {session,error}=await guard(request,"user");
  if(error)return error;
  const body=await readJson(request);
  if(!body)return fail("Solicitud inválida.",400);
  const {amountUsd:amount,acceptTerms}=body;
  const method=(body.method??paymentMethods[0]) as PaymentMethod;
  if(typeof amount!=="number"||!Number.isInteger(amount)||amount<MIN_INVESTMENT_USD||amount>MAX_INVESTMENT_USD)
    return fail(`El monto debe ser un número entero entre ${MIN_INVESTMENT_USD} y ${MAX_INVESTMENT_USD.toLocaleString("en-US")} USD.`,400);
  if(acceptTerms!==true)return fail("Debes aceptar los términos para continuar.",400);
  if(!paymentMethods.includes(method))return fail("Ese método de pago no está disponible.",400);
  try{
    const result=await startPayment(session,amount,method);
    if(result.kind==="redirect")return NextResponse.json({status:"redirect",url:result.url});
    // Transferencia: el administrador recibe el aviso cuando el cliente pulsa «Ya realicé la transferencia» (/api/payments/report).
    return NextResponse.json({status:result.kind,test:result.kind==="accepted",message:result.kind==="accepted"?"Pago de prueba aceptado":"Inversión registrada: pendiente de pago",investmentId:result.investmentId,reference:result.reference,amountUsd:result.amountUsd,planName:result.planName});
  }catch(e){
    if(e instanceof PaymentError)return fail(e.message,e.status);
    console.error("checkout_error",e instanceof Error?e.message:e);
    return fail("No fue posible registrar la inversión. Intenta de nuevo.",502);
  }
}
