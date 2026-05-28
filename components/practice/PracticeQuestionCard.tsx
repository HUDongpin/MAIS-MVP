"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ChangeEvent } from "react";
import { useEffect, useId, useRef, useState } from "react";
import { motion, AnimatePresence } from "@/components/ui/Motion";
import { MathText, toPlainMathText } from "@/components/math/MathText";
import { dictionary, useSettings } from "@/components/providers/AppProviders";
import { HandwritingAnswerBoard } from "@/components/practice/HandwritingAnswerBoard";
import { practiceTextForLanguage } from "@/components/practice/hjbPracticeEnglish";
import { MathSoftKeyboard } from "@/components/practice/MathSoftKeyboard";
import { formatDifficultyLabel, formatGradeLabel } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { AttemptFeedback, PublicQuestion, QuestionDiagram, QuestionType } from "@/types";

type DiagramLine = NonNullable<QuestionDiagram["lines"]>[number];
type DiagramPoint = DiagramLine["points"][number];
type SvgPoint = { x: number; y: number };
type SvgRect = { left: number; top: number; right: number; bottom: number };
type LabelPlacement = SvgPoint & { rect: SvgRect };
type CoordinateGridVariant = "default" | "day";
type AnswerInputMode = "keyboard" | "handwriting";
type PhotoAttachment = {
  id: string;
  name: string;
  size: number;
  url: string;
};

const labelCandidateOffsets = [
  { x: 12, y: -16 },
  { x: -12, y: -16 },
  { x: 12, y: 16 },
  { x: -12, y: 16 },
  { x: 19, y: 0 },
  { x: -19, y: 0 },
  { x: 0, y: -14 },
  { x: 0, y: 19 },
  { x: 12, y: 14 },
  { x: -12, y: 14 },
  { x: 12, y: -30 },
  { x: -12, y: -30 },
  { x: 12, y: 30 },
  { x: -12, y: 30 },
  { x: 26, y: -20 },
  { x: -26, y: -20 },
  { x: 26, y: 20 },
  { x: -26, y: 20 },
  { x: 30, y: 0 },
  { x: -30, y: 0 },
  { x: 0, y: -24 },
  { x: 0, y: 26 }
];
const pointMarkerRadius = 5;
const graphStrokePadding = 6;
const labelCollisionPadding = 1;
const labelFontHeight = 15;
const labelMinWidth = 9;
const labelWidthPerCharacter = 8.8;
const answerPhotoAccept = "image/*";
const maxAnswerPhotoAttachments = 6;

function PaperclipIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-7 w-7 shrink-0" fill="none">
      <path
        d="m21.4 11.2-8.9 8.9a6 6 0 0 1-8.5-8.5l9.5-9.5a4.1 4.1 0 0 1 5.8 5.8l-9.6 9.6a2.2 2.2 0 0 1-3.1-3.1l8.8-8.8"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function formatPhotoSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isPhotoFile(file: File) {
  return file.type.startsWith("image/") || /\.(heic|heif|jpe?g|png|webp)$/i.test(file.name);
}

function revokePhotoAttachments(attachments: PhotoAttachment[]) {
  attachments.forEach((attachment) => URL.revokeObjectURL(attachment.url));
}

function isXAxisPoint(point: DiagramPoint) {
  return Math.abs(point.y) < 0.0001;
}

function readAttemptFeedback(value: unknown): AttemptFeedback | null {
  const feedback = value as Partial<AttemptFeedback> | null;
  const explanation = feedback?.explanation as Partial<AttemptFeedback["explanation"]> | undefined;

  if (
    typeof feedback?.correct !== "boolean" ||
    typeof explanation?.en !== "string" ||
    typeof explanation?.zh !== "string" ||
    (typeof feedback.correctAnswer !== "undefined" && typeof feedback.correctAnswer !== "string")
  ) {
    return null;
  }

  return {
    correct: feedback.correct,
    explanation: {
      en: explanation.en,
      zh: explanation.zh
    },
    correctAnswer: feedback.correctAnswer
  };
}

const questionTypeLabels: Record<QuestionType, { en: string; zh: string }> = {
  "multiple-choice": { en: "Multiple choice", zh: "選擇題" },
  "fill-in": { en: "Fill-in", zh: "填空題" },
  "short-answer": { en: "Short answer", zh: "簡答題" },
  graph: { en: "Graph", zh: "圖形題" }
};

const answerLabels: Record<Exclude<QuestionType, "multiple-choice">, { en: string; zh: string }> = {
  "fill-in": { en: "Fill in the blank", zh: "填空答案" },
  "short-answer": { en: "Short answer", zh: "簡答答案" },
  graph: { en: "Answer from the diagram", zh: "根據圖形作答" }
};

const answerPlaceholders: Record<Exclude<QuestionType, "multiple-choice">, { en: string; zh: string }> = {
  "fill-in": { en: "Type the missing value", zh: "輸入空格中的答案" },
  "short-answer": { en: "Type a concise answer", zh: "輸入簡短答案" },
  graph: { en: "Read the diagram, then answer", zh: "閱讀圖形後作答" }
};

function shouldRenderOptionAsBareMath(value: string) {
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 80) return false;

  const allowedMathWords = new Set(["sin", "cos", "tan", "log", "ln", "sqrt", "frac", "theta", "pi"]);
  const words = trimmed.match(/[A-Za-z]+/g) ?? [];
  if (words.some((word) => word.length > 1 && !allowedMathWords.has(word.toLowerCase()))) return false;

  if (/^[+-]?\d+(?:\.\d+)?%?$/.test(trimmed)) return true;
  if (/^\(\s*[+-]?\d+(?:\.\d+)?\s*,\s*[+-]?\d+(?:\.\d+)?\s*\)$/.test(trimmed)) return true;
  if (/^[A-Za-zθπ](?:_\{?\d+\}?|\d)?\s*(?:=|≈|<|>|≤|≥)\s*.+$/.test(trimmed)) return true;

  return /^[\\A-Za-zθπ0-9{}_^()+\-/*=<>≤≥≈.,:°\s]+$/.test(trimmed) && /[=^/\\]|[θπ]|°/.test(trimmed);
}

const unitExponentPattern = /(^|[\s(])((?:\d+(?:\.\d+)?\s*)?)(km|cm|mm|m)\^([23])(?=$|[\s.,;)])/gi;

function formatUnitExponentsForMathText(value: string) {
  if (!value.includes("^")) return value;

  return value.replace(unitExponentPattern, (_, leadIn: string, quantity: string, unit: string, exponent: string) => {
    const coefficient = quantity.trim();
    const mathSource = coefficient ? `${coefficient}\\,\\text{${unit}}^{${exponent}}` : `\\text{${unit}}^{${exponent}}`;
    return `${leadIn}\\(${mathSource}\\)`;
  });
}

function integerTicks(min: number, max: number) {
  const start = Math.ceil(min);
  const end = Math.floor(max);
  return Array.from({ length: Math.max(0, end - start + 1) }, (_, index) => start + index);
}

function shouldDrawAsQuadratic(line: DiagramLine) {
  const label = line.label?.toLowerCase() ?? "";
  return line.points.length >= 3 && (label.includes("parabola") || label === "curve");
}

function shouldShowLineValueMarkers(line: DiagramLine) {
  return line.points.length > 2 && !shouldDrawAsQuadratic(line);
}

function uniquePointsByX(points: DiagramPoint[]) {
  return [...points]
    .sort((a, b) => a.x - b.x)
    .filter((point, index, sortedPoints) => index === 0 || Math.abs(point.x - sortedPoints[index - 1].x) > 0.0001);
}

function quadraticYAt(x: number, anchors: [DiagramPoint, DiagramPoint, DiagramPoint]) {
  const [p0, p1, p2] = anchors;
  const term0 = p0.y * ((x - p1.x) * (x - p2.x)) / ((p0.x - p1.x) * (p0.x - p2.x));
  const term1 = p1.y * ((x - p0.x) * (x - p2.x)) / ((p1.x - p0.x) * (p1.x - p2.x));
  const term2 = p2.y * ((x - p0.x) * (x - p1.x)) / ((p2.x - p0.x) * (p2.x - p1.x));
  return term0 + term1 + term2;
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function rectsOverlap(first: SvgRect, second: SvgRect) {
  return first.left < second.right && first.right > second.left && first.top < second.bottom && first.bottom > second.top;
}

function expandRect(rect: SvgRect, padding: number): SvgRect {
  return {
    left: rect.left - padding,
    top: rect.top - padding,
    right: rect.right + padding,
    bottom: rect.bottom + padding
  };
}

function rectContains(outer: SvgRect, inner: SvgRect) {
  return inner.left >= outer.left && inner.top >= outer.top && inner.right <= outer.right && inner.bottom <= outer.bottom;
}

function pointInRect(point: SvgPoint, rect: SvgRect) {
  return point.x >= rect.left && point.x <= rect.right && point.y >= rect.top && point.y <= rect.bottom;
}

function labelRectFor(label: string, center: SvgPoint): SvgRect {
  const width = Math.max(labelMinWidth, label.length * labelWidthPerCharacter + 2);
  const halfWidth = width / 2;
  const halfHeight = labelFontHeight / 2;

  return {
    left: center.x - halfWidth,
    top: center.y - halfHeight,
    right: center.x + halfWidth,
    bottom: center.y + halfHeight
  };
}

function markerRectFor(center: SvgPoint) {
  return {
    left: center.x - pointMarkerRadius,
    top: center.y - pointMarkerRadius,
    right: center.x + pointMarkerRadius,
    bottom: center.y + pointMarkerRadius
  };
}

function isYVisible(y: number, yMin: number, yMax: number) {
  const tolerance = 0.0001;
  return y >= yMin - tolerance && y <= yMax + tolerance;
}

function visibleQuadraticIntervals(
  anchors: [DiagramPoint, DiagramPoint, DiagramPoint],
  xMin: number,
  xMax: number,
  yMin: number,
  yMax: number
) {
  if (xMax <= xMin) return [];

  const sampleCount = 240;
  const isVisibleAt = (x: number) => isYVisible(quadraticYAt(x, anchors), yMin, yMax);
  const refineBoundary = (visibleX: number, hiddenX: number) => {
    let visible = visibleX;
    let hidden = hiddenX;

    for (let step = 0; step < 24; step += 1) {
      const midpoint = (visible + hidden) / 2;
      if (isVisibleAt(midpoint)) {
        visible = midpoint;
      } else {
        hidden = midpoint;
      }
    }

    return visible;
  };

  const intervals: Array<{ startX: number; endX: number }> = [];
  let previousX = xMin;
  let previousVisible = isVisibleAt(previousX);
  let currentStart = previousVisible ? xMin : null;

  for (let index = 1; index <= sampleCount; index += 1) {
    const x = xMin + ((xMax - xMin) * index) / sampleCount;
    const visible = isVisibleAt(x);

    if (!previousVisible && visible) {
      currentStart = refineBoundary(x, previousX);
    }

    if (previousVisible && !visible && currentStart !== null) {
      intervals.push({ startX: currentStart, endX: refineBoundary(previousX, x) });
      currentStart = null;
    }

    previousX = x;
    previousVisible = visible;
  }

  if (currentStart !== null) {
    intervals.push({ startX: currentStart, endX: xMax });
  }

  return intervals.filter((interval) => interval.endX >= interval.startX);
}

function quadraticPathForLine(
  line: DiagramLine,
  xFor: (value: number) => number,
  yFor: (value: number) => number,
  xRange: [number, number],
  yRange: [number, number]
) {
  if (!shouldDrawAsQuadratic(line)) return null;

  const sortedPoints = uniquePointsByX(line.points);
  if (sortedPoints.length < 3) return null;

  const anchors: [DiagramPoint, DiagramPoint, DiagramPoint] = [
    sortedPoints[0],
    sortedPoints[Math.floor(sortedPoints.length / 2)],
    sortedPoints[sortedPoints.length - 1]
  ];
  const hasDuplicateAnchorX = new Set(anchors.map((point) => point.x)).size < 3;
  if (hasDuplicateAnchorX) return null;

  const [xMin, xMax] = xRange;
  const [yMin, yMax] = yRange;
  const visibleIntervals = visibleQuadraticIntervals(anchors, xMin, xMax, yMin, yMax);
  const intervals = visibleIntervals.length > 0
    ? visibleIntervals
    : [{ startX: sortedPoints[0].x, endX: sortedPoints[sortedPoints.length - 1].x }];

  return intervals.map(({ startX, endX }) => {
    const sampleCount = Math.min(160, Math.max(48, Math.ceil(Math.abs(endX - startX) * 28)));

    return Array.from({ length: sampleCount + 1 }, (_, index) => {
      const x = startX + ((endX - startX) * index) / sampleCount;
      const y = clampNumber(quadraticYAt(x, anchors), yMin, yMax);
      const command = index === 0 ? "M" : "L";
      return `${command} ${xFor(x)} ${yFor(y)}`;
    }).join(" ");
  }).join(" ");
}

function collisionSamplesForSegment(start: SvgPoint, end: SvgPoint) {
  const distance = Math.hypot(end.x - start.x, end.y - start.y);
  const sampleCount = Math.max(2, Math.ceil(distance / 2));

  return Array.from({ length: sampleCount + 1 }, (_, sampleIndex) => {
    const ratio = sampleIndex / sampleCount;
    return {
      x: start.x + (end.x - start.x) * ratio,
      y: start.y + (end.y - start.y) * ratio
    };
  });
}

function collisionSamplesForLine(
  line: DiagramLine,
  xFor: (value: number) => number,
  yFor: (value: number) => number,
  xRange: [number, number],
  yRange: [number, number]
) {
  if (shouldDrawAsQuadratic(line)) {
    const sortedPoints = uniquePointsByX(line.points);
    if (sortedPoints.length >= 3) {
      const anchors: [DiagramPoint, DiagramPoint, DiagramPoint] = [
        sortedPoints[0],
        sortedPoints[Math.floor(sortedPoints.length / 2)],
        sortedPoints[sortedPoints.length - 1]
      ];
      const hasDuplicateAnchorX = new Set(anchors.map((point) => point.x)).size < 3;

      if (!hasDuplicateAnchorX) {
        const [xMin, xMax] = xRange;
        const [yMin, yMax] = yRange;
        const visibleIntervals = visibleQuadraticIntervals(anchors, xMin, xMax, yMin, yMax);
        const intervals = visibleIntervals.length > 0
          ? visibleIntervals
          : [{ startX: sortedPoints[0].x, endX: sortedPoints[sortedPoints.length - 1].x }];

        return intervals.flatMap(({ startX, endX }) => {
          const sampleCount = Math.min(180, Math.max(56, Math.ceil(Math.abs(endX - startX) * 36)));

          return Array.from({ length: sampleCount + 1 }, (_, index) => {
            const x = startX + ((endX - startX) * index) / sampleCount;
            return {
              x: xFor(x),
              y: yFor(clampNumber(quadraticYAt(x, anchors), yMin, yMax))
            };
          });
        });
      }
    }
  }

  return line.points.flatMap((point, index, points) => {
    if (index === points.length - 1) return [];
    const start = { x: xFor(point.x), y: yFor(point.y) };
    const end = { x: xFor(points[index + 1].x), y: yFor(points[index + 1].y) };
    return collisionSamplesForSegment(start, end);
  });
}

function chooseLabelPlacement({
  label,
  anchor,
  plotRect,
  plottedSamples,
  placedLabelRects
}: {
  label: string;
  anchor: SvgPoint;
  plotRect: SvgRect;
  plottedSamples: SvgPoint[];
  placedLabelRects: SvgRect[];
}): LabelPlacement {
  const markerRect = markerRectFor(anchor);
  const candidates = labelCandidateOffsets.map((offset, index) => {
    const center = { x: anchor.x + offset.x, y: anchor.y + offset.y };
    const rect = labelRectFor(label, center);
    const outsidePlot = !rectContains(plotRect, rect);
    const overlapsGraph = plottedSamples.some((sample) => pointInRect(sample, expandRect(rect, graphStrokePadding)));
    const overlapsMarker = rectsOverlap(rect, expandRect(markerRect, labelCollisionPadding));
    const overlapsLabel = placedLabelRects.some((placedRect) => rectsOverlap(rect, expandRect(placedRect, labelCollisionPadding)));

    return {
      ...center,
      rect,
      index,
      outsidePlot,
      overlapsGraph,
      overlapsMarker,
      overlapsLabel
    };
  });

  const perfectCandidate = candidates.find((candidate) =>
    !candidate.outsidePlot &&
    !candidate.overlapsGraph &&
    !candidate.overlapsMarker &&
    !candidate.overlapsLabel
  );

  if (perfectCandidate) return perfectCandidate;

  const fallbackCandidates = candidates.filter((candidate) => !candidate.outsidePlot);
  const fallback = (fallbackCandidates.length ? fallbackCandidates : candidates)
    .slice()
    .sort((first, second) => {
      const scoreFor = (candidate: (typeof candidates)[number]) =>
        (candidate.outsidePlot ? 1000 : 0) +
        (candidate.overlapsGraph ? 100 : 0) +
        (candidate.overlapsMarker ? 10 : 0) +
        (candidate.overlapsLabel ? 5 : 0) +
        candidate.index / 100;

      return scoreFor(first) - scoreFor(second);
    })[0];

  return fallback;
}

function CoordinateGridDiagram({
  diagram,
  variant = "default",
  compact = false
}: {
  diagram: QuestionDiagram;
  variant?: CoordinateGridVariant;
  compact?: boolean;
}) {
  const [xMin, xMax] = diagram.xRange;
  const [yMin, yMax] = diagram.yRange;
  const plot = { left: 36, top: 18, width: 214, height: 164 };
  const xTicks = integerTicks(xMin, xMax);
  const yTicks = integerTicks(yMin, yMax);
  const xSpan = xMax - xMin || 1;
  const ySpan = yMax - yMin || 1;
  const xFor = (x: number) => plot.left + ((x - xMin) / xSpan) * plot.width;
  const yFor = (y: number) => plot.top + plot.height - ((y - yMin) / ySpan) * plot.height;
  const isDayVariant = variant === "day";
  const axisColor = isDayVariant ? "#475569" : "rgb(71 85 105)";
  const gridColor = isDayVariant ? "#d8e0ea" : "rgb(203 213 225)";
  const gridOpacity = isDayVariant ? 1 : 0.65;
  const gridStrokeWidth = isDayVariant ? 0.8 : 1;
  const axisStrokeWidth = isDayVariant ? 1.3 : 2;
  const graphStrokeWidth = isDayVariant ? 3.4 : 4;
  const graphStroke = isDayVariant ? "#0891b2" : "rgb(8 145 178)";
  const outerClassName = isDayVariant
    ? cn(
        "mx-auto w-full overflow-hidden rounded-[1.35rem] border border-slate-200/90 bg-white shadow-sm dark:border-slate-200/90 dark:bg-white",
        compact ? "mt-4 max-w-[34rem] p-2 sm:max-w-[36rem] sm:p-3" : "mt-5 max-w-[46rem] p-3"
      )
    : "mx-auto mt-5 w-full max-w-[46rem] overflow-hidden rounded-2xl border border-slate-200/70 bg-white/70 p-3 dark:border-white/10 dark:bg-slate-950/55";
  const plotFillClassName = isDayVariant ? "fill-white" : "fill-white dark:fill-slate-900";
  const tickLabelClassName = isDayVariant ? "fill-slate-500 text-[9px]" : "fill-slate-500 text-[10px] dark:fill-slate-300";
  const axisLabelClassName = isDayVariant ? "fill-slate-900 text-[11px] font-black" : "fill-slate-500 text-[11px] font-bold dark:fill-slate-300";
  const pointLabelClassName = isDayVariant ? "fill-cyan-700 text-[11px] font-black" : "fill-slate-900 text-[13px] font-bold dark:fill-white";
  const plotRect = {
    left: plot.left,
    top: plot.top,
    right: plot.left + plot.width,
    bottom: plot.top + plot.height
  };
  const renderedLines = (diagram.lines ?? []).map((line, index) => ({
    line,
    lineKey: line.label ?? `line-${index}`,
    quadraticPath: quadraticPathForLine(line, xFor, yFor, [xMin, xMax], [yMin, yMax]),
    collisionSamples: collisionSamplesForLine(line, xFor, yFor, [xMin, xMax], [yMin, yMax])
  }));
  const axisSamples = [
    ...(xMin <= 0 && xMax >= 0
      ? collisionSamplesForSegment({ x: xFor(0), y: plot.top }, { x: xFor(0), y: plot.top + plot.height })
      : []),
    ...(yMin <= 0 && yMax >= 0
      ? collisionSamplesForSegment({ x: plot.left, y: yFor(0) }, { x: plot.left + plot.width, y: yFor(0) })
      : [])
  ];
  const plottedSamples = [
    ...renderedLines.flatMap((line) => line.collisionSamples),
    ...axisSamples
  ];
  const placedLabelRects: SvgRect[] = [];
  const labeledPoints = (diagram.points ?? []).map((point) => {
    const anchor = { x: xFor(point.x), y: yFor(point.y) };
    const placement = chooseLabelPlacement({
      label: point.label,
      anchor,
      plotRect,
      plottedSamples,
      placedLabelRects
    });
    placedLabelRects.push(placement.rect);

    return {
      ...point,
      anchor,
      placement
    };
  });

  return (
    <div className={outerClassName}>
      <svg viewBox="0 0 280 210" role="img" aria-label="Coordinate grid diagram" className="h-auto w-full">
        <rect x={plot.left} y={plot.top} width={plot.width} height={plot.height} rx={isDayVariant ? 0 : 8} className={plotFillClassName} />
        {xTicks.map((tick) => (
          <line key={`x-${tick}`} x1={xFor(tick)} x2={xFor(tick)} y1={plot.top} y2={plot.top + plot.height} stroke={gridColor} strokeWidth={gridStrokeWidth} opacity={gridOpacity} />
        ))}
        {yTicks.map((tick) => (
          <line key={`y-${tick}`} x1={plot.left} x2={plot.left + plot.width} y1={yFor(tick)} y2={yFor(tick)} stroke={gridColor} strokeWidth={gridStrokeWidth} opacity={gridOpacity} />
        ))}
        {xMin <= 0 && xMax >= 0 ? (
          <line x1={xFor(0)} x2={xFor(0)} y1={plot.top} y2={plot.top + plot.height} stroke={axisColor} strokeWidth={axisStrokeWidth} />
        ) : null}
        {yMin <= 0 && yMax >= 0 ? (
          <line x1={plot.left} x2={plot.left + plot.width} y1={yFor(0)} y2={yFor(0)} stroke={axisColor} strokeWidth={axisStrokeWidth} />
        ) : null}
        {renderedLines.map(({ line, lineKey, quadraticPath }) => {
          const lineStyle = {
            fill: "none",
            stroke: graphStroke,
            strokeLinecap: "round",
            strokeLinejoin: "round",
            strokeWidth: graphStrokeWidth
          } as const;

          return quadraticPath ? (
            <path key={lineKey} d={quadraticPath} {...lineStyle} />
          ) : (
            <g key={lineKey}>
              <polyline
                points={line.points.map((point) => `${xFor(point.x)},${yFor(point.y)}`).join(" ")}
                {...lineStyle}
              />
              {shouldShowLineValueMarkers(line) ? line.points.map((point, pointIndex) => (
                <circle
                  key={`${lineKey}-value-${pointIndex}`}
                  cx={xFor(point.x)}
                  cy={yFor(point.y)}
                  r="3.6"
                  className={isDayVariant ? "fill-pink-500 stroke-white stroke-[1.5]" : "fill-cyan-600 stroke-white stroke-[1.5] dark:fill-cyan-400 dark:stroke-slate-950"}
                />
              )) : null}
            </g>
          );
        })}
        {labeledPoints.map((point) => (
          <g key={point.label}>
            <circle
              cx={point.anchor.x}
              cy={point.anchor.y}
              r="5"
              className={isDayVariant && isXAxisPoint(point) ? "fill-pink-500 stroke-white stroke-[1.5]" : isDayVariant ? "fill-cyan-400 stroke-white stroke-[1.5]" : "fill-violet-600 dark:fill-violet-300"}
            />
            <text
              x={point.placement.x}
              y={point.placement.y}
              textAnchor="middle"
              dominantBaseline="central"
              className={pointLabelClassName}
            >
              {point.label}
            </text>
          </g>
        ))}
        {xTicks.map((tick) => (
          <text key={`x-label-${tick}`} x={xFor(tick)} y={plot.top + plot.height + 16} textAnchor="middle" className={tickLabelClassName}>
            {tick}
          </text>
        ))}
        {yTicks.map((tick) => (
          <text key={`y-label-${tick}`} x={plot.left - 10} y={yFor(tick) + 4} textAnchor="end" className={tickLabelClassName}>
            {tick}
          </text>
        ))}
        <text x={plot.left + plot.width + 14} y={yFor(0) + 4} className={axisLabelClassName}>
          x
        </text>
        <text x={isDayVariant ? xFor(0) : xFor(0) - 4} y={plot.top - 7} textAnchor={isDayVariant ? "middle" : "end"} className={axisLabelClassName}>
          y
        </text>
      </svg>
    </div>
  );
}

function QuestionDiagramPanel({
  diagram,
  variant = "default",
  compact = false
}: {
  diagram: QuestionDiagram;
  variant?: CoordinateGridVariant;
  compact?: boolean;
}) {
  if (diagram.kind === "coordinate-grid") return <CoordinateGridDiagram diagram={diagram} variant={variant} compact={compact} />;
  return null;
}

type PracticeQuestionCardProps = {
  question: PublicQuestion;
  onAnswered?: (question: PublicQuestion, feedback: AttemptFeedback) => void;
};

export function PracticeQuestionCard({ question, onAnswered }: PracticeQuestionCardProps) {
  const { currentUser, language, recordLearningEvent, refreshMistakeRecordsAfterAttempt, text, t } = useSettings();
  const pathname = usePathname();
  const answerControlBaseId = useId();
  const keyboardAnswerControlId = `${answerControlBaseId}-keyboard-answer`;
  const handwritingAnswerControlId = `${answerControlBaseId}-handwriting-answer`;
  const handwritingBoardId = `${answerControlBaseId}-handwriting-board`;
  const mathKeyboardId = `${answerControlBaseId}-math-keyboard`;
  const answerControlRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const photoAttachmentsRef = useRef<PhotoAttachment[]>([]);
  const [selected, setSelected] = useState("");
  const [answerInputMode, setAnswerInputMode] = useState<AnswerInputMode>("keyboard");
  const [photoAttachments, setPhotoAttachments] = useState<PhotoAttachment[]>([]);
  const [feedback, setFeedback] = useState<AttemptFeedback | null>(null);
  const [error, setError] = useState("");
  const [needsLogin, setNeedsLogin] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [softKeyboardOpen, setSoftKeyboardOpen] = useState(false);
  const [handwritingResetToken, setHandwritingResetToken] = useState(0);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const localizedPracticeText = (localized: PublicQuestion["topic"]) => practiceTextForLanguage(localized, language, question.publisher);
  const promptText = localizedPracticeText(question.prompt);
  const promptLabel = toPlainMathText(promptText);
  const isLessonPage = pathname.startsWith("/lesson/");
  const isPracticePage = pathname.startsWith("/practice");
  const shouldUseDayModeDiagram = isLessonPage || isPracticePage;
  const shouldShowPhotoUpload =
    (isLessonPage && question.type !== "multiple-choice") || (isPracticePage && question.type === "short-answer");
  const shouldShowAnswerTools =
    question.type === "fill-in" ||
    question.type === "short-answer" ||
    (isLessonPage && question.type === "graph");
  const shouldShowMathSoftKeyboard = shouldShowAnswerTools;
  const shouldShowAnswerInputModes = shouldShowAnswerTools;
  const diagramVariant: CoordinateGridVariant = shouldUseDayModeDiagram ? "day" : "default";

  useEffect(() => {
    photoAttachmentsRef.current = photoAttachments;
  }, [photoAttachments]);

  useEffect(() => () => {
    revokePhotoAttachments(photoAttachmentsRef.current);
  }, []);

  useEffect(() => {
    setSelected("");
    setPhotoAttachments((current) => {
      revokePhotoAttachments(current);
      return [];
    });
    setFeedback(null);
    setError("");
    setNeedsLogin(false);
    setIsChecking(false);
    setAnswerInputMode("keyboard");
    setSoftKeyboardOpen(false);
    setHandwritingResetToken((current) => current + 1);
    setStartedAt(null);
    if (photoInputRef.current) photoInputRef.current.value = "";
  }, [question.id]);

  function beginAttempt() {
    setStartedAt((current) => current ?? Date.now());
  }

  async function handleSubmit() {
    if (!selected.trim() || feedback || isChecking) return;
    if (!currentUser) {
      setNeedsLogin(true);
      setError(t(dictionary.practice.loginRequired));
      return;
    }

    const durationSeconds = startedAt === null ? 1 : Math.max(1, Math.round((Date.now() - startedAt) / 1000));

    setError("");
    setNeedsLogin(false);
    setIsChecking(true);

    try {
      const response = await fetch("/api/attempts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          questionId: question.id,
          selectedAnswer: selected,
          durationSeconds
        })
      });
      const responseBody = await response.json().catch(() => null);
      const result = readAttemptFeedback(responseBody);

      if (response.status === 401) {
        setNeedsLogin(true);
        throw new Error(t({
          en: "Your sign-in session could not be verified. Log in again before checking answers.",
          zh: "未能驗證你的登入狀態。請重新登入後再檢查答案。"
        }));
      }

      if (!response.ok || !result) {
        throw new Error("Could not check this answer yet.");
      }

      refreshMistakeRecordsAfterAttempt();
      recordLearningEvent({
        type: result.correct ? "answer-correct" : "answer-wrong",
        source: "practice",
        topicId: question.topicId,
        questionId: question.id,
        durationSeconds
      });
      setFeedback(result);
      onAnswered?.(question, result);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not check this answer yet.");
    } finally {
      setIsChecking(false);
    }
  }

  function reset() {
    setSelected("");
    setPhotoAttachments((current) => {
      revokePhotoAttachments(current);
      return [];
    });
    setFeedback(null);
    setError("");
    setNeedsLogin(false);
    setIsChecking(false);
    setSoftKeyboardOpen(false);
    setHandwritingResetToken((current) => current + 1);
    setStartedAt(null);
    if (photoInputRef.current) photoInputRef.current.value = "";
  }

  function handleTypedAnswer(value: string) {
    beginAttempt();
    recordLearningEvent({
      type: "keyboard",
      source: "practice",
      topicId: question.topicId,
      questionId: question.id
    });
    setSelected(value);
    setFeedback(null);
    setError("");
    setNeedsLogin(false);
  }

  function handleHandwritingDraftInteraction() {
    recordLearningEvent({
      type: "mouse-click",
      source: "practice",
      topicId: question.topicId,
      questionId: question.id
    });
    setFeedback(null);
    setError("");
  }

  function handlePhotoUpload(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []).filter(isPhotoFile);
    event.target.value = "";
    if (!files.length) return;

    beginAttempt();
    recordLearningEvent({
      type: "mouse-click",
      source: "practice",
      topicId: question.topicId,
      questionId: question.id
    });
    setFeedback(null);
    setError("");

    const createdAt = Date.now();
    const newAttachments = files.map((file, index) => ({
      id: `${question.id}-${createdAt}-${index}-${file.name}`,
      name: file.name,
      size: file.size,
      url: URL.createObjectURL(file)
    }));

    setPhotoAttachments((current) => {
      const remainingSlots = Math.max(0, maxAnswerPhotoAttachments - current.length);
      const acceptedAttachments = newAttachments.slice(0, remainingSlots);
      revokePhotoAttachments(newAttachments.slice(remainingSlots));
      return [...current, ...acceptedAttachments];
    });
  }

  function removePhotoAttachment(attachmentId: string) {
    setPhotoAttachments((current) => {
      const attachment = current.find((item) => item.id === attachmentId);
      if (attachment) URL.revokeObjectURL(attachment.url);
      return current.filter((item) => item.id !== attachmentId);
    });
  }

  return (
    <article className="glass-panel p-5" data-question-id={question.id}>
      <div className="flex flex-wrap items-center gap-2">
	        <span className="rounded-full bg-cyan-500/15 px-3 py-1 text-xs font-bold text-cyan-600 dark:text-cyan-300">{formatGradeLabel(question.grade, language, true)}</span>
	        <span className="rounded-full bg-violet-500/15 px-3 py-1 text-xs font-bold text-violet-600 dark:text-violet-300">{formatDifficultyLabel(question.difficulty, language)}</span>
        <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-200">{t(questionTypeLabels[question.type])}</span>
        <span className="rounded-full bg-slate-500/15 px-3 py-1 text-xs font-bold text-slate-600 dark:text-slate-300">{localizedPracticeText(question.topic)}</span>
      </div>
      <MathText
        as="h3"
        text={promptText}
        ariaLabel={promptLabel}
        className="practice-question-title mt-4 text-xl font-black leading-snug text-slate-950 dark:text-white"
      />

      {question.diagram ? <QuestionDiagramPanel diagram={question.diagram} variant={diagramVariant} compact={isPracticePage} /> : null}

      {question.type === "multiple-choice" ? (
        <>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {(question.options ?? []).map((option) => {
              const optionValue = text(option);
              const optionText = localizedPracticeText(option);
              const optionDisplayText = formatUnitExponentsForMathText(optionText);
              const active = selected === optionValue;
              return (
                <button
                  key={optionValue}
                  type="button"
                  aria-label={toPlainMathText(optionText)}
                  onClick={() => {
                    beginAttempt();
                    recordLearningEvent({
                      type: "mouse-click",
                      source: "practice",
                      topicId: question.topicId,
                      questionId: question.id
                    });
                    setSelected(optionValue);
                    setFeedback(null);
                    setError("");
                  }}
                  className={cn(
                    "focus-ring rounded-2xl border px-4 py-3 text-left text-sm font-bold transition",
                    active
                      ? "border-cyan-400 bg-cyan-500/15 text-cyan-700 dark:text-cyan-200"
                      : "border-slate-200/70 bg-white/65 text-slate-700 hover:bg-white dark:border-white/10 dark:bg-white/[0.055] dark:text-slate-200 dark:hover:bg-white/[0.1]"
                  )}
                >
                  <MathText text={optionDisplayText} renderBareMath={shouldRenderOptionAsBareMath(optionText)} />
                </button>
              );
            })}
          </div>
        </>
      ) : (
        <div className="mt-5">
          {shouldShowAnswerInputModes ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-bold text-slate-600 dark:text-slate-300">
                {t(answerLabels[question.type])}
              </p>
              <div role="tablist" aria-label={t({ en: "Answer input mode", zh: "答案輸入模式" })} className="inline-flex rounded-full border border-slate-200/80 bg-white/75 p-1 shadow-sm dark:border-white/10 dark:bg-white/[0.06]">
                {([
                  ["keyboard", { en: "Keyboard input", zh: "鍵盤輸入" }],
                  ["handwriting", { en: "Handwriting board", zh: "手寫板" }]
                ] as const).map(([mode, label]) => {
                  const active = answerInputMode === mode;
                  return (
                    <button
                      key={mode}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      aria-controls={mode === "handwriting" ? handwritingBoardId : keyboardAnswerControlId}
                      onClick={() => {
                        beginAttempt();
                        setAnswerInputMode(mode);
                        if (mode === "handwriting") setSoftKeyboardOpen(false);
                      }}
                      className={cn(
                        "focus-ring rounded-full px-4 py-2 text-sm font-black transition",
                        active
                          ? "bg-cyan-500 text-white shadow-sm dark:bg-cyan-300 dark:text-slate-950"
                          : "text-slate-600 hover:bg-cyan-50 hover:text-cyan-800 dark:text-slate-200 dark:hover:bg-white/[0.1] dark:hover:text-white"
                      )}
                    >
                      {t(label)}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <label htmlFor={keyboardAnswerControlId} className="block text-sm font-bold text-slate-600 dark:text-slate-300">
              {t(answerLabels[question.type])}
            </label>
          )}

          {!shouldShowAnswerInputModes || answerInputMode === "keyboard" ? (
            question.type === "short-answer" ? (
              <textarea
                id={keyboardAnswerControlId}
                ref={(element) => {
                  answerControlRef.current = element;
                }}
                value={selected}
                rows={3}
                onChange={(event) => handleTypedAnswer(event.target.value)}
                onFocus={beginAttempt}
                placeholder={t(answerPlaceholders[question.type])}
                className="focus-ring mt-2 w-full resize-none rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 text-slate-900 dark:border-white/10 dark:bg-slate-950/80 dark:text-white"
              />
            ) : (
              <input
                id={keyboardAnswerControlId}
                ref={(element) => {
                  answerControlRef.current = element;
                }}
                value={selected}
                onChange={(event) => handleTypedAnswer(event.target.value)}
                onFocus={beginAttempt}
                placeholder={t(answerPlaceholders[question.type])}
                className="focus-ring mt-2 w-full rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 text-slate-900 dark:border-white/10 dark:bg-slate-950/80 dark:text-white"
              />
            )
          ) : null}

          {shouldShowAnswerInputModes && answerInputMode === "handwriting" ? (
            <HandwritingAnswerBoard
              boardId={handwritingBoardId}
              answerInputId={handwritingAnswerControlId}
              value={selected}
              isShortAnswer={question.type === "short-answer"}
              language={language}
              placeholder={t(answerPlaceholders[question.type])}
              resetToken={handwritingResetToken}
              onAnswerChange={handleTypedAnswer}
              onBeginAttempt={beginAttempt}
              onDraftInteraction={handleHandwritingDraftInteraction}
            />
          ) : null}

          {shouldShowMathSoftKeyboard && answerInputMode === "keyboard" ? (
            <div className="mt-3">
              <button
                type="button"
                aria-controls={mathKeyboardId}
                aria-expanded={softKeyboardOpen}
                aria-label={t(softKeyboardOpen ? { en: "Hide math keyboard", zh: "收起數學鍵盤" } : { en: "Show math keyboard", zh: "顯示數學鍵盤" })}
                onClick={() => {
                  beginAttempt();
                  setSoftKeyboardOpen((open) => !open);
                  requestAnimationFrame(() => answerControlRef.current?.focus({ preventScroll: true }));
                }}
                className={cn(
                  "focus-ring inline-flex items-center gap-3 rounded-full border px-4 py-2.5 text-sm font-black shadow-sm transition hover:-translate-y-0.5",
                  softKeyboardOpen
                    ? "border-cyan-300 bg-cyan-400/18 text-cyan-800 dark:border-cyan-200/35 dark:bg-cyan-300/15 dark:text-cyan-100"
                    : "border-slate-200/80 bg-white/75 text-slate-700 hover:border-cyan-300 hover:bg-cyan-50 dark:border-white/10 dark:bg-white/[0.07] dark:text-white dark:hover:bg-white/[0.1]"
                )}
              >
                <span aria-hidden="true" className="text-base">⌨</span>
                <span>{t({ en: "Math keyboard", zh: "數學鍵盤" })}</span>
              </button>

              <AnimatePresence initial={false}>
                {softKeyboardOpen ? (
                  <motion.div
                    initial={{ opacity: 0, y: -6, scale: 0.99 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -4, scale: 0.99 }}
                    transition={{ duration: 0.16 }}
                  >
                    <MathSoftKeyboard
                      id={mathKeyboardId}
                      value={selected}
                      targetRef={answerControlRef}
                      language={language}
                      onChange={handleTypedAnswer}
                    />
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          ) : null}
        </div>
      )}

      <div className={cn("mt-5 flex flex-col gap-5", shouldShowPhotoUpload && "mt-4 sm:inline-flex sm:w-fit sm:items-stretch")}>
        {shouldShowPhotoUpload ? (
          <div className="w-full">
            <button
              type="button"
              onClick={() => photoInputRef.current?.click()}
              className="focus-ring inline-flex min-h-14 w-full items-center gap-4 rounded-[1.6rem] border border-slate-200/80 bg-white px-5 py-4 text-left text-lg font-black text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:border-cyan-300 hover:bg-cyan-50 sm:min-w-72 dark:border-white/10 dark:bg-white/[0.07] dark:text-white dark:hover:bg-white/[0.1]"
            >
              <PaperclipIcon />
              <span>Add photos</span>
            </button>
            <input
              ref={photoInputRef}
              type="file"
              accept={answerPhotoAccept}
              multiple
              onChange={handlePhotoUpload}
              className="hidden"
              aria-label="Add photos"
            />
            {photoAttachments.length ? (
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {photoAttachments.map((attachment) => (
                  <div key={attachment.id} className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white/70 p-2 dark:border-white/10 dark:bg-white/[0.055]">
                    <img src={attachment.url} alt="" className="h-14 w-14 shrink-0 rounded-xl object-cover" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-black text-slate-800 dark:text-white">{attachment.name}</p>
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{formatPhotoSize(attachment.size)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removePhotoAttachment(attachment.id)}
                      aria-label={`Remove ${attachment.name}`}
                      className="focus-ring grid h-9 w-9 shrink-0 place-items-center rounded-full border border-slate-200 bg-white text-lg font-black text-slate-500 transition hover:border-rose-300 hover:text-rose-600 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-300 dark:hover:text-rose-200"
                    >
                      x
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row">
          <button type="button" onClick={handleSubmit} disabled={!selected.trim() || isChecking || Boolean(feedback)} className="focus-ring rounded-full bg-slate-950 px-5 py-3 font-bold text-white transition enabled:hover:-translate-y-1 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-slate-950">
            {!currentUser ? t(dictionary.practice.loginAction) : isChecking ? t(dictionary.practice.checking) : t(dictionary.common.checkAnswer)}
          </button>
          <button type="button" onClick={reset} className="focus-ring rounded-full border border-slate-200/70 bg-white/70 px-5 py-3 font-bold text-slate-700 transition hover:-translate-y-1 dark:border-white/10 dark:bg-white/[0.07] dark:text-white">
            {t(dictionary.common.reset)}
          </button>
        </div>
      </div>

	      {error ? (
	        <p role="alert" className="mt-4 rounded-2xl border border-rose-300/60 bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-700 dark:text-rose-200">
	          {error} {needsLogin || !currentUser ? <Link href="/login" className="underline underline-offset-4">{t(dictionary.nav.login)}</Link> : null}
	        </p>
	      ) : null}

      <AnimatePresence>
        {feedback ? (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8 }}
            className={cn(
              "mt-5 rounded-2xl border p-4 text-sm leading-6",
              feedback.correct
                ? "border-emerald-400/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-200"
                : "border-amber-400/30 bg-amber-500/15 text-amber-700 dark:text-amber-200"
            )}
          >
	            <p className="font-black">
	              {feedback.correct ? t(dictionary.practice.correct) : (
	                <>
	                  {t(dictionary.practice.notYet)}{" "}
                  {feedback.correctAnswer ? (
                    <MathText
                      text={formatUnitExponentsForMathText(feedback.correctAnswer)}
                      renderBareMath={shouldRenderOptionAsBareMath(feedback.correctAnswer)}
                    />
                  ) : null}
	                </>
	              )}
	            </p>
	            <MathText as="p" text={practiceTextForLanguage(feedback.explanation, language, question.publisher)} className="mt-1" />
	            {!feedback.correct ? <p className="mt-2 font-bold">{t(dictionary.practice.savedMistake)}</p> : null}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </article>
  );
}
