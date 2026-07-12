import assert from "node:assert/strict";
import test from "node:test";
import {
  VALUE_TRACKER_SOURCE_CONTRACT,
  buildSceneValueTrackers,
  buildValueTracker,
  incrementValueTracker,
  interpolateValueTracker,
  setValueTracker
} from "./mathValueTracker";
import type { MathSceneSpec } from "./mathSceneTypes";

test("builds a Manim-style ValueTracker with clamped value and normalized progress", () => {
  const tracker = buildValueTracker({
    conceptId: "function-rule",
    id: "parameter:value",
    label: "Primary value",
    max: 9,
    min: 0,
    role: "control",
    source: "parameter",
    value: 12
  });

  assert.equal(tracker.id, "parameter:value");
  assert.equal(tracker.hiddenMobjectId, "tracker:parameter:value");
  assert.equal(tracker.value, 9);
  assert.equal(tracker.normalizedValue, 1);
  assert.deepEqual(tracker.uniforms, {
    normalizedValue: 1,
    value: 9
  });
  assert.equal(tracker.conceptId, "function-rule");
  assert.equal(tracker.role, "control");
  assert.equal(tracker.source, "parameter");
  assert.equal(tracker.sourceContract, VALUE_TRACKER_SOURCE_CONTRACT);
  assert.match(VALUE_TRACKER_SOURCE_CONTRACT, /ValueTracker/);
  assert.match(VALUE_TRACKER_SOURCE_CONTRACT, /hidden mobject/);
  assert.match(VALUE_TRACKER_SOURCE_CONTRACT, /animateTracker/);
  assert.match(VALUE_TRACKER_SOURCE_CONTRACT, /sweepParameter/);
  assert.match(VALUE_TRACKER_SOURCE_CONTRACT, /set_value/);
  assert.match(VALUE_TRACKER_SOURCE_CONTRACT, /increment_value/);
});

test("interpolates tracker values as hidden animatable math objects", () => {
  const start = buildValueTracker({
    id: "parameter:coefficient",
    max: 10,
    min: 0,
    role: "control",
    source: "parameter",
    value: 2
  });
  const target = buildValueTracker({
    id: "parameter:coefficient",
    max: 10,
    min: 0,
    role: "control",
    source: "parameter",
    value: 8
  });

  assert.equal(interpolateValueTracker(start, target, 0.25).value, 3.5);
  assert.deepEqual(interpolateValueTracker(start, target, 0.25).uniforms, {
    normalizedValue: 0.35,
    value: 3.5
  });
  assert.equal(interpolateValueTracker(start, target, 2).value, 8);
});

test("sets and increments ValueTracker values like immutable hidden mobjects", () => {
  const tracker = buildValueTracker({
    conceptId: "phase",
    id: "phase-tracker",
    label: "Phase",
    max: 1,
    min: 0,
    role: "value",
    source: "value",
    value: 0.25
  });

  const setTracker = setValueTracker(tracker, 0.75);
  const incrementedTracker = incrementValueTracker(setTracker, 0.5);
  const decrementedTracker = incrementValueTracker(incrementedTracker, -0.6);

  assert.equal(tracker.value, 0.25);
  assert.equal(setTracker.value, 0.75);
  assert.equal(setTracker.normalizedValue, 0.75);
  assert.equal(setTracker.hiddenMobjectId, "tracker:phase-tracker");
  assert.deepEqual(setTracker.uniforms, {
    normalizedValue: 0.75,
    value: 0.75
  });
  assert.equal(incrementedTracker.value, 1);
  assert.equal(incrementedTracker.normalizedValue, 1);
  assert.equal(decrementedTracker.value, 0.4);
  assert.equal(decrementedTracker.normalizedValue, 0.4);
  assert.equal(decrementedTracker.id, "phase-tracker");
  assert.equal(decrementedTracker.conceptId, "phase");
  assert.equal(decrementedTracker.sourceContract, VALUE_TRACKER_SOURCE_CONTRACT);
});

test("builds scene trackers from parameters, timeline state, and animated objects", () => {
  const scene: MathSceneSpec = {
    bindings: [],
    cameraShots: [{ id: "overview", fov: 48, position: [3, 3, 3], target: [0, 0, 0] }],
    coordinateSpace: {
      mathRange: { x: [0, 1], y: [0, 1], z: [0, 1] },
      worldRange: { x: [0, 1], y: [0, 1], z: [0, 1] }
    },
    diagnostics: { expectedBindingCount: 0, expectedObjectCount: 1, expectedTokenCount: 0 },
    familyId: "three-function-graph",
    formulas: [],
    objects: [{ type: "parametricCurve", id: "curve", samples: [[0, 0, 0], [1, 1, 0]], colorRole: "function", conceptId: "function-rule" }],
    parameters: [
      { conceptId: "function-rule", id: "value", label: "Primary value", max: 9, min: 0, role: "control", value: 6 }
    ],
    sceneId: "tracker-scene",
    timeline: [{ type: "revealCurve", objectId: "curve", duration: 4, easing: "linear" }]
  };
  const trackers = buildSceneValueTrackers(scene, 2);

  assert.equal(trackers.byId.timeline.value, 2);
  assert.equal(trackers.sourceContract, VALUE_TRACKER_SOURCE_CONTRACT);
  assert.equal(trackers.byId.timeline.sourceContract, VALUE_TRACKER_SOURCE_CONTRACT);
  assert.equal(trackers.byId["timeline:progress"].value, 0.5);
  assert.equal(trackers.byId["curve:progress"].value, 0.5);
  assert.equal(trackers.byId["curve:progress"].sourceContract, VALUE_TRACKER_SOURCE_CONTRACT);
  assert.equal(trackers.byId["parameter:value"].value, 6);
  assert.equal(trackers.byId["parameter:value"].normalizedValue, 2 / 3);
  assert.equal(trackers.byId["parameter:value"].hiddenMobjectId, "tracker:parameter:value");
  assert.deepEqual(trackers.byId["parameter:value"].uniforms, {
    normalizedValue: 2 / 3,
    value: 6
  });
  assert.equal(trackers.byId["parameter:value"].conceptId, "function-rule");
});

test("animates ValueTracker parameters as hidden Manim-style mobjects from timeline beats", () => {
  const scene: MathSceneSpec = {
    bindings: [],
    cameraShots: [{ id: "overview", fov: 48, position: [3, 3, 3], target: [0, 0, 0] }],
    coordinateSpace: {
      mathRange: { x: [0, 1], y: [0, 1], z: [0, 1] },
      worldRange: { x: [0, 1], y: [0, 1], z: [0, 1] }
    },
    diagnostics: { expectedBindingCount: 0, expectedObjectCount: 1, expectedTokenCount: 0 },
    familyId: "three-function-graph",
    formulas: [],
    objects: [{ type: "parametricCurve", id: "curve", samples: [[0, 0, 0], [1, 1, 0]], colorRole: "function", conceptId: "function-rule" }],
    parameters: [
      { conceptId: "function-rule", id: "coefficient", label: "Coefficient", max: 10, min: 0, role: "control", value: 2 }
    ],
    sceneId: "tracker-animation-scene",
    timeline: [
      {
        duration: 4,
        easing: "linear",
        targetValue: 8,
        trackerId: "parameter:coefficient",
        type: "animateTracker"
      },
      { type: "wait", duration: 1 }
    ]
  };

  const midTrackers = buildSceneValueTrackers(scene, 2);
  const finalTrackers = buildSceneValueTrackers(scene, 5);
  const reducedMotionTrackers = buildSceneValueTrackers(scene, 0.25, { reducedMotion: true });

  assert.equal(midTrackers.byId["parameter:coefficient"].value, 5);
  assert.equal(midTrackers.byId["parameter:coefficient"].normalizedValue, 0.5);
  assert.equal(finalTrackers.byId["parameter:coefficient"].value, 8);
  assert.equal(reducedMotionTrackers.byId["parameter:coefficient"].value, 8);
});

test("builds and animates scene-authored hidden ValueTrackers without parameter UI coupling", () => {
  const scene: MathSceneSpec = {
    bindings: [],
    cameraShots: [{ id: "overview", fov: 48, position: [3, 3, 3], target: [0, 0, 0] }],
    coordinateSpace: {
      mathRange: { x: [0, 1], y: [0, 1], z: [0, 1] },
      worldRange: { x: [0, 1], y: [0, 1], z: [0, 1] }
    },
    diagnostics: { expectedBindingCount: 0, expectedObjectCount: 1, expectedTokenCount: 0 },
    familyId: "three-function-graph",
    formulas: [],
    objects: [{ type: "parametricCurve", id: "curve", samples: [[0, 0, 0], [1, 1, 0]], colorRole: "function", conceptId: "phase" }],
    sceneId: "hidden-value-tracker-scene",
    timeline: [
      {
        duration: 4,
        easing: "linear",
        targetValue: 1,
        trackerId: "phase-tracker",
        type: "animateTracker"
      }
    ],
    valueTrackers: [
      {
        conceptId: "phase",
        id: "phase-tracker",
        label: "Phase tracker",
        max: 1,
        min: 0,
        value: 0
      }
    ]
  };
  const trackers = buildSceneValueTrackers(scene, 2);

  assert.equal(trackers.byId["phase-tracker"].source, "value");
  assert.equal(trackers.byId["phase-tracker"].role, "value");
  assert.equal(trackers.byId["phase-tracker"].value, 0.5);
  assert.equal(trackers.byId["phase-tracker"].normalizedValue, 0.5);
  assert.equal(trackers.byId["phase-tracker"].conceptId, "phase");
});

test("sweeps parameters as semantic tracker beats with formula-token focus", () => {
  const scene: MathSceneSpec = {
    bindings: [],
    cameraShots: [{ id: "overview", fov: 48, position: [3, 3, 3], target: [0, 0, 0] }],
    coordinateSpace: {
      mathRange: { x: [0, 1], y: [0, 1], z: [0, 1] },
      worldRange: { x: [0, 1], y: [0, 1], z: [0, 1] }
    },
    diagnostics: { expectedBindingCount: 0, expectedObjectCount: 1, expectedTokenCount: 0 },
    familyId: "three-function-graph",
    formulas: [],
    objects: [{ type: "parametricCurve", id: "curve", samples: [[0, 0, 0], [1, 1, 0]], colorRole: "function", conceptId: "quadratic-width" }],
    parameters: [
      { conceptId: "quadratic-width", id: "a", label: "Coefficient a", max: 10, min: 0, role: "control", value: 2 }
    ],
    sceneId: "sweep-parameter-scene",
    timeline: [
      {
        conceptId: "quadratic-width",
        duration: 4,
        easing: "linear",
        formulaTokenIds: ["a-token"],
        fromValue: 2,
        targetValue: 8,
        trackerId: "parameter:a",
        type: "sweepParameter"
      }
    ]
  };

  const midTrackers = buildSceneValueTrackers(scene, 2);
  const finalTrackers = buildSceneValueTrackers(scene, 4);
  const reducedMotionTrackers = buildSceneValueTrackers(scene, 0.25, { reducedMotion: true });

  assert.equal(midTrackers.byId["parameter:a"].value, 5);
  assert.equal(midTrackers.byId["parameter:a"].normalizedValue, 0.5);
  assert.equal(midTrackers.byId["parameter:a"].conceptId, "quadratic-width");
  assert.equal(finalTrackers.byId["parameter:a"].value, 8);
  assert.equal(reducedMotionTrackers.byId["parameter:a"].value, 8);
});
