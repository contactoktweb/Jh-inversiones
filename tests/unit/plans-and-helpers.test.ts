import { describe, expect, it } from "vitest";
import { getPlan, planForAmount, plans } from "@/lib/plans";
import { MIN_INVESTMENT_USD } from "@/lib/rates";
import { formatUsd } from "@/lib/finance";
import { isUuid, optionalText } from "@/lib/server/http";
import { transferReference } from "@/lib/server/payments";

describe("planes", () => {
  it("la inversión mínima es de 50 USD", () => {
    expect(MIN_INVESTMENT_USD).toBe(50);
    expect(plans[0].minUsd).toBe(50);
  });
  it("asigna el plan según el monto", () => {
    expect(planForAmount(50).id).toBe("inicio");
    expect(planForAmount(499).id).toBe("inicio");
    expect(planForAmount(500).id).toBe("evolucion");
    expect(planForAmount(2000).id).toBe("vision");
    expect(getPlan("evolucion")?.name).toBe("Órbita");
  });
  it("todos los planes tienen plazo mínimo de 30 días", () => {
    for (const plan of plans) expect(plan.durationDays).toBe(30);
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
