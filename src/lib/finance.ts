// Fechas siempre en hora de Bogotá y formato de 24 h: así el servidor y el navegador muestran lo mismo.
const TIME_ZONE = "America/Bogota";
export const formatDate = (date: string | Date | number) =>
  new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "short", year: "numeric", timeZone: TIME_ZONE }).format(new Date(date));

export const formatUsd = (value: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);

export type Investment = {
  id: string;
  plan_id: string;
  /** Nombre del plan (de la tabla plans). */
  plan_name?: string;
  principal_usd: number;
  started_at: string;
  ends_at: string;
  status: string;
  claim_status?: string | null;
  claim_requested_at?: string | null;
  claim_amount_usd?: number | null;
  owner_email?: string;
  owner_name?: string | null;
  user_id?: string;
  payment_method?: string;
  payment_reference?: string;
  created_at?: string;
  confirmed_at?: string | null;
  admin_note?: string | null;
  claim_payout_details?: string | null;
  claim_payout_reference?: string | null;
  claim_admin_note?: string | null;
  claim_resolved_at?: string | null;
};

export const formatDateTime = (date: string | Date | number) =>
  new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: TIME_ZONE }).format(new Date(date));

export const INVESTMENT_STATUS_LABELS: Record<string, string> = { pending_payment: "PAGO PENDIENTE", active: "ACTIVA", closed: "CERRADA", cancelled: "CANCELADA" };
export const CLAIM_STATUS_LABELS: Record<string, string> = { pending: "PENDIENTE", approved: "APROBADO", settled: "DESEMBOLSADO", rejected: "RECHAZADO" };
export const PAYMENT_METHOD_LABELS: Record<string, string> = { test: "Pago de prueba", transfer: "Transferencia", manual: "Registro manual", stripe: "Tarjeta (pasarela)" };
