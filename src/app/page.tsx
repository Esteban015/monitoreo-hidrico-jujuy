import type { Metadata } from "next";
import { Logo } from "@/components/brand/Logo";
import CaseCard from "@/components/landing/CaseCard";
import Hero from "@/components/landing/Hero";
import HowItWorks from "@/components/landing/HowItWorks";
import SiteHeader, { NAV } from "@/components/landing/SiteHeader";
import { loadLandingCases, loadStepImages } from "@/lib/landingData";
import { NOTICES } from "@/lib/notices";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

const BENEFITS = [
  { t: "Datos reales", d: "Imágenes Sentinel-2 identificables por escena, precipitación CHIRPS y cuencas HydroBASINS. Sin datos simulados." },
  { t: "Trazabilidad", d: "Fuente, fecha, escena, método y licencia accesibles desde la interfaz, con enlace al catálogo original." },
  { t: "Comparación temporal", d: "Dos observaciones reales lado a lado, sin interpolar fechas que no existen." },
  { t: "Visualización clara", d: "Mapa, tarjetas y un rango de incertidumbre legible por personas no especialistas." },
  { t: "Uso sin internet", d: "Datos, geometrías y mapa base local viajan con la aplicación: funciona servida en una red local sin conexión." },
  { t: "Apoyo territorial", d: "Una lectura común para equipos técnicos, productores y comunidades, como insumo para conversar y decidir." },
];

const PROBLEMS = [
  ["Datos dispersos", "Imágenes satelitales, productos de lluvia y modelos de cuencas existen, pero están en catálogos distintos, con formatos y unidades técnicas."],
  ["Lecturas ambiguas", "Un espejo de agua puede achicarse por la estación seca, la evaporación o menos lluvias. Una foto aislada no alcanza para interpretarlo."],
  ["Cifras sin contexto", "Un porcentaje sin fecha, sin método ni margen de incertidumbre puede llevar a conclusiones equivocadas."],
];

function Eyebrow({ children, dark = false }: { children: React.ReactNode; dark?: boolean }) {
  return <p className={`text-sm font-semibold uppercase tracking-wider ${dark ? "text-white/80" : "text-brand-secondary-ink"}`}>{children}</p>;
}

export default function Landing() {
  const cases = loadLandingCases();
  const stepImages = loadStepImages();
  const featured = cases.find((c) => c.view.info.case_id === "laguna-pozuelos") ?? cases[0];

  return (
    <div className="min-h-screen">
      <a href="#contenido" className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2 focus:text-brand-primary">
        Saltar al contenido
      </a>
      <SiteHeader />
      <main id="contenido">
        <Hero featured={featured} />

        {/* PROBLEMA */}
        <section id="problema" aria-labelledby="t-problema" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 md:py-20">
          <Eyebrow>El problema</Eyebrow>
          <h2 id="t-problema" className="mt-2 max-w-3xl text-2xl font-semibold tracking-tight text-brand-primary md:text-3xl">
            Saber si una laguna o un embalse cambió no debería requerir ser especialista.
          </h2>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {PROBLEMS.map(([t, d]) => (
              <div key={t} className="rounded-2xl border border-brand-primary/10 bg-white p-5">
                <h3 className="font-semibold text-brand-ink">{t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-brand-muted">{d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* SOLUCIÓN */}
        <section aria-labelledby="t-solucion" className="bg-brand-sand-soft">
          <div className="mx-auto grid max-w-6xl gap-8 px-4 py-16 md:grid-cols-2 md:py-20">
            <div>
              <Eyebrow>La solución</Eyebrow>
              <h2 id="t-solucion" className="mt-2 text-2xl font-semibold tracking-tight text-brand-primary md:text-3xl">
                Una vista única, trazable y honesta sobre sus propios límites.
              </h2>
            </div>
            <div className="space-y-4 leading-relaxed text-brand-ink">
              <p>
                La plataforma procesa imágenes Sentinel-2 para estimar la <strong>superficie de agua visible</strong> en dos fechas reales, con control de nubes y de
                calidad, y la muestra sobre el mapa de Jujuy.
              </p>
              <p>
                Junto a cada imagen presenta la <strong>precipitación mensual</strong> estimada en la cuenca de aporte modelada, comparada con su referencia
                histórica, sin atribuir causas que los datos no permiten afirmar.
              </p>
              <p>Cada número indica de dónde viene, cómo se calculó y cuánto podría variar con otro método.</p>
            </div>
          </div>
        </section>

        {/* CÓMO FUNCIONA */}
        <section id="como-funciona" aria-labelledby="t-como" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 md:py-20">
          <Eyebrow>Cómo funciona</Eyebrow>
          <h2 id="t-como" className="mt-2 text-2xl font-semibold tracking-tight text-brand-primary md:text-3xl">
            Cuatro pasos, de la imagen a la interpretación.
          </h2>
          <HowItWorks images={stepImages} />
        </section>

        {/* CASOS TESTIGO */}
        <section id="casos" aria-labelledby="t-casos" className="scroll-mt-20 bg-white">
          <div className="mx-auto max-w-6xl px-4 py-16 md:py-20">
            <Eyebrow>Casos testigo</Eyebrow>
            <h2 id="t-casos" className="mt-2 text-2xl font-semibold tracking-tight text-brand-primary md:text-3xl">
              Dos ambientes contrastantes de Jujuy.
            </h2>
            <div className="mt-8 grid gap-6 md:grid-cols-2">
              {cases.map((c) => (
                <CaseCard key={c.view.info.case_id} c={c} />
              ))}
            </div>
            <p className="mt-4 text-xs text-brand-muted">
              Valores leídos de los datasets procesados del proyecto. Son estimaciones de superficie visible entre dos fechas, no tendencias.
            </p>
          </div>
        </section>

        {/* BENEFICIOS */}
        <section aria-labelledby="t-beneficios" className="mx-auto max-w-6xl px-4 py-16 md:py-20">
          <Eyebrow>Beneficios</Eyebrow>
          <h2 id="t-beneficios" className="mt-2 text-2xl font-semibold tracking-tight text-brand-primary md:text-3xl">
            Pensada para decidir con información verificable.
          </h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {BENEFITS.map((b) => (
              <div key={b.t} className="rounded-2xl border-l-4 border-brand-support bg-white p-5">
                <h3 className="font-semibold text-brand-ink">{b.t}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-brand-muted">{b.d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* METODOLOGÍA */}
        <section id="metodologia" aria-labelledby="t-metodologia" className="scroll-mt-20 bg-brand-primary text-white">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 md:grid-cols-2 md:py-20">
            <div>
              <Eyebrow dark>Transparencia metodológica</Eyebrow>
              <h2 id="t-metodologia" className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">
                Lo que el sistema hace, y lo que no.
              </h2>
              <p className="mt-4 leading-relaxed text-white/85">
                Es una herramienta de monitoreo y apoyo a decisiones. No reemplaza estudios hidrológicos ni información oficial, y no realiza pronósticos.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl bg-white/10 p-5">
                <h3 className="font-semibold">Sí hace</h3>
                <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-white/85">
                  <li>Estima la superficie de agua visible en dos fechas reales.</li>
                  <li>Informa un rango entre métodos y umbrales.</li>
                  <li>Muestra precipitación mensual estimada con anomalía y percentil.</li>
                  <li>Documenta fuentes, escenas y controles de calidad.</li>
                </ul>
              </div>
              <div className="rounded-2xl bg-white/10 p-5">
                <h3 className="font-semibold">No hace</h3>
                <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-white/85">
                  <li>No mide volumen almacenado ni caudal.</li>
                  <li>No estima aguas subterráneas.</li>
                  <li>No predice ni pronostica.</li>
                  <li>No atribuye causas ni identifica tendencias con dos fechas.</li>
                </ul>
              </div>
              <ul className="space-y-1.5 text-xs text-white/80 sm:col-span-2">
                <li>{NOTICES.surface}</li>
                <li>{NOTICES.basin}</li>
                <li>{NOTICES.chirpsEstimate}</li>
              </ul>
            </div>
          </div>
        </section>

        {/* CTA FINAL */}
        <section aria-labelledby="t-cta" className="mx-auto max-w-6xl px-4 py-16 text-center md:py-20">
          <h2 id="t-cta" className="text-2xl font-semibold tracking-tight text-brand-primary md:text-3xl">
            Explorá los casos con datos reales.
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-brand-muted">Compará las dos fechas, revisá el contexto de lluvias y leé cada advertencia directamente en el mapa.</p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <a href="/demo" className="inline-flex min-h-12 items-center justify-center rounded-lg bg-brand-primary px-6 font-semibold text-white hover:bg-brand-primary/90">
              Abrir la demo
            </a>
            <a
              href="https://github.com/Esteban015/monitoreo-hidrico-jujuy"
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-12 items-center justify-center rounded-lg border border-brand-primary/30 px-6 font-semibold text-brand-primary hover:bg-white"
            >
              Ver código y fuentes <span className="sr-only">(GitHub, se abre en otra pestaña)</span>
            </a>
          </div>
        </section>
      </main>

      <footer className="border-t border-brand-primary/10 bg-white">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-10 text-sm md:grid-cols-[auto_1fr] md:gap-12">
          <div>
            <Logo compact />
            <nav aria-label="Secciones (pie de página)" className="mt-4">
              <ul className="flex flex-wrap gap-x-4 gap-y-1">
                {NAV.map((n) => (
                  <li key={n.href}>
                    <a href={n.href} className="inline-flex min-h-11 items-center text-brand-secondary-ink hover:underline">
                      {n.label}
                    </a>
                  </li>
                ))}
                <li>
                  <a href="/demo" className="inline-flex min-h-11 items-center font-semibold text-brand-primary hover:underline">
                    Demo
                  </a>
                </li>
              </ul>
            </nav>
          </div>
          <p className="max-w-2xl text-xs leading-relaxed text-brand-muted">
            Contiene datos modificados de Copernicus Sentinel (2025). CHIRPS: Climate Hazards Center (UCSB). HydroBASINS: Lehner &amp; Grill (2013). © colaboradores de
            OpenStreetMap. Límites: IGN Argentina. Prototipo de hackatón.
          </p>
        </div>
      </footer>
    </div>
  );
}
