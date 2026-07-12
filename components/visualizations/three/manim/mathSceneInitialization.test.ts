import assert from "node:assert/strict";
import test from "node:test";
import {
  SCENE_INITIALIZATION_SOURCE_CONTRACT,
  buildMathSceneInitializationEvidence,
  mathSceneInitializationDataAttributes,
  serializeMathSceneInitializationEvidence
} from "./mathSceneInitialization";
import { buildMathSceneSpecForThreeDFamily } from "./mathSceneRegistry";
import { buildMathSceneRuntimeState } from "./mathSceneRuntimeState";

const functionGraphSpec = buildMathSceneSpecForThreeDFamily({
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

test("summarizes Manim Scene.__init__ readiness from the runtime state", () => {
  assert.ok(functionGraphSpec);
  const runtimeState = buildMathSceneRuntimeState(functionGraphSpec, 0);
  const initialization = buildMathSceneInitializationEvidence({
    history: {
      canRedo: false,
      canUndo: false,
      currentLabel: "initial",
      droppedUndoCount: 0,
      maxUndoEntries: 50,
      redoCount: 0,
      revision: 0,
      undoCount: 0
    },
    runtimeState,
    scene: functionGraphSpec
  });

  assert.equal(initialization.ready, true);
  assert.equal(initialization.cameraReady, true);
  assert.equal(initialization.cameraFrameReady, true);
  assert.equal(initialization.fileWriterReady, true);
  assert.equal(initialization.sceneId, "mais-manim-function-graph");
  assert.equal(initialization.topLevelMobjectCount, 2);
  assert.equal(initialization.renderGroupCount, 4);
  assert.equal(initialization.renderGroupIds, "axes,function-curve,moving-probe,probe-trace");
  assert.equal(initialization.sceneTimeSeconds, 0);
  assert.equal(initialization.numPlays, 0);
  assert.equal(initialization.sourceContract, SCENE_INITIALIZATION_SOURCE_CONTRACT);
  assert.match(SCENE_INITIALIZATION_SOURCE_CONTRACT, /Scene\.__init__/);
  assert.match(SCENE_INITIALIZATION_SOURCE_CONTRACT, /CameraFrame/);
  assert.match(SCENE_INITIALIZATION_SOURCE_CONTRACT, /SceneFileWriter/);
  assert.equal(initialization.undoStackCount, 0);
  assert.equal(initialization.redoStackCount, 0);
  assert.match(initialization.randomSeedSignature, /^rng-[0-9a-f]{8}$/);
  assert.equal(
    initialization.sourceSummary,
    "Scene.__init__:camera=true:cameraFrame=true:fileWriter=true:mobjects=2:renderGroups=4:time=0.000:numPlays=0:history=0/0"
  );
  assert.equal(
    initialization.summary,
    `scene-init:mais-manim-function-graph:ready=true:camera=overview:frame=overview:writer=true:topLevel=2:renderGroups=4:seed=${initialization.randomSeedSignature}`
  );
  const json = serializeMathSceneInitializationEvidence(initialization);
  assert.doesNotMatch(json, /</);
  assert.deepEqual(JSON.parse(json), {
    cameraFrameId: "overview",
    cameraFrameReady: true,
    cameraId: "overview",
    cameraReady: true,
    fileWriterReady: true,
    numPlays: 0,
    randomSeedSignature: initialization.randomSeedSignature,
    ready: true,
    redoStackCount: 0,
    renderGroupCount: 4,
    renderGroupIds: "axes,function-curve,moving-probe,probe-trace",
    sceneId: "mais-manim-function-graph",
    sceneTimeSeconds: 0,
    sourceContract: SCENE_INITIALIZATION_SOURCE_CONTRACT,
    sourceSummary: "Scene.__init__:camera=true:cameraFrame=true:fileWriter=true:mobjects=2:renderGroups=4:time=0.000:numPlays=0:history=0/0",
    summary: `scene-init:mais-manim-function-graph:ready=true:camera=overview:frame=overview:writer=true:topLevel=2:renderGroups=4:seed=${initialization.randomSeedSignature}`,
    topLevelMobjectCount: 2,
    undoStackCount: 0
  });
});

test("exports Manim Scene.__init__ evidence as browser QA attributes", () => {
  assert.ok(functionGraphSpec);
  const runtimeState = buildMathSceneRuntimeState(functionGraphSpec, 0);
  const initialization = buildMathSceneInitializationEvidence({
    history: {
      canRedo: false,
      canUndo: false,
      currentLabel: "initial",
      droppedUndoCount: 0,
      maxUndoEntries: 50,
      redoCount: 0,
      revision: 0,
      undoCount: 0
    },
    runtimeState,
    scene: functionGraphSpec
  });
  const attributes = mathSceneInitializationDataAttributes(initialization);

  assert.equal(attributes["data-viz-manim-scene-init-ready"], "true");
  assert.equal(attributes["data-viz-manim-scene-init-camera-ready"], "true");
  assert.equal(attributes["data-viz-manim-scene-init-camera-frame-ready"], "true");
  assert.equal(attributes["data-viz-manim-scene-init-file-writer-ready"], "true");
  assert.equal(attributes["data-viz-manim-scene-init-top-level-mobject-count"], "2");
  assert.equal(attributes["data-viz-manim-scene-init-render-group-count"], "4");
  assert.equal(attributes["data-viz-manim-scene-init-render-group-ids"], "axes,function-curve,moving-probe,probe-trace");
  assert.equal(attributes["data-viz-manim-scene-init-time-seconds"], "0.000");
  assert.equal(attributes["data-viz-manim-scene-init-num-plays"], "0");
  assert.equal(attributes["data-viz-manim-scene-init-undo-count"], "0");
  assert.equal(attributes["data-viz-manim-scene-init-redo-count"], "0");
  assert.equal(attributes["data-viz-manim-scene-init-random-seed-signature"], initialization.randomSeedSignature);
  assert.equal(attributes["data-viz-manim-scene-init-source-contract"], SCENE_INITIALIZATION_SOURCE_CONTRACT);
  assert.equal(attributes["data-viz-manim-scene-init-source-summary"], initialization.sourceSummary);
  assert.equal(attributes["data-viz-manim-scene-init-summary"], initialization.summary);
});
