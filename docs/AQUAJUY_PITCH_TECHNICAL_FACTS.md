# AquaJuy — Hechos técnicos para el pitch

Cada afirmación está clasificada según lo que hay **en el código y los datos de esta rama** (`feature/integration-juli-aquajuy`, 2026-11-23). Si una frase del pitch o del video no figura como verificada, hay que corregirla o decirla con su límite.

**Escala:**
- **IMPLEMENTADA Y VERIFICADA:** el código existe y hay pruebas automáticas.
- **IMPLEMENTADA CON LIMITACIONES:** existe, pero con alcance acotado, y ese límite debe decirse.
- **EN DESARROLLO:** planificada o parcial; no presentarla como disponible.
- **NO RESPALDADA:** no existe; no decirla.

| # | Afirmación | Clasificación | Evidencia y frase segura |
|---|---|---|---|
| 1 | «Usamos observaciones satelitales» | **IMPLEMENTADA Y VERIFICADA** | Sentinel-2 L2A, 2 escenas por caso (`water_metrics.json`, MNDWI/NDWI con máscara SCL). Frase: «superficie de agua visible estimada a partir de Sentinel-2». |
| 2 | «Comparamos el agua en el tiempo» | **IMPLEMENTADA CON LIMITACIONES** | Comparador Antes/Después/Comparar entre **2 fechas** por caso (E2E). No hay serie temporal de superficie ni tendencia. Frase: «comparamos dos fechas reales». |
| 3 | «Usamos datos reales» | **IMPLEMENTADA CON LIMITACIONES** | Observaciones y CHIRPS: sí. Clima Open-Meteo: es una **estimación de reanálisis**. Simulador: datos **sintéticos**. Frase: «las observaciones son reales; el simulador es demostrativo y sintético». |
| 4 | «Precipitación y temperatura» | **IMPLEMENTADA CON LIMITACIONES** | CHIRPS v3.0: lluvia mensual, media de la cuenca modelada. Open-Meteo: lluvia y temperatura mensuales 2019-03→2026-10 en **un punto** (centro del AOI). Son estimaciones, no estaciones, y difieren entre sí (Open-Meteo da 1,4–3× CHIRPS). No decir «ERA5-Land»: no está verificado. |
| 5 | «Modelo de IA / HistGradientBoosting» | **IMPLEMENTADA CON LIMITACIONES** | `HistGradientBoostingRegressor` (scikit-learn 1.9.1) entrenado con **4000 muestras sintéticas** calibradas a 2 observaciones reales por caso. R² 0,999 / 0,998 **sobre datos sintéticos**: no valida nada frente a la realidad. Frase: «un modelo demostrativo de sensibilidad, entrenado con datos sintéticos». |
| 6 | «Simulamos escenarios climáticos» | **IMPLEMENTADA CON LIMITACIONES** | «Simulador climático — demostración experimental»: entradas de lluvia y temperatura de 3 meses, escenarios seco y húmedo, aviso permanente. Es un análisis de sensibilidad; la elasticidad térmica es un supuesto fijo (5 % por +5 °C). |
| 7 | «Pronósticos a corto plazo» | **NO RESPALDADA** | No hay pronóstico: el simulador no proyecta fechas futuras ni consume pronósticos meteorológicos. No decir «predecimos» ni «pronosticamos». |
| 8 | «Datos del SMN» | **NO RESPALDADA** | No hay integración ni datos del Servicio Meteorológico Nacional. Como mucho, «posible fuente futura». |
| 9 | «Evaporación» | **NO RESPALDADA** | No se calcula ni se publica evaporación ni evapotranspiración. |
| 10 | «Funciona sin internet» | **IMPLEMENTADA Y VERIFICADA** | Datos, mapa base político (IGN), historial y simulador son locales (E2E `sin-internet`). El modo «Físico» sí requiere internet. |
| 11 | «Incertidumbre visible» | **IMPLEMENTADA Y VERIFICADA** | Rango entre métodos y umbrales: Pozuelos de −26,3 % a −68,5 %; Las Maderas de −13,0 % a −18,9 %. |
| 12 | «Tenemos API» | **IMPLEMENTADA CON LIMITACIONES** | `server/index.js` es de solo lectura y no está desplegada; la demo pública no la usa. Frase: «API opcional, lista para desplegar». |
| 13 | «Alertas / alerta temprana / riesgo de sequía» | **EN DESARROLLO** (solo hoja de ruta) | No hay alertas ni índice de sequía. Aparece en `MODELO_DE_NEGOCIO.md` como plan a 3–6 meses. |
| 14 | «Volumen o caudal» | **NO RESPALDADA** | Fuera de alcance: solo superficie visible. |

## Frases a corregir en el pitch o el video
- **«clima real de la cuenca»** → «clima estimado (reanálisis) en un punto del área».
- **«ERA5-Land»** → «Open-Meteo Historical» (sin nombrar el modelo).
- **«el modelo predice / pronostica»** → «el simulador muestra la sensibilidad a un escenario; es demostrativo».
- **«R² 0,99» como mérito** → no usarlo, o decir «sobre datos sintéticos».
- **«datos del SMN», «evaporación», «alertas»** → no mencionarlos como existentes.
- **El video no se editó en esta integración:** revisarlo contra esta tabla antes de presentarlo.
