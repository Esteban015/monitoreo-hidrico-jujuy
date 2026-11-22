"""Utilidades comunes para scripts exploratorios de la Fase 2.

- Solo biblioteca estándar para HTTP (urllib).
- Cada pedido queda registrado en data/raw/exploration/http_log.jsonl con
  método, URL SIN query de firma (no se guardan tokens SAS), código HTTP,
  bytes y fecha UTC.
- Nunca se escriben credenciales ni URLs firmadas en disco.
"""
from __future__ import annotations

import json
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "data" / "raw" / "exploration"
OUT.mkdir(parents=True, exist_ok=True)
LOG = OUT / "http_log.jsonl"
UA = "cuencas-jujuy-hackathon-exploracion/0.1"


def now_utc() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _strip_secret(url: str) -> str:
    # Las URLs firmadas de Planetary Computer llevan el token SAS en la query.
    return url.split("?", 1)[0] if ("sig=" in url or "se=" in url) else url


def log(entry: dict) -> None:
    entry = {"ts": now_utc(), **entry}
    if "url" in entry:
        entry["url"] = _strip_secret(entry["url"])
    with LOG.open("a", encoding="utf-8") as f:
        f.write(json.dumps(entry, ensure_ascii=False) + "\n")


def http(url: str, *, data: bytes | None = None, headers: dict | None = None,
         timeout: int = 90, method: str | None = None) -> tuple[int, bytes]:
    """Devuelve (status, body). No lanza por HTTP != 2xx; registra todo."""
    h = {"User-Agent": UA, **(headers or {})}
    req = urllib.request.Request(url, data=data, headers=h, method=method)
    t0 = time.time()
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            body = r.read()
            status = r.status
    except urllib.error.HTTPError as e:
        body, status = e.read(), e.code
    except (urllib.error.URLError, TimeoutError) as e:
        log({"method": method or ("POST" if data else "GET"), "url": url, "status": "error",
             "error": repr(e), "secs": round(time.time() - t0, 2)})
        return -1, b""
    log({"method": method or ("POST" if data else "GET"), "url": url, "status": status,
         "bytes": len(body), "secs": round(time.time() - t0, 2)})
    return status, body


def _parse(url: str, s: int, b: bytes):
    if s != 200 or not b:
        return s, None
    try:
        return s, json.loads(b)
    except json.JSONDecodeError:
        log({"url": url, "status": "200-invalid-json", "snippet": b[:200].decode("utf-8", "replace")})
        return "200-invalid-json", None


def get_json(url: str, **kw):
    s, b = http(url, **kw)
    return _parse(url, s, b)


def post_json(url: str, payload: dict, **kw):
    s, b = http(url, data=json.dumps(payload).encode(), headers={"Content-Type": "application/json"}, **kw)
    return _parse(url, s, b)


def save(name: str, obj) -> Path:
    p = OUT / name
    p.write_text(json.dumps(obj, ensure_ascii=False, indent=2), encoding="utf-8")
    return p


def load(name: str):
    return json.loads((OUT / name).read_text(encoding="utf-8"))


def bbox_of(coords: list[list[float]]) -> list[float]:
    xs = [c[0] for c in coords]
    ys = [c[1] for c in coords]
    return [min(xs), min(ys), max(xs), max(ys)]
