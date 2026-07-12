import { buildTimelineState } from "./mathTimeline";
import { applyRateFunction, rateFunctionForStep, type MathRateFunctionName } from "./mathRateFunctions";
import {
  buildSceneTimeProgression,
  type MathSceneTimeProgressionPlan
} from "./mathSceneTimeProgression";
import {
  buildSceneWaitControl,
  type MathSceneWaitControlPlan
} from "./mathSceneWaitControl";
import {
  buildSceneSkippingWindowPlan,
  type MathSceneSkippingWindowPlan
} from "./mathSceneSkippingWindow";
import {
  buildScenePostPlayPreviewPlan,
  type MathScenePostPlayPreviewPlan
} from "./mathScenePostPlayPreview";
import {
  buildScenePrePlayControlPlan,
  type MathScenePrePlayControlPlan
} from "./mathScenePrePlayControl";
import {
  buildScenePlayCompilationPlan,
  type MathScenePlayCompilationPlan
} from "./mathScenePlayCompilation";
import {
  buildSceneBeginAnimationsPlan,
  type MathSceneBeginAnimationsPlan
} from "./mathSceneBeginAnimations";
import {
  buildSceneProgressThroughAnimationsPlan,
  type MathSceneProgressThroughAnimationsPlan
} from "./mathSceneProgressThroughAnimations";
import {
  buildSceneFinishAnimationsPlan,
  type MathSceneFinishAnimationsPlan
} from "./mathSceneFinishAnimations";
import type { AnimationStep, TimelineState } from "./mathSceneTypes";

export const SCENE_PLAYBACK_SOURCE_CONTRACT =
  "Scene.play/wait playback: pre_play -> begin_animations -> progress_through_animations -> finish_animations -> post_play; wait still updates frames" as const;

export type PlaybackLifecyclePhase = "prePlay" | "begin" | "progress" | "finish" | "postPlay";

export type PlaybackPlanStep = {
  beginAnimations?: MathSceneBeginAnimationsPlan;
  endSeconds: number;
  finishAnimations?: MathSceneFinishAnimationsPlan;
  lifecycle: PlaybackLifecyclePhase[];
  playCompilation?: MathScenePlayCompilationPlan;
  playIndex: number;
  progressThroughAnimations?: MathSceneProgressThroughAnimationsPlan;
  startSeconds: number;
  step: AnimationStep;
  timeProgression: MathSceneTimeProgressionPlan;
  waitControl?: MathSceneWaitControlPlan;
  updatesDuringWait: boolean;
};

export type ScenePlaybackPlan = {
  frameInterval: number;
  plays: PlaybackPlanStep[];
  postPlayPreview?: MathScenePostPlayPreviewPlan;
  prePlayControl?: MathScenePrePlayControlPlan;
  skippingWindow?: MathSceneSkippingWindowPlan;
  sourceContract: typeof SCENE_PLAYBACK_SOURCE_CONTRACT;
  totalDuration: number;
};

export type ScenePlaybackPlanOptions = {
  endAtAnimationNumber?: number | null;
  fps?: number;
  hasWindow?: boolean;
  holdOnWait?: boolean;
  presenterMode?: boolean;
  presenterReleaseAfterFrames?: number;
  previewWhileSkipping?: boolean;
  skipAnimations?: boolean;
  startAtAnimationNumber?: number | null;
};

export type PlaybackFrame = {
  activeStep?: AnimationStep;
  activePlayIndex: number;
  dtSeconds: number;
  elapsedSeconds: number;
  frameIndex: number;
  lifecyclePhase: PlaybackLifecyclePhase;
  lifecycleSummary: string;
  shouldRunUpdaters: boolean;
  timeline: TimelineState;
};

export type PlaybackLifecycleEvent = {
  alpha: number;
  dtSeconds: number;
  easedAlpha: number;
  elapsedSeconds: number;
  eventIndex: number;
  eventKey: string;
  phase: PlaybackLifecyclePhase;
  playIndex: number;
  rateFunction: MathRateFunctionName;
  rawAlpha: number;
  shouldRunUpdaters: boolean;
  stepType: AnimationStep["type"];
  updatesDuringWait: boolean;
};

export type PlaybackLifecycleSnapshot = {
  activePlayIndex: number;
  activeStepType: string;
  completedPlayCount: number;
  lifecyclePhase: PlaybackLifecyclePhase;
  lifecycleSummary: string;
  localProgress: number;
  pendingPlayCount: number;
  playEndSeconds: number;
  playStartSeconds: number;
  totalPlayCount: number;
  updatesDuringActivePlay: boolean;
};

function finite(value: number, fallback: number) {
  return Number.isFinite(value) ? value : fallback;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function stableNumber(value: number) {
  return Number(finite(value, 0).toFixed(6));
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

function frameIntervalFor(fps: number | undefined) {
  return 1 / Math.max(1, Math.floor(finite(fps ?? 60, 60)));
}

function durationFor(step: AnimationStep) {
  return Math.max(0, finite(step.duration, 0));
}

function objectIdForStep(step: AnimationStep, playIndex: number) {
  if ("objectId" in step) return step.objectId;
  if ("shotId" in step) return step.shotId;
  if ("trackerId" in step) return step.trackerId;
  if ("compositionId" in step) return step.compositionId;
  if ("conceptId" in step) return step.conceptId;
  return `${playIndex}-${step.type}`;
}

function initialSceneFamilyIdsForStep(step: AnimationStep, objectId: string) {
  if (step.type === "fadeInObject" || step.type === "growFromCenter") return [];
  return [objectId];
}

function protoAnimationKindForStep(step: AnimationStep) {
  return step.type === "transformObject" ? "builder" : "animation";
}

function lagRatioForStep(step: AnimationStep) {
  return "lagRatio" in step ? step.lagRatio : undefined;
}

function lifecyclePhaseForProgress(localProgress: number): PlaybackLifecyclePhase {
  if (localProgress <= 0) return "begin";
  if (localProgress >= 1) return "finish";
  return "progress";
}

function eventKey(playIndex: number, phase: PlaybackLifecyclePhase, elapsedSeconds: number) {
  return `${playIndex}:${phase}@${stableNumber(elapsedSeconds).toFixed(3)}`;
}

function localAlpha(elapsedSeconds: number, startSeconds: number, endSeconds: number) {
  const duration = Math.max(0, endSeconds - startSeconds);
  return duration === 0 ? 1 : stableNumber(clamp((elapsedSeconds - startSeconds) / duration, 0, 1));
}

function playbackEvent(
  play: PlaybackPlanStep,
  phase: PlaybackLifecyclePhase,
  elapsedSeconds: number,
  dtSeconds: number,
  eventIndex: number
): PlaybackLifecycleEvent {
  const rawAlpha = phase === "postPlay" ? 1 : phase === "prePlay" ? 0 : localAlpha(elapsedSeconds, play.startSeconds, play.endSeconds);
  const rateFunction = rateFunctionForStep(play.step);
  const easedAlpha = stableNumber(applyRateFunction(rateFunction, rawAlpha));

  return {
    alpha: easedAlpha,
    dtSeconds: stableNumber(dtSeconds),
    easedAlpha,
    elapsedSeconds: stableNumber(elapsedSeconds),
    eventIndex,
    eventKey: eventKey(play.playIndex, phase, elapsedSeconds),
    phase,
    playIndex: play.playIndex,
    rateFunction,
    rawAlpha,
    shouldRunUpdaters: true,
    stepType: play.step.type,
    updatesDuringWait: play.updatesDuringWait
  };
}

export function buildScenePlaybackPlan(
  timeline: AnimationStep[],
  options: ScenePlaybackPlanOptions = {}
): ScenePlaybackPlan {
  const frameInterval = frameIntervalFor(options.fps);
  let elapsed = 0;
  const plays = timeline.map((step, playIndex) => {
    const startSeconds = elapsed;
    const endSeconds = startSeconds + durationFor(step);
    const updatesDuringWait = step.type === "wait";
    const waitControl = updatesDuringWait
      ? buildSceneWaitControl({
          duration: durationFor(step),
          fps: options.fps,
          holdOnWait: step.holdOnWait,
          ignorePresenterMode: step.ignorePresenterMode,
          maxTime: step.maxTime,
          note: step.note,
          playIndex,
          presenterMode: step.presenterMode,
          presenterReleaseAfterFrames: step.presenterReleaseAfterFrames,
          skipAnimations: options.skipAnimations,
          stopConditionId: step.stopConditionId,
          stopConditionSatisfiedAt: step.stopConditionSatisfiedAt
        })
      : undefined;
    const playCompilation = updatesDuringWait
      ? undefined
      : buildScenePlayCompilationPlan({
          lagRatio: lagRatioForStep(step),
          protoAnimations: [{
            animationId: `${playIndex} ${step.type}`,
            kind: protoAnimationKindForStep(step),
            objectId: objectIdForStep(step, playIndex),
            rateFunction: rateFunctionForStep(step),
            runTime: 1
          }],
          rateFunction: rateFunctionForStep(step),
          runTime: durationFor(step)
        });
    const beginAnimations = updatesDuringWait
      ? undefined
      : buildSceneBeginAnimationsPlan({
          animations: [{
            animationId: `${playIndex} ${step.type}`,
            objectId: objectIdForStep(step, playIndex),
            runTime: durationFor(step)
          }],
          sceneFamilyIds: initialSceneFamilyIdsForStep(step, objectIdForStep(step, playIndex))
        });
    const progressThroughAnimations = updatesDuringWait
      ? undefined
      : buildSceneProgressThroughAnimationsPlan({
          animations: [{
            animationId: `${playIndex} ${step.type}`,
            objectId: objectIdForStep(step, playIndex),
            runTime: durationFor(step)
          }],
          description: `${playIndex} ${step.type}`,
          fps: options.fps,
          skipAnimations: options.skipAnimations
        });
    const finishAnimations = updatesDuringWait
      ? undefined
      : buildSceneFinishAnimationsPlan({
          animations: [{
            animationId: `${playIndex} ${step.type}`,
            objectId: objectIdForStep(step, playIndex),
            remover: step.type === "fadeOutObject",
            runTime: durationFor(step)
          }],
          skipAnimations: options.skipAnimations
        });
    elapsed = endSeconds;

    return {
      ...(beginAnimations ? { beginAnimations } : {}),
      endSeconds,
      ...(finishAnimations ? { finishAnimations } : {}),
      lifecycle: ["prePlay", "begin", "progress", "finish", "postPlay"] as PlaybackLifecyclePhase[],
      ...(playCompilation ? { playCompilation } : {}),
      playIndex,
      ...(progressThroughAnimations ? { progressThroughAnimations } : {}),
      startSeconds,
      step,
      timeProgression: waitControl?.timeProgression ?? buildSceneTimeProgression({
        description: `${playIndex} ${step.type}`,
        fps: options.fps,
        runTime: durationFor(step),
        skipAnimations: options.skipAnimations
      }),
      waitControl,
      updatesDuringWait
    };
  });
  const shouldBuildSkippingWindow = options.startAtAnimationNumber !== undefined || options.endAtAnimationNumber !== undefined;
  const skippingWindow = shouldBuildSkippingWindow
    ? buildSceneSkippingWindowPlan({
        endAtAnimationNumber: options.endAtAnimationNumber,
        initialSkipAnimations: options.skipAnimations,
        playCount: timeline.length,
        playDurations: timeline.map((step) => durationFor(step)),
        startAtAnimationNumber: options.startAtAnimationNumber
      })
    : undefined;
  const shouldBuildPostPlayPreview = options.previewWhileSkipping !== undefined || options.hasWindow !== undefined || options.skipAnimations !== undefined;
  const postPlayPreview = shouldBuildPostPlayPreview
    ? buildScenePostPlayPreviewPlan({
        hasWindow: options.hasWindow,
        playCount: timeline.length,
        previewWhileSkipping: options.previewWhileSkipping,
        skipAnimations: options.skipAnimations
      })
    : undefined;
  const shouldBuildPrePlayControl =
    options.endAtAnimationNumber !== undefined ||
    options.hasWindow !== undefined ||
    options.holdOnWait !== undefined ||
    options.presenterMode !== undefined ||
    options.presenterReleaseAfterFrames !== undefined ||
    options.skipAnimations !== undefined ||
    options.startAtAnimationNumber !== undefined;
  const prePlayControl = shouldBuildPrePlayControl
    ? buildScenePrePlayControlPlan({
        endAtAnimationNumber: options.endAtAnimationNumber,
        fps: options.fps,
        hasWindow: options.hasWindow,
        holdOnWait: options.holdOnWait,
        initialSkipAnimations: options.skipAnimations,
        playCount: timeline.length,
        playStartSeconds: plays.map((play) => play.startSeconds),
        presenterMode: options.presenterMode,
        presenterReleaseAfterFrames: options.presenterReleaseAfterFrames,
        startAtAnimationNumber: options.startAtAnimationNumber
      })
    : undefined;

  return {
    frameInterval,
    plays,
    ...(postPlayPreview ? { postPlayPreview } : {}),
    ...(prePlayControl ? { prePlayControl } : {}),
    ...(skippingWindow ? { skippingWindow } : {}),
    sourceContract: SCENE_PLAYBACK_SOURCE_CONTRACT,
    totalDuration: elapsed
  };
}

export function buildScenePlaybackEventStream(
  timeline: AnimationStep[],
  options: { fps?: number } = {}
): PlaybackLifecycleEvent[] {
  const plan = buildScenePlaybackPlan(timeline, options);
  const events: PlaybackLifecycleEvent[] = [];

  plan.plays.forEach((play) => {
    const pushEvent = (phase: PlaybackLifecyclePhase, elapsedSeconds: number, dtSeconds: number) => {
      events.push(playbackEvent(play, phase, elapsedSeconds, dtSeconds, events.length));
    };
    const duration = Math.max(0, play.endSeconds - play.startSeconds);

    pushEvent("prePlay", play.startSeconds, 0);
    pushEvent("begin", play.startSeconds, 0);

    if (duration > 0) {
      let previousFrameElapsed = play.startSeconds;
      let elapsed = play.startSeconds + plan.frameInterval;

      while (elapsed < play.endSeconds) {
        pushEvent("progress", stableNumber(elapsed), stableNumber(elapsed - previousFrameElapsed));
        previousFrameElapsed = elapsed;
        elapsed = stableNumber(elapsed + plan.frameInterval);
      }

      pushEvent("finish", play.endSeconds, play.endSeconds - previousFrameElapsed);
    } else {
      pushEvent("finish", play.endSeconds, 0);
    }

    pushEvent("postPlay", play.endSeconds, 0);
  });

  return events;
}

export function sampleScenePlaybackLifecycle(
  timeline: AnimationStep[],
  elapsedSeconds: number,
  options: { fps?: number } = {}
): PlaybackLifecycleSnapshot {
  const plan = buildScenePlaybackPlan(timeline, options);

  if (plan.plays.length === 0) {
    return {
      activePlayIndex: -1,
      activeStepType: "none",
      completedPlayCount: 0,
      lifecyclePhase: "postPlay",
      lifecycleSummary: "play=-1;phase=postPlay;alpha=1.000;completed=0;pending=0;updates=false",
      localProgress: 1,
      pendingPlayCount: 0,
      playEndSeconds: 0,
      playStartSeconds: 0,
      totalPlayCount: 0,
      updatesDuringActivePlay: false
    };
  }

  const boundedElapsed = clamp(finite(elapsedSeconds, 0), 0, plan.totalDuration);
  const activePlay =
    plan.plays.find((play) => boundedElapsed <= play.endSeconds) ?? plan.plays[plan.plays.length - 1];
  const duration = Math.max(0, activePlay.endSeconds - activePlay.startSeconds);
  const localProgress = duration === 0 ? 1 : stableNumber(clamp((boundedElapsed - activePlay.startSeconds) / duration, 0, 1));
  const lifecyclePhase = lifecyclePhaseForProgress(localProgress);
  const completedPlayCount = plan.plays.filter((play) => boundedElapsed >= play.endSeconds).length;
  const pendingPlayCount = plan.plays.filter((play) => play.startSeconds > boundedElapsed).length;
  const lifecycleSummary = [
    `play=${activePlay.playIndex}`,
    `phase=${lifecyclePhase}`,
    `alpha=${localProgress.toFixed(3)}`,
    `completed=${completedPlayCount}`,
    `pending=${pendingPlayCount}`,
    `updates=${activePlay.updatesDuringWait ? "true" : "false"}`
  ].join(";");

  return {
    activePlayIndex: activePlay.playIndex,
    activeStepType: activePlay.step.type,
    completedPlayCount,
    lifecyclePhase,
    lifecycleSummary,
    localProgress,
    pendingPlayCount,
    playEndSeconds: stableNumber(activePlay.endSeconds),
    playStartSeconds: stableNumber(activePlay.startSeconds),
    totalPlayCount: plan.plays.length,
    updatesDuringActivePlay: activePlay.updatesDuringWait
  };
}

function frameAt(timeline: AnimationStep[], elapsedSeconds: number, dtSeconds: number, frameIndex: number): PlaybackFrame {
  const timelineState = buildTimelineState(timeline, elapsedSeconds);
  const lifecycle = sampleScenePlaybackLifecycle(timeline, elapsedSeconds);

  return {
    activeStep: timelineState.activeStep,
    activePlayIndex: lifecycle.activePlayIndex,
    dtSeconds,
    elapsedSeconds,
    frameIndex,
    lifecyclePhase: lifecycle.lifecyclePhase,
    lifecycleSummary: lifecycle.lifecycleSummary,
    shouldRunUpdaters: true,
    timeline: timelineState
  };
}

export function sampleScenePlaybackFrames(
  timeline: AnimationStep[],
  options: { fps?: number; skipAnimations?: boolean } = {}
): PlaybackFrame[] {
  const plan = buildScenePlaybackPlan(timeline, options);

  if (options.skipAnimations) {
    return [frameAt(timeline, plan.totalDuration, 0, 0)];
  }

  const frames: PlaybackFrame[] = [];
  let elapsed = 0;
  let frameIndex = 0;

  while (elapsed < plan.totalDuration) {
    frames.push(frameAt(timeline, Number(elapsed.toFixed(6)), frameIndex === 0 ? 0 : plan.frameInterval, frameIndex));
    elapsed = Math.min(plan.totalDuration, elapsed + plan.frameInterval);
    frameIndex += 1;
  }

  frames.push(frameAt(timeline, plan.totalDuration, frames.length === 0 ? 0 : plan.totalDuration - frames.at(-1)!.elapsedSeconds, frameIndex));

  return frames;
}

export function elapsedSecondsForPlaybackBeat(plan: ScenePlaybackPlan, playIndex: number): number {
  return plan.plays.find((play) => play.playIndex === playIndex)?.startSeconds ?? 0;
}

export function finalElapsedSecondsForPlaybackPlan(plan: ScenePlaybackPlan): number {
  return plan.totalDuration;
}

export function summarizeScenePlaybackEventStream(events: PlaybackLifecycleEvent[]) {
  return events
    .map(
      (event) =>
        `${event.playIndex}:${event.phase}@${event.elapsedSeconds.toFixed(3)}/raw=${event.rawAlpha.toFixed(3)}/eased=${event.easedAlpha.toFixed(3)}/rate=${event.rateFunction}/dt=${event.dtSeconds.toFixed(3)}/update=${event.shouldRunUpdaters ? "true" : "false"}`
    )
    .join("|");
}

export function serializeScenePlaybackPlan(plan: ScenePlaybackPlan) {
  return stableSerialize(plan);
}
