import assert from "node:assert/strict";
import test from "node:test";
import {
  buildScenePlaybackPlan,
  sampleScenePlaybackFrames
} from "./mathScenePlayback";
import type { AnimationStep } from "./mathSceneTypes";

const timeline: AnimationStep[] = [
  { type: "revealCurve", objectId: "curve", duration: 1, easing: "linear" },
  { type: "wait", duration: 0.5 },
  { type: "cameraTo", shotId: "detail", duration: 1 }
];

test("builds a Scene.play-style lifecycle plan for animation beats", () => {
  const plan = buildScenePlaybackPlan(timeline, { fps: 4 });

  assert.equal(plan.totalDuration, 2.5);
  assert.equal(plan.plays.length, 3);
  assert.deepEqual(plan.plays[0].lifecycle, ["prePlay", "begin", "progress", "finish", "postPlay"]);
  assert.equal(plan.plays[1].updatesDuringWait, true);
  assert.equal(plan.plays[2].startSeconds, 1.5);
  assert.equal(plan.plays[2].endSeconds, 2.5);
  assert.equal(plan.frameInterval, 0.25);
});

test("samples deterministic playback frames and updates during wait beats", () => {
  const frames = sampleScenePlaybackFrames(timeline, { fps: 4 });
  const waitFrames = frames.filter((frame) => frame.activeStep?.type === "wait");

  assert.equal(frames[0].elapsedSeconds, 0);
  assert.equal(frames.at(-1)?.elapsedSeconds, 2.5);
  assert.ok(waitFrames.length >= 2);
  assert.ok(waitFrames.every((frame) => frame.shouldRunUpdaters));
  assert.ok(frames.every((frame) => frame.dtSeconds <= 0.25));
});

test("skip mode emits the final deterministic frame while preserving lifecycle metadata", () => {
  const frames = sampleScenePlaybackFrames(timeline, { fps: 4, skipAnimations: true });

  assert.equal(frames.length, 1);
  assert.equal(frames[0].elapsedSeconds, 2.5);
  assert.equal(frames[0].timeline.progress, 1);
  assert.equal(frames[0].shouldRunUpdaters, true);
});
