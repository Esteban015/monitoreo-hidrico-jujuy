"""Paso 1: geometría verificable de los casos testigo desde OpenStreetMap (ODbL).

Los IDs OSM se identificaron con Nominatim/Overpass el 2026-11-22:
- way 117694382: "Laguna de los Pozuelos" (natural=water, water=lake)
- way 509257795: "Embalse Las Maderas" (natural=water, water=reservoir)
- way 85604244 : "Dique Las Maderas" (waterway=dam) -> punto de cierre del embalse

El polígono OSM es el contorno cartográfico del espejo de agua según
colaboradores de OSM (fecha de trazado desconocida): NO es una medición de
superficie actual. Se usa solo como área de interés (AOI).
Salida: data/raw/exploration/osm_<caso>.geojson y osm_cases.json
"""
import json
import time

from common import bbox_of, http, now_utc, save

OVERPASS = "https://overpass-api.de/api/interpreter"
CASES = {
    "laguna-pozuelos": {"water_way": 117694382, "dam_way": None},
    "dique-las-maderas": {"water_way": 509257795, "dam_way": 85604244},
}


def fetch_way(way_id: int):
    q = f"[out:json][timeout:60];way({way_id});out tags geom;"
    for attempt in range(3):
        s, b = http(OVERPASS, data=f"data={q}".encode(), headers={"Content-Type": "application/x-www-form-urlencoded"})
        if s == 200:
            el = json.loads(b)["elements"][0]
            return el
        time.sleep(5 * (attempt + 1))
    raise SystemExit(f"Overpass falló para way {way_id} (último HTTP {s})")


summary = {"queried_at": now_utc(), "source": "OpenStreetMap via Overpass API", "license": "ODbL 1.0 (© colaboradores de OpenStreetMap)", "cases": {}}
for case, ids in CASES.items():
    el = fetch_way(ids["water_way"])
    coords = [[p["lon"], p["lat"]] for p in el["geometry"]]
    closed = coords[0] == coords[-1]
    feat = {"type": "Feature", "properties": {"case_id": case, "osm": f"way/{el['id']}", "tags": el.get("tags", {}),
                                              "nota": "Contorno cartográfico OSM; no es medición de superficie actual."},
            "geometry": {"type": "Polygon", "coordinates": [coords]}}
    info = {"osm_url": f"https://www.openstreetmap.org/way/{el['id']}", "name": el.get("tags", {}).get("name"),
            "tags": el.get("tags", {}), "n_vertices": len(coords), "closed_ring": closed, "bbox": bbox_of(coords)}
    if ids["dam_way"]:
        time.sleep(2)
        dam = fetch_way(ids["dam_way"])
        dcoords = [[p["lon"], p["lat"]] for p in dam["geometry"]]
        info["dam"] = {"osm_url": f"https://www.openstreetmap.org/way/{dam['id']}", "tags": dam.get("tags", {}),
                       "bbox": bbox_of(dcoords),
                       "midpoint": dcoords[len(dcoords) // 2]}
    save(f"osm_{case}.geojson", {"type": "FeatureCollection", "features": [feat]})
    summary["cases"][case] = info
    time.sleep(2)

save("osm_cases.json", summary)
print(json.dumps(summary, ensure_ascii=False, indent=2))
