"""Caché (reproducibilidad, integridad) y comportamiento ante fallos de red. Sin red real."""
import json
import shutil
import sys
import tempfile
import unittest
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "scripts" / "process"))
import cache  # noqa: E402


class CacheTmp(unittest.TestCase):
    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp())
        self._orig = cache.CACHE
        cache.CACHE = self.tmp

    def tearDown(self):
        cache.CACHE = self._orig
        shutil.rmtree(self.tmp, ignore_errors=True)


class TestCache(CacheTmp):
    def test_roundtrip_identico(self):
        a = np.arange(12, dtype="uint16").reshape(3, 4)
        cache.cache_put("t", "k1", a, {"src": "x"})
        b, meta = cache.cache_get("t", "k1")
        np.testing.assert_array_equal(a, b)
        self.assertEqual(meta["shape"], [3, 4])
        self.assertEqual(len(meta["sha256"]), 64)

    def test_reproducible_mismo_hash(self):
        a = np.ones((5, 5), "float32")
        h1 = cache.cache_put("t", "k", a, {})["sha256"]
        h2 = cache.cache_put("t", "k", a, {})["sha256"]
        self.assertEqual(h1, h2)

    def test_ausente(self):
        self.assertIsNone(cache.cache_get("t", "no-existe"))

    def test_descarga_incompleta_o_corrupta_se_descarta(self):
        cache.cache_put("t", "k", np.zeros((4, 4)), {})
        npz, meta = cache.cache_paths("t", "k")
        npz.write_bytes(npz.read_bytes()[:20])  # archivo truncado
        self.assertIsNone(cache.cache_get("t", "k"))

    def test_meta_alterada_se_descarta(self):
        cache.cache_put("t", "k", np.zeros((4, 4)), {})
        npz, meta = cache.cache_paths("t", "k")
        m = json.loads(meta.read_text())
        m["sha256"] = "0" * 64
        meta.write_text(json.dumps(m))
        self.assertIsNone(cache.cache_get("t", "k"))


class TestRed(unittest.TestCase):
    def test_reintenta_y_recupera(self):
        calls = {"n": 0}

        def flaky():
            calls["n"] += 1
            if calls["n"] < 2:
                raise TimeoutError("timeout simulado")
            return 42

        out, errs = cache.fetch_with_retry(flaky, retries=2, wait_s=0)
        self.assertEqual(out, 42)
        self.assertEqual(len(errs), 1)

    def test_fallo_persistente_devuelve_none(self):
        def down():
            raise ConnectionError("HTTP 429 simulado")

        out, errs = cache.fetch_with_retry(down, retries=2, wait_s=0)
        self.assertIsNone(out)
        self.assertEqual(len(errs), 3)

    def test_presupuesto_limita_pedidos(self):
        b = cache.Budget(max_requests=3, max_seconds=999)
        n = {"c": 0}

        def down():
            n["c"] += 1
            raise IOError("x")

        cache.fetch_with_retry(down, retries=10, budget=b, wait_s=0)
        self.assertEqual(n["c"], 3)
        self.assertTrue(b.exhausted())
        out, errs = cache.fetch_with_retry(lambda: 1, retries=0, budget=b, wait_s=0)
        self.assertIsNone(out)
        self.assertIn("presupuesto agotado", errs)


if __name__ == "__main__":
    unittest.main()
