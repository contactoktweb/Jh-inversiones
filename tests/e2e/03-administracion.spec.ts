import { expect, test, type Page } from "@playwright/test";
import { createUser, newSession, service } from "./helpers";

test.describe.serial("Gestión administrativa", () => {
  const clientEmail = `cliente-${Date.now()}@e2e.test`;
  let clientId = "";
  let admin: Page;
  let client: Page;

  test.beforeAll(async ({ browser }) => {
    await createUser("admin@e2e.test").catch(() => undefined);
    clientId = await createUser(clientEmail);
    admin = await newSession(browser, "admin@e2e.test");
    client = await newSession(browser, clientEmail);
  });

  test("registrar un pago manual crea una inversión activa para el cliente", async () => {
    await admin.goto("/admin/pagos");
    await admin.getByLabel("Correo del cliente").fill(clientEmail);
    await admin.getByLabel("Monto (USD)").fill("300");
    await admin.getByLabel("Referencia del pago").fill(`EFECTIVO-${clientId.slice(0, 6)}`);
    await admin.getByRole("button", { name: "Registrar inversión" }).click();
    await expect(admin.getByText(`Inversión de $300.00 registrada para ${clientEmail}.`)).toBeVisible();

    await client.goto("/dashboard");
    await expect(client.locator(".metric-value").first()).toHaveText("$300.00");
  });

  test("no permite repetir la referencia ni registrar a un correo inexistente", async () => {
    await admin.getByLabel("Correo del cliente").fill(clientEmail);
    await admin.getByLabel("Monto (USD)").fill("300");
    await admin.getByLabel("Referencia del pago").fill(`EFECTIVO-${clientId.slice(0, 6)}`);
    await admin.getByRole("button", { name: "Registrar inversión" }).click();
    await expect(admin.getByText("Ya existe una inversión con esa referencia de pago.")).toBeVisible();
    await admin.getByLabel("Correo del cliente").fill("nadie@e2e.test");
    await admin.getByLabel("Referencia del pago").fill("OTRA-REF");
    await admin.getByRole("button", { name: "Registrar inversión" }).click();
    await expect(admin.getByText(/No existe una cuenta con ese correo/)).toBeVisible();
  });

  test("la lista de clientes y la ficha muestran sus datos", async () => {
    await admin.goto("/admin/clientes");
    await admin.getByPlaceholder("Nombre, correo, teléfono…").fill(clientEmail);
    await expect(admin.locator("tr", { hasText: clientEmail })).toContainText("$300.00");
    await admin.getByRole("link", { name: clientEmail }).click();
    await expect(admin.getByRole("heading", { name: clientEmail })).toBeVisible();
    await expect(admin.getByText("Capital activo", { exact: true })).toBeVisible();
  });

  test("suspender una cuenta bloquea invertir y retirar; reactivarla lo devuelve", async () => {
    await admin.getByRole("button", { name: "Suspender" }).click();
    await admin.getByRole("dialog").getByRole("button", { name: "Suspender" }).click();
    await expect(admin.getByText("Cuenta suspendida.")).toBeVisible();

    await client.goto("/dashboard");
    await expect(client.getByText("Tu cuenta está suspendida.")).toBeVisible();
    await client.goto("/invertir?monto=100");
    await expect(client).toHaveURL(/\/dashboard/);
    const res = await client.request.post("/api/checkout", { data: { amountUsd: 100, acceptTerms: true, method: "test" } });
    expect(res.status()).toBe(403);

    await admin.getByRole("button", { name: "Reactivar" }).click();
    await admin.getByRole("dialog").getByRole("button", { name: "Reactivar" }).click();
    await expect(admin.getByText("Cuenta reactivada.")).toBeVisible();
    await client.goto("/dashboard");
    await expect(client.getByText("Tu cuenta está suspendida.")).toHaveCount(0);
  });

  test("cancelar una inversión exige motivo y la deja sin ganancias", async () => {
    await admin.goto("/admin/inversiones");
    await admin.getByPlaceholder("Buscar cliente o referencia").fill(clientEmail);
    await admin.locator("tr", { hasText: "$300.00" }).getByRole("button", { name: "Cancelar" }).click();
    await admin.getByRole("dialog").locator("textarea").fill("Devolución solicitada por el cliente");
    await admin.getByRole("button", { name: "Cancelar inversión" }).click();
    await expect(admin.getByText("Inversión cancelada.")).toBeVisible();
    await client.goto("/dashboard");
    await expect(client.locator(".metric-value").first()).toHaveText("$0.00");
    await expect(client.getByText("Devolución solicitada por el cliente")).toBeVisible();
  });

  test("dar y quitar el rol de administrador desde el panel", async () => {
    await admin.goto(`/admin/clientes/${clientId}`);
    await admin.getByRole("button", { name: "Hacer administrador" }).click();
    await admin.getByRole("dialog").getByRole("button", { name: "Hacer administrador" }).click();
    await expect(admin.getByText("Ahora es administrador.")).toBeVisible();
    await client.goto("/dashboard");
    await expect(client).toHaveURL(/\/admin/);

    await admin.getByRole("button", { name: "Quitar administrador" }).click();
    await admin.getByRole("dialog").getByRole("button", { name: "Quitar rol" }).click();
    await expect(admin.getByText("Ya no es administrador.")).toBeVisible();
    await client.goto("/admin");
    await expect(client).toHaveURL(/\/dashboard/);
  });

  test("el administrador no puede suspenderse ni quitarse el rol a sí mismo", async () => {
    const { data } = await service().from("profiles").select("id").eq("email", "admin@e2e.test").single();
    const res = await admin.request.post("/api/admin/users", { data: { userId: data!.id, action: "suspend" } });
    expect(res.status()).toBe(400);
  });

  test("las páginas de administración cargan sin errores", async () => {
    const errors: string[] = [];
    admin.on("pageerror", e => errors.push(e.message));
    for (const path of ["/admin", "/admin/tasas", "/admin/pagos", "/admin/retiros", "/admin/inversiones", "/admin/clientes", "/admin/actividad", "/admin/ajustes"]) {
      const res = await admin.goto(path);
      expect(res?.status(), path).toBe(200);
    }
    expect(errors).toEqual([]);
  });
});
