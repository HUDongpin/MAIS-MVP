"use client";

import { useMemo, useState } from "react";
import { motion } from "@/components/ui/Motion";
import { MathText } from "@/components/math/MathText";
import { useSettings } from "@/components/providers/AppProviders";
import { isChineseLanguage, simplifyChineseText } from "@/lib/i18n";
import { clamp, formatNumber } from "@/lib/math";

type LabMode = "tangent" | "normal";

const width = 640;
const height = 420;
const padding = 42;

function mapLinear(value: number, min: number, max: number, screenMin: number, screenMax: number) {
  return screenMin + ((value - min) / (max - min)) * (screenMax - screenMin);
}

function curve(x: number) {
  return 0.12 * x ** 3 - 0.6 * x ** 2 + x + 1;
}

function derivative(x: number) {
  return 0.36 * x ** 2 - 1.2 * x + 1;
}

function normalDensity(x: number, mean: number, sd: number) {
  return Math.exp(-0.5 * ((x - mean) / sd) ** 2);
}

export function CalculusStatsLab({ topicId = "calculus" }: { topicId?: string }) {
  const { language, recordLearningEvent, t } = useSettings();
  const [mode, setMode] = useState<LabMode>(topicId === "statistics-s6" ? "normal" : "tangent");
  const [tangentX, setTangentX] = useState(2);
  const [mean, setMean] = useState(50);
  const [sd, setSd] = useState(10);
  const [observed, setObserved] = useState(65);

  const tangentPath = useMemo(() => {
    const xMin = -4;
    const xMax = 6;
    const yMin = -9;
    const yMax = 9;
    return Array.from({ length: 180 }, (_, index) => xMin + (index / 179) * (xMax - xMin))
      .map((x, index) => {
        const y = curve(x);
        const svgX = mapLinear(x, xMin, xMax, padding, width - padding);
        const svgY = mapLinear(y, yMin, yMax, height - padding, padding);
        return `${index === 0 ? "M" : "L"} ${svgX.toFixed(2)} ${svgY.toFixed(2)}`;
      })
      .join(" ");
  }, []);

  const normalPath = useMemo(() => {
    const xMin = mean - 4 * sd;
    const xMax = mean + 4 * sd;
    return Array.from({ length: 180 }, (_, index) => xMin + (index / 179) * (xMax - xMin))
      .map((x, index) => {
        const y = normalDensity(x, mean, sd);
        const svgX = mapLinear(x, xMin, xMax, padding, width - padding);
        const svgY = mapLinear(y, 0, 1, height - padding, padding);
        return `${index === 0 ? "M" : "L"} ${svgX.toFixed(2)} ${svgY.toFixed(2)}`;
      })
      .join(" ");
  }, [mean, sd]);

  const tangentY = curve(tangentX);
  const slope = derivative(tangentX);
  const xMin = -4;
  const xMax = 6;
  const yMin = -9;
  const yMax = 9;
  const tangentStart = { x: xMin, y: tangentY + slope * (xMin - tangentX) };
  const tangentEnd = { x: xMax, y: tangentY + slope * (xMax - tangentX) };
  const zScore = (observed - mean) / sd;
  const normalXMin = mean - 4 * sd;
  const normalXMax = mean + 4 * sd;
  const observedX = clamp(observed, normalXMin, normalXMax);

  function recordInteraction(type: "visualization-slider" | "visualization-probe") {
    recordLearningEvent({
      type,
      source: "calculus-stats",
      topicId
    });
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
      <div className="rounded-3xl border border-slate-200/70 bg-slate-950 p-3 dark:border-white/10">
        <svg
          data-viz-surface
          role="img"
          aria-label={mode === "tangent"
            ? t({ en: "Calculus tangent line explorer", zh: "微積分切線探索器" })
            : t({ en: "Normal distribution z-score explorer", zh: "常態分佈標準分數探索器" })}
          viewBox={`0 0 ${width} ${height}`}
          className="h-[360px] w-full sm:h-[420px]"
        >
          {mode === "tangent" ? (
            <>
              {[-4, -2, 0, 2, 4, 6].map((tick) => (
                <line key={`x-${tick}`} x1={mapLinear(tick, xMin, xMax, padding, width - padding)} x2={mapLinear(tick, xMin, xMax, padding, width - padding)} y1={padding} y2={height - padding} className="stroke-white/10" />
              ))}
              {[-8, -4, 0, 4, 8].map((tick) => (
                <line key={`y-${tick}`} x1={padding} x2={width - padding} y1={mapLinear(tick, yMin, yMax, height - padding, padding)} y2={mapLinear(tick, yMin, yMax, height - padding, padding)} className="stroke-white/10" />
              ))}
              <line x1={padding} x2={width - padding} y1={mapLinear(0, yMin, yMax, height - padding, padding)} y2={mapLinear(0, yMin, yMax, height - padding, padding)} className="stroke-white/35" />
              <motion.path data-viz-mark d={tangentPath} fill="none" stroke="#22d3ee" strokeWidth="4" strokeLinecap="round" initial={false} animate={{ pathLength: 1 }} />
              <line
                data-viz-mark
                x1={mapLinear(tangentStart.x, xMin, xMax, padding, width - padding)}
                y1={mapLinear(tangentStart.y, yMin, yMax, height - padding, padding)}
                x2={mapLinear(tangentEnd.x, xMin, xMax, padding, width - padding)}
                y2={mapLinear(tangentEnd.y, yMin, yMax, height - padding, padding)}
                stroke="#f472b6"
                strokeWidth="3"
                strokeDasharray="8 8"
              />
              <circle
                data-viz-mark
                cx={mapLinear(tangentX, xMin, xMax, padding, width - padding)}
                cy={mapLinear(tangentY, yMin, yMax, height - padding, padding)}
                r="8"
                fill="#f472b6"
                stroke="white"
                strokeWidth="2"
              />
              <text x="56" y="58" className="fill-white text-lg font-bold">
                f'({formatNumber(tangentX, 1)}) = {formatNumber(slope, 2)}
              </text>
            </>
          ) : (
            <>
              {[-3, -2, -1, 0, 1, 2, 3].map((z) => {
                const x = mean + z * sd;
                return (
                  <g key={z}>
                    <line x1={mapLinear(x, normalXMin, normalXMax, padding, width - padding)} x2={mapLinear(x, normalXMin, normalXMax, padding, width - padding)} y1={padding} y2={height - padding} className="stroke-white/10" />
                    <text x={mapLinear(x, normalXMin, normalXMax, padding, width - padding)} y={height - 14} textAnchor="middle" className="fill-white/35 text-[10px]">{z}</text>
                  </g>
                );
              })}
              <motion.path data-viz-mark d={normalPath} fill="none" stroke="#a3e635" strokeWidth="4" strokeLinecap="round" initial={false} animate={{ pathLength: 1 }} />
              <line
                data-viz-mark
                x1={mapLinear(observedX, normalXMin, normalXMax, padding, width - padding)}
                x2={mapLinear(observedX, normalXMin, normalXMax, padding, width - padding)}
                y1={padding}
                y2={height - padding}
                stroke="#f472b6"
                strokeWidth="3"
                strokeDasharray="8 8"
              />
              <text x="56" y="58" className="fill-white text-base font-bold">
                z = {formatNumber(zScore, 2)}
              </text>
            </>
          )}
        </svg>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2 rounded-3xl border border-slate-200/70 bg-white/70 p-2 dark:border-white/10 dark:bg-white/[0.055]">
          {([
            ["tangent", t({ en: "Tangent", zh: "切線" })],
            ["normal", t({ en: "Normal", zh: "常態分佈" })]
          ] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => {
                setMode(value);
                recordInteraction("visualization-probe");
              }}
              className={`focus-ring rounded-2xl px-4 py-3 text-sm font-black transition ${mode === value ? "bg-slate-950 text-white dark:bg-white dark:text-slate-950" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/[0.08]"}`}
            >
              {label}
            </button>
          ))}
        </div>

        {mode === "tangent" ? (
          <label className="block rounded-3xl border border-slate-200/70 bg-white/70 p-5 dark:border-white/10 dark:bg-white/[0.055]">
            <span className="flex items-center justify-between text-sm font-bold text-slate-700 dark:text-slate-200">
              {t({ en: "Tangent point x", zh: "切點 x 坐標" })}
              <strong>{formatNumber(tangentX, 1)}</strong>
            </span>
            <input
              type="range"
              min="-3.5"
              max="5.5"
              step="0.1"
              value={tangentX}
              onChange={(event) => setTangentX(Number(event.target.value))}
              onPointerUp={() => recordInteraction("visualization-slider")}
              onKeyUp={() => recordInteraction("visualization-slider")}
              className="mt-4 w-full accent-cyan-500"
            />
            <p className="mt-4 text-sm leading-6 text-slate-600 dark:text-slate-300">
              {t({ en: "The tangent line is the local linear model. Its gradient is the instantaneous rate of change.", zh: "切線是局部線性模型，它的斜率代表瞬時變化率。" })}
            </p>
          </label>
        ) : (
          <div className="space-y-4">
            {[
              { label: t({ en: "Mean", zh: "平均數" }), value: mean, min: 30, max: 70, step: 1, setter: setMean },
              { label: t({ en: "Standard deviation", zh: "標準差" }), value: sd, min: 4, max: 18, step: 1, setter: setSd },
              { label: t({ en: "Observed value", zh: "觀察值" }), value: observed, min: 20, max: 90, step: 1, setter: setObserved }
            ].map((control) => (
              <label key={control.label} className="block rounded-3xl border border-slate-200/70 bg-white/70 p-5 dark:border-white/10 dark:bg-white/[0.055]">
                <span className="flex items-center justify-between text-sm font-bold text-slate-700 dark:text-slate-200">
                  {control.label}
                  <strong>{formatNumber(control.value, 0)}</strong>
                </span>
                <input
                  type="range"
                  min={control.min}
                  max={control.max}
                  step={control.step}
                  value={control.value}
                  onChange={(event) => control.setter(Number(event.target.value))}
                  onPointerUp={() => recordInteraction("visualization-slider")}
                  onKeyUp={() => recordInteraction("visualization-slider")}
                  className="mt-4 w-full accent-cyan-500"
                />
              </label>
            ))}
            <MathText
              as="p"
              text={isChineseLanguage(language) ? simplifyChineseText(String.raw`z = \frac{x - \text{平均數}}{\text{標準差}} = ${formatNumber(zScore, 2)}`, language) : String.raw`z = \frac{x - \text{mean}}{\text{standard deviation}} = ${formatNumber(zScore, 2)}`}
              renderBareMath
              className="rounded-2xl bg-lime-500/10 p-4 text-sm leading-6 text-lime-700 dark:text-lime-200"
            />
          </div>
        )}
      </div>
    </div>
  );
}
