// Se ejecuta en los proyectos desktop (1440×900), tablet (768×1024), movil (390×844) y movil-chico (360×800).
import { expect, modeButton, openApp, selectCase, test } from "./fixtures";
import { NOTICES } from "../src/lib/notices";

test("13. responsive: sin desborde horizontal, leyenda según ancho, controles táctiles y advertencias accesibles", async ({ page, guard }, info) => {
  const width = page.viewportSize()!.width;
  const touch = !!info.project.use.hasTouch;
  await openApp(page);
  const tapOrClick = async (loc: ReturnType<typeof page.locator>) => (touch ? loc.tap() : loc.click());

  await tapOrClick(page.locator("[data-case=laguna-pozuelos]"));
  await expect(page.getByTestId("results")).toBeVisible();
  await expect(page.getByTestId("map")).toHaveAttribute("data-geo", "listo");

  // leyenda: cargada DIRECTAMENTE con este ancho
  const legend = page.getByTestId("legend");
  if (width < 768) await expect(legend).not.toHaveAttribute("open", "");
  else await expect(legend).toHaveAttribute("open", "");

  // controles táctiles del comparador
  await tapOrClick(modeButton(page, "Antes"));
  await expect(modeButton(page, "Antes")).toHaveAttribute("aria-pressed", "true");
  await tapOrClick(modeButton(page, "Comparar"));

  // tarjetas legibles (dentro del viewport en ancho y con tamaño de texto razonable)
  for (const id of ["card-Antes", "card-Después"]) {
    const box = (await page.getByTestId(id).boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(width + 1);
    const fs = await page.getByTestId(id).locator("p").first().evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
    expect(fs).toBeGreaterThanOrEqual(16);
  }
  // advertencias accesibles
  const w = page.getByTestId("warnings");
  await w.scrollIntoViewIfNeeded();
  await expect(w).toBeInViewport();
  await expect(w).toContainText(NOTICES.surface);

  // botones con área táctil mínima razonable (>= 32 px de alto)
  for (const b of await page.getByRole("group", { name: "Fecha a mostrar en el mapa" }).getByRole("button").all()) {
    expect((await b.boundingBox())!.height).toBeGreaterThanOrEqual(32);
  }

  // sin desplazamiento horizontal
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);

  // cambiar de caso también funciona
  await selectCase(page, "dique-las-maderas");
  expect(guard.external).toEqual([]);
});
