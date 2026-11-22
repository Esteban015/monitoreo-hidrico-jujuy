# scripts/explore — Fase 2 (exploración de fuentes)

Scripts **exploratorios**: verifican acceso y metadatos reales. No calculan NDWI/MNDWI ni superficies.
Salidas en `data/raw/exploration/` (no versionado). Resultados resumidos en `data/raw/MANIFEST.md`.

| Script | Qué hace | Red | Tiempo observado (2026-11-22) |
|---|---|---|---|
| `01_osm_cases.py` | Geometría OSM del lago y del embalse + muro de la presa | Overpass | < 1 min |
| `02_s2_search.py` | Busca escenas S2 L2A (nubosidad de escena < 20 %) en MPC y CDSE, 4 ventanas | STAC MPC + CDSE | ~15 min (CDSE lento) |
| `03_s2_access.py` | Token SAS anónimo MPC, lectura por ventana de SCL → cobertura y nubosidad sobre el AOI; prueba B03/B08/B11; prueba CDSE sin credenciales | MPC blob + CDSE | ~25 min |
| `04_chirps.py` | CHIRPS v3.0 pentadal COG: listado + lectura por ventana | data.chc.ucsb.edu | ~15 min (lento, HTTP 429) |
| `05_point_apis.py` | NASA POWER y Open-Meteo en un punto (no cuenca) | APIs públicas | < 1 min |
| `06_hydrobasins.py` | HydroBASINS nivel 10: subcuenca que contiene la presa / sumidero endorreico de la laguna + recorrido aguas arriba; sondeo WFS IGN | data.hydrosheds.org, IGN | ~5 min (68 MB) |

## Ejecución
```bash
python -m venv scripts/.venv
scripts/.venv/Scripts/python -m pip install -r scripts/requirements.txt
cd scripts/explore
../.venv/Scripts/python 01_osm_cases.py   # requerido por los demás
../.venv/Scripts/python 02_s2_search.py
../.venv/Scripts/python 03_s2_access.py
../.venv/Scripts/python 04_chirps.py
../.venv/Scripts/python 05_point_apis.py
../.venv/Scripts/python 06_hydrobasins.py
```

## Seguridad
- No se usan credenciales. El token SAS de Planetary Computer es anónimo, se pide en cada ejecución y **no se escribe en disco**; `common.py` elimina la query firmada de las URLs antes de registrar.
- Todos los pedidos HTTP quedan en `data/raw/exploration/http_log.jsonl` (código, bytes, segundos).
