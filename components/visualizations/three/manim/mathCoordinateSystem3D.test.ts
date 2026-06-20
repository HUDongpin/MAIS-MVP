import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  buildGraphCurveObject,
  createCoordinateSystem3D
} from "./mathCoordinateSystem3D";
import type { CoordinateSpaceSpec } from "./mathSceneTypes";

const coordinateSpace: CoordinateSpaceSpec = {
  mathRange: {
    x: [-2, 2],
    y: [-1, 3],
    z: [-4, 4]
  },
  worldRange: {
    x: [-10, 10],
    y: [20, 40],
    z: [-2, 2]
  }
};

test("CoordinateSystem3D maps math coordinates to world points and back", () => {
  const coordinates = createCoordinateSystem3D(coordinateSpace);
  const world = coordinates.c2p(1, 2, -2);
  const math = coordinates.p2c(world);

  assert.deepEqual(world, [5, 35, -1]);
  assert.deepEqual(math.map((value) => Number(value.toFixed(6))), [1, 2, -2]);
  assert.deepEqual(coordinates.c2p(Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY), [0, 30, 0]);
});

test("CoordinateSystem3D builds graph curves from math-domain functions", () => {
  const coordinates = createCoordinateSystem3D(coordinateSpace);
  const graph = buildGraphCurveObject({
    colorRole: "function",
    conceptId: "square-rule",
    coordinateSystem: coordinates,
    id: "square-curve",
    sampleCount: 5,
    valueAt: (x) => [x, x * x, 0],
    xRange: [-2, 2]
  });

  assert.equal(graph.curve.id, "square-curve");
  assert.equal(graph.curve.conceptId, "square-rule");
  assert.deepEqual(graph.mathSamples[0], [-2, 4, 0]);
  assert.deepEqual(graph.mathSamples.at(-1), [2, 4, 0]);
  assert.deepEqual(graph.worldSamples[2], [0, 25, 0]);
  assert.equal(graph.curve.samples.length, 5);
});

test("CoordinateSystem3D is a pure Manim math layer, not a renderer module", () => {
  const source = fs.readFileSync("components/visualizations/three/manim/mathCoordinateSystem3D.ts", "utf8");

  assert.match(source, /buildCurveObject/);
  assert.doesNotMatch(source, /"use client"|@react-three\/fiber|@react-three\/drei|from "three"/);
});
