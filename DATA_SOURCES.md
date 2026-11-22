# DATA_SOURCES — Fuentes, metadatos, QA y contingencia

> **Estado (actualizado 2026-11-22, Fase 2):** acceso verificado con scripts reproducibles (`scripts/explore/`). Detalle, cifras y errores HTTP reales en `data/raw/MANIFEST.md`.
> Las licencias marcadas **por verificar** siguen pendientes de confirmar con el texto oficial antes de la demo.

## 1. Fuentes candidatas

| # | Fuente | Producto | Variable | Resolución nominal | Acceso (candidato) | Licencia/condiciones | Estado |
|---|---|---|---|---|---|---|---|
| S1 | Copernicus Sentinel-2 | L2A (reflectancia de superficie) | B03 (verde, 10 m), B08 (NIR, 10 m), B11 (SWIR1, 20 m), SCL (clasificación de escena, 20 m) | 10–20 m; revisita nominal ~5 días | **Planetary Computer STAC + COG por ventana** (CDSE: catálogo sí, descarga 401 sin cuenta) | Política de datos abiertos Copernicus — **por verificar texto de atribución** | **CONFIRMADO** (MPC) |
| P1 | CHIRPS (UCSB Climate Hazards Center) | **CHIRPS v3.0 pentadal final** (COG global; 1981-01 a 2026-10) | Precipitación, **mm/pentad** — **producto estimado** (satélite + estaciones) | 0,05° | HTTP `data.chc.ucsb.edu` (lento, HTTP 429) o GEE | **por verificar** (citar Funk et al.) | **CONFIRMADO con restricción de rendimiento** |
| P2 | NASA POWER | Datos diarios por punto | PRECTOTCORR (mm/día) — MERRA-2 | Gruesa (~0,5°) | API pública | **por verificar** | CONFIRMADO, solo punto (respaldo) |
| P3 | Open-Meteo Historical | Basado en reanálisis | precipitation_sum (mm) | Según modelo (el punto se ajusta a la grilla) | API pública | **por verificar condiciones de uso no comercial / atribución** | CONFIRMADO, solo punto (respaldo) |
| B1 | HydroSHEDS | HydroBASINS v1c, **nivel 10** | Polígonos de cuencas (modelados) | DEM ~15″ | Descarga directa (68 MB SA; nivel 08 timeout) | Libre científico/educativo/comercial con atribución (Lehner & Grill 2013) | **CONFIRMADO con restricciones** |
| B2 | IGN Argentina | Capas SIG (límites, hidrografía) | Cuerpos y líneas de agua continentales (192 capas WFS; **sin capa de cuencas**) | Variable | WFS | **por verificar** | Sin cuencas oficiales |
| G1 | OpenStreetMap | Polígonos de lago y embalse, muro de la presa | Contorno cartográfico (no es medición) | — | Nominatim / Overpass | ODbL 1.0 | **CONFIRMADO** (área de interés) |
| D1 | Copernicus DEM | GLO-30 | Elevación (m) | 30 m | Varias plataformas | **por verificar** | SHOULD (contexto de relieve) |

Notas:
- **CHIRPS y reanálisis no son mediciones directas de pluviómetro**: en la UI se rotulan como "precipitación estimada".
- La máscara de agua derivada de MNDWI es una **estimación** por umbral, no una medición.

## 2. Casos testigo iniciales
| Caso | Ecorregión | Tipo | Riesgos de datos conocidos a verificar |
|---|---|---|---|
| Laguna de los Pozuelos | Puna | Laguna altoandina somera | Agua muy somera, bordes salinos/barro → confusión del umbral; variación estacional fuerte |
| Dique Las Maderas | Valles (Perico) | Embalse | Nubosidad en temporada de lluvias (verano); posible turbidez |

**Coordenadas y polígonos: NO se escriben a mano.** Se obtendrán de HydroBASINS/IGN y de la máscara MNDWI en la Fase 1–2.
Reemplazos si fallan: Dique La Ciénaga, Cuenca del Río Grande, Cuenca de Miraflores (del documento de contexto).

## 3. Estrategia de precálculo
1. **Fase 1:** registrar cada descarga en `data/raw/MANIFEST.md` (URL/endpoint, ID, fecha de descarga, licencia, hash si aplica).
2. **Fase 2:** scripts en `scripts/` generan:
   - `data/derived/<caso>/basin.geojson` — cuenca de aporte.
   - `data/derived/<caso>/water_<AAAA-MM-DD>.geojson` — contorno de agua por fecha.
   - `data/derived/<caso>/summary.json` — métricas + metadatos (esquema §4).
   - (opcional) `data/derived/<caso>/rgb_<fecha>.png` + bounds — overlay visual.
   - **Actualización Fase 3 (D-19):** la estructura implementada es plana. Ver `data/derived/MANIFEST.md` (`cases.json`, `water_metrics.json`, `rainfall_metrics.json`, `geometries/`, `qa/`). Las ventanas de precipitación son **meses calendario completos** (D-05), no 30/60/90 días.
3. Los derivados son pequeños y se versionan; los raw grandes (escenas) **no** se versionan (ignorar en git) — solo su manifiesto.
4. La app copia `data/derived/` a `public/data/` en build.
5. Superficies se calculan en CRS proyectado métrico (UTM zona correspondiente), nunca en grados.

## 4. Metadatos obligatorios (esquema propuesto de `summary.json`)
```jsonc
{
  "case_id": "las-maderas",
  "name": "Dique Las Maderas",
  "synthetic": false,                     // true solo en data/sample/
  "generated_at": "AAAA-MM-DDTHH:MM:SSZ",
  "generator": { "script": "scripts/…", "version": "…", "params": { "index": "MNDWI", "threshold": 0.0, "crs": "EPSG:…" } },
  "basin": { "source": "HydroBASINS", "level": 0, "id": "…", "area_km2": 0, "license": "…" },
  "scenes": [
    {
      "date": "AAAA-MM-DD", "source": "Sentinel-2 L2A", "scene_id": "…",
      "cloud_pct_scene": 0, "cloud_pct_aoi": 0, "resolution_m": 20,
      "water_area_km2": 0, "kind": "estimacion", "access": "GEE|PC|CDSE", "downloaded_at": "…"
    }
  ],
  "comparison": { "date_a": "…", "date_b": "…", "area_change_pct": 0, "formula": "(B - A) / A * 100" },
  "precipitation": {
    "source": "CHIRPS v2.0", "kind": "estimacion", "aggregation": "promedio areal sobre cuenca | punto",
    "reference_period": "AAAA–AAAA",
    "windows": [ { "end_date": "…", "days": 90, "total_mm": 0, "historical_mean_mm": 0, "anomaly_pct": 0, "missing_days": 0 } ]
  },
  "warnings": ["Superficie visible de agua; no representa volumen almacenado ni caudal."]
}
```
(Los `0` y `…` son marcadores de esquema, no valores.)

## 5. Criterios de QA (validador de Fase 2)
| # | Criterio | Regla verificable |
|---|---|---|
| Q1 | Metadatos obligatorios | Todos los campos del esquema presentes y no vacíos; `synthetic` explícito |
| Q2 | Coherencia temporal | `date_a < date_b`; fechas ≤ `generated_at`; ventanas de lluvia terminan en la fecha de la escena; período de referencia no incluye el año evaluado (o se documenta) |
| Q3 | Unidades | Áreas en `km²` (campo `_km2`), lluvia en `mm`, porcentajes en `%`; áreas calculadas en CRS métrico declarado |
| Q4 | Variación porcentual | `area_change_pct` recalculado = `(B−A)/A×100` con tolerancia 0,1; si A = 0 → error, no ∞ |
| Q5 | Rango físico | `0 ≤ water_area_km2 ≤ basin.area_km2`; `0 ≤ cloud_pct ≤ 100`; `total_mm ≥ 0` |
| Q6 | Datos faltantes | `missing_days` reportado; si > 10 % de la ventana → advertencia visible; nunca rellenar con ceros silenciosamente |
| Q7 | Nubosidad | `cloud_pct_aoi` ≤ umbral acordado (propuesta 10 %); si se supera, la escena se descarta o se muestra advertencia |
| Q8 | Resolución satelital / límite de medición | Mostrar `resolution_m`; advertir que cambios menores a ~ (resolución² × píxeles de borde) no son significativos; cuerpos de agua pequeños o angostos (ríos) pueden no detectarse a 20 m |
| Q9 | Distinción de tipo | Cada valor tiene `kind` ∈ {medicion, estimacion, interpretacion} |
| Q10 | Offline | Build estático servido con red desactivada carga todos los datos (ninguna petición a APIs de datos) |
| Q11 | No sintéticos en demo | Ningún archivo con `synthetic: true` cargado en el build de demo, o etiquetado visible si lo está |

## 6. Plan de contingencia
| Falla | Plan B | Plan C |
|---|---|---|
| Sin acceso a GEE | Planetary Computer STAC + procesamiento local | Copernicus Data Space (cuenta) |
| Nubes en todas las fechas de interés en Las Maderas | Ampliar ventana de búsqueda (estación seca, invierno) | Reemplazar por Dique La Ciénaga u otro caso |
| CHIRPS inaccesible | NASA POWER por punto (documentar resolución gruesa) | Open-Meteo Historical |
| HydroBASINS no representa la cuenca de aporte | Otro nivel de HydroBASINS | Capas IGN / buffer documentado como aproximación explícita |
| Sin datos reales a tiempo | Demo con `data/sample/` **etiquetada "DATOS SINTÉTICOS"** + explicación honesta del pipeline | — |
| Sin Internet en la presentación | Build estático local; fondo de mapa vectorial local | Capturas de pantalla del recorrido |
