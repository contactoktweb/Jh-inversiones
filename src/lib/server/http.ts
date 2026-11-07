import "server-only";
import { NextResponse } from "next/server";
import { getSession, type Session } from "./session";

/** Rechaza solicitudes POST enviadas desde otro sitio (protección CSRF básica). */
export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try { return new URL(origin).host === request.headers.get("host"); } catch { return false; }
}

export const fail = (error: string, status: number) => NextResponse.json({ error }, { status });

export async function readJson(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const body: unknown = await request.json();
    return body && typeof body === "object" && !Array.isArray(body) ? body as Record<string, unknown> : null;
  } catch { return null; }
}

export const isUuid = (value: unknown): value is string => typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

/** Texto opcional recortado; devuelve null si está vacío. */
export function optionalText(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim().slice(0, max);
  return text || null;
}

type Guard = { session: Session; error?: never } | { session?: never; error: NextResponse };

/** Valida origen y sesión; con role "admin" exige administrador, con "user" exige cuenta de cliente activa. */
export async function guard(request: Request, role: "user" | "admin"): Promise<Guard> {
  if (!sameOrigin(request)) return { error: fail("Origen no autorizado.", 403) };
  const session = await getSession();
  if (!session) return { error: fail("Tu sesión expiró. Vuelve a iniciar sesión.", 401) };
  if (role === "admin" && session.role !== "admin") return { error: fail("Solo un administrador puede hacer esto.", 403) };
  if (role === "user") {
    if (session.role !== "user") return { error: fail("Esta acción es solo para cuentas de inversionista.", 403) };
    if (session.status === "suspended") return { error: fail("Tu cuenta está suspendida. Contacta a soporte.", 403) };
  }
  return { session };
}
