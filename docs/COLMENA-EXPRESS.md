# Colmena Express — VS Code + Claude Code (Personal)

VS Code como editor + Claude Code con suscripción personal. Iniciar en terminal integrada con `claude` o extensión oficial. Verificar que la sesión activa es tu cuenta PERSONAL y no la laboral.

## Qué contiene y qué no
Este ZIP es una **configuración de orquestación**, no una aplicación. No incluye Next.js, `package.json`, dependencias ni credenciales. No genera procesos paralelos por sí solo.

**Filosofía:** Planner → Builder → SMOKE EXPRESS (integrado) → Demo. Se omitió el agente QA separado y se evitan E2E exhaustivos por defecto, pero **no** se elimina la verificación mínima ni los controles críticos de seguridad.

**Uso sobre un proyecto existente:** copiá los archivos a la raíz del repo. Si existen archivos de instrucciones, **fusioná** reglas en lugar de sobrescribir. No copies tres kits al mismo repo a la vez: elegí el modo activo o mantené las configuraciones en directorios distintos y controlá qué agente se está usando.

**Antes de empezar:** verificá reglas del evento, sesión personal correcta, Git remoto correcto, disponibilidad del proveedor/modelo y entorno local. Si falla el subagente, usá el prompt de contingencia de `docs/FALLBACK-SIN-SUBAGENTES.md`.

## Inicio
1. Abrí la carpeta del repositorio en VS Code.
2. Copiá `CLAUDE.md`, `.claude/` y `docs/` al repo (fusioná instrucciones preexistentes).
3. Abrí terminal Git Bash/PowerShell y ejecutá `claude` o abrí la extensión de Claude Code.
4. Comprobá tu cuenta personal, sin exponer credenciales.
5. Invocá `/hackathon-kickoff` si la skill aparece, o pegá `docs/PROMPT-INICIO.md`.
6. Al fallar los subagentes, usar `docs/FALLBACK-SIN-SUBAGENTES.md`.

## Documentación
- https://code.claude.com/docs/en/sub-agents
- https://code.claude.com/docs/en/skills
