export type MathSceneProgressControlAction = "temp_progress_bar_enter" | "temp_progress_bar_exit";

export type MathSceneProgressControlTransition = {
  action: MathSceneProgressControlAction;
  enabledAfter: boolean;
  enabledBefore: boolean;
  restoredPreviousStatus: boolean;
};

export type MathSceneProgressControlPlan = {
  actionSummary: string;
  finalShowAnimationProgress: boolean;
  initialShowAnimationProgress: boolean;
  previousShowAnimationProgress: boolean;
  requested: boolean;
  restoredPreviousStatus: boolean;
  sourceContract: typeof SCENE_PROGRESS_CONTROL_SOURCE_CONTRACT;
  statePolicy: typeof SCENE_PROGRESS_CONTROL_STATE_POLICY;
  summary: string;
  transitionCount: number;
  transitions: MathSceneProgressControlTransition[];
};

export type MathSceneProgressControlInput = {
  initialShowAnimationProgress?: boolean;
  requested?: boolean;
};

export const SCENE_PROGRESS_CONTROL_SOURCE_CONTRACT =
  "Scene.temp_progress_bar -> stores previous show_animation_progress, enables progress display inside the context, and restores it in finally";

export const SCENE_PROGRESS_CONTROL_STATE_POLICY =
  "remember-previous-progress-status-enable-temporarily-and-finally-restore-previous-status";

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

function summarizePlan(plan: Omit<MathSceneProgressControlPlan, "summary">) {
  return [
    `progressControl:requested=${String(plan.requested)}`,
    `transitions=${plan.transitionCount}`,
    `initial=${String(plan.initialShowAnimationProgress)}`,
    `final=${String(plan.finalShowAnimationProgress)}`,
    `restored=${String(plan.restoredPreviousStatus)}`,
    `actions=${plan.actionSummary}`
  ].join(":");
}

// Manim source contract:
// - temp_progress_bar stores prev_progress from show_animation_progress.
// - It enables show_animation_progress inside the context.
// - The finally block restores the previous status.
// - temp_config_change(progress_bar=True) enters this context.
export function buildSceneProgressControlPlan(input: MathSceneProgressControlInput): MathSceneProgressControlPlan {
  const requested = input.requested === true;
  const initialShowAnimationProgress = input.initialShowAnimationProgress === true;
  const previousShowAnimationProgress = initialShowAnimationProgress;
  const transitions: MathSceneProgressControlTransition[] = requested
    ? [
        {
          action: "temp_progress_bar_enter",
          enabledAfter: true,
          enabledBefore: initialShowAnimationProgress,
          restoredPreviousStatus: false
        },
        {
          action: "temp_progress_bar_exit",
          enabledAfter: previousShowAnimationProgress,
          enabledBefore: true,
          restoredPreviousStatus: true
        }
      ]
    : [];
  const actionSummary = transitions.map((transition) => transition.action).join(",") || "none";
  const restoredPreviousStatus = transitions.some((transition) => transition.restoredPreviousStatus);
  const basePlan: Omit<MathSceneProgressControlPlan, "summary"> = {
    actionSummary,
    finalShowAnimationProgress: requested ? previousShowAnimationProgress : initialShowAnimationProgress,
    initialShowAnimationProgress,
    previousShowAnimationProgress,
    requested,
    restoredPreviousStatus,
    sourceContract: SCENE_PROGRESS_CONTROL_SOURCE_CONTRACT,
    statePolicy: SCENE_PROGRESS_CONTROL_STATE_POLICY,
    transitionCount: transitions.length,
    transitions
  };

  return {
    ...basePlan,
    summary: summarizePlan(basePlan)
  };
}

export function sceneProgressControlDataAttributes(plan: MathSceneProgressControlPlan): Record<string, string> {
  return {
    "data-viz-manim-progress-control-action-summary": plan.actionSummary,
    "data-viz-manim-progress-control-final-progress": String(plan.finalShowAnimationProgress),
    "data-viz-manim-progress-control-initial-progress": String(plan.initialShowAnimationProgress),
    "data-viz-manim-progress-control-previous-progress": String(plan.previousShowAnimationProgress),
    "data-viz-manim-progress-control-requested": String(plan.requested),
    "data-viz-manim-progress-control-restored-previous": String(plan.restoredPreviousStatus),
    "data-viz-manim-progress-control-source-contract": plan.sourceContract,
    "data-viz-manim-progress-control-state-policy": plan.statePolicy,
    "data-viz-manim-progress-control-summary": plan.summary,
    "data-viz-manim-progress-control-transition-count": String(plan.transitionCount)
  };
}

export function serializeSceneProgressControlPlan(plan: MathSceneProgressControlPlan) {
  return stableSerialize(plan);
}
