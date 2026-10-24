import { NextResponse } from "next/server";
import { DEMO_ROLE_COOKIE } from "@/lib/server/session";

// Acceso rápido provisional: crea una sesión de demostración con datos ficticios.
function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try { return new URL(origin).host === request.headers.get("host"); } catch { return false; }
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Origen no autorizado." }, { status: 403 });
  if (process.env.NEXT_PUBLIC_QUICK_LOGIN === "false") return NextResponse.json({ error: "El acceso rápido está deshabilitado." }, { status: 403 });
  const form = await request.formData().catch(() => null);
  const role = form?.get("role");
  if (role !== "user" && role !== "admin") return NextResponse.json({ error: "Rol inválido." }, { status: 400 });
  const response = NextResponse.redirect(new URL(role === "admin" ? "/admin" : "/dashboard", request.url), 303);
  response.cookies.set(DEMO_ROLE_COOKIE, role, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 12 });
  return response;
}
