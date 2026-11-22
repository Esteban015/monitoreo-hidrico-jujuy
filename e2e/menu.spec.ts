// Menú móvil accesible (Incremento D). Proyectos móviles (390×844 y 375×667).
import { expect, test } from "./fixtures";

test("menú móvil: aria, foco, Escape, teclado y cierre al elegir sección", async ({ page }) => {
  await page.goto("/");
  const btn = page.getByRole("button", { name: "Abrir menú de secciones" });
  await expect(btn).toHaveAttribute("aria-expanded", "false");
  await expect(btn).toHaveAttribute("aria-controls", "menu-secciones");
  const box = (await btn.boundingBox())!;
  expect(box.width).toBeGreaterThanOrEqual(44);
  expect(box.height).toBeGreaterThanOrEqual(44);
  await expect(page.locator("#menu-secciones")).toBeHidden();
  // CTA «Ver demo» accesible sin abrir el menú
  await expect(page.getByRole("banner").getByRole("link", { name: "Ver demo" })).toBeVisible();

  // abrir con teclado: foco al primer enlace
  await btn.focus();
  await page.keyboard.press("Enter");
  const close = page.getByRole("button", { name: "Cerrar menú de secciones" });
  await expect(close).toHaveAttribute("aria-expanded", "true");
  const menu = page.locator("#menu-secciones");
  await expect(menu).toBeVisible();
  await expect(menu.getByRole("link", { name: "Problema" })).toBeFocused();
  // foco visible (estilo :focus-visible aplicado)
  const outline = await menu.getByRole("link", { name: "Problema" }).evaluate((el) => getComputedStyle(el).outlineStyle);
  expect(outline).not.toBe("none");
  await page.keyboard.press("Tab");
  await expect(menu.getByRole("link", { name: "Cómo funciona" })).toBeFocused();

  // Escape cierra y devuelve el foco al botón
  await page.keyboard.press("Escape");
  await expect(menu).toBeHidden();
  await expect(page.getByRole("button", { name: "Abrir menú de secciones" })).toBeFocused();

  // elegir una sección navega y cierra
  await page.getByRole("button", { name: "Abrir menú de secciones" }).tap();
  await menu.getByRole("link", { name: "Casos testigo" }).tap();
  await expect(menu).toBeHidden();
  await expect(page).toHaveURL(/\/#casos$/);
  await expect(page.locator("#casos")).toBeInViewport();

  // el panel queda por encima del contenido (no oculto detrás del hero)
  await page.evaluate(() => scrollTo(0, 0));
  await page.getByRole("button", { name: "Abrir menú de secciones" }).tap();
  const z = await menu.evaluate((el) => Number(getComputedStyle(el).zIndex));
  expect(z).toBeGreaterThanOrEqual(30);
  await expect(menu.getByRole("link", { name: "Metodología" })).toBeInViewport();
});

test("sin JavaScript: secciones accesibles desde el pie y CTA visible", async ({ browser }) => {
  const ctx = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  await page.goto("http://127.0.0.1:4173/");
  await expect(page.getByRole("banner").getByRole("link", { name: "Ver demo" })).toBeVisible();
  const footerNav = page.getByRole("navigation", { name: "Secciones (pie de página)" });
  for (const name of ["Problema", "Cómo funciona", "Casos testigo", "Metodología", "Demo"]) await expect(footerNav.getByRole("link", { name, exact: true })).toHaveCount(1);
  await ctx.close();
});
