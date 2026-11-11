import { expect, test, type Page } from "@playwright/test";
import { ageInvestments, ANON_KEY, closeDailyPrompt, createUser, emailsTo, newSession, PASSWORD, service, SUPABASE_URL } from "./helpers";
import { createClient } from "@supabase/supabase-js";

const DAY = 86_400_000;

/** Programa de referidos (código al registrarse, comisiones, pago) y plazo mínimo de retiro por inversión. */
test.describe.serial("Referidos y plazo por inversión", () => {
  const stamp = Date.now();
  const referrerEmail = `refiere-${stamp}@e2e.test`;
  const referredEmail = `referido-${stamp}@e2e.test`;
  let referrerId = "";
  let referredId = "";
  let code = "";
  let admin: Page;
  let referrer: Page;

  test.beforeAll(async ({ browser }) => {
    await createUser("admin@e2e.test").catch(() => undefined);
    referrerId = await createUser(referrerEmail);
    admin = await newSession(browser, "admin@e2e.test");
    referrer = await newSession(browser, referrerEmail);
  });

  test("cada cliente tiene su código y su enlace de invitación", async () => {
    await referrer.goto("/referidos");
    code = (await referrer.getByTestId("referral-code").innerText()).trim();
    expect(code).toMatch(/^JH[0-9A-F]{6}$/);
    const { data } = await service().from("profiles").select("referral_code").eq("id", referrerId).single();
    expect(data!.referral_code).toBe(code);
    await expect(referrer.locator(".referral-link")).toContainText(`/acceso?ref=${code}`);
    await expect(referrer.getByText("Aún nadie se ha registrado con tu código.")).toBeVisible();
  });

  test("un código inexistente no deja registrarse; el enlace de invitación llena el código", async ({ browser }) => {
    const page = await (await browser.newContext()).newPage();
    await page.goto("/acceso");
    await page.getByRole("button", { name: "¿No tienes cuenta? Regístrate" }).click();
    await page.fill("#email", `otro-${stamp}@e2e.test`);
    await page.fill("#password", PASSWORD);
    await page.fill("#referral", "JHNOEXISTE");
    await page.click("button.auth-submit");
    await expect(page.getByText("El código de referido no existe")).toBeVisible();

    // Con el enlace de invitación el formulario abre en «Crear cuenta» con el código puesto.
    const invited = await (await browser.newContext()).newPage();
    await invited.goto(`/acceso?ref=${code.toLowerCase()}`);
    await expect(invited.locator("#referral")).toHaveValue(code);
    await invited.fill("#email", referredEmail);
    await invited.fill("#password", PASSWORD);
    await invited.click("button.auth-submit");
    await invited.waitForURL("**/dashboard");
    const { data } = await service().from("profiles").select("id,referred_by,referred_at").eq("email", referredEmail).single();
    referredId = data!.id;
    expect(data!.referred_by).toBe(referrerId);
    expect(data!.referred_at).toBeTruthy();
  });

  test("el administrador fija el porcentaje de comisión", async () => {
    await admin.goto("/admin/referidos");
    await closeDailyPrompt(admin);
    await admin.getByLabel("Porcentaje de comisión").fill("10");
    await admin.getByRole("button", { name: "Guardar porcentaje" }).click();
    await expect(admin.getByText("Comisión por referido: 10% de cada inversión confirmada.")).toBeVisible();
    await expect(admin.locator(".metric-card", { hasText: "CLIENTES REFERIDOS" })).not.toContainText(/^0$/);
    await admin.goto("/admin/actividad");
    await expect(admin.getByText("Actualizó los ajustes").first()).toBeVisible();
  });

  test("confirmar el pago de un referido genera la comisión y avisa por correo", async ({ browser }) => {
    const referred = await newSession(browser, referredEmail);
    await referred.goto("/invertir?monto=200");
    await referred.getByText("Transferencia bancaria", { exact: true }).click();
    await referred.locator(".invest-check input").check();
    await referred.getByRole("button", { name: /Registrar inversión \$200\.00/ }).click();
    const ref = (await referred.locator(".invest-reference strong").innerText()).trim();

    // Un pago de prueba de la misma persona NO genera comisión (no ingresa dinero).
    await referred.goto("/invertir?monto=50");
    await referred.getByText("Pago de prueba", { exact: true }).click();
    await referred.locator(".invest-check input").check();
    await referred.getByRole("button", { name: /Pagar \$50\.00/ }).click();
    await expect(referred.getByRole("heading", { name: "Pago de prueba aceptado" })).toBeVisible();

    await admin.goto("/admin/pagos");
    await admin.locator("tr", { hasText: ref }).getByRole("button", { name: "Confirmar pago" }).click();
    await admin.getByRole("button", { name: "Sí, confirmar pago" }).click();
    await expect(admin.getByText(/Pago confirmado/)).toBeVisible();

    const { data } = await service().from("referral_commissions").select("referrer_id,base_usd,rate_pct,amount_usd,status").eq("referred_id", referredId);
    expect(data).toHaveLength(1);
    expect(data![0]).toMatchObject({ referrer_id: referrerId, status: "pending" });
    expect(Number(data![0].base_usd)).toBe(200);
    expect(Number(data![0].rate_pct)).toBe(10);
    expect(Number(data![0].amount_usd)).toBe(20);
    expect((await emailsTo(referrerEmail)).some(e => /Ganaste una comisión de \$20\.00$/.test(e.subject))).toBe(true);
  });

  test("un pago manual a nombre del referido también genera comisión", async () => {
    await admin.goto("/admin/pagos");
    await admin.getByLabel("Correo del cliente").fill(referredEmail);
    await admin.getByLabel("Monto (USD)").fill("150");
    await admin.getByLabel("Referencia del pago").fill(`REF-MANUAL-${stamp}`);
    await admin.getByRole("button", { name: "Registrar inversión" }).click();
    await expect(admin.getByText(`Inversión de $150.00 registrada para ${referredEmail}.`)).toBeVisible();
    const { data } = await service().from("referral_commissions").select("amount_usd").eq("referred_id", referredId).order("created_at");
    expect(data!.map(c => Number(c.amount_usd))).toEqual([20, 15]);
  });

  test("quien refirió ve a su referido y sus comisiones por cobrar", async () => {
    await referrer.goto("/referidos");
    await expect(referrer.locator(".metric-card", { hasText: "POR COBRAR" })).toContainText("$35.00");
    await expect(referrer.locator("tr", { hasText: "YA INVIRTIÓ" })).toContainText("re•••@e2e.test");
    await expect(referrer.locator("tr", { hasText: "$20.00" })).toContainText("POR PAGAR");
    // Por RLS solo ve sus propias comisiones.
    const anon = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
    await anon.auth.signInWithPassword({ email: referredEmail, password: PASSWORD });
    const { data: others } = await anon.from("referral_commissions").select("id");
    expect(others).toEqual([]);
  });

  test("el administrador paga una comisión y anula otra", async () => {
    await admin.goto("/admin/referidos");
    await expect(admin.locator(".nav-badge").last()).toHaveText("2");
    const rows = admin.locator("tr", { hasText: referredEmail });
    await rows.filter({ hasText: "$20.00" }).getByRole("button", { name: "Marcar pagada" }).click();
    await admin.getByRole("dialog").locator('input[name="reference"]').fill("PAGO-COM-1");
    await admin.getByRole("button", { name: "Confirmar pago" }).click();
    await expect(admin.getByText("Comisión de $20.00 marcada como pagada.")).toBeVisible();
    await rows.filter({ hasText: "$15.00" }).getByRole("button", { name: "Anular" }).click();
    await admin.getByRole("dialog").locator("textarea").fill("Pago manual de prueba");
    await admin.getByRole("button", { name: "Anular comisión" }).click();
    await expect(admin.getByText("Comisión de $15.00 anulada.")).toBeVisible();

    await referrer.goto("/referidos");
    await expect(referrer.locator(".metric-card", { hasText: "COBRADO" })).toContainText("$20.00");
    await expect(referrer.getByText("PAGO-COM-1")).toBeVisible();
    await expect(referrer.getByText("Pago manual de prueba")).toBeVisible();
    expect((await emailsTo(referrerEmail)).some(e => /Comisión pagada$/.test(e.subject))).toBe(true);
    const csv = await (await admin.request.get("/api/admin/export?tipo=referidos")).text();
    expect(csv).toContain("PAGO-COM-1");
  });

  test("cancelar una inversión anula su comisión pendiente", async () => {
    await admin.goto("/admin/pagos");
    await admin.getByLabel("Correo del cliente").fill(referredEmail);
    await admin.getByLabel("Monto (USD)").fill("100");
    await admin.getByLabel("Referencia del pago").fill(`REF-CANCEL-${stamp}`);
    await admin.getByRole("button", { name: "Registrar inversión" }).click();
    await expect(admin.getByText(/Inversión de \$100\.00 registrada/)).toBeVisible();
    await admin.goto("/admin/inversiones");
    await admin.locator("tr", { hasText: `REF-CANCEL-${stamp}` }).getByRole("button", { name: "Cancelar" }).click();
    await admin.getByRole("dialog").locator("textarea").fill("Error de registro");
    await admin.getByRole("button", { name: "Cancelar inversión" }).click();
    await expect(admin.getByText("Inversión cancelada.")).toBeVisible();
    const { data: inv } = await service().from("investments").select("id").eq("payment_reference", `REF-CANCEL-${stamp}`).single();
    const { data } = await service().from("referral_commissions").select("status,admin_note").eq("investment_id", inv!.id).single();
    expect(data!.status).toBe("cancelled");
    expect(data!.admin_note).toContain("Error de registro");
  });

  test("el administrador cambia quién refirió a un cliente desde su ficha", async () => {
    const otherId = await createUser(`sin-ref-${stamp}@e2e.test`);
    await admin.goto(`/admin/clientes/${otherId}`);
    await admin.getByLabel(/Código de quien lo refirió/).fill(code);
    await admin.getByRole("button", { name: "Guardar referido" }).click();
    await expect(admin.getByText(/figura como referido de/)).toBeVisible();
    const { data } = await service().from("profiles").select("referred_by").eq("id", otherId).single();
    expect(data!.referred_by).toBe(referrerId);
    await admin.getByLabel(/Código de quien lo refirió/).fill("");
    await admin.getByRole("button", { name: "Guardar referido" }).click();
    await expect(admin.getByText(/ya no figura como referido/)).toBeVisible();
  });

  test("plazo por inversión: el administrador lo acorta y el cliente puede retirar antes", async ({ browser }) => {
    const investorEmail = `plazo-${stamp}@e2e.test`;
    const investorId = await createUser(investorEmail);
    await admin.goto("/admin/pagos");
    await admin.getByLabel("Correo del cliente").fill(investorEmail);
    await admin.getByLabel("Monto (USD)").fill("400");
    await admin.getByLabel("Referencia del pago").fill(`REF-PLAZO-${stamp}`);
    await admin.getByLabel("Plazo mínimo de retiro (días)").fill("45");
    await admin.getByRole("button", { name: "Registrar inversión" }).click();
    await expect(admin.getByText(/Inversión de \$400\.00 registrada/)).toBeVisible();
    const { data: created } = await service().from("investments").select("id,term_days,started_at,ends_at").eq("payment_reference", `REF-PLAZO-${stamp}`).single();
    expect(created!.term_days).toBe(45);
    expect(new Date(created!.ends_at).getTime() - new Date(created!.started_at).getTime()).toBe(45 * DAY);

    await ageInvestments(investorId, 10);
    const investor = await newSession(browser, investorEmail);
    await investor.goto("/dashboard");
    await expect(investor.getByRole("button", { name: "Bloqueado" })).toBeVisible();
    await expect(investor.getByText("plazo de 45")).toBeVisible();

    await admin.goto("/admin/inversiones");
    const row = admin.locator("tr", { hasText: `REF-PLAZO-${stamp}` });
    await expect(row).toContainText("Plazo: 45 días");
    await row.getByRole("button", { name: "Plazo" }).click();
    await expect(admin.getByLabel("Nuevo plazo mínimo (días)")).toHaveValue("45");
    await admin.getByLabel("Nuevo plazo mínimo (días)").fill("7");
    await admin.getByRole("button", { name: "Guardar plazo" }).click();
    await expect(admin.getByText(/Plazo actualizado a 7 días: retiro disponible desde el/)).toBeVisible();
    expect((await emailsTo(investorEmail)).some(e => /Plazo de retiro actualizado$/.test(e.subject))).toBe(true);

    await investor.reload();
    await investor.getByRole("button", { name: "Solicitar retiro" }).click();
    await investor.fill("#payout-details", "Banco Plazo 123-456");
    await investor.getByRole("button", { name: "Confirmar solicitud" }).click();
    await expect(investor.locator(".withdraw-list li").first()).toContainText("EN REVISIÓN");

    // Con un retiro en curso ya no se puede cambiar el plazo.
    await admin.reload();
    await expect(admin.locator("tr", { hasText: `REF-PLAZO-${stamp}` }).getByRole("button", { name: "Plazo" })).toHaveCount(0);
    const res = await admin.request.post("/api/admin/investments", { data: { action: "term", investmentId: created!.id, termDays: 60 } });
    expect(res.status()).toBe(409);
    await admin.goto("/admin/actividad");
    await expect(admin.getByText("Cambió el plazo mínimo de retiro").first()).toBeVisible();
  });

  test("el plazo fijado a un pago pendiente se respeta al confirmarlo", async ({ browser }) => {
    const email = `pendiente-${stamp}@e2e.test`;
    await createUser(email);
    const investor = await newSession(browser, email);
    await investor.goto("/invertir?monto=60");
    await investor.getByText("Transferencia bancaria", { exact: true }).click();
    await investor.locator(".invest-check input").check();
    await investor.getByRole("button", { name: /Registrar inversión/ }).click();
    const ref = (await investor.locator(".invest-reference strong").innerText()).trim();

    await admin.goto("/admin/inversiones");
    await admin.getByRole("tab", { name: /Pago pendiente/ }).click();
    await admin.locator("tr", { hasText: ref }).getByRole("button", { name: "Plazo" }).click();
    await admin.getByLabel("Nuevo plazo mínimo (días)").fill("90");
    await admin.getByRole("button", { name: "Guardar plazo" }).click();
    await expect(admin.getByText("Plazo actualizado a 90 días. Empezará a contar cuando confirmes el pago.")).toBeVisible();

    await admin.goto("/admin/pagos");
    await admin.locator("tr", { hasText: ref }).getByRole("button", { name: "Confirmar pago" }).click();
    await admin.getByRole("button", { name: "Sí, confirmar pago" }).click();
    await expect(admin.getByText(/Pago confirmado/)).toBeVisible();
    const { data } = await service().from("investments").select("status,term_days,started_at,ends_at").eq("payment_reference", ref).single();
    expect(data).toMatchObject({ status: "active", term_days: 90 });
    expect(new Date(data!.ends_at).getTime() - new Date(data!.started_at).getTime()).toBe(90 * DAY);
  });

  test("validaciones: plazo fuera de rango y acciones solo para administradores", async () => {
    const { data: inv } = await service().from("investments").select("id").eq("user_id", referredId).eq("status", "active").limit(1).single();
    for (const termDays of [0, 3651, 2.5, "30"]) {
      const res = await admin.request.post("/api/admin/investments", { data: { action: "term", investmentId: inv!.id, termDays } });
      expect(res.status(), `termDays=${termDays}`).toBe(400);
    }
    const bad = await admin.request.post("/api/admin/referrals", { data: { action: "pct", pct: 150 } });
    expect(bad.status()).toBe(400);
    for (const payload of [{ action: "pct", pct: 50 }, { action: "assign", userId: referrerId, code: "" }]) {
      const res = await referrer.request.post("/api/admin/referrals", { data: payload });
      expect(res.status()).toBe(403);
    }
    const res = await referrer.request.post("/api/admin/investments", { data: { action: "term", investmentId: inv!.id, termDays: 1 } });
    expect(res.status()).toBe(403);
    // El administrador no tiene página de referidos de cliente: va a la suya.
    await admin.goto("/referidos");
    await admin.waitForURL("**/admin/referidos");
  });
});
