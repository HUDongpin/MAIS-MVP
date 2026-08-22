"use client";

import { PointerEvent, useMemo, useRef, useState } from "react";
import { motion } from "@/components/ui/Motion";
import { MathText } from "@/components/math/MathText";
import { useSettings } from "@/components/providers/AppProviders";
import { VisualizationResetButton } from "@/components/visualizations/VisualizationResetButton";
import { useVisualizationTheme } from "@/components/visualizations/visualizationTheme";
import { buildQuadraticCurvePath } from "@/components/visualizations/rawCurveGeometry";
import { clamp, formatNumber, quadraticRoots } from "@/lib/math";

const width = 640;
const height = 420;
const padding = 36;
const xMin = -8;
const xMax = 8;
const yMin = -10;
const yMax = 10;
const coefficientEpsilon = 0.0001;
const minimumQuadraticCoefficientMagnitude = 0.1;
const moduleId = "function-graph-explorer";
const graphCursor = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Cpath d='M12 2v20M2 12h20' stroke='%2322c55e' stroke-width='2.4' stroke-linecap='round'/%3E%3Ccircle cx='12' cy='12' r='4' fill='none' stroke='white' stroke-width='1.5'/%3E%3Ccircle cx='12' cy='12' r='2' fill='%2322c55e'/%3E%3C/svg%3E") 12 12, crosshair`;

const graphSurfaceBaseClassName = "relative flex min-h-[390px] items-center justify-center overflow-hidden rounded-3xl border p-3 sm:min-h-[450px]";
const graphThemes = {
  dark: {
    surfaceClassName: "border-slate-200/70 bg-slate-950 shadow-inner dark:border-white/10",
    background: "transparent",
    grid: "rgba(255, 255, 255, 0.1)",
    tickText: "rgba(255, 255, 255, 0.35)",
    axis: "rgba(255, 255, 255, 0.35)",
    axisLabel: "#cffafe",
    curve: "url(#quadraticStroke)",
    curveFilter: "url(#graphGlow)",
    vertexGuide: "#22d3ee",
    vertexFill: "#22d3ee",
    vertexLabel: "#a5f3fc",
    rootFill: "#f472b6",
    pointStroke: "#ffffff",
    cursorAccent: "#22c55e",
    cursorGuide: "#86efac",
    cursorLabelFill: "#020617",
    cursorLabelStroke: "rgba(34, 197, 94, 0.72)",
    cursorText: "#dcfce7"
  },
  day: {
    surfaceClassName: "border-slate-200/80 bg-white shadow-sm dark:border-slate-200/80 dark:bg-white",
    background: "#ffffff",
    grid: "#d8e0ea",
    tickText: "#64748b",
    axis: "#475569",
    axisLabel: "#0f172a",
    curve: "#0891b2",
    curveFilter: undefined,
    vertexGuide: "#0ea5b7",
    vertexFill: "#22d3ee",
    vertexLabel: "#0e7490",
    rootFill: "#ec4899",
    pointStroke: "#ffffff",
    cursorAccent: "#16a34a",
    cursorGuide: "#4ade80",
    cursorLabelFill: "#ffffff",
    cursorLabelStroke: "rgba(14, 165, 183, 0.55)",
    cursorText: "#0f766e"
  }
} as const;

type FunctionGraphExplorerProps = {
  topicId?: string;
  showAxisLabels?: boolean;
  initialCoefficients?: FunctionGraphCoefficients;
  compact?: boolean;
};

export type FunctionGraphCoefficients = {
  a: number;
  b: number;
  c: number;
};

function mapX(x: number) {
  return padding + ((x - xMin) / (xMax - xMin)) * (width - padding * 2);
}

function mapVisibleX(x: number) {
  return mapX(clamp(x, xMin, xMax));
}

function mapY(y: number) {
  return height - padding - ((y - yMin) / (yMax - yMin)) * (height - padding * 2);
}

function mapVisibleY(y: number) {
  return mapY(clamp(y, yMin, yMax));
}

function unmapX(svgX: number) {
  return xMin + ((svgX - padding) / (width - padding * 2)) * (xMax - xMin);
}

function unmapY(svgY: number) {
  return yMin + ((height - padding - svgY) / (height - padding * 2)) * (yMax - yMin);
}

function isInsidePlot(svgX: number, svgY: number) {
  return svgX >= padding && svgX <= width - padding && svgY >= padding && svgY <= height - padding;
}

function getSvgPoint(svg: SVGSVGElement | null, event: PointerEvent<SVGSVGElement>) {
  const screenMatrix = svg?.getScreenCTM();
  if (!svg || !screenMatrix) return null;

  const point = svg.createSVGPoint();
  point.x = event.clientX;
  point.y = event.clientY;
  const svgPoint = point.matrixTransform(screenMatrix.inverse());
  return { x: svgPoint.x, y: svgPoint.y };
}

function formatCoefficient(value: number) {
  if (!Number.isFinite(value)) return "—";
  return value.toFixed(1);
}

function normalizeQuadraticCoefficient(value: number, fallback = 1) {
  if (!Number.isFinite(value)) return fallback;
  if (Math.abs(value) >= minimumQuadraticCoefficientMagnitude) return value;
  return fallback < 0 ? -minimumQuadraticCoefficientMagnitude : minimumQuadraticCoefficientMagnitude;
}

function inlineMathSource(value: string) {
  return `\\(${value}\\)`;
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  onCommit,
  compact = false
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  onCommit: () => void;
  compact?: boolean;
}) {
  return (
    <label className={`block border border-slate-200/70 bg-white/70 dark:border-white/10 dark:bg-white/[0.055] ${compact ? "rounded-xl p-3" : "rounded-2xl p-4"}`}>
      <span className={`flex items-center justify-between gap-3 font-bold text-slate-700 dark:text-slate-200 ${compact ? "text-xs" : "text-sm"}`}>
        {label}
        <span className="rounded-full bg-cyan-500/15 px-2 py-1 text-cyan-600 dark:text-cyan-300">{formatNumber(value, 1)}</span>
      </span>
      <input
        className={`${compact ? "mt-3" : "mt-4"} w-full accent-cyan-500`}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        onPointerUp={onCommit}
        onKeyUp={onCommit}
        aria-label={label}
      />
    </label>
  );
}

export function FunctionGraphExplorer({
  topicId = "quadratic-patterns",
  showAxisLabels = true,
  initialCoefficients,
  compact = false
}: FunctionGraphExplorerProps) {
  const { recordLearningEvent, t } = useSettings();
  const vizTheme = useVisualizationTheme();
  const svgRef = useRef<SVGSVGElement | null>(null);
  const initialA = normalizeQuadraticCoefficient(initialCoefficients?.a ?? 1);
  const initialB = initialCoefficients?.b ?? -2;
  const initialC = initialCoefficients?.c ?? -3;
  const [a, setA] = useState(initialA);
  const [b, setB] = useState(initialB);
  const [c, setC] = useState(initialC);
  const [cursorPoint, setCursorPoint] = useState<{ x: number; y: number } | null>(null);

  const path = useMemo(() => buildQuadraticCurvePath(a, b, c), [a, b, c]);
  const roots = useMemo(() => quadraticRoots(a, b, c), [a, b, c]);
  const rootKind = Math.abs(a) < coefficientEpsilon && Math.abs(b) < coefficientEpsilon && Math.abs(c) < coefficientEpsilon
    ? "all-real"
    : roots.length
      ? "finite"
      : "none";
  const functionFamily = Math.abs(a) >= coefficientEpsilon ? "quadratic" : Math.abs(b) >= coefficientEpsilon ? "linear" : "constant";
  const vertex = Math.abs(a) > coefficientEpsilon ? { x: -b / (2 * a), y: a * (-b / (2 * a)) ** 2 + b * (-b / (2 * a)) + c } : null;
  const xTicks = Array.from({ length: 17 }, (_, index) => index - 8);
  const yTicks = Array.from({ length: 21 }, (_, index) => index - 10);
  const cursorLabel = cursorPoint ? `(${formatNumber(cursorPoint.x)}, ${formatNumber(cursorPoint.y)})` : "";
  const cursorLabelWidth = Math.max(88, cursorLabel.length * 7 + 18);
  const cursorLabelX = cursorPoint ? clamp(mapX(cursorPoint.x) + 12, padding, width - padding - cursorLabelWidth) : 0;
  const cursorLabelY = cursorPoint ? clamp(mapY(cursorPoint.y) - 14, padding + 18, height - padding - 8) : 0;
  const graphTheme = vizTheme.mode === "night" ? graphThemes.dark : graphThemes.day;
  const graphSurfaceClassName = `${compact ? "relative flex min-h-[230px] items-center justify-center overflow-hidden rounded-2xl border p-2" : graphSurfaceBaseClassName} ${graphTheme.surfaceClassName}`;
  const equationText = `y = ${formatCoefficient(a)}x^2 ${b >= 0 ? "+" : "-"} ${formatCoefficient(Math.abs(b))}x ${c >= 0 ? "+" : "-"} ${formatCoefficient(Math.abs(c))}`;
  const xScale = (width - padding * 2) / (xMax - xMin);
  const yScale = (height - padding * 2) / (yMax - yMin);

  function handleGraphPointer(event: PointerEvent<SVGSVGElement>) {
    const svgPoint = getSvgPoint(svgRef.current, event);
    if (!svgPoint) return;

    if (!isInsidePlot(svgPoint.x, svgPoint.y)) {
      setCursorPoint(null);
      return;
    }

    setCursorPoint({
      x: clamp(unmapX(svgPoint.x), xMin, xMax),
      y: clamp(unmapY(svgPoint.y), yMin, yMax)
    });
  }

  function recordGraphEvent(type: "visualization-slider" | "visualization-probe") {
    recordLearningEvent({
      type,
      source: "function-graph",
      topicId
    });
  }

  function resetModel() {
    setA(initialA);
    setB(initialB);
    setC(initialC);
    setCursorPoint(null);
    recordLearningEvent({
      type: "visualization-reset",
      source: "function-graph",
      topicId
    });
  }

  return (
    <div className={compact ? "grid gap-3" : "grid gap-5 xl:grid-cols-[1fr_320px]"}>
      <div className={graphSurfaceClassName}>
        <svg
          data-viz-surface
          ref={svgRef}
          role="img"
          aria-label={t({ en: "Live graph of quadratic function", zh: "二次函數即時圖像" })}
          viewBox={`0 0 ${width} ${height}`}
          className={`${compact ? "h-[220px] sm:h-[240px]" : "h-[360px] sm:h-[420px]"} w-full cursor-crosshair touch-none`}
          style={{ cursor: graphCursor }}
          onPointerDown={(event) => {
            recordGraphEvent("visualization-probe");
            handleGraphPointer(event);
          }}
          onPointerMove={handleGraphPointer}
          onPointerLeave={() => setCursorPoint(null)}
        >
          <defs>
            <clipPath id="quadraticPlotClip">
              <rect x={padding} y={padding} width={width - padding * 2} height={height - padding * 2} />
            </clipPath>
            <linearGradient id="quadraticStroke" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0%" stopColor="#22d3ee" />
              <stop offset="55%" stopColor="#8b5cf6" />
              <stop offset="100%" stopColor="#f472b6" />
            </linearGradient>
            <filter id="graphGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <rect x="0" y="0" width={width} height={height} fill={graphTheme.background} pointerEvents="all" />

          {xTicks.map((tick) => (
            <g key={`x-${tick}`}>
              <line x1={mapX(tick)} x2={mapX(tick)} y1={padding} y2={height - padding} stroke={graphTheme.grid} strokeWidth={tick === 0 ? 1.5 : 1} />
              <text x={mapX(tick)} y={height - 12} textAnchor="middle" fill={graphTheme.tickText} className="text-[10px] font-bold">{tick}</text>
            </g>
          ))}
          {yTicks.map((tick) => (
            <g key={`y-${tick}`}>
              <line x1={padding} x2={width - padding} y1={mapY(tick)} y2={mapY(tick)} stroke={graphTheme.grid} strokeWidth={tick === 0 ? 1.5 : 1} />
              {tick === 0 || tick % 2 === 0 ? <text x={18} y={mapY(tick) + 3} fill={graphTheme.tickText} className="text-[10px] font-bold">{tick}</text> : null}
            </g>
          ))}
          <line x1={padding} x2={width - padding} y1={mapY(0)} y2={mapY(0)} stroke={graphTheme.axis} strokeWidth="2.2" />
          <line x1={mapX(0)} x2={mapX(0)} y1={padding} y2={height - padding} stroke={graphTheme.axis} strokeWidth="2.2" />
          {showAxisLabels ? (
            <g aria-hidden="true" pointerEvents="none">
              <text x={width - 13} y={mapY(0) + 7} textAnchor="middle" fill={graphTheme.axisLabel} className="text-[13px] font-black">
                x
              </text>
              <text x={mapX(0)} y={padding - 10} textAnchor="middle" fill={graphTheme.axisLabel} className="text-[13px] font-black">
                y
              </text>
            </g>
          ) : null}
          <motion.path
            data-viz-mark
            data-viz-name="quadratic curve"
            data-viz-a={formatNumber(a, 6)}
            data-viz-b={formatNumber(b, 6)}
            data-viz-c={formatNumber(c, 6)}
            data-viz-family={functionFamily}
            data-viz-root-kind={rootKind}
            data-viz-root-count={rootKind === "all-real" ? "infinite" : roots.length}
            data-viz-roots={rootKind === "all-real" ? "all-real" : roots.map((root) => formatNumber(root, 6)).join(",")}
            data-viz-x-min={xMin}
            data-viz-x-max={xMax}
            data-viz-y-min={yMin}
            data-viz-y-max={yMax}
            data-viz-x-scale={formatNumber(xScale, 6)}
            data-viz-y-scale={formatNumber(yScale, 6)}
            data-viz-sample-count="180"
            d={path}
            fill="none"
            stroke={graphTheme.curve}
            strokeWidth="4"
            strokeLinecap="round"
            clipPath="url(#quadraticPlotClip)"
            filter={graphTheme.curveFilter}
            initial={false}
            animate={{ pathLength: 1 }}
          />
          {rootKind === "all-real" ? (
            <line
              data-viz-mark
              data-viz-name="all x-intercepts"
              data-viz-root-kind={rootKind}
              data-viz-root-count="infinite"
              data-viz-y="0"
              x1={padding}
              x2={width - padding}
              y1={mapY(0)}
              y2={mapY(0)}
              stroke={graphTheme.rootFill}
              strokeWidth="7"
              strokeLinecap="round"
              opacity="0.48"
            />
          ) : null}
          {vertex ? (
            <g>
              <line x1={mapVisibleX(vertex.x)} x2={mapVisibleX(vertex.x)} y1={padding} y2={height - padding} stroke={graphTheme.vertexGuide} strokeDasharray="5 7" opacity="0.45" />
              <motion.circle
                data-viz-mark
                data-viz-name="quadratic vertex"
                data-viz-a={formatNumber(a, 6)}
                data-viz-b={formatNumber(b, 6)}
                data-viz-c={formatNumber(c, 6)}
                data-viz-x={formatNumber(vertex.x, 2)}
                data-viz-y={formatNumber(vertex.y, 2)}
                data-viz-visible-x={formatNumber(clamp(vertex.x, xMin, xMax), 6)}
                data-viz-visible-y={formatNumber(clamp(vertex.y, yMin, yMax), 6)}
                data-viz-clipped={String(vertex.x < xMin || vertex.x > xMax || vertex.y < yMin || vertex.y > yMax)}
                cx={mapVisibleX(vertex.x)}
                cy={mapVisibleY(vertex.y)}
                r="7"
                fill={graphTheme.vertexFill}
                stroke={graphTheme.pointStroke}
                strokeWidth="2"
                initial={false}
                animate={{ cx: mapVisibleX(vertex.x), cy: mapVisibleY(vertex.y) }}
              />
              <text x={clamp(mapVisibleX(vertex.x) + 10, padding + 8, width - padding - 18)} y={clamp(mapVisibleY(vertex.y) - 10, padding + 10, height - padding - 8)} fill={graphTheme.vertexLabel} className="text-xs font-bold">V</text>
            </g>
          ) : null}
          {roots.map((root) => (
            root >= xMin && root <= xMax ? (
              <circle
                data-viz-mark
                data-viz-name="quadratic root"
                data-viz-a={formatNumber(a, 6)}
                data-viz-b={formatNumber(b, 6)}
                data-viz-c={formatNumber(c, 6)}
                data-viz-x={formatNumber(root, 6)}
                data-viz-y="0"
                key={root}
                cx={mapX(root)}
                cy={mapY(0)}
                r="5"
                fill={graphTheme.rootFill}
                stroke={graphTheme.pointStroke}
                strokeWidth="2"
              />
            ) : null
          ))}
          {cursorPoint ? (
            <g pointerEvents="none">
              <line x1={mapX(cursorPoint.x)} x2={mapX(cursorPoint.x)} y1={mapVisibleY(cursorPoint.y)} y2={mapY(0)} stroke={graphTheme.cursorGuide} strokeDasharray="4 6" opacity="0.55" />
              <line x1={mapX(0)} x2={mapX(cursorPoint.x)} y1={mapVisibleY(cursorPoint.y)} y2={mapVisibleY(cursorPoint.y)} stroke={graphTheme.cursorGuide} strokeDasharray="4 6" opacity="0.55" />
              <circle data-viz-mark data-viz-name="cursor point" data-viz-x={formatNumber(cursorPoint.x, 2)} data-viz-y={formatNumber(cursorPoint.y, 2)} cx={mapX(cursorPoint.x)} cy={mapVisibleY(cursorPoint.y)} r="7" fill={graphTheme.cursorAccent} stroke={graphTheme.pointStroke} strokeWidth="2.5" />
              <rect x={cursorLabelX} y={cursorLabelY - 18} width={cursorLabelWidth} height="26" rx="9" fill={graphTheme.cursorLabelFill} stroke={graphTheme.cursorLabelStroke} />
              <text data-viz-overlap-ok x={cursorLabelX + 9} y={cursorLabelY} fill={graphTheme.cursorText} className="text-[11px] font-bold">{cursorLabel}</text>
            </g>
          ) : null}
        </svg>
      </div>

      <div className={compact ? "space-y-3" : "space-y-4"}>
        <div className={`border border-slate-200/70 bg-white/70 dark:border-white/10 dark:bg-white/[0.055] ${compact ? "rounded-2xl p-3" : "rounded-3xl p-5"}`}>
          <MathText
            as="p"
            text={inlineMathSource(equationText)}
            ariaLabel={equationText}
            normalizeMath={false}
            className={`${compact ? "text-lg" : "text-2xl"} text-slate-950 dark:text-white`}
          />
        </div>
        <Slider compact={compact} label={t({ en: "a: stretch / flip", zh: "a：伸縮或反向" })} value={a} min={-3} max={3} step={0.1} onChange={(next) => setA((current) => normalizeQuadraticCoefficient(next, current))} onCommit={() => recordGraphEvent("visualization-slider")} />
        <Slider compact={compact} label={t({ en: "b: horizontal shift", zh: "b：水平平移" })} value={b} min={-6} max={6} step={0.1} onChange={setB} onCommit={() => recordGraphEvent("visualization-slider")} />
        <Slider compact={compact} label={t({ en: "c: y-intercept", zh: "c：y 截距" })} value={c} min={-8} max={8} step={0.1} onChange={setC} onCommit={() => recordGraphEvent("visualization-slider")} />
        <div className={`grid gap-3 border border-slate-200/70 bg-white/70 dark:border-white/10 dark:bg-white/[0.055] ${compact ? "rounded-2xl p-3 text-xs" : "rounded-3xl p-5 text-sm"}`}>
          <div className="flex justify-between gap-3"><span className="text-slate-500 dark:text-slate-400">{t({ en: "Cursor coordinate", zh: "游標坐標" })}</span><strong>{cursorPoint ? <MathText text={inlineMathSource(cursorLabel)} ariaLabel={cursorLabel} normalizeMath={false} /> : "—"}</strong></div>
          <div className="flex justify-between gap-3"><span className="text-slate-500 dark:text-slate-400">{t({ en: "Vertex", zh: "頂點" })}</span><strong>{vertex ? <MathText text={inlineMathSource(`(${formatNumber(vertex.x)}, ${formatNumber(vertex.y)})`)} normalizeMath={false} /> : "—"}</strong></div>
          <div className="flex justify-between gap-3"><span className="text-slate-500 dark:text-slate-400">{t({ en: "Axis of symmetry", zh: "對稱軸" })}</span><strong>{vertex ? <MathText text={inlineMathSource(`x = ${formatNumber(vertex.x)}`)} normalizeMath={false} /> : "—"}</strong></div>
          <div className="flex justify-between gap-3">
            <span className="text-slate-500 dark:text-slate-400">{t({ en: "x-intercepts", zh: "x 截距" })}</span>
            <strong>
              {rootKind === "all-real" ? (
                <MathText text={inlineMathSource(String.raw`x \in \mathbb{R}`)} ariaLabel={t({ en: "all real x", zh: "所有實數 x", zhHans: "所有实数 x" })} normalizeMath={false} />
              ) : roots.length ? (
                <MathText text={inlineMathSource(roots.map((root) => formatNumber(root)).join(", "))} normalizeMath={false} />
              ) : (
                t({ en: "none", zh: "沒有" })
              )}
            </strong>
          </div>
          <div className="flex justify-between gap-3"><span className="text-slate-500 dark:text-slate-400">{t({ en: "y-intercept", zh: "y 截距" })}</span><strong><MathText text={inlineMathSource(formatNumber(c))} normalizeMath={false} /></strong></div>
        </div>
        <VisualizationResetButton moduleId={moduleId} topicId={topicId} onReset={resetModel} />
      </div>
    </div>
  );
}
