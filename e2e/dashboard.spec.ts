import { describePercentile, fmtDate, fmtMonth, fmtNum, fmtPct, fmtSigned, getCaseView, uncertaintyRange } from "../src/lib/metrics";
import { NOTICES } from "../src/lib/notices";
import { expect, loadBundle, modeButton, openApp, overlayPaths, selectCase, test } from "./fixtures";

const bundle = loadBundle();
const view = (id: string) => getCaseView(bundle, id)!;

test("1-2. inicia y dibuja el mapa base LOCAL sin solicitudes externas", async ({ page, guard }) => {
  await openApp(page);
  await expect(page).toHaveTitle("Demo — Monitoreo Hídrico Jujuy");
  await expect(page.getByRole("banner")).toContainText("Monitoreo Hídrico Jujuy");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Superficie de agua visible");
  await expect(page.getByTestId("map")).toHaveAttribute("data-basemap", "local");
  await expect(page.getByTestId("map")).toHaveAttribute("data-base-features", "17"); // provincia + 16 departamentos (IGN)
  expect(await page.locator(".leaflet-base-pane canvas, .leaflet-overlay-pane canvas").count()).toBeGreaterThan(0);
  await expect(page.locator(".leaflet-control-attribution")).toContainText("IGN Argentina");
  await expect(page.locator(".leaflet-tile")).toHaveCount(0); // ninguna tesela remota
  expect(guard.external).toEqual([]);
});

for (const id of ["laguna-pozuelos", "dique-las-maderas"]) {
  test(`3-6. ${id}: selección, valores reales y modos Antes/Después/Comparar`, async ({ page, guard }) => {
    const v = view(id);
    const comp = v.comparison!;
    await openApp(page);
    await selectCase(page, id);
    await expect(page.locator(`[data-case=${id}]`)).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByTestId("results").getByRole("heading", { level: 2 })).toHaveText(v.info.name);
    // valores = archivos procesados
    await expect(page.getByTestId("pct-main")).toHaveText(fmtPct(comp.MNDWI.pct_change));
    await expect(page.getByTestId("abs-main")).toHaveText(`${fmtSigned(comp.MNDWI.abs_diff_km2, 2)} km²`);
    await expect(page.getByTestId("card-Antes")).toContainText(`${fmtNum(comp.MNDWI.area_a_km2, 2)} km²`);
    await expect(page.getByTestId("card-Antes")).toContainText(fmtDate(v.sceneA!.date));
    await expect(page.getByTestId("card-Después")).toContainText(`${fmtNum(comp.MNDWI.area_b_km2, 2)} km²`);
    await expect(page.getByTestId("card-Después")).toContainText(fmtDate(v.sceneB!.date));
    const r = uncertaintyRange(comp, v.sceneA!, v.sceneB!)!;
    await expect(page.getByTestId("range")).toContainText(`${fmtPct(r.max)} a ${fmtPct(r.min)}`);
    await expect(page.getByTestId("quality")).toContainText(`${fmtNum(v.sceneA!.coverage_pct, 1)} %`);
    // modos: Comparar (inicial) > Antes / Después; leyenda acorde
    await expect(modeButton(page, "Comparar")).toHaveAttribute("aria-pressed", "true");
    const nAmbos = await overlayPaths(page);
    await modeButton(page, "Antes").click();
    await expect(modeButton(page, "Antes")).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByTestId("legend")).not.toContainText(fmtDate(v.sceneB!.date));
    const nAntes = await overlayPaths(page);
    await modeButton(page, "Después").click();
    await expect(page.getByTestId("legend")).not.toContainText(fmtDate(v.sceneA!.date));
    const nDespues = await overlayPaths(page);
    expect(nAntes).toBeGreaterThan(0);
    expect(nDespues).toBeGreaterThan(0);
    expect(nAmbos).toBeGreaterThan(Math.max(nAntes, nDespues));
    await modeButton(page, "Comparar").click();
    await expect(page.getByTestId("legend")).toContainText("solo en la primera fecha");
    expect(guard.external).toEqual([]);
  });
}

test("7. Pozuelos: valor principal −53,9 %, rango −26,3 % a −68,5 % y advertencia de barro/agua somera", async ({ page }) => {
  await openApp(page);
  await selectCase(page, "laguna-pozuelos");
  await expect(page.getByTestId("pct-main")).toHaveText("−53,9 %");
  await expect(page.getByTestId("range")).toContainText("−26,3 % a −68,5 %");
  const hs = page.getByTestId("high-sensitivity");
  await expect(hs).toBeVisible();
  await expect(hs).toContainText("barro");
  await expect(hs).toContainText("no debe leerse como una medida exacta");
});

test("8. Las Maderas: −18,1 %, rango −13,0 % a −18,9 % y advertencias de delimitación", async ({ page }) => {
  await openApp(page);
  await selectCase(page, "dique-las-maderas");
  await expect(page.getByTestId("pct-main")).toHaveText("−18,1 %");
  await expect(page.getByTestId("range")).toContainText("−13,0 % a −18,9 %");
  await expect(page.getByTestId("high-sensitivity")).toHaveCount(0);
  const w = page.getByTestId("warnings");
  await expect(w).toContainText(NOTICES.basin);
  await expect(w).toContainText("aguas abajo del muro");
  await expect(w).toContainText(NOTICES.surface);
  await expect(w).toContainText(NOTICES.noTrend);
  await expect(w).toContainText(NOTICES.noCausality);
});

test("9. precipitación: mes previo, media/mediana 1995–2024, anomalía y percentil juntos", async ({ page }) => {
  await openApp(page);
  for (const id of ["laguna-pozuelos", "dique-las-maderas"]) {
    const v = view(id);
    await selectCase(page, id);
    const cards = page.getByTestId("rain-card");
    await expect(cards).toHaveCount(2);
    for (const [i, o] of [v.rainA!, v.rainB!].entries()) {
      const c = cards.nth(i);
      await expect(c).toContainText(fmtMonth(o.month));
      await expect(c).toContainText(`${fmtNum(o.value_mm, 1)} mm`);
      await expect(c).toContainText(`Media ${o.reference!.first_year}–${o.reference!.last_year}: ${fmtNum(o.reference!.mean_mm, 1)} mm`);
      await expect(c.getByTestId("anomaly")).toHaveText(`Anomalía ${fmtPct(o.anomaly_pct)} · ${describePercentile(o.percentile_in_reference)}`);
    }
    await expect(page.getByTestId("rainfall")).toContainText(NOTICES.rainMonth);
  }
});

test("10. fuentes, fechas e identificadores disponibles en trazabilidad", async ({ page }) => {
  const v = view("laguna-pozuelos");
  await openApp(page);
  await selectCase(page, "laguna-pozuelos");
  const t = page.getByTestId("traceability");
  await t.locator("summary").click();
  for (const s of [v.sceneA!, v.sceneB!]) {
    await expect(t).toContainText(s.scene_id);
    await expect(t.locator(`a[href="${s.stac_item}"]`)).toHaveCount(1);
    await expect(t).toContainText(fmtDate(s.date));
  }
  await expect(t).toContainText("CHIRPS v3.0");
  await expect(t).toContainText("HydroBASINS");
  await expect(t).toContainText(v.info.aoi.ref);
});

test("11-12. error de carga no rompe la interfaz y Reintentar recupera", async ({ page, guard }) => {
  guard.allowConsoleErrors.push(/Failed to load resource|ERR_FAILED|net::/);
  let blocked = true;
  await page.route("**/data/water_metrics.json", (route) => (blocked ? route.abort("failed") : route.continue()));
  await page.goto("demo");
  const alert = page.getByTestId("data-status"); // (Next.js agrega su propio role="alert" de anuncio de rutas)
  await expect(alert).toContainText("No se pudieron cargar los datos");
  await expect(alert).toContainText("water_metrics.json");
  await expect(page.getByTestId("map")).toBeVisible(); // la interfaz sigue en pie
  blocked = false;
  await alert.getByRole("button", { name: "Reintentar" }).click();
  await expect(page.locator("[data-case]")).toHaveCount(2);
  await selectCase(page, "dique-las-maderas");
});

test("11b. geometría faltante: aviso en el mapa, métricas intactas", async ({ page, guard }) => {
  guard.allowConsoleErrors.push(/Failed to load resource|404/);
  await page.route("**/geometries/dique-las-maderas_water_mndwi_*.geojson", (route) => route.fulfill({ status: 404, body: "" }));
  await openApp(page);
  await page.locator("[data-case=dique-las-maderas]").click();
  await expect(page.getByTestId("map")).toHaveAttribute("data-geo", "error");
  await expect(page.getByTestId("map").getByRole("status")).toContainText("No se pudieron cargar las geometrías");
  await expect(page.getByTestId("pct-main")).toHaveText(fmtPct(view("dique-las-maderas").comparison!.MNDWI.pct_change));
});

test("OSM opcional: sin internet avisa y los datos locales siguen funcionando", async ({ page, guard }) => {
  guard.allowConsoleErrors.push(/Failed to load resource|ERR_INTERNET_DISCONNECTED|net::/);
  await openApp(page);
  await selectCase(page, "laguna-pozuelos");
  await page.getByRole("button", { name: "OpenStreetMap (online)" }).click();
  await expect(page.getByTestId("map")).toHaveAttribute("data-osm", "sin-conexion");
  await expect(page.getByTestId("map").getByRole("status")).toContainText("OpenStreetMap no disponible");
  expect(guard.external.every((u) => u.includes("tile.openstreetmap.org"))).toBe(true);
  await page.getByRole("button", { name: "Mapa local" }).click();
  await expect(page.getByTestId("map")).toHaveAttribute("data-osm", "inactivo");
  await expect(page.getByTestId("pct-main")).toHaveText(fmtPct(view("laguna-pozuelos").comparison!.MNDWI.pct_change));
});
