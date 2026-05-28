"use client";

import { PointerEvent, useMemo, useRef, useState } from "react";
import { motion } from "@/components/ui/Motion";
import { useSettings } from "@/components/providers/AppProviders";
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

function PrimaryCountingNumberBondsLab({ topicId }: { topicId: string }) {
  const { recordLearningEvent, t } = useSettings();
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

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
      <div className="rounded-3xl border border-slate-200/70 bg-slate-950 p-5 dark:border-white/10">
        <svg data-viz-surface role="img" aria-label={t({ en: "Primary 1 counting and number bonds model", zh: "小一數數與數的組合模型" })} viewBox="0 0 640 360" className="h-[340px] w-full sm:h-[380px]">
          <rect x="34" y="34" width="572" height="292" rx="28" fill="rgba(255,255,255,.025)" stroke="rgba(255,255,255,.1)" />
          <text x="64" y="76" className="fill-cyan-200 text-sm font-black uppercase tracking-[0.18em]">{t({ en: "Count objects, then split the total", zh: "先數物件，再分拆總數" })}</text>
          <g data-viz-mark transform="translate(72 112)">
            {slots.map((slot) => {
              const row = Math.floor(slot / 10);
              const col = slot % 10;
              const filled = slot < total;
              const fill = !filled ? "rgba(255,255,255,.08)" : slot < part ? "#38bdf8" : "#facc15";

              return (
                <circle
                  key={slot}
                  cx={col * 42}
                  cy={row * 44}
                  r="15"
                  fill={fill}
                  stroke={filled ? "white" : "rgba(255,255,255,.32)"}
                  strokeWidth={filled ? 4 : 3}
                />
              );
            })}
          </g>
          <line data-viz-mark x1="224" x2="314" y1="238" y2="220" stroke="white" strokeWidth="8" strokeLinecap="round" opacity="0.9" />
          <line data-viz-mark x1="224" x2="314" y1="260" y2="306" stroke="white" strokeWidth="8" strokeLinecap="round" opacity="0.9" />
          <circle data-viz-mark cx="190" cy="248" r="42" fill="#ef4444" opacity="0.92" />
          <circle data-viz-mark cx="350" cy="220" r="38" fill="#38bdf8" opacity="0.92" />
          <circle data-viz-mark cx="350" cy="306" r="38" fill="#facc15" opacity="0.92" />
          <text data-viz-overlap-ok x="190" y="260" textAnchor="middle" className="fill-slate-950 text-4xl font-black">{total}</text>
          <text data-viz-overlap-ok x="350" y="232" textAnchor="middle" className="fill-slate-950 text-3xl font-black">{part}</text>
          <text data-viz-overlap-ok x="350" y="318" textAnchor="middle" className="fill-slate-950 text-3xl font-black">{missingPart}</text>
          <rect x="420" y="258" width="184" height="48" rx="16" fill="rgba(15,23,42,.92)" stroke="rgba(103,232,249,.45)" strokeWidth="3" />
          <text x="512" y="290" textAnchor="middle" className="fill-white text-2xl font-black">{expression}</text>
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
      </div>
    </div>
  );
}

function PrimaryNumberLineLab({ topicId }: { topicId: string }) {
  const { recordLearningEvent, t } = useSettings();
  const [start, setStart] = useState(3);
  const [jump, setJump] = useState(2);
  const [operation, setOperation] = useState<"add" | "subtract">("add");
  const end = operation === "add" ? start + jump : start - jump;
  const ticks = Array.from({ length: 11 }, (_, index) => index);
  const startX = 58 + start * 48;
  const endX = 58 + end * 48;
  const midX = (startX + endX) / 2;
  const arcY = operation === "add" ? 112 : 166;
  const controlY = operation === "add" ? 42 : 212;
  const expression = operation === "add" ? `${start} + ${jump} = ${end}` : `${start} - ${jump} = ${end}`;

  function recordNumberLineChange() {
    recordLearningEvent({
      type: "visualization-slider",
      source: "coordinate-plane",
      topicId
    });
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
      <div className="rounded-3xl border border-slate-200/70 bg-slate-950 p-5 dark:border-white/10">
        <svg data-viz-surface role="img" aria-label={t({ en: "Primary 1 number line steps", zh: "小一數線步行" })} viewBox="0 0 640 400" className="h-[380px] w-full sm:h-[430px]">
          <rect x="34" y="24" width="572" height="342" rx="28" fill="rgba(255,255,255,.025)" stroke="rgba(255,255,255,.1)" />
          <line x1="58" x2="538" y1="160" y2="160" stroke="rgba(255,255,255,.72)" strokeWidth="6" strokeLinecap="round" />
          {ticks.map((tick) => (
            <g key={tick}>
              <line x1={58 + tick * 48} x2={58 + tick * 48} y1="138" y2="182" stroke="white" strokeWidth={tick === start || tick === end ? 5 : 3} opacity={tick === start || tick === end ? 1 : 0.58} />
              <text x={58 + tick * 48} y="218" textAnchor="middle" className="fill-white/80 text-sm font-black">{tick}</text>
            </g>
          ))}
          <path
            data-viz-mark
            d={`M ${startX} ${arcY} C ${midX} ${controlY} ${midX} ${controlY} ${endX} ${arcY}`}
            fill="none"
            stroke={operation === "add" ? "#22c55e" : "#f472b6"}
            strokeWidth="8"
            strokeLinecap="round"
          />
          <path
            data-viz-mark
            d={operation === "add" ? `M ${endX} ${arcY} l -18 -8 l 7 20 z` : `M ${endX} ${arcY} l 18 -8 l -7 20 z`}
            fill={operation === "add" ? "#22c55e" : "#f472b6"}
          />
          <circle data-viz-mark cx={startX} cy="160" r="14" fill="#38bdf8" stroke="white" strokeWidth="4" />
          <circle data-viz-mark cx={endX} cy="160" r="14" fill="#facc15" stroke="white" strokeWidth="4" />
          <text x="68" y="48" className="fill-cyan-200 text-sm font-black uppercase tracking-[0.18em]">{t({ en: "Count the jumps", zh: "數出步數" })}</text>
          <rect x="222" y="252" width="196" height="58" rx="20" fill="rgba(15,23,42,.92)" stroke="rgba(103,232,249,.45)" strokeWidth="3" />
          <text x="320" y="290" textAnchor="middle" className="fill-white text-3xl font-black">{expression}</text>
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
          { label: t({ en: "Start number", zh: "起點數字" }), value: start, min: jump, max: 10 - jump, setter: setStart },
          { label: t({ en: "Jump size", zh: "跳幾格" }), value: jump, min: 1, max: 5, setter: setJump }
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
      </div>
    </div>
  );
}

function PlaceValueLab({ topicId }: { topicId: string }) {
  const { recordLearningEvent, t } = useSettings();
  const [hundreds, setHundreds] = useState(2);
  const [tens, setTens] = useState(4);
  const [ones, setOnes] = useState(3);
  const value = hundreds * 100 + tens * 10 + ones;

  function recordPlaceValueChange() {
    recordLearningEvent({ type: "visualization-slider", source: "coordinate-plane", topicId });
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
      <div className="rounded-3xl border border-slate-200/70 bg-slate-950 p-5 dark:border-white/10">
        <svg data-viz-surface role="img" aria-label={t({ en: "Primary 2 base ten place value model", zh: "小二十進位位值模型" })} viewBox="0 0 640 360" className="h-[340px] w-full sm:h-[380px]">
          <rect x="34" y="34" width="572" height="292" rx="28" fill="rgba(255,255,255,.025)" stroke="rgba(255,255,255,.1)" />
          <text x="64" y="76" className="fill-cyan-200 text-sm font-black uppercase tracking-[0.18em]">{t({ en: "Hundreds · Tens · Ones", zh: "百 · 十 · 個" })}</text>
          <text x="424" y="80" className="fill-white text-4xl font-black">{value}</text>
          {Array.from({ length: 10 }, (_, row) => (
            Array.from({ length: 10 }, (_, col) => (
              <rect data-viz-mark key={`${row}-${col}`} x={68 + col * 10} y={108 + row * 10} width="8" height="8" fill={hundreds >= 1 ? "#22d3ee" : "rgba(255,255,255,.08)"} />
            ))
          ))}
          {hundreds >= 2 ? Array.from({ length: 10 }, (_, row) => (
            Array.from({ length: 10 }, (_, col) => (
              <rect data-viz-mark key={`b-${row}-${col}`} x={190 + col * 10} y={108 + row * 10} width="8" height="8" fill="#38bdf8" />
            ))
          )) : null}
          {hundreds >= 3 ? Array.from({ length: 10 }, (_, row) => (
            Array.from({ length: 10 }, (_, col) => (
              <rect data-viz-mark key={`c-${row}-${col}`} x={312 + col * 10} y={108 + row * 10} width="8" height="8" fill="#67e8f9" />
            ))
          )) : null}
          {Array.from({ length: tens }, (_, index) => (
            <rect data-viz-mark key={index} x={70 + index * 28} y="244" width="20" height="74" rx="6" fill="#f472b6" opacity="0.86" />
          ))}
          {Array.from({ length: ones }, (_, index) => (
            <circle data-viz-mark key={index} cx={390 + index * 28} cy="282" r="11" fill="#facc15" stroke="white" strokeWidth="2" />
          ))}
          <text x="66" y="338" className="fill-white/70 text-sm font-bold">{value} = {hundreds * 100} + {tens * 10} + {ones}</text>
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
      </div>
    </div>
  );
}

function DecimalNumberLineLab({ topicId }: { topicId: string }) {
  const { recordLearningEvent, t } = useSettings();
  const [tenths, setTenths] = useState(3);
  const [hundredths, setHundredths] = useState(7);
  const decimal = tenths / 10 + hundredths / 100;
  const markerX = 70 + decimal * 500;

  function recordDecimalChange() {
    recordLearningEvent({ type: "visualization-slider", source: "coordinate-plane", topicId });
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
      <div className="rounded-3xl border border-slate-200/70 bg-slate-950 p-5 dark:border-white/10">
        <svg data-viz-surface role="img" aria-label={t({ en: "Primary 4 decimal number line", zh: "小四小數數線" })} viewBox="0 0 640 360" className="h-[340px] w-full sm:h-[380px]">
          <rect x="34" y="34" width="572" height="292" rx="28" fill="rgba(255,255,255,.025)" stroke="rgba(255,255,255,.1)" />
          <line data-viz-mark x1="70" x2="570" y1="176" y2="176" stroke="rgba(255,255,255,.72)" strokeWidth="6" strokeLinecap="round" />
          {Array.from({ length: 101 }, (_, index) => (
            <line key={index} x1={70 + index * 5} x2={70 + index * 5} y1={index % 10 === 0 ? 146 : 164} y2={index % 10 === 0 ? 206 : 188} stroke="white" strokeWidth={index % 10 === 0 ? 3 : 1} opacity={index % 10 === 0 ? 0.78 : 0.24} />
          ))}
          {[0, 0.5, 1].map((tick) => (
            <text key={tick} x={70 + tick * 500} y="236" textAnchor="middle" className="fill-white/75 text-sm font-black">{tick}</text>
          ))}
          <line data-viz-mark x1={markerX} x2={markerX} y1="76" y2="176" stroke="#f472b6" strokeWidth="5" strokeDasharray="8 8" />
          <circle data-viz-mark cx={markerX} cy="176" r="15" fill="#22d3ee" stroke="white" strokeWidth="4" />
          <text x="72" y="56" className="fill-cyan-200 text-sm font-black uppercase tracking-[0.18em]">{t({ en: "Tenths and hundredths", zh: "十分位和百分位" })}</text>
          <text x="278" y="100" className="fill-white text-4xl font-black">{decimal.toFixed(2)}</text>
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
      </div>
    </div>
  );
}

function SpeedGraphLab({ topicId }: { topicId: string }) {
  const { recordLearningEvent, t } = useSettings();
  const [speed, setSpeed] = useState(4);
  const [hours, setHours] = useState(5);
  const distanceValue = speed * hours;
  const points = Array.from({ length: hours + 1 }, (_, index) => ({ time: index, distance: index * speed }));
  const x0 = 70;
  const y0 = 290;
  const graphWidth = 500;
  const graphHeight = 210;

  function x(time: number) {
    return x0 + (time / 6) * graphWidth;
  }

  function y(distancePoint: number) {
    return y0 - (distancePoint / 30) * graphHeight;
  }

  function recordSpeedChange() {
    recordLearningEvent({ type: "visualization-slider", source: "coordinate-plane", topicId });
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
      <div className="rounded-3xl border border-slate-200/70 bg-slate-950 p-5 dark:border-white/10">
        <svg data-viz-surface role="img" aria-label={t({ en: "Primary 6 speed distance time graph", zh: "小六速率距離時間圖" })} viewBox="0 0 640 360" className="h-[340px] w-full sm:h-[380px]">
          <rect x="34" y="34" width="572" height="292" rx="28" fill="rgba(255,255,255,.025)" stroke="rgba(255,255,255,.1)" />
          <line x1={x0} x2={x0 + graphWidth} y1={y0} y2={y0} stroke="white" strokeWidth="4" opacity="0.65" />
          <line x1={x0} x2={x0} y1={y0 - graphHeight} y2={y0} stroke="white" strokeWidth="4" opacity="0.65" />
          {[0, 1, 2, 3, 4, 5, 6].map((tick) => (
            <g key={tick}>
              <line x1={x(tick)} x2={x(tick)} y1={y0 - graphHeight} y2={y0} stroke="white" opacity="0.08" />
              <text x={x(tick)} y={y0 + 28} textAnchor="middle" className="fill-white/60 text-xs font-bold">{tick}h</text>
            </g>
          ))}
          {[0, 10, 20, 30].map((tick) => (
            <g key={tick}>
              <line x1={x0} x2={x0 + graphWidth} y1={y(tick)} y2={y(tick)} stroke="white" opacity="0.08" />
              <text x={x0 - 18} y={y(tick) + 4} textAnchor="end" className="fill-white/60 text-xs font-bold">{tick}</text>
            </g>
          ))}
          <polyline data-viz-mark points={points.map((point) => `${x(point.time)},${y(point.distance)}`).join(" ")} fill="none" stroke="#22d3ee" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
          {points.map((point) => (
            <circle data-viz-mark key={point.time} cx={x(point.time)} cy={y(point.distance)} r="8" fill="#f472b6" stroke="white" strokeWidth="2" />
          ))}
          <text x="86" y="70" className="fill-cyan-200 text-sm font-black uppercase tracking-[0.18em]">{t({ en: "Distance = speed x time", zh: "距離 = 速率 x 時間" })}</text>
          <text x="346" y="90" className="fill-white text-3xl font-black">{distanceValue} km</text>
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
      </div>
    </div>
  );
}

export function CoordinatePlaneDemo({ topicId = "coordinates" }: { topicId?: string }) {
  const { recordLearningEvent, t } = useSettings();
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

  const transformed = useMemo(() => points.map((point) => transformPoint(point, mode)), [mode, points]);
  const xTicks = Array.from({ length: 17 }, (_, index) => index - 8);
  const yTicks = Array.from({ length: 13 }, (_, index) => index - 6);
  const selectedLabel = selectedPoint ? `(${formatNumber(selectedPoint.x)}, ${formatNumber(selectedPoint.y)})` : "";
  const selectedLabelWidth = Math.max(88, selectedLabel.length * 7 + 18);
  const selectedLabelX = selectedPoint ? clamp(mapX(selectedPoint.x) + 12, padding, width - padding - selectedLabelWidth) : 0;
  const selectedLabelY = selectedPoint ? clamp(mapY(selectedPoint.y) - 14, padding + 18, height - padding - 8) : 0;

  if (topicId === "p1-counting-number-bonds") return <PrimaryCountingNumberBondsLab topicId={topicId} />;
  if (topicId === "p1-addition-subtraction") return <PrimaryNumberLineLab topicId={topicId} />;
  if (topicId === "p2-place-value") return <PlaceValueLab topicId={topicId} />;
  if (topicId === "p4-decimals") return <DecimalNumberLineLab topicId={topicId} />;
  if (topicId === "p6-speed") return <SpeedGraphLab topicId={topicId} />;

  function addPoint() {
    setPoints((current) => [...current, { x: clamp(inputX, xMin, xMax), y: clamp(inputY, yMin, yMax) }].slice(-8));
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

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
      <div className="rounded-3xl border border-slate-200/70 bg-slate-950 p-3 dark:border-white/10">
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
          {xTicks.map((tick) => (
            <g key={`x-${tick}`}>
              <line x1={mapX(tick)} x2={mapX(tick)} y1={padding} y2={height - padding} className="stroke-white/10" strokeWidth={tick === 0 ? 1.5 : 1} />
              {tick !== 0 ? <text x={mapX(tick)} y={height - 12} textAnchor="middle" className="fill-white/35 text-[10px]">{tick}</text> : null}
            </g>
          ))}
          {yTicks.map((tick) => (
            <g key={`y-${tick}`}>
              <line x1={padding} x2={width - padding} y1={mapY(tick)} y2={mapY(tick)} className="stroke-white/10" strokeWidth={tick === 0 ? 1.5 : 1} />
              {tick !== 0 ? <text x={16} y={mapY(tick) + 3} className="fill-white/35 text-[10px]">{tick}</text> : null}
            </g>
          ))}
          <line x1={padding} x2={width - padding} y1={mapY(0)} y2={mapY(0)} className="stroke-white/35" />
          <line x1={mapX(0)} x2={mapX(0)} y1={padding} y2={height - padding} className="stroke-white/35" />
          {transformed.length > 1 ? (
            <polyline
              data-viz-mark
              points={transformed.map((point) => `${mapX(point.x)},${mapY(point.y)}`).join(" ")}
              fill="none"
              stroke="#22d3ee"
              strokeWidth="3"
              strokeDasharray="8 8"
            />
          ) : null}
          {transformed.map((point, index) => (
            <g key={`${index}-${points[index].x}-${points[index].y}`}>
              <motion.circle
                data-viz-mark
                cx={mapX(point.x)}
                cy={mapY(point.y)}
                r="9"
                fill={index % 2 === 0 ? "#22d3ee" : "#f472b6"}
                stroke="white"
                strokeWidth="2"
                initial={false}
                animate={{ cx: mapX(point.x), cy: mapY(point.y) }}
                transition={{ type: "spring", stiffness: 140, damping: 20 }}
              />
              <motion.text
                x={mapX(point.x) + 12}
                y={mapY(point.y) - 12}
                className="fill-white text-xs font-bold"
                initial={false}
                animate={{ x: mapX(point.x) + 12, y: mapY(point.y) - 12 }}
              >
                P{index + 1}({formatNumber(point.x)}, {formatNumber(point.y)})
              </motion.text>
            </g>
          ))}
          {selectedPoint ? (
            <g pointerEvents="none">
              <line x1={mapX(selectedPoint.x)} x2={mapX(selectedPoint.x)} y1={mapY(selectedPoint.y)} y2={mapY(0)} stroke="#67e8f9" strokeDasharray="4 6" opacity="0.5" />
              <line x1={mapX(0)} x2={mapX(selectedPoint.x)} y1={mapY(selectedPoint.y)} y2={mapY(selectedPoint.y)} stroke="#67e8f9" strokeDasharray="4 6" opacity="0.5" />
              <circle cx={mapX(selectedPoint.x)} cy={mapY(selectedPoint.y)} r="7" fill="#22d3ee" stroke="white" strokeWidth="2.5" />
              <rect x={selectedLabelX} y={selectedLabelY - 18} width={selectedLabelWidth} height="26" rx="9" fill="#020617" stroke="rgba(103, 232, 249, 0.65)" />
              <text data-viz-overlap-ok x={selectedLabelX + 9} y={selectedLabelY} className="fill-cyan-100 text-[11px] font-bold">{selectedLabel}</text>
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
                onChange={(event) => {
                  setInputX(Number(event.target.value));
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
                onChange={(event) => {
                  setInputY(Number(event.target.value));
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
          <button
            type="button"
            onClick={() => {
              setPoints([{ x: -4, y: -2 }, { x: 2, y: 3 }, { x: 5, y: -1 }]);
              setMode("original");
              recordLearningEvent({
                type: "visualization-reset",
                source: "coordinate-plane",
                topicId
              });
            }}
            className="focus-ring rounded-2xl border border-slate-200/70 px-4 py-3 text-sm font-bold transition hover:bg-slate-100 dark:border-white/10 dark:hover:bg-white/[0.08]"
          >
            {t({ en: "Reset plane", zh: "重設平面" })}
          </button>
        </div>
      </div>
    </div>
  );
}
