// Integración PR #3: bloques A/B/C separados, simulador experimental (entradas, validación, reset, cambio de caso)
// y ausencia de dependencia de la API opcional. Proyectos: desktop (1440×900) y movil (390×844).
import { expect, loadBundle, openApp, selectCase, test } from "./fixtures";
import { fmtNum } from "../src/lib/metrics";

const bundle = loadBundle();
const DISCLAIMER = "Modelo demostrativo basado en datos sintéticos. No constituye un pronóstico validado ni reemplaza mediciones de campo.";
const area = async (page: import("@playwright/test").Page) => {
  const t = (await page.getByTestId("sim-area").innerText()).replace(/km²/, "").trim();
  return Number(t.replace(/\./g, "").replace(",", "."));
};

test("bloques A (observaciones), B (clima estimado) y C (simulación) separados y en orden", async ({ page }) => {
  await openApp(page);
  await selectCase(page, "laguna-pozuelos");
  const ys: number[] = [];
  for (const id of ["block-observaciones", "block-clima", "block-simulacion"]) {
    const b = page.getByTestId(id);
    await expect(b).toBeVisible();
    ys.push((await b.boundingBox())!.y);
  }
  expect(ys[0]).toBeLessThan(ys[1]);
  expect(ys[1]).toBeLessThan(ys[2]);
  await expect(page.getByTestId("history")).toContainText("clima estimado");
  await expect(page.getByTestId("history")).toContainText("No es el promedio de la cuenca");
  await expect(page.getByTestId("results")).not.toContainText("ERA5");
  await expect(page.getByTestId("results")).not.toContainText("clima real");
});

test("simulador: título, aviso permanente, coma decimal, inválidos, negativos, reset y cambio de caso", async ({ page, guard }) => {
  const apiCalls: string[] = [];
  page.on("request", (r) => new URL(r.url()).pathname.startsWith("/api/") && apiCalls.push(r.url()));
  await openApp(page);
  await selectCase(page, "laguna-pozuelos");
  const sim = page.getByTestId("simulator");
  await sim.scrollIntoViewIfNeeded();
  await expect(sim.getByRole("heading", { name: "Simulador climático — demostración experimental" })).toBeVisible();
  await expect(page.getByTestId("sim-disclaimer")).toContainText(DISCLAIMER);
  const base = await area(page);
  const m = bundle.model!.cases["laguna-pozuelos"];
  expect(base).toBeCloseTo(m.baseline.last_observed_area_km2, 0);

  // coma decimal
  const precip = page.getByTestId("sim-precip-input");
  await precip.fill("250,5");
  await precip.press("Enter");
  await expect(precip).toHaveValue("250,5");
  await expect(page.getByTestId("sim-precip-msg")).toHaveCount(0);
  await expect.poll(() => area(page)).not.toBe(base);
  const a1 = await area(page);
  expect(Number.isFinite(a1)).toBe(true);

  // texto inválido: mensaje, sin NaN, el valor anterior se conserva
  await precip.fill("mucha lluvia");
  await precip.press("Enter");
  await expect(page.getByTestId("sim-precip-msg")).toContainText("número válido");
  await expect(precip).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByTestId("sim-area")).not.toContainText("NaN");
  expect(await area(page)).toBe(a1);

  // negativo / Infinity: se recorta al borde del rango con aviso
  await precip.fill("-50");
  await precip.press("Enter");
  await expect(page.getByTestId("sim-precip-msg")).toContainText("Fuera del rango");
  await expect(precip).toHaveValue(fmtNum(m.ranges.precip_3m_mm[0], 1));
  const temp = page.getByTestId("sim-temp-input");
  await temp.fill("Infinity");
  await temp.press("Enter");
  await expect(page.getByTestId("sim-temp-msg")).toContainText("número válido");
  await temp.fill("−3,5");
  await temp.press("Enter");
  await expect(page.getByTestId("sim-temp-msg")).toContainText("Fuera del rango");
  for (const id of ["sim-area", "sim-delta"]) {
    const t = await page.getByTestId(id).innerText();
    expect(t).not.toMatch(/NaN|Infinity|∞/);
  }
  await expect(page.getByTestId("sim-delta")).toContainText("escenario simulado");

  // reset
  await page.getByTestId("preset-reset").click();
  await expect.poll(() => area(page)).toBe(base);
  await expect(page.getByTestId("sim-precip-msg")).toHaveCount(0);
  await expect(page.getByTestId("sim-temp-msg")).toHaveCount(0);

  // cambio de caso: el simulador se reinicia con la base del nuevo caso
  await precip.fill("300");
  await precip.press("Enter");
  await page.locator("[data-case=dique-las-maderas]").scrollIntoViewIfNeeded();
  await selectCase(page, "dique-las-maderas");
  await expect(page).toHaveURL(/case=dique-las-maderas/);
  const mm = bundle.model!.cases["dique-las-maderas"];
  await expect(page.getByTestId("sim-precip-input")).toHaveValue(fmtNum(mm.baseline.precip_3m_mm, 1));
  await expect.poll(() => area(page)).toBeCloseTo(mm.baseline.last_observed_area_km2, 0);
  await expect(page.getByTestId("sim-disclaimer")).toContainText(DISCLAIMER);

  expect(apiCalls, "la demo no usa la API opcional").toEqual([]);
  expect(guard.external).toEqual([]);
});

test("sin modelo publicado: la demo científica sigue y el simulador se informa ausente", async ({ page, guard }) => {
  guard.allowConsoleErrors.push(/Failed to load resource|404/);
  await page.route("**/data/model/water_model.json", (r) => r.fulfill({ status: 404, body: "" }));
  await openApp(page);
  await selectCase(page, "laguna-pozuelos");
  await expect(page.getByTestId("simulator")).toHaveCount(0);
  await expect(page.getByTestId("sim-missing")).toBeVisible();
  await expect(page.getByTestId("block-observaciones")).toBeVisible();
});
