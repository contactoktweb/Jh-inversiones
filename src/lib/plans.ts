// Datos de ejemplo para la interfaz: NO son promesas ni ofertas de rentabilidad.
export const plans = [
  {
    id: "inicio",
    name: "Impulso",
    eyebrow: "Para empezar",
    priceCop: 250_000,
    durationDays: 30,
    illustrativeReturnPct: 1.2,
    caption: "Un primer paso, a tu ritmo.",
    features: ["Panel de seguimiento", "Resumen de tu periodo", "Solicitud al finalizar"],
    accent: "lime",
  },
  {
    id: "evolucion",
    name: "Órbita",
    eyebrow: "Más elegido",
    priceCop: 750_000,
    durationDays: 90,
    illustrativeReturnPct: 4.8,
    caption: "Una perspectiva de mediano plazo.",
    features: ["Todo lo del plan Impulso", "Gráficos de evolución", "Alertas de estado"],
    accent: "violet",
  },
  {
    id: "vision",
    name: "Horizonte",
    eyebrow: "Largo plazo",
    priceCop: 2_000_000,
    durationDays: 180,
    illustrativeReturnPct: 10.0,
    caption: "Pensado para mirar más lejos.",
    features: ["Todo lo del plan Órbita", "Visión del periodo completo", "Historial de solicitudes"],
    accent: "sky",
  },
] as const;

export type PlanId = (typeof plans)[number]["id"];
export type Plan = (typeof plans)[number];
export const getPlan = (id: string) => plans.find((plan) => plan.id === id);
