# PROJECT — Monitoreo de Cuencas y Fuentes de Agua Natural (Jujuy)

> Fuente de verdad funcional: `docs/PROJECT_SPEC.md` (idéntico al "Contexto MVP … (Jujuy).md").
> Este archivo lo resume y lo baja a un alcance ejecutable en hackatón.

## 1. Propósito
Plataforma geoespacial web que muestra cómo cambia la **superficie visible** de cuerpos de agua de Jujuy y la **precipitación acumulada** en su cuenca de aporte, comparando períodos reales con su propio historial, con trazabilidad completa de fuentes y fechas.

## 2. Problema
Quienes toman decisiones territoriales, ambientales o productivas en Jujuy no tienen una vista simple y trazable que responda:
"¿El espejo de agua de este embalse/laguna está más chico de lo normal, y se explica por menos lluvia en su cuenca?".
Los datos existen (satélites, reanálisis, modelos de cuencas) pero están dispersos y requieren conocimiento técnico.

## 3. Usuarios
- **Primario (demo):** técnico/a municipal o provincial de ambiente, recursos hídricos o producción.
- **Secundario:** productores de riego en Valles (Perico), investigadores, periodistas ambientales.
- **Jurado del hackatón:** necesita entender el valor en < 2 minutos y confiar en que los datos son reales.

## 4. MVP (alcance de la demo)
Casos testigo iniciales (sujetos a disponibilidad/calidad de datos, ver `DATA_SOURCES.md`):
1. **Laguna de los Pozuelos** (Puna).
2. **Dique Las Maderas** (Valles / Perico).

Funciones MUST:
1. **Selector de caso testigo** en un mapa interactivo (Leaflet) con el contorno de la cuenca y del cuerpo de agua.
2. **Comparador temporal** de dos fechas reales: superficie de agua detectada (MNDWI) en fecha A vs. fecha B y variación porcentual.
3. **Panel de contexto y trazabilidad:** precipitación acumulada 30/60/90 días vs. promedio histórico de la misma época; ficha de transparencia (fechas exactas de escena, % de nubes, fuente, resolución, advertencias metodológicas).

Requisito transversal: **modo offline** — todos los datos que se muestran están precalculados y versionados en el repo; la app no llama APIs externas durante la demo (salvo teselas base del mapa, con fallback, ver riesgos).

SHOULD (solo si sobra tiempo): 3.er caso testigo (Dique La Ciénaga o Río Grande); gráfico de serie temporal lluvia vs. superficie.

## 5. Fuera de alcance (explícito)
- Aguas subterráneas, acuíferos, niveles freáticos.
- **Caudal (m³/s) y volumen almacenado (hm³)**: el MVP mide *superficie visible*, no volumen ni caudal.
- Cobertura de toda la provincia a escala de detalle.
- Análisis por lote agrícola, modelos predictivos, radar (SAR), IA.
- Backend propio con cómputo, base de datos, autenticación o microservicios. (El backend mínimo de solo lectura de D-22 sólo sirve datos ya precalculados.)
- Procesamiento satelital en el navegador o en tiempo real.

## 6. Flujo de demo (objetivo: 2 minutos)
1. Abrir la app (sin conexión a APIs de datos): mapa de Jujuy con 2 casos testigo.
2. Click en **Dique Las Maderas** → se ve la cuenca y el espejo de agua.
3. Comparador: fecha A (ej. fin de estación húmeda) vs. fecha B (ej. fin de estación seca) → contornos/máscaras y "variación de superficie: X %" (valor real precalculado).
4. Panel: "Precipitación 90 días: Y mm vs. promedio histórico Z mm (−N %)".
5. Ficha de transparencia: escenas Sentinel-2 con ID, fecha, % nubes, resolución, advertencias.
6. Cambiar a **Laguna de los Pozuelos** para mostrar el contraste Puna vs. Valles.
7. Cierre: qué mide y qué NO mide la herramienta.

## 7. Fuentes (resumen; detalle en `DATA_SOURCES.md`)
- Superficie de agua: Sentinel-2 L2A → MNDWI/NDWI.
- Precipitación: CHIRPS (preferida), NASA POWER u Open-Meteo como alternativas.
- Cuencas y relieve: HydroSHEDS/HydroBASINS, IGN, Copernicus DEM.

## 8. Riesgos principales
| Riesgo | Impacto | Mitigación |
|---|---|---|
| Sin escenas Sentinel-2 limpias (nubes) en fechas de interés, sobre todo en Valles en verano | No hay comparación válida | Elegir fechas por disponibilidad real, documentar % nubes, umbral máximo de nubes sobre el AOI |
| Acceso a plataforma de procesamiento (GEE / Planetary Computer / Copernicus) requiere cuenta o falla | Bloquea Fase 2 | Decisión D-04 pendiente; probar acceso antes de comprometer |
| Polígono de cuenca HydroBASINS no coincide con la cuenca real de aporte del dique | Lluvia mal atribuida | Documentar nivel de HydroBASINS usado y limitación; validar visualmente |
| Umbral MNDWI confunde agua somera/salares/barro (Pozuelos) | Superficie sobre/subestimada | Umbral documentado, validación visual con RGB, advertencia en ficha |
| Confundir superficie con volumen en el discurso | Pérdida de credibilidad | Texto fijo en UI y en pitch: "superficie visible, no volumen" |
| Teselas base del mapa requieren Internet | Mapa sin fondo offline | Fondo vacío/GeoJSON provincial local como fallback |
| Tiempo de hackatón | Demo incompleta | Corte vertical con 1 caso primero; 2.º caso después |
