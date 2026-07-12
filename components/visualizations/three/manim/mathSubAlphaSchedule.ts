import type { MathAnimationRuntimeFrame, MathAnimationRuntimeNodeFrame } from "./mathAnimationRuntime";
import {
  TRANSFORM_FAMILY_ALIGNMENT_ZIP_POLICY,
  type TransformFamilyAlignmentPlan
} from "./mathTransformFamilyAlignment";

export const SUB_ALPHA_SOURCE_CONTRACT =
  "Animation.interpolate_mobject(...): per-family sub-alpha is computed from lag_ratio, then rate_func maps it before interpolation";

export const SUB_ALPHA_WINDOW_POLICY = "raw-alpha-to-lagged-sub-alpha-to-eased-sub-alpha";

export type MathSubAlphaSchedule = {
  activePlanCount: number;
  completeNodeCount: number;
  delayedNodeCount: number;
  easedMax: number;
  easedMin: number;
  easedRange: string;
  familyZipCoveredNodeCount: number;
  familyZipMissingNodeCount: number;
  familyZipPolicy: typeof TRANSFORM_FAMILY_ALIGNMENT_ZIP_POLICY;
  familyZipSequence: string;
  familyZipTupleCount: number;
  familyZipUncoveredObjectIds: string;
  laggedMax: number;
  laggedMin: number;
  laggedRange: string;
  leadingNodeCount: number;
  nodeFrameCount: number;
  nodeWindowSummary: string;
  objectIds: string;
  partialNodeCount: number;
  rateFunctionIds: string;
  rawMax: number;
  rawMin: number;
  rawRange: string;
  sceneId: string;
  sourceContract: typeof SUB_ALPHA_SOURCE_CONTRACT;
  staggeredNodeCount: number;
  summary: string;
  windowPolicy: typeof SUB_ALPHA_WINDOW_POLICY;
  zeroNodeCount: number;
};

const EPSILON = 1e-6;

function finite(value: number, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}

function stableNumber(value: number) {
  return Number(finite(value, 0).toFixed(6));
}

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

function formatNumber(value: number) {
  return stableNumber(value).toFixed(3);
}

function rangeString(min: number, max: number) {
  return `${formatNumber(min)}..${formatNumber(max)}`;
}

function valuesRange(values: number[]) {
  if (values.length === 0) return { max: 0, min: 0, range: "0.000..0.000" };

  const safeValues = values.map((value) => stableNumber(value));
  const min = stableNumber(Math.min(...safeValues));
  const max = stableNumber(Math.max(...safeValues));

  return { max, min, range: rangeString(min, max) };
}

function uniqueJoined(values: string[]) {
  return [...new Set(values.filter(Boolean))].join(",") || "none";
}

function familyZipRows(plan: TransformFamilyAlignmentPlan | undefined) {
  return plan?.entries.map((entry) => ({
    mobjectId: entry.interpolationObjectId,
    startingMobjectId: entry.sourceId ?? `ghost-source:${entry.targetId ?? entry.interpolationObjectId}`,
    targetCopyObjectId: entry.targetId ?? `ghost-target:${entry.sourceId ?? entry.interpolationObjectId}`
  })) ?? [];
}

function familyZipSequence(plan: TransformFamilyAlignmentPlan | undefined) {
  return familyZipRows(plan)
    .map((row) => `${row.mobjectId}|${row.startingMobjectId}|${row.targetCopyObjectId}`)
    .join(";") || "none";
}

function familyZipCoverage(
  nodeFrames: MathAnimationRuntimeNodeFrame[],
  familyAlignment: TransformFamilyAlignmentPlan | undefined
) {
  const tupleObjectIds = new Set(familyZipRows(familyAlignment).map((row) => row.mobjectId));
  const uncoveredObjectIds = nodeFrames
    .filter((nodeFrame) => !tupleObjectIds.has(nodeFrame.objectId))
    .map((nodeFrame) => nodeFrame.objectId);

  return {
    coveredNodeCount: nodeFrames.length - uncoveredObjectIds.length,
    missingNodeCount: uncoveredObjectIds.length,
    sequence: familyZipSequence(familyAlignment),
    tupleCount: tupleObjectIds.size,
    uncoveredObjectIds: uniqueJoined(uncoveredObjectIds)
  };
}

function buildNodeWindowSummary(nodeFrames: MathAnimationRuntimeNodeFrame[]) {
  return nodeFrames
    .map((nodeFrame) => [
      `${nodeFrame.objectId}:raw=${formatNumber(nodeFrame.rawProgress)}`,
      `lagged=${formatNumber(nodeFrame.laggedProgress)}`,
      `eased=${formatNumber(nodeFrame.progress)}`
    ].join(">"))
    .join(";") || "none";
}

function isStaggered(frame: MathAnimationRuntimeNodeFrame) {
  return Math.abs(frame.laggedProgress - frame.rawProgress) > EPSILON;
}

function isLeading(frame: MathAnimationRuntimeNodeFrame) {
  return frame.laggedProgress > frame.rawProgress + EPSILON;
}

function isDelayed(frame: MathAnimationRuntimeNodeFrame) {
  return frame.laggedProgress < frame.rawProgress - EPSILON;
}

function isZero(frame: MathAnimationRuntimeNodeFrame) {
  return frame.progress <= EPSILON;
}

function isComplete(frame: MathAnimationRuntimeNodeFrame) {
  return frame.progress >= 1 - EPSILON;
}

export function summarizeSubAlphaSchedule(schedule: Omit<MathSubAlphaSchedule, "summary"> | MathSubAlphaSchedule) {
  return [
    `subAlpha:${schedule.sceneId}`,
    `nodes=${schedule.nodeFrameCount}`,
    `plans=${schedule.activePlanCount}`,
    `raw=${schedule.rawRange}`,
    `lag=${schedule.laggedRange}`,
    `eased=${schedule.easedRange}`,
    `staggered=${schedule.staggeredNodeCount}`,
    `lead=${schedule.leadingNodeCount}`,
    `delay=${schedule.delayedNodeCount}`,
    `zero=${schedule.zeroNodeCount}`,
    `partial=${schedule.partialNodeCount}`,
    `complete=${schedule.completeNodeCount}`,
    `rates=${schedule.rateFunctionIds}`,
    `objects=${schedule.objectIds}`
  ].join(":");
}

// Manim source contract:
// Animation.interpolate_mobject loops over family tuples, computes a per-family
// sub-alpha from lag_ratio, then applies rate_func before interpolation.
export function buildSubAlphaSchedule(input: {
  familyAlignment?: TransformFamilyAlignmentPlan;
  frame: MathAnimationRuntimeFrame;
  sceneId: string;
}): MathSubAlphaSchedule {
  const nodeFrames = input.frame.nodeFrames;
  const raw = valuesRange(nodeFrames.map((nodeFrame) => nodeFrame.rawProgress));
  const lagged = valuesRange(nodeFrames.map((nodeFrame) => nodeFrame.laggedProgress));
  const eased = valuesRange(nodeFrames.map((nodeFrame) => nodeFrame.progress));
  const zeroNodeCount = nodeFrames.filter(isZero).length;
  const completeNodeCount = nodeFrames.filter(isComplete).length;
  const zipCoverage = familyZipCoverage(nodeFrames, input.familyAlignment);
  const scheduleWithoutSummary: Omit<MathSubAlphaSchedule, "summary"> = {
    activePlanCount: input.frame.activePlanIds.length,
    completeNodeCount,
    delayedNodeCount: nodeFrames.filter(isDelayed).length,
    easedMax: eased.max,
    easedMin: eased.min,
    easedRange: eased.range,
    familyZipCoveredNodeCount: zipCoverage.coveredNodeCount,
    familyZipMissingNodeCount: zipCoverage.missingNodeCount,
    familyZipPolicy: TRANSFORM_FAMILY_ALIGNMENT_ZIP_POLICY,
    familyZipSequence: zipCoverage.sequence,
    familyZipTupleCount: zipCoverage.tupleCount,
    familyZipUncoveredObjectIds: zipCoverage.uncoveredObjectIds,
    laggedMax: lagged.max,
    laggedMin: lagged.min,
    laggedRange: lagged.range,
    leadingNodeCount: nodeFrames.filter(isLeading).length,
    nodeFrameCount: nodeFrames.length,
    nodeWindowSummary: buildNodeWindowSummary(nodeFrames),
    objectIds: uniqueJoined(nodeFrames.map((nodeFrame) => nodeFrame.objectId)),
    partialNodeCount: nodeFrames.length - zeroNodeCount - completeNodeCount,
    rateFunctionIds: uniqueJoined(nodeFrames.map((nodeFrame) => nodeFrame.rateFunction)),
    rawMax: raw.max,
    rawMin: raw.min,
    rawRange: raw.range,
    sceneId: input.sceneId,
    sourceContract: SUB_ALPHA_SOURCE_CONTRACT,
    staggeredNodeCount: nodeFrames.filter(isStaggered).length,
    windowPolicy: SUB_ALPHA_WINDOW_POLICY,
    zeroNodeCount
  };

  return {
    ...scheduleWithoutSummary,
    summary: summarizeSubAlphaSchedule(scheduleWithoutSummary)
  };
}

export function subAlphaScheduleDataAttributes(schedule: MathSubAlphaSchedule): Record<string, string> {
  return {
    "data-viz-manim-sub-alpha-active-plan-count": String(schedule.activePlanCount),
    "data-viz-manim-sub-alpha-complete-node-count": String(schedule.completeNodeCount),
    "data-viz-manim-sub-alpha-delayed-node-count": String(schedule.delayedNodeCount),
    "data-viz-manim-sub-alpha-eased-max": formatNumber(schedule.easedMax),
    "data-viz-manim-sub-alpha-eased-min": formatNumber(schedule.easedMin),
    "data-viz-manim-sub-alpha-eased-range": schedule.easedRange,
    "data-viz-manim-sub-alpha-family-zip-covered-node-count": String(schedule.familyZipCoveredNodeCount),
    "data-viz-manim-sub-alpha-family-zip-missing-node-count": String(schedule.familyZipMissingNodeCount),
    "data-viz-manim-sub-alpha-family-zip-policy": schedule.familyZipPolicy,
    "data-viz-manim-sub-alpha-family-zip-sequence": schedule.familyZipSequence,
    "data-viz-manim-sub-alpha-family-zip-tuple-count": String(schedule.familyZipTupleCount),
    "data-viz-manim-sub-alpha-family-zip-uncovered-object-ids": schedule.familyZipUncoveredObjectIds,
    "data-viz-manim-sub-alpha-lagged-max": formatNumber(schedule.laggedMax),
    "data-viz-manim-sub-alpha-lagged-min": formatNumber(schedule.laggedMin),
    "data-viz-manim-sub-alpha-lagged-range": schedule.laggedRange,
    "data-viz-manim-sub-alpha-leading-node-count": String(schedule.leadingNodeCount),
    "data-viz-manim-sub-alpha-node-window-summary": schedule.nodeWindowSummary,
    "data-viz-manim-sub-alpha-node-count": String(schedule.nodeFrameCount),
    "data-viz-manim-sub-alpha-object-ids": schedule.objectIds,
    "data-viz-manim-sub-alpha-partial-node-count": String(schedule.partialNodeCount),
    "data-viz-manim-sub-alpha-rate-function-ids": schedule.rateFunctionIds,
    "data-viz-manim-sub-alpha-raw-max": formatNumber(schedule.rawMax),
    "data-viz-manim-sub-alpha-raw-min": formatNumber(schedule.rawMin),
    "data-viz-manim-sub-alpha-raw-range": schedule.rawRange,
    "data-viz-manim-sub-alpha-source-contract": schedule.sourceContract,
    "data-viz-manim-sub-alpha-staggered-node-count": String(schedule.staggeredNodeCount),
    "data-viz-manim-sub-alpha-summary": schedule.summary,
    "data-viz-manim-sub-alpha-window-policy": schedule.windowPolicy,
    "data-viz-manim-sub-alpha-zero-node-count": String(schedule.zeroNodeCount)
  };
}

export function serializeSubAlphaSchedule(schedule: MathSubAlphaSchedule) {
  return stableSerialize(schedule);
}
