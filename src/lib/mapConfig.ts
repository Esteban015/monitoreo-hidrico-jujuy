// Configuración del mapa. Sin imports de valores (testeable con node --test).

// Encuadre APROXIMADO inicial (antes de cargar el contorno real del IGN). No es un límite ni se usa en cálculos
// (DECISIONS.md D-12). [[sur, oeste], [norte, este]]
export const JUJUY_VIEW_BOUNDS: [[number, number], [number, number]] = [
  [-24.6, -67.3],
  [-21.7, -64.1],
];

// Mapa base local: límites reales del IGN publicados en public/data/basemap/.
export const BASEMAP_FILES = {
  provincia: "basemap/jujuy_provincia_ign.geojson",
  departamentos: "basemap/jujuy_departamentos_ign.geojson",
} as const;

export const ATTRIBUTION_LOCAL =
  "Límites: IGN Argentina · Cuencas: HydroBASINS (Lehner &amp; Grill 2013) · Agua: Copernicus Sentinel-2 (procesado) · Contornos de referencia: © OpenStreetMap (ODbL)";

// Relieve online (OpenTopoMap, CC-BY-SA). Sólo se pide al elegir «Físico».
export const PHYSICAL_TILES = {
  url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
  attribution:
    'Mapa físico: © <a href="https://opentopomap.org">OpenTopoMap</a> (CC-BY-SA) · datos © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
} as const;

export type BaseMapMode = "politico" | "fisico" | "agua";
