"use client";

import { useState } from "react";
import { fmtNum, fmtPct, fmtSigned } from "@/lib/metrics";
import { clamp, parseDecimal, precipCurve, predictArea } from "@/lib/model";
import type { WaterModelCase } from "@/lib/types";

/**
 * Simulador de sensibilidad climática. La predicción sale de una grilla exportada por
 * HistGradientBoostingRegressor (sklearn). El modelo es DEMOSTRATIVO y sintético:
 * ver el aviso visible y data/derived/model/water_model.json.
 */
export default function ClimateSimulator({ model }: { model: WaterModelCase }) {
  const [precip, setPrecip] = useState(model.baseline.precip_3m_mm);
  const [temp, setTemp] = useState(model.baseline.temp_3m_c);
  const [precipText, setPrecipText] = useState(fmtNum(model.baseline.precip_3m_mm, 1));
  const [tempText, setTempText] = useState(fmtNum(model.baseline.temp_3m_c, 1));
  const [precipMsg, setPrecipMsg] = useState<string | null>(null);
  const [tempMsg, setTempMsg] = useState<string | null>(null);
  const [pMin, pMax] = model.ranges.precip_3m_mm;
  const [tMin, tMax] = model.ranges.temp_3m_c;

  const applyPrecip = (raw: string) => {
    const n = parseDecimal(raw);
    if (n === null) {
      setPrecipMsg("Ingresá un número válido, en milímetros.");
      return;
    }
    const c = clamp(n, pMin, pMax);
    setPrecip(c);
    setPrecipText(fmtNum(c, 1));
    setPrecipMsg(c !== n ? `Fuera del rango del modelo (${fmtNum(pMin, 0)}–${fmtNum(pMax, 0)} mm). Se usa el borde.` : null);
  };
  const applyTemp = (raw: string) => {
    const n = parseDecimal(raw);
    if (n === null) {
      setTempMsg("Ingresá un número válido, en grados Celsius.");
      return;
    }
    const c = clamp(n, tMin, tMax);
    setTemp(c);
    setTempText(fmtNum(c, 1));
    setTempMsg(c !== n ? `Fuera del rango del modelo (${fmtNum(tMin, 1)}–${fmtNum(tMax, 1)} °C). Se usa el borde.` : null);
  };
  const base = model.baseline.last_observed_area_km2;
  const pred = predictArea(model, precip, temp);
  const delta = pred - base;
  const pct = base > 0 ? (delta / base) * 100 : null;

  const curve = precipCurve(model, temp);
  const aMin = Math.min(base, ...curve.map((p) => p.area));
  const aMax = Math.max(base, ...curve.map((p) => p.area));
  const W = 340;
  const H = 96;
  const M = { l: 6, r: 6, t: 10, b: 16 };
  const pw = W - M.l - M.r;
  const ph = H - M.t - M.b;
  const cx = (p: number) => M.l + ((p - pMin) / Math.max(1e-6, pMax - pMin)) * pw;
  const cy = (a: number) => M.t + ph - ((a - aMin) / Math.max(1e-6, aMax - aMin)) * ph;
  const path = curve.map((p, i) => `${i === 0 ? "M" : "L"}${cx(p.precip).toFixed(1)},${cy(p.area).toFixed(1)}`).join(" ");
  const baseX = cx(model.baseline.precip_3m_mm);
  const baseY = cy(base);

  const reset = () => {
    const p = model.baseline.precip_3m_mm;
    const t = model.baseline.temp_3m_c;
    setPrecip(p);
    setTemp(t);
    setPrecipText(fmtNum(p, 1));
    setTempText(fmtNum(t, 1));
    setPrecipMsg(null);
    setTempMsg(null);
  };
  const preset = (factor: number, dTemp: number) => {
    const p = clamp(model.baseline.precip_3m_mm * factor, pMin, pMax);
    const t = clamp(model.baseline.temp_3m_c + dTemp, tMin, tMax);
    setPrecip(p);
    setTemp(t);
    setPrecipText(fmtNum(p, 1));
    setTempText(fmtNum(t, 1));
    setPrecipMsg(null);
    setTempMsg(null);
  };

  return (
    <section data-testid="simulator" className="rounded-lg border border-slate-200 p-3">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-900">Simulador climático</h3>
        <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-900">DEMOSTRATIVO</span>
      </div>
      <p className="mt-0.5 text-xs text-slate-500">
        Ingresá la precipitación y la temperatura esperadas, o mové los controles, para ver cómo cambiaría la superficie visible.
      </p>

      <div className="mt-2 rounded border border-amber-300 bg-amber-50 p-2 text-[11px] leading-snug text-amber-900" data-testid="sim-disclaimer">
        <strong>Modelo demostrativo — datos sintéticos.</strong> Entrenado con una respuesta sintética calibrada a 2 observaciones reales.
        No es una predicción validada, no estima volumen ni caudal y no debe usarse para decisiones.
      </div>

      <div className="mt-3 space-y-3">
        <label className="block">
          <span className="flex items-baseline justify-between gap-2 text-xs text-slate-700">
            <span>Precipitación acumulada (3 meses)</span>
            <span className="inline-flex items-center gap-1 font-semibold tabular-nums text-sky-900">
              <input
                type="text"
                inputMode="decimal"
                data-testid="sim-precip-input"
                aria-label="Precipitación acumulada de 3 meses en milímetros"
                aria-invalid={precipMsg !== null}
                value={precipText}
                onChange={(e) => setPrecipText(e.target.value)}
                onBlur={() => applyPrecip(precipText)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") applyPrecip(precipText);
                }}
                className="w-20 rounded border border-slate-300 bg-white px-1.5 py-0.5 text-right text-xs text-slate-900"
              />
              mm
            </span>
          </span>
          <input
            type="range"
            data-testid="sim-precip"
            aria-label="Control de precipitación acumulada de 3 meses"
            min={pMin}
            max={pMax}
            step={5}
            value={precip}
            onChange={(e) => {
              const v = Number(e.target.value);
              setPrecip(v);
              setPrecipText(fmtNum(v, 1));
              setPrecipMsg(null);
            }}
            className="mt-1 w-full accent-sky-700"
          />
          {precipMsg && (
            <p className="mt-1 text-[11px] text-amber-800" data-testid="sim-precip-msg" role="status">
              {precipMsg}
            </p>
          )}
          <span className="flex justify-between text-[10px] text-slate-400">
            <span>{fmtNum(pMin, 0)} mm</span>
            <span>{fmtNum(pMax, 0)} mm</span>
          </span>
        </label>

        <label className="block">
          <span className="flex items-baseline justify-between gap-2 text-xs text-slate-700">
            <span>Temperatura media (3 meses)</span>
            <span className="inline-flex items-center gap-1 font-semibold tabular-nums text-amber-800">
              <input
                type="text"
                inputMode="decimal"
                data-testid="sim-temp-input"
                aria-label="Temperatura media de 3 meses en grados Celsius"
                aria-invalid={tempMsg !== null}
                value={tempText}
                onChange={(e) => setTempText(e.target.value)}
                onBlur={() => applyTemp(tempText)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") applyTemp(tempText);
                }}
                className="w-16 rounded border border-slate-300 bg-white px-1.5 py-0.5 text-right text-xs text-slate-900"
              />
              °C
            </span>
          </span>
          <input
            type="range"
            data-testid="sim-temp"
            aria-label="Control de temperatura media de 3 meses"
            min={tMin}
            max={tMax}
            step={0.1}
            value={temp}
            onChange={(e) => {
              const v = Number(e.target.value);
              setTemp(v);
              setTempText(fmtNum(v, 1));
              setTempMsg(null);
            }}
            className="mt-1 w-full accent-amber-600"
          />
          {tempMsg && (
            <p className="mt-1 text-[11px] text-amber-800" data-testid="sim-temp-msg" role="status">
              {tempMsg}
            </p>
          )}
          <span className="flex justify-between text-[10px] text-slate-400">
            <span>{fmtNum(tMin, 1)} °C</span>
            <span>{fmtNum(tMax, 1)} °C</span>
          </span>
        </label>
      </div>

      <div className="mt-2 flex flex-wrap gap-1">
        <button type="button" onClick={() => preset(0.7, 1.5)} data-testid="preset-sequia" className="rounded border border-slate-300 px-2 py-1 text-[11px] text-slate-700 hover:bg-slate-50">
          Escenario seco
        </button>
        <button type="button" onClick={() => preset(1.3, -1)} data-testid="preset-humedo" className="rounded border border-slate-300 px-2 py-1 text-[11px] text-slate-700 hover:bg-slate-50">
          Escenario húmedo
        </button>
        <button type="button" onClick={reset} data-testid="preset-reset" className="rounded border border-slate-300 px-2 py-1 text-[11px] text-slate-700 hover:bg-slate-50">
          Restablecer
        </button>
      </div>

      <div className="mt-3 rounded-lg bg-sky-50 p-2" aria-live="polite" data-testid="sim-result">
        <div className="flex items-end justify-between gap-2">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-sky-800">Superficie simulada</p>
            <p className="text-2xl font-semibold text-sky-950" data-testid="sim-area">
              {fmtNum(pred, 2)} <span className="text-sm font-normal">km²</span>
            </p>
          </div>
          <p className={`text-right text-xs font-medium ${delta >= 0 ? "text-emerald-700" : "text-amber-800"}`} data-testid="sim-delta">
            {fmtSigned(delta, 2)} km²
            <br />
            {fmtPct(pct)} vs. última observación
          </p>
        </div>
        <p className="mt-0.5 text-[10px] text-sky-800">
          Base: {fmtNum(base, 2)} km² observados el {model.baseline.last_observed_date}. Escenario climático de {model.baseline.month}.
        </p>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 w-full" role="img" aria-label="Curva de respuesta de la superficie de agua a la precipitación, con la temperatura actual">
        <title>Respuesta simulada a la precipitación</title>
        <line x1={M.l} x2={W - M.r} y1={M.t + ph} y2={M.t + ph} stroke="#cbd5e1" />
        <line x1={baseX} x2={baseX} y1={M.t} y2={M.t + ph} stroke="#94a3b8" strokeDasharray="3 3" />
        <line x1={M.l} x2={W - M.r} y1={baseY} y2={baseY} stroke="#0f172a" strokeOpacity="0.25" />
        <path d={path} fill="none" stroke="#0284c7" strokeWidth="2" />
        <circle cx={cx(precip)} cy={cy(pred)} r="4" fill="#0f172a" stroke="#fff" strokeWidth="1.5" />
        <text x={M.l} y={H - 3} fontSize="8" fill="#64748b">
          {fmtNum(pMin, 0)} mm
        </text>
        <text x={W - M.r} y={H - 3} textAnchor="end" fontSize="8" fill="#64748b">
          {fmtNum(pMax, 0)} mm
        </text>
        <text x={baseX} y={M.t - 1} textAnchor="middle" fontSize="8" fill="#64748b">
          base
        </text>
      </svg>
      <p className="text-[10px] text-slate-500">Curva a {fmtNum(temp, 1)} °C. La línea horizontal es la última superficie observada.</p>

      <div className="mt-2 rounded bg-slate-50 p-2 text-[10px] leading-snug text-slate-600">
        <p>
          <strong>{model.training.samples}</strong> muestras sintéticas · R² sintético <strong>{fmtNum(model.training.r2_synthetic_test, 3)}</strong> · MAE{" "}
          <strong>{fmtNum(model.training.mae_synthetic_test_km2, 2)} km²</strong> (prueba sintética, no validación real).
        </p>
        <p className="mt-0.5">
          Algoritmo: <strong>HistGradientBoostingRegressor</strong> (scikit-learn). Sensibilidad calibrada: {fmtNum(model.response.alpha_precip_per_100mm * 100, 1)} % por
          cada +100 mm y −{fmtNum(model.response.beta_temp_per_5c * 100, 0)} % por +5 °C (supuesto fijo).
        </p>
        <details className="mt-1">
          <summary className="cursor-pointer select-none">Supuestos y límites</summary>
          <ul className="mt-1 list-disc pl-4">
            <li>Sólo hay 2 observaciones reales de superficie por caso; no alcanzan para validar el modelo.</li>
            <li>Lluvia y temperatura son colineales entre esas 2 observaciones: se fija la elasticidad térmica y se calibra la de lluvia.</li>
            <li>No estima volumen, caudal, aguas subterráneas ni fecha futura. Es un análisis de sensibilidad.</li>
          </ul>
        </details>
      </div>
    </section>
  );
}
