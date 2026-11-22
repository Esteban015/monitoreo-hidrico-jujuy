// Tipos que reflejan el esquema REAL de data/derived/*.json (Fase 3). Solo los campos que usa el frontend.

export interface CaseInfo {
  case_id: string;
  name: string;
  ecoregion: string;
  kind: string;
  aoi: { file: string; source: string; ref: string; role: string };
  basin: {
    file: string;
    label: string;
    source: string;
    outlet_hybas_id: number;
    area_km2: number;
    area_method: string;
    official: boolean;
    geometry_valid: boolean;
  };
  warnings: string[];
}

export interface CasesFile {
  generated_at: string;
  generator: string;
  cases: CaseInfo[];
}

export interface WaterIndexResult {
  threshold: number;
  pixels: number;
  area_km2: number;
  pixels_common_mask: number;
  area_km2_common_mask: number;
}

export interface SceneMetrics {
  case_id: string;
  date: string;
  datetime: string;
  scene_id: string;
  source: string;
  stac_item: string;
  mgrs_tile: string;
  crs: string;
  processing_baseline: string;
  cloud_cover_scene_pct: number;
  region: { pixels: number; area_km2: number; buffer_m: number };
  pixels: { region: number; with_data: number; valid: number; valid_common: number };
  coverage_pct: number;
  cloud_effective_pct: number;
  water: { MNDWI: WaterIndexResult; NDWI: WaterIndexResult };
  scl_water_class: { pixels: number; area_km2: number; note: string };
  water_touching_region_edge_pct: number;
  unit: string;
  kind: string;
  files: { water_geojson: string; quicklook: string };
  status: string;
  warnings: string[];
}

export interface IndexComparison {
  threshold: number;
  area_a_km2: number;
  area_b_km2: number;
  abs_diff_km2: number;
  pct_change: number | null;
  formula?: string;
}

export interface Comparison {
  case_id: string;
  date_a: string;
  date_b: string;
  scene_a: string;
  scene_b: string;
  common_valid_pixels: number;
  common_valid_pct_of_region: number;
  unit: string;
  kind: string;
  MNDWI: IndexComparison;
  NDWI: IndexComparison;
  MNDWI_sensitivity: IndexComparison[];
  status: string;
  warnings: string[];
}

export interface WaterFile {
  generated_at: string;
  generator: string;
  method: Record<string, unknown> & { water_rule: string; grid_m: number; area: string; region: string };
  scenes: SceneMetrics[];
  comparisons: Comparison[];
}

export interface RainReference {
  years: number[];
  n_years: number;
  first_year: number;
  last_year: number;
  mean_mm: number;
  median_mm: number;
  min_mm: number;
  max_mm: number;
}

export interface RainObservation {
  case_id: string;
  image_date: string;
  month: string;
  period: string;
  unit: string;
  kind: string;
  method: string;
  basin_cells_with_weight: number | null;
  basin_cells_equivalent: number | null;
  value_mm: number | null;
  reference: RainReference | null;
  anomaly_pct: number | null;
  percentile_in_reference: number | null;
  status: string;
  warnings: string[];
}

export interface RainfallFile {
  generated_at: string;
  generator: string;
  source: string;
  unit: string;
  resolution_deg: number[] | null;
  unit_evidence: string;
  status: string;
  observations: RainObservation[];
  warnings: string[];
}

export interface DataBundle {
  cases: CasesFile;
  water: WaterFile;
  rainfall: RainfallFile;
}
