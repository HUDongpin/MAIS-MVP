import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import * as frameStepperModule from "./mathSceneFrameStepper";
import { buildCameraFrameTransition } from "./mathCameraFrame";
import { applyCameraFrameUpdatersWithDelta } from "./mathCameraFrameUpdater";
import {
  sampleMathSceneFrameSteps,
  SCENE_FRAME_STEPPER_SOURCE_CONTRACT,
  serializeMathSceneFrameStepCapture,
  stepMathSceneFrame
} from "./mathSceneFrameStepper";
import { buildMathSceneSpecForThreeDFamily } from "./mathSceneRegistry";
import type { MathSceneSpec, Vec3 } from "./mathSceneTypes";

type FrameStepDataAttributesExport = {
  frameStepDataAttributes?: (frame: ReturnType<typeof stepMathSceneFrame>) => Record<string, string>;
};

function buildFunctionGraphSpec() {
  const spec = buildMathSceneSpecForThreeDFamily({
    accent: "#22d3ee",
    state: {
      comparison: 5,
      depthValue: 1.4,
      familyId: "three-function-graph",
      mode: 0,
      primaryValue: 6,
      secondaryValue: 5,
      stateSummary: "family=three-function-graph;template=function-graph;value=6.000;comparison=5.000;depth=1.400",
      templateId: "function-graph",
      value: 6
    }
  });

  if (!spec) throw new Error("expected function graph MAIS Manim spec");
  return spec;
}

function buildVectorFieldUpdaterSpec(): MathSceneSpec {
  return {
    sceneId: "dt-vector-field-updater-stepper-test",
    familyId: "three-function-graph",
    coordinateSpace: {
      mathRange: { x: [-4, 4], y: [-4, 4], z: [-1, 1] },
      worldRange: { x: [-4, 4], y: [-4, 4], z: [-1, 1] }
    },
    objects: [
      {
        type: "parametricCurve",
        colorRole: "function",
        conceptId: "seed-position",
        id: "seed-path",
        samples: [
          [1, 0, 0],
          [1, 0, 0]
        ]
      },
      {
        type: "movingPoint",
        colorRole: "probe",
        conceptId: "flow-probe",
        id: "flow-probe",
        pathObjectId: "seed-path"
      }
    ],
    vectorFieldUpdaters: [
      {
        coordinateMode: "world",
        id: "flow-probe-dt-updater",
        objectId: "flow-probe",
        speedScale: 1,
        system: { type: "linear2d", matrix: [[1, 0], [0, 0]] },
        type: "moveAlongVectorField"
      }
    ],
    formulas: [],
    bindings: [],
    timeline: [{ type: "wait", duration: 3 }],
    cameraShots: [{ id: "overview", target: [0, 0, 0], position: [3, 3, 3], fov: 48 }],
    diagnostics: { expectedBindingCount: 0, expectedObjectCount: 2, expectedTokenCount: 0 }
  };
}

function roundedVec3(point: Vec3): Vec3 {
  return point.map((value) => {
    const rounded = Math.round(value * 1000) / 1000;
    return Object.is(rounded, -0) ? 0 : rounded;
  }) as Vec3;
}

function buildCameraFrameUpdaterSpec(): MathSceneSpec {
  return {
    sceneId: "dt-camera-frame-updater-stepper-test",
    familyId: "three-function-graph",
    coordinateSpace: {
      mathRange: { x: [-4, 4], y: [-4, 4], z: [-1, 1] },
      worldRange: { x: [-4, 4], y: [-4, 4], z: [-1, 1] }
    },
    objects: [],
    formulas: [],
    bindings: [],
    timeline: [{ type: "wait", duration: 6 }],
    cameraShots: [{ id: "overview", target: [0, 0.7, 0], position: [3, 3, 4], fov: 48 }],
    cameraUpdaters: [
      {
        degreesPerSecond: 30,
        endSeconds: 4,
        id: "ambient-orbit",
        startSeconds: 2,
        type: "ambientRotation"
      }
    ],
    diagnostics: { expectedBindingCount: 0, expectedObjectCount: 0, expectedTokenCount: 0 }
  };
}

function buildCameraToAndUpdaterSpec(): MathSceneSpec {
  return {
    ...buildCameraFrameUpdaterSpec(),
    sceneId: "camera-to-with-dt-updater-stepper-test",
    timeline: [
      { type: "wait", duration: 1 },
      { type: "cameraTo", shotId: "detail", duration: 2 },
      { type: "wait", duration: 1 }
    ],
    cameraShots: [
      { id: "overview", target: [0, 0.7, 0], position: [3, 3, 4], fov: 48 },
      { id: "detail", target: [0.2, 1.1, 0.1], position: [1.5, 2.2, 2.6], fov: 42 }
    ],
    cameraUpdaters: [
      {
        degreesPerSecond: 30,
        id: "ambient-orbit",
        startSeconds: 0,
        type: "ambientRotation"
      }
    ]
  };
}

test("steps a Manim-style Scene.update_frame with dt, updaters, evidence, and render-group capture", () => {
  const frame = stepMathSceneFrame(buildFunctionGraphSpec(), {
    deltaSeconds: 1 / 12,
    elapsedSeconds: 0,
    frameIndex: 3,
    reducedMotion: false
  });

  assert.equal(frame.frameIndex, 3);
  assert.equal(frame.deltaSeconds, 0.083);
  assert.equal(frame.elapsedSeconds, 0.083);
  assert.equal(frame.preciseElapsedSeconds, 1 / 12);
  assert.equal(frame.sourceContract, SCENE_FRAME_STEPPER_SOURCE_CONTRACT);
  assert.equal(frame.runtimeState.sceneId, "mais-manim-function-graph");
  assert.equal(frame.evidence.sceneRenderGroupIds, "axes,function-curve,moving-probe,probe-trace");
  assert.equal(frame.evidence.sceneRenderGroupOverlapIds, "none");
  assert.deepEqual(frame.capture, {
    activeStep: "revealCurve",
    cameraShot: "overview",
    elapsedSeconds: 0.083,
    frameIndex: 3,
    playbackLifecyclePhase: "progress",
    renderGroupIds: "axes,function-curve,moving-probe,probe-trace",
    renderGroupOverlapIds: "none",
    sceneId: "mais-manim-function-graph",
    updaterActiveCount: 1,
    updaterSuspendedCount: 3
  });
});

test("passes measured FormulaLayer viewport into frame-step evidence", () => {
  const frame = stepMathSceneFrame(buildFunctionGraphSpec(), {
    deltaSeconds: 1 / 12,
    elapsedSeconds: 0,
    formulaLayerViewport: { height: 320, width: 360 },
    frameIndex: 3,
    reducedMotion: false
  });

  assert.equal(frame.evidence.manimFormulaMobileViewport, true);
  assert.match(frame.evidence.manimFormulaSafeAreaSummary, /mobile=true/);
});

test("samples deterministic Scene.update_frame steps at a fixed fps without drifting time", () => {
  const frames = sampleMathSceneFrameSteps(buildFunctionGraphSpec(), {
    fps: 4,
    frameCount: 4,
    startElapsedSeconds: 0
  });

  assert.equal(frames.length, 4);
  assert.deepEqual(
    frames.map((frame) => frame.frameIndex),
    [0, 1, 2, 3]
  );
  assert.deepEqual(
    frames.map((frame) => frame.deltaSeconds),
    [0.25, 0.25, 0.25, 0.25]
  );
  assert.deepEqual(
    frames.map((frame) => frame.elapsedSeconds),
    [0.25, 0.5, 0.75, 1]
  );
  assert.ok(frames.every((frame) => frame.capture.sceneId === "mais-manim-function-graph"));
  assert.ok(frames.every((frame) => frame.capture.renderGroupIds === "axes,function-curve,moving-probe,probe-trace"));
});

test("samples frame evidence with the measured FormulaLayer viewport", () => {
  const frames = sampleMathSceneFrameSteps(buildFunctionGraphSpec(), {
    formulaLayerViewport: { height: 320, width: 360 },
    fps: 4,
    frameCount: 2,
    startElapsedSeconds: 0
  });

  assert.equal(frames.length, 2);
  assert.ok(frames.every((frame) => frame.evidence.manimFormulaMobileViewport === true));
  assert.ok(frames.every((frame) => frame.evidence.manimCaptureHeight === 320));
  assert.ok(frames.every((frame) => frame.evidence.manimCaptureWidth === 360));
  assert.ok(frames.every((frame) => /mobile=true/.test(frame.evidence.manimFormulaSafeAreaSummary)));
});

test("compares consecutive frames for Manim-style Mobject invalidation evidence", () => {
  const scene = buildFunctionGraphSpec();
  const firstFrame = stepMathSceneFrame(scene, {
    deltaSeconds: 0.25,
    elapsedSeconds: 0,
    frameIndex: 0
  });
  const nextFrame = stepMathSceneFrame(scene, {
    deltaSeconds: 0.25,
    elapsedSeconds: firstFrame.preciseElapsedSeconds,
    frameIndex: 1,
    previousRuntimeState: firstFrame.runtimeState
  });

  assert.equal(firstFrame.evidence.mobjectInvalidationSummary, "data=0;bbox=0;family=0;metadata=0;uniforms=0;unchanged=4");
  assert.ok(nextFrame.evidence.mobjectDataChangedCount > 0);
  assert.ok(nextFrame.evidence.mobjectBoundingBoxStaleCount > 0);
  assert.match(nextFrame.evidence.mobjectInvalidationSummary, /^data=[1-9]/);
});

test("chains previous runtime state while sampling frame steps", () => {
  const frames = sampleMathSceneFrameSteps(buildFunctionGraphSpec(), {
    fps: 4,
    frameCount: 3,
    startElapsedSeconds: 0
  });

  assert.equal(frames[0].evidence.mobjectInvalidationSummary, "data=0;bbox=0;family=0;metadata=0;uniforms=0;unchanged=4");
  assert.ok(frames[1].evidence.mobjectDataChangedCount > 0);
  assert.ok(frames[2].evidence.mobjectDataChangedCount > 0);
});

test("applies dt-aware moveAlongVectorField updaters from the previous frame state", () => {
  const scene = buildVectorFieldUpdaterSpec();
  const firstFrame = stepMathSceneFrame(scene, {
    deltaSeconds: 0.5,
    elapsedSeconds: 0,
    frameIndex: 0
  });
  const nextFrame = stepMathSceneFrame(scene, {
    deltaSeconds: 0.5,
    elapsedSeconds: firstFrame.preciseElapsedSeconds,
    frameIndex: 1,
    previousRuntimeState: firstFrame.runtimeState
  });
  const firstProbe = firstFrame.runtimeState.objectGraph.byId["flow-probe"];
  const nextProbe = nextFrame.runtimeState.objectGraph.byId["flow-probe"];

  assert.equal(firstProbe.renderState.kind, "point");
  assert.equal(nextProbe.renderState.kind, "point");
  if (firstProbe.renderState.kind !== "point" || nextProbe.renderState.kind !== "point") {
    throw new Error("expected flow probe point render states");
  }

  assert.equal(firstFrame.evidence.manimMoveAlongVectorFieldDeltaSummary, "flow-probe-dt-updater=0.500s");
  assert.equal(nextFrame.evidence.manimMoveAlongVectorFieldDeltaSummary, "flow-probe-dt-updater=0.500s");
  assert.deepEqual(firstProbe.renderState.position.map((value) => Number(value.toFixed(3))), [1.5, 0, 0]);
  assert.deepEqual(nextProbe.renderState.position.map((value) => Number(value.toFixed(3))), [2.25, 0, 0]);
});

test("applies dt-aware CameraFrame updaters from the previous frame state", () => {
  const scene = buildCameraFrameUpdaterSpec();
  const firstFrame = stepMathSceneFrame(scene, {
    deltaSeconds: 4,
    elapsedSeconds: 0,
    frameIndex: 0
  });
  const nextFrame = stepMathSceneFrame(scene, {
    deltaSeconds: 1,
    elapsedSeconds: firstFrame.preciseElapsedSeconds,
    frameIndex: 1,
    previousRuntimeState: firstFrame.runtimeState
  });

  assert.equal(firstFrame.runtimeState.cameraDirector.cameraAmbientRotationDegrees, 60);
  assert.deepEqual(roundedVec3(firstFrame.runtimeState.cameraDirector.frame.position), [4.964, 3, -0.598]);
  assert.equal(nextFrame.runtimeState.cameraDirector.cameraAmbientRotationDegrees, 0);
  assert.equal(nextFrame.runtimeState.cameraDirector.cameraUpdaterActiveCount, 0);
  assert.deepEqual(
    roundedVec3(nextFrame.runtimeState.cameraDirector.frame.position),
    roundedVec3(firstFrame.runtimeState.cameraDirector.frame.position)
  );
});

test("applies CameraFrame animation state before dt camera updaters during cameraTo", () => {
  const scene = buildCameraToAndUpdaterSpec();
  const firstFrame = stepMathSceneFrame(scene, {
    deltaSeconds: 1,
    elapsedSeconds: 0,
    frameIndex: 0
  });
  const nextFrame = stepMathSceneFrame(scene, {
    deltaSeconds: 0.5,
    elapsedSeconds: firstFrame.preciseElapsedSeconds,
    frameIndex: 1,
    previousRuntimeState: firstFrame.runtimeState
  });
  const cameraTransition = buildCameraFrameTransition(scene, nextFrame.preciseElapsedSeconds);
  const expectedCamera = applyCameraFrameUpdatersWithDelta(
    cameraTransition.frame,
    scene.cameraUpdaters,
    nextFrame.preciseElapsedSeconds,
    nextFrame.deltaSeconds
  );

  assert.equal(nextFrame.runtimeState.cameraDirector.activeShotId, "detail");
  assert.equal(Number(nextFrame.runtimeState.cameraDirector.progress.toFixed(6)), 0.15625);
  assert.equal(nextFrame.runtimeState.cameraDirector.cameraAmbientRotationDegrees, 15);
  assert.deepEqual(
    roundedVec3(nextFrame.runtimeState.cameraDirector.frame.position),
    roundedVec3(expectedCamera.frame.position)
  );
});

test("reduced motion emits the final deterministic frame while preserving Manim evidence", () => {
  const scene = buildFunctionGraphSpec();
  const normalFrame = stepMathSceneFrame(scene, {
    deltaSeconds: 0.1,
    elapsedSeconds: 0,
    frameIndex: 0,
    reducedMotion: false
  });
  const reducedFrame = stepMathSceneFrame(scene, {
    deltaSeconds: 0.1,
    elapsedSeconds: 0,
    frameIndex: 0,
    reducedMotion: true
  });

  assert.ok(normalFrame.runtimeState.timeline.progress < 1);
  assert.equal(reducedFrame.runtimeState.timeline.progress, 1);
  assert.equal(reducedFrame.runtimeState.timeline.elapsedSeconds, reducedFrame.runtimeState.timeline.totalDuration);
  assert.equal(reducedFrame.preciseElapsedSeconds, reducedFrame.runtimeState.timeline.totalDuration);
  assert.equal(reducedFrame.evidence.reducedMotion, true);
  assert.equal(reducedFrame.capture.elapsedSeconds, Number(reducedFrame.runtimeState.timeline.totalDuration.toFixed(3)));
  assert.equal(reducedFrame.runtimeState.trackers.byId["function-curve:progress"].value, 1);
  assert.equal(reducedFrame.runtimeState.trackers.byId["moving-probe:progress"].value, 1);
});

test("sanitizes invalid frame timing for deterministic QA", () => {
  const singleFrame = stepMathSceneFrame(buildFunctionGraphSpec(), {
    deltaSeconds: Number.NaN,
    elapsedSeconds: -2,
    frameIndex: -4
  });
  const sampledFrames = sampleMathSceneFrameSteps(buildFunctionGraphSpec(), {
    fps: 0,
    frameCount: -1,
    startElapsedSeconds: Number.POSITIVE_INFINITY
  });

  assert.equal(singleFrame.frameIndex, 0);
  assert.equal(singleFrame.deltaSeconds, 0);
  assert.equal(singleFrame.elapsedSeconds, 0);
  assert.equal(singleFrame.capture.activeStep, "revealCurve");
  assert.deepEqual(sampledFrames, []);
});

test("maps current Scene.update_frame stepper capture to browser QA data attributes", () => {
  const frameStepDataAttributes = (frameStepperModule as FrameStepDataAttributesExport).frameStepDataAttributes;
  assert.equal(typeof frameStepDataAttributes, "function");
  if (!frameStepDataAttributes) throw new Error("expected frameStepDataAttributes export");

  const frame = stepMathSceneFrame(buildFunctionGraphSpec(), {
    deltaSeconds: 1 / 12,
    elapsedSeconds: 0,
    frameIndex: 3,
    reducedMotion: false
  });

  assert.deepEqual(frameStepDataAttributes(frame), {
    "data-viz-manim-frame-stepper-active-step": "revealCurve",
    "data-viz-manim-frame-stepper-camera-shot": "overview",
    "data-viz-manim-frame-stepper-delta-seconds": "0.083",
    "data-viz-manim-frame-stepper-elapsed-seconds": "0.083",
    "data-viz-manim-frame-stepper-frame-index": "3",
    "data-viz-manim-frame-stepper-playback-phase": "progress",
    "data-viz-manim-frame-stepper-render-group-ids": "axes,function-curve,moving-probe,probe-trace",
    "data-viz-manim-frame-stepper-render-group-overlap-ids": "none",
    "data-viz-manim-frame-stepper-scene-id": "mais-manim-function-graph",
    "data-viz-manim-frame-stepper-source-contract": SCENE_FRAME_STEPPER_SOURCE_CONTRACT,
    "data-viz-manim-frame-stepper-summary": "frame-step:mais-manim-function-graph:frame=3:elapsed=0.083:dt=0.083:step=revealCurve:camera=overview:phase=progress:updaters=1/3",
    "data-viz-manim-frame-stepper-updater-active-count": "1",
    "data-viz-manim-frame-stepper-updater-suspended-count": "3"
  });
  const json = serializeMathSceneFrameStepCapture(frame);
  assert.doesNotMatch(json, /</);
  assert.deepEqual(JSON.parse(json), {
    capture: {
      activeStep: "revealCurve",
      cameraShot: "overview",
      elapsedSeconds: 0.083,
      frameIndex: 3,
      playbackLifecyclePhase: "progress",
      renderGroupIds: "axes,function-curve,moving-probe,probe-trace",
      renderGroupOverlapIds: "none",
      sceneId: "mais-manim-function-graph",
      updaterActiveCount: 1,
      updaterSuspendedCount: 3
    },
    deltaSeconds: 0.083,
    elapsedSeconds: 0.083,
    frameIndex: 3,
    preciseElapsedSeconds: 0.08333333333333333,
    sourceContract: SCENE_FRAME_STEPPER_SOURCE_CONTRACT,
    summary: "frame-step:mais-manim-function-graph:frame=3:elapsed=0.083:dt=0.083:step=revealCurve:camera=overview:phase=progress:updaters=1/3"
  });
});

test("MathSceneFrameStepper stays pure and frame audit delegates update-frame composition to it", () => {
  const stepperSource = fs.readFileSync("components/visualizations/three/manim/mathSceneFrameStepper.ts", "utf8");
  const auditSource = fs.readFileSync("components/visualizations/three/manim/mathSceneFrameAudit.ts", "utf8");

  assert.match(stepperSource, /buildMathSceneRuntimeState/);
  assert.match(stepperSource, /buildMathSceneAnimatePlans/);
  assert.match(stepperSource, /buildCameraFrameTransition/);
  assert.match(stepperSource, /applyMathUpdaters/);
  assert.match(stepperSource, /applyCameraFrameUpdatersWithDelta/);
  assert.match(stepperSource, /buildMathSceneEvidenceSnapshot/);
  assert.match(stepperSource, /SCENE_FRAME_STEPPER_SOURCE_CONTRACT/);
  assert.match(stepperSource, /frameStepDataAttributes/);
  assert.match(stepperSource, /serializeMathSceneFrameStepCapture/);
  assert.doesNotMatch(stepperSource, /"use client"|@react-three\/fiber|@react-three\/drei|from "three"/);
  assert.match(auditSource, /stepMathSceneFrame/);
});
