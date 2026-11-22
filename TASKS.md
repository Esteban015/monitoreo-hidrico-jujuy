# TASKS — Plan por fases

Estados: `[ ]` pendiente · `[~]` en curso · `[x]` hecho y probado · `[!]` bloqueado.
Regla: no avanzar de fase sin cumplir criterios de aceptación y aprobación humana.

> 2026-11-22: se renumeraron las fases a pedido del equipo. La inicialización de la app pasó a ser la Fase 1
> (antes Fase 3) y el acceso a datos la Fase 2 (antes Fase 1).

---

## Fase 0 — Análisis y preparación (sin código) ✅
- [x] 0.1 Inspeccionar directorio (resultado: no era repo git; solo kit de orquestación).
- [x] 0.2 Leer contexto MVP (`docs/PROJECT_SPEC.md`) y extraer alcance.
- [x] 0.3 Crear PROJECT.md, AGENTS.md, DECISIONS.md, TASKS.md, DATA_SOURCES.md.
- [x] 0.4 Estructura mínima de carpetas (`data/`, `scripts/`, `tests/`).
- [x] 0.5 Documento de contexto ya presente en `docs/PROJECT_SPEC.md` (no se duplica).
- [x] 0.6 Aprobación humana de Fase 0.

---

## Fase 1 — Inicialización técnica de la app (sin datos)
Depende de: Fase 0.
- [x] 1.1 `git init` (sin commits ni remotos) y `.gitignore` fusionado.
- [x] 1.2 Next.js + TypeScript + Tailwind con exportación estática (D-01, D-02).
- [x] 1.3 Leaflet (sin react-leaflet) con mapa base OSM y encuadre aproximado de Jujuy (D-10, D-12).
- [x] 1.4 Pantalla inicial: encabezado, mapa, panel de casos testigo, panel de información y métricas vacío.
- [x] 1.5 Estados visibles: cargando mapa, mapa base no disponible, cargando datos, sin información, error.
- [x] 1.6 Pruebas unitarias básicas (`npm test`, ejecutor nativo de Node).
- [ ] 1.7 Aprobación humana de Fase 1.

**Aceptación:** `npm run lint`, `npm run typecheck`, `npm test` y `npm run build` pasan; la app abre; el mapa se dibuja; al seleccionar un caso se ve "Sin información disponible". Resultado real en el informe de la Fase 1.

---

## Fase 2 — Verificación de acceso a datos (prueba exploratoria, sin app)
Depende de: Fase 0. Scripts: `scripts/explore/`. Resultados: `data/raw/MANIFEST.md`.
- [x] 2.0 Geometría verificable de los casos (polígonos OSM y muro de la presa) → D-17.
- [x] 2.1 Plataforma Sentinel-2: MPC confirmado sin cuenta; CDSE con catálogo público y descarga 401 → D-04 adoptada.
- [x] 2.2 Escenas Sentinel-2 L2A reales por caso, con ID, fecha, nubosidad de escena y **nubosidad efectiva sobre el AOI (SCL)**, cobertura y lectura de bandas.
- [x] 2.3 Límites: HydroBASINS nivel 10 (Pozuelos endorreica 3932,2 km²; Las Maderas, unidad de cabecera 233,5 km² con limitación) → D-06 adoptada con restricciones. IGN sin capa de cuencas.
- [~] 2.4 CHIRPS v3.0 pentadal confirmado (unidades, cobertura, lectura por ventana); **la estrategia de descarga del promedio histórico está pendiente** por lentitud y límite de pedidos (D-05). NASA POWER y Open-Meteo confirmados como respaldo por punto.
- [~] 2.5 Licencias: HydroBASINS y OSM verificadas; Sentinel-2, CHIRPS y Open-Meteo con texto exacto por verificar.
- [~] 2.6 Pares de fechas propuestos por caso (D-08, esperan aprobación); falta leer las bandas de la fecha A de Las Maderas (19JHN).
- [ ] 2.7 Aprobación humana de Fase 2.

**Resultado de aceptación:** se cumple para los 2 casos: 2 escenas reales por caso (ID, fecha, % nubes), polígono de cuenca descargado y acceso a precipitación confirmado.

**Aceptación:** para al menos 1 caso: 2 escenas reales identificadas (ID + fecha + % nubes), 1 polígono de cuenca descargado, acceso a precipitación confirmado. Todo registrado en `data/raw/MANIFEST.md`.
**Contingencia:** si un caso no tiene escenas limpias, reemplazarlo por otro caso testigo del contexto (La Ciénaga, Río Grande, Miraflores) y documentarlo.

---

## Fase 3 — Procesamiento geoespacial real y generación de datasets
Depende de: Fase 2. Decisiones aprobadas por el equipo el 2026-11-22: D-05 (mensual), D-06 (rótulo «Cuenca de aporte modelada») y D-08 (pares provisionales).
Scripts: `scripts/process/`. Salidas: `data/derived/` (ver `data/derived/MANIFEST.md`).
- [x] 3.0 Geometrías: validez (anillos, autointersecciones), áreas LAEA y chequeo aguas abajo del muro de Las Maderas (confirmado: incluye unos 4,5 km de cauce aguas abajo) → `10_geometries.py`, `cases.json`.
- [x] 3.1 Sentinel-2: radiometría desde MTD (offset −1000), política SCL, NDWI y MNDWI en grilla de 20 m, región constante, máscara común, área con factor de escala UTM, sensibilidad al umbral y quicklooks → `11_water.py`, `water_metrics.json`.
- [x] 3.2 Lectura de las bandas pendientes de Las Maderas 2025-05-29: OK.
- [x] 3.3 CHIRPS v3 mensual: mes completo previo a la imagen, media areal ponderada y referencia fija 1995–2024 dentro del presupuesto (93 lecturas en 486 s) → `12_rainfall_chirps.py`, `rainfall_metrics.json`.
- [x] 3.4 QA automatizado: `tests/python/` (43 pruebas: fórmulas, denominador cero, nodata, SCL, fechas, cobertura, áreas, variación con inicial 0, metadatos, geometrías, caché, fallos de red).
- [x] 3.5 Reproducibilidad: segunda corrida desde la caché sin pedidos de datos y métricas idénticas.
- [ ] 3.6 Copiar los datos a `public/data/` y adaptar `loadCaseSummary` → pasa a la Fase 4 (D-19).
- [ ] 3.7 Aprobación humana de Fase 3.

**Aceptación:** se cumple. Validador OK para los 2 casos, superficies verificadas visualmente (quicklooks), parámetros y métodos registrados en los JSON y advertencias explícitas donde la incertidumbre es alta (Pozuelos, septiembre; cuenca de Las Maderas).

---

## Fase 4 — Integración de datasets reales y dashboard
Depende de: Fase 1 y Fase 3 (aprobada con restricciones científicas).
- [x] 4.1 Publicación reproducible `data/derived` → `public/data` con manifiesto sha256 (D-20).
- [x] 4.2 Carga tipada de los JSON reales, con estados de carga, error con reintento y datos incompletos.
- [x] 4.3 Mapa: contornos reales de agua por fecha (MNDWI), cuenca de aporte modelada y contorno OSM de referencia, con leyenda.
- [x] 4.4 Comparador Antes / Después / Comparar sobre las 2 observaciones reales (sin slider).
- [x] 4.5 Superficie A y B, diferencia en km² y %, rango de incertidumbre y aviso de alta sensibilidad por dato (D-21).
- [x] 4.6 Calidad (cobertura, nubosidad efectiva, estado), precipitación CHIRPS (mes previo, media y mediana 1995–2024, anomalía y percentil juntos).
- [x] 4.7 Advertencias obligatorias visibles y trazabilidad plegable (escenas con enlace STAC, método, CHIRPS, cuenca, OSM).
- [x] 4.8 QA: `npm test` (27), Python (43), lint, typecheck, build; navegador real online y offline, estado de error y vista móvil.
- [ ] 4.9 Aprobación humana de Fase 4.
- [ ] Limpieza pendiente de aprobación: `src/lib/loadCaseSummary.ts`, `WITNESS_CASES` en `src/lib/cases.ts` y sus pruebas quedaron sin uso (reemplazados por `datasets.ts` y `cases.json`). No se borraron porque `CLAUDE.md` exige aprobación para eliminar archivos.

**Aceptación:** se cumple. Valores en pantalla idénticos a los JSON (verificado en el navegador) y sin datos inventados.

---

## Fase 5 — Estabilización, QA E2E y demo offline
- [x] 5.1 Mapa base local con límites del IGN y OSM opcional (D-22).
- [x] 5.2 Defectos corregidos: render recortado (Canvas, D-23), `npm start` dependía de `npx`, aviso offline de Leaflet.
- [x] 5.3 Limpieza autorizada: se eliminaron `src/lib/cases.ts`, `src/lib/loadCaseSummary.ts` y sus pruebas (la constante de encuadre pasó a `mapConfig.ts`).
- [x] 5.4 E2E con Playwright (17 pruebas en 5 proyectos, incluido sin internet) y evidencias en `docs/evidence/fase5/`.
- [x] 5.5 Prueba real del escenario A (servidor local con DNS bloqueado).
- [ ] 5.6 Leyenda móvil superpuesta con la atribución (ajuste pendiente).
- [ ] 5.7 Verificar la licencia de los geoservicios del IGN.

---

## Fase 6 — Demo
Depende de: Fase 5.
- [ ] 6.1 README con cómo correr, fuentes y limitaciones.
- [ ] 6.2 Pitch de 30 s + recorrido de 2 min (según PROJECT.md §6).
- [ ] 6.3 Prueba final: inicio + flujo feliz + error; registrar comandos y salidas.
- [ ] 6.4 (Opcional, con aprobación) despliegue estático.

---

## Dependencias críticas
```
F0 → F1 app (sin datos) ───────────────────────────┐
F0 → F2 acceso a datos → F3 preprocesamiento ──────┴→ F4 → F5 → F6
```
- **Camino crítico:** F2 → F3. Si D-04 no se resuelve rápido, la demo no tiene datos reales.
