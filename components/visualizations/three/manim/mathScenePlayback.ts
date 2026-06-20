import { buildTimelineState } from "./mathTimeline";
import type { AnimationStep, TimelineState } from "./mathSceneTypes";

export type PlaybackLifecyclePhase = "prePlay" | "begin" | "progress" | "finish" | "postPlay";

export type PlaybackPlanStep = {
  endSeconds: number;
  lifecycle: PlaybackLifecyclePhase[];
  playIndex: number;
  startSeconds: number;
  step: AnimationStep;
  updatesDuringWait: boolean;
};

export type ScenePlaybackPlan = {
  frameInterval: number;
  plays: PlaybackPlanStep[];
  totalDuration: number;
};

export type PlaybackFrame = {
  activeStep?: AnimationStep;
  dtSeconds: number;
  elapsedSeconds: number;
  frameIndex: number;
  shouldRunUpdaters: boolean;
  timeline: TimelineState;
};

function finite(value: number, fallback: number) {
  return Number.isFinite(value) ? value : fallback;
}

function frameIntervalFor(fps: number | undefined) {
  return 1 / Math.max(1, Math.floor(finite(fps ?? 60, 60)));
}

function durationFor(step: AnimationStep) {
  return Math.max(0, finite(step.duration, 0));
}

export function buildScenePlaybackPlan(
  timeline: AnimationStep[],
  options: { fps?: number } = {}
): ScenePlaybackPlan {
  const frameInterval = frameIntervalFor(options.fps);
  let elapsed = 0;
  const plays = timeline.map((step, playIndex) => {
    const startSeconds = elapsed;
    const endSeconds = startSeconds + durationFor(step);
    elapsed = endSeconds;

    return {
      endSeconds,
      lifecycle: ["prePlay", "begin", "progress", "finish", "postPlay"] as PlaybackLifecyclePhase[],
      playIndex,
      startSeconds,
      step,
      updatesDuringWait: step.type === "wait"
    };
  });

  return {
    frameInterval,
    plays,
    totalDuration: elapsed
  };
}

function frameAt(timeline: AnimationStep[], elapsedSeconds: number, dtSeconds: number, frameIndex: number): PlaybackFrame {
  const timelineState = buildTimelineState(timeline, elapsedSeconds);

  return {
    activeStep: timelineState.activeStep,
    dtSeconds,
    elapsedSeconds,
    frameIndex,
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
