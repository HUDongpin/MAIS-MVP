export type MathSceneSkipControlAction =
  | "force_skipping"
  | "revert_to_original_skipping_status"
  | "stop_skipping"
  | "temp_skip_enter"
  | "temp_skip_exit";

export type MathSceneSkipControlTransition = {
  action: MathSceneSkipControlAction;
  afterSkipAnimations: boolean;
  beforeSkipAnimations: boolean;
  hasOriginalSkippingStatus: boolean;
  originalSkippingStatus: boolean;
  resetsAnimationClock: boolean;
  restoredOriginalStatus: boolean;
  stoppedSkipping: boolean;
  summary: string;
  tempSkipPreviousStatus: boolean;
};

export type MathSceneSkipControlPlan = {
  finalHasOriginalSkippingStatus: boolean;
  finalOriginalSkippingStatus: boolean;
  finalSkipAnimations: boolean;
  finalTempSkipPreviousStatus: boolean;
  skippedTransitionCount: number;
  sourceContract: typeof SCENE_SKIP_CONTROL_SOURCE_CONTRACT;
  statePolicy: typeof SCENE_SKIP_CONTROL_STATE_POLICY;
  stoppedTransitionCount: number;
  summary: string;
  transitionCount: number;
  transitions: MathSceneSkipControlTransition[];
};

export type MathSceneSkipControlInput = {
  actions: MathSceneSkipControlAction[];
  initialOriginalSkippingStatus?: boolean;
  initialSkipAnimations?: boolean;
};

export const SCENE_SKIP_CONTROL_SOURCE_CONTRACT =
  "Scene force_skipping/revert_to_original_skipping_status/stop_skipping/temp_skip -> preserve original skip state while allowing temporary skip mode";

export const SCENE_SKIP_CONTROL_STATE_POLICY =
  "save-original-skip-status-force-temporary-skip-restore-original-and-reset-animation-clock-when-stop-skipping-runs";

type MutableSkipState = {
  hasOriginalSkippingStatus: boolean;
  originalSkippingStatus: boolean;
  skipAnimations: boolean;
  tempSkipPreviousStatus: boolean;
};

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

function transitionSummary(transition: Omit<MathSceneSkipControlTransition, "summary">) {
  return [
    `skipControl:${transition.action}`,
    `before=${String(transition.beforeSkipAnimations)}`,
    `after=${String(transition.afterSkipAnimations)}`,
    `original=${String(transition.originalSkippingStatus)}`,
    `restored=${String(transition.restoredOriginalStatus)}`,
    `stopped=${String(transition.stoppedSkipping)}`,
    `clockReset=${String(transition.resetsAnimationClock)}`
  ].join(":");
}

function planSummary(plan: Omit<MathSceneSkipControlPlan, "summary">) {
  const actions = plan.transitions.map((transition) => transition.action).join(",") || "none";

  return [
    `skipControl:transitions=${plan.transitionCount}`,
    `finalSkip=${String(plan.finalSkipAnimations)}`,
    `original=${String(plan.finalOriginalSkippingStatus)}`,
    `stopped=${plan.stoppedTransitionCount}`,
    `actions=${actions}`
  ].join(":");
}

function applyAction(state: MutableSkipState, action: MathSceneSkipControlAction): MathSceneSkipControlTransition {
  const beforeSkipAnimations = state.skipAnimations;
  let restoredOriginalStatus = false;
  let stoppedSkipping = false;
  let resetsAnimationClock = false;

  if (action === "force_skipping") {
    state.originalSkippingStatus = beforeSkipAnimations;
    state.hasOriginalSkippingStatus = true;
    state.skipAnimations = true;
  }

  if (action === "revert_to_original_skipping_status") {
    if (state.hasOriginalSkippingStatus) {
      state.skipAnimations = state.originalSkippingStatus;
      restoredOriginalStatus = true;
    }
  }

  if (action === "stop_skipping") {
    state.skipAnimations = false;
    stoppedSkipping = true;
    resetsAnimationClock = true;
  }

  if (action === "temp_skip_enter") {
    state.tempSkipPreviousStatus = beforeSkipAnimations;
    state.skipAnimations = true;
  }

  if (action === "temp_skip_exit") {
    if (!state.tempSkipPreviousStatus) {
      state.skipAnimations = false;
      stoppedSkipping = true;
      resetsAnimationClock = true;
    }
  }

  const baseTransition = {
    action,
    afterSkipAnimations: state.skipAnimations,
    beforeSkipAnimations,
    hasOriginalSkippingStatus: state.hasOriginalSkippingStatus,
    originalSkippingStatus: state.originalSkippingStatus,
    resetsAnimationClock,
    restoredOriginalStatus,
    stoppedSkipping,
    tempSkipPreviousStatus: state.tempSkipPreviousStatus
  };

  return {
    ...baseTransition,
    summary: transitionSummary(baseTransition)
  };
}

// Manim source contract:
// - force_skipping stores original_skipping_status, then sets skip_animations=True.
// - revert_to_original_skipping_status restores that saved value when present.
// - stop_skipping resets animation clocks and sets skip_animations=False.
// - temp_skip stores a local previous status, forces skipping, and finally calls
//   stop_skipping only when the previous status was not already skipped.
export function buildSceneSkipControlPlan(input: MathSceneSkipControlInput): MathSceneSkipControlPlan {
  const initialSkipAnimations = input.initialSkipAnimations === true;
  const hasOriginalSkippingStatus = true;
  const state: MutableSkipState = {
    hasOriginalSkippingStatus,
    originalSkippingStatus: input.initialOriginalSkippingStatus ?? initialSkipAnimations,
    skipAnimations: initialSkipAnimations,
    tempSkipPreviousStatus: initialSkipAnimations
  };
  const transitions = input.actions.map((action) => applyAction(state, action));
  const basePlan: Omit<MathSceneSkipControlPlan, "summary"> = {
    finalHasOriginalSkippingStatus: state.hasOriginalSkippingStatus,
    finalOriginalSkippingStatus: state.originalSkippingStatus,
    finalSkipAnimations: state.skipAnimations,
    finalTempSkipPreviousStatus: state.tempSkipPreviousStatus,
    skippedTransitionCount: transitions.filter((transition) => transition.afterSkipAnimations).length,
    sourceContract: SCENE_SKIP_CONTROL_SOURCE_CONTRACT,
    statePolicy: SCENE_SKIP_CONTROL_STATE_POLICY,
    stoppedTransitionCount: transitions.filter((transition) => transition.stoppedSkipping).length,
    transitionCount: transitions.length,
    transitions
  };

  return {
    ...basePlan,
    summary: planSummary(basePlan)
  };
}

export function sceneSkipControlDataAttributes(plan: MathSceneSkipControlPlan): Record<string, string> {
  return {
    "data-viz-manim-skip-control-action-summary": plan.transitions.map((transition) => transition.action).join(",") || "none",
    "data-viz-manim-skip-control-final-original-status": String(plan.finalOriginalSkippingStatus),
    "data-viz-manim-skip-control-final-skip": String(plan.finalSkipAnimations),
    "data-viz-manim-skip-control-final-temp-previous": String(plan.finalTempSkipPreviousStatus),
    "data-viz-manim-skip-control-has-original-status": String(plan.finalHasOriginalSkippingStatus),
    "data-viz-manim-skip-control-skipped-transition-count": String(plan.skippedTransitionCount),
    "data-viz-manim-skip-control-source-contract": plan.sourceContract,
    "data-viz-manim-skip-control-state-policy": plan.statePolicy,
    "data-viz-manim-skip-control-stopped-transition-count": String(plan.stoppedTransitionCount),
    "data-viz-manim-skip-control-summary": plan.summary,
    "data-viz-manim-skip-control-transition-count": String(plan.transitionCount)
  };
}

export function serializeSceneSkipControlPlan(plan: MathSceneSkipControlPlan) {
  return stableSerialize(plan);
}
