// Selección y presentación de métricas YA CALCULADAS en la Fase 3. No calcula indicadores científicos nuevos:
// el rango de incertidumbre es el mínimo/máximo de variaciones existentes en water_metrics.json.
import type { CaseInfo, Comparison, DataBundle, RainObservation, SceneMetrics } from "./types.ts";

export interface CaseView {
  info: CaseInfo;
  sceneA: SceneMetrics | null;
  sceneB: SceneMetrics | null;
  comparison: Comparison | null;
  rainA: RainObservation | null;
  rainB: RainObservation | null;
  missing: string[];
}

export function getCaseView(bundle: DataBundle, caseId: string): CaseView | null {
  const info = bundle.cases.cases.find((c) => c.case_id === caseId);
  if (!info) return null;
  const comparison = bundle.water.comparisons.find((c) => c.case_id === caseId) ?? null;
  const scenes = bundle.water.scenes.filter((s) => s.case_id === caseId);
  const sceneA = comparison ? (scenes.find((s) => s.scene_id === comparison.scene_a) ?? null) : null;
  const sceneB = comparison ? (scenes.find((s) => s.scene_id === comparison.scene_b) ?? null) : null;
  const obs = bundle.rainfall.observations.filter((o) => o.case_id === caseId);
  const rainA = sceneA ? (obs.find((o) => o.image_date === sceneA.date) ?? null) : null;
  const rainB = sceneB ? (obs.find((o) => o.image_date === sceneB.date) ?? null) : null;
  const missing: string[] = [];
  if (!comparison) missing.push("comparación de superficie");
  if (!sceneA || !sceneB) missing.push("métricas de alguna de las dos fechas");
  if (!rainA || !rainB) missing.push("precipitación de alguna de las dos fechas");
  if (sceneA && sceneB && !(sceneA.date < sceneB.date)) missing.push("fechas incoherentes (A no es anterior a B)");
  return { info, sceneA, sceneB, comparison, rainA, rainB, missing };
}

export interface RangeSource {
  label: string;
  pct: number;
}

/** Rango entre métodos y umbrales: min/max de variaciones ya presentes en el archivo procesado. */
export function uncertaintyRange(comp: Comparison, a: SceneMetrics, b: SceneMetrics): { min: number; max: number; sources: RangeSource[] } | null {
  const sources: RangeSource[] = [];
  for (const s of comp.MNDWI_sensitivity) {
    if (s.pct_change !== null) sources.push({ label: `MNDWI umbral ${fmtSigned(s.threshold, 1)}`, pct: s.pct_change });
  }
  if (comp.NDWI.pct_change !== null) sources.push({ label: "NDWI umbral 0", pct: comp.NDWI.pct_change });
  const sa = a.scl_water_class.area_km2;
  const sb = b.scl_water_class.area_km2;
  if (sa > 0) sources.push({ label: "Clase «agua» de ESA (SCL)", pct: ((sb - sa) / sa) * 100 });
  if (!sources.length) return null;
  const v = sources.map((s) => s.pct);
  return { min: Math.min(...v), max: Math.max(...v), sources };
}

// --- Formato (es-AR) -------------------------------------------------------
const MINUS = "−";

export function fmtNum(v: number | null | undefined, digits = 1): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return "—";
  const r = Number(v.toFixed(digits)); // redondeo primero: evita "−0,0"
  const s = new Intl.NumberFormat("es-AR", { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(Math.abs(r));
  return r < 0 ? MINUS + s : s;
}

export function fmtSigned(v: number | null | undefined, digits = 1): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return "—";
  const s = fmtNum(v, digits);
  return Number(v.toFixed(digits)) > 0 ? `+${s}` : s;
}

export function fmtPct(v: number | null | undefined, digits = 1): string {
  const s = fmtSigned(v, digits);
  return s === "—" ? s : `${s} %`;
}

export function fmtDate(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

export function fmtMonth(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  return `${MONTHS[m - 1]} de ${y}`;
}

export function describePercentile(p: number | null): string {
  if (p === null) return "percentil no disponible";
  return `percentil ${fmtNum(p, 0)}: superó al ${fmtNum(p, 0)} % de los años de referencia`;
}
