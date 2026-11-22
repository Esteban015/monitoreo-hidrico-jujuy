import { test as base, expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { DataBundle } from "../src/lib/types";

/** Datos reales publicados (los mismos que sirve la app): las expectativas salen de acá, no de valores escritos a mano. */
export function loadBundle(): DataBundle {
  const read = (n: string) => JSON.parse(readFileSync(join(process.cwd(), "out", "data", n), "utf-8")); // Playwright corre desde la raíz
  return { cases: read("cases.json"), water: read("water_metrics.json"), rainfall: read("rainfall_metrics.json") };
}

type Guard = { pageErrors: string[]; consoleErrors: string[]; external: string[]; allowConsoleErrors: RegExp[] };

/**
 * - Aborta y registra toda solicitud a un host que no sea 127.0.0.1/localhost (la suite no depende de internet).
 * - Falla el test si hubo excepciones JavaScript o errores de consola no esperados.
 */
export const test = base.extend<{ guard: Guard }>({
  guard: [async ({ page }, use) => {
    const g: Guard = { pageErrors: [], consoleErrors: [], external: [], allowConsoleErrors: [] };
    page.on("pageerror", (e) => g.pageErrors.push(e.message));
    page.on("console", (m) => {
      if (m.type() === "error") g.consoleErrors.push(m.text());
    });
    await page.route(/^https?:\/\//, (route) => {
      const host = new URL(route.request().url()).hostname;
      if (host === "127.0.0.1" || host === "localhost") return route.continue();
      g.external.push(route.request().url());
      return route.abort("internetdisconnected");
    });
    await use(g);
    expect(g.pageErrors, "excepciones JavaScript").toEqual([]);
    const unexpected = g.consoleErrors.filter((t) => !g.allowConsoleErrors.some((r) => r.test(t)));
    expect(unexpected, "errores de consola").toEqual([]);
  }, { auto: true }],
});
export { expect };

export async function openApp(page: Page) {
  await page.goto("./");
  await expect(page.locator("[data-case]")).toHaveCount(2);
  await expect(page.getByTestId("map")).toHaveAttribute("data-basemap-status", "listo");
}

export async function selectCase(page: Page, id: string) {
  await page.locator(`[data-case=${id}]`).click();
  await expect(page.getByTestId("results")).toBeVisible();
  await expect(page.getByTestId("map")).toHaveAttribute("data-geo", "listo");
}

/** Entidades de agua dibujadas (fecha A + fecha B) según los conteos que expone MapView (render Canvas). */
export const overlayPaths = async (page: Page) => {
  const m = page.getByTestId("map");
  return Number(await m.getAttribute("data-drawn-a")) + Number(await m.getAttribute("data-drawn-b"));
};
export const modeButton = (page: Page, label: "Antes" | "Después" | "Comparar") =>
  page.getByRole("group", { name: "Fecha a mostrar en el mapa" }).getByRole("button", { name: label, exact: true });
