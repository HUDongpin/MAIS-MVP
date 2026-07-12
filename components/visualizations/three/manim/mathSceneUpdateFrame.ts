export type MathSceneUpdateFrameAction = "capture" | "dispatch-events" | "end-scene" | "skip-return";

export const SCENE_UPDATE_FRAME_SOURCE_CONTRACT =
  "Scene.update_frame -> increment_time(dt), update_mobjects(dt), optionally return on skip, raise EndScene on closing windows, dispatch idle window events, capture render groups, and sleep to sync preview timing";

export const SCENE_UPDATE_FRAME_FRAME_POLICY =
  "increment-time-before-updaters-skip-can-return-before-capture-force-draw-overrides-skip-window-close-ends-scene-idle-zero-dt-dispatches-events-capture-syncs-preview-sleep";

export type MathSceneUpdateFramePlan = {
  action: MathSceneUpdateFrameAction;
  callsCameraCapture: boolean;
  callsEndScene: boolean;
  callsIncrementTime: boolean;
  callsUpdateMobjects: boolean;
  callsWindowDispatchEvents: boolean;
  capturedRenderGroupIds: string[];
  dtSeconds: number;
  forceDraw: boolean;
  hasUndrawnWindowEvent: boolean;
  hasWindow: boolean;
  nextSceneTimeSeconds: number;
  previousSceneTimeSeconds: number;
  renderGroupCount: number;
  skipAnimations: boolean;
  framePolicy: typeof SCENE_UPDATE_FRAME_FRAME_POLICY;
  sourceContract: typeof SCENE_UPDATE_FRAME_SOURCE_CONTRACT;
  summary: string;
  updateFrameVersion: "mais-manim-update-frame/v1";
  updateMobjectsDtSeconds: number;
  windowClosing: boolean;
  windowSleepSeconds: number;
};

export type MathSceneUpdateFrameInput = {
  dtSeconds?: number;
  forceDraw?: boolean;
  hasUndrawnWindowEvent?: boolean;
  hasWindow?: boolean;
  realAnimationElapsedSeconds?: number;
  renderGroupIds?: string[];
  sceneTimeSeconds?: number;
  skipAnimations?: boolean;
  virtualAnimationStartSeconds?: number;
  windowClosing?: boolean;
};

function finite(value: number | undefined, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function stableNumber(value: number | undefined, fallback = 0) {
  return Number(finite(value, fallback).toFixed(6));
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

function uniqueIds(ids: string[]) {
  const seen = new Set<string>();

  return ids
    .map((id) => id.trim())
    .filter((id) => {
      if (!id || seen.has(id)) return false;
      seen.add(id);
      return true;
    });
}

function actionFor(input: {
  forceDraw: boolean;
  hasUndrawnWindowEvent: boolean;
  hasWindow: boolean;
  skipAnimations: boolean;
  windowClosing: boolean;
}): MathSceneUpdateFrameAction {
  if (input.skipAnimations && !input.forceDraw) return "skip-return";
  if (input.windowClosing) return "end-scene";
  if (input.hasWindow && !input.hasUndrawnWindowEvent && !input.forceDraw) return "dispatch-events";
  return "capture";
}

function previewSleepSeconds(input: {
  action: MathSceneUpdateFrameAction;
  hasWindow: boolean;
  nextSceneTimeSeconds: number;
  realAnimationElapsedSeconds: number;
  skipAnimations: boolean;
  virtualAnimationStartSeconds: number;
}) {
  if (input.action !== "capture" || !input.hasWindow || input.skipAnimations) return 0;
  const virtualTime = input.nextSceneTimeSeconds - input.virtualAnimationStartSeconds;
  return Math.max(0, stableNumber(virtualTime - input.realAnimationElapsedSeconds));
}

function buildSummary(plan: Omit<MathSceneUpdateFramePlan, "summary" | "updateFrameVersion">) {
  return [
    `updateFrame:action=${plan.action}`,
    `dt=${plan.dtSeconds.toFixed(3)}`,
    `time=${plan.nextSceneTimeSeconds.toFixed(3)}`,
    `capture=${String(plan.callsCameraCapture)}`,
    `dispatch=${String(plan.callsWindowDispatchEvents)}`,
    `sleep=${plan.windowSleepSeconds.toFixed(3)}`
  ].join(":");
}

function renderGroupSummary(ids: string[]) {
  return ids.join(",") || "none";
}

// Manim source contract:
// - Scene.update_frame first calls increment_time(dt), then update_mobjects(dt).
// - If skip_animations is true and force_draw is false, it returns before
//   window-closing checks or camera capture.
// - If the interactive window is closing, it raises EndScene.
// - For dt=0 with a live window, no undrawn event, and no force_draw, it calls
//   dispatch_events and returns without camera.capture.
// - Otherwise it calls camera.capture(*render_groups).
// - With a window and non-skipped animations, it sleeps for
//   max((time - virtual_animation_start_time) -
//   (now - real_animation_start_time), 0) to synchronize preview timing.
export function buildSceneUpdateFramePlan(input: MathSceneUpdateFrameInput): MathSceneUpdateFramePlan {
  const previousSceneTimeSeconds = Math.max(0, stableNumber(input.sceneTimeSeconds));
  const dtSeconds = Math.max(0, stableNumber(input.dtSeconds));
  const nextSceneTimeSeconds = stableNumber(previousSceneTimeSeconds + dtSeconds);
  const renderGroupIds = uniqueIds(input.renderGroupIds ?? []);
  const forceDraw = input.forceDraw === true;
  const hasWindow = input.hasWindow === true;
  const hasUndrawnWindowEvent = input.hasUndrawnWindowEvent !== false;
  const skipAnimations = input.skipAnimations === true;
  const windowClosing = input.windowClosing === true;
  const action = actionFor({ forceDraw, hasUndrawnWindowEvent, hasWindow, skipAnimations, windowClosing });
  const callsCameraCapture = action === "capture";
  const callsWindowDispatchEvents = action === "dispatch-events";
  const windowSleepSeconds = previewSleepSeconds({
    action,
    hasWindow,
    nextSceneTimeSeconds,
    realAnimationElapsedSeconds: Math.max(0, stableNumber(input.realAnimationElapsedSeconds)),
    skipAnimations,
    virtualAnimationStartSeconds: Math.max(0, stableNumber(input.virtualAnimationStartSeconds))
  });
  const basePlan: Omit<MathSceneUpdateFramePlan, "summary" | "updateFrameVersion"> = {
    action,
    callsCameraCapture,
    callsEndScene: action === "end-scene",
    callsIncrementTime: true,
    callsUpdateMobjects: true,
    callsWindowDispatchEvents,
    capturedRenderGroupIds: callsCameraCapture ? renderGroupIds : [],
    dtSeconds,
    forceDraw,
    hasUndrawnWindowEvent,
    hasWindow,
    nextSceneTimeSeconds,
    previousSceneTimeSeconds,
    renderGroupCount: callsCameraCapture ? renderGroupIds.length : 0,
    skipAnimations,
    framePolicy: SCENE_UPDATE_FRAME_FRAME_POLICY,
    sourceContract: SCENE_UPDATE_FRAME_SOURCE_CONTRACT,
    updateMobjectsDtSeconds: dtSeconds,
    windowClosing,
    windowSleepSeconds
  };

  return {
    ...basePlan,
    summary: buildSummary(basePlan),
    updateFrameVersion: "mais-manim-update-frame/v1"
  };
}

export function sceneUpdateFrameDataAttributes(plan: MathSceneUpdateFramePlan): Record<string, string> {
  return {
    "data-viz-manim-update-frame-action": plan.action,
    "data-viz-manim-update-frame-capture": String(plan.callsCameraCapture),
    "data-viz-manim-update-frame-dispatch-events": String(plan.callsWindowDispatchEvents),
    "data-viz-manim-update-frame-dt": plan.dtSeconds.toFixed(3),
    "data-viz-manim-update-frame-force-draw": String(plan.forceDraw),
    "data-viz-manim-update-frame-frame-policy": plan.framePolicy,
    "data-viz-manim-update-frame-increment-time": String(plan.callsIncrementTime),
    "data-viz-manim-update-frame-render-group-count": String(plan.renderGroupCount),
    "data-viz-manim-update-frame-render-group-ids": renderGroupSummary(plan.capturedRenderGroupIds),
    "data-viz-manim-update-frame-scene-time": plan.nextSceneTimeSeconds.toFixed(3),
    "data-viz-manim-update-frame-skip": String(plan.skipAnimations),
    "data-viz-manim-update-frame-sleep": plan.windowSleepSeconds.toFixed(3),
    "data-viz-manim-update-frame-source-contract": plan.sourceContract,
    "data-viz-manim-update-frame-summary": plan.summary,
    "data-viz-manim-update-frame-update-mobjects": String(plan.callsUpdateMobjects),
    "data-viz-manim-update-frame-update-mobjects-dt": plan.updateMobjectsDtSeconds.toFixed(3)
  };
}

export function serializeSceneUpdateFramePlan(plan: MathSceneUpdateFramePlan) {
  return stableSerialize(plan);
}
