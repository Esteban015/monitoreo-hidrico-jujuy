import { caseHref } from "@/lib/caseParam";
import type { LandingCase } from "@/lib/landingData";
import { fmtDate, fmtNum, fmtPct } from "@/lib/metrics";
import { HIGH_SENSITIVITY_SPAN } from "@/lib/notices";

/** Misma regla que el dashboard (D-21): alta sensibilidad al método => advertencia de agua somera; si no, la de la cuenca. */
export function caseNotice({ view, range }: LandingCase): string {
  if (range && range.max - range.min > HIGH_SENSITIVITY_SPAN) {
    const w = [...view.sceneA!.warnings, ...view.sceneB!.warnings].find((x) => x.toLowerCase().includes("somera"));
    if (w) return `Alta sensibilidad al método (${fmtNum(range.max - range.min, 0)} puntos). ${w}`;
  }
  return view.info.warnings.find((w) => w.includes("aguas abajo")) ?? view.info.warnings[0];
}

/**
 * Tarjeta de caso testigo (D-31). Jerarquía: caso → cambio principal → Antes/Después (barras proporcionales a la
 * superficie estimada, mismo valor principal) → fechas → rango → advertencia → CTA al caso en la demo.
 */
export default function CaseCard({ c }: { c: LandingCase }) {
  const { view, range } = c;
  const comp = view.comparison!;
  const a = comp.MNDWI.area_a_km2;
  const b = comp.MNDWI.area_b_km2;
  const max = Math.max(a, b);
  return (
    <article className="flex flex-col rounded-2xl border border-brand-primary/10 bg-white p-5 shadow-sm sm:p-6" data-testid={`landing-case-${view.info.case_id}`}>
      <header>
        <p className="text-xs font-semibold uppercase tracking-wider text-brand-muted">
          {view.info.ecoregion} · {view.info.kind}
        </p>
        <h3 className="mt-1 text-xl font-semibold text-brand-primary">{view.info.name}</h3>
      </header>

      <div className="mt-5 flex items-end gap-3">
        <p className="text-4xl font-semibold leading-none tracking-tight text-brand-ink" data-testid="landing-pct">
          {fmtPct(comp.MNDWI.pct_change)}
        </p>
        <p className="pb-0.5 text-sm leading-tight text-brand-muted">
          cambio estimado de
          <br />
          superficie visible (MNDWI)
        </p>
      </div>

      <ul className="mt-5 space-y-3" aria-label="Superficie visible estimada en cada fecha">
        {[
          { tag: "Antes", date: view.sceneA!.date, value: a, color: "bg-data-a" },
          { tag: "Después", date: view.sceneB!.date, value: b, color: "bg-data-b" },
        ].map((r) => (
          <li key={r.tag}>
            <div className="flex items-baseline justify-between gap-2 text-sm">
              <span className="text-brand-muted">
                <span className="font-semibold text-brand-ink">{r.tag}</span> · <time dateTime={r.date}>{fmtDate(r.date)}</time>
              </span>
              <span className="font-semibold tabular-nums text-brand-ink">{fmtNum(r.value, 2)} km²</span>
            </div>
            <div className="mt-1 h-2.5 rounded-full bg-brand-bg" aria-hidden="true">
              <div className={`h-2.5 rounded-full ${r.color}`} style={{ width: `${(r.value / max) * 100}%` }} />
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-brand-muted">Barras proporcionales a la superficie visible estimada (valor principal).</p>

      <p className="mt-4 text-sm text-brand-ink" data-testid="landing-range-row">
        Rango entre métodos y umbrales:{" "}
        <strong className="whitespace-nowrap tabular-nums" data-testid="landing-range">
          {range ? `${fmtPct(range.max)} a ${fmtPct(range.min)}` : "—"}
        </strong>
      </p>

      <p className="mb-5 mt-4 rounded-lg border-l-4 border-brand-warning bg-brand-sand-soft p-3 text-xs leading-relaxed text-brand-ink">{caseNotice(c)}</p>

      <a
        href={caseHref(view.info.case_id)}
        className="mt-auto inline-flex min-h-11 items-center self-start rounded-lg bg-brand-primary px-4 text-sm font-semibold text-white hover:bg-brand-primary/90"
        data-testid={`landing-cta-${view.info.case_id}`}
      >
        Explorar {view.info.name} en la demo <span aria-hidden="true">&nbsp;→</span>
      </a>
    </article>
  );
}
