// Publica en public/data/ los archivos de data/derived/ que necesita el frontend (DECISIONS.md D-20).
// - Única fuente de verdad: data/derived/. public/data/ es un artefacto generado (ignorado por git) y se
//   reconstruye completo en cada ejecución (se ejecuta automáticamente antes de `npm run dev` y `npm run build`).
// - Copia byte a byte (no altera métricas) y registra procedencia y sha256 en public/data/manifest.json.
// - No publica cachés, datos crudos, scripts ni reportes internos de QA (solo los quicklooks de control).
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(ROOT, "data", "derived");
const DST = join(ROOT, "public", "data");

const INCLUDE = [
  "cases.json",
  "water_metrics.json",
  "rainfall_metrics.json",
  ...listDir("geometries", (f) => f.endsWith(".geojson")),
  ...listDir(join("qa", "quicklooks"), (f) => f.endsWith(".png")),
  ...listDir("basemap", (f) => f.endsWith(".geojson")), // límites IGN simplificados (D-22)
];

function listDir(sub, filter) {
  const d = join(SRC, sub);
  if (!existsSync(d)) return [];
  return readdirSync(d).filter(filter).sort().map((f) => join(sub, f));
}

function sha256(p) {
  return createHash("sha256").update(readFileSync(p)).digest("hex");
}

if (!existsSync(join(SRC, "cases.json"))) {
  console.error(`[publish-data] Falta ${relative(ROOT, SRC)}/cases.json. Ejecutar antes scripts/process/ (Fase 3).`);
  process.exit(1);
}

// public/data es propiedad exclusiva de este script: se regenera completo.
rmSync(DST, { recursive: true, force: true });
const files = [];
for (const rel of INCLUDE) {
  const from = join(SRC, rel);
  const to = join(DST, rel);
  mkdirSync(dirname(to), { recursive: true });
  copyFileSync(from, to);
  const h = sha256(from);
  if (h !== sha256(to)) throw new Error(`Copia alterada: ${rel}`);
  files.push({ path: rel.replaceAll("\\", "/"), source: `data/derived/${rel.replaceAll("\\", "/")}`, bytes: statSync(to).size, sha256: h });
}
writeFileSync(
  join(DST, "manifest.json"),
  JSON.stringify(
    {
      note: "Artefacto generado por scripts/publish-data.mjs a partir de data/derived/ (única fuente de verdad). No editar.",
      source_dir: "data/derived",
      files,
    },
    null,
    2,
  ),
);
const total = files.reduce((s, f) => s + f.bytes, 0);
console.log(`[publish-data] ${files.length} archivos publicados en public/data (${(total / 1024).toFixed(0)} KB)`);
