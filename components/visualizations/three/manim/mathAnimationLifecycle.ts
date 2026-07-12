import type { MathAnimatePlan } from "./mathAnimationBuilder";
import { buildMobjectFamilyIndex } from "./mathMobjectFamily";
import { buildMobjectCopyPlan } from "./mathMobjectCopyPlan";
import { becomeMobjectState, saveMobjectState } from "./mathMobjectState";
import { rateFunctionForStep, type MathRateFunctionName } from "./mathRateFunctions";
import { pointsForRuntimeRenderState } from "./mathRuntimeRenderState";
import type { MathSceneRuntimeState, RuntimeRenderState } from "./mathSceneRuntimeState";
import type { MathSceneSpec } from "./mathSceneTypes";
import { buildUpdaterSuspensionPlan } from "./mathUpdaterSuspension";

export const ANIMATION_LIFECYCLE_BEGIN_SOURCE_POLICY =
  "animation-begin-copies-starting-mobject-suspends-updaters-gathers-family-tuples-and-interpolates-zero" as const;

export const ANIMATION_LIFECYCLE_SOURCE_CONTRACT =
  "Animation.begin|interpolate(0)|progress_through_animations|finish_animations" as const;

export type MathAnimationLifecycleBeginPayload = {
  animatingStatus: "none" | "started";
  copiedNodeCount: number;
  copyRootId: string;
  initialInterpolationAlpha: 0;
  initialInterpolationCallCount: 0 | 1;
  snapshotNodeCount: number;
  sourcePolicy: typeof ANIMATION_LIFECYCLE_BEGIN_SOURCE_POLICY;
  startsAtProgress: 0;
  suspendedUpdaterCount: number;
  suspendedUpdaterIds: string[];
  updaterSuspensionPhase: "animation" | "open";
};

export type MathAnimationLifecycleFinishPayload = {
  animatingStatus: "finished" | "none";
  colorRoleCount: number;
  finalInterpolationAlpha: 1;
  finalInterpolationCallCount: 0 | 1;
  finishesAtProgress: 1;
  persistentNodeCount: number;
  persistentObjectIds: string[];
  renderDataNodeCount: number;
  targetNodeCount: number;
};

export type MathAnimationLifecycleTimingPayload = {
  frameCountAt60Fps: number;
  lagRatio: number;
  rateFunction: MathRateFunctionName;
  runTimeSeconds: number;
  sampleAlphas: [0, 0.5, 1];
};

export type MathAnimationLifecyclePlan = {
  animationPlanId: string;
  begin: MathAnimationLifecycleBeginPayload;
  familyTupleCount: number;
  finish: MathAnimationLifecycleFinishPayload;
  objectId: string;
  signature: string;
  sourceContract: typeof ANIMATION_LIFECYCLE_SOURCE_CONTRACT;
  sourceFamilyIds: string[];
  targetFamilyIds: string[];
  targetObjectId: string;
  timing: MathAnimationLifecycleTimingPayload;
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

  return `animation-lifecycle-${hash.toString(16).padStart(8, "0")}`;
}

function escapedJson(value: string) {
  return value.replace(/</g, "\\u003c");
}

function renderStateHasData(renderState: RuntimeRenderState) {
  return pointsForRuntimeRenderState(renderState).length > 0;
}

function stableNumber(value: number, fallback = 0) {
  return Number((Number.isFinite(value) ? value : fallback).toFixed(6));
}

function timingPayload(plan: MathAnimatePlan): MathAnimationLifecycleTimingPayload {
  const runTimeSeconds = Math.max(0, stableNumber(plan.step.duration));

  return {
    frameCountAt60Fps: Math.ceil(runTimeSeconds * 60),
    lagRatio: Math.max(0, stableNumber(plan.step.lagRatio ?? 0)),
    rateFunction: rateFunctionForStep(plan.step),
    runTimeSeconds,
    sampleAlphas: [0, 0.5, 1]
  };
}

function familyTupleCount(sourceFamilyIds: string[], targetFamilyIds: string[], targetNodes: Record<string, unknown>) {
  const targetFamilySet = new Set(targetFamilyIds);
  return sourceFamilyIds.filter((objectId) => targetFamilySet.has(objectId) && Boolean(targetNodes[objectId])).length;
}

export function summarizeMathAnimationLifecyclePlan(plan: MathAnimationLifecyclePlan) {
  return [
    `animation-lifecycle:plan=${plan.animationPlanId}`,
    `object=${plan.objectId}`,
    `target=${plan.targetObjectId}`,
    `familyTuples=${plan.familyTupleCount}`,
    `begin=${plan.begin.snapshotNodeCount}`,
    `finish=${plan.finish.persistentNodeCount}`,
    `suspended=${plan.begin.suspendedUpdaterCount}`,
    `timing=${plan.timing.runTimeSeconds.toFixed(3)}`,
    `${plan.timing.rateFunction}`,
    `lag=${plan.timing.lagRatio.toFixed(3)}`,
    `frames=${plan.timing.frameCountAt60Fps}`
  ].join(":");
}

export function buildMathAnimationLifecyclePlan(
  scene: MathSceneSpec,
  runtimeState: MathSceneRuntimeState,
  plan: MathAnimatePlan
): MathAnimationLifecyclePlan {
  const beginSnapshot = saveMobjectState(runtimeState.objectGraph, plan.objectId);
  const beginCopyPlan = buildMobjectCopyPlan(runtimeState.objectGraph, plan.objectId, {
    copySuffix: ":animation-begin-copy"
  });
  const updaterSuspensionPlan = buildUpdaterSuspensionPlan({
    familyIndex: buildMobjectFamilyIndex(runtimeState.objectGraph),
    scene,
    timeline: runtimeState.timeline,
    updaters: runtimeState.updaters
  });
  const finishedGraph = becomeMobjectState(runtimeState.objectGraph, plan.objectId, plan.target);
  const finishSnapshot = saveMobjectState(finishedGraph, plan.objectId);
  const finishNodes = Object.values(finishSnapshot.nodes);
  const basePlan = {
    animationPlanId: plan.id,
    begin: {
      animatingStatus: "started" as const,
      copiedNodeCount: beginCopyPlan.copiedFamilyCount,
      copyRootId: beginCopyPlan.copyRootId,
      initialInterpolationAlpha: 0 as const,
      initialInterpolationCallCount: 1 as const,
      snapshotNodeCount: Object.keys(beginSnapshot.nodes).length,
      sourcePolicy: ANIMATION_LIFECYCLE_BEGIN_SOURCE_POLICY,
      startsAtProgress: 0 as const,
      suspendedUpdaterCount: updaterSuspensionPlan.suspendedUpdaterIds.length,
      suspendedUpdaterIds: updaterSuspensionPlan.suspendedUpdaterIds,
      updaterSuspensionPhase: updaterSuspensionPlan.phase
    },
    familyTupleCount: familyTupleCount(beginSnapshot.familyIds, plan.target.familyIds, plan.target.nodes),
    finish: {
      animatingStatus: "finished" as const,
      colorRoleCount: finishNodes.filter((node) => Boolean(node.colorRole)).length,
      finalInterpolationAlpha: 1 as const,
      finalInterpolationCallCount: 1 as const,
      finishesAtProgress: 1 as const,
      persistentNodeCount: finishNodes.length,
      persistentObjectIds: finishSnapshot.familyIds,
      renderDataNodeCount: finishNodes.filter((node) => renderStateHasData(node.renderState)).length,
      targetNodeCount: Object.keys(plan.target.nodes).length
    },
    objectId: plan.objectId,
    sourceContract: ANIMATION_LIFECYCLE_SOURCE_CONTRACT,
    sourceFamilyIds: beginSnapshot.familyIds,
    targetFamilyIds: plan.target.familyIds,
    targetObjectId: plan.targetObjectId,
    timing: timingPayload(plan)
  };

  return {
    ...basePlan,
    signature: hashStableJson(stableSerialize(basePlan))
  };
}

export function serializeMathAnimationLifecyclePlan(plan: MathAnimationLifecyclePlan) {
  return escapedJson(stableSerialize(plan));
}

export function animationLifecycleDataAttributes(plan: MathAnimationLifecyclePlan) {
  return {
    "data-viz-manim-animation-lifecycle-animating-status": plan.begin.animatingStatus,
    "data-viz-manim-animation-lifecycle-begin-node-count": String(plan.begin.snapshotNodeCount),
    "data-viz-manim-animation-lifecycle-begin-source-policy": plan.begin.sourcePolicy,
    "data-viz-manim-animation-lifecycle-copied-node-count": String(plan.begin.copiedNodeCount),
    "data-viz-manim-animation-lifecycle-family-tuple-count": String(plan.familyTupleCount),
    "data-viz-manim-animation-lifecycle-final-alpha": plan.finish.finalInterpolationAlpha.toFixed(3),
    "data-viz-manim-animation-lifecycle-final-interpolate-count": String(plan.finish.finalInterpolationCallCount),
    "data-viz-manim-animation-lifecycle-finish-animating-status": plan.finish.animatingStatus,
    "data-viz-manim-animation-lifecycle-finish-color-role-count": String(plan.finish.colorRoleCount),
    "data-viz-manim-animation-lifecycle-finish-node-count": String(plan.finish.targetNodeCount),
    "data-viz-manim-animation-lifecycle-initial-alpha": plan.begin.initialInterpolationAlpha.toFixed(3),
    "data-viz-manim-animation-lifecycle-initial-interpolate-count": String(plan.begin.initialInterpolationCallCount),
    "data-viz-manim-animation-lifecycle-object-id": plan.objectId,
    "data-viz-manim-animation-lifecycle-persistent-node-count": String(plan.finish.persistentNodeCount),
    "data-viz-manim-animation-lifecycle-plan-id": plan.animationPlanId,
    "data-viz-manim-animation-lifecycle-signature": plan.signature,
    "data-viz-manim-animation-lifecycle-source-contract": plan.sourceContract,
    "data-viz-manim-animation-lifecycle-summary": summarizeMathAnimationLifecyclePlan(plan),
    "data-viz-manim-animation-lifecycle-suspended-updater-count": String(plan.begin.suspendedUpdaterCount),
    "data-viz-manim-animation-lifecycle-timing-frame-count": String(plan.timing.frameCountAt60Fps),
    "data-viz-manim-animation-lifecycle-timing-lag-ratio": plan.timing.lagRatio.toFixed(3),
    "data-viz-manim-animation-lifecycle-timing-rate-function": plan.timing.rateFunction,
    "data-viz-manim-animation-lifecycle-timing-run-time": plan.timing.runTimeSeconds.toFixed(3),
    "data-viz-manim-animation-lifecycle-target-id": plan.targetObjectId
  };
}
