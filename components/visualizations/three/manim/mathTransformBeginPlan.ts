import type { MathAnimatePlan } from "./mathAnimationBuilder";
import { buildMobjectFamilyIndex, mobjectFamilyIds } from "./mathMobjectFamily";
import { becomeMobjectState } from "./mathMobjectState";
import type { MathSceneRuntimeState } from "./mathSceneRuntimeState";
import type { MathSceneSpec } from "./mathSceneTypes";
import {
  buildRuntimeTransformDataLockPlan,
  summarizeTransformDataLockPlan,
  type TransformDataLockPlan
} from "./mathTransformDataLock";
import {
  buildTransformFamilyAlignment,
  summarizeTransformFamilyAlignment,
  type TransformFamilyAlignmentEntry
} from "./mathTransformFamilyAlignment";

export const TRANSFORM_BEGIN_SOURCE_POLICY =
  "transform-begin-creates-target-aligns-source-target-family-and-locks-matching-render-data" as const;

export type MathTransformBeginAlignmentPayload = {
  alignedPointPairCount: number;
  enteringCount: number;
  entryCount: number;
  exitingCount: number;
  familyPairIds: string[];
  familyPairSummary: string;
  matchedCount: number;
  maxDepth: number;
  typeMismatchCount: number;
};

export type MathTransformBeginDataLockPayload = {
  alignmentSummary: string;
  entryCount: number;
  kindSummary: string;
  lockedObjectIds: string[];
  lockedPointCount: number;
  lockSummary: string;
  movingObjectIds: string[];
  movingPointCount: number;
  totalPointCount: number;
};

export type MathTransformBeginPlan = {
  alignment: MathTransformBeginAlignmentPayload;
  animationPlanId: string;
  dataLocks: MathTransformBeginDataLockPayload;
  objectId: string;
  signature: string;
  sourcePolicy: typeof TRANSFORM_BEGIN_SOURCE_POLICY;
  sourceFamilyIds: string[];
  targetCreated: boolean;
  targetFamilyIds: string[];
  targetObjectId: string;
};

function stableSerialize(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => `${JSON.stringify(key)}:${stableSerialize(entry)}`)
      .join(",")}}`;
  }

  return JSON.stringify(value);
}

function hashStableJson(value: string) {
  let hash = 0x811c9dc5;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }

  return `transform-begin-${hash.toString(16).padStart(8, "0")}`;
}

function escapedJson(value: string) {
  return value.replace(/</g, "\\u003c");
}

function uniqueSorted(ids: string[]) {
  return [...new Set(ids)].sort((left, right) => left.localeCompare(right));
}

function lockForEntry(entry: TransformFamilyAlignmentEntry): TransformDataLockPlan | null {
  if (entry.kind !== "matched" || !entry.sourceId || !entry.targetId || !entry.sourceRenderState || !entry.targetRenderState) {
    return null;
  }

  return buildRuntimeTransformDataLockPlan({
    objectId: entry.sourceId,
    sourceRenderState: entry.sourceRenderState,
    targetObjectId: entry.targetId,
    targetRenderState: entry.targetRenderState
  });
}

function summarizeDataLocks(lockPlans: TransformDataLockPlan[]): MathTransformBeginDataLockPayload {
  const kindSummary = Object.entries(
    lockPlans.reduce<Record<string, number>>((counts, entry) => {
      counts[entry.kind] = (counts[entry.kind] ?? 0) + 1;
      return counts;
    }, {})
  )
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([kind, count]) => `${kind}=${count}`)
    .join(",") || "none";

  return {
    alignmentSummary: uniqueSorted(lockPlans.map((entry) => entry.sourceSummary ?? "none").filter((summary) => summary !== "none")).join(",") || "none",
    entryCount: lockPlans.length,
    kindSummary,
    lockedObjectIds: uniqueSorted(lockPlans.filter((entry) => entry.lockedPointCount > 0).map((entry) => entry.objectId)),
    lockedPointCount: lockPlans.reduce((sum, entry) => sum + entry.lockedPointCount, 0),
    lockSummary: lockPlans.map(summarizeTransformDataLockPlan).join("|") || "none",
    movingObjectIds: uniqueSorted(lockPlans.filter((entry) => entry.movingPointCount > 0).map((entry) => entry.objectId)),
    movingPointCount: lockPlans.reduce((sum, entry) => sum + entry.movingPointCount, 0),
    totalPointCount: lockPlans.reduce((sum, entry) => sum + entry.totalPointCount, 0)
  };
}

function familyPairIdsForAlignment(entries: TransformFamilyAlignmentEntry[]) {
  return entries
    .filter((entry) => entry.kind === "matched" && entry.sourceId && entry.targetId)
    .map((entry) => `${entry.sourceId}->${entry.targetId}`);
}

export function summarizeMathTransformBeginPlan(plan: MathTransformBeginPlan) {
  return [
    `transform-begin:plan=${plan.animationPlanId}`,
    `object=${plan.objectId}`,
    `target=${plan.targetObjectId}`,
    `aligned=${plan.alignment.entryCount}`,
    `matched=${plan.alignment.matchedCount}`,
    `pairs=${plan.alignment.familyPairIds.length}`,
    `pointPairs=${plan.alignment.alignedPointPairCount}`,
    `locked=${plan.dataLocks.lockedPointCount}`,
    `moving=${plan.dataLocks.movingPointCount}`
  ].join(":");
}

export function buildMathTransformBeginPlan(
  _scene: MathSceneSpec,
  runtimeState: MathSceneRuntimeState,
  plan: MathAnimatePlan
): MathTransformBeginPlan {
  const sourceFamilyIds = mobjectFamilyIds(buildMobjectFamilyIndex(runtimeState.objectGraph), plan.objectId);
  const targetGraph = becomeMobjectState(runtimeState.objectGraph, plan.objectId, plan.target);
  const alignment = buildTransformFamilyAlignment(runtimeState.objectGraph, plan.objectId, targetGraph, plan.objectId);
  const alignmentSummary = summarizeTransformFamilyAlignment(alignment);
  const lockPlans = alignment.entries.flatMap((entry) => {
    const lock = lockForEntry(entry);
    return lock ? [lock] : [];
  });
  const dataLocks = summarizeDataLocks(lockPlans);
  const familyPairIds = familyPairIdsForAlignment(alignment.entries);
  const basePlan = {
    alignment: {
      ...alignmentSummary,
      alignedPointPairCount: dataLocks.totalPointCount,
      entryCount: alignment.entries.length,
      familyPairIds,
      familyPairSummary: familyPairIds.join("|") || "none"
    },
    animationPlanId: plan.id,
    dataLocks,
    objectId: plan.objectId,
    sourcePolicy: TRANSFORM_BEGIN_SOURCE_POLICY,
    sourceFamilyIds,
    targetCreated: Object.keys(plan.target.nodes).length > 0,
    targetFamilyIds: plan.target.familyIds,
    targetObjectId: plan.targetObjectId
  };

  return {
    ...basePlan,
    signature: hashStableJson(stableSerialize(basePlan))
  };
}

export function serializeMathTransformBeginPlan(plan: MathTransformBeginPlan) {
  return escapedJson(stableSerialize(plan));
}

export function transformBeginPlanDataAttributes(plan: MathTransformBeginPlan) {
  return {
    "data-viz-manim-transform-begin-aligned-entry-count": String(plan.alignment.entryCount),
    "data-viz-manim-transform-begin-aligned-point-pair-count": String(plan.alignment.alignedPointPairCount),
    "data-viz-manim-transform-begin-data-lock-count": String(plan.dataLocks.entryCount),
    "data-viz-manim-transform-begin-data-lock-alignment-summary": plan.dataLocks.alignmentSummary,
    "data-viz-manim-transform-begin-data-lock-kind-summary": plan.dataLocks.kindSummary,
    "data-viz-manim-transform-begin-data-lock-summary": plan.dataLocks.lockSummary,
    "data-viz-manim-transform-begin-entering-count": String(plan.alignment.enteringCount),
    "data-viz-manim-transform-begin-exiting-count": String(plan.alignment.exitingCount),
    "data-viz-manim-transform-begin-family-pair-ids": plan.alignment.familyPairIds.join(",") || "none",
    "data-viz-manim-transform-begin-family-pair-summary": plan.alignment.familyPairSummary,
    "data-viz-manim-transform-begin-locked-object-ids": plan.dataLocks.lockedObjectIds.join(",") || "none",
    "data-viz-manim-transform-begin-locked-point-count": String(plan.dataLocks.lockedPointCount),
    "data-viz-manim-transform-begin-matched-count": String(plan.alignment.matchedCount),
    "data-viz-manim-transform-begin-max-depth": String(plan.alignment.maxDepth),
    "data-viz-manim-transform-begin-moving-object-ids": plan.dataLocks.movingObjectIds.join(",") || "none",
    "data-viz-manim-transform-begin-moving-point-count": String(plan.dataLocks.movingPointCount),
    "data-viz-manim-transform-begin-object-id": plan.objectId,
    "data-viz-manim-transform-begin-plan-id": plan.animationPlanId,
    "data-viz-manim-transform-begin-signature": plan.signature,
    "data-viz-manim-transform-begin-source-family-ids": plan.sourceFamilyIds.join(",") || "none",
    "data-viz-manim-transform-begin-source-policy": plan.sourcePolicy,
    "data-viz-manim-transform-begin-summary": summarizeMathTransformBeginPlan(plan),
    "data-viz-manim-transform-begin-target-created": String(plan.targetCreated),
    "data-viz-manim-transform-begin-target-family-ids": plan.targetFamilyIds.join(",") || "none",
    "data-viz-manim-transform-begin-target-id": plan.targetObjectId,
    "data-viz-manim-transform-begin-total-point-count": String(plan.dataLocks.totalPointCount),
    "data-viz-manim-transform-begin-type-mismatch-count": String(plan.alignment.typeMismatchCount)
  };
}
