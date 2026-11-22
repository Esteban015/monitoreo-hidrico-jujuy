"""Mapa base local (Fase 5, DECISIONS.md D-22): límites REALES de Jujuy desde el WFS del IGN Argentina.

- Capas: ign:provincia (nam='Jujuy') e ign:departamento (in1 LIKE '38%', los 16 departamentos de Jujuy).
- La respuesta cruda se guarda en data/raw/ign/ (no versionado) y se reutiliza si existe.
- Se simplifica con Douglas-Peucker (TOL_DEG) solo para bajar el peso del frontend; es una capa de
  CONTEXTO cartográfico, no se usa en ningún cálculo.
- Salida: data/derived/basemap/jujuy_provincia_ign.geojson y jujuy_departamentos_ign.geojson
Ejecutar con: scripts/.venv/Scripts/python scripts/basemap/fetch_ign_basemap.py
"""
import json
import sys
import urllib.parse
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / "explore"))
from common import http, now_utc  # noqa: E402

ROOT = HERE.parents[1]
RAW = ROOT / "data" / "raw" / "ign"
OUT = ROOT / "data" / "derived" / "basemap"
RAW.mkdir(parents=True, exist_ok=True)
OUT.mkdir(parents=True, exist_ok=True)
WFS = "https://wms.ign.gob.ar/geoserver/ows"
TOL_DEG = 0.001  # ~100 m en Jujuy

LAYERS = {
    "provincia": {"typeNames": "ign:provincia", "CQL_FILTER": "nam='Jujuy'"},
    "departamentos": {"typeNames": "ign:departamento", "CQL_FILTER": "in1 LIKE '38%'"},
}


def fetch(name, params):
    p = RAW / f"{name}.json"
    if p.exists():
        return json.loads(p.read_text(encoding="utf-8")), "cache"
    q = urllib.parse.urlencode({"service": "WFS", "version": "2.0.0", "request": "GetFeature",
                                "outputFormat": "application/json", **params})
    for _ in range(3):
        s, b = http(f"{WFS}?{q}", timeout=300)
        if s == 200:
            p.write_bytes(b)
            return json.loads(b), "red"
    raise SystemExit(f"WFS IGN no disponible para {name} (HTTP {s})")


def perp(p, a, b):
    (x, y), (x1, y1), (x2, y2) = p, a, b
    dx, dy = x2 - x1, y2 - y1
    if dx == dy == 0:
        return ((x - x1) ** 2 + (y - y1) ** 2) ** 0.5
    return abs(dy * x - dx * y + x2 * y1 - y2 * x1) / (dx * dx + dy * dy) ** 0.5


def dp(pts, tol):
    """Douglas-Peucker iterativo."""
    keep = [False] * len(pts)
    keep[0] = keep[-1] = True
    stack = [(0, len(pts) - 1)]
    while stack:
        i, j = stack.pop()
        dmax, idx = 0.0, None
        for k in range(i + 1, j):
            d = perp(pts[k], pts[i], pts[j])
            if d > dmax:
                dmax, idx = d, k
        if idx is not None and dmax > tol:
            keep[idx] = True
            stack += [(i, idx), (idx, j)]
    return [p for p, k in zip(pts, keep) if k]


def simplify_geom(g):
    polys = g["coordinates"] if g["type"] == "MultiPolygon" else [g["coordinates"]]
    out = []
    for poly in polys:
        rings = []
        for r in poly:
            s = [[round(x, 5), round(y, 5)] for x, y in dp([tuple(c[:2]) for c in r], TOL_DEG)]
            if len(s) >= 4 and s[0] == s[-1]:
                rings.append(s)
        if rings:
            out.append(rings)
    return {"type": "MultiPolygon", "coordinates": out}


def nverts(g):
    polys = g["coordinates"] if g["type"] == "MultiPolygon" else [g["coordinates"]]
    return sum(len(r) for p in polys for r in p)


report = {}
for name, params in LAYERS.items():
    fc, src = fetch(name, params)
    feats = []
    for f in fc["features"]:
        x, y = f["geometry"]["coordinates"][0][0][0][:2] if f["geometry"]["type"] == "MultiPolygon" else f["geometry"]["coordinates"][0][0][:2]
        assert -68 < x < -64 and -25 < y < -21, f"orden de ejes inesperado: {x},{y}"
        g = simplify_geom(f["geometry"])
        feats.append({"type": "Feature", "properties": {"nombre": f["properties"]["nam"], "in1": f["properties"]["in1"]}, "geometry": g})
        report.setdefault(name, []).append({"nombre": f["properties"]["nam"], "vertices_orig": nverts(f["geometry"]), "vertices_simpl": nverts(g)})
    out = {"type": "FeatureCollection",
           "properties": {"source": "Instituto Geográfico Nacional (IGN), Argentina — WFS wms.ign.gob.ar", "layer": params["typeNames"],
                          "filter": params["CQL_FILTER"], "retrieved": now_utc() if src == "red" else "ver data/raw/ign (caché)",
                          "simplification": f"Douglas-Peucker {TOL_DEG}° (~100 m), coordenadas a 5 decimales; solo contexto cartográfico",
                          "attribution": "Límites: IGN Argentina", "license": "por verificar (atribución al IGN obligatoria)"},
           "features": feats}
    path = OUT / f"jujuy_{name}_ign.geojson"
    path.write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"{name}: {len(feats)} entidades, {sum(r['vertices_orig'] for r in report[name])} -> "
          f"{sum(r['vertices_simpl'] for r in report[name])} vértices, {path.stat().st_size // 1024} KB ({src})")
