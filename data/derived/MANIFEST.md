# MANIFEST — Datos procesados (Fase 3)

Generado el 2026-11-22 con `scripts/process/10_geometries.py`, `11_water.py` y `12_rainfall_chirps.py` (en ese orden).
Validado con `tests/python/test_outputs.py`. Todos los valores provienen de datos reales; no hay datos sintéticos.
Convención de carpeta: `data/derived/` (documentada desde la Fase 0; equivale al `data/processed/` sugerido).

## Archivos
| Archivo | Contenido | Tamaño aprox. |
|---|---|---|
| `cases.json` | Casos testigo, referencias OSM, cuenca modelada (ID de salida, área, validez) y advertencias | 2,3 KB |
| `water_metrics.json` | Por escena: ID, tesela, sistema de coordenadas, radiometría, píxeles, cobertura, nubosidad efectiva, área de agua (MNDWI, NDWI, clase SCL 6), estado. Por caso: comparación A→B y sensibilidad al umbral | 18 KB |
| `rainfall_metrics.json` | CHIRPS v3.0 mensual: lecturas, mes analizado, media areal, referencia 1995–2024, anomalía, estado | 15 KB |
| `geometries/<caso>_aoi_osm.geojson` | Región cartográfica de referencia (OSM, ODbL) | 5–47 KB |
| `geometries/<caso>_basin_hydrobasins_l10.geojson` | **Cuenca de aporte modelada** (HydroBASINS nivel 10; 1 o 31 unidades con su HYBAS_ID) | 4–97 KB |
| `geometries/<caso>_water_mndwi_<fecha>.geojson` | Agua detectada (MNDWI > 0) vectorizada a píxeles de 20 m | 44–149 KB |
| `qa/geometries_report.json` | Validez de anillos, áreas LAEA y chequeo aguas abajo del muro de Las Maderas | 1,7 KB |
| `qa/quicklooks/<caso>_<fecha>.png` | Falso color B11/B08/B03; borde del agua detectada en cian y de la región de análisis en amarillo | 0,16–0,78 MB |

## Resumen de métricas de agua (estimación, km²)
Región de análisis constante por caso: polígono OSM ampliado 500 m, sin otros cuerpos de agua OSM. Grilla de 20 m. Comparación sobre píxeles válidos en ambas fechas.

| Caso | Fecha | Escena | Cobertura % | Nube AOI % | MNDWI > 0 | NDWI > 0 | SCL clase 6 |
|---|---|---|---|---|---|---|---|
| Pozuelos | 2025-05-04 | S2C_MSIL2A_20250504T142811_R053_T19KHR_20250504T193719 | 100 | 0,023 | 81,43 | 77,72 | 82,77 |
| Pozuelos | 2025-09-13 | S2A_MSIL2A_20250913T142801_R053_T19KHR_20250913T211118 | 100 | 0,012 | 37,55 | 24,50 | 61,04 |
| Las Maderas | 2025-05-29 | S2B_MSIL2A_20250529T142719_R053_T19JHN_20250529T180713 | 100 | 0,000 | 8,72 | 8,76 | 8,72 |
| Las Maderas | 2025-10-03 | S2A_MSIL2A_20251003T142811_R053_T19JHN_20251003T192715 | 100 | 0,000 | 7,14 | 7,43 | 7,58 |

| Caso | MNDWI Δ km² (Δ %) | NDWI Δ km² (Δ %) | MNDWI con umbral −0,1 / 0 / +0,1 | SCL 6 Δ % |
|---|---|---|---|---|
| Pozuelos | −43,88 (−53,9 %) | −53,22 (−68,5 %) | −47,5 % / −53,9 % / −55,3 % | −26,3 % |
| Las Maderas | −1,58 (−18,1 %) | −1,33 (−15,2 %) | −17,3 % / −18,1 % / −18,9 % | −13,0 % |

Notas:
- La columna SCL clase 6 usa la máscara válida de cada fecha, no la común. Es una referencia cruzada (clasificación de ESA), no la medida principal.
- Pozuelos, septiembre: hay una franja amplia de barro o agua muy somera al noreste (ver quicklook). MNDWI y NDWI la excluyen y SCL la incluye. **La incertidumbre de la variación es grande: entre −26 % y −68 % según el método.**

## Resumen de precipitación (CHIRPS v3.0 mensual, estimación, mm/mes)
Media areal sobre la cuenca de aporte modelada. Referencia: mismo mes en 1995–2024 (30 años).

| Caso | Imagen | Mes analizado | Valor | Media ref. | Mediana ref. | Anomalía | Percentil |
|---|---|---|---|---|---|---|---|
| Pozuelos | 2025-05-04 | 2025-04 | 14,67 | 9,49 | 9,79 | +54,6 % | 83,3 |
| Pozuelos | 2025-09-13 | 2025-08 | 0,19 | 0,48 | 0,34 | −60,3 % (*) | 43,3 |
| Las Maderas (**) | 2025-05-29 | 2025-04 | 46,18 | 50,46 | 41,32 | −8,5 % | 60,0 |
| Las Maderas (**) | 2025-10-03 | 2025-09 | 6,18 | 7,65 | 5,93 | −19,1 % (*) | 50,0 |

- (*) Mes seco con lluvia media < 10 mm: la anomalía porcentual es inestable. El percentil es más informativo.
- (**) La cuenca modelada de Las Maderas incluye unos 4,5 km de cauce aguas abajo del muro. Pesa unas 8,2 celdas equivalentes de CHIRPS (19 con algún peso). No sirve para conclusiones hidrológicas definitivas.

Celdas de Pozuelos: 137,6 equivalentes (173 con algún peso).

## Trazabilidad de entradas (caché local, no versionado)
- `data/raw/cache/s2/*.npz` y `.json`: ventanas de bandas por escena con sha256 (B03 y B08 a 10 m, B11 y SCL a 20 m).
- `data/raw/cache/stac/`: ítems STAC y radiometría extraída de `MTD_MSIL2A.xml`.
- `data/raw/cache/chirps/`: ventanas mensuales y listado del directorio (550 archivos, de 1981-01 a 2026-10).
- `data/raw/cache/osm/`: cuerpos de agua vecinos y cauces cerca del muro.
- Tamaño de la caché: unos 14 MB. Se puede regenerar con los scripts.
