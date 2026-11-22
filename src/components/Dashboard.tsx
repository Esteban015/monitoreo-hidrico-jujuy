"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { loadBundle, type BundleResult } from "@/lib/datasets";
import { fmtDate, fmtPct, getCaseView } from "@/lib/metrics";
import InfoPanel from "./InfoPanel";
import type { MapLayers, ViewMode } from "./MapView";

// Leaflet usa `window`: se carga solo en el cliente.
const MapView = dynamic(() => import("./MapView"), {
  ssr: false,
  loading: () => (
    <div role="status" className="flex h-full items-center justify-center bg-slate-200 text-sm text-slate-600">
      Cargando mapa…
    </div>
  ),
});

export default function Dashboard() {
  const [result, setResult] = useState<BundleResult | "cargando">("cargando");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mode, setMode] = useState<ViewMode>("ambos");

  const load = useCallback(() => {
    setResult("cargando");
    loadBundle((url) => fetch(url)).then(setResult);
  }, []);

  useEffect(() => {
    let cancelled = false;
    loadBundle((url) => fetch(url)).then((r) => {
      if (!cancelled) setResult(r);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const bundle = result !== "cargando" && result.status === "ok" ? result.bundle : null;
  const view = useMemo(() => (bundle && selectedId ? getCaseView(bundle, selectedId) : null), [bundle, selectedId]);
  const layers: MapLayers | null = useMemo(
    () =>
      view && view.sceneA && view.sceneB
        ? {
            caseId: view.info.case_id,
            basinFile: view.info.basin.file,
            aoiFile: view.info.aoi.file,
            waterAFile: view.sceneA.files.water_geojson,
            waterBFile: view.sceneB.files.water_geojson,
            labelA: fmtDate(view.sceneA.date),
            labelB: fmtDate(view.sceneB.date),
          }
        : null,
    [view],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col md:flex-row">
      <aside className="w-full shrink-0 border-b border-slate-200 bg-white md:w-[27rem] md:overflow-y-auto md:border-b-0 md:border-r">
        <nav aria-label="Cuencas y fuentes de agua" className="p-4 pb-2">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">Casos testigo</h2>
          {result === "cargando" && (
            <p role="status" className="text-sm text-slate-600" data-testid="data-status">
              Cargando datos procesados…
            </p>
          )}
          {result !== "cargando" && result.status === "error" && (
            <div role="alert" className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800" data-testid="data-status">
              <p>No se pudieron cargar los datos: {result.message}</p>
              <button type="button" onClick={load} className="mt-2 rounded bg-red-700 px-3 py-1 text-white">
                Reintentar
              </button>
            </div>
          )}
          {bundle && (
            <ul className="space-y-1">
              {bundle.cases.cases.map((c) => {
                const active = selectedId === c.case_id;
                const pct = bundle.water.comparisons.find((x) => x.case_id === c.case_id)?.MNDWI.pct_change ?? null;
                return (
                  <li key={c.case_id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(c.case_id)}
                      aria-pressed={active}
                      data-case={c.case_id}
                      className={`w-full rounded-lg px-3 py-2 text-left text-sm transition ${active ? "bg-sky-800 text-white" : "text-slate-800 hover:bg-slate-100"}`}
                    >
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="font-medium">{c.name}</span>
                        <span className={`text-xs ${active ? "text-sky-100" : "text-slate-500"}`}>{fmtPct(pct)}</span>
                      </span>
                      <span className={`block text-xs ${active ? "text-sky-100" : "text-slate-500"}`}>
                        {c.ecoregion} · {c.kind}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </nav>
        <div className="border-t border-slate-200">
          {bundle && !selectedId && (
            <div className="p-4 text-sm text-slate-600">
              <p>Seleccioná un caso para comparar la superficie de agua visible en dos fechas reales de Sentinel-2 y la precipitación mensual de su cuenca.</p>
            </div>
          )}
          {bundle && selectedId && !view && (
            <p role="alert" className="p-4 text-sm text-red-800">
              El caso «{selectedId}» no existe en los datos publicados.
            </p>
          )}
          {bundle && view && <InfoPanel view={view} mode={mode} onMode={setMode} method={bundle.water.method} />}
        </div>
      </aside>
      <main className="relative order-first h-[50vh] shrink-0 md:order-none md:h-auto md:flex-1">
        <MapView layers={layers} mode={mode} />
      </main>
    </div>
  );
}
