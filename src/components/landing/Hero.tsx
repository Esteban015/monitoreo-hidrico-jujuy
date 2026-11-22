/* eslint-disable @next/next/no-html-link-for-pages -- D-26/D-28: navegación completa entre páginas estáticas (next/link generaba 404 de precarga con la exportación estática de Next 16.4). */
import { caseHref } from "@/lib/caseParam";
import type { LandingCase, LandingImage } from "@/lib/landingData";
import { fmtDate, fmtNum, fmtPct } from "@/lib/metrics";

/** Hero: propuesta de valor + comparación ANTES → DESPUÉS de un caso real (valores leídos de data/derived). */
export default function Hero({ featured }: { featured: LandingCase | undefined }) {
  return (
    <section className="bg-brand-primary text-white" aria-labelledby="hero-titulo">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 pb-14 pt-10 md:grid-cols-[1fr_1.05fr] md:items-center md:gap-12 md:pb-20 md:pt-16">
        <div>
          <p className="mb-4 inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-semibold tracking-wide text-white/90">
            Monitoreo de agua superficial · Jujuy
          </p>
          <h1 id="hero-titulo" className="text-[2rem] font-semibold leading-[1.1] tracking-tight sm:text-4xl md:text-5xl">
            Ver cómo cambia el agua de Jujuy, con datos que se pueden verificar.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-white/85 md:text-lg">
            Compará dos imágenes satelitales reales de lagunas y embalses, sumá el contexto de lluvias de su cuenca y leé con
            claridad qué dice el dato y qué no.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a
              href="/demo"
              className="inline-flex min-h-12 items-center justify-center rounded-lg bg-white px-6 text-base font-semibold text-brand-primary hover:bg-brand-sand-soft"
            >
              Explorar la demo
              <span aria-hidden="true" className="ml-2">
                →
              </span>
            </a>
            <a
              href="/#metodologia"
              className="inline-flex min-h-12 items-center justify-center rounded-lg border border-white/40 px-6 text-base font-semibold text-white hover:bg-white/10"
            >
              Metodología y límites
            </a>
          </div>
        </div>

        {featured && <HeroComparison c={featured} />}
      </div>
    </section>
  );
}

function HeroComparison({ c }: { c: LandingCase }) {
  const { view, range } = c;
  const comp = view.comparison!;
  return (
    <figure className="rounded-2xl bg-white/[0.06] p-3 ring-1 ring-white/15 sm:p-4" data-testid="hero-comparison">
      <div className="mb-3 flex items-baseline justify-between gap-2 px-1">
        <p className="text-sm font-semibold">{view.info.name}</p>
        <p className="text-xs text-white/75">{view.info.ecoregion}</p>
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-3">
        <Shot img={c.imageA} tag="Antes" date={view.sceneA!.date} name={view.info.name} />
        <span aria-hidden="true" className="text-xl text-white/70 sm:text-2xl">
          →
        </span>
        <Shot img={c.imageB} tag="Después" date={view.sceneB!.date} name={view.info.name} />
      </div>
      <div className="mt-4 grid gap-3 rounded-xl bg-white px-4 py-4 text-brand-ink sm:grid-cols-[auto_1fr] sm:items-center sm:gap-5">
        <div>
          <p className="text-4xl font-semibold leading-none tracking-tight text-brand-primary sm:text-5xl" data-testid="hero-pct">
            {fmtPct(comp.MNDWI.pct_change)}
          </p>
          <p className="mt-1 text-xs font-medium text-brand-muted">
            {fmtNum(comp.MNDWI.area_a_km2, 2)} → {fmtNum(comp.MNDWI.area_b_km2, 2)} km²
          </p>
        </div>
        <div className="text-sm leading-snug">
          <p className="font-medium">Cambio estimado de superficie de agua visible entre las dos fechas.</p>
          <p className="mt-1 text-brand-muted">No es volumen ni caudal, ni una tendencia.</p>
          {range && (
            <p className="mt-2 inline-flex flex-wrap gap-x-1 rounded-md bg-brand-sand-soft px-2 py-1 text-xs text-brand-ink" data-testid="hero-range">
              <span>Rango entre métodos y umbrales:</span>
              <strong>
                {fmtPct(range.max)} a {fmtPct(range.min)}
              </strong>
            </p>
          )}
        </div>
      </div>
      <figcaption className="mt-3 flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-white/75">
        <span>Sentinel-2 L2A, falso color (B11/B08/B03). Línea cian: agua detectada.</span>
        <a href={caseHref(view.info.case_id)} className="font-semibold text-white underline underline-offset-2">
          Ver este caso en la demo
        </a>
      </figcaption>
    </figure>
  );
}

function Shot({ img, tag, date, name }: { img: LandingImage | null; tag: string; date: string; name: string }) {
  return (
    <div className="overflow-hidden rounded-xl bg-black/20">
      <div className="flex items-center justify-between gap-1 px-2 py-1.5 text-[11px] sm:text-xs">
        <span className="font-semibold uppercase tracking-wider">{tag}</span>
        <time dateTime={date} className="text-white/85">
          {fmtDate(date)}
        </time>
      </div>
      {img ? (
        // eslint-disable-next-line @next/next/no-img-element -- exportación estática: WebP local con dimensiones reales (sin recorte)
        <img
          src={img.src}
          width={img.width}
          height={img.height}
          alt={`${name}, imagen Sentinel-2 del ${fmtDate(date)} en falso color, con el agua detectada delineada en cian`}
          className="block h-auto w-full"
          decoding="async"
        />
      ) : (
        <p className="px-2 py-6 text-xs text-white/75">Imagen no disponible.</p>
      )}
    </div>
  );
}
