import "server-only";

/** Variable REQUIRE_EMAIL_CONFIRMATION=true: el cliente confirma su correo (enlace enviado por Resend) antes de entrar. */
export const requireEmailConfirmation = () => process.env.REQUIRE_EMAIL_CONFIRMATION === "true";

export const isEmail = (value: unknown): value is string =>
  typeof value === "string" && value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

/** Enlace de un solo uso hacia /auth/confirm (funciona en cualquier navegador o dispositivo). */
export function confirmLink(origin: string, tokenHash: string, type: "signup" | "recovery") {
  const url = new URL("/auth/confirm", origin);
  url.searchParams.set("token_hash", tokenHash);
  url.searchParams.set("type", type);
  return url.toString();
}

/** Origen público de la plataforma: NEXT_PUBLIC_SITE_URL o, si falta, el de la solicitud. */
export function publicOrigin(request: Request) {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) { try { return new URL(configured).origin; } catch { /* usa el de la solicitud */ } }
  return new URL(request.url).origin;
}
