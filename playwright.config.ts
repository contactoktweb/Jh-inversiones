import { defineConfig } from "@playwright/test";

/**
 * Pruebas de punta a punta. Se ejecutan con `pnpm test:e2e` (scripts/test-e2e.sh), que levanta
 * Supabase local con Docker, reinicia la base de datos, compila la app y la sirve en el puerto 3123.
 */
export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [["list"], ["html", { open: "never", outputFolder: "test-results/e2e-report" }]],
  outputDir: "test-results/e2e-artifacts",
  use: { baseURL: "http://localhost:3123", locale: "es-CO", trace: "retain-on-failure", screenshot: "only-on-failure" },
  webServer: { command: "pnpm start -p 3123", url: "http://localhost:3123", reuseExistingServer: false, timeout: 120_000 },
});
