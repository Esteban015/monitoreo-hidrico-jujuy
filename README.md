# Monitoreo de Cuencas y Fuentes de Agua Natural — Jujuy

Plataforma geoespacial para comparar la **superficie visible de agua** de cuerpos de agua de Jujuy y la **precipitación mensual estimada** en su cuenca de aporte, usando dos fechas reales de Sentinel-2 y su historial climático.

> **Prototipo de hackatón.** Mide superficie visible de agua, **no volumen ni caudal**. Las cuencas son modeladas. Todos los valores en pantalla provienen de archivos versionados en `data/derived/`.

**Estado:** MVP completo y desplegable. Datos satelitales reales, build estático, backend de solo lectura, modo offline verificado.

---

## 1. Qué hace

| Función | Implementación |
|---|---|
| Selector de casos testigo | Mapa Leaflet con cuenca, cuerpo de agua y contornos por fecha |
| Comparador temporal | Dos fechas reales por caso: **Antes / Después / Comparar** |
| Superficie de agua | MNDWI > 0 (principal) y NDWI > 0 (secundario), grilla de 20 m |
| Incertidumbre | Sensibilidad al umbral y rango entre métodos, visible junto al valor principal |
| Precipitación | CHIRPS v3.0 mensual, media areal en la cuenca, anomalía y percentil vs. 1995–2024 |
| Historial de la fuente | Serie mensual real de lluvia y temperatura (Open-Meteo / ERA5-Land) + las 2 observaciones reales de superficie |
| Simulador climático | `HistGradientBoostingRegressor` (scikit-learn) sobre grilla; escenarios de lluvia y temperatura, **rotulado como demostrativo** |
| Trazabilidad | ID de escena, fecha, nubosidad efectiva, cobertura, fuente, método y licencias |
| Modo offline | Datos y mapa base provincial local; sin APIs externas durante la demo |
| API de solo lectura | `/api/*` sobre los mismos JSON, sin base de datos |

### Casos incluidos

| Caso | Ecorregión | Fechas comparadas | Superficie A → B | Variación MNDWI |
|---|---|---|---|---|
| Laguna de los Pozuelos | Puna | 04/05/2025 → 13/09/2025 | 81,43 → 37,55 km² | **−53,9 %** (rango −26,3 % a −68,5 %) |
| Dique Las Maderas | Valles / Perico | 29/05/2025 → 03/10/2025 | 8,72 → 7,14 km² | **−18,1 %** (rango −13,0 % a −18,9 %) |

> El rango de Pozuelos es amplio por agua somera y barro en septiembre. La UI lo advierte y no lo presenta como una medida exacta.

## 2. Qué NO hace

- No estima aguas subterráneas, acuíferos ni niveles freáticos.
- No calcula caudal (m³/s) ni volumen almacenado (hm³). **Superficie ≠ volumen ≠ caudal.**
- No cubre toda la provincia a escala de detalle: son 2 casos testigo con datos reales.
- No hace predicciones validadas: el simulador es **demostrativo**, se entrenó con datos sintéticos calibrados a 2 observaciones reales y así se rotula en la UI.
- No hace análisis por lote, SAR ni IA generativa.
- No interpola fechas intermedias ni inventa series: hay dos observaciones reales por caso. El historial muestra clima real continuo, pero de superficie solo marca las 2 fechas observadas.
- No reemplaza un estudio hidrológico ni una delimitación oficial de cuenca.

## 3. Arquitectura

```
┌──────────────────────────────────────────────────────────────┐
│  Navegador                                                   │
│  Next.js 16 (export estático) + React 19 + Tailwind 4        │
│  Leaflet 1.9 (sin react-leaflet) · mapa base local (IGN)     │
└───────────────┬──────────────────────────────────────────────┘
                │ HTTP mismo origen
┌───────────────▼──────────────────────────────────────────────┐
│  Node.js 22 · server/index.js (sin dependencias)             │
│  · Sirve out/ (frontend estático)                            │
│  · GET /api/health · /api/casos · /api/meta · /api/fuentes   │
│  · /historial · /modelo · Lee data/derived/ en solo lectura   │
└───────────────┬──────────────────────────────────────────────┘
                │
┌───────────────▼──────────────────────────────────────────────┐
│  Datos precalculados (versionados, offline)                  │
│  Sentinel-2 L2A → MNDWI/NDWI → superficies (scripts Python)  │
│  CHIRPS v3.0 · Open-Meteo (lluvia/temperatura) · HydroBASINS  │
│  Modelo HGB entrenado en Python y exportado a grilla JSON    │
└──────────────────────────────────────────────────────────────┘
```

**Por qué un backend mínimo:** el MVP original era 100 % estático (D-02). Se agregó un servidor Node de solo lectura para exponer una API y desplegar front + back en un único proceso, sin base de datos ni cómputo en tiempo de ejecución (D-22). El frontend sigue funcionando como export estático puro (`npm run start:static`).

## 4. Inicio rápido

Requisitos: **Node.js ≥ 20** (probado con 22.23) y npm. No requiere claves ni conexión para la demo.

```bash
npm ci
npm run build        # publica data/ y genera out/
npm start            # frontend + API en http://localhost:3000
```

Abrir <http://localhost:3000>. Health check: <http://localhost:3000/api/health>.

### Desarrollo

```bash
npm run dev          # Next.js en http://localhost:3000 (sin API)
npm run dev:api      # API sobre el último build (otro puerto con PORT=3001)
```

### Solo estático (sin API)

```bash
npm run build
npm run start:static # http://127.0.0.1:3000
```

## 5. API

Base: `/api`. Respuestas JSON, CORS abierto, solo `GET`/`HEAD`.

| Endpoint | Descripción |
|---|---|
| `GET /api/health` | Estado del servicio y de los 5 datasets |
| `GET /api/meta` | Método, fuentes, modelo y limitaciones |
| `GET /api/casos` | Casos con comparación y precipitación resumidas |
| `GET /api/casos/{id}` | Detalle: escenas, comparación, lluvia, historial y modelo |
| `GET /api/casos/{id}/comparacion` | MNDWI/NDWI, sensibilidad e incertidumbre |
| `GET /api/casos/{id}/precipitacion` | CHIRPS mensual, anomalía y percentil |
| `GET /api/casos/{id}/historial` | Serie mensual real (Open-Meteo) + 2 observaciones de superficie |
| `GET /api/casos/{id}/modelo` | Metadatos, supuestos y grilla del HGB demostrativo |
| `GET /api/casos/{id}/geometrias` | Rutas a GeoJSON de cuenca, AOI y agua |
| `GET /api/fuentes` | Fuentes, proveedores, licencias y uso |
| `GET /api/openapi.json` | Especificación OpenAPI 3.1 |

```bash
curl http://localhost:3000/api/casos
curl http://localhost:3000/api/casos/laguna-pozuelos/comparacion
curl -i http://localhost:3000/api/casos/no-existe   # 404 JSON
```

IDs válidos: `laguna-pozuelos`, `dique-las-maderas`.

### Variables de entorno

| Variable | Default | Uso |
|---|---|---|
| `PORT` | `3000` | Puerto HTTP |
| `HOST` | `0.0.0.0` | Interfaz de escucha |
| `STATIC_DIR` | `out` | Directorio del frontend compilado |
| `DATA_DIR` | `data/derived` | Directorio de datasets |
| `LOG_REQUESTS` | `1` | `0` desactiva el log por request |

## 6. Despliegue

### Local (recomendado para la demo)

```bash
npm ci && npm run build && npm start
```

### Docker (front + back en una imagen)

```bash
docker build -t cuencas-jujuy .
docker run --rm -p 3000:3000 cuencas-jujuy
```

Incluye `HEALTHCHECK` contra `/api/health`.

### Render / Railway

- `render.yaml` define un servicio Docker con health check en `/api/health`.
- Railway: conectar el repo; detecta el `Dockerfile` y usa `PORT`.
- La app no necesita secretos ni base de datos.

### Hosting estático (solo frontend)

Subir `out/` a cualquier CDN. Los datos ya están en `out/data/`. La API no estará disponible.

> La URL pública requiere credenciales del proveedor. El despliegue local quedó corriendo en `http://localhost:3000`; ver `docs/DEPLOY.md`.

## 7. Datos y trazabilidad

| Variable | Fuente | Rol | Tipo |
|---|---|---|---|
| Superficie de agua | Sentinel-2 L2A (Copernicus / Planetary Computer STAC) | MNDWI > 0, NDWI > 0, grilla 20 m | **Estimación** por umbral |
| Precipitación | CHIRPS v3.0 mensual (CHC, UCSB), 0,05° | Media areal en la cuenca, anomalía vs. 1995–2024 | **Estimación** satélite + estaciones |
| Lluvia y temperatura mensual | Open-Meteo Historical (ERA5-Land) | Serie 2019–2026 en el centroide del AOI | **Reanálisis**, no medición local |
| Simulador | `HistGradientBoostingRegressor` (scikit-learn) | Sensibilidad de superficie a lluvia/temperatura | **Demostrativo sintético** (no validado) |
| Cuenca | HydroBASINS v1c nivel 10 (HydroSHEDS) | Cuenca de aporte modelada | **Modelo**, no delimitación oficial |
| Contorno de referencia | OpenStreetMap (ODbL) | AOI cartográfico, no medición | Cartografía |
| Mapa base local | IGN Argentina | Provincias y departamentos | Cartografía |
| Relieve / contexto | Copernicus DEM GLO-30 (opcional) | No usado en el MVP | — |

- Escenas, fechas, nubosidad efectiva, cobertura y método: `data/derived/water_metrics.json`.
- Lluvia, referencia, anomalía y percentil: `data/derived/rainfall_metrics.json`.
- Serie mensual real de lluvia/temperatura y observaciones: `data/derived/climate/climate_series.json`.
- Modelo HGB, grilla, métricas sintéticas y supuestos: `data/derived/model/water_model.json`.
- Cuencas, AOI y advertencias: `data/derived/cases.json`.
- Manifiesto de datos crudos y accesos: `data/raw/MANIFEST.md`.
- Decisiones metodológicas: `DECISIONS.md` (D-04 a D-25).
- Fuentes y criterios QA: `DATA_SOURCES.md`.

## 8. Estructura

```
src/                  Frontend Next.js (App Router)
  components/         Dashboard, MapView, InfoPanel, HistoryChart, ClimateSimulator
  lib/                Carga de datasets, métricas, inferencia del modelo, tipos, avisos
server/               Backend Node sin dependencias + OpenAPI
scripts/              Preprocesamiento Python y publicación de datos
  explore/            Verificación de acceso a fuentes
  process/            Geometrías, MNDWI, CHIRPS
  model/              Open-Meteo + entrenamiento/exportación del HGB
data/derived/         Datos versionados que consume la app
data/raw/             Manifiesto (los crudos grandes no se versionan)
tests/                Unitarios Node + QA Python
e2e/                  Playwright (desktop, móvil, offline)
docs/                 Contexto, evidencias, modelo de negocio, FODA, pitch
```

## 9. Pruebas

Resultado real del cierre del MVP (2026-11-22):

```bash
npm run lint         # OK
npm run typecheck    # OK
npm run build        # OK — 4 páginas estáticas
npm test             # 23/23 OK (incluye inferencia del modelo)
npm run test:py      # 43/43 OK
npx playwright test  # 18/18 OK (desktop, tablet, móvil y offline)
```

Los E2E cubren: inicio sin solicitudes externas, ambos casos, valores reales, modos Antes/Después/Comparar, incertidumbre, precipitación, trazabilidad, error y reintento, geometría faltante, mapa físico opcional, vista general/modo Agua, historial, simulador, responsive y offline real (DNS externo bloqueado).

## 10. Limitaciones científicas

1. **Superficie visible ≠ volumen.** No se puede inferir almacenamiento ni caudal.
2. **Umbral fijo MNDWI > 0.** En Pozuelos, agua somera/barro y salares generan alta sensibilidad (rango de −26 % a −68 %).
3. **Cuenca modelada.** HydroBASINS cierra en confluencias, no en presas. En Las Maderas incluye ~4,5 km aguas abajo del muro; la lluvia areal es aproximada.
4. **Dos fechas, no una serie.** No hay tendencia ni causalidad; la comparación es descriptiva.
5. **CHIRPS es una estimación**, no un pluviómetro. En meses secos (<10 mm) la anomalía porcentual es inestable y se informa el percentil.
6. **Resolución 20 m.** Cuerpos de agua angostos o cambios menores al borde de píxel no son significativos.
7. **Mapa base online opcional.** Sin Internet se usa el mapa provincial local; las métricas no dependen de teselas.
8. **El simulador NO es una predicción validada.** Hay solo 2 observaciones reales de superficie por caso. El `HistGradientBoostingRegressor` se entrenó con una respuesta sintética calibrada a esas observaciones; además, lluvia y temperatura son colineales entre los 2 puntos, por lo que se fija la elasticidad térmica (5 % por +5 °C) y se calibra la de lluvia. Sirve para explorar sensibilidad, no para decidir. Una predicción real requiere una serie multianual de superficie (decenas de escenas sin nubes).

## 11. Documentación

- [`docs/MODELO_DE_NEGOCIO.md`](docs/MODELO_DE_NEGOCIO.md) — modelo de negocio y sostenibilidad.
- [`docs/FODA.md`](docs/FODA.md) — FODA y estrategias.
- [`docs/PITCH.md`](docs/PITCH.md) — pitch de 30 s y recorrido de 2 min.
- [`docs/DEPLOY.md`](docs/DEPLOY.md) — despliegue y verificación.
- [`PROJECT.md`](PROJECT.md) — alcance funcional.
- [`DECISIONS.md`](DECISIONS.md) — decisiones técnicas.
- [`TASKS.md`](TASKS.md) — estado por fases.

## 12. Licencias y atribución

- **Sentinel-2:** datos abiertos Copernicus. Atribución a Copernicus / ESA.
- **CHIRPS:** Climate Hazards Center, UCSB. Citar Funk et al.
- **HydroBASINS / HydroSHEDS:** Lehner & Grill (2013). Uso libre con atribución.
- **OpenStreetMap:** © colaboradores de OpenStreetMap, ODbL 1.0.
- **Open-Meteo / ERA5-Land:** Open-Meteo CC-BY 4.0; reanálisis ERA5-Land de Copernicus C3S.
- **scikit-learn:** licencia BSD-3-Clause.
- **IGN Argentina:** ver condiciones del Instituto Geográfico Nacional.
- **Código:** prototipo de hackatón; definir licencia antes de publicar.
