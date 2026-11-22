"""Fase 3 — Superficie de agua detectada (Sentinel-2 L2A, NDWI y MNDWI) para los pares aprobados (D-08).

Método (documentado en DECISIONS.md D-07 y D-18):
- Grilla de análisis: 20 m, la de B11 y SCL de la misma tesela MGRS. B03 y B08 (10 m) se convierten a reflectancia
  y se promedian en bloques 2x2 alineados (ambas grillas comparten origen: se verifica). Sin otro remuestreo.
- Reflectancia: (DN + BOA_ADD_OFFSET) / BOA_QUANTIFICATION_VALUE, leídos del MTD_MSIL2A.xml de cada escena.
  DN 0 (NODATA) y 65535 (SATURATED) -> sin dato.
- Política SCL: se excluyen 0, 1, 3, 8, 9 y 10 (sin dato, defectuoso, sombra de nube, nubes, cirros).
- Región de análisis CONSTANTE por caso: polígono OSM dilatado BUFFER_M, menos otros cuerpos de agua OSM
  (p. ej. el Dique La Ciénaga, contiguo a Las Maderas). La misma máscara para ambas fechas.
- Agua: MNDWI > 0 (Xu 2006; principal) y NDWI > 0 (McFeeters 1996; secundario). Umbral FIJO, igual para
  ambas fechas y ambos casos. Se reporta la sensibilidad a ±0,1 sin elegir el umbral por fecha.
- Comparación sobre píxeles válidos en AMBAS fechas (máscara común).
- Área: n_píxeles x 400 m² / k², con k = factor de escala UTM en el centro de la región.
Salidas: data/derived/water_metrics.json, data/derived/geometries/<caso>_water_<fecha>.geojson,
         data/derived/qa/quicklooks/<caso>_<fecha>.png
"""
import json
import os
import re
import sys
from pathlib import Path

os.environ.setdefault("GDAL_DISABLE_READDIR_ON_OPEN", "EMPTY_DIR")
os.environ.setdefault("GDAL_HTTP_TIMEOUT", "120")
os.environ.setdefault("GDAL_HTTP_MAX_RETRY", "2")

import numpy as np
import rasterio
from rasterio.features import geometry_mask, shapes
from rasterio.transform import Affine
from rasterio.warp import transform_geom
from rasterio.windows import Window, from_bounds

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / "explore"))
from common import get_json, http, now_utc  # noqa: E402

from cache import cache_get, cache_put, fetch_with_retry, CACHE  # noqa: E402
from lib import (SCL_CLOUD, SCL_EXCLUDED, SCL_NAMES, dilate, dn_to_reflectance, downsample_2x2_mean,  # noqa: E402
                 edge_ring, mndwi, ndwi, pct_change, pixels_to_km2, scl_valid_mask, utm_scale_factor)

ROOT = HERE.parents[1]
OUT = ROOT / "data" / "derived"
QL = OUT / "qa" / "quicklooks"
QL.mkdir(parents=True, exist_ok=True)
STAC = "https://planetarycomputer.microsoft.com/api/stac/v1/collections/sentinel-2-l2a/items/"
BUFFER_M = 500
PIX = 20.0
THRESHOLDS = [-0.1, 0.0, 0.1]
PRIMARY_THR = 0.0
PAIRS = {  # D-08, aprobado provisionalmente 2026-11-22
    "laguna-pozuelos": ["S2C_MSIL2A_20250504T142811_R053_T19KHR_20250504T193719",
                        "S2A_MSIL2A_20250913T142801_R053_T19KHR_20250913T211118"],
    "dique-las-maderas": ["S2B_MSIL2A_20250529T142719_R053_T19JHN_20250529T180713",
                          "S2A_MSIL2A_20251003T142811_R053_T19JHN_20251003T192715"],
}
QA_GATES = {"coverage_min_pct": 99.5, "cloud_max_pct": 1.0, "common_valid_min_pct": 98.0, "edge_water_max_pct": 1.0}
BAND_ID = {"B03": "2", "B08": "7", "B11": "11"}

tok = get_json("https://planetarycomputer.microsoft.com/api/sas/v1/token/sentinel-2-l2a")[1]["token"]  # no se guarda


def item_cached(iid: str) -> dict:
    p = CACHE / "stac" / f"{iid}.json"
    p.parent.mkdir(parents=True, exist_ok=True)
    if p.exists():
        return json.loads(p.read_text(encoding="utf-8"))
    s, it = get_json(STAC + iid)
    if s != 200:
        raise SystemExit(f"Ítem STAC {iid}: HTTP {s}")
    p.write_text(json.dumps(it), encoding="utf-8")
    return it


def radiometry_cached(item: dict) -> dict:
    """Offset/cuantificación/valores especiales desde MTD_MSIL2A.xml (cacheado como JSON)."""
    p = CACHE / "stac" / f"{item['id']}_radiometry.json"
    if p.exists():
        return json.loads(p.read_text(encoding="utf-8"))
    s, xml = http(item["assets"]["product-metadata"]["href"] + "?" + tok, timeout=120)
    if s != 200:
        raise SystemExit(f"MTD de {item['id']}: HTTP {s}")
    t = xml.decode("utf-8", "replace")
    q = float(re.search(r"<BOA_QUANTIFICATION_VALUE[^>]*>([^<]+)<", t).group(1))
    offs = {b: float(re.search(rf'<BOA_ADD_OFFSET band_id="{i}">([^<]+)<', t).group(1)) for b, i in BAND_ID.items()}
    sv = dict(re.findall(r"<SPECIAL_VALUE_TEXT>([^<]+)</SPECIAL_VALUE_TEXT>\s*<SPECIAL_VALUE_INDEX>([^<]+)<", t))
    r = {"quantification": q, "offsets": offs, "nodata": int(sv.get("NODATA", 0)), "saturated": int(sv.get("SATURATED", 65535)),
         "processing_baseline": re.search(r"<PROCESSING_BASELINE>([^<]+)<", t).group(1), "source": "MTD_MSIL2A.xml"}
    p.write_text(json.dumps(r, indent=2), encoding="utf-8")
    return r


def read_band(item: dict, band: str, win: Window) -> np.ndarray:
    key = f"{item['id']}_{band}_{int(win.col_off)}_{int(win.row_off)}_{int(win.width)}_{int(win.height)}"
    c = cache_get("s2", key)
    if c is not None:
        return c[0]

    def _read():
        with rasterio.open(item["assets"][band]["href"] + "?" + tok) as ds:
            a = ds.read(1, window=win, boundless=True, fill_value=0)
            if a.shape != (int(win.height), int(win.width)):
                raise IOError(f"lectura incompleta {a.shape}")
            return a

    arr, errs = fetch_with_retry(_read, retries=3)
    if arr is None:
        raise SystemExit(f"No se pudo leer {band} de {item['id']}: {errs}")
    cache_put("s2", key, arr, {"item": item["id"], "band": band, "window": [int(win.col_off), int(win.row_off), int(win.width), int(win.height)],
                               "read_at": now_utc(), "retries_errors": errs})
    return arr


def overpass_other_water(bbox_wgs, exclude_way: int) -> list:
    p = CACHE / "osm" / f"other_water_{exclude_way}.json"
    p.parent.mkdir(parents=True, exist_ok=True)
    if not p.exists():
        x0, y0, x1, y1 = bbox_wgs
        q = f'[out:json][timeout:90];(way["natural"="water"]({y0},{x0},{y1},{x1});way["landuse"="reservoir"]({y0},{x0},{y1},{x1}););out tags geom;'
        for _ in range(3):
            s, b = http("https://overpass-api.de/api/interpreter", data=f"data={q}".encode(),
                        headers={"Content-Type": "application/x-www-form-urlencoded"}, timeout=120)
            if s == 200:
                p.write_bytes(b)
                break
        else:
            raise SystemExit("Overpass no disponible para cuerpos de agua vecinos")
    els = json.loads(p.read_text(encoding="utf-8"))["elements"]
    out = []
    for e in els:
        pts = [[g["lon"], g["lat"]] for g in e.get("geometry", [])]
        if e["id"] != exclude_way and len(pts) >= 4 and pts[0] == pts[-1]:
            out.append({"osm": f"way/{e['id']}", "name": e.get("tags", {}).get("name"),
                        "geometry": {"type": "Polygon", "coordinates": [pts]}})
    return out


def stretch(a):
    lo, hi = np.nanpercentile(a, [2, 98])
    return np.clip((np.nan_to_num(a, nan=lo) - lo) / (hi - lo + 1e-9) * 255, 0, 255).astype("uint8")


def write_quicklook(path, b11, b08, b03, water, region):
    rgb = np.stack([stretch(b11), stretch(b08), stretch(b03)])
    wedge = water & dilate(~water, 1)
    redge = region & dilate(~region, 1)
    rgb[:, wedge] = np.array([0, 255, 255], dtype="uint8")[:, None]   # cian: borde del agua detectada
    rgb[:, redge] = np.array([255, 255, 0], dtype="uint8")[:, None]   # amarillo: borde de la región de análisis
    with rasterio.open(path, "w", driver="PNG", width=rgb.shape[2], height=rgb.shape[1], count=3, dtype="uint8") as dst:
        dst.write(rgb)


cases_meta = {c["case_id"]: c for c in json.loads((OUT / "cases.json").read_text(encoding="utf-8"))["cases"]}
metrics = {"generated_at": now_utc(), "generator": "scripts/process/11_water.py",
           "method": {"grid_m": PIX, "resampling": "B03 y B08: reflectancia 10 m promediada en bloques 2x2 alineados -> 20 m; B11 y SCL nativos 20 m",
                      "reflectance": "(DN + BOA_ADD_OFFSET) / BOA_QUANTIFICATION_VALUE según MTD_MSIL2A.xml",
                      "scl_excluded": {k: SCL_NAMES[k] for k in sorted(SCL_EXCLUDED)},
                      "cloud_effective_classes": {k: SCL_NAMES[k] for k in sorted(SCL_CLOUD)},
                      "indices": {"NDWI": "(B03 - B08) / (B03 + B08) — McFeeters 1996", "MNDWI": "(B03 - B11) / (B03 + B11) — Xu 2006"},
                      "water_rule": f"índice > {PRIMARY_THR} (umbral fijo; MNDWI principal, NDWI secundario)",
                      "sensitivity_thresholds": THRESHOLDS, "region": f"polígono OSM dilatado {BUFFER_M} m menos otros cuerpos de agua OSM",
                      "area": "n_px × 400 m² / k², k = factor de escala UTM en el centro de la región", "qa_gates": QA_GATES},
           "scenes": [], "comparisons": []}

for cid, (ida, idb) in PAIRS.items():
    aoi = json.loads((OUT / "geometries" / f"{cid}_aoi_osm.geojson").read_text(encoding="utf-8"))["features"][0]["geometry"]
    way_id = int(cases_meta[cid]["aoi"]["ref"].split("/")[1])
    items = [item_cached(ida), item_cached(idb)]
    tiles = {it["properties"]["s2:mgrs_tile"] for it in items}
    assert len(tiles) == 1, f"{cid}: las dos fechas deben ser de la misma tesela ({tiles})"
    t10, t20 = items[0]["assets"]["B03"]["proj:transform"], items[0]["assets"]["B11"]["proj:transform"]
    assert (t10[2], t10[5]) == (t20[2], t20[5]), "las grillas 10 m y 20 m no comparten origen"
    for it in items[1:]:
        assert it["assets"]["B11"]["proj:transform"] == t20, "las dos fechas no comparten grilla"
    crs = f"EPSG:{items[0]['properties']['proj:epsg']}" if items[0]["properties"].get("proj:epsg") else items[0]["properties"]["proj:code"]
    zone = int(crs.split(":")[1]) - 32700
    tr20 = Affine(*t20[:6])

    aoi_p = transform_geom("EPSG:4326", crs, aoi)
    xs, ys = zip(*aoi_p["coordinates"][0])
    m = BUFFER_M + 4 * PIX
    win = from_bounds(min(xs) - m, min(ys) - m, max(xs) + m, max(ys) + m, tr20).round_offsets().round_lengths()
    win = Window(int(win.col_off), int(win.row_off), int(win.width), int(win.height))
    wtr = rasterio.windows.transform(win, tr20)
    shape = (int(win.height), int(win.width))
    inside_aoi = ~geometry_mask([aoi_p], out_shape=shape, transform=wtr)
    region = dilate(inside_aoi, int(BUFFER_M // PIX))
    bbox_wgs = transform_geom(crs, "EPSG:4326", {"type": "Polygon", "coordinates": [[
        (wtr.c, wtr.f), (wtr.c + shape[1] * PIX, wtr.f), (wtr.c + shape[1] * PIX, wtr.f - shape[0] * PIX), (wtr.c, wtr.f - shape[0] * PIX), (wtr.c, wtr.f)]]})
    bx, by = zip(*bbox_wgs["coordinates"][0])
    others = overpass_other_water([min(bx), min(by), max(bx), max(by)], way_id)
    other_mask = np.zeros(shape, bool)
    excluded_list = []
    for o in others:
        om = ~geometry_mask([transform_geom("EPSG:4326", crs, o["geometry"])], out_shape=shape, transform=wtr)
        om &= ~inside_aoi  # nunca recortar el propio polígono del caso
        if (om & region).any():
            excluded_list.append({"osm": o["osm"], "name": o["name"], "px_removed": int((om & region).sum())})
        other_mask |= om
    region &= ~other_mask
    cx, cy = wtr * (shape[1] / 2, shape[0] / 2)
    clon, clat = transform_geom(crs, "EPSG:4326", {"type": "Point", "coordinates": [cx, cy]})["coordinates"]
    k = utm_scale_factor(clat, clon, zone)
    edge = edge_ring(region, 2)
    n_region = int(region.sum())

    per_date = []
    for it in items:
        rad = radiometry_cached(it)
        win10 = Window(win.col_off * 2, win.row_off * 2, win.width * 2, win.height * 2)
        raw = {b: read_band(it, b, win10 if b in ("B03", "B08") else win) for b in ("B03", "B08", "B11", "SCL")}
        g = downsample_2x2_mean(dn_to_reflectance(raw["B03"], rad["offsets"]["B03"], rad["quantification"], rad["nodata"], rad["saturated"]))
        n = downsample_2x2_mean(dn_to_reflectance(raw["B08"], rad["offsets"]["B08"], rad["quantification"], rad["nodata"], rad["saturated"]))
        s = dn_to_reflectance(raw["B11"], rad["offsets"]["B11"], rad["quantification"], rad["nodata"], rad["saturated"])
        scl = raw["SCL"]
        idx = {"MNDWI": mndwi(g, s), "NDWI": ndwi(g, n)}
        band_ok = np.isfinite(idx["MNDWI"]) & np.isfinite(idx["NDWI"])
        valid = region & scl_valid_mask(scl) & band_ok
        per_date.append({"item": it, "rad": rad, "idx": idx, "valid": valid, "scl": scl, "g": g, "n": n, "s": s, "band_ok": band_ok})

    common = per_date[0]["valid"] & per_date[1]["valid"]
    scene_recs = []
    for d in per_date:
        it, scl, valid = d["item"], d["scl"], d["valid"]
        date = it["properties"]["datetime"][:10]
        with_data = region & (scl != 0)
        cls = {SCL_NAMES[c]: int(((scl == c) & region).sum()) for c in sorted(SCL_EXCLUDED)}
        cloud_px = int((np.isin(scl, list(SCL_CLOUD)) & with_data).sum())
        water = {}
        for name, arr in d["idx"].items():
            wm = valid & (arr > PRIMARY_THR)
            water[name] = {"threshold": PRIMARY_THR, "pixels": int(wm.sum()), "area_km2": round(pixels_to_km2(int(wm.sum()), PIX, k), 4),
                           "pixels_common_mask": int((common & (arr > PRIMARY_THR)).sum()),
                           "area_km2_common_mask": round(pixels_to_km2(int((common & (arr > PRIMARY_THR)).sum()), PIX, k), 4)}
        scl_water = int((valid & (scl == 6)).sum())
        wm_primary = valid & (d["idx"]["MNDWI"] > PRIMARY_THR)
        edge_pct = round(100 * (wm_primary & edge).sum() / max(1, wm_primary.sum()), 3)
        cov = round(100 * with_data.sum() / n_region, 3)
        cloud = round(100 * cloud_px / max(1, with_data.sum()), 3)
        warnings, status = [], "completo"
        if cov < QA_GATES["coverage_min_pct"]:
            warnings.append(f"cobertura {cov}% < {QA_GATES['coverage_min_pct']}%"); status = "requiere_revision"
        if cloud > QA_GATES["cloud_max_pct"]:
            warnings.append(f"nubosidad efectiva {cloud}% > {QA_GATES['cloud_max_pct']}%"); status = "requiere_revision"
        if edge_pct > QA_GATES["edge_water_max_pct"]:
            warnings.append(f"{edge_pct}% del agua detectada toca el borde de la región: posible recorte"); status = "requiere_revision"
        warnings.append("Superficie de agua visible detectada por índice espectral: no es volumen almacenado ni caudal.")
        warnings.append("Agua somera, barro o vegetación inundada pueden clasificarse de forma distinta según el índice y el umbral.")
        ql = QL / f"{cid}_{date}.png"
        write_quicklook(ql, d["s"], d["n"], d["g"], wm_primary, region)
        # contorno del agua (MNDWI, máscara propia) en WGS84
        feats = [{"type": "Feature", "properties": {"value": 1},
                  "geometry": transform_geom(crs, "EPSG:4326", geom)}
                 for geom, v in shapes(wm_primary.astype("uint8"), mask=wm_primary, transform=wtr) if v == 1]
        gfile = OUT / "geometries" / f"{cid}_water_mndwi_{date}.geojson"
        gfile.write_text(json.dumps({"type": "FeatureCollection", "properties": {
            "case_id": cid, "date": date, "scene_id": it["id"], "method": f"MNDWI > {PRIMARY_THR}, 20 m, SCL filtrado",
            "kind": "estimacion", "note": "Polígonos de píxeles de 20 m (contorno escalonado)."}, "features": feats}), encoding="utf-8")
        rec = {"case_id": cid, "date": date, "datetime": it["properties"]["datetime"], "scene_id": it["id"],
               "source": "Copernicus Sentinel-2 L2A vía Microsoft Planetary Computer", "stac_item": STAC + it["id"],
               "mgrs_tile": it["properties"]["s2:mgrs_tile"], "crs": crs, "processing_baseline": d["rad"]["processing_baseline"],
               "radiometry": {k2: d["rad"][k2] for k2 in ("quantification", "offsets", "nodata", "saturated", "source")},
               "cloud_cover_scene_pct": it["properties"]["eo:cloud_cover"],
               "region": {"pixels": n_region, "area_km2": round(pixels_to_km2(n_region, PIX, k), 3), "buffer_m": BUFFER_M,
                          "excluded_other_osm_water": excluded_list, "window_20m": [win.col_off, win.row_off, win.width, win.height]},
               "pixels": {"region": n_region, "with_data": int(with_data.sum()), "valid": int(valid.sum()), "valid_common": int(common.sum()),
                          "excluded_by_scl_class": cls, "excluded_band_nodata_or_saturated": int((region & ~d["band_ok"]).sum())},
               "coverage_pct": cov, "cloud_effective_pct": cloud, "utm_scale_factor": round(k, 6),
               "water": water, "scl_water_class": {"pixels": scl_water, "area_km2": round(pixels_to_km2(scl_water, PIX, k), 4),
                                                   "note": "Clasificación ESA independiente; referencia cruzada, no medida principal"},
               "water_touching_region_edge_pct": edge_pct, "unit": "km2", "kind": "estimacion",
               "files": {"water_geojson": f"geometries/{gfile.name}", "quicklook": f"qa/quicklooks/{ql.name}"},
               "status": status, "warnings": warnings}
        scene_recs.append(rec)
        metrics["scenes"].append(rec)
        print(f"{cid} {date} cov={cov}% nube={cloud}% válidos={int(valid.sum())}/{n_region} "
              f"MNDWI={water['MNDWI']['area_km2']} km² NDWI={water['NDWI']['area_km2']} km² SCL6={rec['scl_water_class']['area_km2']} km² borde={edge_pct}% [{status}]")

    a, b = per_date
    sens = []
    for thr in THRESHOLDS:
        pa = int((common & (a["idx"]["MNDWI"] > thr)).sum()); pb = int((common & (b["idx"]["MNDWI"] > thr)).sum())
        ka, kb = pixels_to_km2(pa, PIX, k), pixels_to_km2(pb, PIX, k)
        sens.append({"threshold": thr, "area_a_km2": round(ka, 4), "area_b_km2": round(kb, 4),
                     "abs_diff_km2": round(kb - ka, 4), "pct_change": None if pct_change(ka, kb) is None else round(pct_change(ka, kb), 2)})
    comp = {"case_id": cid, "date_a": scene_recs[0]["date"], "date_b": scene_recs[1]["date"],
            "scene_a": ida, "scene_b": idb, "common_valid_pixels": int(common.sum()),
            "common_valid_pct_of_region": round(100 * common.sum() / n_region, 3), "unit": "km2", "kind": "estimacion"}
    for name in ("MNDWI", "NDWI"):
        ka, kb = scene_recs[0]["water"][name]["area_km2_common_mask"], scene_recs[1]["water"][name]["area_km2_common_mask"]
        pc = pct_change(ka, kb)
        comp[name] = {"threshold": PRIMARY_THR, "area_a_km2": ka, "area_b_km2": kb, "abs_diff_km2": round(kb - ka, 4),
                      "pct_change": None if pc is None else round(pc, 2), "formula": "(B - A) / A × 100"}
    comp["MNDWI_sensitivity"] = sens
    comp["status"] = "completo" if all(r["status"] == "completo" for r in scene_recs) and comp["common_valid_pct_of_region"] >= QA_GATES["common_valid_min_pct"] else "requiere_revision"
    comp["warnings"] = ["La variación compara superficie visible entre dos fechas; no indica cambio de volumen ni tendencia.",
                        "Dos fechas no representan la variabilidad interanual."]
    metrics["comparisons"].append(comp)
    print(f"  => {cid} MNDWI {comp['MNDWI']['area_a_km2']} -> {comp['MNDWI']['area_b_km2']} km² ({comp['MNDWI']['pct_change']}%), "
          f"NDWI {comp['NDWI']['area_a_km2']} -> {comp['NDWI']['area_b_km2']} ({comp['NDWI']['pct_change']}%) común={comp['common_valid_pct_of_region']}% [{comp['status']}]")

(OUT / "water_metrics.json").write_text(json.dumps(metrics, ensure_ascii=False, indent=2), encoding="utf-8")
