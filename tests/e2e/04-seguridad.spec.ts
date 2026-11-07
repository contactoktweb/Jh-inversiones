import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { ANON_KEY, createUser, newSession, PASSWORD, service, SUPABASE_URL } from "./helpers";

test.describe("Seguridad y permisos", () => {
  test("las páginas privadas piden iniciar sesión", async ({ page }) => {
    for (const path of ["/dashboard", "/admin", "/admin/pagos", "/invertir?monto=50", "/cuenta"]) {
      await page.goto(path);
      await expect(page, path).toHaveURL(/\/acceso/);
    }
  });

  test("las APIs rechazan a visitantes y a clientes sin permiso", async ({ browser, request }) => {
    expect((await request.post("/api/checkout", { data: { amountUsd: 100, acceptTerms: true } })).status()).toBe(401);
    expect((await request.get("/api/admin/export?tipo=clientes")).status()).toBe(403);

    const email = `seguridad-${Date.now()}@e2e.test`;
    await createUser(email);
    const user = await newSession(browser, email);
    await user.goto("/admin");
    await expect(user).toHaveURL(/\/dashboard/);
    const id = "00000000-0000-0000-0000-000000000000";
    for (const [url, data] of [
      ["/api/admin/rates", { date: "2026-11-01", ratePct: 50 }],
      ["/api/admin/claims", { investmentId: id, status: "settled" }],
      ["/api/admin/payments", { investmentId: id, action: "confirm" }],
      ["/api/admin/investments", { action: "create", email, amountUsd: 1000, reference: "x" }],
      ["/api/admin/users", { userId: id, action: "make_admin" }],
      ["/api/admin/settings", { transfer_instructions: "hack" }],
    ] as const) expect((await user.request.post(url, { data })).status(), url).toBe(403);
    expect((await user.request.get("/api/admin/export?tipo=clientes")).status()).toBe(403);
  });

  test("valida montos, métodos y términos al invertir", async ({ browser }) => {
    const email = `validacion-${Date.now()}@e2e.test`;
    await createUser(email);
    const user = await newSession(browser, email);
    const post = (data: object) => user.request.post("/api/checkout", { data });
    expect((await post({ amountUsd: 10, acceptTerms: true, method: "test" })).status()).toBe(400);
    expect((await post({ amountUsd: 50.5, acceptTerms: true, method: "test" })).status()).toBe(400);
    expect((await post({ amountUsd: 100, acceptTerms: false, method: "test" })).status()).toBe(400);
    expect((await post({ amountUsd: 100, acceptTerms: true, method: "stripe" })).status()).toBe(400);
    expect((await post({ amountUsd: 50, acceptTerms: true, method: "test" })).status()).toBe(200);
  });

  test("un administrador no puede invertir y una solicitud desde otro sitio se bloquea", async ({ browser }) => {
    await createUser("admin@e2e.test").catch(() => undefined);
    const admin = await newSession(browser, "admin@e2e.test");
    expect((await admin.request.post("/api/checkout", { data: { amountUsd: 100, acceptTerms: true, method: "test" } })).status()).toBe(403);
    const res = await admin.request.post("/api/admin/rates", { data: { date: "2026-11-01", ratePct: 1 }, headers: { Origin: "https://sitio-malicioso.com" } });
    expect(res.status()).toBe(403);
  });

  test("RLS: un cliente solo ve sus datos y no puede escribir en la base de datos", async () => {
    const a = `rls-a-${Date.now()}@e2e.test`, b = `rls-b-${Date.now()}@e2e.test`;
    const aId = await createUser(a);
    await createUser(b);
    await service().from("investments").insert({ user_id: aId, plan_id: "inicio", principal_usd: 100, started_at: new Date().toISOString(), ends_at: new Date(Date.now() + 31 * 86_400_000).toISOString(), payment_reference: `rls-${Date.now()}` });

    const asB = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
    await asB.auth.signInWithPassword({ email: b, password: PASSWORD });
    const { data: { user } } = await asB.auth.getUser();
    expect((await asB.from("investments").select("id")).data).toEqual([]);
    expect((await asB.from("profiles").select("email")).data).toEqual([{ email: b }]);
    expect((await asB.from("admin_audit").select("id")).data).toEqual([]);
    const insert = await asB.from("investments").insert({ user_id: user!.id, plan_id: "inicio", principal_usd: 999999, started_at: new Date().toISOString(), ends_at: new Date(Date.now() + 31 * 86_400_000).toISOString(), payment_reference: "hack" });
    expect(insert.error?.code).toBe("42501");
    expect((await asB.from("daily_rates").upsert({ rate_date: "2026-11-01", rate_pct: 99 })).error?.code).toBe("42501");
    expect((await asB.from("settings").upsert({ key: "transfer_instructions", value: "hack" })).error?.code).toBe("42501");
    const promote = await asB.from("profiles").update({ role: "admin" }).eq("id", user!.id).select();
    expect(promote.data ?? []).toEqual([]);
    const { data: profile } = await service().from("profiles").select("role").eq("id", user!.id).single();
    expect(profile!.role).toBe("user");
  });
});
