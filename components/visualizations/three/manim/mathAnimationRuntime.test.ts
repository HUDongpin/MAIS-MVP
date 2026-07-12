import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { createMathAnimateBuilder } from "./mathAnimationBuilder";
import {
  ANIMATION_RUNTIME_SOURCE_CONTRACT,
  MOBJECT_INTERPOLATE_RENDER_POLICY,
  applyMathAnimatePlans,
  animationRuntimeEvidenceDataAttributes,
  buildMathAnimationRuntimeInterpolateFieldEvidence,
  buildMathAnimationRuntimeBoundingBoxEvidence,
  buildMathAnimationRuntimeEvidence,
  buildMathAnimationRuntimeUniformEvidence,
  buildMathAnimationRuntimeFrame,
  serializeMathAnimationRuntimeBoundingBoxEvidence,
  serializeMathAnimationRuntimeInterpolateFieldEvidence,
  serializeMathAnimationRuntimeEvidence,
  serializeMathAnimationRuntimeUniformEvidence,
  summarizeMathAnimationRuntimeFrame,
  transformInterpolateFieldEvidenceDataAttributes
} from "./mathAnimationRuntime";
import {
  TRANSFORM_PATH_NON_POINT_FIELD_POLICY,
  TRANSFORM_PATH_POINTLIKE_FIELD_POLICY
} from "./mathPathFunctions";
import { buildMathSceneAnimatePlans } from "./mathSceneAnimationPlans";
import { buildMathSceneSpecForThreeDFamily } from "./mathSceneRegistry";
import { buildMathSceneRuntimeState } from "./mathSceneRuntimeState";
import { applyMathUpdaters } from "./mathUpdaterRegistry";
import type { MathSceneSpec, Vec3 } from "./mathSceneTypes";

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

function shiftedBy(point: Vec3, delta: Vec3, progress: number): Vec3 {
  return [
    point[0] + delta[0] * progress,
    point[1] + delta[1] * progress,
    point[2] + delta[2] * progress
  ];
}

function roundedVec3(point: Vec3): Vec3 {
  return point.map((coordinate) => Number(coordinate.toFixed(6))) as Vec3;
}

function buildTransformScene(delta: Vec3, duration = 2) {
  assert.ok(functionGraphSpec);
  const sourceState = buildMathSceneRuntimeState(functionGraphSpec, 0);
  const originalCurve = sourceState.objectGraph.byId["function-curve"].renderState;
  assert.equal(originalCurve.kind, "polyline");
  const plan = createMathAnimateBuilder(sourceState.objectGraph, "function-curve")
    .shift(delta)
    .setColorRole("attention")
    .build({ duration });
  const scene: MathSceneSpec = {
    ...functionGraphSpec,
    timeline: [plan.step]
  };

  return {
    originalCurve,
    plan,
    scene
  };
}

test("interpolates a Manim animate target into displayed runtime render state during transformObject", () => {
  const delta: Vec3 = [1, -0.5, 0.25];
  const { originalCurve, plan, scene } = buildTransformScene(delta);
  const state = buildMathSceneRuntimeState(scene, 1);
  const frame = buildMathAnimationRuntimeFrame(state, [plan]);
  const animated = applyMathAnimatePlans(state, [plan]);
  const curve = animated.objectGraph.byId["function-curve"].renderState;
  const probe = animated.objectGraph.byId["moving-probe"].renderState;

  assert.equal(frame.active, true);
  assert.equal(frame.objectId, "function-curve");
  assert.equal(frame.targetObjectId, "function-curve:animate-target");
  assert.equal(frame.progress, 0.5);
  assert.deepEqual(frame.nodeFrames.map((entry) => entry.objectId), ["function-curve", "moving-probe", "probe-trace"]);

  assert.equal(curve.kind, "polyline");
  if (curve.kind !== "polyline") throw new Error("expected animated curve");
  assert.equal(curve.points.length, originalCurve.points.length);
  assert.deepEqual(curve.points[0], shiftedBy(originalCurve.points[0], delta, 0.5));
  assert.deepEqual(curve.points.at(-1), shiftedBy(originalCurve.points.at(-1)!, delta, 0.5));

  assert.equal(probe.kind, "point");
  if (probe.kind !== "point") throw new Error("expected animated probe");
  assert.deepEqual(probe.position, shiftedBy([0, 0, 0], delta, 0.5));
  assert.equal(animated.objectGraph.byId["function-curve"].colorRole, "function");
});

test("interpolates Manim animate transforms along a path_arc instead of a straight chord", () => {
  const scene: MathSceneSpec = {
    bindings: [],
    cameraShots: [{ id: "overview", position: [3, 3, 3], target: [0, 0, 0] }],
    coordinateSpace: {
      mathRange: { x: [-2, 2], y: [-2, 2], z: [-2, 2] },
      worldRange: { x: [-2, 2], y: [-2, 2], z: [-2, 2] }
    },
    diagnostics: { expectedBindingCount: 0, expectedObjectCount: 1, expectedTokenCount: 0 },
    familyId: "three-space-vectors-lines-planes",
    formulas: [],
    objects: [
      {
        colorRole: "function",
        conceptId: "arc-vector",
        from: [1, 0, 0],
        id: "arc-vector",
        to: [2, 0, 0],
        type: "vector"
      }
    ],
    sceneId: "path-arc-runtime-test",
    timeline: []
  };
  const sourceState = buildMathSceneRuntimeState(scene, 0);
  const plan = createMathAnimateBuilder(sourceState.objectGraph, "arc-vector")
    .rotate(Math.PI / 2, { aboutPoint: [0, 0, 0], axis: "z" })
    .build({ duration: 2, path: { type: "arc", angleRadians: Math.PI / 2, axis: [0, 0, 1] } });
  const frame = buildMathAnimationRuntimeFrame(
    buildMathSceneRuntimeState({ ...scene, timeline: [plan.step] }, 1),
    [plan]
  );
  const vectorFrame = frame.nodeFrames.find((entry) => entry.objectId === "arc-vector");

  assert.ok(vectorFrame);
  assert.equal(vectorFrame.renderState.kind, "vector");
  if (vectorFrame.renderState.kind !== "vector") throw new Error("expected vector frame");
  assert.deepEqual(roundedVec3(vectorFrame.renderState.from), [0.707107, 0.707107, 0]);
  assert.deepEqual(roundedVec3(vectorFrame.renderState.to), [1.414214, 1.414214, 0]);
});

test("aligns mismatched curve samples by arc length before runtime interpolation", () => {
  const scene: MathSceneSpec = {
    bindings: [],
    cameraShots: [{ id: "overview", position: [3, 3, 3], target: [0, 0, 0] }],
    coordinateSpace: {
      mathRange: { x: [0, 3], y: [0, 1], z: [0, 1] },
      worldRange: { x: [0, 3], y: [0, 1], z: [0, 1] }
    },
    diagnostics: { expectedBindingCount: 0, expectedObjectCount: 1, expectedTokenCount: 0 },
    familyId: "three-function-graph",
    formulas: [],
    objects: [
      {
        colorRole: "function",
        conceptId: "morphing-curve",
        id: "curve",
        samples: [
          [0, 0, 0],
          [2, 0, 0]
        ],
        type: "parametricCurve"
      }
    ],
    sceneId: "runtime-curve-alignment-scene",
    timeline: []
  };
  const sourceState = buildMathSceneRuntimeState(scene, 0);
  const plan = createMathAnimateBuilder(sourceState.objectGraph, "curve").build({ duration: 2 });
  const target = plan.target.nodes.curve;

  assert.equal(target.renderState.kind, "polyline");
  if (target.renderState.kind !== "polyline") throw new Error("expected target curve");
  target.renderState = {
    ...target.renderState,
    points: [
      [0, 0, 0],
      [1, 1, 0],
      [2, 0, 0],
      [3, 1, 0]
    ]
  };
  const frame = buildMathAnimationRuntimeFrame(
    buildMathSceneRuntimeState({ ...scene, timeline: [plan.step] }, 1),
    [plan]
  );
  const curveFrame = frame.nodeFrames.find((entry) => entry.objectId === "curve");

  assert.ok(curveFrame);
  assert.equal(curveFrame.renderState.kind, "polyline");
  if (curveFrame.renderState.kind !== "polyline") throw new Error("expected animated curve frame");
  assert.deepEqual(curveFrame.renderState.points.map(roundedVec3), [
    [0, 0, 0],
    [0.833333, 0.5, 0],
    [1.666667, 0, 0],
    [2.5, 0.5, 0]
  ]);
});

test("aligns mismatched curve morphs through VMobject smooth insert_n_curves subdivision", () => {
  const scene: MathSceneSpec = {
    bindings: [],
    cameraShots: [{ id: "overview", position: [3, 3, 3], target: [0, 0, 0] }],
    coordinateSpace: {
      mathRange: { x: [0, 3], y: [0, 2], z: [0, 1] },
      worldRange: { x: [0, 3], y: [0, 2], z: [0, 1] }
    },
    diagnostics: { expectedBindingCount: 0, expectedObjectCount: 1, expectedTokenCount: 0 },
    familyId: "three-function-graph",
    formulas: [],
    objects: [
      {
        colorRole: "function",
        conceptId: "morphing-curve",
        id: "curve",
        samples: [
          [0, 0, 0],
          [1, 2, 0],
          [2, 0, 0]
        ],
        type: "parametricCurve"
      }
    ],
    sceneId: "runtime-vmobject-curve-alignment-scene",
    timeline: []
  };
  const sourceState = buildMathSceneRuntimeState(scene, 0);
  const plan = createMathAnimateBuilder(sourceState.objectGraph, "curve").build({ duration: 2 });
  const target = plan.target.nodes.curve;

  assert.equal(target.renderState.kind, "polyline");
  if (target.renderState.kind !== "polyline") throw new Error("expected target curve");
  target.renderState = {
    ...target.renderState,
    points: [
      [0, 0, 0],
      [1, 0, 0],
      [2, 0, 0],
      [3, 0, 0]
    ]
  };
  const frame = buildMathAnimationRuntimeFrame(
    buildMathSceneRuntimeState({ ...scene, timeline: [plan.step] }, 1),
    [plan]
  );
  const curveFrame = frame.nodeFrames.find((entry) => entry.objectId === "curve");

  assert.ok(curveFrame);
  assert.equal(curveFrame.renderState.kind, "polyline");
  if (curveFrame.renderState.kind !== "polyline") throw new Error("expected animated curve frame");
  assert.deepEqual(curveFrame.renderState.points.map(roundedVec3), [
    [0, 0, 0],
    [0.672746, 0.625, 0],
    [1.5, 1, 0],
    [2.5, 0, 0]
  ]);
});

test("aligns mismatched surface grids by normalized u/v coordinates before runtime interpolation", () => {
  const scene: MathSceneSpec = {
    bindings: [],
    cameraShots: [{ id: "overview", position: [3, 3, 3], target: [0, 0, 0] }],
    coordinateSpace: {
      mathRange: { x: [0, 2], y: [0, 2], z: [0, 4] },
      worldRange: { x: [0, 2], y: [0, 2], z: [0, 4] }
    },
    diagnostics: { expectedBindingCount: 0, expectedObjectCount: 1, expectedTokenCount: 0 },
    familyId: "three-conic-sections-deep",
    formulas: [],
    objects: [
      {
        colorRole: "surface",
        conceptId: "morphing-surface",
        id: "surface",
        samples: [
          [
            [0, 0, 0],
            [0, 2, 0]
          ],
          [
            [2, 0, 0],
            [2, 2, 0]
          ]
        ],
        type: "parametricSurface",
        uRange: [0, 2],
        vRange: [0, 2]
      }
    ],
    sceneId: "runtime-surface-alignment-scene",
    timeline: []
  };
  const sourceState = buildMathSceneRuntimeState(scene, 0);
  const plan = createMathAnimateBuilder(sourceState.objectGraph, "surface").build({ duration: 2 });
  const target = plan.target.nodes.surface;

  assert.equal(target.renderState.kind, "surface");
  if (target.renderState.kind !== "surface") throw new Error("expected target surface");
  target.renderState = {
    ...target.renderState,
    columns: 3,
    points: [
      [0, 0, 0],
      [0, 1, 1],
      [0, 2, 2],
      [1, 0, 1],
      [1, 1, 2],
      [1, 2, 3],
      [2, 0, 2],
      [2, 1, 3],
      [2, 2, 4]
    ],
    rows: 3,
    wireframeColumns: [
      [[0, 0, 0], [1, 0, 1], [2, 0, 2]],
      [[0, 1, 1], [1, 1, 2], [2, 1, 3]],
      [[0, 2, 2], [1, 2, 3], [2, 2, 4]]
    ],
    wireframeRows: [
      [[0, 0, 0], [0, 1, 1], [0, 2, 2]],
      [[1, 0, 1], [1, 1, 2], [1, 2, 3]],
      [[2, 0, 2], [2, 1, 3], [2, 2, 4]]
    ]
  };
  const frame = buildMathAnimationRuntimeFrame(
    buildMathSceneRuntimeState({ ...scene, timeline: [plan.step] }, 1),
    [plan]
  );
  const surfaceFrame = frame.nodeFrames.find((entry) => entry.objectId === "surface");

  assert.ok(surfaceFrame);
  assert.equal(surfaceFrame.renderState.kind, "surface");
  if (surfaceFrame.renderState.kind !== "surface") throw new Error("expected animated surface frame");
  assert.equal(surfaceFrame.renderState.rows, 3);
  assert.equal(surfaceFrame.renderState.columns, 3);
  assert.deepEqual(surfaceFrame.renderState.points.map(roundedVec3), [
    [0, 0, 0],
    [0, 1, 0.5],
    [0, 2, 1],
    [1, 0, 0.5],
    [1, 1, 1],
    [1, 2, 1.5],
    [2, 0, 1],
    [2, 1, 1.5],
    [2, 2, 2]
  ]);
  assert.deepEqual(surfaceFrame.renderState.wireframeRows[1].map(roundedVec3), [
    [1, 0, 0.5],
    [1, 1, 1],
    [1, 2, 1.5]
  ]);
});

test("switches non-geometric target fields at the end of the transform", () => {
  const { plan, scene } = buildTransformScene([0.5, 0, 0], 2);
  const completed = applyMathAnimatePlans(buildMathSceneRuntimeState(scene, 2), [plan]);

  assert.equal(completed.objectGraph.byId["function-curve"].colorRole, "attention");
  assert.equal(completed.objectGraph.byId["moving-probe"].colorRole, "attention");
});

test("interpolates target opacity uniforms during Manim animate transforms", () => {
  assert.ok(functionGraphSpec);
  const sourceState = buildMathSceneRuntimeState(functionGraphSpec, 0);
  const plan = createMathAnimateBuilder(sourceState.objectGraph, "function-curve")
    .setOpacity(0)
    .build({ duration: 2 });
  const scene: MathSceneSpec = {
    ...functionGraphSpec,
    timeline: [plan.step]
  };
  const halfway = applyMathAnimatePlans(buildMathSceneRuntimeState(scene, 1), [plan]);
  const completed = applyMathAnimatePlans(buildMathSceneRuntimeState(scene, 2), [plan]);

  assert.equal(plan.target.nodes["function-curve"].uniforms?.opacity, 0);
  assert.equal(Number(halfway.objectGraph.byId["function-curve"].uniforms?.opacity.toFixed(3)), 0.5);
  assert.equal(Number(halfway.objectGraph.byId["moving-probe"].uniforms?.opacity.toFixed(3)), 0.5);
  assert.equal(completed.objectGraph.byId["function-curve"].uniforms?.opacity, 0);
  assert.equal(completed.objectGraph.byId["moving-probe"].uniforms?.opacity, 0);
});

test("summarizes Mobject.interpolate uniform blending for browser evidence", () => {
  assert.ok(functionGraphSpec);
  const sourceState = buildMathSceneRuntimeState(functionGraphSpec, 0);
  const plan = createMathAnimateBuilder(sourceState.objectGraph, "function-curve")
    .setOpacity(0)
    .build({ duration: 2 });
  const scene: MathSceneSpec = {
    ...functionGraphSpec,
    timeline: [plan.step]
  };
  const frame = buildMathAnimationRuntimeFrame(buildMathSceneRuntimeState(scene, 1), [plan]);
  const evidence = buildMathAnimationRuntimeUniformEvidence(frame);
  const serialized = serializeMathAnimationRuntimeUniformEvidence(evidence);

  assert.equal(evidence.nodeCount, frame.nodeFrames.length);
  assert.equal(evidence.uniformNodeCount, 3);
  assert.equal(evidence.opacitySampleCount, 3);
  assert.equal(evidence.clippingPlaneCount, 0);
  assert.equal(evidence.objectIds, "function-curve,moving-probe,probe-trace");
  assert.equal(evidence.opacityRange, "0.500..0.500");
  assert.match(evidence.sourceSummary, /Mobject\.interpolate/);
  assert.equal(
    evidence.summary,
    "transform-interpolate-uniforms:nodes=3:uniforms=3:opacitySamples=3:clipPlanes=0:opacityRange=0.500..0.500:ids=function-curve,moving-probe,probe-trace"
  );
  assert.doesNotMatch(serialized, /<\/script|undefined|NaN|Infinity/i);
  assert.deepEqual(JSON.parse(serialized), evidence);
});

test("interpolates stored Mobject bounding boxes when render state has no points", () => {
  assert.ok(functionGraphSpec);
  const sourceState = buildMathSceneRuntimeState(functionGraphSpec, 0);
  const plan = createMathAnimateBuilder(sourceState.objectGraph, "function-curve").build({ duration: 2 });
  const scene: MathSceneSpec = {
    ...functionGraphSpec,
    timeline: [plan.step]
  };
  const runtimeState = buildMathSceneRuntimeState(scene, 1);

  runtimeState.objectGraph.byId["probe-trace"] = {
    ...runtimeState.objectGraph.byId["probe-trace"],
    boundingBox: { center: [0, 0, 0], kind: "finite", max: [1, 1, 1], min: [-1, -1, -1] },
    renderState: { kind: "empty" }
  };
  plan.target.nodes["probe-trace"] = {
    ...plan.target.nodes["probe-trace"],
    boundingBox: { center: [2, 4, 6], kind: "finite", max: [3, 5, 7], min: [1, 3, 5] },
    renderState: { kind: "empty" }
  };

  const frame = buildMathAnimationRuntimeFrame(runtimeState, [plan]);
  const traceFrame = frame.nodeFrames.find((entry) => entry.objectId === "probe-trace");
  const evidence = buildMathAnimationRuntimeBoundingBoxEvidence(frame);
  const serialized = serializeMathAnimationRuntimeBoundingBoxEvidence(evidence);
  const animated = applyMathAnimatePlans(runtimeState, [plan]);

  assert.ok(traceFrame);
  assert.deepEqual(traceFrame.boundingBox, {
    center: [1, 2, 3],
    kind: "finite",
    max: [2, 3, 4],
    min: [0, 1, 2]
  });
  assert.deepEqual(animated.objectGraph.byId["probe-trace"].boundingBox, traceFrame.boundingBox);
  assert.deepEqual(animated.sceneGraph.byId["probe-trace"].boundingBox, traceFrame.boundingBox);
  assert.equal(evidence.nodeCount, 3);
  assert.equal(evidence.finiteBoundingBoxCount, 3);
  assert.equal(evidence.emptyBoundingBoxCount, 0);
  assert.equal(evidence.objectIds, "function-curve,moving-probe,probe-trace");
  assert.match(evidence.sourceSummary, /Mobject\.interpolate/);
  assert.equal(
    evidence.summary,
    "transform-interpolate-bounds:nodes=3:finite=3:empty=0:ids=function-curve,moving-probe,probe-trace"
  );
  assert.doesNotMatch(serialized, /<\/script|undefined|NaN|Infinity/i);
  assert.deepEqual(JSON.parse(serialized), evidence);
});

test("summarizes Mobject.interpolate pointlike and non-point field routing for browser evidence", () => {
  assert.ok(functionGraphSpec);
  const compositionStart = functionGraphSpec.timeline.slice(0, 3).reduce((sum, step) => sum + step.duration, 0);
  const state = buildMathSceneRuntimeState(functionGraphSpec, compositionStart + 0.72);
  const plans = buildMathSceneAnimatePlans(functionGraphSpec, state);
  const frame = buildMathAnimationRuntimeFrame(state, plans);
  const evidence = buildMathAnimationRuntimeInterpolateFieldEvidence(frame);
  const attributes = transformInterpolateFieldEvidenceDataAttributes(evidence);
  const serialized = serializeMathAnimationRuntimeInterpolateFieldEvidence(evidence);

  assert.equal(evidence.nodeCount, 5);
  assert.equal(evidence.pointlikeFieldCount, 74);
  assert.equal(evidence.nonPointFieldCount, 13);
  assert.equal(evidence.styleNodeCount, 3);
  assert.equal(evidence.uniformNodeCount, 5);
  assert.equal(evidence.boundingBoxNodeCount, 5);
  assert.equal(evidence.arcPathNodeCount, 0);
  assert.equal(evidence.straightPathNodeCount, 5);
  assert.equal(evidence.objectIds, "function-curve,moving-probe,probe-trace");
  assert.equal(evidence.pathSummary, "straight:5");
  assert.equal(evidence.pointlikeFieldSummary, "point=2/2;polyline=3/72");
  assert.equal(evidence.pointlikeFieldPolicy, TRANSFORM_PATH_POINTLIKE_FIELD_POLICY);
  assert.equal(evidence.nonPointFieldPolicy, TRANSFORM_PATH_NON_POINT_FIELD_POLICY);
  assert.equal(evidence.sourceSummary, "Mobject.interpolate:start-target-data+uniforms+bounding-boxes");
  assert.equal(
    evidence.summary,
    "transform-interpolate-fields:nodes=5:pointlike=74:nonPoint=13:style=3:uniforms=5:bounds=5:paths=straight:5:kinds=point=2/2;polyline=3/72"
  );
  assert.equal(attributes["data-viz-manim-transform-interpolate-field-node-count"], "5");
  assert.equal(attributes["data-viz-manim-transform-interpolate-field-pointlike-count"], "74");
  assert.equal(attributes["data-viz-manim-transform-interpolate-field-non-point-count"], "13");
  assert.equal(attributes["data-viz-manim-transform-interpolate-field-pointlike-policy"], TRANSFORM_PATH_POINTLIKE_FIELD_POLICY);
  assert.equal(attributes["data-viz-manim-transform-interpolate-field-non-point-policy"], TRANSFORM_PATH_NON_POINT_FIELD_POLICY);
  assert.equal(attributes["data-viz-manim-transform-interpolate-field-summary"], evidence.summary);
  assert.doesNotMatch(serialized, /<\/script|undefined|NaN|Infinity/i);
  assert.deepEqual(JSON.parse(serialized), evidence);
});

test("interpolates matching clipping-plane uniforms during transform beats", () => {
  const scene: MathSceneSpec = {
    bindings: [],
    cameraShots: [{ id: "overview", position: [3, 3, 3], target: [0, 0, 0] }],
    coordinateSpace: {
      mathRange: { x: [0, 1], y: [0, 1], z: [0, 1] },
      worldRange: { x: [0, 1], y: [0, 1], z: [0, 1] }
    },
    diagnostics: { expectedBindingCount: 0, expectedObjectCount: 1, expectedTokenCount: 0 },
    familyId: "three-function-graph",
    formulas: [],
    objects: [
      {
        colorRole: "function",
        conceptId: "clipped-curve",
        id: "curve",
        samples: [[0, 0, 0], [1, 1, 0]],
        type: "parametricCurve",
        uniforms: {
          clippingPlanes: [{ constant: 0, normal: [0, 1, 0] }]
        }
      }
    ],
    sceneId: "runtime-uniform-clipping-plane-scene",
    timeline: []
  };
  const sourceState = buildMathSceneRuntimeState(scene, 0);
  const plan = createMathAnimateBuilder(sourceState.objectGraph, "curve").build({ duration: 2 });
  const targetUniforms = plan.target.nodes.curve.uniforms;
  assert.ok(targetUniforms);
  plan.target.nodes.curve.uniforms = {
    ...targetUniforms,
    clippingPlanes: [{ constant: 2, normal: [1, 0, 0] }]
  };
  const halfway = applyMathAnimatePlans(buildMathSceneRuntimeState({ ...scene, timeline: [plan.step] }, 1), [plan]);
  const completed = applyMathAnimatePlans(buildMathSceneRuntimeState({ ...scene, timeline: [plan.step] }, 2), [plan]);
  const halfwayPlane = halfway.objectGraph.byId.curve.uniforms?.clippingPlanes[0];
  const completedPlane = completed.objectGraph.byId.curve.uniforms?.clippingPlanes[0];

  assert.ok(halfwayPlane);
  assert.ok(completedPlane);
  assert.equal(Number(halfwayPlane.constant.toFixed(3)), 1);
  assert.deepEqual(halfwayPlane.normal.map((coordinate) => Number(coordinate.toFixed(6))), [0.707107, 0.707107, 0]);
  assert.equal(completedPlane.constant, 2);
  assert.deepEqual(completedPlane.normal, [1, 0, 0]);
});

test("interpolates VMobject style metadata during Manim animate transforms", () => {
  assert.ok(functionGraphSpec);
  const sourceState = buildMathSceneRuntimeState(functionGraphSpec, 0);
  const sourceCurve = sourceState.objectGraph.byId["function-curve"].renderState;
  assert.equal(sourceCurve.kind, "polyline");
  if (sourceCurve.kind !== "polyline") throw new Error("expected source curve style");
  const sourceStyle = sourceCurve.style;
  assert.ok(sourceStyle);
  const plan = createMathAnimateBuilder(sourceState.objectGraph, "function-curve")
    .shift([0.5, 0, 0])
    .build({ duration: 2 });
  const targetCurve = plan.target.nodes["function-curve"].renderState;
  assert.equal(targetCurve.kind, "polyline");
  if (targetCurve.kind !== "polyline") throw new Error("expected target curve style");
  targetCurve.style = {
    ...sourceStyle,
    strokeOpacity: 0.25,
    strokeRole: "attention",
    strokeWidth: sourceStyle.strokeWidth + 4
  };
  const scene: MathSceneSpec = {
    ...functionGraphSpec,
    timeline: [plan.step]
  };
  const halfway = applyMathAnimatePlans(buildMathSceneRuntimeState(scene, 1), [plan]);
  const completed = applyMathAnimatePlans(buildMathSceneRuntimeState(scene, 2), [plan]);
  const halfwayCurve = halfway.objectGraph.byId["function-curve"].renderState;
  const completedCurve = completed.objectGraph.byId["function-curve"].renderState;

  assert.equal(halfwayCurve.kind, "polyline");
  assert.equal(completedCurve.kind, "polyline");
  if (halfwayCurve.kind !== "polyline" || completedCurve.kind !== "polyline") throw new Error("expected animated curve style");
  assert.equal(Number(halfwayCurve.style?.strokeWidth.toFixed(3)), Number((sourceStyle.strokeWidth + 2).toFixed(3)));
  assert.equal(Number(halfwayCurve.style?.strokeOpacity.toFixed(3)), Number(((sourceStyle.strokeOpacity + 0.25) / 2).toFixed(3)));
  assert.equal(halfwayCurve.style?.strokeRole, sourceStyle.strokeRole);
  assert.equal(completedCurve.style?.strokeWidth, sourceStyle.strokeWidth + 4);
  assert.equal(completedCurve.style?.strokeOpacity, 0.25);
  assert.equal(completedCurve.style?.strokeRole, "attention");
});

test("interpolates VMobject setStroke and setFill animate targets during transform beats", () => {
  assert.ok(functionGraphSpec);
  const sourceState = buildMathSceneRuntimeState(functionGraphSpec, 0);
  const sourceCurve = sourceState.objectGraph.byId["function-curve"].renderState;
  assert.equal(sourceCurve.kind, "polyline");
  if (sourceCurve.kind !== "polyline") throw new Error("expected source curve style");
  const sourceStyle = sourceCurve.style;
  assert.ok(sourceStyle);
  const plan = createMathAnimateBuilder(sourceState.objectGraph, "function-curve")
    .setStroke({ strokeOpacity: 0.2, strokeRole: "attention", strokeWidth: sourceStyle.strokeWidth + 6 })
    .setFill({ fillOpacity: 0.6, fillRole: "area" })
    .build({ duration: 2 });
  const scene: MathSceneSpec = {
    ...functionGraphSpec,
    timeline: [plan.step]
  };
  const halfway = applyMathAnimatePlans(buildMathSceneRuntimeState(scene, 1), [plan]);
  const completed = applyMathAnimatePlans(buildMathSceneRuntimeState(scene, 2), [plan]);
  const halfwayCurve = halfway.objectGraph.byId["function-curve"].renderState;
  const completedCurve = completed.objectGraph.byId["function-curve"].renderState;

  assert.equal(halfwayCurve.kind, "polyline");
  assert.equal(completedCurve.kind, "polyline");
  if (halfwayCurve.kind !== "polyline" || completedCurve.kind !== "polyline") throw new Error("expected animated style curve");
  assert.equal(Number(halfwayCurve.style?.strokeWidth.toFixed(3)), Number((sourceStyle.strokeWidth + 3).toFixed(3)));
  assert.equal(Number(halfwayCurve.style?.strokeOpacity.toFixed(3)), Number(((sourceStyle.strokeOpacity + 0.2) / 2).toFixed(3)));
  assert.equal(Number(halfwayCurve.style?.fillOpacity.toFixed(3)), Number(((sourceStyle.fillOpacity + 0.6) / 2).toFixed(3)));
  assert.equal(halfwayCurve.style?.strokeRole, sourceStyle.strokeRole);
  assert.equal(halfwayCurve.style?.fillRole, sourceStyle.fillRole);
  assert.equal(completedCurve.style?.strokeWidth, sourceStyle.strokeWidth + 6);
  assert.equal(Number(completedCurve.style?.strokeOpacity.toFixed(3)), 0.2);
  assert.equal(completedCurve.style?.strokeRole, "attention");
  assert.equal(Number(completedCurve.style?.fillOpacity.toFixed(3)), 0.6);
  assert.equal(completedCurve.style?.fillRole, "area");
});

test("interpolates aggregate VMobject setStyle targets during transform beats", () => {
  assert.ok(functionGraphSpec);
  const sourceState = buildMathSceneRuntimeState(functionGraphSpec, 0);
  const sourceCurve = sourceState.objectGraph.byId["function-curve"].renderState;
  assert.equal(sourceCurve.kind, "polyline");
  if (sourceCurve.kind !== "polyline") throw new Error("expected source curve style");
  const sourceStyle = sourceCurve.style;
  assert.ok(sourceStyle);
  const plan = createMathAnimateBuilder(sourceState.objectGraph, "function-curve")
    .setStyle({
      antiAliasWidth: sourceStyle.antiAliasWidth + 2,
      fillOpacity: 0.5,
      fillRole: "area",
      jointAngleDegrees: sourceStyle.jointAngleDegrees + 30,
      strokeOpacity: 0.3,
      strokeRole: "attention",
      strokeWidth: sourceStyle.strokeWidth + 8
    })
    .build({ duration: 2 });
  const scene: MathSceneSpec = {
    ...functionGraphSpec,
    timeline: [plan.step]
  };
  const halfway = applyMathAnimatePlans(buildMathSceneRuntimeState(scene, 1), [plan]);
  const completed = applyMathAnimatePlans(buildMathSceneRuntimeState(scene, 2), [plan]);
  const halfwayCurve = halfway.objectGraph.byId["function-curve"].renderState;
  const completedCurve = completed.objectGraph.byId["function-curve"].renderState;

  assert.equal(halfwayCurve.kind, "polyline");
  assert.equal(completedCurve.kind, "polyline");
  if (halfwayCurve.kind !== "polyline" || completedCurve.kind !== "polyline") throw new Error("expected animated aggregate style curve");
  assert.equal(Number(halfwayCurve.style?.strokeWidth.toFixed(3)), Number((sourceStyle.strokeWidth + 4).toFixed(3)));
  assert.equal(Number(halfwayCurve.style?.strokeOpacity.toFixed(3)), Number(((sourceStyle.strokeOpacity + 0.3) / 2).toFixed(3)));
  assert.equal(Number(halfwayCurve.style?.fillOpacity.toFixed(3)), Number(((sourceStyle.fillOpacity + 0.5) / 2).toFixed(3)));
  assert.equal(Number(halfwayCurve.style?.antiAliasWidth.toFixed(3)), Number((sourceStyle.antiAliasWidth + 1).toFixed(3)));
  assert.equal(Number(halfwayCurve.style?.jointAngleDegrees.toFixed(3)), Number((sourceStyle.jointAngleDegrees + 15).toFixed(3)));
  assert.equal(halfwayCurve.style?.strokeRole, sourceStyle.strokeRole);
  assert.equal(halfwayCurve.style?.fillRole, sourceStyle.fillRole);
  assert.equal(completedCurve.style?.strokeWidth, sourceStyle.strokeWidth + 8);
  assert.equal(Number(completedCurve.style?.strokeOpacity.toFixed(3)), 0.3);
  assert.equal(completedCurve.style?.strokeRole, "attention");
  assert.equal(Number(completedCurve.style?.fillOpacity.toFixed(3)), 0.5);
  assert.equal(completedCurve.style?.fillRole, "area");
  assert.equal(completedCurve.style?.antiAliasWidth, sourceStyle.antiAliasWidth + 2);
  assert.equal(completedCurve.style?.jointAngleDegrees, sourceStyle.jointAngleDegrees + 30);
});

test("summarizes active animation runtime frames for QA evidence", () => {
  const { plan, scene } = buildTransformScene([0.25, 0, 0], 2);
  const frame = buildMathAnimationRuntimeFrame(buildMathSceneRuntimeState(scene, 1), [plan]);
  const evidence = buildMathAnimationRuntimeEvidence(frame);
  const attributes = animationRuntimeEvidenceDataAttributes(evidence);

  assert.deepEqual(summarizeMathAnimationRuntimeFrame(frame), {
    active: true,
    activePlanIds: ["function-curve:animate-target"],
    animatedNodeCount: 3,
    nodeProgressSummary: [
      "function-curve:raw=0.500/lag=0.500/eased=0.500/rate=smooth",
      "moving-probe:raw=0.500/lag=0.500/eased=0.500/rate=smooth",
      "probe-trace:raw=0.500/lag=0.500/eased=0.500/rate=smooth"
    ].join("|"),
    objectId: "function-curve",
    progress: 0.5,
    targetObjectId: "function-curve:animate-target"
  });
  assert.equal(evidence.sourceContract, ANIMATION_RUNTIME_SOURCE_CONTRACT);
  assert.equal(
    MOBJECT_INTERPOLATE_RENDER_POLICY,
    "mobject-interpolate-pointlike-fields-use-path-functions-nonpoint-data-blends-linearly"
  );
  assert.equal(evidence.mobjectInterpolateRenderPolicy, MOBJECT_INTERPOLATE_RENDER_POLICY);
  assert.equal(evidence.active, true);
  assert.equal(evidence.activePlanCount, 1);
  assert.equal(evidence.nodeCount, 3);
  assert.equal(evidence.finiteBoundingBoxCount, 2);
  assert.equal(evidence.activePlanIds, "function-curve:animate-target");
  assert.equal(evidence.objectIds, "function-curve,moving-probe,probe-trace");
  assert.equal(evidence.objectId, "function-curve");
  assert.equal(evidence.targetObjectId, "function-curve:animate-target");
  assert.equal(evidence.rawProgressRange, "0.500..0.500");
  assert.equal(evidence.laggedProgressRange, "0.500..0.500");
  assert.equal(evidence.easedProgressRange, "0.500..0.500");
  assert.equal(evidence.rateFunctionIds, "smooth");
  assert.equal(evidence.renderKindSummary, "point=1;polyline=2");
  assert.equal(
    evidence.summary,
    "animationRuntime:active=true:plans=1:nodes=3:kinds=point=1;polyline=2:raw=0.500..0.500:lagged=0.500..0.500:eased=0.500..0.500:rates=smooth"
  );
  assert.equal(attributes["data-viz-manim-animation-runtime-source-contract"], ANIMATION_RUNTIME_SOURCE_CONTRACT);
  assert.equal(
    attributes["data-viz-manim-animation-runtime-mobject-interpolate-policy"],
    MOBJECT_INTERPOLATE_RENDER_POLICY
  );
  assert.equal(attributes["data-viz-manim-animation-runtime-active"], "true");
  assert.equal(attributes["data-viz-manim-animation-runtime-active-plan-count"], "1");
  assert.equal(attributes["data-viz-manim-animation-runtime-node-count"], "3");
  assert.equal(attributes["data-viz-manim-animation-runtime-render-kind-summary"], "point=1;polyline=2");
  assert.equal(attributes["data-viz-manim-animation-runtime-summary"], evidence.summary);

  const json = serializeMathAnimationRuntimeEvidence(evidence);
  assert.doesNotMatch(json, /</);
  assert.deepEqual(JSON.parse(json), {
    active: true,
    activePlanCount: 1,
    activePlanIds: "function-curve:animate-target",
    easedProgressRange: "0.500..0.500",
    finiteBoundingBoxCount: 2,
    laggedProgressRange: "0.500..0.500",
    mobjectInterpolateRenderPolicy: MOBJECT_INTERPOLATE_RENDER_POLICY,
    nodeCount: 3,
    objectId: "function-curve",
    objectIds: "function-curve,moving-probe,probe-trace",
    progress: 0.5,
    rateFunctionIds: "smooth",
    rawProgressRange: "0.500..0.500",
    renderKindSummary: "point=1;polyline=2",
    sourceContract: ANIMATION_RUNTIME_SOURCE_CONTRACT,
    summary:
      "animationRuntime:active=true:plans=1:nodes=3:kinds=point=1;polyline=2:raw=0.500..0.500:lagged=0.500..0.500:eased=0.500..0.500:rates=smooth",
    targetObjectId: "function-curve:animate-target"
  });
});

test("samples scene-authored laggedStart composition frames with active child plan ids", () => {
  assert.ok(functionGraphSpec);
  const compositionStart = functionGraphSpec.timeline.slice(0, 3).reduce((sum, step) => sum + step.duration, 0);
  const state = buildMathSceneRuntimeState(functionGraphSpec, compositionStart + 0.72);
  const plans = buildMathSceneAnimatePlans(functionGraphSpec, state);
  const frame = buildMathAnimationRuntimeFrame(state, plans);

  assert.equal(state.timeline.activeStep?.type, "animationComposition");
  assert.equal(state.timeline.activeStep?.compositionId, "function-attention-lagged-start");
  assert.equal(frame.active, true);
  assert.deepEqual(frame.activePlanIds, ["function-curve-attention-lift", "function-probe-attention-pulse"]);
  assert.equal(frame.objectId, "moving-probe");
  assert.equal(frame.targetObjectId, "moving-probe:attention-target");
  assert.ok(frame.progress > 0.35 && frame.progress < 0.45);
});

test("applies transform rate functions after per-family lagged sub-alpha calculation", () => {
  const { plan, scene } = buildTransformScene([1, 0, 0], 4);
  const laggedStep = { ...plan.step, lagRatio: 0.5 };
  const laggedPlan = { ...plan, step: laggedStep };
  const laggedScene: MathSceneSpec = {
    ...scene,
    timeline: [laggedStep]
  };
  const frame = buildMathAnimationRuntimeFrame(buildMathSceneRuntimeState(laggedScene, 1.5), [laggedPlan]);

  assert.deepEqual(
    frame.nodeFrames.map((entry) => Number(entry.progress.toFixed(5))),
    [0.84375, 0.15625, 0]
  );
  assert.deepEqual(frame.nodeFrames.map((entry) => entry.rawProgress), [0.375, 0.375, 0.375]);
  assert.deepEqual(frame.nodeFrames.map((entry) => entry.laggedProgress), [0.75, 0.25, 0]);
  assert.ok(frame.nodeFrames.every((entry) => entry.rateFunction === "smooth"));
  assert.equal(
    summarizeMathAnimationRuntimeFrame(frame).nodeProgressSummary,
    [
      "function-curve:raw=0.375/lag=0.750/eased=0.844/rate=smooth",
      "moving-probe:raw=0.375/lag=0.250/eased=0.156/rate=smooth",
      "probe-trace:raw=0.375/lag=0.000/eased=0.000/rate=smooth"
    ].join("|")
  );
});

test("summarizes active composition child plan ids for QA evidence", () => {
  const { plan, scene } = buildTransformScene([0.25, 0, 0], 2);
  const frame = buildMathAnimationRuntimeFrame(buildMathSceneRuntimeState(scene, 1), [plan]);

  assert.deepEqual(summarizeMathAnimationRuntimeFrame(frame), {
    active: true,
    activePlanIds: ["function-curve:animate-target"],
    animatedNodeCount: 3,
    nodeProgressSummary: [
      "function-curve:raw=0.500/lag=0.500/eased=0.500/rate=smooth",
      "moving-probe:raw=0.500/lag=0.500/eased=0.500/rate=smooth",
      "probe-trace:raw=0.500/lag=0.500/eased=0.500/rate=smooth"
    ].join("|"),
    objectId: "function-curve",
    progress: 0.5,
    targetObjectId: "function-curve:animate-target"
  });
});

test("applyMathUpdaters honors transform ownership and does not reveal-truncate an animate transform", () => {
  const delta: Vec3 = [1, 0, 0];
  const { originalCurve, plan, scene } = buildTransformScene(delta);
  const updated = applyMathUpdaters(scene, buildMathSceneRuntimeState(scene, 1), { animationPlans: [plan] });
  const curve = updated.objectGraph.byId["function-curve"].renderState;

  assert.equal(curve.kind, "polyline");
  if (curve.kind !== "polyline") throw new Error("expected full transformed curve");
  assert.equal(curve.points.length, originalCurve.points.length);
  assert.deepEqual(curve.points[0], shiftedBy(originalCurve.points[0], delta, 0.5));
});

test("ignores animate plans when the active transform step does not match the target", () => {
  const { plan, scene } = buildTransformScene([1, 0, 0]);
  const mismatched: MathSceneSpec = {
    ...scene,
    timeline: [{ type: "transformObject", objectId: "other-curve", targetObjectId: "other-target", duration: 2 }]
  };
  const state = buildMathSceneRuntimeState(mismatched, 1);
  const frame = buildMathAnimationRuntimeFrame(state, [plan]);

  assert.equal(frame.active, false);
  assert.deepEqual(frame.nodeFrames, []);
  assert.equal(applyMathAnimatePlans(state, [plan]).objectGraph.byId["function-curve"].renderState.kind, "polyline");
});

test("MathAnimationRuntime stays pure while MathSceneRuntime exposes an opt-in animationPlans bridge", () => {
  const source = fs.readFileSync("components/visualizations/three/manim/mathAnimationRuntime.ts", "utf8");
  const updaterSource = fs.readFileSync("components/visualizations/three/manim/mathUpdaterRegistry.ts", "utf8");
  const runtimeSource = fs.readFileSync("components/visualizations/three/manim/MathSceneRuntime.tsx", "utf8");

  assert.match(source, /buildMathAnimationRuntimeFrame/);
  assert.match(source, /buildMathAnimationRuntimeEvidence/);
  assert.match(source, /MOBJECT_INTERPOLATE_RENDER_POLICY/);
  assert.match(source, /animationRuntimeEvidenceDataAttributes/);
  assert.match(source, /serializeMathAnimationRuntimeEvidence/);
  assert.match(source, /serializeMathAnimationRuntimeBoundingBoxEvidence/);
  assert.match(source, /serializeMathAnimationRuntimeUniformEvidence/);
  assert.match(source, /applyMathAnimatePlans/);
  assert.match(source, /alignSmoothVMobjectPathsForMorph/);
  assert.doesNotMatch(source, /"use client"|@react-three\/fiber|@react-three\/drei|from "three"/);
  assert.match(updaterSource, /buildUpdaterSuspensionPlan/);
  assert.match(updaterSource, /applyMathAnimatePlans/);
  assert.match(runtimeSource, /animationPlans/);
});
