"use client";

import type { ClimateCase, SceneMetrics } from "@/lib/types";
import { fmtDate, fmtMonth, fmtNum } from "@/lib/metrics";

/**
 * Historial de la fuente de agua: serie climática mensual REAL de la cuenca
 * + las dos observaciones reales de superficie (Sentinel-2). No se interpolan áreas.
 */
export default function HistoryChart({ climate, sceneA, sceneB }: { climate: ClimateCase; sceneA: SceneMetrics; sceneB: SceneMetrics }) {
  const months = climate.months;
  const W = 640;
  const H = 250;
  const M = { l: 38, r: 14, t: 34, b: 34 };
  const pw = W - M.l - M.r;
  const ph = H - M.t - M.b;
  const x = (i: number) => M.l + (months.length === 1 ? pw / 2 : (pw * i) / (months.length - 1));
  const maxP = Math.max(10, ...months.map((m) => m.precip_mm ?? 0));
  const temps = months.map((m) => m.temp_c).filter((v): v is number => v !== null);
  const tMin = Math.min(...temps);
  const tMax = Math.max(...temps);
  const yT = (v: number) => M.t + ph - ((v - tMin) / Math.max(0.1, tMax - tMin)) * ph;
  const barW = Math.max(1.4, pw / months.length - 1.4);
  const tempPath = months
    .map((m, i) => (m.temp_c === null ? "" : `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${yT(m.temp_c).toFixed(1)}`))
    .join(" ");

  const observations = [
    { scene: sceneA, area: sceneA.water.MNDWI.area_km2 },
    { scene: sceneB, area: sceneB.water.MNDWI.area_km2 },
  ].map((o) => {
    const target = o.scene.date.slice(0, 7);
    let idx = months.findIndex((m) => m.month === target);
    if (idx < 0) idx = months.length - 1;
    return { ...o, idx };
  });

  return (
    <section data-testid="history" className="rounded-lg border border-slate-200 p-3">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-900">Historial de la fuente de agua</h3>
        <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-800">clima real</span>
      </div>
      <p className="mt-0.5 text-xs text-slate-500">
        {fmtMonth(climate.first_month)} – {fmtMonth(climate.last_month)} · lluvia y temperatura de la cuenca (Open-Meteo)
      </p>

      <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 w-full" role="img" aria-label="Historial mensual de precipitación y temperatura de la cuenca, con las dos observaciones de superficie de agua">
        <title>Historial climático de la cuenca y observaciones de superficie</title>
        {[0, 0.5, 1].map((f) => (
          <line key={f} x1={M.l} x2={W - M.r} y1={M.t + ph * f} y2={M.t + ph * f} stroke="#e2e8f0" strokeWidth="1" />
        ))}
        {months.map((m, i) => {
          const v = m.precip_mm ?? 0;
          const h = (v / maxP) * ph;
          return <rect key={m.month} x={x(i) - barW / 2} y={M.t + ph - h} width={barW} height={Math.max(0.5, h)} fill="#38bdf8" opacity={0.75} rx={1} />;
        })}
        {months.map((m, i) =>
          m.month.endsWith("-01") ? (
            <g key={`y-${m.month}`}>
              <line x1={x(i)} x2={x(i)} y1={M.t + ph} y2={M.t + ph + 4} stroke="#94a3b8" />
              <text x={x(i)} y={H - 12} textAnchor="middle" fontSize="10" fill="#64748b">
                {m.month.slice(0, 4)}
              </text>
            </g>
          ) : null,
        )}
        <path d={tempPath} fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinejoin="round" />
        {observations.map((o, i) => (
          <g key={o.scene.scene_id}>
            <line x1={x(o.idx)} x2={x(o.idx)} y1={M.t} y2={M.t + ph} stroke="#0f172a" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.7" />
            <circle cx={x(o.idx)} cy={M.t + ph} r="4" fill="#0f172a" />
            <text x={x(o.idx)} y={M.t - 14 + i * 12} textAnchor="middle" fontSize="10" fontWeight="600" fill="#0f172a">
              {fmtNum(o.area, 1)} km²
            </text>
            <text x={x(o.idx)} y={M.t - 3 + i * 12} textAnchor="middle" fontSize="9" fill="#475569">
              {fmtDate(o.scene.date)}
            </text>
          </g>
        ))}
        <text x={M.l - 6} y={M.t + 4} textAnchor="end" fontSize="9" fill="#0369a1">
          {fmtNum(maxP, 0)} mm
        </text>
        <text x={M.l - 6} y={M.t + ph} textAnchor="end" fontSize="9" fill="#0369a1">
          0
        </text>
        <text x={W - M.r} y={M.t - 22} textAnchor="end" fontSize="9" fill="#b45309">
          temp. {fmtNum(tMin, 1)}–{fmtNum(tMax, 1)} °C
        </text>
      </svg>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-600">
        <span className="inline-flex items-center gap-1">
          <span className="inline-block h-2.5 w-3 rounded-sm bg-sky-400" /> lluvia mensual (mm)
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="inline-block h-0.5 w-4 bg-amber-500" /> temperatura media (°C)
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="inline-block h-3 w-0.5 border-l-2 border-dashed border-slate-800" /> observación Sentinel-2
        </span>
      </div>

      <div className="mt-2 space-y-1" data-testid="history-observations">
        {observations.map((o) => (
          <div key={o.scene.scene_id} className="flex items-center justify-between gap-2 rounded bg-slate-50 px-2 py-1 text-xs">
            <span className="text-slate-600">{fmtDate(o.scene.date)}</span>
            <span className="font-medium text-slate-900">{fmtNum(o.area, 2)} km² de superficie visible</span>
          </div>
        ))}
      </div>

      <details className="mt-2 text-xs text-slate-700" data-testid="history-months">
        <summary className="cursor-pointer select-none font-medium text-slate-900">Últimos meses de la fuente</summary>
        <table className="mt-1 w-full">
          <thead className="text-left text-slate-500">
            <tr>
              <th className="py-1 font-normal">Mes</th>
              <th className="py-1 font-normal">Lluvia</th>
              <th className="py-1 font-normal">Temperatura</th>
            </tr>
          </thead>
          <tbody>
            {months.slice(-12).map((m) => (
              <tr key={m.month} className="border-t border-slate-100">
                <td className="py-0.5">{fmtMonth(m.month)}</td>
                <td className="py-0.5">{m.precip_mm === null ? "—" : `${fmtNum(m.precip_mm, 1)} mm`}</td>
                <td className="py-0.5">{m.temp_c === null ? "—" : `${fmtNum(m.temp_c, 1)} °C`}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
      <p className="mt-1.5 text-[11px] leading-snug text-slate-500">
        La serie de lluvia y temperatura es real y continua. De superficie de agua hay <strong>solo 2 observaciones reales</strong>: no se
        interpolan fechas ni se inventan valores intermedios.
      </p>
    </section>
  );
}
