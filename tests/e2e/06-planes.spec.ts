import { expect, test, type Page } from "@playwright/test";
import { createUser, newSession, service } from "./helpers";

/** Planes editables por el administrador (/admin/planes) y su efecto en la web y en las inversiones. */
test.describe.serial("Planes", () => {
  const clientEmail = `planes-${Date.now()}@e2e.test`;
  let admin: Page;
  let client: Page;

  async function planRow(name: string) { return admin.locator("tbody tr").filter({ has: admin.locator(`strong:text-is("${name}")`) }); }
  async function editPlan(name: string, changes: Record<string, string>) {
    await (await planRow(name)).getByRole("button", { name: "Editar" }).click();
    for (const [label, value] of Object.entries(changes)) await admin.getByLabel(label).fill(value);
    await admin.getByRole("button", { name: "Guardar cambios" }).click();
  }

  test.beforeAll(async ({ browser }) => {
    await createUser("admin@e2e.test").catch(() => undefined);
    await createUser(clientEmail);
    admin = await newSession(browser, "admin@e2e.test");
    client = await newSession(browser, clientEmail);
  });

  test.afterAll(async () => {
    // Deja los planes iniciales como estaban para las demás pruebas.
    const db = service();
    await db.from("plans").update({ min_usd: 50, name: "Impulso", active: true }).eq("id", "inicio");
  });

  test("el administrador crea un plan y aparece en la página de inicio", async () => {
    await admin.goto("/admin/planes");
    await expect(await planRow("Impulso")).toBeVisible();
    await admin.getByRole("button", { name: "Nuevo plan" }).click();
    await admin.getByLabel("Nombre del plan").fill("Élite E2E");
    await admin.getByLabel("Monto desde (USD)").fill("7777");
    await admin.getByLabel("Etiqueta corta (opcional)").fill("Gran capital");
    await admin.getByLabel("Descripción (una frase)").fill("Para quienes invierten a lo grande.");
    await admin.getByLabel("Beneficios (uno por línea, máximo 8)").fill("Atención prioritaria\nReporte mensual");
    await admin.getByLabel(/Destacar como/).check();
    await admin.getByRole("button", { name: "Crear plan" }).click();
    await expect(admin.getByText("Plan «Élite E2E» creado.")).toBeVisible();

    await client.goto("/");
    const card = client.locator(".bm-plan-card", { hasText: "Élite E2E" });
    await expect(card).toBeVisible();
    await expect(card).toContainText("$7,777 USD");
    await expect(card).toContainText("Atención prioritaria");
    await expect(card).toContainText("RECOMENDADO");
  });

  test("no permite dos planes visibles con el mismo monto ni montos menores a 50", async () => {
    await admin.getByRole("button", { name: "Nuevo plan" }).click();
    await admin.getByLabel("Nombre del plan").fill("Duplicado");
    await admin.getByLabel("Monto desde (USD)").fill("7777");
    await admin.getByRole("button", { name: "Crear plan" }).click();
    await expect(admin.getByText(/Ya hay otro plan visible que empieza en 7777 USD/)).toBeVisible();
    const res = await admin.request.post("/api/admin/plans", { data: { action: "save", name: "Barato", minUsd: 10 }, headers: { Origin: new URL(admin.url()).origin } });
    expect(res.status()).toBe(400);
    await admin.getByRole("button", { name: "Cancelar" }).click();
  });

  test("una inversión de ese monto queda en el plan nuevo", async () => {
    await client.goto("/invertir?monto=8000");
    await expect(client.locator(".invest-summary")).toContainText("Élite E2E");
    await client.getByText("Pago de prueba", { exact: true }).click();
    await client.locator(".invest-check input").check();
    await client.getByRole("button", { name: /Pagar \$8,000\.00/ }).click();
    await expect(client.getByRole("heading", { name: "Pago de prueba aceptado" })).toBeVisible();
    await expect(client.getByText("en el plan Élite E2E")).toBeVisible();
    await client.goto("/dashboard");
    await expect(client.locator(".invest-table")).toContainText("Élite E2E");
  });

  test("editar el nombre se refleja en las inversiones; con inversiones solo se puede ocultar", async () => {
    await admin.goto("/admin/planes");
    await editPlan("Élite E2E", { "Nombre del plan": "Élite Plus" });
    await expect(admin.getByText("Plan «Élite Plus» actualizado.")).toBeVisible();
    const row = await planRow("Élite Plus");
    await expect(row).toContainText("1"); // una inversión
    await expect(row.getByRole("button", { name: "Eliminar" })).toHaveCount(0);
    await row.getByRole("button", { name: "Ocultar" }).click();
    await expect(admin.getByText("El plan «Élite Plus» quedó oculto.")).toBeVisible();

    await client.goto("/dashboard");
    await expect(client.locator(".invest-table")).toContainText("Élite Plus");
    await client.goto("/");
    await expect(client.locator(".bm-plan-card", { hasText: "Élite Plus" })).toHaveCount(0);
    await client.goto("/invertir?monto=8000");
    await expect(client.locator(".invest-summary")).toContainText("Horizonte");
  });

  test("subir el monto del plan más bajo cambia la inversión mínima", async () => {
    await admin.goto("/admin/planes");
    await editPlan("Impulso", { "Monto desde (USD)": "100" });
    await expect(admin.getByText("Plan «Impulso» actualizado.")).toBeVisible();
    await client.goto("/");
    await expect(client.locator(".bm-min-badge")).toContainText("desde $100 USD");
    const res = await client.request.post("/api/checkout", { data: { amountUsd: 60, acceptTerms: true, method: "test" }, headers: { Origin: new URL(client.url()).origin } });
    expect(res.status()).toBe(400);
    expect((await res.json()).error).toContain("$100.00");
    await admin.goto("/admin/planes");
    await editPlan("Impulso", { "Monto desde (USD)": "50" });
    await expect(admin.getByText("Plan «Impulso» actualizado.")).toBeVisible();
  });

  test("un plan sin inversiones se puede eliminar y siempre queda al menos uno visible", async () => {
    await admin.getByRole("button", { name: "Nuevo plan" }).click();
    await admin.getByLabel("Nombre del plan").fill("Temporal");
    await admin.getByLabel("Monto desde (USD)").fill("3333");
    await admin.getByRole("button", { name: "Crear plan" }).click();
    await expect(admin.getByText("Plan «Temporal» creado.")).toBeVisible();
    await (await planRow("Temporal")).getByRole("button", { name: "Eliminar" }).click();
    await admin.getByRole("dialog").getByRole("button", { name: "Eliminar" }).click();
    await expect(admin.getByText("Plan «Temporal» eliminado.")).toBeVisible();

    const origin = new URL(admin.url()).origin;
    for (const id of ["evolucion", "vision"]) await admin.request.post("/api/admin/plans", { data: { action: "toggle", id }, headers: { Origin: origin } });
    const last = await admin.request.post("/api/admin/plans", { data: { action: "toggle", id: "inicio" }, headers: { Origin: origin } });
    expect(last.status()).toBe(409);
    for (const id of ["evolucion", "vision"]) await admin.request.post("/api/admin/plans", { data: { action: "toggle", id }, headers: { Origin: origin } });
    await admin.goto("/admin/actividad");
    await expect(admin.getByText("Creó un plan").first()).toBeVisible();
  });

  test("un cliente no puede modificar planes", async () => {
    const res = await client.request.post("/api/admin/plans", { data: { action: "save", name: "Hack", minUsd: 60 }, headers: { Origin: new URL(client.url()).origin } });
    expect(res.status()).toBe(403);
    // Con la clave pública (navegador) la tabla es de solo lectura.
    const { createClient } = await import("@supabase/supabase-js");
    await createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!).from("plans").update({ min_usd: 60 }).eq("id", "inicio");
    const { data } = await service().from("plans").select("min_usd").eq("id", "inicio").single();
    expect(data?.min_usd).toBe(50);
  });
});
