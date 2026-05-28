"use client";

import { useMemo, useState } from "react";
import { motion } from "@/components/ui/Motion";
import { MathText } from "@/components/math/MathText";
import { useSettings } from "@/components/providers/AppProviders";
import { formatNumber } from "@/lib/math";

const width = 640;
const height = 420;
const padding = 40;
const xMin = 0;
const xMax = 360;
const yMin = -4;
const yMax = 4;

function mapX(x: number) {
  return padding + ((x - xMin) / (xMax - xMin)) * (width - padding * 2);
}

function mapY(y: number) {
  return height - padding - ((y - yMin) / (yMax - yMin)) * (height - padding * 2);
}

function waveValue(x: number, amplitude: number, period: number, phase: number) {
  return amplitude * Math.sin((2 * Math.PI * (x - phase)) / period);
}

function buildWavePath(amplitude: number, period: number, phase: number) {
  return Array.from({ length: 220 }, (_, index) => xMin + (index / 219) * (xMax - xMin))
    .map((x, index) => `${index === 0 ? "M" : "L"} ${mapX(x).toFixed(2)} ${mapY(waveValue(x, amplitude, period, phase)).toFixed(2)}`)
    .join(" ");
}

export function TrigWaveExplorer({ topicId = "trigonometry-s5" }: { topicId?: string }) {
  const { recordLearningEvent, t } = useSettings();
  const [amplitude, setAmplitude] = useState(2);
  const [period, setPeriod] = useState(180);
  const [phase, setPhase] = useState(30);
  const path = useMemo(() => buildWavePath(amplitude, period, phase), [amplitude, period, phase]);
  const sampleX = 120;
  const sampleY = waveValue(sampleX, amplitude, period, phase);

  function recordSlider() {
    recordLearningEvent({
      type: "visualization-slider",
      source: "trig-wave",
      topicId
    });
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
      <div className="rounded-3xl border border-slate-200/70 bg-slate-950 p-3 dark:border-white/10">
        <svg
          data-viz-surface
          role="img"
          aria-label={t({ en: "Sine wave graph with adjustable amplitude, period, and phase shift", zh: "可調整振幅、周期和平移的正弦波圖像" })}
          viewBox={`0 0 ${width} ${height}`}
          className="h-[360px] w-full sm:h-[420px]"
        >
          {[0, 90, 180, 270, 360].map((tick) => (
            <g key={`x-${tick}`}>
              <line x1={mapX(tick)} x2={mapX(tick)} y1={padding} y2={height - padding} className="stroke-white/10" />
              <text x={mapX(tick)} y={height - 14} textAnchor="middle" className="fill-white/35 text-[10px]">{tick}</text>
            </g>
          ))}
          {[-4, -2, 0, 2, 4].map((tick) => (
            <g key={`y-${tick}`}>
              <line x1={padding} x2={width - padding} y1={mapY(tick)} y2={mapY(tick)} className="stroke-white/10" />
              <text x={18} y={mapY(tick) + 3} className="fill-white/35 text-[10px]">{tick}</text>
            </g>
          ))}
          <line x1={padding} x2={width - padding} y1={mapY(0)} y2={mapY(0)} className="stroke-white/35" />
          <motion.path
            data-viz-mark
            d={path}
            fill="none"
            stroke="#22d3ee"
            strokeWidth="4"
            strokeLinecap="round"
            initial={false}
            animate={{ pathLength: 1 }}
          />
          <line data-viz-mark x1={mapX(sampleX)} x2={mapX(sampleX)} y1={mapY(0)} y2={mapY(sampleY)} stroke="#f472b6" strokeDasharray="5 7" />
          <circle data-viz-mark cx={mapX(sampleX)} cy={mapY(sampleY)} r="7" fill="#f472b6" stroke="white" strokeWidth="2" />
          <text x={mapX(sampleX) + 12} y={mapY(sampleY) - 10} className="fill-white text-xs font-bold">
            y = {formatNumber(sampleY, 2)}
          </text>
        </svg>
      </div>

      <div className="space-y-4">
        <div className="rounded-3xl border border-slate-200/70 bg-white/70 p-5 dark:border-white/10 dark:bg-white/[0.055]">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-cyan-500 dark:text-cyan-300">{t({ en: "Sine model", zh: "正弦模型" })}</p>
          <MathText
            as="p"
            text={String.raw`y = ${formatNumber(amplitude, 1)}\sin\left(\frac{2\pi(x - ${formatNumber(phase, 0)})}{${formatNumber(period, 0)}}\right)`}
            renderBareMath
            className="mt-2 text-lg font-black text-slate-950 dark:text-white"
          />
        </div>

        {[
          { label: t({ en: "Amplitude", zh: "振幅" }), value: amplitude, min: 0.5, max: 3.5, step: 0.1, setter: setAmplitude },
          { label: t({ en: "Period", zh: "周期" }), value: period, min: 90, max: 540, step: 15, setter: setPeriod },
          { label: t({ en: "Phase shift", zh: "相位平移" }), value: phase, min: -180, max: 180, step: 15, setter: setPhase }
        ].map((control) => (
          <label key={control.label} className="block rounded-3xl border border-slate-200/70 bg-white/70 p-5 dark:border-white/10 dark:bg-white/[0.055]">
            <span className="flex items-center justify-between text-sm font-bold text-slate-700 dark:text-slate-200">
              {control.label}
              <strong>{formatNumber(control.value, control.step < 1 ? 1 : 0)}</strong>
            </span>
            <input
              type="range"
              min={control.min}
              max={control.max}
              step={control.step}
              value={control.value}
              onChange={(event) => control.setter(Number(event.target.value))}
              onPointerUp={recordSlider}
              onKeyUp={recordSlider}
              className="mt-4 w-full accent-cyan-500"
            />
          </label>
        ))}

        <p className="rounded-2xl bg-cyan-500/10 p-4 text-sm leading-6 text-cyan-700 dark:text-cyan-200">
          {t({ en: "Amplitude changes height, period changes horizontal spacing, and phase shift moves the whole graph left or right.", zh: "振幅改變高度，周期改變水平間距，相位平移會把整個圖像向左或向右移動。" })}
        </p>
      </div>
    </div>
  );
}
