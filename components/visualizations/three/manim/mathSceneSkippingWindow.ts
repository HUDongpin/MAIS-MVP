export type MathSceneSkippingWindowAction =
  | "continue_skip_before_start"
  | "end_window_raise_end_scene"
  | "none"
  | "start_window_preserve_original_skip"
  | "start_window_stop_skipping";

export type MathSceneSkippingWindowPlay = {
  actionSummary: string;
  actions: MathSceneSkippingWindowAction[];
  beforeSkipAnimations: boolean;
  endScene: boolean;
  finalSkipAnimations: boolean;
  playIndex: number;
  playStartSeconds: number;
  resetsAnimationClock: boolean;
  skipTimeSeconds: number | null;
  stoppedSkipping: boolean;
};

export type MathSceneSkippingWindowPlan = {
  constructorForcedSkip: boolean;
  endAtAnimationNumber: number | null;
  endScenePlayIndex: number | null;
  finalSkipAnimations: boolean;
  gatePolicy: typeof SCENE_SKIPPING_WINDOW_GATE_POLICY;
  initialSkipAnimations: boolean;
  originalSkippingStatus: boolean;
  playCount: number;
  plays: MathSceneSkippingWindowPlay[];
  renderedPlayCount: number;
  skippedPlayCount: number;
  sourceContract: typeof SCENE_SKIPPING_WINDOW_SOURCE_CONTRACT;
  startAtAnimationNumber: number | null;
  summary: string;
  truncatedByEndScene: boolean;
  version: "mais-manim-skipping-window/v1";
};

export type MathSceneSkippingWindowInput = {
  endAtAnimationNumber?: number | null;
  initialSkipAnimations?: boolean;
  playCount: number;
  playDurations?: number[];
  startAtAnimationNumber?: number | null;
};

export const SCENE_SKIPPING_WINDOW_SOURCE_CONTRACT =
  "Scene.update_skipping_status -> constructor start_at_animation_number forces skip_animations, records skip_time, and end_at_animation_number raises EndScene";

export const SCENE_SKIPPING_WINDOW_GATE_POLICY =
  "constructor-forced-skip-start-window-stop-or-preserve-original-end-window-raise-EndScene";

function finite(value: number | undefined, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function normalizeAnimationNumber(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) return null;
  return Math.max(0, Math.floor(value));
}

function roundMillis(value: number) {
  return Number(value.toFixed(3));
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

function summaryValue(value: number | null) {
  return value === null ? "none" : String(value);
}

function buildSummary(plan: Omit<MathSceneSkippingWindowPlan, "summary" | "version">) {
  return [
    `skippingWindow:start=${summaryValue(plan.startAtAnimationNumber)}`,
    `end=${summaryValue(plan.endAtAnimationNumber)}`,
    `plays=${plan.playCount}`,
    `rendered=${plan.renderedPlayCount}`,
    `skipped=${plan.skippedPlayCount}`,
    `finalSkip=${String(plan.finalSkipAnimations)}`,
    `endScene=${String(plan.truncatedByEndScene)}`
  ].join(":");
}

// Manim source contract:
// - __init__ sets skip_animations=True when start_at_animation_number is present.
// - update_skipping_status stores skip_time when num_plays reaches the start gate.
// - If original_skipping_status was false, the start gate calls stop_skipping().
// - When num_plays >= end_at_animation_number, update_skipping_status raises EndScene.
export function buildSceneSkippingWindowPlan(input: MathSceneSkippingWindowInput): MathSceneSkippingWindowPlan {
  const playCount = Math.max(0, Math.floor(finite(input.playCount)));
  const startAtAnimationNumber = normalizeAnimationNumber(input.startAtAnimationNumber);
  const endAtAnimationNumber = normalizeAnimationNumber(input.endAtAnimationNumber);
  const initialSkipAnimations = input.initialSkipAnimations === true;
  const originalSkippingStatus = initialSkipAnimations;
  const constructorForcedSkip = startAtAnimationNumber !== null;
  let skipAnimations = constructorForcedSkip ? true : initialSkipAnimations;
  let elapsedSeconds = 0;
  const plays: MathSceneSkippingWindowPlay[] = [];

  for (let playIndex = 0; playIndex < playCount; playIndex += 1) {
    const beforeSkipAnimations = skipAnimations;
    const actions: MathSceneSkippingWindowAction[] = [];
    let skipTimeSeconds: number | null = null;
    let stoppedSkipping = false;
    let resetsAnimationClock = false;
    let endScene = false;

    if (startAtAnimationNumber !== null && playIndex < startAtAnimationNumber && beforeSkipAnimations) {
      actions.push("continue_skip_before_start");
    }

    if (startAtAnimationNumber !== null && playIndex === startAtAnimationNumber) {
      skipTimeSeconds = roundMillis(elapsedSeconds);
      if (originalSkippingStatus) {
        actions.push("start_window_preserve_original_skip");
      } else {
        skipAnimations = false;
        stoppedSkipping = true;
        resetsAnimationClock = true;
        actions.push("start_window_stop_skipping");
      }
    }

    if (endAtAnimationNumber !== null && playIndex >= endAtAnimationNumber) {
      endScene = true;
      actions.push("end_window_raise_end_scene");
    }

    plays.push({
      actionSummary: actions.join(",") || "none",
      actions: actions.length > 0 ? actions : ["none"],
      beforeSkipAnimations,
      endScene,
      finalSkipAnimations: skipAnimations,
      playIndex,
      playStartSeconds: roundMillis(elapsedSeconds),
      resetsAnimationClock,
      skipTimeSeconds,
      stoppedSkipping
    });

    elapsedSeconds += Math.max(0, finite(input.playDurations?.[playIndex]));
    if (endScene) break;
  }

  const endScenePlay = plays.find((play) => play.endScene);
  const basePlan: Omit<MathSceneSkippingWindowPlan, "summary" | "version"> = {
    constructorForcedSkip,
    endAtAnimationNumber,
    endScenePlayIndex: endScenePlay?.playIndex ?? null,
    finalSkipAnimations: plays.at(-1)?.finalSkipAnimations ?? skipAnimations,
    gatePolicy: SCENE_SKIPPING_WINDOW_GATE_POLICY,
    initialSkipAnimations,
    originalSkippingStatus,
    playCount,
    plays,
    renderedPlayCount: plays.length,
    skippedPlayCount: plays.filter((play) => play.beforeSkipAnimations).length,
    sourceContract: SCENE_SKIPPING_WINDOW_SOURCE_CONTRACT,
    startAtAnimationNumber,
    truncatedByEndScene: Boolean(endScenePlay)
  };

  return {
    ...basePlan,
    summary: buildSummary(basePlan),
    version: "mais-manim-skipping-window/v1"
  };
}

export function sceneSkippingWindowDataAttributes(plan: MathSceneSkippingWindowPlan): Record<string, string> {
  return {
    "data-viz-manim-skipping-window-constructor-forced-skip": String(plan.constructorForcedSkip),
    "data-viz-manim-skipping-window-end-at": summaryValue(plan.endAtAnimationNumber),
    "data-viz-manim-skipping-window-end-scene-play": summaryValue(plan.endScenePlayIndex),
    "data-viz-manim-skipping-window-final-skip": String(plan.finalSkipAnimations),
    "data-viz-manim-skipping-window-gate-policy": plan.gatePolicy,
    "data-viz-manim-skipping-window-play-count": String(plan.playCount),
    "data-viz-manim-skipping-window-rendered-play-count": String(plan.renderedPlayCount),
    "data-viz-manim-skipping-window-skipped-play-count": String(plan.skippedPlayCount),
    "data-viz-manim-skipping-window-source-contract": plan.sourceContract,
    "data-viz-manim-skipping-window-start-at": summaryValue(plan.startAtAnimationNumber),
    "data-viz-manim-skipping-window-summary": plan.summary,
    "data-viz-manim-skipping-window-truncated": String(plan.truncatedByEndScene)
  };
}

export function serializeSceneSkippingWindowPlan(plan: MathSceneSkippingWindowPlan) {
  return stableSerialize(plan);
}
