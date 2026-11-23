// Ejecuta la QA Python con el intérprete disponible:
// 1) scripts/.venv (si existe), 2) python/python3 del sistema.
// Evita que `npm run verify` falle en una máquina sin venv.
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";

const candidates =
  process.platform === "win32"
    ? ["scripts/.venv/Scripts/python.exe", "python", "py"]
    : ["scripts/.venv/bin/python", "python3", "python"];

const python = candidates.find((c) => c.includes("/") || c.includes("\\") ? existsSync(c) : true);
const result = spawnSync(python, ["-m", "unittest", "discover", "-s", "tests/python"], {
  stdio: "inherit",
  shell: process.platform === "win32" && !python.includes("/") && !python.includes("\\"),
});
process.exit(result.status ?? 1);
