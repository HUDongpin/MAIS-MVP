import assert from "node:assert/strict";
import test from "node:test";
import {
  mapMathPointToWorld,
  resampleCurveByArcLength,
  sampleParametricCurve,
  totalArcLength
} from "./mathCoordinateSpace";
import type { CoordinateSpaceSpec } from "./mathSceneTypes";

const coordinateSpace: CoordinateSpaceSpec = {
  mathRange: {
    x: [-2, 2],
    y: [-1, 3],
    z: [-4, 4]
  },
  worldRange: {
    x: [-4, 4],
    y: [0, 4],
    z: [-2, 2]
  }
};

test("maps finite math coordinates into configured world space", () => {
  assert.deepEqual(mapMathPointToWorld([0, 1, 0], coordinateSpace), [0, 2, 0]);
  assert.deepEqual(mapMathPointToWorld([-2, -1, -4], coordinateSpace), [-4, 0, -2]);
  assert.deepEqual(mapMathPointToWorld([2, 3, 4], coordinateSpace), [4, 4, 2]);
});

test("falls back to the math midpoint when a coordinate is not finite", () => {
  assert.deepEqual(mapMathPointToWorld([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY], coordinateSpace), [0, 2, 0]);
});

test("samples parametric curves with stable endpoints", () => {
  const samples = sampleParametricCurve({
    coordinateSpace,
    sampleCount: 5,
    tRange: [0, 1],
    valueAt: (t) => [-2 + t * 4, t * t, 0]
  });

  assert.equal(samples.length, 5);
  assert.deepEqual(samples[0].math, [-2, 0, 0]);
  assert.deepEqual(samples[4].math, [2, 1, 0]);
  assert.deepEqual(samples[0].world, [-4, 1, 0]);
  assert.deepEqual(samples[4].world, [4, 2, 0]);
});

test("resamples curves by arc length while preserving endpoints", () => {
  const samples = sampleParametricCurve({
    coordinateSpace,
    sampleCount: 9,
    tRange: [0, 1],
    valueAt: (t) => [-2 + t * 4, Math.sin(t * Math.PI), 0]
  });
  const resampled = resampleCurveByArcLength(samples, 5);

  assert.equal(resampled.length, 5);
  assert.deepEqual(resampled[0], samples[0]);
  assert.deepEqual(resampled[4], samples[samples.length - 1]);
  assert.ok(totalArcLength(resampled.map((sample) => sample.world)) > 0);
});
