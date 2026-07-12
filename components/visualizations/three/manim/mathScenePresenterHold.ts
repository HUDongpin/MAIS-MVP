export type MathScenePresenterHoldMode = "ordinary-wait" | "presenter-hold";

export const SCENE_PRESENTER_HOLD_SOURCE_CONTRACT =
  "Scene.wait presenter mode: log note, hold_loop update_frame(1/fps) until space/right release, then restore hold_on_wait" as const;

export type MathScenePresenterHoldPlan = {
  finalHoldOnWait: boolean;
  frameInterval: number;
  frameTimes: number[];
  holdDuration: number;
  holdFrameCount: number;
  ignorePresenterMode: boolean;
  initialHoldOnWait: boolean;
  mode: MathScenePresenterHoldMode;
  note: string;
  noteLogged: boolean;
  presenterMode: boolean;
  releaseAfterFrames: number;
  releaseEvent: "none" | "space-or-right-arrow";
  shouldUseTimelineWait: boolean;
  skipAnimations: boolean;
  sourceContract: typeof SCENE_PRESENTER_HOLD_SOURCE_CONTRACT;
  summary: string;
  version: "mais-manim-presenter-hold/v1";
};

export type MathScenePresenterHoldInput = {
  fps?: number;
  holdOnWait?: boolean;
  ignorePresenterMode?: boolean;
  note?: string;
  presenterMode?: boolean;
  releaseAfterFrames?: number;
  skipAnimations?: boolean;
};

function finite(value: number | undefined, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function stableNumber(value: number) {
  return Number(finite(value, 0).toFixed(6));
}

function frameIntervalFor(fps: number | undefined) {
  return stableNumber(1 / Math.max(1, Math.floor(finite(fps, 60))));
}

function nonNegativeInteger(value: number | undefined) {
  return Math.max(0, Math.floor(finite(value, 0)));
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

function summary(plan: Omit<MathScenePresenterHoldPlan, "summary" | "version">) {
  return [
    `presenterHold:mode=${plan.mode}`,
    `frames=${plan.holdFrameCount}`,
    `duration=${plan.holdDuration.toFixed(3)}`,
    `released=${plan.releaseEvent}`,
    `timelineWait=${String(plan.shouldUseTimelineWait)}`,
    `note=${String(plan.noteLogged)}`
  ].join(":");
}

function frameTimesFor(frameInterval: number, frameCount: number) {
  return Array.from({ length: frameCount }, (_, index) => stableNumber(frameInterval * (index + 1)));
}

// Manim source contract:
// - Scene.wait(..., ignore_presenter_mode=False) branches into hold_loop when
//   presenter_mode is true and skip_animations is false.
// - wait(note=...) logs the note before hold_loop.
// - hold_loop repeatedly calls update_frame(dt=1/fps) while hold_on_wait is true.
// - Space or right arrow release sets hold_on_wait=False; hold_loop then resets it
//   to true before returning.
export function buildScenePresenterHoldPlan(input: MathScenePresenterHoldInput): MathScenePresenterHoldPlan {
  const presenterMode = input.presenterMode === true;
  const skipAnimations = input.skipAnimations === true;
  const ignorePresenterMode = input.ignorePresenterMode === true;
  const initialHoldOnWait = input.holdOnWait ?? presenterMode;
  const active = presenterMode && !skipAnimations && !ignorePresenterMode;
  const frameInterval = frameIntervalFor(input.fps);
  const releaseAfterFrames = nonNegativeInteger(input.releaseAfterFrames);
  const holdFrameCount = active && initialHoldOnWait ? releaseAfterFrames : 0;
  const frameTimes = frameTimesFor(frameInterval, holdFrameCount);
  const holdDuration = stableNumber(frameTimes.at(-1) ?? 0);
  const note = input.note?.trim() ?? "";
  const noteLogged = active && note.length > 0;
  const basePlan = {
    finalHoldOnWait: active ? true : initialHoldOnWait,
    frameInterval,
    frameTimes,
    holdDuration,
    holdFrameCount,
    ignorePresenterMode,
    initialHoldOnWait,
    mode: active ? "presenter-hold" as const : "ordinary-wait" as const,
    note,
    noteLogged,
    presenterMode,
    releaseAfterFrames: active ? releaseAfterFrames : 0,
    releaseEvent: active ? "space-or-right-arrow" as const : "none" as const,
    shouldUseTimelineWait: !active,
    skipAnimations,
    sourceContract: SCENE_PRESENTER_HOLD_SOURCE_CONTRACT
  };

  return {
    ...basePlan,
    summary: summary(basePlan),
    version: "mais-manim-presenter-hold/v1"
  };
}

export function scenePresenterHoldDataAttributes(plan: MathScenePresenterHoldPlan): Record<string, string> {
  return {
    "data-viz-manim-presenter-hold-duration": plan.holdDuration.toFixed(3),
    "data-viz-manim-presenter-hold-final-hold-on-wait": String(plan.finalHoldOnWait),
    "data-viz-manim-presenter-hold-frame-count": String(plan.holdFrameCount),
    "data-viz-manim-presenter-hold-ignore": String(plan.ignorePresenterMode),
    "data-viz-manim-presenter-hold-mode": plan.mode,
    "data-viz-manim-presenter-hold-note-logged": String(plan.noteLogged),
    "data-viz-manim-presenter-hold-presenter-mode": String(plan.presenterMode),
    "data-viz-manim-presenter-hold-release-event": plan.releaseEvent,
    "data-viz-manim-presenter-hold-should-use-timeline-wait": String(plan.shouldUseTimelineWait),
    "data-viz-manim-presenter-hold-skip-animations": String(plan.skipAnimations),
    "data-viz-manim-presenter-hold-source-contract": plan.sourceContract,
    "data-viz-manim-presenter-hold-summary": plan.summary
  };
}

export function serializeScenePresenterHoldPlan(plan: MathScenePresenterHoldPlan) {
  return stableSerialize(plan);
}
