"""Fase 3 — Geometrías: AOI OSM y cuenca de aporte modelada (HydroBASINS nivel 10).

Reutiliza las salidas de la Fase 2 (data/raw/exploration/*.geojson); no vuelve a descargar HydroBASINS.
1. Valida anillos (cerrado, >= 4 vértices, finito, área != 0, sin autointersecciones).
2. Calcula áreas en proyección acimutal de Lambert de igual área centrada en cada caso (no en grados).
3. Las Maderas: evidencia sobre si la unidad HydroBASINS incluye territorio aguas abajo del muro:
   - % de vértices del embalse dentro de la unidad,
   - distancia del muro al borde de la unidad,
   - longitud de cauces OSM aguas abajo del muro que siguen dentro de la unidad
     (los ways OSM de waterway se dibujan en sentido del flujo).
4. Escribe data/derived/geometries/*.geojson y data/derived/cases.json.
"""
import json
import math
import sys
import time
from pathlib import Path

from rasterio.warp import transform_geom

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / "explore"))
from common import http, now_utc  # noqa: E402  (registro HTTP compartido con Fase 2)

from lib import point_in_ring, ring_problems, shoelace_area  # noqa: E402

ROOT = HERE.parents[1]
EXP = ROOT / "data" / "raw" / "exploration"
OUT = ROOT / "data" / "derived"
GEO = OUT / "geometries"
GEO.mkdir(parents=True, exist_ok=True)
OSM_CACHE = ROOT / "data" / "raw" / "cache" / "osm"
OSM_CACHE.mkdir(parents=True, exist_ok=True)

CASES = {
    "laguna-pozuelos": {"name": "Laguna de los Pozuelos", "ecoregion": "Puna", "kind": "Laguna altoandina (endorreica)",
                        "osm_water": "way/117694382", "laea": "+proj=laea +lat_0=-22.35 +lon_0=-66.0 +datum=WGS84 +units=m"},
    "dique-las-maderas": {"name": "Dique Las Maderas", "ecoregion": "Valles (Perico)", "kind": "Embalse",
                          "osm_water": "way/509257795", "osm_dam": "way/85604244",
                          "laea": "+proj=laea +lat_0=-24.45 +lon_0=-65.27 +datum=WGS84 +units=m"},
}


def load(p):
    return json.loads(Path(p).read_text(encoding="utf-8"))


def area_km2(geom_wgs84: dict, laea: str) -> float:
    g = transform_geom("EPSG:4326", laea, geom_wgs84)
    polys = g["coordinates"] if g["type"] == "MultiPolygon" else [g["coordinates"]]
    return sum(abs(shoelace_area(p[0])) - sum(abs(shoelace_area(h)) for h in p[1:]) for p in polys) / 1e6


def dist_point_segment(p, a, b):
    ax, ay, bx, by, px, py = *a, *b, *p
    dx, dy = bx - ax, by - ay
    t = 0 if dx == dy == 0 else max(0, min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)))
    return math.hypot(px - (ax + t * dx), py - (ay + t * dy))


def overpass_cached(name: str, query: str):
    p = OSM_CACHE / f"{name}.json"
    if p.exists():
        return json.loads(p.read_text(encoding="utf-8")), "cache"
    for attempt in range(3):
        s, b = http("https://overpass-api.de/api/interpreter", data=f"data={query}".encode(),
                    headers={"Content-Type": "application/x-www-form-urlencoded"}, timeout=120)
        if s == 200:
            p.write_bytes(b)
            return json.loads(b), "red"
        time.sleep(5 * (attempt + 1))
    return None, f"fallo HTTP {s}"


hyb = load(EXP / "hydrobasins.json")["levels"]["10"]["cases"]
cases_out, report = [], {"generated_at": now_utc(), "cases": {}}
for cid, meta in CASES.items():
    aoi_fc = load(EXP / f"osm_{cid}.geojson")
    aoi_geom = aoi_fc["features"][0]["geometry"]
    basin_fc = load(EXP / f"hybas_lev10_{cid}.geojson")
    problems = {"aoi": ring_problems(aoi_geom["coordinates"][0]), "basin_units": {}}
    for f in basin_fc["features"]:
        pr = [f"anillo {i}: {x}" for i, r in enumerate(f["geometry"]["coordinates"]) for x in ring_problems(r)]
        if pr:
            problems["basin_units"][str(f["properties"]["HYBAS_ID"])] = pr
    basin_area = sum(area_km2(f["geometry"], meta["laea"]) for f in basin_fc["features"])
    aoi_area = area_km2(aoi_geom, meta["laea"])
    h = hyb[cid]
    rec = {"validity": problems, "valid": not problems["aoi"] and not problems["basin_units"],
           "basin_area_km2_laea": round(basin_area, 1), "basin_UP_AREA_km2_hydrobasins": h["UP_AREA_km2"],
           "basin_area_diff_pct": round((basin_area - h["UP_AREA_km2"]) / h["UP_AREA_km2"] * 100, 2),
           "aoi_osm_area_km2_laea": round(aoi_area, 3), "n_basin_units": len(basin_fc["features"])}

    if cid == "dique-las-maderas":
        unit = basin_fc["features"][0]["geometry"]
        ring_u = unit["coordinates"][0]
        res_ring = aoi_geom["coordinates"][0]
        inside = sum(point_in_ring(x, y, ring_u) for x, y in res_ring) / len(res_ring) * 100
        dam = load(EXP / "osm_cases.json")["cases"][cid]["dam"]["midpoint"]
        ring_m = transform_geom("EPSG:4326", meta["laea"], {"type": "LineString", "coordinates": ring_u})["coordinates"]
        dam_m = transform_geom("EPSG:4326", meta["laea"], {"type": "Point", "coordinates": dam})["coordinates"]
        d_border = min(dist_point_segment(dam_m, a, b) for a, b in zip(ring_m[:-1], ring_m[1:]))
        q = (f'[out:json][timeout:90];way["waterway"~"^(river|stream|canal)$"](around:4000,{dam[1]},{dam[0]});out tags geom;')
        ov, src = overpass_cached("waterways_las_maderas", q)
        downstream = []
        if ov:
            for w in ov["elements"]:
                pts = [[p["lon"], p["lat"]] for p in w["geometry"]]
                pm = transform_geom("EPSG:4326", meta["laea"], {"type": "LineString", "coordinates": pts})["coordinates"]
                dists = [math.hypot(x - dam_m[0], y - dam_m[1]) for x, y in pm]
                i0 = min(range(len(dists)), key=dists.__getitem__)
                if dists[i0] > 300 or i0 == len(pts) - 1:
                    continue
                length_in = 0.0
                for k in range(i0, len(pts) - 1):
                    mx, my = (pts[k][0] + pts[k + 1][0]) / 2, (pts[k][1] + pts[k + 1][1]) / 2
                    if point_in_ring(mx, my, ring_u):
                        length_in += math.hypot(pm[k + 1][0] - pm[k][0], pm[k + 1][1] - pm[k][1])
                downstream.append({"osm": f"way/{w['id']}", "tags": {k: v for k, v in w.get("tags", {}).items() if k in ("name", "waterway")},
                                   "nearest_node_to_dam_m": round(dists[i0], 1),
                                   "downstream_length_inside_unit_m": round(length_in, 0)})
        rec["las_maderas_downstream_check"] = {
            "reservoir_vertices_inside_unit_pct": round(inside, 1),
            "dam_distance_to_unit_border_m": round(d_border, 0),
            "osm_waterways_source": src, "osm_waterways_from_dam": downstream,
            "includes_downstream_territory": (any(d["downstream_length_inside_unit_m"] > 200 for d in downstream)
                                              if downstream else None),
            "method": "Heurística: cauces OSM (dibujados en sentido del flujo) que nacen a <300 m del muro; "
                      "se mide la longitud de cauce aguas abajo que permanece dentro de la unidad HydroBASINS.",
        }
    report["cases"][cid] = rec

    # Geometrías publicables
    (GEO / f"{cid}_aoi_osm.geojson").write_text(json.dumps({"type": "FeatureCollection", "features": [{
        "type": "Feature", "properties": {"case_id": cid, "role": "region_cartografica_de_referencia", "source": "OpenStreetMap",
                                          "osm": meta["osm_water"], "license": "ODbL 1.0 © colaboradores de OpenStreetMap",
                                          "note": "Contorno cartográfico; no es medición de superficie."},
        "geometry": aoi_geom}]}, ensure_ascii=False), encoding="utf-8")
    (GEO / f"{cid}_basin_hydrobasins_l10.geojson").write_text(json.dumps({"type": "FeatureCollection", "features": [{
        "type": "Feature", "properties": {"case_id": cid, "label": "Cuenca de aporte modelada", "source": "HydroBASINS v1c nivel 10",
                                          "HYBAS_ID": f["properties"]["HYBAS_ID"], "SUB_AREA_km2": f["properties"]["SUB_AREA"],
                                          "license": "HydroSHEDS (atribución: Lehner & Grill 2013)"},
        "geometry": f["geometry"]} for f in basin_fc["features"]]}, ensure_ascii=False), encoding="utf-8")

    warnings = ["Cuenca de aporte modelada (HydroBASINS, DEM ~15″): no es una delimitación oficial ni validada en campo."]
    if cid == "dique-las-maderas":
        chk = rec["las_maderas_downstream_check"]
        if chk["includes_downstream_territory"]:
            warnings.append("La unidad HydroBASINS incluye territorio aguas abajo del muro; la cuenca de aporte real del embalse es menor. "
                            "La precipitación areal es aproximada y no debe usarse para conclusiones hidrológicas definitivas.")
        elif chk["includes_downstream_territory"] is None:
            warnings.append("No se pudo verificar si la unidad HydroBASINS incluye territorio aguas abajo del muro.")
    else:
        warnings.append("Cuenca endorreica: se agregaron todas las unidades que drenan al sumidero HydroBASINS (ENDO=2).")
    cases_out.append({"case_id": cid, "name": meta["name"], "ecoregion": meta["ecoregion"], "kind": meta["kind"],
                      "aoi": {"file": f"geometries/{cid}_aoi_osm.geojson", "source": "OpenStreetMap", "ref": meta["osm_water"],
                              "role": "región cartográfica de referencia (no medición)"},
                      "basin": {"file": f"geometries/{cid}_basin_hydrobasins_l10.geojson", "label": "Cuenca de aporte modelada",
                                "source": "HydroBASINS v1c nivel 10", "outlet_hybas_id": h["HYBAS_ID"],
                                "area_km2": rec["basin_area_km2_laea"], "area_method": "Lambert acimutal de igual área (LAEA)",
                                "official": False, "geometry_valid": rec["valid"]},
                      "warnings": warnings})
    print(cid, json.dumps(rec, ensure_ascii=False)[:900])

(OUT / "cases.json").write_text(json.dumps({"generated_at": report["generated_at"], "generator": "scripts/process/10_geometries.py",
                                            "cases": cases_out}, ensure_ascii=False, indent=2), encoding="utf-8")
(OUT / "qa").mkdir(exist_ok=True)
(OUT / "qa" / "geometries_report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
