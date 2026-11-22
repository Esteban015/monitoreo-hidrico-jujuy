"""Pruebas de funciones puras (scripts/process/lib.py).
Ejecutar: scripts/.venv/Scripts/python -m unittest discover -s tests/python -v
"""
import math
import sys
import unittest
from datetime import date
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "scripts" / "process"))
import lib  # noqa: E402


class TestIndices(unittest.TestCase):
    def test_mndwi_valores_conocidos(self):
        # agua típica: verde 0,08, SWIR 0,02 -> (0,08-0,02)/(0,10) = 0,6
        self.assertAlmostEqual(lib.mndwi(np.array([0.08]), np.array([0.02]))[0], 0.6)
        # suelo: verde 0,10, SWIR 0,30 -> -0,5
        self.assertAlmostEqual(lib.mndwi(np.array([0.10]), np.array([0.30]))[0], -0.5)

    def test_ndwi_valores_conocidos(self):
        self.assertAlmostEqual(lib.ndwi(np.array([0.06]), np.array([0.02]))[0], 0.5)
        self.assertAlmostEqual(lib.ndwi(np.array([0.05]), np.array([0.35]))[0], -0.75)

    def test_denominador_cero_es_nan(self):
        out = lib.normalized_difference(np.array([0.0, 0.1, -0.1]), np.array([0.0, -0.1, 0.1]))
        self.assertTrue(np.isnan(out).all())

    def test_nodata_es_nan(self):
        out = lib.mndwi(np.array([np.nan, 0.1]), np.array([0.1, np.nan]))
        self.assertTrue(np.isnan(out).all())

    def test_rango(self):
        rng = np.random.default_rng(0)
        a, b = rng.uniform(0.001, 1, 1000), rng.uniform(0.001, 1, 1000)
        out = lib.mndwi(a, b)
        self.assertTrue(((out >= -1) & (out <= 1)).all())


class TestRadiometria(unittest.TestCase):
    def test_offset_baseline_04(self):
        dn = np.array([1000, 1800, 0, 65535], dtype="uint16")
        r = lib.dn_to_reflectance(dn, -1000, 10000)
        self.assertAlmostEqual(float(r[0]), 0.0)
        self.assertAlmostEqual(float(r[1]), 0.08, places=6)
        self.assertTrue(np.isnan(r[2]) and np.isnan(r[3]))  # NODATA y SATURATED

    def test_offset_cambia_el_indice(self):
        # sin offset el índice difiere: demuestra por qué el offset es obligatorio
        g, s = np.array([1800]), np.array([1200])
        con = lib.mndwi(lib.dn_to_reflectance(g, -1000, 10000), lib.dn_to_reflectance(s, -1000, 10000))[0]
        sin = lib.mndwi(g.astype(float), s.astype(float))[0]
        self.assertAlmostEqual(con, 0.6, places=5)
        self.assertNotAlmostEqual(con, sin, places=2)


class TestSCL(unittest.TestCase):
    def test_mascara_nubes_y_sombras(self):
        scl = np.arange(12)
        valid = lib.scl_valid_mask(scl)
        self.assertEqual(set(scl[~valid].tolist()), {0, 1, 3, 8, 9, 10})
        self.assertTrue(valid[6])  # agua es válida
        self.assertTrue(valid[11])  # nieve/hielo se conserva (salares): se informa aparte


class TestRemuestreo(unittest.TestCase):
    def test_2x2(self):
        a = np.array([[1, 3, 5, 5], [1, 3, np.nan, 5]], dtype=float)
        out = lib.downsample_2x2_mean(a)
        self.assertEqual(out.shape, (1, 2))
        self.assertAlmostEqual(out[0, 0], 2.0)
        self.assertTrue(np.isnan(out[0, 1]))

    def test_impar_falla(self):
        with self.assertRaises(ValueError):
            lib.downsample_2x2_mean(np.zeros((3, 4)))

    def test_dilatacion_y_borde(self):
        m = np.zeros((9, 9), bool)
        m[4, 4] = True
        self.assertEqual(int(lib.dilate(m, 2).sum()), 25)
        reg = np.zeros((10, 10), bool)
        reg[2:8, 2:8] = True
        ring = lib.edge_ring(reg, 1)
        self.assertEqual(int(ring.sum()), 36 - 16)


class TestAreas(unittest.TestCase):
    def test_pixeles_a_km2(self):
        self.assertAlmostEqual(lib.pixels_to_km2(2500, 20.0), 1.0)  # 2500 x 400 m² = 1 km²
        self.assertAlmostEqual(lib.pixels_to_km2(0, 20.0), 0.0)
        with self.assertRaises(ValueError):
            lib.pixels_to_km2(-1, 20.0)

    def test_factor_escala_utm(self):
        self.assertAlmostEqual(lib.utm_scale_factor(-23, -69.0, 19), 0.9996, places=6)  # meridiano central
        k = lib.utm_scale_factor(-22.35, -66.0, 19)
        self.assertTrue(1.0005 < k < 1.0012)
        self.assertLess(lib.pixels_to_km2(2500, 20.0, k), 1.0)

    def test_shoelace(self):
        sq = [(0, 0), (1000, 0), (1000, 1000), (0, 1000), (0, 0)]
        self.assertEqual(lib.shoelace_area(sq), 1_000_000)


class TestVariacion(unittest.TestCase):
    def test_pct(self):
        self.assertAlmostEqual(lib.pct_change(10, 8), -20.0)
        self.assertAlmostEqual(lib.pct_change(4, 5), 25.0)

    def test_inicial_cero_o_faltante(self):
        self.assertIsNone(lib.pct_change(0, 5))
        self.assertIsNone(lib.pct_change(None, 5))
        self.assertIsNone(lib.pct_change(5, None))


class TestGeometria(unittest.TestCase):
    def test_anillo_valido(self):
        self.assertEqual(lib.ring_problems([[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]), [])

    def test_mono_autointersectado(self):
        bow = [[0, 0], [1, 1], [1, 0], [0, 1], [0, 0]]
        self.assertTrue(any("autointersección" in p for p in lib.ring_problems(bow)))

    def test_no_cerrado_y_corto(self):
        self.assertIn("anillo no cerrado", lib.ring_problems([[0, 0], [1, 0], [1, 1], [0, 1]]))
        self.assertIn("menos de 4 vértices", lib.ring_problems([[0, 0], [1, 0], [0, 0]]))

    def test_punto_en_poligono(self):
        sq = [[0, 0], [2, 0], [2, 2], [0, 2], [0, 0]]
        self.assertTrue(lib.point_in_ring(1, 1, sq))
        self.assertFalse(lib.point_in_ring(3, 1, sq))


class TestFechas(unittest.TestCase):
    def test_ultimo_mes_completo(self):
        self.assertEqual(lib.last_complete_month(date(2025, 5, 4)), (2025, 4))
        self.assertEqual(lib.last_complete_month(date(2025, 10, 3)), (2025, 9))
        self.assertEqual(lib.last_complete_month(date(2025, 1, 15)), (2024, 12))
        self.assertEqual(lib.last_complete_month(date(2025, 6, 1)), (2025, 5))


if __name__ == "__main__":
    unittest.main()
