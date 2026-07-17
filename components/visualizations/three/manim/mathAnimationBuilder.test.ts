import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  ANIMATION_BUILDER_SOURCE_CONTRACT,
  buildMathAnimateBuilderCatalog,
  createMathAnimateBuilder,
  mathAnimateBuilderCatalogDataAttributes,
  serializeMathAnimateBuilderCatalog,
  summarizeMathAnimatePlan
} from "./mathAnimationBuilder";
import { buildMathSceneAnimatePlans } from "./mathSceneAnimationPlans";
import { buildMathSceneSpecForThreeDFamily } from "./mathSceneRegistry";
import { buildMathSceneRuntimeState, type MathObjectGraph } from "./mathSceneRuntimeState";
import type { Vec3 } from "./mathSceneTypes";

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

function runtimeGraph(): MathObjectGraph {
  assert.ok(functionGraphSpec);
  return buildMathSceneRuntimeState(functionGraphSpec, 0).objectGraph;
}

function shifted(point: Vec3, delta: Vec3): Vec3 {
  return [point[0] + delta[0], point[1] + delta[1], point[2] + delta[2]];
}

function rounded(point: Vec3): Vec3 {
  return point.map((coordinate) => Number(coordinate.toFixed(6))) as Vec3;
}

function parentWithChildGraph(): MathObjectGraph {
  return {
    byId: {
      child: {
        boundingBox: { center: [1, 0.5, 0], kind: "finite", max: [2, 1, 0], min: [0, 0, 0] },
        childIds: [],
        colorRole: "function",
        conceptId: "curve",
        id: "child",
        parentId: "parent",
        renderState: { kind: "polyline", points: [[0, 0, 0], [2, 1, 0]] },
        spec: {
          colorRole: "function",
          conceptId: "curve",
          id: "child",
          samples: [[0, 0, 0], [2, 1, 0]],
          type: "parametricCurve"
        },
        type: "parametricCurve"
      },
      parent: {
        boundingBox: { kind: "empty" },
        childIds: ["child"],
        conceptId: "family",
        id: "parent",
        renderState: { kind: "empty" },
        spec: {
          conceptId: "family",
          id: "parent",
          range: { x: [-1, 1], y: [-1, 1], z: [-1, 1] },
          type: "axis3d"
        },
        type: "axis3d"
      }
    },
    rootIds: ["parent"]
  };
}

test("builds a Manim-style animate target by applying method-like operations to a Mobject family", () => {
  const graph = runtimeGraph();
  const originalCurve = graph.byId["function-curve"].renderState;
  assert.equal(originalCurve.kind, "polyline");
  const originalFirstPoint = originalCurve.points[0];
  const originalLastPoint = originalCurve.points.at(-1);
  assert.ok(originalLastPoint);

  const delta: Vec3 = [1, -0.5, 0.25];
  const plan = createMathAnimateBuilder(graph, "function-curve")
    .shift(delta)
    .setColorRole("attention")
    .build({ duration: 2.5, lagRatio: 0.2 });

  const targetCurve = plan.target.nodes["function-curve"].renderState;
  const targetProbe = plan.target.nodes["moving-probe"].renderState;

  assert.equal(plan.objectId, "function-curve");
  assert.equal(plan.targetObjectId, "function-curve:animate-target");
  assert.equal(plan.sourceContract, ANIMATION_BUILDER_SOURCE_CONTRACT);
  assert.match(ANIMATION_BUILDER_SOURCE_CONTRACT, /_AnimationBuilder/);
  assert.match(ANIMATION_BUILDER_SOURCE_CONTRACT, /Mobject\.animate/);
  assert.match(ANIMATION_BUILDER_SOURCE_CONTRACT, /generate_target/);
  assert.equal(plan.step.type, "transformObject");
  assert.equal(plan.step.objectId, "function-curve");
  assert.equal(plan.step.targetObjectId, "function-curve:animate-target");
  assert.equal(plan.step.duration, 2.5);
  assert.equal(plan.step.lagRatio, 0.2);
  assert.deepEqual(plan.target.familyIds, ["function-curve", "moving-probe", "probe-trace"]);
  assert.deepEqual(plan.operations.map((operation) => operation.type), ["shift", "setColorRole"]);
  assert.deepEqual(plan.changedFields.sort(), ["colorRole", "renderState"]);
  assert.deepEqual(plan.changedNodeIds.sort(), ["function-curve", "moving-probe", "probe-trace"]);
  assert.equal(plan.target.nodes["function-curve"].colorRole, "attention");
  assert.equal(plan.target.nodes["moving-probe"].colorRole, "attention");

  assert.equal(targetCurve.kind, "polyline");
  if (targetCurve.kind !== "polyline") throw new Error("expected shifted curve target");
  assert.deepEqual(targetCurve.points[0], shifted(originalFirstPoint, delta));
  assert.deepEqual(targetCurve.points.at(-1), shifted(originalLastPoint, delta));

  assert.equal(targetProbe.kind, "point");
  if (targetProbe.kind !== "point") throw new Error("expected shifted point target");
  assert.deepEqual(targetProbe.position, delta);

  assert.deepEqual(originalCurve.points[0], originalFirstPoint);
  assert.notEqual(targetCurve.points, originalCurve.points);
});

test("moves empty parent Mobject targets by descendant get_all_points family center", () => {
  const graph = parentWithChildGraph();
  const plan = createMathAnimateBuilder(graph, "parent")
    .moveTo([5, 5, 0])
    .build({ duration: 1, targetId: "parent-target" });
  const targetChild = plan.target.nodes.child.renderState;

  assert.deepEqual(plan.target.familyIds, ["parent", "child"]);
  assert.deepEqual(plan.changedNodeIds, ["parent", "child"]);
  assert.equal(targetChild.kind, "polyline");
  if (targetChild.kind !== "polyline") throw new Error("expected child curve target");
  assert.deepEqual(targetChild.points, [[4, 4.5, 0], [6, 5.5, 0]]);
  assert.deepEqual(graph.byId.child.renderState, { kind: "polyline", points: [[0, 0, 0], [2, 1, 0]] });
  assert.match(ANIMATION_BUILDER_SOURCE_CONTRACT, /get_all_points/);
});

test("serializes Manim path_arc transform intent from animate build options", () => {
  const graph = runtimeGraph();
  const path = { type: "arc" as const, angleRadians: Math.PI / 2, axis: [0, 0, 1] as Vec3 };

  const plan = createMathAnimateBuilder(graph, "function-curve")
    .shift([0.5, 0, 0])
    .build({ duration: 1.5, path });

  path.axis[2] = 99;

  assert.deepEqual(plan.step.path, { type: "arc", angleRadians: Math.PI / 2, axis: [0, 0, 1] });
});

test("maps axis render-state points through Manim-style animate operations", () => {
  const graph = runtimeGraph();
  const sourceAxes = graph.byId.axes.renderState;
  assert.equal(sourceAxes.kind, "axes");
  if (sourceAxes.kind !== "axes") throw new Error("expected axis render state");

  const delta: Vec3 = [0.5, 0.25, -0.75];
  const plan = createMathAnimateBuilder(graph, "axes")
    .shift(delta)
    .build({ duration: 1.25, targetId: "axes-shift-target" });
  const targetAxes = plan.target.nodes.axes.renderState;

  assert.equal(plan.objectId, "axes");
  assert.equal(plan.targetObjectId, "axes-shift-target");
  assert.deepEqual(plan.changedFields, ["renderState"]);
  assert.equal(targetAxes.kind, "axes");
  if (targetAxes.kind !== "axes") throw new Error("expected shifted axis render state");

  assert.deepEqual(targetAxes.xAxisPoints, sourceAxes.xAxisPoints.map((point) => shifted(point, delta)));
  assert.deepEqual(targetAxes.yAxisPoints, sourceAxes.yAxisPoints.map((point) => shifted(point, delta)));
  assert.deepEqual(targetAxes.zAxisPoints, sourceAxes.zAxisPoints.map((point) => shifted(point, delta)));
  assert.deepEqual(graph.byId.axes.renderState, sourceAxes);
});

test("summarizes scene-authored animate builder plans for browser QA", () => {
  assert.ok(functionGraphSpec);
  const runtimeState = buildMathSceneRuntimeState(functionGraphSpec, 0);
  const plans = buildMathSceneAnimatePlans(functionGraphSpec, runtimeState);
  const catalog = buildMathAnimateBuilderCatalog(plans);

  assert.equal(catalog.version, "mais-manim-animate-builder/v1");
  assert.equal(catalog.sourceContract, ANIMATION_BUILDER_SOURCE_CONTRACT);
  assert.equal(catalog.planCount, 2);
  assert.equal(catalog.firstPlanId, "function-curve-attention-lift");
  assert.deepEqual(catalog.objectIds, ["function-curve", "moving-probe"]);
  assert.deepEqual(catalog.targetObjectIds, ["function-curve:attention-target", "moving-probe:attention-target"]);
  assert.equal(catalog.operationCount, 4);
  assert.deepEqual(catalog.operationTypes, ["setColorRole", "shift"]);
  assert.equal(catalog.changedFieldCount, 2);
  assert.equal(catalog.changedNodeCount, 3);
  assert.deepEqual(catalog.changedNodeIds, ["function-curve", "moving-probe", "probe-trace"]);
  assert.equal(catalog.totalDuration, 2.4);
  assert.equal(catalog.laggedPlanCount, 1);
  assert.equal(catalog.pathPlanCount, 0);
  assert.equal(
    catalog.summary,
    "animateBuilder:plans=2:first=function-curve-attention-lift:objects=function-curve,moving-probe:targets=function-curve:attention-target,moving-probe:attention-target:ops=4:fields=2:nodes=3:duration=2.400:lagged=1:paths=0"
  );

  assert.deepEqual(mathAnimateBuilderCatalogDataAttributes(catalog), {
    "data-viz-manim-animate-builder-changed-field-count": "2",
    "data-viz-manim-animate-builder-changed-node-count": "3",
    "data-viz-manim-animate-builder-changed-node-ids": "function-curve,moving-probe,probe-trace",
    "data-viz-manim-animate-builder-first-plan-id": "function-curve-attention-lift",
    "data-viz-manim-animate-builder-lagged-count": "1",
    "data-viz-manim-animate-builder-object-ids": "function-curve,moving-probe",
    "data-viz-manim-animate-builder-operation-count": "4",
    "data-viz-manim-animate-builder-operation-types": "setColorRole,shift",
    "data-viz-manim-animate-builder-path-count": "0",
    "data-viz-manim-animate-builder-plan-count": "2",
    "data-viz-manim-animate-builder-source-contract": ANIMATION_BUILDER_SOURCE_CONTRACT,
    "data-viz-manim-animate-builder-summary": catalog.summary,
    "data-viz-manim-animate-builder-target-ids": "function-curve:attention-target,moving-probe:attention-target",
    "data-viz-manim-animate-builder-total-duration": "2.400"
  });

  const serialized = serializeMathAnimateBuilderCatalog(catalog);
  assert.doesNotMatch(serialized, /<\/script|undefined|NaN|Infinity/i);
  assert.deepEqual(JSON.parse(serialized), catalog);
});

test("scales vector targets around an explicit anchor while preserving source graph identity", () => {
  const scene = {
    bindings: [],
    cameraShots: [{ id: "overview", position: [3, 3, 3] as Vec3, target: [0, 0, 0] as Vec3 }],
    coordinateSpace: {
      mathRange: { x: [-2, 2] as [number, number], y: [-2, 2] as [number, number], z: [-2, 2] as [number, number] },
      worldRange: { x: [-2, 2] as [number, number], y: [-2, 2] as [number, number], z: [-2, 2] as [number, number] }
    },
    diagnostics: { expectedBindingCount: 0, expectedObjectCount: 1, expectedTokenCount: 0 },
    familyId: "three-space-vectors-lines-planes" as const,
    formulas: [],
    objects: [
      { type: "vector" as const, id: "basis-vector", conceptId: "basis", colorRole: "function", from: [1, 1, 0] as Vec3, to: [2, 3, 0] as Vec3 }
    ],
    sceneId: "animate-vector-test",
    timeline: []
  };
  const graph = buildMathSceneRuntimeState(scene, 0).objectGraph;
  const sourceVector = graph.byId["basis-vector"].renderState;
  assert.equal(sourceVector.kind, "vector");

  const plan = createMathAnimateBuilder(graph, "basis-vector")
    .scale(2, { aboutPoint: [1, 1, 0] })
    .build({ duration: 1.25, targetId: "basis-vector-target" });
  const targetVector = plan.target.nodes["basis-vector"].renderState;

  assert.equal(plan.targetObjectId, "basis-vector-target");
  assert.deepEqual(plan.changedFields, ["renderState"]);
  assert.equal(targetVector.kind, "vector");
  if (targetVector.kind !== "vector") throw new Error("expected vector target");
  assert.deepEqual(targetVector.from, [1, 1, 0]);
  assert.deepEqual(targetVector.to, [3, 5, 0]);
  assert.deepEqual(sourceVector.to, [2, 3, 0]);
});

test("preserves vector VMobject style while applying geometric animate operations", () => {
  const scene = {
    bindings: [],
    cameraShots: [{ id: "overview", position: [3, 3, 3] as Vec3, target: [0, 0, 0] as Vec3 }],
    coordinateSpace: {
      mathRange: { x: [-2, 2] as [number, number], y: [-2, 2] as [number, number], z: [-2, 2] as [number, number] },
      worldRange: { x: [-2, 2] as [number, number], y: [-2, 2] as [number, number], z: [-2, 2] as [number, number] }
    },
    diagnostics: { expectedBindingCount: 0, expectedObjectCount: 1, expectedTokenCount: 0 },
    familyId: "three-space-vectors-lines-planes" as const,
    formulas: [],
    objects: [
      {
        type: "vector" as const,
        id: "styled-vector",
        conceptId: "basis",
        colorRole: "function",
        from: [1, 1, 0] as Vec3,
        style: { strokeOpacity: 0.6, strokeRole: "parameter", strokeWidth: 7 },
        to: [2, 3, 0] as Vec3
      }
    ],
    sceneId: "animate-vector-style-test",
    timeline: []
  };
  const graph = buildMathSceneRuntimeState(scene, 0).objectGraph;
  const sourceVector = graph.byId["styled-vector"].renderState;
  assert.equal(sourceVector.kind, "vector");

  const plan = createMathAnimateBuilder(graph, "styled-vector")
    .shift([1, 0, 0])
    .build({ duration: 1.25, targetId: "styled-vector-target" });
  const targetVector = plan.target.nodes["styled-vector"].renderState;

  assert.equal(targetVector.kind, "vector");
  if (sourceVector.kind !== "vector" || targetVector.kind !== "vector") throw new Error("expected vector style target");
  assert.equal(sourceVector.style?.strokeWidth, 7);
  assert.equal(targetVector.style?.strokeWidth, 7);
  assert.equal(targetVector.style?.strokeOpacity, 0.6);
  assert.equal(targetVector.style?.strokeRole, "parameter");
});

test("rotates vector targets around an explicit axis and anchor like Manim Mobject.rotate", () => {
  const scene = {
    bindings: [],
    cameraShots: [{ id: "overview", position: [3, 3, 3] as Vec3, target: [0, 0, 0] as Vec3 }],
    coordinateSpace: {
      mathRange: { x: [-3, 3] as [number, number], y: [-3, 3] as [number, number], z: [-3, 3] as [number, number] },
      worldRange: { x: [-3, 3] as [number, number], y: [-3, 3] as [number, number], z: [-3, 3] as [number, number] }
    },
    diagnostics: { expectedBindingCount: 0, expectedObjectCount: 1, expectedTokenCount: 0 },
    familyId: "three-space-vectors-lines-planes" as const,
    formulas: [],
    objects: [
      { type: "vector" as const, id: "rotating-vector", conceptId: "basis", colorRole: "function", from: [2, 1, 0] as Vec3, to: [2, 3, 0] as Vec3 }
    ],
    sceneId: "animate-rotate-test",
    timeline: []
  };
  const graph = buildMathSceneRuntimeState(scene, 0).objectGraph;
  const sourceVector = graph.byId["rotating-vector"].renderState;
  assert.equal(sourceVector.kind, "vector");

  const plan = createMathAnimateBuilder(graph, "rotating-vector")
    .rotate(Math.PI / 2, { aboutPoint: [1, 1, 0], axis: "z" })
    .build({ duration: 1.5, targetId: "rotating-vector-target" });
  const targetVector = plan.target.nodes["rotating-vector"].renderState;

  assert.deepEqual(plan.operations, [{ aboutPoint: [1, 1, 0], angleRadians: Math.PI / 2, axis: "z", type: "rotate" }]);
  assert.deepEqual(plan.changedFields, ["renderState"]);
  assert.equal(targetVector.kind, "vector");
  if (targetVector.kind !== "vector") throw new Error("expected vector target");
  assert.deepEqual(rounded(targetVector.from), [1, 2, 0]);
  assert.deepEqual(rounded(targetVector.to), [-1, 2, 0]);
  assert.deepEqual(sourceVector.from, [2, 1, 0]);
  assert.deepEqual(sourceVector.to, [2, 3, 0]);
});

test("sets vector target width from the Mobject bounding box with optional stretch semantics", () => {
  const scene = {
    bindings: [],
    cameraShots: [{ id: "overview", position: [3, 3, 3] as Vec3, target: [0, 0, 0] as Vec3 }],
    coordinateSpace: {
      mathRange: { x: [-4, 4] as [number, number], y: [-4, 4] as [number, number], z: [-4, 4] as [number, number] },
      worldRange: { x: [-4, 4] as [number, number], y: [-4, 4] as [number, number], z: [-4, 4] as [number, number] }
    },
    diagnostics: { expectedBindingCount: 0, expectedObjectCount: 1, expectedTokenCount: 0 },
    familyId: "three-space-vectors-lines-planes" as const,
    formulas: [],
    objects: [
      { type: "vector" as const, id: "width-vector", conceptId: "basis", colorRole: "function", from: [1, 1, 0] as Vec3, to: [3, 2, 0] as Vec3 }
    ],
    sceneId: "animate-width-test",
    timeline: []
  };
  const graph = buildMathSceneRuntimeState(scene, 0).objectGraph;
  const sourceVector = graph.byId["width-vector"].renderState;
  assert.equal(sourceVector.kind, "vector");

  const plan = createMathAnimateBuilder(graph, "width-vector")
    .setWidth(4, { stretch: true })
    .build({ duration: 1.5, targetId: "width-vector-target" });
  const targetVector = plan.target.nodes["width-vector"].renderState;

  assert.deepEqual(plan.operations, [{ stretch: true, type: "setWidth", width: 4 }]);
  assert.deepEqual(plan.changedFields, ["renderState"]);
  assert.equal(targetVector.kind, "vector");
  if (targetVector.kind !== "vector") throw new Error("expected vector target");
  assert.deepEqual(rounded(targetVector.from), [0, 1, 0]);
  assert.deepEqual(rounded(targetVector.to), [4, 2, 0]);
  assert.deepEqual(sourceVector.from, [1, 1, 0]);
  assert.deepEqual(sourceVector.to, [3, 2, 0]);
});

test("sets vector target depth from the Mobject bounding box with optional stretch semantics", () => {
  const scene = {
    bindings: [],
    cameraShots: [{ id: "overview", position: [3, 3, 3] as Vec3, target: [0, 0, 0] as Vec3 }],
    coordinateSpace: {
      mathRange: { x: [-4, 4] as [number, number], y: [-4, 4] as [number, number], z: [-4, 4] as [number, number] },
      worldRange: { x: [-4, 4] as [number, number], y: [-4, 4] as [number, number], z: [-4, 4] as [number, number] }
    },
    diagnostics: { expectedBindingCount: 0, expectedObjectCount: 1, expectedTokenCount: 0 },
    familyId: "three-space-vectors-lines-planes" as const,
    formulas: [],
    objects: [
      { type: "vector" as const, id: "depth-vector", conceptId: "basis", colorRole: "function", from: [1, 1, 1] as Vec3, to: [3, 2, 3] as Vec3 }
    ],
    sceneId: "animate-depth-test",
    timeline: []
  };
  const graph = buildMathSceneRuntimeState(scene, 0).objectGraph;
  const sourceVector = graph.byId["depth-vector"].renderState;
  assert.equal(sourceVector.kind, "vector");

  const plan = createMathAnimateBuilder(graph, "depth-vector")
    .setDepth(6, { stretch: true })
    .build({ duration: 1.5, targetId: "depth-vector-target" });
  const targetVector = plan.target.nodes["depth-vector"].renderState;

  assert.deepEqual(plan.operations, [{ depth: 6, stretch: true, type: "setDepth" }]);
  assert.deepEqual(plan.changedFields, ["renderState"]);
  assert.equal(targetVector.kind, "vector");
  if (targetVector.kind !== "vector") throw new Error("expected vector target");
  assert.deepEqual(rounded(targetVector.from), [1, 1, -1]);
  assert.deepEqual(rounded(targetVector.to), [3, 2, 5]);
  assert.deepEqual(sourceVector.from, [1, 1, 1]);
  assert.deepEqual(sourceVector.to, [3, 2, 3]);
});

test("sets target Mobject opacity through uniforms like Manim Mobject.set_opacity", () => {
  const scene = {
    bindings: [],
    cameraShots: [{ id: "overview", position: [3, 3, 3] as Vec3, target: [0, 0, 0] as Vec3 }],
    coordinateSpace: {
      mathRange: { x: [-4, 4] as [number, number], y: [-4, 4] as [number, number], z: [-4, 4] as [number, number] },
      worldRange: { x: [-4, 4] as [number, number], y: [-4, 4] as [number, number], z: [-4, 4] as [number, number] }
    },
    diagnostics: { expectedBindingCount: 0, expectedObjectCount: 1, expectedTokenCount: 0 },
    familyId: "three-space-vectors-lines-planes" as const,
    formulas: [],
    objects: [
      {
        type: "vector" as const,
        id: "opacity-vector",
        conceptId: "basis",
        colorRole: "function",
        from: [1, 1, 0] as Vec3,
        to: [3, 2, 0] as Vec3,
        uniforms: { opacity: 0.8, shadeIn3D: true }
      }
    ],
    sceneId: "animate-opacity-test",
    timeline: []
  };
  const graph = buildMathSceneRuntimeState(scene, 0).objectGraph;
  const sourceNode = graph.byId["opacity-vector"];

  const plan = createMathAnimateBuilder(graph, "opacity-vector")
    .setOpacity(0.25)
    .build({ duration: 1.5, targetId: "opacity-vector-target" });

  assert.deepEqual(plan.operations, [{ opacity: 0.25, type: "setOpacity" }]);
  assert.deepEqual(plan.changedFields, ["uniforms"]);
  assert.equal(plan.target.nodes["opacity-vector"].uniforms?.opacity, 0.25);
  assert.equal(plan.target.nodes["opacity-vector"].uniforms?.shadeIn3D, true);
  assert.equal(sourceNode.uniforms?.opacity, 0.8);
});

test("sets VMobject stroke and fill target style like Manim VMobject.set_stroke and set_fill", () => {
  const scene = {
    bindings: [],
    cameraShots: [{ id: "overview", position: [3, 3, 3] as Vec3, target: [0, 0, 0] as Vec3 }],
    coordinateSpace: {
      mathRange: { x: [-4, 4] as [number, number], y: [-4, 4] as [number, number], z: [-4, 4] as [number, number] },
      worldRange: { x: [-4, 4] as [number, number], y: [-4, 4] as [number, number], z: [-4, 4] as [number, number] }
    },
    diagnostics: { expectedBindingCount: 0, expectedObjectCount: 1, expectedTokenCount: 0 },
    familyId: "three-space-vectors-lines-planes" as const,
    formulas: [],
    objects: [
      {
        type: "vector" as const,
        id: "style-vector",
        conceptId: "basis",
        colorRole: "function",
        from: [1, 1, 0] as Vec3,
        style: { fillOpacity: 0.1, fillRole: "reference", strokeOpacity: 0.8, strokeRole: "function", strokeWidth: 5 },
        to: [3, 2, 0] as Vec3
      }
    ],
    sceneId: "animate-vmobject-style-test",
    timeline: []
  };
  const graph = buildMathSceneRuntimeState(scene, 0).objectGraph;
  const sourceVector = graph.byId["style-vector"].renderState;
  assert.equal(sourceVector.kind, "vector");

  const plan = createMathAnimateBuilder(graph, "style-vector")
    .setStroke({ strokeOpacity: 0.35, strokeRole: "attention", strokeWidth: 9 })
    .setFill({ fillOpacity: 0.45, fillRole: "area" })
    .build({ duration: 1.5, targetId: "style-vector-target" });
  const targetVector = plan.target.nodes["style-vector"].renderState;

  assert.deepEqual(plan.operations, [
    { strokeOpacity: 0.35, strokeRole: "attention", strokeWidth: 9, type: "setStroke" },
    { fillOpacity: 0.45, fillRole: "area", type: "setFill" }
  ]);
  assert.deepEqual(plan.changedFields, ["renderState"]);
  assert.equal(targetVector.kind, "vector");
  if (sourceVector.kind !== "vector" || targetVector.kind !== "vector") throw new Error("expected vector style target");
  assert.equal(sourceVector.style?.strokeWidth, 5);
  assert.equal(sourceVector.style?.fillOpacity, 0.1);
  assert.equal(targetVector.style?.strokeWidth, 9);
  assert.equal(targetVector.style?.strokeOpacity, 0.35);
  assert.equal(targetVector.style?.strokeRole, "attention");
  assert.equal(targetVector.style?.fillOpacity, 0.45);
  assert.equal(targetVector.style?.fillRole, "area");
});

test("sets aggregate VMobject target style like Manim VMobject.set_style", () => {
  const scene = {
    bindings: [],
    cameraShots: [{ id: "overview", position: [3, 3, 3] as Vec3, target: [0, 0, 0] as Vec3 }],
    coordinateSpace: {
      mathRange: { x: [-4, 4] as [number, number], y: [-4, 4] as [number, number], z: [-4, 4] as [number, number] },
      worldRange: { x: [-4, 4] as [number, number], y: [-4, 4] as [number, number], z: [-4, 4] as [number, number] }
    },
    diagnostics: { expectedBindingCount: 0, expectedObjectCount: 1, expectedTokenCount: 0 },
    familyId: "three-space-vectors-lines-planes" as const,
    formulas: [],
    objects: [
      {
        type: "vector" as const,
        id: "aggregate-style-vector",
        conceptId: "basis",
        colorRole: "function",
        from: [1, 1, 0] as Vec3,
        style: {
          antiAliasWidth: 1,
          fillOpacity: 0.1,
          fillRole: "reference",
          jointAngleDegrees: 0,
          strokeOpacity: 0.8,
          strokeRole: "function",
          strokeWidth: 5
        },
        to: [3, 2, 0] as Vec3
      }
    ],
    sceneId: "animate-vmobject-aggregate-style-test",
    timeline: []
  };
  const graph = buildMathSceneRuntimeState(scene, 0).objectGraph;
  const sourceVector = graph.byId["aggregate-style-vector"].renderState;
  assert.equal(sourceVector.kind, "vector");

  const plan = createMathAnimateBuilder(graph, "aggregate-style-vector")
    .setStyle({
      antiAliasWidth: 3,
      fillOpacity: 0.55,
      fillRole: "area",
      jointAngleDegrees: 24,
      strokeOpacity: 0.4,
      strokeRole: "attention",
      strokeWidth: 10
    })
    .build({ duration: 1.5, targetId: "aggregate-style-vector-target" });
  const targetVector = plan.target.nodes["aggregate-style-vector"].renderState;

  assert.deepEqual(plan.operations, [{
    antiAliasWidth: 3,
    fillOpacity: 0.55,
    fillRole: "area",
    jointAngleDegrees: 24,
    strokeOpacity: 0.4,
    strokeRole: "attention",
    strokeWidth: 10,
    type: "setStyle"
  }]);
  assert.deepEqual(plan.changedFields, ["renderState"]);
  assert.equal(targetVector.kind, "vector");
  if (sourceVector.kind !== "vector" || targetVector.kind !== "vector") throw new Error("expected aggregate vector style target");
  assert.equal(sourceVector.style?.strokeWidth, 5);
  assert.equal(sourceVector.style?.antiAliasWidth, 1);
  assert.equal(targetVector.style?.strokeWidth, 10);
  assert.equal(targetVector.style?.strokeOpacity, 0.4);
  assert.equal(targetVector.style?.strokeRole, "attention");
  assert.equal(targetVector.style?.fillOpacity, 0.55);
  assert.equal(targetVector.style?.fillRole, "area");
  assert.equal(targetVector.style?.antiAliasWidth, 3);
  assert.equal(targetVector.style?.jointAngleDegrees, 24);
});

test("matches vector target width to another Mobject like Manim Mobject.match_width", () => {
  const scene = {
    bindings: [],
    cameraShots: [{ id: "overview", position: [3, 3, 3] as Vec3, target: [0, 0, 0] as Vec3 }],
    coordinateSpace: {
      mathRange: { x: [-8, 8] as [number, number], y: [-8, 8] as [number, number], z: [-8, 8] as [number, number] },
      worldRange: { x: [-8, 8] as [number, number], y: [-8, 8] as [number, number], z: [-8, 8] as [number, number] }
    },
    diagnostics: { expectedBindingCount: 0, expectedObjectCount: 2, expectedTokenCount: 0 },
    familyId: "three-space-vectors-lines-planes" as const,
    formulas: [],
    objects: [
      { type: "vector" as const, id: "label-vector", conceptId: "label", colorRole: "parameter", from: [0, 0, 0] as Vec3, to: [1, 1, 0] as Vec3 },
      { type: "vector" as const, id: "anchor-vector", conceptId: "anchor", colorRole: "function", from: [2, 2, 0] as Vec3, to: [5, 4, 0] as Vec3 }
    ],
    sceneId: "animate-match-width-test",
    timeline: []
  };
  const graph = buildMathSceneRuntimeState(scene, 0).objectGraph;
  const sourceVector = graph.byId["label-vector"].renderState;
  assert.equal(sourceVector.kind, "vector");

  const plan = createMathAnimateBuilder(graph, "label-vector")
    .matchWidth("anchor-vector", { stretch: true })
    .build({ duration: 1.5, targetId: "label-vector-target" });
  const targetVector = plan.target.nodes["label-vector"].renderState;

  assert.deepEqual(plan.operations, [{ stretch: true, targetObjectId: "anchor-vector", type: "matchWidth" }]);
  assert.deepEqual(plan.changedFields, ["renderState"]);
  assert.equal(targetVector.kind, "vector");
  if (targetVector.kind !== "vector") throw new Error("expected vector target");
  assert.deepEqual(rounded(targetVector.from), [-1, 0, 0]);
  assert.deepEqual(rounded(targetVector.to), [2, 1, 0]);
  assert.deepEqual(sourceVector.from, [0, 0, 0]);
  assert.deepEqual(sourceVector.to, [1, 1, 0]);
});

test("matches vector target x coordinate to another Mobject like Manim Mobject.match_x", () => {
  const scene = {
    bindings: [],
    cameraShots: [{ id: "overview", position: [3, 3, 3] as Vec3, target: [0, 0, 0] as Vec3 }],
    coordinateSpace: {
      mathRange: { x: [-8, 8] as [number, number], y: [-8, 8] as [number, number], z: [-8, 8] as [number, number] },
      worldRange: { x: [-8, 8] as [number, number], y: [-8, 8] as [number, number], z: [-8, 8] as [number, number] }
    },
    diagnostics: { expectedBindingCount: 0, expectedObjectCount: 2, expectedTokenCount: 0 },
    familyId: "three-space-vectors-lines-planes" as const,
    formulas: [],
    objects: [
      { type: "vector" as const, id: "label-vector", conceptId: "label", colorRole: "parameter", from: [0, 0, 0] as Vec3, to: [1, 1, 0] as Vec3 },
      { type: "vector" as const, id: "anchor-vector", conceptId: "anchor", colorRole: "function", from: [2, 2, 0] as Vec3, to: [5, 4, 0] as Vec3 }
    ],
    sceneId: "animate-match-x-test",
    timeline: []
  };
  const graph = buildMathSceneRuntimeState(scene, 0).objectGraph;
  const sourceVector = graph.byId["label-vector"].renderState;
  assert.equal(sourceVector.kind, "vector");

  const plan = createMathAnimateBuilder(graph, "label-vector")
    .matchX("anchor-vector")
    .build({ duration: 1.5, targetId: "label-vector-target" });
  const targetVector = plan.target.nodes["label-vector"].renderState;

  assert.deepEqual(plan.operations, [{ targetObjectId: "anchor-vector", type: "matchX" }]);
  assert.deepEqual(plan.changedFields, ["renderState"]);
  assert.equal(targetVector.kind, "vector");
  if (targetVector.kind !== "vector") throw new Error("expected vector target");
  assert.deepEqual(rounded(targetVector.from), [3, 0, 0]);
  assert.deepEqual(rounded(targetVector.to), [4, 1, 0]);
  assert.deepEqual(sourceVector.from, [0, 0, 0]);
  assert.deepEqual(sourceVector.to, [1, 1, 0]);
});

test("sets vector target x coordinate by moving the Mobject center like Manim Mobject.set_x", () => {
  const scene = {
    bindings: [],
    cameraShots: [{ id: "overview", position: [3, 3, 3] as Vec3, target: [0, 0, 0] as Vec3 }],
    coordinateSpace: {
      mathRange: { x: [-8, 8] as [number, number], y: [-8, 8] as [number, number], z: [-8, 8] as [number, number] },
      worldRange: { x: [-8, 8] as [number, number], y: [-8, 8] as [number, number], z: [-8, 8] as [number, number] }
    },
    diagnostics: { expectedBindingCount: 0, expectedObjectCount: 1, expectedTokenCount: 0 },
    familyId: "three-space-vectors-lines-planes" as const,
    formulas: [],
    objects: [
      { type: "vector" as const, id: "label-vector", conceptId: "label", colorRole: "parameter", from: [0, 0, 0] as Vec3, to: [1, 1, 0] as Vec3 }
    ],
    sceneId: "animate-set-x-test",
    timeline: []
  };
  const graph = buildMathSceneRuntimeState(scene, 0).objectGraph;
  const sourceVector = graph.byId["label-vector"].renderState;
  assert.equal(sourceVector.kind, "vector");

  const plan = createMathAnimateBuilder(graph, "label-vector")
    .setX(-2)
    .build({ duration: 1.5, targetId: "label-vector-target" });
  const targetVector = plan.target.nodes["label-vector"].renderState;

  assert.deepEqual(plan.operations, [{ coordinate: -2, type: "setX" }]);
  assert.deepEqual(plan.changedFields, ["renderState"]);
  assert.equal(targetVector.kind, "vector");
  if (targetVector.kind !== "vector") throw new Error("expected vector target");
  assert.deepEqual(rounded(targetVector.from), [-2.5, 0, 0]);
  assert.deepEqual(rounded(targetVector.to), [-1.5, 1, 0]);
  assert.deepEqual(sourceVector.from, [0, 0, 0]);
  assert.deepEqual(sourceVector.to, [1, 1, 0]);
});

test("sets vector target z coordinate by moving the Mobject center like Manim Mobject.set_z", () => {
  const scene = {
    bindings: [],
    cameraShots: [{ id: "overview", position: [3, 3, 3] as Vec3, target: [0, 0, 0] as Vec3 }],
    coordinateSpace: {
      mathRange: { x: [-8, 8] as [number, number], y: [-8, 8] as [number, number], z: [-8, 8] as [number, number] },
      worldRange: { x: [-8, 8] as [number, number], y: [-8, 8] as [number, number], z: [-8, 8] as [number, number] }
    },
    diagnostics: { expectedBindingCount: 0, expectedObjectCount: 1, expectedTokenCount: 0 },
    familyId: "three-space-vectors-lines-planes" as const,
    formulas: [],
    objects: [
      { type: "vector" as const, id: "depth-vector", conceptId: "depth", colorRole: "parameter", from: [0, 0, 1] as Vec3, to: [1, 1, 3] as Vec3 }
    ],
    sceneId: "animate-set-z-test",
    timeline: []
  };
  const graph = buildMathSceneRuntimeState(scene, 0).objectGraph;
  const sourceVector = graph.byId["depth-vector"].renderState;
  assert.equal(sourceVector.kind, "vector");

  const plan = createMathAnimateBuilder(graph, "depth-vector")
    .setZ(-1)
    .build({ duration: 1.5, targetId: "depth-vector-target" });
  const targetVector = plan.target.nodes["depth-vector"].renderState;

  assert.deepEqual(plan.operations, [{ coordinate: -1, type: "setZ" }]);
  assert.deepEqual(plan.changedFields, ["renderState"]);
  assert.equal(targetVector.kind, "vector");
  if (targetVector.kind !== "vector") throw new Error("expected vector target");
  assert.deepEqual(rounded(targetVector.from), [0, 0, -2]);
  assert.deepEqual(rounded(targetVector.to), [1, 1, 0]);
  assert.deepEqual(sourceVector.from, [0, 0, 1]);
  assert.deepEqual(sourceVector.to, [1, 1, 3]);
});

test("centers vector targets at the origin like Manim Mobject.center", () => {
  const scene = {
    bindings: [],
    cameraShots: [{ id: "overview", position: [3, 3, 3] as Vec3, target: [0, 0, 0] as Vec3 }],
    coordinateSpace: {
      mathRange: { x: [-8, 8] as [number, number], y: [-8, 8] as [number, number], z: [-8, 8] as [number, number] },
      worldRange: { x: [-8, 8] as [number, number], y: [-8, 8] as [number, number], z: [-8, 8] as [number, number] }
    },
    diagnostics: { expectedBindingCount: 0, expectedObjectCount: 1, expectedTokenCount: 0 },
    familyId: "three-space-vectors-lines-planes" as const,
    formulas: [],
    objects: [
      { type: "vector" as const, id: "offset-vector", conceptId: "basis", colorRole: "function", from: [2, -1, 1] as Vec3, to: [4, 3, 3] as Vec3 }
    ],
    sceneId: "animate-center-test",
    timeline: []
  };
  const graph = buildMathSceneRuntimeState(scene, 0).objectGraph;
  const sourceVector = graph.byId["offset-vector"].renderState;
  assert.equal(sourceVector.kind, "vector");

  const plan = createMathAnimateBuilder(graph, "offset-vector")
    .center()
    .build({ duration: 1.5, targetId: "offset-vector-target" });
  const targetVector = plan.target.nodes["offset-vector"].renderState;

  assert.deepEqual(plan.operations, [{ type: "center" }]);
  assert.deepEqual(plan.changedFields, ["renderState"]);
  assert.equal(targetVector.kind, "vector");
  if (targetVector.kind !== "vector") throw new Error("expected vector target");
  assert.deepEqual(rounded(targetVector.from), [-1, -2, -1]);
  assert.deepEqual(rounded(targetVector.to), [1, 2, 1]);
  assert.deepEqual(sourceVector.from, [2, -1, 1]);
  assert.deepEqual(sourceVector.to, [4, 3, 3]);
});

test("moves vector targets by placing the Mobject bounding-box center like Manim Mobject.move_to", () => {
  const scene = {
    bindings: [],
    cameraShots: [{ id: "overview", position: [3, 3, 3] as Vec3, target: [0, 0, 0] as Vec3 }],
    coordinateSpace: {
      mathRange: { x: [-8, 8] as [number, number], y: [-8, 8] as [number, number], z: [-8, 8] as [number, number] },
      worldRange: { x: [-8, 8] as [number, number], y: [-8, 8] as [number, number], z: [-8, 8] as [number, number] }
    },
    diagnostics: { expectedBindingCount: 0, expectedObjectCount: 1, expectedTokenCount: 0 },
    familyId: "three-space-vectors-lines-planes" as const,
    formulas: [],
    objects: [
      { type: "vector" as const, id: "moving-vector", conceptId: "basis", colorRole: "function", from: [1, 1, 0] as Vec3, to: [3, 2, 0] as Vec3 }
    ],
    sceneId: "animate-move-to-test",
    timeline: []
  };
  const graph = buildMathSceneRuntimeState(scene, 0).objectGraph;
  const sourceVector = graph.byId["moving-vector"].renderState;
  assert.equal(sourceVector.kind, "vector");

  const plan = createMathAnimateBuilder(graph, "moving-vector")
    .moveTo([5, 6, 0])
    .build({ duration: 1.5, targetId: "moving-vector-target" });
  const targetVector = plan.target.nodes["moving-vector"].renderState;

  assert.deepEqual(plan.operations, [{ point: [5, 6, 0], type: "moveTo" }]);
  assert.deepEqual(plan.changedFields, ["renderState"]);
  assert.equal(targetVector.kind, "vector");
  if (targetVector.kind !== "vector") throw new Error("expected vector target");
  assert.deepEqual(rounded(targetVector.from), [4, 5.5, 0]);
  assert.deepEqual(rounded(targetVector.to), [6, 6.5, 0]);
  assert.deepEqual(sourceVector.from, [1, 1, 0]);
  assert.deepEqual(sourceVector.to, [3, 2, 0]);
});

test("places vector targets next to another Mobject critical point like Manim Mobject.next_to", () => {
  const scene = {
    bindings: [],
    cameraShots: [{ id: "overview", position: [3, 3, 3] as Vec3, target: [0, 0, 0] as Vec3 }],
    coordinateSpace: {
      mathRange: { x: [-8, 8] as [number, number], y: [-8, 8] as [number, number], z: [-8, 8] as [number, number] },
      worldRange: { x: [-8, 8] as [number, number], y: [-8, 8] as [number, number], z: [-8, 8] as [number, number] }
    },
    diagnostics: { expectedBindingCount: 0, expectedObjectCount: 2, expectedTokenCount: 0 },
    familyId: "three-space-vectors-lines-planes" as const,
    formulas: [],
    objects: [
      { type: "vector" as const, id: "label-vector", conceptId: "label", colorRole: "parameter", from: [0, 0, 0] as Vec3, to: [1, 1, 0] as Vec3 },
      { type: "vector" as const, id: "anchor-vector", conceptId: "anchor", colorRole: "function", from: [2, 2, 0] as Vec3, to: [4, 4, 0] as Vec3 }
    ],
    sceneId: "animate-next-to-test",
    timeline: []
  };
  const graph = buildMathSceneRuntimeState(scene, 0).objectGraph;
  const sourceVector = graph.byId["label-vector"].renderState;
  assert.equal(sourceVector.kind, "vector");

  const plan = createMathAnimateBuilder(graph, "label-vector")
    .nextTo("anchor-vector", { buff: 0.5, direction: [1, 0, 0] })
    .build({ duration: 1.5, targetId: "label-vector-target" });
  const targetVector = plan.target.nodes["label-vector"].renderState;

  assert.deepEqual(plan.operations, [{ buff: 0.5, direction: [1, 0, 0], targetObjectId: "anchor-vector", type: "nextTo" }]);
  assert.deepEqual(plan.changedFields, ["renderState"]);
  assert.equal(targetVector.kind, "vector");
  if (targetVector.kind !== "vector") throw new Error("expected vector target");
  assert.deepEqual(rounded(targetVector.from), [4.5, 2.5, 0]);
  assert.deepEqual(rounded(targetVector.to), [5.5, 3.5, 0]);
  assert.deepEqual(sourceVector.from, [0, 0, 0]);
  assert.deepEqual(sourceVector.to, [1, 1, 0]);
});

test("aligns vector targets to another Mobject only along the requested direction like Manim Mobject.align_to", () => {
  const scene = {
    bindings: [],
    cameraShots: [{ id: "overview", position: [3, 3, 3] as Vec3, target: [0, 0, 0] as Vec3 }],
    coordinateSpace: {
      mathRange: { x: [-8, 8] as [number, number], y: [-8, 8] as [number, number], z: [-8, 8] as [number, number] },
      worldRange: { x: [-8, 8] as [number, number], y: [-8, 8] as [number, number], z: [-8, 8] as [number, number] }
    },
    diagnostics: { expectedBindingCount: 0, expectedObjectCount: 2, expectedTokenCount: 0 },
    familyId: "three-space-vectors-lines-planes" as const,
    formulas: [],
    objects: [
      { type: "vector" as const, id: "label-vector", conceptId: "label", colorRole: "parameter", from: [0, 0, 0] as Vec3, to: [1, 1, 0] as Vec3 },
      { type: "vector" as const, id: "anchor-vector", conceptId: "anchor", colorRole: "function", from: [2, 2, 0] as Vec3, to: [4, 4, 0] as Vec3 }
    ],
    sceneId: "animate-align-to-test",
    timeline: []
  };
  const graph = buildMathSceneRuntimeState(scene, 0).objectGraph;
  const sourceVector = graph.byId["label-vector"].renderState;
  assert.equal(sourceVector.kind, "vector");

  const plan = createMathAnimateBuilder(graph, "label-vector")
    .alignTo("anchor-vector", { direction: [0, 1, 0] })
    .build({ duration: 1.5, targetId: "label-vector-target" });
  const targetVector = plan.target.nodes["label-vector"].renderState;

  assert.deepEqual(plan.operations, [{ direction: [0, 1, 0], targetObjectId: "anchor-vector", type: "alignTo" }]);
  assert.deepEqual(plan.changedFields, ["renderState"]);
  assert.equal(targetVector.kind, "vector");
  if (targetVector.kind !== "vector") throw new Error("expected vector target");
  assert.deepEqual(rounded(targetVector.from), [0, 3, 0]);
  assert.deepEqual(rounded(targetVector.to), [1, 4, 0]);
  assert.deepEqual(sourceVector.from, [0, 0, 0]);
  assert.deepEqual(sourceVector.to, [1, 1, 0]);
});

test("moves vector targets to a scene frame edge like Manim Mobject.to_edge", () => {
  const scene = {
    bindings: [],
    cameraShots: [{ id: "overview", position: [3, 3, 3] as Vec3, target: [0, 0, 0] as Vec3 }],
    coordinateSpace: {
      mathRange: { x: [-8, 8] as [number, number], y: [-8, 8] as [number, number], z: [-8, 8] as [number, number] },
      worldRange: { x: [-8, 8] as [number, number], y: [-8, 8] as [number, number], z: [-8, 8] as [number, number] }
    },
    diagnostics: { expectedBindingCount: 0, expectedObjectCount: 1, expectedTokenCount: 0 },
    familyId: "three-space-vectors-lines-planes" as const,
    formulas: [],
    objects: [
      { type: "vector" as const, id: "edge-vector", conceptId: "label", colorRole: "parameter", from: [1, 1, 0] as Vec3, to: [3, 2, 0] as Vec3 }
    ],
    sceneId: "animate-to-edge-test",
    timeline: []
  };
  const graph = buildMathSceneRuntimeState(scene, 0).objectGraph;
  const sourceVector = graph.byId["edge-vector"].renderState;
  assert.equal(sourceVector.kind, "vector");

  const plan = createMathAnimateBuilder(graph, "edge-vector")
    .toEdge([0, 1, 0], { buff: 0.5, frame: { max: [6, 6, 0], min: [-6, -6, 0] } })
    .build({ duration: 1.5, targetId: "edge-vector-target" });
  const targetVector = plan.target.nodes["edge-vector"].renderState;

  assert.deepEqual(plan.operations, [
    { buff: 0.5, direction: [0, 1, 0], frame: { max: [6, 6, 0], min: [-6, -6, 0] }, type: "toEdge" }
  ]);
  assert.deepEqual(plan.changedFields, ["renderState"]);
  assert.equal(targetVector.kind, "vector");
  if (targetVector.kind !== "vector") throw new Error("expected vector target");
  assert.deepEqual(rounded(targetVector.from), [1, 4.5, 0]);
  assert.deepEqual(rounded(targetVector.to), [3, 5.5, 0]);
  assert.deepEqual(sourceVector.from, [1, 1, 0]);
  assert.deepEqual(sourceVector.to, [3, 2, 0]);
});

test("moves vector targets to a scene frame corner like Manim Mobject.to_corner", () => {
  const scene = {
    bindings: [],
    cameraShots: [{ id: "overview", position: [3, 3, 3] as Vec3, target: [0, 0, 0] as Vec3 }],
    coordinateSpace: {
      mathRange: { x: [-8, 8] as [number, number], y: [-8, 8] as [number, number], z: [-8, 8] as [number, number] },
      worldRange: { x: [-8, 8] as [number, number], y: [-8, 8] as [number, number], z: [-8, 8] as [number, number] }
    },
    diagnostics: { expectedBindingCount: 0, expectedObjectCount: 1, expectedTokenCount: 0 },
    familyId: "three-space-vectors-lines-planes" as const,
    formulas: [],
    objects: [
      { type: "vector" as const, id: "corner-vector", conceptId: "label", colorRole: "parameter", from: [1, 1, 0] as Vec3, to: [3, 2, 0] as Vec3 }
    ],
    sceneId: "animate-to-corner-test",
    timeline: []
  };
  const graph = buildMathSceneRuntimeState(scene, 0).objectGraph;
  const sourceVector = graph.byId["corner-vector"].renderState;
  assert.equal(sourceVector.kind, "vector");

  const plan = createMathAnimateBuilder(graph, "corner-vector")
    .toCorner([1, 1, 0], { buff: 0.5, frame: { max: [6, 6, 0], min: [-6, -6, 0] } })
    .build({ duration: 1.5, targetId: "corner-vector-target" });
  const targetVector = plan.target.nodes["corner-vector"].renderState;

  assert.deepEqual(plan.operations, [
    { buff: 0.5, direction: [1, 1, 0], frame: { max: [6, 6, 0], min: [-6, -6, 0] }, type: "toCorner" }
  ]);
  assert.deepEqual(plan.changedFields, ["renderState"]);
  assert.equal(targetVector.kind, "vector");
  if (targetVector.kind !== "vector") throw new Error("expected vector target");
  assert.deepEqual(rounded(targetVector.from), [3.5, 4.5, 0]);
  assert.deepEqual(rounded(targetVector.to), [5.5, 5.5, 0]);
  assert.deepEqual(sourceVector.from, [1, 1, 0]);
  assert.deepEqual(sourceVector.to, [3, 2, 0]);
});

test("summarizes animate plans for authoring diagnostics and QA attributes", () => {
  const plan = createMathAnimateBuilder(runtimeGraph(), "function-curve")
    .shift([0.25, 0, 0])
    .scale(0.5)
    .build({ duration: 3 });
  const summary = summarizeMathAnimatePlan(plan);

  assert.deepEqual(summary, {
    changedFieldCount: 1,
    changedNodeCount: 3,
    duration: 3,
    objectId: "function-curve",
    operationCount: 2,
    targetObjectId: "function-curve:animate-target"
  });
});

test("throws a useful error when authoring an animation for an unknown Mobject", () => {
  assert.throws(
    () => createMathAnimateBuilder(runtimeGraph(), "missing-object").shift([1, 0, 0]).build({ duration: 1 }),
    /Unknown MAIS Manim object: missing-object/
  );
});

test("MathAnimationBuilder stays pure and renderer-independent", () => {
  const source = fs.readFileSync("components/visualizations/three/manim/mathAnimationBuilder.ts", "utf8");

  assert.match(source, /createMathAnimateBuilder/);
  assert.match(source, /ANIMATION_BUILDER_SOURCE_CONTRACT/);
  assert.match(source, /serializeMathAnimateBuilderCatalog/);
  assert.match(source, /generateMobjectTarget/);
  assert.doesNotMatch(source, /"use client"|@react-three\/fiber|@react-three\/drei|from "three"/);
});
