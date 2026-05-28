"use client";

import { useMemo, useState } from "react";
import { useSettings } from "@/components/providers/AppProviders";
import {
  getPrimaryVisualizationLabForTopic,
  getVisualizationLabByLabId,
  type FeaturedLabDefinition,
  type VisualizationTemplateId
} from "@/data/visualizationLabs";
import { clamp, formatNumber } from "@/lib/math";

const width = 640;
const height = 360;
const panel = { x: 34, y: 34, width: 572, height: 292 };

function polylinePath(points: Array<{ x: number; y: number }>) {
  return points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(" ");
}

function graphPath(value: number, comparison: number, mode: number) {
  const strength = value / 6;
  const shift = comparison - 5;
  const points = Array.from({ length: 72 }, (_, index) => {
    const t = index / 71;
    const x = 72 + t * 496;
    const centered = (t - 0.5) * 5;
    const yValue =
      mode === 0
        ? strength * centered * centered + shift
        : mode === 1
          ? Math.sin(centered * 1.4) * value * 0.8 + shift
          : Math.log(Math.max(0.05, t * value + 1)) * 5 + shift;
    const y = clamp(216 - yValue * 12, 72, 286);
    return { x, y };
  });

  return polylinePath(points);
}

function bars(value: number, comparison: number) {
  return Array.from({ length: 6 }, (_, index) => {
    const base = index % 2 === 0 ? value : comparison;
    return clamp(24 + base * 14 + index * 4, 28, 150);
  });
}

function safeAccent(lab: FeaturedLabDefinition | null) {
  return lab?.templateConfig.accent ?? "#22d3ee";
}

function labFromProps({ labId, topicId }: { labId?: string; topicId?: string }) {
  return getVisualizationLabByLabId(labId) ?? getPrimaryVisualizationLabForTopic(topicId) ?? null;
}

function TemplateMarks({
  accent,
  comparison,
  mode,
  templateId,
  value
}: {
  accent: string;
  comparison: number;
  mode: number;
  templateId: VisualizationTemplateId;
  value: number;
}) {
  const secondary = "#f472b6";
  const gold = "#facc15";
  const soft = "rgba(255,255,255,.14)";
  const valueWidth = clamp(value * 42, 54, 420);
  const comparisonWidth = clamp(comparison * 42, 54, 420);
  const gridRows = clamp(Math.round(comparison), 2, 9);
  const gridCols = clamp(Math.round(value), 2, 9);
  const partCount = clamp(Math.round(value), 2, 10);
  const shaded = clamp(Math.round(comparison), 1, partCount);

  if (templateId === "number-line") {
    const startX = 90 + value * 18;
    const endX = 90 + (value + comparison) * 14;
    return (
      <>
        <line data-viz-mark data-viz-name="number line" x1="78" x2="562" y1="190" y2="190" stroke="white" strokeWidth="6" strokeLinecap="round" opacity="0.72" />
        {Array.from({ length: 11 }, (_, index) => (
          <line key={index} data-viz-mark data-viz-name="tick" x1={86 + index * 46} x2={86 + index * 46} y1="174" y2="206" stroke="white" strokeWidth="2.5" opacity="0.58" />
        ))}
        <path data-viz-mark data-viz-name="jump arc" d={`M ${startX} 152 C ${(startX + endX) / 2} ${70 + mode * 14} ${(startX + endX) / 2} ${70 + mode * 14} ${endX} 152`} fill="none" stroke={accent} strokeWidth="8" strokeLinecap="round" />
        <circle data-viz-mark data-viz-name="start point" cx={startX} cy="190" r="16" fill={secondary} stroke="white" strokeWidth="4" />
        <circle data-viz-mark data-viz-name="end point" cx={endX} cy="190" r="16" fill={gold} stroke="white" strokeWidth="4" />
      </>
    );
  }

  if (templateId === "base-ten") {
    return (
      <>
        {Array.from({ length: gridRows * gridCols }, (_, index) => (
          <rect key={index} data-viz-mark data-viz-name="base ten unit" x={88 + (index % gridCols) * 24} y={82 + Math.floor(index / gridCols) * 24} width="18" height="18" rx="5" fill={index % 5 === 0 ? gold : accent} opacity="0.82" />
        ))}
        {[0, 1, 2, 3, 4].map((index) => (
          <rect key={index} data-viz-mark data-viz-name="ten rod" x={354} y={84 + index * 36} width={60 + comparison * 12} height="18" rx="7" fill={index % 2 ? secondary : accent} opacity="0.78" />
        ))}
      </>
    );
  }

  if (templateId === "array-area") {
    return (
      <>
        {Array.from({ length: gridRows * gridCols }, (_, index) => (
          <rect key={index} data-viz-mark data-viz-name="array cell" x={86 + (index % gridCols) * 34} y={76 + Math.floor(index / gridCols) * 28} width="30" height="24" rx="6" fill={(index + mode) % 2 ? "rgba(244,114,182,.72)" : "rgba(34,211,238,.78)"} stroke="rgba(255,255,255,.52)" />
        ))}
        <rect data-viz-mark data-viz-name="area outline" x="78" y="68" width={gridCols * 34 + 14} height={gridRows * 28 + 14} rx="18" fill="none" stroke={gold} strokeWidth="5" />
      </>
    );
  }

  if (templateId === "fraction-bar") {
    return (
      <>
        <rect data-viz-mark data-viz-name="whole bar" x="84" y="116" width="472" height="70" rx="18" fill={soft} stroke="white" strokeWidth="4" />
        {Array.from({ length: partCount }, (_, index) => (
          <rect key={index} data-viz-mark data-viz-name="fraction part" x={84 + (472 / partCount) * index} y="116" width={472 / partCount} height="70" fill={index < shaded ? (index % 2 ? secondary : accent) : "transparent"} opacity="0.84" />
        ))}
        {Array.from({ length: partCount - 1 }, (_, index) => (
          <line key={index} data-viz-mark data-viz-name="partition" x1={84 + (472 / partCount) * (index + 1)} x2={84 + (472 / partCount) * (index + 1)} y1="116" y2="186" stroke="white" strokeWidth="3" opacity="0.75" />
        ))}
        <rect data-viz-mark data-viz-name="comparison bar" x="84" y="232" width={valueWidth} height="34" rx="12" fill={gold} opacity="0.9" />
      </>
    );
  }

  if (templateId === "clock-money-data") {
    return (
      <>
        <circle data-viz-mark data-viz-name="clock" cx="154" cy="142" r="62" fill={soft} stroke="white" strokeWidth="5" />
        <line data-viz-mark data-viz-name="hour hand" x1="154" x2="154" y1="142" y2={92 + mode * 12} stroke={accent} strokeWidth="8" strokeLinecap="round" />
        <line data-viz-mark data-viz-name="minute hand" x1="154" x2={196 + comparison * 4} y1="142" y2="142" stroke={gold} strokeWidth="7" strokeLinecap="round" />
        {bars(value, comparison).map((bar, index) => (
          <rect key={index} data-viz-mark data-viz-name="data bar" x={302 + index * 42} y={260 - bar} width="28" height={bar} rx="9" fill={index % 2 ? secondary : accent} />
        ))}
      </>
    );
  }

  if (templateId === "measurement-scale") {
    return (
      <>
        <rect data-viz-mark data-viz-name="ruler" x="74" y="220" width="492" height="44" rx="14" fill={soft} stroke="white" strokeWidth="4" />
        {Array.from({ length: 12 }, (_, index) => (
          <line key={index} data-viz-mark data-viz-name="ruler tick" x1={96 + index * 38} x2={96 + index * 38} y1="220" y2={index % 2 ? 244 : 264} stroke="white" strokeWidth="2.5" opacity="0.75" />
        ))}
        <rect data-viz-mark data-viz-name="measure object a" x="92" y="132" width={valueWidth} height="42" rx="13" fill={accent} opacity="0.86" />
        <rect data-viz-mark data-viz-name="measure object b" x="92" y="76" width={comparisonWidth} height="34" rx="11" fill={secondary} opacity="0.78" />
      </>
    );
  }

  if (templateId === "angle-geometry") {
    const angle = (value * 12 + comparison * 6 + mode * 18) * (Math.PI / 180);
    const endX = 188 + Math.cos(angle) * 206;
    const endY = 222 - Math.sin(angle) * 160;
    return (
      <>
        <line data-viz-mark data-viz-name="base ray" x1="188" x2="486" y1="222" y2="222" stroke="white" strokeWidth="8" strokeLinecap="round" />
        <line data-viz-mark data-viz-name="angle ray" x1="188" x2={endX} y1="222" y2={endY} stroke={accent} strokeWidth="8" strokeLinecap="round" />
        <path data-viz-mark data-viz-name="angle arc" d={`M 250 222 A 62 62 0 0 0 ${188 + Math.cos(angle) * 62} ${222 - Math.sin(angle) * 62}`} fill="none" stroke={secondary} strokeWidth="7" />
        <polygon data-viz-mark data-viz-name="shape" points="410,92 506,132 472,214 368,198 344,124" fill={soft} stroke={gold} strokeWidth="5" />
      </>
    );
  }

  if (templateId === "coordinate-transform") {
    const dx = comparison * 10 + mode * 8;
    const dy = value * 5;
    return (
      <>
        <line data-viz-mark data-viz-name="x axis" x1="78" x2="562" y1="200" y2="200" stroke="rgba(255,255,255,.65)" strokeWidth="4" />
        <line data-viz-mark data-viz-name="y axis" x1="320" x2="320" y1="68" y2="292" stroke="rgba(255,255,255,.65)" strokeWidth="4" />
        <polygon data-viz-mark data-viz-name="original triangle" points="174,226 242,128 292,230" fill={accent} opacity="0.72" stroke="white" strokeWidth="4" />
        <polygon data-viz-mark data-viz-name="transformed triangle" points={`${174 + dx},${226 - dy} ${242 + dx},${128 - dy} ${292 + dx},${230 - dy}`} fill={secondary} opacity="0.64" stroke="white" strokeWidth="4" strokeDasharray={mode === 2 ? "10 8" : undefined} />
      </>
    );
  }

  if (templateId === "equation-balance") {
    return (
      <>
        <line data-viz-mark data-viz-name="balance beam" x1="132" x2="508" y1={142 + mode * 8} y2={142 - mode * 8} stroke="white" strokeWidth="7" strokeLinecap="round" />
        <line data-viz-mark data-viz-name="balance stand" x1="320" x2="320" y1="142" y2="270" stroke="white" strokeWidth="6" />
        <polygon data-viz-mark data-viz-name="left pan" points="118,160 248,160 216,220 150,220" fill={accent} opacity="0.8" />
        <polygon data-viz-mark data-viz-name="right pan" points="392,160 522,160 490,220 424,220" fill={secondary} opacity="0.78" />
        {Array.from({ length: clamp(Math.round(value), 2, 8) }, (_, index) => (
          <rect key={index} data-viz-mark data-viz-name="left token" x={142 + (index % 4) * 22} y={180 - Math.floor(index / 4) * 20} width="17" height="17" rx="5" fill={gold} />
        ))}
        {Array.from({ length: clamp(Math.round(comparison), 2, 8) }, (_, index) => (
          <circle key={index} data-viz-mark data-viz-name="right token" cx={426 + (index % 4) * 24} cy={186 - Math.floor(index / 4) * 20} r="9" fill={gold} />
        ))}
      </>
    );
  }

  if (templateId === "function-graph" || templateId === "function-family") {
    return (
      <>
        <line data-viz-mark data-viz-name="x axis" x1="70" x2="570" y1="216" y2="216" stroke="rgba(255,255,255,.55)" strokeWidth="4" />
        <line data-viz-mark data-viz-name="y axis" x1="320" x2="320" y1="70" y2="292" stroke="rgba(255,255,255,.55)" strokeWidth="4" />
        <path data-viz-mark data-viz-name="main function" d={graphPath(value, comparison, mode)} fill="none" stroke={accent} strokeWidth="7" strokeLinecap="round" />
        <path data-viz-mark data-viz-name="comparison function" d={graphPath(comparison, value, (mode + 1) % 3)} fill="none" stroke={secondary} strokeWidth="4" strokeLinecap="round" opacity="0.72" />
        <circle data-viz-mark data-viz-name="sample point" cx={320 + comparison * 12} cy={clamp(214 - value * 10, 90, 270)} r="13" fill={gold} stroke="white" strokeWidth="4" />
      </>
    );
  }

  if (templateId === "complex-plane") {
    const origin = { x: 320, y: 190 };
    const scale = 18;
    const real = value;
    const imaginary = comparison;
    const point = { x: origin.x + real * scale, y: origin.y - imaginary * scale };
    const conjugate = { x: origin.x + real * scale, y: origin.y + imaginary * scale };
    const rotated = { x: origin.x - imaginary * scale, y: origin.y - real * scale };
    const activePoint = mode === 1 ? conjugate : mode === 2 ? rotated : point;
    const activeLabel = mode === 1 ? `${formatNumber(real, 0)} - ${formatNumber(imaginary, 0)}i` : mode === 2 ? `${formatNumber(-imaginary, 0)} + ${formatNumber(real, 0)}i` : `${formatNumber(real, 0)} + ${formatNumber(imaginary, 0)}i`;
    const modulus = Math.hypot(real, imaginary) * scale;

    return (
      <>
        <line data-viz-mark data-viz-name="real axis" x1="78" x2="562" y1={origin.y} y2={origin.y} stroke="rgba(255,255,255,.62)" strokeWidth="4" />
        <line data-viz-mark data-viz-name="imaginary axis" x1={origin.x} x2={origin.x} y1="66" y2="296" stroke="rgba(255,255,255,.62)" strokeWidth="4" />
        {[-2, 0, 2].map((tick) => (
          <g key={`complex-re-${tick}`}>
            <line x1={origin.x + tick * 2 * scale} x2={origin.x + tick * 2 * scale} y1={origin.y - 8} y2={origin.y + 8} stroke="rgba(255,255,255,.45)" strokeWidth="2" />
            <line x1={origin.x - 8} x2={origin.x + 8} y1={origin.y - tick * 2 * scale} y2={origin.y - tick * 2 * scale} stroke="rgba(255,255,255,.45)" strokeWidth="2" />
          </g>
        ))}
        <circle data-viz-mark data-viz-name="modulus circle" cx={origin.x} cy={origin.y} r={modulus} fill="none" stroke="rgba(250,204,21,.5)" strokeWidth="4" strokeDasharray="8 8" />
        <line data-viz-mark data-viz-name="real projection" x1={point.x} x2={point.x} y1={origin.y} y2={point.y} stroke="rgba(34,211,238,.5)" strokeWidth="3" strokeDasharray="5 6" />
        <line data-viz-mark data-viz-name="imaginary projection" x1={origin.x} x2={point.x} y1={point.y} y2={point.y} stroke="rgba(34,211,238,.5)" strokeWidth="3" strokeDasharray="5 6" />
        <line data-viz-mark data-viz-name="complex vector" x1={origin.x} y1={origin.y} x2={point.x} y2={point.y} stroke={accent} strokeWidth="7" strokeLinecap="round" />
        <circle data-viz-mark data-viz-name="complex point" cx={point.x} cy={point.y} r="12" fill={accent} stroke="white" strokeWidth="4" />
        {mode >= 1 ? (
          <>
            <line data-viz-mark data-viz-name="conjugate vector" x1={origin.x} y1={origin.y} x2={conjugate.x} y2={conjugate.y} stroke={secondary} strokeWidth="6" strokeLinecap="round" strokeDasharray={mode === 1 ? undefined : "9 8"} opacity={mode === 1 ? 1 : 0.58} />
            <circle data-viz-mark data-viz-name="conjugate point" cx={conjugate.x} cy={conjugate.y} r={mode === 1 ? 12 : 9} fill={secondary} stroke="white" strokeWidth="3" opacity={mode === 1 ? 1 : 0.72} />
          </>
        ) : null}
        {mode === 2 ? (
          <>
            <path data-viz-mark data-viz-name="rotation arc" d={`M ${origin.x + 52} ${origin.y} A 52 52 0 0 0 ${origin.x} ${origin.y - 52}`} fill="none" stroke={gold} strokeWidth="5" strokeLinecap="round" />
            <line data-viz-mark data-viz-name="i times vector" x1={origin.x} y1={origin.y} x2={rotated.x} y2={rotated.y} stroke={gold} strokeWidth="7" strokeLinecap="round" />
            <circle data-viz-mark data-viz-name="i times point" cx={rotated.x} cy={rotated.y} r="12" fill={gold} stroke="white" strokeWidth="4" />
          </>
        ) : null}
        <text x="526" y={origin.y - 10} textAnchor="middle" className="fill-white/70 text-xs font-bold">Re</text>
        <text x={origin.x + 14} y="82" className="fill-white/70 text-xs font-bold">Im</text>
        <text x={activePoint.x + 16} y={activePoint.y - 12} className="fill-white text-xs font-black">{activeLabel}</text>
        <text x="88" y="286" className="fill-yellow-100 text-xs font-bold">|z| = {formatNumber(Math.hypot(real, imaginary), 2)}</text>
      </>
    );
  }

  if (templateId === "trig-unit-wave") {
    const trigBaseY = 184;
    const unitCircleX = 164;
    const unitCircleRadius = 70;

    return (
      <>
        <circle data-viz-mark data-viz-name="unit circle" cx={unitCircleX} cy={trigBaseY} r={unitCircleRadius} fill={soft} stroke="white" strokeWidth="5" />
        <line
          data-viz-mark
          data-viz-name="radius"
          x1={unitCircleX}
          y1={trigBaseY}
          x2={unitCircleX + Math.cos(value) * unitCircleRadius}
          y2={trigBaseY - Math.sin(value) * unitCircleRadius}
          stroke={accent}
          strokeWidth="7"
          strokeLinecap="round"
        />
        <path data-viz-mark data-viz-name="sine wave" d={polylinePath(Array.from({ length: 70 }, (_, index) => {
          const x = 286 + index * 4;
          const y = trigBaseY - Math.sin(index / 8 + mode) * value * 9;
          return { x, y };
        }))} fill="none" stroke={secondary} strokeWidth="6" strokeLinecap="round" />
        <line data-viz-mark data-viz-name="wave axis" x1="278" x2="570" y1={trigBaseY} y2={trigBaseY} stroke="rgba(255,255,255,.38)" strokeWidth="3" />
      </>
    );
  }

  if (templateId === "probability-simulation") {
    return (
      <>
        {bars(value, comparison).map((bar, index) => (
          <rect key={index} data-viz-mark data-viz-name="outcome bar" x={100 + index * 72} y={268 - bar} width="42" height={bar} rx="12" fill={index === mode ? gold : index % 2 ? secondary : accent} opacity="0.86" />
        ))}
        <circle data-viz-mark data-viz-name="sample space" cx="488" cy="120" r={34 + comparison * 4} fill={soft} stroke={accent} strokeWidth="6" />
        <path data-viz-mark data-viz-name="probability slice" d={`M 488 120 L 488 ${86 - mode * 4} A ${34 + comparison * 4} ${34 + comparison * 4} 0 0 1 ${526 + value * 2} ${136 + mode * 8} Z`} fill={secondary} opacity="0.72" />
      </>
    );
  }

  if (templateId === "statistics-distribution") {
    return (
      <>
        <path data-viz-mark data-viz-name="distribution curve" d={polylinePath(Array.from({ length: 80 }, (_, index) => {
          const x = 78 + index * 6;
          const center = 320 + (comparison - 5) * 12;
          const spread = 54 + value * 5;
          const y = 264 - Math.exp(-((x - center) ** 2) / (2 * spread ** 2)) * 154;
          return { x, y };
        }))} fill="none" stroke={accent} strokeWidth="7" strokeLinecap="round" />
        {bars(comparison, value).map((bar, index) => (
          <rect key={index} data-viz-mark data-viz-name="summary bar" x={112 + index * 66} y={292 - bar} width="36" height={bar} rx="10" fill={index % 2 ? secondary : gold} opacity="0.74" />
        ))}
      </>
    );
  }

  if (templateId === "calculus-rate-area") {
    const tangentY = clamp(196 - value * 8, 96, 248);
    return (
      <>
        <path data-viz-mark data-viz-name="curve" d={graphPath(value, comparison, 0)} fill="none" stroke={accent} strokeWidth="7" strokeLinecap="round" />
        <line data-viz-mark data-viz-name="tangent" x1="230" x2="446" y1={tangentY + comparison * 4} y2={tangentY - value * 5} stroke={gold} strokeWidth="6" strokeLinecap="round" />
        {Array.from({ length: 7 }, (_, index) => (
          <rect key={index} data-viz-mark data-viz-name="area strip" x={202 + index * 30} y={214 - index * mode * 2} width="22" height={70 + Math.sin(index + value) * 18} rx="6" fill={secondary} opacity="0.34" />
        ))}
      </>
    );
  }

  return (
    <>
      <path data-viz-mark data-viz-name="strategy network" d="M 116 230 C 190 92 270 96 322 184 S 462 282 536 112" fill="none" stroke={accent} strokeWidth="7" strokeLinecap="round" />
      <ellipse data-viz-mark data-viz-name="conic model" cx="338" cy="164" rx={70 + value * 4} ry={34 + comparison * 3} fill={soft} stroke={secondary} strokeWidth="5" />
      {[{ x: 116, y: 230 }, { x: 232, y: 118 }, { x: 338, y: 164 }, { x: 474, y: 236 }, { x: 536, y: 112 }].map((point, index) => (
        <circle key={index} data-viz-mark data-viz-name="strategy node" cx={point.x} cy={point.y} r={14 + (index === mode ? 5 : 0)} fill={index === mode ? gold : accent} stroke="white" strokeWidth="4" />
      ))}
      <line data-viz-mark data-viz-name="vector" x1="142" x2={230 + comparison * 10} y1="266" y2={214 - value * 6} stroke={gold} strokeWidth="6" strokeLinecap="round" />
    </>
  );
}

function Slider({
  label,
  max,
  min,
  onCommit,
  onValue,
  value
}: {
  label: string;
  max: number;
  min: number;
  onCommit: () => void;
  onValue: (value: number) => void;
  value: number;
}) {
  return (
    <label className="block rounded-2xl border border-slate-200/70 bg-white/70 p-4 dark:border-white/10 dark:bg-white/[0.055]">
      <span className="flex items-center justify-between gap-3 text-sm font-bold text-slate-700 dark:text-slate-200">
        {label}
        <strong className="rounded-full bg-cyan-500/15 px-2 py-1 text-cyan-700 dark:text-cyan-200">{formatNumber(value, 0)}</strong>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step="1"
        value={value}
        aria-label={label}
        onChange={(event) => onValue(Number(event.target.value))}
        onPointerUp={onCommit}
        onKeyUp={onCommit}
        className="mt-4 w-full accent-cyan-500"
      />
    </label>
  );
}

export function ConfiguredVisualizationLab({ labId, topicId }: { labId?: string; topicId?: string }) {
  const { recordLearningEvent, t, text } = useSettings();
  const lab = labFromProps({ labId, topicId });
  const [value, setValue] = useState(5);
  const [comparison, setComparison] = useState(4);
  const [mode, setMode] = useState(0);
  const accent = safeAccent(lab);
  const templateId = lab?.templateId ?? "number-line";
  const formula = lab?.templateConfig.formula;
  const titleBadgeLabel = formula
    ? text(formula)
    : lab
      ? text(lab.category)
      : t({ en: "Interactive model", zh: "互動模型", zhHans: "互动模型" });
  const controlCopy = useMemo(() => {
    if (templateId === "complex-plane") {
      return {
        modeLabels: [
          t({ en: "z", zh: "z" }),
          t({ en: "Conjugate", zh: "共軛" }),
          t({ en: "i times z", zh: "i 乘 z" })
        ],
        valueLabel: t({ en: "Real part", zh: "實部" }),
        comparisonLabel: t({ en: "Imaginary part", zh: "虛部" })
      };
    }

    return {
      modeLabels: [
        t({ en: "Model A", zh: "模型 A" }),
        t({ en: "Model B", zh: "模型 B" }),
        t({ en: "Compare", zh: "比較" })
      ],
      valueLabel: t({ en: "Model value", zh: "模型數值" }),
      comparisonLabel: t({ en: "Comparison", zh: "比較數值" })
    };
  }, [t, templateId]);

  function record(type: "visualization-slider" | "visualization-probe" | "visualization-reset") {
    recordLearningEvent({
      type,
      source: lab?.analyticsSource ?? "visualization-lab",
      topicId: lab?.topicId ?? topicId ?? "configured-visualization"
    });
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0 rounded-3xl border border-slate-200/70 bg-slate-950 p-5 shadow-inner dark:border-white/10">
        <svg
          data-viz-surface
          role="img"
          aria-label={lab ? text(lab.title) : t({ en: "Configured visualization lab", zh: "配置化視覺化實驗" })}
          viewBox={`0 0 ${width} ${height}`}
          className="h-[340px] w-full sm:h-[380px]"
        >
          <rect width={width} height={height} fill="#020617" />
          {Array.from({ length: 8 }, (_, index) => (
            <line key={`v-${index}`} x1={70 + index * 70} x2={70 + index * 70} y1="54" y2="306" stroke="rgba(255,255,255,.07)" />
          ))}
          {Array.from({ length: 5 }, (_, index) => (
            <line key={`h-${index}`} x1="54" x2="586" y1={76 + index * 50} y2={76 + index * 50} stroke="rgba(255,255,255,.07)" />
          ))}
          <rect x={panel.x} y={panel.y} width={panel.width} height={panel.height} rx="28" fill="rgba(255,255,255,.025)" stroke="rgba(255,255,255,.1)" />
          <TemplateMarks accent={accent} comparison={comparison} mode={mode} templateId={templateId} value={value} />
          <g data-viz-overlap-ok>
            <rect x="64" y="52" width="300" height="40" rx="14" fill="rgba(15,23,42,.88)" stroke="rgba(103,232,249,.38)" />
            <text x="84" y="78" className="fill-cyan-100 text-sm font-black">
              {titleBadgeLabel}
            </text>
            <circle cx="558" cy="70" r="18" fill={accent} opacity="0.25" />
            <circle cx="558" cy="70" r="8" fill={accent} />
          </g>
        </svg>
      </div>

      <div className="min-w-0 space-y-4">
        <div className="rounded-2xl border border-slate-200/70 bg-white/70 p-4 dark:border-white/10 dark:bg-white/[0.055]">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-500 dark:text-cyan-300">
            {lab ? text(lab.category) : t({ en: "Interactive model", zh: "互動模型" })}
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
            {lab ? text(lab.templateConfig.focus) : t({ en: "Adjust the controls and compare the model.", zh: "調整控制項並比較模型。" })}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {controlCopy.modeLabels.map((label, index) => (
            <button
              key={label}
              type="button"
              onClick={() => {
                setMode(index);
                record("visualization-probe");
              }}
              className={`focus-ring rounded-2xl px-3 py-3 text-xs font-black transition ${
                mode === index
                  ? "bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-500/20"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-white/[0.08] dark:text-slate-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <Slider
          label={controlCopy.valueLabel}
          min={1}
          max={9}
          value={value}
          onValue={(nextValue) => setValue(Math.round(clamp(nextValue, 1, 9)))}
          onCommit={() => record("visualization-slider")}
        />
        <Slider
          label={controlCopy.comparisonLabel}
          min={1}
          max={9}
          value={comparison}
          onValue={(nextValue) => setComparison(Math.round(clamp(nextValue, 1, 9)))}
          onCommit={() => record("visualization-slider")}
        />
        <button
          type="button"
          onClick={() => {
            setValue(5);
            setComparison(4);
            setMode(0);
            record("visualization-reset");
          }}
          className="focus-ring w-full rounded-2xl border border-slate-200/80 bg-white px-4 py-3 text-sm font-black text-slate-700 transition hover:-translate-y-0.5 hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.08] dark:text-slate-100 dark:hover:bg-white/[0.12]"
        >
          {t({ en: "Reset model", zh: "重設模型" })}
        </button>
      </div>
    </div>
  );
}
