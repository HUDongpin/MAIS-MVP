import type { AnimationStep, TimelineState } from "./mathSceneTypes";

function finite(value: number, fallback: number) {
  return Number.isFinite(value) ? value : fallback;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function stepConcept(step: AnimationStep | undefined) {
  if (!step) return "none";
  if (step.type === "highlight") return step.conceptId;
  if (step.type === "cameraTo") return step.shotId;
  if (step.type === "wait") return "wait";
  if (step.type === "moveAlongPath") return step.pathObjectId;
  return step.objectId;
}

function stepTargetObjectId(step: AnimationStep) {
  if (step.type === "revealCurve" || step.type === "moveAlongPath") return step.objectId;
  return null;
}

export function buildTimelineState(
  timeline: AnimationStep[],
  elapsedSeconds: number,
  options: { reducedMotion?: boolean } = {}
): TimelineState {
  const totalDuration = timeline.reduce((sum, step) => sum + Math.max(0, finite(step.duration, 0)), 0);

  if (timeline.length === 0 || totalDuration === 0) {
    return {
      activeConceptId: "none",
      activeStepIndex: -1,
      elapsedSeconds: 0,
      localProgress: 1,
      progress: 1,
      totalDuration
    };
  }

  if (options.reducedMotion) {
    const lastIndex = timeline.length - 1;
    return {
      activeConceptId: stepConcept(timeline[lastIndex]),
      activeStep: timeline[lastIndex],
      activeStepIndex: lastIndex,
      elapsedSeconds: totalDuration,
      localProgress: 1,
      progress: 1,
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
      return {
        activeConceptId: stepConcept(step),
        activeStep: step,
        activeStepIndex: index,
        elapsedSeconds: boundedElapsed,
        localProgress,
        progress: totalDuration === 0 ? 1 : boundedElapsed / totalDuration,
        totalDuration
      };
    }

    elapsedBeforeStep = stepEnd;
  }

  return {
    activeConceptId: stepConcept(timeline[timeline.length - 1]),
    activeStep: timeline[timeline.length - 1],
    activeStepIndex: timeline.length - 1,
    elapsedSeconds: boundedElapsed,
    localProgress: 1,
    progress: 1,
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

  for (const step of timeline) {
    const duration = Math.max(0, finite(step.duration, 0));
    const targetObjectId = stepTargetObjectId(step);
    const stepEnd = elapsedBeforeStep + duration;

    if (targetObjectId === objectId) {
      if (boundedElapsed <= elapsedBeforeStep) return 0;
      if (boundedElapsed >= stepEnd) return 1;
      return duration === 0 ? 1 : clamp((boundedElapsed - elapsedBeforeStep) / duration, 0, 1);
    }

    elapsedBeforeStep = stepEnd;
  }

  return 1;
}
