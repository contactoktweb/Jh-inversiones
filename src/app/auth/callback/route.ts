import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/server/supabase";
export async function GET(request:Request) {
  const url=new URL(request.url);
  const code=url.searchParams.get("code");
  const candidate=url.searchParams.get("next")||"/dashboard";
  const next=candidate.startsWith("/")&&!candidate.startsWith("//")&&!candidate.includes("\\")?candidate:"/dashboard";
  if(code){const supabase=await getSupabaseServer();if(supabase){const {error}=await supabase.auth.exchangeCodeForSession(code);if(!error)return NextResponse.redirect(new URL(next,url.origin));}}
  return NextResponse.redirect(new URL("/acceso?error=callback",url.origin));
}
