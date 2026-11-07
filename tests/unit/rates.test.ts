import { describe, expect, it } from "vitest";
import { calculateEarnings, dayKey, DEFAULT_DAILY_RATE_PCT, earningsSeries, hasActiveClaim, isValidDayKey, isValidRate, MIN_TERM_DAYS, rateFor, recentDayKeys } from "@/lib/rates";

const DAY = 86_400_000;
const NOW = Date.parse("2026-11-07T17:00:00Z"); // 12:00 en Bogotá
const position = (daysAgo: number, extra: Record<string, unknown> = {}) => ({ principal_usd: 1000, started_at: new Date(NOW - daysAgo * DAY).toISOString(), status: "active", ...extra });

describe("tasas diarias", () => {
  it("usa 1.5 % por defecto cuando el día no tiene tasa", () => {
    expect(DEFAULT_DAILY_RATE_PCT).toBe(1.5);
    expect(rateFor({}, "2026-11-07")).toBe(1.5);
    expect(rateFor({ "2026-11-07": 2 }, "2026-11-07")).toBe(2);
  });
  it("calcula el día en la zona horaria de Bogotá", () => {
    expect(dayKey(Date.parse("2026-11-08T03:00:00Z"))).toBe("2026-11-07"); // 22:00 en Bogotá
    expect(dayKey(Date.parse("2026-11-08T06:00:00Z"))).toBe("2026-11-08");
  });
  it("valida fechas y porcentajes", () => {
    expect(isValidDayKey("2026-11-07")).toBe(true);
    expect(isValidDayKey("2026-13-40")).toBe(false);
    expect(isValidDayKey("07/11/2026")).toBe(false);
    expect(isValidRate(0)).toBe(true);
    expect(isValidRate(1.5)).toBe(true);
    expect(isValidRate(-1)).toBe(false);
    expect(isValidRate(101)).toBe(false);
    expect(isValidRate(Number.NaN)).toBe(false);
  });
  it("lista los últimos días del más reciente al más antiguo", () => {
    expect(recentDayKeys(3, NOW)).toEqual(["2026-11-07", "2026-11-06", "2026-11-05"]);
  });
});

describe("cálculo de ganancias", () => {
  it("suma capital × tasa de cada día completo (interés simple)", () => {
    const calc = calculateEarnings(position(10), {}, NOW);
    expect(calc.daysElapsed).toBe(10);
    expect(calc.earnings).toBeCloseTo(1000 * 0.015 * 10, 6);
    expect(calc.total).toBeCloseTo(1150, 6);
  });
  it("aplica la tasa que el administrador fijó para cada día", () => {
    const started = NOW - 3 * DAY;
    const rates = { [dayKey(started)]: 2, [dayKey(started + DAY)]: 0, [dayKey(started + 2 * DAY)]: 1 };
    expect(calculateEarnings(position(3), rates, NOW).earnings).toBeCloseTo(1000 * (0.02 + 0 + 0.01), 6);
  });
  it("acumula proporcionalmente el día en curso", () => {
    expect(calculateEarnings(position(0.5), {}, NOW).earnings).toBeCloseTo(1000 * 0.015 * 0.5, 6);
  });
  it("bloquea el retiro hasta cumplir el plazo mínimo de 30 días", () => {
    const early = calculateEarnings(position(29), {}, NOW);
    expect(early.canWithdraw).toBe(false);
    expect(early.daysRemaining).toBe(1);
    const ready = calculateEarnings(position(MIN_TERM_DAYS), {}, NOW);
    expect(ready.canWithdraw).toBe(true);
    expect(ready.termProgress).toBe(1);
  });
  it("congela las ganancias en la fecha de la solicitud de retiro", () => {
    const requestedAt = new Date(NOW - 5 * DAY).toISOString();
    const frozen = calculateEarnings(position(40, { claim_status: "pending", claim_requested_at: requestedAt }), {}, NOW);
    expect(frozen.daysElapsed).toBe(35);
    expect(frozen.canWithdraw).toBe(false);
    expect(hasActiveClaim({ ...position(40), claim_status: "pending" })).toBe(true);
  });
  it("un retiro rechazado deja de congelar y permite volver a solicitar", () => {
    const calc = calculateEarnings(position(40, { claim_status: "rejected", claim_requested_at: new Date(NOW - 5 * DAY).toISOString() }), {}, NOW);
    expect(calc.daysElapsed).toBe(40);
    expect(calc.canWithdraw).toBe(true);
  });
  it("no genera ganancias si el pago está pendiente o la inversión fue cancelada", () => {
    for (const status of ["pending_payment", "cancelled"]) {
      const calc = calculateEarnings(position(40, { status }), {}, NOW);
      expect(calc.earnings).toBe(0);
      expect(calc.canWithdraw).toBe(false);
    }
  });
  it("una inversión cerrada (retiro desembolsado) conserva sus ganancias pero no permite otro retiro", () => {
    const calc = calculateEarnings(position(40, { status: "closed", claim_status: "settled", claim_requested_at: new Date(NOW - 2 * DAY).toISOString() }), {}, NOW);
    expect(calc.earnings).toBeCloseTo(1000 * 0.015 * 38, 6);
    expect(calc.canWithdraw).toBe(false);
  });
  it("la serie del gráfico ignora inversiones sin pago confirmado", () => {
    const series = earningsSeries([position(10), position(10, { status: "pending_payment" })], {}, 3, NOW);
    expect(series).toHaveLength(3);
    expect(series[2].value).toBeCloseTo(150, 6);
  });
});
