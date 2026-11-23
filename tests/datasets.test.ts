// Carga de datasets: errores, datos incompletos, datasets opcionales y rutas absolutas (sin red real).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { loadBundle, dataUrl, structuralProblems } from "../src/lib/datasets.ts";

const PUB = new URL("../public/data/", import.meta.url);
const real = (name: string) => JSON.parse(readFileSync(new URL(name, PUB), "utf-8"));

function fetcherFrom(map: Record<string, { status: number; body?: unknown; bad?: boolean }>) {
  return async (url: string) => {
    const r = map[url] ?? { status: 404 };
    return {
      ok: r.status >= 200 && r.status < 300,
      status: r.status,
      json: async () => {
        if (r.bad) throw new SyntaxError("Unexpected end of JSON input");
        return r.body;
      },
    };
  };
}

const okMap = () => ({
  "/data/cases.json": { status: 200, body: real("cases.json") },
  "/data/water_metrics.json": { status: 200, body: real("water_metrics.json") },
  "/data/rainfall_metrics.json": { status: 200, body: real("rainfall_metrics.json") },
  "/data/climate/climate_series.json": { status: 200, body: real("climate/climate_series.json") },
  "/data/model/water_model.json": { status: 200, body: real("model/water_model.json") },
});

test("carga los cinco datasets reales (3 observacionales + clima + modelo)", async () => {
  const r = await loadBundle(fetcherFrom(okMap()));
  assert.equal(r.status, "ok");
  if (r.status === "ok") {
    assert.equal(r.bundle.cases.cases.length, 2);
    assert.ok(r.bundle.climate && r.bundle.model);
    assert.deepEqual(r.bundle.notes, []);
  }
});

// D-34: clima y modelo son opcionales; la demo científica no depende de ellos.
test("sin modelo ni clima: la demo carga igual y lo informa", async () => {
  const m = okMap();
  delete (m as Record<string, unknown>)["/data/model/water_model.json"];
  delete (m as Record<string, unknown>)["/data/climate/climate_series.json"];
  const r = await loadBundle(fetcherFrom(m));
  assert.equal(r.status, "ok");
  if (r.status === "ok") {
    assert.equal(r.bundle.model, null);
    assert.equal(r.bundle.climate, null);
    assert.equal(r.bundle.notes?.length, 2);
  }
});

test("un modelo sin rótulo sintético se descarta (nunca se muestra como predicción)", async () => {
  const model = { ...real("model/water_model.json"), synthetic: false };
  const r = await loadBundle(fetcherFrom({ ...okMap(), "/data/model/water_model.json": { status: 200, body: model } }));
  assert.equal(r.status, "ok");
  if (r.status === "ok") {
    assert.equal(r.bundle.model, null);
    assert.ok(r.bundle.notes?.some((n) => n.includes("sintético")));
  }
});

test("clima con unidades inesperadas se descarta", async () => {
  const climate = { ...real("climate/climate_series.json"), unit: { precip_mm: "in/mes", temp_c: "°F" } };
  const r = await loadBundle(fetcherFrom({ ...okMap(), "/data/climate/climate_series.json": { status: 200, body: climate } }));
  assert.equal(r.status, "ok");
  if (r.status === "ok") assert.equal(r.bundle.climate, null);
});

test("rutas absolutas desde la raíz (válidas en /demo y /demo/); rechaza rutas peligrosas", () => {
  assert.equal(dataUrl("geometries/x.geojson"), "/data/geometries/x.geojson");
  assert.throws(() => dataUrl("/data/x.json"));
  assert.throws(() => dataUrl("../secret.json"));
  assert.throws(() => dataUrl("https://example.com/x.json"));
});

test("404 => error explícito", async () => {
  const m = okMap();
  delete (m as Record<string, unknown>)["/data/water_metrics.json"];
  const r = await loadBundle(fetcherFrom(m));
  assert.equal(r.status, "error");
  if (r.status === "error") assert.match(r.message, /water_metrics\.json \(HTTP 404\)/);
});

test("descarga incompleta (JSON truncado) => error", async () => {
  const m = { ...okMap(), "/data/rainfall_metrics.json": { status: 200, bad: true } };
  const r = await loadBundle(fetcherFrom(m));
  assert.equal(r.status, "error");
  if (r.status === "error") assert.match(r.message, /inválido o incompleto/);
});

test("fallo de red => error, sin excepción", async () => {
  const r = await loadBundle(async () => {
    throw new Error("Failed to fetch");
  });
  assert.equal(r.status, "error");
});

test("estructura incompleta o unidades inesperadas => error", async () => {
  const water = real("water_metrics.json");
  const m = { ...okMap(), "/data/water_metrics.json": { status: 200, body: { ...water, comparisons: undefined } } };
  const r = await loadBundle(fetcherFrom(m));
  assert.equal(r.status, "error");
  const rain = { ...real("rainfall_metrics.json"), unit: "mm/día" };
  assert.ok(
    structuralProblems({
      cases: real("cases.json"),
      water,
      rainfall: rain,
      climate: real("climate/climate_series.json"),
      model: real("model/water_model.json"),
    }).some((p) => p.includes("mm/mes")),
  );
});

test("el rótulo de la fuente climática no afirma ERA5-Land (no verificado)", async () => {
  const { climateSourceLabel } = await import("../src/lib/datasets.ts");
  assert.equal(climateSourceLabel("Open-Meteo Historical Weather API (reanálisis ERA5-Land)"), "Open-Meteo Historical Weather API");
  assert.equal(climateSourceLabel(null), "Open-Meteo Historical Weather API");
  assert.ok(!/ERA5/i.test(climateSourceLabel(real("climate/climate_series.json").source)));
});
