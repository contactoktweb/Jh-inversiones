import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/server/supabase";
import { DEMO_ROLE_COOKIE } from "@/lib/server/session";
export async function POST(request: Request) {
  const origin=request.headers.get("origin");
  if(origin&&new URL(origin).host!==request.headers.get("host"))return NextResponse.json({error:"Origen inválido."},{status:403});
  const supabase=await getSupabaseServer();
  if(supabase) await supabase.auth.signOut();
  const response=NextResponse.redirect(new URL("/acceso",request.url),303);
  response.cookies.delete(DEMO_ROLE_COOKIE);
  return response;
}
