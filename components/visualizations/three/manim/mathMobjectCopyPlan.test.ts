import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  buildMobjectCopyPlan,
  copyMobjectFamilyIntoGraph,
  mobjectCopyPlanDataAttributes,
  serializeMobjectCopyPlan,
  summarizeMobjectCopyPlan
} from "./mathMobjectCopyPlan";
import { buildMathSceneSpecForThreeDFamily } from "./mathSceneRegistry";
import { stepMathSceneFrame } from "./mathSceneFrameStepper";
import type { MathObjectGraph } from "./mathSceneRuntimeState";

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

function runtimeObjectGraph(): MathObjectGraph {
  assert.ok(functionGraphSpec);
  return stepMathSceneFrame(functionGraphSpec, {
    deltaSeconds: 0,
    elapsedSeconds: 3.2,
    frameIndex: 0
  }).runtimeState.objectGraph;
}

test("builds a deterministic Manim-style deep copy plan for a Mobject family", () => {
  const plan = buildMobjectCopyPlan(runtimeObjectGraph(), "function-curve");

  assert.equal(plan.sourceObjectId, "function-curve");
  assert.equal(plan.copyRootId, "function-curve:copy");
  assert.deepEqual(plan.sourceFamilyIds, ["function-curve", "moving-probe", "probe-trace"]);
  assert.deepEqual(plan.copiedNodeIds, ["function-curve:copy", "moving-probe:copy", "probe-trace:copy"]);
  assert.deepEqual(plan.idMap, {
    "function-curve": "function-curve:copy",
    "moving-probe": "moving-probe:copy",
    "probe-trace": "probe-trace:copy"
  });
  assert.equal(plan.sourceContract, "Mobject.copy|copy.deepcopy|family graph duplication");
  assert.equal(plan.nodes["function-curve:copy"].parentId, undefined);
  assert.deepEqual(plan.nodes["function-curve:copy"].childIds, ["moving-probe:copy"]);
  assert.equal(plan.nodes["moving-probe:copy"].parentId, "function-curve:copy");
  assert.deepEqual(plan.nodes["moving-probe:copy"].childIds, ["probe-trace:copy"]);
  assert.equal(plan.copiedFamilyCount, 3);
  assert.equal(plan.cloneIsolationPreserved, true);
  assert.equal(plan.sharedReferenceCount, 0);
  assert.equal(plan.cloneIsolationSummary, "cloneIsolation:isolated=true:sharedRefs=0:nodes=3");
  assert.equal(plan.renderDataNodeCount, 3);
  assert.ok(plan.pointCount > 70);
  assert.equal(
    summarizeMobjectCopyPlan(plan),
    `mobject-copy:source=function-curve:copyRoot=function-curve:copy:family=3:render=3:points=${plan.pointCount}:childLinks=2`
  );
  assert.match(plan.signature, /^mobject-copy-[0-9a-f]{8}$/);
});

test("applies a Mobject copy plan without mutating the source graph", () => {
  const graph = runtimeObjectGraph();
  const plan = buildMobjectCopyPlan(graph, "function-curve");
  const nextGraph = copyMobjectFamilyIntoGraph(graph, plan);

  assert.ok(nextGraph.byId["function-curve:copy"]);
  assert.ok(nextGraph.byId["moving-probe:copy"]);
  assert.ok(nextGraph.byId["probe-trace:copy"]);
  assert.deepEqual(nextGraph.rootIds, [...graph.rootIds, "function-curve:copy"]);
  assert.equal(graph.byId["function-curve:copy"], undefined);
  assert.notEqual(nextGraph.byId["function-curve:copy"], graph.byId["function-curve"]);
  assert.deepEqual(nextGraph.byId["function-curve:copy"].renderState, graph.byId["function-curve"].renderState);

  if (nextGraph.byId["function-curve:copy"].renderState.kind !== "polyline") {
    throw new Error("expected copied curve render state");
  }
  nextGraph.byId["function-curve:copy"].renderState.points.push([99, 99, 99]);
  assert.notDeepEqual(nextGraph.byId["function-curve:copy"].renderState, graph.byId["function-curve"].renderState);
});

test("serializes copy plans and maps them to browser QA attributes", () => {
  const plan = buildMobjectCopyPlan(runtimeObjectGraph(), "function-curve");
  const serialized = serializeMobjectCopyPlan(plan);
  const attributes = mobjectCopyPlanDataAttributes(plan);

  assert.doesNotMatch(serialized, /</);
  assert.match(serialized, /"copyRootId":"function-curve:copy"/);
  assert.match(serialized, /"sourceObjectId":"function-curve"/);
  assert.deepEqual(attributes, {
    "data-viz-mobject-copy-child-link-count": "2",
    "data-viz-mobject-copy-clone-isolated": "true",
    "data-viz-mobject-copy-clone-isolation-summary": "cloneIsolation:isolated=true:sharedRefs=0:nodes=3",
    "data-viz-mobject-copy-family-count": "3",
    "data-viz-mobject-copy-id-map-summary": "function-curve=>function-curve:copy,moving-probe=>moving-probe:copy,probe-trace=>probe-trace:copy",
    "data-viz-mobject-copy-parent-link-count": "2",
    "data-viz-mobject-copy-point-count": String(plan.pointCount),
    "data-viz-mobject-copy-render-data-count": "3",
    "data-viz-mobject-copy-root-id": "function-curve:copy",
    "data-viz-mobject-copy-signature": plan.signature,
    "data-viz-mobject-copy-shared-reference-count": "0",
    "data-viz-mobject-copy-source-contract": "Mobject.copy|copy.deepcopy|family graph duplication",
    "data-viz-mobject-copy-source-id": "function-curve",
    "data-viz-mobject-copy-summary": summarizeMobjectCopyPlan(plan)
  });
});

test("chooses the first renderable top-level family when no source id is provided", () => {
  const plan = buildMobjectCopyPlan(runtimeObjectGraph());

  assert.equal(plan.sourceObjectId, "axes");
  assert.equal(plan.copyRootId, "axes:copy");
  assert.equal(plan.renderDataNodeCount, 1);
  assert.equal(plan.pointCount, 6);
});

test("Mobject copy planning stays pure and renderer-independent", () => {
  const source = fs.readFileSync("components/visualizations/three/manim/mathMobjectCopyPlan.ts", "utf8");

  assert.match(source, /buildMobjectFamilyIndex/);
  assert.match(source, /MOBJECT_COPY_SOURCE_CONTRACT/);
  assert.doesNotMatch(source, /"use client"|@react-three\/fiber|@react-three\/drei|from "three"/);
});
