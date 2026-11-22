// Landing "/" (proyectos smoke = escritorio y movil). Valores de casos = data/derived (vía out/data publicado).
import { fmtPct, getCaseView, uncertaintyRange } from "../src/lib/metrics";
import { NOTICES } from "../src/lib/notices";
import { expect, loadBundle, test } from "./fixtures";

const bundle = loadBundle();

test("landing: secciones, valores reales, CTA a la demo y sin desbordes", async ({ page, guard }) => {
  test.setTimeout(60_000);
  await page.goto("./");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Ver cómo cambia el agua de Jujuy");
  for (const id of ["problema", "como-funciona", "casos", "metodologia"]) await expect(page.locator(`#${id}`)).toHaveCount(1);

  for (const id of ["laguna-pozuelos", "dique-las-maderas"]) {
    const v = getCaseView(bundle, id)!;
    const card = page.getByTestId(`landing-case-${id}`);
    await expect(card.getByTestId("landing-pct")).toHaveText(fmtPct(v.comparison!.MNDWI.pct_change));
    const r = uncertaintyRange(v.comparison!, v.sceneA!, v.sceneB!)!;
    await expect(card.getByTestId("landing-range")).toHaveText(`${fmtPct(r.max)} a ${fmtPct(r.min)}`);
  }
  // hero: métrica principal y rango (de los datos), diferenciados, con su aclaración
  const poz = getCaseView(bundle, "laguna-pozuelos")!;
  const pr = uncertaintyRange(poz.comparison!, poz.sceneA!, poz.sceneB!)!;
  await expect(page.getByTestId("hero-pct")).toHaveText(fmtPct(poz.comparison!.MNDWI.pct_change));
  await expect(page.getByTestId("hero-range")).toContainText(`${fmtPct(pr.max)} a ${fmtPct(pr.min)}`);
  await expect(page.getByTestId("hero-comparison")).toContainText("Cambio estimado de superficie de agua visible entre las dos fechas");
  await expect(page.getByTestId("hero-comparison")).toContainText("No es volumen ni caudal");
  await expect(page.getByTestId("landing-case-laguna-pozuelos")).toContainText("Alta sensibilidad al método");
  await expect(page.getByTestId("landing-case-dique-las-maderas")).toContainText("aguas abajo del muro");
  await expect(page.locator("#metodologia")).toContainText(NOTICES.surface);
  await expect(page.locator("#metodologia")).toContainText("No mide volumen almacenado ni caudal");

  // imágenes reales del hero cargadas
  for (const img of await page.locator("main img").all()) {
    await img.scrollIntoViewIfNeeded(); // las miniaturas usan loading="lazy"
    await expect.poll(() => img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0)).toBe(true);
  }
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  expect(guard.external).toEqual([]);

  // CTA principal -> demo funcional; y vuelta al inicio
  await page.getByRole("link", { name: "Explorar la demo" }).click();
  await expect(page).toHaveURL(/\/demo$/);
  await expect(page.locator("[data-case]")).toHaveCount(2);
  await expect(page.getByTestId("map")).toHaveAttribute("data-basemap-status", "listo");
  await page.getByRole("link", { name: "Inicio", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Ver cómo cambia el agua de Jujuy");
});

test("zoom 200 % (viewport equivalente 720×450): sin scroll horizontal en / y /demo", async ({ page }) => {
  await page.setViewportSize({ width: 720, height: 450 });
  for (const path of ["/", "/demo"]) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, path).toBeLessThanOrEqual(0);
  }
});
