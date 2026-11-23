// Inferencia del simulador: interpola la grilla exportada por HistGradientBoostingRegressor.
// Sin dependencias ni llamadas a red. Ver data/derived/model/water_model.json.
import type { WaterModelCase } from "./types.ts";

export function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

/**
 * Lee un número escrito en español (coma decimal, punto de miles) o en notación con punto.
 * Devuelve null si el texto no es un número finito.
 */
export function parseDecimal(raw: string): number | null {
  let t = raw.trim().replace(/\s+/g, "").replace(/−/g, "-");
  if (!t) return null;
  const hasComma = t.includes(",");
  const hasDot = t.includes(".");
  if (hasComma && hasDot) {
    if (t.lastIndexOf(",") > t.lastIndexOf(".")) t = t.replace(/\./g, "").replace(",", ".");
    else t = t.replace(/,/g, "");
  } else if (hasComma) {
    t = t.replace(",", ".");
  }
  if (!/^-?\d+(\.\d+)?$/.test(t)) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

function lowerIndex(axis: number[], v: number): number {
  let lo = 0;
  let hi = axis.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (axis[mid] <= v) lo = mid;
    else hi = mid;
  }
  return lo;
}

/**
 * Predicción de superficie visible (km²) para un escenario de precipitación y temperatura.
 * Interpolación bilineal sobre la grilla del modelo. Fuera de rango se recorta al borde.
 */
export function predictArea(model: WaterModelCase, precip3m: number, temp3m: number): number {
  const ps = model.grid.precip_3m_mm;
  const ts = model.grid.temp_3m_c;
  const grid = model.grid.area_km2;
  if (!ps.length || !ts.length || !grid.length) return model.baseline.last_observed_area_km2;
  // Entradas no finitas (NaN/Infinity) => escenario base: nunca se propaga NaN a la interfaz.
  if (!Number.isFinite(precip3m)) precip3m = model.baseline.precip_3m_mm;
  if (!Number.isFinite(temp3m)) temp3m = model.baseline.temp_3m_c;

  const p = clamp(precip3m, ps[0], ps[ps.length - 1]);
  const t = clamp(temp3m, ts[0], ts[ts.length - 1]);
  const ip = lowerIndex(ps, p);
  const it = lowerIndex(ts, t);
  const ip1 = Math.min(ip + 1, ps.length - 1);
  const it1 = Math.min(it + 1, ts.length - 1);
  const dp = ps[ip1] - ps[ip] || 1;
  const dt = ts[it1] - ts[it] || 1;
  const fp = (p - ps[ip]) / dp;
  const ft = (t - ts[it]) / dt;

  const a = grid[it][ip] * (1 - fp) + grid[it][ip1] * fp;
  const b = grid[it1][ip] * (1 - fp) + grid[it1][ip1] * fp;
  return a * (1 - ft) + b * ft;
}

/** Serie de respuesta al variar la precipitación, con la temperatura fija. */
export function precipCurve(model: WaterModelCase, temp3m: number, n = 41): { precip: number; area: number }[] {
  const [p0, p1] = model.ranges.precip_3m_mm;
  return Array.from({ length: n }, (_, i) => {
    const precip = p0 + ((p1 - p0) * i) / (n - 1);
    return { precip, area: predictArea(model, precip, temp3m) };
  });
}
