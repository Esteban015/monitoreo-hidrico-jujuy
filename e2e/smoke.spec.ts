// Smoke E2E acotado (proyecto "smoke"): arranque, mapa local, ambos casos con valores reales y un cambio de modo.
// Pensado para terminar en segundos; el script npm aplica --global-timeout=120000 y --retries=0.
import { fmtPct, getCaseView } from "../src/lib/metrics";
import { expect, loadBundle, modeButton, openApp, overlayPaths, selectCase, test } from "./fixtures";

const bundle = loadBundle();

test("smoke: inicia, mapa local, Pozuelos y Las Maderas con valores reales", async ({ page, guard }) => {
  test.setTimeout(60_000);
  await openApp(page);
  await expect(page.getByTestId("map")).toHaveAttribute("data-base-features", "17");
  for (const id of ["laguna-pozuelos", "dique-las-maderas"]) {
    await selectCase(page, id);
    await expect(page.getByTestId("pct-main")).toHaveText(fmtPct(getCaseView(bundle, id)!.comparison!.MNDWI.pct_change));
  }
  await modeButton(page, "Antes").click();
  expect(await overlayPaths(page)).toBeGreaterThan(0);
  expect(guard.external).toEqual([]);
});
