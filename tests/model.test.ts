// Inferencia del simulador (HistGradientBoostingRegressor exportado a grilla).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseDecimal, predictArea, precipCurve } from "../src/lib/model.ts";
import type { WaterModelFile } from "../src/lib/types.ts";

const model: WaterModelFile = JSON.parse(readFileSync(new URL("../data/derived/model/water_model.json", import.meta.url), "utf-8"));

test("el modelo está rotulado como sintético y tiene grilla 61x61 por caso", () => {
  assert.equal(model.synthetic, true);
  assert.equal(model.algorithm, "HistGradientBoostingRegressor");
  for (const c of Object.values(model.cases)) {
    assert.equal(c.synthetic, true);
    assert.equal(c.grid.precip_3m_mm.length, 61);
    assert.equal(c.grid.temp_3m_c.length, 61);
    assert.equal(c.grid.area_km2.length, 61);
    assert.ok(c.grid.area_km2.every((row) => row.length === 61));
  }
});

test("predicción en el escenario base ≈ última superficie observada", () => {
  for (const c of Object.values(model.cases)) {
    const p = predictArea(c, c.baseline.precip_3m_mm, c.baseline.temp_3m_c);
    assert.ok(Math.abs(p - c.baseline.last_observed_area_km2) < 0.5, `${c.name}: ${p} vs ${c.baseline.last_observed_area_km2}`);
  }
});

test("más precipitación no reduce la superficie simulada y fuera de rango se recorta", () => {
  for (const c of Object.values(model.cases)) {
    const t = c.baseline.temp_3m_c;
    const low = predictArea(c, 0, t);
    const mid = predictArea(c, (c.ranges.precip_3m_mm[0] + c.ranges.precip_3m_mm[1]) / 2, t);
    const high = predictArea(c, 10_000, t);
    assert.ok(low <= mid && mid <= high, `${c.name}: ${low} ${mid} ${high}`);
    assert.ok(high <= c.reference_grid_area_km2 * 2 + 1);
    assert.equal(predictArea(c, -999, t), low);
    assert.equal(predictArea(c, 99_999, t), high);
  }
});

test("la curva de respuesta tiene 41 puntos y valores finitos", () => {
  for (const c of Object.values(model.cases)) {
    const curve = precipCurve(c, c.baseline.temp_3m_c);
    assert.equal(curve.length, 41);
    assert.ok(curve.every((p) => Number.isFinite(p.precip) && Number.isFinite(p.area)));
  }
});

test("la entrada de lluvia y temperatura acepta coma decimal y rechaza texto", () => {
  assert.equal(parseDecimal("18,5"), 18.5);
  assert.equal(parseDecimal("120"), 120);
  assert.equal(parseDecimal("1.234,5"), 1234.5);
  assert.equal(parseDecimal("−2,5"), -2.5);
  assert.equal(parseDecimal(""), null);
  assert.equal(parseDecimal("lluvia"), null);
  assert.equal(parseDecimal("12mm"), null);
});

test("el historial climático es una estimación continua y con 2 observaciones por caso", () => {
  const climate = JSON.parse(readFileSync(new URL("../data/derived/climate/climate_series.json", import.meta.url), "utf-8"));
  assert.equal(climate.kind, "estimacion");
  for (const c of Object.values(climate.cases) as { months: { precip_mm: number | null; temp_c: number | null }[]; observations: unknown[] }[]) {
    assert.ok(c.months.length >= 80);
    assert.equal(c.observations.length, 2);
    assert.ok(c.months.every((m) => Number.isFinite(m.precip_mm) && Number.isFinite(m.temp_c)));
  }
});

test("simulador robusto: NaN, Infinity, negativos y extremos dan superficies finitas y no negativas", () => {
  const model = JSON.parse(readFileSync(new URL("../data/derived/model/water_model.json", import.meta.url), "utf-8"));
  for (const c of Object.values(model.cases) as Parameters<typeof predictArea>[0][]) {
    for (const [p, t] of [[NaN, NaN], [Infinity, -Infinity], [-500, -40], [1e9, 1e9], [0, 0]]) {
      const a = predictArea(c, p, t);
      assert.ok(Number.isFinite(a) && a >= 0, `${c.name} ${p} ${t} -> ${a}`);
    }
    assert.equal(predictArea(c, NaN, NaN), predictArea(c, c.baseline.precip_3m_mm, c.baseline.temp_3m_c));
  }
  assert.equal(parseDecimal("Infinity"), null);
  assert.equal(parseDecimal("NaN"), null);
  assert.equal(parseDecimal("1e999"), null);
  assert.equal(parseDecimal("-5"), -5);
});
