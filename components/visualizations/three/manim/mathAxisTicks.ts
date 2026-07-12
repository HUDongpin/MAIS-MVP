import { createCoordinateSystem3D } from "./mathCoordinateSystem3D";
import type { AxisRangeSpec, MathObjectSpec, MathSceneSpec, Vec3 } from "./mathSceneTypes";

export type AxisName = "x" | "y" | "z";

export type AxisTick = {
  axis: AxisName;
  axisObjectId: string;
  conceptId: string;
  index: number;
  label: string;
  major: boolean;
  mathValue: number;
  worldPosition: Vec3;
};

export type AxisLabelAnchor = {
  axis: AxisName;
  axisObjectId: string;
  conceptId: string;
  index: number;
  label: string;
  labelWorldPosition: Vec3;
  mathValue: number;
  offsetVector: Vec3;
  tickWorldPosition: Vec3;
};

export type AxisTickPlan = {
  axisSpacingByAxis: Partial<Record<AxisName, number>>;
  axisObjectCount: number;
  finiteTickCount: number;
  finiteLabelAnchorCount: number;
  labelAnchorCount: number;
  labelAnchorSummary: string;
  labelAnchors: AxisLabelAnchor[];
  labelCount: number;
  majorTickCount: number;
  sceneId: string;
  spacingMaxDelta: number;
  spacingSummary: string;
  tickCount: number;
  ticks: AxisTick[];
};

const AXES: AxisName[] = ["x", "y", "z"];
const LABEL_OFFSET_WORLD = 0.18;

function stableValue(value: unknown): unknown {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (Array.isArray(value)) return value.map((entry) => stableValue(entry) ?? null);
  if (!value || typeof value !== "object") return value;

  const stableObject: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value).sort(([left], [right]) => left.localeCompare(right))) {
    if (entry !== undefined) stableObject[key] = stableValue(entry);
  }

  return stableObject;
}

function stableSerialize(value: unknown) {
  return JSON.stringify(stableValue(value))
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

function finite(value: number, fallback: number) {
  return Number.isFinite(value) ? value : fallback;
}

function lerp(start: number, end: number, progress: number) {
  return start + (end - start) * progress;
}

function normalizeZero(value: number) {
  return Math.abs(value) < 1e-9 ? 0 : value;
}

function normalizeEvidenceNumber(value: number) {
  return normalizeZero(Number.isFinite(value) ? value : 0);
}

function formatEvidenceNumber(value: number, digits: number) {
  return normalizeEvidenceNumber(value).toFixed(digits);
}

function distance3d(left: Vec3, right: Vec3) {
  return Math.hypot(right[0] - left[0], right[1] - left[1], right[2] - left[2]);
}

function addVec3(left: Vec3, right: Vec3): Vec3 {
  return [left[0] + right[0], left[1] + right[1], left[2] + right[2]];
}

function axisRange(range: AxisRangeSpec, axis: AxisName): [number, number] {
  return range[axis];
}

function safeAxisRange(axisObjectRange: AxisRangeSpec, coordinateSpaceRange: AxisRangeSpec, axis: AxisName): [number, number] {
  const objectRange = axisRange(axisObjectRange, axis);
  const fallbackRange = axisRange(coordinateSpaceRange, axis);
  const start = finite(objectRange[0], fallbackRange[0]);
  const end = finite(objectRange[1], fallbackRange[1]);

  return start === end ? [start - 1, end + 1] : [start, end];
}

function formatTickLabel(value: number) {
  const safeValue = normalizeZero(value);
  const fixed = Math.abs(safeValue) >= 100 ? safeValue.toFixed(0) : safeValue.toFixed(3);

  return fixed.replace(/\.?0+$/, "") || "0";
}

function conceptLabelKey(label: string) {
  return label.replace(/-/g, "neg").replace(/\./g, "p");
}

function axisMathPoint(axis: AxisName, value: number): Vec3 {
  if (axis === "x") return [value, 0, 0];
  if (axis === "y") return [0, value, 0];

  return [0, 0, value];
}

function axisLabelOffset(axis: AxisName): Vec3 {
  if (axis === "x") return [0, -LABEL_OFFSET_WORLD, 0];
  if (axis === "y") return [-LABEL_OFFSET_WORLD, 0, 0];

  return [0, LABEL_OFFSET_WORLD, 0];
}

function isAxisObject(object: MathObjectSpec): object is Extract<MathObjectSpec, { type: "axis3d" }> {
  return object.type === "axis3d";
}

function buildTicksForAxis({
  axis,
  axisObject,
  coordinateSpace,
  targetTicksPerAxis
}: {
  axis: AxisName;
  axisObject: Extract<MathObjectSpec, { type: "axis3d" }>;
  coordinateSpace: MathSceneSpec["coordinateSpace"];
  targetTicksPerAxis: number;
}): AxisTick[] {
  const coordinateSystem = createCoordinateSystem3D(coordinateSpace);
  const range = safeAxisRange(axisObject.range, coordinateSpace.mathRange, axis);
  const tickCount = Math.max(2, Math.min(21, Math.floor(finite(targetTicksPerAxis, 5))));
  const conceptBase = axisObject.conceptId ?? axisObject.id;

  return Array.from({ length: tickCount }, (_, index) => {
    const progress = index / Math.max(1, tickCount - 1);
    const mathValue = normalizeZero(lerp(range[0], range[1], progress));
    const label = formatTickLabel(mathValue);
    const worldPosition = coordinateSystem.c2p(...axisMathPoint(axis, mathValue));

    return {
      axis,
      axisObjectId: axisObject.id,
      conceptId: `${conceptBase}:${axis}:${conceptLabelKey(label)}`,
      index,
      label,
      major: index === 0 || index === tickCount - 1 || mathValue === 0,
      mathValue,
      worldPosition
    };
  });
}

export function summarizeAxisTickPlan(plan: AxisTickPlan) {
  return `axes:${plan.sceneId}:axisObjects=${plan.axisObjectCount}:ticks=${plan.tickCount}:labels=${plan.labelCount}:finite=${plan.finiteTickCount}`;
}

function summarizeAxisLabelAnchorFields({
  labelAnchors,
  sceneId
}: {
  labelAnchors: AxisLabelAnchor[];
  sceneId: string;
}) {
  const finiteAnchors = labelAnchors.filter((anchor) =>
    anchor.tickWorldPosition.every(Number.isFinite) &&
    anchor.labelWorldPosition.every(Number.isFinite) &&
    anchor.offsetVector.every(Number.isFinite)
  );
  const axes = AXES.filter((axis) => labelAnchors.some((anchor) => anchor.axis === axis));
  const offset = finiteAnchors.length > 0
    ? distance3d(finiteAnchors[0].tickWorldPosition, finiteAnchors[0].labelWorldPosition)
    : 0;

  return `axisLabelAnchors:${sceneId}:count=${labelAnchors.length}:finite=${finiteAnchors.length}:offset=${formatEvidenceNumber(offset, 3)}:axes=${axes.length > 0 ? axes.join(",") : "none"}`;
}

export function summarizeAxisLabelAnchors(plan: AxisTickPlan) {
  return plan.labelAnchorSummary;
}

function summarizeAxisTickSpacingFields({
  axisSpacingByAxis,
  majorTickCount,
  sceneId,
  spacingMaxDelta
}: {
  axisSpacingByAxis: Partial<Record<AxisName, number>>;
  majorTickCount: number;
  sceneId: string;
  spacingMaxDelta: number;
}) {
  const spacingParts = AXES.flatMap((axis) => {
    const spacing = axisSpacingByAxis[axis];

    return Number.isFinite(spacing) ? [`${axis}=${formatEvidenceNumber(spacing ?? 0, 3)}`] : [];
  });
  const spacingSummary = spacingParts.length > 0 ? spacingParts.join(",") : "none";

  return `axisSpacing:${sceneId}:${spacingSummary}:maxDelta=${formatEvidenceNumber(spacingMaxDelta, 6)}:major=${majorTickCount}`;
}

export function summarizeAxisTickSpacing(plan: AxisTickPlan) {
  return plan.spacingSummary;
}

export function serializeAxisTickPlan(plan: AxisTickPlan) {
  return stableSerialize({
    ...plan,
    labelAnchorSummary: summarizeAxisLabelAnchors(plan),
    spacingSummary: summarizeAxisTickSpacing(plan),
    summary: summarizeAxisTickPlan(plan)
  });
}

export function buildAxisTickPlan(scene: MathSceneSpec, options: { targetTicksPerAxis?: number } = {}): AxisTickPlan {
  const axisObjects = scene.objects.filter(isAxisObject);
  const targetTicksPerAxis = options.targetTicksPerAxis ?? 5;
  const ticks = axisObjects.flatMap((axisObject) =>
    AXES.flatMap((axis) =>
      buildTicksForAxis({
        axis,
        axisObject,
        coordinateSpace: scene.coordinateSpace,
        targetTicksPerAxis
      })
    )
  );
  const labelCount = ticks.filter((tick) => tick.label.length > 0).length;
  const finiteTickCount = ticks.filter((tick) => Number.isFinite(tick.mathValue) && tick.worldPosition.every(Number.isFinite)).length;
  const labelAnchors = ticks
    .filter((tick) => tick.label.length > 0)
    .map((tick) => {
      const offsetVector = axisLabelOffset(tick.axis);

      return {
        axis: tick.axis,
        axisObjectId: tick.axisObjectId,
        conceptId: tick.conceptId,
        index: tick.index,
        label: tick.label,
        labelWorldPosition: addVec3(tick.worldPosition, offsetVector),
        mathValue: tick.mathValue,
        offsetVector,
        tickWorldPosition: tick.worldPosition
      };
    });
  const finiteLabelAnchorCount = labelAnchors.filter((anchor) =>
    Number.isFinite(anchor.mathValue) &&
    anchor.tickWorldPosition.every(Number.isFinite) &&
    anchor.labelWorldPosition.every(Number.isFinite) &&
    anchor.offsetVector.every(Number.isFinite)
  ).length;
  const labelAnchorCount = labelAnchors.length;
  const labelAnchorSummary = summarizeAxisLabelAnchorFields({ labelAnchors, sceneId: scene.sceneId });
  const majorTickCount = ticks.filter((tick) => tick.major).length;
  const spacingsByAxis: Record<AxisName, number[]> = { x: [], y: [], z: [] };
  let spacingMaxDelta = 0;

  for (const axisObject of axisObjects) {
    for (const axis of AXES) {
      const axisTicks = ticks
        .filter((tick) => tick.axisObjectId === axisObject.id && tick.axis === axis)
        .sort((left, right) => left.index - right.index);
      const intervals = axisTicks.slice(1).map((tick, index) => distance3d(axisTicks[index].worldPosition, tick.worldPosition));
      const finiteIntervals = intervals.filter(Number.isFinite);

      if (finiteIntervals.length === 0) continue;

      const baseInterval = finiteIntervals[0];
      spacingsByAxis[axis].push(baseInterval);
      spacingMaxDelta = Math.max(
        spacingMaxDelta,
        ...finiteIntervals.map((interval) => Math.abs(interval - baseInterval))
      );
    }
  }

  const axisSpacingByAxis = Object.fromEntries(
    AXES.flatMap((axis) => {
      const spacings = spacingsByAxis[axis];

      return spacings.length > 0
        ? [[axis, normalizeEvidenceNumber(spacings.reduce((total, spacing) => total + spacing, 0) / spacings.length)]]
        : [];
    })
  ) as Partial<Record<AxisName, number>>;
  const normalizedSpacingMaxDelta = normalizeEvidenceNumber(spacingMaxDelta);
  const spacingSummary = summarizeAxisTickSpacingFields({
    axisSpacingByAxis,
    majorTickCount,
    sceneId: scene.sceneId,
    spacingMaxDelta: normalizedSpacingMaxDelta
  });

  return {
    axisSpacingByAxis,
    axisObjectCount: axisObjects.length,
    finiteTickCount,
    finiteLabelAnchorCount,
    labelAnchorCount,
    labelAnchorSummary,
    labelAnchors,
    labelCount,
    majorTickCount,
    sceneId: scene.sceneId,
    spacingMaxDelta: normalizedSpacingMaxDelta,
    spacingSummary,
    tickCount: ticks.length,
    ticks
  };
}

export function axisTickPlanDataAttributes(plan: AxisTickPlan) {
  return {
    "data-viz-manim-axis-finite-tick-count": String(plan.finiteTickCount),
    "data-viz-manim-axis-label-anchor-count": String(plan.labelAnchorCount),
    "data-viz-manim-axis-label-anchor-finite-count": String(plan.finiteLabelAnchorCount),
    "data-viz-manim-axis-label-anchor-summary": summarizeAxisLabelAnchors(plan),
    "data-viz-manim-axis-label-count": String(plan.labelCount),
    "data-viz-manim-axis-major-tick-count": String(plan.majorTickCount),
    "data-viz-manim-axis-object-count": String(plan.axisObjectCount),
    "data-viz-manim-axis-spacing-max-delta": formatEvidenceNumber(plan.spacingMaxDelta, 6),
    "data-viz-manim-axis-spacing-summary": summarizeAxisTickSpacing(plan),
    "data-viz-manim-axis-summary": summarizeAxisTickPlan(plan),
    "data-viz-manim-axis-tick-count": String(plan.tickCount)
  };
}
