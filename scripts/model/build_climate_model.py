"""Genera la serie climática real (Open-Meteo) y el simulador demostrativo.

Salidas:
  data/derived/climate/climate_series.json  -> lluvia y temperatura mensuales reales
  data/derived/model/water_model.json       -> modelo HistGradientBoostingRegressor exportado a grilla

ADVERTENCIA CIENTÍFICA:
  Solo existen 2 observaciones reales de superficie por caso (Sentinel-2). No alcanzan
  para entrenar un modelo predictivo validado. El modelo se entrena con una respuesta
  estacional SINTÉTICA calibrada a esas 2 observaciones y se rotula como demostrativo.
  No debe usarse para decisiones de manejo del agua.
"""
from __future__ import annotations

import inspect
import json
import random
from datetime import date, timedelta
from pathlib import Path

import numpy as np
import requests
import sklearn
from sklearn.ensemble import HistGradientBoostingRegressor
from sklearn.metrics import mean_absolute_error, r2_score
from sklearn.model_selection import train_test_split

# La grilla publicada se generó con esta versión. Otra versión sigue pudiendo entrenar,
# pero se avisa: los hiperparámetros que no existan en esa versión se omiten.
PINNED_SKLEARN = "1.9.1"

ROOT = Path(__file__).resolve().parents[2]
DERIVED = ROOT / "data" / "derived"
CACHE = ROOT / "data" / "raw" / "climate"
CACHE.mkdir(parents=True, exist_ok=True)
(DERIVED / "climate").mkdir(parents=True, exist_ok=True)
(DERIVED / "model").mkdir(parents=True, exist_ok=True)

SEED = 42
random.seed(SEED)
np.random.seed(SEED)

START = "2019-01-01"
END = (date.today() - timedelta(days=2)).isoformat()


def read_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def aoi_centroid(geojson: dict) -> tuple[float, float]:
    xs: list[float] = []
    ys: list[float] = []

    def walk(c):
        if isinstance(c, (list, tuple)) and len(c) == 2 and all(isinstance(v, (int, float)) for v in c):
            xs.append(float(c[0]))
            ys.append(float(c[1]))
        elif isinstance(c, (list, tuple)):
            for x in c:
                walk(x)

    for f in geojson.get("features", []):
        walk(f.get("geometry", {}).get("coordinates", []))
    if not xs:
        raise ValueError("AOI sin coordenadas")
    return (min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2


def fetch_open_meteo(case_id: str, lat: float, lon: float) -> dict:
    cache_file = CACHE / f"openmeteo_{case_id}.json"
    if cache_file.exists():
        cached = read_json(cache_file)
        if cached.get("daily", {}).get("time"):
            return cached
    params = {
        "latitude": f"{lat:.4f}",
        "longitude": f"{lon:.4f}",
        "start_date": START,
        "end_date": END,
        "daily": "precipitation_sum,temperature_2m_mean",
        "timezone": "America/Argentina/Jujuy",
    }
    url = "https://archive-api.open-meteo.com/v1/archive"
    r = requests.get(url, params=params, headers={"User-Agent": "cuencas-jujuy-mvp/1.0"}, timeout=120)
    r.raise_for_status()
    data = r.json()
    data["_url"] = r.url
    cache_file.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
    return data


def month_add(ym: str, delta: int) -> str:
    y, m = map(int, ym.split("-"))
    total = y * 12 + (m - 1) + delta
    return f"{total // 12:04d}-{total % 12 + 1:02d}"


def monthly_from_daily(raw: dict) -> dict[str, dict[str, float | None]]:
    daily = raw["daily"]
    out: dict[str, dict[str, list[float]]] = {}
    for d, p, t in zip(daily["time"], daily["precipitation_sum"], daily["temperature_2m_mean"]):
        ym = d[:7]
        row = out.setdefault(ym, {"p": [], "t": []})
        if p is not None:
            row["p"].append(float(p))
        if t is not None:
            row["t"].append(float(t))
    return {
        ym: {
            "precip_mm": round(sum(v["p"]), 2) if v["p"] else None,
            "temp_c": round(sum(v["t"]) / len(v["t"]), 2) if v["t"] else None,
        }
        for ym, v in sorted(out.items())
    }


def rolling(monthly: dict[str, dict[str, float | None]], last_month: str) -> list[dict]:
    rows = []
    ym = month_add("2019-01", 2)
    while ym <= last_month:
        window = [month_add(ym, -k) for k in (2, 1, 0)]
        ps = [monthly.get(m, {}).get("precip_mm") for m in window]
        ts = [monthly.get(m, {}).get("temp_c") for m in window]
        if all(x is not None for x in ps) and all(x is not None for x in ts):
            rows.append(
                {
                    "month": ym,
                    "precip_mm": monthly[ym]["precip_mm"],
                    "temp_c": monthly[ym]["temp_c"],
                    "precip_3m_mm": round(sum(ps), 2),
                    "temp_3m_c": round(sum(ts) / 3, 2),
                }
            )
        ym = month_add(ym, 1)
    return rows


def window_before(rows: list[dict], image_date: str) -> dict:
    target = month_add(image_date[:7], -1)
    return next(r for r in reversed(rows) if r["month"] <= target)


def make_regressor() -> HistGradientBoostingRegressor:
    """Construye el estimador con los parámetros que esta versión de scikit-learn acepta."""
    if sklearn.__version__ != PINNED_SKLEARN:
        print(
            f"[model] aviso de versión: scikit-learn {sklearn.__version__} "
            f"(el dataset publicado usa {PINNED_SKLEARN}). "
            "pip install scikit-learn==" + PINNED_SKLEARN
        )
    wanted = {
        "max_iter": 300,
        "learning_rate": 0.06,
        "max_leaf_nodes": 15,
        "l2_regularization": 1.0,
        "early_stopping": True,
        "validation_fraction": 0.12,
        "n_iter_no_change": 20,
        "random_state": SEED,
    }
    supported = set(inspect.signature(HistGradientBoostingRegressor.__init__).parameters)
    dropped = sorted(k for k in wanted if k not in supported)
    if dropped:
        print(f"[model] sklearn {sklearn.__version__} no acepta: {', '.join(dropped)}. Se omiten.")
    return HistGradientBoostingRegressor(**{k: v for k, v in wanted.items() if k in supported})


def main() -> None:
    cases = read_json(DERIVED / "cases.json")["cases"]
    water = read_json(DERIVED / "water_metrics.json")
    climate_out = {
        "generated_at": date.today().isoformat() + "T00:00:00Z",
        "generator": "scripts/model/build_climate_model.py",
        "source": "Open-Meteo Historical Weather API (reanálisis ERA5-Land)",
        "source_url": "https://archive-api.open-meteo.com/v1/archive",
        "license": "Open-Meteo: CC-BY 4.0 · ERA5-Land: Copernicus Climate Change Service",
        "kind": "estimacion",
        "real": True,
        "unit": {"precip_mm": "mm/mes", "temp_c": "°C", "precip_3m_mm": "mm/3 meses", "temp_3m_c": "°C"},
        "cases": {},
    }
    model_out = {
        "generated_at": date.today().isoformat() + "T00:00:00Z",
        "generator": "scripts/model/build_climate_model.py",
        "synthetic": True,
        "label": "DATOS SINTÉTICOS — MODELO DEMOSTRATIVO",
        "algorithm": "HistGradientBoostingRegressor",
        "sklearn_version": sklearn.__version__,
        "features": [
            {"name": "precip_3m_mm", "label": "Precipitación acumulada 3 meses", "unit": "mm"},
            {"name": "temp_3m_c", "label": "Temperatura media 3 meses", "unit": "°C"},
        ],
        "target": {"name": "area_km2", "label": "Superficie visible de agua", "unit": "km²"},
        "disclaimer": (
            "Modelo demostrativo entrenado con una respuesta sintética calibrada a 2 observaciones reales. "
            "No es una predicción validada, no estima volumen ni caudal y no debe usarse para decisiones. "
            "Una predicción real requiere una serie multianual de superficie de agua."
        ),
        "assumptions": [
            "Sólo hay 2 observaciones reales de superficie por caso; no alcanzan para validar un modelo.",
            "Precipitación y temperatura son colineales entre esas 2 observaciones: se fija la elasticidad térmica en 5 % por +5 °C y se calibra la de precipitación.",
            "La respuesta es un supuesto conceptual, no un resultado empírico.",
        ],
        "cases": {},
    }

    for case in cases:
        cid = case["case_id"]
        aoi = read_json(DERIVED / case["aoi"]["file"])
        lon, lat = aoi_centroid(aoi)
        raw = fetch_open_meteo(cid, lat, lon)
        monthly = monthly_from_daily(raw)
        last_complete = month_add(date.today().strftime("%Y-%m"), -1)
        rows = rolling(monthly, last_complete)

        obs = [s for s in water["scenes"] if s["case_id"] == cid]
        obs = sorted(obs, key=lambda s: s["date"])
        calib = []
        for s in obs:
            w = window_before(rows, s["date"])
            calib.append(
                {
                    "date": s["date"],
                    "window_month": w["month"],
                    "area_km2": round(s["water"]["MNDWI"]["area_km2"], 4),
                    "precip_3m_mm": w["precip_3m_mm"],
                    "temp_3m_c": w["temp_3m_c"],
                }
            )

        # Respuesta conceptual calibrada a las 2 observaciones (2 incógnitas, 2 ecuaciones).
        areas = np.array([c["area_km2"] for c in calib], dtype=float)
        ps = np.array([c["precip_3m_mm"] for c in calib], dtype=float)
        ts = np.array([c["temp_3m_c"] for c in calib], dtype=float)
        area_ref = float(areas.mean())
        p_ref = float(ps.mean())
        t_ref = float(ts.mean())
        x = (ps - p_ref) / 100.0
        z = (ts - t_ref) / 5.0
        y = areas / area_ref - 1.0
        # Con 2 observaciones, precipitación y temperatura son colineales (det ≈ 0):
        # no se pueden identificar ambas elasticidades. Se fija un supuesto térmico
        # conservador (5 % menos superficie por +5 °C) y se calibra la precipitación.
        BETA_FIXED = 0.05
        slopes = [(y[i] + BETA_FIXED * z[i]) / x[i] for i in range(len(x)) if abs(x[i]) > 1e-6]
        alpha = float(np.mean(slopes)) if slopes else 0.1
        beta = BETA_FIXED
        # Límites físicos: la respuesta no puede crecer sin control ni ser negativa.
        alpha = float(np.clip(alpha, -1.0, 1.0))
        beta = float(np.clip(beta, -1.0, 1.0))

        def response(p3: float, t3: float) -> float:
            v = area_ref * (1.0 + alpha * (p3 - p_ref) / 100.0 - beta * (t3 - t_ref) / 5.0)
            return float(np.clip(v, 0.12 * area_ref, 1.6 * area_ref))

        # Rango de escenarios: clima histórico observado, con margen.
        p_lo = min(min(r["precip_3m_mm"] for r in rows), ps.min())
        p_hi = max(max(r["precip_3m_mm"] for r in rows), ps.max())
        t_lo = min(min(r["temp_3m_c"] for r in rows), ts.min())
        t_hi = max(max(r["temp_3m_c"] for r in rows), ts.max())
        pad_p = max(15.0, (p_hi - p_lo) * 0.08)
        pad_t = max(1.0, (t_hi - t_lo) * 0.08)
        p_lo, p_hi = max(0.0, p_lo - pad_p), p_hi + pad_p
        t_lo, t_hi = t_lo - pad_t, t_hi + pad_t

        n = 4000
        rng = np.random.default_rng(SEED)
        X = np.column_stack([rng.uniform(p_lo, p_hi, n), rng.uniform(t_lo, t_hi, n)])
        y_syn = np.array([response(p, t) for p, t in X]) + rng.normal(0, 0.01 * area_ref, n)
        X_train, X_test, y_train, y_test = train_test_split(X, y_syn, test_size=0.2, random_state=SEED)

        reg = make_regressor()
        reg.fit(X_train, y_train)
        pred = reg.predict(X_test)

        # Grilla 61x61 exportada para inferencia sin sklearn en el navegador.
        gp = np.linspace(p_lo, p_hi, 61)
        gt = np.linspace(t_lo, t_hi, 61)
        mesh = np.array([[response(p, t) for p in gp] for t in gt])  # sólo para referencia
        grid_pred = reg.predict(np.array([[p, t] for t in gt for p in gp])).reshape(len(gt), len(gp))

        baseline = rows[-1]
        obs_b = calib[-1]
        model_out["cases"][cid] = {
            "name": case["name"],
            "synthetic": True,
            "baseline": {
                "month": obs_b["window_month"],
                "precip_3m_mm": obs_b["precip_3m_mm"],
                "temp_3m_c": obs_b["temp_3m_c"],
                "last_observed_area_km2": obs_b["area_km2"],
                "last_observed_date": obs_b["date"],
                "latest_climate": {
                    "month": baseline["month"],
                    "precip_3m_mm": baseline["precip_3m_mm"],
                    "temp_3m_c": baseline["temp_3m_c"],
                },
            },
            "ranges": {"precip_3m_mm": [round(float(p_lo), 2), round(float(p_hi), 2)], "temp_3m_c": [round(float(t_lo), 2), round(float(t_hi), 2)]},
            "grid": {
                "precip_3m_mm": [round(float(v), 2) for v in gp],
                "temp_3m_c": [round(float(v), 2) for v in gt],
                "area_km2": [[round(float(v), 4) for v in row] for row in grid_pred],
            },
            "training": {
                "samples": n,
                "synthetic": True,
                "r2_synthetic_test": round(float(r2_score(y_test, pred)), 4),
                "mae_synthetic_test_km2": round(float(mean_absolute_error(y_test, pred)), 4),
                "calibration": [
                    {
                        "date": c["date"],
                        "observed_km2": c["area_km2"],
                        "model_km2": round(response(c["precip_3m_mm"], c["temp_3m_c"]), 4),
                        "precip_3m_mm": c["precip_3m_mm"],
                        "temp_3m_c": c["temp_3m_c"],
                    }
                    for c in calib
                ],
            },
            "response": {
                "alpha_precip_per_100mm": round(alpha, 4),
                "beta_temp_per_5c": round(beta, 4),
                "area_ref_km2": round(area_ref, 4),
                "p_ref_mm": round(p_ref, 2),
                "t_ref_c": round(t_ref, 2),
            },
            "reference_grid_area_km2": round(float(mesh.mean()), 4),
        }

        climate_out["cases"][cid] = {
            "name": case["name"],
            "lat": round(lat, 4),
            "lon": round(lon, 4),
            "elevation_m": raw.get("elevation"),
            "first_month": rows[0]["month"],
            "last_month": rows[-1]["month"],
            "months": rows,
            "observations": calib,
        }
        print(f"[model] {cid}: alpha={alpha:.3f} beta={beta:.3f} R2_sint={r2_score(y_test, pred):.3f}")

    (DERIVED / "climate" / "climate_series.json").write_text(json.dumps(climate_out, ensure_ascii=False, indent=2), encoding="utf-8")
    (DERIVED / "model" / "water_model.json").write_text(json.dumps(model_out, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"[model] escrito {DERIVED / 'climate' / 'climate_series.json'}")
    print(f"[model] escrito {DERIVED / 'model' / 'water_model.json'}")


if __name__ == "__main__":
    main()
