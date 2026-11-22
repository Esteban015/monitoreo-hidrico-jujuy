import type { StepImage } from "@/lib/landingData";

const STEPS = [
  {
    id: "1",
    title: "Elegí un caso",
    text: "Seleccioná una laguna o un embalse. El mapa muestra su contorno, la cuenca de aporte modelada y el agua detectada.",
    icon: <path d="M12 21s-6-5.3-6-10a6 6 0 1 1 12 0c0 4.7-6 10-6 10zm0-8a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" />,
  },
  {
    id: "2",
    title: "Compará dos fechas",
    text: "Alterná Antes, Después y Comparar sobre dos observaciones reales de Sentinel-2.",
    icon: <path d="M4 6h7v12H4zM13 6h7v12h-7z" />,
  },
  {
    id: "3",
    title: "Sumá el contexto de lluvia",
    text: "Precipitación del mes previo a cada imagen frente a su referencia 1995–2024, con anomalía y percentil.",
    icon: <path d="M7 14a4 4 0 1 1 1.5-7.7A5 5 0 0 1 18 8a3 3 0 0 1 0 6H7zm1 3l-1 2m5-2l-1 2m5-2l-1 2" />,
  },
  {
    id: "4",
    title: "Leé los límites",
    text: "Cada resultado muestra su rango entre métodos, la calidad de la observación y lo que el dato no permite afirmar.",
    icon: <path d="M12 3l9 16H3L12 3zm0 6v5m0 3h.01" />,
  },
];

/** «Cómo funciona»: 4 pasos con miniaturas REALES de la interfaz de la demo (si están generadas). */
export default function HowItWorks({ images }: { images: Record<string, StepImage> }) {
  return (
    <ol className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
      {STEPS.map((s, i) => {
        const img = images[s.id];
        return (
          <li key={s.id} className="relative flex flex-col rounded-2xl border border-brand-primary/10 bg-white p-5">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-primary text-sm font-semibold text-white">{s.id}</span>
              <svg viewBox="0 0 24 24" className="h-6 w-6 text-brand-secondary-ink" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                {s.icon}
              </svg>
              {i < STEPS.length - 1 && (
                <span aria-hidden="true" className="ml-auto hidden text-brand-support lg:inline">
                  →
                </span>
              )}
            </div>
            <h3 className="mt-3 font-semibold text-brand-ink">{s.title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-brand-muted">{s.text}</p>
            {img && (
              <div className="mt-4 overflow-hidden rounded-lg border border-brand-primary/10 bg-brand-bg">
                {/* eslint-disable-next-line @next/next/no-img-element -- exportación estática: captura real de la demo */}
                <img src={img.src} width={img.width} height={img.height} alt={img.alt} loading="lazy" decoding="async" className="block h-auto w-full" />
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
