"""Paso 3b: alternativas de precipitación por PUNTO — NASA POWER y Open-Meteo Historical.

Son series en UN punto (centro del rectángulo del polígono OSM), NO promedios
de cuenca. Sirven solo como respaldo o comparación metodológica.
Período de prueba: 2025-08-01 a 2025-10-31 (92 días).
Salida: data/raw/exploration/point_apis.json
"""
import time
import urllib.parse

from common import bbox_of, get_json, load, now_utc, save

START, END = "2025-08-01", "2025-10-31"
out = {"queried_at": now_utc(), "period": [START, END], "cases": {}}
for case in ["laguna-pozuelos", "dique-las-maderas"]:
    x0, y0, x1, y1 = bbox_of(load(f"osm_{case}.geojson")["features"][0]["geometry"]["coordinates"][0])
    lat, lon = round((y0 + y1) / 2, 4), round((x0 + x1) / 2, 4)
    rec = {"point": {"lat": lat, "lon": lon, "nota": "centro del rectángulo del polígono OSM"}}

    q = urllib.parse.urlencode({"parameters": "PRECTOTCORR", "community": "AG", "longitude": lon, "latitude": lat,
                                "start": START.replace("-", ""), "end": END.replace("-", ""), "format": "JSON"})
    s, d = get_json(f"https://power.larc.nasa.gov/api/temporal/daily/point?{q}", timeout=120)
    if d:
        ser = d["properties"]["parameter"]["PRECTOTCORR"]
        fill = d.get("header", {}).get("fill_value")
        vals = [v for v in ser.values() if v != fill]
        rec["nasa_power"] = {"http": s, "units": d.get("parameters", {}).get("PRECTOTCORR", {}).get("units"),
                             "longname": d.get("parameters", {}).get("PRECTOTCORR", {}).get("longname"),
                             "sources": d.get("header", {}).get("sources"), "n_days": len(ser), "n_fill": len(ser) - len(vals),
                             "sum_mm": round(sum(vals), 2), "returned_point": d.get("geometry", {}).get("coordinates")}
    else:
        rec["nasa_power"] = {"http": s}
    time.sleep(2)

    q = urllib.parse.urlencode({"latitude": lat, "longitude": lon, "start_date": START, "end_date": END,
                                "daily": "precipitation_sum", "timezone": "UTC"})
    s, d = get_json(f"https://archive-api.open-meteo.com/v1/archive?{q}", timeout=120)
    if d:
        vals = d["daily"]["precipitation_sum"]
        rec["open_meteo"] = {"http": s, "units": d.get("daily_units", {}).get("precipitation_sum"),
                             "n_days": len(vals), "n_null": sum(v is None for v in vals),
                             "sum_mm": round(sum(v for v in vals if v is not None), 2),
                             "returned_point": [d.get("latitude"), d.get("longitude")], "elevation_m": d.get("elevation")}
    else:
        rec["open_meteo"] = {"http": s}
    out["cases"][case] = rec
    print(case, rec)
    time.sleep(2)
save("point_apis.json", out)
