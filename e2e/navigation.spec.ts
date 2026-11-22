// Navegación, rutas y enlace directo a casos (Incrementos B y F). Proyecto "smoke" (escritorio).
import { fmtPct, getCaseView } from "../src/lib/metrics";
import { expect, loadBundle, test } from "./fixtures";

const bundle = loadBundle();
const pct = (id: string) => fmtPct(getCaseView(bundle, id)!.comparison!.MNDWI.pct_change);

test("landing → demo → inicio, con historial del navegador", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("banner").getByRole("link", { name: "Ver demo" }).click();
  await expect(page).toHaveURL(/\/demo$/);
  await expect(page.locator("[data-case]")).toHaveCount(2);
  await page.getByRole("banner").getByRole("link", { name: "Inicio", exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.goBack();
  await expect(page).toHaveURL(/\/demo$/);
  await expect(page.locator("[data-case]")).toHaveCount(2);
  await page.goForward();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Ver cómo cambia el agua de Jujuy");
});

for (const path of ["/demo", "/demo/"]) {
  test(`${path}: carga datos y «Inicio» vuelve a la raíz (sin quedar en /demo/)`, async ({ page }) => {
    await page.goto(path);
    await expect(page.locator("[data-case]")).toHaveCount(2);
    await expect(page.getByTestId("map")).toHaveAttribute("data-basemap-status", "listo");
    await page.reload();
    await expect(page.locator("[data-case]")).toHaveCount(2);
    await page.getByRole("banner").getByRole("link", { name: "Inicio", exact: true }).click();
    await expect(page).toHaveURL(/127\.0\.0\.1:\d+\/$/);
  });
}

test("enlaces de secciones absolutos desde el encabezado", async ({ page }) => {
  await page.goto("/");
  for (const [name, id] of [["Problema", "problema"], ["Cómo funciona", "como-funciona"], ["Casos testigo", "casos"], ["Metodología", "metodologia"]]) {
    const link = page.getByRole("banner").getByRole("link", { name, exact: true });
    await expect(link).toHaveAttribute("href", `/#${id}`);
    await link.click();
    await expect(page).toHaveURL(new RegExp(`/#${id}$`));
    await expect(page.locator(`#${id}`)).toBeInViewport();
  }
});

for (const id of ["laguna-pozuelos", "dique-las-maderas"]) {
  test(`CTA del caso ${id} abre la demo con ese caso seleccionado`, async ({ page }) => {
    await page.goto("/#casos");
    await page.getByTestId(`landing-cta-${id}`).click();
    await expect(page).toHaveURL(new RegExp(`/demo\\?case=${id}$`));
    await expect(page.locator(`[data-case=${id}]`)).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByTestId("pct-main")).toHaveText(pct(id));
    await page.reload(); // la recarga conserva la selección
    await expect(page.locator(`[data-case=${id}]`)).toHaveAttribute("aria-pressed", "true");
  });
}

test("parámetro inválido: caso predeterminado sin errores; sin parámetro: sin selección", async ({ page }) => {
  await page.goto("/demo?case=no-existe");
  await expect(page.locator("[data-case=laguna-pozuelos]")).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("alert")).toHaveCount(1); // solo el anunciador de rutas de Next (vacío)
  await page.goto("/demo");
  await expect(page.locator("[data-case]")).toHaveCount(2);
  await expect(page.locator('[data-case][aria-pressed="true"]')).toHaveCount(0);
});

test("cambiar de caso manualmente actualiza la URL compartible", async ({ page }) => {
  await page.goto("/demo?case=laguna-pozuelos");
  await page.locator("[data-case=dique-las-maderas]").click();
  await expect(page).toHaveURL(/\/demo\?case=dique-las-maderas$/);
  await expect(page.getByTestId("pct-main")).toHaveText(pct("dique-las-maderas"));
});
