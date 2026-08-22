"use client";

import dynamic from "next/dynamic";
import type { ComponentType, ReactNode, SyntheticEvent } from "react";
import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useSettings } from "@/components/providers/AppProviders";
import {
  buildConfiguredSemanticPrimaryState,
  ConfiguredSemanticPrimaryMarks,
  configuredSemanticPrimaryFamilies,
  type ConfiguredSemanticPrimaryFamily,
  type SemanticPrimaryLocalizedStrings
} from "@/components/visualizations/ConfiguredSemanticPrimaryMarks";
import {
  buildConfiguredSemanticSecondaryMathState,
  ConfiguredSemanticSecondaryMarks,
  formatConfiguredSemanticSecondaryDisplayValue,
  supportsConfiguredSemanticSecondaryDisplayProjection,
  supportsConfiguredSemanticSecondaryFamily,
  type ConfiguredSemanticSecondaryFamily,
  type ConfiguredSemanticSecondaryStrings
} from "@/components/visualizations/ConfiguredSemanticSecondaryMarks";
import {
  resolveConfiguredVisualizationCompositeStrands,
  type ConfiguredVisualizationCompositeStrand
} from "@/components/visualizations/configuredVisualizationCompositeStrands";
import {
  resolveConfiguredVisualizationSemanticModel,
  type ConfiguredVisualizationSemanticModel
} from "@/components/visualizations/configuredVisualizationSemanticModel";
import {
  getConfiguredVisualizationSemanticControlContract,
  getConfiguredVisualizationSemanticResetPlan,
  projectConfiguredVisualizationSemanticControlState,
  type ConfiguredVisualizationSemanticControlContract,
  type ConfiguredVisualizationSemanticSlider,
  type ConfiguredVisualizationSemanticSliderInput
} from "@/components/visualizations/configuredVisualizationSemanticControls";
import {
  DecimalArithmeticLab,
  isMainlandDecimalArithmeticLabId
} from "@/components/visualizations/mainland/DecimalArithmeticLab";
import {
  isMainlandMultiDigitOperationsLabId,
  MultiDigitOperationsLab
} from "@/components/visualizations/mainland/MultiDigitOperationsLab";
import { sliderBoundsForThreeDTemplate } from "@/components/visualizations/three/configuredThreeDControls";
import { resolveConfiguredThreeDRenderPlan } from "@/components/visualizations/three/configuredThreeDRenderPlan";
import type { ThreeDLabCanvasProps } from "@/components/visualizations/three/threeDSceneTypes";
import { HKVisualizationLab } from "@/components/visualizations/hk/HKVisualizationLab";
import {
  hkVisualizationLabRegistryKind,
  isHKDedicatedLabId,
  isHKPassThroughLabId,
  type HKPassThroughLabId
} from "@/components/visualizations/hk/hkVisualizationLabRegistry";
import { ThreeDGraphSvg } from "@/components/visualizations/ThreeDGraphSvg";
import { formatThreeDGraphSummary, threeDGraphScalesFromControls } from "@/components/visualizations/ThreeDGraphSvgGeometry";
import { useVisualizationTheme, type VisualizationTheme } from "@/components/visualizations/visualizationTheme";
import type { FeaturedLabDefinition, VisualizationTemplateId } from "@/data/visualizationLabs";
import { clamp, formatNumber } from "@/lib/math";
import {
  queueVisualizationSessionOutbox,
  visualizationSessionOutboxUpdatedEventName,
  type VisualizationSessionOutboxRecord
} from "@/lib/visualizationSessionOutbox";

function ThreeDLabRuntimeLoading() {
  const { t } = useSettings();
  const loadingLabel = t({
    en: "Loading 3D model...",
    zh: "正在載入 3D 模型...",
    zhHans: "正在加载 3D 模型..."
  });

  return (
    <div
      className="grid min-h-[360px] place-items-center rounded-2xl border border-cyan-200 bg-cyan-50/80 p-6 text-center text-sm font-black text-cyan-800 shadow-inner dark:border-cyan-300/20 dark:bg-cyan-300/[0.08] dark:text-cyan-100"
      data-viz-three-runtime-loading
    >
      {loadingLabel}
    </div>
  );
}

const ThreeDLabCanvas = dynamic<ThreeDLabCanvasProps>(
  () => import("@/components/visualizations/three/ThreeDLabCanvas").then((module) => module.ThreeDLabCanvas as ComponentType<ThreeDLabCanvasProps>),
  {
    loading: () => <ThreeDLabRuntimeLoading />,
    ssr: false
  }
);

type ConfiguredVisualizationLabProps = {
  controlFooterAction?: ReactNode;
  lab?: FeaturedLabDefinition | null;
  labId?: string;
  topicId?: string;
};

const configuredVisualizationModuleId = "configured-visualization-lab";
const gradeOneAddSubtractLabId = "us-ca-math-p1-1-oa-add-subtract";
const width = 640;
const height = 360;
const panel = { x: 34, y: 34, width: 572, height: 292 };
const titleBadgeMaxWidth = 456;
const titleBadgeHorizontalPadding = 40;
const titleBadgeEstimatedSafetyFactor = 1.25;
const configuredVisualizationControlKeys = new Set([
  " ",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "End",
  "Enter",
  "Home",
  "PageDown",
  "PageUp"
]);

type ConfiguredVisualizationMachineState = Readonly<Record<string, unknown>>;

export const CONFIGURED_VISUALIZATION_PUBLIC_MACHINE_STATE_ENVELOPE_KEYS = Object.freeze([
  "comparison",
  "height",
  "mode",
  "model",
  "strand",
  "topic",
  "value",
  "variant",
  "activeMode",
  "check",
  "formula",
  "kind",
  "selectedCurveOnly",
  "semanticFamily"
] as const);

const hkPassThroughPublicMathStateKeys = Object.freeze({
  "p2-multiplication-foundations": Object.freeze(["rows", "columns", "total"]),
  "p3-fractions-intro": Object.freeze([
    "denominator",
    "numerator",
    "equivalentNumerator",
    "equivalentDenominator",
    "value"
  ]),
  "statistics-s1": Object.freeze(["mean", "spread"]),
  "data-handling": Object.freeze(["mean", "spread"]),
  "advanced-functions": Object.freeze(["family", "scale", "verticalShift"]),
  "differentiation-intro": Object.freeze(["curvature", "probeX", "slope"]),
  calculus: Object.freeze(["curvature", "probeX", "slope"])
} satisfies Readonly<Record<HKPassThroughLabId, readonly string[]>>);

export function projectConfiguredVisualizationPublicMachineState(
  topic: string,
  internalState: ConfiguredVisualizationMachineState
): ConfiguredVisualizationMachineState {
  if (!isHKPassThroughLabId(topic)) return internalState;

  const allowedKeys = new Set<string>([
    ...CONFIGURED_VISUALIZATION_PUBLIC_MACHINE_STATE_ENVELOPE_KEYS,
    ...hkPassThroughPublicMathStateKeys[topic]
  ]);
  return Object.fromEntries(
    Object.entries(internalState).filter(([key]) => allowedKeys.has(key))
  );
}

export function isConfiguredVisualizationControlKey(value: unknown): value is string {
  return typeof value === "string" && configuredVisualizationControlKeys.has(value);
}

export function buildConfiguredVisualizationLessonSessionRecord({
  currentUserId,
  lab,
  labId,
  queuedAt,
  topicId
}: {
  currentUserId: string | null | undefined;
  lab: FeaturedLabDefinition | null | undefined;
  labId: string | undefined;
  queuedAt: number;
  topicId: string | undefined;
}): VisualizationSessionOutboxRecord | null {
  // VisualizationLabPage passes labId and owns persistence through its outer
  // VisualizationCard. LessonView deliberately omits labId, so this host owns
  // the first-control-interaction session for both configured and HK-dedicated
  // branches without creating anything on render or mount.
  if (labId || !currentUserId || !lab || !Number.isSafeInteger(queuedAt) || queuedAt < 0) {
    return null;
  }
  const exactTopicId = lab.labId || topicId;
  if (!exactTopicId) return null;
  return {
    userId: currentUserId,
    moduleId: configuredVisualizationModuleId,
    topicId: exactTopicId,
    source: lab.analyticsSource,
    queuedAt
  };
}

export type ConfiguredVisualizationProductionRenderer =
  | "configured"
  | "hk-dedicated"
  | "mainland-decimal-arithmetic"
  | "mainland-multi-digit-operations";

export function resolveConfiguredVisualizationProductionRenderer(
  lab: FeaturedLabDefinition | null | undefined
): ConfiguredVisualizationProductionRenderer {
  if (!lab) return "configured";

  if (isMainlandVisualizationLab(lab)) {
    if (isMainlandMultiDigitOperationsLabId(lab.labId)) {
      return "mainland-multi-digit-operations";
    }
    if (isMainlandDecimalArithmeticLabId(lab.labId)) {
      return "mainland-decimal-arithmetic";
    }
  }

  if (lab.curriculumTrack !== "HK" || !isHKDedicatedLabId(lab.labId)) {
    return "configured";
  }
  const registryKind = hkVisualizationLabRegistryKind(lab.labId);
  return registryKind === "primary-dedicated" || registryKind === "secondary-dedicated"
    ? "hk-dedicated"
    : "configured";
}

export function deriveConfiguredVisualizationMachineState({
  comparison,
  family,
  height: semanticHeight,
  mode,
  strand,
  topic,
  value,
  variant
}: {
  comparison: number;
  family?: string;
  height: number;
  mode: number;
  strand?: string | null;
  topic: string;
  value: number;
  variant?: string;
}): ConfiguredVisualizationMachineState {
  const lessonSafeMode = [
    "advanced-functions",
    "calculus",
    "differentiation-intro",
    "p2-multiplication-foundations"
  ].includes(variant ?? "")
    ? 0
    : mode;
  const baseState = {
    comparison,
    height: semanticHeight,
    mode: lessonSafeMode,
    model: family ?? "configured-visualization",
    strand: strand ?? null,
    topic,
    value,
    variant: variant ?? null
  };

  if (!family) return baseState;

  const primaryState = buildConfiguredSemanticPrimaryState(family, {
    comparison,
    height: semanticHeight,
    mode,
    value,
    variant: variant ?? ""
  });
  if (primaryState) {
    if (primaryState.kind === "array" && variant === "p2-multiplication-foundations") {
      return {
        ...baseState,
        columns: primaryState.columns,
        formula: primaryState.formula,
        kind: primaryState.kind,
        rows: primaryState.rows,
        total: primaryState.product
      };
    }
    const compatibilityState = primaryState.kind === "fraction" && variant === "p3-fractions-intro"
        ? {
            controllerValue: value,
            eqDen: primaryState.resultDenominator,
            eqNum: primaryState.resultNumerator,
            equivalentDenominator: primaryState.resultDenominator,
            equivalentNumerator: primaryState.resultNumerator,
            value: primaryState.numerator / primaryState.denominator
          }
        : {};
    return { ...baseState, ...primaryState, ...compatibilityState };
  }

  if (!supportsConfiguredSemanticSecondaryFamily(family)) return baseState;
  const secondaryState = buildConfiguredSemanticSecondaryMathState({
    comparison,
    family,
    mode,
    value,
    variant: variant ?? ""
  });
  const metrics = secondaryState.metrics;
  if (variant === "advanced-functions") {
    const scaleParameter = Number(metrics.scaleParameter);
    return {
      ...baseState,
      check: secondaryState.check,
      family: metrics.primaryFamily,
      formula: secondaryState.formula,
      kind: secondaryState.kind,
      scale: scaleParameter,
      selectedCurveOnly: true,
      semanticFamily: secondaryState.family,
      value: scaleParameter * 6,
      verticalShift: metrics.verticalShift
    };
  }
  if (variant === "differentiation-intro" || variant === "calculus") {
    return {
      ...baseState,
      activeMode: "tangent",
      check: secondaryState.check,
      curvature: metrics.curvature,
      formula: secondaryState.formula,
      kind: secondaryState.kind,
      probeX: metrics.probeX,
      semanticFamily: secondaryState.family,
      slope: metrics.tangentSlope
    };
  }

  return {
    ...baseState,
    ...metrics,
    check: secondaryState.check,
    formula: secondaryState.formula,
    kind: secondaryState.kind,
    semanticFamily: secondaryState.family
  };
}

const arrayAreaLayout = {
  cellHeight: 20,
  cellWidth: 30,
  columnGap: 32,
  originX: 86,
  originY: 108,
  outlinePadding: 8,
  rowGap: 22,
  summaryY: panel.y + panel.height + 18,
  titleClearanceY: 96
};
const rightTriangleLayout = {
  origin: { x: 174, y: 218 },
  scale: 10,
  summaryY: panel.y + panel.height + 18
};
const angleGeometryLayout = {
  origin: { x: 188, y: 222 },
  rayRadius: 136,
  summaryY: panel.y + panel.height + 18
};
const configuredFunctionFrame = {
  bottom: 286,
  origin: { x: 320, y: 216 },
  top: 72,
  xMax: 2.5,
  xMin: -2.5,
  xScale: 496 / 5,
  yScale: 12
};
const coordinateTransformFrame = {
  bottom: 292,
  origin: { x: 320, y: 200 },
  top: 68,
  xScale: 32,
  yScale: 21
};
const complexPlaneOrigin = { x: 320, y: 190 };
const complexPlaneScale = 8;
const statisticsFrame = {
  bottom: 292,
  left: 78,
  right: 562,
  summaryY: panel.y + panel.height + 18,
  top: 70,
  xMax: 10,
  xMin: 0,
  yMax: 4
};
const modeButtonActiveClassNames = [
  "bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-500/20",
  "bg-fuchsia-400 text-slate-950 shadow-lg shadow-fuchsia-500/20",
  "bg-amber-300 text-slate-950 shadow-lg shadow-amber-500/20"
];
const calculusFrame = {
  bottom: 286,
  left: 88,
  originX: 320,
  right: 552,
  top: 74,
  xMax: 4,
  xMin: -4,
  xScale: 58,
  yMax: 8,
  yScale: 24
};
const trigWaveFrame = {
  bottom: 272,
  centerY: 184,
  gridLeft: 278,
  gridRight: 570,
  left: 286,
  radianMax: Math.PI * 4,
  right: 562,
  sampleCount: 70,
  top: 96,
  yScale: 58
};
const numberLineTickValues = Array.from({ length: 19 }, (_, index) => index);

function trigWaveXForRadians(radians: number) {
  return trigWaveFrame.left + (radians / trigWaveFrame.radianMax) * (trigWaveFrame.right - trigWaveFrame.left);
}

function trigWaveYForValue(value: number) {
  return trigWaveFrame.centerY - value * trigWaveFrame.yScale;
}

function formatComplexLabel(real: number, imaginary: number) {
  const realLabel = formatNumber(real, 0);
  const absoluteImaginary = Math.abs(imaginary);
  const imaginaryLabel = absoluteImaginary === 1 ? "i" : `${formatNumber(absoluteImaginary, 0)}i`;

  if (imaginary === 0) return realLabel;
  if (real === 0) return `${imaginary < 0 ? "-" : ""}${imaginaryLabel}`;
  return `${realLabel} ${imaginary < 0 ? "-" : "+"} ${imaginaryLabel}`;
}

function polylinePath(points: Array<{ x: number; y: number }>) {
  return points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(" ");
}

function signedFormulaTerm(value: number, decimals = 0) {
  return `${value >= 0 ? "+" : "-"} ${formatNumber(Math.abs(value), decimals)}`;
}

function signedDisplayTerm(value: number, decimals = 0) {
  if (value === 0) return "0";
  return `${value > 0 ? "+" : "-"}${formatNumber(Math.abs(value), decimals)}`;
}

function configuredFunctionParameters(value: number, comparison: number, mode: number) {
  const verticalShift = comparison - 5;

  if (mode === 0) {
    const scaleParameter = value / 6;
    return {
      formula: `y = ${formatNumber(scaleParameter, 2)}x^2 ${signedFormulaTerm(verticalShift)}`,
      modeKey: "quadratic",
      scaleDisplay: `a=${formatNumber(scaleParameter, 2)}`,
      scaleParameter,
      shiftDisplay: signedDisplayTerm(verticalShift),
      verticalShift
    };
  }

  if (mode === 1) {
    const scaleParameter = value * 0.8;
    return {
      formula: `y = ${formatNumber(scaleParameter, 1)} sin(1.4x) ${signedFormulaTerm(verticalShift)}`,
      modeKey: "wave",
      scaleDisplay: `A=${formatNumber(scaleParameter, 1)}`,
      scaleParameter,
      shiftDisplay: signedDisplayTerm(verticalShift),
      verticalShift
    };
  }

  if (mode === 3) {
    const scaleParameter = value / 5;
    return {
      formula: `y = ${formatNumber(scaleParameter, 2)} x 2^x ${signedFormulaTerm(verticalShift)}`,
      modeKey: "exponential",
      scaleDisplay: `k=${formatNumber(scaleParameter, 2)}`,
      scaleParameter,
      shiftDisplay: signedDisplayTerm(verticalShift),
      verticalShift
    };
  }

  const scaleParameter = value / 5;
  return {
    formula: `y = 5 ln(${formatNumber(scaleParameter, 2)}(x + 2.5) + 1) ${signedFormulaTerm(verticalShift)}`,
    modeKey: "log-growth",
    scaleDisplay: `k=${formatNumber(scaleParameter, 2)}`,
    scaleParameter,
    shiftDisplay: signedDisplayTerm(verticalShift),
    verticalShift
  };
}

function configuredFunctionValue(value: number, comparison: number, mode: number, t: number) {
  const parameters = configuredFunctionParameters(value, comparison, mode);
  const centered = configuredFunctionFrame.xMin + t * (configuredFunctionFrame.xMax - configuredFunctionFrame.xMin);

  if (mode === 0) return parameters.scaleParameter * centered * centered + parameters.verticalShift;
  if (mode === 1) return Math.sin(centered * 1.4) * parameters.scaleParameter + parameters.verticalShift;
  if (mode === 3) return parameters.scaleParameter * Math.pow(2, centered) + parameters.verticalShift;
  return Math.log(Math.max(0.05, parameters.scaleParameter * (centered - configuredFunctionFrame.xMin) + 1)) * 5 + parameters.verticalShift;
}

function configuredFunctionPoint(value: number, comparison: number, mode: number, t: number) {
  const xValue = configuredFunctionFrame.xMin + t * (configuredFunctionFrame.xMax - configuredFunctionFrame.xMin);
  const yValue = configuredFunctionValue(value, comparison, mode, t);
  const visibleY = clamp(
    configuredFunctionFrame.origin.y - yValue * configuredFunctionFrame.yScale,
    configuredFunctionFrame.top,
    configuredFunctionFrame.bottom
  );

  return {
    clipped: visibleY !== configuredFunctionFrame.origin.y - yValue * configuredFunctionFrame.yScale,
    x: configuredFunctionFrame.origin.x + xValue * configuredFunctionFrame.xScale,
    xValue,
    y: visibleY,
    yValue
  };
}

function graphPath(value: number, comparison: number, mode: number) {
  const points = Array.from({ length: 72 }, (_, index) => {
    const t = index / 71;
    return configuredFunctionPoint(value, comparison, mode, t);
  });

  return polylinePath(points);
}

function trigState(value: number, comparison: number, mode: number) {
  const phase = mode * (Math.PI / 4);
  const theta = ((value - 1) / 8) * Math.PI * 2 + phase;
  const thetaDegrees = (((value - 1) / 8) * 360 + mode * 45) % 360;

  return {
    amplitude: clamp(comparison / 9, 0.1, 1),
    phase,
    theta,
    thetaDegrees
  };
}

function normalizeDegrees(degrees: number) {
  return ((degrees % 360) + 360) % 360;
}

function calculusState(value: number, comparison: number) {
  const a = value / 10;
  const x0 = (comparison - 5) / 1.25;
  const f = (x: number) => (a * x * x) / 2 + 0.35;
  const slope = (x: number) => a * x;

  return {
    a,
    f,
    slope,
    x0
  };
}

function advancedGeometryState(value: number, comparison: number) {
  const vector = {
    componentX: value - 5,
    componentY: comparison - 5,
    origin: { x: 320, y: 198 },
    scale: 27
  };
  const vectorEnd = {
    x: vector.origin.x + vector.componentX * vector.scale,
    y: vector.origin.y - vector.componentY * vector.scale
  };
  const rawMajor = 52 + value * 8;
  const rawMinor = 24 + comparison * 5;
  const semiMajor = Math.max(rawMajor, rawMinor);
  const semiMinor = Math.min(rawMajor, rawMinor);
  const focalDistance = Math.sqrt(Math.max(0, semiMajor ** 2 - semiMinor ** 2));
  const widthUnits = value + 3;
  const heightUnits = comparison + 2;
  const depthUnits = Math.round((value + comparison) / 2) + 2;

  return {
    conic: {
      center: { x: 320, y: 176 },
      focalDistance,
      semiMajor,
      semiMinor
    },
    solid: {
      depth: 28 + depthUnits * 5,
      depthUnits,
      height: 44 + heightUnits * 9,
      heightUnits,
      width: 64 + widthUnits * 12,
      widthUnits
    },
    vector: {
      ...vector,
      angleDegrees: normalizeDegrees(Math.atan2(vector.componentY, vector.componentX) * (180 / Math.PI)),
      end: vectorEnd,
      magnitude: Math.hypot(vector.componentX, vector.componentY)
    }
  };
}

function numberLineState(value: number, comparison: number, mode: number) {
  const axis = { left: 86, right: 554, y: 190 };
  const scale = (axis.right - axis.left) / 18;
  const rawStart = mode === 0 ? 0 : mode === 1 ? value : Math.min(value, comparison);
  const rawEnd = mode === 0 ? value : mode === 1 ? value + comparison : Math.max(value, comparison);
  const startValue = clamp(rawStart, 0, 18);
  const endValue = clamp(rawEnd, 0, 18);
  const stepValue = Math.abs(endValue - startValue);

  return {
    axis,
    endValue,
    scale,
    startValue,
    stepValue,
    tickValues: numberLineTickValues,
    zeroEnd: endValue === 0,
    zeroStart: startValue === 0,
    zeroStep: startValue === endValue
  };
}

function fractionState(value: number, comparison: number) {
  const denominator = clamp(Math.round(value + 1), 2, 10);
  const numerator = clamp(Math.round(comparison), 0, denominator);

  return {
    denominator,
    equivalentDenominator: denominator * 2,
    equivalentNumerator: numerator * 2,
    numerator,
    value: numerator / denominator,
    zeroFraction: numerator === 0
  };
}

function arrayAreaState(value: number, comparison: number) {
  const columns = clamp(Math.round(value), 0, 9);
  const rows = clamp(Math.round(comparison), 0, 9);
  const outlineWidth = columns > 0
    ? columns * arrayAreaLayout.columnGap - (arrayAreaLayout.columnGap - arrayAreaLayout.cellWidth) + arrayAreaLayout.outlinePadding * 2
    : 0;
  const outlineHeight = rows > 0
    ? rows * arrayAreaLayout.rowGap - (arrayAreaLayout.rowGap - arrayAreaLayout.cellHeight) + arrayAreaLayout.outlinePadding * 2
    : 0;

  return {
    area: columns * rows,
    columns,
    outlineHeight,
    outlineWidth,
    rows,
    zeroArea: columns === 0 || rows === 0,
    zeroColumns: columns === 0,
    zeroRows: rows === 0
  };
}

function baseTenState(value: number, comparison: number) {
  const tens = clamp(Math.round(value), 0, 9);
  const ones = clamp(Math.round(comparison), 0, 9);

  return {
    ones,
    tens,
    total: tens * 10 + ones,
    zeroOnes: ones === 0,
    zeroTens: tens === 0,
    zeroTotal: tens === 0 && ones === 0
  };
}

function clockMoneyState(value: number, comparison: number) {
  const hour = clamp(Math.round(value), 1, 12);
  const minuteStep = clamp(Math.round(comparison), 0, 11);
  const minute = minuteStep * 5;
  const moneyTotal = Math.round((hour * 10 + (minute / 60) * 10) * 100) / 100;
  const hourAngle = ((hour % 12) + minute / 60) * 30 - 90;
  const minuteAngle = minute * 6 - 90;
  const handEnd = (angleDegrees: number, radius: number) => {
    const angle = angleDegrees * (Math.PI / 180);
    return {
      x: 154 + Math.cos(angle) * radius,
      y: 142 + Math.sin(angle) * radius
    };
  };

  return {
    hour,
    hourAngle,
    hourEnd: handEnd(hourAngle, 38),
    minute,
    minuteAngle,
    minuteEnd: handEnd(minuteAngle, 52),
    minuteStep,
    moneyTotal
  };
}

function measurementState(value: number, comparison: number) {
  const unitScale = 38;
  const objectAUnits = clamp(Math.round(value), 0, 9);
  const objectBUnits = clamp(Math.round(comparison), 0, 9);
  const objectAWidth = objectAUnits * unitScale;
  const objectBWidth = objectBUnits * unitScale;

  return {
    difference: Math.abs(objectAUnits - objectBUnits),
    objectAUnits,
    objectAWidth,
    objectBUnits,
    objectBWidth,
    unitScale,
    zeroObjectA: objectAUnits === 0,
    zeroObjectB: objectBUnits === 0
  };
}

function angleArcPath(origin: { x: number; y: number }, angleDegrees: number, radius: number) {
  const angleRadians = angleDegrees * (Math.PI / 180);
  const end = {
    x: origin.x + Math.cos(angleRadians) * radius,
    y: origin.y - Math.sin(angleRadians) * radius
  };
  const largeArcFlag = angleDegrees > 180 ? 1 : 0;

  return {
    d: `M ${origin.x + radius} ${origin.y} A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`,
    end,
    largeArcFlag
  };
}

function angleGeometryState(value: number, comparison: number) {
  const angleA = clamp(Math.round(value) * 18, 0, 180);
  const angleB = clamp(Math.round(comparison) * 18, 0, 180);

  return {
    angleA,
    angleB,
    difference: Math.abs(angleA - angleB)
  };
}

function angleGeometryLabelPositions(rayA: { x: number; y: number }, rayB: { x: number; y: number }) {
  const labelA = {
    x: clamp(rayA.x + 8, 58, 558),
    y: clamp(rayA.y - 8, 100, 292)
  };
  const labelB = {
    x: clamp(rayB.x + 8, 58, 558),
    y: clamp(rayB.y - 8, 100, 292)
  };
  const labelDistance = Math.hypot(labelA.x - labelB.x, labelA.y - labelB.y);

  if (labelDistance >= 26) return { labelA, labelB };

  return {
    labelA: {
      x: clamp(labelA.x - 4, 58, 558),
      y: clamp(labelA.y - 18, 100, 292)
    },
    labelB: {
      x: clamp(labelB.x + 4, 58, 558),
      y: clamp(labelB.y + 18, 100, 292)
    }
  };
}

function rightTriangleState(value: number, comparison: number) {
  const legA = clamp(Math.round(value), 1, 9);
  const legB = clamp(Math.round(comparison), 1, 9);
  const hypotenuse = Math.hypot(legA, legB);
  const origin = rightTriangleLayout.origin;
  const scale = rightTriangleLayout.scale;
  const pointA = origin;
  const pointB = { x: origin.x + legA * scale, y: origin.y };
  const pointC = { x: origin.x, y: origin.y - legB * scale };
  const hypotenuseVector = { x: pointC.x - pointB.x, y: pointC.y - pointB.y };
  const outwardNormal = { x: -hypotenuseVector.y, y: hypotenuseVector.x };
  const pointD = { x: pointB.x + outwardNormal.x, y: pointB.y + outwardNormal.y };
  const pointE = { x: pointC.x + outwardNormal.x, y: pointC.y + outwardNormal.y };
  const similarScale = clamp((legA + legB) / 10, 0.45, 1.8);
  const similarOrigin = { x: 438, y: 248 };
  const similarPointB = { x: similarOrigin.x + legA * scale * similarScale, y: similarOrigin.y };
  const similarPointC = { x: similarOrigin.x, y: similarOrigin.y - legB * scale * similarScale };
  const points = (items: Array<{ x: number; y: number }>) => items.map((point) => `${point.x},${point.y}`).join(" ");

  return {
    hypotenuse,
    hypotenuseSquared: legA * legA + legB * legB,
    legA,
    legASquared: legA * legA,
    legB,
    legBSquared: legB * legB,
    pointA,
    pointB,
    pointC,
    pointD,
    pointE,
    points,
    scale,
    similarOrigin,
    similarPointB,
    similarPointC,
    similarScale
  };
}

function probabilityState(value: number, comparison: number) {
  const success = clamp(Math.round(value), 0, 9);
  const failure = clamp(Math.round(comparison), 0, 9);
  const trials = success + failure;
  const probabilityDefined = trials > 0;
  const probability = probabilityDefined ? success / trials : 0;

  return {
    failure,
    probability,
    probabilityDefined,
    success,
    trials
  };
}

function statisticsState(value: number, comparison: number) {
  const mean = clamp(Math.round(value), statisticsFrame.xMin, statisticsFrame.xMax);
  const spread = clamp(comparison / 2, 0.5, 4.5);

  return {
    mean,
    spread
  };
}

function coordinateTransformState(value: number, comparison: number, mode: number) {
  const origin = coordinateTransformFrame.origin;
  const scale = { x: coordinateTransformFrame.xScale, y: coordinateTransformFrame.yScale };
  const dx = value - 5;
  const dy = clamp(comparison - 5, -3, 3);
  const reflectionLineX = (value - 5) / 2;
  const dilationScale = clamp(value / 5, 0.2, 1.8);
  const source = [
    { label: "A", x: -2, y: -0.75 },
    { label: "B", x: -1, y: 0.9 },
    { label: "C", x: 1, y: -0.75 }
  ];
  const transformPoint = (point: { x: number; y: number }) => {
    if (mode === 0) return { x: point.x + dx, y: point.y + dy };
    if (mode === 1) return { x: 2 * reflectionLineX - point.x, y: point.y + dy };
    return { x: point.x * dilationScale, y: point.y * dilationScale + dy };
  };
  const toSvg = (point: { x: number; y: number }) => ({
    x: origin.x + point.x * scale.x,
    y: origin.y - point.y * scale.y
  });

  return {
    dilationScale,
    dx,
    dy,
    origin,
    reflectionLineX,
    scale,
    source,
    sourceSvg: source.map(toSvg),
    transformed: source.map(transformPoint),
    transformedSvg: source.map((point) => toSvg(transformPoint(point)))
  };
}

function coordinateTransformLabelPositions(points: Array<{ x: number; y: number }>) {
  const offsets = [
    { x: 12, y: -12 },
    { x: -30, y: -14 },
    { x: 14, y: 28 }
  ];
  const minDistance = 34;
  const placed: Array<{ x: number; y: number }> = [];

  return points.map((point, index) => {
    const offset = offsets[index % offsets.length];
    let candidate = {
      x: clamp(point.x + offset.x, 92, 548),
      y: clamp(point.y + offset.y, 84, 280)
    };

    placed.forEach((existing) => {
      const distance = Math.hypot(candidate.x - existing.x, candidate.y - existing.y);
      if (distance < minDistance) {
        candidate = {
          x: clamp(candidate.x + (index % 2 === 0 ? minDistance : -minDistance), 92, 548),
          y: clamp(candidate.y + minDistance, 84, 280)
        };
      }
    });
    placed.push(candidate);

    return candidate;
  });
}

function equationBalanceState(value: number, comparison: number) {
  const leftValue = clamp(Math.round(value), 0, 9);
  const rightValue = clamp(Math.round(comparison), 0, 9);
  const difference = leftValue - rightValue;

  return {
    difference,
    leftValue,
    rightValue,
    status: difference === 0 ? "balanced" : difference > 0 ? "left-heavy" : "right-heavy",
    tilt: clamp(difference * 3, -18, 18),
    zeroBoth: leftValue === 0 && rightValue === 0,
    zeroLeft: leftValue === 0,
    zeroRight: rightValue === 0
  };
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

function isMainlandVisualizationLab(lab: FeaturedLabDefinition | null) {
  return lab?.curriculumTrack === "MAINLAND_PEP_PRIMARY" ||
    lab?.curriculumTrack === "MAINLAND_PEP_JUNIOR" ||
    lab?.curriculumTrack === "MAINLAND_PEP_HIGH" ||
    lab?.curriculumTrack === "MAINLAND_HJB" ||
    lab?.curriculumTrack === "MAINLAND_BNU";
}

function supportsConfiguredSemanticPrimaryFamily(family: string) {
  return (configuredSemanticPrimaryFamilies as readonly string[]).includes(family);
}

function snapConfiguredControlValue(value: number, minimum: number, maximum: number, step: number) {
  const bounded = clamp(value, minimum, maximum);
  if (!Number.isFinite(step) || step <= 0) return bounded;
  const snapped = minimum + Math.round((bounded - minimum) / step) * step;
  return Number(clamp(snapped, minimum, maximum).toFixed(8));
}

type VisualizationGradeBand = "early-primary" | "upper-primary" | "secondary";

function gradeBandForLab(lab: FeaturedLabDefinition | null): VisualizationGradeBand {
  const grade = lab?.grade;
  if (!grade) return "secondary";
  if (grade === "K" || grade === "P1" || grade === "P2") return "early-primary";
  if (/^P[3-6]$/.test(grade)) return "upper-primary";
  return "secondary";
}

function isGradeOneAddSubtractLab(lab: FeaturedLabDefinition | null, labId?: string, topicId?: string) {
  return lab?.labId === gradeOneAddSubtractLabId ||
    lab?.topicId === gradeOneAddSubtractLabId ||
    labId === gradeOneAddSubtractLabId ||
    topicId === gradeOneAddSubtractLabId;
}

function estimateBadgeWidth(label: string) {
  const textWidth = Array.from(label).reduce((total, char) => {
    if (/[\u3400-\u9fff]/.test(char)) return total + 16;
    if (/[A-Z0-9]/.test(char)) return total + 8.5;
    if (/[a-z]/.test(char)) return total + 7.25;
    if (/\s/.test(char)) return total + 4;
    return total + 6;
  }, 0);

  return clamp(
    textWidth * titleBadgeEstimatedSafetyFactor + titleBadgeHorizontalPadding,
    76,
    titleBadgeMaxWidth
  );
}

function useLabFromProps({
  lab,
  labId,
  topicId
}: {
  lab?: FeaturedLabDefinition | null;
  labId?: string;
  topicId?: string;
}) {
  const [catalogLab, setCatalogLab] = useState<FeaturedLabDefinition | null>(lab ?? null);

  useEffect(() => {
    if (lab) {
      setCatalogLab(lab);
      return;
    }

    if (!labId && !topicId) {
      setCatalogLab(null);
      return;
    }

    let active = true;
    setCatalogLab(null);

    import("@/data/visualizationLabs")
      .then((module) => {
        if (!active) return;
        setCatalogLab(module.getVisualizationLabByLabId(labId) ?? module.getPrimaryVisualizationLabForTopic(topicId) ?? null);
      })
      .catch(() => {
        if (active) setCatalogLab(null);
      });

    return () => {
      active = false;
    };
  }, [lab, labId, topicId]);

  return lab ?? catalogLab;
}

function ConfiguredSvgSurface({
  accent,
  comparison,
  gradeBand,
  label,
  mobilePanHint,
  mode,
  semanticHeight,
  semanticCompositeStrands,
  semanticModel,
  semanticPrimaryStrings,
  semanticSecondaryStrings,
  statisticsSummaryLabels,
  configuredMachineState,
  semanticStrandIndex,
  showStandardGraphOverlay,
  templateId,
  titleBadgeLabel,
  titleBadgeWidth,
  userPoints,
  value,
  vizTheme
}: {
  accent: string;
  comparison: number;
  gradeBand: VisualizationGradeBand;
  label: string;
  mobilePanHint: string;
  mode: number;
  semanticHeight: number;
  semanticCompositeStrands: readonly ConfiguredVisualizationCompositeStrand[] | null;
  semanticModel: ConfiguredVisualizationSemanticModel | null;
  semanticPrimaryStrings: SemanticPrimaryLocalizedStrings;
  semanticSecondaryStrings: ConfiguredSemanticSecondaryStrings;
  statisticsSummaryLabels: { mean: string; spread: string };
  configuredMachineState: ConfiguredVisualizationMachineState;
  semanticStrandIndex: number;
  showStandardGraphOverlay: boolean;
  templateId: VisualizationTemplateId;
  titleBadgeLabel: string;
  titleBadgeWidth: number;
  userPoints?: Array<{ x: number; y: number }>;
  value: number;
  vizTheme: VisualizationTheme;
}) {
  const mobilePanHintId = useId();
  const scrollSurfaceRef = useRef<HTMLDivElement>(null);
  const [hasHorizontalOverflow, setHasHorizontalOverflow] = useState(false);
  const titleBadgeMeasurementRef = useRef<SVGTextElement>(null);
  const [titleBadgeMeasurement, setTitleBadgeMeasurement] = useState<{ label: string; width: number } | null>(null);

  useLayoutEffect(() => {
    const labelNode = titleBadgeMeasurementRef.current;
    if (!labelNode) return;

    // Measure natural browser-rendered glyphs on a separate hidden node. The
    // visible text remains fully React-owned, including its cap constraint.
    const measuredWidth = Math.max(labelNode.getComputedTextLength(), labelNode.getBBox().width);
    if (!Number.isFinite(measuredWidth) || measuredWidth <= 0) return;
    setTitleBadgeMeasurement((current) =>
      current?.label === titleBadgeLabel && Math.abs(current.width - measuredWidth) < 0.1
        ? current
        : { label: titleBadgeLabel, width: measuredWidth }
    );
  }, [titleBadgeLabel]);

  useLayoutEffect(() => {
    const scrollSurface = scrollSurfaceRef.current;
    if (!scrollSurface) return;

    const updateHorizontalOverflow = () => {
      const nextValue = scrollSurface.scrollWidth - scrollSurface.clientWidth > 2;
      setHasHorizontalOverflow((current) => (current === nextValue ? current : nextValue));
    };
    updateHorizontalOverflow();
    const resizeObserver = new ResizeObserver(updateHorizontalOverflow);
    resizeObserver.observe(scrollSurface);
    const innerSurface = scrollSurface.querySelector("[data-viz-surface]");
    if (innerSurface) resizeObserver.observe(innerSurface);
    window.addEventListener("resize", updateHorizontalOverflow);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateHorizontalOverflow);
    };
  }, []);

  const fallbackTitleBadgeTextWidth = Math.max(0, titleBadgeWidth - titleBadgeHorizontalPadding);
  const measuredTitleBadgeTextWidth =
    titleBadgeMeasurement?.label === titleBadgeLabel ? titleBadgeMeasurement.width : fallbackTitleBadgeTextWidth;
  const titleBadgeBackgroundWidth = clamp(
    measuredTitleBadgeTextWidth + titleBadgeHorizontalPadding,
    76,
    titleBadgeMaxWidth
  );
  const titleBadgeTextMaxWidth = titleBadgeMaxWidth - titleBadgeHorizontalPadding;
  const titleBadgeTextLength =
    measuredTitleBadgeTextWidth > titleBadgeTextMaxWidth ? titleBadgeTextMaxWidth : undefined;
  const renderSemanticFamily = (
    family: ConfiguredSemanticPrimaryFamily | ConfiguredSemanticSecondaryFamily,
    variant: string
  ) => supportsConfiguredSemanticPrimaryFamily(family)
    ? (
        <ConfiguredSemanticPrimaryMarks
          accent={accent}
          comparison={comparison}
          family={family}
          localizedStrings={semanticPrimaryStrings}
          height={semanticHeight}
          mode={mode}
          value={value}
          variant={variant}
          vizTheme={vizTheme}
        />
      )
    : supportsConfiguredSemanticSecondaryFamily(family)
        ? (
          <ConfiguredSemanticSecondaryMarks
            accent={accent}
            comparison={comparison}
            family={family}
            mode={mode}
            strings={semanticSecondaryStrings}
            value={value}
            variant={variant}
            vizTheme={vizTheme}
          />
        )
        : null;
  const activeSemanticStrand = semanticCompositeStrands?.[
    Math.min(semanticStrandIndex, Math.max(0, semanticCompositeStrands.length - 1))
  ];
  const activeSemanticStrandMarks = activeSemanticStrand
    ? renderSemanticFamily(activeSemanticStrand.family, activeSemanticStrand.variant)
    : null;
  const semanticMarks = semanticModel
    ? activeSemanticStrand && activeSemanticStrandMarks
      ? (
        <g
          data-viz-semantic-family={semanticModel.semanticFamily}
          data-viz-semantic-variant={semanticModel.variant}
          data-viz-semantic-kind="composite"
          data-viz-semantic-strand={activeSemanticStrand.family}
          data-viz-composite-plan-size={semanticCompositeStrands?.length}
          data-viz-composite-strand-index={semanticStrandIndex}
          data-viz-math-state={JSON.stringify({
            family: semanticModel.semanticFamily,
            strandFamily: activeSemanticStrand.family,
            strandVariant: activeSemanticStrand.variant
          })}
        >
          {activeSemanticStrandMarks}
        </g>
      )
      : renderSemanticFamily(
        semanticModel.semanticFamily as ConfiguredSemanticPrimaryFamily | ConfiguredSemanticSecondaryFamily,
        semanticModel.variant
      )
    : null;

  return (
    <div data-viz-responsive-surface className="min-w-0">
      <p
        id={mobilePanHintId}
        data-viz-mobile-pan-hint
        data-viz-pan-hint
        hidden={!hasHorizontalOverflow}
        className="mb-2 px-1 text-xs font-bold text-slate-500 dark:text-slate-300"
      >
        <span aria-hidden="true">←</span> {mobilePanHint} <span aria-hidden="true">→</span>
      </p>
      <div
        ref={scrollSurfaceRef}
        data-viz-scroll-surface
        role="region"
        aria-label={label}
        aria-describedby={hasHorizontalOverflow ? mobilePanHintId : undefined}
        tabIndex={0}
        className="focus-ring min-w-0 overflow-x-auto overflow-y-hidden overscroll-x-contain rounded-2xl"
      >
        <svg
          data-viz-surface
          data-viz-opaque-backdrop="surface"
          data-viz-surface-model={templateId}
          data-viz-surface-state={JSON.stringify(configuredMachineState)}
          data-viz-mode={mode}
          data-viz-active-mode={mode}
          data-viz-semantic-family={semanticModel?.semanticFamily}
          data-viz-semantic-variant={semanticModel?.variant}
          data-viz-semantic-renderer={semanticModel ? (semanticMarks ? "implemented" : "missing") : undefined}
          role="img"
          aria-label={label}
          viewBox={`0 0 ${width} ${height}`}
          className="aspect-[16/9] h-auto w-full min-w-[640px]"
          style={{ backgroundColor: vizTheme.svgBackground }}
        >
      <rect width={width} height={height} fill={vizTheme.svgBackground} />
      {!semanticModel ? (
        <>
          {Array.from({ length: 8 }, (_, index) => (
            <line key={`v-${index}`} x1={70 + index * 70} x2={70 + index * 70} y1="54" y2="306" stroke={vizTheme.grid} />
          ))}
          {Array.from({ length: 5 }, (_, index) => (
            <line key={`h-${index}`} x1="54" x2="586" y1={76 + index * 50} y2={76 + index * 50} stroke={vizTheme.grid} />
          ))}
        </>
      ) : null}
      <rect x={panel.x} y={panel.y} width={panel.width} height={panel.height} rx="28" fill={vizTheme.panelFill} stroke={vizTheme.panelStroke} />
      {semanticMarks ?? (
        <>
          <CoordinateGridFrame gradeBand={gradeBand} templateId={templateId} vizTheme={vizTheme} />
          <TemplateMarks accent={accent} comparison={comparison} gradeBand={gradeBand} mode={mode} statisticsSummaryLabels={statisticsSummaryLabels} templateId={templateId} userPoints={userPoints} vizTheme={vizTheme} value={value} />
        </>
      )}
      {showStandardGraphOverlay ? (
        <g data-viz-title-badge>
          <text
            ref={titleBadgeMeasurementRef}
            data-viz-title-badge-measurement
            aria-hidden="true"
            visibility="hidden"
            x="84"
            y="78"
            className="text-sm font-black"
          >
            {titleBadgeLabel}
          </text>
          <rect data-viz-title-badge-background x="64" y="52" width={titleBadgeBackgroundWidth} height="40" rx="14" fill={vizTheme.badgeFill} stroke={vizTheme.labelStroke} />
          <text
            data-viz-label
            data-viz-title-badge-label
            x="84"
            y="78"
            fill={vizTheme.badgeText}
            className="text-sm font-black"
            textLength={titleBadgeTextLength}
            lengthAdjust={titleBadgeTextLength ? "spacingAndGlyphs" : undefined}
          >
            {titleBadgeLabel}
          </text>
          <circle cx="558" cy="70" r="18" fill={accent} opacity="0.25" />
          <circle cx="558" cy="70" r="8" fill={accent} />
        </g>
      ) : null}
        </svg>
      </div>
    </div>
  );
}

function CoordinateGridFrame({
  gradeBand,
  templateId,
  vizTheme
}: {
  gradeBand: VisualizationGradeBand;
  templateId: VisualizationTemplateId;
  vizTheme: VisualizationTheme;
}) {
  const axisStroke = vizTheme.axisStrong;
  const gridStroke = vizTheme.gridStrong;
  const tickFill = vizTheme.tickText;

  // Primary statistics labs render a scaled bar chart with its own unit
  // grid, so the continuous-distribution frame stays secondary-only.
  if (templateId === "statistics-distribution" && gradeBand !== "secondary") return null;

  if (templateId === "coordinate-transform") {
    const origin = coordinateTransformFrame.origin;
    const xScale = coordinateTransformFrame.xScale;
    const yScale = coordinateTransformFrame.yScale;
    const xTicks = [-6, -4, -2, 0, 2, 4, 6];
    const yTicks = [-4, -3, -2, -1, 0, 1, 2, 3, 4];

    return (
      <g aria-hidden="true" pointerEvents="none">
        {xTicks.map((tick) => {
          const x = origin.x + tick * xScale;
          return (
            <g key={`transform-x-${tick}`}>
              <line x1={x} x2={x} y1="68" y2="292" stroke={tick === 0 ? axisStroke : gridStroke} strokeWidth={tick === 0 ? 2.4 : 1} opacity={tick === 0 ? 0.78 : 0.82} />
              <text x={x} y="286" textAnchor="middle" fill={tickFill} className="text-[10px] font-bold">{tick}</text>
            </g>
          );
        })}
        {yTicks.map((tick) => {
          const y = origin.y - tick * yScale;
          return (
            <g key={`transform-y-${tick}`}>
              <line x1="78" x2="562" y1={y} y2={y} stroke={tick === 0 ? axisStroke : gridStroke} strokeWidth={tick === 0 ? 2.4 : 1} opacity={tick === 0 ? 0.78 : 0.82} />
              <text x="94" y={y - 4} fill={tickFill} className="text-[10px] font-bold">{tick}</text>
            </g>
          );
        })}
        <text x="574" y={origin.y + 18} fill={vizTheme.labelText} className="text-sm font-black">x</text>
        <text x={origin.x + 14} y="82" fill={vizTheme.labelText} className="text-sm font-black">y</text>
      </g>
    );
  }

  if (templateId === "function-graph" || templateId === "function-family") {
    const origin = configuredFunctionFrame.origin;
    const xScale = configuredFunctionFrame.xScale;
    const yScale = configuredFunctionFrame.yScale;
    const xTicks = [-2.5, -2, -1, 0, 1, 2, 2.5];
    const yTicks = [-5, 0, 5, 10];

    return (
      <g aria-hidden="true" pointerEvents="none">
        {xTicks.map((tick) => {
          const x = origin.x + tick * xScale;
          return (
            <g key={`function-x-${tick}`}>
              <line x1={x} x2={x} y1="70" y2="292" stroke={tick === 0 ? axisStroke : gridStroke} strokeWidth={tick === 0 ? 2.4 : 1} opacity={tick === 0 ? 0.8 : 0.78} />
              <text x={x} y="286" textAnchor="middle" fill={tickFill} className="text-[10px] font-bold">{Number.isInteger(tick) ? tick : formatNumber(tick, 1)}</text>
            </g>
          );
        })}
        {yTicks.map((tick) => {
          const y = origin.y - tick * yScale;
          return (
            <g key={`function-y-${tick}`}>
              <line x1="70" x2="570" y1={y} y2={y} stroke={tick === 0 ? axisStroke : gridStroke} strokeWidth={tick === 0 ? 2.4 : 1} opacity={tick === 0 ? 0.8 : 0.78} />
              <text x="86" y={y - 4} fill={tickFill} className="text-[10px] font-bold">{tick}</text>
            </g>
          );
        })}
        <text x="578" y={origin.y + 18} fill={vizTheme.labelText} className="text-sm font-black">x</text>
        <text x={origin.x + 14} y="84" fill={vizTheme.labelText} className="text-sm font-black">y</text>
      </g>
    );
  }

  if (templateId === "complex-plane") {
    const origin = complexPlaneOrigin;
    const scale = complexPlaneScale;
    const realTicks = [-12, -8, -4, 0, 4, 8, 12];
    const imaginaryTicks = [-6, -4, -2, 0, 2, 4, 6];

    return (
      <g aria-hidden="true" pointerEvents="none">
        {realTicks.map((tick) => {
          const x = origin.x + tick * scale;
          return (
            <g key={`complex-re-${tick}`}>
              <line x1={x} x2={x} y1="66" y2="296" stroke={tick === 0 ? axisStroke : gridStroke} strokeWidth={tick === 0 ? 2.4 : 1} opacity={tick === 0 ? 0.82 : 0.78} />
              <text x={x} y="288" textAnchor="middle" fill={tickFill} className="text-[10px] font-bold">{tick}</text>
            </g>
          );
        })}
        {imaginaryTicks.map((tick) => {
          const y = origin.y - tick * scale;
          return (
            <g key={`complex-im-${tick}`}>
              <line x1="78" x2="562" y1={y} y2={y} stroke={tick === 0 ? axisStroke : gridStroke} strokeWidth={tick === 0 ? 2.4 : 1} opacity={tick === 0 ? 0.82 : 0.78} />
              <text x="92" y={y - 4} fill={tickFill} className="text-[10px] font-bold">{tick}</text>
            </g>
          );
        })}
        <text x="570" y={origin.y - 12} fill={vizTheme.labelText} className="text-sm font-black">Re</text>
        <text x={origin.x + 14} y="82" fill={vizTheme.labelText} className="text-sm font-black">Im</text>
      </g>
    );
  }

  if (templateId === "trig-unit-wave") {
    const frame = trigWaveFrame;
    const xTicks = [
      { label: "0", radians: 0 },
      { label: "pi", radians: Math.PI },
      { label: "2pi", radians: Math.PI * 2 },
      { label: "3pi", radians: Math.PI * 3 },
      { label: "4pi", radians: Math.PI * 4 }
    ];
    const yTicks = [-1, 0, 1];

    return (
      <g aria-hidden="true" pointerEvents="none">
        <rect x={frame.gridLeft} y={frame.top} width={frame.gridRight - frame.gridLeft} height={frame.bottom - frame.top} rx="14" fill="none" stroke={vizTheme.panelStroke} />
        {xTicks.map((tick) => {
          const x = trigWaveXForRadians(tick.radians);
          return (
          <g key={`trig-x-${tick.label}`}>
            <line x1={x} x2={x} y1={frame.top} y2={frame.bottom} stroke={gridStroke} />
            <text x={x} y={frame.bottom - 8} textAnchor="middle" fill={tickFill} className="text-[10px] font-bold">{tick.label}</text>
          </g>
          );
        })}
        {yTicks.map((tick) => {
          const y = trigWaveYForValue(tick);
          return (
            <g key={`trig-y-${tick}`}>
              <line x1={frame.gridLeft} x2={frame.gridRight} y1={y} y2={y} stroke={tick === 0 ? axisStroke : gridStroke} strokeWidth={tick === 0 ? 2 : 1} />
              <text x={frame.gridLeft + 10} y={y - 5} fill={tickFill} className="text-[10px] font-bold">{tick}</text>
            </g>
          );
        })}
        <line x1={frame.gridLeft} x2={frame.gridLeft} y1={frame.top} y2={frame.bottom} stroke={axisStroke} strokeWidth="2" />
        <text x={frame.gridRight + 6} y={frame.centerY + 16} fill={vizTheme.labelText} className="text-sm font-black">x</text>
        <text x={frame.gridLeft + 12} y={frame.top + 16} fill={vizTheme.labelText} className="text-sm font-black">y</text>
      </g>
    );
  }

  if (templateId === "statistics-distribution") {
    const frame = statisticsFrame;
    const xTicks = [0, 2, 4, 6, 8, 10];
    const yTicks = [0, 1, 2, 3, 4];
    const mapFrameX = (tick: number) => frame.left + (tick / 10) * (frame.right - frame.left);
    const mapFrameY = (tick: number) => frame.bottom - (tick / 4) * (frame.bottom - frame.top);

    return (
      <g aria-hidden="true" pointerEvents="none">
        {xTicks.map((tick) => (
          <g key={`stats-x-${tick}`}>
            <line x1={mapFrameX(tick)} x2={mapFrameX(tick)} y1={frame.top} y2={frame.bottom} stroke={gridStroke} />
            <text x={mapFrameX(tick)} y={frame.bottom - 8} textAnchor="middle" fill={tickFill} className="text-[10px] font-bold">{tick}</text>
          </g>
        ))}
        {yTicks.map((tick) => (
          <g key={`stats-y-${tick}`}>
            <line x1={frame.left} x2={frame.right} y1={mapFrameY(tick)} y2={mapFrameY(tick)} stroke={tick === 0 ? axisStroke : gridStroke} strokeWidth={tick === 0 ? 2.2 : 1} />
            <text x={frame.left + 10} y={mapFrameY(tick) - 4} fill={tickFill} className="text-[10px] font-bold">{tick}</text>
          </g>
        ))}
        <line x1={frame.left} x2={frame.left} y1={frame.top} y2={frame.bottom} stroke={axisStroke} strokeWidth="2.2" />
        <text x={frame.right + 8} y={frame.bottom - 10} fill={vizTheme.labelText} className="text-sm font-black">x</text>
        <text x={frame.left + 14} y={frame.top + 14} fill={vizTheme.labelText} className="text-sm font-black">y</text>
      </g>
    );
  }

  if (templateId === "calculus-rate-area") {
    const frame = calculusFrame;
    const xTicks = [-4, -2, 0, 2, 4];
    const yTicks = [0, 2, 4, 6, 8];
    const mapFrameX = (tick: number) => frame.originX + tick * frame.xScale;
    const mapFrameY = (tick: number) => frame.bottom - (tick / frame.yMax) * (frame.bottom - frame.top);

    return (
      <g aria-hidden="true" pointerEvents="none">
        {xTicks.map((tick) => (
          <g key={`calculus-x-${tick}`}>
            <line x1={mapFrameX(tick)} x2={mapFrameX(tick)} y1={frame.top} y2={frame.bottom} stroke={tick === 0 ? axisStroke : gridStroke} strokeWidth={tick === 0 ? 2.2 : 1} />
            <text x={mapFrameX(tick)} y={frame.bottom - 8} textAnchor="middle" fill={tickFill} className="text-[10px] font-bold">{tick}</text>
          </g>
        ))}
        {yTicks.map((tick) => (
          <g key={`calculus-y-${tick}`}>
            <line x1={frame.left} x2={frame.right} y1={mapFrameY(tick)} y2={mapFrameY(tick)} stroke={tick === 0 ? axisStroke : gridStroke} strokeWidth={tick === 0 ? 2.2 : 1} />
            <text x={frame.left + 10} y={mapFrameY(tick) - 4} fill={tickFill} className="text-[10px] font-bold">{tick}</text>
          </g>
        ))}
        <line x1={frame.left} x2={frame.left} y1={frame.top} y2={frame.bottom} stroke={axisStroke} strokeWidth="2.2" />
        <text x={frame.right + 8} y={frame.bottom - 10} fill={vizTheme.labelText} className="text-sm font-black">x</text>
        <text x={frame.left + 14} y={frame.top + 14} fill={vizTheme.labelText} className="text-sm font-black">y</text>
      </g>
    );
  }

  return null;
}

function TemplateMarks({
  accent,
  comparison,
  gradeBand,
  mode,
  statisticsSummaryLabels,
  templateId,
  userPoints,
  vizTheme,
  value
}: {
  accent: string;
  comparison: number;
  gradeBand: VisualizationGradeBand;
  mode: number;
  statisticsSummaryLabels: { mean: string; spread: string };
  templateId: VisualizationTemplateId;
  userPoints?: Array<{ x: number; y: number }>;
  vizTheme: VisualizationTheme;
  value: number;
}) {
  const secondary = "#f472b6";
  const gold = "#facc15";
  const soft = vizTheme.softFill;
  const surfaceId = useId().replace(/:/g, "");
  const [modelPointHovered, setModelPointHovered] = useState(false);

  if (templateId === "number-line") {
    const state = numberLineState(value, comparison, mode);
    const startX = state.axis.left + state.startValue * state.scale;
    const endX = state.axis.left + state.endValue * state.scale;
    const arcLift = mode === 2 ? 112 : 90;

    return (
      <>
        <line data-viz-mark data-viz-name="number line" x1={state.axis.left} x2={state.axis.right} y1={state.axis.y} y2={state.axis.y} stroke={vizTheme.axisStrong} strokeWidth="6" strokeLinecap="round" opacity="0.72" />
        {state.tickValues.map((tick) => {
          const x = state.axis.left + tick * state.scale;
          return (
            <g key={tick}>
              <line data-viz-mark data-viz-name="tick" data-viz-tick-value={formatNumber(tick, 0)} data-viz-axis-left={state.axis.left} data-viz-axis-y={state.axis.y} data-viz-scale={formatNumber(state.scale, 6)} x1={x} x2={x} y1="174" y2="206" stroke={vizTheme.axis} strokeWidth="2.5" opacity="0.75" />
              <text x={x} y="226" textAnchor="middle" fill={vizTheme.tickText} className="text-[10px] font-bold">{tick}</text>
            </g>
          );
        })}
        <path
          data-viz-mark
          data-viz-name="number line jump"
          data-viz-start={formatNumber(state.startValue, 0)}
          data-viz-end={formatNumber(state.endValue, 0)}
          data-viz-step={formatNumber(state.stepValue, 0)}
          data-viz-zero-step={String(state.zeroStep)}
          d={`M ${startX} 152 C ${(startX + endX) / 2} ${arcLift} ${(startX + endX) / 2} ${arcLift} ${endX} 152`}
          fill="none"
          stroke={accent}
          strokeWidth="8"
          strokeLinecap="round"
        />
        {state.zeroStep ? (
          <circle
            data-viz-mark
            data-viz-name="zero step marker"
            data-viz-start={formatNumber(state.startValue, 0)}
            data-viz-end={formatNumber(state.endValue, 0)}
            data-viz-step={formatNumber(state.stepValue, 0)}
            data-viz-zero-step="true"
            cx={startX}
            cy="152"
            r="18"
            fill="none"
            stroke={accent}
            strokeDasharray="5 5"
            strokeWidth="5"
          />
        ) : null}
        <circle data-viz-mark data-viz-name="start point" data-viz-value={formatNumber(state.startValue, 0)} data-viz-scale={formatNumber(state.scale, 6)} data-viz-axis-left={state.axis.left} data-viz-zero-start={String(state.zeroStart)} data-viz-zero-step={String(state.zeroStep)} cx={startX} cy={state.axis.y} r="16" fill={secondary} stroke={vizTheme.pointStroke} strokeWidth="4" />
        <circle data-viz-mark data-viz-name="end point" data-viz-value={formatNumber(state.endValue, 0)} data-viz-scale={formatNumber(state.scale, 6)} data-viz-axis-left={state.axis.left} data-viz-zero-end={String(state.zeroEnd)} data-viz-zero-step={String(state.zeroStep)} cx={endX} cy={state.axis.y} r="16" fill={gold} stroke={vizTheme.pointStroke} strokeWidth="4" />
        <text x="86" y="286" fill={vizTheme.labelText} className="text-xs font-black">
          {`${formatNumber(state.startValue, 0)} -> ${formatNumber(state.endValue, 0)}; step = ${formatNumber(state.stepValue, 0)}`}
        </text>
      </>
    );
  }

  if (templateId === "base-ten") {
    const state = baseTenState(value, comparison);
    return (
      <g data-viz-active-mode={mode}>
        {Array.from({ length: state.tens }, (_, index) => (
          <rect key={index} data-viz-mark data-viz-name="ten rod" data-viz-ten-index={index + 1} data-viz-place="tens" data-viz-value="10" data-viz-tens={state.tens} data-viz-ones={state.ones} data-viz-total={state.total} x="96" y={74 + index * 22} width="158" height="16" rx="7" fill={index % 2 ? secondary : accent} opacity={mode === 1 ? "0.35" : "0.82"} stroke={mode === 0 ? gold : undefined} strokeWidth={mode === 0 ? 3 : undefined} />
        ))}
        {Array.from({ length: state.ones }, (_, index) => (
          <rect key={index} data-viz-mark data-viz-name="one unit" data-viz-one-index={index + 1} data-viz-place="ones" data-viz-value="1" data-viz-tens={state.tens} data-viz-ones={state.ones} data-viz-total={state.total} x={356 + (index % 3) * 42} y={92 + Math.floor(index / 3) * 42} width="28" height="28" rx="8" fill={gold} opacity={mode === 0 ? "0.35" : "0.9"} stroke={mode === 1 ? vizTheme.pointStroke : undefined} strokeWidth={mode === 1 ? 3 : undefined} />
        ))}
        <rect data-viz-mark data-viz-name="place value total" data-viz-tens={state.tens} data-viz-ones={state.ones} data-viz-total={state.total} data-viz-zero-tens={String(state.zeroTens)} data-viz-zero-ones={String(state.zeroOnes)} data-viz-zero-total={String(state.zeroTotal)} x="84" y="266" width="472" height="34" rx="13" fill={soft} stroke={mode === 2 ? gold : vizTheme.neutralStroke} strokeWidth={mode === 2 ? 5 : 3} />
        {/* data-viz-overlap-ok: the summary sentence sits inside its own pill. */}
        <text data-viz-overlap-ok x="104" y="288" fill={vizTheme.labelText} className="text-xs font-black">
          {state.tens} tens + {state.ones} ones = {state.total}
        </text>
      </g>
    );
  }

  if (templateId === "array-area") {
    const state = arrayAreaState(value, comparison);
    const gridLeft = arrayAreaLayout.originX;
    const gridTop = arrayAreaLayout.originY;
    const gridRight = state.columns > 0
      ? gridLeft + (state.columns - 1) * arrayAreaLayout.columnGap + arrayAreaLayout.cellWidth
      : gridLeft;
    const gridBottom = state.rows > 0
      ? gridTop + (state.rows - 1) * arrayAreaLayout.rowGap + arrayAreaLayout.cellHeight
      : gridTop;
    const highlightWidth = Math.max(arrayAreaLayout.cellWidth, gridRight - gridLeft);
    const highlightHeight = Math.max(arrayAreaLayout.cellHeight, gridBottom - gridTop);
    const arraySummaryX = gridLeft + highlightWidth / 2;
    return (
      <g data-viz-active-mode={mode}>
        {mode === 2 && !state.zeroArea ? (
          <rect
            data-viz-mark
            data-viz-name="array area highlight"
            data-viz-active-mode={mode}
            data-viz-area={state.area}
            x={gridLeft - 4}
            y={gridTop - 4}
            width={highlightWidth + 8}
            height={highlightHeight + 8}
            rx="16"
            fill={gold}
            opacity="0.18"
          />
        ) : null}
        {Array.from({ length: state.rows * state.columns }, (_, index) => (
          <rect
            key={index}
            data-viz-mark
            data-viz-name="array cell"
            data-viz-row={Math.floor(index / state.columns) + 1}
            data-viz-column={(index % state.columns) + 1}
            data-viz-rows={state.rows}
            data-viz-columns={state.columns}
            data-viz-cell-width={arrayAreaLayout.cellWidth}
            data-viz-cell-height={arrayAreaLayout.cellHeight}
            x={arrayAreaLayout.originX + (index % state.columns) * arrayAreaLayout.columnGap}
            y={arrayAreaLayout.originY + Math.floor(index / state.columns) * arrayAreaLayout.rowGap}
            width={arrayAreaLayout.cellWidth}
            height={arrayAreaLayout.cellHeight}
            rx="6"
            fill={(index + mode) % 2 ? "rgba(244,114,182,.72)" : "rgba(34,211,238,.78)"}
            stroke={vizTheme.panelStroke}
          />
        ))}
        {mode === 0 && state.rows > 0 ? (
          <rect
            data-viz-mark
            data-viz-name="array row guide"
            data-viz-active-mode={mode}
            data-viz-rows={state.rows}
            x={gridLeft - 12}
            y={gridTop - 6}
            width={highlightWidth + 24}
            height={arrayAreaLayout.cellHeight + 12}
            rx="12"
            fill="none"
            stroke={accent}
            strokeWidth="5"
            strokeDasharray="10 8"
          />
        ) : null}
        {mode === 1 && state.columns > 0 ? (
          <rect
            data-viz-mark
            data-viz-name="array column guide"
            data-viz-active-mode={mode}
            data-viz-columns={state.columns}
            x={gridLeft - 6}
            y={gridTop - 12}
            width={arrayAreaLayout.cellWidth + 12}
            height={highlightHeight + 24}
            rx="12"
            fill="none"
            stroke={secondary}
            strokeWidth="5"
            strokeDasharray="8 7"
          />
        ) : null}
        <rect
          data-viz-mark
          data-viz-name="area outline"
          data-viz-title-clearance-y={arrayAreaLayout.titleClearanceY}
          data-viz-columns={state.columns}
          data-viz-rows={state.rows}
          data-viz-area={state.area}
          data-viz-zero-columns={String(state.zeroColumns)}
          data-viz-zero-rows={String(state.zeroRows)}
          data-viz-zero-area={String(state.zeroArea)}
          data-viz-outline-width={formatNumber(state.outlineWidth, 0)}
          data-viz-outline-height={formatNumber(state.outlineHeight, 0)}
          x={arrayAreaLayout.originX - arrayAreaLayout.outlinePadding}
          y={arrayAreaLayout.originY - arrayAreaLayout.outlinePadding}
          width={state.outlineWidth}
          height={state.outlineHeight}
          rx={state.zeroArea ? 0 : 18}
          fill="none"
          stroke={gold}
          strokeWidth="5"
        />
        {state.zeroArea ? (
          <rect
            data-viz-mark
            data-viz-name="zero area marker"
            data-viz-columns={state.columns}
            data-viz-rows={state.rows}
            data-viz-area={state.area}
            data-viz-zero-columns={String(state.zeroColumns)}
            data-viz-zero-rows={String(state.zeroRows)}
            data-viz-zero-area="true"
            x={arrayAreaLayout.originX - arrayAreaLayout.outlinePadding}
            y={arrayAreaLayout.originY - 14}
            width="54"
            height="8"
            rx="4"
            fill={gold}
            opacity="0.86"
          />
        ) : null}
        <text x={arraySummaryX} y={arrayAreaLayout.summaryY} textAnchor="middle" fill={vizTheme.labelText} className="text-xs font-black">
          {state.columns} x {state.rows} = {state.area}
        </text>
      </g>
    );
  }

  if (templateId === "fraction-bar") {
    const state = fractionState(value, comparison);
    const partWidth = 472 / state.denominator;
    const equivalentPartWidth = 472 / state.equivalentDenominator;
    const fractionBarClipId = `${surfaceId}-fraction-bar-clip`;
    const equivalentFractionBarClipId = `${surfaceId}-equivalent-fraction-bar-clip`;
    return (
      <>
        <defs>
          <clipPath id={fractionBarClipId}>
            <rect x="84" y="104" width="472" height="64" rx="18" />
          </clipPath>
          <clipPath id={equivalentFractionBarClipId}>
            <rect x="84" y="218" width="472" height="42" rx="14" />
          </clipPath>
        </defs>
        <rect data-viz-mark data-viz-name="whole bar" data-viz-numerator={state.numerator} data-viz-denominator={state.denominator} data-viz-value={formatNumber(state.value, 3)} data-viz-zero-fraction={String(state.zeroFraction)} x="84" y="104" width="472" height="64" rx="18" fill={soft} stroke={vizTheme.neutralStroke} strokeWidth="4" />
        {Array.from({ length: state.denominator }, (_, index) => (
          <rect
            key={index}
            data-viz-mark
            data-viz-name="fraction part"
            data-viz-index={index + 1}
            data-viz-numerator={state.numerator}
            data-viz-denominator={state.denominator}
            data-viz-zero-fraction={String(state.zeroFraction)}
            data-viz-shaded={String(index < state.numerator)}
            data-viz-part-width={formatNumber(partWidth, 6)}
            x={84 + partWidth * index}
            y="104"
            width={partWidth}
            height="64"
            fill={index < state.numerator ? (index % 2 ? secondary : accent) : "transparent"}
            opacity={mode === 1 ? "0.3" : "0.84"}
            clipPath={`url(#${fractionBarClipId})`}
          />
        ))}
        {Array.from({ length: state.denominator - 1 }, (_, index) => (
          <line key={index} data-viz-mark data-viz-name="partition" x1={84 + partWidth * (index + 1)} x2={84 + partWidth * (index + 1)} y1="104" y2="168" stroke={vizTheme.neutralStroke} strokeWidth="3" opacity="0.75" />
        ))}
        <rect data-viz-mark data-viz-name="equivalent bar" data-viz-numerator={state.equivalentNumerator} data-viz-denominator={state.equivalentDenominator} data-viz-zero-fraction={String(state.zeroFraction)} x="84" y="218" width="472" height="42" rx="14" fill={soft} stroke={vizTheme.neutralStroke} strokeWidth="3" />
        {Array.from({ length: state.equivalentDenominator }, (_, index) => (
          <rect
            key={index}
            data-viz-mark
            data-viz-name="equivalent fraction part"
            data-viz-index={index + 1}
            data-viz-numerator={state.equivalentNumerator}
            data-viz-denominator={state.equivalentDenominator}
            data-viz-zero-fraction={String(state.zeroFraction)}
            data-viz-shaded={String(index < state.equivalentNumerator)}
            data-viz-part-width={formatNumber(equivalentPartWidth, 6)}
            x={84 + equivalentPartWidth * index}
            y="218"
            width={equivalentPartWidth}
            height="42"
            fill={index < state.equivalentNumerator ? gold : "transparent"}
            opacity={mode === 0 ? "0.3" : "0.78"}
            clipPath={`url(#${equivalentFractionBarClipId})`}
          />
        ))}
        <text x="86" y="192" fill={mode === 2 ? (vizTheme.mode === "day" ? "#b45309" : "#fde68a") : vizTheme.labelText} className={mode === 2 ? "text-sm font-black" : "text-xs font-black"}>
          {state.numerator}/{state.denominator} = {state.equivalentNumerator}/{state.equivalentDenominator}
        </text>
      </>
    );
  }

  if (templateId === "clock-money-data") {
    const state = clockMoneyState(value, comparison);
    const clockOpacity = mode === 0 ? 1 : 0.34;
    const moneyOpacity = mode === 1 ? 1 : 0.28;
    const dataOpacity = mode === 2 ? 1 : 0.34;
    const coinCount = clamp(Math.round(state.moneyTotal / 10), 1, 12);
    return (
      <g data-viz-active-mode={mode}>
        <g data-viz-model="clock" opacity={clockOpacity}>
          <circle data-viz-mark data-viz-name="clock" data-viz-active-mode={mode} data-viz-hour={state.hour} data-viz-minute={state.minute} data-viz-minute-step={state.minuteStep} cx="154" cy="142" r="62" fill={soft} stroke={mode === 0 ? accent : vizTheme.neutralStroke} strokeWidth={mode === 0 ? 7 : 5} />
          {Array.from({ length: 12 }, (_, index) => {
            const angle = (index / 12) * Math.PI * 2 - Math.PI / 2;
            const outer = { x: 154 + Math.cos(angle) * 54, y: 142 + Math.sin(angle) * 54 };
            const inner = { x: 154 + Math.cos(angle) * 48, y: 142 + Math.sin(angle) * 48 };
            return <line key={index} data-viz-mark data-viz-name="clock tick" x1={inner.x} x2={outer.x} y1={inner.y} y2={outer.y} stroke={vizTheme.neutralStroke} strokeWidth="2" />;
          })}
          <line
            data-viz-mark
            data-viz-name="hour hand"
            data-viz-hour={state.hour}
            data-viz-minute={state.minute}
            data-viz-minute-step={state.minuteStep}
            data-viz-hour-angle-degrees={formatNumber(state.hourAngle, 1)}
            data-viz-hand-length="38"
            x1="154"
            x2={state.hourEnd.x}
            y1="142"
            y2={state.hourEnd.y}
            stroke={accent}
            strokeWidth="8"
            strokeLinecap="round"
          />
          <line
            data-viz-mark
            data-viz-name="minute hand"
            data-viz-minute={state.minute}
            data-viz-minute-step={state.minuteStep}
            data-viz-minute-angle-degrees={formatNumber(state.minuteAngle, 1)}
            data-viz-hand-length="52"
            x1="154"
            x2={state.minuteEnd.x}
            y1="142"
            y2={state.minuteEnd.y}
            stroke={gold}
            strokeWidth="7"
            strokeLinecap="round"
          />
          <circle data-viz-mark data-viz-name="clock center" cx="154" cy="142" r="7" fill={vizTheme.pointStroke} />
        </g>
        <g data-viz-model="money" opacity={moneyOpacity}>
          <rect data-viz-mark data-viz-name="money tray" data-viz-active-mode={mode} x="286" y="76" width="248" height="72" rx="18" fill={soft} stroke={mode === 1 ? gold : vizTheme.neutralStroke} strokeWidth={mode === 1 ? 5 : 3} />
          {Array.from({ length: coinCount }, (_, index) => (
            <circle
              key={`coin-${index}`}
              data-viz-mark
              data-viz-name="money coin"
              data-viz-active-mode={mode}
              data-viz-coin-index={index + 1}
              data-viz-money-total={state.moneyTotal}
              cx={310 + (index % 6) * 36}
              cy={98 + Math.floor(index / 6) * 30}
              r="12"
              fill={gold}
              stroke={vizTheme.pointStroke}
              strokeWidth="3"
            />
          ))}
          <text x="302" y="138" fill={vizTheme.labelText} className="text-xs font-black">value = {state.moneyTotal}</text>
        </g>
        <g data-viz-model="data" opacity={dataOpacity}>
          {bars(value, comparison).map((bar, index) => (
            <rect
              key={index}
              data-viz-mark
              data-viz-name="data bar"
              data-viz-active-mode={mode}
              data-viz-index={index + 1}
              data-viz-value={index % 2 === 0 ? value : comparison}
              data-viz-height={bar}
              x={302 + index * 42}
              y={260 - bar}
              width="28"
              height={bar}
              rx="9"
              fill={index % 2 ? secondary : accent}
              stroke={mode === 2 ? vizTheme.pointStroke : undefined}
              strokeWidth={mode === 2 ? 2 : undefined}
            />
          ))}
        </g>
        <text x="82" y="286" fill={vizTheme.labelText} className="text-xs font-black">
          {state.hour}:{String(state.minute).padStart(2, "0")} | value = {state.moneyTotal}
        </text>
      </g>
    );
  }

  if (templateId === "measurement-scale") {
    const state = measurementState(value, comparison);
    const modeGuide = mode === 1
      ? {
          end: 92 + state.objectBWidth,
          label: `B = ${state.objectBUnits} cm`,
          start: 92,
          y: 122
        }
      : mode === 2
        ? {
            end: 92 + Math.max(state.objectAWidth, state.objectBWidth),
            label: `diff = ${state.difference} cm`,
            start: 92 + Math.min(state.objectAWidth, state.objectBWidth),
            y: 196
          }
        : {
            end: 92 + state.objectAWidth,
            label: `A = ${state.objectAUnits} cm`,
            start: 92,
            y: 184
          };
    return (
      <g data-viz-active-mode={mode}>
        <rect data-viz-mark data-viz-name="ruler" data-viz-unit-scale={state.unitScale} data-viz-origin-x="96" data-viz-min-cm="0" data-viz-max-cm="11" x="74" y="220" width="492" height="44" rx="14" fill={soft} stroke={vizTheme.neutralStroke} strokeWidth="4" />
        <g data-viz-overlap-ok>
        {Array.from({ length: 12 }, (_, index) => (
          <g key={index}>
            <line data-viz-mark data-viz-name="ruler tick" data-viz-tick-index={index + 1} data-viz-cm-value={index} data-viz-origin-x="96" data-viz-unit-scale={state.unitScale} x1={96 + index * 38} x2={96 + index * 38} y1="220" y2={index % 2 ? 240 : 249} stroke={vizTheme.neutralStroke} strokeWidth="2.5" opacity="0.75" />
            <text data-viz-mark data-viz-name="ruler unit label" data-viz-cm-value={index} x={96 + index * 38} y="259" textAnchor="middle" fill={vizTheme.tickText} className="text-[9px] font-black">{index} cm</text>
          </g>
        ))}
        </g>
        <rect data-viz-mark data-viz-name="measure object a" data-viz-active-mode={mode} data-viz-units={state.objectAUnits} data-viz-unit-scale={state.unitScale} data-viz-width={state.objectAWidth} data-viz-zero-object-a={String(state.zeroObjectA)} data-viz-zero-object-b={String(state.zeroObjectB)} x="92" y="132" width={state.objectAWidth} height="42" rx={state.zeroObjectA ? 0 : 13} fill={accent} opacity={mode === 1 ? "0.42" : "0.86"} stroke={mode === 0 ? gold : undefined} strokeWidth={mode === 0 ? 4 : undefined} />
        {state.zeroObjectA ? (
          <line data-viz-mark data-viz-name="measure object a zero marker" data-viz-units="0" data-viz-zero-object-a="true" x1="92" x2="92" y1="126" y2="180" stroke={accent} strokeWidth="5" strokeLinecap="round" />
        ) : null}
        <rect data-viz-mark data-viz-name="measure object b" data-viz-active-mode={mode} data-viz-units={state.objectBUnits} data-viz-unit-scale={state.unitScale} data-viz-width={state.objectBWidth} data-viz-zero-object-a={String(state.zeroObjectA)} data-viz-zero-object-b={String(state.zeroObjectB)} x="92" y="76" width={state.objectBWidth} height="34" rx={state.zeroObjectB ? 0 : 11} fill={secondary} opacity={mode === 0 ? "0.42" : "0.78"} stroke={mode === 1 ? gold : undefined} strokeWidth={mode === 1 ? 4 : undefined} />
        {state.zeroObjectB ? (
          <line data-viz-mark data-viz-name="measure object b zero marker" data-viz-units="0" data-viz-zero-object-b="true" x1="92" x2="92" y1="70" y2="116" stroke={secondary} strokeWidth="5" strokeLinecap="round" />
        ) : null}
        <line
          data-viz-mark
          data-viz-name="measurement mode guide"
          data-viz-active-mode={mode}
          data-viz-start={formatNumber(modeGuide.start, 1)}
          data-viz-end={formatNumber(modeGuide.end, 1)}
          x1={modeGuide.start}
          x2={modeGuide.end}
          y1={modeGuide.y}
          y2={modeGuide.y}
          stroke={gold}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={mode === 2 ? "8 7" : undefined}
        />
        <text x={Math.min(500, modeGuide.end + 12)} y={modeGuide.y + 4} textAnchor="start" fill={vizTheme.labelText} className="text-xs font-black">
          {modeGuide.label}
        </text>
        <text x="82" y="292" fill={vizTheme.labelText} className="text-xs font-black">
          A = {state.objectAUnits} cm, B = {state.objectBUnits} cm, diff = {state.difference} cm
        </text>
      </g>
    );
  }

  if (templateId === "angle-geometry" && gradeBand === "early-primary") {
    // K-P2 geometry lessons are about shape attributes (sides and corners),
    // not degree measurement: render a countable polygon instead of angle rays.
    const sides = clamp(Math.round(value), 3, 8);
    // Max radius 98 keeps the top vertex below the title badge band (y <= 92)
    // and the bottom vertex inside the panel.
    const size = 48 + clamp(Math.round(comparison), 0, 10) * 5;
    const center = { x: 320, y: 196 };
    const vertices = Array.from({ length: sides }, (_, index) => {
      const angle = (index / sides) * Math.PI * 2 - Math.PI / 2;
      return { x: center.x + Math.cos(angle) * size, y: center.y + Math.sin(angle) * size };
    });
    const polygonPoints = vertices.map((point) => `${formatNumber(point.x, 1)},${formatNumber(point.y, 1)}`).join(" ");
    const shapeNames: Record<number, string> = {
      3: "triangle",
      4: "quadrilateral",
      5: "pentagon",
      6: "hexagon",
      7: "heptagon",
      8: "octagon"
    };

    return (
      <g data-viz-active-mode={mode}>
        <polygon
          data-viz-mark
          data-viz-name="shape outline"
          data-viz-sides={sides}
          data-viz-corners={sides}
          data-viz-size={size}
          points={polygonPoints}
          fill={soft}
          stroke={vizTheme.neutralStroke}
          strokeWidth="4"
        />
        {vertices.map((point, index) => {
          const next = vertices[(index + 1) % sides];
          return (
            <line
              key={`shape-side-${index}`}
              data-viz-mark
              data-viz-name="shape side"
              data-viz-side-index={index + 1}
              data-viz-sides={sides}
              x1={point.x}
              x2={next.x}
              y1={point.y}
              y2={next.y}
              stroke={accent}
              strokeWidth={mode === 1 ? 9 : 6}
              strokeLinecap="round"
              opacity={mode === 2 ? 0.45 : 0.95}
            />
          );
        })}
        {vertices.map((point, index) => (
          <circle
            key={`shape-corner-${index}`}
            data-viz-mark
            data-viz-name="shape corner"
            data-viz-corner-index={index + 1}
            data-viz-corners={sides}
            cx={point.x}
            cy={point.y}
            r={mode === 2 ? 11 : 7}
            fill={gold}
            stroke={vizTheme.pointStroke}
            strokeWidth="3"
            opacity={mode === 1 ? 0.45 : 1}
          />
        ))}
        <text data-viz-mark data-viz-name="shape name label" data-viz-sides={sides} x={center.x} y={center.y + 6} textAnchor="middle" fill={vizTheme.labelText} className="text-sm font-black">
          {shapeNames[sides]}
        </text>
        <text x="82" y={angleGeometryLayout.summaryY} fill={vizTheme.labelText} className="text-xs font-black">
          {sides} sides + {sides} corners = {shapeNames[sides]}
        </text>
      </g>
    );
  }

  if (templateId === "angle-geometry") {
    const state = angleGeometryState(value, comparison);
    const origin = angleGeometryLayout.origin;
    const angleA = state.angleA * (Math.PI / 180);
    const angleB = state.angleB * (Math.PI / 180);
    const pointOnRay = (angle: number, radius: number) => ({
      x: origin.x + Math.cos(angle) * radius,
      y: origin.y - Math.sin(angle) * radius
    });
    const rayA = pointOnRay(angleA, angleGeometryLayout.rayRadius);
    const rayB = pointOnRay(angleB, angleGeometryLayout.rayRadius);
    const arcA = angleArcPath(origin, state.angleA, 62);
    const arcB = angleArcPath(origin, state.angleB, 82);
    const modelAOpacity = mode === 1 ? 0.32 : 1;
    const modelBOpacity = mode === 0 ? 0.32 : 1;
    const equalAngleComparison = state.difference === 0 && mode === 2;
    const angleLabels = angleGeometryLabelPositions(rayA, rayB);
    const combinedAngleLabel = {
      x: (angleLabels.labelA.x + angleLabels.labelB.x) / 2,
      y: clamp(Math.min(angleLabels.labelA.y, angleLabels.labelB.y) - 2, 100, 292)
    };

    return (
      <>
        <line data-viz-mark data-viz-name="base ray" x1={origin.x} x2="486" y1={origin.y} y2={origin.y} stroke={vizTheme.axisStrong} strokeWidth="8" strokeLinecap="round" />
        <path data-viz-mark data-viz-name="angle b arc" data-viz-angle-degrees={formatNumber(state.angleB, 0)} data-viz-large-arc={arcB.largeArcFlag} data-viz-difference-degrees={formatNumber(state.difference, 0)} d={arcB.d} fill="none" stroke={secondary} strokeWidth="6" strokeLinecap="round" opacity={modelBOpacity} />
        <line data-viz-mark data-viz-name="angle b ray" data-viz-angle-degrees={formatNumber(state.angleB, 0)} data-viz-origin-x={origin.x} data-viz-origin-y={origin.y} data-viz-radius={angleGeometryLayout.rayRadius} x1={origin.x} x2={rayB.x} y1={origin.y} y2={rayB.y} stroke={secondary} strokeWidth={mode === 1 ? 9 : 6} strokeLinecap="round" opacity={modelBOpacity} strokeDasharray={mode === 0 ? "10 9" : undefined} />
        <path data-viz-mark data-viz-name="angle a arc" data-viz-angle-degrees={formatNumber(state.angleA, 0)} data-viz-large-arc={arcA.largeArcFlag} data-viz-difference-degrees={formatNumber(state.difference, 0)} d={arcA.d} fill="none" stroke={accent} strokeWidth="7" strokeLinecap="round" opacity={modelAOpacity} />
        <line data-viz-mark data-viz-name="angle a ray" data-viz-angle-degrees={formatNumber(state.angleA, 0)} data-viz-origin-x={origin.x} data-viz-origin-y={origin.y} data-viz-radius={angleGeometryLayout.rayRadius} x1={origin.x} x2={rayA.x} y1={origin.y} y2={rayA.y} stroke={accent} strokeWidth={mode === 0 ? 9 : 7} strokeLinecap="round" opacity={modelAOpacity} strokeDasharray={mode === 1 ? "10 9" : undefined} />
        {equalAngleComparison ? (
          <text
            data-viz-mark
            data-viz-overlap-ok
            data-viz-name="combined equal angle label"
            data-viz-label-x={formatNumber(combinedAngleLabel.x, 2)}
            data-viz-label-y={formatNumber(combinedAngleLabel.y, 2)}
            x={combinedAngleLabel.x}
            y={combinedAngleLabel.y}
            fill={vizTheme.labelText}
            className="text-xs font-black"
          >
            A&B
          </text>
        ) : (
          <>
            <text
              data-viz-mark
              data-viz-overlap-ok
              data-viz-name="angle a label"
              data-viz-label-x={formatNumber(angleLabels.labelA.x, 2)}
              data-viz-label-y={formatNumber(angleLabels.labelA.y, 2)}
              x={angleLabels.labelA.x}
              y={angleLabels.labelA.y}
              fill={vizTheme.labelText}
              className="text-xs font-black"
              opacity={modelAOpacity}
            >
              A
            </text>
            <text
              data-viz-mark
              data-viz-overlap-ok
              data-viz-name="angle b label"
              data-viz-label-x={formatNumber(angleLabels.labelB.x, 2)}
              data-viz-label-y={formatNumber(angleLabels.labelB.y, 2)}
              x={angleLabels.labelB.x}
              y={angleLabels.labelB.y}
              fill={vizTheme.mode === "day" ? "#be185d" : "#fce7f3"}
              className="text-xs font-black"
              opacity={modelBOpacity}
            >
              B
            </text>
          </>
        )}
        <polygon data-viz-mark data-viz-name="shape" points="410,92 506,132 472,214 368,198 344,124" fill={soft} stroke={gold} strokeWidth="5" />
        <text data-viz-mark data-viz-name="angle summary label" x="82" y={angleGeometryLayout.summaryY} fill={vizTheme.labelText} className="text-xs font-black">
          A = {formatNumber(state.angleA, 0)} deg, B = {formatNumber(state.angleB, 0)} deg
        </text>
      </>
    );
  }

  if (templateId === "right-triangle-pythagorean") {
    const state = rightTriangleState(value, comparison);
    const trianglePoints = state.points([state.pointA, state.pointB, state.pointC]);
    const legASquarePoints = state.points([
      state.pointA,
      state.pointB,
      { x: state.pointB.x, y: state.pointB.y + state.legA * state.scale },
      { x: state.pointA.x, y: state.pointA.y + state.legA * state.scale }
    ]);
    const legBSquarePoints = state.points([
      state.pointA,
      state.pointC,
      { x: state.pointC.x - state.legB * state.scale, y: state.pointC.y },
      { x: state.pointA.x - state.legB * state.scale, y: state.pointA.y }
    ]);
    const hypotenuseSquarePoints = state.points([state.pointB, state.pointD, state.pointE, state.pointC]);
    const similarTrianglePoints = state.points([state.similarOrigin, state.similarPointB, state.similarPointC]);
    const hypotenuseSquareLabel = {
      x: (state.pointB.x + state.pointC.x + state.pointD.x + state.pointE.x) / 4,
      y: (state.pointB.y + state.pointC.y + state.pointD.y + state.pointE.y) / 4
    };

    return (
      <>
        <polygon data-viz-mark data-viz-name="leg a square" data-viz-leg-a={state.legA} data-viz-leg-a-squared={state.legASquared} data-viz-scale={state.scale} points={legASquarePoints} fill={accent} opacity={mode === 0 ? "0.38" : "0.14"} stroke={accent} strokeWidth="4" />
        <polygon data-viz-mark data-viz-name="leg b square" data-viz-leg-b={state.legB} data-viz-leg-b-squared={state.legBSquared} data-viz-scale={state.scale} points={legBSquarePoints} fill={secondary} opacity={mode === 0 ? "0.38" : "0.14"} stroke={secondary} strokeWidth="4" />
        <polygon data-viz-mark data-viz-name="hypotenuse square" data-viz-leg-a-squared={state.legASquared} data-viz-leg-b-squared={state.legBSquared} data-viz-hypotenuse-squared={state.hypotenuseSquared} data-viz-scale={state.scale} points={hypotenuseSquarePoints} fill={gold} opacity={mode === 0 ? "0.38" : "0.14"} stroke={gold} strokeWidth="4" />
        <polygon data-viz-mark data-viz-name="right triangle" data-viz-leg-a={state.legA} data-viz-leg-b={state.legB} data-viz-hypotenuse={formatNumber(state.hypotenuse, 3)} data-viz-hypotenuse-squared={state.hypotenuseSquared} data-viz-pythagorean-check={`${state.legASquared} + ${state.legBSquared} = ${state.hypotenuseSquared}`} points={trianglePoints} fill={soft} stroke={vizTheme.axisStrong} strokeWidth="6" />
        <line data-viz-mark data-viz-name="leg a" data-viz-length={state.legA} x1={state.pointA.x} x2={state.pointB.x} y1={state.pointA.y} y2={state.pointB.y} stroke={accent} strokeWidth="8" strokeLinecap="round" />
        <line data-viz-mark data-viz-name="leg b" data-viz-length={state.legB} x1={state.pointA.x} x2={state.pointC.x} y1={state.pointA.y} y2={state.pointC.y} stroke={secondary} strokeWidth="8" strokeLinecap="round" />
        <line data-viz-mark data-viz-name="hypotenuse" data-viz-length={formatNumber(state.hypotenuse, 3)} data-viz-hypotenuse-squared={state.hypotenuseSquared} x1={state.pointB.x} x2={state.pointC.x} y1={state.pointB.y} y2={state.pointC.y} stroke={gold} strokeWidth="8" strokeLinecap="round" />
        <path data-viz-mark data-viz-name="right angle marker" data-viz-angle-degrees="90" d={`M ${state.pointA.x + 18} ${state.pointA.y} L ${state.pointA.x + 18} ${state.pointA.y - 18} L ${state.pointA.x} ${state.pointA.y - 18}`} fill="none" stroke={mode === 1 ? gold : vizTheme.labelText} strokeWidth={mode === 1 ? 7 : 4} strokeLinecap="round" strokeLinejoin="round" />
        {mode === 2 ? (
          <polygon data-viz-mark data-viz-name="similar right triangle" data-viz-scale-factor={formatNumber(state.similarScale, 2)} data-viz-leg-a={state.legA} data-viz-leg-b={state.legB} points={similarTrianglePoints} fill="none" stroke={accent} strokeWidth="5" strokeDasharray="10 8" />
        ) : null}
        <text x={state.pointA.x + state.legA * state.scale / 2} y={state.pointA.y + 24} textAnchor="middle" fill={vizTheme.labelText} className="text-xs font-black">a = {state.legA}</text>
        <text x={state.pointA.x - 30} y={state.pointA.y - state.legB * state.scale / 2} textAnchor="middle" fill={vizTheme.labelText} className="text-xs font-black">b = {state.legB}</text>
        <text x={(state.pointB.x + state.pointC.x) / 2 + 14} y={(state.pointB.y + state.pointC.y) / 2 - 8} fill={vizTheme.labelText} className="text-xs font-black">c = {formatNumber(state.hypotenuse, 2)}</text>
        <text data-viz-mark data-viz-name="leg a square area label" x={state.pointA.x + state.legA * state.scale / 2} y={state.pointA.y + state.legA * state.scale / 2 + 4} textAnchor="middle" fill={vizTheme.labelText} className="text-xs font-black" opacity={mode === 0 ? 1 : 0.68}>a^2 = {state.legASquared}</text>
        <text data-viz-mark data-viz-name="leg b square area label" x={state.pointA.x - state.legB * state.scale / 2} y={state.pointA.y - state.legB * state.scale / 2 + 4} textAnchor="middle" fill={vizTheme.labelText} className="text-xs font-black" opacity={mode === 0 ? 1 : 0.68}>b^2 = {state.legBSquared}</text>
        <text data-viz-mark data-viz-name="hypotenuse square area label" x={hypotenuseSquareLabel.x} y={hypotenuseSquareLabel.y + 4} textAnchor="middle" fill={vizTheme.labelText} className="text-xs font-black" opacity={mode === 0 ? 1 : 0.68}>c^2 = {state.hypotenuseSquared}</text>
        <text x="82" y={rightTriangleLayout.summaryY} fill={vizTheme.labelText} className="text-xs font-black">
          {state.legASquared} + {state.legBSquared} = {state.hypotenuseSquared}; c = {formatNumber(state.hypotenuse, 2)}
        </text>
      </>
    );
  }

  if (templateId === "coordinate-transform") {
    const state = coordinateTransformState(value, comparison, mode);
    const sourcePoints = state.sourceSvg.map((point) => `${point.x},${point.y}`).join(" ");
    const transformedPoints = state.transformedSvg.map((point) => `${point.x},${point.y}`).join(" ");
    const transformedLabelPositions = coordinateTransformLabelPositions(state.transformedSvg);
    const sourceLogicalPoints = state.source.map((point) => `${point.label}:${formatNumber(point.x, 3)},${formatNumber(point.y, 3)}`).join(";");
    const transformedLogicalPoints = state.transformed.map((point, index) => `${state.source[index].label}:${formatNumber(point.x, 3)},${formatNumber(point.y, 3)}`).join(";");
    return (
      <>
        <line data-viz-mark data-viz-name="x axis" x1="78" x2="562" y1="200" y2="200" stroke={vizTheme.axisStrong} strokeWidth="4" />
        <line data-viz-mark data-viz-name="y axis" x1="320" x2="320" y1="68" y2="292" stroke={vizTheme.axisStrong} strokeWidth="4" />
        {mode === 1 ? (
          <line data-viz-mark data-viz-name="reflection line" data-viz-transform-mode="reflect-vertical-line" data-viz-reflect-x={formatNumber(state.reflectionLineX, 2)} data-viz-dy={formatNumber(state.dy, 0)} x1={state.origin.x + state.reflectionLineX * state.scale.x} x2={state.origin.x + state.reflectionLineX * state.scale.x} y1="72" y2="288" stroke={gold} strokeWidth="4" strokeLinecap="round" strokeDasharray="8 8" />
        ) : null}
        <polygon data-viz-mark data-viz-name="original triangle" data-viz-logical-points={sourceLogicalPoints} data-viz-source-points={sourceLogicalPoints} data-viz-transform-mode="source" data-viz-origin-x={state.origin.x} data-viz-origin-y={state.origin.y} data-viz-x-scale={formatNumber(state.scale.x, 6)} data-viz-y-scale={formatNumber(state.scale.y, 6)} points={sourcePoints} fill={accent} opacity="0.72" stroke={vizTheme.pointStroke} strokeWidth="4" />
        <polygon
          data-viz-mark
          data-viz-name="transformed triangle"
          data-viz-logical-points={transformedLogicalPoints}
          data-viz-source-points={sourceLogicalPoints}
          data-viz-target-points={transformedLogicalPoints}
          data-viz-transform={mode === 0 ? "translate" : mode === 1 ? "reflect-vertical-line" : "dilate"}
          data-viz-transform-mode={mode === 0 ? "translate" : mode === 1 ? "reflect-vertical-line" : "dilate"}
          data-viz-dx={formatNumber(state.dx, 0)}
          data-viz-dy={formatNumber(state.dy, 0)}
          data-viz-scale={formatNumber(state.dilationScale, 2)}
          data-viz-reflect-x={formatNumber(state.reflectionLineX, 2)}
          points={transformedPoints}
          fill={secondary}
          opacity="0.64"
          stroke={vizTheme.pointStroke}
          strokeWidth="4"
          strokeDasharray={mode === 2 ? "10 8" : undefined}
        />
        {state.transformedSvg.map((point, index) => {
          const labelPosition = transformedLabelPositions[index] ?? { x: point.x + 8, y: point.y - 8 };

          return (
            <text
              key={state.source[index].label}
              data-viz-mark
              data-viz-name="transformed vertex label"
              data-viz-label={state.source[index].label}
              data-viz-label-x={formatNumber(labelPosition.x, 2)}
              data-viz-label-y={formatNumber(labelPosition.y, 2)}
              data-viz-point-x={formatNumber(point.x, 2)}
              data-viz-point-y={formatNumber(point.y, 2)}
              x={labelPosition.x}
              y={labelPosition.y}
              fill={vizTheme.labelText}
              className="text-xs font-black"
            >
            {state.source[index].label}'
            </text>
          );
        })}
        {(userPoints ?? []).map((point, index) => {
          const transformedPoint = mode === 0
            ? { x: point.x + state.dx, y: point.y + state.dy }
            : mode === 1
              ? { x: 2 * state.reflectionLineX - point.x, y: point.y + state.dy }
              : { x: point.x * state.dilationScale, y: point.y * state.dilationScale + state.dy };
          const sourceSvg = { x: state.origin.x + point.x * state.scale.x, y: state.origin.y - point.y * state.scale.y };
          const targetSvg = {
            x: state.origin.x + transformedPoint.x * state.scale.x,
            y: state.origin.y - transformedPoint.y * state.scale.y
          };

          return (
            <g key={`user-point-${index}`}>
              <circle
                data-viz-mark
                data-viz-name="user point"
                data-viz-point-index={index + 1}
                data-viz-x={formatNumber(point.x, 2)}
                data-viz-y={formatNumber(point.y, 2)}
                cx={sourceSvg.x}
                cy={sourceSvg.y}
                r="7"
                fill={accent}
                stroke={vizTheme.pointStroke}
                strokeWidth="3"
              />
              <circle
                data-viz-mark
                data-viz-name="transformed point"
                data-viz-point-index={index + 1}
                data-viz-x={formatNumber(transformedPoint.x, 2)}
                data-viz-y={formatNumber(transformedPoint.y, 2)}
                cx={targetSvg.x}
                cy={targetSvg.y}
                r="7"
                fill={gold}
                stroke={vizTheme.pointStroke}
                strokeWidth="3"
              />
            </g>
          );
        })}
        <text x="82" y="292" fill={vizTheme.labelText} className="text-xs font-black">
          {mode === 0
            ? `T(${state.dx}, ${state.dy})`
            : mode === 1
              ? `reflect x = ${formatNumber(state.reflectionLineX, 1)}, dy = ${state.dy}`
              : `scale = ${formatNumber(state.dilationScale, 2)}, dy = ${state.dy}`}
        </text>
      </>
    );
  }

  if (templateId === "equation-balance") {
    const state = equationBalanceState(value, comparison);
    return (
      <>
        <line data-viz-mark data-viz-name="balance beam" data-viz-left={state.leftValue} data-viz-right={state.rightValue} data-viz-difference={state.difference} data-viz-status={state.status} data-viz-zero-left={String(state.zeroLeft)} data-viz-zero-right={String(state.zeroRight)} data-viz-zero-both={String(state.zeroBoth)} x1="132" x2="508" y1={142 + state.tilt} y2={142 - state.tilt} stroke={mode === 2 ? gold : vizTheme.axisStrong} strokeWidth={mode === 2 ? 9 : 7} strokeLinecap="round" />
        <line data-viz-mark data-viz-name="balance stand" x1="320" x2="320" y1="142" y2="270" stroke={vizTheme.axisStrong} strokeWidth="6" />
        <polygon data-viz-mark data-viz-name="left pan" data-viz-left={state.leftValue} data-viz-zero-left={String(state.zeroLeft)} points="118,160 248,160 216,220 150,220" fill={accent} opacity={mode === 1 ? "0.35" : "0.8"} stroke={mode === 0 ? gold : undefined} strokeWidth={mode === 0 ? 4 : undefined} />
        <polygon data-viz-mark data-viz-name="right pan" data-viz-right={state.rightValue} data-viz-zero-right={String(state.zeroRight)} points="392,160 522,160 490,220 424,220" fill={secondary} opacity={mode === 0 ? "0.35" : "0.78"} stroke={mode === 1 ? gold : undefined} strokeWidth={mode === 1 ? 4 : undefined} />
        {state.zeroLeft ? (
          <line data-viz-mark data-viz-name="left empty marker" data-viz-side="left" data-viz-left="0" data-viz-zero-left="true" x1="150" x2="216" y1="202" y2="202" stroke={gold} strokeWidth="5" strokeLinecap="round" strokeDasharray="8 7" />
        ) : null}
        {state.zeroRight ? (
          <line data-viz-mark data-viz-name="right empty marker" data-viz-side="right" data-viz-right="0" data-viz-zero-right="true" x1="424" x2="490" y1="202" y2="202" stroke={gold} strokeWidth="5" strokeLinecap="round" strokeDasharray="8 7" />
        ) : null}
        {Array.from({ length: state.leftValue }, (_, index) => (
          <rect key={index} data-viz-mark data-viz-name="left token" data-viz-fit-contract="pan-contained" data-viz-side="left" data-viz-left={state.leftValue} data-viz-token-index={index + 1} x={152 + (index % 5) * 15} y={202 - Math.floor(index / 5) * 18} width="12" height="12" rx="4" fill={gold} />
        ))}
        {Array.from({ length: state.rightValue }, (_, index) => (
          <circle key={index} data-viz-mark data-viz-name="right token" data-viz-fit-contract="pan-contained" data-viz-side="right" data-viz-right={state.rightValue} data-viz-token-index={index + 1} cx={436 + (index % 5) * 15} cy={202 - Math.floor(index / 5) * 18} r="6" fill={gold} />
        ))}
        <text x="86" y="286" fill={vizTheme.labelText} className="text-xs font-black">
          {state.leftValue} {state.difference === 0 ? "=" : state.difference > 0 ? ">" : "<"} {state.rightValue}; diff = {Math.abs(state.difference)}
        </text>
      </>
    );
  }

  if (templateId === "function-graph" || templateId === "function-family") {
    const graphMode = templateId === "function-graph" ? 0 : mode;
    const comparisonMode = templateId === "function-graph" ? 0 : (mode + 1) % 4;
    const parameters = configuredFunctionParameters(value, comparison, graphMode);
    const comparisonParameters = configuredFunctionParameters(comparison, value, comparisonMode);
    const samplePoint = configuredFunctionPoint(value, comparison, graphMode, 0.5);
    const vertexPoint = {
      x: configuredFunctionFrame.origin.x,
      y: clamp(
        configuredFunctionFrame.origin.y - parameters.verticalShift * configuredFunctionFrame.yScale,
        configuredFunctionFrame.top,
        configuredFunctionFrame.bottom
      )
    };
    const rootMagnitude = parameters.scaleParameter > 0 && parameters.verticalShift <= 0
      ? Math.sqrt(-parameters.verticalShift / parameters.scaleParameter)
      : null;
    const rootPoints = rootMagnitude === null
      ? []
      : [-rootMagnitude, rootMagnitude]
          .filter((xValue) => xValue >= configuredFunctionFrame.xMin && xValue <= configuredFunctionFrame.xMax)
          .map((xValue) => ({
            x: configuredFunctionFrame.origin.x + xValue * configuredFunctionFrame.xScale,
            xValue,
            y: configuredFunctionFrame.origin.y
          }));
    const graphFocus = templateId === "function-graph" ? (mode === 1 ? "vertex" : mode === 2 ? "roots" : "curve") : undefined;

    return (
      <>
        <line data-viz-mark data-viz-name="x axis" x1="70" x2="570" y1="216" y2="216" stroke={vizTheme.axis} strokeWidth="4" />
        <line data-viz-mark data-viz-name="y axis" x1="320" x2="320" y1="70" y2="292" stroke={vizTheme.axis} strokeWidth="4" />
        <path
          data-viz-mark
          data-viz-name="main function"
          data-viz-x-min={configuredFunctionFrame.xMin}
          data-viz-x-max={configuredFunctionFrame.xMax}
          data-viz-x-scale={formatNumber(configuredFunctionFrame.xScale, 2)}
          data-viz-y-scale={formatNumber(configuredFunctionFrame.yScale, 2)}
          data-viz-function-mode={parameters.modeKey}
          data-viz-active-focus={graphFocus}
          data-viz-root-count={templateId === "function-graph" ? rootPoints.length : undefined}
          data-viz-scale-parameter={formatNumber(parameters.scaleParameter, 6)}
          data-viz-vertical-shift={formatNumber(parameters.verticalShift, 6)}
          data-viz-formula={parameters.formula}
          d={graphPath(value, comparison, graphMode)}
          fill="none"
          stroke={accent}
          strokeWidth="7"
          strokeLinecap="round"
        />
        <path
          data-viz-mark
          data-viz-name="comparison function"
          data-viz-function-mode={comparisonParameters.modeKey}
          data-viz-scale-parameter={formatNumber(comparisonParameters.scaleParameter, 6)}
          data-viz-vertical-shift={formatNumber(comparisonParameters.verticalShift, 6)}
          data-viz-formula={comparisonParameters.formula}
          d={graphPath(comparison, value, comparisonMode)}
          fill="none"
          stroke={secondary}
          strokeWidth="4"
          strokeLinecap="round"
          opacity="0.72"
        />
        <circle
          data-viz-mark
          data-viz-name="sample point"
          data-viz-x={formatNumber(samplePoint.xValue, 2)}
          data-viz-y={formatNumber(samplePoint.yValue, 2)}
          data-viz-clipped={String(samplePoint.clipped)}
          data-viz-function-mode={parameters.modeKey}
          data-viz-scale-parameter={formatNumber(parameters.scaleParameter, 6)}
          data-viz-vertical-shift={formatNumber(parameters.verticalShift, 6)}
          cx={samplePoint.x}
          cy={samplePoint.y}
          r="13"
          fill={gold}
          stroke={vizTheme.pointStroke}
          strokeWidth="4"
        />
        {templateId === "function-graph" ? (
          <>
            <circle
              data-viz-mark
              data-viz-name="quadratic vertex"
              data-viz-x="0"
              data-viz-y={formatNumber(parameters.verticalShift, 2)}
              data-viz-function-mode={parameters.modeKey}
              data-viz-active-focus={graphFocus}
              cx={vertexPoint.x}
              cy={vertexPoint.y}
              r={mode === 1 ? 12 : 8}
              fill={mode === 1 ? gold : soft}
              stroke={gold}
              strokeWidth={mode === 1 ? 4 : 3}
              opacity={mode === 1 ? 1 : 0.76}
            />
            {rootPoints.map((rootPoint, index) => (
              <circle
                key={`quadratic-root-${index}`}
                data-viz-mark
                data-viz-name="quadratic root"
                data-viz-root-index={index + 1}
                data-viz-x={formatNumber(rootPoint.xValue, 3)}
                data-viz-y="0"
                data-viz-function-mode={parameters.modeKey}
                data-viz-active-focus={graphFocus}
                cx={rootPoint.x}
                cy={rootPoint.y}
                r={mode === 2 ? 11 : 7}
                fill={mode === 2 ? secondary : soft}
                stroke={secondary}
                strokeWidth={mode === 2 ? 4 : 3}
                opacity={mode === 2 ? 1 : 0.72}
              />
            ))}
            {mode === 3 ? (() => {
              // Exponential model exploration: y = value * 2^x + (comparison - 5).
              // Steep scales overflow the plot frame, so model marks are clipped
              // to the frame instead of escaping the panel.
              const exponentialShift = comparison - 5;
              const exponentialY = (xValue: number) => value * Math.pow(2, xValue) + exponentialShift;
              const toSvgX = (xValue: number) => configuredFunctionFrame.origin.x + xValue * configuredFunctionFrame.xScale;
              const toSvgY = (yValue: number) => configuredFunctionFrame.origin.y - yValue * configuredFunctionFrame.yScale;
              const modelSamples = Array.from({ length: 51 }, (_, index) => {
                const xValue = configuredFunctionFrame.xMin + (index / 50) * (configuredFunctionFrame.xMax - configuredFunctionFrame.xMin);
                return { x: toSvgX(xValue), y: toSvgY(exponentialY(xValue)) };
              });
              const modelPath = modelSamples
                .map((point, index) => `${index === 0 ? "M" : "L"} ${formatNumber(point.x, 2)} ${formatNumber(point.y, 2)}`)
                .join(" ");
              const sampleXValue = 0.5;
              const sampleYValue = exponentialY(sampleXValue);
              const samplePointSvg = { x: toSvgX(sampleXValue), y: toSvgY(sampleYValue) };

              return (
                <>
                  <clipPath id="functionModelPlotClip">
                    <rect x="70" y="70" width="500" height="222" />
                  </clipPath>
                  <path
                    data-viz-mark
                    data-viz-name="model curve"
                    data-viz-model="exponential"
                    data-viz-model-scale={formatNumber(value, 2)}
                    data-viz-model-shift={formatNumber(exponentialShift, 2)}
                    data-viz-formula={`y = ${value}·2^x ${exponentialShift >= 0 ? "+" : "-"} ${Math.abs(exponentialShift)}`}
                    clipPath="url(#functionModelPlotClip)"
                    d={modelPath}
                    fill="none"
                    stroke={secondary}
                    strokeWidth="6"
                    strokeLinecap="round"
                  />
                  <circle
                    data-viz-mark
                    data-viz-name="selected model point"
                    data-viz-model="exponential"
                    data-viz-x={formatNumber(sampleXValue, 2)}
                    data-viz-y={formatNumber(sampleYValue, 2)}
                    data-viz-hover-active={String(modelPointHovered)}
                    clipPath="url(#functionModelPlotClip)"
                    cx={samplePointSvg.x}
                    cy={samplePointSvg.y}
                    r="12"
                    fill={gold}
                    stroke={vizTheme.pointStroke}
                    strokeWidth="4"
                    onPointerEnter={() => setModelPointHovered(true)}
                    onPointerLeave={() => setModelPointHovered(false)}
                  />
                  {modelPointHovered ? (
                    <text
                      data-viz-mark
                      data-viz-name="model sample tip"
                      x={clamp(samplePointSvg.x + 16, 78, 430)}
                      y={clamp(samplePointSvg.y - 14, 84, 284)}
                      fill={vizTheme.labelText}
                      className="text-xs font-black"
                    >
                      {`Sample point (${formatNumber(sampleXValue, 1)}, ${formatNumber(sampleYValue, 2)})`}
                    </text>
                  ) : null}
                </>
              );
            })() : null}
          </>
        ) : null}
      </>
    );
  }

  if (templateId === "complex-plane") {
    const origin = complexPlaneOrigin;
    const scale = complexPlaneScale;
    const real = clamp(Math.round(value), -9, 9);
    const imaginary = clamp(Math.round(comparison), -9, 9);
    const point = { x: origin.x + real * scale, y: origin.y - imaginary * scale };
    const conjugate = { x: origin.x + real * scale, y: origin.y + imaginary * scale };
    const rotated = { x: origin.x - imaginary * scale, y: origin.y - real * scale };
    const activePoint = mode === 1 ? conjugate : mode === 2 ? rotated : point;
    const complexLabel = formatComplexLabel(real, imaginary);
    const conjugateLabel = formatComplexLabel(real, -imaginary);
    const rotatedLabel = formatComplexLabel(-imaginary, real);
    const activeLabel = mode === 1 ? conjugateLabel : mode === 2 ? rotatedLabel : complexLabel;
    const modulus = Math.hypot(real, imaginary) * scale;

    return (
      <>
        <line data-viz-mark data-viz-name="real axis" x1="78" x2="562" y1={origin.y} y2={origin.y} stroke={vizTheme.axisStrong} strokeWidth="4" />
        <line data-viz-mark data-viz-name="imaginary axis" x1={origin.x} x2={origin.x} y1="66" y2="296" stroke={vizTheme.axisStrong} strokeWidth="4" />
        {[-2, 0, 2].map((tick) => (
          <g key={`complex-re-${tick}`}>
            <line x1={origin.x + tick * 2 * scale} x2={origin.x + tick * 2 * scale} y1={origin.y - 8} y2={origin.y + 8} stroke={vizTheme.axis} strokeWidth="2" />
            <line x1={origin.x - 8} x2={origin.x + 8} y1={origin.y - tick * 2 * scale} y2={origin.y - tick * 2 * scale} stroke={vizTheme.axis} strokeWidth="2" />
          </g>
        ))}
        <circle
          data-viz-mark
          data-viz-name="modulus circle"
          data-viz-real={formatNumber(real, 0)}
          data-viz-imaginary={formatNumber(imaginary, 0)}
          data-viz-modulus={formatNumber(Math.hypot(real, imaginary), 3)}
          data-viz-scale={formatNumber(scale, 2)}
          cx={origin.x}
          cy={origin.y}
          r={modulus}
          fill="none"
          stroke="rgba(250,204,21,.5)"
          strokeWidth="4"
          strokeDasharray="8 8"
        />
        <line data-viz-mark data-viz-name="real projection" data-viz-real={formatNumber(real, 0)} data-viz-imaginary={formatNumber(imaginary, 0)} data-viz-scale={formatNumber(scale, 6)} x1={point.x} x2={point.x} y1={origin.y} y2={point.y} stroke="rgba(34,211,238,.5)" strokeWidth="3" strokeDasharray="5 6" />
        <line data-viz-mark data-viz-name="imaginary projection" data-viz-real={formatNumber(real, 0)} data-viz-imaginary={formatNumber(imaginary, 0)} data-viz-scale={formatNumber(scale, 6)} x1={origin.x} x2={point.x} y1={point.y} y2={point.y} stroke="rgba(34,211,238,.5)" strokeWidth="3" strokeDasharray="5 6" />
        <line data-viz-mark data-viz-name="complex vector" data-viz-real={formatNumber(real, 0)} data-viz-imaginary={formatNumber(imaginary, 0)} data-viz-label={complexLabel} data-viz-scale={formatNumber(scale, 6)} x1={origin.x} y1={origin.y} x2={point.x} y2={point.y} stroke={accent} strokeWidth="7" strokeLinecap="round" />
        <circle data-viz-mark data-viz-name="complex point" data-viz-real={formatNumber(real, 0)} data-viz-imaginary={formatNumber(imaginary, 0)} data-viz-label={complexLabel} data-viz-scale={formatNumber(scale, 6)} cx={point.x} cy={point.y} r="12" fill={accent} stroke={vizTheme.pointStroke} strokeWidth="4" />
        {mode >= 1 ? (
          <>
            <line data-viz-mark data-viz-name="conjugate vector" data-viz-real={formatNumber(real, 0)} data-viz-imaginary={formatNumber(-imaginary, 0)} data-viz-label={conjugateLabel} data-viz-scale={formatNumber(scale, 6)} x1={origin.x} y1={origin.y} x2={conjugate.x} y2={conjugate.y} stroke={secondary} strokeWidth="6" strokeLinecap="round" strokeDasharray={mode === 1 ? undefined : "9 8"} opacity={mode === 1 ? 1 : 0.58} />
            <circle data-viz-mark data-viz-name="conjugate point" data-viz-real={formatNumber(real, 0)} data-viz-imaginary={formatNumber(-imaginary, 0)} data-viz-label={conjugateLabel} data-viz-scale={formatNumber(scale, 6)} cx={conjugate.x} cy={conjugate.y} r={mode === 1 ? 12 : 9} fill={secondary} stroke={vizTheme.pointStroke} strokeWidth="3" opacity={mode === 1 ? 1 : 0.72} />
          </>
        ) : null}
        {mode === 2 ? (
          <>
            <path data-viz-mark data-viz-name="rotation arc" data-viz-rotation-degrees="90" data-viz-source-real={formatNumber(real, 0)} data-viz-source-imaginary={formatNumber(imaginary, 0)} data-viz-target-real={formatNumber(-imaginary, 0)} data-viz-target-imaginary={formatNumber(real, 0)} d={`M ${origin.x + 52} ${origin.y} A 52 52 0 0 0 ${origin.x} ${origin.y - 52}`} fill="none" stroke={gold} strokeWidth="5" strokeLinecap="round" />
            <line data-viz-mark data-viz-name="i times vector" data-viz-source-real={formatNumber(real, 0)} data-viz-source-imaginary={formatNumber(imaginary, 0)} data-viz-real={formatNumber(-imaginary, 0)} data-viz-imaginary={formatNumber(real, 0)} data-viz-target-real={formatNumber(-imaginary, 0)} data-viz-target-imaginary={formatNumber(real, 0)} data-viz-label={rotatedLabel} data-viz-scale={formatNumber(scale, 6)} x1={origin.x} y1={origin.y} x2={rotated.x} y2={rotated.y} stroke={gold} strokeWidth="7" strokeLinecap="round" />
            <circle data-viz-mark data-viz-name="i times point" data-viz-source-real={formatNumber(real, 0)} data-viz-source-imaginary={formatNumber(imaginary, 0)} data-viz-real={formatNumber(-imaginary, 0)} data-viz-imaginary={formatNumber(real, 0)} data-viz-target-real={formatNumber(-imaginary, 0)} data-viz-target-imaginary={formatNumber(real, 0)} data-viz-label={rotatedLabel} data-viz-scale={formatNumber(scale, 6)} cx={rotated.x} cy={rotated.y} r="12" fill={gold} stroke={vizTheme.pointStroke} strokeWidth="4" />
          </>
        ) : null}
        <text x="526" y={origin.y - 10} textAnchor="middle" fill={vizTheme.textMuted} className="text-xs font-bold">Re</text>
        <text x={origin.x + 14} y="82" fill={vizTheme.textMuted} className="text-xs font-bold">Im</text>
        <text x={activePoint.x + 16} y={activePoint.y - 12} fill={vizTheme.text} className="text-xs font-black">{activeLabel}</text>
        <text x="88" y="286" fill={vizTheme.mode === "day" ? "#a16207" : "#fef9c3"} className="text-xs font-bold">|z| = {formatNumber(Math.hypot(real, imaginary), 2)}</text>
      </>
    );
  }

  if (templateId === "trig-unit-wave") {
    const trigBaseY = trigWaveFrame.centerY;
    const unitCircleX = 164;
    const unitCircleRadius = 70;
    const state = trigState(value, comparison, mode);
    const phaseDegrees = state.phase * (180 / Math.PI);
    const unitCosine = Math.cos(state.theta);
    const unitSine = Math.sin(state.theta);
    const waveValue = unitSine * state.amplitude;
    const waveXScale = (trigWaveFrame.right - trigWaveFrame.left) / trigWaveFrame.radianMax;
    const radiusEnd = {
      x: unitCircleX + unitCosine * unitCircleRadius,
      y: trigBaseY - unitSine * unitCircleRadius
    };
    const waveStart = {
      x: trigWaveXForRadians(0),
      y: trigWaveYForValue(waveValue)
    };
    const wavePoints = Array.from({ length: trigWaveFrame.sampleCount }, (_, index) => {
      const radians = (index / (trigWaveFrame.sampleCount - 1)) * trigWaveFrame.radianMax;
      return {
        x: trigWaveXForRadians(radians),
        y: trigWaveYForValue(Math.sin(radians + state.theta) * state.amplitude)
      };
    });

    return (
      <>
        <circle data-viz-mark data-viz-name="unit circle" data-viz-origin-x={unitCircleX} data-viz-origin-y={trigBaseY} data-viz-radius={unitCircleRadius} cx={unitCircleX} cy={trigBaseY} r={unitCircleRadius} fill={soft} stroke={vizTheme.neutralStroke} strokeWidth="5" />
        <line
          data-viz-mark
          data-viz-name="radius"
          data-viz-angle-degrees={formatNumber(state.thetaDegrees, 0)}
          data-viz-amplitude={formatNumber(state.amplitude, 2)}
          data-viz-theta-radians={formatNumber(state.theta, 3)}
          data-viz-unit-cosine={formatNumber(unitCosine, 3)}
          data-viz-unit-sine={formatNumber(unitSine, 3)}
          data-viz-origin-x={unitCircleX}
          data-viz-origin-y={trigBaseY}
          data-viz-radius={unitCircleRadius}
          x1={unitCircleX}
          y1={trigBaseY}
          x2={radiusEnd.x}
          y2={radiusEnd.y}
          stroke={accent}
          strokeWidth="7"
          strokeLinecap="round"
        />
        <line
          data-viz-mark
          data-viz-name="sine projection"
          data-viz-unit-sine={formatNumber(unitSine, 3)}
          data-viz-wave-value={formatNumber(waveValue, 3)}
          data-viz-amplitude={formatNumber(state.amplitude, 2)}
          data-viz-wave-start-x={formatNumber(waveStart.x, 6)}
          data-viz-wave-start-y={formatNumber(waveStart.y, 6)}
          data-viz-y-scale={formatNumber(trigWaveFrame.yScale, 6)}
          x1={radiusEnd.x}
          x2={waveStart.x}
          y1={radiusEnd.y}
          y2={waveStart.y}
          stroke={gold}
          strokeWidth="3"
          strokeDasharray="7 8"
          opacity="0.78"
        />
        <path data-viz-mark data-viz-name="sine wave" data-viz-amplitude={formatNumber(state.amplitude, 2)} data-viz-phase-degrees={formatNumber(phaseDegrees, 0)} data-viz-angle-degrees={formatNumber(state.thetaDegrees, 0)} data-viz-theta-radians={formatNumber(state.theta, 6)} data-viz-radian-start="0" data-viz-radian-end={formatNumber(trigWaveFrame.radianMax, 6)} data-viz-sample-count={trigWaveFrame.sampleCount} data-viz-x-scale={formatNumber(waveXScale, 6)} data-viz-y-scale={formatNumber(trigWaveFrame.yScale, 6)} data-viz-center-y={trigWaveFrame.centerY} d={polylinePath(wavePoints)} fill="none" stroke={secondary} strokeWidth="6" strokeLinecap="round" />
        <line data-viz-mark data-viz-name="wave axis" data-viz-center-y={trigBaseY} data-viz-radian-start="0" data-viz-radian-end={formatNumber(trigWaveFrame.radianMax, 6)} x1={trigWaveFrame.gridLeft} x2={trigWaveFrame.gridRight} y1={trigBaseY} y2={trigBaseY} stroke={vizTheme.axis} strokeWidth="3" />
      </>
    );
  }

  if (templateId === "probability-simulation") {
    const state = probabilityState(value, comparison);
    const center = { x: 488, y: 132 };
    const radius = 62;
    const startAngle = -Math.PI / 2;
    const endAngle = startAngle + state.probability * Math.PI * 2;
    const startAngleDegrees = -90;
    const endAngleDegrees = startAngleDegrees + state.probability * 360;
    const start = { x: center.x + Math.cos(startAngle) * radius, y: center.y + Math.sin(startAngle) * radius };
    const end = { x: center.x + Math.cos(endAngle) * radius, y: center.y + Math.sin(endAngle) * radius };
    const largeArc = state.probability > 0.5 ? 1 : 0;
    const probabilitySliceIsFull = state.probabilityDefined && state.probability >= 1;
    const barUnitHeight = 18;
    const maxBarHeight = 170;
    const minVisibleHeight = 18;
    const successRawHeight = clamp(state.success * barUnitHeight, 0, maxBarHeight);
    const failureRawHeight = clamp(state.failure * barUnitHeight, 0, maxBarHeight);
    const successMinVisibleHeight = state.success > 0 ? minVisibleHeight : 0;
    const failureMinVisibleHeight = state.failure > 0 ? minVisibleHeight : 0;
    const successHeight = state.success > 0 ? Math.max(successMinVisibleHeight, successRawHeight) : 0;
    const failureHeight = state.failure > 0 ? Math.max(failureMinVisibleHeight, failureRawHeight) : 0;
    const zeroMarkerHeight = 2;
    const successRenderedHeight = state.success > 0 ? successHeight : zeroMarkerHeight;
    const failureRenderedHeight = state.failure > 0 ? failureHeight : zeroMarkerHeight;
    const failureProbability = state.probabilityDefined ? 1 - state.probability : 0;
    const probabilityPercent = formatNumber(state.probability * 100, 0);
    const probabilityLabel = state.probabilityDefined
      ? `P(success) = ${state.success}/${state.trials} = ${formatNumber(state.probability, 2)} = ${probabilityPercent}%`
      : "P(success) not defined yet: 0 trials";

    return (
      <>
        <rect data-viz-mark data-viz-name="success bar" data-viz-count={state.success} data-viz-trials={state.trials} data-viz-probability={formatNumber(state.probability, 3)} data-viz-probability-defined={String(state.probabilityDefined)} data-viz-raw-height={formatNumber(successRawHeight, 6)} data-viz-min-visible-height={formatNumber(successMinVisibleHeight, 6)} data-viz-height={formatNumber(successHeight, 6)} data-viz-rendered-height={formatNumber(successRenderedHeight, 6)} data-viz-zero-marker={String(state.success === 0)} x="104" y={270 - successRenderedHeight} width="74" height={successRenderedHeight} rx="14" fill={accent} opacity={state.success > 0 ? (mode === 1 ? "0.4" : "0.86") : "0.3"} stroke={mode === 0 ? gold : undefined} strokeWidth={mode === 0 ? 4 : undefined} />
        <rect data-viz-mark data-viz-name="failure bar" data-viz-count={state.failure} data-viz-trials={state.trials} data-viz-probability={formatNumber(failureProbability, 3)} data-viz-probability-defined={String(state.probabilityDefined)} data-viz-raw-height={formatNumber(failureRawHeight, 6)} data-viz-min-visible-height={formatNumber(failureMinVisibleHeight, 6)} data-viz-height={formatNumber(failureHeight, 6)} data-viz-rendered-height={formatNumber(failureRenderedHeight, 6)} data-viz-zero-marker={String(state.failure === 0)} x="206" y={270 - failureRenderedHeight} width="74" height={failureRenderedHeight} rx="14" fill={secondary} opacity={state.failure > 0 ? (mode === 0 ? "0.4" : "0.82") : "0.3"} stroke={mode === 1 ? gold : undefined} strokeWidth={mode === 1 ? 4 : undefined} />
        <line data-viz-mark data-viz-name="trial baseline" x1="84" x2="304" y1="270" y2="270" stroke={vizTheme.axisStrong} strokeWidth="4" strokeLinecap="round" />
        <circle data-viz-mark data-viz-name="sample space" data-viz-success={state.success} data-viz-failure={state.failure} data-viz-trials={state.trials} data-viz-center-x={center.x} data-viz-center-y={center.y} data-viz-radius={radius} cx={center.x} cy={center.y} r={radius} fill={soft} stroke={mode === 2 ? gold : accent} strokeWidth={mode === 2 ? 8 : 6} />
        {probabilitySliceIsFull ? (
          <circle data-viz-mark data-viz-name="probability slice" data-viz-probability={formatNumber(state.probability, 3)} data-viz-probability-defined={String(state.probabilityDefined)} data-viz-full-circle="true" data-viz-large-arc="1" data-viz-start-angle-degrees={formatNumber(startAngleDegrees, 6)} data-viz-end-angle-degrees={formatNumber(endAngleDegrees, 6)} data-viz-center-x={center.x} data-viz-center-y={center.y} data-viz-radius={radius} cx={center.x} cy={center.y} r={radius} fill={secondary} opacity="0.72" />
        ) : state.probability <= 0 ? (
          <circle data-viz-mark data-viz-name="probability slice" data-viz-probability={formatNumber(state.probability, 3)} data-viz-probability-defined={String(state.probabilityDefined)} data-viz-full-circle="false" data-viz-large-arc="0" data-viz-zero-marker="true" data-viz-start-angle-degrees={formatNumber(startAngleDegrees, 6)} data-viz-end-angle-degrees={formatNumber(endAngleDegrees, 6)} data-viz-start-x={formatNumber(start.x, 6)} data-viz-start-y={formatNumber(start.y, 6)} data-viz-end-x={formatNumber(end.x, 6)} data-viz-end-y={formatNumber(end.y, 6)} data-viz-center-x={center.x} data-viz-center-y={center.y} data-viz-radius={radius} cx={start.x} cy={start.y} r="4" fill={secondary} opacity={state.probabilityDefined ? "0.52" : "0.3"} />
        ) : (
          <path data-viz-mark data-viz-name="probability slice" data-viz-probability={formatNumber(state.probability, 3)} data-viz-probability-defined={String(state.probabilityDefined)} data-viz-full-circle="false" data-viz-large-arc={largeArc} data-viz-start-angle-degrees={formatNumber(startAngleDegrees, 6)} data-viz-end-angle-degrees={formatNumber(endAngleDegrees, 6)} data-viz-start-x={formatNumber(start.x, 6)} data-viz-start-y={formatNumber(start.y, 6)} data-viz-end-x={formatNumber(end.x, 6)} data-viz-end-y={formatNumber(end.y, 6)} data-viz-center-x={center.x} data-viz-center-y={center.y} data-viz-radius={radius} d={`M ${center.x} ${center.y} L ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y} Z`} fill={secondary} opacity="0.72" />
        )}
        <text x="82" y="292" fill={vizTheme.labelText} className="text-xs font-black">
          {probabilityLabel}
        </text>
      </>
    );
  }

  if (templateId === "statistics-distribution" && gradeBand !== "secondary") {
    // Primary grades read scaled bar graphs, not continuous distributions:
    // render two countable category bars instead of a normal curve.
    const frame = statisticsFrame;
    const barA = clamp(Math.round(value), 0, 10);
    const barB = clamp(Math.round(comparison), 0, 9);
    const unitHeight = 18;
    const baselineY = frame.bottom;
    const barWidth = 88;
    const barAX = 196;
    const barBX = 356;
    const barATop = baselineY - barA * unitHeight;
    const barBTop = baselineY - barB * unitHeight;
    const difference = Math.abs(barA - barB);
    const compareLabelY = clamp(Math.min(barATop, barBTop) - 10, 84, 280);

    return (
      <g data-viz-active-mode={mode}>
        {Array.from({ length: 6 }, (_, index) => {
          const unitValue = index * 2;
          const y = baselineY - unitValue * unitHeight;
          return (
            <g key={`bar-unit-${unitValue}`}>
              <line data-viz-mark data-viz-name="bar unit line" data-viz-unit-value={unitValue} x1="118" x2="520" y1={y} y2={y} stroke={vizTheme.gridStrong} strokeWidth={unitValue === 0 ? 0 : 1} opacity="0.7" />
              <text x="104" y={y + 4} textAnchor="middle" fill={vizTheme.tickText} className="text-[10px] font-bold">{unitValue}</text>
            </g>
          );
        })}
        <rect
          data-viz-mark
          data-viz-name="primary bar a"
          data-viz-count={barA}
          data-viz-unit-height={unitHeight}
          data-viz-zero-count={String(barA === 0)}
          x={barAX}
          y={barA === 0 ? baselineY - 3 : barATop}
          width={barWidth}
          height={barA === 0 ? 3 : barA * unitHeight}
          rx={barA === 0 ? 0 : 12}
          fill={accent}
          opacity={mode === 1 ? "0.4" : "0.88"}
          stroke={mode === 0 ? gold : undefined}
          strokeWidth={mode === 0 ? 4 : undefined}
        />
        <rect
          data-viz-mark
          data-viz-name="primary bar b"
          data-viz-count={barB}
          data-viz-unit-height={unitHeight}
          data-viz-zero-count={String(barB === 0)}
          x={barBX}
          y={barB === 0 ? baselineY - 3 : barBTop}
          width={barWidth}
          height={barB === 0 ? 3 : barB * unitHeight}
          rx={barB === 0 ? 0 : 12}
          fill={secondary}
          opacity={mode === 0 ? "0.4" : "0.86"}
          stroke={mode === 1 ? gold : undefined}
          strokeWidth={mode === 1 ? 4 : undefined}
        />
        <line data-viz-mark data-viz-name="bar baseline" x1="118" x2="520" y1={baselineY} y2={baselineY} stroke={vizTheme.axisStrong} strokeWidth="4" strokeLinecap="round" />
        <text data-viz-mark data-viz-name="bar count label a" data-viz-count={barA} x={barAX + barWidth / 2} y={clamp(barATop - 8, 84, 288)} textAnchor="middle" fill={vizTheme.labelText} className="text-xs font-black">{barA}</text>
        <text data-viz-mark data-viz-name="bar count label b" data-viz-count={barB} x={barBX + barWidth / 2} y={clamp(barBTop - 8, 84, 288)} textAnchor="middle" fill={vizTheme.labelText} className="text-xs font-black">{barB}</text>
        {mode === 2 ? (
          <>
            <line
              data-viz-mark
              data-viz-name="bar difference guide"
              data-viz-difference={difference}
              x1={barAX + barWidth / 2}
              x2={barBX + barWidth / 2}
              y1={barATop}
              y2={barBTop}
              stroke={gold}
              strokeWidth="4"
              strokeDasharray="8 7"
              strokeLinecap="round"
            />
            <text data-viz-mark data-viz-name="bar difference label" data-viz-difference={difference} x={(barAX + barBX + barWidth) / 2} y={compareLabelY} textAnchor="middle" fill={vizTheme.labelText} className="text-xs font-black">
              diff = {difference}
            </text>
          </>
        ) : null}
        <text x="118" y={statisticsFrame.summaryY} fill={vizTheme.labelText} className="text-xs font-black">
          A = {barA}, B = {barB}; difference = {difference}
        </text>
      </g>
    );
  }

  if (templateId === "statistics-distribution") {
    const state = statisticsState(value, comparison);
    const frame = statisticsFrame;
    const xForValue = (xValue: number) => frame.left + (xValue / 10) * (frame.right - frame.left);
    const spreadLeft = xForValue(clamp(state.mean - state.spread, frame.xMin, frame.xMax));
    const spreadRight = xForValue(clamp(state.mean + state.spread, frame.xMin, frame.xMax));
    const relativeDensity = (xValue: number) => {
      const z = (xValue - state.mean) / state.spread;
      return Math.exp(-(z ** 2) / 2);
    };
    const rawMeanX = xForValue(state.mean);
    // Keep the thick endpoint marker visibly inside the plotting frame while
    // preserving the learner-selected mean in state and machine evidence.
    const meanX = clamp(rawMeanX, frame.left + 14, frame.right - 14);
    const summarySamples = Array.from({ length: 6 }, (_, index) => {
      const xValue = ((index + 1) / 7) * 10;
      const density = relativeDensity(xValue);
      return {
        centerX: xForValue(xValue),
        density,
        height: clamp(8 + density * 142, 8, 150),
        x: xForValue(xValue) - 18,
        xValue
      };
    });
    return (
      <g data-viz-active-mode={mode}>
        <rect
          data-viz-mark
          data-viz-name="spread band"
          data-viz-active-mode={mode}
          data-viz-mean={formatNumber(state.mean, 1)}
          data-viz-spread={formatNumber(state.spread, 2)}
          x={spreadLeft}
          y="92"
          width={Math.max(4, spreadRight - spreadLeft)}
          height={frame.bottom - 92}
          rx="14"
          fill={secondary}
          opacity={mode === 1 ? "0.26" : "0.08"}
        />
        <path data-viz-mark data-viz-name="distribution curve" data-viz-active-mode={mode} data-viz-mean={formatNumber(state.mean, 1)} data-viz-spread={formatNumber(state.spread, 2)} data-viz-density-model="relative-normal" d={polylinePath(Array.from({ length: 80 }, (_, index) => {
          const xValue = (index / 79) * 10;
          const x = xForValue(xValue);
          const y = 264 - relativeDensity(xValue) * 154;
          return { x, y };
        }))} fill="none" stroke={accent} strokeWidth={mode === 2 ? "9" : "7"} strokeLinecap="round" opacity={mode === 1 ? "0.52" : "1"} />
        <line data-viz-mark data-viz-name="mean marker" data-viz-active-mode={mode} data-viz-mean={formatNumber(state.mean, 1)} data-viz-x={formatNumber(meanX, 1)} data-viz-raw-x={formatNumber(rawMeanX, 1)} data-viz-spread={formatNumber(state.spread, 2)} x1={meanX} x2={meanX} y1="90" y2={frame.bottom} stroke={gold} strokeWidth={mode === 0 ? "8" : "5"} strokeLinecap="round" />
        {summarySamples.map((sample, index) => (
          <rect
            key={index}
            data-viz-mark
            data-viz-name="summary bar"
            data-viz-active-mode={mode}
            data-viz-index={index + 1}
            data-viz-x-value={formatNumber(sample.xValue, 6)}
            data-viz-center-x={formatNumber(sample.centerX, 6)}
            data-viz-x={formatNumber(sample.x, 6)}
            data-viz-density={formatNumber(sample.density, 6)}
            data-viz-height={formatNumber(sample.height, 6)}
            x={sample.x}
            y={292 - sample.height}
            width="36"
            height={sample.height}
            rx="10"
            fill={index % 2 ? secondary : gold}
            opacity={mode === 2 ? "0.86" : "0.46"}
          />
        ))}
        <text x="82" y={statisticsFrame.summaryY} fill={vizTheme.labelText} className="text-xs font-black">
          {statisticsSummaryLabels.mean} = {formatNumber(state.mean, 1)}, {statisticsSummaryLabels.spread} = {formatNumber(state.spread, 2)}
        </text>
      </g>
    );
  }

  if (templateId === "calculus-rate-area") {
    const frame = calculusFrame;
    const state = calculusState(value, comparison);
    const formula = `f(x) = ${formatNumber(state.a / 2, 2)}x^2 + 0.35`;
    const mapX = (x: number) => frame.originX + x * frame.xScale;
    const mapY = (y: number) => clamp(frame.bottom - y * frame.yScale, 74, frame.bottom);
    const curvePoints = Array.from({ length: 88 }, (_, index) => {
      const x = -4 + (index / 87) * 8;
      return { x: mapX(x), y: mapY(state.f(x)) };
    });
    const x0 = clamp(state.x0, -3.5, 3.5);
    const y0 = state.f(x0);
    const tangentSlope = state.slope(x0);
    const tangentStartX = clamp(x0 - 2, -4, 4);
    const tangentEndX = clamp(x0 + 2, -4, 4);
    const x1 = clamp(x0 + 1.25, -3.75, 3.75);
    const secantSlope = (state.f(x1) - y0) / (x1 - x0 || 1);
    const activeSlope = mode === 1 ? secantSlope : tangentSlope;
    const activeStart = { x: tangentStartX, y: y0 + activeSlope * (tangentStartX - x0) };
    const activeEnd = { x: tangentEndX, y: y0 + activeSlope * (tangentEndX - x0) };
    const areaLeft = -3.6;
    const areaRight = clamp(x0, -3.2, 3.6);
    const stripCount = 8;
    const stripWidth = Math.max(0, (areaRight - areaLeft) / stripCount);

    return (
      <>
        {Array.from({ length: stripCount }, (_, index) => {
          const stripX = areaLeft + index * stripWidth;
          const midX = stripX + stripWidth / 2;
          const stripHeight = Math.max(4, frame.bottom - mapY(state.f(midX)));
          return (
            <rect
              key={index}
              data-viz-mark
              data-viz-name="area strip"
              data-viz-left={formatNumber(stripX, 3)}
              data-viz-right={formatNumber(stripX + stripWidth, 3)}
              data-viz-midpoint={formatNumber(midX, 3)}
              data-viz-function-value={formatNumber(state.f(midX), 3)}
              data-viz-pixel-height={formatNumber(stripHeight, 3)}
              data-viz-a={formatNumber(state.a, 6)}
              x={mapX(stripX)}
              y={frame.bottom - stripHeight}
              width={Math.max(2, stripWidth * frame.xScale - 1)}
              height={stripHeight}
              rx="6"
              fill={secondary}
              opacity={mode === 2 ? 0.5 : 0.22}
            />
          );
        })}
        <path
          data-viz-mark
          data-viz-name="curve"
          data-viz-a={formatNumber(state.a, 6)}
          data-viz-formula={formula}
          data-viz-x-min={frame.xMin}
          data-viz-x-max={frame.xMax}
          data-viz-x-scale={formatNumber(frame.xScale, 6)}
          data-viz-y-scale={formatNumber(frame.yScale, 6)}
          d={polylinePath(curvePoints)}
          fill="none"
          stroke={accent}
          strokeWidth="7"
          strokeLinecap="round"
        />
        <line
          data-viz-mark
          data-viz-name={mode === 1 ? "secant" : "tangent"}
          data-viz-a={formatNumber(state.a, 6)}
          data-viz-formula={formula}
          data-viz-x0={formatNumber(x0, 6)}
          data-viz-y0={formatNumber(y0, 6)}
          data-viz-slope={formatNumber(activeSlope, 2)}
          x1={mapX(activeStart.x)}
          x2={mapX(activeEnd.x)}
          y1={mapY(activeStart.y)}
          y2={mapY(activeEnd.y)}
          stroke={gold}
          strokeWidth="6"
          strokeLinecap="round"
        />
        <circle data-viz-mark data-viz-name="probe point" data-viz-a={formatNumber(state.a, 6)} data-viz-formula={formula} data-viz-x={formatNumber(x0, 6)} data-viz-y={formatNumber(y0, 6)} data-viz-slope={formatNumber(tangentSlope, 6)} cx={mapX(x0)} cy={mapY(y0)} r="12" fill={gold} stroke={vizTheme.pointStroke} strokeWidth="4" />
      </>
    );
  }

  if (templateId === "vector-conic-3d/strategy-map" && gradeBand !== "secondary") {
    // Primary labs mapped to this template are cylinder/cone volume lessons:
    // draw the two solids and the 1/3 volume relationship, not vectors/conics.
    const radiusUnits = clamp(Math.round(value), 1, 9);
    const heightUnits = clamp(Math.round(comparison), 1, 9);
    const radiusX = 18 + radiusUnits * 7;
    const radiusY = Math.max(7, radiusX * 0.3);
    const bodyHeight = 26 + heightUnits * 13;
    const baseY = 252;
    const cylinderCenterX = 208;
    const coneCenterX = 452;
    const cylinderTopY = baseY - bodyHeight;
    const coneApexY = baseY - bodyHeight;
    const cylinderVolume = Math.PI * radiusUnits * radiusUnits * heightUnits;
    const coneVolume = cylinderVolume / 3;
    const cylinderOpacity = mode === 1 ? 0.38 : 0.9;
    const coneOpacity = mode === 0 ? 0.38 : 0.88;

    return (
      <g data-viz-active-mode={mode}>
        <rect
          data-viz-mark
          data-viz-name="cylinder body"
          data-viz-radius-units={radiusUnits}
          data-viz-height-units={heightUnits}
          data-viz-volume={formatNumber(cylinderVolume, 1)}
          x={cylinderCenterX - radiusX}
          y={cylinderTopY}
          width={radiusX * 2}
          height={bodyHeight}
          fill={accent}
          opacity={cylinderOpacity * 0.55}
          stroke={accent}
          strokeWidth={mode === 0 ? 5 : 3}
        />
        <ellipse data-viz-mark data-viz-name="cylinder base" cx={cylinderCenterX} cy={baseY} rx={radiusX} ry={radiusY} fill={accent} opacity={cylinderOpacity * 0.6} stroke={accent} strokeWidth="3" />
        <ellipse data-viz-mark data-viz-name="cylinder top" cx={cylinderCenterX} cy={cylinderTopY} rx={radiusX} ry={radiusY} fill={soft} opacity={cylinderOpacity} stroke={accent} strokeWidth={mode === 0 ? 5 : 3} />
        <polygon
          data-viz-mark
          data-viz-name="cone body"
          data-viz-radius-units={radiusUnits}
          data-viz-height-units={heightUnits}
          data-viz-volume={formatNumber(coneVolume, 1)}
          points={`${coneCenterX - radiusX},${baseY} ${coneCenterX + radiusX},${baseY} ${coneCenterX},${coneApexY}`}
          fill={secondary}
          opacity={coneOpacity * 0.6}
          stroke={secondary}
          strokeWidth={mode === 1 ? 5 : 3}
        />
        <ellipse data-viz-mark data-viz-name="cone base" cx={coneCenterX} cy={baseY} rx={radiusX} ry={radiusY} fill={secondary} opacity={coneOpacity * 0.5} stroke={secondary} strokeWidth={mode === 1 ? 5 : 3} />
        <circle data-viz-mark data-viz-name="cone apex" cx={coneCenterX} cy={coneApexY} r="6" fill={gold} stroke={vizTheme.pointStroke} strokeWidth="3" opacity={coneOpacity} />
        {mode === 2 ? (
          <line
            data-viz-mark
            data-viz-name="volume compare guide"
            data-viz-ratio="1/3"
            x1={cylinderCenterX + radiusX + 8}
            x2={coneCenterX - radiusX - 8}
            y1={baseY - bodyHeight / 2}
            y2={baseY - bodyHeight / 2}
            stroke={gold}
            strokeWidth="5"
            strokeDasharray="9 8"
            strokeLinecap="round"
          />
        ) : null}
        <text x={cylinderCenterX} y={baseY + radiusY + 22} textAnchor="middle" fill={vizTheme.labelText} className="text-xs font-black">
          cylinder r = {radiusUnits}, h = {heightUnits}
        </text>
        <text x={coneCenterX} y={baseY + radiusY + 22} textAnchor="middle" fill={vizTheme.labelText} className="text-xs font-black">
          cone r = {radiusUnits}, h = {heightUnits}
        </text>
        <text x="82" y={panel.y + panel.height + 18} fill={vizTheme.labelText} className="text-xs font-black">
          V_cylinder = {formatNumber(cylinderVolume, 1)}; V_cone = V_cylinder / 3 = {formatNumber(coneVolume, 1)}
        </text>
      </g>
    );
  }

  if (templateId === "vector-conic-3d/strategy-map") {
    const state = advancedGeometryState(value, comparison);

    if (mode === 0) {
      const { vector } = state;

      return (
        <>
          <line data-viz-mark data-viz-name="vector x axis" x1="174" x2="466" y1={vector.origin.y} y2={vector.origin.y} stroke={vizTheme.axisStrong} strokeWidth="4" strokeLinecap="round" />
          <line data-viz-mark data-viz-name="vector y axis" x1={vector.origin.x} x2={vector.origin.x} y1="62" y2="334" stroke={vizTheme.axisStrong} strokeWidth="4" strokeLinecap="round" />
          <line data-viz-mark data-viz-name="vector x component" x1={vector.origin.x} x2={vector.end.x} y1={vector.origin.y} y2={vector.origin.y} stroke={secondary} strokeWidth="5" strokeLinecap="round" opacity="0.82" />
          <line data-viz-mark data-viz-name="vector y component" x1={vector.end.x} x2={vector.end.x} y1={vector.origin.y} y2={vector.end.y} stroke={secondary} strokeWidth="5" strokeLinecap="round" opacity="0.82" />
          <line
            data-viz-mark
            data-viz-name="component vector"
            data-viz-x-component={formatNumber(vector.componentX, 0)}
            data-viz-y-component={formatNumber(vector.componentY, 0)}
            data-viz-magnitude={formatNumber(vector.magnitude, 2)}
            data-viz-angle-degrees={formatNumber(vector.angleDegrees, 6)}
            data-viz-scale={formatNumber(vector.scale, 6)}
            x1={vector.origin.x}
            x2={vector.end.x}
            y1={vector.origin.y}
            y2={vector.end.y}
            stroke={accent}
            strokeWidth="8"
            strokeLinecap="round"
          />
          <circle data-viz-mark data-viz-name="vector origin" data-viz-x-component="0" data-viz-y-component="0" data-viz-scale={formatNumber(vector.scale, 6)} cx={vector.origin.x} cy={vector.origin.y} r="10" fill={gold} stroke={vizTheme.pointStroke} strokeWidth="3" />
          <circle data-viz-mark data-viz-name="vector endpoint" data-viz-end-x-component={formatNumber(vector.componentX, 0)} data-viz-end-y-component={formatNumber(vector.componentY, 0)} data-viz-magnitude={formatNumber(vector.magnitude, 6)} data-viz-angle-degrees={formatNumber(vector.angleDegrees, 6)} data-viz-scale={formatNumber(vector.scale, 6)} cx={vector.end.x} cy={vector.end.y} r="13" fill={accent} stroke={vizTheme.pointStroke} strokeWidth="4" />
          <text x="84" y="292" fill={vizTheme.labelText} className="text-xs font-black">
            v = ({formatNumber(vector.componentX, 0)}, {formatNumber(vector.componentY, 0)}), |v| = {formatNumber(vector.magnitude, 2)}
          </text>
        </>
      );
    }

    if (mode === 1) {
      const { conic } = state;
      const leftFocus = conic.center.x - conic.focalDistance;
      const rightFocus = conic.center.x + conic.focalDistance;
      const eccentricity = conic.semiMajor === 0 ? 0 : conic.focalDistance / conic.semiMajor;
      const ellipseFormula = `x^2/${formatNumber(conic.semiMajor, 0)}^2 + y^2/${formatNumber(conic.semiMinor, 0)}^2 = 1`;

      return (
        <>
          <ellipse
            data-viz-mark
            data-viz-name="ellipse"
            data-viz-semi-major={formatNumber(conic.semiMajor, 1)}
            data-viz-semi-minor={formatNumber(conic.semiMinor, 1)}
            data-viz-focal-distance={formatNumber(conic.focalDistance, 2)}
            data-viz-eccentricity={formatNumber(eccentricity, 6)}
            data-viz-formula={ellipseFormula}
            data-viz-center-x={conic.center.x}
            data-viz-center-y={conic.center.y}
            cx={conic.center.x}
            cy={conic.center.y}
            rx={conic.semiMajor}
            ry={conic.semiMinor}
            fill={soft}
            stroke={accent}
            strokeWidth="6"
          />
          <line data-viz-mark data-viz-name="major axis" data-viz-semi-major={formatNumber(conic.semiMajor, 6)} data-viz-center-x={conic.center.x} data-viz-center-y={conic.center.y} x1={conic.center.x - conic.semiMajor} x2={conic.center.x + conic.semiMajor} y1={conic.center.y} y2={conic.center.y} stroke={gold} strokeWidth="5" strokeLinecap="round" />
          <line data-viz-mark data-viz-name="minor axis" data-viz-semi-minor={formatNumber(conic.semiMinor, 6)} data-viz-center-x={conic.center.x} data-viz-center-y={conic.center.y} x1={conic.center.x} x2={conic.center.x} y1={conic.center.y - conic.semiMinor} y2={conic.center.y + conic.semiMinor} stroke={secondary} strokeWidth="5" strokeLinecap="round" />
          {[leftFocus, rightFocus].map((focusX, index) => (
            <circle key={index} data-viz-mark data-viz-name="focus" data-viz-focus-index={index + 1} data-viz-focus-x={formatNumber(focusX, 6)} data-viz-focus-y={formatNumber(conic.center.y, 6)} data-viz-focal-distance={formatNumber(conic.focalDistance, 6)} data-viz-center-x={conic.center.x} data-viz-center-y={conic.center.y} cx={focusX} cy={conic.center.y} r="9" fill={gold} stroke={vizTheme.pointStroke} strokeWidth="3" />
          ))}
          <circle data-viz-mark data-viz-name="ellipse center" data-viz-center-x={conic.center.x} data-viz-center-y={conic.center.y} cx={conic.center.x} cy={conic.center.y} r="8" fill={secondary} stroke={vizTheme.pointStroke} strokeWidth="3" />
          <text x="82" y="292" fill={vizTheme.labelText} className="text-xs font-black">
            {ellipseFormula}, c = {formatNumber(conic.focalDistance, 1)}
          </text>
        </>
      );
    }

    const graphScales = threeDGraphScalesFromControls(value, comparison);

    return (
      <ThreeDGraphSvg
        accent={gold}
        meshResolution={25}
        panelScale={graphScales.panelScale}
        surfaceScale={graphScales.surfaceScale}
      />
    );
  }

  return null;
}

function Slider({
  disabled = false,
  displayValue,
  label,
  max,
  min,
  onCommit,
  onValue,
  parameter,
  rangeAffects,
  rangeProjection,
  rangeProjectionReason,
  step = 1,
  value
}: {
  disabled?: boolean;
  displayValue?: string;
  label: string;
  max: number;
  min: number;
  onCommit: () => void;
  onValue: (value: number) => void;
  parameter?: string;
  rangeAffects?: string;
  rangeProjection?: string;
  rangeProjectionReason?: string;
  step?: number;
  value: number;
}) {
  return (
    <label className={`block rounded-2xl border border-slate-200/70 bg-white/70 p-4 transition dark:border-white/10 dark:bg-white/[0.055] ${disabled ? "opacity-55" : ""}`}>
      <span data-viz-slider-heading className="flex min-w-0 flex-wrap items-start justify-between gap-x-3 gap-y-2 text-sm font-bold text-slate-700 dark:text-slate-200">
        <span data-viz-slider-label className="min-w-0 flex-1 break-words [overflow-wrap:anywhere]">
          {label}
        </span>
        <strong data-viz-slider-value className="shrink-0 tabular-nums rounded-full bg-cyan-500/15 px-2 py-1 text-cyan-700 dark:text-cyan-200">
          {displayValue ?? formatNumber(value, 0)}
        </strong>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-label={label}
        aria-valuetext={displayValue}
        disabled={disabled}
        data-viz-parameter={parameter}
        data-viz-range-affects={rangeAffects}
        data-viz-range-projection={rangeProjection}
        data-viz-range-projection-reason={rangeProjectionReason}
        onInput={(event) => onValue(Number(event.currentTarget.value))}
        onChange={(event) => onValue(Number(event.currentTarget.value))}
        onPointerUp={onCommit}
        onKeyUp={onCommit}
        className="mt-2 h-11 w-full accent-cyan-500 disabled:cursor-not-allowed"
      />
    </label>
  );
}

function ConfiguredVisualizationLabSurface({ controlFooterAction, lab = null, labId, topicId }: ConfiguredVisualizationLabProps) {
  const { language, recordLearningEvent, t, text } = useSettings();
  const vizTheme = useVisualizationTheme();
  const configuredModuleId = configuredVisualizationModuleId;
  const configuredTopicId = lab?.labId ?? labId ?? topicId ?? lab?.topicId ?? "configured-visualization";
  const semanticModel = useMemo(
    () => {
      if (!lab || (!isMainlandVisualizationLab(lab) && lab.curriculumTrack !== "HK")) return null;
      const resolved = resolveConfiguredVisualizationSemanticModel(lab);
      if (resolved.variant !== "p3-fractions-intro") return resolved;
      const exactTopicIdentity = lab.labId === "p3-fractions-intro" && lab.topicId === "p3-fractions-intro";
      return exactTopicIdentity && lab.templateId === "fraction-bar" ? resolved : null;
    },
    [lab]
  );
  const semanticCompositeStrands = useMemo(
    () => semanticModel && lab ? resolveConfiguredVisualizationCompositeStrands(lab) : null,
    [lab, semanticModel]
  );
  const initialSemanticStrand = semanticCompositeStrands?.[0];
  const initialSemanticFamily = initialSemanticStrand?.family ?? semanticModel?.semanticFamily;
  const initialSemanticVariant = initialSemanticStrand?.variant ?? semanticModel?.variant ?? "";
  const initialSemanticControlContract = initialSemanticFamily
    ? getConfiguredVisualizationSemanticControlContract(initialSemanticFamily, initialSemanticVariant)
    : undefined;
  const initialSemanticResetPlan = getConfiguredVisualizationSemanticResetPlan(
    initialSemanticControlContract,
    lab?.labId ?? initialSemanticVariant
  );
  const initialValue = initialSemanticResetPlan.value;
  const initialComparison = initialSemanticResetPlan.comparison;
  const initialSemanticHeight = initialSemanticResetPlan.height;
  const initialSemanticMode = initialSemanticResetPlan.mode;
  const [value, setValue] = useState(initialValue);
  const [comparison, setComparison] = useState(initialComparison);
  const [semanticHeight, setSemanticHeight] = useState(initialSemanticHeight);
  const [semanticStrandIndex, setSemanticStrandIndex] = useState(0);
  const [mode, setMode] = useState(initialSemanticMode);
  const [userPoints, setUserPoints] = useState<Array<{ x: number; y: number }>>([]);
  const [pointDraft, setPointDraft] = useState({ x: "", y: "" });
  const [pointError, setPointError] = useState("");
  const accent = safeAccent(lab);
  const templateId = lab?.templateId ?? "number-line";
  const gradeBand = gradeBandForLab(lab);
  const activeSemanticStrand = semanticCompositeStrands?.[
    Math.min(semanticStrandIndex, Math.max(0, semanticCompositeStrands.length - 1))
  ];
  const activeSemanticFamily = activeSemanticStrand?.family ?? semanticModel?.semanticFamily;
  const activeSemanticVariant = activeSemanticStrand?.variant ?? semanticModel?.variant ?? "";
  const baseActiveSemanticControlContract = useMemo(
    () => activeSemanticFamily
      ? getConfiguredVisualizationSemanticControlContract(activeSemanticFamily, activeSemanticVariant, mode)
      : undefined,
    [activeSemanticFamily, activeSemanticVariant, mode]
  );
  const activeSemanticProjection = useMemo(
    () => baseActiveSemanticControlContract
      ? projectConfiguredVisualizationSemanticControlState(
          baseActiveSemanticControlContract,
          { comparison, height: semanticHeight, value },
          mode
        )
      : null,
    [baseActiveSemanticControlContract, comparison, mode, semanticHeight, value]
  );
  const activeSemanticControlContract = useMemo(() => {
    if (!baseActiveSemanticControlContract || !activeSemanticProjection) {
      return baseActiveSemanticControlContract;
    }
    return {
      ...baseActiveSemanticControlContract,
      sliders: baseActiveSemanticControlContract.sliders.map((control) => ({
        ...control,
        ...activeSemanticProjection.bounds[control.id]
      }))
    };
  }, [activeSemanticProjection, baseActiveSemanticControlContract]);
  useEffect(() => {
    if (!activeSemanticProjection) return;
    const projectedValue = activeSemanticProjection.values.value;
    const projectedComparison = activeSemanticProjection.values.comparison;
    const projectedHeight = activeSemanticProjection.values.height;
    if (projectedValue !== undefined) setValue((current) => current === projectedValue ? current : projectedValue);
    if (projectedComparison !== undefined) {
      setComparison((current) => current === projectedComparison ? current : projectedComparison);
    }
    if (projectedHeight !== undefined) {
      setSemanticHeight((current) => current === projectedHeight ? current : projectedHeight);
    }
  }, [
    activeSemanticProjection
  ]);
  useEffect(() => {
    setValue(initialValue);
    setComparison(initialComparison);
    setSemanticHeight(initialSemanticHeight);
    setSemanticStrandIndex(0);
    setMode(initialSemanticMode);
    setUserPoints([]);
    setPointDraft({ x: "", y: "" });
    setPointError("");
  }, [initialComparison, initialSemanticHeight, initialSemanticMode, initialValue, lab?.labId]);
  const usesGradeOneSetControls = templateId === "number-line" && isGradeOneAddSubtractLab(lab, labId, topicId);
  // Early-primary position lessons only use Move; upper-primary curriculum
  // covers translate/reflect but not dilation.
  const coordinateModeCount = gradeBand === "early-primary" ? 1 : gradeBand === "upper-primary" ? 2 : 3;
  const activeSemanticMode = activeSemanticControlContract?.modes.find(({ value: modeValue }) => modeValue === mode)
    ?? activeSemanticControlContract?.modes[0];
  const cappedMode = semanticModel
    ? activeSemanticMode?.value ?? 0
    : templateId === "coordinate-transform"
      ? Math.min(mode, coordinateModeCount - 1)
      : mode;
  const modelMode = usesGradeOneSetControls ? 1 : cappedMode;
  const visibleMode = usesGradeOneSetControls ? 0 : cappedMode;
  const semanticStrandLabels = semanticCompositeStrands?.map((strand) => text(strand.label));
  const formula = lab?.templateConfig.formula;
  // Primary statistics labs render a countable bar chart, so the continuous
  // "mean +/- spread" template default would mislabel the model.
  const usesPrimaryBarChartBadge =
    templateId === "statistics-distribution" && gradeBand !== "secondary" && formula?.en === "mean +/- spread";
  const semanticModeLabel = activeSemanticMode ? text(activeSemanticMode.label) : undefined;
  const titleBadgeLabel = activeSemanticStrand
    ? text(activeSemanticStrand.label)
    : semanticModeLabel
    ? semanticModeLabel
    : semanticModel && lab
      // Once a Mainland lab is routed to an exact semantic renderer, an old
      // template formula may describe a different relation entirely. The
      // localized curriculum category is a safe direct-model badge; the
      // executable formula remains visible inside the semantic marks.
      ? text(lab.category)
    : usesPrimaryBarChartBadge
      ? t({ en: "count -> bar chart", zh: "數量 -> 棒形圖", zhHans: "数量 -> 条形图" })
      : formula
        ? text(formula)
        : lab
          ? text(lab.category)
          : t({ en: "Interactive model", zh: "互動模型", zhHans: "互动模型" });
  const titleBadgeWidth = estimateBadgeWidth(titleBadgeLabel);
  const legacyControlCopy = useMemo(() => {
    if (templateId === "equation-balance") {
      const state = equationBalanceState(value, comparison);
      return {
        modeLabels: [
          t({ en: "Left side", zh: "左邊", zhHans: "左边" }),
          t({ en: "Right side", zh: "右邊", zhHans: "右边" }),
          t({ en: "Balance", zh: "平衡", zhHans: "平衡" })
        ],
        valueLabel: t({ en: "Left side value", zh: "左邊數值", zhHans: "左边数值" }),
        comparisonLabel: t({ en: "Right side value", zh: "右邊數值", zhHans: "右边数值" }),
        comparisonNote: t({
          en: `Left side = ${value}, right side = ${comparison}; status = ${state.status}, difference = ${Math.abs(state.difference)}.`,
          zh: `左邊 = ${value}，右邊 = ${comparison}；狀態 = ${state.status}，差值 = ${Math.abs(state.difference)}。`,
          zhHans: `左边 = ${value}，右边 = ${comparison}；状态 = ${state.status}，差值 = ${Math.abs(state.difference)}。`
        })
      };
    }

    if (templateId === "number-line") {
      const state = numberLineState(value, comparison, modelMode);
      return {
        modeLabels: usesGradeOneSetControls
          ? [t({ en: "Set", zh: "設定", zhHans: "设置" })]
          : [
            t({ en: "Count", zh: "數數", zhHans: "数数" }),
            t({ en: "Add", zh: "相加", zhHans: "相加" }),
            t({ en: "Compare", zh: "比較", zhHans: "比较" })
          ],
        valueLabel: usesGradeOneSetControls
          ? t({ en: "Start", zh: "起點", zhHans: "起点" })
          : t({ en: "Number A", zh: "數字 A", zhHans: "数字 A" }),
        comparisonLabel: usesGradeOneSetControls
          ? t({ en: "Step", zh: "步長", zhHans: "步长" })
          : t({ en: "Number B", zh: "數字 B", zhHans: "数字 B" }),
        comparisonNote: t({
          en: `Number line: ${formatNumber(state.startValue, 0)} -> ${formatNumber(state.endValue, 0)}; step = ${formatNumber(state.stepValue, 0)}.`,
          zh: `數線：${formatNumber(state.startValue, 0)} -> ${formatNumber(state.endValue, 0)}；步長 = ${formatNumber(state.stepValue, 0)}。`,
          zhHans: `数线：${formatNumber(state.startValue, 0)} -> ${formatNumber(state.endValue, 0)}；步长 = ${formatNumber(state.stepValue, 0)}。`
        })
      };
    }

    if (templateId === "array-area") {
      const state = arrayAreaState(value, comparison);
      return {
        modeLabels: [
          t({ en: "Rows", zh: "行", zhHans: "行" }),
          t({ en: "Columns", zh: "列", zhHans: "列" }),
          t({ en: "Area", zh: "面積", zhHans: "面积" })
        ],
        valueLabel: t({ en: "Columns", zh: "列數", zhHans: "列数" }),
        comparisonLabel: t({ en: "Rows", zh: "行數", zhHans: "行数" }),
        comparisonNote: t({
          en: `Array area: ${state.columns} columns x ${state.rows} rows = ${state.area} square units.`,
          zh: `陣列面積：${state.columns} 列 x ${state.rows} 行 = ${state.area} 平方單位。`,
          zhHans: `阵列面积：${state.columns} 列 x ${state.rows} 行 = ${state.area} 平方单位。`
        })
      };
    }

    if (templateId === "base-ten") {
      const state = baseTenState(value, comparison);
      return {
        modeLabels: [
          t({ en: "Tens", zh: "十位", zhHans: "十位" }),
          t({ en: "Ones", zh: "個位", zhHans: "个位" }),
          t({ en: "Total", zh: "總數", zhHans: "总数" })
        ],
        valueLabel: t({ en: "Tens", zh: "十位數", zhHans: "十位数" }),
        comparisonLabel: t({ en: "Ones", zh: "個位數", zhHans: "个位数" }),
        comparisonNote: t({
          en: `${state.tens} tens + ${state.ones} ones = ${state.total}.`,
          zh: `${state.tens} 個十 + ${state.ones} 個一 = ${state.total}。`,
          zhHans: `${state.tens} 个十 + ${state.ones} 个一 = ${state.total}。`
        })
      };
    }

    if (templateId === "fraction-bar") {
      const state = fractionState(value, comparison);
      return {
        modeLabels: [
          t({ en: "Fraction", zh: "分數", zhHans: "分数" }),
          t({ en: "Equivalent", zh: "等值", zhHans: "等值" }),
          t({ en: "Compare", zh: "比較", zhHans: "比较" })
        ],
        valueLabel: t({ en: "Denominator", zh: "分母", zhHans: "分母" }),
        comparisonLabel: t({ en: "Numerator", zh: "分子", zhHans: "分子" }),
        comparisonNote: t({
          en: `Fraction model: ${state.numerator}/${state.denominator} = ${state.equivalentNumerator}/${state.equivalentDenominator}.`,
          zh: `分數模型：${state.numerator}/${state.denominator} = ${state.equivalentNumerator}/${state.equivalentDenominator}。`,
          zhHans: `分数模型：${state.numerator}/${state.denominator} = ${state.equivalentNumerator}/${state.equivalentDenominator}。`
        })
      };
    }

    if (templateId === "clock-money-data") {
      const state = clockMoneyState(value, comparison);
      return {
        modeLabels: [
          t({ en: "Clock", zh: "時鐘", zhHans: "时钟" }),
          t({ en: "Money", zh: "金錢", zhHans: "金钱" }),
          t({ en: "Data", zh: "數據", zhHans: "数据" })
        ],
        valueLabel: t({ en: "Hour", zh: "小時", zhHans: "小时" }),
        comparisonLabel: t({ en: "Minute step", zh: "分鐘刻度", zhHans: "分钟刻度" }),
        comparisonNote: t({
          en: `Clock reads ${state.hour}:${String(state.minute).padStart(2, "0")}; money/data value = ${state.moneyTotal}.`,
          zh: `時鐘讀數 ${state.hour}:${String(state.minute).padStart(2, "0")}；金錢/數據值 = ${state.moneyTotal}。`,
          zhHans: `时钟读数 ${state.hour}:${String(state.minute).padStart(2, "0")}；金钱/数据值 = ${state.moneyTotal}。`
        })
      };
    }

    if (templateId === "measurement-scale") {
      const state = measurementState(value, comparison);
      return {
        modeLabels: [
          t({ en: "Measure A", zh: "量度 A", zhHans: "测量 A" }),
          t({ en: "Measure B", zh: "量度 B", zhHans: "测量 B" }),
          t({ en: "Difference", zh: "差值", zhHans: "差值" })
        ],
        valueLabel: t({ en: "Object A units", zh: "物件 A 單位", zhHans: "物体 A 单位" }),
        comparisonLabel: t({ en: "Object B units", zh: "物件 B 單位", zhHans: "物体 B 单位" }),
        comparisonNote: t({
          en: `A = ${state.objectAUnits} units, B = ${state.objectBUnits} units; difference = ${state.difference}.`,
          zh: `A = ${state.objectAUnits} 單位，B = ${state.objectBUnits} 單位；差值 = ${state.difference}。`,
          zhHans: `A = ${state.objectAUnits} 单位，B = ${state.objectBUnits} 单位；差值 = ${state.difference}。`
        })
      };
    }

    if (templateId === "coordinate-transform") {
      const state = coordinateTransformState(value, comparison, cappedMode);
      const allModeLabels = [
        gradeBand === "early-primary"
          ? t({ en: "Move", zh: "移動", zhHans: "移动" })
          : t({ en: "Translate", zh: "平移", zhHans: "平移" }),
        t({ en: "Reflect", zh: "反射", zhHans: "反射" }),
        t({ en: "Dilate", zh: "放縮", zhHans: "缩放" })
      ];
      return {
        modeLabels: allModeLabels.slice(0, coordinateModeCount),
        valueLabel: cappedMode === 2
          ? t({ en: "Scale factor", zh: "放縮比例", zhHans: "缩放比例" })
          : cappedMode === 1
            ? t({ en: "Mirror line x", zh: "鏡像線 x", zhHans: "镜像线 x" })
            : gradeBand === "early-primary"
              ? t({ en: "Move right-left", zh: "左右移動", zhHans: "左右移动" })
              : t({ en: "Horizontal shift", zh: "水平平移", zhHans: "水平平移" }),
        comparisonLabel: gradeBand === "early-primary"
          ? t({ en: "Move up-down", zh: "上下移動", zhHans: "上下移动" })
          : t({ en: "Vertical shift", zh: "垂直平移", zhHans: "垂直平移" }),
        comparisonNote: t({
          en: cappedMode === 0
            ? `Translation: (x, y) -> (x + ${state.dx}, y + ${state.dy}).`
            : mode === 1
              ? `Reflection: x' = 2(${formatNumber(state.reflectionLineX, 1)}) - x, then y shifts by ${state.dy}.`
              : `Dilation: (x, y) -> (${formatNumber(state.dilationScale, 2)}x, ${formatNumber(state.dilationScale, 2)}y + ${state.dy}).`,
          zh: mode === 0
            ? `平移：(x, y) -> (x + ${state.dx}, y + ${state.dy})。`
            : mode === 1
              ? `反射：x' = 2(${formatNumber(state.reflectionLineX, 1)}) - x，然後 y 平移 ${state.dy}。`
              : `放縮：(x, y) -> (${formatNumber(state.dilationScale, 2)}x, ${formatNumber(state.dilationScale, 2)}y + ${state.dy})。`,
          zhHans: mode === 0
            ? `平移：(x, y) -> (x + ${state.dx}, y + ${state.dy})。`
            : mode === 1
              ? `反射：x' = 2(${formatNumber(state.reflectionLineX, 1)}) - x，然后 y 平移 ${state.dy}。`
              : `缩放：(x, y) -> (${formatNumber(state.dilationScale, 2)}x, ${formatNumber(state.dilationScale, 2)}y + ${state.dy})。`
        })
      };
    }

    if (templateId === "right-triangle-pythagorean") {
      const state = rightTriangleState(value, comparison);
      return {
        modeLabels: [
          t({ en: "Squares", zh: "平方", zhHans: "平方" }),
          t({ en: "Converse", zh: "逆定理", zhHans: "逆定理" }),
          t({ en: "Similarity", zh: "相似", zhHans: "相似" })
        ],
        valueLabel: t({ en: "Leg a", zh: "直角邊 a", zhHans: "直角边 a" }),
        comparisonLabel: t({ en: "Leg b", zh: "直角邊 b", zhHans: "直角边 b" }),
        comparisonNote: t({
          en: mode === 2
            ? `Similar right triangles keep the ratio a:b = ${state.legA}:${state.legB}; scale factor = ${formatNumber(state.similarScale, 2)}.`
            : `Right triangle: a^2 + b^2 = c^2 -> ${state.legASquared} + ${state.legBSquared} = ${state.hypotenuseSquared}, so c = ${formatNumber(state.hypotenuse, 2)}.`,
          zh: mode === 2
            ? `相似直角三角形保持比例 a:b = ${state.legA}:${state.legB}；比例因子 = ${formatNumber(state.similarScale, 2)}。`
            : `直角三角形：a^2 + b^2 = c^2 -> ${state.legASquared} + ${state.legBSquared} = ${state.hypotenuseSquared}，所以 c = ${formatNumber(state.hypotenuse, 2)}。`,
          zhHans: mode === 2
            ? `相似直角三角形保持比例 a:b = ${state.legA}:${state.legB}；比例因子 = ${formatNumber(state.similarScale, 2)}。`
            : `直角三角形：a^2 + b^2 = c^2 -> ${state.legASquared} + ${state.legBSquared} = ${state.hypotenuseSquared}，所以 c = ${formatNumber(state.hypotenuse, 2)}。`
        })
      };
    }

    if (templateId === "function-graph") {
      const parameters = configuredFunctionParameters(value, comparison, 0);
      const exponentialShift = comparison - 5;
      const exponentialFormula = `y = ${value}·2^x ${exponentialShift >= 0 ? "+" : "-"} ${Math.abs(exponentialShift)}`;
      return {
        modeLabels: [
          t({ en: "Quadratic", zh: "二次", zhHans: "二次" }),
          t({ en: "Vertex", zh: "頂點", zhHans: "顶点" }),
          t({ en: "Roots", zh: "根", zhHans: "根" }),
          t({ en: "Exponential", zh: "指數", zhHans: "指数" })
        ],
        valueLabel: mode === 3
          ? t({ en: "Model scale", zh: "模型係數", zhHans: "模型系数" })
          : t({ en: "Quadratic coefficient", zh: "二次項係數", zhHans: "二次项系数" }),
        comparisonLabel: t({ en: "Vertical shift", zh: "垂直平移", zhHans: "垂直平移" }),
        comparisonNote: t({
          en: mode === 3 ? `Exponential model: ${exponentialFormula}.` : `Current graph: ${parameters.formula}.`,
          zh: mode === 3 ? `指數模型：${exponentialFormula}。` : `當前圖像：${parameters.formula}。`,
          zhHans: mode === 3 ? `指数模型：${exponentialFormula}。` : `当前图像：${parameters.formula}。`
        })
      };
    }

    if (templateId === "function-family") {
      const parameters = configuredFunctionParameters(value, comparison, mode);
      return {
        modeLabels: [
          t({ en: "Quadratic", zh: "二次", zhHans: "二次" }),
          t({ en: "Wave", zh: "波形", zhHans: "波形" }),
          t({ en: "Log growth", zh: "對數增長", zhHans: "对数增长" }),
          t({ en: "Exponential", zh: "指數", zhHans: "指数" })
        ],
        valueLabel: t({ en: "Scale coefficient", zh: "伸縮係數", zhHans: "伸缩系数" }),
        comparisonLabel: t({ en: "Vertical shift", zh: "垂直平移", zhHans: "垂直平移" }),
        comparisonNote: t({
          en: `Current model: ${parameters.formula}.`,
          zh: `當前模型：${parameters.formula}。`,
          zhHans: `当前模型：${parameters.formula}。`
        })
      };
    }

    if (templateId === "trig-unit-wave") {
      const state = trigState(value, comparison, mode);
      const thetaLabel = formatNumber(state.thetaDegrees, 0);
      const amplitudeLabel = formatNumber(state.amplitude, 2);

      return {
        modeLabels: [
          t({ en: "0 phase", zh: "0 相位", zhHans: "0 相位" }),
          t({ en: "+45 deg", zh: "+45 度", zhHans: "+45 度" }),
          t({ en: "+90 deg", zh: "+90 度", zhHans: "+90 度" })
        ],
        valueLabel: t({ en: "Angle theta", zh: "角 theta", zhHans: "角 theta" }),
        comparisonLabel: t({ en: "Amplitude A", zh: "振幅 A", zhHans: "振幅 A" }),
        comparisonNote: t({
          en: `theta = ${thetaLabel} deg, A = ${amplitudeLabel}; wave model y = A sin(x + theta).`,
          zh: `theta = ${thetaLabel} 度，A = ${amplitudeLabel}；波形模型 y = A sin(x + theta)。`,
          zhHans: `theta = ${thetaLabel} 度，A = ${amplitudeLabel}；波形模型 y = A sin(x + theta)。`
        })
      };
    }

    if (templateId === "calculus-rate-area") {
      const state = calculusState(value, comparison);
      const slope = state.slope(state.x0);

      return {
        modeLabels: [
          t({ en: "Tangent", zh: "切線", zhHans: "切线" }),
          t({ en: "Secant", zh: "割線", zhHans: "割线" }),
          t({ en: "Area", zh: "面積", zhHans: "面积" })
        ],
        valueLabel: t({ en: "Curvature a", zh: "曲率 a", zhHans: "曲率 a" }),
        comparisonLabel: t({ en: "Probe x", zh: "探針 x", zhHans: "探针 x" }),
        comparisonNote: t({
          en: `f(x) = ${formatNumber(state.a / 2, 2)}x^2 + 0.35; at x = ${formatNumber(state.x0, 2)}, f'(x) = ${formatNumber(slope, 2)}.`,
          zh: `f(x) = ${formatNumber(state.a / 2, 2)}x^2 + 0.35；x = ${formatNumber(state.x0, 2)} 時，f'(x) = ${formatNumber(slope, 2)}。`,
          zhHans: `f(x) = ${formatNumber(state.a / 2, 2)}x^2 + 0.35；x = ${formatNumber(state.x0, 2)} 时，f'(x) = ${formatNumber(slope, 2)}。`
        })
      };
    }

    if (templateId === "vector-conic-3d/strategy-map" && gradeBand !== "secondary") {
      const radiusUnits = clamp(Math.round(value), 1, 9);
      const heightUnits = clamp(Math.round(comparison), 1, 9);
      const cylinderVolume = Math.PI * radiusUnits * radiusUnits * heightUnits;
      return {
        modeLabels: [
          t({ en: "Cylinder", zh: "圓柱", zhHans: "圆柱" }),
          t({ en: "Cone", zh: "圓錐", zhHans: "圆锥" }),
          t({ en: "Compare", zh: "比較", zhHans: "比较" })
        ],
        valueLabel: t({ en: "Radius r", zh: "半徑 r", zhHans: "半径 r" }),
        comparisonLabel: t({ en: "Height h", zh: "高 h", zhHans: "高 h" }),
        comparisonNote: t({
          en: `V_cylinder = pi x r^2 x h = ${formatNumber(cylinderVolume, 1)}; V_cone = V_cylinder / 3 = ${formatNumber(cylinderVolume / 3, 1)}.`,
          zh: `圓柱體積 = pi x r^2 x h = ${formatNumber(cylinderVolume, 1)}；圓錐體積 = 圓柱體積 / 3 = ${formatNumber(cylinderVolume / 3, 1)}。`,
          zhHans: `圆柱体积 = pi x r^2 x h = ${formatNumber(cylinderVolume, 1)}；圆锥体积 = 圆柱体积 / 3 = ${formatNumber(cylinderVolume / 3, 1)}。`
        })
      };
    }

    if (templateId === "vector-conic-3d/strategy-map") {
      const state = advancedGeometryState(value, comparison);

      if (mode === 0) {
        return {
          modeLabels: [
            t({ en: "Vector", zh: "向量", zhHans: "向量" }),
            t({ en: "Conic", zh: "圓錐", zhHans: "圆锥" }),
            t({ en: "3D", zh: "立體", zhHans: "立体" })
          ],
          valueLabel: t({ en: "x component", zh: "x 分量", zhHans: "x 分量" }),
          comparisonLabel: t({ en: "y component", zh: "y 分量", zhHans: "y 分量" }),
          comparisonNote: t({
            en: `v = (${formatNumber(state.vector.componentX, 0)}, ${formatNumber(state.vector.componentY, 0)}), |v| = ${formatNumber(state.vector.magnitude, 2)}, angle = ${formatNumber(state.vector.angleDegrees, 0)} deg.`,
            zh: `v = (${formatNumber(state.vector.componentX, 0)}, ${formatNumber(state.vector.componentY, 0)})，|v| = ${formatNumber(state.vector.magnitude, 2)}，角度 = ${formatNumber(state.vector.angleDegrees, 0)} 度。`,
            zhHans: `v = (${formatNumber(state.vector.componentX, 0)}, ${formatNumber(state.vector.componentY, 0)})，|v| = ${formatNumber(state.vector.magnitude, 2)}，角度 = ${formatNumber(state.vector.angleDegrees, 0)} 度。`
          })
        };
      }

      if (mode === 1) {
        return {
          modeLabels: [
            t({ en: "Vector", zh: "向量", zhHans: "向量" }),
            t({ en: "Conic", zh: "圓錐", zhHans: "圆锥" }),
            t({ en: "3D", zh: "立體", zhHans: "立体" })
          ],
          valueLabel: t({ en: "Semi-major a", zh: "半長軸 a", zhHans: "半长轴 a" }),
          comparisonLabel: t({ en: "Semi-minor b", zh: "半短軸 b", zhHans: "半短轴 b" }),
          comparisonNote: t({
            en: `Ellipse model: x^2/${formatNumber(state.conic.semiMajor, 0)}^2 + y^2/${formatNumber(state.conic.semiMinor, 0)}^2 = 1; c = ${formatNumber(state.conic.focalDistance, 1)}.`,
            zh: `橢圓模型：x^2/${formatNumber(state.conic.semiMajor, 0)}^2 + y^2/${formatNumber(state.conic.semiMinor, 0)}^2 = 1；c = ${formatNumber(state.conic.focalDistance, 1)}。`,
            zhHans: `椭圆模型：x^2/${formatNumber(state.conic.semiMajor, 0)}^2 + y^2/${formatNumber(state.conic.semiMinor, 0)}^2 = 1；c = ${formatNumber(state.conic.focalDistance, 1)}。`
          })
        };
      }

      const graphScales = threeDGraphScalesFromControls(value, comparison);
      const surfaceHeight = formatNumber(graphScales.surfaceScale, 2);
      const panelScale = formatNumber(graphScales.panelScale, 2);

      return {
        modeLabels: [
          t({ en: "Vector", zh: "向量", zhHans: "向量" }),
          t({ en: "Conic", zh: "圓錐", zhHans: "圆锥" }),
          t({ en: "3D", zh: "立體", zhHans: "立体" })
        ],
        valueLabel: t({ en: "Surface height h", zh: "曲面高度 h", zhHans: "曲面高度 h" }),
        comparisonLabel: t({ en: "Panel height scale", zh: "柱面高度比例", zhHans: "柱面高度比例" }),
        comparisonNote: t({
          en: formatThreeDGraphSummary({ meshResolution: 25, panelScale: graphScales.panelScale, surfaceScale: graphScales.surfaceScale }),
          zh: `三維曲面模型：z = h(1 - x^2 - y^2)；曲面高度 = ${surfaceHeight}，柱面比例 = ${panelScale}，25 x 25 網格。`,
          zhHans: `三维曲面模型：z = h(1 - x^2 - y^2)；曲面高度 = ${surfaceHeight}，柱面比例 = ${panelScale}，25 x 25 网格。`
        })
      };
    }

    if (templateId === "probability-simulation") {
      const state = probabilityState(value, comparison);
      const probabilityPercent = formatNumber(state.probability * 100, 0);
      const probabilityNote = state.probabilityDefined
        ? t({
            en: `P(success) = ${state.success}/${state.trials} = ${formatNumber(state.probability, 2)} = ${probabilityPercent}%.`,
            zh: `P(成功) = ${state.success}/${state.trials} = ${formatNumber(state.probability, 2)} = ${probabilityPercent}%。`,
            zhHans: `P(成功) = ${state.success}/${state.trials} = ${formatNumber(state.probability, 2)} = ${probabilityPercent}%。`
          })
        : t({
            en: "P(success) is not defined until at least one trial is recorded.",
            zh: "至少記錄一次試驗後，P(成功) 才有定義。",
            zhHans: "至少记录一次试验后，P(成功) 才有定义。"
          });

      return {
        modeLabels: [
          t({ en: "Success", zh: "成功", zhHans: "成功" }),
          t({ en: "Failure", zh: "失敗", zhHans: "失败" }),
          t({ en: "Probability", zh: "概率", zhHans: "概率" })
        ],
        valueLabel: t({ en: "Success count", zh: "成功次數", zhHans: "成功次数" }),
        comparisonLabel: t({ en: "Failure count", zh: "失敗次數", zhHans: "失败次数" }),
        comparisonNote: probabilityNote
      };
    }

    if (templateId === "statistics-distribution" && gradeBand !== "secondary") {
      const barA = clamp(Math.round(value), 0, 10);
      const barB = clamp(Math.round(comparison), 0, 9);
      return {
        modeLabels: [
          t({ en: "Bar A", zh: "棒 A", zhHans: "条 A" }),
          t({ en: "Bar B", zh: "棒 B", zhHans: "条 B" }),
          t({ en: "Compare", zh: "比較", zhHans: "比较" })
        ],
        valueLabel: t({ en: "Bar A count", zh: "棒 A 數量", zhHans: "条 A 数量" }),
        comparisonLabel: t({ en: "Bar B count", zh: "棒 B 數量", zhHans: "条 B 数量" }),
        comparisonNote: t({
          en: `Bar chart: A = ${barA}, B = ${barB}; difference = ${Math.abs(barA - barB)}.`,
          zh: `棒形圖：A = ${barA}，B = ${barB}；差值 = ${Math.abs(barA - barB)}。`,
          zhHans: `条形图：A = ${barA}，B = ${barB}；差值 = ${Math.abs(barA - barB)}。`
        })
      };
    }

    if (templateId === "statistics-distribution") {
      const state = statisticsState(value, comparison);
      return {
        modeLabels: [
          t({ en: "Mean", zh: "平均", zhHans: "平均" }),
          t({ en: "Spread", zh: "離散", zhHans: "离散" }),
          t({ en: "Distribution", zh: "分佈", zhHans: "分布" })
        ],
        valueLabel: t({ en: "Mean", zh: "平均數", zhHans: "平均数" }),
        comparisonLabel: t({ en: "Spread", zh: "離散程度", zhHans: "离散程度" }),
        comparisonNote: t({
          en: `Distribution model: mean = ${formatNumber(state.mean, 1)}, spread = ${formatNumber(state.spread, 2)}.`,
          zh: `分佈模型：平均數 = ${formatNumber(state.mean, 1)}，離散程度 = ${formatNumber(state.spread, 2)}。`,
          zhHans: `分布模型：平均数 = ${formatNumber(state.mean, 1)}，离散程度 = ${formatNumber(state.spread, 2)}。`
        })
      };
    }

    if (templateId === "complex-plane") {
      const real = clamp(Math.round(value), -9, 9);
      const imaginary = clamp(Math.round(comparison), -9, 9);

      return {
        modeLabels: [
          t({ en: "z", zh: "z" }),
          t({ en: "Conjugate", zh: "共軛" }),
          t({ en: "i times z", zh: "i 乘 z" })
        ],
        valueLabel: t({ en: "Real part", zh: "實部" }),
        comparisonLabel: t({ en: "Imaginary part", zh: "虛部" }),
        comparisonNote: t({
          en: `Current point: real part = ${real}, imaginary part = ${imaginary}.`,
          zh: `當前點：實部 = ${real}，虛部 = ${imaginary}。`,
          zhHans: `当前点：实部 = ${real}，虚部 = ${imaginary}。`
        })
      };
    }

    if (templateId === "angle-geometry" && gradeBand === "early-primary") {
      const sides = clamp(Math.round(value), 3, 8);
      return {
        modeLabels: [
          t({ en: "Shape", zh: "圖形", zhHans: "图形" }),
          t({ en: "Sides", zh: "邊", zhHans: "边" }),
          t({ en: "Corners", zh: "角", zhHans: "角" })
        ],
        valueLabel: t({ en: "Number of sides", zh: "邊的數目", zhHans: "边的数目" }),
        comparisonLabel: t({ en: "Shape size", zh: "圖形大小", zhHans: "图形大小" }),
        comparisonNote: t({
          en: `This shape has ${sides} sides and ${sides} corners.`,
          zh: `這個圖形有 ${sides} 條邊和 ${sides} 個角。`,
          zhHans: `这个图形有 ${sides} 条边和 ${sides} 个角。`
        })
      };
    }

    if (templateId === "angle-geometry") {
      const state = angleGeometryState(value, comparison);
      return {
        modeLabels: [
          t({ en: "Angle A", zh: "角 A" }),
          t({ en: "Angle B", zh: "角 B" }),
          t({ en: "Compare A/B", zh: "A/B 比較", zhHans: "A/B 比较" })
        ],
        valueLabel: t({ en: "Angle A value", zh: "角 A 數值", zhHans: "角 A 数值" }),
        comparisonLabel: t({ en: "Angle B value", zh: "角 B 數值", zhHans: "角 B 数值" }),
        comparisonNote: t({
          en: `Angle A = ${formatNumber(state.angleA, 0)} deg, Angle B = ${formatNumber(state.angleB, 0)} deg; difference = ${formatNumber(state.difference, 0)} deg.`,
          zh: `角 A = ${formatNumber(state.angleA, 0)} 度，角 B = ${formatNumber(state.angleB, 0)} 度；差值 = ${formatNumber(state.difference, 0)} 度。`,
          zhHans: `角 A = ${formatNumber(state.angleA, 0)} 度，角 B = ${formatNumber(state.angleB, 0)} 度；差值 = ${formatNumber(state.difference, 0)} 度。`
        })
      };
    }

    return {
      modeLabels: [
        t({ en: "Model A", zh: "模型 A" }),
        t({ en: "Model B", zh: "模型 B" }),
        t({ en: "Compare A/B", zh: "A/B 比較", zhHans: "A/B 比较" })
      ],
      valueLabel: t({ en: "Model A value", zh: "模型 A 數值", zhHans: "模型 A 数值" }),
      comparisonLabel: t({ en: "Model B value", zh: "模型 B 數值", zhHans: "模型 B 数值" }),
      comparisonNote: t({
        en: `Compare Model A (${value}) with Model B (${comparison}); difference = ${Math.abs(value - comparison)}.`,
        zh: `比較模型 A（${value}）和模型 B（${comparison}）；差值 = ${Math.abs(value - comparison)}。`,
        zhHans: `比较模型 A（${value}）和模型 B（${comparison}）；差值 = ${Math.abs(value - comparison)}。`
      })
    };
  }, [cappedMode, comparison, coordinateModeCount, gradeBand, mode, modelMode, t, templateId, usesGradeOneSetControls, value]);
  const controlCopy = legacyControlCopy;
  const modeOptions = semanticModel
    ? (activeSemanticControlContract?.modes ?? []).map((semanticMode) => ({
      id: semanticMode.id,
      label: text(semanticMode.label),
      value: semanticMode.value
    }))
    : controlCopy.modeLabels.map((label, index) => ({
      id: `legacy-mode-${index}`,
      label,
      value: index
    }));
  const legacySliderDisplay: { comparison?: string; value?: string } = useMemo(() => {
    if (templateId === "fraction-bar") {
      const state = fractionState(value, comparison);
      return {
        comparison: `${state.numerator}`,
        value: `${state.denominator}`
      };
    }

    if (templateId === "clock-money-data") {
      const state = clockMoneyState(value, comparison);
      return {
        comparison: String(state.minute).padStart(2, "0"),
        value: `${state.hour}`
      };
    }

    if (templateId === "angle-geometry" && gradeBand === "early-primary") {
      return {
        comparison: `${clamp(Math.round(comparison), 0, 10)}`,
        value: `${clamp(Math.round(value), 3, 8)} sides`
      };
    }

    if (templateId === "angle-geometry") {
      const state = angleGeometryState(value, comparison);
      return {
        comparison: `${formatNumber(state.angleB, 0)} deg`,
        value: `${formatNumber(state.angleA, 0)} deg`
      };
    }

    if (templateId === "right-triangle-pythagorean") {
      const state = rightTriangleState(value, comparison);
      return {
        comparison: `b=${state.legB}`,
        value: `a=${state.legA}`
      };
    }

    if (templateId === "statistics-distribution" && gradeBand !== "secondary") {
      return {
        comparison: `${clamp(Math.round(comparison), 0, 9)}`,
        value: `${clamp(Math.round(value), 0, 10)}`
      };
    }

    if (templateId === "statistics-distribution") {
      const state = statisticsState(value, comparison);
      return {
        comparison: formatNumber(state.spread, 2),
        value: formatNumber(state.mean, 1)
      };
    }

    if (templateId === "calculus-rate-area") {
      const state = calculusState(value, comparison);
      return {
        comparison: `x=${formatNumber(state.x0, 2)}`,
        value: `a=${formatNumber(state.a, 2)}`
      };
    }

    if (templateId === "function-graph") {
      const parameters = configuredFunctionParameters(value, comparison, 0);
      return {
        comparison: parameters.shiftDisplay,
        value: parameters.scaleDisplay
      };
    }

    if (templateId === "function-family") {
      const parameters = configuredFunctionParameters(value, comparison, mode);
      return {
        comparison: parameters.shiftDisplay,
        value: parameters.scaleDisplay
      };
    }

    if (templateId === "coordinate-transform") {
      const state = coordinateTransformState(value, comparison, mode);
      return {
        comparison: `${state.dy}`,
        value: mode === 2
          ? formatNumber(state.dilationScale, 2)
          : mode === 1
            ? formatNumber(state.reflectionLineX, 1)
            : `${state.dx}`
      };
    }

    if (templateId === "vector-conic-3d/strategy-map" && gradeBand !== "secondary") {
      return {
        comparison: `h=${clamp(Math.round(comparison), 1, 9)}`,
        value: `r=${clamp(Math.round(value), 1, 9)}`
      };
    }

    if (templateId === "vector-conic-3d/strategy-map") {
      const state = advancedGeometryState(value, comparison);

      if (mode === 0) {
        return {
          comparison: formatNumber(state.vector.componentY, 0),
          value: formatNumber(state.vector.componentX, 0)
        };
      }

      if (mode === 1) {
        return {
          comparison: formatNumber(state.conic.semiMinor, 0),
          value: formatNumber(state.conic.semiMajor, 0)
        };
      }

      const graphScales = threeDGraphScalesFromControls(value, comparison);

      return {
        comparison: `p=${formatNumber(graphScales.panelScale, 2)}`,
        value: `h=${formatNumber(graphScales.surfaceScale, 2)}`
      };
    }

    if (templateId === "complex-plane") {
      return {
        comparison: formatNumber(clamp(Math.round(comparison), -9, 9), 0),
        value: formatNumber(clamp(Math.round(value), -9, 9), 0)
      };
    }

    return {};
  }, [comparison, gradeBand, mode, templateId, value]);
  const sliderDisplay = legacySliderDisplay;
  const legacySliderBounds = useMemo(() => sliderBoundsForThreeDTemplate(templateId), [templateId]);
  const sliderBounds = legacySliderBounds;
  const comparisonDisabled = !semanticModel && templateId === "number-line" && mode === 0 && !usesGradeOneSetControls;
  const showStandardGraphOverlay = !(templateId === "vector-conic-3d/strategy-map" && modelMode === 2 && gradeBand === "secondary");

  function semanticSliderValue(input: ConfiguredVisualizationSemanticSliderInput) {
    if (input === "comparison") return comparison;
    if (input === "height") return semanticHeight;
    return value;
  }

  function setSemanticSliderValue(
    input: ConfiguredVisualizationSemanticSliderInput,
    nextValue: number
  ) {
    if (!Number.isFinite(nextValue)) return;
    if (
      activeSemanticControlContract?.stateDomain.id === "fraction-bar-numerator-v1" &&
      input === "value"
    ) {
      const denominatorMinusOne = snapConfiguredControlValue(nextValue, 1, 9, 1);
      const denominator = denominatorMinusOne + 1;
      // The controller and its affected numerator are committed in one React
      // batch, so lowering d can never leave a hidden numerator that later
      // resurfaces when d grows again.
      setValue(denominatorMinusOne);
      setComparison((current) => snapConfiguredControlValue(current, 0, denominator, 1));
      return;
    }
    if (input === "comparison") {
      setComparison(nextValue);
    } else if (input === "height") {
      setSemanticHeight(nextValue);
    } else {
      setValue(nextValue);
    }
  }

  function applySemanticSliderInitials(
    contract: ConfiguredVisualizationSemanticControlContract | undefined,
    exactTopicId = activeSemanticVariant
  ) {
    if (!contract) return;
    const resetPlan = getConfiguredVisualizationSemanticResetPlan(contract, exactTopicId);
    setValue(resetPlan.value);
    setComparison(resetPlan.comparison);
    setSemanticHeight(resetPlan.height);
  }

  function applySemanticControlContract(
    contract: ConfiguredVisualizationSemanticControlContract | undefined,
    exactTopicId = activeSemanticVariant
  ) {
    if (!contract) return;
    const resetPlan = getConfiguredVisualizationSemanticResetPlan(contract, exactTopicId);
    applySemanticSliderInitials(contract, exactTopicId);
    setMode(resetPlan.mode);
  }

  function semanticSliderDisplay(control: ConfiguredVisualizationSemanticSlider) {
    if (activeSemanticControlContract?.stateDomain.id === "fraction-bar-numerator-v1") {
      return control.id === "value"
        ? `d=${formatNumber(value + 1, 0)}`
        : control.id === "comparison"
          ? `n=${formatNumber(comparison, 0)}`
          : formatNumber(semanticSliderValue(control.id), 0);
    }
    if (
      control.id !== "height" &&
      activeSemanticFamily &&
      supportsConfiguredSemanticSecondaryDisplayProjection(activeSemanticFamily)
    ) {
      const projected = formatConfiguredSemanticSecondaryDisplayValue(
        {
          comparison,
          family: activeSemanticFamily,
          mode: cappedMode,
          value,
          variant: activeSemanticVariant
        },
        control.id
      );
      if (projected) return projected;
    }

    const digits = control.step < 1
      ? Math.min(4, Math.max(1, Math.ceil(-Math.log10(control.step))))
      : 0;
    return formatNumber(semanticSliderValue(control.id), digits);
  }

  function record(type: "visualization-slider" | "visualization-probe" | "visualization-reset") {
    recordLearningEvent({
      type,
      source: lab?.analyticsSource ?? "visualization-lab",
      topicId: lab?.topicId ?? topicId ?? "configured-visualization"
    });
  }

  const surfaceLabel = lab
    ? text(lab.title)
    : t({ en: "Configured visualization lab", zh: "配置化視覺化實驗", zhHans: "配置化可视化实验" });
  const mobilePanHint = t({
    en: "Swipe or use arrow keys to explore the full model",
    zh: "左右滑動或使用方向鍵查看完整模型",
    zhHans: "左右滑动或使用方向键查看完整模型"
  });
  const semanticPrimaryStrings: SemanticPrimaryLocalizedStrings = {
    count: t({ en: "count", zh: "數量", zhHans: "数量" }),
    cubes: t({ en: "unit cubes", zh: "單位立方體", zhHans: "单位立方体" }),
    days: t({ en: "days", zh: "日數", zhHans: "天数" }),
    error: t({ en: "error", zh: "誤差", zhHans: "误差" }),
    estimate: t({ en: "estimate", zh: "估計值", zhHans: "估计值" }),
    expectedValue: t({ en: "expected value", zh: "期望值", zhHans: "期望值" }),
    failures: t({ en: "failures", zh: "失敗", zhHans: "失败" }),
    formula: t({ en: "formula", zh: "算式", zhHans: "算式" }),
    hundredths: t({ en: "hundredths", zh: "百分位", zhHans: "百分位" }),
    layers: t({ en: "layers", zh: "層", zhHans: "层" }),
    measured: t({ en: "measured", zh: "測量值", zhHans: "测量值" }),
    mean: t({ en: "mean", zh: "平均數", zhHans: "平均数" }),
    median: t({ en: "median", zh: "中位數", zhHans: "中位数" }),
    ones: t({ en: "ones", zh: "個位", zhHans: "个位" }),
    range: t({ en: "range", zh: "極差", zhHans: "极差" }),
    remainder: t({ en: "remainder", zh: "餘數", zhHans: "余数" }),
    successes: t({ en: "successes", zh: "成功", zhHans: "成功" }),
    tenths: t({ en: "tenths", zh: "十分位", zhHans: "十分位" }),
    total: t({ en: "total", zh: "總數", zhHans: "总数" }),
    trials: t({ en: "trials", zh: "試驗次數", zhHans: "试验次数" }),
    uniqueOutcomes: t({ en: "unique outcomes", zh: "不同結果", zhHans: "不同结果" })
  };
  const semanticSecondaryStrings: ConfiguredSemanticSecondaryStrings = {
    checkLabel: t({ en: "Check", zh: "驗證", zhHans: "验证" }),
    formulaLabel: t({ en: "Formula", zh: "公式", zhHans: "公式" }),
    locale: language,
    noModelLabel: t({
      en: "Choose a topic strand to show its related model.",
      zh: "請選擇主題分支以顯示相關模型。",
      zhHans: "请选择主题分支以显示相关模型。"
    }),
    strandLabel: t({ en: "Topic strand", zh: "主題分支", zhHans: "主题分支" })
  };
  const statisticsSummaryLabels = {
    mean: t({ en: "mean", zh: "平均數", zhHans: "平均数" }),
    spread: t({ en: "spread", zh: "離散程度", zhHans: "离散程度" })
  };
  const threeDLoadingLabel = t({
    en: "Loading 3D model...",
    zh: "正在載入 3D 模型...",
    zhHans: "正在加载 3D 模型..."
  });
  const threeDRenderPlan = resolveConfiguredThreeDRenderPlan({
    comparison,
    coverageTier: lab?.threeD?.coverageTier,
    explicitFamilyId: lab?.threeD?.familyId,
    labId: lab?.labId,
    mode: modelMode,
    premiumLaunch: lab?.threeD?.premiumLaunch,
    regionalPriority: lab?.threeD?.regionalPriority,
    templateId,
    threeDEnabled: lab?.threeD?.enabled === true,
    value
  });
  // The Exponential model mode on the function-graph lab is a 2D plot
  // exploration (clipped model curve + hover probe), so it presents the SVG
  // surface instead of the 3D scene while active.
  const usesTwoDimensionalModelMode = templateId === "function-graph" && mode === 3;
  const showThreeDCanvas = threeDRenderPlan.showThreeDCanvas && !usesTwoDimensionalModelMode;
  const threeDUsableSurfaceReady = showThreeDCanvas;
  const threeDCanvasRuntimeKey = `${threeDRenderPlan.state.familyId}:${threeDRenderPlan.state.templateId}:${threeDRenderPlan.runtime}`;
  const [threeDCanvasReady, setThreeDCanvasReady] = useState(false);
  useEffect(() => {
    setThreeDCanvasReady(false);
  }, [threeDCanvasRuntimeKey]);
  const configuredMachineState = useMemo(
    () => deriveConfiguredVisualizationMachineState({
      comparison,
      family: activeSemanticFamily,
      height: semanticHeight,
      mode: modelMode,
      strand: activeSemanticStrand?.family,
      topic: configuredTopicId,
      value,
      variant: activeSemanticVariant
    }),
    [
      activeSemanticFamily,
      activeSemanticStrand?.family,
      activeSemanticVariant,
      comparison,
      configuredTopicId,
      modelMode,
      semanticHeight,
      value
    ]
  );
  const publicConfiguredMachineState = useMemo(
    () => projectConfiguredVisualizationPublicMachineState(
      configuredTopicId,
      configuredMachineState
    ),
    [configuredMachineState, configuredTopicId]
  );
  const svgSurface = (
    <ConfiguredSvgSurface
      accent={accent}
      comparison={comparison}
      gradeBand={gradeBand}
      label={surfaceLabel}
      mobilePanHint={mobilePanHint}
      mode={modelMode}
      semanticHeight={semanticHeight}
      semanticCompositeStrands={semanticCompositeStrands}
      semanticModel={semanticModel}
      semanticPrimaryStrings={semanticPrimaryStrings}
      semanticSecondaryStrings={semanticSecondaryStrings}
      statisticsSummaryLabels={statisticsSummaryLabels}
      configuredMachineState={configuredMachineState}
      semanticStrandIndex={semanticStrandIndex}
      showStandardGraphOverlay={showStandardGraphOverlay}
      templateId={templateId}
      titleBadgeLabel={titleBadgeLabel}
      titleBadgeWidth={titleBadgeWidth}
      userPoints={userPoints}
      value={value}
      vizTheme={vizTheme}
    />
  );

  return (
    <div
      className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]"
      data-viz-configured-module={configuredModuleId}
      data-viz-configured-model={templateId}
      data-viz-range-domain-id={activeSemanticControlContract?.stateDomain.id}
      data-viz-configured-state={JSON.stringify(publicConfiguredMachineState)}
      data-viz-configured-topic={configuredTopicId}
      data-viz-mode={visibleMode}
      data-viz-renderer-mode={modelMode}
    >
      <div className={`min-w-0 ${vizTheme.paddedSurfaceClassName}`}>
        {showThreeDCanvas ? (
          <div
            className="relative min-w-0"
            data-viz-three-progressive-surface
            data-viz-three-ready={threeDUsableSurfaceReady ? "true" : "false"}
            data-viz-three-canvas-ready={threeDCanvasReady ? "true" : "false"}
          >
            {!threeDCanvasReady ? (
              <div data-viz-three-progressive-fallback>
                {svgSurface}
              </div>
            ) : null}
            <div
              aria-hidden={threeDCanvasReady ? undefined : true}
              className={threeDCanvasReady ? "min-w-0" : "pointer-events-none absolute inset-0 min-w-0 opacity-0"}
            >
              <ThreeDLabCanvas
                accent={accent}
                coverageTier={threeDRenderPlan.coverageTier}
                fallback={svgSurface}
                label={surfaceLabel}
                onCanvasReady={() => setThreeDCanvasReady(true)}
                premiumLaunch={threeDRenderPlan.premiumLaunch}
                regionalPriority={threeDRenderPlan.regionalPriority}
                runtime={threeDRenderPlan.runtime}
                state={threeDRenderPlan.state}
              />
            </div>
            {!threeDCanvasReady ? (
              <div className="pointer-events-none absolute right-4 top-4 rounded-full border border-cyan-200/75 bg-white/90 px-3 py-1 text-xs font-black text-cyan-800 shadow-sm dark:border-cyan-200/25 dark:bg-slate-950/80 dark:text-cyan-100">
                {threeDLoadingLabel}
              </div>
            ) : null}
          </div>
        ) : (
          svgSurface
        )}
      </div>

      <div className="flex min-w-0 flex-col gap-4">
        {semanticStrandLabels ? (
          <div
            data-viz-strand-grid
            className={`grid gap-2 ${
              semanticStrandLabels.length === 1
                ? "grid-cols-1"
                : "grid-cols-1 min-[360px]:grid-cols-2"
            }`}
          >
            {semanticStrandLabels.map((label, index) => (
              <button
                key={`${label}-${index}`}
                type="button"
                data-viz-strand-button
                data-viz-strand-index={index}
                data-viz-strand-active={String(semanticStrandIndex === index)}
                onClick={() => {
                  const strand = semanticCompositeStrands?.[index];
                  setSemanticStrandIndex(index);
                  applySemanticControlContract(
                    strand
                      ? getConfiguredVisualizationSemanticControlContract(strand.family, strand.variant)
                      : undefined,
                    strand?.variant ?? strand?.family ?? activeSemanticVariant
                  );
                  record("visualization-probe");
                }}
                className={`focus-ring min-h-11 min-w-0 break-words rounded-2xl px-3 py-2.5 text-xs font-black transition [overflow-wrap:anywhere] ${
                  semanticStrandIndex === index
                    ? modeButtonActiveClassNames[index % modeButtonActiveClassNames.length]
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-white/[0.08] dark:text-slate-200"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        ) : null}
        {!semanticModel || modeOptions.length > 1 ? (
          <div
            data-viz-mode-grid
            data-viz-mode-count={modeOptions.length}
            className={`grid gap-2 ${
              modeOptions.length === 1
                ? "grid-cols-1"
                : modeOptions.length === 4
                  ? "grid-cols-1 min-[360px]:grid-cols-2"
                  : "grid-cols-1 min-[360px]:grid-cols-2 min-[768px]:grid-cols-3"
            }`}
          >
            {modeOptions.map((option, index) => (
              <button
                key={option.id}
                type="button"
                data-viz-mode-button
                data-viz-mode={option.value}
                data-viz-mode-id={option.id}
                data-viz-mode-index={index}
                data-viz-mode-value={option.value}
                data-viz-mode-active={String(visibleMode === option.value)}
                onClick={() => {
                  if (activeSemanticFamily === "advanced-strategy") {
                    applySemanticSliderInitials(
                      getConfiguredVisualizationSemanticControlContract(
                        activeSemanticFamily,
                        activeSemanticVariant,
                        option.value
                      )
                    );
                  }
                  setMode(option.value);
                  record("visualization-probe");
                }}
                className={`focus-ring min-h-11 min-w-0 break-words rounded-2xl px-3 py-2.5 text-xs font-black transition [overflow-wrap:anywhere] ${
                  visibleMode === option.value
                    ? modeButtonActiveClassNames[index % modeButtonActiveClassNames.length]
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-white/[0.08] dark:text-slate-200"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        ) : null}

        {templateId === "coordinate-transform" && !semanticModel ? (
          <div className="grid gap-2 rounded-2xl border border-slate-200/80 bg-white/70 p-3 dark:border-white/10 dark:bg-white/[0.06]">
            <div data-viz-coordinate-input-grid className="grid grid-cols-1 gap-2 min-[360px]:grid-cols-2">
              <label className="grid gap-1 text-xs font-black text-slate-600 dark:text-slate-300">
                {t({ en: "Point x", zh: "點 x", zhHans: "点 x" })}
                <input
                  type="number"
                  value={pointDraft.x}
                  onChange={(event) => setPointDraft((draft) => ({ ...draft, x: event.target.value }))}
                  className="focus-ring min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 dark:border-white/10 dark:bg-slate-950 dark:text-slate-100"
                />
              </label>
              <label className="grid gap-1 text-xs font-black text-slate-600 dark:text-slate-300">
                {t({ en: "Point y", zh: "點 y", zhHans: "点 y" })}
                <input
                  type="number"
                  value={pointDraft.y}
                  onChange={(event) => setPointDraft((draft) => ({ ...draft, y: event.target.value }))}
                  className="focus-ring min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 dark:border-white/10 dark:bg-slate-950 dark:text-slate-100"
                />
              </label>
            </div>
            <button
              type="button"
              data-viz-add-point
              onClick={() => {
                const nextX = Number.parseFloat(pointDraft.x);
                const nextY = Number.parseFloat(pointDraft.y);
                const withinRange =
                  Number.isFinite(nextX) && Number.isFinite(nextY) && nextX >= -8 && nextX <= 8 && nextY >= -6 && nextY <= 6;
                if (!withinRange) {
                  // Reject impossible typed coordinates instead of silently
                  // clamping them onto the grid (reported-bug regression
                  // contract for the coordinate lab).
                  setPointError(
                    t({
                      en: "Use x from -8 to 8 and y from -6 to 6.",
                      zh: "請使用 -8 至 8 的 x 和 -6 至 6 的 y。",
                      zhHans: "请使用 -8 至 8 的 x 和 -6 至 6 的 y。"
                    })
                  );
                  return;
                }
                setPointError("");
                setUserPoints((points) => [...points, { x: nextX, y: nextY }]);
                setPointDraft({ x: "", y: "" });
                record("visualization-probe");
              }}
              className="focus-ring min-h-11 w-full rounded-xl bg-slate-950 px-3 py-2 text-sm font-black text-white transition hover:-translate-y-0.5 dark:bg-white dark:text-slate-950"
            >
              {t({ en: "Add point", zh: "加入點", zhHans: "添加点" })}
            </button>
            {pointError ? (
              <p role="alert" data-viz-point-error className="text-xs font-bold text-rose-600 dark:text-rose-300">
                {pointError}
              </p>
            ) : null}
          </div>
        ) : null}

        {semanticModel ? (
          <div
            className="contents"
            data-viz-semantic-control-family={activeSemanticControlContract?.family}
            data-viz-semantic-control-variant={activeSemanticVariant}
            data-viz-semantic-control-mode={cappedMode}
            data-viz-semantic-control-count={activeSemanticControlContract?.sliders.length ?? 0}
            data-viz-range-domain-id={activeSemanticControlContract?.stateDomain.id}
            data-viz-range-domain-version={activeSemanticControlContract?.stateDomain.version}
            data-viz-range-domain-kind={activeSemanticControlContract?.stateDomain.kind}
            data-viz-range-domain-affected-controls={activeSemanticControlContract?.stateDomain.affectedControlIds.join(",")}
            data-viz-range-domain-controller-inputs={activeSemanticControlContract?.stateDomain.controllerInputs.join(",")}
            data-viz-range-domain-projection={activeSemanticControlContract?.stateDomain.projection}
          >
            {(activeSemanticControlContract?.sliders ?? []).map((control) => {
              const isRangeDomainController = activeSemanticControlContract?.stateDomain.controllerInputs.some(
                (controllerInput) => controllerInput === control.id
              ) ?? false;
              const rangeAffects = isRangeDomainController
                ? activeSemanticControlContract?.stateDomain.affectedControlIds.join(",")
                : undefined;
              const isHongKongFractionController =
                activeSemanticControlContract?.stateDomain.id === "fraction-bar-numerator-v1" &&
                control.id === "value";
              return <div
                key={`${activeSemanticControlContract?.family}-${control.id}`}
                data-viz-semantic-slider
                data-viz-semantic-slider-parameter={control.id}
                data-viz-semantic-slider-input={control.id}
                data-viz-semantic-slider-role={control.role}
                data-viz-range-domain-affected={String(
                  activeSemanticControlContract?.stateDomain.affectedControlIds.some(
                    (affectedControlId) => affectedControlId === control.id
                  ) ?? false
                )}
                data-viz-range-affects={rangeAffects}
              >
                <Slider
                  disabled={control.disabled}
                  displayValue={semanticSliderDisplay(control)}
                  label={text(control.label)}
                  min={control.min}
                  max={control.max}
                  parameter={control.id}
                  step={control.step}
                  value={semanticSliderValue(control.id)}
                  rangeAffects={rangeAffects}
                  rangeProjection={isHongKongFractionController ? "clamp-max" : undefined}
                  rangeProjectionReason={isHongKongFractionController ? "numerator-cannot-exceed-denominator" : undefined}
                  onValue={(nextValue) => setSemanticSliderValue(
                    control.id,
                    snapConfiguredControlValue(nextValue, control.min, control.max, control.step)
                  )}
                  onCommit={() => record("visualization-slider")}
                />
              </div>;
            })}
          </div>
        ) : (
          <>
            <div data-viz-parameter="value">
              <Slider
                displayValue={sliderDisplay.value}
                label={controlCopy.valueLabel}
                min={sliderBounds.valueMin}
                max={sliderBounds.valueMax}
                step={1}
                value={value}
                onValue={(nextValue) => setValue(
                  snapConfiguredControlValue(nextValue, sliderBounds.valueMin, sliderBounds.valueMax, 1)
                )}
                onCommit={() => record("visualization-slider")}
              />
            </div>
            <div data-viz-parameter="comparison">
              <Slider
                disabled={comparisonDisabled}
                displayValue={sliderDisplay.comparison}
                label={controlCopy.comparisonLabel}
                min={sliderBounds.comparisonMin}
                max={sliderBounds.comparisonMax}
                step={1}
                value={comparison}
                onValue={(nextValue) => setComparison(
                  snapConfiguredControlValue(nextValue, sliderBounds.comparisonMin, sliderBounds.comparisonMax, 1)
                )}
                onCommit={() => record("visualization-slider")}
              />
            </div>
          </>
        )}
        <button
          type="button"
          data-viz-reset-model
          data-viz-module-id={configuredModuleId}
          data-viz-topic-id={configuredTopicId}
          data-viz-reset-module={configuredModuleId}
          data-viz-reset-module-id={configuredModuleId}
          data-viz-reset-topic={configuredTopicId}
          data-viz-reset-topic-id={configuredTopicId}
          data-viz-reset-value={value}
          data-viz-reset-comparison={comparison}
          data-viz-reset-height={semanticHeight}
          data-viz-reset-mode={cappedMode}
          onClick={() => {
            if (semanticModel) {
              applySemanticControlContract(
                initialSemanticControlContract,
                lab?.labId ?? initialSemanticVariant
              );
            } else {
              setValue(initialValue);
              setComparison(initialComparison);
              setSemanticHeight(initialSemanticHeight);
              setMode(0);
            }
            setSemanticStrandIndex(0);
            setUserPoints([]);
            setPointDraft({ x: "", y: "" });
            setPointError("");
            record("visualization-reset");
          }}
          className="focus-ring min-h-11 w-full rounded-2xl border border-slate-200/80 bg-white px-4 py-3 text-sm font-black text-slate-700 transition hover:-translate-y-0.5 hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.08] dark:text-slate-100 dark:hover:bg-white/[0.12]"
        >
          {t({ en: "Reset model", zh: "重設模型", zhHans: "重置模型" })}
        </button>
        {controlFooterAction ? (
          <div data-viz-lesson-action-slot className="mt-auto pt-4">
            {controlFooterAction}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function ConfiguredVisualizationLabDirect(props: ConfiguredVisualizationLabProps) {
  return <ResolvedConfiguredVisualizationLab {...props} lab={props.lab ?? null} />;
}

export function ConfiguredVisualizationLab({ controlFooterAction, lab: providedLab = null, labId, topicId }: ConfiguredVisualizationLabProps) {
  const lab = useLabFromProps({ lab: providedLab, labId, topicId });

  return (
    <ResolvedConfiguredVisualizationLab
      controlFooterAction={controlFooterAction}
      lab={lab}
      labId={labId}
      topicId={topicId}
    />
  );
}

function ResolvedConfiguredVisualizationLab({
  controlFooterAction,
  lab,
  labId,
  topicId
}: ConfiguredVisualizationLabProps) {
  const { currentUser, recordLearningEvent } = useSettings();
  const configuredTopicId = lab?.labId ?? labId ?? topicId ?? lab?.topicId ?? "configured-visualization";
  const productionRenderer = resolveConfiguredVisualizationProductionRenderer(lab);
  // VisualizationLabPage and the premium direct shell pass labId and already
  // own the one canonical workspace identity. LessonView omits labId, so the
  // configured host supplies that otherwise-missing topic boundary there.
  const ownsActiveLabIdentity = !labId;
  const queuedLessonSessionScopeRef = useRef<string | null>(null);
  const recordLessonSessionFromInteraction = (event: SyntheticEvent<HTMLDivElement>) => {
    if (!ownsActiveLabIdentity || currentUser?.role !== "student") return;
    if (
      event.type === "keyup" &&
      !isConfiguredVisualizationControlKey(
        (event.nativeEvent as Event & { key?: unknown }).key
      )
    ) return;
    const target = event.target;
    if (!(target instanceof Element)) return;
    const control = target.closest<HTMLElement>(
      'button, input, select, textarea, [role="button"], [role="slider"]'
    );
    if (!control || control.closest("[data-viz-lesson-action-slot]")) return;
    if (
      (control instanceof HTMLButtonElement ||
        control instanceof HTMLInputElement ||
        control instanceof HTMLSelectElement ||
        control instanceof HTMLTextAreaElement) &&
      control.disabled
    ) return;
    const record = buildConfiguredVisualizationLessonSessionRecord({
      currentUserId: currentUser.id,
      lab,
      labId,
      queuedAt: Date.now(),
      topicId
    });
    if (!record) return;
    const scopeKey = JSON.stringify([record.userId, record.moduleId, record.topicId]);
    if (queuedLessonSessionScopeRef.current === scopeKey) return;
    try {
      queueVisualizationSessionOutbox(window.localStorage, record);
      queuedLessonSessionScopeRef.current = scopeKey;
      const eventType = control.matches(
        'input[type="range"], [role="slider"], [data-viz-parameter]'
      )
        ? "visualization-slider"
        : control.matches(
            '[data-viz-reset-module-id], [data-viz-reset-topic-id]'
          )
          ? "visualization-reset"
          : "visualization-probe";
      recordLearningEvent({
        type: eventType,
        source: record.source,
        topicId: record.topicId
      });
      window.dispatchEvent(new Event(visualizationSessionOutboxUpdatedEventName));
    } catch {
      // The durable write is the ownership boundary. Leaving the ref unchanged
      // permits the next real control interaction to retry without claiming a
      // session that never reached local storage.
    }
  };

  return (
    <div
      className="min-w-0"
      data-viz-active-lab-id={ownsActiveLabIdentity ? configuredTopicId : undefined}
      data-viz-lesson-session-owner={ownsActiveLabIdentity ? "first-control-interaction" : "external-card"}
      data-viz-module-id={configuredVisualizationModuleId}
      data-viz-production-renderer={productionRenderer}
      data-viz-topic-id={configuredTopicId}
      onKeyUpCapture={recordLessonSessionFromInteraction}
      onPointerUpCapture={recordLessonSessionFromInteraction}
    >
      {productionRenderer === "mainland-multi-digit-operations" && lab ? (
        <MultiDigitOperationsLab
          labId={lab.labId}
          controlFooterAction={controlFooterAction}
        />
      ) : productionRenderer === "mainland-decimal-arithmetic" && lab ? (
        <DecimalArithmeticLab
          lab={lab}
          controlFooterAction={controlFooterAction}
        />
      ) : productionRenderer === "hk-dedicated" && lab ? (
        <HKVisualizationLab lab={lab} controlFooterAction={controlFooterAction} />
      ) : (
        <ConfiguredVisualizationLabSurface
          controlFooterAction={controlFooterAction}
          lab={lab}
          labId={labId}
          topicId={topicId}
        />
      )}
    </div>
  );
}
