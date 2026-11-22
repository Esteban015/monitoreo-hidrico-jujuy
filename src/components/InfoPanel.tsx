"use client";

import type { ViewMode } from "./MapView";
import { COLORS } from "./MapView";
import ClimateSimulator from "./ClimateSimulator";
import HistoryChart from "./HistoryChart";
import { dataUrl } from "@/lib/datasets";
import { describePercentile, fmtDate, fmtMonth, fmtNum, fmtPct, fmtSigned, uncertaintyRange, type CaseView } from "@/lib/metrics";
import { HIGH_SENSITIVITY_SPAN, NOTICES } from "@/lib/notices";
import type { ClimateCase, RainObservation, SceneMetrics, WaterFile, WaterModelCase } from "@/lib/types";

const MODES: { id: ViewMode; label: string }[] = [
  { id: "antes", label: "Antes" },
  { id: "despues", label: "Después" },
  { id: "ambos", label: "Comparar" },
];

export default function InfoPanel({
  view,
  mode,
  onMode,
  method,
  climate,
  model,
}: {
  view: CaseView;
  mode: ViewMode;
  onMode: (m: ViewMode) => void;
  method: WaterFile["method"];
  climate: ClimateCase | null;
  model: WaterModelCase | null;
}) {
  const { info, sceneA, sceneB, comparison, rainA, rainB, missing } = view;

  if (missing.length || !sceneA || !sceneB || !comparison) {
    return (
      <section className="space-y-2 p-4" aria-live="polite">
        <CaseHeader view={view} />
        <p role="status" className="rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900" data-testid="data-status">
          Datos incompletos para este caso: falta {missing.join(", ")}. No se muestran valores parciales.
        </p>
        {climate && sceneA && sceneB && <HistoryChart climate={climate} sceneA={sceneA} sceneB={sceneB} />}
      </section>
    );
  }

  const range = uncertaintyRange(comparison, sceneA, sceneB);
  const span = range ? range.max - range.min : 0;
  const shallowWarning = sceneA.warnings.concat(sceneB.warnings).find((w) => w.toLowerCase().includes("somera"));
  const caseWarnings = Array.from(new Set([...info.warnings, ...comparison.warnings]));

  return (
    <section className="space-y-4 p-4" aria-live="polite" data-testid="results">
      <CaseHeader view={view} />

      {climate ? (
        <HistoryChart climate={climate} sceneA={sceneA} sceneB={sceneB} />
      ) : (
        <p className="rounded border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600" data-testid="history-missing">
          No hay historial climático publicado para esta fuente de agua.
        </p>
      )}

      {/* Comparador Antes / Después: solo las dos observaciones reales */}
      <div>
        <h3 className="mb-2 text-sm font-semibold text-slate-900">Comparación de dos observaciones reales</h3>
        <div role="group" aria-label="Fecha a mostrar en el mapa" className="mb-3 grid grid-cols-3 gap-1 rounded-lg bg-slate-100 p-1">
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              aria-pressed={mode === m.id}
              onClick={() => onMode(m.id)}
              className={`min-h-9 rounded-md px-2 py-1.5 text-sm font-medium transition ${mode === m.id ? "bg-white text-slate-900 shadow" : "text-slate-600 hover:text-slate-900"}`}
            >
              {m.label}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <DateCard tag="Antes" color={COLORS.a} scene={sceneA} area={comparison.MNDWI.area_a_km2} active={mode !== "despues"} />
          <DateCard tag="Después" color={COLORS.b} scene={sceneB} area={comparison.MNDWI.area_b_km2} active={mode !== "antes"} />
        </div>
      </div>

      {/* Diferencia y rango de incertidumbre */}
      <div className="rounded-lg border border-slate-200 p-3" data-testid="difference">
        <p className="text-xs uppercase tracking-wide text-slate-500">Cambio de superficie visible ({fmtDate(sceneA.date)} → {fmtDate(sceneB.date)})</p>
        <div className="mt-1 flex flex-wrap items-baseline gap-x-3">
          <span className="text-3xl font-semibold text-slate-900" data-testid="pct-main">{fmtPct(comparison.MNDWI.pct_change)}</span>
          <span className="text-base text-slate-700" data-testid="abs-main">{fmtSigned(comparison.MNDWI.abs_diff_km2, 2)} km²</span>
        </div>
        <p className="text-xs text-slate-500">Valor principal: MNDWI, umbral 0. Estimación, no medida exacta.</p>
        {range && (
          <div className="mt-3" data-testid="range">
            <p className="text-sm text-slate-800">
              Rango entre métodos y umbrales: <strong>{fmtPct(range.max)}</strong> a <strong>{fmtPct(range.min)}</strong>
            </p>
            <RangeBar min={range.min} max={range.max} main={comparison.MNDWI.pct_change} />
            {span > HIGH_SENSITIVITY_SPAN ? (
              <p className="mt-2 rounded bg-amber-50 p-2 text-xs text-amber-900" data-testid="high-sensitivity">
                Alta sensibilidad al método ({fmtNum(span, 0)} puntos de diferencia). {shallowWarning ?? ""} El porcentaje principal no debe leerse como una medida exacta.
              </p>
            ) : (
              <p className="mt-2 text-xs text-slate-600">Resultado consistente entre métodos (diferencia de {fmtNum(span, 0)} puntos).</p>
            )}
            <details className="mt-1 text-xs text-slate-600">
              <summary className="cursor-pointer select-none">Ver métodos incluidos en el rango</summary>
              <ul className="mt-1 list-disc pl-5">
                {range.sources.map((s) => (
                  <li key={s.label}>
                    {s.label}: {fmtPct(s.pct)}
                  </li>
                ))}
              </ul>
            </details>
          </div>
        )}
      </div>

      {/* Calidad */}
      <div>
        <h3 className="mb-1 text-sm font-semibold text-slate-900">Calidad de las observaciones</h3>
        <table className="w-full text-xs" data-testid="quality">
          <thead className="text-left text-slate-500">
            <tr>
              <th className="py-1 font-normal">Indicador</th>
              <th className="py-1 font-normal">{fmtDate(sceneA.date)}</th>
              <th className="py-1 font-normal">{fmtDate(sceneB.date)}</th>
            </tr>
          </thead>
          <tbody className="text-slate-800">
            <QRow label="Cobertura de la región" a={`${fmtNum(sceneA.coverage_pct, 1)} %`} b={`${fmtNum(sceneB.coverage_pct, 1)} %`} />
            <QRow label="Nubosidad efectiva (sobre la región)" a={`${fmtNum(sceneA.cloud_effective_pct, 3)} %`} b={`${fmtNum(sceneB.cloud_effective_pct, 3)} %`} />
            <QRow label="Estado del control de calidad" a={statusLabel(sceneA.status)} b={statusLabel(sceneB.status)} />
          </tbody>
        </table>
        <p className="mt-1 text-xs text-slate-500">
          Píxeles válidos en ambas fechas: {fmtNum(comparison.common_valid_pct_of_region, 2)} % de la región (grilla de {method.grid_m} m).
        </p>
      </div>

      {/* Precipitación */}
      <div data-testid="rainfall">
        <h3 className="text-sm font-semibold text-slate-900">Precipitación mensual en la cuenca (CHIRPS)</h3>
        <p className="mb-2 text-xs text-slate-500">{NOTICES.rainMonth}</p>
        <div className="space-y-2">
          <RainCard obs={rainA} imageDate={sceneA.date} />
          <RainCard obs={rainB} imageDate={sceneB.date} />
        </div>
      </div>

      {model && <ClimateSimulator key={model.name} model={model} />}

      {/* Imágenes de control */}
      <details data-testid="quicklooks" className="rounded border border-slate-200 p-2 text-sm">
        <summary className="cursor-pointer select-none font-medium text-slate-900">Imágenes de control Sentinel-2</summary>
        <p className="mt-1 text-xs text-slate-600">Falso color (B11, B08, B03): el agua se ve oscura. Línea cian: agua detectada; línea amarilla: región de análisis.</p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {[sceneA, sceneB].map((s) => (
            <a key={s.scene_id} href={dataUrl(s.files.quicklook)} target="_blank" rel="noreferrer" className="block">
              {/* eslint-disable-next-line @next/next/no-img-element -- exportación estática: imagen local sin optimizador */}
              <img src={dataUrl(s.files.quicklook)} alt={`Imagen de control Sentinel-2 del ${fmtDate(s.date)}`} loading="lazy" className="w-full rounded border" />
              <span className="text-xs text-slate-600">{fmtDate(s.date)}</span>
            </a>
          ))}
        </div>
      </details>

      {/* Advertencias */}
      <div className="rounded-lg bg-slate-50 p-3" data-testid="warnings">
        <h3 className="mb-1 text-sm font-semibold text-slate-900">Advertencias metodológicas</h3>
        <ul className="list-disc space-y-1 pl-5 text-xs text-slate-700">
          <li>{NOTICES.surface}</li>
          <li>{NOTICES.basin}</li>
          <li>{NOTICES.noTrend}</li>
          <li>{NOTICES.noCausality}</li>
          <li>{NOTICES.chirpsEstimate}</li>
          {caseWarnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      </div>

      {/* Trazabilidad */}
      <details className="rounded border border-slate-200 p-2 text-xs text-slate-700" data-testid="traceability">
        <summary className="cursor-pointer select-none text-sm font-medium text-slate-900">Fuentes y trazabilidad</summary>
        <dl className="mt-2 space-y-2">
          <Trace label="Imágenes">
            {[sceneA, sceneB].map((s) => (
              <span key={s.scene_id} className="block break-all">
                {fmtDate(s.date)} ·{" "}
                <a className="text-sky-700 underline" href={s.stac_item} target="_blank" rel="noreferrer">
                  {s.scene_id}
                </a>{" "}
                · tesela {s.mgrs_tile} · {s.crs} · nubosidad declarada de la escena {fmtNum(s.cloud_cover_scene_pct, 3)} %
              </span>
            ))}
            <span className="block">{sceneA.source}</span>
          </Trace>
          <Trace label="Método de agua">
            {method.water_rule}. Región: {method.region}. Área: {method.area}. Los contornos del mapa usan la máscara válida de cada fecha; la comparación usa los píxeles válidos en ambas fechas.
          </Trace>
          <Trace label="Precipitación">
            CHIRPS v3.0 mensual (Climate Hazards Center, UCSB), 0,05°. {rainA?.method}. Referencia: {rainA?.reference ? `${rainA.reference.first_year}–${rainA.reference.last_year} (${rainA.reference.n_years} años)` : "—"}.
          </Trace>
          <Trace label="Cuenca">
            {info.basin.label}: {info.basin.source}, unidad de salida {info.basin.outlet_hybas_id}, {fmtNum(info.basin.area_km2, 1)} km² ({info.basin.area_method}). Oficial: no.
          </Trace>
          <Trace label="Contorno de referencia">
            <a className="text-sky-700 underline" href={`https://www.openstreetmap.org/${info.aoi.ref}`} target="_blank" rel="noreferrer">
              OpenStreetMap {info.aoi.ref}
            </a>{" "}
            ({info.aoi.role}). © colaboradores de OpenStreetMap, ODbL.
          </Trace>
          <Trace label="Licencias y atribución">
            Sentinel-2: datos abiertos Copernicus (ESA). CHIRPS: Climate Hazards Center, UCSB (citar Funk et al.).
            HydroBASINS/HydroSHEDS: Lehner &amp; Grill (2013), uso con atribución. OpenStreetMap: ODbL 1.0.
            IGN Argentina: ver condiciones del Instituto Geográfico Nacional.
          </Trace>
        </dl>
      </details>
    </section>
  );
}

function CaseHeader({ view }: { view: CaseView }) {
  return (
    <header>
      <h2 className="text-lg font-semibold text-slate-900">{view.info.name}</h2>
      <p className="text-xs text-slate-500">
        {view.info.ecoregion} · {view.info.kind}
      </p>
    </header>
  );
}

function DateCard({ tag, color, scene, area, active }: { tag: string; color: string; scene: SceneMetrics; area: number; active: boolean }) {
  return (
    <div className={`rounded-lg border p-2 transition ${active ? "border-slate-300 bg-white" : "border-slate-200 bg-slate-50 opacity-60"}`} data-testid={`card-${tag}`}>
      <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
        <span aria-hidden className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: color }} />
        {tag} · {fmtDate(scene.date)}
      </div>
      <p className="mt-1 text-xl font-semibold text-slate-900">
        {fmtNum(area, 2)} <span className="text-sm font-normal">km²</span>
      </p>
      <p className="text-[11px] leading-tight text-slate-500">Superficie de agua visible estimada (MNDWI)</p>
    </div>
  );
}

function RangeBar({ min, max, main }: { min: number; max: number; main: number | null }) {
  const lo = Math.min(Math.floor(min / 10) * 10 - 10, -10);
  const hi = Math.max(0, Math.ceil(max / 10) * 10);
  const pos = (v: number) => `${((v - lo) / (hi - lo)) * 100}%`;
  return (
    <div className="mt-2" aria-hidden>
      <div className="relative h-3 rounded bg-slate-100">
        <div className="absolute top-0 h-3 rounded bg-slate-400/60" style={{ left: pos(min), width: `calc(${pos(max)} - ${pos(min)})` }} />
        {main !== null && <div className="absolute -top-1 h-5 w-1 rounded bg-slate-900" style={{ left: `calc(${pos(main)} - 2px)` }} />}
        <div className="absolute -top-0.5 h-4 w-px bg-slate-500" style={{ left: pos(0) }} />
      </div>
      <div className="mt-0.5 flex justify-between text-[10px] text-slate-500">
        <span>{fmtPct(lo, 0)}</span>
        <span>barra = rango · marca = valor principal</span>
        <span>{fmtPct(hi, 0)}</span>
      </div>
    </div>
  );
}

function QRow({ label, a, b }: { label: string; a: string; b: string }) {
  return (
    <tr className="border-t border-slate-100">
      <td className="py-1 pr-2 text-slate-600">{label}</td>
      <td className="py-1">{a}</td>
      <td className="py-1">{b}</td>
    </tr>
  );
}

function statusLabel(s: string) {
  return s === "completo" ? "Aprobado" : s === "requiere_revision" ? "Requiere revisión" : s;
}

function RainCard({ obs, imageDate }: { obs: RainObservation | null; imageDate: string }) {
  if (!obs || obs.value_mm === null) {
    return <p className="rounded border p-2 text-xs text-slate-600">Sin dato de precipitación para la imagen del {fmtDate(imageDate)}.</p>;
  }
  const ref = obs.reference;
  const extra = obs.warnings.filter((w) => !w.startsWith("Cuenca") && !w.startsWith("La unidad HydroBASINS"));
  return (
    <div className="rounded border border-slate-200 p-2" data-testid="rain-card">
      <p className="text-xs text-slate-500">
        {fmtMonth(obs.month)} · mes previo a la imagen del {fmtDate(imageDate)}
      </p>
      <p className="text-lg font-semibold text-slate-900">
        {fmtNum(obs.value_mm, 1)} <span className="text-sm font-normal">mm</span>
      </p>
      {ref && (
        <p className="text-xs text-slate-700">
          Media {ref.first_year}–{ref.last_year}: {fmtNum(ref.mean_mm, 1)} mm (mediana {fmtNum(ref.median_mm, 1)} mm)
        </p>
      )}
      <p className="text-xs text-slate-800" data-testid="anomaly">
        Anomalía {fmtPct(obs.anomaly_pct)} · {describePercentile(obs.percentile_in_reference)}
      </p>
      {extra.map((w) => (
        <p key={w} className="mt-1 text-[11px] text-amber-800">
          {w}
        </p>
      ))}
    </div>
  );
}

function Trace({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="font-medium text-slate-900">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}
