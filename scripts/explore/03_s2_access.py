"""Paso 2b: acceso REAL a archivos de bandas y nubosidad efectiva sobre el AOI.

Para cada caso y ventana toma hasta N candidatas (menor nubosidad de escena) de
s2_search.json y:
1. Pide un token SAS anónimo a Planetary Computer (no se guarda en disco).
2. Lee por ventana (HTTP range, COG) SOLO los píxeles de la banda SCL que caen
   en el rectángulo del AOI y calcula, dentro del polígono OSM:
   - cobertura (% píxeles con dato; 0 = sin dato, p.ej. borde de tesela)
   - nubosidad efectiva AOI = (SCL 3 sombra + 8 nube media + 9 nube alta + 10 cirro) / píxeles con dato
3. Para la mejor candidata de cada ventana, abre B03, B08 y B11 y lee un bloque
   pequeño para comprobar acceso a píxeles (no calcula índices).
4. Prueba el acceso sin credenciales a un archivo de banda de CDSE (esperado: 401).

NO calcula NDWI/MNDWI ni superficies de agua.
Salida: data/raw/exploration/s2_access.json
"""
import json
import os
import time

os.environ.setdefault("GDAL_DISABLE_READDIR_ON_OPEN", "EMPTY_DIR")
os.environ.setdefault("GDAL_HTTP_MAX_RETRY", "3")
os.environ.setdefault("GDAL_HTTP_RETRY_DELAY", "2")

import numpy as np
import rasterio
from rasterio.features import geometry_mask
from rasterio.warp import transform_geom
from rasterio.windows import Window, from_bounds

from common import get_json, http, load, now_utc, post_json, save

N_PER_WINDOW = 4
TOKEN_URL = "https://planetarycomputer.microsoft.com/api/sas/v1/token/sentinel-2-l2a"
CLOUD_CLASSES = [3, 8, 9, 10]

s, tok = get_json(TOKEN_URL)
if s != 200:
    raise SystemExit(f"No se obtuvo token SAS de MPC (HTTP {s})")
SAS = tok["token"]
print("Token SAS anónimo obtenido; expira:", tok.get("msr:expiry"))


def signed(href: str) -> str:
    return f"{href}?{SAS}"


def scl_stats(href: str, geom_wgs84: dict) -> dict:
    with rasterio.open(signed(href)) as ds:
        g = transform_geom("EPSG:4326", ds.crs, geom_wgs84)
        xs = [c[0] for c in g["coordinates"][0]]
        ys = [c[1] for c in g["coordinates"][0]]
        win = from_bounds(min(xs), min(ys), max(xs), max(ys), ds.transform).round_offsets().round_lengths()
        # boundless: la parte del AOI fuera de la tesela se lee como 0 (sin dato) y
        # cuenta en el total. (Corrección 2026-11-22: antes se recortaba la ventana
        # al borde de la tesela y la cobertura quedaba sobreestimada.)
        arr = ds.read(1, window=win, boundless=True, fill_value=0)
        inside = ~geometry_mask([g], out_shape=arr.shape, transform=ds.window_transform(win))
        vals = arr[inside]
        total = int(vals.size)
        valid = int((vals != 0).sum())
        cloud = int(np.isin(vals, CLOUD_CLASSES).sum())
        return {"crs": str(ds.crs), "res_m": ds.res[0], "window_px": [int(win.width), int(win.height)],
                "aoi_pixels": total, "coverage_pct": round(100 * valid / total, 2) if total else None,
                "cloud_aoi_pct": round(100 * cloud / valid, 2) if valid else None,
                "scl_classes_in_aoi": {int(k): int(v) for k, v in zip(*np.unique(vals, return_counts=True))}}


def band_probe(href: str) -> dict:
    with rasterio.open(signed(href)) as ds:
        w = Window(ds.width // 2, ds.height // 2, 64, 64)
        a = ds.read(1, window=w)
        return {"ok": True, "crs": str(ds.crs), "res_m": ds.res[0], "dtype": str(a.dtype), "size_px": [ds.width, ds.height],
                "nodata": ds.nodata, "probe_block": list(a.shape), "probe_nonzero_px": int((a != 0).sum()),
                "driver": ds.driver, "is_tiled_cog": bool(ds.profile.get("tiled"))}


search = load("s2_search.json")
out = {"queried_at": now_utc(), "token_endpoint": TOKEN_URL, "cloud_classes": CLOUD_CLASSES, "cases": {}}
for case, windows in search["cases"].items():
    geom = load(f"osm_{case}.geojson")["features"][0]["geometry"]
    out["cases"][case] = {}
    for wname, res in windows.items():
        cands = sorted(res["mpc"]["items"], key=lambda r: r["cloud_cover_scene_pct"])[:N_PER_WINDOW]
        rows = []
        for c in cands:
            s, item = get_json(c["stac_item_url"])
            row = {"id": c["id"], "datetime": c["datetime"], "mgrs_tile": c["mgrs_tile"],
                   "cloud_cover_scene_pct": c["cloud_cover_scene_pct"], "item_http": s}
            if s == 200:
                try:
                    row["scl"] = scl_stats(item["assets"]["SCL"]["href"], geom)
                except Exception as e:  # noqa: BLE001 — registrar cualquier fallo de lectura
                    row["scl_error"] = repr(e)[:300]
                row["_assets"] = {b: item["assets"][b]["href"] for b in ("B03", "B08", "B11")}
            rows.append(row)
            print(f"{case:18s} {wname:16s} {c['datetime'][:10]} {c['mgrs_tile']} escena={c['cloud_cover_scene_pct']:6.2f}% "
                  f"cobertura={row.get('scl', {}).get('coverage_pct')} nube_AOI={row.get('scl', {}).get('cloud_aoi_pct')} {row.get('scl_error', '')}")
            time.sleep(0.5)
        ok = [r for r in rows if r.get("scl") and r["scl"]["coverage_pct"] and r["scl"]["coverage_pct"] >= 99]
        best = min(ok, key=lambda r: r["scl"]["cloud_aoi_pct"]) if ok else None
        if best:
            best["band_access"] = {}
            for b, href in best["_assets"].items():
                try:
                    best["band_access"][b] = band_probe(href)
                except Exception as e:  # noqa: BLE001
                    best["band_access"][b] = {"ok": False, "error": repr(e)[:300]}
            print("   mejor:", best["id"], {b: v.get("ok") for b, v in best["band_access"].items()})
        for r in rows:
            r.pop("_assets", None)
        out["cases"][case][wname] = {"candidates": rows, "best_id": best["id"] if best else None}

# Prueba de acceso CDSE sin credenciales (1 archivo, 16 KB por rango)
cd = next((r for w in search["cases"]["dique-las-maderas"].values() for r in w["cdse"]["items"]), None)
if cd:
    s, d = post_json("https://stac.dataspace.copernicus.eu/v1/search", {"collections": ["sentinel-2-l2a"], "ids": [cd["id"]]})
    href = d["features"][0]["assets"]["B03_10m"]["alternate"]["https"]["href"] if d else None
    st, body = http(href, headers={"Range": "bytes=0-16383"}) if href else (None, b"")
    out["cdse_unauthenticated_download"] = {"item": cd["id"], "http": st, "body_snippet": body[:120].decode("utf-8", "replace")}
    print("CDSE descarga sin credenciales:", st)

save("s2_access.json", out)
