// Capturas reproducibles para docs/evidence/fase5/ (proyectos desktop y movil). Externos bloqueados por el fixture.
import { mkdirSync } from "node:fs";
import { modeButton, openApp, selectCase, test } from "./fixtures";

const DIR = "docs/evidence/fase5";

test("evidencias visuales", async ({ page }, info) => {
  mkdirSync(DIR, { recursive: true });
  const tag = info.project.name;
  await openApp(page);
  await page.waitForTimeout(1000);
  await page.screenshot({ path: `${DIR}/01-${tag}-inicio.png`, animations: "disabled" });
  for (const id of ["laguna-pozuelos", "dique-las-maderas"]) {
    await selectCase(page, id);
    await modeButton(page, "Comparar").click();
    await page.waitForTimeout(2000); // fin de la animación de zoom de Leaflet
    await page.screenshot({ path: `${DIR}/02-${tag}-${id}-comparar.png`, animations: "disabled" });
  }
  if (tag === "desktop") {
    await selectCase(page, "laguna-pozuelos");
    await page.getByTestId("difference").screenshot({ path: `${DIR}/03-desktop-pozuelos-rango-incertidumbre.png` });
    await page.getByTestId("warnings").screenshot({ path: `${DIR}/04-desktop-advertencias-cientificas.png` });
    await page.getByTestId("rainfall").screenshot({ path: `${DIR}/06-desktop-precipitacion.png` });
  } else {
    await page.getByTestId("warnings").scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${DIR}/04-${tag}-advertencias.png` });
  }
});
