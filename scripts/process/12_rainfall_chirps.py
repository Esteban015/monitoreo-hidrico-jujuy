"""Fase 3 — Precipitación mensual CHIRPS v3.0 (D-05 revisada: mensual, no pentadal).

- Mes analizado por fecha de imagen: el último mes calendario COMPLETO anterior a la fecha (no se usan meses
  incompletos). NO es un acumulado móvil de 30/60/90 días.
- Lectura por ventana de COG global mensual; UNA ventana cubre ambas cuencas (un pedido por archivo).
- Presupuesto: MAX_READS lecturas y MAX_SECONDS segundos; al agotarse se detiene y se documenta.
- Referencia: mismo mes calendario en un período FIJO de 30 años previos al año analizado (1995–2024 para 2025).
  Si hay menos de MIN_REF_YEARS años, la anomalía queda en null.
- Media areal sobre la "cuenca de aporte modelada": peso de cada celda = fracción de la celda dentro de la
  cuenca (supermuestreo 10x10) × cos(latitud).
Salida: data/derived/rainfall_metrics.json
"""
import json
import math
import os
import re
import sys
import time
from datetime import date
from pathlib import Path

os.environ.setdefault("GDAL_DISABLE_READDIR_ON_OPEN", "EMPTY_DIR")
os.environ.setdefault("GDAL_HTTP_USERAGENT", "cuencas-jujuy-hackathon-exploracion/0.1")
os.environ.setdefault("GDAL_HTTP_TIMEOUT", "150")
os.environ.setdefault("GDAL_HTTP_MAX_RETRY", "1")
os.environ.setdefault("GDAL_HTTP_RETRY_DELAY", "5")

import numpy as np
import rasterio
from rasterio.features import geometry_mask
from rasterio.transform import Affine
from rasterio.windows import from_bounds

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / "explore"))
from common import http, log, now_utc  # noqa: E402

from cache import CACHE, Budget, cache_get, cache_put, fetch_with_retry  # noqa: E402
from lib import last_complete_month  # noqa: E402

ROOT = HERE.parents[1]
OUT = ROOT / "data" / "derived"
BASES = ["https://data.chc.ucsb.edu/products/CHIRPS/v3.0/monthly/global/cogs/",
         "https://data.chc.ucsb.edu/products/CHIRPS/v3.0/monthly/cogs/"]
MAX_READS, MAX_SECONDS, RETRIES = 93, 1500, 1
MIN_REF_YEARS = 10
FILL = -9999.0
OBS = {"laguna-pozuelos": ["2025-05-04", "2025-09-13"], "dique-las-maderas": ["2025-05-29", "2025-10-03"]}


def listing():
    p = CACHE / "chirps" / "monthly_listing.json"
    p.parent.mkdir(parents=True, exist_ok=True)
    if p.exists():
        return json.loads(p.read_text(encoding="utf-8"))
    for base in BASES:
        for attempt in range(2):
            s, b = http(base, timeout=180)
            if s == 200:
                files = sorted(set(re.findall(r"chirps-v3\.0\.\d{4}\.\d{2}\.cog", b.decode("utf-8", "replace"))))
                if files:
                    d = {"base": base, "files": files, "listed_at": now_utc()}
                    p.write_text(json.dumps(d), encoding="utf-8")
                    return d
                break
            time.sleep(10 * (attempt + 1))
    return None


basins = {cid: json.loads((OUT / "geometries" / f"{cid}_basin_hydrobasins_l10.geojson").read_text(encoding="utf-8")) for cid in OBS}
cases_meta = {c["case_id"]: c for c in json.loads((OUT / "cases.json").read_text(encoding="utf-8"))["cases"]}
allx = [c[0] for fc in basins.values() for f in fc["features"] for r in f["geometry"]["coordinates"] for c in r]
ally = [c[1] for fc in basins.values() for f in fc["features"] for r in f["geometry"]["coordinates"] for c in r]
BBOX = (min(allx) - 0.1, min(ally) - 0.1, max(allx) + 0.1, max(ally) + 0.1)

result = {"generated_at": now_utc(), "generator": "scripts/process/12_rainfall_chirps.py",
          "source": "CHIRPS v3.0 mensual (Climate Hazards Center, UCSB)", "unit": "mm/mes", "resolution_deg": None,
          "unit_evidence": "atributo units='mm/month', _FillValue=-9999, time_step='month' de la variable precip en "
                           "v3.0/monthly/global/netcdf/chirps-v3.0.monthly.nc (leído 2026-11-22; los COG no declaran unidad)",
          "budget": {"max_reads": MAX_READS, "max_seconds": MAX_SECONDS, "retries_per_read": RETRIES},
          "status": None, "reads": [], "observations": [], "warnings": [
              "CHIRPS es un producto ESTIMADO (satélite + estaciones), no una medición de pluviómetro.",
              "Se usa el último mes calendario completo antes de cada imagen; no equivale a un acumulado móvil de 30, 60 o 90 días."]}
lst = listing()
if lst is None:
    result["status"] = "bloqueado"
    result["warnings"].append("No se pudo listar el directorio mensual de CHIRPS v3.0 (ver http_log.jsonl).")
    (OUT / "rainfall_metrics.json").write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    raise SystemExit("Listado CHIRPS mensual no disponible: rama detenida y documentada.")
base, files = lst["base"], set(lst["files"])
result["listing"] = {"base": base, "n_files": len(files), "first": min(files), "last": max(files), "listed_at": lst["listed_at"]}

targets = {}  # (cid, obs_date) -> (y, m)
for cid, ds_ in OBS.items():
    for d in ds_:
        targets[(cid, d)] = last_complete_month(date.fromisoformat(d))
months = sorted({ym for ym in targets.values()})
current_year = max(y for y, _ in months)
# Período de referencia FIJO (no depende del estado del caché ni del presupuesto): 30 años previos al año analizado.
REF_N_YEARS = 30
REF_YEARS = list(range(current_year - 1, current_year - 1 - REF_N_YEARS, -1))
plan = [(y, m) for (y, m) in months]
for y in REF_YEARS:
    plan += [(y, m) for (_, m) in sorted({(0, m) for _, m in months})]

budget = Budget(MAX_READS, MAX_SECONDS)
grid = {}  # (y, m) -> array window
win_transform = None
for (y, m) in plan:
    fname = f"chirps-v3.0.{y}.{m:02d}.cog"
    if fname not in files:
        result["reads"].append({"file": fname, "status": "no_existe_en_listado"})
        continue
    c = cache_get("chirps", fname)
    if c is not None:
        grid[(y, m)] = c[0]
        win_transform = Affine(*c[1]["window_transform"][:6])
        result["resolution_deg"] = c[1]["res"]
        result["reads"].append({"file": fname, "status": "cache"})
        continue
    if budget.exhausted():
        result["reads"].append({"file": fname, "status": "omitido_presupuesto"})
        continue

    def _read(fname=fname):
        with rasterio.open("/vsicurl/" + base + fname) as ds:
            w = from_bounds(*BBOX, ds.transform).round_offsets().round_lengths()
            a = ds.read(1, window=w).astype("float32")
            if a.shape != (int(w.height), int(w.width)):
                raise IOError(f"lectura incompleta {a.shape}")
            return a, ds.window_transform(w), ds.res

    t0 = time.time()
    out, errs = fetch_with_retry(_read, retries=RETRIES, budget=budget, wait_s=5)
    secs = round(time.time() - t0, 1)
    log({"url": base + fname, "status": "rasterio-ok" if out else "rasterio-error", "secs": secs, "errors": errs})
    if out is None:
        result["reads"].append({"file": fname, "status": "fallo", "secs": secs, "errors": errs})
        print("FALLO", fname, secs, errs[-1:] if errs else "")
        continue
    arr, wt, res = out
    win_transform, result["resolution_deg"] = wt, list(res)
    cache_put("chirps", fname, arr, {"file": base + fname, "window_transform": list(wt)[:6], "res": list(res), "read_at": now_utc()})
    grid[(y, m)] = arr
    result["reads"].append({"file": fname, "status": "red", "secs": secs})
    print(f"{fname} ok {secs}s  lecturas={budget.requests} t={budget.elapsed()}s")

result["budget"].update({"used_reads": budget.requests, "elapsed_s": budget.elapsed(), "exhausted": budget.exhausted()})

# Pesos areales por cuenca
weights, fractions = {}, {}
if win_transform is not None and grid:
    shp = next(iter(grid.values())).shape
    S = 10
    fine_t = win_transform * Affine.scale(1 / S)
    for cid, fc in basins.items():
        fine = ~geometry_mask([f["geometry"] for f in fc["features"]], out_shape=(shp[0] * S, shp[1] * S), transform=fine_t)
        frac = fine.reshape(shp[0], S, shp[1], S).mean(axis=(1, 3))
        lat = np.array([(win_transform * (0.5, r + 0.5))[1] for r in range(shp[0])])
        fractions[cid] = frac
        weights[cid] = frac * np.cos(np.radians(lat))[:, None]


def areal_mean(cid, arr):
    w = weights[cid]
    sel = w > 0
    if (arr[sel] == FILL).any() or not np.isfinite(arr[sel]).all():
        return None
    return float((arr[sel] * w[sel]).sum() / w[sel].sum())


for (cid, d), (y, m) in targets.items():
    w = weights.get(cid)
    obs = {"case_id": cid, "image_date": d, "month": f"{y}-{m:02d}", "period": f"{y}-{m:02d}-01 / fin de mes",
           "unit": "mm/mes", "kind": "estimacion", "method": "media areal ponderada (fracción de celda × cos φ) sobre la cuenca de aporte modelada",
           "basin_cells_with_weight": int((w > 0).sum()) if w is not None else None,
           "basin_cells_equivalent": round(float(fractions[cid].sum()), 2) if w is not None else None,
           "value_mm": None, "reference": None, "anomaly_pct": None, "percentile_in_reference": None,
           "status": "incompleto", "warnings": list(cases_meta[cid]["warnings"])}
    if (y, m) in grid and w is not None:
        v = areal_mean(cid, grid[(y, m)])
        obs["value_mm"] = None if v is None else round(v, 2)
        ref_years = sorted(yy for (yy, mm) in grid if mm == m and yy in REF_YEARS)
        ref_vals = [areal_mean(cid, grid[(yy, m)]) for yy in ref_years]
        ref = [(yy, vv) for yy, vv in zip(ref_years, ref_vals) if vv is not None]
        if ref:
            vals = [vv for _, vv in ref]
            obs["reference"] = {"years": [yy for yy, _ in ref], "n_years": len(ref), "first_year": ref[0][0], "last_year": ref[-1][0],
                                "mean_mm": round(float(np.mean(vals)), 2), "median_mm": round(float(np.median(vals)), 2),
                                "min_mm": round(min(vals), 2), "max_mm": round(max(vals), 2)}
        if v is not None and ref and len(ref) >= MIN_REF_YEARS:
            mean = float(np.mean([vv for _, vv in ref]))
            obs["anomaly_pct"] = None if mean == 0 else round((v - mean) / mean * 100, 1)
            obs["percentile_in_reference"] = round(100 * sum(vv < v for _, vv in ref) / len(ref), 1)
            obs["status"] = "completo"
        elif v is not None:
            obs["status"] = "sin_referencia_suficiente"
            obs["warnings"].append(f"Referencia con {len(ref)} años (< {MIN_REF_YEARS}): no se calcula anomalía.")
        if obs["reference"] and obs["reference"]["n_years"] < REF_N_YEARS:
            obs["warnings"].append(f"Referencia de {obs['reference']['n_years']} años ({obs['reference']['first_year']}–{obs['reference']['last_year']}), "
                                   "incompleta respecto del período fijo de 30 años (lecturas fallidas o presupuesto agotado).")
        if m in (5, 6, 7, 8, 9) and obs["reference"] and obs["reference"]["mean_mm"] < 10:
            obs["warnings"].append("Mes de estación seca con lluvia media muy baja: la anomalía porcentual es inestable y poco informativa.")
    result["observations"].append(obs)
    print(cid, d, "->", obs["month"], obs["value_mm"], "mm; ref", (obs["reference"] or {}).get("mean_mm"), "n=", (obs["reference"] or {}).get("n_years"),
          "anom", obs["anomaly_pct"], obs["status"])

st = {o["status"] for o in result["observations"]}
result["status"] = "completo" if st == {"completo"} else ("parcial" if "completo" in st or "sin_referencia_suficiente" in st else "bloqueado")
(OUT / "rainfall_metrics.json").write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
