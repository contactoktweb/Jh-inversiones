export const formatCop = (value: number) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);

export const formatDate = (date: string | Date | number) =>
  new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "short", year: "numeric" }).format(new Date(date));

export type Investment = {
  id: string;
  plan_id: string;
  principal_cop: number;
  illustrative_return_pct: number;
  started_at: string;
  ends_at: string;
  status: string;
  claim_status?: string | null;
};

export function calculatePosition(position: Investment, now = Date.now()) {
  const started = new Date(position.started_at).getTime();
  const ends = new Date(position.ends_at).getTime();
  const duration = Math.max(1, ends - started);
  const progress = Math.max(0, Math.min(1, (now - started) / duration));
  const projectedTotal = position.principal_cop * (1 + position.illustrative_return_pct / 100);
  const accruedEstimate = (projectedTotal - position.principal_cop) * progress;
  return { progress, accruedEstimate, projectedTotal, canClaim: progress >= 1 && position.status === "active" };
}

export function makeDemoInvestments(): Investment[] {
  const now = Date.now();
  const day = 86_400_000;
  return [
    {
      id: "demo-orbita",
      plan_id: "evolucion",
      principal_cop: 750_000,
      illustrative_return_pct: 4.8,
      started_at: new Date(now - 38 * day).toISOString(),
      ends_at: new Date(now + 52 * day).toISOString(),
      status: "active",
    },
    {
      id: "demo-impulso",
      plan_id: "inicio",
      principal_cop: 250_000,
      illustrative_return_pct: 1.2,
      started_at: new Date(now - 13 * day).toISOString(),
      ends_at: new Date(now + 17 * day).toISOString(),
      status: "active",
    },
    {
      id: "demo-anterior",
      plan_id: "inicio",
      principal_cop: 250_000,
      illustrative_return_pct: 1.2,
      started_at: new Date(now - 52 * day).toISOString(),
      ends_at: new Date(now - 22 * day).toISOString(),
      status: "active",
    },
  ];
}
