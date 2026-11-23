# Despliegue — front + back

## Estado actual (2026-11-22)

| Componente | Estado | URL |
|---|---|---|
| Frontend Next.js (export estático) | **Desplegado local** | <http://localhost:3000> |
| Backend Node de solo lectura | **Desplegado local** | <http://localhost:3000/api/health> |
| Build de producción | OK | `out/` |
| Docker | Configurado, no publicado | `Dockerfile` |
| URL pública | Pendiente de credenciales del proveedor | — |

El proceso `npm start` quedó corriendo en segundo plano. Para reiniciarlo:

```bash
npm run build
npm start
```

## 1. Local

```bash
npm ci
npm run build     # publica data/ y compila out/
npm start         # node server/index.js
```

Verificación:

```bash
curl http://localhost:3000/api/health
curl http://localhost:3000/api/casos
curl -I http://localhost:3000/
```

Resultado esperado de `/api/health`: `"status": "ok"` y los 3 datasets en `ok: true`.

## 2. Docker

```bash
docker build -t cuencas-jujuy .
docker run --rm -p 3000:3000 cuencas-jujuy
```

La imagen final sólo contiene `out/`, `server/` y `data/derived/`. No incluye `node_modules`, datos crudos ni scripts.

## 3. Render

1. Subir el repo a GitHub (requiere aprobación).
2. En Render: **New → Blueprint** y seleccionar el repo.
3. `render.yaml` crea el servicio Docker con health check `/api/health`.
4. No hay variables secretas obligatorias. Opcional: `LOG_REQUESTS=0`.

## 4. Railway

1. **New Project → Deploy from GitHub**.
2. Railway detecta el `Dockerfile`.
3. Expone `PORT` automáticamente; el servidor escucha en `0.0.0.0`.

## 5. Hosting estático (solo frontend)

```bash
npm run build
npm run start:static   # o subir out/ a cualquier CDN
```

En este modo no existe `/api/*`; el frontend funciona igual porque lee `data/*.json` publicados.

## 6. Variables

| Variable | Default | Notas |
|---|---|---|
| `PORT` | `3000` | Render/Railway lo inyectan |
| `HOST` | `0.0.0.0` | No cambiar en contenedores |
| `STATIC_DIR` | `out` | Ruta al build |
| `DATA_DIR` | `data/derived` | Datos de la API |
| `LOG_REQUESTS` | `1` | `0` en producción para menos ruido |

## 7. Troubleshooting

| Síntoma | Causa | Solución |
|---|---|---|
| `No existe out/index.html` | Falta build | `npm run build` |
| `/api/health` devuelve 503 | Falta un JSON en `data/derived/` | Restaurar el dataset; revisar `datasets` en la respuesta |
| Mapa sin fondo | Sin Internet y fallback no cargó | Verificar `public/data/basemap/*.geojson`; el resto de métricas funciona |
| Puerto ocupado | Otro proceso en 3000 | `PORT=3001 npm start` |
| Datos viejos | `public/data` desactualizado | `npm run data:publish` y rebuild |

## 8. Checklist de demo

- [x] Build de producción
- [x] Frontend servido
- [x] API health OK
- [x] Casos y comparaciones por API
- [x] 404 y 405 controlados
- [x] Datos locales (sin APIs externas)
- [x] Tests unitarios, Python y E2E
- [ ] URL pública (requiere credenciales)
