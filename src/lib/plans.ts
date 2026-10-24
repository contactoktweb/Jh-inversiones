// Modalidades de inversión. La ganancia diaria la fija el administrador (ver src/lib/rates.ts).
import { MIN_INVESTMENT_USD, MIN_TERM_DAYS } from "./rates";

export const plans = [
  {
    id: "inicio",
    name: "Impulso",
    eyebrow: "Para empezar",
    minUsd: MIN_INVESTMENT_USD,
    durationDays: MIN_TERM_DAYS,
    caption: "Tu primer paso, desde 50 dólares.",
    features: ["Panel de seguimiento", "Ganancia diaria visible", "Retiro desde el primer mes"],
    accent: "lime",
  },
  {
    id: "evolucion",
    name: "Órbita",
    eyebrow: "Más elegido",
    minUsd: 500,
    durationDays: MIN_TERM_DAYS,
    caption: "Para crecer con más capital.",
    features: ["Todo lo del plan Impulso", "Gráficos de evolución", "Alertas de estado"],
    accent: "violet",
  },
  {
    id: "vision",
    name: "Horizonte",
    eyebrow: "Largo plazo",
    minUsd: 2_000,
    durationDays: MIN_TERM_DAYS,
    caption: "Pensado para mirar más lejos.",
    features: ["Todo lo del plan Órbita", "Visión del periodo completo", "Historial de solicitudes"],
    accent: "sky",
  },
] as const;

export type PlanId = (typeof plans)[number]["id"];
export type Plan = (typeof plans)[number];
export const getPlan = (id: string) => plans.find((plan) => plan.id === id);
/** Plan que corresponde a un monto: el de mayor mínimo que el monto alcanza. */
export const planForAmount = (amount: number) => [...plans].reverse().find((plan) => amount >= plan.minUsd) ?? plans[0];
