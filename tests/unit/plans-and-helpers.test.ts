import { describe, expect, it } from "vitest";
import { activePlans, DEFAULT_PLANS, minInvestment, planForAmount, planName, type Plan } from "@/lib/plans";
import { MIN_INVESTMENT_USD } from "@/lib/rates";
import { formatUsd } from "@/lib/finance";
import { isUuid, optionalText } from "@/lib/server/http";
import { transferReference } from "@/lib/server/payments";

const plans = DEFAULT_PLANS;
const custom: Plan[] = [
  ...DEFAULT_PLANS.map(p => p.id === "inicio" ? { ...p, active: false } : p),
  { id: "elite-ab12", name: "Élite", eyebrow: "", caption: "", minUsd: 10000, features: [], highlighted: false, active: true, sortOrder: 4 },
];

describe("planes", () => {
  it("la inversión mínima es de 50 USD con los planes iniciales", () => {
    expect(MIN_INVESTMENT_USD).toBe(50);
    expect(minInvestment(plans)).toBe(50);
  });
  it("asigna el plan según el monto", () => {
    expect(planForAmount(plans, 50)?.id).toBe("inicio");
    expect(planForAmount(plans, 499)?.id).toBe("inicio");
    expect(planForAmount(plans, 500)?.id).toBe("evolucion");
    expect(planForAmount(plans, 2000)?.id).toBe("vision");
    expect(planName(plans, "evolucion")).toBe("Órbita");
    expect(planName(plans, "borrado")).toBe("borrado");
  });
  it("respeta los planes que agrega u oculta el administrador", () => {
    expect(minInvestment(custom)).toBe(500);
    expect(planForAmount(custom, 100)).toBeUndefined();
    expect(planForAmount(custom, 9999)?.id).toBe("vision");
    expect(planForAmount(custom, 10000)?.id).toBe("elite-ab12");
    expect(activePlans(custom).map(p => p.id)).toEqual(["evolucion", "vision", "elite-ab12"]);
    expect(planName(custom, "inicio")).toBe("Impulso");
  });
  it("nunca baja el mínimo de 50 USD", () => {
    expect(minInvestment([])).toBe(50);
  });
});

describe("formato y validaciones", () => {
  it("muestra los montos en dólares", () => {
    expect(formatUsd(1234.5)).toBe("$1,234.50");
  });
  it("reconoce identificadores válidos", () => {
    expect(isUuid("3f2b8c4e-1a2b-4c3d-8e9f-0a1b2c3d4e5f")).toBe(true);
    expect(isUuid("1; drop table")).toBe(false);
    expect(isUuid(42)).toBe(false);
  });
  it("recorta textos opcionales", () => {
    expect(optionalText("  hola  ", 10)).toBe("hola");
    expect(optionalText("   ", 10)).toBeNull();
    expect(optionalText(5, 10)).toBeNull();
    expect(optionalText("abcdefghijkl", 5)).toBe("abcde");
  });
  it("genera referencias de transferencia legibles y distintas", () => {
    const refs = new Set(Array.from({ length: 500 }, transferReference));
    expect(refs.size).toBe(500);
    for (const ref of refs) expect(ref).toMatch(/^JH-[A-HJ-NP-Z2-9]{6}$/);
  });
});
