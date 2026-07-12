export type MathScenePrePlayAction =
  | "begin-animation"
  | "end-scene"
  | "none"
  | "presenter-hold"
  | "reset-window-clock"
  | "skip-before-start"
  | "start-gate-preserve-skip"
  | "start-gate-stop-skipping";

export type MathScenePrePlayRow = {
  actionSummary: string;
  actions: MathScenePrePlayAction[];
  beginAnimation: boolean;
  endScene: boolean;
  hasWindow: boolean;
  numPlaysBefore: number;
  playIndex: number;
  presenterHoldFrameCount: number;
  sceneTimeSeconds: number;
  skipAnimationsAfterSkippingStatus: boolean;
  skipAnimationsBefore: boolean;
  startGate: boolean;
  stopSkippingClockReset: boolean;
  windowClockReset: boolean;
};

export type MathScenePrePlayControlPlan = {
  beginAnimationCount: number;
  constructorForcedSkip: boolean;
  endScenePlayIndex: number | null;
  finalSkipAnimations: boolean;
  hasWindow: boolean;
  playCount: number;
  presenterHoldCount: number;
  processedPlayCount: number;
  rows: MathScenePrePlayRow[];
  skipGatePolicy: string;
  sourceContract: string;
  startGateCount: number;
  stopSkippingClockResetCount: number;
  summary: string;
  truncatedByEndScene: boolean;
  version: "mais-manim-pre-play-control/v1";
  windowClockResetCount: number;
};

export type MathScenePrePlayControlInput = {
  endAtAnimationNumber?: number | null;
  fps?: number;
  hasWindow?: boolean;
  holdOnWait?: boolean;
  initialSkipAnimations?: boolean;
  playCount: number;
  playStartSeconds?: number[];
  presenterMode?: boolean;
  presenterReleaseAfterFrames?: number;
  startAtAnimationNumber?: number | null;
  startNumPlays?: number;
};

export const SCENE_PRE_PLAY_SOURCE_CONTRACT =
  "Scene.pre_play -> presenter hold_loop -> update_skipping_status(start_at_animation_number/end_at_animation_number) -> begin_animation gate -> window clock reset";

export const SCENE_PRE_PLAY_SKIP_GATE_POLICY =
  "start-at-end-at-skip-gates-before-begin-animation-with-window-clock-reset";

function finite(value: number | undefined, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function nonNegativeInteger(value: number | undefined) {
  return Math.max(0, Math.floor(finite(value)));
}

function normalizeAnimationNumber(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) return null;
  return Math.max(0, Math.floor(value));
}

function stableNumber(value: number | undefined) {
  return Number(finite(value).toFixed(6));
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

function buildSummary(plan: Omit<MathScenePrePlayControlPlan, "summary" | "version">) {
  return [
    `prePlay:plays=${plan.processedPlayCount}`,
    `begin=${plan.beginAnimationCount}`,
    `hold=${plan.presenterHoldCount}`,
    `startGate=${plan.startGateCount}`,
    `endScene=${plan.truncatedByEndScene ? 1 : 0}`,
    `windowClock=${plan.windowClockResetCount}`
  ].join(":");
}

// Manim source contract:
// - pre_play enters hold_loop before update_skipping_status when presenter_mode
//   is true and num_plays is still zero.
// - update_skipping_status applies start_at_animation_number and
//   end_at_animation_number gates before begin_animation.
// - begin_animation runs only when skip_animations is false after the skipping
//   gate.
// - with a preview window, pre_play resets virtual_animation_start_time and
//   real_animation_start_time after begin_animation gating.
export function buildScenePrePlayControlPlan(input: MathScenePrePlayControlInput): MathScenePrePlayControlPlan {
  const playCount = nonNegativeInteger(input.playCount);
  const startNumPlays = nonNegativeInteger(input.startNumPlays);
  const startAtAnimationNumber = normalizeAnimationNumber(input.startAtAnimationNumber);
  const endAtAnimationNumber = normalizeAnimationNumber(input.endAtAnimationNumber);
  const hasWindow = input.hasWindow === true;
  const presenterMode = input.presenterMode === true;
  const holdOnWait = input.holdOnWait ?? presenterMode;
  const presenterReleaseAfterFrames = nonNegativeInteger(input.presenterReleaseAfterFrames);
  const initialSkipAnimations = input.initialSkipAnimations === true;
  const constructorForcedSkip = startAtAnimationNumber !== null;
  const originalSkippingStatus = initialSkipAnimations;
  let skipAnimations = constructorForcedSkip ? true : initialSkipAnimations;
  const rows: MathScenePrePlayRow[] = [];

  for (let playIndex = 0; playIndex < playCount; playIndex += 1) {
    const numPlaysBefore = startNumPlays + playIndex;
    const actions: MathScenePrePlayAction[] = [];
    const shouldPresenterHold = presenterMode && numPlaysBefore === 0;
    const presenterHoldFrameCount = shouldPresenterHold && holdOnWait ? presenterReleaseAfterFrames : 0;
    const skipAnimationsBefore = skipAnimations;
    let startGate = false;
    let stopSkippingClockReset = false;
    let endScene = false;

    if (shouldPresenterHold) {
      actions.push("presenter-hold");
    }

    if (startAtAnimationNumber !== null && numPlaysBefore < startAtAnimationNumber && skipAnimationsBefore) {
      actions.push("skip-before-start");
    }

    if (startAtAnimationNumber !== null && numPlaysBefore === startAtAnimationNumber) {
      startGate = true;
      if (originalSkippingStatus) {
        actions.push("start-gate-preserve-skip");
      } else {
        skipAnimations = false;
        stopSkippingClockReset = true;
        actions.push("start-gate-stop-skipping");
      }
    }

    if (endAtAnimationNumber !== null && numPlaysBefore >= endAtAnimationNumber) {
      endScene = true;
      actions.push("end-scene");
    }

    const beginAnimation = !endScene && !skipAnimations;
    if (beginAnimation) {
      actions.push("begin-animation");
    }

    const windowClockReset = !endScene && hasWindow;
    if (windowClockReset) {
      actions.push("reset-window-clock");
    }

    rows.push({
      actionSummary: actions.join("+") || "none",
      actions: actions.length > 0 ? actions : ["none"],
      beginAnimation,
      endScene,
      hasWindow,
      numPlaysBefore,
      playIndex,
      presenterHoldFrameCount,
      sceneTimeSeconds: stableNumber(input.playStartSeconds?.[playIndex]),
      skipAnimationsAfterSkippingStatus: skipAnimations,
      skipAnimationsBefore,
      startGate,
      stopSkippingClockReset,
      windowClockReset
    });

    if (endScene) break;
  }

  const endScenePlay = rows.find((row) => row.endScene);
  const basePlan = {
    beginAnimationCount: rows.filter((row) => row.beginAnimation).length,
    constructorForcedSkip,
    endScenePlayIndex: endScenePlay?.playIndex ?? null,
    finalSkipAnimations: rows.at(-1)?.skipAnimationsAfterSkippingStatus ?? skipAnimations,
    hasWindow,
    playCount,
    presenterHoldCount: rows.filter((row) => row.presenterHoldFrameCount > 0).length,
    processedPlayCount: rows.length,
    rows,
    skipGatePolicy: SCENE_PRE_PLAY_SKIP_GATE_POLICY,
    sourceContract: SCENE_PRE_PLAY_SOURCE_CONTRACT,
    startGateCount: rows.filter((row) => row.startGate).length,
    stopSkippingClockResetCount: rows.filter((row) => row.stopSkippingClockReset).length,
    truncatedByEndScene: Boolean(endScenePlay),
    windowClockResetCount: rows.filter((row) => row.windowClockReset).length
  };

  return {
    ...basePlan,
    summary: buildSummary(basePlan),
    version: "mais-manim-pre-play-control/v1"
  };
}

export function scenePrePlayControlDataAttributes(plan: MathScenePrePlayControlPlan): Record<string, string> {
  return {
    "data-viz-manim-pre-play-begin-animation-count": String(plan.beginAnimationCount),
    "data-viz-manim-pre-play-constructor-forced-skip": String(plan.constructorForcedSkip),
    "data-viz-manim-pre-play-end-scene-play": summaryValue(plan.endScenePlayIndex),
    "data-viz-manim-pre-play-final-skip": String(plan.finalSkipAnimations),
    "data-viz-manim-pre-play-has-window": String(plan.hasWindow),
    "data-viz-manim-pre-play-presenter-hold-count": String(plan.presenterHoldCount),
    "data-viz-manim-pre-play-processed-play-count": String(plan.processedPlayCount),
    "data-viz-manim-pre-play-skip-gate-policy": plan.skipGatePolicy,
    "data-viz-manim-pre-play-source-contract": plan.sourceContract,
    "data-viz-manim-pre-play-start-gate-count": String(plan.startGateCount),
    "data-viz-manim-pre-play-summary": plan.summary,
    "data-viz-manim-pre-play-truncated": String(plan.truncatedByEndScene),
    "data-viz-manim-pre-play-window-clock-reset-count": String(plan.windowClockResetCount)
  };
}

export function serializeScenePrePlayControlPlan(plan: MathScenePrePlayControlPlan) {
  return stableSerialize(plan);
}
