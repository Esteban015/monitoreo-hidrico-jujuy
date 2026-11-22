// Recursos de identidad, metadatos sociales e imágenes (Incrementos A, H). Proyecto "smoke".
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "./fixtures";

const ICONS: [string, RegExp][] = [
  ["/favicon.ico", /image\/(x-icon|vnd\.microsoft\.icon)/],
  ["/icon.svg", /image\/svg\+xml/],
  ["/apple-icon.png", /image\/png/],
  ["/opengraph-image.png", /image\/png/],
  ["/twitter-image.png", /image\/png/],
  ["/brand/icon-512.png", /image\/png/],
];

test("íconos e imágenes sociales: HTTP 200 y MIME correcto", async ({ request }) => {
  for (const [path, mime] of ICONS) {
    const r = await request.get(path);
    expect(r.status(), path).toBe(200);
    expect(r.headers()["content-type"], path).toMatch(mime);
  }
});

test("dimensiones: apple 180×180, OG 1200×630, ícono 512, favicon 16/32/48", async ({ request }) => {
  const png = async (p: string) => {
    const b = Buffer.from(await (await request.get(p)).body());
    return [b.readUInt32BE(16), b.readUInt32BE(20)];
  };
  expect(await png("/apple-icon.png")).toEqual([180, 180]);
  expect(await png("/opengraph-image.png")).toEqual([1200, 630]);
  expect(await png("/brand/icon-512.png")).toEqual([512, 512]);
  const ico = Buffer.from(await (await request.get("/favicon.ico")).body());
  const n = ico.readUInt16LE(4);
  expect([...Array(n)].map((_, i) => ico[6 + 16 * i])).toEqual([16, 32, 48]);
});

for (const path of ["/", "/demo"]) {
  test(`${path}: metadatos sin duplicados, Open Graph y Twitter completos`, async ({ page }) => {
    await page.goto(path);
    const count = (sel: string) => page.locator(`head ${sel}`).count();
    for (const p of ["og:title", "og:description", "og:url", "og:image", "og:type", "og:site_name", "og:locale"]) expect(await count(`meta[property="${p}"]`), p).toBe(1);
    for (const n of ["twitter:card", "twitter:title", "twitter:image", "description"]) expect(await count(`meta[name="${n}"]`), n).toBe(1);
    expect(await count('link[rel="canonical"]')).toBe(1);
    expect(await count('link[rel="apple-touch-icon"]')).toBe(1);
    expect(await count('link[rel="icon"]')).toBe(2); // ICO + SVG (intencional)
    await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute("content", "summary_large_image");
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", /^https:\/\/monitoreo-hidrico-jujuy\.vercel\.app\/opengraph-image\.png/);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", `https://monitoreo-hidrico-jujuy.vercel.app${path === "/" ? "" : path}`);
  });
}

test("imágenes de la landing: quicklooks y miniaturas reales disponibles, sin faltantes", async ({ page, request }) => {
  const bad: string[] = [];
  page.on("response", (r) => r.status() >= 400 && bad.push(`${r.status()} ${r.url()}`));
  await page.goto("/");
  for (const img of await page.locator("main img").all()) {
    await img.scrollIntoViewIfNeeded();
    await expect.poll(() => img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0)).toBe(true);
  }
  expect(bad).toEqual([]);
  // cada escena del dataset tiene su quicklook optimizado
  const water = JSON.parse(readFileSync(join(process.cwd(), "out", "data", "water_metrics.json"), "utf-8"));
  for (const s of water.scenes) expect((await request.get(`/landing/quicklooks/${s.case_id}_${s.date}.webp`)).status()).toBe(200);
});
