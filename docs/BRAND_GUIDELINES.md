# Monitoreo Hídrico Jujuy — Lineamientos de marca (v0.1)

> Identidad inicial para el prototipo. Implementada en `src/app/globals.css` (tokens), `src/components/brand/Logo.tsx` y la landing (`src/app/page.tsx`).

## 1. Nombre
- **Nombre de marca:** Monitoreo Hídrico Jujuy. Se escribe completo, con tilde en "Hídrico" y sin abreviar en títulos.
- **Descriptor:** «Agua superficial con datos trazables».
- **Uso en la interfaz:** el nombre va en el logo. La demo se titula «Demo — Monitoreo Hídrico Jujuy».
- **Nombre técnico del repositorio:** `monitoreo-hidrico-jujuy`. El nombre heredado «Monitoreo de Cuencas y Fuentes de Agua Natural» queda solo en la documentación técnica (`docs/PROJECT_SPEC.md`).

## 2. Posicionamiento
Herramienta de **monitoreo y apoyo a decisiones** sobre agua superficial de Jujuy, basada en datos satelitales reales y trazables, comprensible para personas no especialistas y explícita sobre sus límites.

**Es:** un visor comparativo de dos observaciones reales, con contexto de lluvia y advertencias metodológicas.

**No es:**
- un sistema de predicción;
- una medición de caudal o de volumen;
- una herramienta oficial de pronóstico;
- un reemplazo de estudios hidrológicos.

## 3. Propuesta de valor
> «Ver cómo cambia el agua de Jujuy, con datos que se pueden verificar.»

Imágenes Sentinel-2 reales, precipitación mensual en la cuenca y un rango de incertidumbre en una sola vista, con fuentes y fechas a un clic.

## 4. Público objetivo
| Público | Qué necesita | Mensaje |
|---|---|---|
| Equipos técnicos municipales y provinciales (ambiente, recursos hídricos, producción) | Lectura rápida y trazable para informes y reuniones | Cada número indica su fuente, su fecha y su margen. |
| Productores y regantes (Valles) | Saber cómo está el embalse respecto de otra fecha | Comparación clara de dos fechas reales, sin tecnicismos. |
| Investigación, periodismo y organizaciones | Datos verificables y límites explícitos | Metodología abierta y código público. |
| Jurados y evaluadores | Valor demostrable en minutos | Datos reales, funcionamiento sin internet y honestidad metodológica. |

## 5. Mensajes clave
1. **Datos reales y trazables:** escenas Sentinel-2 identificables, CHIRPS y HydroBASINS.
2. **Comparación honesta:** dos fechas reales, sin interpolar ni simular tendencias.
3. **Contexto, no causalidad:** la lluvia acompaña al dato, pero no lo explica por sí sola.
4. **Incertidumbre visible:** valor principal más rango entre métodos.
5. **Funciona sin internet:** datos y mapa base viajan con la aplicación.

**Frases a evitar:** «medimos el caudal», «predice la sequía», «volumen del embalse», «dato oficial», «garantiza», «exacto», «sequía severa» y cualquier etiqueta de emergencia sin validación.

## 6. Paleta
| Token | Hex | Uso | Contraste sobre `#F5F7F8` |
|---|---|---|---|
| `brand-primary` | `#0F4C5C` | Marca, encabezados, botones, fondos oscuros | 8,9 (texto OK) |
| `brand-secondary` | `#2C7DA0` | Rellenos, gráficos, detalles | 4,3 (**no** para texto chico) |
| `brand-secondary-ink` | `#24708F` | Variante para enlaces, rótulos y texto | 5,2 |
| `brand-support` | `#61A5A2` | Acentos decorativos (bordes, ondas del isotipo) | 2,6 (nunca texto) |
| `brand-bg` | `#F5F7F8` | Fondo general | — |
| `brand-ink` | `#1F2D3A` | Texto principal | 13,1 |
| `brand-sand` / `brand-sand-soft` | `#D9C7A3` / `#F3ECE0` | Acento territorial, secciones cálidas | decorativo |
| `brand-warning` | `#D98E04` | Bordes e íconos de advertencia | 2,5 (nunca texto) |
| `brand-warning-ink` | `#A16207` | Texto de advertencia | 4,6 |

Ajustes respecto de la paleta sugerida: se agregaron `secondary-ink` y `warning-ink` para cumplir WCAG AA (4,5:1) en texto, y `sand-soft` como superficie cálida legible. Los colores originales se mantienen para usos no textuales.

**Colores de datos del mapa** (sin cambios, D-21): azul `#1D4ED8` para la fecha A, ámbar `#D97706` para la fecha B y violeta `#7C3AED` para la cuenca. No se usan rojo ni verde de semáforo.

## 7. Estilo visual
- **Personalidad:** sobria, técnica, territorial y moderna.
- **Imágenes:** solo imágenes reales del proyecto (quicklooks Sentinel-2), rotuladas con fecha y método. Sin fotos genéricas ni renders.
- **Isotipo:** gota de agua en arena sobre curvas de nivel (blanco y verde agua), dentro de un cuadrado redondeado `brand-primary`. Versión invertida para fondos oscuros. SVG inline, sin archivos externos.
- **Tipografía:** fuente del sistema (`system-ui`, Segoe UI, Roboto), para no depender de fuentes remotas ni de internet. Títulos en semibold con interletrado ajustado.
- **Componentes:** tarjetas blancas con borde `brand-primary/10` y radio de 12–16 px; botones de al menos 40–44 px de alto; advertencias con borde izquierdo `brand-warning` sobre `brand-sand-soft`.

## 8. Tono de comunicación
- Claro y profesional, en español rioplatense (voseo: «Elegí», «Compará»).
- Técnico pero entendible: cada término técnico va acompañado de su explicación.
- Convincente sin exagerar: ningún número sin su fuente y su límite.
- Las limitaciones se presentan como parte del valor (transparencia), no como letra chica.

## 9. Recursos de identidad digital (v0.2, iteración UX/UI)
Generados por `npm run brand:assets` (`scripts/brand/generate-brand-assets.mjs`), sin dependencias nuevas: rasteriza con el Chrome instalado vía Playwright.

| Recurso | Archivo | Detalle |
|---|---|---|
| Favicon vectorial | `src/app/icon.svg` | Isotipo **simplificado**: gota arena + una onda verde agua sobre petróleo, trazos más gruesos para 16/32 px |
| Favicon ICO | `src/app/favicon.ico` | 16, 32 y 48 px (PNG embebidos), misma versión simplificada |
| Apple Touch Icon | `src/app/apple-icon.png` | 180×180, isotipo completo a sangre sobre petróleo |
| Ícono de reutilización | `public/brand/icon-512.png` | 512×512, isotipo completo |
| Open Graph / Twitter | `src/app/opengraph-image.png`, `twitter-image.png` (+ `.alt.txt`) | 1200×630: isotipo, nombre, propuesta de valor, fuentes y los dos quicklooks reales de Pozuelos con sus fechas. **Sin cifras**, para que la imagen no quede desactualizada. |

- **Texto secundario:** se agrega el token `brand-muted` `#55606B` (6,4:1 sobre blanco), que reemplaza el uso de `brand-ink/60` (3,95:1, no cumplía AA).
- **Foco visible:** contorno petróleo con halo blanco; sobre fondos petróleo, contorno blanco.
- **Colores de datos** en la landing: `data-a` `#1D4ED8` (Antes) y `data-b` `#D97706` (Después), los mismos del mapa de la demo.
