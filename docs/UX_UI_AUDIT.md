# Auditoría UX/UI, accesibilidad y rendimiento — iteración de brand polish

Rama `feature/ux-ui-brand-polish`, creada desde `origin/master` `7558faf` (la landing de producción, idéntica en contenido al commit `bd31733`). Fecha: 2026-11-22.
Evidencias en `docs/evidence/ux-ui-polish/`: capturas `antes-*` y `despues-*`, íconos, imagen Open Graph y `lighthouse-resumen.md`.

## Estado inicial (auditado antes de cambiar código)
- **Producción:** `/` (landing) y `/demo` responden 200; Vercel redirige `/demo/` → `/demo` (308).
- **Favicon:** el `favicon.ico` genérico de Next.js (scaffold); no había favicon de marca, Apple Touch Icon ni imagen Open Graph.
- **Rutas relativas:** la demo usaba enlaces `./` y datos en `data/...`. Desde `/demo/` (servidor sin redirección, como el local) resolvían dentro de `/demo/`.
- **Navegación móvil:** las secciones del encabezado estaban ocultas en móvil, sin alternativa.
- **Lighthouse (antes):** contraste insuficiente en la landing; LCP móvil de 11,9 s por dos PNG satelitales de unos 740 KiB cada uno.

## Problemas, prioridad y solución
| # | Problema | Prioridad | Evidencia | Solución implementada |
|---|---|---|---|---|
| 1 | Favicon genérico de Next.js; sin Apple Touch Icon ni OG | Alta | `src/app/favicon.ico` del scaffold (48/32/16) | Isotipo simplificado para 16/32 px (`icon.svg`, `favicon.ico` 16/32/48), `apple-icon.png` 180, `icon-512.png`, OG/Twitter 1200×630 generados por script (D-27) |
| 2 | Enlaces `./` y datos `data/...` relativos: fallan en `/demo/` | Alta | Análisis de rutas; servidor local | Rutas absolutas `/`, `/demo`, `/#seccion`, `/demo?case=…` y datos en `/data/...` (D-28) |
| 3 | LCP móvil de la landing 11,9 s | Alta | Lighthouse (antes): 2 PNG de 760 y 708 KiB | WebP de 640 px de ancho de los mismos quicklooks (60–78 KB), con `width`/`height` reales: sin recorte ni deformación, CLS 0 |
| 4 | Contraste insuficiente (`text-brand-ink/60`, 3,95:1) | Alta | Lighthouse `color-contrast` | Token `brand-muted` `#55606B` (6,4:1) en rótulos y texto secundario |
| 5 | Secciones inaccesibles en móvil | Alta | Encabezado `hidden md:flex` | Menú móvil accesible (D-30) más navegación por secciones en el pie como respaldo sin JS |
| 6 | Los CTA de casos no abrían el caso | Media | Todos los CTA a `/demo` | `/demo?case=<id>` con validación; parámetro inválido → caso predeterminado; la URL se actualiza al cambiar de caso (D-29) |
| 7 | Hero sin comparación explícita ni métrica destacada | Media | Captura `antes-landing-*-hero` | ANTES → DESPUÉS con fechas, métrica principal grande, rango separado y aclaración «no es volumen ni caudal» |
| 8 | Tarjetas de casos con jerarquía plana | Media | Captura `antes-landing-*-casos` | Caso → cambio → barras proporcionales Antes/Después → rango → advertencia → CTA al caso (D-31) |
| 9 | «Cómo funciona» solo textual | Media | Captura `antes-landing-*-como-funciona` | Íconos SVG más miniaturas **reales** de la demo capturadas del build (D-33) |
| 10 | `/demo` perdía `og:image` y la tarjeta grande de Twitter | Media | HTML exportado: `openGraph` de la página reemplazaba al del layout | Base compartida `socialMeta()` (D-32): una etiqueta de cada tipo, verificado en `/` y `/demo` |
| 11 | Foco poco visible sobre fondos oscuros | Media | Revisión manual | `:focus-visible` de dos tonos (contorno petróleo + halo blanco; invertido en fondos oscuros) |
| 12 | Sin `prefers-reduced-motion` | Baja | `scroll-behavior: smooth` global | Desplazamiento suave solo con `no-preference`; animaciones y transiciones anuladas con `reduce` |
| 13 | Botón «Ver demo» partido en dos líneas a 390 px | Baja | Captura intermedia | `whitespace-nowrap` y padding menor en móvil |
| 14 | Pruebas de evidencias pisaban `docs/evidence/fase5/` | Baja | Ocurrió en la fase de branding | `EVIDENCE_DIR`, por defecto `test-results/evidence` |
| 15 | `<dl>` inválido en las tarjetas (regresión de esta iteración) | Media | Lighthouse `definition-list` y `dlitem` | Lista `<ul>` con rótulo accesible; accesibilidad 100 |

## Lighthouse 12.8.2 (laboratorio)
Build estático local, una corrida por combinación; hay variación entre corridas.

| Página / perfil | Perf. | Accesib. | Buenas prác. | SEO | LCP | CLS | TBT | Peso |
|---|---|---|---|---|---|---|---|---|
| Landing móvil — antes | 71 | 96 | 100 | 100 | 11,9 s | 0 | 220 ms | 2009 KiB |
| Landing móvil — después | **82** | **100** | 100 | 100 | **4,8 s** | 0 | 80 ms | **703 KiB** |
| Landing escritorio — antes | 90 | 96 | 100 | 100 | 2,1 s | 0 | 30 ms | 2009 KiB |
| Landing escritorio — después | **99** | **100** | 100 | 100 | **1,0 s** | 0 | 10 ms | 799 KiB |
| Demo móvil — antes | 69 | 100 | 100 | 100 | 6,1 s | 0,012 | 380 ms | 839 KiB |
| Demo móvil — después | 70 | 100 | 100 | 100 | 6,3 s | 0,029 | 330 ms | 834 KiB |
| Demo escritorio — antes | 98 | 100 | 100 | 100 | 1,2 s | 0,002 | 30 ms | 839 KiB |
| Demo escritorio — después | 97 | 100 | 100 | 100 | 1,2 s | 0,005 | 0 ms | 834 KiB |

- **INP:** no se midió; requiere interacción real de campo y Lighthouse de laboratorio no lo reporta.
- **Demo en móvil:** sin mejora. El LCP pasó a ser la atribución de Leaflet, que aparece cuando termina de cargar el mapa (índice de velocidad 1,5 s). Mejorarlo exige reestructurar la carga del mapa: **pendiente**, fuera de alcance.

## Verificaciones manuales y automáticas
- **Jerarquía:** un `h1` por página; `h2` por sección con `aria-labelledby`; `h3` en tarjetas y pasos.
- **Teclado:** enlace «Saltar al contenido»; menú operable con Enter, Tab y Escape (el foco vuelve al botón); foco visible comprobado.
- **Áreas táctiles:** botones y enlaces principales de 44 px o más (`min-h-11`/`min-h-12`); botón de menú de 44×44.
- **Zoom:** a 200 % (viewport equivalente 720×450) no hay scroll horizontal en `/` ni en `/demo`.
- **Sin JavaScript:** el CTA «Ver demo» y la navegación del pie siguen disponibles.
- **Textos alternativos:** describen imagen, fecha y método; las imágenes decorativas tienen `aria-hidden`.

## Riesgos
- **Rutas absolutas:** asumen que el sitio se sirve en la raíz del dominio (Vercel). Un despliegue en una subruta requeriría `basePath`.
- **Miniaturas de «Cómo funciona»:** son capturas de la interfaz. Si cambia la demo, hay que regenerarlas (`npm run brand:steps`, con un build previo).
- **Enlaces internos:** se mantienen como `<a>` (D-26), con una excepción documentada a la regla `no-html-link-for-pages`.
- **Vercel:** no se probó en Vercel (sin despliegue en esta iteración). La exportación estática y las rutas de íconos se verificaron en el build local.
