import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/server/supabase";
export async function POST(request: Request) {
  const origin=request.headers.get("origin");
  if(origin&&new URL(origin).host!==request.headers.get("host"))return NextResponse.json({error:"Origen inválido."},{status:403});
  const supabase=await getSupabaseServer();
  if(supabase) await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/",request.url),303);
}
