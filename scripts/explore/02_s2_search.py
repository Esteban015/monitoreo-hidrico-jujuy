"""Paso 2a: búsqueda de escenas Sentinel-2 L2A que intersectan el rectángulo envolvente del AOI (polígono OSM).

Catálogos:
- Microsoft Planetary Computer (MPC) STAC, colección sentinel-2-l2a (público, sin cuenta).
- Copernicus Data Space Ecosystem (CDSE) STAC, colección sentinel-2-l2a (catálogo público).

Ventanas candidatas (hemisferio sur, régimen de lluvias estival):
- "fin_humeda": 15-mar a 31-may (después de la temporada de lluvias)
- "fin_seca"  : 01-sep a 30-nov (antes de las lluvias)
para 2024 y 2025. Filtro: eo:cloud_cover < 20 (nubosidad DE TODA LA ESCENA según el proveedor).
La nubosidad efectiva sobre el AOI se calcula en 03_s2_access.py.
Salida: data/raw/exploration/s2_search.json
"""
import json
import time

from common import bbox_of, load, now_utc, post_json, save

MPC = "https://planetarycomputer.microsoft.com/api/stac/v1/search"
CDSE = "https://stac.dataspace.copernicus.eu/v1/search"
WINDOWS = {
    "fin_humeda_2024": "2024-03-15T00:00:00Z/2024-05-31T23:59:59Z",
    "fin_seca_2024": "2024-09-01T00:00:00Z/2024-11-30T23:59:59Z",
    "fin_humeda_2025": "2025-03-15T00:00:00Z/2025-05-31T23:59:59Z",
    "fin_seca_2025": "2025-09-01T00:00:00Z/2025-11-30T23:59:59Z",
}
CASES = ["laguna-pozuelos", "dique-las-maderas"]
NEEDED = ["B03", "B08", "B11", "SCL"]


def search_all(url, payload, max_pages=10):
    feats, status_log = [], []
    body = dict(payload)
    for _ in range(max_pages):
        s, d = post_json(url, body)
        status_log.append(s)
        if s != 200 or d is None:
            break
        feats += d.get("features", [])
        nxt = next((l for l in d.get("links", []) if l.get("rel") == "next"), None)
        if not nxt:
            break
        if nxt.get("body"):
            body = {**body, **nxt["body"]}
        else:
            break
        time.sleep(1)
    return feats, status_log


out = {"queried_at": now_utc(), "filter": "eo:cloud_cover < 20 (escena completa)", "cases": {}}
for case in CASES:
    ring = load(f"osm_{case}.geojson")["features"][0]["geometry"]["coordinates"][0]
    bbox = bbox_of(ring)  # búsqueda por rectángulo envolvente; cobertura real del polígono se verifica en 03
    out["cases"][case] = {}
    for wname, dt in WINDOWS.items():
        payload = {"collections": ["sentinel-2-l2a"], "bbox": bbox, "datetime": dt,
                   "query": {"eo:cloud_cover": {"lt": 20}}, "limit": 100}
        mpc, mpc_status = search_all(MPC, payload)
        mpc_rows = []
        for f in mpc:
            p, a = f["properties"], f["assets"]
            mpc_rows.append({
                "id": f["id"], "datetime": p["datetime"], "cloud_cover_scene_pct": p.get("eo:cloud_cover"),
                "mgrs_tile": p.get("s2:mgrs_tile"), "platform": p.get("platform"),
                "processing_baseline": p.get("s2:processing_baseline"),
                "bands_present": [b for b in NEEDED if b in a],
                "gsd_m": {b: a[b].get("gsd") for b in NEEDED if b in a},
                "stac_item_url": f"https://planetarycomputer.microsoft.com/api/stac/v1/collections/sentinel-2-l2a/items/{f['id']}",
            })
        time.sleep(1)
        cdse_payload = {"collections": ["sentinel-2-l2a"], "bbox": bbox, "datetime": dt,
                        "filter": {"op": "<", "args": [{"property": "eo:cloud_cover"}, 20]}, "filter-lang": "cql2-json", "limit": 100}
        cdse, cdse_status = search_all(CDSE, cdse_payload)
        cdse_rows = [{"id": f["id"], "datetime": f["properties"]["datetime"],
                      "cloud_cover_scene_pct": f["properties"].get("eo:cloud_cover")} for f in cdse]
        out["cases"][case][wname] = {"mpc": {"http": mpc_status, "n": len(mpc_rows), "items": sorted(mpc_rows, key=lambda r: r["datetime"])},
                                     "cdse": {"http": cdse_status, "n": len(cdse_rows), "items": sorted(cdse_rows, key=lambda r: r["datetime"])}}
        print(f"{case:18s} {wname:16s} MPC n={len(mpc_rows):3d} http={mpc_status}  CDSE n={len(cdse_rows):3d} http={cdse_status}  tiles={sorted({r['mgrs_tile'] for r in mpc_rows})}")
        time.sleep(1)

save("s2_search.json", out)
