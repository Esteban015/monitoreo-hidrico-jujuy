"""Paso 4: límites hidrográficos — HydroBASINS v1c (HydroSHEDS) y sondeo de IGN.

1. Descarga HydroBASINS Sudamérica nivel 10 (formato estándar, sin lagos),
   ~68 MB, a data/raw/hydrobasins/ (no versionado).
2. Ubica la subcuenca que contiene un punto de referencia por caso:
   - Las Maderas: punto medio del muro de la presa (OSM way 85604244).
   - Pozuelos: un vértice-promedio interior del polígono del lago (verificado
     dentro del polígono).
3. Si la unidad es endorreica (ENDO=1), sigue NEXT_DOWN hasta el sumidero
   (ENDO=2) antes de recorrer aguas arriba. Recorre aguas arriba con NEXT_DOWN para obtener la "cuenca de aporte" según
   HydroBASINS (unión de subcuencas) y compara con el atributo UP_AREA.
Limitación: las subcuencas HydroBASINS cierran en confluencias, no en presas;
la unidad que contiene la presa puede incluir área aguas abajo de ella.
4. Sondea el WFS del IGN buscando capas con "cuenca" en el nombre.
Salida: data/raw/exploration/hydrobasins.json
"""
import io
import json
import re
import zipfile
from pathlib import Path

import shapefile

from common import ROOT, http, load, now_utc, save

DL = ROOT / "data" / "raw" / "hydrobasins"
DL.mkdir(parents=True, exist_ok=True)
# Nivel 08 se intentó el 2026-11-22 y falló por timeout (1440 s); el 10 es más fino y suficiente.
LEVELS = ["10"]


def pip(x, y, ring):
    inside = False
    j = len(ring) - 1
    for i in range(len(ring)):
        xi, yi = ring[i]
        xj, yj = ring[j]
        if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi + 1e-15) + xi:
            inside = not inside
        j = i
    return inside


def in_shape(x, y, shp):
    pts = shp.points
    parts = list(shp.parts) + [len(pts)]
    hits = sum(pip(x, y, pts[parts[k]:parts[k + 1]]) for k in range(len(parts) - 1))
    return hits % 2 == 1  # anillo exterior + huecos


osm = load("osm_cases.json")["cases"]
ring_p = load("osm_laguna-pozuelos.geojson")["features"][0]["geometry"]["coordinates"][0]
cx = sum(p[0] for p in ring_p) / len(ring_p)
cy = sum(p[1] for p in ring_p) / len(ring_p)
assert pip(cx, cy, ring_p), "el punto promedio no cae dentro del lago"
points = {"dique-las-maderas": tuple(osm["dique-las-maderas"]["dam"]["midpoint"]), "laguna-pozuelos": (cx, cy)}

out = {"queried_at": now_utc(), "license": "HydroSHEDS license (ver HydroSHEDS_TechDoc_v1_4.pdf); uso libre científico, educativo y comercial con atribución",
       "citation": "Lehner, B., Grill G. (2013). Hydrological Processes, 27(15): 2171–2186.",
       "reference_points": {k: list(v) for k, v in points.items()}, "levels": {}}
for lev in LEVELS:
    url = f"https://data.hydrosheds.org/file/HydroBASINS/standard/hybas_sa_lev{lev}_v1c.zip"
    zpath = DL / f"hybas_sa_lev{lev}_v1c.zip"
    if not zpath.exists():
        s, body = http(url, timeout=600)
        if s != 200:
            out["levels"][lev] = {"url": url, "http": s}
            continue
        zpath.write_bytes(body)
    z = zipfile.ZipFile(zpath)
    base = next(n[:-4] for n in z.namelist() if n.endswith(".shp"))
    r = shapefile.Reader(shp=io.BytesIO(z.read(base + ".shp")), dbf=io.BytesIO(z.read(base + ".dbf")),
                         shx=io.BytesIO(z.read(base + ".shx")))
    fields = [f[0] for f in r.fields[1:]]
    recs = [dict(zip(fields, rec)) for rec in r.records()]
    by_id = {rec["HYBAS_ID"]: i for i, rec in enumerate(recs)}
    upstream = {}
    for rec in recs:
        upstream.setdefault(rec["NEXT_DOWN"], []).append(rec["HYBAS_ID"])
    lev_out = {"url": url, "zip_bytes": zpath.stat().st_size, "n_basins": len(recs), "fields": fields, "cases": {}}
    shapes = r.shapes()

    def locate(x, y):
        for i, sh in enumerate(shapes):
            bx0, by0, bx1, by1 = sh.bbox
            if bx0 <= x <= bx1 and by0 <= y <= by1 and in_shape(x, y, sh):
                return i
        return None

    for case, (x, y) in points.items():
        hit = locate(x, y)
        if hit is None:
            lev_out["cases"][case] = {"found": False}
            continue
        rec = recs[hit]
        point_unit = rec["HYBAS_ID"]
        chain = [point_unit]
        while rec["ENDO"] == 1 and rec["NEXT_DOWN"] in by_id:
            rec = recs[by_id[rec["NEXT_DOWN"]]]
            chain.append(rec["HYBAS_ID"])
        diag = {}
        if case == "laguna-pozuelos":
            units = {}
            for vx, vy in ring_p[::8]:
                j = locate(vx, vy)
                if j is not None:
                    units[recs[j]["HYBAS_ID"]] = recs[j]["ENDO"]
            diag = {"units_touching_lake_outline_sample": {str(k): v for k, v in units.items()}}
        ids, stack = [], [rec["HYBAS_ID"]]
        while stack:
            h = stack.pop()
            ids.append(h)
            stack += upstream.get(h, [])
        sub_sum = sum(recs[by_id[h]]["SUB_AREA"] for h in ids)
        lev_out["cases"][case] = {"found": True, "point_unit": point_unit, "downstream_chain_to_outlet": chain,
                                  **diag, "HYBAS_ID": rec["HYBAS_ID"], "SUB_AREA_km2": rec["SUB_AREA"],
                                  "UP_AREA_km2": rec["UP_AREA"], "ENDO": rec["ENDO"], "COAST": rec["COAST"],
                                  "NEXT_DOWN": rec["NEXT_DOWN"], "n_upstream_units": len(ids),
                                  "sum_SUB_AREA_upstream_km2": round(sub_sum, 1), "upstream_ids": ids}
        # GeoJSON de la cuenca de aporte (unión sin disolver) para inspección visual
        feats = []
        for h in ids:
            sh = r.shape(by_id[h])
            pts, parts = sh.points, list(sh.parts) + [len(sh.points)]
            feats.append({"type": "Feature", "properties": {"HYBAS_ID": h, "SUB_AREA": recs[by_id[h]]["SUB_AREA"]},
                          "geometry": {"type": "Polygon", "coordinates": [[list(p) for p in pts[parts[k]:parts[k + 1]]] for k in range(len(parts) - 1)]}})
        (ROOT / "data" / "raw" / "exploration" / f"hybas_lev{lev}_{case}.geojson").write_text(
            json.dumps({"type": "FeatureCollection", "features": feats}), encoding="utf-8")
        print(f"lev{lev} {case}: HYBAS_ID={rec['HYBAS_ID']} SUB_AREA={rec['SUB_AREA']} UP_AREA={rec['UP_AREA']} "
              f"ENDO={rec['ENDO']} unidades_aguas_arriba={len(ids)} suma={sub_sum:.1f} km²")
    out["levels"][lev] = lev_out

# Sondeo de fuente oficial (IGN Argentina, WFS)
s, body = http("https://wms.ign.gob.ar/geoserver/ows?service=WFS&version=2.0.0&request=GetCapabilities", timeout=120)
names = re.findall(r"<(?:wfs:)?Name>([^<]+)</(?:wfs:)?Name>", body.decode("utf-8", "replace")) if s == 200 else []
out["ign_wfs"] = {"http": s, "n_layers": len(names),
                  "layers_matching": [n for n in names if re.search(r"cuenca|hidro|agua|embalse|lago|laguna", n, re.I)]}
print("IGN WFS:", out["ign_wfs"])
save("hydrobasins.json", out)
