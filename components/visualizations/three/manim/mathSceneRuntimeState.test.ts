import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { buildMathSceneRuntimeState } from "./mathSceneRuntimeState";
import { buildCameraDirectorState, cameraShotForTimeline } from "./mathCameraDirector";
import { buildMathSceneSpecForThreeDFamily } from "./mathSceneRegistry";
import { applyMathUpdaters } from "./mathUpdaterRegistry";

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

test("V2 builds a Manim-inspired object graph with trackers and updater metadata", () => {
  assert.ok(functionGraphSpec);
  const state = buildMathSceneRuntimeState(functionGraphSpec!, 3);

  assert.equal(state.sceneId, "mais-manim-function-graph");
  assert.equal(state.objectGraph.rootIds.length, 4);
  assert.equal(state.objectGraph.byId["function-curve"].conceptId, "function-rule");
  assert.equal(state.objectGraph.byId["moving-probe"].parentId, "function-curve");
  assert.equal(state.objectGraph.byId["probe-trace"].parentId, "moving-probe");
  assert.equal(state.objectGraph.byId["function-curve"].boundingBox.kind, "finite");
  assert.equal(state.trackers.byId.timeline.value, 3);
  assert.equal(state.trackers.byId["function-curve:progress"].value, 1);
  assert.ok(state.trackers.byId["moving-probe:progress"].value > 0);
  assert.ok(state.updaters.byObjectId["moving-probe"].includes("move-along-path"));
  assert.ok(state.updaters.byObjectId["probe-trace"].includes("trace-recent-path"));
  assert.equal(state.diagnostics.mathObjectCount, 4);
  assert.equal(state.diagnostics.trackerCount, Object.keys(state.trackers.byId).length);
  assert.equal(state.diagnostics.updaterCount, state.updaters.entries.length);
});

test("V2 camera director chooses canonical and active teaching shots from timeline beats", () => {
  assert.ok(functionGraphSpec);

  const initial = buildCameraDirectorState(functionGraphSpec!, 0);
  const detail = buildCameraDirectorState(functionGraphSpec!, 8.6);

  assert.equal(initial.canonicalShotId, "overview");
  assert.equal(initial.activeShotId, "overview");
  assert.equal(initial.resetShotId, "overview");
  assert.equal(cameraShotForTimeline(functionGraphSpec!.timeline, functionGraphSpec!.cameraShots, 8.6)?.id, "curve-detail");
  assert.equal(detail.activeShotId, "curve-detail");
  assert.equal(detail.progress, 1);
});

test("V2 updater registry evaluates moving points and traces deterministically", () => {
  assert.ok(functionGraphSpec);
  const state = buildMathSceneRuntimeState(functionGraphSpec!, 3.5);
  const updated = applyMathUpdaters(functionGraphSpec!, state);
  const movingPoint = updated.objectGraph.byId["moving-probe"];
  const trace = updated.objectGraph.byId["probe-trace"];

  assert.equal(movingPoint.renderState.kind, "point");
  assert.equal(trace.renderState.kind, "polyline");
  assert.ok(trace.renderState.points.length > 2);
  assert.deepEqual(trace.renderState.points.at(-1), movingPoint.renderState.position);
});

test("V2 runtime diagnostics are exposed on the canvas surface", () => {
  const canvasSource = fs.readFileSync("components/visualizations/three/ThreeDLabCanvas.tsx", "utf8");
  const surfaceContractSource = fs.readFileSync("components/visualizations/three/threeDCanvasSurfaceContract.ts", "utf8");
  const runtimeSource = fs.readFileSync("components/visualizations/three/manim/MathSceneRuntime.tsx", "utf8");

  for (const attribute of [
    "data-viz-math-object-count",
    "data-viz-tracker-count",
    "data-viz-updater-count",
    "data-viz-camera-canonical-shot",
    "data-viz-reduced-motion"
  ]) {
    assert.match(canvasSource, new RegExp(attribute));
    assert.match(surfaceContractSource, new RegExp(attribute));
  }

  assert.match(canvasSource, /buildMathSceneRuntimeState/);
  assert.match(canvasSource, /buildCameraDirectorState/);
  assert.match(runtimeSource, /buildMathSceneRuntimeState/);
  assert.match(runtimeSource, /applyMathUpdaters/);
});
