import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  buildCoordinateSpaceEvidence,
  coordinateSpaceEvidenceDataAttributes,
  mapMathPointToWorld,
  mapWorldPointToMath,
  resampleCurveByArcLength,
  sampleParametricCurve,
  serializeCoordinateSpaceEvidence,
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

test("maps world coordinates back into math space for updater field evaluation", () => {
  assert.deepEqual(mapWorldPointToMath([0, 2, 0], coordinateSpace), [0, 1, 0]);
  assert.deepEqual(mapWorldPointToMath([-4, 0, -2], coordinateSpace), [-2, -1, -4]);
  assert.deepEqual(mapWorldPointToMath([4, 4, 2], coordinateSpace), [2, 3, 4]);
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

test("builds CoordinateSpace source evidence for c2p/p2c and arc-length graph sampling", () => {
  const curveSamples = sampleParametricCurve({
    coordinateSpace,
    sampleCount: 3,
    tRange: [0, 1],
    valueAt: (t) => [-2 + t * 4, -1 + t * 4, -4 + t * 8]
  });
  const evidence = buildCoordinateSpaceEvidence(coordinateSpace, {
    curveSamples,
    resampleCount: 5,
    sampleMathPoints: [[0, 1, 0]],
    vectorMathDelta: [1, 1, 1]
  });
  const attributes = coordinateSpaceEvidenceDataAttributes(evidence);

  assert.equal(evidence.sourceContract, "CoordinateSystem.c2p/p2c|get_graph|arc-length sampling");
  assert.equal(evidence.mathRangeSummary, "x=-2..2;y=-1..3;z=-4..4");
  assert.equal(evidence.worldRangeSummary, "x=-4..4;y=0..4;z=-2..2");
  assert.equal(evidence.scaleSummary, "x=2.000;y=1.000;z=0.500");
  assert.equal(evidence.c2pSummary, "0.000,1.000,0.000=>0.000,2.000,0.000");
  assert.equal(evidence.p2cSummary, "0.000,2.000,0.000=>0.000,1.000,0.000");
  assert.equal(evidence.vectorDeltaSummary, "1.000,1.000,1.000=>2.000,1.000,0.500");
  assert.equal(evidence.sampleCount, 1);
  assert.equal(evidence.finiteSampleCount, 1);
  assert.equal(evidence.maxRoundTripError, 0);
  assert.equal(evidence.curveSampleCount, 3);
  assert.equal(evidence.resampledSampleCount, 5);
  assert.equal(evidence.arcLength, 9.797959);
  assert.equal(evidence.endpointSummary, "-4.000,0.000,-2.000->4.000,4.000,2.000");
  assert.equal(
    evidence.summary,
    "coordinate-space:samples=1:finite=1:roundtrip=0.000000:curveSamples=3:resampled=5:arc=9.797959:scale=x=2.000;y=1.000;z=0.500"
  );

  assert.equal(attributes["data-viz-manim-coordinate-space-source-contract"], evidence.sourceContract);
  assert.equal(attributes["data-viz-manim-coordinate-space-math-range"], "x=-2..2;y=-1..3;z=-4..4");
  assert.equal(attributes["data-viz-manim-coordinate-space-world-range"], "x=-4..4;y=0..4;z=-2..2");
  assert.equal(attributes["data-viz-manim-coordinate-space-scale"], "x=2.000;y=1.000;z=0.500");
  assert.equal(attributes["data-viz-manim-coordinate-space-c2p-summary"], evidence.c2pSummary);
  assert.equal(attributes["data-viz-manim-coordinate-space-p2c-summary"], evidence.p2cSummary);
  assert.equal(attributes["data-viz-manim-coordinate-space-vector-delta"], evidence.vectorDeltaSummary);
  assert.equal(attributes["data-viz-manim-coordinate-space-sample-count"], "1");
  assert.equal(attributes["data-viz-manim-coordinate-space-finite-sample-count"], "1");
  assert.equal(attributes["data-viz-manim-coordinate-space-roundtrip-error"], "0.000000");
  assert.equal(attributes["data-viz-manim-coordinate-space-curve-sample-count"], "3");
  assert.equal(attributes["data-viz-manim-coordinate-space-arc-length"], "9.797959");
  assert.equal(attributes["data-viz-manim-coordinate-space-resampled-count"], "5");
  assert.equal(attributes["data-viz-manim-coordinate-space-endpoints"], evidence.endpointSummary);
  assert.equal(attributes["data-viz-manim-coordinate-space-summary"], evidence.summary);

  const serialized = serializeCoordinateSpaceEvidence(evidence);
  assert.doesNotMatch(serialized, /<\/script|undefined|NaN|Infinity/i);
  assert.deepEqual(JSON.parse(serialized), evidence);
});

test("CoordinateSpace source stays pure and focused on math-world mapping", () => {
  const source = fs.readFileSync("components/visualizations/three/manim/mathCoordinateSpace.ts", "utf8");

  assert.match(source, /COORDINATE_SPACE_SOURCE_CONTRACT/);
  assert.match(source, /buildCoordinateSpaceEvidence/);
  assert.match(source, /coordinateSpaceEvidenceDataAttributes/);
  assert.match(source, /serializeCoordinateSpaceEvidence/);
  assert.match(source, /mapMathPointToWorld/);
  assert.match(source, /mapWorldPointToMath/);
  assert.match(source, /resampleCurveByArcLength/);
  assert.match(source, /totalArcLength/);
  assert.doesNotMatch(source, /"use client"|@react-three\/fiber|@react-three\/drei|from "three"/);
});
