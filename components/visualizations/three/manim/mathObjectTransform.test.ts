import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  MATH_OBJECT_TRANSFORM_SOURCE_CONTRACT,
  buildLaggedObjectTransformPlan,
  buildMathObjectTransformPlan,
  interpolateLaggedObjectTransformFamily,
  interpolateMathObjectTransform
} from "./mathObjectTransform";
import {
  buildRuntimeTransformDataLockPlan,
  buildTransformDataLockPlan,
  summarizeTransformDataLockPlan,
  transformDataLockEvidenceDataAttributes,
  summarizeTransformDataLockEvidence
} from "./mathTransformDataLock";
import type { RuntimeRenderState } from "./mathSceneRuntimeState";
import type { MathObjectSpec, Vec3 } from "./mathSceneTypes";

const sourceCurve: MathObjectSpec = {
  type: "parametricCurve",
  id: "curve",
  conceptId: "function-model",
  colorRole: "function",
  samples: [
    [0, 0, 0],
    [2, 0, 0]
  ]
};

const targetCurve: MathObjectSpec = {
  type: "parametricCurve",
  id: "target-curve",
  conceptId: "function-model",
  colorRole: "function",
  samples: [
    [0, 0, 0],
    [1, 1, 0],
    [2, 0, 0],
    [3, 1, 0]
  ]
};

test("builds an object-level transform plan that aligns curve samples and preserves identity", () => {
  const plan = buildMathObjectTransformPlan(sourceCurve, targetCurve, { sampleCount: 5 });
  const frame = interpolateMathObjectTransform(plan, 0.5);

  assert.equal(plan.objectId, "curve");
  assert.equal(plan.targetObjectId, "target-curve");
  assert.equal(plan.conceptId, "function-model");
  assert.equal(plan.objectType, "parametricCurve");
  assert.equal(plan.alignedPointCount, 5);
  assert.equal(plan.sourceContract, MATH_OBJECT_TRANSFORM_SOURCE_CONTRACT);
  assert.match(MATH_OBJECT_TRANSFORM_SOURCE_CONTRACT, /Mobject\.interpolate/);
  assert.match(MATH_OBJECT_TRANSFORM_SOURCE_CONTRACT, /path_func/);
  assert.match(MATH_OBJECT_TRANSFORM_SOURCE_CONTRACT, /uniforms/);
  assert.equal(frame.objectId, "curve");
  assert.equal(frame.targetObjectId, "target-curve");
  assert.equal(frame.conceptId, "function-model");
  assert.equal(frame.colorRole, "function");
  assert.equal(frame.progress, 0.5);
  assert.equal(frame.sourceContract, MATH_OBJECT_TRANSFORM_SOURCE_CONTRACT);
  assert.equal(frame.renderState.kind, "polyline");

  if (frame.renderState.kind !== "polyline") throw new Error("expected polyline frame");

  assert.equal(frame.renderState.points.length, 5);
  assert.deepEqual(frame.renderState.points[0], [0, 0, 0]);
  assert.deepEqual(frame.renderState.points.at(-1), [2.5, 0.5, 0]);
});

test("interpolates vector endpoints with an optional path function", () => {
  const source: MathObjectSpec = {
    type: "vector",
    id: "normal-vector",
    conceptId: "orientation",
    colorRole: "parameter",
    from: [0, 0, 0],
    to: [1, 0, 0]
  };
  const target: MathObjectSpec = {
    type: "vector",
    id: "target-vector",
    conceptId: "orientation",
    colorRole: "parameter",
    from: [0, 0, 1],
    to: [1, 1, 1]
  };
  const liftPath = (from: Vec3, to: Vec3, alpha: number): Vec3 => [
    from[0] + (to[0] - from[0]) * alpha,
    from[1] + (to[1] - from[1]) * alpha + 1,
    from[2] + (to[2] - from[2]) * alpha
  ];

  const frame = interpolateMathObjectTransform(buildMathObjectTransformPlan(source, target, { pathFunction: liftPath }), 0.5);

  assert.equal(frame.renderState.kind, "vector");
  if (frame.renderState.kind !== "vector") throw new Error("expected vector frame");
  assert.deepEqual(frame.renderState.from, [0, 1, 0.5]);
  assert.deepEqual(frame.renderState.to, [1, 1.5, 0.5]);
});

test("interpolates Mobject uniforms with object-level transform frames", () => {
  const source: MathObjectSpec = {
    type: "vector",
    id: "opacity-vector",
    conceptId: "opacity-transform",
    colorRole: "parameter",
    from: [0, 0, 0],
    to: [1, 0, 0],
    uniforms: {
      clippingPlanes: [{ constant: 0, normal: [0, 1, 0] }],
      opacity: 0.2
    }
  };
  const target: MathObjectSpec = {
    type: "vector",
    id: "opacity-vector-target",
    conceptId: "opacity-transform",
    colorRole: "parameter",
    from: [0, 0, 0],
    to: [2, 0, 0],
    uniforms: {
      clippingPlanes: [{ constant: 2, normal: [0, 0, 1] }],
      fixedInFrame: true,
      opacity: 1,
      shadeIn3D: true
    }
  };
  const midway = interpolateMathObjectTransform(buildMathObjectTransformPlan(source, target), 0.25);
  const final = interpolateMathObjectTransform(buildMathObjectTransformPlan(source, target), 1);

  assert.equal(midway.uniforms?.opacity, 0.4);
  assert.equal(midway.uniforms?.fixedInFrame, false);
  assert.equal(midway.uniforms?.shadeIn3D, false);
  assert.equal(midway.uniforms?.clippingPlanes[0]?.constant, 0.5);
  assert.deepEqual(midway.uniforms?.clippingPlanes[0]?.normal.map((value) => Number(value.toFixed(6))), [0, 0.948683, 0.316228]);
  assert.equal(final.uniforms?.fixedInFrame, true);
  assert.equal(final.uniforms?.shadeIn3D, true);
});

test("aligns and interpolates sampled surfaces for Manim-style surface morphs", () => {
  const source: MathObjectSpec = {
    type: "parametricSurface",
    id: "flat-net",
    conceptId: "folded-solid",
    colorRole: "surface",
    samples: [
      [
        [0, 0, 0],
        [0, 1, 0]
      ],
      [
        [1, 0, 0],
        [1, 1, 0]
      ]
    ],
    uRange: [0, 1],
    vRange: [0, 1]
  };
  const target: MathObjectSpec = {
    type: "parametricSurface",
    id: "folded-face",
    conceptId: "folded-solid",
    colorRole: "function",
    samples: [
      [
        [0, 0, 1],
        [0, 1, 2],
        [0, 2, 3]
      ],
      [
        [1, 0, 2],
        [1, 1, 3],
        [1, 2, 4]
      ],
      [
        [2, 0, 3],
        [2, 1, 4],
        [2, 2, 5]
      ]
    ],
    uRange: [0, 2],
    vRange: [0, 2]
  };
  const plan = buildMathObjectTransformPlan(source, target, { sampleCount: 4 });
  const frame = interpolateMathObjectTransform(plan, 0.5);

  assert.equal(plan.objectId, "flat-net");
  assert.equal(plan.targetObjectId, "folded-face");
  assert.equal(plan.objectType, "parametricSurface");
  assert.equal(plan.alignedPointCount, 16);
  assert.equal(frame.renderState.kind, "surface");

  if (frame.renderState.kind !== "surface") throw new Error("expected surface frame");

  assert.equal(frame.renderState.rows, 4);
  assert.equal(frame.renderState.columns, 4);
  assert.equal(frame.renderState.points.length, 16);
  assert.deepEqual(frame.renderState.wireframeRows[0][0], [0, 0, 0.5]);
  assert.deepEqual(frame.renderState.wireframeRows.at(-1)?.at(-1), [1.5, 1.5, 2.5]);
  assert.equal(frame.colorRole, "surface");
  assert.equal(frame.conceptId, "folded-solid");
});

test("computes lagged subobject progress for a transform family", () => {
  const sourceObjects: MathObjectSpec[] = [
    { type: "vector", id: "v0", conceptId: "basis-x", colorRole: "function", from: [0, 0, 0], to: [1, 0, 0] },
    { type: "vector", id: "v1", conceptId: "basis-y", colorRole: "probe", from: [0, 0, 0], to: [0, 1, 0] },
    { type: "vector", id: "v2", conceptId: "basis-z", colorRole: "trace", from: [0, 0, 0], to: [0, 0, 1] }
  ];
  const targetObjects: MathObjectSpec[] = [
    { type: "vector", id: "v0-target", conceptId: "basis-x", colorRole: "function", from: [0, 0, 0], to: [2, 0, 0] },
    { type: "vector", id: "v1-target", conceptId: "basis-y", colorRole: "probe", from: [0, 0, 0], to: [0, 2, 0] },
    { type: "vector", id: "v2-target", conceptId: "basis-z", colorRole: "trace", from: [0, 0, 0], to: [0, 0, 2] }
  ];

  const plan = buildLaggedObjectTransformPlan(sourceObjects, targetObjects, { lagRatio: 0.5 });
  const frames = interpolateLaggedObjectTransformFamily(plan, 0.5);

  assert.equal(plan.sourceContract, MATH_OBJECT_TRANSFORM_SOURCE_CONTRACT);
  assert.deepEqual(frames.map((frame) => frame.objectId), ["v0", "v1", "v2"]);
  assert.deepEqual(frames.map((frame) => frame.progress), [1, 0.5, 0]);
  assert.deepEqual(frames.map((frame) => frame.sourceContract), [
    MATH_OBJECT_TRANSFORM_SOURCE_CONTRACT,
    MATH_OBJECT_TRANSFORM_SOURCE_CONTRACT,
    MATH_OBJECT_TRANSFORM_SOURCE_CONTRACT
  ]);
});

test("applies the transform rate function after lagged subobject alpha calculation", () => {
  const sourceObjects: MathObjectSpec[] = [
    { type: "vector", id: "v0", conceptId: "basis-x", colorRole: "function", from: [0, 0, 0], to: [1, 0, 0] },
    { type: "vector", id: "v1", conceptId: "basis-y", colorRole: "probe", from: [0, 0, 0], to: [0, 1, 0] },
    { type: "vector", id: "v2", conceptId: "basis-z", colorRole: "trace", from: [0, 0, 0], to: [0, 0, 1] }
  ];
  const targetObjects: MathObjectSpec[] = [
    { type: "vector", id: "v0-target", conceptId: "basis-x", colorRole: "function", from: [0, 0, 0], to: [2, 0, 0] },
    { type: "vector", id: "v1-target", conceptId: "basis-y", colorRole: "probe", from: [0, 0, 0], to: [0, 2, 0] },
    { type: "vector", id: "v2-target", conceptId: "basis-z", colorRole: "trace", from: [0, 0, 0], to: [0, 0, 2] }
  ];

  const plan = buildLaggedObjectTransformPlan(sourceObjects, targetObjects, { lagRatio: 0.5, rateFunction: "smooth" });
  const frames = interpolateLaggedObjectTransformFamily(plan, 0.375);

  assert.equal(plan.rateFunction, "smooth");
  assert.deepEqual(frames.map((frame) => frame.progress), [0.84375, 0.15625, 0]);
});

test("reports matching transform data locks for invariant curve anchors", () => {
  const plan = buildMathObjectTransformPlan(sourceCurve, targetCurve, { sampleCount: 5 });
  const lockPlan = buildTransformDataLockPlan(plan);

  assert.equal(lockPlan.objectId, "curve");
  assert.equal(lockPlan.targetObjectId, "target-curve");
  assert.equal(lockPlan.kind, "curve");
  assert.equal(lockPlan.totalPointCount, 5);
  assert.deepEqual(lockPlan.lockedPointIndices, [0]);
  assert.equal(lockPlan.lockedPointCount, 1);
  assert.equal(lockPlan.movingPointCount, 4);
  assert.equal(summarizeTransformDataLockPlan(lockPlan), "curve->target-curve:curve;locked=1;moving=4;indices=0");
});

test("reports vector endpoint locks separately from moving endpoints", () => {
  const source: MathObjectSpec = {
    type: "vector",
    id: "basis-vector",
    conceptId: "basis",
    colorRole: "function",
    from: [0, 0, 0],
    to: [1, 0, 0]
  };
  const target: MathObjectSpec = {
    type: "vector",
    id: "basis-vector-target",
    conceptId: "basis",
    colorRole: "function",
    from: [0, 0, 0],
    to: [2, 1, 0]
  };

  const lockPlan = buildTransformDataLockPlan(buildMathObjectTransformPlan(source, target));

  assert.equal(lockPlan.kind, "vector");
  assert.deepEqual(lockPlan.lockedPointIndices, [0]);
  assert.equal(lockPlan.lockedPointCount, 1);
  assert.equal(lockPlan.movingPointCount, 1);
});

test("reports runtime axes data locks across all axis endpoint points", () => {
  const source: RuntimeRenderState = {
    kind: "axes",
    xAxisPoints: [[-1, 0, 0], [1, 0, 0]],
    yAxisPoints: [[0, -1, 0], [0, 1, 0]],
    zAxisPoints: [[0, 0, -1], [0, 0, 1]]
  };
  const target: RuntimeRenderState = {
    kind: "axes",
    xAxisPoints: [[-1, 0, 0], [2, 0, 0]],
    yAxisPoints: [[0, -1, 0], [0, 1, 0]],
    zAxisPoints: [[0, 0, -2], [0, 0, 2]]
  };

  const lockPlan = buildRuntimeTransformDataLockPlan({
    objectId: "axes",
    sourceRenderState: source,
    targetObjectId: "axes-target",
    targetRenderState: target
  });

  assert.equal(lockPlan.kind, "axes");
  assert.equal(lockPlan.totalPointCount, 6);
  assert.deepEqual(lockPlan.lockedPointIndices, [0, 2, 3]);
  assert.equal(lockPlan.lockedPointCount, 3);
  assert.equal(lockPlan.movingPointCount, 3);
  assert.equal(summarizeTransformDataLockPlan(lockPlan), "axes->axes-target:axes;locked=3;moving=3;indices=0,2,3");
});

test("aggregates transform data lock plans as browser QA source evidence", () => {
  const curveLock = buildTransformDataLockPlan(buildMathObjectTransformPlan(sourceCurve, targetCurve, { sampleCount: 5 }));
  const vectorLock = buildTransformDataLockPlan(buildMathObjectTransformPlan(
    {
      type: "vector",
      id: "basis-vector",
      conceptId: "basis",
      colorRole: "function",
      from: [0, 0, 0],
      to: [1, 0, 0]
    },
    {
      type: "vector",
      id: "basis-vector-target",
      conceptId: "basis",
      colorRole: "function",
      from: [0, 0, 0],
      to: [2, 1, 0]
    }
  ));
  const evidence = summarizeTransformDataLockEvidence([curveLock, vectorLock]);

  assert.deepEqual(evidence, {
    alignmentSummary: "none",
    kindSummary: "curve=1;vector=1",
    lockedPointCount: 2,
    movingPointCount: 5,
    objectIds: "basis-vector,curve",
    planCount: 2,
    sourceContract: "Transform.begin:lock_matching_data",
    summary: "transform-data-lock:plans=2:total=7:locked=2:moving=5:objects=basis-vector,curve:kinds=curve=1;vector=1",
    targetObjectIds: "basis-vector-target,target-curve",
    totalPointCount: 7
  });
  assert.deepEqual(transformDataLockEvidenceDataAttributes(evidence), {
    "data-viz-manim-transform-data-lock-alignment-summary": "none",
    "data-viz-manim-transform-data-lock-kind-summary": "curve=1;vector=1",
    "data-viz-manim-transform-data-lock-locked-point-count": "2",
    "data-viz-manim-transform-data-lock-moving-point-count": "5",
    "data-viz-manim-transform-data-lock-object-ids": "basis-vector,curve",
    "data-viz-manim-transform-data-lock-plan-count": "2",
    "data-viz-manim-transform-data-lock-source-contract": "Transform.begin:lock_matching_data",
    "data-viz-manim-transform-data-lock-summary": "transform-data-lock:plans=2:total=7:locked=2:moving=5:objects=basis-vector,curve:kinds=curve=1;vector=1",
    "data-viz-manim-transform-data-lock-target-object-ids": "basis-vector-target,target-curve",
    "data-viz-manim-transform-data-lock-total-point-count": "7"
  });
});

test("MAIS Manim source contract exposes transform interpolation as a pure runtime module", () => {
  const source = fs.readFileSync("components/visualizations/three/manim/mathObjectTransform.ts", "utf8");
  const dataLockSource = fs.readFileSync("components/visualizations/three/manim/mathTransformDataLock.ts", "utf8");

  assert.match(source, /buildMathObjectTransformPlan/);
  assert.match(source, /MATH_OBJECT_TRANSFORM_SOURCE_CONTRACT/);
  assert.match(source, /interpolateMathObjectTransform/);
  assert.match(source, /buildLaggedObjectTransformPlan/);
  assert.match(source, /interpolateLaggedObjectTransformFamily/);
  assert.match(source, /alignCurveSamplesForMorph/);
  assert.match(source, /alignSurfaceSamplesForMorph/);

  const familyAlignmentSource = fs.readFileSync("components/visualizations/three/manim/mathTransformFamilyAlignment.ts", "utf8");

  assert.match(familyAlignmentSource, /buildTransformFamilyAlignment/);
  assert.match(familyAlignmentSource, /summarizeTransformFamilyAlignment/);
  assert.match(dataLockSource, /buildTransformDataLockPlan/);
  assert.match(dataLockSource, /summarizeTransformDataLockPlan/);
  assert.doesNotMatch(source, /"use client"|@react-three\/fiber|@react-three\/drei|from "three"/);
  assert.doesNotMatch(familyAlignmentSource, /"use client"|@react-three\/fiber|@react-three\/drei|from "three"/);
  assert.doesNotMatch(dataLockSource, /"use client"|@react-three\/fiber|@react-three\/drei|from "three"/);
});
