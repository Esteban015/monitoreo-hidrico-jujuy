# AGENTS — Reglas de desarrollo

Complementa `CLAUDE.md` (reglas del hackatón). Ante conflicto, prevalece `CLAUDE.md` en lo operativo y este archivo en lo relativo a datos.

## 1. Fases pequeñas
- Trabajar por fases de `TASKS.md`, **una tarea por vez**. No empezar la fase N+1 sin cerrar los criterios de aceptación de la N (o marcarla BLOQUEADA con motivo).
- Cada incremento debe dejar la app/scripts en estado ejecutable.
- Pedir aprobación humana al cerrar cada fase.

## 2. Pruebas por incremento
- Cada tarea termina con un **smoke real**: comando ejecutado + salida observada. Nunca declarar PASS sin ejecutar.
- Validadores de datos (`tests/`) se ejecutan cada vez que cambia un archivo en `data/derived/`.
- Reportar estado como: IMPLEMENTADO / PROBADO / PENDIENTE / BLOQUEADO.

## 3. No inventar datos
- Prohibido escribir a mano coordenadas, polígonos, fechas de escena, porcentajes de nubes, superficies, precipitaciones o promedios.
- Todo valor mostrado debe provenir de un archivo en `data/derived/` generado por un script en `scripts/` a partir de un archivo en `data/raw/` o de una descarga documentada.
- Si se necesitan datos de ejemplo para desarrollar UI, van en `data/sample/`, con `"synthetic": true` en el JSON y una etiqueta visible **"DATOS SINTÉTICOS — NO REALES"** en la UI. Nunca se usan en la demo sin esa etiqueta.
- Distinguir siempre en datos y textos:
  - **Medición** (ej. reflectancia Sentinel-2, precipitación estimada por CHIRPS — que es en sí un producto estimado; decirlo).
  - **Estimación/derivado** (ej. superficie de agua por umbral MNDWI).
  - **Interpretación** (ej. "la reducción es coherente con el déficit de lluvia").
- **Superficie de agua ≠ volumen almacenado ≠ caudal.** Nunca convertir ni sugerir equivalencia.

## 4. Trazabilidad
- Cada archivo derivado lleva metadatos obligatorios (ver `DATA_SOURCES.md` §4): fuente, producto, ID de escena/dataset, fecha de adquisición, fecha de descarga, resolución, % nubes, script y parámetros que lo generaron, licencia.
- Cada script registra sus parámetros (umbral, AOI, fechas) en la salida.
- Decisiones técnicas en `DECISIONS.md` con fecha y justificación.

## 5. Idioma
- Interfaz de usuario, textos de ayuda, advertencias y documentación: **español (Argentina)**.
- Identificadores de código y nombres de archivo: inglés o español sin tildes, consistente.
- Unidades con sistema internacional: `km²`, `ha`, `mm`, `%`, fechas ISO `AAAA-MM-DD` en datos y `DD/MM/AAAA` en UI.

## 6. Seguridad y secretos
- Sin claves, tokens ni credenciales en el repo. Usar `.env.local` (ignorado) y documentar variables en `.env.example` sin valores.
- La app final no requiere secretos (datos precalculados). Credenciales solo para scripts de preprocesamiento, si hacen falta.
- No commits, push, PR ni despliegues sin aprobación expresa.

## 7. Simplicidad
- Sin backend, base de datos, microservicios ni IA salvo necesidad demostrada y registrada en `DECISIONS.md`.
- No agregar dependencias sin justificar. Preferir lo nativo.
- No refactorizar fuera del alcance de la tarea.

## 8. Bloque gestionado por Next.js
`next dev` agrega o restaura automáticamente el bloque de abajo cuando detecta un agente de IA (ver `node_modules/next/dist/server/lib/generate-agent-files.js`). Se incluye explícitamente para que no aparezca como cambio inesperado. Indica que antes de escribir código de Next.js se consulte `node_modules/next/dist/docs/`, porque la versión 16.x cambió APIs.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
