# Landing — especificación (v0.1)

## Rutas
| Ruta | Contenido | Archivo |
|---|---|---|
| `/` | Landing de presentación | `src/app/page.tsx` |
| `/demo` | Dashboard existente, **sin cambios de lógica**; solo se agregó el encabezado de marca con enlace al inicio | `src/app/demo/page.tsx` |

- **Navegación:** encabezado fijo con anclas (Problema, Cómo funciona, Casos testigo, Metodología) y el botón «Ver demo». La demo tiene «Inicio» y el logo para volver.
- **Enlaces entre páginas:** son `<a>` comunes con rutas relativas (`demo`, `./`), con navegación completa. Se descartó `next/link` porque, en la exportación estática de Next 16.4, la precarga pedía `/demo/__next.demo.__PAGE__.txt` mientras el archivo se genera como `demo/__next.demo/__PAGE__.txt`, lo que producía un 404 en consola (ver D-26).

## Secciones
1. **Hero:**
   - Título: «Ver cómo cambia el agua de Jujuy, con datos que se pueden verificar.»
   - Bajada y CTA principal «Explorar la demo»; CTA secundario «Ver metodología y límites».
   - Visual: los dos quicklooks Sentinel-2 reales de Pozuelos (Antes/Después), con fechas y el cambio con su rango leídos de los datos.
2. **Problema** (`#problema`): datos dispersos, lecturas ambiguas, cifras sin contexto.
3. **Solución:** superficie visible en dos fechas reales, precipitación como contexto y trazabilidad.
4. **Cómo funciona** (`#como-funciona`): elegí un caso → compará dos fechas → sumá el contexto de lluvia → leé las advertencias.
5. **Beneficios:** datos reales, trazabilidad, comparación temporal, visualización clara, uso sin internet y apoyo territorial.
6. **Casos testigo** (`#casos`): por caso, superficie A y B, cambio MNDWI, rango entre métodos, meses de lluvia y una advertencia elegida por regla.
   - Regla: si el rango supera 15 puntos, la advertencia de agua somera; si no, la de la cuenca.
   - Enlace «Ver en la demo» en cada tarjeta.
7. **Transparencia metodológica** (`#metodologia`): «Sí hace» / «No hace», más las advertencias fijas de `src/lib/notices.ts`.
8. **CTA final:** «Abrir la demo» y «Ver código y fuentes» (GitHub).
9. **Pie:** atribuciones de Copernicus, CHIRPS, HydroBASINS, OSM e IGN.

## Datos en la landing
- **Origen:** las cifras de los casos y del hero **no están escritas a mano**. `src/lib/landingData.ts` lee `data/derived/*.json` en el build (componente de servidor, exportación estática) y usa las mismas funciones del dashboard (`getCaseView`, `uncertaintyRange`, `fmt*`). No hay cálculos nuevos.
- **Imágenes del hero:** desde v0.2, WebP optimizados de los mismos quicklooks reales en `public/landing/quicklooks/` (ver «Cambios v0.2»). Los PNG originales siguen en `/data/qa/quicklooks/` para la demo.
- **Si cambian los datos:** al reprocesar y volver a compilar, la landing se actualiza sola.

## Criterios verificados
- Sin desborde horizontal ni errores de consola en escritorio (1440) y móvil (390).
- Valores de la landing iguales a los del dashboard y a `data/derived` (prueba `e2e/landing.spec.ts`).
- El CTA lleva a `/demo` con datos y mapa cargados, y «Inicio» vuelve a `/`.
- Sin pedidos a dominios externos al cargar (el enlace a GitHub solo se sigue con un clic).

## Cambios v0.2 (iteración UX/UI, D-27 a D-33)
- **Rutas absolutas:** `/`, `/demo`, `/#problema`, `/#como-funciona`, `/#casos`, `/#metodologia`, `/demo?case=<id>`. Los datos se piden desde `/data/...`. Funcionan desde `/demo` y desde `/demo/`.
- **Hero:** ANTES → DESPUÉS de Laguna de los Pozuelos con fechas, WebP sin recorte, métrica principal destacada, rango separado y la aclaración «Cambio estimado de superficie de agua visible entre las dos fechas. No es volumen ni caudal, ni una tendencia.» CTA principal «Explorar la demo», secundario «Metodología y límites», y enlace «Ver este caso en la demo».
- **Encabezado:** en escritorio, secciones y «Ver demo». En móvil, «Ver demo» siempre visible más un menú accesible (`MobileMenu`). El pie repite la navegación como respaldo sin JS.
- **Tarjetas de casos:** caso → cambio → barras Antes/Después proporcionales al valor principal → fechas → rango → advertencia → «Explorar <caso> en la demo» (`/demo?case=<id>`).
- **Cómo funciona:** 4 pasos con ícono SVG y miniatura real de la demo (`public/landing/steps/`, `npm run brand:steps`). Cuatro columnas en escritorio, dos en tablet, una en móvil.
- **Demo:** lee `?case=` después de cargar los datos (sin desajuste de hidratación), valida el id y, si es inválido, usa el primer caso. Al cambiar de caso actualiza la URL con `replaceState`.
- **Metadatos:** `metadataBase` = https://monitoreo-hidrico-jujuy.vercel.app; canónica por página; Open Graph y Twitter (`summary_large_image`) desde `src/lib/siteMeta.ts`.
