// Carga de los datasets publicados (public/data/, ver scripts/publish-data.mjs).
// Rutas ABSOLUTAS desde la raíz del sitio (D-28): funcionan igual desde "/", "/demo" y "/demo/".
// Sin imports de valores: se puede testear con `node --test` directamente.
import type { DataBundle } from "./types.ts";

export const DATA_BASE = "/data/";
export const DATA_FILES = { cases: "cases.json", water: "water_metrics.json", rainfall: "rainfall_metrics.json" } as const;

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

/** Validación estructural mínima: devuelve la lista de problemas (vacía si es válido). */
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

export async function loadBundle(fetcher: Fetcher): Promise<BundleResult> {
  try {
    const [cases, water, rainfall] = await Promise.all([
      fetchJson(fetcher, DATA_FILES.cases),
      fetchJson(fetcher, DATA_FILES.water),
      fetchJson(fetcher, DATA_FILES.rainfall),
    ]);
    const bundle = { cases, water, rainfall } as DataBundle;
    const problems = structuralProblems(bundle);
    if (problems.length) return { status: "error", message: `Datos incompletos: ${problems.join("; ")}` };
    return { status: "ok", bundle };
  } catch (e) {
    return { status: "error", message: e instanceof Error ? e.message : "Error desconocido al cargar datos" };
  }
}
