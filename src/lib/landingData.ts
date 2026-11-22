// Solo servidor (build estático): lee los datasets reales de data/derived/ para la landing.
// Mismas funciones de presentación que el dashboard: no se calcula ningún indicador nuevo.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { getCaseView, uncertaintyRange, type CaseView } from "./metrics";
import type { DataBundle } from "./types";

function readJson<T>(...parts: string[]): T {
  return JSON.parse(readFileSync(join(process.cwd(), ...parts), "utf-8")) as T;
}

export interface LandingImage {
  src: string;
  width: number;
  height: number;
}

export interface LandingCase {
  view: CaseView;
  range: { min: number; max: number } | null;
  imageA: LandingImage | null;
  imageB: LandingImage | null;
}

type QuicklookManifest = { files: { file: string; width: number; height: number }[] };

/** Quicklook Sentinel-2 real, redimensionado a WebP (scripts/brand/generate-brand-assets.mjs). */
function quicklook(manifest: QuicklookManifest | null, caseId: string, date: string): LandingImage | null {
  const f = manifest?.files.find((x) => x.file === `${caseId}_${date}.webp`);
  return f ? { src: `/landing/quicklooks/${f.file}`, width: f.width, height: f.height } : null;
}

export function loadLandingCases(): LandingCase[] {
  const bundle: DataBundle = {
    cases: readJson("data", "derived", "cases.json"),
    water: readJson("data", "derived", "water_metrics.json"),
    rainfall: readJson("data", "derived", "rainfall_metrics.json"),
  };
  const mPath = join(process.cwd(), "public", "landing", "quicklooks", "manifest.json");
  const manifest = existsSync(mPath) ? readJson<QuicklookManifest>("public", "landing", "quicklooks", "manifest.json") : null;
  return bundle.cases.cases.flatMap((c) => {
    const view = getCaseView(bundle, c.case_id);
    if (!view || view.missing.length || !view.comparison || !view.sceneA || !view.sceneB) return [];
    const r = uncertaintyRange(view.comparison, view.sceneA, view.sceneB);
    return [
      {
        view,
        range: r ? { min: r.min, max: r.max } : null,
        imageA: quicklook(manifest, c.case_id, view.sceneA.date),
        imageB: quicklook(manifest, c.case_id, view.sceneB.date),
      },
    ];
  });
}

export interface StepImage extends LandingImage {
  alt: string;
}

/** Miniaturas reales de la interfaz de la demo (scripts/brand/capture-step-thumbnails.mjs). Opcionales. */
export function loadStepImages(): Record<string, StepImage> {
  const p = join(process.cwd(), "public", "landing", "steps", "manifest.json");
  if (!existsSync(p)) return {};
  const m = readJson<{ files: (StepImage & { step: string })[] }>("public", "landing", "steps", "manifest.json");
  return Object.fromEntries(m.files.map((f) => [f.step, { src: f.src, width: f.width, height: f.height, alt: f.alt }]));
}
