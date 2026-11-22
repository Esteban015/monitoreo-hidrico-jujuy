// Solo servidor (build estático): lee los datasets reales de data/derived/ para la landing.
// Mismas funciones de presentación que el dashboard: no se calcula ningún indicador nuevo.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { getCaseView, uncertaintyRange, type CaseView } from "./metrics";
import type { DataBundle } from "./types";

function readDerived<T>(name: string): T {
  return JSON.parse(readFileSync(join(process.cwd(), "data", "derived", name), "utf-8")) as T;
}

export interface LandingCase {
  view: CaseView;
  range: { min: number; max: number } | null;
}

export function loadLandingCases(): LandingCase[] {
  const bundle: DataBundle = {
    cases: readDerived("cases.json"),
    water: readDerived("water_metrics.json"),
    rainfall: readDerived("rainfall_metrics.json"),
  };
  return bundle.cases.cases.flatMap((c) => {
    const view = getCaseView(bundle, c.case_id);
    if (!view || view.missing.length || !view.comparison || !view.sceneA || !view.sceneB) return [];
    const r = uncertaintyRange(view.comparison, view.sceneA, view.sceneB);
    return [{ view, range: r ? { min: r.min, max: r.max } : null }];
  });
}
