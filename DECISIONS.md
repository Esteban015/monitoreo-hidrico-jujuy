# DECISIONS — Registro de decisiones técnicas

Formato: ID · fecha · estado (ADOPTADA / PROPUESTA / PENDIENTE) · decisión · justificación · alternativas.

## D-01 · 2026-11-22 · ADOPTADA (Fase 1) — Frontend: Next.js + TypeScript + Tailwind + Leaflet
- **Decisión:** app Next.js 16.4.6 (App Router, Turbopack) con TypeScript, Tailwind 4 y Leaflet 1.9 **sin `react-leaflet`** (Leaflet directo en un componente cliente con `useEffect`; una dependencia menos).
- **Justificación:** stack conocido, rápido de montar, Leaflet es liviano y suficiente para polígonos GeoJSON y overlays raster simples. MapLibre sería mejor para vector tiles, pero no hacen falta.
- **Alternativas:** Vite + React (más simple aún; válido si Next.js agrega fricción), MapLibre GL.

## D-02 · 2026-11-22 · ADOPTADA (Fase 1) — Sin backend: exportación estática
- **Decisión:** `output: 'export'` de Next.js; datos servidos como archivos estáticos desde `public/data/` (copiados desde `data/derived/`).
- **Justificación:** cumple modo offline, elimina servidores, base de datos y puntos de falla en la demo. Despliegue opcional en cualquier hosting estático.
- **Alternativas:** API routes de Next.js — descartadas: no hay cómputo en tiempo de ejecución.

## D-03 · 2026-11-22 · ADOPTADA (Fase 3) — Preprocesamiento offline con scripts Python independientes
- **Decisión:** `scripts/` con Python (sin integrar al build de la app) para descargar, calcular MNDWI, superficies y series de lluvia, y emitir JSON/GeoJSON a `data/derived/`.
- **Justificación:** el ecosistema geoespacial (rasterio, shapely, pystac-client, etc.) está en Python; separar evita dependencias pesadas en el frontend.
- **Alternativas:** hacer todo en Google Earth Engine Code Editor (JS) y exportar resultados — viable, ver D-04.

## D-04 · 2026-11-22 · ADOPTADA (Fase 2) — Sentinel-2: Microsoft Planetary Computer + lectura COG por ventana
- **Decisión:** catálogo STAC de MPC (`sentinel-2-l2a`) con token SAS anónimo; lectura por ventana (HTTP range) con rasterio. Copernicus Data Space (CDSE) se usa solo como **catálogo de verificación cruzada**.
- **Evidencia (Fase 2):** búsqueda y lectura real de píxeles de B03, B08, B11 y SCL sin cuenta. CDSE: el catálogo responde (HTTP 200) pero la descarga sin credenciales devuelve **HTTP 401** ("Token not found"). GEE no se probó porque requiere cuenta.
- **Restricciones:** el 8 % de las lecturas de banda (2 de 24) falló de forma transitoria y funcionó al reintentar, por lo que la Fase 3 debe leer con reintentos. El token SAS se pide en cada ejecución y no se guarda.

## D-05 · 2026-11-22 · RESUELTA (Fase 3, aprobada por el equipo) — Precipitación: CHIRPS v3.0 **mensual**
- **Resolución del equipo (2026-11-22):** usar CHIRPS v3 **mensual** en lugar de las series pentadales extensas.
- **Implementación (`scripts/process/12_rainfall_chirps.py`):**
  - Fuente: COG global `v3.0/monthly/global/cogs/` (550 archivos, de 1981-01 a 2026-10). Unidad `mm/month`, verificada en el NetCDF oficial.
  - Mes analizado: el último mes calendario completo anterior a cada imagen (2025-04, 2025-08 y 2025-09). **No es un acumulado móvil de 30, 60 o 90 días.**
  - Referencia: el mismo mes en un **período fijo** 1995–2024 (30 años, el año analizado no se incluye).
  - Media areal ponderada por la fracción de celda dentro de la cuenca × cos φ. Una sola ventana por archivo cubre ambas cuencas.
  - Presupuesto: 93 lecturas y 1500 s, 1 reintento, timeout GDAL de 150 s. Resultado: 93 de 93 lecturas correctas en 486 s, sin 429.
  - Con meses secos de lluvia media < 10 mm se advierte que la anomalía porcentual es inestable y se informa también el percentil.
- **Corrección durante la fase:** la primera versión definía la referencia como "los años leídos". Al releer desde la caché, las lecturas no consumían presupuesto y se agregaron 1981–1994, lo que volvía el resultado dependiente de la caché. Se fijó el período 1995–2024; ahora dos corridas dan resultados idénticos.

### Historial (Fase 2) — CHIRPS v3.0 pentadal
- **Decisión:** CHIRPS **v3.0** (no v2.0; la ruta `CHIRPS-2.0/global_daily/` devolvió 404), producto **pentadal final**, COG global de 0,05°, unidad `mm/pentad` (atributo del NetCDF oficial), período 1981-01 a 2026-10 (3300 archivos al 2026-11-22).
- **Por qué pentadal:** el README oficial de la versión diaria indica que el diario se deriva del pentadal y recomienda usar pentadas o meses. Las ventanas de 30/60/90 días se aproximan con 6/12/18 pentadas; la diferencia con los días exactos se documenta.
- **Restricción crítica:** el servidor `data.chc.ucsb.edu` es lento y limita los pedidos (HTTP 429 en el listado; lecturas de 136 s y una falla a los 697 s). Leer 540 ventanas (30 años × 18 pentadas) llevaría horas.
- **Opciones evaluadas en la Fase 2 (resuelto: opción b):**
  - (a) Base histórica más corta o solo las pentadas de las ventanas elegidas, con caché local y ejecución en segundo plano.
  - (b) Usar los COG **mensuales** (menos archivos, ventanas alineadas a meses calendario).
  - (c) Usar CHIRPS en GEE, si alguien del equipo tiene cuenta.
- **Agregación:** promedio areal sobre el polígono de cuenca de HydroBASINS (D-06), **no** un punto.
- **Alternativas por punto (solo respaldo y rotuladas como punto):** NASA POWER (`PRECTOTCORR`, mm/día, fuente MERRA-2) y Open-Meteo Archive (`precipitation_sum`, mm). En Las Maderas, para el mismo punto y período (2025-08-01 a 2025-10-31), dieron 56,24 mm y 110,7 mm respectivamente: la elección de fuente cambia el resultado al doble.

## D-06 · 2026-11-22 · ADOPTADA CON RESTRICCIONES (aprobada en Fase 3) — Cuencas: HydroBASINS v1c nivel 10
- **Resolución del equipo:** se muestra con la leyenda visible **«Cuenca de aporte modelada»** y advertencias de incertidumbre.
- **Verificación (Fase 3, `10_geometries.py`):**
  - Todos los anillos son válidos (cerrados, sin autointersecciones).
  - Áreas en proyección LAEA: Pozuelos 3922,4 km² y Las Maderas 232,9 km², −0,25 % respecto de `UP_AREA`.
- **Las Maderas, confirmado que incluye territorio aguas abajo:**
  - El embalse está 100 % dentro de la unidad y el muro a 3,77 km de su borde.
  - El cauce OSM "Río de Las Pavas (Arroyo Maderas)" (way 180853698) recorre unos 4,55 km aguas abajo del muro sin salir de la unidad.
  - Por eso la precipitación areal de Las Maderas es aproximada y no admite conclusiones hidrológicas definitivas.
- **Decisión:** HydroBASINS Sudamérica nivel 10 (`hybas_sa_lev10_v1c`), recorriendo `NEXT_DOWN` aguas arriba. Se rotula en la UI como **"cuenca de aporte modelada (HydroBASINS)"**, nunca como delimitación oficial o validada.
  - **Pozuelos:** endorreica. Se sigue `NEXT_DOWN` hasta el sumidero (`ENDO=2`, HYBAS_ID 6100040870) y de ahí aguas arriba: 31 unidades, `UP_AREA` = 3932,2 km², igual a la suma de `SUB_AREA`. Las 7 unidades que tocan el contorno OSM del lago pertenecen a ese conjunto.
  - **Las Maderas:** la presa (punto OSM) cae en la unidad 6100781080, de cabecera (`UP_AREA` = `SUB_AREA` = 233,5 km²). **Limitación:** las unidades de HydroBASINS cierran en confluencias y no en presas, así que la unidad puede incluir área aguas abajo del muro. Falta validarlo visualmente.
- **Nivel 08:** la descarga falló por timeout (1440 s). No hace falta, porque el nivel 10 es más fino.
- **Fuente oficial:** el WFS del IGN (192 capas) tiene cuerpos y líneas de agua continentales pero **ninguna capa de cuencas**. SSRH e INA no se sondearon: queda PENDIENTE como validación, no bloquea.
- **Licencia:** HydroSHEDS, uso libre científico, educativo y comercial con atribución (Lehner & Grill 2013; ver HydroSHEDS_TechDoc_v1_4.pdf).

## D-16 · 2026-11-22 · ADOPTADA — Entorno Python aislado para scripts
- **Decisión:** `scripts/.venv` (ignorado por git) con `rasterio==1.4.3` (incluye GDAL 3.9.3 y numpy) y `pyshp==2.3.1`, fijados en `scripts/requirements.txt`. Sin pystac-client ni geopandas: el STAC se consulta con urllib y la geometría con funciones propias.
- **Justificación:** rasterio es el mínimo para leer COG por ventana sin descargar escenas completas. pyshp lee shapefiles en Python puro.

## D-17 · 2026-11-22 · ADOPTADA — Área de interés (AOI) desde OpenStreetMap
- **Decisión:** el AOI de cada caso es el polígono OSM del espejo de agua: way 117694382 (Laguna de los Pozuelos, `water=lake`) y way 509257795 (Embalse Las Maderas, `water=reservoir`). El punto de cierre es el muro way 85604244. Licencia ODbL con atribución.
- **Advertencia:** el contorno OSM es cartográfico, con fecha de trazado desconocida. **No es una medición de superficie** y no se usa como dato de área; solo delimita dónde leer píxeles.
- **Riesgo:** Pozuelos cruza el límite entre las zonas UTM 19 y 20 (longitud −66°). La tesela 19KHR la cubre completa y la 19KGR solo en parte (ver MANIFEST). Las Maderas aparece en teselas de zona 19 (19JHN) y 20 (20JKT): **las dos fechas de una comparación deben usar la misma tesela y el mismo sistema de coordenadas.**

## D-07 · 2026-11-22 · ADOPTADA (Fase 3) — Clasificación de agua: MNDWI > 0 fijo (principal) y NDWI > 0 (secundario)
- **Decisión:** índice > 0 con un **umbral fijo, igual para todas las fechas y casos**. Es el umbral de referencia de la literatura (McFeeters 1996; Xu 2006) y no se ajustó para obtener ningún resultado. Otsu se descartó: daría un umbral distinto por fecha y rompería la comparabilidad.
- **Transparencia:** se informa la sensibilidad a −0,1 y +0,1 y la clase SCL 6 de ESA como referencia cruzada.
- **Validación visual (quicklooks en falso color B11/B08/B03):**
  - Las Maderas: el contorno sigue los brazos del embalse y los métodos coinciden (−13 % a −19 %).
  - Pozuelos, septiembre: hay una franja amplia de barro o agua muy somera que MNDWI/NDWI excluyen y SCL incluye. **La variación depende del método (−26 % a −68 %); el valor principal MNDWI −53,9 % se informa junto con ese rango.**
- **Radiometría:** reflectancia = (DN + BOA_ADD_OFFSET) / BOA_QUANTIFICATION_VALUE, leídos del `MTD_MSIL2A.xml` de cada escena (−1000 y 10000 en las 4 escenas, baseline 05.11). Omitir el offset sesga los índices (cubierto por `test_offset_cambia_el_indice`).

## D-08 · 2026-11-22 · APROBADA PROVISIONALMENTE (Fase 3) — Fechas a comparar por caso
- **Validación efectiva (Fase 3):** las 4 escenas tienen bandas B03, B08, B11 y SCL leídas (incluida la pendiente de Las Maderas 2025-05-29), cobertura del 100 % de la región, nubosidad efectiva ≤ 0,023 % y ≥ 99,96 % de píxeles válidos en ambas fechas. Comparten tesela, sistema de coordenadas y grilla (verificado por `proj:transform`). **No hizo falta sustituir ningún par.**
- **Criterio aplicado:** misma tesela MGRS y mismo sistema de coordenadas en ambas fechas, cobertura del polígono ≥ 99,9 %, nubosidad efectiva sobre el AOI ≤ 0,05 % (calculada con SCL, no con la nubosidad de escena) y bandas B03/B08/B11 accesibles.
- **Pozuelos (2025, tesela 19KHR):** `S2C_MSIL2A_20250504T142811_R053_T19KHR_20250504T193719` contra `S2A_MSIL2A_20250913T142801_R053_T19KHR_20250913T211118`. Alternativa 2024: 2024-04-29 contra 2024-09-21, misma tesela.
- **Las Maderas (2025, tesela 19JHN):** `S2B_MSIL2A_20250529T142719_R053_T19JHN_20250529T180713` contra `S2A_MSIL2A_20251003T142811_R053_T19JHN_20251003T192715`. Alternativa: el mismo par en la tesela 20JKT.
- ~~Pendiente: leer las bandas de la fecha A del par 19JHN~~ → resuelto en la Fase 3. Las Maderas, fin húmeda 2024: sigue sin candidata completa (no se usa).
- **Advertencia:** "húmeda" y "seca" son ventanas de calendario. Si un año fue anómalo, lo dirá la precipitación (D-05), no esta etiqueta.

## D-09 · 2026-11-22 · ADOPTADA (Fase 4) — Gráficos sin librería
- **Decisión:** tarjetas y una barra de rango en HTML/CSS (sin dependencias). No hay serie temporal: hay dos fechas por caso, y no se simulan fechas intermedias.

## D-10 · PARCIAL (Fase 1) — Mapa base offline
- **Falta:** decidir fondo. Online: OSM o imagen satelital (verificar condiciones de uso de teselas). Offline: GeoJSON de límite provincial + render de la escena RGB precalculada como overlay.
- **Adoptado en Fase 1 (provisorio):** teselas de OpenStreetMap (`tile.openstreetmap.org`) con atribución. Si fallan varias teselas, la UI muestra "Mapa base no disponible". **Pendiente:** fondo local para la demo offline (Fase 5) y revisar la política de uso de teselas de OSM (uso liviano en la demo; no apto para producción con mucho tráfico).

## D-11 · 2026-11-22 · ADOPTADA (Fase 4) — Visualización de la escena satelital
- **Opciones:** (a) solo contorno vectorial del agua por fecha (GeoJSON, liviano); (b) PNG georreferenciado (RGB y/o máscara) como `ImageOverlay` de Leaflet.
- **Decisión:** (a) contornos vectoriales reales de agua por fecha (MNDWI) en el mapa. Los quicklooks (falso color B11/B08/B03) se muestran como **imágenes de control** en el panel, no georreferenciados ni superpuestos al mapa (no tienen bounds publicados).

## D-12 · 2026-11-22 · ADOPTADA — Encuadre inicial del mapa
- **Decisión:** `JUJUY_VIEW_BOUNDS` en `src/lib/cases.ts` = [[-24.6, -67.3], [-21.7, -64.1]], valores redondeados que encierran la provincia.
- **Justificación:** sirve solo para centrar la vista. **No es un límite oficial ni se usa para ningún cálculo.** Los límites reales llegarán de IGN/HydroBASINS (D-06).

## D-13 · 2026-11-22 · ADOPTADA — Pruebas sin dependencias extra
- **Decisión:** `npm test` = `node --test tests/*.test.ts`, usando la ejecución nativa de TypeScript de Node (v25 en este entorno; requiere Node ≥ 23.6).
- **Justificación:** evita instalar Vitest o Jest. Las pruebas cubren lógica pura (catálogo, carga del resumen). La prueba de UI se hace con Chrome sin interfaz y no queda versionada (ver informe de la Fase 1).
- **Nota:** Node emite la advertencia `MODULE_TYPELESS_PACKAGE_JSON`, que no afecta el resultado. Se puede silenciar agregando `"type": "module"` cuando se confirme que no rompe la configuración de Next.js o ESLint.

## D-14 · 2026-11-22 · ADOPTADA — Sin fuentes remotas, sin config experimental
- **Decisión:** se quitó `next/font/google`, que descarga fuentes en el build, y se usa la fuente del sistema. Se quitaron `cacheComponents` y `partialPrefetching` del scaffold.
- **Justificación:** el build no depende de Internet y no hay funciones experimentales sin necesidad.

## D-15 · 2026-11-22 · ADOPTADA — `npm start` sirve el export estático
- **Decisión:** `npm start` = `npx --yes serve@14.2.4 out -l 3000`, porque `next start` no aplica con `output: "export"`.
- **Nota:** la primera ejecución descarga `serve` con npx (requiere red). Alternativa offline: cualquier servidor estático sobre `out/`.

## D-18 · 2026-11-22 · ADOPTADA (Fase 3) — Región de análisis, grilla y control de calidad
- **Región constante por caso:**
  - Polígono OSM dilatado 500 m (25 píxeles de 20 m), menos los otros cuerpos de agua OSM. Allí entran el Dique La Ciénaga (102 px excluidos) y pequeños estanques junto a Las Maderas, y un polígono sin nombre (way 263950840, 365 px) junto a Pozuelos.
  - La misma máscara se usa en ambas fechas, y la comparación se hace sobre píxeles válidos en las dos.
  - Agua que toca el borde de la región: ≤ 0,08 %, sin recorte relevante de expansiones.
- **Grilla:** 20 m (B11/SCL nativos). B03 y B08 se pasan a reflectancia a 10 m y se promedian en bloques 2×2 alineados; se verificó que ambas grillas comparten origen. No hay otro remuestreo.
- **Política SCL:** se excluyen 0, 1, 3, 8, 9 y 10. Se conservan 2, 4, 5, 6, 7 y 11; la 11 (nieve/hielo) se conserva porque en la Puna puede corresponder a salares, y se informa por clase.
- **Área:** n_px × 400 m² / k², con k = factor de escala UTM en el centro de la región (1,00077 en Pozuelos y 1,00136 en Las Maderas, ambos en zona 19). No se calcula en grados.
- **Controles de calidad:** cobertura ≥ 99,5 %, nubosidad efectiva ≤ 1 %, píxeles válidos comunes ≥ 98 % y agua en el borde ≤ 1 %. Si alguno falla, el estado pasa a `requiere_revision`. Las 4 escenas cumplen los cuatro.
- **Caché:** ventanas en `data/raw/cache/` con sha256. Una caché corrupta o truncada se descarta. Una segunda corrida no hace pedidos de datos (solo el token SAS) y produce métricas idénticas.

## D-19 · 2026-11-22 · ADOPTADA (Fase 3) — Estructura de datos procesados
- **Decisión:** se mantiene `data/derived/` (convención de la Fase 0) con `cases.json`, `water_metrics.json`, `rainfall_metrics.json`, `geometries/*.geojson`, `qa/` y `MANIFEST.md`. Reemplaza al `summary.json` por caso propuesto en `DATA_SOURCES.md` §4.
- **Pendiente (Fase 4):** copiar o servir estos archivos desde `public/data/`. El frontend actual espera `/data/<caso>/summary.json` (`src/lib/loadCaseSummary.ts`) y habrá que adaptarlo.

## D-20 · 2026-11-22 · ADOPTADA (Fase 4) — Publicación de datos para el frontend
- **Decisión:** `scripts/publish-data.mjs` (Node, sin dependencias) copia byte a byte de `data/derived/` a `public/data/` solo lo que usa el frontend: los 3 JSON, 8 GeoJSON y 4 quicklooks (2,3 MB). Escribe `public/data/manifest.json` con origen, bytes y sha256 de cada archivo.
- **Única fuente de verdad:** `public/data/` es un artefacto generado. Se ignora en git y se regenera completo con `predev` y `prebuild`. `tests/publish.test.ts` falla si una copia difiere de su fuente.
- **Qué no se publica:** cachés, datos crudos, `http_log`, `geometries_report.json` ni scripts.
- **Rutas:** relativas (`data/...`, sin "/" inicial), compatibles con la exportación estática servida en cualquier subruta. `dataUrl()` rechaza rutas absolutas, `..` y URLs externas.

## D-21 · 2026-11-22 · ADOPTADA (Fase 4) — Presentación de resultados en el dashboard
- **Valores:** todos se leen de los JSON publicados; ninguna métrica está escrita en `src/` (verificado por búsqueda).
- **Rango de incertidumbre:** mínimo y máximo de variaciones **ya presentes** en `water_metrics.json`: sensibilidad MNDWI (−0,1/0/+0,1), NDWI umbral 0 y la variación de la clase SCL 6 (calculada con las áreas por fecha del mismo archivo). Resultado: Pozuelos de −26,3 % a −68,5 %; Las Maderas de −13,0 % a −18,9 %. Se muestra junto al valor principal MNDWI, con una barra y la lista de métodos.
- **Aviso de alta sensibilidad:** se activa por dato, no por nombre de caso, cuando la amplitud del rango supera 15 puntos (`HIGH_SENSITIVITY_SPAN`). Repite la advertencia del JSON sobre agua somera y barro, y aclara que el porcentaje no es una medida exacta.
- **Comparador:** botones Antes, Después y Comparar sobre las **dos observaciones reales**; no hay slider ni fechas intermedias. En "Comparar", el naranja (fecha B) se dibuja sobre el azul (fecha A), así que el azul visible es agua detectada solo en A.
- **Áreas:** las tarjetas y la diferencia usan las áreas de `comparisons` (máscara válida común). Los contornos del mapa usan la máscara de cada fecha; se aclara en la trazabilidad.
- **Mapa:** se encuadra en el cuerpo de agua (el contorno OSM ampliado un 35 %). La cuenca aparece como sombreado con bordes tenues, porque Pozuelos tiene 31 subunidades. La leyenda es plegable y empieza cerrada en anchos menores a 768 px.
- **Mapa base:** sigue siendo OSM en línea. Sin conexión aparece el aviso "Mapa base no disponible…" y las geometrías y métricas funcionan igual (verificado bloqueando los hosts externos). Se corrigió que Leaflet emitía `load` aunque fallaran todas las teselas.
- **Sin semáforos:** colores neutros (azul y ámbar para las fechas, violeta para la cuenca) y sin etiquetas del tipo "sequía".

## D-22 · 2026-11-22 · ADOPTADA (Fase 5) — Mapa base local con límites del IGN
- **Decisión:** el mapa usa por defecto el límite provincial y los 16 departamentos de Jujuy del WFS del IGN (`ign:provincia`, `ign:departamento`). Se simplificaron con Douglas-Peucker a ~100 m (de 13 720 a 1136 y de 123 796 a 4149 vértices, 114 KB) mediante `scripts/basemap/fetch_ign_basemap.py`, y se publican desde `data/derived/basemap/`.
- **OpenStreetMap:** queda como opción manual («OpenStreetMap (online)»). En modo local no hay pedidos externos (verificado con DNS bloqueado).
- **Licencia IGN:** no se encontró un texto explícito para los geoservicios WFS. Se atribuye «Límites: IGN Argentina»; **queda pendiente de verificar**.

## D-23 · 2026-11-22 · ADOPTADA (Fase 5) — Render Canvas en Leaflet
- **Decisión:** `preferCanvas: true`. Con SVG, la capa de agua de Pozuelos (más de 280 polígonos) se componía recortada en Chrome sin interfaz, aunque la geometría estaba completa en el DOM. Con Canvas se dibuja completa y rinde mejor.
- **Consecuencia:** las pruebas leen los conteos `data-base-features`, `data-drawn-a` y `data-drawn-b` que expone `MapView`, en lugar de contar elementos `<path>`.

## D-24 · 2026-11-22 · ADOPTADA — CI en Pull Requests y despliegue estático en Vercel
- **CI** (`.github/workflows/ci.yml`, PR → `master`): `npm ci`, lint, typecheck, build, `npm test` (integridad sha256 de los datos publicados), control de que `out/data` tenga todo el manifiesto, y las pruebas Python con solo numpy (`scripts/requirements-ci.txt`). Sin credenciales.
- **E2E en CI:** no se incluye por ahora. Para uso local existe `npm run test:e2e:smoke` (tope global de 120 s, sin reintentos).
- **Vercel:** `vercel.json` con preset Next.js, `npm ci` y `npm run build`. La exportación estática (`out/`) no necesita variables de entorno ni datos crudos (verificado con un clon limpio desde GitHub).
- **`npm start`:** usa `scripts/serve-static.mjs` (Node, sin descargas) en lugar de `npx serve`.
