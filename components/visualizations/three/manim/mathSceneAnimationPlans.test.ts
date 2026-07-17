import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { buildMathSceneSpecForThreeDFamily } from "./mathSceneRegistry";
import {
  buildMathSceneAnimatePlans,
  sceneAnimationPlanDataAttributes,
  summarizeSceneAnimationPlans
} from "./mathSceneAnimationPlans";
import { buildMathSceneRuntimeState } from "./mathSceneRuntimeState";
import { applyMathUpdaters } from "./mathUpdaterRegistry";
import type { AnimationStep, MathSceneSpec, Vec3 } from "./mathSceneTypes";

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

function elapsedAtMidpointOfComposition(scene: MathSceneSpec, compositionId: string) {
  let elapsed = 0;

  for (const step of scene.timeline) {
    if (step.type === "animationComposition" && step.compositionId === compositionId) return elapsed + step.duration / 2;
    elapsed += Math.max(0, step.duration);
  }

  throw new Error(`missing animationComposition step for ${compositionId}`);
}

function transformSteps(scene: MathSceneSpec) {
  return scene.timeline.filter((step): step is Extract<AnimationStep, { type: "transformObject" }> => step.type === "transformObject");
}

function rounded(point: Vec3): Vec3 {
  return point.map((coordinate) => Number(coordinate.toFixed(6))) as Vec3;
}

test("resolves serializable scene-authored animate plans into Manim animate target states", () => {
  const scene = buildFunctionGraphSpec();
  const animationSpec = scene.animationPlans?.[0];
  const probeAnimationSpec = scene.animationPlans?.[1];

  assert.ok(animationSpec, "function graph should ship a first scene-authored Manim animate plan");
  assert.ok(probeAnimationSpec, "function graph should ship a second scene-authored Manim animate plan");
  assert.equal(animationSpec.id, "function-curve-attention-lift");
  assert.equal(animationSpec.objectId, "function-curve");
  assert.equal(animationSpec.targetObjectId, "function-curve:attention-target");
  assert.deepEqual(animationSpec.operations.map((operation) => operation.type), ["shift", "setColorRole"]);
  assert.equal(probeAnimationSpec.id, "function-probe-attention-pulse");
  assert.equal(probeAnimationSpec.objectId, "moving-probe");
  assert.equal(probeAnimationSpec.targetObjectId, "moving-probe:attention-target");
  assert.deepEqual(probeAnimationSpec.operations.map((operation) => operation.type), ["shift", "setColorRole"]);
  assert.equal(transformSteps(scene).length, 0);
  assert.deepEqual(scene.animationCompositions?.[0], {
    animationPlanIds: ["function-curve-attention-lift", "function-probe-attention-pulse"],
    id: "function-attention-lagged-start",
    lagRatio: 0.2,
    type: "laggedStart"
  });
  assert.deepEqual(scene.timeline[3], {
    compositionId: "function-attention-lagged-start",
    duration: 1.44,
    type: "animationComposition"
  });
  const path = { type: "arc" as const, angleRadians: Math.PI / 2, axis: [0, 0, 1] as Vec3 };
  scene.animationPlans = [{ ...animationSpec, path }, probeAnimationSpec];

  const runtimeState = buildMathSceneRuntimeState(scene, 0);
  const plans = buildMathSceneAnimatePlans(scene, runtimeState);

  path.axis[2] = 99;

  assert.equal(plans.length, 2);
  assert.deepEqual(plans.map((plan) => plan.id), ["function-curve-attention-lift", "function-probe-attention-pulse"]);
  assert.equal(plans[0].objectId, animationSpec.objectId);
  assert.equal(plans[0].targetObjectId, animationSpec.targetObjectId);
  assert.deepEqual(plans[0].operations, animationSpec.operations);
  assert.equal(plans[0].step.type, "transformObject");
  assert.equal(plans[0].step.duration, animationSpec.duration);
  assert.equal(plans[0].step.lagRatio, animationSpec.lagRatio);
  assert.deepEqual(plans[0].step.path, { type: "arc", angleRadians: Math.PI / 2, axis: [0, 0, 1] });
});

test("applies scene-authored animate plans through the ordinary runtime updater path", () => {
  const scene = buildFunctionGraphSpec();
  const plans = buildMathSceneAnimatePlans(scene, buildMathSceneRuntimeState(scene, 0));
  const elapsed = elapsedAtMidpointOfComposition(scene, "function-attention-lagged-start");
  const base = buildMathSceneRuntimeState(scene, elapsed);
  const animated = applyMathUpdaters(scene, base, { animationPlans: plans });
  const curve = animated.objectGraph.byId["function-curve"];
  const sourceCurve = base.objectGraph.byId["function-curve"].renderState;
  const targetCurve = plans[0].target.nodes["function-curve"].renderState;

  assert.equal(curve.renderState.kind, "polyline");
  assert.equal(sourceCurve.kind, "polyline");
  assert.equal(targetCurve.kind, "polyline");
  if (curve.renderState.kind !== "polyline" || sourceCurve.kind !== "polyline" || targetCurve.kind !== "polyline") {
    throw new Error("expected polyline render states");
  }

  assert.equal(curve.renderState.points.length, sourceCurve.points.length);
  assert.notDeepEqual(curve.renderState.points[0], sourceCurve.points[0]);
  assert.notDeepEqual(curve.renderState.points[0], targetCurve.points[0]);
  assert.equal(curve.colorRole, "function");
});

test("resolves scene-authored rotate operations through the ordinary animate plan path", () => {
  const scene = {
    animationPlans: [
      {
        duration: 1.2,
        id: "rotate-vector-plan",
        objectId: "rotating-vector",
        operations: [{ type: "rotate", angleRadians: Math.PI / 2, axis: "z", aboutPoint: [1, 1, 0] }],
        targetObjectId: "rotating-vector-target"
      }
    ],
    bindings: [],
    cameraShots: [{ id: "overview", position: [3, 3, 3] as Vec3, target: [0, 0, 0] as Vec3 }],
    coordinateSpace: {
      mathRange: { x: [-3, 3] as [number, number], y: [-3, 3] as [number, number], z: [-3, 3] as [number, number] },
      worldRange: { x: [-3, 3] as [number, number], y: [-3, 3] as [number, number], z: [-3, 3] as [number, number] }
    },
    diagnostics: { expectedBindingCount: 0, expectedObjectCount: 1, expectedTokenCount: 0 },
    familyId: "three-space-vectors-lines-planes",
    formulas: [],
    objects: [
      { type: "vector", id: "rotating-vector", conceptId: "basis", colorRole: "function", from: [2, 1, 0], to: [2, 3, 0] }
    ],
    sceneId: "scene-authored-rotate-test",
    timeline: []
  } as unknown as MathSceneSpec;

  const plans = buildMathSceneAnimatePlans(scene, buildMathSceneRuntimeState(scene, 0));
  const targetVector = plans[0].target.nodes["rotating-vector"].renderState;

  assert.equal(targetVector.kind, "vector");
  if (targetVector.kind !== "vector") throw new Error("expected vector target");
  assert.deepEqual(rounded(targetVector.from), [1, 2, 0]);
  assert.deepEqual(rounded(targetVector.to), [-1, 2, 0]);
});

test("resolves scene-authored setHeight operations through the ordinary animate plan path", () => {
  const scene = {
    animationPlans: [
      {
        duration: 1.2,
        id: "height-vector-plan",
        objectId: "height-vector",
        operations: [{ type: "setHeight", height: 4 }],
        targetObjectId: "height-vector-target"
      }
    ],
    bindings: [],
    cameraShots: [{ id: "overview", position: [3, 3, 3] as Vec3, target: [0, 0, 0] as Vec3 }],
    coordinateSpace: {
      mathRange: { x: [-8, 8] as [number, number], y: [-8, 8] as [number, number], z: [-8, 8] as [number, number] },
      worldRange: { x: [-8, 8] as [number, number], y: [-8, 8] as [number, number], z: [-8, 8] as [number, number] }
    },
    diagnostics: { expectedBindingCount: 0, expectedObjectCount: 1, expectedTokenCount: 0 },
    familyId: "three-space-vectors-lines-planes",
    formulas: [],
    objects: [
      { type: "vector", id: "height-vector", conceptId: "basis", colorRole: "function", from: [1, 1, 0], to: [3, 2, 0] }
    ],
    sceneId: "scene-authored-height-test",
    timeline: []
  } as unknown as MathSceneSpec;

  const plans = buildMathSceneAnimatePlans(scene, buildMathSceneRuntimeState(scene, 0));
  const targetVector = plans[0].target.nodes["height-vector"].renderState;

  assert.equal(targetVector.kind, "vector");
  if (targetVector.kind !== "vector") throw new Error("expected vector target");
  assert.deepEqual(rounded(targetVector.from), [-2, -0.5, 0]);
  assert.deepEqual(rounded(targetVector.to), [6, 3.5, 0]);
});

test("resolves scene-authored matchHeight operations through the ordinary animate plan path", () => {
  const scene = {
    animationPlans: [
      {
        duration: 1.2,
        id: "match-height-vector-plan",
        objectId: "label-vector",
        operations: [{ type: "matchHeight", targetObjectId: "anchor-vector", stretch: true }],
        targetObjectId: "label-vector-target"
      }
    ],
    bindings: [],
    cameraShots: [{ id: "overview", position: [3, 3, 3] as Vec3, target: [0, 0, 0] as Vec3 }],
    coordinateSpace: {
      mathRange: { x: [-8, 8] as [number, number], y: [-8, 8] as [number, number], z: [-8, 8] as [number, number] },
      worldRange: { x: [-8, 8] as [number, number], y: [-8, 8] as [number, number], z: [-8, 8] as [number, number] }
    },
    diagnostics: { expectedBindingCount: 0, expectedObjectCount: 2, expectedTokenCount: 0 },
    familyId: "three-space-vectors-lines-planes",
    formulas: [],
    objects: [
      { type: "vector", id: "label-vector", conceptId: "label", colorRole: "parameter", from: [0, 0, 0], to: [1, 1, 0] },
      { type: "vector", id: "anchor-vector", conceptId: "anchor", colorRole: "function", from: [2, 2, 0], to: [5, 4, 0] }
    ],
    sceneId: "scene-authored-match-height-test",
    timeline: []
  } as unknown as MathSceneSpec;

  const plans = buildMathSceneAnimatePlans(scene, buildMathSceneRuntimeState(scene, 0));
  const targetVector = plans[0].target.nodes["label-vector"].renderState;

  assert.equal(targetVector.kind, "vector");
  if (targetVector.kind !== "vector") throw new Error("expected vector target");
  assert.deepEqual(rounded(targetVector.from), [0, -0.5, 0]);
  assert.deepEqual(rounded(targetVector.to), [1, 1.5, 0]);
});

test("resolves scene-authored matchDepth operations through the ordinary animate plan path", () => {
  const scene = {
    animationPlans: [
      {
        duration: 1.2,
        id: "match-depth-vector-plan",
        objectId: "label-vector",
        operations: [{ type: "matchDepth", targetObjectId: "anchor-vector", stretch: true }],
        targetObjectId: "label-vector-target"
      }
    ],
    bindings: [],
    cameraShots: [{ id: "overview", position: [3, 3, 3] as Vec3, target: [0, 0, 0] as Vec3 }],
    coordinateSpace: {
      mathRange: { x: [-8, 8] as [number, number], y: [-8, 8] as [number, number], z: [-8, 8] as [number, number] },
      worldRange: { x: [-8, 8] as [number, number], y: [-8, 8] as [number, number], z: [-8, 8] as [number, number] }
    },
    diagnostics: { expectedBindingCount: 0, expectedObjectCount: 2, expectedTokenCount: 0 },
    familyId: "three-space-vectors-lines-planes",
    formulas: [],
    objects: [
      { type: "vector", id: "label-vector", conceptId: "label", colorRole: "parameter", from: [0, 0, 0], to: [1, 1, 1] },
      { type: "vector", id: "anchor-vector", conceptId: "anchor", colorRole: "function", from: [2, 2, 2], to: [5, 4, 6] }
    ],
    sceneId: "scene-authored-match-depth-test",
    timeline: []
  } as unknown as MathSceneSpec;

  const plans = buildMathSceneAnimatePlans(scene, buildMathSceneRuntimeState(scene, 0));
  const targetVector = plans[0].target.nodes["label-vector"].renderState;

  assert.equal(targetVector.kind, "vector");
  if (targetVector.kind !== "vector") throw new Error("expected vector target");
  assert.deepEqual(rounded(targetVector.from), [0, 0, -1.5]);
  assert.deepEqual(rounded(targetVector.to), [1, 1, 2.5]);
});

test("resolves scene-authored matchY operations through the ordinary animate plan path", () => {
  const scene = {
    animationPlans: [
      {
        duration: 1.2,
        id: "match-y-vector-plan",
        objectId: "label-vector",
        operations: [{ type: "matchY", targetObjectId: "anchor-vector" }],
        targetObjectId: "label-vector-target"
      }
    ],
    bindings: [],
    cameraShots: [{ id: "overview", position: [3, 3, 3] as Vec3, target: [0, 0, 0] as Vec3 }],
    coordinateSpace: {
      mathRange: { x: [-8, 8] as [number, number], y: [-8, 8] as [number, number], z: [-8, 8] as [number, number] },
      worldRange: { x: [-8, 8] as [number, number], y: [-8, 8] as [number, number], z: [-8, 8] as [number, number] }
    },
    diagnostics: { expectedBindingCount: 0, expectedObjectCount: 2, expectedTokenCount: 0 },
    familyId: "three-space-vectors-lines-planes",
    formulas: [],
    objects: [
      { type: "vector", id: "label-vector", conceptId: "label", colorRole: "parameter", from: [0, 0, 0], to: [1, 1, 0] },
      { type: "vector", id: "anchor-vector", conceptId: "anchor", colorRole: "function", from: [2, 2, 0], to: [5, 4, 0] }
    ],
    sceneId: "scene-authored-match-y-test",
    timeline: []
  } as unknown as MathSceneSpec;

  const plans = buildMathSceneAnimatePlans(scene, buildMathSceneRuntimeState(scene, 0));
  const targetVector = plans[0].target.nodes["label-vector"].renderState;

  assert.equal(targetVector.kind, "vector");
  if (targetVector.kind !== "vector") throw new Error("expected vector target");
  assert.deepEqual(rounded(targetVector.from), [0, 2.5, 0]);
  assert.deepEqual(rounded(targetVector.to), [1, 3.5, 0]);
});

test("resolves scene-authored matchZ operations through the ordinary animate plan path", () => {
  const scene = {
    animationPlans: [
      {
        duration: 1.2,
        id: "match-z-vector-plan",
        objectId: "label-vector",
        operations: [{ type: "matchZ", targetObjectId: "anchor-vector" }],
        targetObjectId: "label-vector-target"
      }
    ],
    bindings: [],
    cameraShots: [{ id: "overview", position: [3, 3, 3] as Vec3, target: [0, 0, 0] as Vec3 }],
    coordinateSpace: {
      mathRange: { x: [-8, 8] as [number, number], y: [-8, 8] as [number, number], z: [-8, 8] as [number, number] },
      worldRange: { x: [-8, 8] as [number, number], y: [-8, 8] as [number, number], z: [-8, 8] as [number, number] }
    },
    diagnostics: { expectedBindingCount: 0, expectedObjectCount: 2, expectedTokenCount: 0 },
    familyId: "three-space-vectors-lines-planes",
    formulas: [],
    objects: [
      { type: "vector", id: "label-vector", conceptId: "label", colorRole: "parameter", from: [0, 0, 0], to: [1, 1, 1] },
      { type: "vector", id: "anchor-vector", conceptId: "anchor", colorRole: "function", from: [2, 2, 2], to: [5, 4, 6] }
    ],
    sceneId: "scene-authored-match-z-test",
    timeline: []
  } as unknown as MathSceneSpec;

  const plans = buildMathSceneAnimatePlans(scene, buildMathSceneRuntimeState(scene, 0));
  const targetVector = plans[0].target.nodes["label-vector"].renderState;

  assert.equal(targetVector.kind, "vector");
  if (targetVector.kind !== "vector") throw new Error("expected vector target");
  assert.deepEqual(rounded(targetVector.from), [0, 0, 3.5]);
  assert.deepEqual(rounded(targetVector.to), [1, 1, 4.5]);
});

test("resolves scene-authored setY operations through the ordinary animate plan path", () => {
  const scene = {
    animationPlans: [
      {
        duration: 1.2,
        id: "set-y-vector-plan",
        objectId: "label-vector",
        operations: [{ type: "setY", coordinate: 3 }],
        targetObjectId: "label-vector-target"
      }
    ],
    bindings: [],
    cameraShots: [{ id: "overview", position: [3, 3, 3] as Vec3, target: [0, 0, 0] as Vec3 }],
    coordinateSpace: {
      mathRange: { x: [-8, 8] as [number, number], y: [-8, 8] as [number, number], z: [-8, 8] as [number, number] },
      worldRange: { x: [-8, 8] as [number, number], y: [-8, 8] as [number, number], z: [-8, 8] as [number, number] }
    },
    diagnostics: { expectedBindingCount: 0, expectedObjectCount: 1, expectedTokenCount: 0 },
    familyId: "three-space-vectors-lines-planes",
    formulas: [],
    objects: [
      { type: "vector", id: "label-vector", conceptId: "label", colorRole: "parameter", from: [0, 0, 0], to: [1, 1, 0] }
    ],
    sceneId: "scene-authored-set-y-test",
    timeline: []
  } as unknown as MathSceneSpec;

  const plans = buildMathSceneAnimatePlans(scene, buildMathSceneRuntimeState(scene, 0));
  const targetVector = plans[0].target.nodes["label-vector"].renderState;

  assert.equal(targetVector.kind, "vector");
  if (targetVector.kind !== "vector") throw new Error("expected vector target");
  assert.deepEqual(rounded(targetVector.from), [0, 2.5, 0]);
  assert.deepEqual(rounded(targetVector.to), [1, 3.5, 0]);
});

test("resolves scene-authored setOpacity operations through the ordinary animate plan path", () => {
  const scene = {
    animationPlans: [
      {
        duration: 1.2,
        id: "opacity-vector-plan",
        objectId: "opacity-vector",
        operations: [{ type: "setOpacity", opacity: 0.4 }],
        targetObjectId: "opacity-vector-target"
      }
    ],
    bindings: [],
    cameraShots: [{ id: "overview", position: [3, 3, 3] as Vec3, target: [0, 0, 0] as Vec3 }],
    coordinateSpace: {
      mathRange: { x: [-8, 8] as [number, number], y: [-8, 8] as [number, number], z: [-8, 8] as [number, number] },
      worldRange: { x: [-8, 8] as [number, number], y: [-8, 8] as [number, number], z: [-8, 8] as [number, number] }
    },
    diagnostics: { expectedBindingCount: 0, expectedObjectCount: 1, expectedTokenCount: 0 },
    familyId: "three-space-vectors-lines-planes",
    formulas: [],
    objects: [
      {
        type: "vector",
        id: "opacity-vector",
        conceptId: "basis",
        colorRole: "function",
        from: [1, 1, 0],
        to: [3, 2, 0],
        uniforms: { opacity: 0.9, shadeIn3D: true }
      }
    ],
    sceneId: "scene-authored-opacity-test",
    timeline: []
  } as unknown as MathSceneSpec;

  const plans = buildMathSceneAnimatePlans(scene, buildMathSceneRuntimeState(scene, 0));

  assert.equal(plans[0].target.nodes["opacity-vector"].uniforms?.opacity, 0.4);
  assert.equal(plans[0].target.nodes["opacity-vector"].uniforms?.shadeIn3D, true);
});

test("resolves scene-authored setStroke and setFill operations through the ordinary animate plan path", () => {
  const scene = {
    animationPlans: [
      {
        duration: 1.2,
        id: "style-vector-plan",
        objectId: "style-vector",
        operations: [
          { type: "setStroke", strokeWidth: 8, strokeOpacity: 0.4, strokeRole: "attention" },
          { type: "setFill", fillOpacity: 0.5, fillRole: "area" }
        ],
        targetObjectId: "style-vector-target"
      }
    ],
    bindings: [],
    cameraShots: [{ id: "overview", position: [3, 3, 3] as Vec3, target: [0, 0, 0] as Vec3 }],
    coordinateSpace: {
      mathRange: { x: [-8, 8] as [number, number], y: [-8, 8] as [number, number], z: [-8, 8] as [number, number] },
      worldRange: { x: [-8, 8] as [number, number], y: [-8, 8] as [number, number], z: [-8, 8] as [number, number] }
    },
    diagnostics: { expectedBindingCount: 0, expectedObjectCount: 1, expectedTokenCount: 0 },
    familyId: "three-space-vectors-lines-planes",
    formulas: [],
    objects: [
      {
        type: "vector",
        id: "style-vector",
        conceptId: "basis",
        colorRole: "function",
        from: [1, 1, 0],
        style: { fillOpacity: 0.1, fillRole: "reference", strokeOpacity: 0.9, strokeRole: "function", strokeWidth: 5 },
        to: [3, 2, 0]
      }
    ],
    sceneId: "scene-authored-style-test",
    timeline: []
  } as unknown as MathSceneSpec;

  const plans = buildMathSceneAnimatePlans(scene, buildMathSceneRuntimeState(scene, 0));
  const targetVector = plans[0].target.nodes["style-vector"].renderState;

  assert.deepEqual(plans[0].changedFields, ["renderState"]);
  assert.equal(targetVector.kind, "vector");
  if (targetVector.kind !== "vector") throw new Error("expected vector target style");
  assert.equal(targetVector.style?.strokeWidth, 8);
  assert.equal(targetVector.style?.strokeOpacity, 0.4);
  assert.equal(targetVector.style?.strokeRole, "attention");
  assert.equal(targetVector.style?.fillOpacity, 0.5);
  assert.equal(targetVector.style?.fillRole, "area");
});

test("resolves scene-authored setStyle operations through the ordinary animate plan path", () => {
  const scene = {
    animationPlans: [
      {
        duration: 1.2,
        id: "aggregate-style-vector-plan",
        objectId: "aggregate-style-vector",
        operations: [{
          type: "setStyle",
          antiAliasWidth: 3,
          fillOpacity: 0.5,
          fillRole: "area",
          jointAngleDegrees: 18,
          strokeOpacity: 0.35,
          strokeRole: "attention",
          strokeWidth: 8
        }],
        targetObjectId: "aggregate-style-vector-target"
      }
    ],
    bindings: [],
    cameraShots: [{ id: "overview", position: [3, 3, 3] as Vec3, target: [0, 0, 0] as Vec3 }],
    coordinateSpace: {
      mathRange: { x: [-8, 8] as [number, number], y: [-8, 8] as [number, number], z: [-8, 8] as [number, number] },
      worldRange: { x: [-8, 8] as [number, number], y: [-8, 8] as [number, number], z: [-8, 8] as [number, number] }
    },
    diagnostics: { expectedBindingCount: 0, expectedObjectCount: 1, expectedTokenCount: 0 },
    familyId: "three-space-vectors-lines-planes",
    formulas: [],
    objects: [
      {
        type: "vector",
        id: "aggregate-style-vector",
        conceptId: "basis",
        colorRole: "function",
        from: [1, 1, 0],
        style: {
          antiAliasWidth: 1,
          fillOpacity: 0.1,
          fillRole: "reference",
          jointAngleDegrees: 0,
          strokeOpacity: 0.9,
          strokeRole: "function",
          strokeWidth: 5
        },
        to: [3, 2, 0]
      }
    ],
    sceneId: "scene-authored-aggregate-style-test",
    timeline: []
  } as unknown as MathSceneSpec;

  const plans = buildMathSceneAnimatePlans(scene, buildMathSceneRuntimeState(scene, 0));
  const targetVector = plans[0].target.nodes["aggregate-style-vector"].renderState;

  assert.deepEqual(plans[0].changedFields, ["renderState"]);
  assert.equal(targetVector.kind, "vector");
  if (targetVector.kind !== "vector") throw new Error("expected aggregate vector target style");
  assert.equal(targetVector.style?.strokeWidth, 8);
  assert.equal(targetVector.style?.strokeOpacity, 0.35);
  assert.equal(targetVector.style?.strokeRole, "attention");
  assert.equal(targetVector.style?.fillOpacity, 0.5);
  assert.equal(targetVector.style?.fillRole, "area");
  assert.equal(targetVector.style?.antiAliasWidth, 3);
  assert.equal(targetVector.style?.jointAngleDegrees, 18);
});

test("resolves scene-authored center operations through the ordinary animate plan path", () => {
  const scene = {
    animationPlans: [
      {
        duration: 1.2,
        id: "center-vector-plan",
        objectId: "offset-vector",
        operations: [{ type: "center" }],
        targetObjectId: "offset-vector-target"
      }
    ],
    bindings: [],
    cameraShots: [{ id: "overview", position: [3, 3, 3] as Vec3, target: [0, 0, 0] as Vec3 }],
    coordinateSpace: {
      mathRange: { x: [-8, 8] as [number, number], y: [-8, 8] as [number, number], z: [-8, 8] as [number, number] },
      worldRange: { x: [-8, 8] as [number, number], y: [-8, 8] as [number, number], z: [-8, 8] as [number, number] }
    },
    diagnostics: { expectedBindingCount: 0, expectedObjectCount: 1, expectedTokenCount: 0 },
    familyId: "three-space-vectors-lines-planes",
    formulas: [],
    objects: [
      { type: "vector", id: "offset-vector", conceptId: "basis", colorRole: "function", from: [2, -1, 1], to: [4, 3, 3] }
    ],
    sceneId: "scene-authored-center-test",
    timeline: []
  } as unknown as MathSceneSpec;

  const plans = buildMathSceneAnimatePlans(scene, buildMathSceneRuntimeState(scene, 0));
  const targetVector = plans[0].target.nodes["offset-vector"].renderState;

  assert.equal(targetVector.kind, "vector");
  if (targetVector.kind !== "vector") throw new Error("expected vector target");
  assert.deepEqual(rounded(targetVector.from), [-1, -2, -1]);
  assert.deepEqual(rounded(targetVector.to), [1, 2, 1]);
});

test("resolves scene-authored moveTo operations through the ordinary animate plan path", () => {
  const scene = {
    animationPlans: [
      {
        duration: 1.2,
        id: "move-vector-plan",
        objectId: "moving-vector",
        operations: [{ type: "moveTo", point: [5, 6, 0] }],
        targetObjectId: "moving-vector-target"
      }
    ],
    bindings: [],
    cameraShots: [{ id: "overview", position: [3, 3, 3] as Vec3, target: [0, 0, 0] as Vec3 }],
    coordinateSpace: {
      mathRange: { x: [-8, 8] as [number, number], y: [-8, 8] as [number, number], z: [-8, 8] as [number, number] },
      worldRange: { x: [-8, 8] as [number, number], y: [-8, 8] as [number, number], z: [-8, 8] as [number, number] }
    },
    diagnostics: { expectedBindingCount: 0, expectedObjectCount: 1, expectedTokenCount: 0 },
    familyId: "three-space-vectors-lines-planes",
    formulas: [],
    objects: [
      { type: "vector", id: "moving-vector", conceptId: "basis", colorRole: "function", from: [1, 1, 0], to: [3, 2, 0] }
    ],
    sceneId: "scene-authored-move-to-test",
    timeline: []
  } as unknown as MathSceneSpec;

  const plans = buildMathSceneAnimatePlans(scene, buildMathSceneRuntimeState(scene, 0));
  const targetVector = plans[0].target.nodes["moving-vector"].renderState;

  assert.equal(targetVector.kind, "vector");
  if (targetVector.kind !== "vector") throw new Error("expected vector target");
  assert.deepEqual(rounded(targetVector.from), [4, 5.5, 0]);
  assert.deepEqual(rounded(targetVector.to), [6, 6.5, 0]);
});

test("resolves scene-authored nextTo operations through the ordinary animate plan path", () => {
  const scene = {
    animationPlans: [
      {
        duration: 1.2,
        id: "next-to-vector-plan",
        objectId: "label-vector",
        operations: [{ type: "nextTo", targetObjectId: "anchor-vector", direction: [1, 0, 0], buff: 0.5 }],
        targetObjectId: "label-vector-target"
      }
    ],
    bindings: [],
    cameraShots: [{ id: "overview", position: [3, 3, 3] as Vec3, target: [0, 0, 0] as Vec3 }],
    coordinateSpace: {
      mathRange: { x: [-8, 8] as [number, number], y: [-8, 8] as [number, number], z: [-8, 8] as [number, number] },
      worldRange: { x: [-8, 8] as [number, number], y: [-8, 8] as [number, number], z: [-8, 8] as [number, number] }
    },
    diagnostics: { expectedBindingCount: 0, expectedObjectCount: 2, expectedTokenCount: 0 },
    familyId: "three-space-vectors-lines-planes",
    formulas: [],
    objects: [
      { type: "vector", id: "label-vector", conceptId: "label", colorRole: "parameter", from: [0, 0, 0], to: [1, 1, 0] },
      { type: "vector", id: "anchor-vector", conceptId: "anchor", colorRole: "function", from: [2, 2, 0], to: [4, 4, 0] }
    ],
    sceneId: "scene-authored-next-to-test",
    timeline: []
  } as unknown as MathSceneSpec;

  const plans = buildMathSceneAnimatePlans(scene, buildMathSceneRuntimeState(scene, 0));
  const targetVector = plans[0].target.nodes["label-vector"].renderState;

  assert.equal(targetVector.kind, "vector");
  if (targetVector.kind !== "vector") throw new Error("expected vector target");
  assert.deepEqual(rounded(targetVector.from), [4.5, 2.5, 0]);
  assert.deepEqual(rounded(targetVector.to), [5.5, 3.5, 0]);
});

test("resolves scene-authored alignTo operations through the ordinary animate plan path", () => {
  const scene = {
    animationPlans: [
      {
        duration: 1.2,
        id: "align-to-vector-plan",
        objectId: "label-vector",
        operations: [{ type: "alignTo", targetObjectId: "anchor-vector", direction: [0, 1, 0] }],
        targetObjectId: "label-vector-target"
      }
    ],
    bindings: [],
    cameraShots: [{ id: "overview", position: [3, 3, 3] as Vec3, target: [0, 0, 0] as Vec3 }],
    coordinateSpace: {
      mathRange: { x: [-8, 8] as [number, number], y: [-8, 8] as [number, number], z: [-8, 8] as [number, number] },
      worldRange: { x: [-8, 8] as [number, number], y: [-8, 8] as [number, number], z: [-8, 8] as [number, number] }
    },
    diagnostics: { expectedBindingCount: 0, expectedObjectCount: 2, expectedTokenCount: 0 },
    familyId: "three-space-vectors-lines-planes",
    formulas: [],
    objects: [
      { type: "vector", id: "label-vector", conceptId: "label", colorRole: "parameter", from: [0, 0, 0], to: [1, 1, 0] },
      { type: "vector", id: "anchor-vector", conceptId: "anchor", colorRole: "function", from: [2, 2, 0], to: [4, 4, 0] }
    ],
    sceneId: "scene-authored-align-to-test",
    timeline: []
  } as unknown as MathSceneSpec;

  const plans = buildMathSceneAnimatePlans(scene, buildMathSceneRuntimeState(scene, 0));
  const targetVector = plans[0].target.nodes["label-vector"].renderState;

  assert.equal(targetVector.kind, "vector");
  if (targetVector.kind !== "vector") throw new Error("expected vector target");
  assert.deepEqual(rounded(targetVector.from), [0, 3, 0]);
  assert.deepEqual(rounded(targetVector.to), [1, 4, 0]);
});

test("resolves scene-authored toEdge operations through the ordinary animate plan path", () => {
  const scene = {
    animationPlans: [
      {
        duration: 1.2,
        id: "to-edge-vector-plan",
        objectId: "edge-vector",
        operations: [{ type: "toEdge", direction: [0, 1, 0], buff: 0.5, frame: { min: [-6, -6, 0], max: [6, 6, 0] } }],
        targetObjectId: "edge-vector-target"
      }
    ],
    bindings: [],
    cameraShots: [{ id: "overview", position: [3, 3, 3] as Vec3, target: [0, 0, 0] as Vec3 }],
    coordinateSpace: {
      mathRange: { x: [-8, 8] as [number, number], y: [-8, 8] as [number, number], z: [-8, 8] as [number, number] },
      worldRange: { x: [-8, 8] as [number, number], y: [-8, 8] as [number, number], z: [-8, 8] as [number, number] }
    },
    diagnostics: { expectedBindingCount: 0, expectedObjectCount: 1, expectedTokenCount: 0 },
    familyId: "three-space-vectors-lines-planes",
    formulas: [],
    objects: [
      { type: "vector", id: "edge-vector", conceptId: "label", colorRole: "parameter", from: [1, 1, 0], to: [3, 2, 0] }
    ],
    sceneId: "scene-authored-to-edge-test",
    timeline: []
  } as unknown as MathSceneSpec;

  const plans = buildMathSceneAnimatePlans(scene, buildMathSceneRuntimeState(scene, 0));
  const targetVector = plans[0].target.nodes["edge-vector"].renderState;

  assert.equal(targetVector.kind, "vector");
  if (targetVector.kind !== "vector") throw new Error("expected vector target");
  assert.deepEqual(rounded(targetVector.from), [1, 4.5, 0]);
  assert.deepEqual(rounded(targetVector.to), [3, 5.5, 0]);
});

test("resolves scene-authored toCorner operations through the ordinary animate plan path", () => {
  const scene = {
    animationPlans: [
      {
        duration: 1.2,
        id: "to-corner-vector-plan",
        objectId: "corner-vector",
        operations: [{ type: "toCorner", direction: [1, 1, 0], buff: 0.5, frame: { min: [-6, -6, 0], max: [6, 6, 0] } }],
        targetObjectId: "corner-vector-target"
      }
    ],
    bindings: [],
    cameraShots: [{ id: "overview", position: [3, 3, 3] as Vec3, target: [0, 0, 0] as Vec3 }],
    coordinateSpace: {
      mathRange: { x: [-8, 8] as [number, number], y: [-8, 8] as [number, number], z: [-8, 8] as [number, number] },
      worldRange: { x: [-8, 8] as [number, number], y: [-8, 8] as [number, number], z: [-8, 8] as [number, number] }
    },
    diagnostics: { expectedBindingCount: 0, expectedObjectCount: 1, expectedTokenCount: 0 },
    familyId: "three-space-vectors-lines-planes",
    formulas: [],
    objects: [
      { type: "vector", id: "corner-vector", conceptId: "label", colorRole: "parameter", from: [1, 1, 0], to: [3, 2, 0] }
    ],
    sceneId: "scene-authored-to-corner-test",
    timeline: []
  } as unknown as MathSceneSpec;

  const plans = buildMathSceneAnimatePlans(scene, buildMathSceneRuntimeState(scene, 0));
  const targetVector = plans[0].target.nodes["corner-vector"].renderState;

  assert.equal(targetVector.kind, "vector");
  if (targetVector.kind !== "vector") throw new Error("expected vector target");
  assert.deepEqual(rounded(targetVector.from), [3.5, 4.5, 0]);
  assert.deepEqual(rounded(targetVector.to), [5.5, 5.5, 0]);
});

test("persists scene-authored animate target state after the transform beat completes", () => {
  const scene = buildFunctionGraphSpec();
  const plans = buildMathSceneAnimatePlans(scene, buildMathSceneRuntimeState(scene, 0));
  const compositionStart = elapsedAtMidpointOfComposition(scene, "function-attention-lagged-start") - 0.72;
  const elapsedAfterTransform = compositionStart + 1.44 + 0.25;
  const animated = applyMathUpdaters(scene, buildMathSceneRuntimeState(scene, elapsedAfterTransform), { animationPlans: plans });
  const curve = animated.objectGraph.byId["function-curve"];
  const targetCurve = plans[0].target.nodes["function-curve"].renderState;

  assert.equal(curve.renderState.kind, "polyline");
  assert.equal(targetCurve.kind, "polyline");
  if (curve.renderState.kind !== "polyline" || targetCurve.kind !== "polyline") {
    throw new Error("expected polyline render states");
  }

  assert.deepEqual(curve.renderState.points[0], targetCurve.points[0]);
  assert.deepEqual(curve.renderState.points.at(-1), targetCurve.points.at(-1));
  assert.equal(curve.colorRole, "attention");
});

test("summarizes scene animation plans for QA evidence and export attributes", () => {
  const scene = buildFunctionGraphSpec();
  const summary = summarizeSceneAnimationPlans(scene);

  assert.deepEqual(summary, {
    animatedObjectIds: ["function-curve", "moving-probe"],
    compositionCount: 1,
    compositionDurationSeconds: 1.44,
    compositionIssueCount: 0,
    compositionModes: ["laggedStart"],
    compositionWindowCount: 2,
    operationCount: 4,
    planCount: 2,
    transformStepCount: 0
  });
  assert.deepEqual(sceneAnimationPlanDataAttributes(summary), {
    "data-viz-manim-animation-composition-count": "1",
    "data-viz-manim-animation-composition-duration": "1.440",
    "data-viz-manim-animation-composition-issue-count": "0",
    "data-viz-manim-animation-composition-modes": "laggedStart",
    "data-viz-manim-animation-composition-window-count": "2",
    "data-viz-manim-animation-object-count": "2",
    "data-viz-manim-animation-operation-count": "4",
    "data-viz-manim-animation-plan-count": "2",
    "data-viz-manim-transform-step-count": "0"
  });
});

test("summarizes scene animation compositions beside authored animate plans", () => {
  const scene = buildFunctionGraphSpec();
  const animationSpec = scene.animationPlans?.[0];

  assert.ok(animationSpec, "function graph should ship a first scene-authored Manim animate plan");

  const summary = summarizeSceneAnimationPlans({
    ...scene,
    animationCompositions: [
      {
        animationPlanIds: [animationSpec.id],
        id: "function-attention-group",
        type: "animationGroup"
      }
    ]
  });

  assert.equal(summary.compositionCount, 1);
  assert.equal(summary.compositionWindowCount, 1);
  assert.equal(summary.compositionDurationSeconds, animationSpec.duration);
  assert.deepEqual(summary.compositionModes, ["animationGroup"]);
  assert.equal(summary.compositionIssueCount, 0);
});

test("scene animation plans survive stable scene spec export", async () => {
  const { buildApprovedSceneSpecExport } = await import("./mathSceneExport");
  const scene = buildFunctionGraphSpec();
  const exportPlan = buildApprovedSceneSpecExport(scene);
  const parsed = JSON.parse(exportPlan.json) as MathSceneSpec;

  assert.equal(exportPlan.approvedForRuntime, true);
  assert.equal(parsed.animationPlans?.length, scene.animationPlans?.length);
  assert.equal(parsed.animationPlans?.[0]?.targetObjectId, scene.animationPlans?.[0]?.targetObjectId);
  assert.deepEqual(parsed.animationPlans?.[0]?.operations, scene.animationPlans?.[0]?.operations);
});

test("scene-authored animation plan source contracts stay pure and runtime-owned", () => {
  const source = fs.readFileSync("components/visualizations/three/manim/mathSceneAnimationPlans.ts", "utf8");
  const typeSource = fs.readFileSync("components/visualizations/three/manim/mathSceneTypes.ts", "utf8");
  const canvasSource = fs.readFileSync("components/visualizations/three/ThreeDLabCanvas.tsx", "utf8");
  const runtimeSource = fs.readFileSync("components/visualizations/three/manim/MathSceneRuntime.tsx", "utf8");
  const stepperSource = fs.readFileSync("components/visualizations/three/manim/mathSceneFrameStepper.ts", "utf8");

  assert.match(typeSource, /animationPlans\?: MathSceneAnimatePlanSpec\[\]/);
  assert.match(typeSource, /animationCompositions\?: MathSceneAnimationCompositionSpec\[\]/);
  assert.match(source, /createMathAnimateBuilder/);
  assert.match(source, /buildSceneAnimationCompositionPlans/);
  assert.doesNotMatch(source, /"use client"|@react-three\/fiber|@react-three\/drei|from "three"/);
  assert.match(stepperSource, /buildMathSceneAnimatePlans/);
  assert.match(canvasSource, /stepMathSceneFrame/);
  assert.match(runtimeSource, /buildMathSceneAnimatePlans/);
});
