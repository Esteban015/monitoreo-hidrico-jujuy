// Métricas presentadas en el dashboard, verificadas contra los archivos publicados reales.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describePercentile, fmtDate, fmtMonth, fmtNum, fmtPct, getCaseView, uncertaintyRange } from "../src/lib/metrics.ts";
import type { DataBundle } from "../src/lib/types.ts";

const PUB = new URL("../public/data/", import.meta.url);
const read = (n: string) => JSON.parse(readFileSync(new URL(n, PUB), "utf-8"));
const bundle: DataBundle = { cases: read("cases.json"), water: read("water_metrics.json"), rainfall: read("rainfall_metrics.json") };

test("selección de casos: ambos completos, caso inexistente => null", () => {
  for (const id of ["laguna-pozuelos", "dique-las-maderas"]) {
    const v = getCaseView(bundle, id);
    assert.ok(v);
    assert.deepEqual(v!.missing, []);
  }
  assert.equal(getCaseView(bundle, "no-existe"), null);
});

test("coherencia de fechas y emparejamiento con la precipitación", () => {
  for (const c of bundle.cases.cases) {
    const v = getCaseView(bundle, c.case_id)!;
    assert.ok(v.sceneA!.date < v.sceneB!.date);
    assert.equal(v.rainA!.image_date, v.sceneA!.date);
    assert.equal(v.rainB!.image_date, v.sceneB!.date);
    assert.ok(v.rainA!.month < v.sceneA!.date.slice(0, 7), "mes de lluvia anterior al mes de la imagen");
  }
});

test("unidades y superficie/variación coherentes con el archivo (sin recalcular indicadores)", () => {
  for (const c of bundle.water.comparisons) {
    assert.equal(c.unit, "km2");
    const { area_a_km2: a, area_b_km2: b, pct_change, abs_diff_km2 } = c.MNDWI;
    assert.ok(Math.abs((b - a) / a * 100 - pct_change!) < 0.01);
    assert.ok(Math.abs(b - a - abs_diff_km2) < 0.001);
  }
  for (const o of bundle.rainfall.observations) assert.equal(o.unit, "mm/mes");
});

test("rango de incertidumbre: Pozuelos −26 % a −68 %, Las Maderas −13 % a −19 %", () => {
  const p = getCaseView(bundle, "laguna-pozuelos")!;
  const rp = uncertaintyRange(p.comparison!, p.sceneA!, p.sceneB!)!;
  assert.equal(Math.round(rp.max), -26);
  assert.equal(Math.round(rp.min), -68);
  assert.equal(fmtPct(p.comparison!.MNDWI.pct_change), "−53,9 %");
  const m = getCaseView(bundle, "dique-las-maderas")!;
  const rm = uncertaintyRange(m.comparison!, m.sceneA!, m.sceneB!)!;
  assert.equal(Math.round(rm.max), -13);
  assert.equal(Math.round(rm.min), -19);
  assert.equal(fmtPct(m.comparison!.MNDWI.pct_change), "−18,1 %");
  // el valor principal queda dentro del rango
  for (const [v, r] of [[p, rp], [m, rm]] as const) {
    const main = v.comparison!.MNDWI.pct_change!;
    assert.ok(main >= r.min && main <= r.max);
  }
});

test("CHIRPS: anomalía y percentil presentes juntos, referencia 1995–2024", () => {
  for (const o of bundle.rainfall.observations) {
    assert.notEqual(o.anomaly_pct, null);
    assert.notEqual(o.percentile_in_reference, null);
    assert.equal(o.reference!.first_year, 1995);
    assert.equal(o.reference!.last_year, 2024);
    assert.equal(o.reference!.n_years, 30);
  }
  assert.match(describePercentile(83.3), /percentil 83/);
  assert.equal(describePercentile(null), "percentil no disponible");
});

test("ausencia de valores inventados: cada número mostrado existe en los archivos", () => {
  // las áreas de las tarjetas son las del archivo; las escenas existen y son reales (IDs Sentinel-2)
  for (const c of bundle.cases.cases) {
    const v = getCaseView(bundle, c.case_id)!;
    assert.match(v.sceneA!.scene_id, /^S2[ABC]_MSIL2A_\d{8}T\d{6}_/);
    assert.equal(v.comparison!.MNDWI.area_a_km2, v.sceneA!.water.MNDWI.area_km2_common_mask);
    assert.equal(v.comparison!.MNDWI.area_b_km2, v.sceneB!.water.MNDWI.area_km2_common_mask);
    assert.equal(c.basin.official, false);
  }
  assert.ok(!JSON.stringify(bundle).includes('"synthetic":true'));
});

test("datos incompletos => se informa lo que falta", () => {
  const partial: DataBundle = { ...bundle, rainfall: { ...bundle.rainfall, observations: [] } };
  const v = getCaseView(partial, "laguna-pozuelos")!;
  assert.ok(v.missing.some((m) => m.includes("precipitación")));
  const noComp: DataBundle = { ...bundle, water: { ...bundle.water, comparisons: [] } };
  assert.ok(getCaseView(noComp, "dique-las-maderas")!.missing.includes("comparación de superficie"));
});

test("formato es-AR", () => {
  assert.equal(fmtNum(81.4315, 2), "81,43");
  assert.equal(fmtNum(-0.04, 1), "0,0");
  assert.equal(fmtPct(54.6), "+54,6 %");
  assert.equal(fmtPct(null), "—");
  assert.equal(fmtDate("2025-05-04"), "04/05/2025");
  assert.equal(fmtMonth("2025-04"), "abril de 2025");
});
