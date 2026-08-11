"use client";

import { PointerEvent, useMemo, useRef, useState } from "react";
import { motion } from "@/components/ui/Motion";
import { useSettings } from "@/components/providers/AppProviders";
import { VisualizationResetButton } from "@/components/visualizations/VisualizationResetButton";
import { useVisualizationTheme } from "@/components/visualizations/visualizationTheme";
import { clamp, formatNumber } from "@/lib/math";

type PlotPoint = { x: number; y: number };
type TransformMode = "original" | "translate" | "reflect";

const width = 640;
const height = 420;
const padding = 36;
const xMin = -8;
const xMax = 8;
const yMin = -6;
const yMax = 6;
const moduleId = "coordinate-plane-demo";

function mapX(x: number) {
  return padding + ((x - xMin) / (xMax - xMin)) * (width - padding * 2);
}

function mapY(y: number) {
  return height - padding - ((y - yMin) / (yMax - yMin)) * (height - padding * 2);
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

function transformPoint(point: PlotPoint, mode: TransformMode): PlotPoint {
  if (mode === "translate") return { x: point.x + 2, y: point.y + 1 };
  if (mode === "reflect") return { x: -point.x, y: point.y };
  return point;
}

function inverseTransformPoint(point: PlotPoint, mode: TransformMode): PlotPoint {
  if (mode === "translate") return { x: point.x - 2, y: point.y - 1 };
  if (mode === "reflect") return { x: -point.x, y: point.y };
  return point;
}

function clampVisiblePoint(point: PlotPoint): PlotPoint {
  return {
    x: clamp(point.x, xMin, xMax),
    y: clamp(point.y, yMin, yMax)
  };
}

function getPointLabelPosition(point: PlotPoint, label: string) {
  const labelWidth = Math.max(64, label.length * 7 + 18);

  return {
    x: clamp(mapX(point.x) + 12, padding + 4, width - padding - labelWidth),
    y: clamp(mapY(point.y) - 12, padding + 16, height - padding - 8)
  };
}

function PrimaryCountingNumberBondsLab({ topicId }: { topicId: string }) {
  const { recordLearningEvent, t } = useSettings();
  const vizTheme = useVisualizationTheme();
  const [total, setTotal] = useState(12);
  const [knownPart, setKnownPart] = useState(7);
  const part = Math.round(clamp(knownPart, 1, total - 1));
  const missingPart = total - part;
  const slots = Array.from({ length: 20 }, (_, index) => index);
  const expression = `${part} + ${missingPart} = ${total}`;

  function recordBondChange() {
    recordLearningEvent({ type: "visualization-slider", source: "coordinate-plane", topicId });
  }

  function chooseTotal(nextTotal: number) {
    setTotal(nextTotal);
    setKnownPart(Math.max(1, Math.floor(nextTotal / 2)));
    recordLearningEvent({ type: "visualization-probe", source: "coordinate-plane", topicId });
  }

  function resetModel() {
    setTotal(12);
    setKnownPart(7);
    recordLearningEvent({ type: "visualization-reset", source: "coordinate-plane", topicId });
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
      <div className={vizTheme.paddedSurfaceClassName}>
        <svg data-viz-surface role="img" aria-label={t({ en: "Primary 1 counting and number bonds model", zh: "小一數數與數的組合模型" })} viewBox="0 0 640 360" className="h-[340px] w-full sm:h-[380px]">
          <rect width="640" height="360" fill={vizTheme.svgBackground} />
          <rect x="34" y="34" width="572" height="292" rx="28" fill={vizTheme.panelFill} stroke={vizTheme.panelStroke} />
          <text x="64" y="76" fill={vizTheme.labelText} className="text-sm font-black uppercase tracking-[0.18em]">{t({ en: "Count objects, then split the total", zh: "先數物件，再分拆總數" })}</text>
          <g
            data-viz-mark
            data-viz-name="number bond counters"
            data-viz-total={total}
            data-viz-known-part={part}
            data-viz-missing-part={missingPart}
            data-viz-expression={expression}
            transform="translate(72 112)"
          >
            {slots.map((slot) => {
              const row = Math.floor(slot / 10);
              const col = slot % 10;
              const filled = slot < total;
              const partKind = !filled ? "empty" : slot < part ? "known" : "missing";
              const fill = !filled ? vizTheme.emptyFill : slot < part ? "#38bdf8" : "#facc15";

              return (
                <circle
                  key={slot}
                  data-viz-mark
                  data-viz-name="number bond counter"
                  data-viz-slot={slot + 1}
                  data-viz-filled={String(filled)}
                  data-viz-part={partKind}
                  data-viz-total={total}
                  data-viz-known-part={part}
                  data-viz-missing-part={missingPart}
                  cx={col * 42}
                  cy={row * 44}
                  r="15"
                  fill={fill}
                  stroke={filled ? vizTheme.pointStroke : vizTheme.panelStroke}
                  strokeWidth={filled ? 4 : 3}
                />
              );
            })}
          </g>
          <line data-viz-mark data-viz-name="number bond known connector" data-viz-total={total} data-viz-part={part} data-viz-from-x="224" data-viz-from-y="238" data-viz-to-x="314" data-viz-to-y="220" x1="224" x2="314" y1="238" y2="220" stroke={vizTheme.axisStrong} strokeWidth="8" strokeLinecap="round" opacity="0.9" />
          <line data-viz-mark data-viz-name="number bond missing connector" data-viz-total={total} data-viz-missing-part={missingPart} data-viz-from-x="224" data-viz-from-y="260" data-viz-to-x="314" data-viz-to-y="306" x1="224" x2="314" y1="260" y2="306" stroke={vizTheme.axisStrong} strokeWidth="8" strokeLinecap="round" opacity="0.9" />
          <circle data-viz-mark data-viz-name="number bond total" data-viz-value={total} cx="190" cy="248" r="42" fill="#ef4444" opacity="0.92" />
          <circle data-viz-mark data-viz-name="number bond known part" data-viz-value={part} cx="350" cy="220" r="38" fill="#38bdf8" opacity="0.92" />
          <circle data-viz-mark data-viz-name="number bond missing part" data-viz-value={missingPart} cx="350" cy="306" r="38" fill="#facc15" opacity="0.92" />
          <text data-viz-overlap-ok x="190" y="260" textAnchor="middle" className="fill-slate-950 text-4xl font-black">{total}</text>
          <text data-viz-overlap-ok x="350" y="232" textAnchor="middle" className="fill-slate-950 text-3xl font-black">{part}</text>
          <text data-viz-overlap-ok x="350" y="318" textAnchor="middle" className="fill-slate-950 text-3xl font-black">{missingPart}</text>
          <rect x="420" y="258" width="184" height="48" rx="16" fill="rgba(15,23,42,.92)" stroke="rgba(103,232,249,.45)" strokeWidth="3" />
          <text x="512" y="290" textAnchor="middle" fill={vizTheme.mode === "day" ? "#ffffff" : vizTheme.text} className="text-2xl font-black">{expression}</text>
        </svg>
      </div>

      <div className="space-y-4">
        <div className="rounded-3xl border border-slate-200/70 bg-white/70 p-5 dark:border-white/10 dark:bg-white/[0.055]">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-cyan-500 dark:text-cyan-300">{t({ en: "Number bond", zh: "數的組合" })}</p>
          <p className="mt-3 text-3xl font-black text-slate-950 dark:text-white">{expression}</p>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {[5, 10, 20].map((nextTotal) => (
              <button
                key={nextTotal}
                type="button"
                onClick={() => chooseTotal(nextTotal)}
                className="focus-ring rounded-2xl bg-slate-100 px-3 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-200 dark:bg-white/[0.08] dark:text-slate-200"
              >
                {t({ en: `Make ${nextTotal}`, zh: `組成 ${nextTotal}` })}
              </button>
            ))}
          </div>
        </div>
        <label className="block rounded-3xl border border-slate-200/70 bg-white/70 p-5 dark:border-white/10 dark:bg-white/[0.055]">
          <span className="flex items-center justify-between text-sm font-bold text-slate-700 dark:text-slate-200">
            {t({ en: "Total objects", zh: "物件總數" })}
            <strong>{total}</strong>
          </span>
          <input
            type="range"
            min="2"
            max="20"
            step="1"
            value={total}
            onChange={(event) => {
              const nextTotal = Number(event.target.value);
              setTotal(nextTotal);
              setKnownPart((current) => Math.round(clamp(current, 1, nextTotal - 1)));
            }}
            onPointerUp={recordBondChange}
            onKeyUp={recordBondChange}
            className="mt-4 w-full accent-cyan-500"
          />
        </label>
        <label className="block rounded-3xl border border-slate-200/70 bg-white/70 p-5 dark:border-white/10 dark:bg-white/[0.055]">
          <span className="flex items-center justify-between text-sm font-bold text-slate-700 dark:text-slate-200">
            {t({ en: "Known part", zh: "已知部分" })}
            <strong>{part}</strong>
          </span>
          <input
            type="range"
            min="1"
            max={Math.max(1, total - 1)}
            step="1"
            value={part}
            onChange={(event) => setKnownPart(Number(event.target.value))}
            onPointerUp={recordBondChange}
            onKeyUp={recordBondChange}
            className="mt-4 w-full accent-cyan-500"
          />
        </label>
        <VisualizationResetButton moduleId={moduleId} topicId={topicId} onReset={resetModel} />
      </div>
    </div>
  );
}

function PrimaryNumberLineLab({ topicId }: { topicId: string }) {
  const { recordLearningEvent, t } = useSettings();
  const vizTheme = useVisualizationTheme();
  const [start, setStart] = useState(3);
  const [jump, setJump] = useState(2);
  const [operation, setOperation] = useState<"add" | "subtract">("add");
  const safeJump = Math.round(clamp(jump, 1, 5));
  const safeStart = Math.round(clamp(start, safeJump, 10 - safeJump));
  const end = operation === "add" ? safeStart + safeJump : safeStart - safeJump;
  const ticks = Array.from({ length: 11 }, (_, index) => index);
  const startX = 58 + safeStart * 48;
  const endX = 58 + end * 48;
  const midX = (startX + endX) / 2;
  const arcY = operation === "add" ? 112 : 166;
  const controlY = operation === "add" ? 42 : 212;
  const expression = operation === "add" ? `${safeStart} + ${safeJump} = ${end}` : `${safeStart} - ${safeJump} = ${end}`;

  function recordNumberLineChange() {
    recordLearningEvent({
      type: "visualization-slider",
      source: "coordinate-plane",
      topicId
    });
  }

  function updateJump(nextJump: number) {
    const boundedJump = Math.round(clamp(nextJump, 1, 5));
    setJump(boundedJump);
    setStart((current) => Math.round(clamp(current, boundedJump, 10 - boundedJump)));
  }

  function resetModel() {
    setStart(3);
    setJump(2);
    setOperation("add");
    recordLearningEvent({ type: "visualization-reset", source: "coordinate-plane", topicId });
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
      <div className={vizTheme.paddedSurfaceClassName}>
        <svg data-viz-surface role="img" aria-label={t({ en: "Primary 1 number line steps", zh: "小一數線步行" })} viewBox="0 0 640 400" className="h-[380px] w-full sm:h-[430px]">
          <rect width="640" height="400" fill={vizTheme.svgBackground} />
          <rect x="34" y="24" width="572" height="342" rx="28" fill={vizTheme.panelFill} stroke={vizTheme.panelStroke} />
          <line x1="58" x2="538" y1="160" y2="160" stroke={vizTheme.axisStrong} strokeWidth="6" strokeLinecap="round" />
          {ticks.map((tick) => (
            <g key={tick}>
              <line x1={58 + tick * 48} x2={58 + tick * 48} y1="138" y2="182" stroke={vizTheme.axisStrong} strokeWidth={tick === safeStart || tick === end ? 5 : 3} opacity={tick === safeStart || tick === end ? 1 : 0.58} />
              <text x={58 + tick * 48} y="218" textAnchor="middle" fill={vizTheme.textMuted} className="text-sm font-black">{tick}</text>
            </g>
          ))}
          <path
            data-viz-mark
            data-viz-name="number line jump"
            data-viz-operation={operation}
            data-viz-start={safeStart}
            data-viz-jump={safeJump}
            data-viz-end={end}
            data-viz-expression={expression}
            d={`M ${startX} ${arcY} C ${midX} ${controlY} ${midX} ${controlY} ${endX} ${arcY}`}
            fill="none"
            stroke={operation === "add" ? "#22c55e" : "#f472b6"}
            strokeWidth="8"
            strokeLinecap="round"
          />
          <path
            data-viz-mark
            data-viz-name="number line arrow"
            data-viz-operation={operation}
            data-viz-end={end}
            d={operation === "add" ? `M ${endX} ${arcY} l -18 -8 l 7 20 z` : `M ${endX} ${arcY} l 18 -8 l -7 20 z`}
            fill={operation === "add" ? "#22c55e" : "#f472b6"}
          />
          <circle data-viz-mark data-viz-name="number line start" data-viz-value={safeStart} cx={startX} cy="160" r="14" fill="#38bdf8" stroke={vizTheme.pointStroke} strokeWidth="4" />
          <circle data-viz-mark data-viz-name="number line end" data-viz-value={end} cx={endX} cy="160" r="14" fill="#facc15" stroke={vizTheme.pointStroke} strokeWidth="4" />
          <text x="68" y="48" fill={vizTheme.labelText} className="text-sm font-black uppercase tracking-[0.18em]">{t({ en: "Count the jumps", zh: "數出步數" })}</text>
          <rect x="222" y="252" width="196" height="58" rx="20" fill="rgba(15,23,42,.92)" stroke="rgba(103,232,249,.45)" strokeWidth="3" />
          <text x="320" y="290" textAnchor="middle" fill="#ffffff" className="text-3xl font-black">{expression}</text>
        </svg>
      </div>

      <div className="space-y-4">
        <div className="rounded-3xl border border-slate-200/70 bg-white/70 p-5 dark:border-white/10 dark:bg-white/[0.055]">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-cyan-500 dark:text-cyan-300">{t({ en: "Step sentence", zh: "步行算式" })}</p>
          <p className="mt-3 text-3xl font-black text-slate-950 dark:text-white">{expression}</p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {([
              ["add", t({ en: "Jump forward", zh: "向前跳" })],
              ["subtract", t({ en: "Jump back", zh: "向後跳" })]
            ] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setOperation(value);
                  recordLearningEvent({ type: "visualization-probe", source: "coordinate-plane", topicId });
                }}
                className={`focus-ring rounded-2xl px-4 py-3 text-sm font-black transition ${operation === value ? "bg-cyan-500 text-slate-950" : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-white/[0.08] dark:text-slate-200"}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        {[
          { label: t({ en: "Start number", zh: "起點數字" }), value: safeStart, min: safeJump, max: 10 - safeJump, setter: setStart },
          { label: t({ en: "Jump size", zh: "跳幾格" }), value: safeJump, min: 1, max: 5, setter: updateJump }
        ].map((control) => (
          <label key={control.label} className="block rounded-3xl border border-slate-200/70 bg-white/70 p-5 dark:border-white/10 dark:bg-white/[0.055]">
            <span className="flex items-center justify-between text-sm font-bold text-slate-700 dark:text-slate-200">
              {control.label}
              <strong>{control.value}</strong>
            </span>
            <input
              type="range"
              min={control.min}
              max={control.max}
              step="1"
              value={control.value}
              onChange={(event) => control.setter(Number(event.target.value))}
              onPointerUp={recordNumberLineChange}
              onKeyUp={recordNumberLineChange}
              className="mt-4 w-full accent-cyan-500"
            />
          </label>
        ))}
        <VisualizationResetButton moduleId={moduleId} topicId={topicId} onReset={resetModel} />
      </div>
    </div>
  );
}

function PlaceValueLab({ topicId }: { topicId: string }) {
  const { recordLearningEvent, t } = useSettings();
  const vizTheme = useVisualizationTheme();
  const [hundreds, setHundreds] = useState(2);
  const [tens, setTens] = useState(4);
  const [ones, setOnes] = useState(3);
  const value = hundreds * 100 + tens * 10 + ones;

  function recordPlaceValueChange() {
    recordLearningEvent({ type: "visualization-slider", source: "coordinate-plane", topicId });
  }

  function resetModel() {
    setHundreds(2);
    setTens(4);
    setOnes(3);
    recordLearningEvent({ type: "visualization-reset", source: "coordinate-plane", topicId });
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
      <div className={vizTheme.paddedSurfaceClassName}>
        <svg data-viz-surface role="img" aria-label={t({ en: "Primary 2 base ten place value model", zh: "小二十進位位值模型" })} viewBox="0 0 640 360" className="h-[340px] w-full sm:h-[380px]">
          <rect width="640" height="360" fill={vizTheme.svgBackground} />
          <rect x="34" y="34" width="572" height="292" rx="28" fill={vizTheme.panelFill} stroke={vizTheme.panelStroke} />
          <text x="64" y="76" fill={vizTheme.labelText} className="text-sm font-black uppercase tracking-[0.18em]">{t({ en: "Hundreds · Tens · Ones", zh: "百 · 十 · 個" })}</text>
          <text x="424" y="80" fill={vizTheme.text} className="text-4xl font-black">{value}</text>
          {Array.from({ length: 10 }, (_, row) => (
            Array.from({ length: 10 }, (_, col) => (
              <rect
                data-viz-mark
                data-viz-name="hundreds flat cell"
                data-viz-flat="1"
                data-viz-filled={String(hundreds >= 1)}
                data-viz-hundreds={hundreds}
                data-viz-tens={tens}
                data-viz-ones={ones}
                data-viz-value={value}
                key={`${row}-${col}`}
                x={68 + col * 10}
                y={108 + row * 10}
                width="8"
                height="8"
                fill={hundreds >= 1 ? "#22d3ee" : vizTheme.emptyFill}
              />
            ))
          ))}
          {hundreds >= 2 ? Array.from({ length: 10 }, (_, row) => (
            Array.from({ length: 10 }, (_, col) => (
              <rect data-viz-mark data-viz-name="hundreds flat cell" data-viz-flat="2" data-viz-filled="true" data-viz-hundreds={hundreds} data-viz-tens={tens} data-viz-ones={ones} data-viz-value={value} key={`b-${row}-${col}`} x={190 + col * 10} y={108 + row * 10} width="8" height="8" fill="#38bdf8" />
            ))
          )) : null}
          {hundreds >= 3 ? Array.from({ length: 10 }, (_, row) => (
            Array.from({ length: 10 }, (_, col) => (
              <rect data-viz-mark data-viz-name="hundreds flat cell" data-viz-flat="3" data-viz-filled="true" data-viz-hundreds={hundreds} data-viz-tens={tens} data-viz-ones={ones} data-viz-value={value} key={`c-${row}-${col}`} x={312 + col * 10} y={108 + row * 10} width="8" height="8" fill="#67e8f9" />
            ))
          )) : null}
          {Array.from({ length: tens }, (_, index) => (
            <rect data-viz-mark data-viz-name="tens rod" data-viz-index={index + 1} data-viz-hundreds={hundreds} data-viz-tens={tens} data-viz-ones={ones} data-viz-value={value} key={index} x={70 + index * 28} y="244" width="20" height="74" rx="6" fill="#f472b6" opacity="0.86" />
          ))}
          {Array.from({ length: ones }, (_, index) => (
            <circle data-viz-mark data-viz-name="ones unit" data-viz-index={index + 1} data-viz-hundreds={hundreds} data-viz-tens={tens} data-viz-ones={ones} data-viz-value={value} key={index} cx={390 + index * 28} cy="282" r="11" fill="#facc15" stroke={vizTheme.pointStroke} strokeWidth="2" />
          ))}
          <text x="66" y="338" fill={vizTheme.textMuted} className="text-sm font-bold">{value} = {hundreds * 100} + {tens * 10} + {ones}</text>
        </svg>
      </div>
      <div className="space-y-4">
        {[
          { label: t({ en: "Hundreds", zh: "百位" }), value: hundreds, min: 0, max: 3, setter: setHundreds },
          { label: t({ en: "Tens", zh: "十位" }), value: tens, min: 0, max: 9, setter: setTens },
          { label: t({ en: "Ones", zh: "個位" }), value: ones, min: 0, max: 9, setter: setOnes }
        ].map((control) => (
          <label key={control.label} className="block rounded-3xl border border-slate-200/70 bg-white/70 p-5 dark:border-white/10 dark:bg-white/[0.055]">
            <span className="flex items-center justify-between text-sm font-bold text-slate-700 dark:text-slate-200">
              {control.label}
              <strong>{control.value}</strong>
            </span>
            <input type="range" min={control.min} max={control.max} step="1" value={control.value} onChange={(event) => control.setter(Number(event.target.value))} onPointerUp={recordPlaceValueChange} onKeyUp={recordPlaceValueChange} className="mt-4 w-full accent-cyan-500" />
          </label>
        ))}
        <VisualizationResetButton moduleId={moduleId} topicId={topicId} onReset={resetModel} />
      </div>
    </div>
  );
}

function DecimalNumberLineLab({ topicId }: { topicId: string }) {
  const { recordLearningEvent, t } = useSettings();
  const vizTheme = useVisualizationTheme();
  const [tenths, setTenths] = useState(3);
  const [hundredths, setHundredths] = useState(7);
  const decimal = tenths / 10 + hundredths / 100;
  const markerX = 70 + decimal * 500;

  function recordDecimalChange() {
    recordLearningEvent({ type: "visualization-slider", source: "coordinate-plane", topicId });
  }

  function resetModel() {
    setTenths(3);
    setHundredths(7);
    recordLearningEvent({ type: "visualization-reset", source: "coordinate-plane", topicId });
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
      <div className={vizTheme.paddedSurfaceClassName}>
        <svg data-viz-surface role="img" aria-label={t({ en: "Primary 4 decimal number line", zh: "小四小數數線" })} viewBox="0 0 640 360" className="h-[340px] w-full sm:h-[380px]">
          <rect width="640" height="360" fill={vizTheme.svgBackground} />
          <rect x="34" y="34" width="572" height="292" rx="28" fill={vizTheme.panelFill} stroke={vizTheme.panelStroke} />
          <line data-viz-mark data-viz-name="decimal number line axis" data-viz-min="0" data-viz-max="1" x1="70" x2="570" y1="176" y2="176" stroke={vizTheme.axisStrong} strokeWidth="6" strokeLinecap="round" />
          {Array.from({ length: 101 }, (_, index) => (
            <line key={index} x1={70 + index * 5} x2={70 + index * 5} y1={index % 10 === 0 ? 146 : 164} y2={index % 10 === 0 ? 206 : 188} stroke={vizTheme.axisStrong} strokeWidth={index % 10 === 0 ? 3 : 1} opacity={index % 10 === 0 ? 0.78 : 0.24} />
          ))}
          {[0, 0.5, 1].map((tick) => (
            <text key={tick} x={70 + tick * 500} y="236" textAnchor="middle" fill={vizTheme.textMuted} className="text-sm font-black">{tick}</text>
          ))}
          <line data-viz-mark data-viz-name="decimal marker line" data-viz-tenths={tenths} data-viz-hundredths={hundredths} data-viz-value={formatNumber(decimal, 4)} x1={markerX} x2={markerX} y1="76" y2="176" stroke="#f472b6" strokeWidth="5" strokeDasharray="8 8" />
          <circle data-viz-mark data-viz-name="decimal marker" data-viz-tenths={tenths} data-viz-hundredths={hundredths} data-viz-value={formatNumber(decimal, 4)} cx={markerX} cy="176" r="15" fill="#22d3ee" stroke={vizTheme.pointStroke} strokeWidth="4" />
          <text x="72" y="56" fill={vizTheme.labelText} className="text-sm font-black uppercase tracking-[0.18em]">{t({ en: "Tenths and hundredths", zh: "十分位和百分位" })}</text>
          <text x="278" y="100" fill={vizTheme.text} className="text-4xl font-black">{decimal.toFixed(2)}</text>
        </svg>
      </div>
      <div className="space-y-4">
        {[
          { label: t({ en: "Tenths", zh: "十分位" }), value: tenths, min: 0, max: 9, setter: setTenths },
          { label: t({ en: "Hundredths", zh: "百分位" }), value: hundredths, min: 0, max: 9, setter: setHundredths }
        ].map((control) => (
          <label key={control.label} className="block rounded-3xl border border-slate-200/70 bg-white/70 p-5 dark:border-white/10 dark:bg-white/[0.055]">
            <span className="flex items-center justify-between text-sm font-bold text-slate-700 dark:text-slate-200">
              {control.label}
              <strong>{control.value}</strong>
            </span>
            <input type="range" min={control.min} max={control.max} step="1" value={control.value} onChange={(event) => control.setter(Number(event.target.value))} onPointerUp={recordDecimalChange} onKeyUp={recordDecimalChange} className="mt-4 w-full accent-cyan-500" />
          </label>
        ))}
        <VisualizationResetButton moduleId={moduleId} topicId={topicId} onReset={resetModel} />
      </div>
    </div>
  );
}

function SpeedGraphLab({ topicId }: { topicId: string }) {
  const { recordLearningEvent, t } = useSettings();
  const vizTheme = useVisualizationTheme();
  const [speed, setSpeed] = useState(4);
  const [hours, setHours] = useState(5);
  const distanceValue = speed * hours;
  const points = Array.from({ length: hours + 1 }, (_, index) => ({ time: index, distance: index * speed }));
  const x0 = 70;
  const y0 = 290;
  const graphWidth = 500;
  const graphHeight = 210;
  const yAxisMax = Math.max(30, Math.ceil(distanceValue / 10) * 10);
  const distanceTicks = Array.from({ length: Math.floor(yAxisMax / 10) + 1 }, (_, index) => index * 10);

  function x(time: number) {
    return x0 + (time / 6) * graphWidth;
  }

  function y(distancePoint: number) {
    return y0 - (distancePoint / yAxisMax) * graphHeight;
  }

  function recordSpeedChange() {
    recordLearningEvent({ type: "visualization-slider", source: "coordinate-plane", topicId });
  }

  function resetModel() {
    setSpeed(4);
    setHours(5);
    recordLearningEvent({ type: "visualization-reset", source: "coordinate-plane", topicId });
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
      <div className={vizTheme.paddedSurfaceClassName}>
        <svg data-viz-surface role="img" aria-label={t({ en: "Primary 6 speed distance time graph", zh: "小六速率距離時間圖" })} viewBox="0 0 640 360" className="h-[340px] w-full sm:h-[380px]">
          <rect width="640" height="360" fill={vizTheme.svgBackground} />
          <rect x="34" y="34" width="572" height="292" rx="28" fill={vizTheme.panelFill} stroke={vizTheme.panelStroke} />
          <line x1={x0} x2={x0 + graphWidth} y1={y0} y2={y0} stroke={vizTheme.axis} strokeWidth="4" opacity="0.8" />
          <line x1={x0} x2={x0} y1={y0 - graphHeight} y2={y0} stroke={vizTheme.axis} strokeWidth="4" opacity="0.8" />
          {[0, 1, 2, 3, 4, 5, 6].map((tick) => (
            <g key={tick}>
              <line x1={x(tick)} x2={x(tick)} y1={y0 - graphHeight} y2={y0} stroke={vizTheme.grid} />
              <text x={x(tick)} y={y0 + 28} textAnchor="middle" fill={vizTheme.tickText} className="text-xs font-bold">{tick}h</text>
            </g>
          ))}
          {distanceTicks.map((tick) => (
            <g key={tick}>
              <line x1={x0} x2={x0 + graphWidth} y1={y(tick)} y2={y(tick)} stroke={vizTheme.grid} />
              <text x={x0 - 18} y={y(tick) + 4} textAnchor="end" fill={vizTheme.tickText} className="text-xs font-bold">{tick}</text>
            </g>
          ))}
          <text x={x0 + graphWidth + 4} y={y0 + 18} fill={vizTheme.labelText} className="text-xs font-black">{t({ en: "x: time", zh: "x：時間" })}</text>
          <text x={x0 + 12} y={y0 - graphHeight - 10} fill={vizTheme.labelText} className="text-xs font-black">{t({ en: "y: distance", zh: "y：距離" })}</text>
          <polyline
            data-viz-mark
            data-viz-name="speed distance line"
            data-viz-speed={speed}
            data-viz-hours={hours}
            data-viz-time={hours}
            data-viz-distance={distanceValue}
            data-viz-y-axis-max={yAxisMax}
            points={points.map((point) => `${x(point.time)},${y(point.distance)}`).join(" ")}
            fill="none"
            stroke="#22d3ee"
            strokeWidth="7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {points.map((point) => (
            <circle data-viz-mark data-viz-name="speed distance point" data-viz-time={point.time} data-viz-distance={point.distance} data-viz-speed={speed} data-viz-y-axis-max={yAxisMax} key={point.time} cx={x(point.time)} cy={y(point.distance)} r="8" fill="#f472b6" stroke={vizTheme.pointStroke} strokeWidth="2" />
          ))}
          <text x="86" y="70" fill={vizTheme.labelText} className="text-sm font-black uppercase tracking-[0.18em]">{t({ en: "Distance = speed x time", zh: "距離 = 速率 x 時間" })}</text>
          <text x="346" y="90" fill={vizTheme.text} className="text-3xl font-black">{distanceValue} km</text>
        </svg>
      </div>
      <div className="space-y-4">
        {[
          { label: t({ en: "Speed (km/h)", zh: "速率（公里/小時）" }), value: speed, min: 1, max: 6, setter: setSpeed },
          { label: t({ en: "Time (hours)", zh: "時間（小時）" }), value: hours, min: 1, max: 6, setter: setHours }
        ].map((control) => (
          <label key={control.label} className="block rounded-3xl border border-slate-200/70 bg-white/70 p-5 dark:border-white/10 dark:bg-white/[0.055]">
            <span className="flex items-center justify-between text-sm font-bold text-slate-700 dark:text-slate-200">
              {control.label}
              <strong>{control.value}</strong>
            </span>
            <input type="range" min={control.min} max={control.max} step="1" value={control.value} onChange={(event) => control.setter(Number(event.target.value))} onPointerUp={recordSpeedChange} onKeyUp={recordSpeedChange} className="mt-4 w-full accent-cyan-500" />
          </label>
        ))}
        <VisualizationResetButton moduleId={moduleId} topicId={topicId} onReset={resetModel} />
      </div>
    </div>
  );
}

export function CoordinatePlaneDemo({ topicId = "coordinates" }: { topicId?: string }) {
  const { recordLearningEvent, t } = useSettings();
  const vizTheme = useVisualizationTheme();
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [points, setPoints] = useState<PlotPoint[]>([
    { x: -4, y: -2 },
    { x: 2, y: 3 },
    { x: 5, y: -1 }
  ]);
  const [mode, setMode] = useState<TransformMode>("original");
  const [inputX, setInputX] = useState(1);
  const [inputY, setInputY] = useState(1);
  const [selectedPoint, setSelectedPoint] = useState<PlotPoint | null>(null);
  const [pointInputError, setPointInputError] = useState("");

  const transformed = useMemo(() => points.map((point) => transformPoint(point, mode)), [mode, points]);
  const visibleTransformed = useMemo(() => transformed.map(clampVisiblePoint), [transformed]);
  const xTicks = Array.from({ length: 17 }, (_, index) => index - 8);
  const yTicks = Array.from({ length: 13 }, (_, index) => index - 6);
  const selectedLabel = selectedPoint ? `(${formatNumber(selectedPoint.x)}, ${formatNumber(selectedPoint.y)})` : "";
  const selectedLabelWidth = Math.max(88, selectedLabel.length * 7 + 18);
  const selectedLabelX = selectedPoint ? clamp(mapX(selectedPoint.x) + 12, padding, width - padding - selectedLabelWidth) : 0;
  const selectedLabelY = selectedPoint ? clamp(mapY(selectedPoint.y) - 14, padding + 18, height - padding - 8) : 0;
  const pointRangeError = t({
    en: "Use x from -8 to 8 and y from -6 to 6.",
    zh: "x 請使用 -8 至 8，y 請使用 -6 至 6。",
    zhHans: "x 请使用 -8 至 8，y 请使用 -6 至 6。"
  });
  const duplicatePointError = t({
    en: "That point is already plotted. Choose a different coordinate.",
    zh: "這個點已經標示，請選擇另一組坐標。",
    zhHans: "这个点已经标出，请选择另一组坐标。"
  });

  if (topicId === "p1-counting-number-bonds") return <PrimaryCountingNumberBondsLab topicId={topicId} />;
  if (topicId === "p1-addition-subtraction") return <PrimaryNumberLineLab topicId={topicId} />;
  if (topicId === "p2-place-value") return <PlaceValueLab topicId={topicId} />;
  if (topicId === "p4-decimals") return <DecimalNumberLineLab topicId={topicId} />;
  if (topicId === "p6-speed") return <SpeedGraphLab topicId={topicId} />;

  function addPoint() {
    if (inputX < xMin || inputX > xMax || inputY < yMin || inputY > yMax) {
      setPointInputError(pointRangeError);
      return;
    }

    const storedPoint = inverseTransformPoint({ x: inputX, y: inputY }, mode);
    if (points.some((point) => Math.abs(point.x - storedPoint.x) < 0.0001 && Math.abs(point.y - storedPoint.y) < 0.0001)) {
      setPointInputError(duplicatePointError);
      return;
    }

    setPoints((current) => [...current, storedPoint].slice(-8));
    setPointInputError("");
    recordLearningEvent({
      type: "visualization-probe",
      source: "coordinate-plane",
      topicId
    });
  }

  function handlePlanePointer(event: PointerEvent<SVGSVGElement>) {
    const svgPoint = getSvgPoint(svgRef.current, event);
    if (!svgPoint || !isInsidePlot(svgPoint.x, svgPoint.y)) return;

    setSelectedPoint({
      x: clamp(unmapX(svgPoint.x), xMin, xMax),
      y: clamp(unmapY(svgPoint.y), yMin, yMax)
    });
  }

  function resetModel() {
    setPoints([{ x: -4, y: -2 }, { x: 2, y: 3 }, { x: 5, y: -1 }]);
    setMode("original");
    setInputX(1);
    setInputY(1);
    setSelectedPoint(null);
    setPointInputError("");
    recordLearningEvent({
      type: "visualization-reset",
      source: "coordinate-plane",
      topicId
    });
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
      <div className={vizTheme.compactSurfaceClassName}>
        <svg
          data-viz-surface
          ref={svgRef}
          role="img"
          aria-label={t({ en: "Coordinate plane with animated transformations", zh: "帶有動畫變換的坐標平面" })}
          viewBox={`0 0 ${width} ${height}`}
          className="h-[360px] w-full cursor-crosshair touch-none sm:h-[420px]"
          onPointerDown={(event) => {
            recordLearningEvent({
              type: "visualization-probe",
              source: "coordinate-plane",
              topicId
            });
            handlePlanePointer(event);
          }}
          onPointerMove={(event) => {
            if (event.buttons === 1) handlePlanePointer(event);
          }}
        >
          <rect width={width} height={height} fill={vizTheme.svgBackground} />
          {xTicks.map((tick) => (
            <g key={`x-${tick}`}>
              <line x1={mapX(tick)} x2={mapX(tick)} y1={padding} y2={height - padding} stroke={vizTheme.grid} strokeWidth={tick === 0 ? 1.5 : 1} />
              <text x={mapX(tick)} y={height - 12} textAnchor="middle" fill={vizTheme.tickText} className="text-[10px] font-bold">{tick}</text>
            </g>
          ))}
          {yTicks.map((tick) => (
            <g key={`y-${tick}`}>
              <line x1={padding} x2={width - padding} y1={mapY(tick)} y2={mapY(tick)} stroke={vizTheme.grid} strokeWidth={tick === 0 ? 1.5 : 1} />
              <text x={16} y={mapY(tick) + 3} fill={vizTheme.tickText} className="text-[10px] font-bold">{tick}</text>
            </g>
          ))}
          <line x1={padding} x2={width - padding} y1={mapY(0)} y2={mapY(0)} stroke={vizTheme.axisStrong} strokeWidth="2.2" />
          <line x1={mapX(0)} x2={mapX(0)} y1={padding} y2={height - padding} stroke={vizTheme.axisStrong} strokeWidth="2.2" />
          <g aria-hidden="true" pointerEvents="none">
            <text x={width - padding + 10} y={mapY(0) + 18} fill={vizTheme.labelText} className="text-sm font-black">x</text>
            <text x={mapX(0) + 12} y={padding - 12} fill={vizTheme.labelText} className="text-sm font-black">y</text>
          </g>
          {transformed.length > 1 ? (
            <polyline
              data-viz-mark
              data-viz-name="transformed point path"
              data-viz-transform-mode={mode}
              data-viz-point-count={transformed.length}
              points={visibleTransformed.map((point) => `${mapX(point.x)},${mapY(point.y)}`).join(" ")}
              fill="none"
              stroke="#22d3ee"
              strokeWidth="3"
              strokeDasharray="8 8"
            />
          ) : null}
          {transformed.map((point, index) => {
            const label = `P${index + 1}(${formatNumber(point.x)}, ${formatNumber(point.y)})`;
            const visiblePoint = visibleTransformed[index];
            const labelPosition = getPointLabelPosition(visiblePoint, label);

            return (
              <g key={`${index}-${points[index].x}-${points[index].y}`}>
                <motion.circle
                  data-viz-mark
                  data-viz-name="transformed point"
                  data-viz-index={index + 1}
                  data-viz-transform-mode={mode}
                  data-viz-original-x={formatNumber(points[index].x, 4)}
                  data-viz-original-y={formatNumber(points[index].y, 4)}
                  data-viz-x={formatNumber(point.x, 4)}
                  data-viz-y={formatNumber(point.y, 4)}
                  data-viz-visible-x={formatNumber(visiblePoint.x, 4)}
                  data-viz-visible-y={formatNumber(visiblePoint.y, 4)}
                  data-viz-clipped={String(point.x !== visiblePoint.x || point.y !== visiblePoint.y)}
                  cx={mapX(visiblePoint.x)}
                  cy={mapY(visiblePoint.y)}
                  r="9"
                  fill={index % 2 === 0 ? "#22d3ee" : "#f472b6"}
                  stroke={vizTheme.pointStroke}
                  strokeWidth="2"
                  initial={false}
                  animate={{ cx: mapX(visiblePoint.x), cy: mapY(visiblePoint.y) }}
                  transition={{ type: "spring", stiffness: 140, damping: 20 }}
                />
                <text x={labelPosition.x} y={labelPosition.y} fill={vizTheme.text} className="text-xs font-bold">
                  {label}
                </text>
              </g>
            );
          })}
          {selectedPoint ? (
            <g
              data-viz-mark
              data-viz-name="selected coordinate"
              data-viz-x={formatNumber(selectedPoint.x, 4)}
              data-viz-y={formatNumber(selectedPoint.y, 4)}
              pointerEvents="none"
            >
              <line x1={mapX(selectedPoint.x)} x2={mapX(selectedPoint.x)} y1={mapY(selectedPoint.y)} y2={mapY(0)} stroke="#67e8f9" strokeDasharray="4 6" opacity="0.5" />
              <line x1={mapX(0)} x2={mapX(selectedPoint.x)} y1={mapY(selectedPoint.y)} y2={mapY(selectedPoint.y)} stroke="#67e8f9" strokeDasharray="4 6" opacity="0.5" />
              <circle cx={mapX(selectedPoint.x)} cy={mapY(selectedPoint.y)} r="7" fill="#22d3ee" stroke={vizTheme.pointStroke} strokeWidth="2.5" />
              <rect x={selectedLabelX} y={selectedLabelY - 18} width={selectedLabelWidth} height="26" rx="9" fill={vizTheme.labelFill} stroke={vizTheme.labelStroke} />
              <text data-viz-overlap-ok x={selectedLabelX + 9} y={selectedLabelY} fill={vizTheme.labelText} className="text-[11px] font-bold">{selectedLabel}</text>
            </g>
          ) : null}
        </svg>
      </div>

      <div className="space-y-4">
        <div className="rounded-3xl border border-slate-200/70 bg-white/70 p-5 dark:border-white/10 dark:bg-white/[0.055]">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-cyan-500 dark:text-cyan-300">{t({ en: "Plot a point", zh: "標示點" })}</p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <label className="text-sm font-bold text-slate-600 dark:text-slate-300">x
              <input
                type="number"
                min={xMin}
                max={xMax}
                value={inputX}
                aria-describedby={pointInputError ? "coordinate-point-range-error" : undefined}
                onChange={(event) => {
                  setInputX(Number(event.target.value));
                  setPointInputError("");
                  recordLearningEvent({
                    type: "keyboard",
                    source: "coordinate-plane",
                    topicId
                  });
                }}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-white/10 dark:bg-slate-950"
              />
            </label>
            <label className="text-sm font-bold text-slate-600 dark:text-slate-300">y
              <input
                type="number"
                min={yMin}
                max={yMax}
                value={inputY}
                aria-describedby={pointInputError ? "coordinate-point-range-error" : undefined}
                onChange={(event) => {
                  setInputY(Number(event.target.value));
                  setPointInputError("");
                  recordLearningEvent({
                    type: "keyboard",
                    source: "coordinate-plane",
                    topicId
                  });
                }}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-white/10 dark:bg-slate-950"
              />
            </label>
          </div>
          {pointInputError ? (
            <p id="coordinate-point-range-error" role="alert" className="mt-3 rounded-2xl border border-amber-300/60 bg-amber-100/70 px-3 py-2 text-sm font-bold text-amber-800 dark:border-amber-200/30 dark:bg-amber-300/10 dark:text-amber-100">
              {pointInputError}
            </p>
          ) : null}
          <button type="button" onClick={addPoint} className="focus-ring mt-3 w-full rounded-2xl bg-slate-950 px-4 py-3 font-bold text-white transition hover:-translate-y-1 dark:bg-white dark:text-slate-950">{t({ en: "Add point", zh: "加入點" })}</button>
          <div className="mt-4 flex justify-between gap-3 rounded-2xl bg-slate-100 px-4 py-3 text-sm dark:bg-white/[0.08]">
            <span className="text-slate-500 dark:text-slate-400">{t({ en: "Clicked coordinate", zh: "已點選坐標" })}</span>
            <strong className="text-slate-800 dark:text-white">{selectedPoint ? selectedLabel : "—"}</strong>
          </div>
        </div>
        <div className="grid gap-2 rounded-3xl border border-slate-200/70 bg-white/70 p-5 dark:border-white/10 dark:bg-white/[0.055]">
          <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{t({ en: "Transformation", zh: "變換" })}</p>
          {([
            ["original", t({ en: "Original", zh: "原像" })],
            ["translate", t({ en: "Translate (+2, +1)", zh: "平移 (+2, +1)" })],
            ["reflect", t({ en: "Reflect in y-axis", zh: "以 y 軸反射" })]
          ] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => {
                setMode(value);
                recordLearningEvent({
                  type: "visualization-probe",
                  source: "coordinate-plane",
                  topicId
                });
              }}
              className={`focus-ring rounded-2xl px-4 py-3 text-left text-sm font-bold transition ${mode === value ? "bg-cyan-500 text-slate-950" : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-white/[0.08] dark:text-slate-200 dark:hover:bg-white/[0.13]"}`}
            >
              {label}
            </button>
          ))}
          <VisualizationResetButton
            label={{ en: "Reset plane", zh: "重設平面", zhHans: "重设平面" }}
            moduleId={moduleId}
            topicId={topicId}
            onReset={resetModel}
          />
        </div>
      </div>
    </div>
  );
}
