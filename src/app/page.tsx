import type { Metadata } from "next";
import { Logo } from "@/components/brand/Logo";
import SiteHeader from "@/components/landing/SiteHeader";
import { loadLandingCases } from "@/lib/landingData";
import { fmtDate, fmtMonth, fmtNum, fmtPct } from "@/lib/metrics";
import { HIGH_SENSITIVITY_SPAN, NOTICES } from "@/lib/notices";
import type { LandingCase } from "@/lib/landingData";

export const metadata: Metadata = {
  title: "Monitoreo Hídrico Jujuy — Agua superficial con datos trazables",
  description:
    "Plataforma geoespacial para visualizar cambios en lagunas y embalses de Jujuy con imágenes satelitales reales, contexto de precipitación y advertencias metodológicas.",
};

const STEPS = [
  { n: "1", t: "Elegí un caso", d: "Seleccioná una laguna o un embalse en el mapa de Jujuy. Ves su contorno, la cuenca de aporte modelada y el agua detectada." },
  { n: "2", t: "Compará dos fechas", d: "Alterná Antes, Después y Comparar sobre dos observaciones reales de Sentinel-2 para ver dónde se retiró o se extendió el agua visible." },
  { n: "3", t: "Sumá el contexto de lluvia", d: "Consultá la precipitación del mes previo a cada imagen frente a su referencia 1995–2024, con anomalía y percentil." },
  { n: "4", t: "Leé las advertencias", d: "Cada resultado muestra su rango entre métodos, la calidad de la observación y los límites de lo que el dato permite afirmar." },
];

const BENEFITS = [
  { t: "Datos reales", d: "Imágenes Sentinel-2 identificables por escena, precipitación CHIRPS y cuencas HydroBASINS. Sin datos simulados." },
  { t: "Trazabilidad", d: "Fuente, fecha, escena, método y licencia accesibles desde la interfaz, con enlace al catálogo original." },
  { t: "Comparación temporal", d: "Dos observaciones reales lado a lado, sin interpolar fechas que no existen." },
  { t: "Visualización clara", d: "Mapa, tarjetas y un rango de incertidumbre legible por personas no especialistas." },
  { t: "Uso sin internet", d: "Datos, geometrías y mapa base local viajan con la aplicación: funciona servida en una red local sin conexión." },
  { t: "Apoyo territorial", d: "Una lectura común para equipos técnicos, productores y comunidades, como insumo para conversar y decidir." },
];

/** Misma regla que el dashboard (D-21): alta sensibilidad al método => advertencia de agua somera; si no, la de la cuenca. */
function caseNotice(view: LandingCase["view"], range: LandingCase["range"]): string {
  if (range && range.max - range.min > HIGH_SENSITIVITY_SPAN) {
    const w = [...view.sceneA!.warnings, ...view.sceneB!.warnings].find((x) => x.toLowerCase().includes("somera"));
    if (w) return `Alta sensibilidad al método (${fmtNum(range.max - range.min, 0)} puntos). ${w}`;
  }
  return view.info.warnings.find((w) => w.includes("aguas abajo")) ?? view.info.warnings[0];
}

export default function Landing() {
  const cases = loadLandingCases();
  const pozuelos = cases.find((c) => c.view.info.case_id === "laguna-pozuelos");

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main>
        {/* HERO */}
        <section className="relative overflow-hidden bg-brand-primary text-white">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 md:grid-cols-2 md:items-center md:py-24">
            <div>
              <p className="mb-3 inline-block rounded-full bg-white/10 px-3 py-1 text-xs font-medium tracking-wide text-white/90">
                Monitoreo de agua superficial · Jujuy
              </p>
              <h1 className="text-3xl font-semibold leading-tight tracking-tight md:text-5xl">Ver cómo cambia el agua de Jujuy, con datos que se pueden verificar.</h1>
              <p className="mt-5 max-w-xl text-base text-white/85 md:text-lg">
                Monitoreo Hídrico Jujuy compara imágenes satelitales reales de lagunas y embalses, suma el contexto de lluvias de su cuenca y muestra con claridad qué dice el dato y qué no.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <a href="demo" className="inline-flex min-h-11 items-center rounded-lg bg-white px-5 font-semibold text-brand-primary hover:bg-brand-sand-soft">
                  Explorar la demo
                </a>
                <a href="#metodologia" className="inline-flex min-h-11 items-center rounded-lg border border-white/40 px-5 font-semibold text-white hover:bg-white/10">
                  Ver metodología y límites
                </a>
              </div>
            </div>
            {pozuelos && (
              <figure className="rounded-2xl bg-white/5 p-3 ring-1 ring-white/15">
                <div className="grid grid-cols-2 gap-2">
                  {[pozuelos.view.sceneA!, pozuelos.view.sceneB!].map((s, i) => (
                    <div key={s.scene_id} className="overflow-hidden rounded-xl bg-brand-primary">
                      {/* eslint-disable-next-line @next/next/no-img-element -- exportación estática: imagen local */}
                      <img src={`data/${s.files.quicklook}`} alt={`Laguna de los Pozuelos, Sentinel-2 del ${fmtDate(s.date)} (falso color)`} className="aspect-[3/4] w-full object-cover" />
                      <p className="px-2 py-1.5 text-xs text-white/85">
                        {i === 0 ? "Antes" : "Después"} · {fmtDate(s.date)}
                      </p>
                    </div>
                  ))}
                </div>
                <figcaption className="mt-3 text-xs leading-relaxed text-white/75">
                  Laguna de los Pozuelos en dos imágenes Sentinel-2 reales (falso color B11/B08/B03; línea cian: agua detectada). Superficie visible estimada:{" "}
                  <strong className="text-white">{fmtPct(pozuelos.view.comparison!.MNDWI.pct_change)}</strong>
                  {pozuelos.range && (
                    <>
                      {" "}
                      (rango entre métodos {fmtPct(pozuelos.range.max)} a {fmtPct(pozuelos.range.min)})
                    </>
                  )}
                  .
                </figcaption>
              </figure>
            )}
          </div>
        </section>

        {/* PROBLEMA */}
        <section id="problema" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 md:py-20">
          <p className="text-sm font-semibold uppercase tracking-wider text-brand-secondary-ink">El problema</p>
          <h2 className="mt-2 max-w-3xl text-2xl font-semibold tracking-tight text-brand-primary md:text-3xl">Saber si una laguna o un embalse cambió no debería requerir ser especialista.</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {[
              ["Datos dispersos", "Imágenes satelitales, productos de lluvia y modelos de cuencas existen, pero están en catálogos distintos, con formatos y unidades técnicas."],
              ["Lecturas ambiguas", "Un espejo de agua puede achicarse por la estación seca, por la evaporación o por menos lluvias. Una foto aislada no alcanza para interpretarlo."],
              ["Cifras sin contexto", "Un porcentaje sin fecha, sin método ni margen de incertidumbre puede llevar a conclusiones equivocadas."],
            ].map(([t, d]) => (
              <div key={t} className="rounded-xl border border-brand-primary/10 bg-white p-5">
                <h3 className="font-semibold text-brand-ink">{t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-brand-ink/80">{d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* SOLUCIÓN */}
        <section className="bg-brand-sand-soft">
          <div className="mx-auto grid max-w-6xl gap-8 px-4 py-16 md:grid-cols-2 md:py-20">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-brand-secondary-ink">La solución</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-brand-primary md:text-3xl">Una vista única, trazable y honesta sobre sus propios límites.</h2>
            </div>
            <div className="space-y-4 text-brand-ink/85">
              <p>
                La plataforma procesa imágenes Sentinel-2 para estimar la <strong>superficie de agua visible</strong> en dos fechas reales, con control de nubes y de calidad, y la muestra sobre el mapa de Jujuy.
              </p>
              <p>
                Junto a cada imagen presenta la <strong>precipitación mensual</strong> estimada en la cuenca de aporte modelada, comparada con su referencia histórica, sin atribuir causas que los datos no permiten afirmar.
              </p>
              <p>Cada número indica de dónde viene, cómo se calculó y cuánto podría variar con otro método.</p>
            </div>
          </div>
        </section>

        {/* CÓMO FUNCIONA */}
        <section id="como-funciona" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 md:py-20">
          <p className="text-sm font-semibold uppercase tracking-wider text-brand-secondary-ink">Cómo funciona</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-brand-primary md:text-3xl">Cuatro pasos, de la imagen a la interpretación.</h2>
          <ol className="mt-8 grid gap-4 md:grid-cols-4">
            {STEPS.map((s) => (
              <li key={s.n} className="rounded-xl border border-brand-primary/10 bg-white p-5">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-brand-primary text-sm font-semibold text-white">{s.n}</span>
                <h3 className="mt-3 font-semibold text-brand-ink">{s.t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-brand-ink/80">{s.d}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* BENEFICIOS */}
        <section className="bg-white">
          <div className="mx-auto max-w-6xl px-4 py-16 md:py-20">
            <p className="text-sm font-semibold uppercase tracking-wider text-brand-secondary-ink">Beneficios</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-brand-primary md:text-3xl">Pensada para decidir con información verificable.</h2>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {BENEFITS.map((b) => (
                <div key={b.t} className="rounded-xl border-l-4 border-brand-support bg-brand-bg p-5">
                  <h3 className="font-semibold text-brand-ink">{b.t}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-brand-ink/80">{b.d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CASOS TESTIGO */}
        <section id="casos" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 md:py-20">
          <p className="text-sm font-semibold uppercase tracking-wider text-brand-secondary-ink">Casos testigo</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-brand-primary md:text-3xl">Dos ambientes contrastantes de Jujuy.</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            {cases.map(({ view, range }) => {
              const c = view.comparison!;
              return (
                <article key={view.info.case_id} className="flex flex-col rounded-2xl border border-brand-primary/10 bg-white p-6" data-testid={`landing-case-${view.info.case_id}`}>
                  <p className="text-xs font-medium uppercase tracking-wider text-brand-ink/60">
                    {view.info.ecoregion} · {view.info.kind}
                  </p>
                  <h3 className="mt-1 text-xl font-semibold text-brand-primary">{view.info.name}</h3>
                  <dl className="mt-5 grid grid-cols-2 gap-4">
                    <div>
                      <dt className="text-xs text-brand-ink/60">Superficie visible · {fmtDate(view.sceneA!.date)}</dt>
                      <dd className="text-2xl font-semibold text-brand-ink">{fmtNum(c.MNDWI.area_a_km2, 2)} km²</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-brand-ink/60">Superficie visible · {fmtDate(view.sceneB!.date)}</dt>
                      <dd className="text-2xl font-semibold text-brand-ink">{fmtNum(c.MNDWI.area_b_km2, 2)} km²</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-brand-ink/60">Cambio (MNDWI, valor principal)</dt>
                      <dd className="text-2xl font-semibold text-brand-primary" data-testid="landing-pct">{fmtPct(c.MNDWI.pct_change)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-brand-ink/60">Rango entre métodos y umbrales</dt>
                      <dd className="text-base font-semibold text-brand-ink" data-testid="landing-range">{range ? `${fmtPct(range.max)} a ${fmtPct(range.min)}` : "—"}</dd>
                    </div>
                  </dl>
                  {view.rainA && view.rainB && (
                    <p className="mt-4 text-sm text-brand-ink/75">
                      Lluvia del mes previo a cada imagen ({fmtMonth(view.rainA.month)} y {fmtMonth(view.rainB.month)}) disponible con su referencia 1995–2024.
                    </p>
                  )}
                  <p className="mt-4 rounded-lg border-l-4 border-brand-warning bg-brand-sand-soft p-3 text-xs leading-relaxed text-brand-ink/85">
                    {caseNotice(view, range)}
                  </p>
                  <a href="demo" className="mt-5 inline-flex min-h-10 items-center self-start rounded-lg border border-brand-primary px-4 text-sm font-semibold text-brand-primary hover:bg-brand-primary hover:text-white">
                    Ver en la demo
                  </a>
                </article>
              );
            })}
          </div>
          <p className="mt-4 text-xs text-brand-ink/60">Valores leídos de los datasets procesados del proyecto. Son estimaciones de superficie visible entre dos fechas, no tendencias.</p>
        </section>

        {/* METODOLOGÍA */}
        <section id="metodologia" className="scroll-mt-20 bg-brand-primary text-white">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 md:grid-cols-2 md:py-20">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-white/70">Transparencia metodológica</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">Lo que el sistema hace, y lo que no.</h2>
              <p className="mt-4 text-white/85">
                Es una herramienta de monitoreo y apoyo a decisiones. No reemplaza estudios hidrológicos ni información oficial, y no realiza pronósticos.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl bg-white/10 p-5">
                <h3 className="font-semibold">Sí hace</h3>
                <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-white/85">
                  <li>Estima la superficie de agua visible en dos fechas reales.</li>
                  <li>Informa un rango entre métodos y umbrales.</li>
                  <li>Muestra precipitación mensual estimada con anomalía y percentil.</li>
                  <li>Documenta fuentes, escenas y controles de calidad.</li>
                </ul>
              </div>
              <div className="rounded-xl bg-white/10 p-5">
                <h3 className="font-semibold">No hace</h3>
                <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-white/85">
                  <li>No mide volumen almacenado ni caudal.</li>
                  <li>No estima aguas subterráneas.</li>
                  <li>No predice ni pronostica.</li>
                  <li>No atribuye causas ni identifica tendencias con dos fechas.</li>
                </ul>
              </div>
              <ul className="space-y-1.5 text-xs text-white/75 sm:col-span-2">
                <li>{NOTICES.surface}</li>
                <li>{NOTICES.basin}</li>
                <li>{NOTICES.chirpsEstimate}</li>
              </ul>
            </div>
          </div>
        </section>

        {/* CTA FINAL */}
        <section className="mx-auto max-w-6xl px-4 py-16 text-center md:py-20">
          <h2 className="text-2xl font-semibold tracking-tight text-brand-primary md:text-3xl">Explorá los casos con datos reales.</h2>
          <p className="mx-auto mt-3 max-w-2xl text-brand-ink/80">Compará las dos fechas, revisá el contexto de lluvias y leé cada advertencia directamente en el mapa.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <a href="demo" className="inline-flex min-h-11 items-center rounded-lg bg-brand-primary px-5 font-semibold text-white hover:bg-brand-primary/90">
              Abrir la demo
            </a>
            <a
              href="https://github.com/Esteban015/monitoreo-hidrico-jujuy"
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-11 items-center rounded-lg border border-brand-primary/30 px-5 font-semibold text-brand-primary hover:bg-white"
            >
              Ver código y fuentes
            </a>
          </div>
        </section>
      </main>

      <footer className="border-t border-brand-primary/10 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 text-xs text-brand-ink/70 md:flex-row md:items-center md:justify-between">
          <Logo compact />
          <p className="max-w-2xl">
            Contiene datos modificados de Copernicus Sentinel (2025). CHIRPS: Climate Hazards Center (UCSB). HydroBASINS: Lehner &amp; Grill (2013). © colaboradores de OpenStreetMap. Límites: IGN Argentina. Prototipo de hackatón.
          </p>
        </div>
      </footer>
    </div>
  );
}
