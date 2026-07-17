import {
  stepMathSceneFrame,
  type MathSceneFrameStep
} from "./mathSceneFrameStepper";
import type { MathSceneWaitControlPlan } from "./mathSceneWaitControl";
import type { MathSceneRuntimeState } from "./mathSceneRuntimeState";
import type { MathSceneSpec } from "./mathSceneTypes";

export const SCENE_WAIT_FRAME_STEPPER_BRIDGE_SOURCE_CONTRACT =
  "Scene.wait sampled frames -> Scene.update_frame frame-stepper captures" as const;

export type MathSceneWaitFrameStepperBridgeRow = {
  activeStep: string;
  cameraShot: string;
  deltaMatchesWait: boolean;
  frameStepUpdateFrameAction: string;
  frameIndex: number;
  frameStepDeltaSeconds: number;
  frameStepElapsedSeconds: number;
  frameStepWritesFrame: boolean;
  sceneId: string;
  timeMatchesWait: boolean;
  updaterActiveCount: number;
  updaterSuspendedCount: number;
  waitDtSeconds: number;
  waitUpdaterValueAfterFrame: number;
  waitUpdatesMobjects: boolean;
  waitTSeconds: number;
};

export type MathSceneWaitFrameStepperBridgePlan = {
  frameStepCount: number;
  mismatchCount: number;
  rows: MathSceneWaitFrameStepperBridgeRow[];
  sourceContract: typeof SCENE_WAIT_FRAME_STEPPER_BRIDGE_SOURCE_CONTRACT;
  summary: string;
  waitFrameCount: number;
};

export type MathSceneWaitFrameStepperBridgeInput = {
  fps?: number;
  scene: MathSceneSpec;
  waitControl: MathSceneWaitControlPlan;
};

function stableNumber(value: number) {
  return Number((Number.isFinite(value) ? value : 0).toFixed(6));
}

function formatSeconds(value: number) {
  return stableNumber(value).toFixed(3);
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

function rowFromFrameStep(
  frameStep: MathSceneFrameStep,
  waitFrame: MathSceneWaitControlPlan["frames"][number]
): MathSceneWaitFrameStepperBridgeRow {
  const waitDtSeconds = stableNumber(waitFrame.dtSeconds);
  const waitTSeconds = stableNumber(waitFrame.tSeconds);
  const frameStepDeltaSeconds = stableNumber(frameStep.deltaSeconds);
  const frameStepElapsedSeconds = stableNumber(frameStep.elapsedSeconds);

  return {
    activeStep: frameStep.capture.activeStep,
    cameraShot: frameStep.capture.cameraShot,
    deltaMatchesWait: frameStepDeltaSeconds === waitDtSeconds,
    frameStepUpdateFrameAction: waitFrame.updateFrame.action,
    frameIndex: frameStep.frameIndex,
    frameStepDeltaSeconds,
    frameStepElapsedSeconds,
    frameStepWritesFrame: waitFrame.writesFrame,
    sceneId: frameStep.capture.sceneId,
    timeMatchesWait: frameStepElapsedSeconds === waitTSeconds,
    updaterActiveCount: frameStep.capture.updaterActiveCount,
    updaterSuspendedCount: frameStep.capture.updaterSuspendedCount,
    waitDtSeconds,
    waitUpdaterValueAfterFrame: stableNumber(waitFrame.updaterValueAfterFrame),
    waitUpdatesMobjects: waitFrame.updatesMobjects,
    waitTSeconds
  };
}

function summarizeWaitFrameStepperBridge(plan: Omit<MathSceneWaitFrameStepperBridgePlan, "summary">) {
  const times = plan.rows.map((row) => formatSeconds(row.waitTSeconds)).join(",") || "none";

  return [
    `waitFrameStepperBridge:waitFrames=${plan.waitFrameCount}`,
    `frameSteps=${plan.frameStepCount}`,
    `mismatches=${plan.mismatchCount}`,
    `times=${times}`
  ].join(":");
}

export function buildSceneWaitFrameStepperBridge({
  scene,
  waitControl
}: MathSceneWaitFrameStepperBridgeInput): MathSceneWaitFrameStepperBridgePlan {
  let elapsedSeconds = 0;
  let previousRuntimeState: MathSceneRuntimeState | undefined;

  const rows = waitControl.frames.map((waitFrame, frameIndex) => {
    const frameStep = stepMathSceneFrame(scene, {
      deltaSeconds: waitFrame.dtSeconds,
      elapsedSeconds,
      frameIndex,
      previousRuntimeState,
      suppressWaitFrameStepperBridgeEvidence: true
    });

    elapsedSeconds = frameStep.preciseElapsedSeconds;
    previousRuntimeState = frameStep.runtimeState;

    return rowFromFrameStep(frameStep, waitFrame);
  });
  const mismatchCount = rows.filter((row) => !row.deltaMatchesWait || !row.timeMatchesWait).length;
  const basePlan: Omit<MathSceneWaitFrameStepperBridgePlan, "summary"> = {
    frameStepCount: rows.length,
    mismatchCount,
    rows,
    sourceContract: SCENE_WAIT_FRAME_STEPPER_BRIDGE_SOURCE_CONTRACT,
    waitFrameCount: waitControl.frames.length
  };

  return {
    ...basePlan,
    summary: summarizeWaitFrameStepperBridge(basePlan)
  };
}

function uniqueCsv(values: string[]) {
  return [...new Set(values)].join(",") || "none";
}

export function sceneWaitFrameStepperBridgeDataAttributes(
  plan: MathSceneWaitFrameStepperBridgePlan
): Record<string, string> {
  return {
    "data-viz-manim-wait-frame-stepper-active-steps": plan.rows.map((row) => row.activeStep).join(",") || "none",
    "data-viz-manim-wait-frame-stepper-camera-shots": plan.rows.map((row) => row.cameraShot).join(",") || "none",
    "data-viz-manim-wait-frame-stepper-frame-step-count": String(plan.frameStepCount),
    "data-viz-manim-wait-frame-stepper-mismatch-count": String(plan.mismatchCount),
    "data-viz-manim-wait-frame-stepper-scene-ids": uniqueCsv(plan.rows.map((row) => row.sceneId)),
    "data-viz-manim-wait-frame-stepper-source-contract": plan.sourceContract,
    "data-viz-manim-wait-frame-stepper-summary": plan.summary,
    "data-viz-manim-wait-frame-stepper-update-frame-actions": plan.rows.map((row) => row.frameStepUpdateFrameAction).join(",") || "none",
    "data-viz-manim-wait-frame-stepper-updater-value-after-frames": plan.rows.map((row) => formatSeconds(row.waitUpdaterValueAfterFrame)).join(",") || "none",
    "data-viz-manim-wait-frame-stepper-updater-active-counts": plan.rows.map((row) => String(row.updaterActiveCount)).join(",") || "none",
    "data-viz-manim-wait-frame-stepper-updater-suspended-counts": plan.rows.map((row) => String(row.updaterSuspendedCount)).join(",") || "none",
    "data-viz-manim-wait-frame-stepper-wait-frame-count": String(plan.waitFrameCount),
    "data-viz-manim-wait-frame-stepper-wait-updates-mobjects": plan.rows.map((row) => String(row.waitUpdatesMobjects)).join(",") || "none",
    "data-viz-manim-wait-frame-stepper-write-frame-flags": plan.rows.map((row) => String(row.frameStepWritesFrame)).join(",") || "none",
    "data-viz-manim-wait-frame-stepper-wait-times": plan.rows.map((row) => formatSeconds(row.waitTSeconds)).join(",") || "none"
  };
}

export function serializeSceneWaitFrameStepperBridge(plan: MathSceneWaitFrameStepperBridgePlan) {
  return stableSerialize(plan);
}
