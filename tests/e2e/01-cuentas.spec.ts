import { expect, test } from "@playwright/test";
import { createUser, emailsTo, lastEmailLink, login, PASSWORD } from "./helpers";

test.describe("Cuentas de usuario", () => {
  test("registro: entra directo a su panel y recibe la bienvenida por Resend", async ({ page }) => {
    test.skip(process.env.REQUIRE_EMAIL_CONFIRMATION === "true", "modo con confirmación por correo");
    const email = `registro-${Date.now()}@e2e.test`;
    await page.goto("/acceso");
    await page.getByRole("button", { name: "¿No tienes cuenta? Regístrate" }).click();
    await page.fill("#email", email);
    await page.fill("#password", PASSWORD);
    await page.click("button.auth-submit");
    await page.waitForURL("**/dashboard");
    await expect(page.getByRole("heading", { name: /Hola/ })).toBeVisible();
    const { subject, link } = await lastEmailLink(email);
    expect(subject).toBe("JH Inversiones · Bienvenido");
    expect(link).toMatch(/\/dashboard$/);

    // El mismo correo no se puede registrar dos veces.
    const other = await (await page.context().browser()!.newContext()).newPage();
    await other.goto("/acceso");
    await other.getByRole("button", { name: "¿No tienes cuenta? Regístrate" }).click();
    await other.fill("#email", email);
    await other.fill("#password", PASSWORD);
    await other.click("button.auth-submit");
    await expect(other.getByText("Ya existe una cuenta con este correo")).toBeVisible();
  });

  test("registro con confirmación por correo (REQUIRE_EMAIL_CONFIRMATION=true, enlace en otro dispositivo)", async ({ page, browser }) => {
    test.skip(process.env.REQUIRE_EMAIL_CONFIRMATION !== "true", "solo con confirmación por correo");
    const email = `registro-${Date.now()}@e2e.test`;
    await page.goto("/acceso");
    await page.getByRole("button", { name: "¿No tienes cuenta? Regístrate" }).click();
    await page.fill("#email", email);
    await page.fill("#password", PASSWORD);
    await page.click("button.auth-submit");
    await expect(page.getByText("Cuenta creada. Revisa tu correo")).toBeVisible();

    await page.fill("#email", email);
    await page.fill("#password", PASSWORD);
    await page.click("button.auth-submit");
    await expect(page.getByText("Confirma tu correo antes de iniciar sesión.")).toBeVisible();

    const { subject, link } = await lastEmailLink(email);
    expect(subject).toBe("JH Inversiones · Confirma tu cuenta");
    const other = await (await browser.newContext()).newPage();
    await other.goto(link);
    await other.waitForURL("**/dashboard");
    await expect(other.getByRole("heading", { name: /Hola/ })).toBeVisible();
  });

  test("contraseña incorrecta muestra un mensaje claro", async ({ page }) => {
    const email = `clave-${Date.now()}@e2e.test`;
    await createUser(email);
    await page.goto("/acceso");
    await page.fill("#email", email);
    await page.fill("#password", "otra-clave-999");
    await page.click("button.auth-submit");
    await expect(page.getByText("Correo o contraseña incorrectos.")).toBeVisible();
  });

  test("recuperación de contraseña desde el correo", async ({ page, browser }) => {
    const email = `recupera-${Date.now()}@e2e.test`;
    await createUser(email);
    await page.goto("/acceso");
    await page.getByRole("button", { name: "¿Olvidaste tu contraseña?" }).click();
    await page.fill("#email", email);
    await page.click("button.auth-submit");
    await expect(page.getByText("te enviamos un enlace")).toBeVisible();
    // Un correo no registrado recibe la misma respuesta, sin enviar nada.
    const nobody = `nadie-${Date.now()}@e2e.test`;
    await page.fill("#email", nobody);
    await page.click("button.auth-submit");
    await expect(page.getByText("te enviamos un enlace")).toBeVisible();
    await page.waitForTimeout(500);
    expect(await emailsTo(nobody)).toHaveLength(0);

    const { subject, link } = await lastEmailLink(email);
    expect(subject).toBe("JH Inversiones · Restablece tu contraseña");
    const other = await (await browser.newContext()).newPage();
    await other.goto(link);
    await other.waitForURL("**/restablecer");
    await other.fill("#password", "Nueva-clave-456");
    await other.fill("#confirm", "Nueva-clave-456");
    await other.click("button.auth-submit");
    await other.waitForURL("**/dashboard");

    const fresh = await (await browser.newContext()).newPage();
    await login(fresh, email, "Nueva-clave-456");
    await expect(fresh).toHaveURL(/\/dashboard/);
    // Un enlace ya usado no sirve de nuevo.
    await other.goto(link);
    await expect(other).toHaveURL(/\/acceso\?error=enlace/);
  });

  test("el cliente actualiza sus datos en Mi cuenta", async ({ page }) => {
    const email = `perfil-${Date.now()}@e2e.test`;
    await createUser(email);
    await login(page, email);
    await expect(page.getByText("Completa tus datos")).toBeVisible();
    await page.goto("/cuenta");
    await page.getByLabel("Nombre completo").fill("Ana Pérez");
    await page.getByLabel("Teléfono / WhatsApp").fill("+57 300 111 2222");
    await page.getByLabel("País").fill("Colombia");
    await page.getByLabel("¿Dónde quieres recibir tus retiros?").fill("Bancolombia ahorros 123-456789-00");
    await page.getByRole("button", { name: "Guardar datos" }).click();
    await expect(page.getByText("Datos guardados.")).toBeVisible();
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: "Hola, Ana." })).toBeVisible();
  });
});
