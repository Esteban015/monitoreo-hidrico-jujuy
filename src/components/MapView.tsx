"use client";

import { useEffect, useRef, useState } from "react";
import type { GeoJSON as GeoJSONLayer, LayerGroup, Map as LeafletMap, TileLayer } from "leaflet";
import "leaflet/dist/leaflet.css";
import { dataUrl } from "@/lib/datasets";
import { ATTRIBUTION_LOCAL, BASEMAP_FILES, JUJUY_VIEW_BOUNDS, OSM_TILES, type BaseMapMode } from "@/lib/mapConfig";

export type ViewMode = "antes" | "despues" | "ambos";

export interface MapLayers {
  caseId: string;
  basinFile: string;
  aoiFile: string;
  waterAFile: string;
  waterBFile: string;
  labelA: string;
  labelB: string;
}

type Geo = { basin: GeoJSON.GeoJsonObject; aoi: GeoJSON.GeoJsonObject; a: GeoJSON.GeoJsonObject; b: GeoJSON.GeoJsonObject };
type LoadState = "cargando" | "listo" | "error";
type OsmState = "inactivo" | "cargando" | "listo" | "sin-conexion";

export const COLORS = { a: "#1d4ed8", b: "#d97706", basin: "#7c3aed", aoi: "#475569", province: "#334155" } as const;

const geoCache = new Map<string, Promise<GeoJSON.GeoJsonObject>>();
function loadGeo(file: string) {
  if (!geoCache.has(file)) {
    const p = fetch(dataUrl(file)).then((r) => {
      if (!r.ok) throw new Error(`No se pudo cargar ${file} (HTTP ${r.status})`);
      return r.json() as Promise<GeoJSON.GeoJsonObject>;
    });
    p.catch(() => geoCache.delete(file));
    geoCache.set(file, p);
  }
  return geoCache.get(file)!;
}

export default function MapView({ layers, mode }: { layers: MapLayers | null; mode: ViewMode }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const groupRef = useRef<LayerGroup | null>(null);
  const baseGroupRef = useRef<LayerGroup | null>(null);
  const osmRef = useRef<TileLayer | null>(null);
  const LRef = useRef<typeof import("leaflet") | null>(null);
  const fittedCase = useRef<string | null>(null);
  const [ready, setReady] = useState(false);
  const [initError, setInitError] = useState(false);
  const [baseState, setBaseState] = useState<LoadState>("cargando");
  const [baseMode, setBaseMode] = useState<BaseMapMode>("local");
  const [osmState, setOsmState] = useState<OsmState>("inactivo");
  const [geo, setGeo] = useState<{ caseId: string; data: Geo } | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  // Componente solo-cliente (ssr: false): leer el ancho al iniciar no genera desajuste de hidratación.
  const [legendOpen, setLegendOpen] = useState(() => typeof window === "undefined" || window.innerWidth >= 768);

  // 1) Mapa + mapa base LOCAL (límites IGN). Sin pedidos externos.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const L = await import("leaflet");
        if (cancelled || !containerRef.current || mapRef.current) return;
        LRef.current = L;
        // Canvas: con cientos de polígonos (Pozuelos) el render SVG quedaba recortado al componerse (defecto Fase 5).
        const map = L.map(containerRef.current, { zoomControl: true, attributionControl: true, preferCanvas: true });
        map.attributionControl.setPrefix(false);
        map.attributionControl.addAttribution(ATTRIBUTION_LOCAL);
        map.fitBounds(JUJUY_VIEW_BOUNDS);
        map.createPane("base").style.zIndex = "250";
        baseGroupRef.current = L.layerGroup().addTo(map);
        groupRef.current = L.layerGroup().addTo(map);
        mapRef.current = map;
        // Si el contenedor cambia de tamaño después de iniciar (layout, rotación, panel), Leaflet debe recalcular;
        // si no, los polígonos quedan recortados con el tamaño viejo.
        const ro = new ResizeObserver(() => map.invalidateSize({ pan: false }));
        ro.observe(containerRef.current);
        map.on("unload", () => ro.disconnect());
        setReady(true);
        try {
          const [prov, deptos] = await Promise.all([loadGeo(BASEMAP_FILES.provincia), loadGeo(BASEMAP_FILES.departamentos)]);
          if (cancelled) return;
          const provLayer = L.geoJSON(prov, { pane: "base", interactive: false, style: { color: COLORS.province, weight: 2, fillColor: "#f8fafc", fillOpacity: 1 } }).addTo(baseGroupRef.current);
          const deptoLayer = L.geoJSON(deptos, {
            pane: "base",
            style: { color: "#94a3b8", weight: 0.8, fill: true, fillOpacity: 0 },
            onEachFeature: (f, layer) => layer.bindTooltip(`Departamento ${(f.properties as { nombre: string }).nombre}`, { sticky: true }),
          }).addTo(baseGroupRef.current);
          // Conteos expuestos para QA (el renderer Canvas no genera elementos <path> inspeccionables)
          if (rootRef.current) rootRef.current.dataset.baseFeatures = String(provLayer.getLayers().length + deptoLayer.getLayers().length);
          setBaseState("listo");
        } catch {
          if (!cancelled) setBaseState("error");
        }
      } catch {
        if (!cancelled) setInitError(true);
      }
    })();
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  // 2) OpenStreetMap opcional (solo si el usuario lo activa; requiere internet)
  useEffect(() => {
    const L = LRef.current;
    const map = mapRef.current;
    if (!ready || !L || !map) return;
    if (baseMode === "osm" && !osmRef.current) {
      let ok = 0;
      let errors = 0;
      // Leaflet emite "load" también cuando fallan las teselas: se cuentan las cargadas de verdad.
      osmRef.current = L.tileLayer(OSM_TILES.url, { maxZoom: 18, attribution: OSM_TILES.attribution })
        .on("loading", () => setOsmState("cargando"))
        .on("tileload", () => (ok += 1))
        .on("tileerror", () => {
          errors += 1;
          if (ok === 0 && errors >= 4) setOsmState("sin-conexion");
        })
        .on("load", () => setOsmState(ok > 0 ? "listo" : "sin-conexion"))
        .addTo(map);
    } else if (baseMode === "local" && osmRef.current) {
      osmRef.current.remove();
      osmRef.current = null;
      setOsmState("inactivo");
    }
  }, [ready, baseMode]);

  // 3) Geometrías del caso (datos locales)
  useEffect(() => {
    if (!layers) return;
    let cancelled = false;
    Promise.all([loadGeo(layers.basinFile), loadGeo(layers.aoiFile), loadGeo(layers.waterAFile), loadGeo(layers.waterBFile)])
      .then(([basin, aoi, a, b]) => {
        if (cancelled) return;
        setGeoError(null);
        setGeo({ caseId: layers.caseId, data: { basin, aoi, a, b } });
      })
      .catch((e: unknown) => {
        if (!cancelled) setGeoError(e instanceof Error ? e.message : "Error al cargar geometrías");
      });
    return () => {
      cancelled = true;
    };
  }, [layers]);

  // 4) Dibujo según modo Antes / Después / Comparar
  useEffect(() => {
    const L = LRef.current;
    const map = mapRef.current;
    const group = groupRef.current;
    if (!ready || !L || !map || !group) return;
    group.clearLayers();
    const root = rootRef.current;
    if (root) root.dataset.drawnA = root.dataset.drawnB = "0";
    if (!geo || !layers || geo.caseId !== layers.caseId) return;
    // La cuenca puede tener muchas subunidades HydroBASINS: sombreado con bordes tenues para no saturar.
    L.geoJSON(geo.data.basin, {
      style: { color: COLORS.basin, weight: 1, opacity: 0.35, fillColor: COLORS.basin, fillOpacity: 0.08 },
      interactive: false,
    }).addTo(group);
    const aoi: GeoJSONLayer = L.geoJSON(geo.data.aoi, {
      style: { color: COLORS.aoi, weight: 1.5, dashArray: "2 4", fill: false },
      interactive: false,
    }).addTo(group);
    if (mode !== "despues") {
      const la = L.geoJSON(geo.data.a, { style: { color: COLORS.a, weight: 1, fillColor: COLORS.a, fillOpacity: 0.55 } })
        .bindTooltip(`Agua detectada ${layers.labelA}`)
        .addTo(group);
      if (root) root.dataset.drawnA = String(la.getLayers().length);
    }
    if (mode !== "antes") {
      const lb = L.geoJSON(geo.data.b, { style: { color: COLORS.b, weight: 1, fillColor: COLORS.b, fillOpacity: mode === "ambos" ? 0.75 : 0.55 } })
        .bindTooltip(`Agua detectada ${layers.labelB}`)
        .addTo(group);
      if (root) root.dataset.drawnB = String(lb.getLayers().length);
    }
    if (fittedCase.current !== layers.caseId) {
      // Encuadre en el cuerpo de agua (el cambio es legible); la cuenca se ve al alejar.
      map.fitBounds(aoi.getBounds().pad(0.35), { padding: [16, 16] });
      fittedCase.current = layers.caseId;
    }
  }, [ready, geo, layers, mode]);

  const loadingGeo = !!layers && !geoError && (!geo || geo.caseId !== layers.caseId);
  const message = initError
    ? "No se pudo inicializar el mapa."
    : geoError
      ? `No se pudieron cargar las geometrías: ${geoError}`
      : baseState === "error"
        ? "No se pudo cargar el mapa base local."
        : loadingGeo
          ? "Cargando geometrías…"
          : baseState === "cargando"
            ? "Cargando mapa base local…"
            : baseMode === "osm" && osmState === "sin-conexion"
              ? "OpenStreetMap no disponible (sin internet). Volvé a «Mapa local»: los datos son locales."
              : null;

  return (
    <div
      ref={rootRef}
      className="relative h-full w-full"
      data-testid="map"
      data-basemap={baseMode}
      data-basemap-status={baseState}
      data-osm={osmState}
      data-geo={loadingGeo ? "cargando" : geoError ? "error" : layers ? "listo" : "sin-caso"}
    >
      <div ref={containerRef} className="h-full w-full bg-[#dbe4ee]" aria-label="Mapa de Jujuy" />
      {message && (
        <div role="status" className="pointer-events-none absolute left-1/2 top-3 z-[1000] w-max max-w-[80%] -translate-x-1/2 rounded bg-white/95 px-3 py-1 text-center text-sm text-slate-700 shadow">
          {message}
        </div>
      )}
      <div role="group" aria-label="Mapa base" className="absolute right-2 top-2 z-[1000] flex overflow-hidden rounded-md bg-white text-xs shadow">
        {(["local", "osm"] as const).map((m) => (
          <button
            key={m}
            type="button"
            aria-pressed={baseMode === m}
            onClick={() => setBaseMode(m)}
            className={`min-h-9 px-2.5 py-1.5 font-medium ${baseMode === m ? "bg-slate-800 text-white" : "text-slate-700 hover:bg-slate-100"}`}
            title={m === "osm" ? "Requiere conexión a internet" : "Sin conexión: límites IGN locales"}
          >
            {m === "local" ? "Mapa local" : "OpenStreetMap (online)"}
          </button>
        ))}
      </div>
      {layers && (
        <details
          open={legendOpen}
          onToggle={(e) => setLegendOpen((e.currentTarget as HTMLDetailsElement).open)}
          className="absolute bottom-[4.5rem] left-2 z-[1000] max-w-[17rem] rounded bg-white/95 p-2 text-xs text-slate-700 shadow md:bottom-6"
          data-testid="legend"
        >
          <summary className="min-h-6 cursor-pointer select-none font-semibold text-slate-900">Referencias</summary>
          {mode !== "despues" && <LegendItem color={COLORS.a} label={`Agua detectada ${layers.labelA} (MNDWI)`} fill />}
          {mode !== "antes" && <LegendItem color={COLORS.b} label={`Agua detectada ${layers.labelB} (MNDWI)`} fill />}
          {mode === "ambos" && <p className="mt-1 text-[11px] text-slate-600">Lo que se ve en azul es agua detectada solo en la primera fecha.</p>}
          <LegendItem color={COLORS.basin} label="Cuenca de aporte modelada (no oficial; alejar para verla completa)" fill />
          <LegendItem color={COLORS.aoi} label="Contorno cartográfico OSM (referencia, no medición)" dashed />
          <LegendItem color={COLORS.province} label="Límite provincial y departamentos (IGN)" />
        </details>
      )}
    </div>
  );
}

function LegendItem({ color, label, fill, dashed }: { color: string; label: string; fill?: boolean; dashed?: boolean }) {
  return (
    <div className="flex items-center gap-2 py-0.5">
      <span
        aria-hidden
        className="inline-block h-3 w-5 shrink-0 rounded-sm"
        style={fill ? { background: color, opacity: 0.75 } : { border: `2px ${dashed ? "dashed" : "solid"} ${color}` }}
      />
      <span>{label}</span>
    </div>
  );
}
