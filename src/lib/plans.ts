// Planes de inversión. Se guardan en Supabase (tabla `plans`) y el administrador los edita
// en /admin/planes. La ganancia diaria es la misma para todos (ver src/lib/rates.ts).
import { MIN_INVESTMENT_USD } from "./rates";

export type Plan = {
  id: string;
  name: string;
  eyebrow: string;
  caption: string;
  minUsd: number;
  features: string[];
  highlighted: boolean;
  active: boolean;
  sortOrder: number;
};

export type PlanRow = {
  id: string; name: string; eyebrow: string | null; caption: string | null; min_usd: number | string;
  features: string[] | null; highlighted: boolean | null; active: boolean | null; sort_order: number | null;
};

export const planFromRow = (r: PlanRow): Plan => ({
  id: r.id, name: r.name, eyebrow: r.eyebrow || "", caption: r.caption || "", minUsd: Number(r.min_usd),
  features: r.features || [], highlighted: Boolean(r.highlighted), active: r.active !== false, sortOrder: r.sort_order ?? 0,
});

/** Planes iniciales (los mismos que crea supabase/schema.sql). Se usan solo si la base no responde. */
export const DEFAULT_PLANS: Plan[] = [
  { id: "inicio", name: "Impulso", eyebrow: "Para empezar", caption: "Tu primer paso, desde 50 dólares.", minUsd: 50,
    features: ["Panel de seguimiento", "Ganancia diaria visible", "Retiro desde el primer mes"], highlighted: false, active: true, sortOrder: 1 },
  { id: "evolucion", name: "Órbita", eyebrow: "Más elegido", caption: "Para crecer con más capital.", minUsd: 500,
    features: ["Todo lo del plan Impulso", "Gráficos de evolución", "Alertas de estado"], highlighted: true, active: true, sortOrder: 2 },
  { id: "vision", name: "Horizonte", eyebrow: "Largo plazo", caption: "Pensado para mirar más lejos.", minUsd: 2000,
    features: ["Todo lo del plan Órbita", "Visión del periodo completo", "Historial de solicitudes"], highlighted: false, active: true, sortOrder: 3 },
];

/** Planes visibles, ordenados como los ordenó el administrador. */
export const activePlans = (plans: Plan[]) =>
  plans.filter(p => p.active).sort((a, b) => a.sortOrder - b.sortOrder || a.minUsd - b.minUsd);

/** Monto mínimo para invertir: el «desde» más bajo de los planes visibles (nunca menos de 50 USD). */
export const minInvestment = (plans: Plan[]) => {
  const mins = plans.filter(p => p.active).map(p => p.minUsd);
  return Math.max(MIN_INVESTMENT_USD, mins.length ? Math.min(...mins) : MIN_INVESTMENT_USD);
};

/** Plan que corresponde a un monto: el plan visible de mayor «monto desde» que el monto alcanza. */
export function planForAmount(plans: Plan[], amount: number): Plan | undefined {
  return plans.filter(p => p.active && amount >= p.minUsd).sort((a, b) => b.minUsd - a.minUsd || a.sortOrder - b.sortOrder)[0];
}

/** Nombre del plan para mostrar (también de planes ocultos). */
export const planName = (plans: Plan[], id: string) => plans.find(p => p.id === id)?.name || id;
