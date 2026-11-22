import { defineConfig } from "@playwright/test";

// E2E contra una instancia CONTROLADA: build estático (out/) servido por scripts/serve-static.mjs en 127.0.0.1.
// Usa el Chrome instalado (channel "chrome"): no descarga navegadores. Requiere `npm run build` previo.
const PORT = 4173;

export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"], ["json", { outputFile: "test-results/e2e-results.json" }]],
  webServer: {
    command: `node scripts/serve-static.mjs ${PORT}`,
    url: `http://127.0.0.1:${PORT}/`,
    reuseExistingServer: false,
    timeout: 30_000,
  },
  use: { baseURL: `http://127.0.0.1:${PORT}/`, channel: "chrome", trace: "off", screenshot: "off" },
  projects: [
    { name: "smoke", testMatch: /(smoke|landing|navigation|assets)\.spec\.ts/, use: { viewport: { width: 1440, height: 900 } } },
    { name: "desktop", testMatch: /(dashboard|responsive|evidence)\.spec\.ts/, use: { viewport: { width: 1440, height: 900 } } },
    { name: "tablet", testMatch: /responsive\.spec\.ts/, use: { viewport: { width: 768, height: 1024 }, hasTouch: true } },
    { name: "movil", testMatch: /(responsive|evidence|landing|menu)\.spec\.ts/, use: { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true } },
    { name: "movil-se", testMatch: /(responsive|landing|menu)\.spec\.ts/, use: { viewport: { width: 375, height: 667 }, hasTouch: true, isMobile: true } },
    { name: "movil-chico", testMatch: /responsive\.spec\.ts/, use: { viewport: { width: 360, height: 800 }, hasTouch: true, isMobile: true } },
    {
      // Escenario A real: solo localhost resuelve; cualquier dominio de internet falla a nivel DNS.
      name: "sin-internet",
      testMatch: /offline\.spec\.ts/,
      use: { viewport: { width: 1440, height: 900 }, launchOptions: { args: ["--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1"] } },
    },
  ],
});
