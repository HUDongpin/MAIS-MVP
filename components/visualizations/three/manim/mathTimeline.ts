import { applyRateFunction, rateFunctionForStep } from "./mathRateFunctions";
import type { AnimationStep, TimelineState } from "./mathSceneTypes";

export const TIMELINE_SOURCE_CONTRACT = "Scene.play/wait->buildTimelineState|timeline beats";
export const TIMELINE_FOCUS_TARGET_POLICY =
  "Scene.play active beat exposes every semantic focus target for FormulaLayer and MathObject coordination" as const;

export type MathTimelineEvidenceInput = {
  reducedMotion?: boolean;
  skipAnimations?: boolean;
  timeline: AnimationStep[];
  timelineState: TimelineState;
};

export type MathTimelineEvidence = {
  activeConceptId: string;
  activeStepIndex: number;
  activeStepType: AnimationStep["type"] | "none";
  cameraStepCount: number;
  completedStepCount: number;
  elapsedSeconds: number;
  focusTargetCount: number;
  focusTargetIds: string;
  focusTargetPolicy: typeof TIMELINE_FOCUS_TARGET_POLICY;
  focusTargetPrimaryId: string;
  focusTargetSummary: string;
  pendingStepCount: number;
  progress: number;
  reducedMotion: boolean;
  skipAnimations: boolean;
  sourceContract: typeof TIMELINE_SOURCE_CONTRACT;
  stepCount: number;
  stepTypeSummary: string;
  summary: string;
  totalDuration: number;
  waitStepCount: number;
};

const orderedTimelineStepTypes: AnimationStep["type"][] = [
  "animationComposition",
  "animateTracker",
  "sweepParameter",
  "revealCurve",
  "revealSurface",
  "fadeInObject",
  "fadeOutObject",
  "growFromCenter",
  "moveAlongPath",
  "transformObject",
  "highlight",
  "cameraTo",
  "wait"
];

function finite(value: number, fallback: number) {
  return Number.isFinite(value) ? value : fallback;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
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

function stepConcept(step: AnimationStep | undefined) {
  if (!step) return "none";
  if (step.type === "animationComposition") return step.compositionId;
  if (step.type === "animateTracker") return step.trackerId;
  if (step.type === "sweepParameter") return step.conceptId ?? step.trackerId;
  if (step.type === "highlight") return step.conceptId;
  if (step.type === "cameraTo") return step.shotId;
  if (step.type === "wait") return "wait";
  if (step.type === "moveAlongPath") return step.pathObjectId;
  return step.objectId;
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

export function timelineFocusTargetIds(step: AnimationStep | undefined): string[] {
  if (!step) return [];

  if (step.type === "animationComposition") return [step.compositionId];
  if (step.type === "animateTracker") return [step.trackerId];
  if (step.type === "sweepParameter") return unique([step.trackerId, step.conceptId ?? "", ...(step.formulaTokenIds ?? [])]);
  if (step.type === "highlight") return [step.conceptId];
  if (step.type === "cameraTo") return [step.shotId];
  if (step.type === "wait") return ["wait"];
  if (step.type === "moveAlongPath") return unique([step.objectId, step.pathObjectId]);
  if (step.type === "transformObject") return unique([step.objectId, step.targetObjectId]);

  return [step.objectId];
}

function summarizeTimelineFocusTargets(step: AnimationStep | undefined) {
  const focusTargetIds = timelineFocusTargetIds(step);
  const ids = focusTargetIds.join(",") || "none";
  const activeStepType = step?.type ?? "none";

  return {
    focusTargetCount: focusTargetIds.length,
    focusTargetIds: ids,
    focusTargetPolicy: TIMELINE_FOCUS_TARGET_POLICY,
    focusTargetPrimaryId: focusTargetIds[0] ?? "none",
    focusTargetSummary: `timelineFocus:active=${activeStepType}:targets=${focusTargetIds.length}:ids=${ids}`
  };
}

function stepTargetObjectId(step: AnimationStep) {
  if (
    step.type === "revealCurve" ||
    step.type === "revealSurface" ||
    step.type === "fadeInObject" ||
    step.type === "fadeOutObject" ||
    step.type === "growFromCenter" ||
    step.type === "moveAlongPath" ||
    step.type === "transformObject"
  ) {
    return step.objectId;
  }
  return null;
}

function timelineTotalDuration(timeline: AnimationStep[]) {
  return timeline.reduce((sum, step) => sum + Math.max(0, finite(step.duration, 0)), 0);
}

function timelineStepTypeSummary(timeline: AnimationStep[]) {
  const counts = Object.fromEntries(orderedTimelineStepTypes.map((type) => [type, 0])) as Record<AnimationStep["type"], number>;

  timeline.forEach((step) => {
    counts[step.type] += 1;
  });

  return orderedTimelineStepTypes
    .filter((type) => counts[type] > 0)
    .map((type) => `${type}=${counts[type]}`)
    .join(";") || "none";
}

function completedTimelineStepCount(timeline: AnimationStep[], elapsedSeconds: number) {
  let cursor = 0;
  let completed = 0;

  for (const step of timeline) {
    cursor += Math.max(0, finite(step.duration, 0));
    if (elapsedSeconds + Number.EPSILON >= cursor) completed += 1;
  }

  return completed;
}

export function buildTimelineEvidence({
  reducedMotion = false,
  skipAnimations = false,
  timeline,
  timelineState
}: MathTimelineEvidenceInput): MathTimelineEvidence {
  const totalDuration = timelineTotalDuration(timeline);
  const elapsedSeconds = clamp(finite(timelineState.elapsedSeconds, 0), 0, totalDuration);
  const stepCount = timeline.length;
  const completedStepCount = completedTimelineStepCount(timeline, elapsedSeconds);
  const activeStepType = timelineState.activeStep?.type ?? "none";
  const activeStepOpen = timelineState.activeStepIndex >= 0 && completedStepCount <= timelineState.activeStepIndex;
  const pendingStepCount = Math.max(0, stepCount - completedStepCount - (activeStepOpen ? 1 : 0));
  const waitStepCount = timeline.filter((step) => step.type === "wait").length;
  const cameraStepCount = timeline.filter((step) => step.type === "cameraTo").length;
  const progress = clamp(finite(timelineState.progress, totalDuration === 0 ? 1 : 0), 0, 1);
  const summary = `timeline:steps=${stepCount}:duration=${totalDuration.toFixed(3)}:elapsed=${elapsedSeconds.toFixed(3)}:active=${activeStepType}#${timelineState.activeStepIndex}:completed=${completedStepCount}:pending=${pendingStepCount}:wait=${waitStepCount}:camera=${cameraStepCount}:reduced=${reducedMotion ? "true" : "false"}:skip=${skipAnimations ? "true" : "false"}`;
  const focusTargetSummary = summarizeTimelineFocusTargets(timelineState.activeStep);

  return {
    activeConceptId: timelineState.activeConceptId,
    activeStepIndex: timelineState.activeStepIndex,
    activeStepType,
    cameraStepCount,
    completedStepCount,
    elapsedSeconds,
    ...focusTargetSummary,
    pendingStepCount,
    progress,
    reducedMotion,
    skipAnimations,
    sourceContract: TIMELINE_SOURCE_CONTRACT,
    stepCount,
    stepTypeSummary: timelineStepTypeSummary(timeline),
    summary,
    totalDuration,
    waitStepCount
  };
}

export function timelineEvidenceDataAttributes(evidence: MathTimelineEvidence) {
  return {
    "data-viz-manim-timeline-active-concept-id": evidence.activeConceptId,
    "data-viz-manim-timeline-active-step-index": String(evidence.activeStepIndex),
    "data-viz-manim-timeline-active-step-type": evidence.activeStepType,
    "data-viz-manim-timeline-camera-step-count": String(evidence.cameraStepCount),
    "data-viz-manim-timeline-completed-step-count": String(evidence.completedStepCount),
    "data-viz-manim-timeline-elapsed-seconds": evidence.elapsedSeconds.toFixed(3),
    "data-viz-manim-timeline-focus-target-count": String(evidence.focusTargetCount),
    "data-viz-manim-timeline-focus-target-ids": evidence.focusTargetIds,
    "data-viz-manim-timeline-focus-target-policy": evidence.focusTargetPolicy,
    "data-viz-manim-timeline-focus-target-primary-id": evidence.focusTargetPrimaryId,
    "data-viz-manim-timeline-focus-target-summary": evidence.focusTargetSummary,
    "data-viz-manim-timeline-pending-step-count": String(evidence.pendingStepCount),
    "data-viz-manim-timeline-progress": evidence.progress.toFixed(3),
    "data-viz-manim-timeline-reduced-motion": evidence.reducedMotion ? "true" : "false",
    "data-viz-manim-timeline-skip-animations": evidence.skipAnimations ? "true" : "false",
    "data-viz-manim-timeline-source-contract": evidence.sourceContract,
    "data-viz-manim-timeline-step-count": String(evidence.stepCount),
    "data-viz-manim-timeline-step-type-summary": evidence.stepTypeSummary,
    "data-viz-manim-timeline-summary": evidence.summary,
    "data-viz-manim-timeline-total-duration": evidence.totalDuration.toFixed(3),
    "data-viz-manim-timeline-wait-step-count": String(evidence.waitStepCount)
  } as const;
}

export function serializeTimelineEvidence(evidence: MathTimelineEvidence) {
  return stableSerialize(evidence);
}

export function buildTimelineState(
  timeline: AnimationStep[],
  elapsedSeconds: number,
  options: { reducedMotion?: boolean } = {}
): TimelineState {
  const totalDuration = timelineTotalDuration(timeline);

  if (timeline.length === 0 || totalDuration === 0) {
    return {
      activeConceptId: "none",
      activeStepIndex: -1,
      easedLocalProgress: 1,
      elapsedSeconds: 0,
      localProgress: 1,
      progress: 1,
      rateFunction: "linear",
      totalDuration
    };
  }

  if (options.reducedMotion) {
    const lastIndex = timeline.length - 1;
    return {
      activeConceptId: stepConcept(timeline[lastIndex]),
      activeStep: timeline[lastIndex],
      activeStepIndex: lastIndex,
      easedLocalProgress: 1,
      elapsedSeconds: totalDuration,
      localProgress: 1,
      progress: 1,
      rateFunction: rateFunctionForStep(timeline[lastIndex]),
      totalDuration
    };
  }

  const boundedElapsed = clamp(finite(elapsedSeconds, 0), 0, totalDuration);
  let elapsedBeforeStep = 0;

  for (let index = 0; index < timeline.length; index += 1) {
    const step = timeline[index];
    const duration = Math.max(0, finite(step.duration, 0));
    const stepEnd = elapsedBeforeStep + duration;

    if (boundedElapsed <= stepEnd || index === timeline.length - 1) {
      const localProgress = duration === 0 ? 1 : clamp((boundedElapsed - elapsedBeforeStep) / duration, 0, 1);
      const rateFunction = rateFunctionForStep(step);
      return {
        activeConceptId: stepConcept(step),
        activeStep: step,
        activeStepIndex: index,
        easedLocalProgress: applyRateFunction(rateFunction, localProgress),
        elapsedSeconds: boundedElapsed,
        localProgress,
        progress: totalDuration === 0 ? 1 : boundedElapsed / totalDuration,
        rateFunction,
        totalDuration
      };
    }

    elapsedBeforeStep = stepEnd;
  }

  return {
    activeConceptId: stepConcept(timeline[timeline.length - 1]),
    activeStep: timeline[timeline.length - 1],
    activeStepIndex: timeline.length - 1,
    easedLocalProgress: 1,
    elapsedSeconds: boundedElapsed,
    localProgress: 1,
    progress: 1,
    rateFunction: rateFunctionForStep(timeline[timeline.length - 1]),
    totalDuration
  };
}

export function timelineObjectProgress(
  timeline: AnimationStep[],
  elapsedSeconds: number,
  objectId: string,
  options: { reducedMotion?: boolean } = {}
) {
  if (options.reducedMotion) return 1;

  const totalDuration = timeline.reduce((sum, step) => sum + Math.max(0, finite(step.duration, 0)), 0);
  const boundedElapsed = clamp(finite(elapsedSeconds, 0), 0, totalDuration);
  let elapsedBeforeStep = 0;
  let latestCompletedProgress: number | undefined;

  for (const step of timeline) {
    const duration = Math.max(0, finite(step.duration, 0));
    const targetObjectId = stepTargetObjectId(step);
    const stepEnd = elapsedBeforeStep + duration;

    if (targetObjectId === objectId) {
      if (boundedElapsed <= elapsedBeforeStep) return latestCompletedProgress ?? 0;
      if (boundedElapsed >= stepEnd) {
        latestCompletedProgress = 1;
        elapsedBeforeStep = stepEnd;
        continue;
      }
      return duration === 0 ? 1 : applyRateFunction(rateFunctionForStep(step), clamp((boundedElapsed - elapsedBeforeStep) / duration, 0, 1));
    }

    elapsedBeforeStep = stepEnd;
  }

  return latestCompletedProgress ?? 1;
}
