"""Funciones puras de la Fase 3 (sin red, testeables). Ver tests/python/.

Convenciones:
- Reflectancia L2A (baseline >= 04.00): rho = (DN + BOA_ADD_OFFSET) / BOA_QUANTIFICATION_VALUE.
  DN = 0 -> NODATA, DN = 65535 -> SATURATED (valores especiales del metadato del producto).
- Los índices devuelven NaN donde no hay dato o el denominador es 0.
"""
from __future__ import annotations

import math
from datetime import date

import numpy as np

# --- Política SCL (Sentinel-2 Scene Classification) -------------------------
SCL_NAMES = {0: "sin_dato", 1: "saturado_o_defectuoso", 2: "area_oscura", 3: "sombra_de_nube",
             4: "vegetacion", 5: "suelo_desnudo", 6: "agua", 7: "sin_clasificar", 8: "nube_prob_media",
             9: "nube_prob_alta", 10: "cirro", 11: "nieve_o_hielo"}
SCL_EXCLUDED = {0, 1, 3, 8, 9, 10}  # sin dato, defectuoso, sombra de nube, nubes, cirros
SCL_CLOUD = {3, 8, 9, 10}  # nubosidad efectiva = sombras + nubes + cirros


def scl_valid_mask(scl: np.ndarray) -> np.ndarray:
    """True donde el píxel es utilizable según la política SCL documentada."""
    return ~np.isin(scl, list(SCL_EXCLUDED))


def dn_to_reflectance(dn: np.ndarray, offset: float, quantification: float,
                      nodata: int = 0, saturated: int = 65535) -> np.ndarray:
    dn = np.asarray(dn)
    out = (dn.astype("float32") + np.float32(offset)) / np.float32(quantification)
    out[(dn == nodata) | (dn == saturated)] = np.nan
    return out


def normalized_difference(a: np.ndarray, b: np.ndarray) -> np.ndarray:
    """(a - b) / (a + b); NaN si falta dato o el denominador es 0."""
    a = np.asarray(a, dtype="float64")
    b = np.asarray(b, dtype="float64")
    den = a + b
    with np.errstate(divide="ignore", invalid="ignore"):
        out = (a - b) / den
    out[(den == 0) | ~np.isfinite(a) | ~np.isfinite(b)] = np.nan
    return out


def ndwi(green, nir):
    """McFeeters (1996): (B03 - B08) / (B03 + B08)."""
    return normalized_difference(green, nir)


def mndwi(green, swir1):
    """Xu (2006): (B03 - B11) / (B03 + B11)."""
    return normalized_difference(green, swir1)


def downsample_2x2_mean(arr: np.ndarray) -> np.ndarray:
    """10 m -> 20 m promediando bloques 2x2 alineados. Si alguno de los 4 es NaN, el resultado es NaN."""
    h, w = arr.shape
    if h % 2 or w % 2:
        raise ValueError("dimensiones deben ser pares para 2x2")
    blocks = arr.reshape(h // 2, 2, w // 2, 2).astype("float64")
    return blocks.mean(axis=(1, 3))  # mean propaga NaN


def dilate(mask: np.ndarray, n: int) -> np.ndarray:
    """Dilatación binaria con vecindad 3x3 repetida n veces (distancia de Chebyshev)."""
    m = mask.copy()
    for _ in range(n):
        p = np.pad(m, 1)
        m = (p[:-2, :-2] | p[:-2, 1:-1] | p[:-2, 2:] | p[1:-1, :-2] | p[1:-1, 1:-1] | p[1:-1, 2:]
             | p[2:, :-2] | p[2:, 1:-1] | p[2:, 2:])
    return m


def edge_ring(mask: np.ndarray, width: int = 2) -> np.ndarray:
    """Píxeles de la región a <= width píxeles de su borde exterior."""
    return mask & dilate(~mask, width)


# --- Áreas -------------------------------------------------------------------
def utm_central_meridian(zone: int) -> float:
    return -183.0 + 6.0 * zone


def utm_scale_factor(lat_deg: float, lon_deg: float, zone: int, k0: float = 0.9996) -> float:
    """Factor de escala puntual aproximado de UTM: k ≈ k0 (1 + (Δλ cos φ)² / 2)."""
    dl = math.radians(lon_deg - utm_central_meridian(zone))
    return k0 * (1 + (dl * math.cos(math.radians(lat_deg))) ** 2 / 2)


def pixels_to_km2(n_pixels: int, pixel_size_m: float, scale_factor: float = 1.0) -> float:
    """Área real = n * (lado de píxel en la grilla)² / k² (la grilla UTM está 'estirada' por k)."""
    if n_pixels < 0:
        raise ValueError("n_pixels negativo")
    return n_pixels * pixel_size_m ** 2 / scale_factor ** 2 / 1e6


def pct_change(a: float | None, b: float | None) -> float | None:
    """(b - a) / a * 100. None si falta un valor o a == 0 (variación indefinida)."""
    if a is None or b is None or a == 0:
        return None
    return (b - a) / a * 100.0


# --- Geometría ---------------------------------------------------------------
def shoelace_area(ring) -> float:
    """Área plana con signo (positiva = antihoraria) de un anillo en coordenadas proyectadas."""
    s = 0.0
    for (x0, y0), (x1, y1) in zip(ring[:-1], ring[1:]):
        s += x0 * y1 - x1 * y0
    return s / 2.0


def _segments_intersect(p1, p2, p3, p4) -> bool:
    def orient(a, b, c):
        v = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])
        return 0 if abs(v) < 1e-18 else (1 if v > 0 else -1)

    o1, o2, o3, o4 = orient(p1, p2, p3), orient(p1, p2, p4), orient(p3, p4, p1), orient(p3, p4, p2)
    return o1 != o2 and o3 != o4 and 0 not in (o1, o2, o3, o4)


def ring_problems(ring) -> list[str]:
    """Chequeos de validez de un anillo: cerrado, >= 4 puntos, finito, área != 0, sin autointersecciones."""
    probs = []
    if len(ring) < 4:
        probs.append("menos de 4 vértices")
        return probs
    if list(ring[0]) != list(ring[-1]):
        probs.append("anillo no cerrado")
    if not all(math.isfinite(c) for p in ring for c in p):
        probs.append("coordenadas no finitas")
    if shoelace_area(ring) == 0:
        probs.append("área nula")
    segs = list(zip(ring[:-1], ring[1:]))
    n = len(segs)
    # búsqueda O(n²) con descarte por caja envolvente
    boxes = [(min(a[0], b[0]), min(a[1], b[1]), max(a[0], b[0]), max(a[1], b[1])) for a, b in segs]
    for i in range(n):
        bi = boxes[i]
        for j in range(i + 2, n):
            if i == 0 and j == n - 1:
                continue  # segmentos adyacentes por el cierre
            bj = boxes[j]
            if bi[2] < bj[0] or bj[2] < bi[0] or bi[3] < bj[1] or bj[3] < bi[1]:
                continue
            if _segments_intersect(*segs[i], *segs[j]):
                probs.append(f"autointersección entre segmentos {i} y {j}")
                return probs
    return probs


def point_in_ring(x: float, y: float, ring) -> bool:
    inside = False
    j = len(ring) - 1
    for i in range(len(ring)):
        xi, yi = ring[i]
        xj, yj = ring[j]
        if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi) + xi:
            inside = not inside
        j = i
    return inside


# --- Tiempo ------------------------------------------------------------------
def last_complete_month(d: date) -> tuple[int, int]:
    """Último mes calendario completo ANTES de la fecha d (el mes de d está incompleto)."""
    return (d.year - 1, 12) if d.month == 1 else (d.year, d.month - 1)
