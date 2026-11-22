// Miniaturas REALES de la interfaz de la demo para «Cómo funciona» (D-33). Requiere `npm run build` previo.
// Levanta scripts/serve-static.mjs en un puerto local, captura 4 fragmentos de /demo?case=laguna-pozuelos con el
// Chrome instalado (vía @playwright/test, ya devDependency) y los guarda como WebP en public/landing/steps/.
// Regenerar si cambia la interfaz de la demo:  npm run build && node scripts/brand/capture-step-thumbnails.mjs && npm run build
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const OUT = join(ROOT, "public", "landing", "steps");
const PORT = 4190;
mkdirSync(OUT, { recursive: true });

const server = spawn(process.execPath, [join(ROOT, "scripts", "serve-static.mjs"), String(PORT)], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
for (let i = 0; i < 40; i++) {
  try { if ((await fetch(`http://127.0.0.1:${PORT}/`)).ok) break; } catch {}
  await sleep(250);
}

const browser = await chromium.launch({ channel: "chrome" });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => r.abort());
  await page.goto(`http://127.0.0.1:${PORT}/demo?case=laguna-pozuelos`);
  await page.getByTestId("results").waitFor();
  await page.waitForTimeout(800);

  const shots = [
    { step: "1", locator: page.getByRole("navigation", { name: "Cuencas y fuentes de agua" }),
      alt: "Captura de la demo: lista de casos testigo con Laguna de los Pozuelos seleccionada y su cambio estimado." },
    { step: "2", locator: page.getByRole("group", { name: "Fecha a mostrar en el mapa" }).locator(".."),
      alt: "Captura de la demo: botones Antes, Después y Comparar con la superficie visible estimada de cada fecha." },
    { step: "3", locator: page.getByTestId("rain-card").first(),
      alt: "Captura de la demo: precipitación del mes previo a la imagen, con su referencia 1995–2024, anomalía y percentil." },
    { step: "4", locator: page.getByTestId("difference"),
      alt: "Captura de la demo: cambio estimado con su rango entre métodos y la advertencia de alta sensibilidad al método." },
  ];
  const files = [];
  for (const s of shots) {
    const png = await s.locator.screenshot();
    const conv = await page.evaluate(async (b64) => {
      const img = new Image();
      img.src = `data:image/png;base64,${b64}`;
      await img.decode();
      const w = Math.min(img.naturalWidth, 760);
      const h = Math.round((img.naturalHeight * w) / img.naturalWidth);
      const c = document.createElement("canvas");
      c.width = w; c.height = h;
      c.getContext("2d").drawImage(img, 0, 0, w, h);
      return { url: c.toDataURL("image/webp", 0.85), w, h };
    }, png.toString("base64"));
    const name = `step-${s.step}.webp`;
    writeFileSync(join(OUT, name), Buffer.from(conv.url.split(",")[1], "base64"));
    files.push({ step: s.step, src: `/landing/steps/${name}`, width: conv.w, height: conv.h, alt: s.alt });
  }
  writeFileSync(join(OUT, "manifest.json"), JSON.stringify({ note: "Capturas reales de /demo?case=laguna-pozuelos (scripts/brand/capture-step-thumbnails.mjs).", files }, null, 2));
  console.log("[steps]", files.map((f) => `${f.src} ${f.width}x${f.height}`).join(" | "));
} finally {
  await browser.close();
  server.kill();
}
