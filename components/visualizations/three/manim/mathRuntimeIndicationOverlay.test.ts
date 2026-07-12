import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  buildRuntimeIndicationOverlayFrames,
  RUNTIME_INDICATION_OVERLAY_FOCUS_TARGET_POLICY,
  RUNTIME_INDICATION_OVERLAY_SOURCE_CONTRACT,
  RUNTIME_INDICATION_OVERLAY_STATE_POLICY,
  runtimeIndicationOverlayActiveConceptId,
  runtimeIndicationOverlayDataAttributes,
  runtimeIndicationOverlayFocusTargetIds,
  serializeRuntimeIndicationOverlayPayload,
  summarizeRuntimeIndicationOverlayFrames
} from "./mathRuntimeIndicationOverlay";
import { buildMathSceneRuntimeState } from "./mathSceneRuntimeState";
import type { MathSceneSpec, Vec3 } from "./mathSceneTypes";

const curveSamples: Vec3[] = [
  [-1, -1, 0],
  [0, 0, 0],
  [1, 1, 0]
];

const fixtureScene: MathSceneSpec = {
  bindings: [
    {
      conceptId: "function-rule",
      formulaId: "rule",
      objectId: "function-curve",
      tokenId: "f-token"
    }
  ],
  cameraShots: [{ id: "overview", position: [3, 3, 3], target: [0, 0, 0] }],
  coordinateSpace: {
    mathRange: { x: [-1, 1], y: [-1, 1], z: [-1, 1] },
    worldRange: { x: [-1, 1], y: [-1, 1], z: [-1, 1] }
  },
  diagnostics: {
    expectedBindingCount: 1,
    expectedObjectCount: 2,
    expectedTokenCount: 1
  },
  familyId: "three-function-graph",
  formulas: [
    {
      id: "rule",
      latex: "f(x)=x",
      tokens: [{ conceptId: "function-rule", id: "f-token", text: "f(x)" }]
    }
  ],
  objects: [
    {
      colorRole: "function",
      conceptId: "function-rule",
      id: "function-curve",
      samples: curveSamples,
      type: "parametricCurve"
    },
    {
      colorRole: "probe",
      conceptId: "probe-point",
      id: "probe",
      pathObjectId: "function-curve",
      type: "movingPoint"
    }
  ],
  sceneId: "runtime-indication-overlay-fixture",
  timeline: [
    { duration: 0.5, type: "wait" },
    { conceptId: "function-rule", duration: 1, type: "highlight" },
    { duration: 0.5, type: "wait" }
  ]
};

test("builds transient overlay frames for the active formula-bound highlight concept", () => {
  const runtimeState = buildMathSceneRuntimeState(fixtureScene, 1);
  const objectGraphBefore = JSON.stringify(runtimeState.objectGraph);
  const frames = buildRuntimeIndicationOverlayFrames(runtimeState);
  const summary = summarizeRuntimeIndicationOverlayFrames(frames, runtimeState.timeline.activeConceptId);

  assert.equal(runtimeState.timeline.activeStep?.type, "highlight");
  assert.equal(runtimeState.timeline.easedLocalProgress, 0.5);
  assert.equal(frames.length, 1);
  assert.equal(frames[0].type, "line");
  assert.equal(frames[0].objectId, "function-curve");
  assert.equal(frames[0].conceptId, "function-rule");
  assert.equal(frames[0].colorRole, "attention");
  assert.equal(frames[0].opacity, 1);
  assert.deepEqual(frames[0].points, curveSamples);
  assert.equal(frames[0].sourceContract, RUNTIME_INDICATION_OVERLAY_SOURCE_CONTRACT);
  assert.equal(frames[0].statePolicy, RUNTIME_INDICATION_OVERLAY_STATE_POLICY);
  assert.equal(JSON.stringify(runtimeState.objectGraph), objectGraphBefore);
  assert.deepEqual(summary, {
    activeConceptId: "function-rule",
    focusTargetCount: 1,
    focusTargetIds: "function-rule",
    focusTargetPolicy: RUNTIME_INDICATION_OVERLAY_FOCUS_TARGET_POLICY,
    focusTargetPrimaryId: "function-rule",
    focusTargetSummary: "runtimeIndicationOverlayFocus:active=function-rule:targets=1:ids=function-rule",
    frameCount: 1,
    lineFrameCount: 1,
    objectCount: 1,
    objectIds: "function-curve",
    pointFrameCount: 0,
    sourceContract: RUNTIME_INDICATION_OVERLAY_SOURCE_CONTRACT,
    statePolicy: RUNTIME_INDICATION_OVERLAY_STATE_POLICY,
    summary: "runtimeIndicationOverlay:concept=function-rule:focusTargets=1:frames=1:objects=1:lines=1:points=0:objectIds=function-curve"
  });
  assert.deepEqual(runtimeIndicationOverlayDataAttributes(summary), {
    "data-viz-manim-indication-runtime-overlay-active-concept-id": "function-rule",
    "data-viz-manim-indication-runtime-overlay-count": "1",
    "data-viz-manim-indication-runtime-overlay-focus-target-count": "1",
    "data-viz-manim-indication-runtime-overlay-focus-target-ids": "function-rule",
    "data-viz-manim-indication-runtime-overlay-focus-target-policy": RUNTIME_INDICATION_OVERLAY_FOCUS_TARGET_POLICY,
    "data-viz-manim-indication-runtime-overlay-focus-target-primary-id": "function-rule",
    "data-viz-manim-indication-runtime-overlay-focus-target-summary": "runtimeIndicationOverlayFocus:active=function-rule:targets=1:ids=function-rule",
    "data-viz-manim-indication-runtime-overlay-line-count": "1",
    "data-viz-manim-indication-runtime-overlay-object-count": "1",
    "data-viz-manim-indication-runtime-overlay-object-ids": "function-curve",
    "data-viz-manim-indication-runtime-overlay-point-count": "0",
    "data-viz-manim-indication-runtime-overlay-source-contract": RUNTIME_INDICATION_OVERLAY_SOURCE_CONTRACT,
    "data-viz-manim-indication-runtime-overlay-state-policy": RUNTIME_INDICATION_OVERLAY_STATE_POLICY,
    "data-viz-manim-indication-runtime-overlay-summary": "runtimeIndicationOverlay:concept=function-rule:focusTargets=1:frames=1:objects=1:lines=1:points=0:objectIds=function-curve"
  });
});

test("does not create runtime indication overlays outside active highlight beats", () => {
  const runtimeState = buildMathSceneRuntimeState(fixtureScene, 0.25);
  const frames = buildRuntimeIndicationOverlayFrames(runtimeState);

  assert.equal(runtimeState.timeline.activeStep?.type, "wait");
  assert.deepEqual(frames, []);
});

test("uses semantic FormulaBinding object ids even when direct object concept differs", () => {
  const scene: MathSceneSpec = {
    ...fixtureScene,
    objects: [
      {
        colorRole: "function",
        conceptId: "curve-geometry",
        id: "function-curve",
        samples: curveSamples,
        type: "parametricCurve"
      },
      fixtureScene.objects[1]
    ]
  };
  const runtimeState = buildMathSceneRuntimeState(scene, 1);
  const frames = buildRuntimeIndicationOverlayFrames(runtimeState);

  assert.equal(frames.length, 1);
  assert.equal(frames[0].objectId, "function-curve");
  assert.equal(frames[0].conceptId, "function-rule");
});

test("uses timeline focus targets to indicate both moving points and their paths", () => {
  const scene: MathSceneSpec = {
    ...fixtureScene,
    timeline: [{ duration: 2, objectId: "probe", pathObjectId: "function-curve", type: "moveAlongPath" }]
  };
  const runtimeState = buildMathSceneRuntimeState(scene, 1);
  const focusTargetIds = runtimeIndicationOverlayFocusTargetIds(runtimeState);
  const frames = buildRuntimeIndicationOverlayFrames(runtimeState, { focusTargetIds });
  const summary = summarizeRuntimeIndicationOverlayFrames(
    frames,
    runtimeIndicationOverlayActiveConceptId(runtimeState),
    { focusTargetIds }
  );

  assert.deepEqual(focusTargetIds, ["probe", "function-curve"]);
  assert.equal(runtimeState.timeline.activeStep?.type, "moveAlongPath");
  assert.equal(runtimeIndicationOverlayActiveConceptId(runtimeState), "probe-point");
  assert.deepEqual(
    frames.map((frame) => `${frame.objectId}:${frame.type}`).sort(),
    ["function-curve:line", "probe:point"]
  );
  assert.equal(summary.focusTargetCount, 2);
  assert.equal(summary.focusTargetIds, "probe,function-curve");
  assert.equal(summary.focusTargetPrimaryId, "probe");
  assert.equal(summary.objectIds, "function-curve,probe");
  assert.equal(summary.lineFrameCount, 1);
  assert.equal(summary.pointFrameCount, 1);
  assert.equal(
    summary.summary,
    "runtimeIndicationOverlay:concept=probe-point:focusTargets=2:frames=2:objects=2:lines=1:points=1:objectIds=function-curve,probe"
  );
});

test("uses semantic sweepParameter focus targets to indicate formula-bound geometry", () => {
  const scene: MathSceneSpec = {
    ...fixtureScene,
    timeline: [
      { duration: 0.5, type: "wait" },
      {
        conceptId: "function-rule",
        duration: 1,
        easing: "smooth",
        formulaTokenIds: ["f-token"],
        targetValue: 5,
        trackerId: "parameter:value",
        type: "sweepParameter"
      }
    ]
  };
  const runtimeState = buildMathSceneRuntimeState(scene, 1);
  const focusTargetIds = runtimeIndicationOverlayFocusTargetIds(runtimeState);
  const frames = buildRuntimeIndicationOverlayFrames(runtimeState);
  const summary = summarizeRuntimeIndicationOverlayFrames(
    frames,
    runtimeIndicationOverlayActiveConceptId(runtimeState),
    { focusTargetIds }
  );

  assert.equal(runtimeState.timeline.activeStep?.type, "sweepParameter");
  assert.deepEqual(focusTargetIds, ["parameter:value", "function-rule", "f-token"]);
  assert.equal(runtimeIndicationOverlayActiveConceptId(runtimeState), "function-rule");
  assert.equal(frames.length, 1);
  assert.equal(frames[0].objectId, "function-curve");
  assert.equal(frames[0].conceptId, "function-rule");
  assert.equal(summary.focusTargetCount, 3);
  assert.equal(summary.focusTargetIds, "parameter:value,function-rule,f-token");
  assert.equal(summary.objectIds, "function-curve");
});

test("serializes active runtime indication overlay frames as script-safe JSON", () => {
  const runtimeState = buildMathSceneRuntimeState(fixtureScene, 1);
  const frames = buildRuntimeIndicationOverlayFrames(runtimeState);
  const summary = summarizeRuntimeIndicationOverlayFrames(frames, runtimeState.timeline.activeConceptId);
  const json = serializeRuntimeIndicationOverlayPayload(
    frames.map((frame) => ({ ...frame, objectId: `<${frame.objectId}` })),
    { ...summary, objectIds: "<function-curve" }
  );
  const parsed = JSON.parse(json);

  assert.doesNotMatch(json, /</);
  assert.equal(parsed.activeConceptId, "function-rule");
  assert.equal(parsed.frameCount, 1);
  assert.equal(parsed.lineFrameCount, 1);
  assert.equal(parsed.objectIds, "<function-curve");
  assert.equal(parsed.sourceContract, RUNTIME_INDICATION_OVERLAY_SOURCE_CONTRACT);
  assert.equal(parsed.statePolicy, RUNTIME_INDICATION_OVERLAY_STATE_POLICY);
  assert.equal(parsed.frames.length, 1);
  assert.equal(parsed.frames[0].objectId, "<function-curve");
  assert.equal(parsed.frames[0].type, "line");
  assert.equal(parsed.frames[0].segmentId, "polyline");
  assert.deepEqual(parsed.frames[0].points, curveSamples);
});

test("Runtime indication overlay stays pure while MathSceneRuntime renders the bridge", () => {
  const source = fs.readFileSync("components/visualizations/three/manim/mathRuntimeIndicationOverlay.ts", "utf8");
  const runtimeSource = fs.readFileSync("components/visualizations/three/manim/MathSceneRuntime.tsx", "utf8");

  assert.match(source, /RUNTIME_INDICATION_OVERLAY_SOURCE_CONTRACT/);
  assert.match(source, /Scene\.play focus targets render transient attention overlays/);
  assert.match(source, /RUNTIME_INDICATION_OVERLAY_FOCUS_TARGET_POLICY/);
  assert.match(source, /runtimeIndicationOverlayFocusTargetIds/);
  assert.match(source, /buildRuntimeIndicationOverlayFrames/);
  assert.match(source, /runtimeIndicationOverlayDataAttributes/);
  assert.match(source, /serializeRuntimeIndicationOverlayPayload/);
  assert.doesNotMatch(source, /"use client"|@react-three\/fiber|@react-three\/drei|from "three"/);
  assert.match(runtimeSource, /buildRuntimeIndicationOverlayFrames/);
  assert.match(runtimeSource, /RuntimeIndicationOverlay/);
  assert.match(runtimeSource, /indication-overlay/);
});
