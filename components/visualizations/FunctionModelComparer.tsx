"use client";

import { useMemo, useState } from "react";
import { motion } from "@/components/ui/Motion";
import { useSettings } from "@/components/providers/AppProviders";
import { VisualizationResetButton } from "@/components/visualizations/VisualizationResetButton";
import { useVisualizationTheme } from "@/components/visualizations/visualizationTheme";
import {
  buildFunctionModelPath,
  evaluateFunctionModel
} from "@/components/visualizations/rawCurveGeometry";
import type { FunctionModelKey } from "@/components/visualizations/rawCurveGeometry";
import { textForLanguage } from "@/lib/i18n";
import { clamp, formatNumber } from "@/lib/math";
import type { LocalizedText } from "@/types";

type ModelKey = FunctionModelKey;

const width = 640;
const height = 420;
const padding = 40;
const xMin = 0;
const xMax = 10;
const yMin = -4;
const yMax = 14;

const modelLabels: Record<ModelKey, LocalizedText> = {
  polynomial: { en: "Polynomial", zh: "多項式" },
  exponential: { en: "Exponential", zh: "指數" },
  logarithmic: { en: "Logarithmic", zh: "對數" }
};

const modelColors: Record<ModelKey, string> = {
  polynomial: "#22d3ee",
  exponential: "#f472b6",
  logarithmic: "#a3e635"
};

const modelKeys: ModelKey[] = ["polynomial", "exponential", "logarithmic"];
const coordinateLabelHeight = 28;
const coordinateLabelGap = 18;
const moduleId = "function-model-comparer";

function mapX(x: number) {
  return padding + ((x - xMin) / (xMax - xMin)) * (width - padding * 2);
}

function mapY(y: number) {
  return height - padding - ((y - yMin) / (yMax - yMin)) * (height - padding * 2);
}

function mapVisibleY(y: number) {
  return mapY(clamp(y, yMin, yMax));
}

function curveTouchesLabel(rect: { x: number; y: number; width: number; height: number }, strength: number, shift: number) {
  const buffer = 7;
  const left = rect.x - buffer;
  const right = rect.x + rect.width + buffer;
  const top = rect.y - buffer;
  const bottom = rect.y + rect.height + buffer;

  return modelKeys.some((model) =>
    Array.from({ length: 120 }, (_, index) => xMin + (index / 119) * (xMax - xMin)).some((x) => {
      const y = clamp(evaluateFunctionModel(model, x, strength, shift), yMin - 8, yMax + 8);
      const screenX = mapX(x);
      const screenY = mapVisibleY(y);
      return screenX >= left && screenX <= right && screenY >= top && screenY <= bottom;
    })
  );
}

function labelCoversPoint(rect: { x: number; y: number; width: number; height: number }, pointX: number, pointY: number) {
  const buffer = 8;
  return pointX >= rect.x - buffer && pointX <= rect.x + rect.width + buffer && pointY >= rect.y - buffer && pointY <= rect.y + rect.height + buffer;
}

function getCoordinateLabelRect({
  pointX,
  pointY,
  labelWidth,
  selectedModel,
  strength,
  shift
}: {
  pointX: number;
  pointY: number;
  labelWidth: number;
  selectedModel: ModelKey;
  strength: number;
  shift: number;
}) {
  const makeRect = (x: number, y: number) => ({
    x: clamp(x, padding + 8, width - padding - labelWidth - 8),
    y: clamp(y, padding + 8, height - padding - coordinateLabelHeight - 8),
    width: labelWidth,
    height: coordinateLabelHeight
  });
  const positions = {
    aboveLeft: makeRect(pointX - labelWidth - coordinateLabelGap, pointY - coordinateLabelHeight - coordinateLabelGap),
    aboveRight: makeRect(pointX + coordinateLabelGap, pointY - coordinateLabelHeight - coordinateLabelGap),
    belowLeft: makeRect(pointX - labelWidth - coordinateLabelGap, pointY + coordinateLabelGap),
    belowRight: makeRect(pointX + coordinateLabelGap, pointY + coordinateLabelGap),
    topLeft: makeRect(padding + 14, padding + 14),
    topRight: makeRect(width - padding - labelWidth - 14, padding + 14),
    bottomLeft: makeRect(padding + 14, height - padding - coordinateLabelHeight - 14),
    bottomRight: makeRect(width - padding - labelWidth - 14, height - padding - coordinateLabelHeight - 14)
  };
  type LabelPosition = keyof typeof positions;
  const preferredPositions: Record<ModelKey, LabelPosition[]> = {
    polynomial: ["belowRight", "belowLeft", "aboveRight", "aboveLeft"],
    exponential: ["belowLeft", "belowRight", "aboveLeft", "aboveRight"],
    logarithmic: ["aboveLeft", "aboveRight", "belowLeft", "belowRight"]
  };
  const fallbackPositions: LabelPosition[] = ["topLeft", "bottomRight", "topRight", "bottomLeft"];
  const candidates = [...preferredPositions[selectedModel], ...fallbackPositions].map((position) => positions[position]);
  return candidates.find((rect) => !curveTouchesLabel(rect, strength, shift) && !labelCoversPoint(rect, pointX, pointY)) ?? candidates[0];
}

function PercentRatioBarLab({ topicId }: { topicId: string }) {
  const { recordLearningEvent, t } = useSettings();
  const vizTheme = useVisualizationTheme();
  const [percent, setPercent] = useState(65);
  const [ratioA, setRatioA] = useState(2);
  const [ratioB, setRatioB] = useState(3);
  const filledWidth = (percent / 100) * 460;
  const totalRatio = ratioA + ratioB;
  const ratioAWidth = (ratioA / totalRatio) * 460;
  const ratioBWidth = (ratioB / totalRatio) * 460;

  function recordBarChange() {
    recordLearningEvent({
      type: "visualization-slider",
      source: "function-model",
      topicId
    });
  }

  function resetModel() {
    setPercent(65);
    setRatioA(2);
    setRatioB(3);
    recordLearningEvent({
      type: "visualization-reset",
      source: "function-model",
      topicId
    });
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
      <div className={vizTheme.paddedSurfaceClassName}>
        <svg data-viz-surface role="img" aria-label={t({ en: "Primary 6 percent and ratio bar model", zh: "小六百分數與比例條模型" })} viewBox="0 0 640 360" className="h-[340px] w-full sm:h-[380px]">
          <rect width="640" height="360" fill={vizTheme.svgBackground} />
          <rect x="34" y="34" width="572" height="292" rx="28" fill={vizTheme.panelFill} stroke={vizTheme.panelStroke} />
          <text x="84" y="78" fill={vizTheme.labelText} className="text-sm font-black uppercase tracking-[0.18em]">{t({ en: "Percent bar", zh: "百分數條" })}</text>
          <rect data-viz-mark data-viz-name="percent whole bar" data-viz-percent={percent} data-viz-total-width="460" x="88" y="108" width="460" height="54" rx="18" fill={vizTheme.softFill} stroke={vizTheme.neutralStroke} strokeWidth="3" />
          <motion.rect data-viz-mark data-viz-name="percent filled bar" data-viz-percent={percent} data-viz-decimal={formatNumber(percent / 100, 6)} data-viz-width={formatNumber(filledWidth, 6)} data-viz-total-width="460" x="88" y="108" width={filledWidth} height="54" rx="18" fill="#38bdf8" initial={false} animate={{ width: filledWidth }} />
          {Array.from({ length: 11 }, (_, index) => (
            <line key={index} x1={88 + index * 46} x2={88 + index * 46} y1="102" y2="168" stroke={vizTheme.neutralStroke} opacity="0.45" />
          ))}
          <text data-viz-overlap-ok x="260" y="148" className="fill-slate-950 text-2xl font-black">{percent}%</text>
          <text x="84" y="214" fill={vizTheme.labelText} className="text-sm font-black uppercase tracking-[0.18em]">{t({ en: "Ratio parts", zh: "比例份數" })}</text>
          <rect data-viz-mark data-viz-name="ratio part a" data-viz-ratio-a={ratioA} data-viz-ratio-b={ratioB} data-viz-ratio-total={totalRatio} data-viz-width={formatNumber(ratioAWidth, 6)} data-viz-total-width="460" x="88" y="240" width={ratioAWidth} height="48" rx="16" fill="#f472b6" />
          <rect data-viz-mark data-viz-name="ratio part b" data-viz-ratio-a={ratioA} data-viz-ratio-b={ratioB} data-viz-ratio-total={totalRatio} data-viz-width={formatNumber(ratioBWidth, 6)} data-viz-total-width="460" x={88 + ratioAWidth} y="240" width={ratioBWidth} height="48" rx="16" fill="#facc15" />
          <text data-viz-overlap-ok x="104" y="271" className="fill-slate-950 text-xl font-black">{ratioA}</text>
          <text data-viz-overlap-ok x="516" y="271" className="fill-slate-950 text-xl font-black">{ratioB}</text>
          <text x="380" y="80" fill={vizTheme.text} className="text-2xl font-black">{percent}% = {formatNumber(percent / 100, 2)}</text>
        </svg>
      </div>

      <div className="space-y-4">
        {[
          { label: t({ en: "Percent", zh: "百分數" }), value: percent, min: 0, max: 100, setter: setPercent },
          { label: t({ en: "Ratio part A", zh: "比例 A" }), value: ratioA, min: 1, max: 8, setter: setRatioA },
          { label: t({ en: "Ratio part B", zh: "比例 B" }), value: ratioB, min: 1, max: 8, setter: setRatioB }
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
              onPointerUp={recordBarChange}
              onKeyUp={recordBarChange}
              className="mt-4 w-full accent-cyan-500"
            />
          </label>
        ))}
        <VisualizationResetButton moduleId={moduleId} topicId={topicId} onReset={resetModel} />
      </div>
    </div>
  );
}

export function FunctionModelComparer({ topicId = "functions" }: { topicId?: string }) {
  const { language, recordLearningEvent, t } = useSettings();
  const vizTheme = useVisualizationTheme();
  const [selectedModel, setSelectedModel] = useState<ModelKey>("polynomial");
  const [strength, setStrength] = useState(1);
  const [shift, setShift] = useState(0);
  const [hoveredPointModel, setHoveredPointModel] = useState<ModelKey | null>(null);

  const paths = useMemo(() => ({
    polynomial: buildFunctionModelPath("polynomial", strength, shift),
    exponential: buildFunctionModelPath("exponential", strength, shift),
    logarithmic: buildFunctionModelPath("logarithmic", strength, shift)
  }), [strength, shift]);
  const sampleX = 6;
  const selectedValue = evaluateFunctionModel(selectedModel, sampleX, strength, shift);
  const selectedVisibleValue = clamp(selectedValue, yMin, yMax);
  const selectedPointClipped = selectedVisibleValue !== selectedValue;
  const selectedPointX = mapX(sampleX);
  const selectedPointY = mapY(selectedVisibleValue);
  const coordinateLabel = `(${formatNumber(sampleX)}, ${formatNumber(selectedValue, 1)})`;
  const coordinateLabelWidth = Math.max(76, coordinateLabel.length * 7 + 22);
  const xScale = (width - padding * 2) / (xMax - xMin);
  const yScale = (height - padding * 2) / (yMax - yMin);
  const coordinateLabelRect = getCoordinateLabelRect({
    pointX: selectedPointX,
    pointY: selectedPointY,
    labelWidth: coordinateLabelWidth,
    selectedModel,
    strength,
    shift
  });
  const selectedPointHovered = hoveredPointModel === selectedModel;
  const samplePointLabel = t({ en: "Sample point", zh: "取樣點", zhHans: "取样点" });

  if (topicId === "p6-percentages") return <PercentRatioBarLab topicId={topicId} />;

  function recordInteraction(type: "visualization-slider" | "visualization-probe") {
    recordLearningEvent({
      type,
      source: "function-model",
      topicId
    });
  }

  function resetModel() {
    setSelectedModel("polynomial");
    setStrength(1);
    setShift(0);
    recordLearningEvent({
      type: "visualization-reset",
      source: "function-model",
      topicId
    });
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
      <div className={vizTheme.compactSurfaceClassName}>
        <svg
          data-viz-surface
          role="img"
          aria-label={t({ en: "Comparison graph for polynomial, exponential, and logarithmic models", zh: "多項式、指數和對數模型比較圖" })}
          viewBox={`0 0 ${width} ${height}`}
          className="h-[360px] w-full sm:h-[420px]"
        >
          <rect x="0" y="0" width={width} height={height} fill={vizTheme.svgBackground} />
          <defs>
            <clipPath id="functionModelPlotClip">
              <rect x={padding} y={padding} width={width - padding * 2} height={height - padding * 2} />
            </clipPath>
          </defs>
          {Array.from({ length: 11 }, (_, index) => index).map((tick) => (
            <g key={`x-${tick}`}>
              <line x1={mapX(tick)} x2={mapX(tick)} y1={padding} y2={height - padding} stroke={vizTheme.grid} />
              <text x={mapX(tick)} y={height - 14} textAnchor="middle" fill={vizTheme.tickText} className="text-[10px]">{tick}</text>
            </g>
          ))}
          {[-4, 0, 4, 8, 12].map((tick) => (
            <g key={`y-${tick}`}>
              <line x1={padding} x2={width - padding} y1={mapY(tick)} y2={mapY(tick)} stroke={vizTheme.grid} />
              <text x={18} y={mapY(tick) + 3} fill={vizTheme.tickText} className="text-[10px]">{tick}</text>
            </g>
          ))}
          <line x1={padding} x2={width - padding} y1={mapY(0)} y2={mapY(0)} stroke={vizTheme.axisStrong} strokeWidth="2.2" />
          <line x1={mapX(0)} x2={mapX(0)} y1={padding} y2={height - padding} stroke={vizTheme.axisStrong} strokeWidth="2.2" />
          <g aria-hidden="true" pointerEvents="none">
            <text x={width - padding + 8} y={mapY(0) + 18} fill={vizTheme.labelText} className="text-sm font-black">x</text>
            <text x={padding + 12} y={padding - 12} fill={vizTheme.labelText} className="text-sm font-black">y</text>
          </g>
          {(Object.keys(paths) as ModelKey[]).map((model) => (
            <motion.path
              data-viz-mark
              data-viz-name="model curve"
              data-viz-model={model}
              data-viz-strength={formatNumber(strength, 6)}
              data-viz-shift={formatNumber(shift, 6)}
              data-viz-x-min={xMin}
              data-viz-x-max={xMax}
              data-viz-y-min={yMin}
              data-viz-y-max={yMax}
              data-viz-x-scale={formatNumber(xScale, 6)}
              data-viz-y-scale={formatNumber(yScale, 6)}
              data-viz-sample-count="180"
              key={model}
              d={paths[model]}
              fill="none"
              stroke={modelColors[model]}
              strokeWidth={model === selectedModel ? 4.5 : 2.25}
              opacity={model === selectedModel ? 1 : 0.38}
              strokeLinecap="round"
              clipPath="url(#functionModelPlotClip)"
              initial={false}
              animate={{ pathLength: 1 }}
            />
          ))}
          <circle
            data-viz-mark
            data-viz-name="selected model point"
            data-viz-model={selectedModel}
            data-viz-x={formatNumber(sampleX, 2)}
            data-viz-y={formatNumber(selectedValue, 2)}
            data-viz-visible-y={formatNumber(selectedVisibleValue, 2)}
            data-viz-clipped={String(selectedPointClipped)}
            data-viz-strength={formatNumber(strength, 6)}
            data-viz-shift={formatNumber(shift, 6)}
            data-viz-x-scale={formatNumber(xScale, 6)}
            data-viz-y-scale={formatNumber(yScale, 6)}
            data-viz-hover-active={String(selectedPointHovered)}
            tabIndex={0}
            role="button"
            aria-label={`${samplePointLabel}: ${coordinateLabel}`}
            cx={selectedPointX}
            cy={selectedPointY}
            r={selectedPointHovered ? "10" : "7"}
            fill={modelColors[selectedModel]}
            stroke={vizTheme.pointStroke}
            strokeWidth={selectedPointHovered ? "3" : "2"}
            clipPath="url(#functionModelPlotClip)"
            className="cursor-pointer outline-none"
            onPointerEnter={() => {
              setHoveredPointModel(selectedModel);
              recordInteraction("visualization-probe");
            }}
            onPointerLeave={() => setHoveredPointModel(null)}
            onFocus={() => setHoveredPointModel(selectedModel)}
            onBlur={() => setHoveredPointModel(null)}
          />
          {selectedPointHovered ? (
            <g pointerEvents="none">
              <rect
                x={clamp(selectedPointX + 14, padding + 8, width - padding - 132)}
                y={clamp(selectedPointY - 44, padding + 8, height - padding - 34)}
                width="124"
                height="30"
                rx="10"
                fill={vizTheme.labelFill}
                stroke={modelColors[selectedModel]}
                strokeOpacity="0.82"
                strokeWidth="1.5"
              />
              <text
                x={clamp(selectedPointX + 76, padding + 70, width - padding - 70)}
                y={clamp(selectedPointY - 24, padding + 28, height - padding - 14)}
                textAnchor="middle"
                fill={vizTheme.text}
                className="text-xs font-black"
              >
                {samplePointLabel}
              </text>
            </g>
          ) : null}
          <g pointerEvents="none">
            <rect
              x={coordinateLabelRect.x}
              y={coordinateLabelRect.y}
              width={coordinateLabelRect.width}
              height={coordinateLabelRect.height}
              rx="10"
              fill={vizTheme.labelFill}
              stroke={modelColors[selectedModel]}
              strokeOpacity="0.72"
              strokeWidth="1.5"
            />
            <text
              x={coordinateLabelRect.x + coordinateLabelRect.width / 2}
              y={coordinateLabelRect.y + 18}
              textAnchor="middle"
              fill={vizTheme.text}
              className="text-xs font-black"
            >
              {coordinateLabel}
            </text>
          </g>
        </svg>
      </div>

      <div className="space-y-4">
        <div className="rounded-3xl border border-slate-200/70 bg-white/70 p-5 dark:border-white/10 dark:bg-white/[0.055]">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-cyan-500 dark:text-cyan-300">{t({ en: "Model family", zh: "模型類型" })}</p>
          <div className="mt-4 grid gap-2">
            {(Object.keys(modelLabels) as ModelKey[]).map((model) => (
              <button
                key={model}
                type="button"
                onClick={() => {
                  setSelectedModel(model);
                  recordInteraction("visualization-probe");
                }}
                className={`focus-ring rounded-2xl px-4 py-3 text-left text-sm font-bold transition ${selectedModel === model ? "bg-slate-950 text-white dark:bg-white dark:text-slate-950" : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-white/[0.08] dark:text-slate-200 dark:hover:bg-white/[0.13]"}`}
              >
                {textForLanguage(modelLabels[model], language)}
              </button>
            ))}
          </div>
        </div>

        <label className="block rounded-3xl border border-slate-200/70 bg-white/70 p-5 dark:border-white/10 dark:bg-white/[0.055]">
          <span className="flex items-center justify-between text-sm font-bold text-slate-700 dark:text-slate-200">
            {t({ en: "Growth strength", zh: "增長強度" })}
            <strong>{formatNumber(strength, 1)}</strong>
          </span>
          <input
            type="range"
            min="0.4"
            max="2"
            step="0.1"
            value={strength}
            onChange={(event) => setStrength(Number(event.target.value))}
            onPointerUp={() => recordInteraction("visualization-slider")}
            onKeyUp={() => recordInteraction("visualization-slider")}
            className="mt-4 w-full accent-cyan-500"
          />
        </label>

        <label className="block rounded-3xl border border-slate-200/70 bg-white/70 p-5 dark:border-white/10 dark:bg-white/[0.055]">
          <span className="flex items-center justify-between text-sm font-bold text-slate-700 dark:text-slate-200">
            {t({ en: "Vertical shift", zh: "垂直平移" })}
            <strong>{formatNumber(shift, 1)}</strong>
          </span>
          <input
            type="range"
            min="-3"
            max="5"
            step="0.5"
            value={shift}
            onChange={(event) => setShift(Number(event.target.value))}
            onPointerUp={() => recordInteraction("visualization-slider")}
            onKeyUp={() => recordInteraction("visualization-slider")}
            className="mt-4 w-full accent-cyan-500"
          />
        </label>

        <p className="rounded-2xl bg-cyan-500/10 p-4 text-sm leading-6 text-cyan-700 dark:text-cyan-200">
          {t({ en: "Compare how each model behaves near x = 0 and as x becomes large. The right model is chosen by shape, not only by one point.", zh: "比較每個模型在 x = 0 附近，以及 x 變大時的表現。合適模型要按形狀選擇，不只是看單一點。" })}
        </p>
        <VisualizationResetButton moduleId={moduleId} topicId={topicId} onReset={resetModel} />
      </div>
    </div>
  );
}
