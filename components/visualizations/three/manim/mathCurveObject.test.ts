import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  alignCurveSamplesForMorph,
  buildCurveObject,
  interpolateAlignedCurves,
  partialCurveByArcRange,
  pointAtArcProgress
} from "./mathCurveObject";
import type { Vec3 } from "./mathSceneTypes";

const lShape: Vec3[] = [
  [0, 0, 0],
  [2, 0, 0],
  [2, 2, 0]
];

test("builds a CurveObject with cumulative arc-length anchors", () => {
  const curve = buildCurveObject({
    colorRole: "function",
    conceptId: "piecewise-path",
    id: "curve",
    samples: lShape
  });

  assert.equal(curve.totalLength, 4);
  assert.deepEqual(curve.arcLengthTable.map((entry) => entry.length), [0, 2, 4]);
  assert.deepEqual(pointAtArcProgress(curve, 0.5), [2, 0, 0]);
  assert.deepEqual(pointAtArcProgress(curve, Number.NaN), [0, 0, 0]);
});

test("returns partial curves by visual arc-length range", () => {
  const curve = buildCurveObject({
    colorRole: "function",
    conceptId: "piecewise-path",
    id: "curve",
    samples: lShape
  });
  const partial = partialCurveByArcRange(curve, 0.25, 0.75);

  assert.deepEqual(partial, [
    [1, 0, 0],
    [2, 0, 0],
    [2, 1, 0]
  ]);
});

test("aligns and interpolates curves for Manim-style morph continuity", () => {
  const source = buildCurveObject({
    colorRole: "function",
    conceptId: "model",
    id: "source",
    samples: [
      [0, 0, 0],
      [2, 0, 0]
    ]
  });
  const target = buildCurveObject({
    colorRole: "function",
    conceptId: "model",
    id: "target",
    samples: [
      [0, 0, 0],
      [1, 1, 0],
      [2, 0, 0],
      [3, 1, 0]
    ]
  });

  const aligned = alignCurveSamplesForMorph(source, target, 5);
  const halfway = interpolateAlignedCurves(aligned, 0.5);

  assert.equal(aligned.source.length, 5);
  assert.equal(aligned.target.length, 5);
  assert.deepEqual(halfway[0], [0, 0, 0]);
  assert.deepEqual(halfway.at(-1), [2.5, 0.5, 0]);
  assert.equal(aligned.conceptId, "model");
});

test("runtime updaters consume CurveObject arc-length helpers instead of raw index slicing", () => {
  const updaterSource = fs.readFileSync("components/visualizations/three/manim/mathUpdaterRegistry.ts", "utf8");

  assert.match(updaterSource, /buildCurveObject/);
  assert.match(updaterSource, /partialCurveByArcRange/);
  assert.match(updaterSource, /pointAtArcProgress/);
});
