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

export interface ClimateMonth {
  month: string;
  precip_mm: number | null;
  temp_c: number | null;
  precip_3m_mm: number;
  temp_3m_c: number;
}

export interface ClimateObservation {
  date: string;
  window_month: string;
  area_km2: number;
  precip_3m_mm: number;
  temp_3m_c: number;
}

export interface ClimateCase {
  name: string;
  lat: number;
  lon: number;
  elevation_m: number | null;
  first_month: string;
  last_month: string;
  months: ClimateMonth[];
  observations: ClimateObservation[];
}

export interface ClimateFile {
  generated_at: string;
  generator: string;
  source: string;
  source_url: string;
  license: string;
  kind: string;
  real: boolean;
  unit: Record<string, string>;
  cases: Record<string, ClimateCase>;
}

export interface ModelGrid {
  precip_3m_mm: number[];
  temp_3m_c: number[];
  area_km2: number[][];
}

export interface WaterModelCase {
  name: string;
  synthetic: boolean;
  baseline: {
    month: string;
    precip_3m_mm: number;
    temp_3m_c: number;
    last_observed_area_km2: number;
    last_observed_date: string;
    latest_climate: { month: string; precip_3m_mm: number; temp_3m_c: number };
  };
  ranges: { precip_3m_mm: [number, number]; temp_3m_c: [number, number] };
  grid: ModelGrid;
  training: {
    samples: number;
    synthetic: boolean;
    r2_synthetic_test: number;
    mae_synthetic_test_km2: number;
    calibration: { date: string; observed_km2: number; model_km2: number; precip_3m_mm: number; temp_3m_c: number }[];
  };
  response: {
    alpha_precip_per_100mm: number;
    beta_temp_per_5c: number;
    area_ref_km2: number;
    p_ref_mm: number;
    t_ref_c: number;
  };
  reference_grid_area_km2: number;
}

export interface WaterModelFile {
  generated_at: string;
  generator: string;
  synthetic: boolean;
  label: string;
  algorithm: string;
  sklearn_version: string;
  features: { name: string; label: string; unit: string }[];
  target: { name: string; label: string; unit: string };
  disclaimer: string;
  assumptions: string[];
  cases: Record<string, WaterModelCase>;
}

export interface DataBundle {
  cases: CasesFile;
  water: WaterFile;
  rainfall: RainfallFile;
  /** Opcional (D-34): serie climática estimada (Open-Meteo, punto). null si falta o es inválida. */
  climate?: ClimateFile | null;
  /** Opcional (D-34): modelo DEMOSTRATIVO sintético. null si falta o no está rotulado como sintético. */
  model?: WaterModelFile | null;
  /** Avisos de carga de los datasets opcionales. */
  notes?: string[];
}
