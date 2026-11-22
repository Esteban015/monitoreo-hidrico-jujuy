# FODA — Monitoreo de Cuencas y Fuentes de Agua (Jujuy)

> Análisis del MVP y de su potencial como producto. Complementa `docs/MODELO_DE_NEGOCIO.md`.

## Matriz FODA

### Fortalezas (internas, positivas)

1. **Datos reales y trazables:** Sentinel-2 L2A, CHIRPS y HydroBASINS con ID de escena, fechas, nubosidad y método.
2. **Honestidad metodológica:** rango de incertidumbre visible, advertencias y distinción superficie/volumen/caudal.
3. **Modo offline real:** datos, geometrías y mapa provincial local; sin APIs externas en la demo.
4. **Stack simple y barato:** Next.js estático + Node sin dependencias; sin base de datos ni secretos.
5. **Foco territorial:** casos de Puna y Valles con explicación de cuenca de aporte, no un mapa genérico.
6. **Velocidad de demo:** comparación en segundos, interfaz en español y responsive.
7. **API de solo lectura:** permite integrar los datos en otros sistemas sin duplicar lógica.
8. **Costo marginal bajo:** una cuenca nueva requiere procesamiento batch, no infraestructura nueva.

### Debilidades (internas, negativas)

1. **Cobertura limitada:** sólo 2 casos testigo y 2 fechas por caso.
2. **Sin serie temporal:** no hay tendencia, estacionalidad completa ni alertas automáticas.
3. **Sin validación de campo:** no se contrastó con aforos, limnímetros ni mediciones locales.
4. **Cuencas modeladas:** HydroBASINS puede incluir área aguas abajo del muro (Las Maderas).
5. **Alta sensibilidad en Pozuelos:** agua somera, barro y salares amplían el rango (−26 % a −68 %).
6. **Equipo y marca incipientes:** prototipo de hackatón, sin estructura comercial ni soporte 24/7.
7. **Dependencia de datos gratuitos:** cambios de API, licencias o disponibilidad pueden afectar el servicio.
8. **Sin autenticación ni multiusuario:** la API es pública y no hay roles ni cuotas.

### Oportunidades (externas, positivas)

1. **Estrés hídrico y cambio climático:** creciente demanda de evidencia para adaptación y gestión.
2. **Minería de litio y agroindustria:** necesidad de monitoreo hídrico, ESG y licencia social en el NOA.
3. **Presupuesto público y licitaciones:** organismos provinciales y municipales necesitan tableros de bajo costo.
4. **Financiamiento climático e innovación:** fondos nacionales e internacionales para agua y datos abiertos.
5. **Expansión regional:** Salta, Catamarca, La Rioja y San Juan comparten fuentes y problemas.
6. **Alianzas académicas:** UNJu y universidades nacionales pueden validar y ampliar el producto.
7. **Open data y transparencia:** medios, ONG y ciudadanía demandan información verificable.
8. **Integración vía API:** tableros de riego, defensa civil y reporting corporativo.

### Amenazas (externas, negativas)

1. **Nubosidad persistente:** puede impedir escenas limpias en temporada húmeda.
2. **Competencia global:** plataformas gratuitas (Google Earth Engine, Global Water Watch) y consultoras.
3. **Presupuesto público volátil:** ciclos electorales y recortes pueden frenar contratos.
4. **Escepticismo y mal uso:** leer volumen o causalidad donde sólo hay superficie.
5. **Responsabilidad legal:** decisiones tomadas a partir de una estimación sin disclaimers.
6. **Cambios de licencias o APIs:** Sentinel/CHIRPS/HydroBASINS pueden modificar condiciones.
7. **Ciberseguridad y disponibilidad:** aunque la superficie de ataque es pequeña, la API pública requiere cuidado.
8. **Continuidad del equipo:** hackatón con equipo pequeño y tiempo limitado.

## Estrategias

### FO — Fortalezas + Oportunidades (ofensivas)

- Liderar con **transparencia** en licitaciones y medios: fuente, fecha y advertencias visibles.
- Ofrecer **pilotos gratuitos de 90 días** a municipios y cooperativas, con una cuenca adicional incluida.
- Empaquetar la **API** para tableros de riego y reporting ESG de minería/agro.
- Usar el modo offline como diferenciador en campo y en zonas con conectividad limitada.

### FA — Fortalezas + Amenazas (defensivas)

- Convertir la **incertidumbre explícita** en escudo reputacional y legal.
- Mantener **múltiples fuentes** (CHIRPS, NASA POWER, Open-Meteo) y caché local.
- Documentar límites y términos de uso en UI, API y contratos.
- Priorizar contratos institucionales y convenios que reduzcan la volatilidad política.

### DO — Debilidades + Oportunidades (mejora)

- Ampliar a **4–6 cuencas** y una **serie temporal** con el primer financiamiento o piloto.
- Incorporar **validación de campo** con universidades y organismos de cuenca.
- Agregar **alertas y usuarios/roles** para pasar de prototipo a producto.
- Profesionalizar marca, soporte y documentación para licitaciones.

### DA — Debilidades + Amenazas (supervivencia)

- No prometer volumen, caudal ni predicción; mantener el foco en **superficie visible + lluvia**.
- Evitar depender de una sola cuenca o de una sola fuente de datos.
- Tener **plan de contingencia offline** y capturas de respaldo para la demo.
- Formalizar equipo, propiedad intelectual y licencias antes de escalar.

## Prioridades inmediatas (post-hackatón)

| Prioridad | Acción | Impacto |
|---|---|---|
| 1 | Validar 2 casos con una contraparte técnica | Credibilidad |
| 2 | Sumar 2–4 cuencas y serie temporal | Producto |
| 3 | Alertas por correo y panel multi-cuenca | Retención |
| 4 | Términos, licencia y disclaimers legales | Riesgo |
| 5 | Piloto pago y convenio institucional | Ingresos |
