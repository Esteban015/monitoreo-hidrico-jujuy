# scripts — Preprocesamiento offline

Scripts Python independientes de la app (ver DECISIONS.md D-03 y D-16). Leen de fuentes públicas documentadas y escriben en `data/derived/`.
Sin credenciales: el token SAS de Planetary Computer es anónimo y no se guarda.

## Entorno
```bash
python -m venv scripts/.venv
scripts/.venv/Scripts/python -m pip install -r scripts/requirements.txt
```

## Fase 2 — exploración (`scripts/explore/`)
Ver `scripts/explore/README.md`. Generan `data/raw/exploration/` (requerido por la Fase 3).

## Fase 3 — procesamiento (`scripts/process/`)
| Orden | Script | Salida |
|---|---|---|
| 1 | `10_geometries.py` | `data/derived/cases.json`, `geometries/*_aoi_osm.geojson`, `geometries/*_basin_hydrobasins_l10.geojson`, `qa/geometries_report.json` |
| 2 | `11_water.py` | `data/derived/water_metrics.json`, `geometries/*_water_mndwi_<fecha>.geojson`, `qa/quicklooks/*.png` |
| 3 | `12_rainfall_chirps.py` | `data/derived/rainfall_metrics.json` |

`lib.py` contiene funciones puras (índices, radiometría, SCL, áreas, geometría, fechas). `cache.py` contiene la caché con sha256, los reintentos y el presupuesto de pedidos.

```bash
cd scripts/process
../.venv/Scripts/python 10_geometries.py
../.venv/Scripts/python 11_water.py
../.venv/Scripts/python 12_rainfall_chirps.py
```
Tiempos observados (2026-11-22), con la caché vacía: `12_rainfall_chirps.py` tardó 486 s (93 lecturas). `11_water.py` tardó varios minutos, sin cronometrar. Con la caché llena, ambos terminan en segundos.

## Pruebas
```bash
scripts/.venv/Scripts/python -m unittest discover -s tests/python -v
```
