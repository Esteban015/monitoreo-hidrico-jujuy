# MANIFEST — Datos crudos y exploración de fuentes

Registro de cada fuente consultada, con sus resultados reales. Los archivos de `data/raw/` **no se versionan**; solo este manifiesto.
Fecha de consulta de todo lo listado: **2026-11-22** (UTC). Scripts: `scripts/explore/`. Registro HTTP completo: `data/raw/exploration/http_log.jsonl`.

Estados: **CONFIRMADO** (acceso a datos reales verificado) · **RESTRINGIDO** (requiere credenciales o tiene limitaciones fuertes) · **FALLIDO** · **PENDIENTE**.

---

## 1. Geometría de casos — OpenStreetMap
| Campo | Laguna de los Pozuelos | Dique Las Maderas |
|---|---|---|
| Objeto OSM | [way 117694382](https://www.openstreetmap.org/way/117694382) `natural=water, water=lake` | [way 509257795](https://www.openstreetmap.org/way/509257795) "Embalse Las Maderas" `water=reservoir`; muro [way 85604244](https://www.openstreetmap.org/way/85604244) `waterway=dam` |
| Vértices / anillo cerrado | 158 / sí | 1689 / sí |
| Rectángulo envolvente (lon/lat) | −66.0484, −22.4167, −65.9472, −22.2859 | −65.2888, −24.4776, −65.2486, −24.4338 |
| Punto de referencia | promedio de vértices (verificado dentro del polígono) | punto medio del muro: −65.24917, −24.44870 |
| Acceso | Nominatim HTTP 200; Overpass HTTP **502** en el primer intento, 200 al reintentar; el mirror `overpass.kumi.systems` no respondió (timeout) | idem |
| Licencia | ODbL 1.0, © colaboradores de OpenStreetMap | idem |
| Limitación | contorno cartográfico con fecha desconocida: **no es una medición de superficie** | idem |
| Archivos | `exploration/osm_laguna-pozuelos.geojson` (14 KB) | `exploration/osm_dique-las-maderas.geojson` (145 KB) |
| Estado | **CONFIRMADO** (reproducible: segunda corrida byte a byte idéntica) | **CONFIRMADO** |

## 2. Sentinel-2 L2A
### 2.1 Catálogos
| Catálogo | Endpoint | Resultado | Estado |
|---|---|---|---|
| Microsoft Planetary Computer | `planetarycomputer.microsoft.com/api/stac/v1`, colección `sentinel-2-l2a` | búsqueda HTTP 200; ítems con B03 (10 m), B08 (10 m), B11 (20 m), SCL (20 m); token SAS anónimo HTTP 200; **lectura real de píxeles** por ventana COG (uint16, teselas de 10980² px a 10 m y 5490² px a 20 m) | **CONFIRMADO** |
| Copernicus Data Space | `stac.dataspace.copernicus.eu/v1`, colección `sentinel-2-l2a` | búsqueda HTTP 200 (respuestas de 25–189 s); conteos casi iguales a MPC (p. ej. Las Maderas, fin seca 2024: 82 contra 66); descarga sin credenciales: **HTTP 401** `DAT-ZIP-604 "Token not found"` | **RESTRINGIDO** (requiere cuenta) |
| Google Earth Engine | — | no probado (requiere cuenta) | PENDIENTE (no necesario) |

Escenas con nubosidad de escena menor a 20 % en MPC (rectángulo del AOI):

| Ventana | Pozuelos | Las Maderas |
|---|---|---|
| fin húmeda 2024 (15-mar a 31-may) | 30 | 39 |
| fin seca 2024 (01-sep a 30-nov) | 23 | 66 |
| fin húmeda 2025 | 36 | 18 |
| fin seca 2025 | 42 | 95 |

Teselas MGRS: Pozuelos 19KGR y 19KHR; Las Maderas 19JHN, 19KHP, 20JKT y 20KKU.

### 2.2 Nubosidad de escena y nubosidad efectiva sobre el AOI
- **Cobertura** = % de píxeles SCL del polígono OSM con dato.
- **Nube AOI** = % de píxeles con clase SCL 3, 8, 9 o 10, sobre los píxeles con dato. Se lee solo la ventana del AOI a 20 m.
- Se evaluaron las 4 escenas de menor nubosidad de escena por ventana.

Diferencias entre nubosidad de escena y efectiva (casos ilustrativos):
- Pozuelos 2025-10-11 (19KHR): escena 0,03 %, **AOI 3,37 %**.
- Pozuelos 2025-09-21: escena 0,03 %, AOI 2,40 %.

Cobertura parcial:
- La tesela **19KGR cubre solo el 61,6–61,7 % de Pozuelos**. La 19KHR la cubre en 99,8–100 %.
- En Las Maderas, las teselas 19KHP (22–29 %) y 20KKU (53–80 %) son parciales. Las 19JHN y 20JKT cubren el 100 % (excepto 2024-04).

> Corrección registrada: la primera corrida (`exploration/s2_access_v1_cobertura_sobreestimada.json`) recortaba la ventana al borde de la tesela y reportaba 19KGR con 100 %. Se corrigió con lectura `boundless`; el archivo vigente es `exploration/s2_access.json`.

### 2.3 Pares candidatos (misma tesela, cobertura completa, nube AOI baja) — propuesta para D-08
| Caso | Fecha A (fin húmeda) | Fecha B (fin seca) | Tesela / CRS | Escena % | Nube AOI % | Cobertura % | Bandas B03/B08/B11 leídas |
|---|---|---|---|---|---|---|---|
| Pozuelos 2025 | `S2C_MSIL2A_20250504T142811_R053_T19KHR_20250504T193719` | `S2A_MSIL2A_20250913T142801_R053_T19KHR_20250913T211118` | 19KHR / EPSG:32719 | 0,0005 / 0,047 | 0,03 / 0,02 | 100 / 100 | sí / sí |
| Pozuelos 2024 (alternativa) | `S2A_MSIL2A_20240429T142721_R053_T19KHR_20240429T200943` | `S2B_MSIL2A_20240921T142709_R053_T19KHR_20240921T201933` | 19KHR / EPSG:32719 | 0,0004 / 0,00003 | 0,00 / 0,00 | 99,91 / 100 | sí / sí |
| Las Maderas 2025 | `S2B_MSIL2A_20250529T142719_R053_T19JHN_20250529T180713` | `S2A_MSIL2A_20251003T142811_R053_T19JHN_20251003T192715` | 19JHN / EPSG:32719 | 0,007 / 0,000003 | 0,00 / 0,00 | 100 / 100 | solo SCL / sí |
| Las Maderas 2025 (alternativa) | `S2B_MSIL2A_20250529T142719_R053_T20JKT_20250529T180713` | `S2A_MSIL2A_20251003T142811_R053_T20JKT_20251003T192715` | 20JKT / EPSG:32720 | 0,003 / 0,00001 | 0,00 / 0,00 | 100 / 100 | sí / solo SCL |
| Las Maderas 2024 | — | `S2B_MSIL2A_20241011T142709_R053_T19JHN_20241011T182245` | 19JHN | — / 0,0002 | — / 0,00 | — / 100 | — / sí |

- Las Maderas, fin húmeda 2024: ninguna de las 4 candidatas cubre el embalse completo (máximo 80,3 %). Queda **PENDIENTE** ampliar la búsqueda.
- URL STAC de cada ítem: `https://planetarycomputer.microsoft.com/api/stac/v1/collections/sentinel-2-l2a/items/<ID>`.
- "Fin húmeda" y "fin seca" son ventanas de calendario elegidas como hipótesis. No afirman que esos años hayan sido húmedos o secos.

### 2.4 Acceso a bandas
- Primera corrida: 22 de 24 lecturas correctas. B11 del 2024-04-29 y B08 del 2025-04-06 fallaron con `RasterioIOError('Read failed')` y funcionaron al primer reintento.
- Segunda corrida: 21 de 21 lecturas correctas.
- Conclusión: hay fallas transitorias, así que se necesitan reintentos.
- Nunca se descargó una escena completa: solo bloques de 64×64 px y la ventana SCL del AOI a 20 m (Pozuelos 530×721 px; Las Maderas 203×243 o 204×242 px, según el sistema de coordenadas).

| Campo | Valor |
|---|---|
| Licencia | Copernicus Sentinel data, política de datos abiertos. Atribución sugerida: "Contiene datos modificados de Copernicus Sentinel [año]". **Texto exacto por verificar.** |
| Estado | **CONFIRMADO** (MPC) · **RESTRINGIDO** (CDSE) |

## 3. Precipitación
### 3.1 CHIRPS v3.0 (CHC, UCSB)
| Campo | Valor verificado |
|---|---|
| Rutas probadas | `products/CHIRPS-2.0/global_daily/` → **HTTP 404**. `products/CHIRPS-2.0/`, `.../cogs/p05/` y `products/CHIRPS/` → **HTTP 429** (límite de pedidos). `products/CHIRPS/v3.0/` → 200 |
| Producto elegido | `v3.0/pentads/global/cogs/chirps-v3.0.AAAA.MM.P.cog` (P = pentada del mes, 1 a 6) |
| Cobertura temporal | `1981.01.1` a `2026.10.6`, 3300 archivos |
| Cobertura espacial | 60° N a 60° S, global, 7200×2400 px |
| Resolución | 0,05° (`res = 0.05000000074505806`) |
| Unidades | **mm/pentad**. Atributo `units` de la variable `precip` del NetCDF oficial (`v3.0/pentads/global/netcdf/chirps-v3.0.2025.pentads.nc`, 862 MB, no descargado; leído solo en su encabezado vía HDF5 remoto). `_FillValue` y `missing_value` = −9999. Los COG **no** declaran unidades ni nodata. |
| Convención temporal | "time variable denotes the first day of the given pentad" (atributo `comments`) |
| Versión final o preliminar | carpeta `pentads/global` = final; existe `prelim/` aparte |
| Lectura por ventana | `2026.10.6`: OK. Pozuelos 12×13 px, Las Maderas 11×11 px, float32, mín. 0, máx. 6,43 y 15,20 mm/pentad. La lectura tardó **135,9 s**. `2026.10.5`: **falló** (`RasterioIOError`, 697 s). |
| Listado de directorio | HTTP 200, 664 KB, **89 s** |
| Diario | existe `v3.0/daily/final/{rnl,sat}`. Según el README oficial, se deriva del pentadal (desagregado con ERA5 o IMERG) y la CHC recomienda pentadas o meses. No se usa. |
| Latam | `v3.0/pentads/latam/tifs/` existe: 3,68 MB por archivo |
| Licencia | **por verificar**. El README pide citar Funk et al. y referencia `pubs.usgs.gov/ds/832/` |
| Archivos | `exploration/chirps.json` (metadatos y valores de las 2 ventanas) |
| Estado | **CONFIRMADO con restricción de rendimiento**: con la velocidad medida, 540 lecturas por caso (30 años × 18 pentadas) tomarían horas |

### 3.2 Alternativas por punto (NO son promedios de cuenca)
Punto = centro del rectángulo del polígono OSM. Período 2025-08-01 a 2025-10-31 (92 días).

| Fuente | Variable / unidad | Base | Pozuelos (−22.3513, −65.9978) | Las Maderas (−24.4557, −65.2687) | Estado |
|---|---|---|---|---|---|
| NASA POWER `api/temporal/daily/point` | `PRECTOTCORR`, mm/día | MERRA-2 (grilla gruesa) | 31,58 mm; 0 faltantes; elevación de la grilla 4030 m | 56,24 mm; elevación de la grilla 994 m | **CONFIRMADO** |
| Open-Meteo `archive-api` | `precipitation_sum`, mm | reanálisis; el punto se ajusta a la grilla | 37,3 mm; punto devuelto (−22.320, −65.988), 3662 m | **110,7 mm**; punto devuelto (−24.429, −65.219), 1164 m | **CONFIRMADO**; condiciones de uso **por verificar** |

- Las dos fuentes difieren casi al doble en Las Maderas.
- Ambas consultas, repetidas, dieron sumas idénticas.

## 4. Cuencas
### 4.1 HydroBASINS v1c (HydroSHEDS)
| Campo | Valor |
|---|---|
| Archivo | `https://data.hydrosheds.org/file/HydroBASINS/standard/hybas_sa_lev10_v1c.zip`: 68 544 233 bytes, HTTP 200, 213 s. Guardado en `data/raw/hydrobasins/` |
| Nivel 08 | `hybas_sa_lev08_v1c.zip` (30 MB según HEAD): **FALLIDO**, timeout de lectura tras 1440 s |
| Unidades nivel 10 Sudamérica | 123 438 |
| Pozuelos | Punto en la unidad 6100747820 (`ENDO=1`). La cadena aguas abajo 6100747820 → 6100747840 → **6100040870** (`ENDO=2`, sumidero endorreico). Aguas arriba del sumidero: 31 unidades, `UP_AREA` = **3932,2 km²** (la suma de `SUB_AREA` da 3932,4). Las 7 unidades que tocan el contorno del lago están incluidas. |
| Las Maderas | El muro está en la unidad **6100781080** (`ENDO=0`), de cabecera: `SUB_AREA` = `UP_AREA` = **233,5 km²**. **Limitación:** la unidad cierra en una confluencia, no en la presa, y puede incluir área aguas abajo del muro. Sin validar. |
| Tipo de dato | cuenca **modelada** a partir del DEM de HydroSHEDS (~15 arcsec). No es una delimitación oficial. |
| Licencia | uso científico, educativo y comercial libre con atribución (página del producto; acuerdo completo en HydroSHEDS_TechDoc_v1_4.pdf). Cita: Lehner & Grill (2013) |
| Archivos | `exploration/hybas_lev10_laguna-pozuelos.geojson` (92 KB), `exploration/hybas_lev10_dique-las-maderas.geojson` (4 KB), `exploration/hydrobasins.json` |
| Estado | **CONFIRMADO con restricciones** |

### 4.2 Fuente oficial — IGN Argentina (WFS)
| Campo | Valor |
|---|---|
| Endpoint | `wms.ign.gob.ar/geoserver/ows?service=WFS&request=GetCapabilities`: HTTP 200, 192 capas |
| Capas relacionadas | `areas_de_aguas_continentales_*`, `lineas_de_aguas_continentales_*`, `puntos_de_aguas_continentales_*`, `vegetacion_hidrofila_ED020` |
| Cuencas | **ninguna capa de cuencas** |
| Estado | **PENDIENTE**: no hay cuencas oficiales en el IGN; SSRH e INA no se sondearon |

## 5. Errores reales registrados (`http_log.jsonl`)
| Servicio | Error | Cantidad | Resolución |
|---|---|---|---|
| overpass-api.de | HTTP 502 | 3 | reintento con espera: OK (6 respuestas 200) |
| overpass.kumi.systems (mirror) | timeout / sin respuesta (curl HTTP 000) | 1 | se descartó el mirror |
| planetarycomputer.microsoft.com (ítem STAC 19KHP 2024-04-16) | `SSLEOFError UNEXPECTED_EOF_WHILE_READING` | 1 | OK en la segunda corrida (cobertura 29,29 %) |
| sentinel2l2a01.blob.core.windows.net | `RasterioIOError Read failed` | 2 | OK al primer reintento |
| download.dataspace.copernicus.eu | HTTP 401 "Token not found" | 2 | esperado: requiere cuenta |
| data.chc.ucsb.edu | HTTP 429 (curl, listados) | 3 | bajar el ritmo (pausas de 3 a 4 s) |
| data.chc.ucsb.edu | HTTP 404 `CHIRPS-2.0/global_daily/` | 1 | se usa v3.0 |
| data.chc.ucsb.edu | `RasterioIOError` lectura COG (697 s) | 2 | sin resolver; otra pentada se leyó bien (136 s) |
| data.hydrosheds.org (nivel 08) | timeout de lectura (1440 s) | 1 | se usa el nivel 10 |

Conteo total del registro: 81 respuestas 200 de MPC, 15 de CDSE STAC, 4 de NASA POWER, 4 de Open-Meteo y 2 del IGN. Los errores de curl en la exploración manual (429, 404, 502) no pasan por `http_log.jsonl`; se registran en esta tabla.

## 6. Espacio en disco
`data/raw/` = 67 MB (68,5 MB el zip de HydroBASINS; el resto son JSON y GeoJSON de menos de 400 KB). No se descargó ninguna escena satelital completa.
