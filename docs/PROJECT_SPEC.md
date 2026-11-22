# Contexto del Proyecto (MVP Acotado): Monitoreo de Cuencas y Fuentes de Agua Natural — Jujuy

## 1. Definición y Alcance del Proyecto
Plataforma geoespacial enfocada exclusivamente en el **seguimiento de cuencas hidrográficas y fuentes de agua superficial/natural en la provincia de Jujuy** (lagunas altoandinas, embalses/diques y tramos de ríos principales).

El sistema permite visualizar la evolución temporal de cuerpos de agua y las condiciones climáticas de su cuenca asociada comparando períodos reales contra su propio historial, entregando información clara y trazable para la toma de decisiones territoriales, ambientales o productivas.

### ¿Por qué este recorte?
* **Viabilidad en tiempo de hackathon:** Al eliminar el análisis por lote agrícola individual, modelos predictivos complejos y datos de radar (SAR), se reduce drásticamente el tiempo de geoprocesamiento y el riesgo técnico.
* **Coherencia hidrológica:** Analizar la fuente de agua junto con su cuenca de aporte permite explicar *por qué* cambia un espejo de agua (déficit de lluvias aguas arriba vs. comportamiento normal estacional).

---

## 2. Límites Explícitos (Qué NO hace el sistema)
Para mantener el rigor científico y evitar falsas expectativas ante el jurado:
1. **No estima aguas subterráneas:** No calcula reservas de acuíferos, niveles freáticos ni caudales de perforación (variables que requieren estudios hidrogeológicos de subsuelo).
2. **No mide caudal volumétrico exacto ($m^3/s$):** Mide variación relativa de superficie hídrica visible y anomalías climáticas en la cuenca, funcionando como herramienta de apoyo y alerta temprana.
3. **No abarca toda la provincia a escala de detalle:** Trabaja sobre un conjunto seleccionado de cuencas y cuerpos de agua testigo representativos de Jujuy.

---

## 3. Casos Testigo Sugeridos en Jujuy
Seleccionar entre **3 y 5 unidades hidrográficas** contrastantes para demostrar la utilidad en distintas ecorregiones:
* **Puna:** Laguna de los Pozuelos o Cuenca de Miraflores (alta sensibilidad a ciclos secos/húmedos).
* **Quebrada:** Cuenca del Río Grande (dinámica estacional marcada y aporte de cabecera).
* **Valles / Perico:** Sistema de embalses Dique Las Maderas y Dique La Ciénaga (relevancia directa para abastecimiento y riego).
* **Yungas / Ramal:** Cuenca del Río San Francisco (contraste climático y régimen pluvial estival).

---

## 4. Datos y Variables (Mínimos y Verificables)
Se utilizan únicamente fuentes abiertas, preprocesadas para garantizar estabilidad y rapidez durante la demo:

| Variable / Indicador | Fuente de Datos | Propósito en el MVP |
| :--- | :--- | :--- |
| **MNDWI / NDWI** (Índice de Agua de Diferencia Normalizada) | **Sentinel-2** (10 m – 20 m, escenas filtradas por baja nubosidad) | Detectar y cuantificar cambios en el área de espejos de agua superficial y zonas húmedas ribereñas. |
| **Precipitación acumulada ($P$)** | **CHIRPS / NASA POWER / Open-Meteo** | Medir el aporte pluvial en la cuenca durante ventanas de 30, 60 y 90 días y compararlo contra el promedio histórico de la misma época. |
| **Delimitación de Cuencas y Relieve** | **HydroSHEDS / IGN / Copernicus DEM** | Definir los límites físicos de cada cuenca de aporte y contextualizar la altitud y pendiente del sistema. |

---

## 5. Funcionalidades del MVP (Flujo de Usuario)
1. **Selector de Cuenca o Fuente de Agua:** El usuario elige entre los casos testigo de Jujuy en un mapa interactivo.
2. **Comparador Temporal (Antes vs. Después / Histórico):** Permite contrastar dos fechas reales (ej. estación seca vs. húmeda, o un año seco frente al promedio histórico) mostrando la variación visual del cuerpo de agua y las métricas asociadas.
3. **Panel de Contexto y Trazabilidad:**
   * Variación porcentual de superficie hídrica detectada (MNDWI/NDWI).
   * Déficit o superávit de precipitación acumulada en la cuenca.
   * Ficha de transparencia: fecha exacta de las imágenes satelitales, porcentaje de nubes, fuente de datos y advertencias metodológicas.
4. **Modo Resiliente / Offline:** Todos los GeoJSON, capas precalculadas y series temporales se almacenan localmente en el proyecto para evitar caídas por conexión o límites de API durante la presentación.

---

## 6. Distribución Sugerida por Perfil del Equipo
* **Datos / Arquitectura:** Descarga y preprocesamiento de polígonos de cuencas, cálculo de MNDWI/NDWI sobre fechas seleccionadas y extracción de series de precipitación.
* **Frontend:** Mapa interactivo (Leaflet / MapLibre), selector de cuencas, vista comparativa de fechas y gráficos de evolución de lluvia vs. superficie hídrica.
* **Dominio / Interpretación Territorial:** Selección de casos testigo en Jujuy, redacción de las explicaciones contextuales de cada cuenca (qué significa el cambio observado) y guion del pitch.
* **QA / Validación:** Verificación de coherencia entre fechas, revisión de metadatos/fuentes visibles en pantalla, pruebas de flujo completo y respaldo offline.