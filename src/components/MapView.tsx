"use client";

import { useEffect, useRef, useState } from "react";
import type { GeoJSON as GeoJSONLayer, LayerGroup, Map as LeafletMap, TileLayer } from "leaflet";
import "leaflet/dist/leaflet.css";
import { dataUrl } from "@/lib/datasets";
import { ATTRIBUTION_LOCAL, BASEMAP_FILES, JUJUY_VIEW_BOUNDS, PHYSICAL_TILES, type BaseMapMode } from "@/lib/mapConfig";

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

export interface OverviewCase {
  caseId: string;
  name: string;
  ecoregion: string;
  kind: string;
  aoiFile: string;
  areaKm2: number;
}

type Geo = { basin: GeoJSON.GeoJsonObject; aoi: GeoJSON.GeoJsonObject; a: GeoJSON.GeoJsonObject; b: GeoJSON.GeoJsonObject };
type LoadState = "cargando" | "listo" | "error";
type TileState = "inactivo" | "cargando" | "listo" | "sin-conexion";

export const COLORS = {
  // Colores de datos de la marca (D-21/D-27): los mismos que la landing y la leyenda («azul = solo primera fecha»).
  a: "#1d4ed8",
  b: "#d97706",
  basin: "#7c3aed",
  aoi: "#475569",
  province: "#334155",
  water: "#2c7da0",
} as const;

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

const nf = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 1 });

export default function MapView({
  layers,
  mode,
  overview,
  onSelect,
}: {
  layers: MapLayers | null;
  mode: ViewMode;
  overview: OverviewCase[] | null;
  onSelect?: (caseId: string | null) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const groupRef = useRef<LayerGroup | null>(null);
  const baseGroupRef = useRef<LayerGroup | null>(null);
  const outlineGroupRef = useRef<LayerGroup | null>(null);
  const overviewGroupRef = useRef<LayerGroup | null>(null);
  const provinceRef = useRef<GeoJSONLayer | null>(null);
  const deptRef = useRef<GeoJSONLayer | null>(null);
  const tilesRef = useRef<TileLayer | null>(null);
  const LRef = useRef<typeof import("leaflet") | null>(null);
  const fittedCase = useRef<string | null>(null);
  const [ready, setReady] = useState(false);
  const [initError, setInitError] = useState(false);
  const [baseState, setBaseState] = useState<LoadState>("cargando");
  const [baseMode, setBaseMode] = useState<BaseMapMode>("politico");
  const [tileState, setTileState] = useState<TileState>("inactivo");
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
        const map = L.map(containerRef.current, { zoomControl: true, attributionControl: true, preferCanvas: true });
        map.attributionControl.setPrefix(false);
        map.attributionControl.addAttribution(ATTRIBUTION_LOCAL);
        map.fitBounds(JUJUY_VIEW_BOUNDS);
        map.createPane("base").style.zIndex = "250";
        map.createPane("outline").style.zIndex = "300";
        baseGroupRef.current = L.layerGroup().addTo(map);
        outlineGroupRef.current = L.layerGroup().addTo(map);
        overviewGroupRef.current = L.layerGroup().addTo(map);
        groupRef.current = L.layerGroup().addTo(map);
        mapRef.current = map;
        const ro = new ResizeObserver(() => map.invalidateSize({ pan: false }));
        ro.observe(containerRef.current);
        map.on("unload", () => ro.disconnect());
        setReady(true);
        try {
          const [prov, deptos] = await Promise.all([loadGeo(BASEMAP_FILES.provincia), loadGeo(BASEMAP_FILES.departamentos)]);
          if (cancelled) return;
          provinceRef.current = L.geoJSON(prov, {
            pane: "base",
            interactive: false,
            style: { color: COLORS.province, weight: 2, fillColor: "#f8fafc", fillOpacity: 1 },
          }).addTo(baseGroupRef.current);
          deptRef.current = L.geoJSON(deptos, {
            pane: "base",
            style: { color: "#94a3b8", weight: 0.8, fill: true, fillOpacity: 0 },
            onEachFeature: (f, layer) => layer.bindTooltip(`Departamento ${(f.properties as { nombre: string }).nombre}`, { sticky: true }),
          }).addTo(baseGroupRef.current);
          // Borde provincial siempre visible, también sobre el mapa físico.
          L.geoJSON(prov, { pane: "outline", interactive: false, style: { color: COLORS.province, weight: 2, fill: false } }).addTo(outlineGroupRef.current);
          if (rootRef.current) rootRef.current.dataset.baseFeatures = String(provinceRef.current.getLayers().length + deptRef.current.getLayers().length);
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

  // 2) Estilo del mapa base según «Político» / «Físico» / «Agua».
  useEffect(() => {
    const map = mapRef.current;
    const base = baseGroupRef.current;
    if (!ready || !map || !base) return;
    const dark = baseMode === "agua";
    provinceRef.current?.setStyle({
      color: dark ? "#38bdf8" : COLORS.province,
      weight: 2,
      fillColor: dark ? "#082f49" : "#f8fafc",
      fillOpacity: 1,
    });
    deptRef.current?.setStyle({ color: dark ? "#0ea5e9" : "#94a3b8", weight: 0.8, opacity: dark ? 0.35 : 1 });
    if (containerRef.current) containerRef.current.style.background = dark ? "#072a40" : baseMode === "fisico" ? "#dbe4ee" : "#f8fafc";
    // El relleno provincial tapa las teselas: en modo físico se oculta; el borde sigue en su propio pane.
    if (baseMode === "fisico") {
      if (map.hasLayer(base)) base.remove();
    } else if (!map.hasLayer(base)) {
      base.addTo(map);
    }
  }, [ready, baseMode, baseState]);

  // 3) Relieve online opcional (sólo modo Físico).
  useEffect(() => {
    const L = LRef.current;
    const map = mapRef.current;
    if (!ready || !L || !map) return;
    if (baseMode !== "fisico") {
      tilesRef.current?.remove();
      tilesRef.current = null;
      return;
    }
    if (tilesRef.current) return;
    let ok = 0;
    let errors = 0;
    tilesRef.current = L.tileLayer(PHYSICAL_TILES.url, { maxZoom: 17, attribution: PHYSICAL_TILES.attribution })
      .on("loading", () => setTileState("cargando"))
      .on("tileload", () => (ok += 1))
      .on("tileerror", () => {
        errors += 1;
        if (ok === 0 && errors >= 4) setTileState("sin-conexion");
      })
      .on("load", () => setTileState(ok > 0 ? "listo" : "sin-conexion"))
      .addTo(map);
  }, [ready, baseMode]);

  // 4) Geometrías del caso (datos locales)
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

  // 5) Dibujo según modo Antes / Después / Comparar
  useEffect(() => {
    const L = LRef.current;
    const map = mapRef.current;
    const group = groupRef.current;
    if (!ready || !L || !map || !group) return;
    group.clearLayers();
    const root = rootRef.current;
    if (root) root.dataset.drawnA = root.dataset.drawnB = "0";
    if (!layers) {
      if (fittedCase.current) {
        map.fitBounds(JUJUY_VIEW_BOUNDS);
        fittedCase.current = null;
      }
      return;
    }
    if (!geo || geo.caseId !== layers.caseId) return;
    L.geoJSON(geo.data.basin, {
      style: { color: COLORS.basin, weight: 1, opacity: 0.35, fillColor: COLORS.basin, fillOpacity: 0.08 },
      interactive: false,
    }).addTo(group);
    const aoi: GeoJSONLayer = L.geoJSON(geo.data.aoi, {
      style: { color: COLORS.aoi, weight: 1.5, dashArray: "2 4", fill: false },
      interactive: false,
    }).addTo(group);
    if (mode !== "despues") {
      const la = L.geoJSON(geo.data.a, { style: { color: COLORS.a, weight: 1, fillColor: COLORS.a, fillOpacity: 0.6 } })
        .bindTooltip(`Agua detectada ${layers.labelA}`)
        .addTo(group);
      if (root) root.dataset.drawnA = String(la.getLayers().length);
    }
    if (mode !== "antes") {
      const lb = L.geoJSON(geo.data.b, { style: { color: COLORS.b, weight: 1, fillColor: COLORS.b, fillOpacity: mode === "ambos" ? 0.8 : 0.6 } })
        .bindTooltip(`Agua detectada ${layers.labelB}`)
        .addTo(group);
      if (root) root.dataset.drawnB = String(lb.getLayers().length);
    }
    if (fittedCase.current !== layers.caseId) {
      map.fitBounds(aoi.getBounds().pad(0.35), { padding: [16, 16] });
      fittedCase.current = layers.caseId;
    }
  }, [ready, geo, layers, mode]);

  // 6) Puntos de agua: vista general y modo «Agua». Tamaño = superficie visible (NO volumen).
  useEffect(() => {
    const L = LRef.current;
    const map = mapRef.current;
    const group = overviewGroupRef.current;
    if (!ready || !L || !map || !group) return;
    group.clearLayers();
    if (!overview || overview.length === 0) return;
    const show = baseMode === "agua" || !layers;
    if (!show) return;
    let cancelled = false;
    const sorted = [...overview].sort((a, b) => b.areaKm2 - a.areaKm2);
    Promise.all(
      sorted.map((o) =>
        loadGeo(o.aoiFile).then((g) => {
          const b = L.geoJSON(g).getBounds();
          return { o, center: b.getCenter(), size: Math.round(22 + Math.sqrt(Math.max(o.areaKm2, 1)) * 2.6) };
        }),
      ),
    )
      .then((items) => {
        if (cancelled) return;
        for (const [i, { o, center, size }] of items.entries()) {
          const icon = L.divIcon({
            className: "water-pin-wrap",
            html: `<div class="water-pin" style="--s:${size}px">
              <span class="water-pin__pulse"></span>
              <span class="water-pin__dot"></span>
              <span class="water-pin__label"><strong>${i + 1}. ${escapeHtml(o.name)}</strong><span>${nf.format(o.areaKm2)} km² de superficie visible</span></span>
            </div>`,
            iconSize: [0, 0],
            iconAnchor: [0, 0],
          });
          L.marker(center, { icon, keyboard: true, title: `${o.name} — ver comparación`, zIndexOffset: 1000 })
            .on("click", () => onSelect?.(o.caseId))
            .addTo(group);
        }
        if (rootRef.current) rootRef.current.dataset.waterPins = String(items.length);
      })
      .catch(() => {
        /* si falla un AOI, el resto del mapa sigue funcionando */
      });
    return () => {
      cancelled = true;
    };
  }, [ready, overview, layers, baseMode, onSelect]);

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
            : baseMode === "fisico" && tileState === "sin-conexion"
              ? "Mapa físico no disponible (sin internet). El mapa político y los datos siguen funcionando."
              : null;

  const sortedOverview = overview ? [...overview].sort((a, b) => b.areaKm2 - a.areaKm2) : [];

  return (
    <div
      ref={rootRef}
      className="relative h-full w-full"
      data-testid="map"
      data-basemap={baseMode}
      data-basemap-status={baseState}
      data-osm={tileState}
      data-geo={loadingGeo ? "cargando" : geoError ? "error" : layers ? "listo" : "sin-caso"}
    >
      <div ref={containerRef} className="h-full w-full bg-[#f8fafc]" aria-label="Mapa de Jujuy" />

      {!layers && overview && (
        <div className="pointer-events-none absolute left-3 top-3 z-[900] max-w-[16rem] rounded-xl border border-white/60 bg-white/90 px-3 py-2 shadow-lg backdrop-blur">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-brand-secondary-ink">Jujuy · vista general</p>
          <p className="mt-0.5 text-sm font-semibold leading-tight text-brand-ink">{overview.length} cuerpos de agua monitoreados</p>
          <p className="mt-0.5 text-[11px] leading-snug text-slate-500">Elegí un punto del mapa o un caso para comparar dos fechas reales.</p>
        </div>
      )}

      {message && (
        <div role="status" className="pointer-events-none absolute left-1/2 top-3 z-[1000] w-max max-w-[80%] -translate-x-1/2 rounded bg-white/95 px-3 py-1 text-center text-sm text-slate-700 shadow">
          {message}
        </div>
      )}

      <div role="group" aria-label="Mapa base" className="absolute right-2 top-2 z-[1000] flex overflow-hidden rounded-lg border border-white/70 bg-white/95 text-xs shadow-lg backdrop-blur">
        {(
          [
            ["politico", "Político", "Fondo blanco con límites IGN (sin internet)"],
            ["fisico", "Físico", "Relieve OpenTopoMap (requiere internet)"],
            ["agua", "Agua", "Puntos por superficie visible (no volumen)"],
          ] as const
        ).map(([m, label, title]) => (
          <button
            key={m}
            type="button"
            aria-pressed={baseMode === m}
            onClick={() => {
              setBaseMode(m);
              if (m !== "fisico") setTileState("inactivo");
            }}
            className={`min-h-9 px-3 py-1.5 font-medium transition ${baseMode === m ? "bg-brand-primary text-white shadow-inner" : "text-slate-700 hover:bg-slate-100"}`}
            title={title}
          >
            {label}
          </button>
        ))}
      </div>

      {layers && (
        <button
          type="button"
          onClick={() => onSelect?.(null)}
          className="absolute bottom-6 right-2 z-[1000] min-h-9 rounded-lg border border-white/70 bg-white/95 px-3 py-1.5 text-xs font-medium text-brand-primary shadow-lg backdrop-blur hover:bg-white"
        >
          ← Ver todo Jujuy
        </button>
      )}

      {(layers || (baseMode === "agua" && overview)) && (
        <details
          open={legendOpen}
          onToggle={(e) => setLegendOpen((e.currentTarget as HTMLDetailsElement).open)}
          className="absolute bottom-[4.5rem] left-2 z-[1000] max-w-[17rem] rounded-lg border border-white/60 bg-white/95 p-2 text-xs text-slate-700 shadow-lg backdrop-blur md:bottom-6"
          data-testid="legend"
        >
          <summary className="min-h-6 cursor-pointer select-none font-semibold text-slate-900">Referencias</summary>

          {baseMode === "agua" && sortedOverview.length > 0 && (
            <div className="mb-2 rounded bg-brand-bg p-1.5" data-testid="water-ranking">
              <p className="font-semibold text-brand-ink">Mayor superficie de agua visible</p>
              {sortedOverview.map((o, i) => (
                <div key={o.caseId} className="flex items-baseline justify-between gap-2 py-0.5 text-[11px]">
                  <span className="truncate">
                    {i + 1}. {o.name}
                  </span>
                  <span className="shrink-0 font-medium tabular-nums">{nf.format(o.areaKm2)} km²</span>
                </div>
              ))}
              <p className="mt-1 text-[10px] leading-snug text-brand-muted">Superficie máxima observada (MNDWI). No es volumen ni caudal.</p>
            </div>
          )}

          {baseMode === "agua" && <LegendItem color={COLORS.water} label="Punto: cuerpo de agua (tamaño = superficie visible)" fill />}
          {layers && mode !== "despues" && <LegendItem color={COLORS.a} label={`Agua detectada ${layers.labelA} (MNDWI)`} fill />}
          {layers && mode !== "antes" && <LegendItem color={COLORS.b} label={`Agua detectada ${layers.labelB} (MNDWI)`} fill />}
          {layers && mode === "ambos" && <p className="mt-1 text-[11px] text-slate-600">Lo que se ve en azul es agua detectada solo en la primera fecha.</p>}
          {layers && <LegendItem color={COLORS.basin} label="Cuenca de aporte modelada (no oficial; alejar para verla completa)" fill />}
          {layers && <LegendItem color={COLORS.aoi} label="Contorno cartográfico OSM (referencia, no medición)" dashed />}
          <LegendItem color={baseMode === "agua" ? "#38bdf8" : COLORS.province} label="Límite provincial y departamentos (IGN)" />
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

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
