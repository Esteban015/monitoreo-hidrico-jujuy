# Colmena Express — VS Code + Claude Code (Personal)

# Colmena Express — reglas del hackatón

## Objetivo
Entregar una demo que funcione dentro de una jornada corta. No construir un producto completo. No asumir track, APIs, tiempo exacto ni reglas hasta recibir el enunciado oficial.

## Flujo ultracorto
1. ORQUESTADOR: leer track, reglas, tiempo restante y archivos. Elegir **un único recorrido demostrable**.
2. PLANNER (solo lectura): máximo **3 MUST**, 1-2 SHOULD para después, 3 criterios de aceptación verificables; plan en <= 12 líneas.
3. BUILDER: implementar un corte vertical utilizable de punta a punta; una tarea por vez; evitar refactor y dependencias superfluas.
4. **SMOKE EXPRESS (obligatorio, no es un agente aparte)**: comprobar inicio de app, **un flujo feliz real** y **un error/entrada inválida**. Si hay scripts de typecheck/build/test rápidos, ejecutar el más pertinente y registrar comando/salida reales. Presupuesto objetivo: 3–5 minutos, adaptable al tiempo restante. Nunca declarar PASS si no se ejecutó.
5. DEMO: README mínimo, 30 segundos de pitch, 2 minutos de recorrido, URL de despliegue solo si existe y fue abierta.

## Ahorro de tiempo/tokens
- No hacer investigación exhaustiva si ya hay suficientes datos para implementar.
- No crear QA agent, suites E2E masivas, cobertura, benchmarks ni matrices extensas por defecto.
- Si restan menos de 45 minutos: congelar alcance, arreglar bloqueantes y preparar demo.
- Paralelizar solo tareas independientes sin escritura simultánea del mismo archivo; preferir secuencia cuando la delegación consume demasiados créditos.
- Si falla la invocación de subagentes por plan/créditos/modelo, el agente principal ejecuta los roles **en la misma conversación**, sin reintentos automáticos.

## Seguridad y entrega
- No hacer commits, push, despliegues, compras ni borrar archivos sin aprobación expresa.
- No publicar claves, tokens, información privada ni credenciales; usar `.env.example` sin valores reales.
- No inventar métricas, resultados, APIs operativas ni criterios cumplidos.
- Mantener una opción demostrable con datos sintéticos si una API externa falla y dejarlo claro.
- Si hay riesgos de salud, dinero o seguridad física, conservar verificaciones relevantes incluso en modo Express.
- Separar: IMPLEMENTADO / PROBADO / PENDIENTE / BLOQUEADO.

## Agentes Claude Code
Usar `planner-express`, `builder-express`, `demo-express` disponibles en `.claude/agents/`. Subagentes solo si ayudan; si cuestan demasiado, ejecutar el flujo en el agente principal.
