# Modelo de negocio — Cuencas Jujuy

> Documento de trabajo para el pitch y la validación post-hackatón. Las cifras de precios y costos son **hipótesis ilustrativas**, no resultados de investigación de mercado. Deben validarse con entrevistas y un piloto.

## 1. Resumen ejecutivo

**Cuencas Jujuy** convierte datos satelitales abiertos en una respuesta simple y trazable: *¿el espejo de agua de esta laguna o embalse está más chico de lo normal y qué pasó con la lluvia en su cuenca?*

El producto es una plataforma web + API para gobiernos locales, organismos de cuenca, cooperativas de riego y empresas que necesitan evidencia hídrica sin montar un equipo geoespacial propio.

**Modelo:** SaaS B2G/B2B con capa pública gratuita, planes institucionales, informes técnicos y API. **Ventaja:** foco local (Jujuy/NOA), trazabilidad radical, bajo costo operativo y funcionamiento offline.

## 2. Problema

- La información existe (Sentinel-2, CHIRPS, HydroBASINS), pero está dispersa, en formatos técnicos y requiere especialistas.
- Un municipio o cooperativa no puede pagar un estudio satelital por cada cuenca ni esperar meses.
- Las decisiones de riego, agua potable, riesgo y producción se toman con datos incompletos o anecdóticos.
- La desconfianza es alta: sin fuente, fecha, método y advertencias, cualquier mapa se descarta.

## 3. Solución y propuesta de valor

| Componente | Valor |
|---|---|
| Comparador visual | Dos fechas reales, contornos de agua y variación porcentual en segundos |
| Contexto climático | Lluvia mensual en la cuenca, anomalía y percentil histórico |
| Trazabilidad | Escena, fecha, nubosidad, cobertura, método, licencia y advertencias |
| Incertidumbre explícita | Rango entre métodos y umbrales, sin falsa precisión |
| Offline | Funciona en campo o con mala conexión |
| API | Integración con sistemas de riego, reporting y tableros existentes |

**Mensaje:** *"No te decimos cuánta agua hay: te mostramos si el agua visible cambió más de lo normal y si la lluvia de la cuenca lo acompaña, con la fuente a la vista."*

## 4. Segmentos de clientes

| Segmento | Necesidad | Disposición a pagar | Prioridad |
|---|---|---|---|
| Secretaría de Recursos Hídricos / Ambiente provincial | Monitoreo territorial, transparencia, alerta temprana | Alta (presupuesto anual) | **1** |
| Municipios (El Carmen, Perico, Rinconada, etc.) | Defensa civil, riego, agua, comunicación | Media | **2** |
| Cooperativas y consorcios de riego | Planificar turnos y detectar déficit | Media-baja | 2 |
| Empresas agroindustriales y minería | Riesgo hídrico, ESG, licencia social | Alta | 3 |
| Consultoras ambientales | Datos base para estudios | Media (por proyecto) | 3 |
| ONG, universidades, medios | Evidencia y divulgación | Baja / gratuita | 4 |

## 5. Productos y planes (hipótesis)

| Plan | Precio de referencia | Incluye |
|---|---|---|
| **Público** | Gratis | 2 cuencas, comparador, ficha de transparencia, datos abiertos con atribución |
| **Profesional** | USD 250–500 / mes por organización | Hasta 10 cuencas, alertas por correo, exportables, 2 informes anuales |
| **Institucional** | USD 1.000–3.000 / mes | Cuencas ilimitadas, API, usuarios ilimitados, soporte y capacitación |
| **Proyecto** | USD 3.000–15.000 por estudio | Nueva cuenca, validación, informe técnico y presentación |
| **API / white-label** | Desde USD 500 / mes + uso | Datos embebidos en el portal del cliente |

**Ingresos complementarios:** capacitaciones, convenios con universidades, fondos de innovación y financiamiento climático.

## 6. Unit economics (ejemplo ilustrativo)

Supuesto: 12 organizaciones en plan Profesional a USD 400/mes.

| Concepto | Valor anual |
|---|---|
| ARR | USD 57.600 |
| Infraestructura y datos | USD 1.800–3.600 |
| Soporte y actualización | USD 12.000 |
| Margen bruto estimado | ~75–80 % |
| CAC estimado | USD 2.000–4.000 |
| Payback | 6–10 meses |

El costo marginal de una cuenca nueva es bajo (procesamiento batch), pero **cada cuenca exige validación y curaduría**, que es el verdadero costo.

## 7. Go-to-market

1. **Piloto 90 días** con 2–3 cuencas y una contraparte pública (Secretaría de Recursos Hídricos, municipio o UNJu).
2. **Demostración con datos reales** y ficha de transparencia; no prometer volumen ni caudal.
3. **Convenio de cooperación** para acceso a datos y validación de campo.
4. **Venta directa consultiva** a organismos y empresas; licitaciones y compras menores.
5. **Contenido y prensa local** con hallazgos estacionales; la capa pública genera confianza.
6. **Expansión NOA:** Salta, Catamarca, La Rioja y San Juan comparten problemas y fuentes de datos.
7. **Financiamiento:** programas de innovación, clima y agua (BID Lab, CAF, fundaciones, aceleradoras).

## 8. Hoja de ruta

| Horizonte | Objetivo | Entregables |
|---|---|---|
| 0–3 meses | Piloto | 4–6 cuencas, validación de campo, 1 convenio, feedback de usuarios |
| 3–6 meses | Producto | Serie temporal completa, alertas, panel multi-cuenca, usuarios y roles |
| 6–12 meses | Escala | API pública, white-label, 2 provincias, informes ESG, modelo de suscripción |
| 12–24 meses | Sostenibilidad | Contratos anuales, equipo de datos, certificaciones y alianzas |

## 9. KPIs

- Cuencas activas y actualizadas por mes.
- Usuarios/organizaciones activas y retención a 90 días.
- Tiempo desde la escena hasta la métrica publicada.
- Porcentaje de cuencas con validación visual/field check.
- MRR, ARR, churn, CAC y payback.
- Uso de la API y de los informes.
- Cobertura de prensa y convenios.

## 10. Costos y equipo mínimo

| Rubro | Estimación |
|---|---|
| Infraestructura | USD 20–150 / mes (estático + API + batch) |
| Datos | USD 0 (Sentinel-2, CHIRPS, HydroBASINS abiertos) |
| Equipo | 1 datos/geo, 1 full-stack, 0,5 dominio/ventas |
| Validación | Salidas de campo y horas de especialista |
| Legal | Términos, licencias, disclaimers, protección de datos |

## 11. Riesgos comerciales y mitigación

| Riesgo | Mitigación |
|---|---|
| Presupuesto público lento | Pilotos cortos, planes bajos, convenios, financiamiento |
| Escepticismo técnico | Trazabilidad, incertidumbre visible, validación con universidad |
| Competencia global gratuita | Foco local, soporte en español, integración y curaduría |
| Dependencia de datos abiertos | Múltiples fuentes, caché, contratos de respaldo |
| Mal uso (leer volumen donde hay superficie) | Disclaimers en UI, API y pitch; capacitación |
| Responsabilidad legal | No sustituir estudios; límites explícitos y términos de uso |
| Continuidad del equipo | Documentación, código simple, socios académicos |

## 12. Impacto y sostenibilidad

- **ODS 6** (agua limpia y saneamiento), **ODS 13** (acción climática) y **ODS 15** (vida de ecosistemas terrestres).
- Aporta transparencia y evidencia para la gestión de cuencas y la adaptación al cambio climático.
- La capa pública y los datos abiertos permiten uso educativo y periodístico.
- El negocio se sostiene con contratos institucionales, no con publicidad ni venta de datos personales.

## 13. Qué falta validar

1. Disposición real a pagar por parte de municipios y cooperativas.
2. Costo real de incorporar una cuenca nueva con control de calidad.
3. Valor percibido de la API frente al tablero web.
4. Alianzas institucionales y requisitos de licitación.
5. Precisión y utilidad en eventos extremos (sequía/inundación).
