import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  buildLaggedObjectTransformPlan,
  buildMathObjectTransformPlan,
  interpolateLaggedObjectTransformFamily,
  interpolateMathObjectTransform
} from "./mathObjectTransform";
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
  assert.equal(frame.objectId, "curve");
  assert.equal(frame.targetObjectId, "target-curve");
  assert.equal(frame.conceptId, "function-model");
  assert.equal(frame.colorRole, "function");
  assert.equal(frame.progress, 0.5);
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

  assert.deepEqual(frames.map((frame) => frame.objectId), ["v0", "v1", "v2"]);
  assert.deepEqual(frames.map((frame) => frame.progress), [1, 0.5, 0]);
});

test("MAIS Manim source contract exposes transform interpolation as a pure runtime module", () => {
  const source = fs.readFileSync("components/visualizations/three/manim/mathObjectTransform.ts", "utf8");

  assert.match(source, /buildMathObjectTransformPlan/);
  assert.match(source, /interpolateMathObjectTransform/);
  assert.match(source, /buildLaggedObjectTransformPlan/);
  assert.match(source, /interpolateLaggedObjectTransformFamily/);
  assert.match(source, /alignCurveSamplesForMorph/);
  assert.doesNotMatch(source, /"use client"|@react-three\/fiber|@react-three\/drei|from "three"/);
});
