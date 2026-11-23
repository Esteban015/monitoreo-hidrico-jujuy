// Carga de los datasets publicados (public/data/, ver scripts/publish-data.mjs).
// Rutas ABSOLUTAS desde la raíz del sitio (D-28): funcionan igual desde "/", "/demo" y "/demo/".
// Sin imports de valores: se puede testear con `node --test` directamente.
//
// Integración PR #3 (D-34): los 3 datasets OBSERVACIONALES (casos, superficie de agua, CHIRPS) son obligatorios.
// La serie climática (Open-Meteo) y el modelo demostrativo son OPCIONALES: si faltan o son inválidos, la demo
// científica sigue funcionando y se informa la ausencia. El modelo solo se acepta si está rotulado como sintético.
import type { ClimateFile, DataBundle, WaterModelFile } from "./types.ts";

export const DATA_BASE = "/data/";
export const DATA_FILES = {
  cases: "cases.json",
  water: "water_metrics.json",
  rainfall: "rainfall_metrics.json",
  climate: "climate/climate_series.json",
  model: "model/water_model.json",
} as const;

export type Fetcher = (url: string) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>;

export type BundleResult = { status: "ok"; bundle: DataBundle } | { status: "error"; message: string };

export function dataUrl(relPath: string): string {
  if (relPath.startsWith("/") || relPath.includes("..") || /^[a-z]+:/i.test(relPath)) {
    throw new Error(`Ruta de datos no permitida: ${relPath}`);
  }
  return DATA_BASE + relPath;
}

async function fetchJson(fetcher: Fetcher, rel: string): Promise<unknown> {
  let res;
  try {
    res = await fetcher(dataUrl(rel));
  } catch (e) {
    throw new Error(`No se pudo descargar ${rel}: ${e instanceof Error ? e.message : "error de red"}`);
  }
  if (!res.ok) throw new Error(`No se pudo cargar ${rel} (HTTP ${res.status})`);
  try {
    return await res.json();
  } catch {
    throw new Error(`Archivo ${rel} inválido o incompleto (JSON mal formado)`);
  }
}

/** Validación estructural mínima de los datasets OBSERVACIONALES (vacía si es válido). */
export function structuralProblems(b: unknown): string[] {
  const p: string[] = [];
  const o = b as Partial<DataBundle> | null;
  if (!o?.cases || !Array.isArray(o.cases.cases)) p.push("cases.json sin lista 'cases'");
  if (!o?.water || !Array.isArray(o.water.scenes) || !Array.isArray(o.water.comparisons))
    p.push("water_metrics.json sin 'scenes' o 'comparisons'");
  if (!o?.rainfall || !Array.isArray(o.rainfall.observations)) p.push("rainfall_metrics.json sin 'observations'");
  if (o?.water && Array.isArray(o.water.scenes) && o.water.scenes.some((s) => s.unit !== "km2"))
    p.push("unidad de superficie inesperada (se esperaba km2)");
  if (o?.rainfall && o.rainfall.unit !== "mm/mes") p.push("unidad de precipitación inesperada (se esperaba mm/mes)");
  return p;
}

/** Validación de los datasets OPCIONALES. Devuelve el problema o null. */
export function climateProblem(c: unknown): string | null {
  const o = c as Partial<ClimateFile> | null;
  if (!o || typeof o.cases !== "object" || o.cases === null) return "climate_series.json sin 'cases'";
  if (!o.unit || o.unit.precip_mm !== "mm/mes" || o.unit.temp_c !== "°C") return "climate_series.json con unidades inesperadas";
  return null;
}

export function modelProblem(m: unknown): string | null {
  const o = m as Partial<WaterModelFile> | null;
  if (!o || typeof o.cases !== "object" || o.cases === null) return "water_model.json sin 'cases'";
  if (o.synthetic !== true) return "el modelo debe estar rotulado como sintético";
  return null;
}

async function optional<T>(fetcher: Fetcher, rel: string, check: (v: unknown) => string | null, notes: string[]): Promise<T | null> {
  try {
    const v = await fetchJson(fetcher, rel);
    const problem = check(v);
    if (problem) {
      notes.push(problem);
      return null;
    }
    return v as T;
  } catch (e) {
    notes.push(e instanceof Error ? e.message : `No se pudo cargar ${rel}`);
    return null;
  }
}

export async function loadBundle(fetcher: Fetcher): Promise<BundleResult> {
  try {
    const notes: string[] = [];
    const [cases, water, rainfall, climate, model] = await Promise.all([
      fetchJson(fetcher, DATA_FILES.cases),
      fetchJson(fetcher, DATA_FILES.water),
      fetchJson(fetcher, DATA_FILES.rainfall),
      optional<ClimateFile>(fetcher, DATA_FILES.climate, climateProblem, notes),
      optional<WaterModelFile>(fetcher, DATA_FILES.model, modelProblem, notes),
    ]);
    const bundle = { cases, water, rainfall, climate, model, notes } as DataBundle;
    const problems = structuralProblems(bundle);
    if (problems.length) return { status: "error", message: `Datos incompletos: ${problems.join("; ")}` };
    return { status: "ok", bundle };
  } catch (e) {
    return { status: "error", message: e instanceof Error ? e.message : "Error desconocido al cargar datos" };
  }
}

/**
 * Rótulo visible de la fuente climática. El dataset declara "reanálisis ERA5-Land", pero el script no fuerza
 * `models=era5_land` en Open-Meteo: esa afirmación no está verificada y no se muestra (D-34).
 */
export function climateSourceLabel(source: string | null | undefined): string {
  const s = (source ?? "").replace(/\s*\([^)]*ERA5[^)]*\)/gi, "").replace(/ERA5(-Land)?/gi, "").trim();
  return s || "Open-Meteo Historical Weather API";
}
