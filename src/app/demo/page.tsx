import type { Metadata } from "next";
import Dashboard from "@/components/Dashboard";
import { Logo } from "@/components/brand/Logo";

export const metadata: Metadata = {
  title: "Demo — Monitoreo Hídrico Jujuy",
  description: "Comparación de superficie de agua visible (Sentinel-2) y precipitación mensual (CHIRPS) en Laguna de los Pozuelos y Dique Las Maderas.",
};

// Dashboard (antes en "/"). Sin cambios de lógica: solo encabezado de marca y enlace a la home.
export default function DemoPage() {
  return (
    <div className="flex min-h-screen flex-col md:h-screen">
      <header className="flex flex-wrap items-center justify-between gap-2 bg-brand-primary px-4 py-2.5 text-white">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <a href="./" aria-label="Volver al inicio de Monitoreo Hídrico Jujuy">
            <Logo inverted compact />
          </a>
          <h1 className="text-sm text-white/85">Superficie de agua visible (Sentinel-2) y precipitación mensual (CHIRPS) en cuencas testigo</h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded bg-white/10 px-2 py-0.5 text-xs font-medium text-white/90">Prototipo · datos reales · estimaciones</span>
          <a href="./" className="text-xs font-semibold text-white underline-offset-2 hover:underline">
            Inicio
          </a>
        </div>
      </header>
      <Dashboard />
    </div>
  );
}
