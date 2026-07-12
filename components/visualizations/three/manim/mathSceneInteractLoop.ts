import {
  buildSceneUpdateFramePlan,
  type MathSceneUpdateFramePlan
} from "./mathSceneUpdateFrame";

export const SCENE_INTERACT_LOOP_SOURCE_CONTRACT =
  "Scene.interact -> return without a window; otherwise log tips, set skip_animations false, loop until window close or quit_interaction, and call update_frame(1 / camera.fps) each tick";

export const SCENE_INTERACT_LOOP_STATE_POLICY =
  "no-window-preserves-skip-status-window-loop-disables-skip-and-advances-scene-through-update-frame-at-fps-dt-until-close-or-quit";

export type MathSceneInteractLoopTermination = "max-frames" | "no-window" | "quit-interaction" | "window-closing";

export type MathSceneInteractLoopFrame = {
  dtSeconds: number;
  frameIndex: number;
  sceneTimeAfter: number;
  sceneTimeBefore: number;
  updateFrame: MathSceneUpdateFramePlan;
};

export type MathSceneInteractLoopPlan = {
  dtSeconds: number;
  finalSceneTimeSeconds: number;
  finalSkipAnimations: boolean;
  frameCount: number;
  frames: MathSceneInteractLoopFrame[];
  hasWindow: boolean;
  initialSkipAnimations: boolean;
  interactVersion: "mais-manim-interact-loop/v1";
  logsInteractionTips: boolean;
  maxFrames: number;
  setsSkipAnimationsFalse: boolean;
  sourceContract: typeof SCENE_INTERACT_LOOP_SOURCE_CONTRACT;
  statePolicy: typeof SCENE_INTERACT_LOOP_STATE_POLICY;
  summary: string;
  termination: MathSceneInteractLoopTermination;
  updateFrameCallCount: number;
};

export type MathSceneInteractLoopInput = {
  fps?: number;
  hasWindow?: boolean;
  initialSceneTimeSeconds?: number;
  initialSkipAnimations?: boolean;
  maxFrames?: number;
  quitInteractionAtFrame?: number;
  renderGroupIds?: string[];
  windowClosesAtFrame?: number;
};

function finite(value: number | undefined, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function stableNumber(value: number | undefined, fallback = 0) {
  return Number(finite(value, fallback).toFixed(6));
}

function stableFps(value: number | undefined) {
  return Math.max(1, Math.floor(finite(value, 4)));
}

function stableFrameLimit(value: number | undefined) {
  return Math.max(0, Math.floor(finite(value, 1)));
}

function stableFrameGate(value: number | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  return Math.max(0, Math.floor(value));
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

function shouldStopAtFrame(frameIndex: number, gate: number | undefined) {
  return typeof gate === "number" && frameIndex >= gate;
}

function buildSummary(plan: Omit<MathSceneInteractLoopPlan, "interactVersion" | "summary">) {
  return [
    `interactLoop:termination=${plan.termination}`,
    `frames=${plan.frameCount}`,
    `dt=${plan.dtSeconds.toFixed(3)}`,
    `skip=${String(plan.finalSkipAnimations)}`
  ].join(":");
}

// Manim source contract:
// - Scene.interact() returns immediately when there is no window.
// - With a window, it logs interaction tips and sets skip_animations = False.
// - Its loop condition is not is_window_closing(), where is_window_closing also
//   reflects quit_interaction.
// - Each open-loop tick calls update_frame(1 / self.camera.fps).
export function buildSceneInteractLoopPlan(input: MathSceneInteractLoopInput = {}): MathSceneInteractLoopPlan {
  const fps = stableFps(input.fps);
  const dtSeconds = stableNumber(1 / fps);
  const maxFrames = stableFrameLimit(input.maxFrames);
  const hasWindow = input.hasWindow === true;
  const initialSkipAnimations = input.initialSkipAnimations === true;
  const initialSceneTimeSeconds = Math.max(0, stableNumber(input.initialSceneTimeSeconds));

  if (!hasWindow) {
    const basePlan: Omit<MathSceneInteractLoopPlan, "interactVersion" | "summary"> = {
      dtSeconds,
      finalSceneTimeSeconds: initialSceneTimeSeconds,
      finalSkipAnimations: initialSkipAnimations,
      frameCount: 0,
      frames: [],
      hasWindow,
      initialSkipAnimations,
      logsInteractionTips: false,
      maxFrames,
      setsSkipAnimationsFalse: false,
      sourceContract: SCENE_INTERACT_LOOP_SOURCE_CONTRACT,
      statePolicy: SCENE_INTERACT_LOOP_STATE_POLICY,
      termination: "no-window" as const,
      updateFrameCallCount: 0
    };

    return {
      ...basePlan,
      interactVersion: "mais-manim-interact-loop/v1",
      summary: buildSummary(basePlan)
    };
  }

  const windowClosesAtFrame = stableFrameGate(input.windowClosesAtFrame);
  const quitInteractionAtFrame = stableFrameGate(input.quitInteractionAtFrame);
  const frames: MathSceneInteractLoopFrame[] = [];
  let sceneTimeSeconds = initialSceneTimeSeconds;
  let termination: MathSceneInteractLoopTermination = "max-frames";

  for (let frameIndex = 0; frameIndex < maxFrames; frameIndex += 1) {
    if (shouldStopAtFrame(frameIndex, quitInteractionAtFrame)) {
      termination = "quit-interaction";
      break;
    }

    if (shouldStopAtFrame(frameIndex, windowClosesAtFrame)) {
      termination = "window-closing";
      break;
    }

    const sceneTimeBefore = sceneTimeSeconds;
    const updateFrame = buildSceneUpdateFramePlan({
      dtSeconds,
      hasWindow: true,
      renderGroupIds: input.renderGroupIds,
      sceneTimeSeconds,
      skipAnimations: false
    });

    sceneTimeSeconds = updateFrame.nextSceneTimeSeconds;
    frames.push({
      dtSeconds,
      frameIndex,
      sceneTimeAfter: sceneTimeSeconds,
      sceneTimeBefore,
      updateFrame
    });
  }

  const basePlan: Omit<MathSceneInteractLoopPlan, "interactVersion" | "summary"> = {
    dtSeconds,
    finalSceneTimeSeconds: sceneTimeSeconds,
    finalSkipAnimations: false,
    frameCount: frames.length,
    frames,
    hasWindow,
    initialSkipAnimations,
    logsInteractionTips: true,
    maxFrames,
    setsSkipAnimationsFalse: true,
    sourceContract: SCENE_INTERACT_LOOP_SOURCE_CONTRACT,
    statePolicy: SCENE_INTERACT_LOOP_STATE_POLICY,
    termination,
    updateFrameCallCount: frames.length
  };

  return {
    ...basePlan,
    interactVersion: "mais-manim-interact-loop/v1",
    summary: buildSummary(basePlan)
  };
}

export function sceneInteractLoopDataAttributes(plan: MathSceneInteractLoopPlan): Record<string, string> {
  return {
    "data-viz-manim-interact-dt": plan.dtSeconds.toFixed(3),
    "data-viz-manim-interact-final-scene-time": plan.finalSceneTimeSeconds.toFixed(3),
    "data-viz-manim-interact-frame-count": String(plan.frameCount),
    "data-viz-manim-interact-has-window": String(plan.hasWindow),
    "data-viz-manim-interact-logs-tips": String(plan.logsInteractionTips),
    "data-viz-manim-interact-sets-skip-false": String(plan.setsSkipAnimationsFalse),
    "data-viz-manim-interact-source-contract": plan.sourceContract,
    "data-viz-manim-interact-state-policy": plan.statePolicy,
    "data-viz-manim-interact-summary": plan.summary,
    "data-viz-manim-interact-termination": plan.termination,
    "data-viz-manim-interact-update-frame-actions": plan.frames.map((frame) => frame.updateFrame.action).join(",") || "none",
    "data-viz-manim-interact-update-frame-count": String(plan.updateFrameCallCount)
  };
}

export function serializeSceneInteractLoopPlan(plan: MathSceneInteractLoopPlan) {
  return stableSerialize(plan);
}
