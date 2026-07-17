import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  buildCoordinateSystemEvidence,
  coordinateSystemEvidenceDataAttributes,
  buildParametricCurveObject,
  buildParametricSurfaceObject,
  buildGraphCurveObject,
  createCoordinateSystem3D,
  serializeCoordinateSystemEvidence
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

test("CoordinateSystem3D resamples graph curves by visual arc length like Axes.get_graph", () => {
  const coordinates = createCoordinateSystem3D(coordinateSpace);
  const graph = buildGraphCurveObject({
    colorRole: "function",
    conceptId: "cubic-rule",
    coordinateSystem: coordinates,
    displaySampleCount: 5,
    id: "cubic-curve",
    sampleCount: 21,
    valueAt: (x) => [x, (x * x * x) / 4, Math.sin(x)],
    xRange: [-2, 2]
  });

  assert.equal(graph.mathSamples.length, 5);
  assert.equal(graph.worldSamples.length, 5);
  assert.equal(graph.curve.samples.length, 5);
  assert.deepEqual(graph.mathSamples[0], [-2, -2, Math.sin(-2)]);
  assert.deepEqual(graph.mathSamples.at(-1), [2, 2, Math.sin(2)]);
  assert.deepEqual(graph.worldSamples[0], coordinates.c2p(...graph.mathSamples[0]));
  assert.deepEqual(graph.worldSamples.at(-1), coordinates.c2p(...graph.mathSamples.at(-1)!));
  assert.ok(graph.curve.totalLength > 0);
});

test("CoordinateSystem3D builds parametric curves through c2p like Manim ParametricCurve", () => {
  const coordinates = createCoordinateSystem3D(coordinateSpace);
  const curve = buildParametricCurveObject({
    colorRole: "orbit",
    conceptId: "unit-circle",
    coordinateSystem: coordinates,
    displaySampleCount: 6,
    id: "circle-path",
    sampleCount: 25,
    tRange: [0, Math.PI * 2],
    valueAt: (theta) => [Math.cos(theta), Math.sin(theta), theta / Math.PI - 1]
  });

  assert.equal(curve.mathSamples.length, 6);
  assert.equal(curve.worldSamples.length, 6);
  assert.equal(curve.curve.samples.length, 6);
  assert.deepEqual(curve.mathSamples[0], [1, 0, -1]);
  assert.ok(Math.abs(curve.mathSamples.at(-1)![0] - 1) < 1e-12);
  assert.ok(Math.abs(curve.mathSamples.at(-1)![1]) < 1e-12);
  assert.deepEqual(curve.worldSamples[0], coordinates.c2p(...curve.mathSamples[0]));
  assert.deepEqual(curve.worldSamples.at(-1), coordinates.c2p(...curve.mathSamples.at(-1)!));
  assert.equal(curve.curve.id, "circle-path");
  assert.equal(curve.curve.conceptId, "unit-circle");
});

test("CoordinateSystem3D builds parametric surfaces through c2p like Manim Surface", () => {
  const coordinates = createCoordinateSystem3D(coordinateSpace);
  const surface = buildParametricSurfaceObject({
    colorRole: "surface",
    conceptId: "tilted-plane",
    coordinateSystem: coordinates,
    id: "plane-surface",
    uRange: [-1, 1],
    uSegments: 2,
    valueAt: (u, v) => [u, 0.5 + u - v / 2, v],
    vRange: [-2, 2],
    vSegments: 2
  });

  assert.equal(surface.surface.id, "plane-surface");
  assert.equal(surface.surface.conceptId, "tilted-plane");
  assert.equal(surface.mathSamples.length, 3);
  assert.equal(surface.mathSamples[0].length, 3);
  assert.equal(surface.worldSamples.length, 3);
  assert.equal(surface.worldSamples[0].length, 3);
  assert.deepEqual(surface.mathSamples[0][0], [-1, 0.5, -2]);
  assert.deepEqual(surface.worldSamples[0][0], coordinates.c2p(...surface.mathSamples[0][0]));
  assert.deepEqual(surface.mathSamples.at(-1)?.at(-1), [1, 0.5, 2]);
  assert.deepEqual(surface.worldSamples.at(-1)?.at(-1), coordinates.c2p(...surface.mathSamples.at(-1)!.at(-1)!));
  assert.equal(surface.surface.samples.length, 9);
  assert.ok(surface.surface.normals.every((normal) => normal.every(Number.isFinite)));
});

test("CoordinateSystem3D summarizes c2p/p2c coordinate evidence for browser QA", () => {
  const evidence = buildCoordinateSystemEvidence(coordinateSpace, {
    sampleMathPoints: [
      [-2, -1, -4],
      [0, 1, 0],
      [2, 3, 4]
    ]
  });
  const attributes = coordinateSystemEvidenceDataAttributes(evidence);

  assert.equal(evidence.axisCount, 3);
  assert.equal(evidence.sampleCount, 3);
  assert.equal(evidence.finiteSampleCount, 3);
  assert.equal(evidence.mathRangeSummary, "x=-2..2;y=-1..3;z=-4..4");
  assert.equal(evidence.worldRangeSummary, "x=-10..10;y=20..40;z=-2..2");
  assert.equal(evidence.originWorldPoint, "0.000,25.000,0.000");
  assert.equal(evidence.scaleSummary, "x=5.000;y=5.000;z=0.500");
  assert.equal(evidence.maxRoundTripError, 0);
  assert.equal(
    evidence.summary,
    "coordinateSystem:axes=3:samples=3:finite=3:roundtrip=0.000000:math=x=-2..2;y=-1..3;z=-4..4:world=x=-10..10;y=20..40;z=-2..2"
  );
  assert.equal(attributes["data-viz-manim-coordinate-axis-count"], "3");
  assert.equal(attributes["data-viz-manim-coordinate-c2p-finite-count"], "3");
  assert.equal(attributes["data-viz-manim-coordinate-p2c-roundtrip-error"], "0.000000");
  assert.equal(attributes["data-viz-manim-coordinate-summary"], evidence.summary);

  const serialized = serializeCoordinateSystemEvidence(evidence);
  assert.doesNotMatch(serialized, /<\/script|undefined|NaN|Infinity/i);
  assert.deepEqual(JSON.parse(serialized), evidence);
});

test("CoordinateSystem3D is a pure Manim math layer, not a renderer module", () => {
  const source = fs.readFileSync("components/visualizations/three/manim/mathCoordinateSystem3D.ts", "utf8");

  assert.match(source, /buildCurveObject/);
  assert.match(source, /serializeCoordinateSystemEvidence/);
  assert.doesNotMatch(source, /"use client"|@react-three\/fiber|@react-three\/drei|from "three"/);
});
