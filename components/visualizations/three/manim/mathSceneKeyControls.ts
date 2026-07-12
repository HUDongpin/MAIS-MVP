export type MathSceneKeyControlAction =
  | "camera-reset"
  | "dispatch-only"
  | "hold-release"
  | "quit-interaction"
  | "redo"
  | "undo"
  | "unhandled";

export type MathSceneKeyControlEventType = "key-press" | "key-release";

export const SCENE_KEY_CONTROL_SOURCE_CONTRACT =
  "Scene.on_key_press/on_key_release: dispatch EVENT_DISPATCHER, reset camera.frame, undo/redo, quit_interaction, and release hold_on_wait" as const;

export type MathSceneKeyControlPlan = {
  action: MathSceneKeyControlAction;
  canRedo: boolean;
  canUndo: boolean;
  dispatchesEvent: boolean;
  eventType: MathSceneKeyControlEventType;
  finalHoldOnWait: boolean;
  finalQuitInteraction: boolean;
  key: string;
  keyControlVersion: "mais-manim-key-controls/v1";
  normalizedKey: string;
  playsCameraResetAnimation: boolean;
  preventsPropagation: boolean;
  redoRequested: boolean;
  releaseEvent: "none" | "space-or-right-arrow";
  resetKey: string;
  sourceContract: typeof SCENE_KEY_CONTROL_SOURCE_CONTRACT;
  summary: string;
  undoRequested: boolean;
};

export type MathSceneKeyControlInput = {
  canRedo?: boolean;
  canUndo?: boolean;
  commandOrCtrl?: boolean;
  eventType?: MathSceneKeyControlEventType;
  holdOnWait?: boolean;
  key: string;
  quitInteraction?: boolean;
  quitKey?: string;
  resetKey?: string;
  shift?: boolean;
};

function normalizedKey(value: string) {
  const key = value.trim();
  if (value === " ") return "space";
  if (key === "ArrowRight") return "right";
  return key.toLowerCase();
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

function actionFor(input: {
  canRedo: boolean;
  canUndo: boolean;
  commandOrCtrl: boolean;
  eventType: MathSceneKeyControlEventType;
  key: string;
  quitKey: string;
  resetKey: string;
  shift: boolean;
}): MathSceneKeyControlAction {
  if (input.eventType === "key-release") return "dispatch-only";
  if (input.key === input.resetKey) return "camera-reset";
  if (input.key === "z" && input.commandOrCtrl && input.shift) return input.canRedo ? "redo" : "unhandled";
  if (input.key === "z" && input.commandOrCtrl) return input.canUndo ? "undo" : "unhandled";
  if (input.key === input.quitKey && input.commandOrCtrl) return "quit-interaction";
  if (input.key === "space" || input.key === "right") return "hold-release";
  return "unhandled";
}

function buildSummary(plan: Omit<MathSceneKeyControlPlan, "keyControlVersion" | "summary">) {
  return [
    `keyControl:${plan.eventType}:${plan.normalizedKey}`,
    `action=${plan.action}`,
    `quit=${String(plan.finalQuitInteraction)}`,
    `hold=${String(plan.finalHoldOnWait)}`
  ].join(":");
}

// Manim source contract:
// - on_key_release dispatches EVENT_DISPATCHER and performs no built-in action.
// - on_key_press dispatches EVENT_DISPATCHER before scene shortcuts.
// - The reset key plays camera.frame.animate.to_default_state().
// - Command/Ctrl+Z calls undo(); Command/Ctrl+Shift+Z is treated as redo().
// - Command/Ctrl+Q sets quit_interaction = True.
// - Space or right arrow sets hold_on_wait = False for presenter hold release.
export function buildSceneKeyControlPlan(input: MathSceneKeyControlInput): MathSceneKeyControlPlan {
  const eventType = input.eventType ?? "key-press";
  const key = input.key;
  const normalized = normalizedKey(key);
  const resetKey = normalizedKey(input.resetKey ?? "r");
  const quitKey = normalizedKey(input.quitKey ?? "q");
  const commandOrCtrl = input.commandOrCtrl === true;
  const shift = input.shift === true;
  const canUndo = input.canUndo === true;
  const canRedo = input.canRedo === true;
  const action = actionFor({
    canRedo,
    canUndo,
    commandOrCtrl,
    eventType,
    key: normalized,
    quitKey,
    resetKey,
    shift
  });
  const finalQuitInteraction = action === "quit-interaction" ? true : input.quitInteraction === true;
  const finalHoldOnWait = action === "hold-release" ? false : input.holdOnWait ?? true;
  const undoRequested = action === "undo";
  const redoRequested = action === "redo";
  const basePlan = {
    action,
    canRedo,
    canUndo,
    dispatchesEvent: true,
    eventType,
    finalHoldOnWait,
    finalQuitInteraction,
    key,
    normalizedKey: normalized,
    playsCameraResetAnimation: action === "camera-reset",
    preventsPropagation: false,
    redoRequested,
    releaseEvent: action === "hold-release" ? "space-or-right-arrow" as const : "none" as const,
    resetKey,
    sourceContract: SCENE_KEY_CONTROL_SOURCE_CONTRACT,
    undoRequested
  };

  return {
    ...basePlan,
    keyControlVersion: "mais-manim-key-controls/v1",
    summary: buildSummary(basePlan)
  };
}

export function sceneKeyControlDataAttributes(plan: MathSceneKeyControlPlan): Record<string, string> {
  return {
    "data-viz-manim-key-action": plan.action,
    "data-viz-manim-key-can-redo": String(plan.canRedo),
    "data-viz-manim-key-can-undo": String(plan.canUndo),
    "data-viz-manim-key-dispatches-event": String(plan.dispatchesEvent),
    "data-viz-manim-key-event-type": plan.eventType,
    "data-viz-manim-key-final-hold-on-wait": String(plan.finalHoldOnWait),
    "data-viz-manim-key-final-quit-interaction": String(plan.finalQuitInteraction),
    "data-viz-manim-key-key": plan.normalizedKey,
    "data-viz-manim-key-plays-camera-reset": String(plan.playsCameraResetAnimation),
    "data-viz-manim-key-prevents-propagation": String(plan.preventsPropagation),
    "data-viz-manim-key-redo-requested": String(plan.redoRequested),
    "data-viz-manim-key-release-event": plan.releaseEvent,
    "data-viz-manim-key-reset-key": plan.resetKey,
    "data-viz-manim-key-source-contract": plan.sourceContract,
    "data-viz-manim-key-summary": plan.summary,
    "data-viz-manim-key-undo-requested": String(plan.undoRequested)
  };
}

export function serializeSceneKeyControlPlan(plan: MathSceneKeyControlPlan) {
  return stableSerialize(plan);
}
