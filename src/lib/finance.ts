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
  owner_email?: string;
};

export function makeDemoInvestments(): Investment[] {
  const now = Date.now();
  const day = 86_400_000;
  const position = (id: string, plan_id: string, principal_usd: number, daysAgo: number, owner_email = "demo@jh-inversiones.local"): Investment => ({
    id, plan_id, principal_usd, owner_email, status: "active",
    started_at: new Date(now - daysAgo * day).toISOString(),
    ends_at: new Date(now + (30 - daysAgo) * day).toISOString(),
  });
  return [
    position("demo-orbita", "evolucion", 500, 18),
    position("demo-impulso", "inicio", 50, 6),
    position("demo-anterior", "inicio", 150, 41),
  ];
}

/** Inversiones de otros clientes ficticios, visibles solo para el administrador demo. */
export function makeDemoAdminInvestments(): Investment[] {
  const now = Date.now();
  const day = 86_400_000;
  const others: Array<[string, number, number]> = [["maria.gomez@ejemplo.com", 1200, 25], ["carlos.r@ejemplo.com", 80, 3], ["laura.p@ejemplo.com", 2500, 47]];
  return [
    ...makeDemoInvestments(),
    ...others.map(([owner_email, principal_usd, daysAgo], i) => ({
      id: `demo-cliente-${i + 1}`, plan_id: principal_usd >= 2000 ? "vision" : principal_usd >= 500 ? "evolucion" : "inicio",
      principal_usd, owner_email, status: "active",
      started_at: new Date(now - daysAgo * day).toISOString(),
      ends_at: new Date(now + (30 - daysAgo) * day).toISOString(),
    })),
  ];
}
