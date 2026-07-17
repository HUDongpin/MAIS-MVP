import { applyRateFunction, rateFunctionForStep } from "./mathRateFunctions";
import { buildTimelineState, timelineObjectProgress } from "./mathTimeline";
import type { MathObjectSpec, MathSceneParameterSpec, MathSceneSpec, MathSceneValueTrackerSpec } from "./mathSceneTypes";

export const VALUE_TRACKER_SOURCE_CONTRACT =
  "ValueTracker hidden mobject|uniform value/normalizedValue|set_value/increment_value|animateTracker/sweepParameter timeline interpolation" as const;

export type MathValueTrackerSource = "object" | "parameter" | "timeline" | "value";

export type MathValueTrackerRole = MathSceneParameterSpec["role"] | "progress" | "time" | "value";

export type MathValueTracker = {
  conceptId?: string;
  hiddenMobjectId: string;
  id: string;
  label?: string;
  max?: number;
  min?: number;
  normalizedValue: number;
  role: MathValueTrackerRole;
  source: MathValueTrackerSource;
  sourceContract: typeof VALUE_TRACKER_SOURCE_CONTRACT;
  uniforms: {
    normalizedValue: number;
    value: number;
  };
  value: number;
};

export type MathTrackerRegistry = {
  byId: Record<string, MathValueTracker>;
  sourceContract?: typeof VALUE_TRACKER_SOURCE_CONTRACT;
};

type ValueTrackerInput = {
  conceptId?: string;
  id: string;
  label?: string;
  max?: number;
  min?: number;
  role: MathValueTrackerRole;
  source: MathValueTrackerSource;
  value: number;
};

function finiteNumber(value: number, fallback: number) {
  return Number.isFinite(value) ? value : fallback;
}

function clamp(value: number, min?: number, max?: number) {
  const lower = min ?? -Infinity;
  const upper = max ?? Infinity;
  return Math.min(upper, Math.max(lower, value));
}

function normalizedValue(value: number, min?: number, max?: number) {
  if (min === undefined || max === undefined || !Number.isFinite(min) || !Number.isFinite(max) || max === min) {
    return 0;
  }

  return clamp((value - min) / (max - min), 0, 1);
}

export function buildValueTracker(input: ValueTrackerInput): MathValueTracker {
  const fallback = input.min ?? 0;
  const value = clamp(finiteNumber(input.value, fallback), input.min, input.max);
  const normalized = normalizedValue(value, input.min, input.max);

  return {
    conceptId: input.conceptId,
    hiddenMobjectId: `tracker:${input.id}`,
    id: input.id,
    label: input.label,
    max: input.max,
    min: input.min,
    normalizedValue: normalized,
    role: input.role,
    source: input.source,
    sourceContract: VALUE_TRACKER_SOURCE_CONTRACT,
    uniforms: {
      normalizedValue: normalized,
      value
    },
    value
  };
}

export function setValueTracker(tracker: MathValueTracker, value: number): MathValueTracker {
  return buildValueTracker({
    conceptId: tracker.conceptId,
    id: tracker.id,
    label: tracker.label,
    max: tracker.max,
    min: tracker.min,
    role: tracker.role,
    source: tracker.source,
    value
  });
}

export function incrementValueTracker(tracker: MathValueTracker, delta: number): MathValueTracker {
  return setValueTracker(tracker, tracker.value + finiteNumber(delta, 0));
}

export function interpolateValueTracker(start: MathValueTracker, target: MathValueTracker, alpha: number): MathValueTracker {
  const progress = clamp(finiteNumber(alpha, 0), 0, 1);
  const value = start.value + (target.value - start.value) * progress;

  return buildValueTracker({
    conceptId: target.conceptId ?? start.conceptId,
    id: target.id,
    label: target.label ?? start.label,
    max: target.max ?? start.max,
    min: target.min ?? start.min,
    role: target.role,
    source: target.source,
    value
  });
}

function animatedObjectIds(objects: MathObjectSpec[], timeline: MathSceneSpec["timeline"]) {
  const objectIds = new Set<string>();

  objects.forEach((object) => {
    if (object.type === "parametricCurve" || object.type === "movingPoint" || object.type === "parametricSurface") {
      objectIds.add(object.id);
    }
  });

  timeline.forEach((step) => {
    if (
      step.type === "revealCurve" ||
      step.type === "revealSurface" ||
      step.type === "fadeInObject" ||
      step.type === "fadeOutObject" ||
      step.type === "growFromCenter" ||
      step.type === "moveAlongPath" ||
      step.type === "transformObject"
    ) {
      objectIds.add(step.objectId);
    }
  });

  return objectIds;
}

function parameterTrackers(parameters: MathSceneParameterSpec[] = []) {
  return parameters.map((parameter) =>
    buildValueTracker({
      conceptId: parameter.conceptId,
      id: `parameter:${parameter.id}`,
      label: parameter.label,
      max: parameter.max,
      min: parameter.min,
      role: parameter.role,
      source: "parameter",
      value: parameter.value
    })
  );
}

function valueTrackers(valueTrackerSpecs: MathSceneValueTrackerSpec[] = []) {
  return valueTrackerSpecs.map((tracker) =>
    buildValueTracker({
      conceptId: tracker.conceptId,
      id: tracker.id,
      label: tracker.label,
      max: tracker.max,
      min: tracker.min,
      role: "value",
      source: "value",
      value: tracker.value
    })
  );
}

function trackerTarget(start: MathValueTracker, targetValue: number) {
  return buildValueTracker({
    conceptId: start.conceptId,
    id: start.id,
    label: start.label,
    max: start.max,
    min: start.min,
    role: start.role,
    source: start.source,
    value: targetValue
  });
}

function trackerWithValue(start: MathValueTracker, value: number, conceptId = start.conceptId) {
  return buildValueTracker({
    conceptId,
    id: start.id,
    label: start.label,
    max: start.max,
    min: start.min,
    role: start.role,
    source: start.source,
    value
  });
}

function animatedTrackerEntries(
  entries: MathValueTracker[],
  timeline: MathSceneSpec["timeline"],
  elapsedSeconds: number,
  options: { reducedMotion?: boolean } = {}
) {
  const byId = Object.fromEntries(entries.map((tracker) => [tracker.id, tracker]));
  const timelineState = buildTimelineState(timeline, elapsedSeconds, options);
  let elapsedBeforeStep = 0;

  timeline.forEach((step) => {
    const duration = Math.max(0, finiteNumber(step.duration, 0));
    const stepEnd = elapsedBeforeStep + duration;

    if (step.type === "animateTracker" || step.type === "sweepParameter") {
      const startTracker = byId[step.trackerId];
      if (startTracker) {
        const sweepConceptId = step.type === "sweepParameter" ? step.conceptId : undefined;
        const sweepStartTracker = step.type === "sweepParameter" && step.fromValue !== undefined
          ? trackerWithValue(startTracker, step.fromValue, sweepConceptId ?? startTracker.conceptId)
          : trackerWithValue(startTracker, startTracker.value, sweepConceptId ?? startTracker.conceptId);
        const targetTracker = trackerTarget(sweepStartTracker, step.targetValue);

        if (timelineState.elapsedSeconds >= stepEnd || options.reducedMotion) {
          byId[step.trackerId] = targetTracker;
        } else if (timelineState.elapsedSeconds > elapsedBeforeStep) {
          const localProgress = duration === 0 ? 1 : clamp((timelineState.elapsedSeconds - elapsedBeforeStep) / duration, 0, 1);
          byId[step.trackerId] = interpolateValueTracker(
            sweepStartTracker,
            targetTracker,
            applyRateFunction(rateFunctionForStep(step), localProgress)
          );
        }
      }
    }

    elapsedBeforeStep = stepEnd;
  });

  return entries.map((tracker) => byId[tracker.id] ?? tracker);
}

export function buildSceneValueTrackers(
  scene: MathSceneSpec,
  elapsedSeconds: number,
  options: { reducedMotion?: boolean } = {}
): MathTrackerRegistry {
  const timeline = buildTimelineState(scene.timeline, elapsedSeconds, options);
  const entries: MathValueTracker[] = [
    buildValueTracker({
      id: "timeline",
      label: "Timeline time",
      max: timeline.totalDuration,
      min: 0,
      role: "time",
      source: "timeline",
      value: timeline.elapsedSeconds
    }),
    buildValueTracker({
      id: "timeline:progress",
      label: "Timeline progress",
      max: 1,
      min: 0,
      role: "progress",
      source: "timeline",
      value: timeline.progress
    }),
    ...parameterTrackers(scene.parameters),
    ...valueTrackers(scene.valueTrackers)
  ];
  const trackerEntries = animatedTrackerEntries(entries, scene.timeline, elapsedSeconds, options);

  animatedObjectIds(scene.objects, scene.timeline).forEach((objectId) => {
    trackerEntries.push(
      buildValueTracker({
        id: `${objectId}:progress`,
        label: `${objectId} progress`,
        max: 1,
        min: 0,
        role: "progress",
        source: "object",
        value: timelineObjectProgress(scene.timeline, elapsedSeconds, objectId, options)
      })
    );
  });

  return {
    byId: Object.fromEntries(trackerEntries.map((tracker) => [tracker.id, tracker])),
    sourceContract: VALUE_TRACKER_SOURCE_CONTRACT
  };
}
