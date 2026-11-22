// Backend de solo lectura + servidor del frontend estático.
//
// - Sirve `out/` (exportación de Next.js) en la raíz.
// - Expone /api/* sobre los mismos JSON de `data/derived/` (sin base de datos).
// - Sin dependencias: sólo módulos nativos de Node >= 20.
//
// Uso:  node server/index.js
// Env:  PORT (default 3000), HOST (default 0.0.0.0), STATIC_DIR (default out)
import { createReadStream, existsSync, readFileSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const STATIC_DIR = resolve(ROOT, process.env.STATIC_DIR ?? "out");
const DATA_DIR = resolve(ROOT, process.env.DATA_DIR ?? "data/derived");
const PORT = Number(process.env.PORT ?? 3000);
const HOST = process.env.HOST ?? "0.0.0.0";
const STARTED_AT = Date.now();
const VERSION = "1.0.0";

const DATA_FILES = {
  cases: "cases.json",
  water: "water_metrics.json",
  rainfall: "rainfall_metrics.json",
};

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".geojson": "application/geo+json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

// ---------------------------------------------------------------- datasets
const cache = new Map();

/** Lee un JSON de data/derived y lo cachea hasta que cambie el mtime. */
function readData(file) {
  const path = join(DATA_DIR, file);
  if (!existsSync(path)) throw new Error(`Falta el dataset ${file}`);
  const { mtimeMs } = statSync(path);
  const hit = cache.get(file);
  if (hit && hit.mtimeMs === mtimeMs) return hit.value;
  const value = JSON.parse(readFileSync(path, "utf8"));
  cache.set(file, { mtimeMs, value });
  return value;
}

function loadBundle() {
  return {
    cases: readData(DATA_FILES.cases),
    water: readData(DATA_FILES.water),
    rainfall: readData(DATA_FILES.rainfall),
  };
}

function datasetStatus() {
  const out = {};
  for (const [key, file] of Object.entries(DATA_FILES)) {
    const path = join(DATA_DIR, file);
    try {
      const s = statSync(path);
      out[key] = { file, bytes: s.size, modified: new Date(s.mtimeMs).toISOString(), ok: true };
    } catch {
      out[key] = { file, ok: false };
    }
  }
  return out;
}

// ---------------------------------------------------------------- helpers
function sceneSummary(s) {
  if (!s) return null;
  return {
    date: s.date,
    scene_id: s.scene_id,
    source: s.source,
    mgrs_tile: s.mgrs_tile,
    cloud_cover_scene_pct: s.cloud_cover_scene_pct,
    cloud_effective_pct: s.cloud_effective_pct,
    coverage_pct: s.coverage_pct,
    status: s.status,
    water_area_km2: s.water?.area_km2 ?? null,
    stac_item: s.stac_item,
  };
}

function comparisonSummary(c) {
  if (!c) return null;
  return {
    date_a: c.date_a,
    date_b: c.date_b,
    area_a_km2: c.MNDWI.area_a_km2,
    area_b_km2: c.MNDWI.area_b_km2,
    abs_diff_km2: c.MNDWI.abs_diff_km2,
    pct_change: c.MNDWI.pct_change,
    unit: c.unit,
    kind: c.kind,
    status: c.status,
    formula: c.MNDWI.formula,
    common_valid_pct_of_region: c.common_valid_pct_of_region,
  };
}

function caseSummary(bundle, c) {
  const cmp = bundle.water.comparisons.find((x) => x.case_id === c.case_id);
  const rain = bundle.rainfall.observations.filter((o) => o.case_id === c.case_id);
  return {
    case_id: c.case_id,
    name: c.name,
    ecoregion: c.ecoregion,
    kind: c.kind,
    basin_area_km2: c.basin.area_km2,
    basin_source: c.basin.source,
    comparison: comparisonSummary(cmp),
    precipitation: rain.map((o) => ({
      image_date: o.image_date,
      month: o.month,
      value_mm: o.value_mm,
      anomaly_pct: o.anomaly_pct,
      percentile_in_reference: o.percentile_in_reference,
      reference_mean_mm: o.reference?.mean_mm ?? null,
    })),
  };
}

function sendJson(res, status, payload, extraHeaders = {}) {
  const body = JSON.stringify(payload, null, 2);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
    "Cache-Control": "no-store",
    ...extraHeaders,
  });
  res.end(body);
}

function notFound(res, message) {
  sendJson(res, 404, { error: "no_encontrado", message });
}

// ---------------------------------------------------------------- API
function handleApi(req, res, url) {
  const parts = url.pathname.split("/").filter(Boolean); // ["api", ...]
  const route = parts.slice(1);

  try {
    if (route.length === 0) {
      return sendJson(res, 200, {
        service: "monitoreo-cuencas-jujuy",
        version: VERSION,
        endpoints: [
          "GET /api/health",
          "GET /api/meta",
          "GET /api/casos",
          "GET /api/casos/{id}",
          "GET /api/casos/{id}/comparacion",
          "GET /api/casos/{id}/precipitacion",
          "GET /api/casos/{id}/geometrias",
          "GET /api/fuentes",
          "GET /api/openapi.json",
        ],
      });
    }

    if (route[0] === "health") {
      const datasets = datasetStatus();
      const ok = Object.values(datasets).every((d) => d.ok);
      return sendJson(res, ok ? 200 : 503, {
        status: ok ? "ok" : "degradado",
        service: "monitoreo-cuencas-jujuy",
        version: VERSION,
        uptime_s: Math.round((Date.now() - STARTED_AT) / 1000),
        timestamp: new Date().toISOString(),
        datasets,
      });
    }

    if (route[0] === "openapi.json") {
      const spec = JSON.parse(readFileSync(join(ROOT, "server", "openapi.json"), "utf8"));
      return sendJson(res, 200, spec);
    }

    const bundle = loadBundle();

    if (route[0] === "meta") {
      return sendJson(res, 200, {
        generated_at: {
          cases: bundle.cases.generated_at,
          water: bundle.water.generated_at,
          rainfall: bundle.rainfall.generated_at,
        },
        method: bundle.water.method,
        rainfall: {
          source: bundle.rainfall.source,
          unit: bundle.rainfall.unit,
          resolution_deg: bundle.rainfall.resolution_deg,
          status: bundle.rainfall.status,
        },
        limitations: [
          "Mide superficie visible de agua; no representa volumen almacenado ni caudal.",
          "La superficie se estima por umbral de MNDWI/NDWI; no es una medición exacta.",
          "La precipitación es un producto estimado (CHIRPS), no una medición de pluviómetro.",
          "Las cuencas son modeladas (HydroBASINS) y no constituyen delimitación oficial.",
          "Cada caso tiene dos fechas reales; no se interpolan fechas intermedias.",
        ],
      });
    }

    if (route[0] === "fuentes") {
      return sendJson(res, 200, {
        sentinel2: {
          product: "Sentinel-2 L2A",
          provider: "Copernicus / Microsoft Planetary Computer STAC",
          license: "Datos abiertos Copernicus (atribución)",
          use: "Estimación de superficie de agua visible (MNDWI/NDWI)",
        },
        chirps: {
          product: "CHIRPS v3.0 mensual",
          provider: "Climate Hazards Center, UCSB",
          license: "Ver condiciones del producto (citar Funk et al.)",
          use: "Precipitación mensual estimada en la cuenca",
        },
        hydrobasins: {
          product: "HydroBASINS v1c nivel 10",
          provider: "HydroSHEDS / WWF",
          license: "Libre con atribución (Lehner & Grill 2013)",
          use: "Cuenca de aporte modelada",
        },
        osm: {
          product: "OpenStreetMap",
          provider: "Colaboradores de OpenStreetMap",
          license: "ODbL 1.0",
          use: "Contorno cartográfico de referencia del cuerpo de agua",
        },
        ign: {
          product: "IGN Argentina",
          provider: "Instituto Geográfico Nacional",
          license: "Ver condiciones del IGN",
          use: "Mapa base provincial local (departamentos)",
        },
      });
    }

    if (route[0] !== "casos") return notFound(res, `Ruta de API desconocida: ${url.pathname}`);

    if (route.length === 1) {
      return sendJson(res, 200, {
        generated_at: bundle.cases.generated_at,
        count: bundle.cases.cases.length,
        cases: bundle.cases.cases.map((c) => caseSummary(bundle, c)),
      });
    }

    const id = decodeURIComponent(route[1]);
    const c = bundle.cases.cases.find((x) => x.case_id === id);
    if (!c) return notFound(res, `No existe el caso «${id}»`);

    if (route.length === 2) {
      const scenes = bundle.water.scenes.filter((s) => s.case_id === id);
      const cmp = bundle.water.comparisons.find((x) => x.case_id === id);
      return sendJson(res, 200, {
        ...c,
        comparison: comparisonSummary(cmp),
        scenes: scenes.map(sceneSummary),
        precipitation: bundle.rainfall.observations.filter((o) => o.case_id === id),
        warnings: Array.from(
          new Set([
            ...(c.warnings ?? []),
            ...(cmp?.warnings ?? []),
            ...scenes.flatMap((s) => s.warnings ?? []),
          ]),
        ),
      });
    }

    if (route.length === 3 && route[2] === "comparacion") {
      const cmp = bundle.water.comparisons.find((x) => x.case_id === id);
      if (!cmp) return notFound(res, `El caso «${id}» no tiene comparación publicada`);
      return sendJson(res, 200, {
        case_id: id,
        ...cmp,
        uncertainty: {
          ndwi_pct_change: cmp.NDWI?.pct_change ?? null,
          mndwi_thresholds: cmp.MNDWI_sensitivity ?? [],
        },
      });
    }

    if (route.length === 3 && route[2] === "precipitacion") {
      return sendJson(res, 200, {
        case_id: id,
        source: bundle.rainfall.source,
        unit: bundle.rainfall.unit,
        observations: bundle.rainfall.observations.filter((o) => o.case_id === id),
      });
    }

    if (route.length === 3 && route[2] === "geometrias") {
      const files = {
        basin: c.basin.file,
        aoi: c.aoi.file,
        water: bundle.water.scenes
          .filter((s) => s.case_id === id)
          .map((s) => ({ date: s.date, file: s.files.water_geojson, url: `data/${s.files.water_geojson}` })),
      };
      return sendJson(res, 200, {
        case_id: id,
        basin: { ...c.basin, url: `data/${c.basin.file}` },
        aoi: { ...c.aoi, url: `data/${c.aoi.file}` },
        water: files.water,
        note: "GeoJSON estáticos publicados en data/. No se recalculan en el servidor.",
      });
    }

    return notFound(res, `Ruta de API desconocida: ${url.pathname}`);
  } catch (err) {
    return sendJson(res, 503, {
      error: "datos_no_disponibles",
      message: err instanceof Error ? err.message : "Error al leer los datasets",
    });
  }
}

// ---------------------------------------------------------------- static
function serveStatic(req, res, url) {
  let pathname;
  try {
    pathname = decodeURIComponent(url.pathname);
  } catch {
    res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" }).end("Solicitud inválida");
    return;
  }

  let file = normalize(join(STATIC_DIR, pathname));
  if (file !== STATIC_DIR && !file.startsWith(STATIC_DIR + sep)) {
    res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" }).end("Prohibido");
    return;
  }
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, "index.html");
  if (!existsSync(file) && existsSync(`${file}.html`)) file = `${file}.html`;

  if (!existsSync(file)) {
    const notFoundPage = join(STATIC_DIR, "404.html");
    res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
    if (existsSync(notFoundPage)) createReadStream(notFoundPage).pipe(res);
    else res.end("No encontrado");
    return;
  }

  const ext = extname(file).toLowerCase();
  const immutable = pathname.startsWith("/_next/static/");
  res.writeHead(200, {
    "Content-Type": MIME[ext] ?? "application/octet-stream",
    "Content-Length": statSync(file).size,
    "Cache-Control": immutable ? "public, max-age=31536000, immutable" : "no-cache",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
  });
  if (req.method === "HEAD") return res.end();
  createReadStream(file).pipe(res);
}

// ---------------------------------------------------------------- server
if (!existsSync(join(STATIC_DIR, "index.html"))) {
  console.error(`[server] No existe ${join(STATIC_DIR, "index.html")}. Ejecutá primero: npm run build`);
  process.exit(1);
}

const server = createServer((req, res) => {
  const started = Date.now();
  let url;
  try {
    url = new URL(req.url ?? "/", "http://localhost");
  } catch {
    res.writeHead(400).end("Solicitud inválida");
    return;
  }

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");

  if (req.method === "OPTIONS") {
    res.writeHead(204).end();
    return;
  }
  if (req.method !== "GET" && req.method !== "HEAD") {
    sendJson(res, 405, { error: "metodo_no_permitido", message: "Sólo se admite GET/HEAD" }, { Allow: "GET, HEAD, OPTIONS" });
    return;
  }

  if (url.pathname === "/api" || url.pathname.startsWith("/api/")) {
    handleApi(req, res, url);
  } else {
    serveStatic(req, res, url);
  }

  if (process.env.LOG_REQUESTS !== "0") {
    console.log(`${req.method} ${url.pathname} ${res.statusCode} ${Date.now() - started}ms`);
  }
});

server.listen(PORT, HOST, () => {
  console.log(`[server] Monitoreo de Cuencas Jujuy v${VERSION}`);
  console.log(`[server] Frontend: http://${HOST}:${PORT}/  (${STATIC_DIR})`);
  console.log(`[server] API:      http://${HOST}:${PORT}/api/health`);
});

function shutdown(signal) {
  console.log(`[server] ${signal}: cerrando…`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 5000).unref();
}
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
