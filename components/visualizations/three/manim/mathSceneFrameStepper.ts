import { buildMathSceneEvidenceSnapshot, type MathSceneEvidenceSnapshot, type MathSceneRenderQualityEvidenceInput } from "./mathEvidenceHarness";
import { buildCameraFrameTransition } from "./mathCameraFrame";
import { applyCameraFrameUpdatersWithDelta } from "./mathCameraFrameUpdater";
import { buildMathSceneAnimatePlans } from "./mathSceneAnimationPlans";
import { buildMathSceneRuntimeState, type MathSceneRuntimeState } from "./mathSceneRuntimeState";
import { applyMathUpdaters } from "./mathUpdaterRegistry";
import type { ProjectionViewport } from "./mathProjectedLabels";
import type { MathSceneSpec } from "./mathSceneTypes";

export const SCENE_FRAME_STEPPER_SOURCE_CONTRACT =
  "Scene.update_frame(dt): build runtime state, apply dt/updaters, collect evidence, capture render groups" as const;

export type MathSceneFrameCaptureSummary = {
  activeStep: string;
  cameraShot: string;
  elapsedSeconds: number;
  frameIndex: number;
  playbackLifecyclePhase: string;
  renderGroupIds: string;
  renderGroupOverlapIds: string;
  sceneId: string;
  updaterActiveCount: number;
  updaterSuspendedCount: number;
};

export type MathSceneFrameStep = {
  capture: MathSceneFrameCaptureSummary;
  deltaSeconds: number;
  elapsedSeconds: number;
  evidence: MathSceneEvidenceSnapshot;
  frameIndex: number;
  preciseElapsedSeconds: number;
  runtimeState: MathSceneRuntimeState;
  sourceContract: typeof SCENE_FRAME_STEPPER_SOURCE_CONTRACT;
};

export type MathSceneFrameStepOptions = {
  deltaSeconds: number;
  elapsedSeconds: number;
  formulaLayerViewport?: ProjectionViewport;
  frameIndex: number;
  previousRuntimeState?: MathSceneRuntimeState;
  reducedMotion?: boolean;
  renderQualityEvidence?: MathSceneRenderQualityEvidenceInput;
  suppressWaitFrameStepperBridgeEvidence?: boolean;
};

export type MathSceneFrameSamplingOptions = {
  fps?: number;
  frameCount: number;
  formulaLayerViewport?: ProjectionViewport;
  reducedMotion?: boolean;
  renderQualityEvidence?: MathSceneRenderQualityEvidenceInput;
  startElapsedSeconds?: number;
};

function finite(value: number | undefined, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function nonNegative(value: number | undefined, fallback = 0) {
  return Math.max(0, finite(value, fallback));
}

function stableInteger(value: number | undefined, fallback = 0) {
  return Math.max(0, Math.floor(finite(value, fallback)));
}

function stableFps(value: number | undefined) {
  return Math.max(1, Math.floor(finite(value, 12)));
}

function roundMillis(value: number) {
  return Math.round(value * 1000) / 1000;
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

function buildCaptureSummary(
  evidence: MathSceneEvidenceSnapshot,
  elapsedSeconds: number,
  frameIndex: number
): MathSceneFrameCaptureSummary {
  return {
    activeStep: evidence.activeStep,
    cameraShot: evidence.cameraShot,
    elapsedSeconds: roundMillis(elapsedSeconds),
    frameIndex,
    playbackLifecyclePhase: evidence.manimPlaybackLifecyclePhase,
    renderGroupIds: evidence.sceneRenderGroupIds,
    renderGroupOverlapIds: evidence.sceneRenderGroupOverlapIds,
    sceneId: evidence.sceneId,
    updaterActiveCount: evidence.updaterActiveCount,
    updaterSuspendedCount: evidence.updaterSuspendedCount
  };
}

function summarizeFrameStep(frame: MathSceneFrameStep) {
  const capture = frame.capture;

  return [
    `frame-step:${capture.sceneId}`,
    `frame=${capture.frameIndex}`,
    `elapsed=${frame.elapsedSeconds.toFixed(3)}`,
    `dt=${frame.deltaSeconds.toFixed(3)}`,
    `step=${capture.activeStep}`,
    `camera=${capture.cameraShot}`,
    `phase=${capture.playbackLifecyclePhase}`,
    `updaters=${capture.updaterActiveCount}/${capture.updaterSuspendedCount}`
  ].join(":");
}

function applyCameraFrameStepUpdaters(
  runtimeState: MathSceneRuntimeState,
  previousRuntimeState: MathSceneRuntimeState | undefined,
  elapsedSeconds: number,
  deltaSeconds: number
): MathSceneRuntimeState {
  const cameraUpdaters = runtimeState.sourceScene.cameraUpdaters ?? [];
  if (!previousRuntimeState || cameraUpdaters.length === 0) return runtimeState;

  const cameraTransition = buildCameraFrameTransition(runtimeState.sourceScene, elapsedSeconds);
  const hasActiveCameraAnimation =
    cameraTransition.activeShotId !== cameraTransition.canonicalFrame.id || cameraTransition.progress < 1;
  const frameBeforeUpdater = hasActiveCameraAnimation
    ? cameraTransition.frame
    : previousRuntimeState.cameraDirector.frame;
  const cameraUpdaterResult = applyCameraFrameUpdatersWithDelta(
    frameBeforeUpdater,
    cameraUpdaters,
    elapsedSeconds,
    deltaSeconds
  );

  return {
    ...runtimeState,
    cameraDirector: {
      ...runtimeState.cameraDirector,
      cameraAmbientRotationDegrees: cameraUpdaterResult.ambientRotationDegrees,
      cameraUpdaterActiveCount: cameraUpdaterResult.activeUpdaterCount,
      cameraUpdaterActiveIds: cameraUpdaterResult.activeUpdaterIds,
      cameraUpdaterCount: cameraUpdaterResult.updaterCount,
      frame: cameraUpdaterResult.frame
    }
  };
}

export function frameStepDataAttributes(frame: MathSceneFrameStep) {
  const capture = frame.capture;

  return {
    "data-viz-manim-frame-stepper-active-step": capture.activeStep,
    "data-viz-manim-frame-stepper-camera-shot": capture.cameraShot,
    "data-viz-manim-frame-stepper-delta-seconds": frame.deltaSeconds.toFixed(3),
    "data-viz-manim-frame-stepper-elapsed-seconds": frame.elapsedSeconds.toFixed(3),
    "data-viz-manim-frame-stepper-frame-index": String(capture.frameIndex),
    "data-viz-manim-frame-stepper-playback-phase": capture.playbackLifecyclePhase,
    "data-viz-manim-frame-stepper-render-group-ids": capture.renderGroupIds,
    "data-viz-manim-frame-stepper-render-group-overlap-ids": capture.renderGroupOverlapIds,
    "data-viz-manim-frame-stepper-scene-id": capture.sceneId,
    "data-viz-manim-frame-stepper-source-contract": frame.sourceContract,
    "data-viz-manim-frame-stepper-summary": summarizeFrameStep(frame),
    "data-viz-manim-frame-stepper-updater-active-count": String(capture.updaterActiveCount),
    "data-viz-manim-frame-stepper-updater-suspended-count": String(capture.updaterSuspendedCount)
  } as const;
}

export function serializeMathSceneFrameStepCapture(frame: MathSceneFrameStep) {
  return stableSerialize({
    capture: frame.capture,
    deltaSeconds: frame.deltaSeconds,
    elapsedSeconds: frame.elapsedSeconds,
    frameIndex: frame.frameIndex,
    preciseElapsedSeconds: frame.preciseElapsedSeconds,
    sourceContract: frame.sourceContract,
    summary: summarizeFrameStep(frame)
  });
}

export function stepMathSceneFrame(scene: MathSceneSpec, options: MathSceneFrameStepOptions): MathSceneFrameStep {
  const deltaSeconds = nonNegative(options.deltaSeconds);
  const frameIndex = stableInteger(options.frameIndex);
  const startElapsedSeconds = nonNegative(options.elapsedSeconds);
  const requestedElapsedSeconds = startElapsedSeconds + deltaSeconds;
  const reducedMotion = options.reducedMotion ?? false;
  const baseRuntimeState = buildMathSceneRuntimeState(scene, requestedElapsedSeconds, { reducedMotion });
  const elapsedSeconds = baseRuntimeState.timeline.elapsedSeconds;
  const animationPlans = buildMathSceneAnimatePlans(scene, baseRuntimeState);
  const updatedRuntimeState = applyMathUpdaters(baseRuntimeState.sourceScene, baseRuntimeState, {
    animationPlans,
    deltaSeconds,
    previousRuntimeState: options.previousRuntimeState
  });
  const runtimeState = applyCameraFrameStepUpdaters(
    updatedRuntimeState,
    options.previousRuntimeState,
    elapsedSeconds,
    deltaSeconds
  );
  const evidence = buildMathSceneEvidenceSnapshot({
    formulaLayerViewport: options.formulaLayerViewport,
    previousRuntimeState: options.previousRuntimeState,
    reducedMotion,
    renderQualityEvidence: options.renderQualityEvidence,
    runtimeState,
    scene,
    suppressWaitFrameStepperBridgeEvidence: options.suppressWaitFrameStepperBridgeEvidence,
    updateFrameEvidence: {
      dtSeconds: deltaSeconds,
      sceneTimeSeconds: startElapsedSeconds,
      skipAnimations: runtimeState.updatePolicy.skipAnimations
    }
  });

  return {
    capture: buildCaptureSummary(evidence, elapsedSeconds, frameIndex),
    deltaSeconds: roundMillis(deltaSeconds),
    elapsedSeconds: roundMillis(elapsedSeconds),
    evidence,
    frameIndex,
    preciseElapsedSeconds: elapsedSeconds,
    runtimeState,
    sourceContract: SCENE_FRAME_STEPPER_SOURCE_CONTRACT
  };
}

export function sampleMathSceneFrameSteps(
  scene: MathSceneSpec,
  options: MathSceneFrameSamplingOptions
): MathSceneFrameStep[] {
  const frameCount = stableInteger(options.frameCount);
  const fps = stableFps(options.fps);
  const deltaSeconds = 1 / fps;
  let elapsedSeconds = nonNegative(options.startElapsedSeconds);
  let previousRuntimeState: MathSceneRuntimeState | undefined;

  return Array.from({ length: frameCount }, (_, frameIndex) => {
    const frame = stepMathSceneFrame(scene, {
      deltaSeconds,
      elapsedSeconds,
      formulaLayerViewport: options.formulaLayerViewport,
      frameIndex,
      previousRuntimeState,
      reducedMotion: options.reducedMotion,
      renderQualityEvidence: options.renderQualityEvidence
    });
    elapsedSeconds += deltaSeconds;
    previousRuntimeState = frame.runtimeState;
    return frame;
  });
}
