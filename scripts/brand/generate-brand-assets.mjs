// Genera recursos de identidad y las imágenes optimizadas de la landing (D-27). Reproducible y sin dependencias nuevas:
// usa el Chrome instalado vía @playwright/test (ya es devDependency) para rasterizar SVG/HTML y reescalar PNG reales.
//
// Uso: node scripts/brand/generate-brand-assets.mjs
// Salidas (versionadas):
//   src/app/icon.svg, src/app/favicon.ico (16/32/48), src/app/apple-icon.png (180)
//   src/app/opengraph-image.png + .alt.txt, src/app/twitter-image.png + .alt.txt (1200×630)
//   public/brand/icon-512.png
//   public/landing/quicklooks/<caso>_<fecha>.webp  (quicklooks Sentinel-2 REALES de data/derived, solo redimensionados)
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const C = { primary: "#0F4C5C", support: "#61A5A2", sand: "#D9C7A3", bg: "#F5F7F8", ink: "#1F2D3A", white: "#FFFFFF" };

// Isotipo completo (misma geometría que src/components/brand/Logo.tsx).
const FULL_MARK = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40">
  <rect x="1" y="1" width="38" height="38" rx="10" fill="${C.primary}"/>
  <path d="M8 24c4-3.2 8-3.2 12 0s8 3.2 12 0" fill="none" stroke="${C.white}" stroke-width="2.6" stroke-linecap="round"/>
  <path d="M8 30c4-3.2 8-3.2 12 0s8 3.2 12 0" fill="none" stroke="${C.support}" stroke-width="2.6" stroke-linecap="round"/>
  <path d="M20 8c-3.6 4.4-5.4 7.4-5.4 9.6a5.4 5.4 0 0 0 10.8 0C25.4 15.4 23.6 12.4 20 8z" fill="${C.sand}"/>
</svg>`;

// Versión simplificada para 16/32 px: misma idea (gota arena + onda), sin la segunda onda, trazos más gruesos.
const SMALL_MARK = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="7" fill="${C.primary}"/>
  <path d="M16 4.5c-3.4 4.1-5.1 6.9-5.1 9a5.1 5.1 0 0 0 10.2 0c0-2.1-1.7-4.9-5.1-9z" fill="${C.sand}"/>
  <path d="M5 23.5c3.7-3 7.3-3 11 0s7.3 3 11 0" fill="none" stroke="${C.support}" stroke-width="3.4" stroke-linecap="round"/>
</svg>`;

const out = (p) => { const f = join(ROOT, p); mkdirSync(dirname(f), { recursive: true }); return f; };

async function svgToPng(page, svg, size, { pad = 0, bg = "transparent" } = {}) {
  await page.setViewportSize({ width: size, height: size });
  const inner = size - pad * 2;
  await page.setContent(`<html><body style="margin:0;background:${bg};width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center">
    <div style="width:${inner}px;height:${inner}px">${svg.replace("<svg ", `<svg width="${inner}" height="${inner}" `)}</div></body></html>`);
  return page.screenshot({ omitBackground: bg === "transparent", clip: { x: 0, y: 0, width: size, height: size } });
}

// ICO con imágenes PNG embebidas (formato soportado por todos los navegadores modernos).
function buildIco(pngs) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(pngs.length, 4);
  const dir = Buffer.alloc(16 * pngs.length);
  let offset = 6 + dir.length;
  pngs.forEach(({ size, data }, i) => {
    const o = i * 16;
    dir.writeUInt8(size >= 256 ? 0 : size, o); dir.writeUInt8(size >= 256 ? 0 : size, o + 1);
    dir.writeUInt8(0, o + 2); dir.writeUInt8(0, o + 3); dir.writeUInt16LE(1, o + 4); dir.writeUInt16LE(32, o + 6);
    dir.writeUInt32LE(data.length, o + 8); dir.writeUInt32LE(offset, o + 12);
    offset += data.length;
  });
  return Buffer.concat([header, dir, ...pngs.map((p) => p.data)]);
}

const water = JSON.parse(readFileSync(join(ROOT, "data", "derived", "water_metrics.json"), "utf-8"));
const fmtDate = (iso) => iso.split("-").reverse().join("/");

const browser = await chromium.launch({ channel: "chrome" });
const page = await browser.newPage({ deviceScaleFactor: 1 });

// 1) Íconos
writeFileSync(out("src/app/icon.svg"), SMALL_MARK);
const icoPngs = [];
for (const size of [16, 32, 48]) icoPngs.push({ size, data: await svgToPng(page, SMALL_MARK, size) });
writeFileSync(out("src/app/favicon.ico"), buildIco(icoPngs));
writeFileSync(out("src/app/apple-icon.png"), await svgToPng(page, FULL_MARK, 180, { pad: 0, bg: C.primary }));
writeFileSync(out("public/brand/icon-512.png"), await svgToPng(page, FULL_MARK, 512));

// 2) Quicklooks reales -> WebP liviano (solo redimensionado, sin alterar contenido)
async function toWebp(srcPng, width) {
  const b64 = readFileSync(srcPng).toString("base64");
  return page.evaluate(async ({ b64, width }) => {
    const img = new Image();
    img.src = `data:image/png;base64,${b64}`;
    await img.decode();
    const h = Math.round((img.naturalHeight * width) / img.naturalWidth);
    const c = document.createElement("canvas");
    c.width = width; c.height = h;
    const ctx = c.getContext("2d");
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, width, h);
    return { dataUrl: c.toDataURL("image/webp", 0.82), w: width, h, ow: img.naturalWidth, oh: img.naturalHeight };
  }, { b64, width });
}
const quicklookMeta = [];
for (const s of water.scenes) {
  const src = join(ROOT, "data", "derived", s.files.quicklook);
  const r = await toWebp(src, 640);
  const name = `${s.case_id}_${s.date}.webp`;
  writeFileSync(out(`public/landing/quicklooks/${name}`), Buffer.from(r.dataUrl.split(",")[1], "base64"));
  quicklookMeta.push({ file: name, scene_id: s.scene_id, source: `data/derived/${s.files.quicklook}`, width: r.w, height: r.h, original: [r.ow, r.oh] });
}
writeFileSync(out("public/landing/quicklooks/manifest.json"), JSON.stringify({
  note: "Quicklooks Sentinel-2 reales (falso color B11/B08/B03) redimensionados a 640 px de ancho para la landing. Generado por scripts/brand/generate-brand-assets.mjs.",
  files: quicklookMeta }, null, 2));

// 3) Open Graph / Twitter 1200×630 (marca + imágenes auténticas con fecha; sin cifras para no desactualizarse)
const poz = water.scenes.filter((s) => s.case_id === "laguna-pozuelos").sort((a, b) => a.date.localeCompare(b.date));
const ql = (s) => `data:image/png;base64,${readFileSync(join(ROOT, "data", "derived", s.files.quicklook)).toString("base64")}`;
await page.setViewportSize({ width: 1200, height: 630 });
await page.setContent(`<html><body style="margin:0;width:1200px;height:630px;background:${C.primary};font-family:'Segoe UI',system-ui,Arial,sans-serif;color:#fff;display:flex;overflow:hidden">
  <div style="flex:1;padding:64px 56px;display:flex;flex-direction:column;justify-content:space-between">
    <div style="display:flex;align-items:center;gap:18px">
      <div style="width:72px;height:72px">${FULL_MARK.replace("<svg ", '<svg width="72" height="72" ').replace(`fill="${C.primary}"`, 'fill="#ffffff" fill-opacity="0.12"')}</div>
      <div style="font-size:34px;font-weight:600;letter-spacing:-0.5px">Monitoreo Hídrico Jujuy</div>
    </div>
    <div style="font-size:50px;line-height:1.12;font-weight:600;letter-spacing:-1px">Ver cómo cambia el agua de Jujuy, con datos que se pueden verificar.</div>
    <div style="display:flex;gap:10px;font-size:20px;color:rgba(255,255,255,.85)">
      <span style="background:rgba(255,255,255,.12);padding:6px 14px;border-radius:999px">Sentinel-2</span>
      <span style="background:rgba(255,255,255,.12);padding:6px 14px;border-radius:999px">CHIRPS</span>
      <span style="background:rgba(255,255,255,.12);padding:6px 14px;border-radius:999px">HydroBASINS</span>
      <span style="background:${C.sand};color:${C.primary};padding:6px 14px;border-radius:999px;font-weight:600">datos trazables</span>
    </div>
  </div>
  <div style="width:430px;padding:40px 40px 40px 0;display:flex;gap:12px;align-items:center">
    ${poz.map((s, i) => `<div style="flex:1;background:rgba(0,0,0,.2);border-radius:14px;overflow:hidden">
      <img src="${ql(s)}" style="display:block;width:100%;height:auto"/>
      <div style="font-size:16px;padding:8px 10px;color:rgba(255,255,255,.9)">${i === 0 ? "Antes" : "Después"} · ${fmtDate(s.date)}</div></div>`).join("")}
  </div></body></html>`);
await page.waitForTimeout(200);
const og = await page.screenshot({ clip: { x: 0, y: 0, width: 1200, height: 630 } });
const alt = `Monitoreo Hídrico Jujuy: Laguna de los Pozuelos en dos imágenes Sentinel-2 reales (${poz.map((s) => fmtDate(s.date)).join(" y ")}).`;
for (const n of ["opengraph-image", "twitter-image"]) {
  writeFileSync(out(`src/app/${n}.png`), og);
  writeFileSync(out(`src/app/${n}.alt.txt`), alt);
}

await browser.close();
console.log("[brand] íconos, OG/Twitter y", quicklookMeta.length, "quicklooks WebP generados");
