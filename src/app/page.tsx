import Dashboard from "@/components/Dashboard";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col md:h-screen">
      <header className="flex flex-wrap items-baseline justify-between gap-2 bg-sky-900 px-4 py-3 text-white">
        <div>
          <h1 className="text-lg font-semibold">Monitoreo de Cuencas y Fuentes de Agua Natural — Jujuy</h1>
          <p className="text-xs text-sky-100">Superficie de agua visible (Sentinel-2) y precipitación mensual (CHIRPS) en cuencas testigo</p>
        </div>
        <span className="rounded bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-950">
          Prototipo de hackatón · datos satelitales reales · estimaciones
        </span>
      </header>
      <Dashboard />
    </div>
  );
}
