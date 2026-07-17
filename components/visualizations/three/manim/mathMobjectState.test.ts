import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  becomeMobjectState,
  buildMobjectStatePayload,
  generateMobjectTarget,
  type MathMobjectTargetState,
  mobjectStatePayloadDataAttributes,
  restoreMobjectState,
  saveMobjectState,
  summarizeMobjectStateReadiness
} from "./mathMobjectState";
import { buildMathSceneSpecForThreeDFamily } from "./mathSceneRegistry";
import { buildMathSceneRuntimeState, type MathObjectGraph, type RuntimeRenderState } from "./mathSceneRuntimeState";

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

function runtimeGraph() {
  assert.ok(functionGraphSpec);
  return buildMathSceneRuntimeState(functionGraphSpec, 0).objectGraph;
}

function cloneGraph(graph: MathObjectGraph): MathObjectGraph {
  return JSON.parse(JSON.stringify(graph)) as MathObjectGraph;
}

test("saves an immutable Manim-style state snapshot for a full Mobject family", () => {
  const graph = cloneGraph(runtimeGraph());
  const snapshot = saveMobjectState(graph, "function-curve");

  assert.equal(snapshot.rootId, "function-curve");
  assert.equal(snapshot.conceptId, "function-rule");
  assert.deepEqual(snapshot.familyIds, ["function-curve", "moving-probe", "probe-trace"]);
  assert.equal(Object.keys(snapshot.nodes).length, 3);
  assert.equal(snapshot.nodes["function-curve"].renderState.kind, "polyline");

  const curveNode = graph.byId["function-curve"];
  assert.equal(curveNode.renderState.kind, "polyline");
  curveNode.renderState.points.push([999, 999, 999]);

  const savedCurve = snapshot.nodes["function-curve"].renderState;
  assert.equal(savedCurve.kind, "polyline");
  assert.notDeepEqual(savedCurve.points.at(-1), [999, 999, 999]);
});

test("restores a saved Mobject family without overwriting unrelated scene objects", () => {
  const graph = cloneGraph(runtimeGraph());
  const snapshot = saveMobjectState(graph, "function-curve");
  const modified = cloneGraph(graph);
  const unrelatedId = graph.rootIds.find((id) => !snapshot.familyIds.includes(id));

  assert.ok(unrelatedId);
  modified.byId["function-curve"].renderState = { kind: "empty" };
  modified.byId["moving-probe"].renderState = { kind: "point", position: [99, 99, 99] };

  const restored = restoreMobjectState(modified, snapshot);

  assert.deepEqual(restored.byId["function-curve"].renderState, snapshot.nodes["function-curve"].renderState);
  assert.deepEqual(restored.byId["moving-probe"].renderState, snapshot.nodes["moving-probe"].renderState);
  assert.deepEqual(restored.byId[unrelatedId].renderState, modified.byId[unrelatedId].renderState);
  assert.notEqual(restored.byId["function-curve"], modified.byId["function-curve"]);
});

test("restore includes runtime MathObject specs so render adapters cannot drift from saved state", () => {
  const graph = cloneGraph(runtimeGraph());
  const snapshot = saveMobjectState(graph, "function-curve");
  const modified = cloneGraph(graph);

  modified.byId["function-curve"].spec = {
    colorRole: "attention",
    conceptId: "drifted-spec",
    from: [9, 9, 9],
    id: "function-curve",
    to: [10, 10, 10],
    type: "vector"
  };

  const restored = restoreMobjectState(modified, snapshot);

  assert.deepEqual(snapshot.nodes["function-curve"].spec, graph.byId["function-curve"].spec);
  assert.deepEqual(restored.byId["function-curve"].spec, snapshot.nodes["function-curve"].spec);
  assert.equal(restored.byId["function-curve"].spec.type, restored.byId["function-curve"].type);
});

test("generates target state and applies become semantics while preserving source identity", () => {
  const graph = cloneGraph(runtimeGraph());
  const snapshot = saveMobjectState(graph, "function-curve");
  const targetRenderState: RuntimeRenderState = {
    kind: "polyline",
    points: [
      [-1, -1, 0],
      [0, 0, 0],
      [1, 1, 0]
    ]
  };
  const target = generateMobjectTarget(snapshot, {
    nodeOverrides: {
      "function-curve": {
        colorRole: "attention",
        renderState: targetRenderState
      }
    },
    targetId: "function-curve-target"
  });

  assert.equal(target.kind, "target");
  assert.equal(target.sourceObjectId, "function-curve");
  assert.equal(target.targetId, "function-curve-target");
  assert.deepEqual(target.nodes["function-curve"].renderState, targetRenderState);

  const becomeGraph = becomeMobjectState(graph, "function-curve", target);

  assert.equal(becomeGraph.byId["function-curve"].id, "function-curve");
  assert.equal(becomeGraph.byId["function-curve"].conceptId, "function-rule");
  assert.equal(becomeGraph.byId["function-curve"].colorRole, "attention");
  assert.deepEqual(becomeGraph.byId["function-curve"].renderState, targetRenderState);
});

test("saves target uniforms and restores opacity like Manim Mobject state", () => {
  const graph = cloneGraph(runtimeGraph());
  graph.byId["function-curve"].uniforms = {
    clippingPlanes: [],
    fixedInFrame: false,
    opacity: 0.8,
    shadeIn3D: true
  };
  const snapshot = saveMobjectState(graph, "function-curve");
  const target = generateMobjectTarget(snapshot, {
    nodeOverrides: {
      "function-curve": {
        uniforms: {
          clippingPlanes: [],
          fixedInFrame: false,
          opacity: 0.35,
          shadeIn3D: true
        }
      }
    },
    targetId: "function-curve-opacity-target"
  });
  const modified = cloneGraph(graph);
  modified.byId["function-curve"].uniforms = {
    clippingPlanes: [],
    fixedInFrame: false,
    opacity: 1,
    shadeIn3D: false
  };

  const becomeGraph = becomeMobjectState(modified, "function-curve", target);

  assert.equal(snapshot.nodes["function-curve"].uniforms?.opacity, 0.8);
  assert.equal(target.nodes["function-curve"].uniforms?.opacity, 0.35);
  assert.equal(becomeGraph.byId["function-curve"].uniforms?.opacity, 0.35);
  assert.equal(becomeGraph.byId["function-curve"].uniforms?.shadeIn3D, true);
});

test("become with a same-root target preserves source runtime adapter metadata", () => {
  const graph = cloneGraph(runtimeGraph());
  const snapshot = saveMobjectState(graph, "function-curve");
  const sourceSpec = cloneGraph(graph).byId["function-curve"].spec;
  const sourceChildIds = [...graph.byId["function-curve"].childIds];
  const targetRenderState: RuntimeRenderState = { kind: "point", position: [4, 5, 6] };
  const target = generateMobjectTarget(snapshot, {
    nodeOverrides: {
      "function-curve": {
        childIds: ["target-only-child"],
        renderState: targetRenderState,
        spec: {
          colorRole: "attention",
          conceptId: "target-adapter-drift",
          from: [9, 9, 9],
          id: "function-curve",
          to: [10, 10, 10],
          type: "vector"
        },
        uniforms: {
          clippingPlanes: [],
          fixedInFrame: true,
          opacity: 0.42,
          shadeIn3D: false
        }
      }
    },
    targetId: "function-curve-same-root-target"
  });

  const becomeGraph = becomeMobjectState(graph, "function-curve", target);

  assert.deepEqual(becomeGraph.byId["function-curve"].renderState, targetRenderState);
  assert.equal(becomeGraph.byId["function-curve"].uniforms?.opacity, 0.42);
  assert.deepEqual(becomeGraph.byId["function-curve"].spec, sourceSpec);
  assert.deepEqual(becomeGraph.byId["function-curve"].childIds, sourceChildIds);
  assert.equal(becomeGraph.byId["function-curve"].type, graph.byId["function-curve"].type);
});

test("becomes a different-root target family by family order while preserving source identities", () => {
  const graph: MathObjectGraph = {
    byId: {
      "source-root": {
        boundingBox: { kind: "finite", center: [0.5, 0, 0], min: [0, 0, 0], max: [1, 0, 0] },
        childIds: ["source-child"],
        colorRole: "function",
        conceptId: "source-root-concept",
        id: "source-root",
        renderState: { kind: "vector", from: [0, 0, 0], to: [1, 0, 0] },
        spec: { type: "vector", id: "source-root", from: [0, 0, 0], to: [1, 0, 0], colorRole: "function", conceptId: "source-root-concept" },
        type: "vector"
      },
      "source-child": {
        boundingBox: { kind: "finite", center: [0.5, 1, 0], min: [0, 1, 0], max: [1, 1, 0] },
        childIds: [],
        colorRole: "probe",
        conceptId: "source-child-concept",
        id: "source-child",
        parentId: "source-root",
        renderState: { kind: "vector", from: [0, 1, 0], to: [1, 1, 0] },
        spec: { type: "vector", id: "source-child", from: [0, 1, 0], to: [1, 1, 0], colorRole: "probe", conceptId: "source-child-concept" },
        type: "vector"
      }
    },
    rootIds: ["source-root"]
  };
  const target: MathMobjectTargetState = {
    conceptId: "target-root-concept",
    familyIds: ["target-root", "target-child"],
    kind: "target",
    nodes: {
      "target-root": {
        boundingBox: { kind: "finite", center: [2, 0, 0], min: [2, 0, 0], max: [2, 0, 0] },
        childIds: ["target-child"],
        colorRole: "attention",
        conceptId: "target-root-concept",
        id: "target-root",
        renderState: { kind: "point", position: [2, 0, 0] },
        spec: { colorRole: "attention", conceptId: "target-root-concept", id: "target-root", pathObjectId: "target-child", type: "movingPoint" },
        type: "movingPoint",
        uniforms: { clippingPlanes: [], fixedInFrame: false, opacity: 0.5, shadeIn3D: false }
      },
      "target-child": {
        boundingBox: { kind: "finite", center: [2, 2, 0], min: [2, 2, 0], max: [2, 2, 0] },
        childIds: [],
        colorRole: "trace",
        conceptId: "target-child-concept",
        id: "target-child",
        parentId: "target-root",
        renderState: { kind: "point", position: [2, 2, 0] },
        spec: { colorRole: "trace", durationSeconds: 1, id: "target-child", sourceObjectId: "target-root", type: "trace" },
        type: "movingPoint"
      }
    },
    rootId: "target-root",
    sourceObjectId: "target-root",
    targetId: "target-root:target"
  };

  const becomeGraph = becomeMobjectState(graph, "source-root", target);

  assert.equal(becomeGraph.byId["source-root"].id, "source-root");
  assert.deepEqual(becomeGraph.byId["source-root"].childIds, ["source-child"]);
  assert.equal(becomeGraph.byId["source-root"].type, "vector");
  assert.equal(becomeGraph.byId["source-root"].spec.type, "vector");
  assert.equal(becomeGraph.byId["source-root"].colorRole, "attention");
  assert.deepEqual(becomeGraph.byId["source-root"].renderState, target.nodes["target-root"].renderState);
  assert.equal(becomeGraph.byId["source-root"].uniforms?.opacity, 0.5);
  assert.equal(becomeGraph.byId["source-child"].id, "source-child");
  assert.equal(becomeGraph.byId["source-child"].parentId, "source-root");
  assert.equal(becomeGraph.byId["source-child"].type, "vector");
  assert.equal(becomeGraph.byId["source-child"].spec.type, "vector");
  assert.equal(becomeGraph.byId["source-child"].colorRole, "trace");
  assert.deepEqual(becomeGraph.byId["source-child"].renderState, target.nodes["target-child"].renderState);
});

test("summarizes Mobject state readiness for runtime evidence", () => {
  const graph = runtimeGraph();
  const summary = summarizeMobjectStateReadiness(graph);

  assert.equal(summary.restorableObjectCount, 4);
  assert.equal(summary.stateFamilyRootCount, 2);
  assert.equal(summary.stateSnapshotNodeCount, 4);
  assert.equal(summary.targetableObjectCount, 3);
});

test("summarizes generate_target aggregate render evidence for browser QA", () => {
  const payload = buildMobjectStatePayload(runtimeGraph());
  const expectedTargetNodeCount = payload.rows.reduce((sum, row) => sum + row.nodeCount, 0);
  const expectedTargetPointCount = payload.rows.reduce((sum, row) => sum + row.pointCount, 0);
  const expectedTargetRenderDataNodeCount = payload.rows.reduce(
    (sum, row) => sum + row.renderDataNodeCount,
    0
  );
  const becomeReadyRows = payload.rows.filter((row) => row.becomeReady);
  const expectedBecomeNodeCount = becomeReadyRows.reduce((sum, row) => sum + row.nodeCount, 0);
  const expectedBecomePointCount = becomeReadyRows.reduce((sum, row) => sum + row.pointCount, 0);
  const expectedBecomeRenderDataNodeCount = becomeReadyRows.reduce(
    (sum, row) => sum + row.renderDataNodeCount,
    0
  );

  assert.equal(payload.targetNodeCount, expectedTargetNodeCount);
  assert.equal(payload.targetPointCount, expectedTargetPointCount);
  assert.equal(payload.targetRenderDataNodeCount, expectedTargetRenderDataNodeCount);
  assert.ok(payload.targetNodeCount >= payload.snapshotCount);
  assert.ok(payload.targetPointCount > payload.targetNodeCount);
  assert.ok(payload.targetRenderDataNodeCount > 0);
  assert.equal(payload.becomeAppliedCount, becomeReadyRows.length);
  assert.equal(payload.becomeNodeCount, expectedBecomeNodeCount);
  assert.equal(payload.becomePointCount, expectedBecomePointCount);
  assert.equal(payload.becomeRenderDataNodeCount, expectedBecomeRenderDataNodeCount);
  assert.equal(payload.becomeAppliedCount, payload.becomeReadyCount);
  assert.equal(payload.becomeNodeCount, payload.targetNodeCount);
  assert.equal(payload.becomeRenderDataNodeCount, payload.targetRenderDataNodeCount);
  assert.equal(payload.sourceContract, "Mobject.save_state|restore|generate_target|become");

  const attributes = mobjectStatePayloadDataAttributes(payload);

  assert.equal(attributes["data-viz-mobject-state-become-applied-count"], String(payload.becomeAppliedCount));
  assert.equal(
    attributes["data-viz-mobject-state-source-contract"],
    "Mobject.save_state|restore|generate_target|become"
  );
  assert.equal(attributes["data-viz-mobject-state-become-node-count"], String(payload.becomeNodeCount));
  assert.equal(attributes["data-viz-mobject-state-become-point-count"], String(payload.becomePointCount));
  assert.equal(
    attributes["data-viz-mobject-state-become-render-data-count"],
    String(payload.becomeRenderDataNodeCount)
  );
  assert.equal(attributes["data-viz-mobject-state-target-node-count"], String(payload.targetNodeCount));
  assert.equal(attributes["data-viz-mobject-state-target-point-count"], String(payload.targetPointCount));
  assert.equal(
    attributes["data-viz-mobject-state-target-render-data-count"],
    String(payload.targetRenderDataNodeCount)
  );
});

test("Mobject state stays pure and renderer-independent", () => {
  const source = fs.readFileSync("components/visualizations/three/manim/mathMobjectState.ts", "utf8");

  assert.match(source, /MOBJECT_STATE_SOURCE_CONTRACT/);
  assert.doesNotMatch(source, /"use client"|@react-three\/fiber|@react-three\/drei|from "three"/);
});
