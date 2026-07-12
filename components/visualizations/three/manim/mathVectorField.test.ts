import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  buildVectorFieldArrows,
  sampleVectorField2D,
  summarizeVectorField,
  traceVectorFieldPath
} from "./mathVectorField";

test("samples a deterministic 2D VectorField grid with magnitude and direction metadata", () => {
  const field = sampleVectorField2D({
    conceptId: "rotation-flow",
    field: ([x, y]) => [-y, x, 0],
    id: "rotation-field",
    xRange: [-1, 1],
    xSteps: 3,
    yRange: [-1, 1],
    ySteps: 3
  });
  const summary = summarizeVectorField(field);
  const center = field.samples.find((sample) => sample.anchor[0] === 0 && sample.anchor[1] === 0);
  const topRight = field.samples.find((sample) => sample.anchor[0] === 1 && sample.anchor[1] === 1);

  assert.equal(field.samples.length, 9);
  assert.equal(summary.sampleCount, 9);
  assert.equal(summary.zeroVectorCount, 1);
  assert.equal(summary.finiteVectorCount, 9);
  assert.equal(summary.highBandCount, 8);
  assert.equal(summary.midBandCount, 0);
  assert.equal(summary.lowBandCount, 0);
  assert.equal(summary.zeroBandCount, 1);
  assert.equal(summary.maxMagnitude.toFixed(3), Math.sqrt(2).toFixed(3));
  assert.equal(center?.magnitude, 0);
  assert.equal(center?.colorBand, "zero");
  assert.deepEqual(topRight?.direction.map((value) => Number(value.toFixed(3))), [-0.707, 0.707, 0]);
  assert.equal(topRight?.colorBand, "high");
});

test("builds bounded vector arrows with zero vectors preserved as anchored points", () => {
  const field = sampleVectorField2D({
    conceptId: "linear-flow",
    field: ([x]) => [x, 0, 0],
    id: "linear-field",
    xRange: [0, 2],
    xSteps: 3,
    yRange: [0, 0],
    ySteps: 1
  });
  const arrows = buildVectorFieldArrows(field, { maxArrowLength: 0.5 });

  assert.equal(arrows.length, 3);
  assert.deepEqual(arrows[0].from, [0, 0, 0]);
  assert.deepEqual(arrows[0].to, [0, 0, 0]);
  assert.deepEqual(arrows.at(-1)?.from, [2, 0, 0]);
  assert.deepEqual(arrows.at(-1)?.to, [2.5, 0, 0]);
  assert.ok(arrows.every((arrow) => arrow.length <= 0.5));
});

test("traces motion along a vector field using deterministic Euler steps", () => {
  const trace = traceVectorFieldPath({
    bounds: { x: [-10, 10], y: [-10, 10], z: [-1, 1] },
    dt: 0.5,
    field: () => [1, 0, 0],
    start: [0, 0, 0],
    steps: 4
  });

  assert.deepEqual(trace.points, [
    [0, 0, 0],
    [0.5, 0, 0],
    [1, 0, 0],
    [1.5, 0, 0],
    [2, 0, 0]
  ]);
  assert.equal(trace.stoppedReason, "completed");
});

test("sanitizes non-finite field values and stops traces before emitting invalid points", () => {
  const field = sampleVectorField2D({
    conceptId: "singular-flow",
    field: ([x]) => (x === 0 ? [Number.NaN, Number.POSITIVE_INFINITY, 0] : [1 / x, 0, 0]),
    id: "singular-field",
    xRange: [-1, 1],
    xSteps: 3,
    yRange: [0, 0],
    ySteps: 1
  });
  const trace = traceVectorFieldPath({
    dt: 1,
    field: () => [Number.NaN, 0, 0],
    start: [0, 0, 0],
    steps: 3
  });

  assert.equal(field.samples[1].magnitude, 0);
  assert.deepEqual(field.samples[1].vector, [0, 0, 0]);
  assert.equal(trace.points.length, 1);
  assert.equal(trace.stoppedReason, "non-finite-vector");
});

test("VectorField math layer stays pure and renderer-independent", () => {
  const source = fs.readFileSync("components/visualizations/three/manim/mathVectorField.ts", "utf8");

  assert.doesNotMatch(source, /"use client"|@react-three\/fiber|@react-three\/drei|from "three"/);
});
