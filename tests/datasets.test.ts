// Carga de datasets: errores, datos incompletos y rutas relativas (sin red real).
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
  "data/cases.json": { status: 200, body: real("cases.json") },
  "data/water_metrics.json": { status: 200, body: real("water_metrics.json") },
  "data/rainfall_metrics.json": { status: 200, body: real("rainfall_metrics.json") },
});

test("carga los tres datasets reales con rutas relativas", async () => {
  const r = await loadBundle(fetcherFrom(okMap()));
  assert.equal(r.status, "ok");
  if (r.status === "ok") assert.equal(r.bundle.cases.cases.length, 2);
});

test("rutas relativas compatibles con exportación estática; rechaza rutas peligrosas", () => {
  assert.equal(dataUrl("geometries/x.geojson"), "data/geometries/x.geojson");
  assert.throws(() => dataUrl("/data/x.json"));
  assert.throws(() => dataUrl("../secret.json"));
  assert.throws(() => dataUrl("https://example.com/x.json"));
});

test("404 => error explícito", async () => {
  const m = okMap();
  delete (m as Record<string, unknown>)["data/water_metrics.json"];
  const r = await loadBundle(fetcherFrom(m));
  assert.equal(r.status, "error");
  if (r.status === "error") assert.match(r.message, /water_metrics\.json \(HTTP 404\)/);
});

test("descarga incompleta (JSON truncado) => error", async () => {
  const m = { ...okMap(), "data/rainfall_metrics.json": { status: 200, bad: true } };
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
  const m = { ...okMap(), "data/water_metrics.json": { status: 200, body: { ...water, comparisons: undefined } } };
  const r = await loadBundle(fetcherFrom(m));
  assert.equal(r.status, "error");
  const rain = { ...real("rainfall_metrics.json"), unit: "mm/día" };
  assert.ok(structuralProblems({ cases: real("cases.json"), water, rainfall: rain }).some((p) => p.includes("mm/mes")));
});
