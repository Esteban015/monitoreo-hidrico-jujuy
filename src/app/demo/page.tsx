/* eslint-disable @next/next/no-html-link-for-pages -- D-26/D-28: navegación completa entre páginas estáticas (next/link generaba 404 de precarga con la exportación estática de Next 16.4). */
import type { Metadata } from "next";
import Dashboard from "@/components/Dashboard";
import { Logo } from "@/components/brand/Logo";
import { socialMeta } from "@/lib/siteMeta";

const DESCRIPTION =
  "Compará la superficie de agua visible (Sentinel-2) y la precipitación mensual (CHIRPS) en Laguna de los Pozuelos y Dique Las Maderas.";

export const metadata: Metadata = {
  title: "Demo",
  description: DESCRIPTION,
  alternates: { canonical: "/demo" },
  ...socialMeta({ title: "Demo — Monitoreo Hídrico Jujuy", description: DESCRIPTION, path: "/demo" }),
};

// Dashboard. Sin cambios de lógica científica. Enlaces absolutos (D-28): funcionan desde /demo y /demo/.
export default function DemoPage() {
  return (
    <div className="flex min-h-screen flex-col md:h-screen">
      <header className="flex flex-wrap items-center justify-between gap-2 bg-brand-primary px-4 py-2 text-white">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <a href="/" aria-label="Monitoreo Hídrico Jujuy, volver al inicio" className="inline-flex min-h-11 items-center">
            <Logo inverted compact />
          </a>
          <h1 className="text-sm text-white/85">Superficie de agua visible (Sentinel-2) y precipitación mensual (CHIRPS) en cuencas testigo</h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded bg-white/10 px-2 py-0.5 text-xs font-medium text-white/90">Prototipo · datos reales · estimaciones</span>
          <a href="/" className="inline-flex min-h-11 items-center px-1 text-sm font-semibold text-white underline-offset-2 hover:underline">
            Inicio
          </a>
        </div>
      </header>
      <Dashboard />
    </div>
  );
}
