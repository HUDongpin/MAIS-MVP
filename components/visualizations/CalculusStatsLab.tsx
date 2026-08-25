"use client";

import { useMemo, useState } from "react";
import { motion } from "@/components/ui/Motion";
import { MathText } from "@/components/math/MathText";
import { useSettings } from "@/components/providers/AppProviders";
import { VisualizationResetButton } from "@/components/visualizations/VisualizationResetButton";
import { useVisualizationTheme } from "@/components/visualizations/visualizationTheme";
import {
  buildCalculusTangentCurvePath,
  evaluateCalculusCubic
} from "@/components/visualizations/rawCurveGeometry";
import { isChineseLanguage, simplifyChineseText } from "@/lib/i18n";
import { clamp, formatNumber } from "@/lib/math";

type LabMode = "tangent" | "normal";

export function calculusStatsModesForTopic(topicId: string): readonly LabMode[] {
  return topicId === "statistics-s6" ? ["normal"] : ["tangent", "normal"];
}

const width = 640;
const height = 420;
const padding = 42;
const moduleId = "calculus-stats-lab";

function mapLinear(value: number, min: number, max: number, screenMin: number, screenMax: number) {
  return screenMin + ((value - min) / (max - min)) * (screenMax - screenMin);
}

function derivative(x: number) {
  return 0.36 * x ** 2 - 1.2 * x + 1;
}

function normalRelativeDensity(x: number, mean: number, sd: number) {
  return Math.exp(-0.5 * ((x - mean) / sd) ** 2);
}

function normalPdf(x: number, mean: number, sd: number) {
  return normalRelativeDensity(x, mean, sd) / (sd * Math.sqrt(2 * Math.PI));
}

type GraphPoint = { x: number; y: number };

function clippedLineSegment({
  xMin,
  xMax,
  yMin,
  yMax,
  x0,
  y0,
  slope
}: {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  x0: number;
  y0: number;
  slope: number;
}) {
  const epsilon = 1e-9;
  const candidates: GraphPoint[] = [];
  const lineY = (x: number) => y0 + slope * (x - x0);

  function addPoint(point: GraphPoint) {
    if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) return;
    if (point.x < xMin - epsilon || point.x > xMax + epsilon) return;
    if (point.y < yMin - epsilon || point.y > yMax + epsilon) return;
    if (candidates.some((candidate) => Math.abs(candidate.x - point.x) < 1e-6 && Math.abs(candidate.y - point.y) < 1e-6)) return;
    candidates.push({
      x: clamp(point.x, xMin, xMax),
      y: clamp(point.y, yMin, yMax)
    });
  }

  addPoint({ x: xMin, y: lineY(xMin) });
  addPoint({ x: xMax, y: lineY(xMax) });
  if (Math.abs(slope) > epsilon) {
    addPoint({ x: x0 + (yMin - y0) / slope, y: yMin });
    addPoint({ x: x0 + (yMax - y0) / slope, y: yMax });
  }

  if (candidates.length < 2) {
    return [
      { x: xMin, y: clamp(lineY(xMin), yMin, yMax) },
      { x: xMax, y: clamp(lineY(xMax), yMin, yMax) }
    ] as const;
  }

  let bestPair: readonly [GraphPoint, GraphPoint] = [candidates[0], candidates[1]];
  let bestDistance = -Infinity;
  for (let firstIndex = 0; firstIndex < candidates.length; firstIndex += 1) {
    for (let secondIndex = firstIndex + 1; secondIndex < candidates.length; secondIndex += 1) {
      const dx = candidates[firstIndex].x - candidates[secondIndex].x;
      const dy = candidates[firstIndex].y - candidates[secondIndex].y;
      const distance = dx * dx + dy * dy;
      if (distance > bestDistance) {
        bestDistance = distance;
        bestPair = [candidates[firstIndex], candidates[secondIndex]];
      }
    }
  }
  return bestPair;
}

export function CalculusStatsLab({ topicId = "calculus" }: { topicId?: string }) {
  const { language, recordLearningEvent, t } = useSettings();
  const vizTheme = useVisualizationTheme();
  const availableModes = calculusStatsModesForTopic(topicId);
  const [mode, setMode] = useState<LabMode>(availableModes[0]);
  const activeMode = availableModes.includes(mode) ? mode : availableModes[0];
  const [tangentX, setTangentX] = useState(2);
  const [mean, setMean] = useState(50);
  const [sd, setSd] = useState(10);
  const [observed, setObserved] = useState(65);

  const tangentPath = useMemo(() => buildCalculusTangentCurvePath(), []);

  const normalPath = useMemo(() => {
    const xMin = mean - 4 * sd;
    const xMax = mean + 4 * sd;
    return Array.from({ length: 180 }, (_, index) => xMin + (index / 179) * (xMax - xMin))
      .map((x, index) => {
        const y = normalRelativeDensity(x, mean, sd);
        const svgX = mapLinear(x, xMin, xMax, padding, width - padding);
        const svgY = mapLinear(y, 0, 1, height - padding, padding);
        return `${index === 0 ? "M" : "L"} ${svgX.toFixed(2)} ${svgY.toFixed(2)}`;
      })
      .join(" ");
  }, [mean, sd]);

  const tangentY = evaluateCalculusCubic(tangentX);
  const slope = derivative(tangentX);
  const xMin = -4;
  const xMax = 6;
  const yMin = -9;
  const yMax = 9;
  const tangentStart = { x: xMin, y: tangentY + slope * (xMin - tangentX) };
  const tangentEnd = { x: xMax, y: tangentY + slope * (xMax - tangentX) };
  const tangentVisibleSegment = clippedLineSegment({ xMin, xMax, yMin, yMax, x0: tangentX, y0: tangentY, slope });
  const tangentVisibleY = clamp(tangentY, yMin, yMax);
  const tangentPointClipped = tangentVisibleY !== tangentY;
  const zScore = (observed - mean) / sd;
  const normalXMin = mean - 4 * sd;
  const normalXMax = mean + 4 * sd;
  const observedX = clamp(observed, normalXMin, normalXMax);
  const observedClipped = observedX !== observed;
  const visibleZScore = (observedX - mean) / sd;
  const visibleRelativeDensity = normalRelativeDensity(observedX, mean, sd);
  const visiblePdf = normalPdf(observedX, mean, sd);
  const observedRelativeDensity = normalRelativeDensity(observed, mean, sd);
  const observedPdf = normalPdf(observed, mean, sd);

  function recordInteraction(type: "visualization-slider" | "visualization-probe") {
    recordLearningEvent({
      type,
      source: "calculus-stats",
      topicId
    });
  }

  function resetModel() {
    setMode(availableModes[0]);
    setTangentX(2);
    setMean(50);
    setSd(10);
    setObserved(65);
    recordLearningEvent({
      type: "visualization-reset",
      source: "calculus-stats",
      topicId
    });
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
      <div className={vizTheme.compactSurfaceClassName}>
        <svg
          data-viz-surface
          role="img"
          aria-label={activeMode === "tangent"
            ? t({ en: "Calculus tangent line explorer", zh: "微積分切線探索器" })
            : t({ en: "Normal distribution z-score explorer", zh: "常態分佈標準分數探索器" })}
          viewBox={`0 0 ${width} ${height}`}
          className="h-[360px] w-full sm:h-[420px]"
        >
          <rect x="0" y="0" width={width} height={height} fill={vizTheme.svgBackground} />
          <defs>
            <clipPath id="calculusTangentPlotClip">
              <rect x={padding} y={padding} width={width - padding * 2} height={height - padding * 2} />
            </clipPath>
          </defs>
          {activeMode === "tangent" ? (
            <>
              {[-4, -2, 0, 2, 4, 6].map((tick) => (
                <g key={`x-${tick}`}>
                  <line x1={mapLinear(tick, xMin, xMax, padding, width - padding)} x2={mapLinear(tick, xMin, xMax, padding, width - padding)} y1={padding} y2={height - padding} stroke={vizTheme.grid} />
                  <text data-viz-name="axis tick label" x={mapLinear(tick, xMin, xMax, padding, width - padding)} y={height - 14} textAnchor="middle" fill={vizTheme.textMuted} className="text-[12px] font-black">{tick}</text>
                </g>
              ))}
              {[-8, -4, 0, 4, 8].map((tick) => (
                <g key={`y-${tick}`}>
                  <line x1={padding} x2={width - padding} y1={mapLinear(tick, yMin, yMax, height - padding, padding)} y2={mapLinear(tick, yMin, yMax, height - padding, padding)} stroke={vizTheme.grid} />
                  <text data-viz-name="axis tick label" x={18} y={mapLinear(tick, yMin, yMax, height - padding, padding) + 3} fill={vizTheme.textMuted} className="text-[12px] font-black">{tick}</text>
                </g>
              ))}
              <line x1={padding} x2={width - padding} y1={mapLinear(0, yMin, yMax, height - padding, padding)} y2={mapLinear(0, yMin, yMax, height - padding, padding)} stroke={vizTheme.axisStrong} strokeWidth="2.2" />
              <line x1={mapLinear(0, xMin, xMax, padding, width - padding)} x2={mapLinear(0, xMin, xMax, padding, width - padding)} y1={padding} y2={height - padding} stroke={vizTheme.axisStrong} strokeWidth="2.2" />
              <g aria-hidden="true" pointerEvents="none">
                <text x={width - padding + 8} y={mapLinear(0, yMin, yMax, height - padding, padding) + 18} fill={vizTheme.labelText} className="text-sm font-black">x</text>
                <text x={mapLinear(0, xMin, xMax, padding, width - padding) + 12} y={padding - 12} fill={vizTheme.labelText} className="text-sm font-black">y</text>
              </g>
              <motion.path
                data-viz-mark
                data-viz-name="cubic function"
                data-viz-function="f(x)=0.12x^3-0.6x^2+x+1"
                data-viz-x-min={xMin}
                data-viz-x-max={xMax}
                data-viz-y-min={yMin}
                data-viz-y-max={yMax}
                d={tangentPath}
                fill="none"
                stroke="#22d3ee"
                strokeWidth="4"
                strokeLinecap="round"
                clipPath="url(#calculusTangentPlotClip)"
                initial={false}
                animate={{ pathLength: 1 }}
              />
              <line
                data-viz-mark
                data-viz-name="tangent line"
                data-viz-tangent-x={formatNumber(tangentX, 4)}
                data-viz-tangent-y={formatNumber(tangentY, 4)}
                data-viz-slope={formatNumber(slope, 4)}
                data-viz-y-at-x-min={formatNumber(tangentStart.y, 4)}
                data-viz-y-at-x-max={formatNumber(tangentEnd.y, 4)}
                data-viz-visible-start-x={formatNumber(tangentVisibleSegment[0].x, 4)}
                data-viz-visible-start-y={formatNumber(tangentVisibleSegment[0].y, 4)}
                data-viz-visible-end-x={formatNumber(tangentVisibleSegment[1].x, 4)}
                data-viz-visible-end-y={formatNumber(tangentVisibleSegment[1].y, 4)}
                x1={mapLinear(tangentVisibleSegment[0].x, xMin, xMax, padding, width - padding)}
                y1={mapLinear(tangentVisibleSegment[0].y, yMin, yMax, height - padding, padding)}
                x2={mapLinear(tangentVisibleSegment[1].x, xMin, xMax, padding, width - padding)}
                y2={mapLinear(tangentVisibleSegment[1].y, yMin, yMax, height - padding, padding)}
                stroke="#f472b6"
                strokeWidth="3"
                strokeDasharray="8 8"
              />
              <circle
                data-viz-mark
                data-viz-name="tangent point"
                data-viz-x={formatNumber(tangentX, 4)}
                data-viz-y={formatNumber(tangentY, 4)}
                data-viz-visible-y={formatNumber(tangentVisibleY, 4)}
                data-viz-clipped={String(tangentPointClipped)}
                data-viz-slope={formatNumber(slope, 4)}
                cx={mapLinear(tangentX, xMin, xMax, padding, width - padding)}
                cy={mapLinear(tangentVisibleY, yMin, yMax, height - padding, padding)}
                r="8"
                fill="#f472b6"
                stroke={vizTheme.pointStroke}
                strokeWidth="2"
              />
              <text x="56" y="58" fill={vizTheme.text} className="text-lg font-bold">
                f'({formatNumber(tangentX, 1)}) = {formatNumber(slope, 2)}
              </text>
            </>
          ) : (
            <>
              {[0, 0.5, 1].map((tick) => (
                <g key={`density-${tick}`}>
                  <line x1={padding} x2={width - padding} y1={mapLinear(tick, 0, 1, height - padding, padding)} y2={mapLinear(tick, 0, 1, height - padding, padding)} stroke={tick === 0 ? vizTheme.axisStrong : vizTheme.grid} strokeWidth={tick === 0 ? 2.2 : 1} />
                  <text x="18" y={mapLinear(tick, 0, 1, height - padding, padding) + 3} fill={vizTheme.tickText} className="text-[10px] font-bold">{formatNumber(tick, tick === 0 || tick === 1 ? 0 : 1)}</text>
                </g>
              ))}
              {[-3, -2, -1, 0, 1, 2, 3].map((z) => {
                const x = mean + z * sd;
                return (
                  <g key={z}>
                    <line x1={mapLinear(x, normalXMin, normalXMax, padding, width - padding)} x2={mapLinear(x, normalXMin, normalXMax, padding, width - padding)} y1={padding} y2={height - padding} stroke={vizTheme.grid} />
                    <text x={mapLinear(x, normalXMin, normalXMax, padding, width - padding)} y={height - 14} textAnchor="middle" fill={vizTheme.tickText} className="text-[10px]">{z}</text>
                  </g>
                );
              })}
              <line x1={padding} x2={padding} y1={padding} y2={height - padding} stroke={vizTheme.axisStrong} strokeWidth="2.2" />
              <g aria-hidden="true" pointerEvents="none">
                <text x={width - padding + 8} y={height - padding - 10} fill={vizTheme.labelText} className="text-sm font-black">x: z</text>
                <text x={padding + 12} y={padding - 12} fill={vizTheme.labelText} className="text-sm font-black">{t({ en: "y: relative density", zh: "y：相對密度" })}</text>
              </g>
              <motion.path
                data-viz-mark
                data-viz-name="normal curve"
                data-viz-density-mode="relative"
                data-viz-mean={mean}
                data-viz-standard-deviation={sd}
                d={normalPath}
                fill="none"
                stroke="#a3e635"
                strokeWidth="4"
                strokeLinecap="round"
                initial={false}
                animate={{ pathLength: 1 }}
              />
              <line
                data-viz-mark
                data-viz-name="observed z marker"
                data-viz-observed={observed}
                data-viz-mean={mean}
                data-viz-standard-deviation={sd}
                data-viz-z-score={formatNumber(zScore, 4)}
                data-viz-relative-density={formatNumber(observedRelativeDensity, 4)}
                data-viz-pdf={formatNumber(observedPdf, 6)}
                data-viz-clamped-observed={formatNumber(observedX, 4)}
                data-viz-visible-observed={formatNumber(observedX, 4)}
                data-viz-visible-z-score={formatNumber(visibleZScore, 4)}
                data-viz-visible-relative-density={formatNumber(visibleRelativeDensity, 4)}
                data-viz-visible-pdf={formatNumber(visiblePdf, 6)}
                data-viz-clipped={String(observedClipped)}
                x1={mapLinear(observedX, normalXMin, normalXMax, padding, width - padding)}
                x2={mapLinear(observedX, normalXMin, normalXMax, padding, width - padding)}
                y1={padding}
                y2={height - padding}
                stroke="#f472b6"
                strokeWidth="3"
                strokeDasharray="8 8"
              />
              <text x="56" y="58" fill={vizTheme.text} className="text-base font-bold">
                z = {formatNumber(zScore, 2)}
              </text>
            </>
          )}
        </svg>
      </div>

      <div className="space-y-4">
        {availableModes.length > 1 ? (
          <div className="grid grid-cols-2 gap-2 rounded-3xl border border-slate-200/70 bg-white/70 p-2 dark:border-white/10 dark:bg-white/[0.055]">
            {availableModes.map((value) => {
              const label = value === "tangent"
                ? t({ en: "Tangent", zh: "切線" })
                : t({ en: "Normal", zh: "常態分佈" });
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    setMode(value);
                    recordInteraction("visualization-probe");
                  }}
                  className={`focus-ring rounded-2xl px-4 py-3 text-sm font-black transition ${activeMode === value ? "bg-slate-950 text-white dark:bg-white dark:text-slate-950" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/[0.08]"}`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        ) : null}

        {activeMode === "tangent" ? (
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
        <VisualizationResetButton moduleId={moduleId} topicId={topicId} onReset={resetModel} />
      </div>
    </div>
  );
}
