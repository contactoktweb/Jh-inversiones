import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { ageInvestments, closeDailyPrompt, createUser, newSession, service } from "./helpers";
import { todayKey } from "../../src/lib/rates";

/** Ciclo completo: tasa diaria → pagos (prueba y transferencia) → retiro → desembolso. */
test.describe.serial("Flujo de inversión completo", () => {
  const investorEmail = `inversor-${Date.now()}@e2e.test`;
  let investorId = "";
  let admin: Page;
  let investor: Page;
  let transferRef = "";
  const IMAGE = path.join(__dirname, "fixtures", "comprobante.png");

  test.beforeAll(async ({ browser }) => {
    await createUser("admin@e2e.test").catch(() => undefined); // admin por ADMIN_EMAILS
    investorId = await createUser(investorEmail);
    admin = await newSession(browser, "admin@e2e.test");
    investor = await newSession(browser, investorEmail);
  });

  test("el administrador recibe el aviso diario y fija la tasa de hoy", async () => {
    await admin.goto("/admin");
    await expect(admin.getByRole("dialog", { name: /Configura la ganancia de hoy/ })).toBeVisible();
    await admin.fill("#rate-today", "2");
    await admin.getByRole("button", { name: "Guardar porcentaje" }).click();
    await expect(admin.getByRole("dialog")).toHaveCount(0);
    await expect(admin.getByText("Aún no configuraste la ganancia de hoy")).toHaveCount(0);
    const { data } = await service().from("daily_rates").select("rate_pct").eq("rate_date", todayKey()).single();
    expect(Number(data!.rate_pct)).toBe(2);
  });

  test("el administrador configura los datos de transferencia con foto", async () => {
    await admin.goto("/admin/ajustes");
    await admin.locator("#transfer-image").setInputFiles(IMAGE);
    await expect(admin.locator(".image-picker-preview img")).toBeVisible();
    await admin.getByLabel(/Datos que verá el cliente/).fill("Banco Prueba\nCuenta 987654321\nTitular JH Inversiones");
    await admin.getByRole("button", { name: "Guardar" }).click();
    await expect(admin.getByText("Ajustes guardados.")).toBeVisible();
    const { data } = await service().from("settings").select("value").eq("key", "transfer_image").single();
    expect(data!.value).toMatch(/^data:image\/jpeg;base64,/);
    await admin.reload();
    await expect(admin.locator(".image-picker-preview img")).toHaveJSProperty("complete", true);
    expect(await admin.locator(".image-picker-preview img").evaluate((img: HTMLImageElement) => img.naturalWidth)).toBe(200);
  });

  test("pago de prueba: se acepta al instante y la inversión queda activa", async () => {
    await investor.goto("/invertir?monto=500");
    await expect(investor.getByText("Órbita")).toBeVisible();
    await investor.getByText("Pago de prueba", { exact: true }).click();
    await investor.locator(".invest-check input").check();
    await investor.getByRole("button", { name: /Pagar \$500\.00/ }).click();
    await expect(investor.getByRole("heading", { name: "Pago de prueba aceptado" })).toBeVisible();
    await investor.waitForURL("**/dashboard", { timeout: 15_000 });
    await expect(investor.locator(".metric-value").first()).toHaveText("$500.00");
    await expect(investor.locator(".metric-card").nth(2)).toContainText("2%");
  });

  test("transferencia: queda pendiente con referencia y el administrador la confirma", async () => {
    await investor.goto("/invertir?monto=100");
    await investor.getByText("Transferencia bancaria", { exact: true }).click();
    await investor.locator(".invest-check input").check();
    await investor.getByRole("button", { name: /Registrar inversión \$100\.00/ }).click();
    await expect(investor.getByRole("heading", { name: "Inversión registrada" })).toBeVisible();
    await expect(investor.getByText("Cuenta 987654321")).toBeVisible();
    // La foto de los datos de pago se ve (servida solo a cuentas con sesión).
    const photo = investor.locator(".transfer-image img");
    await expect(photo).toBeVisible();
    expect(await photo.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth)).toBe(200);
    transferRef = (await investor.locator(".invest-reference strong").innerText()).trim();
    expect(transferRef).toMatch(/^JH-[A-Z0-9]{6}$/);

    // Todavía no avisa: el administrador lo ve como «AÚN NO AVISA».
    await admin.goto("/admin/pagos");
    await expect(admin.locator("tr", { hasText: transferRef })).toContainText("AÚN NO AVISA");

    // El cliente avisa que ya transfirió, con n.º de operación y foto del comprobante.
    await investor.getByLabel("N.º de operación o comentario (opcional)").fill("Operación 555-AB");
    await investor.locator(`input[type=file][id^="proof-"]`).setInputFiles(IMAGE);
    await expect(investor.locator(".report-payment .image-picker-preview img")).toBeVisible();
    await investor.getByRole("button", { name: "Ya realicé la transferencia" }).click();
    await expect(investor.getByText("¡Listo! Avisamos a la administración.")).toBeVisible();

    await investor.goto("/dashboard");
    await expect(investor.getByRole("heading", { name: "Pagos pendientes" })).toBeVisible();
    await expect(investor.getByText(transferRef)).toBeVisible();
    await expect(investor.getByText("EN VERIFICACIÓN")).toBeVisible();
    await expect(investor.locator(".metric-value").first()).toHaveText("$500.00");

    await admin.goto("/admin/pagos");
    await expect(admin.locator(".nav-badge").first()).toHaveText("1");
    const row = admin.locator("tr", { hasText: transferRef });
    await expect(row).toContainText("AVISÓ QUE PAGÓ");
    await expect(row).toContainText("Operación 555-AB");
    await row.getByRole("button", { name: "Ver comprobante" }).click();
    const proof = admin.getByRole("dialog", { name: "Comprobante de pago" }).locator("img");
    await expect(proof).toBeVisible();
    await expect.poll(() => proof.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBe(200);
    await admin.getByRole("dialog").getByRole("button", { name: "Cerrar" }).last().click();
    await admin.locator("tr", { hasText: transferRef }).getByRole("button", { name: "Confirmar pago" }).click();
    await admin.getByRole("button", { name: "Sí, confirmar pago" }).click();
    await expect(admin.getByText(/Pago confirmado/)).toBeVisible();

    await investor.goto("/dashboard");
    await expect(investor.getByRole("heading", { name: "Pagos pendientes" })).toHaveCount(0);
    await expect(investor.locator(".metric-value").first()).toHaveText("$600.00");
  });

  test("transferencia rechazada: la inversión se cancela y el cliente ve el motivo", async () => {
    await investor.goto("/invertir?monto=75");
    await investor.getByText("Transferencia bancaria", { exact: true }).click();
    await investor.locator(".invest-check input").check();
    await investor.getByRole("button", { name: /Registrar inversión/ }).click();
    const ref = (await investor.locator(".invest-reference strong").innerText()).trim();
    // Sin comprobante: el aviso también funciona.
    await investor.getByRole("button", { name: "Ya realicé la transferencia" }).click();
    await expect(investor.getByText("¡Listo! Avisamos a la administración.")).toBeVisible();

    await admin.goto("/admin/pagos");
    await admin.locator("tr", { hasText: ref }).getByRole("button", { name: "Rechazar" }).click();
    await admin.getByRole("dialog").locator("textarea").fill("No recibimos la transferencia");
    await admin.getByRole("button", { name: "Rechazar y cancelar" }).click();
    await expect(admin.getByText("Pago rechazado.")).toBeVisible();

    await investor.goto("/dashboard");
    await expect(investor.locator("tr", { hasText: "$75.00" })).toContainText("CANCELADA");
    await expect(investor.getByText("No recibimos la transferencia")).toBeVisible();
  });

  test("retiro: el plazo mínimo bloquea, luego se solicita con datos de pago", async () => {
    await investor.goto("/dashboard");
    await expect(investor.getByRole("button", { name: "Solicitar retiro" })).toHaveCount(0);
    await ageInvestments(investorId, 40);
    await investor.reload();
    await investor.getByRole("button", { name: "Solicitar retiro" }).first().click();
    await investor.fill("#payout-details", "Banco Uno · ahorros 111-222 · Juan Inversor");
    await investor.getByRole("button", { name: "Confirmar solicitud" }).click();
    await expect(investor.getByRole("heading", { name: "Mis solicitudes de retiro" })).toBeVisible();
    await expect(investor.locator(".withdraw-list li").first()).toContainText("EN REVISIÓN");
  });

  test("retiro rechazado con motivo y vuelto a solicitar", async () => {
    await admin.goto("/admin/retiros");
    const row = admin.locator("tr", { hasText: investorEmail });
    await expect(row).toContainText("Banco Uno · ahorros 111-222");
    await row.getByRole("button", { name: "Rechazar" }).click();
    await admin.getByRole("dialog").locator("textarea").fill("Falta el número de documento");
    await admin.getByRole("dialog").getByRole("button", { name: "Rechazar" }).click();
    await expect(admin.getByText("Solicitud rechazada.")).toBeVisible();

    await investor.goto("/dashboard");
    await expect(investor.locator(".withdraw-list li").first()).toContainText("RECHAZADO");
    await expect(investor.getByText("Falta el número de documento")).toBeVisible();
    await investor.getByRole("button", { name: "Solicitar de nuevo" }).first().click();
    await expect(investor.locator("#payout-details")).toHaveValue(/Banco Uno/); // se guarda en el perfil
    await investor.fill("#payout-details", "Banco Uno · ahorros 111-222 · Juan Inversor · CC 123456");
    await investor.getByRole("button", { name: "Confirmar solicitud" }).click();
    await expect(investor.locator(".withdraw-list li").first()).toContainText("EN REVISIÓN");
  });

  test("retiro aprobado y desembolsado con comprobante", async () => {
    await admin.goto("/admin/retiros");
    const row = admin.locator("tr", { hasText: investorEmail }).first();
    await row.getByRole("button", { name: "Aprobar" }).click();
    await admin.getByRole("dialog").getByRole("button", { name: "Aprobar" }).click();
    await expect(admin.getByText("Solicitud aprobada.")).toBeVisible();
    await admin.locator("tr", { hasText: investorEmail }).first().getByRole("button", { name: "Marcar desembolsado" }).click();
    await admin.getByRole("dialog").locator('input[name="payoutReference"]').fill("TRX-999");
    await admin.getByRole("button", { name: "Confirmar desembolso" }).click();
    await expect(admin.getByText("Retiro marcado como desembolsado.")).toBeVisible();

    await investor.goto("/dashboard");
    await expect(investor.locator(".withdraw-list li").first()).toContainText("DESEMBOLSADO");
    await expect(investor.getByText("TRX-999")).toBeVisible();
    const { data } = await service().from("investments").select("status").eq("user_id", investorId).eq("status", "closed");
    expect(data).toHaveLength(1);
  });

  test("todo queda en el registro de actividad y en los CSV", async () => {
    await admin.goto("/admin/actividad");
    for (const text of ["Fijó la tasa diaria", "Actualizó los ajustes", "Confirmó un pago", "Rechazó un pago", "Rechazó un retiro", "Aprobó un retiro", "Marcó un retiro como desembolsado"])
      await expect(admin.getByText(text).first()).toBeVisible();
    const retiros = await (await admin.request.get("/api/admin/export?tipo=retiros")).text();
    expect(retiros).toContain("TRX-999");
    expect(retiros).toContain(investorEmail);
    const inversiones = await (await admin.request.get("/api/admin/export?tipo=inversiones")).text();
    expect(inversiones).toContain(transferRef);
  });

  test("el resumen del administrador muestra las cifras", async () => {
    await admin.goto("/admin");
    await closeDailyPrompt(admin);
    await expect(admin.getByText("CAPITAL ACTIVO")).toBeVisible();
    await expect(admin.locator(".metric-card", { hasText: "TOTAL DESEMBOLSADO" })).not.toContainText("$0.00");
  });
});
