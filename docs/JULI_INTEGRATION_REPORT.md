# Informe de integración — PR #3 (Juli) en AquaJuy

Rama de integración: `feature/integration-juli-aquajuy` (worktree aparte). Fecha: 2026-11-23.

## 1. Resumen
- **Qué se integró:** el aporte de Juli (`feature/nueva-rama`, PR #3) sobre `master`, con un merge controlado (`--no-ff --no-commit`) y resolución archivo por archivo.
  - Serie climática mensual estimada.
  - Historial gráfico.
  - Simulador demostrativo (`HistGradientBoostingRegressor`).
  - Pines de agua y modos de mapa.
  - API opcional, Docker/Render y documentación de negocio.
- **Qué se conserva de master sin pérdidas:**
  - Landing y marca, favicon y metadatos OG.
  - `/demo` y `?case=`, el comparador y las métricas científicas.
  - La exportación estática para Vercel, los tests y la CI.
- **Producto:** pasa a llamarse **AquaJuy**. Se conservan el repo, el proyecto Vercel y las URL.

## 2. Protección y SHAs
| Referencia | SHA |
|---|---|
| `origin/master` (base de la integración) | `034ada7` |
| `origin/feature/nueva-rama` (PR #3, sin modificar) | `8605f08` (commits `e6e9fb7`, `9d44a21`, `8605f08`) |
| Ancestro común | `9035229` |

- **PR #3 y ramas originales:** no se tocaron.
- **Comandos no usados:** `reset --hard`, `clean` y force push.
- **Commit de merge:** conserva el historial de Juli.

## 3. Matriz de integración
| Área | Origen | Decisión |
|---|---|---|
| `ClimateSimulator`, `HistoryChart`, `src/lib/model.ts` | Juli | **Adoptado y ajustado:** rótulos, colores de marca, aviso obligatorio y robustez ante NaN/∞. |
| `MapView` (pines, Político/Físico/Agua, «Ver todo Jujuy») | Juli | **Adoptado:** colores de datos de master; la selección en el mapa sincroniza `?case=`. |
| `Dashboard` / `InfoPanel` | Ambos | **Combinado:** encabezado, `?case=` y accesibilidad de master, más los datos de Juli en bloques A/B/C. |
| `datasets.ts` / `types.ts` | Ambos | **Combinado:** rutas absolutas `/data/` (D-28); clima y modelo **opcionales** (D-34). |
| `data/derived/climate`, `data/derived/model` | Juli | Agregados sin modificar. |
| `server/`, `Dockerfile`, `render.yaml` | Juli | **Módulo opcional** (D-35/36). Se corrigió `/demo/`. |
| `package.json` | Ambos | Scripts de master más `start:api`/`dev:api`/`test:py`. `npm start` vuelve a ser estático. |
| `package-lock.json` | — | Se mantiene el de master; el de Juli solo quitaba campos `libc` y no cambiaba dependencias. |
| `docs/evidence/fase5/*.png` | Master | Se conservan las capturas de master; las de Juli eran regeneradas por tests. |
| `DECISIONS.md` | Ambos | Las D-22/23/24 de Juli chocaban con las de master: se renumeraron a **D-35/36/37** y se agregó D-34. |
| `docs/PITCH`, `FODA`, `MODELO_DE_NEGOCIO`, `DEPLOY` | Juli | Agregados con el nombre AquaJuy. |

## 4. Conflictos resueltos
Los 7 conflictos textuales se resolvieron a mano, sin `ours`/`theirs` en bloque:
- **`README.md`:** reescrito como AquaJuy, con la tabla A/B/C, las fuentes, el simulador y la API opcional.
- **`TASKS.md`:** se conserva la Fase 5 de master; la 6.4 de Juli queda como despliegue opcional.
- **`e2e/dashboard.spec.ts`:** quedan los tests de master (título, banner, h1) y los de Juli (pines, mapa físico, simulador).
- **`package.json`:** scripts combinados; `"type": "module"`.
- **`src/app/globals.css`:** tokens y foco de master, más el CSS de pines recoloreado a la marca.
- **`src/lib/datasets.ts`:** rutas absolutas más datasets opcionales con validación.
- **`tests/datasets.test.ts`:** 5 datasets, opcionales, sintético y unidades.

Además había un **conflicto semántico** sin marca de Git: los IDs de decisión repetidos (ver la matriz).

## 5. Compatibilidad científica
- **Observaciones (A):** sin cambios. `water_metrics.json`, `rainfall_metrics.json` y `cases.json` son idénticos a master.
- **Clima (B):** la serie Open-Meteo pasa de «clima real de la cuenca (ERA5-Land)» a **«clima estimado» en un punto** (centro del AOI).
  - La mención ERA5-Land no se muestra: el script no fuerza `models=era5_land`. El campo del JSON no se reescribió; lo filtra `climateSourceLabel()`.
  - Open-Meteo da 1,4–3× la lluvia de CHIRPS en los meses analizados (punto contra media de cuenca). Se explica en la UI y en el README.
- **Simulador (C):** rotulado «Simulador climático — demostración experimental», con el aviso fijo: «Modelo demostrativo basado en datos sintéticos. No constituye un pronóstico validado ni reemplaza mediciones de campo.».
  - El modelo se descarta si `synthetic !== true`.
- **Resultado del modelo** (de `water_model.json`; **R² y MAE sobre datos sintéticos**, no es validación real):

| Caso | Muestras | R² sint. | MAE sint. | α lluvia | β temp (fijo) | Grilla | Calibración |
|---|---|---|---|---|---|---|---|
| Laguna de los Pozuelos | 4000 | 0,9988 | 0,55 km² | 18,7 % / 100 mm | 5 % / +5 °C | 34,0–95,4 km² | 81,45 y 37,55 km² (exacta a las 2 observaciones) |
| Dique Las Maderas | 4000 | 0,9978 | 0,07 km² | 7,9 % / 100 mm | 5 % / +5 °C | 6,2–12,7 km² | 8,72 y 7,15 km² |

- **Qué no se agregó:** evaporación, SMN, pronósticos ni alertas, porque no hay código ni datos que los respalden.

## 6. Arquitectura y Vercel
- **Publicación:** la oficial sigue siendo la exportación estática (`output: "export"`). El build genera `/`, `/demo` y las imágenes OG.
- **Datos:** `publish-data.mjs` publica también `climate/` y `model/` en `/data/`, con sha256.
- **Sin servicios externos:** la demo no llama a `/api` ni a servicios externos al navegar; lo verifica E2E. El mapa «Físico» (OpenTopoMap) es opcional y avisa si no hay internet.
- **API opcional** (`npm run start:api`): se corrigió que `/demo` y `/demo/` daban 404 porque `out/demo/` es una carpeta de segmentos RSC. Verificado:
  - `/`, `/demo`, `/demo/` y `/demo?case=` responden 200;
  - `/api/health` y `/api/casos` responden 200;
  - path traversal (`/../package.json`, `%2e%2e`) responde 404.

## 7. UX
- **Bloques A/B/C:** Observaciones, Clima estimado y Escenarios simulados, con letra, título y color propios, en ese orden (lo verifica E2E).
- **Entradas del simulador:**
  - aceptan coma decimal y `−`;
  - el texto inválido muestra un mensaje y conserva el valor anterior;
  - los valores fuera de rango se recortan con aviso;
  - nunca se muestra NaN ni ∞;
  - el cambio de caso reinicia el simulador.
- **Bug corregido:** al pulsar «Restablecer» con un aviso visible, el blur del campo quitaba el aviso, el layout se movía y el clic no llegaba al botón (caso Pozuelos, cuya lluvia base es 0,5 mm). Ahora el blur no reaplica si el texto no cambió.

## 8. Marca AquaJuy
- **Dónde cambió el nombre:** `siteMeta`, el título de layout y demo, Logo y SiteHeader, la imagen OG/Twitter (regenerada con `npm run brand:assets`), README, docs y `BRAND_GUIDELINES` v0.2.
- **Qué no cambió:** isotipo, favicon, paleta, nombre del repo, proyecto Vercel y URL canónica (`monitoreo-hidrico-jujuy.vercel.app`).
- **Archivos restaurados:** `icon.svg` y el manifest de quicklooks, que solo diferían en finales de línea.

## 9. QA (ejecutado en esta rama)
| Prueba | Comando | Resultado |
|---|---|---|
| Lint | `npm run lint` | OK |
| Tipos | `npm run typecheck` | OK |
| Build | `npm run build` | OK (estático, 9 páginas) |
| Unitarias TS | `npm test` | 33/33 OK (incluida la exportación estática) |
| Python | `unittest discover -s tests/python` (venv del repo principal) | 43/43 OK |
| E2E completo | `npx playwright test` (workers 1, retries 0) | 50/50 OK en 77 s |
| E2E smoke | `npm run test:e2e:smoke` | 17/17 OK |

- **Viewports cubiertos:** 1440×900, 768×1024, 390×844, 375×667 y 360×800.
- **Pruebas nuevas:**
  - `e2e/simulator.spec.ts`: bloques A/B/C, entradas, reset, cambio de caso, sin `/api` y sin modelo.
  - Marca AquaJuy en `e2e/assets.spec.ts`.
  - Unitarias de robustez del modelo y del rótulo climático.
- **Modelo no reentrenado:** scikit-learn no está instalado en el venv local, y se usó la grilla publicada por Juli.

## 10. Riesgos y pendientes
- **Reproducibilidad del clima:** el período termina en «hoy − 2 días» con caché local no versionada. Regenerar cambia la serie.
- **ERA5-Land sin verificar:** si se quiere afirmar, agregar `models=era5_land` al script y regenerar.
- **Modelo con 2 observaciones por caso:** sirve como análisis de sensibilidad, no como predicción. No usar sus valores en el pitch como resultados.
- **API y Docker:** no desplegados; no forman parte de la publicación oficial.
- **Licencia de OpenTopoMap:** el modo «Físico» depende de un servicio externo con su propia licencia (CC-BY-SA).
