import type { MathSceneAnimatePlanSpec, MathSceneAnimationCompositionSpec, MathSceneSpec } from "./mathSceneTypes";
import { applyRateFunction, type MathRateFunctionName } from "./mathRateFunctions";

export type AnimationCompositionWindow = {
  animationPlanId: string;
  durationSeconds: number;
  endSeconds: number;
  index: number;
  startSeconds: number;
};

export type AnimationCompositionTimingPolicy =
  | "parallel-shared-start"
  | "recursive-lag-ratio-child-duration"
  | "succession-chained-child-duration";

export type MathAnimationCompositionPlan = {
  durationSeconds: number;
  id: string;
  issues: string[];
  naturalDurationSeconds: number;
  rateFunction: MathRateFunctionName;
  timingPolicy: AnimationCompositionTimingPolicy;
  type: MathSceneAnimationCompositionSpec["type"];
  windows: AnimationCompositionWindow[];
};

export type AnimationCompositionActiveWindow = AnimationCompositionWindow & {
  localProgress: number;
};

export type AnimationCompositionFrame = {
  activeWindows: AnimationCompositionActiveWindow[];
  completedAnimationPlanIds: string[];
  elapsedSeconds: number;
  pendingAnimationPlanIds: string[];
  progress: number;
};

export type AnimationCompositionSummary = {
  compositionCount: number;
  compositionDurationSeconds: number;
  compositionModes: MathSceneAnimationCompositionSpec["type"][];
  issueCount: number;
  windowCount: number;
};

export const ANIMATION_COMPOSITION_FRAME_SOURCE_CONTRACT =
  "Scene.play(*animations)->AnimationGroup/LaggedStart/Succession windows";

export type AnimationCompositionFrameEvidenceInput = {
  activeCompositionId?: string;
  elapsedSeconds?: number;
  plans: MathAnimationCompositionPlan[];
};

export type AnimationCompositionFrameEvidence = {
  activeCompositionId: string;
  activeCompositionType: MathSceneAnimationCompositionSpec["type"] | "none";
  activeWindowCount: number;
  activeWindowIds: string;
  completedWindowCount: number;
  completedWindowIds: string;
  compositionCount: number;
  elapsedSeconds: number;
  pendingWindowCount: number;
  pendingWindowIds: string;
  progress: number;
  sourceContract: typeof ANIMATION_COMPOSITION_FRAME_SOURCE_CONTRACT;
  summary: string;
  timingPolicy: AnimationCompositionTimingPolicy | "none";
  windowSummary: string;
};

function finite(value: number | undefined, fallback: number) {
  return Number.isFinite(value) ? value! : fallback;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
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

function durationFor(plan: Pick<MathSceneAnimatePlanSpec, "duration">) {
  return Math.max(0, stableNumber(plan.duration));
}

function planLookup(animationPlans: MathSceneAnimatePlanSpec[]) {
  return new Map(animationPlans.map((plan) => [plan.id, plan]));
}

function compactModes(plans: MathAnimationCompositionPlan[]) {
  return [...new Set(plans.map((plan) => plan.type))].sort((left, right) => left.localeCompare(right));
}

function joinedIds(values: string[]) {
  return values.join(",") || "none";
}

function formatNumber(value: number) {
  return finite(value, 0).toFixed(3);
}

function rateFunctionForComposition(spec: MathSceneAnimationCompositionSpec): MathRateFunctionName {
  return spec.rateFunction === "smooth" ? "smooth" : "linear";
}

function lagRatioForComposition(spec: MathSceneAnimationCompositionSpec) {
  const defaultLagRatio = spec.type === "laggedStart" ? 0.05 : 0;
  return Math.max(0, finite(spec.lagRatio, defaultLagRatio));
}

function runTimeForComposition(spec: MathSceneAnimationCompositionSpec, naturalDurationSeconds: number) {
  if (spec.runTime === undefined) return naturalDurationSeconds;
  return Math.max(0, stableNumber(spec.runTime));
}

function timingPolicyForComposition(spec: MathSceneAnimationCompositionSpec, lagRatio: number): AnimationCompositionTimingPolicy {
  if (spec.type === "succession") return "succession-chained-child-duration";
  return lagRatio > 0 ? "recursive-lag-ratio-child-duration" : "parallel-shared-start";
}

function recursiveLaggedWindows(
  children: Array<{ animationPlanId: string; durationSeconds: number }>,
  lagRatio: number
): AnimationCompositionWindow[] {
  let nextStartSeconds = 0;

  return children.map((child, index) => {
    const startSeconds = stableNumber(nextStartSeconds);
    const endSeconds = stableNumber(startSeconds + child.durationSeconds);
    nextStartSeconds = stableNumber(startSeconds + child.durationSeconds * lagRatio);

    return {
      ...child,
      endSeconds,
      index,
      startSeconds
    };
  });
}

function rescaleWindows(windows: AnimationCompositionWindow[], naturalDurationSeconds: number, runTime: number) {
  if (naturalDurationSeconds === runTime) return windows;
  if (naturalDurationSeconds <= 0) return windows;

  const scale = runTime / naturalDurationSeconds;
  return windows.map((window) => {
    const startSeconds = stableNumber(window.startSeconds * scale);
    const endSeconds = stableNumber(window.endSeconds * scale);

    return {
      ...window,
      durationSeconds: stableNumber(window.durationSeconds * scale),
      endSeconds,
      startSeconds
    };
  });
}

function compositionPlan(
  spec: MathSceneAnimationCompositionSpec,
  issues: string[],
  naturalWindows: AnimationCompositionWindow[],
  naturalDurationSeconds: number,
  timingPolicy: AnimationCompositionTimingPolicy
): MathAnimationCompositionPlan {
  const durationSeconds = runTimeForComposition(spec, naturalDurationSeconds);

  return {
    durationSeconds,
    id: spec.id,
    issues,
    naturalDurationSeconds,
    rateFunction: rateFunctionForComposition(spec),
    timingPolicy,
    type: spec.type,
    windows: rescaleWindows(naturalWindows, naturalDurationSeconds, durationSeconds)
  };
}

export function buildAnimationCompositionPlan(
  spec: MathSceneAnimationCompositionSpec,
  animationPlans: MathSceneAnimatePlanSpec[]
): MathAnimationCompositionPlan {
  const byId = planLookup(animationPlans);
  const children = spec.animationPlanIds.flatMap((animationPlanId) => {
    const plan = byId.get(animationPlanId);
    return plan ? [{ animationPlanId, durationSeconds: durationFor(plan) }] : [];
  });
  const missingIssues = spec.animationPlanIds
    .filter((animationPlanId) => !byId.has(animationPlanId))
    .map((animationPlanId) => `missing-animation-plan:${animationPlanId}`);

  if (spec.type === "succession") {
    let elapsed = 0;
    const windows = children.map((child, index) => {
      const startSeconds = elapsed;
      const endSeconds = stableNumber(startSeconds + child.durationSeconds);
      elapsed = endSeconds;

      return {
        ...child,
        endSeconds,
        index,
        startSeconds
      };
    });

    return compositionPlan(
      spec,
      missingIssues,
      windows,
      windows.at(-1)?.endSeconds ?? 0,
      "succession-chained-child-duration"
    );
  }

  if (spec.type === "laggedStart") {
    const lagRatio = lagRatioForComposition(spec);
    const windows = recursiveLaggedWindows(children, lagRatio);

    return compositionPlan(
      spec,
      missingIssues,
      windows,
      Math.max(0, ...windows.map((window) => window.endSeconds)),
      timingPolicyForComposition(spec, lagRatio)
    );
  }

  const lagRatio = lagRatioForComposition(spec);
  const windows = recursiveLaggedWindows(children, lagRatio);

  return compositionPlan(
    spec,
    missingIssues,
    windows,
    Math.max(0, ...windows.map((window) => window.endSeconds)),
    timingPolicyForComposition(spec, lagRatio)
  );
}

export function sampleAnimationCompositionFrame(
  plan: MathAnimationCompositionPlan,
  elapsedSeconds: number
): AnimationCompositionFrame {
  const rawElapsed = clamp(stableNumber(elapsedSeconds), 0, plan.durationSeconds);
  const rawProgress = plan.durationSeconds === 0 ? 1 : stableNumber(rawElapsed / plan.durationSeconds);
  const progress = stableNumber(applyRateFunction(plan.rateFunction, rawProgress));
  const boundedElapsed = stableNumber(plan.durationSeconds * progress);
  const activeWindows = plan.windows
    .filter((window) => boundedElapsed >= window.startSeconds && boundedElapsed <= window.endSeconds)
    .map((window) => ({
      ...window,
      localProgress:
        window.durationSeconds === 0
          ? 1
          : stableNumber(clamp((boundedElapsed - window.startSeconds) / window.durationSeconds, 0, 1))
    }));

  return {
    activeWindows,
    completedAnimationPlanIds: plan.windows
      .filter((window) => boundedElapsed > window.endSeconds)
      .map((window) => window.animationPlanId),
    elapsedSeconds: boundedElapsed,
    pendingAnimationPlanIds: plan.windows
      .filter((window) => boundedElapsed < window.startSeconds)
      .map((window) => window.animationPlanId),
    progress
  };
}

export function buildSceneAnimationCompositionPlans(scene: MathSceneSpec): MathAnimationCompositionPlan[] {
  return (scene.animationCompositions ?? []).map((composition) =>
    buildAnimationCompositionPlan(composition, scene.animationPlans ?? [])
  );
}

export function summarizeAnimationCompositionPlans(plans: MathAnimationCompositionPlan[]): AnimationCompositionSummary {
  return {
    compositionCount: plans.length,
    compositionDurationSeconds: stableNumber(plans.reduce((sum, plan) => sum + plan.durationSeconds, 0)),
    compositionModes: compactModes(plans),
    issueCount: plans.reduce((sum, plan) => sum + plan.issues.length, 0),
    windowCount: plans.reduce((sum, plan) => sum + plan.windows.length, 0)
  };
}

export function buildAnimationCompositionFrameEvidence({
  activeCompositionId,
  elapsedSeconds = 0,
  plans
}: AnimationCompositionFrameEvidenceInput): AnimationCompositionFrameEvidence {
  const activePlan = activeCompositionId ? plans.find((plan) => plan.id === activeCompositionId) : undefined;
  const frame = activePlan ? sampleAnimationCompositionFrame(activePlan, elapsedSeconds) : null;
  const activeWindows = frame?.activeWindows ?? [];
  const activeWindowIds = joinedIds(activeWindows.map((window) => window.animationPlanId));
  const completedWindowIds = joinedIds(frame?.completedAnimationPlanIds ?? []);
  const pendingWindowIds = joinedIds(frame?.pendingAnimationPlanIds ?? []);
  const boundedElapsed = frame?.elapsedSeconds ?? 0;
  const progress = frame?.progress ?? 0;
  const windowSummary = activeWindows.map((window) =>
    [
      window.animationPlanId,
      `@${formatNumber(window.startSeconds)}..${formatNumber(window.endSeconds)}`,
      `:${formatNumber(window.localProgress)}`
    ].join("")
  ).join("|") || "none";
  const activeId = activePlan?.id ?? "none";
  const activeType = activePlan?.type ?? "none";

  return {
    activeCompositionId: activeId,
    activeCompositionType: activeType,
    activeWindowCount: activeWindows.length,
    activeWindowIds,
    completedWindowCount: frame?.completedAnimationPlanIds.length ?? 0,
    completedWindowIds,
    compositionCount: plans.length,
    elapsedSeconds: stableNumber(boundedElapsed),
    pendingWindowCount: frame?.pendingAnimationPlanIds.length ?? 0,
    pendingWindowIds,
    progress: stableNumber(progress),
    sourceContract: ANIMATION_COMPOSITION_FRAME_SOURCE_CONTRACT,
    summary: `animation-composition-frame:active=${activeId}:mode=${activeType}:elapsed=${formatNumber(boundedElapsed)}:progress=${formatNumber(progress)}:activeWindows=${activeWindows.length}:completed=${frame?.completedAnimationPlanIds.length ?? 0}:pending=${frame?.pendingAnimationPlanIds.length ?? 0}`,
    timingPolicy: activePlan?.timingPolicy ?? "none",
    windowSummary
  };
}

export function animationCompositionFrameEvidenceDataAttributes(evidence: AnimationCompositionFrameEvidence) {
  return {
    "data-viz-manim-animation-composition-active-id": evidence.activeCompositionId,
    "data-viz-manim-animation-composition-active-type": evidence.activeCompositionType,
    "data-viz-manim-animation-composition-active-window-count": String(evidence.activeWindowCount),
    "data-viz-manim-animation-composition-active-window-ids": evidence.activeWindowIds,
    "data-viz-manim-animation-composition-completed-window-count": String(evidence.completedWindowCount),
    "data-viz-manim-animation-composition-completed-window-ids": evidence.completedWindowIds,
    "data-viz-manim-animation-composition-frame-elapsed-seconds": formatNumber(evidence.elapsedSeconds),
    "data-viz-manim-animation-composition-frame-progress": formatNumber(evidence.progress),
    "data-viz-manim-animation-composition-frame-summary": evidence.summary,
    "data-viz-manim-animation-composition-pending-window-count": String(evidence.pendingWindowCount),
    "data-viz-manim-animation-composition-pending-window-ids": evidence.pendingWindowIds,
    "data-viz-manim-animation-composition-source-contract": evidence.sourceContract,
    "data-viz-manim-animation-composition-timing-policy": evidence.timingPolicy,
    "data-viz-manim-animation-composition-window-summary": evidence.windowSummary
  } as const;
}

export function serializeAnimationCompositionFrameEvidence(evidence: AnimationCompositionFrameEvidence) {
  return stableSerialize(evidence);
}
