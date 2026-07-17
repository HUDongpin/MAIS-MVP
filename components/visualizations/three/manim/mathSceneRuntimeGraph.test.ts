import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { buildMathSceneSpecForThreeDFamily } from "./mathSceneRegistry";
import { buildMathSceneRuntimeState, type MathObjectGraph } from "./mathSceneRuntimeState";
import {
  RUNTIME_SCENE_GRAPH_REFRESH_SOURCE_CONTRACT,
  buildMathSceneRuntimeGraphFrame,
  runtimeGraphFrameDataAttributes,
  serializeMathSceneRuntimeGraphFrame
} from "./mathSceneRuntimeGraph";

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

test("refreshes runtime graph families, bounding boxes, and render groups after frame mutations", () => {
  assert.ok(functionGraphSpec);
  const initialState = buildMathSceneRuntimeState(functionGraphSpec, 0);
  const mutatedGraph: MathObjectGraph = {
    byId: {
      ...initialState.objectGraph.byId,
      "function-curve": {
        ...initialState.objectGraph.byId["function-curve"],
        childIds: []
      },
      "moving-probe": {
        ...initialState.objectGraph.byId["moving-probe"],
        boundingBox: { kind: "empty" },
        childIds: [],
        renderState: { kind: "point", position: [10, 2, 0] }
      }
    },
    rootIds: ["axes", "function-curve"]
  };
  const frame = buildMathSceneRuntimeGraphFrame({
    objectGraph: mutatedGraph,
    scene: functionGraphSpec,
    timeline: initialState.timeline
  });

  assert.equal(frame.sourceContract, RUNTIME_SCENE_GRAPH_REFRESH_SOURCE_CONTRACT);
  assert.deepEqual(frame.objectGraph.byId["function-curve"].childIds, ["moving-probe"]);
  assert.deepEqual(frame.objectGraph.byId["moving-probe"].childIds, ["probe-trace"]);
  assert.deepEqual(frame.objectGraph.byId["moving-probe"].boundingBox, {
    center: [10, 2, 0],
    kind: "finite",
    max: [10, 2, 0],
    min: [10, 2, 0]
  });
  assert.deepEqual(frame.sceneGraph.renderGroups.scene, ["axes", "function-curve", "moving-probe", "probe-trace"]);
  assert.equal(frame.sceneGraph.summary.renderGroupIds, "axes,function-curve,moving-probe,probe-trace");
});

test("exposes runtime graph refresh QA attributes and JSON payloads", () => {
  assert.ok(functionGraphSpec);
  const initialState = buildMathSceneRuntimeState(functionGraphSpec, 0);
  const frame = buildMathSceneRuntimeGraphFrame({
    objectGraph: initialState.objectGraph,
    scene: functionGraphSpec,
    timeline: initialState.timeline
  });
  const attributes = runtimeGraphFrameDataAttributes(frame);
  const json = serializeMathSceneRuntimeGraphFrame(frame);
  const parsed = JSON.parse(json) as typeof frame;

  assert.equal(attributes["data-viz-manim-runtime-graph-source-contract"], RUNTIME_SCENE_GRAPH_REFRESH_SOURCE_CONTRACT);
  assert.equal(attributes["data-viz-manim-runtime-graph-object-count"], "4");
  assert.equal(attributes["data-viz-manim-runtime-graph-top-level-ids"], "axes,function-curve");
  assert.equal(attributes["data-viz-manim-runtime-graph-render-group-count"], "4");
  assert.equal(attributes["data-viz-manim-runtime-graph-render-group-ids"], "axes,function-curve,moving-probe,probe-trace");
  assert.equal(attributes["data-viz-manim-runtime-graph-foreground-ids"], "none");
  assert.equal(attributes["data-viz-manim-runtime-graph-fixed-in-frame-ids"], "none");
  assert.equal(attributes["data-viz-manim-runtime-graph-finite-bounding-box-count"], "3");
  assert.equal(attributes["data-viz-manim-runtime-graph-excluded-object-ids"], "none");
  assert.equal(
    attributes["data-viz-manim-runtime-graph-summary"],
    "runtime-graph:objects=4:top=axes,function-curve:render=axes,function-curve,moving-probe,probe-trace:foreground=none:fixed=none:finiteBounds=3:excluded=none"
  );
  assert.doesNotMatch(json, /</);
  assert.equal(parsed.sourceContract, RUNTIME_SCENE_GRAPH_REFRESH_SOURCE_CONTRACT);
  assert.equal(parsed.sceneGraph.summary.renderGroupIds, "axes,function-curve,moving-probe,probe-trace");
});

test("runtime graph refresh module stays pure and renderer independent", () => {
  const source = fs.readFileSync("components/visualizations/three/manim/mathSceneRuntimeGraph.ts", "utf8");

  assert.match(source, /RUNTIME_SCENE_GRAPH_REFRESH_SOURCE_CONTRACT/);
  assert.match(source, /buildMathSceneRuntimeGraphFrame/);
  assert.match(source, /runtimeGraphFrameDataAttributes/);
  assert.match(source, /serializeMathSceneRuntimeGraphFrame/);
  assert.doesNotMatch(source, /"use client"|@react-three\/fiber|@react-three\/drei|from "three"|window|document/);
});
