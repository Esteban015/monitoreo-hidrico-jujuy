"""Caché local de ventanas raster (npz + JSON con sha256) y lectura remota con presupuesto.

- Una ventana ya descargada no se vuelve a pedir (reproducibilidad y respeto a los servidores).
- Un archivo de caché incompleto o alterado (sha256 distinto / npz ilegible) se descarta y se vuelve a pedir.
"""
from __future__ import annotations

import hashlib
import json
import time
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[2]
CACHE = ROOT / "data" / "raw" / "cache"


def _sha256(p: Path) -> str:
    return hashlib.sha256(p.read_bytes()).hexdigest()


def cache_paths(kind: str, key: str) -> tuple[Path, Path]:
    d = CACHE / kind
    d.mkdir(parents=True, exist_ok=True)
    safe = "".join(c if c.isalnum() or c in "-_." else "_" for c in key)
    return d / f"{safe}.npz", d / f"{safe}.json"


def cache_get(kind: str, key: str):
    """Devuelve (array, meta) si el caché existe y es íntegro; si no, None."""
    npz, meta = cache_paths(kind, key)
    if not (npz.exists() and meta.exists()):
        return None
    try:
        m = json.loads(meta.read_text(encoding="utf-8"))
        if m.get("sha256") != _sha256(npz):
            return None
        with np.load(npz) as z:
            return z["data"], m
    except Exception:  # noqa: BLE001 — caché corrupto => se trata como ausente
        return None


def cache_put(kind: str, key: str, arr: np.ndarray, meta: dict) -> dict:
    npz, metap = cache_paths(kind, key)
    tmp = npz.with_suffix(".tmp.npz")
    np.savez_compressed(tmp, data=arr)
    tmp.replace(npz)  # escritura atómica: nunca queda un npz a medio escribir con nombre final
    m = {**meta, "sha256": _sha256(npz), "shape": list(arr.shape), "dtype": str(arr.dtype)}
    metap.write_text(json.dumps(m, ensure_ascii=False, indent=2), encoding="utf-8")
    return m


class Budget:
    """Presupuesto de pedidos remotos y tiempo total. exhausted() => detener la rama de trabajo."""

    def __init__(self, max_requests: int, max_seconds: float):
        self.max_requests, self.max_seconds = max_requests, max_seconds
        self.requests, self.t0, self.failures = 0, time.time(), []

    def exhausted(self) -> bool:
        return self.requests >= self.max_requests or (time.time() - self.t0) >= self.max_seconds

    def elapsed(self) -> float:
        return round(time.time() - self.t0, 1)


def fetch_with_retry(fn, *, retries: int, budget: Budget | None = None, wait_s: float = 3.0):
    """Ejecuta fn() con reintentos limitados. Devuelve (resultado|None, lista_de_errores)."""
    errors = []
    for attempt in range(retries + 1):
        if budget is not None:
            if budget.exhausted():
                errors.append("presupuesto agotado")
                break
            budget.requests += 1
        try:
            return fn(), errors
        except Exception as e:  # noqa: BLE001
            errors.append(f"intento {attempt + 1}: {repr(e)[:200]}")
            if attempt < retries:
                time.sleep(wait_s * (attempt + 1))
    if budget is not None:
        budget.failures.extend(errors)
    return None, errors
