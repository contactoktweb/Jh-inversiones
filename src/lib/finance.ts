export const formatDate = (date: string | Date | number) =>
  new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "short", year: "numeric" }).format(new Date(date));

export const formatUsd = (value: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);

export type Investment = {
  id: string;
  plan_id: string;
  principal_usd: number;
  started_at: string;
  ends_at: string;
  status: string;
  claim_status?: string | null;
  claim_requested_at?: string | null;
  claim_amount_usd?: number | null;
  owner_email?: string;
  payment_method?: string;
};
