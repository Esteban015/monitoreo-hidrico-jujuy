# Monitoreo Hídrico Jujuy

Prototipo de hackatón que compara la **superficie de agua visible** de dos cuerpos de agua de Jujuy entre dos fechas reales de Sentinel-2, y la muestra junto con la **precipitación mensual estimada** de su cuenca de aporte modelada. Todo con trazabilidad de fuentes y advertencias metodológicas visibles.

![Laguna de los Pozuelos, modo Comparar](docs/evidence/fase5/02-desktop-laguna-pozuelos-comparar.png)

## Problema y solución
- **Problema:** responder de forma simple y verificable si un espejo de agua de Jujuy está más chico que en otra fecha, y en qué contexto de lluvias. Los datos existen (satélites, productos climáticos, modelos de cuencas), pero están dispersos y requieren conocimiento técnico.
- **Solución:**
  - Un dashboard web estático con mapa interactivo y un comparador Antes/Después de dos observaciones reales.
  - Métricas precalculadas con scripts reproducibles.
  - Rango de incertidumbre entre métodos.
  - Fuentes e identificadores de escena accesibles desde la interfaz.

## Alcance real del MVP
| Caso | Fechas comparadas | Superficie visible (MNDWI) | Cambio principal | Rango entre métodos y umbrales |
|---|---|---|---|---|
| Laguna de los Pozuelos (Puna) | 04/05/2025 → 13/09/2025 | 81,43 → 37,55 km² | −53,9 % | −26,3 % a −68,5 % |
| Dique Las Maderas (Valles) | 29/05/2025 → 03/10/2025 | 8,72 → 7,14 km² | −18,1 % | −13,0 % a −18,9 % |

- Los valores provienen de `data/derived/water_metrics.json`; el frontend los lee y no los recalcula.
- **Precipitación:** CHIRPS v3.0 mensual, media areal sobre la cuenca. Se usa el último mes calendario completo anterior a cada imagen, comparado con 1995–2024, y se muestran anomalía y percentil juntos.

**Fuera de alcance:**
- Volumen almacenado, caudal y aguas subterráneas.
- Series temporales y tendencias.
- Predicciones o IA.
- Cobertura provincial completa.

## Datos y fuentes
| Fuente | Uso | Acceso |
|---|---|---|
| Copernicus Sentinel-2 L2A | B03, B08, B11 y SCL → NDWI y MNDWI, máscara de nubes | Microsoft Planetary Computer (STAC + COG, sin cuenta) |
| CHIRPS v3.0 mensual (CHC, UCSB) | Precipitación estimada, `mm/month`, 0,05° | `data.chc.ucsb.edu` |
| HydroBASINS v1c nivel 10 (HydroSHEDS) | Cuenca de aporte **modelada** (no oficial) | `data.hydrosheds.org` |
| OpenStreetMap | Contornos cartográficos de referencia del lago y del embalse (no medición) | Overpass API, ODbL |
| IGN Argentina | Límite provincial y departamentos (mapa base local) | WFS `wms.ign.gob.ar`; licencia por verificar |

Detalle completo, identificadores de escena, errores HTTP y licencias en `data/raw/MANIFEST.md`, `data/derived/MANIFEST.md`, `DATA_SOURCES.md` y `DECISIONS.md`.

## Tecnologías
- **Frontend:** Next.js 16 (exportación estática, sin backend), TypeScript, Tailwind CSS 4 y Leaflet 1.9 con render Canvas.
- **Preprocesamiento:** Python 3.13 con `rasterio` (lectura COG por ventana) y `pyshp`, en `scripts/`.
- **Pruebas:**
  - `node --test` para unitarias de TypeScript.
  - `unittest` para Python.
  - Playwright para E2E, usando el Chrome instalado.

## Instalación y uso
Requisitos: Node.js ≥ 22.18 (las pruebas usan TypeScript nativo de Node; el build funciona desde 20.9) y npm.

```bash
npm ci
npm run dev      # http://localhost:3000 = landing; /demo = dashboard (publica data/derived -> public/data antes de iniciar)
npm run build    # exportación estática en out/ (también publica los datos)
npm start        # sirve out/ en http://127.0.0.1:3000 con un servidor Node local, sin descargas
```

Pruebas:
```bash
npm run lint
npm run typecheck
npm test                    # unitarias TS + integridad de datos publicados
npm run test:e2e:smoke      # E2E acotado (requiere build previo y Chrome instalado; tope 120 s)
npm run test:e2e            # E2E completo: escritorio, tablet, móvil y sin internet
python -m unittest discover -s tests/python   # requiere numpy (ver scripts/requirements*.txt)
```

Reprocesar los datos científicos (opcional; descarga ventanas de los servidores públicos):
```bash
python -m venv scripts/.venv
scripts/.venv/Scripts/python -m pip install -r scripts/requirements.txt
cd scripts/explore && ../.venv/Scripts/python 01_osm_cases.py   # ver scripts/README.md para el orden completo
```

## Funcionamiento offline y sus límites
- **Mapa base local:** se usan por defecto los límites del IGN publicados con la app, así que el mapa no pide teselas externas. OpenStreetMap es opcional (botón «OpenStreetMap (online)»).
- **Probado con internet bloqueado:** la app servida en 127.0.0.1, con DNS bloqueado para todo otro dominio, carga mapa, geometrías, imágenes de control y métricas de ambos casos (`docs/evidence/fase5/offline-real-chrome.txt`).
- **Necesita un servidor HTTP local** (`npm start` o cualquiera equivalente). No se probó abrir `out/index.html` con `file://`.

## Limitaciones científicas
- **Superficie, no volumen:** es superficie de agua **visible estimada**, no volumen ni caudal.
- **Dos fechas, no tendencia:** son dos observaciones, sin series ni conclusiones de largo plazo.
- **Sin atribución causal:** no se atribuye el cambio a la lluvia; la precipitación se muestra solo como contexto.
- **Pozuelos:** el barro y el agua somera hacen que el resultado dependa del método (de −26 % a −68 %). El −53,9 % no es una medida exacta.
- **Las Maderas:** la cuenca HydroBASINS incluye territorio aguas abajo del muro, por lo que la precipitación areal es aproximada.
- **CHIRPS** es una estimación (satélite + estaciones). En meses secos la anomalía porcentual es inestable.

## Despliegue (Vercel, exportación estática)
1. Importar el repositorio en Vercel (preset Next.js). `vercel.json` fija `npm ci` y `npm run build`.
2. El build ejecuta `prebuild` → `scripts/publish-data.mjs`, que copia `data/derived/` (versionado) a `public/data/` con un manifiesto sha256. No necesita datos crudos, cachés ni credenciales.
3. Next.js genera `out/` (`output: "export"`). No hay funciones de servidor ni variables de entorno.

## Integración continua
`.github/workflows/ci.yml` corre en cada Pull Request hacia `master`: `npm ci`, lint, typecheck, build, `npm test` (incluida la integridad de los datos publicados) y las pruebas Python de cálculo y validación de datasets, solo con numpy.

## Estructura
```
src/            app Next.js (components/, lib/)
data/derived/   datasets procesados versionados (única fuente de verdad del frontend)
scripts/        exploración (explore/), procesamiento (process/), mapa base (basemap/), publicación y servidor
tests/          unitarias TS y Python;  e2e/  Playwright
docs/           especificación, evidencias (evidence/fase5) y kit de agentes (COLMENA-EXPRESS.md)
```

## Créditos
Contiene datos modificados de Copernicus Sentinel (2025). CHIRPS: Funk et al., Climate Hazards Center (UCSB). HydroBASINS: Lehner & Grill (2013). © colaboradores de OpenStreetMap (ODbL). Límites: Instituto Geográfico Nacional (IGN), Argentina.
