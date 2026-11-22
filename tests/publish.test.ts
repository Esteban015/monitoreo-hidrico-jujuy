// Publicación de datos: única fuente de verdad, sin cachés ni crudos, compatible con exportación estática y offline.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";

const ROOT = new URL("../", import.meta.url);
const sha = (u: URL) => createHash("sha256").update(readFileSync(u)).digest("hex");
const manifest = JSON.parse(readFileSync(new URL("public/data/manifest.json", ROOT), "utf-8"));

test("cada archivo publicado es copia idéntica de data/derived (no hay dos fuentes de verdad)", () => {
  assert.ok(manifest.files.length >= 14);
  for (const f of manifest.files) {
    const pub = new URL(`public/data/${f.path}`, ROOT);
    const src = new URL(f.source, ROOT);
    assert.equal(sha(pub), f.sha256, f.path);
    assert.equal(sha(src), f.sha256, `${f.path} difiere de su fuente: ejecutar npm run data:publish`);
  }
});

test("no se publican cachés, datos crudos ni reportes internos", () => {
  for (const f of manifest.files) {
    assert.ok(!/cache|raw|exploration|\.npz|http_log|geometries_report/.test(f.path), f.path);
  }
});

test("geometrías referenciadas por los JSON existen localmente (offline)", () => {
  const cases = JSON.parse(readFileSync(new URL("public/data/cases.json", ROOT), "utf-8"));
  const water = JSON.parse(readFileSync(new URL("public/data/water_metrics.json", ROOT), "utf-8"));
  const refs = [
    ...cases.cases.flatMap((c: { aoi: { file: string }; basin: { file: string } }) => [c.aoi.file, c.basin.file]),
    ...water.scenes.flatMap((s: { files: { water_geojson: string; quicklook: string } }) => [s.files.water_geojson, s.files.quicklook]),
  ];
  for (const r of refs) assert.ok(existsSync(new URL(`public/data/${r}`, ROOT)), r);
});

const OUT = new URL("out/", ROOT);
test("exportación estática incluye datos y no referencia APIs de datos externas", { skip: !existsSync(OUT) && "sin build (out/)" }, () => {
  for (const f of manifest.files) assert.ok(existsSync(new URL(`data/${f.path}`, OUT)), `out/data/${f.path}`);
  const chunks = new URL("_next/static/chunks/", OUT);
  const js = readdirSync(chunks).filter((n) => n.endsWith(".js")).map((n) => readFileSync(new URL(n, chunks), "utf-8")).join("\n");
  for (const host of ["planetarycomputer", "data.chc.ucsb.edu", "hydrosheds", "overpass-api"]) {
    assert.ok(!js.includes(host), `el bundle referencia ${host}`);
  }
});
