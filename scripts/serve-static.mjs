// Servidor estático local para la exportación de Next.js (out/). Sin dependencias ni descargas en tiempo de ejecución
// (reemplaza `npx serve`, que necesitaba internet la primera vez). Uso: node scripts/serve-static.mjs [puerto] [host]
import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)), "out");
const PORT = Number(process.argv[2] ?? process.env.PORT ?? 3000);
const HOST = process.argv[3] ?? "127.0.0.1";
const TYPES = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8", ".geojson": "application/geo+json", ".png": "image/png", ".svg": "image/svg+xml",
  ".ico": "image/x-icon", ".txt": "text/plain; charset=utf-8", ".woff2": "font/woff2",
};

if (!existsSync(join(ROOT, "index.html"))) {
  console.error("[serve-static] No existe out/index.html. Ejecutar antes: npm run build");
  process.exit(1);
}

createServer((req, res) => {
  let path;
  try {
    path = decodeURIComponent(new URL(req.url ?? "/", "http://x").pathname);
  } catch {
    res.writeHead(400).end("Solicitud inválida");
    return;
  }
  let file = normalize(join(ROOT, path));
  if (!file.startsWith(ROOT)) {
    res.writeHead(403).end("Prohibido");
    return;
  }
  // Next export genera /demo.html y además una carpeta /demo/ (payloads RSC): la página .html tiene prioridad.
  const isDir = existsSync(file) && statSync(file).isDirectory();
  if (isDir && existsSync(`${file.replace(/[\\/]$/, "")}.html`)) file = `${file.replace(/[\\/]$/, "")}.html`;
  else if (isDir) file = join(file, "index.html");
  else if (!existsSync(file) && existsSync(`${file}.html`)) file = `${file}.html`;
  if (!existsSync(file)) {
    res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
    createReadStream(join(ROOT, "404.html")).pipe(res);
    return;
  }
  res.writeHead(200, { "Content-Type": TYPES[extname(file).toLowerCase()] ?? "application/octet-stream", "Cache-Control": "no-cache" });
  createReadStream(file).pipe(res);
}).listen(PORT, HOST, () => console.log(`[serve-static] Sirviendo out/ en http://${HOST}:${PORT}`));
