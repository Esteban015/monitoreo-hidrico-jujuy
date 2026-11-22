"""Paso 3a: CHIRPS v3.0 pentadal (global, COG) — acceso real y lectura por ventana.

Por qué pentadal y no diario: el README oficial de CHIRPS v3 daily indica que el
diario se deriva del pentadal (desagregado con ERA5 o IMERG) y recomienda usar
pentadas o meses cuando sea posible. 30/60/90 días ≈ 6/12/18 pentadas.

Nomenclatura: chirps-v3.0.AAAA.MM.P.cog, P = pentada del mes (1..6; la 6.ª va
del día 26 al fin de mes).

Este script:
1. Lista el directorio de COGs (1 pedido) -> primer/último archivo y conteo.
2. Lee por ventana 2 pentadas recientes sobre el rectángulo de cada AOI
   (ampliado 0,25° para contexto de cuenca) y reporta metadatos y valores.
3. Mide tiempo por lectura para estimar el costo de un promedio histórico.
Pausa de 3 s entre pedidos (el servidor devolvió HTTP 429 en la exploración).
Salida: data/raw/exploration/chirps.json
"""
import os
import re
import time

os.environ.setdefault("GDAL_DISABLE_READDIR_ON_OPEN", "EMPTY_DIR")
os.environ.setdefault("GDAL_HTTP_USERAGENT", "cuencas-jujuy-hackathon-exploracion/0.1")
os.environ.setdefault("GDAL_HTTP_MAX_RETRY", "3")
os.environ.setdefault("GDAL_HTTP_RETRY_DELAY", "5")

import numpy as np
import rasterio
from rasterio.windows import from_bounds

from common import bbox_of, http, load, log, now_utc, save

BASE = "https://data.chc.ucsb.edu/products/CHIRPS/v3.0/pentads/global/cogs/"
PAD = 0.25

s, body = http(BASE)
if s != 200:
    raise SystemExit(f"Listado CHIRPS falló: HTTP {s}")
files = sorted(set(re.findall(r"chirps-v3\.0\.\d{4}\.\d{2}\.\d\.cog", body.decode("utf-8", "replace"))))
print(f"COGs pentadales: {len(files)}  primero={files[0]}  último={files[-1]}")
out = {"queried_at": now_utc(), "base": BASE, "n_files": len(files), "first": files[0], "last": files[-1], "reads": []}

for fname in files[-2:]:
    for case in ["laguna-pozuelos", "dique-las-maderas"]:
        time.sleep(3)
        ring = load(f"osm_{case}.geojson")["features"][0]["geometry"]["coordinates"][0]
        x0, y0, x1, y1 = bbox_of(ring)
        t0 = time.time()
        try:
            with rasterio.open("/vsicurl/" + BASE + fname) as ds:
                win = from_bounds(x0 - PAD, y0 - PAD, x1 + PAD, y1 + PAD, ds.transform).round_offsets().round_lengths()
                a = ds.read(1, window=win, masked=True)
                rec = {"file": fname, "case": case, "crs": str(ds.crs), "res_deg": ds.res, "dtype": ds.dtypes[0],
                       "nodata": ds.nodata, "size_px": [ds.width, ds.height], "tags": ds.tags(), "band_tags": ds.tags(1),
                       "units": ds.units[0] if ds.units else None, "window_px": [int(win.width), int(win.height)],
                       "min": float(a.min()) if a.count() else None, "max": float(a.max()) if a.count() else None,
                       "mean_window": round(float(a.mean()), 3) if a.count() else None,
                       "n_valid": int(a.count()), "n_masked": int(np.ma.count_masked(a)), "secs": round(time.time() - t0, 2)}
            log({"url": BASE + fname, "status": "rasterio-ok", "secs": rec["secs"]})
        except Exception as e:  # noqa: BLE001
            rec = {"file": fname, "case": case, "error": repr(e)[:300], "secs": round(time.time() - t0, 2)}
            log({"url": BASE + fname, "status": "rasterio-error", "error": rec["error"]})
        out["reads"].append(rec)
        print({k: rec.get(k) for k in ("file", "case", "res_deg", "dtype", "nodata", "units", "window_px", "min", "max", "n_valid", "secs", "error")})

ok = [r["secs"] for r in out["reads"] if "error" not in r]
if ok:
    per = sum(ok) / len(ok) + 3
    n = 30 * 18  # 30 años de referencia x 18 pentadas (ventana 90 d)
    out["estimate_baseline"] = {"reads_per_case_90d_30y": n, "secs_per_read_incl_pause": round(per, 1),
                                "minutes_per_case": round(n * per / 60, 1),
                                "nota": "Leyendo una ventana que cubra ambos casos, el costo es uno solo."}
    print("Estimación promedio histórico:", out["estimate_baseline"])
save("chirps.json", out)
