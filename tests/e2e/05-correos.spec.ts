import { expect, test } from "@playwright/test";

type Sent = { from: string; to: string | string[]; subject: string; html: string; auth: string };
const sent = async (): Promise<Sent[]> => (await fetch("http://127.0.0.1:4010/__sent")).json();
const to = (e: Sent) => (Array.isArray(e.to) ? e.to : [e.to]);

/** Se ejecuta al final: revisa los correos que generaron las pruebas anteriores (Resend simulado). */
test.describe("Correos con Resend", () => {
  test("se envían los avisos al administrador y a los clientes en cada paso", async () => {
    const emails = await sent();
    const subjects = emails.map(e => e.subject);
    const admin = process.env.ADMIN_NOTIFICATION_EMAIL!;
    const expectations: Array<[RegExp, "admin" | "cliente"]> = [
      [/Nueva inversión pendiente de pago$/, "admin"],
      [/Solicitud de retiro por \$/, "admin"],
      [/Pago confirmado$/, "cliente"],
      [/Pago no confirmado$/, "cliente"],
      [/Inversión registrada$/, "cliente"],
      [/Retiro aprobado$/, "cliente"],
      [/Retiro desembolsado$/, "cliente"],
      [/Retiro rechazado$/, "cliente"],
    ];
    for (const [pattern, who] of expectations) {
      const email = emails.find(e => pattern.test(e.subject));
      expect(email, `falta el correo ${pattern} (enviados: ${subjects.join(" | ")})`).toBeTruthy();
      if (who === "admin") expect(to(email!)).toContain(admin);
      else expect(to(email!).some(addr => addr.endsWith("@e2e.test") && addr !== admin)).toBe(true);
      expect(email!.subject.startsWith("JH Inversiones · ")).toBe(true);
      expect(email!.from).toBe(process.env.RESEND_FROM_EMAIL);
      expect(email!.auth).toBe(`Bearer ${process.env.RESEND_API_KEY}`);
    }
    const desembolso = emails.find(e => /Retiro desembolsado$/.test(e.subject))!;
    expect(desembolso.html).toContain("TRX-999");
    expect(desembolso.html).toContain("/dashboard");
    const retiro = emails.find(e => /Solicitud de retiro por/.test(e.subject))!;
    expect(retiro.html).toContain("Banco Uno");
    expect(retiro.html).toContain("/admin/retiros");
  });

  test("el estado de los correos queda en Ajustes", async ({ browser }) => {
    const { newSession } = await import("./helpers");
    const admin = await newSession(browser, "admin@e2e.test");
    await admin.goto("/admin/ajustes");
    await expect(admin.locator(".info-list li", { hasText: "Correos de aviso" })).toContainText("Activos");
  });
});
