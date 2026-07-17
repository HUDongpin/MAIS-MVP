import {
  buildSceneTimeProgression,
  type MathSceneTimeProgressionPlan
} from "./mathSceneTimeProgression";
import {
  buildScenePresenterHoldPlan,
  scenePresenterHoldDataAttributes,
  type MathScenePresenterHoldPlan
} from "./mathScenePresenterHold";
import {
  buildSceneEmitFramePlan,
  type MathSceneEmitFramePlan
} from "./mathSceneEmitFrame";
import {
  buildSceneUpdateFramePlan,
  type MathSceneUpdateFramePlan
} from "./mathSceneUpdateFrame";

export const SCENE_WAIT_CONTROL_SOURCE_CONTRACT =
  "Scene.wait samples time, calls update_frame, and emits frames so mobject updaters continue" as const;
export const SCENE_WAIT_CONTROL_FRAME_POLICY =
  "timeline-wait-update-frame-then-emit-frame-per-sampled-time-presenter-hold-update-frame-without-emit-frame" as const;
export const SCENE_WAIT_CONTROL_UPDATER_POLICY = "wait-updates-mobjects-each-frame" as const;

export type MathSceneWaitControlMode = "fixed-duration" | "presenter-hold" | "wait-until";

export type MathSceneWaitFrame = {
  callsEmitFrame: boolean;
  dtSeconds: number;
  emitFrame: MathSceneEmitFramePlan;
  frameIndex: number;
  incrementsSceneTime: boolean;
  stopConditionBreaks: boolean;
  tSeconds: number;
  updateFrame: MathSceneUpdateFramePlan;
  updateMobjectsDtSeconds: number;
  updaterValueAfterFrame: number;
  updatesMobjects: boolean;
  writesFrame: boolean;
};

export type MathSceneWaitControlPlan = {
  calledEmitFrameCount: number;
  calledUpdateFrameCount: number;
  description: string;
  effectiveDuration: number;
  emittedFrameCount: number;
  emittedTimes: number[];
  fps: number;
  framePolicy: typeof SCENE_WAIT_CONTROL_FRAME_POLICY;
  frameInterval: number;
  frameOperationSummary: string;
  frames: MathSceneWaitFrame[];
  maxTime: number;
  mode: MathSceneWaitControlMode;
  nIterations: number;
  overrideSkipAnimations: boolean;
  presenterHold: MathScenePresenterHoldPlan;
  runTime: number;
  skipAnimations: boolean;
  sourceContract: typeof SCENE_WAIT_CONTROL_SOURCE_CONTRACT;
  stopConditionId: string;
  stopConditionSatisfied: boolean;
  summary: string;
  timeProgression: MathSceneTimeProgressionPlan;
  updateMobjectFrameCount: number;
  updaterFinalValue: number;
  updaterValueSummary: string;
  updaterValues: number[];
  updateMobjectTotalDtSeconds: number;
  updatesMobjectsDuringPresenterHold: boolean;
  updatesMobjectsDuringWait: boolean;
  updatesMobjectsWhileSkipping: boolean;
  updaterPolicy: typeof SCENE_WAIT_CONTROL_UPDATER_POLICY;
};

export type MathSceneWaitControlInput = {
  defaultWaitTime?: number;
  duration?: number;
  fps?: number;
  holdOnWait?: boolean;
  ignorePresenterMode?: boolean;
  maxTime?: number;
  note?: string;
  playIndex?: number;
  presenterMode?: boolean;
  presenterReleaseAfterFrames?: number;
  skipAnimations?: boolean;
  stopConditionId?: string;
  stopConditionSatisfiedAt?: number;
};

export type MathSceneWaitControlAttributePlan = Pick<
  MathSceneWaitControlPlan,
  | "calledEmitFrameCount"
  | "calledUpdateFrameCount"
  | "description"
  | "effectiveDuration"
  | "emittedTimes"
  | "emittedFrameCount"
  | "fps"
  | "framePolicy"
  | "frameInterval"
  | "frameOperationSummary"
  | "maxTime"
  | "mode"
  | "nIterations"
  | "overrideSkipAnimations"
  | "runTime"
  | "skipAnimations"
  | "sourceContract"
  | "stopConditionId"
  | "stopConditionSatisfied"
  | "summary"
  | "updateMobjectFrameCount"
  | "updaterFinalValue"
  | "updaterValueSummary"
  | "updaterValues"
  | "updateMobjectTotalDtSeconds"
  | "updatesMobjectsDuringPresenterHold"
  | "updatesMobjectsDuringWait"
  | "updatesMobjectsWhileSkipping"
  | "updaterPolicy"
> & {
  frames?: MathSceneWaitFrame[];
  presenterHold?: MathScenePresenterHoldPlan;
};

function finite(value: number | undefined, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function stableNumber(value: number) {
  return Number(finite(value, 0).toFixed(6));
}

function stableDuration(value: number | undefined, fallback: number) {
  return Math.max(0, stableNumber(finite(value, fallback)));
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

function stablePlayIndex(value: number | undefined) {
  return Math.max(0, Math.floor(finite(value, 0)));
}

function formatNumberSequence(values: number[]) {
  return values.map((value) => value.toFixed(3)).join(",") || "none";
}

function formatNumberRange(values: number[]) {
  const finiteValues = values.filter(Number.isFinite);
  if (finiteValues.length === 0) return "none";

  return `${Math.min(...finiteValues).toFixed(3)}..${Math.max(...finiteValues).toFixed(3)}`;
}

function emittedTimesForStopCondition(times: number[], stopConditionSatisfiedAt: number | undefined) {
  if (typeof stopConditionSatisfiedAt !== "number" || !Number.isFinite(stopConditionSatisfiedAt)) {
    return { emittedTimes: times, stopConditionSatisfied: false };
  }

  const satisfiedAt = Math.max(0, stableNumber(stopConditionSatisfiedAt));
  const satisfiedIndex = times.findIndex((time) => time >= satisfiedAt - 1e-9);

  if (satisfiedIndex < 0) {
    return { emittedTimes: times, stopConditionSatisfied: false };
  }

  return {
    emittedTimes: times.slice(0, satisfiedIndex + 1),
    stopConditionSatisfied: true
  };
}

function waitFramesFor(input: {
  callsEmitFrame: boolean;
  emittedTimes: number[];
  skipAnimations: boolean;
  stopConditionSatisfied: boolean;
}) {
  let lastT = 0;
  let sceneTimeSeconds = 0;
  let updaterValue = 0;

  return input.emittedTimes.map((tSeconds, frameIndex) => {
    const dtSeconds = stableNumber(tSeconds - lastT);
    const updateFrame = buildSceneUpdateFramePlan({
      dtSeconds,
      sceneTimeSeconds,
      skipAnimations: input.skipAnimations
    });
    const emitFrame = buildSceneEmitFramePlan({
      called: input.callsEmitFrame,
      frameIndex,
      skipAnimations: input.skipAnimations
    });

    lastT = tSeconds;
    sceneTimeSeconds = updateFrame.nextSceneTimeSeconds;
    updaterValue = updateFrame.callsUpdateMobjects
      ? stableNumber(updaterValue + updateFrame.updateMobjectsDtSeconds)
      : updaterValue;

    return {
      callsEmitFrame: input.callsEmitFrame,
      dtSeconds,
      emitFrame,
      frameIndex,
      incrementsSceneTime: updateFrame.callsIncrementTime,
      stopConditionBreaks: input.stopConditionSatisfied && frameIndex === input.emittedTimes.length - 1,
      tSeconds,
      updateFrame,
      updateMobjectsDtSeconds: updateFrame.updateMobjectsDtSeconds,
      updaterValueAfterFrame: updaterValue,
      updatesMobjects: updateFrame.callsUpdateMobjects,
      writesFrame: emitFrame.writesMovieFrame
    };
  });
}

function waitControlSummary(plan: Omit<MathSceneWaitControlPlan, "summary" | "timeProgression">) {
  return [
    `waitControl:${plan.mode}`,
    `condition=${plan.stopConditionId}`,
    `run=${plan.runTime.toFixed(3)}`,
    `effective=${plan.effectiveDuration.toFixed(3)}`,
    `frames=${plan.emittedFrameCount}`,
    `overrideSkip=${String(plan.overrideSkipAnimations)}`,
    `satisfied=${String(plan.stopConditionSatisfied)}`
  ].join(":");
}

function waitUpdaterValueSummary(input: {
  mode: MathSceneWaitControlMode;
  updaterFinalValue: number;
  updaterValues: number[];
}) {
  const values = input.updaterValues.map((value) => value.toFixed(3)).join(",") || "none";

  return [
    `waitUpdater:mode=${input.mode}`,
    `frames=${input.updaterValues.length}`,
    `final=${input.updaterFinalValue.toFixed(3)}`,
    `values=${values}`
  ].join(":");
}

function waitUpdaterEvidence(input: {
  frames: MathSceneWaitFrame[];
  mode: MathSceneWaitControlMode;
  skipAnimations: boolean;
}) {
  const updateFrames = input.frames.filter((frame) => frame.updatesMobjects);
  const updaterValues = updateFrames.map((frame) => stableNumber(frame.updaterValueAfterFrame));
  const updaterFinalValue = stableNumber(updaterValues.at(-1) ?? 0);
  const totalDt = stableNumber(
    updateFrames.reduce((sum, frame) => sum + frame.updateMobjectsDtSeconds, 0)
  );

  return {
    updateMobjectFrameCount: updateFrames.length,
    updaterFinalValue,
    updaterValues,
    updaterValueSummary: waitUpdaterValueSummary({
      mode: input.mode,
      updaterFinalValue,
      updaterValues
    }),
    updateMobjectTotalDtSeconds: totalDt,
    updatesMobjectsDuringPresenterHold: input.mode === "presenter-hold" && updateFrames.length > 0,
    updatesMobjectsDuringWait: updateFrames.length > 0,
    updatesMobjectsWhileSkipping: input.skipAnimations && updateFrames.length > 0
  };
}

function waitFrameOperationEvidence(input: {
  frames: MathSceneWaitFrame[];
  mode: MathSceneWaitControlMode;
}) {
  const calledEmitFrameCount = input.frames.filter((frame) => frame.callsEmitFrame).length;
  const calledUpdateFrameCount = input.frames.length;
  const writtenFrameCount = input.frames.filter((frame) => frame.writesFrame).length;
  const updateMobjectFrameCount = input.frames.filter((frame) => frame.updatesMobjects).length;
  const operation = calledEmitFrameCount > 0 ? "update_frame>emit_frame" : "update_frame>hold_loop";

  return {
    calledEmitFrameCount,
    calledUpdateFrameCount,
    frameOperationSummary: [
      `waitFrameOps:${operation}`,
      `frames=${input.frames.length}`,
      `update=${calledUpdateFrameCount}`,
      `emit=${calledEmitFrameCount}`,
      `write=${writtenFrameCount}`,
      `mobjects=${updateMobjectFrameCount}`
    ].join(":")
  };
}

export function buildSceneWaitControl(input: MathSceneWaitControlInput): MathSceneWaitControlPlan {
  const stopConditionId = input.stopConditionId?.trim() || "none";
  const hasStopCondition = stopConditionId !== "none";
  const runTime = hasStopCondition
    ? stableDuration(input.maxTime ?? input.duration, 60)
    : stableDuration(input.duration, stableDuration(input.defaultWaitTime, 1));
  const nIterations = hasStopCondition ? -1 : undefined;
  const overrideSkipAnimations = hasStopCondition;
  const description = `${stablePlayIndex(input.playIndex)} Waiting`;
  const skipAnimations = input.skipAnimations === true;
  const presenterHold = buildScenePresenterHoldPlan({
    fps: input.fps,
    holdOnWait: input.holdOnWait,
    ignorePresenterMode: input.ignorePresenterMode,
    note: input.note,
    presenterMode: input.presenterMode,
    releaseAfterFrames: input.presenterReleaseAfterFrames,
    skipAnimations
  });
  const usesPresenterHold = presenterHold.mode === "presenter-hold";
  const timeProgression = buildSceneTimeProgression({
    description,
    fps: input.fps,
    nIterations,
    overrideSkipAnimations,
    runTime,
    skipAnimations
  });
  const stopConditionResult = hasStopCondition
    ? emittedTimesForStopCondition(timeProgression.times, input.stopConditionSatisfiedAt)
    : { emittedTimes: timeProgression.times, stopConditionSatisfied: false };
  const emittedTimes = usesPresenterHold ? presenterHold.frameTimes : stopConditionResult.emittedTimes;
  const effectiveDuration = stableNumber(emittedTimes.at(-1) ?? runTime);
  const frames = waitFramesFor({
    callsEmitFrame: !usesPresenterHold,
    emittedTimes,
    skipAnimations,
    stopConditionSatisfied: usesPresenterHold ? false : stopConditionResult.stopConditionSatisfied
  });
  const mode = usesPresenterHold ? "presenter-hold" as const : hasStopCondition ? "wait-until" as const : "fixed-duration" as const;
  const frameOperationEvidence = waitFrameOperationEvidence({
    frames,
    mode
  });
  const basePlan: Omit<MathSceneWaitControlPlan, "summary" | "timeProgression"> = {
    ...frameOperationEvidence,
    description,
    effectiveDuration,
    emittedFrameCount: emittedTimes.length,
    emittedTimes,
    fps: timeProgression.fps,
    framePolicy: SCENE_WAIT_CONTROL_FRAME_POLICY,
    frameInterval: timeProgression.frameInterval,
    frames,
    maxTime: runTime,
    mode,
    nIterations: timeProgression.nIterations,
    overrideSkipAnimations: usesPresenterHold ? false : overrideSkipAnimations,
    presenterHold,
    runTime,
    skipAnimations,
    sourceContract: SCENE_WAIT_CONTROL_SOURCE_CONTRACT,
    stopConditionId,
    stopConditionSatisfied: usesPresenterHold ? false : stopConditionResult.stopConditionSatisfied,
    updaterPolicy: SCENE_WAIT_CONTROL_UPDATER_POLICY,
    ...waitUpdaterEvidence({
      frames,
      mode,
      skipAnimations
    })
  };

  // Manim source contract: wait_until(stop_condition, max_time=60)
  // delegates to wait(max_time, stop_condition=...), and
  // get_wait_time_progression sets n_iterations=-1 plus
  // override_skip_animations=True for any stop_condition. Scene.wait also
  // routes presenter_mode waits through hold_loop unless skip_animations or
  // ignore_presenter_mode is active. The timeline branch calls
  // update_frame(dt) and then emit_frame() for each wait time; hold_loop calls
  // update_frame(dt=1/fps) without emit_frame.
  return {
    ...basePlan,
    summary: waitControlSummary(basePlan),
    timeProgression
  };
}

export function sceneWaitControlDataAttributes(plan: MathSceneWaitControlAttributePlan): Record<string, string> {
  const presenterHoldAttributes = plan.mode === "presenter-hold" && plan.presenterHold
    ? scenePresenterHoldDataAttributes(plan.presenterHold)
    : {};
  const frames = plan.frames ?? [];
  const derivedUpdaterEvidence = waitUpdaterEvidence({
    frames,
    mode: plan.mode,
    skipAnimations: plan.skipAnimations
  });
  const updateMobjectFrameCount = plan.updateMobjectFrameCount ?? derivedUpdaterEvidence.updateMobjectFrameCount;
  const updaterFinalValue = plan.updaterFinalValue ?? derivedUpdaterEvidence.updaterFinalValue;
  const updaterValues = plan.updaterValues ?? derivedUpdaterEvidence.updaterValues;
  const updaterValueSummary = plan.updaterValueSummary ?? waitUpdaterValueSummary({
    mode: plan.mode,
    updaterFinalValue,
    updaterValues
  });
  const updateMobjectTotalDtSeconds = plan.updateMobjectTotalDtSeconds ?? derivedUpdaterEvidence.updateMobjectTotalDtSeconds;
  const updatesMobjectsDuringPresenterHold = plan.updatesMobjectsDuringPresenterHold ?? derivedUpdaterEvidence.updatesMobjectsDuringPresenterHold;
  const updatesMobjectsDuringWait = plan.updatesMobjectsDuringWait ?? derivedUpdaterEvidence.updatesMobjectsDuringWait;
  const updatesMobjectsWhileSkipping = plan.updatesMobjectsWhileSkipping ?? derivedUpdaterEvidence.updatesMobjectsWhileSkipping;
  const operationEvidence = waitFrameOperationEvidence({
    frames,
    mode: plan.mode
  });
  const calledEmitFrameCount = plan.calledEmitFrameCount ?? operationEvidence.calledEmitFrameCount;
  const calledUpdateFrameCount = plan.calledUpdateFrameCount ?? operationEvidence.calledUpdateFrameCount;
  const frameOperationSummary = plan.frameOperationSummary ?? operationEvidence.frameOperationSummary;
  const emittedTimes = plan.emittedTimes ?? frames.map((frame) => frame.tSeconds);

  return {
    "data-viz-manim-wait-control-called-emit-frame-count": String(calledEmitFrameCount),
    "data-viz-manim-wait-control-called-update-frame-count": String(calledUpdateFrameCount),
    "data-viz-manim-wait-control-description": plan.description,
    "data-viz-manim-wait-control-emit-frame-statuses": frames.map((frame) => frame.emitFrame.status).join(",") || "none",
    "data-viz-manim-wait-control-effective-duration": plan.effectiveDuration.toFixed(3),
    "data-viz-manim-wait-control-emitted-frame-count": String(plan.emittedFrameCount),
    "data-viz-manim-wait-control-emitted-time-range": formatNumberRange(emittedTimes),
    "data-viz-manim-wait-control-emitted-times": formatNumberSequence(emittedTimes),
    "data-viz-manim-wait-control-fps": String(plan.fps),
    "data-viz-manim-wait-control-frame-interval": plan.frameInterval.toFixed(3),
    "data-viz-manim-wait-control-frame-policy": plan.framePolicy,
    "data-viz-manim-wait-control-frame-operation-summary": frameOperationSummary,
    "data-viz-manim-wait-control-increments-scene-time": frames.map((frame) => String(frame.incrementsSceneTime)).join(",") || "none",
    "data-viz-manim-wait-control-max-time": plan.maxTime.toFixed(3),
    "data-viz-manim-wait-control-mode": plan.mode,
    "data-viz-manim-wait-control-n-iterations": String(plan.nIterations),
    "data-viz-manim-wait-control-override-skip": String(plan.overrideSkipAnimations),
    "data-viz-manim-wait-control-run-time": plan.runTime.toFixed(3),
    "data-viz-manim-wait-control-skip-animations": String(plan.skipAnimations),
    "data-viz-manim-wait-control-source-contract": plan.sourceContract,
    "data-viz-manim-wait-control-stop-condition-id": plan.stopConditionId,
    "data-viz-manim-wait-control-stop-condition-satisfied": String(plan.stopConditionSatisfied),
    "data-viz-manim-wait-control-summary": plan.summary,
    "data-viz-manim-wait-control-update-frame-actions": frames.map((frame) => frame.updateFrame.action).join(",") || "none",
    "data-viz-manim-wait-control-update-mobject-frame-count": String(updateMobjectFrameCount),
    "data-viz-manim-wait-control-update-mobject-total-dt": updateMobjectTotalDtSeconds.toFixed(3),
    "data-viz-manim-wait-control-update-mobject-dts": frames.map((frame) => frame.updateMobjectsDtSeconds.toFixed(3)).join(",") || "none",
    "data-viz-manim-wait-control-updater-final-value": updaterFinalValue.toFixed(3),
    "data-viz-manim-wait-control-updater-value-summary": updaterValueSummary,
    "data-viz-manim-wait-control-updater-values": updaterValues.map((value) => value.toFixed(3)).join(",") || "none",
    "data-viz-manim-wait-control-updates-mobjects-during-presenter-hold": String(updatesMobjectsDuringPresenterHold),
    "data-viz-manim-wait-control-updates-mobjects-during-wait": String(updatesMobjectsDuringWait),
    "data-viz-manim-wait-control-updates-mobjects-while-skipping": String(updatesMobjectsWhileSkipping),
    "data-viz-manim-wait-control-updates-mobjects": frames.map((frame) => String(frame.updatesMobjects)).join(",") || "none",
    "data-viz-manim-wait-control-updater-policy": plan.updaterPolicy,
    "data-viz-manim-wait-control-written-frame-count": String(frames.filter((frame) => frame.writesFrame).length),
    ...presenterHoldAttributes
  };
}

export function serializeSceneWaitControlPlan(plan: MathSceneWaitControlPlan) {
  return stableSerialize(plan);
}
