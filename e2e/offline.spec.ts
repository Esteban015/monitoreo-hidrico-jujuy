// Escenario A (obligatorio): app servida en 127.0.0.1 y SIN internet. El proyecto "sin-internet" arranca Chrome con
// --host-resolver-rules que hacen fallar la resolución DNS de todo host salvo 127.0.0.1. Además el fixture registra
// cualquier intento de salida. Se registra cada solicitud externa fallida.
import { writeFileSync, mkdirSync } from "node:fs";
import { fmtPct, getCaseView } from "../src/lib/metrics";
import { expect, loadBundle, modeButton, openApp, overlayPaths, selectCase, test } from "./fixtures";

const bundle = loadBundle();

test("14. sin internet: mapa local, ambos casos, tres modos, imágenes, geometrías y métricas", async ({ page, guard }) => {
  const failed: string[] = [];
  page.on("requestfailed", (r) => failed.push(`${r.url()} :: ${r.failure()?.errorText}`));
  const requested: string[] = [];
  page.on("request", (r) => requested.push(r.url()));

  guard.allowConsoleErrors.push(/ERR_INTERNET_DISCONNECTED|ERR_NAME_NOT_RESOLVED/); // solo por la sonda de control
  await openApp(page);
  // control: internet realmente inaccesible desde este navegador (la sonda se excluye del registro de la app)
  const probe = await page.evaluate(async () => {
    try {
      await fetch("https://example.com/", { mode: "no-cors" }); // sonda de control, no es tráfico de la app
      return "accesible";
    } catch {
      return "inaccesible";
    }
  });
  expect(probe).toBe("inaccesible");

  const log: Record<string, unknown> = {};
  for (const id of ["laguna-pozuelos", "dique-las-maderas"]) {
    const v = getCaseView(bundle, id)!;
    await selectCase(page, id);
    await expect(page.getByTestId("pct-main")).toHaveText(fmtPct(v.comparison!.MNDWI.pct_change));
    const counts: Record<string, number> = {};
    for (const m of ["Antes", "Después", "Comparar"] as const) {
      await modeButton(page, m).click();
      await expect(modeButton(page, m)).toHaveAttribute("aria-pressed", "true");
      counts[m] = await overlayPaths(page);
      expect(counts[m]).toBeGreaterThan(0);
    }
    // imágenes de control locales (el <details> conserva su estado al cambiar de caso)
    const quicklooks = page.getByTestId("quicklooks");
    if (!(await quicklooks.evaluate((el) => (el as HTMLDetailsElement).open))) {
      await quicklooks.locator("summary").click();
    }
    const imgs = page.getByTestId("results").locator("img");
    await expect(imgs).toHaveCount(2);
    for (const img of await imgs.all()) {
      await img.scrollIntoViewIfNeeded();
      await expect.poll(() => img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0)).toBe(true);
    }
    log[id] = { pct: v.comparison!.MNDWI.pct_change, overlayPaths: counts };
  }
  const PROBE = "https://example.com/";
  const external = requested.filter((u) => u !== PROBE && !/^https?:\/\/(127\.0\.0\.1|localhost)[:/]/.test(u) && /^https?:/.test(u));
  mkdirSync("docs/evidence/fase5", { recursive: true });
  writeFileSync(
    "docs/evidence/fase5/offline-escenario-A.json",
    JSON.stringify({ scenario: "A: servida en 127.0.0.1, DNS bloqueado para todo otro host", probe, cases: log, externalRequests: external, failedRequests: failed, guardExternal: guard.external, probeUrl: PROBE }, null, 2),
  );
  expect(external, "la app no debe intentar salir a internet en modo local").toEqual([]);
  await page.screenshot({ path: "docs/evidence/fase5/05-sin-internet-mapa-local.png" });
});
