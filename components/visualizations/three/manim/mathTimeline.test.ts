import assert from "node:assert/strict";
import test from "node:test";
import { buildTimelineState, timelineObjectProgress } from "./mathTimeline";
import type { AnimationStep } from "./mathSceneTypes";

const timeline: AnimationStep[] = [
  { type: "revealCurve", objectId: "curve", duration: 2, easing: "linear" },
  { type: "moveAlongPath", objectId: "point", pathObjectId: "curve", duration: 3 },
  { type: "highlight", conceptId: "formula", duration: 1 },
  { type: "cameraTo", shotId: "detail", duration: 2 },
  { type: "wait", duration: 1 }
];

test("computes active Manim-style timeline step and local progress", () => {
  const state = buildTimelineState(timeline, 3.5);

  assert.equal(state.activeStepIndex, 1);
  assert.equal(state.activeStep?.type, "moveAlongPath");
  assert.equal(state.elapsedSeconds, 3.5);
  assert.equal(state.totalDuration, 9);
  assert.equal(state.progress, 3.5 / 9);
  assert.equal(state.localProgress, 0.5);
  assert.equal(state.activeConceptId, "curve");
});

test("clamps timeline state at boundaries", () => {
  assert.equal(buildTimelineState(timeline, -10).activeStepIndex, 0);
  assert.equal(buildTimelineState(timeline, 100).activeStepIndex, 4);
  assert.equal(buildTimelineState(timeline, 100).progress, 1);
});

test("reduced motion collapses non-wait steps to final state", () => {
  const state = buildTimelineState(timeline, 0.25, { reducedMotion: true });

  assert.equal(state.activeStepIndex, 4);
  assert.equal(state.activeStep?.type, "wait");
  assert.equal(state.progress, 1);
  assert.equal(state.localProgress, 1);
});

test("object progress stays cumulative after an object's animation step completes", () => {
  assert.equal(timelineObjectProgress(timeline, 1, "curve"), 0.5);
  assert.equal(timelineObjectProgress(timeline, 1, "point"), 0);
  assert.equal(timelineObjectProgress(timeline, 3.5, "curve"), 1);
  assert.equal(timelineObjectProgress(timeline, 3.5, "point"), 0.5);
  assert.equal(timelineObjectProgress(timeline, 3.5, "unanimated-object"), 1);
  assert.equal(timelineObjectProgress(timeline, 0.2, "point", { reducedMotion: true }), 1);
});
