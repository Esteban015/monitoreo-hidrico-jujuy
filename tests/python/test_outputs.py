"""Validación QA de los datasets generados en data/derived/ (formato, metadatos, coherencia, geometrías)."""
import json
import math
import sys
import unittest
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts" / "process"))
import lib  # noqa: E402

D = ROOT / "data" / "derived"


def load(name):
    return json.loads((D / name).read_text(encoding="utf-8"))


class TestCases(unittest.TestCase):
    def test_estructura(self):
        c = load("cases.json")
        ids = [x["case_id"] for x in c["cases"]]
        self.assertEqual(sorted(ids), ["dique-las-maderas", "laguna-pozuelos"])
        for x in c["cases"]:
            self.assertEqual(x["basin"]["label"], "Cuenca de aporte modelada")
            self.assertFalse(x["basin"]["official"])
            self.assertTrue(x["basin"]["geometry_valid"])
            self.assertTrue(x["warnings"])
            for f in (x["aoi"]["file"], x["basin"]["file"]):
                self.assertTrue((D / f).exists(), f)

    def test_advertencia_las_maderas_aguas_abajo(self):
        lm = next(x for x in load("cases.json")["cases"] if x["case_id"] == "dique-las-maderas")
        self.assertTrue(any("aguas abajo" in w for w in lm["warnings"]))


class TestGeometrias(unittest.TestCase):
    def test_geojson_validos(self):
        files = sorted((D / "geometries").glob("*.geojson"))
        self.assertGreaterEqual(len(files), 8)
        for f in files:
            fc = json.loads(f.read_text(encoding="utf-8"))
            self.assertEqual(fc["type"], "FeatureCollection")
            self.assertTrue(fc["features"], f.name)
            for feat in fc["features"]:
                g = feat["geometry"]
                self.assertIn(g["type"], ("Polygon", "MultiPolygon"))
                polys = g["coordinates"] if g["type"] == "MultiPolygon" else [g["coordinates"]]
                for poly in polys:
                    for ring in poly:
                        self.assertEqual(list(ring[0]), list(ring[-1]), f.name)
                        self.assertGreaterEqual(len(ring), 4, f.name)
                        for x, y in ring:  # coherencia geográfica: Jujuy
                            self.assertTrue(-67.5 < x < -64.0 and -24.8 < y < -21.5, f"{f.name}: {x},{y}")

    def test_aoi_y_cuenca_sin_autointersecciones(self):
        for f in list((D / "geometries").glob("*_aoi_osm.geojson")) + list((D / "geometries").glob("*_basin_*.geojson")):
            for feat in json.loads(f.read_text(encoding="utf-8"))["features"]:
                for ring in feat["geometry"]["coordinates"]:
                    self.assertEqual(lib.ring_problems(ring), [], f.name)


class TestWater(unittest.TestCase):
    REQUIRED = ["case_id", "date", "scene_id", "source", "stac_item", "mgrs_tile", "crs", "processing_baseline", "radiometry",
                "cloud_cover_scene_pct", "region", "pixels", "coverage_pct", "cloud_effective_pct", "water", "unit", "kind",
                "status", "warnings", "files"]

    @classmethod
    def setUpClass(cls):
        cls.w = load("water_metrics.json")

    def test_metadatos_obligatorios(self):
        self.assertIn("method", self.w)
        self.assertEqual(len(self.w["scenes"]), 4)
        for s in self.w["scenes"]:
            for k in self.REQUIRED:
                self.assertIn(k, s, k)
            self.assertEqual(s["unit"], "km2")
            self.assertEqual(s["kind"], "estimacion")
            self.assertIn(s["status"], ("completo", "requiere_revision"))
            self.assertEqual(s["radiometry"]["offsets"]["B03"], -1000.0)
            self.assertTrue(any("no es volumen" in x for x in s["warnings"]))

    def test_fechas_coherentes(self):
        for s in self.w["scenes"]:
            self.assertIn(s["date"].replace("-", ""), s["scene_id"])  # fecha = la del identificador
            self.assertTrue(s["datetime"].startswith(s["date"]))
        for c in self.w["comparisons"]:
            self.assertLess(date.fromisoformat(c["date_a"]), date.fromisoformat(c["date_b"]))

    def test_misma_tesela_y_cobertura(self):
        by = {}
        for s in self.w["scenes"]:
            by.setdefault(s["case_id"], []).append(s)
            gates = self.w["method"]["qa_gates"]
            self.assertGreaterEqual(s["coverage_pct"], gates["coverage_min_pct"])
            self.assertLessEqual(s["cloud_effective_pct"], gates["cloud_max_pct"])
        for cid, ss in by.items():
            self.assertEqual(len({s["mgrs_tile"] for s in ss}), 1, cid)
            self.assertEqual(len({s["crs"] for s in ss}), 1, cid)
            self.assertEqual(len({s["region"]["pixels"] for s in ss}), 1, f"{cid}: región no constante")

    def test_contabilidad_de_pixeles(self):
        for s in self.w["scenes"]:
            p = s["pixels"]
            self.assertLessEqual(p["valid_common"], p["valid"])
            self.assertLessEqual(p["valid"], p["with_data"])
            self.assertLessEqual(p["with_data"], p["region"])
            for name in ("MNDWI", "NDWI"):
                self.assertLessEqual(s["water"][name]["pixels"], p["valid"])

    def test_conversion_de_area(self):
        for s in self.w["scenes"]:
            k = s["utm_scale_factor"]
            for name in ("MNDWI", "NDWI"):
                wv = s["water"][name]
                self.assertAlmostEqual(wv["area_km2"], lib.pixels_to_km2(wv["pixels"], 20.0, k), places=3)
                self.assertLessEqual(wv["area_km2"], s["region"]["area_km2"])

    def test_variacion_recalculada(self):
        for c in self.w["comparisons"]:
            for name in ("MNDWI", "NDWI"):
                v = c[name]
                expected = lib.pct_change(v["area_a_km2"], v["area_b_km2"])
                self.assertAlmostEqual(v["pct_change"], expected, places=1)
                self.assertAlmostEqual(v["abs_diff_km2"], v["area_b_km2"] - v["area_a_km2"], places=3)

    def test_sensibilidad_monotona(self):
        for c in self.w["comparisons"]:
            s = sorted(c["MNDWI_sensitivity"], key=lambda r: r["threshold"])
            for a, b in zip(s, s[1:]):  # umbral más alto => menos agua
                self.assertGreaterEqual(a["area_a_km2"], b["area_a_km2"])
                self.assertGreaterEqual(a["area_b_km2"], b["area_b_km2"])


class TestRainfall(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.r = load("rainfall_metrics.json")

    def test_metadatos(self):
        self.assertIn("CHIRPS v3.0", self.r["source"])
        self.assertEqual(self.r["unit"], "mm/mes")
        self.assertIn("mm/month", self.r["unit_evidence"])
        self.assertAlmostEqual(self.r["resolution_deg"][0], 0.05, places=4)
        self.assertTrue(any("no equivale a un acumulado móvil" in w for w in self.r["warnings"]))

    def test_mes_completo_previo_y_sin_sustitucion_puntual(self):
        for o in self.r["observations"]:
            y, m = lib.last_complete_month(date.fromisoformat(o["image_date"]))
            self.assertEqual(o["month"], f"{y}-{m:02d}")
            self.assertIn("media areal", o["method"])  # no es un dato puntual
            self.assertEqual(o["unit"], "mm/mes")
            self.assertGreater(o["basin_cells_with_weight"], 0)

    def test_referencia_y_anomalia(self):
        for o in self.r["observations"]:
            if o["value_mm"] is None:
                self.assertNotEqual(o["status"], "completo")
                continue
            self.assertGreaterEqual(o["value_mm"], 0)
            ref = o["reference"]
            year = int(o["month"][:4])
            self.assertNotIn(year, ref["years"])  # el año analizado no entra en su referencia
            self.assertEqual(ref["n_years"], len(ref["years"]))
            if o["anomaly_pct"] is not None:
                self.assertAlmostEqual(o["anomaly_pct"], (o["value_mm"] - ref["mean_mm"]) / ref["mean_mm"] * 100, delta=0.2)
                self.assertGreaterEqual(ref["n_years"], 10)


if __name__ == "__main__":
    unittest.main()
