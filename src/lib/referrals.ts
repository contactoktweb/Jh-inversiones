// Utilidades del programa de referidos (servidor y navegador).
export const DEFAULT_REFERRAL_PCT = 5;
export const REFERRAL_STORAGE_KEY = "jh_ref";

/** Código en mayúsculas y sin espacios; null si no tiene el formato de la plataforma. */
export function normalizeReferralCode(value: unknown) {
  if (typeof value !== "string") return null;
  const code = value.trim().toUpperCase().replace(/\s+/g, "");
  return /^[A-Z0-9]{4,16}$/.test(code) ? code : null;
}

/** Comisión redondeada a centavos. */
export const referralAmount = (baseUsd: number, pct: number) => Math.round(baseUsd * pct) / 100;

export const COMMISSION_STATUS_LABELS: Record<string, string> = { pending: "POR PAGAR", paid: "PAGADA", cancelled: "ANULADA" };

/** Oculta parte de un correo para mostrarlo a otra persona (ana.perez@gmail.com → an•••@gmail.com). */
export function maskEmail(email: string) {
  const [user, domain] = email.split("@");
  if (!domain) return "•••";
  return `${user.slice(0, 2)}•••@${domain}`;
}

/** Nombre corto para mostrar a quien refirió: «Ana P.» o el correo enmascarado. */
export function referralDisplayName(fullName: string | null | undefined, email: string) {
  const parts = (fullName || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return maskEmail(email);
  return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1].charAt(0)}.` : parts[0];
}
