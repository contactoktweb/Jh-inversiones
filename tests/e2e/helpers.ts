import { expect, type Browser, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
export const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/** Cliente con la service role key: solo para preparar datos en las pruebas. */
export const service = () => createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
export const PASSWORD = "Clave-segura-123";

/** Crea una cuenta ya confirmada (más rápido que pasar por el correo). */
export async function createUser(email: string, password = PASSWORD) {
  const { data, error } = await service().auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw error;
  return data.user.id;
}

export async function login(page: Page, email: string, password = PASSWORD) {
  await page.goto("/acceso");
  await page.fill("#email", email);
  await page.fill("#password", password);
  await page.click("button.auth-submit");
  await page.waitForURL(url => !url.pathname.startsWith("/acceso"));
}

export async function newSession(browser: Browser, email: string) {
  const context = await browser.newContext();
  const page = await context.newPage();
  page.on("dialog", d => d.accept());
  await login(page, email);
  return page;
}

type SentEmail = { to: string | string[]; subject: string; html: string };
/** Correos enviados a una dirección por la API de Resend (simulada en tests/e2e/mock-resend.ts). */
export async function emailsTo(to: string): Promise<SentEmail[]> {
  const sent: SentEmail[] = await (await fetch("http://127.0.0.1:4010/__sent")).json();
  return sent.filter(e => (Array.isArray(e.to) ? e.to : [e.to]).includes(to));
}

/** Último correo recibido por una dirección y el enlace de su botón. */
export async function lastEmailLink(to: string) {
  for (let i = 0; i < 20; i++) {
    const msg = (await emailsTo(to)).at(-1);
    const href = msg && /href="([^"]+)"/.exec(msg.html)?.[1];
    if (msg && href) return { subject: msg.subject, link: href.replace(/&amp;/g, "&") };
    await new Promise(r => setTimeout(r, 500));
  }
  throw new Error(`No llegó ningún correo a ${to}`);
}

/** Mueve el inicio de las inversiones de un usuario `days` días hacia atrás (simula el paso del tiempo). */
export async function ageInvestments(userId: string, days: number) {
  const { data } = await service().from("investments").select("id,started_at").eq("user_id", userId).eq("status", "active");
  for (const row of data || []) {
    const start = new Date(Date.now() - days * 86_400_000);
    await service().from("investments").update({ started_at: start.toISOString(), ends_at: new Date(start.getTime() + 30 * 86_400_000).toISOString() }).eq("id", row.id);
  }
}

export async function closeDailyPrompt(page: Page) {
  const later = page.getByRole("button", { name: "Recordármelo después" });
  if (await later.isVisible().catch(() => false)) await later.click();
}

export const expectToast = (page: Page, text: string | RegExp) => expect(page.getByRole("status").filter({ hasText: text }).first()).toBeVisible();
