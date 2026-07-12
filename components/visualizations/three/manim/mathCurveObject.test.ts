import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  VMOBJECT_PARTIAL_CURVE_SOURCE_CONTRACT,
  VMOBJECT_PARTIAL_CURVE_VISIBILITY_POLICY,
  alignCurveSamplesForMorph,
  buildCurveObject,
  curvePartialFrameDataAttributes,
  interpolateAlignedCurves,
  partialCurveByArcRange,
  pointwiseBecomePartialCurveObject,
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

test("models VMobject pointwise_become_partial as an object-level partial curve frame", () => {
  const curve = buildCurveObject({
    colorRole: "function",
    conceptId: "piecewise-path",
    id: "curve",
    samples: lShape,
    style: { strokeRole: "function", strokeWidth: 5 }
  });
  const frame = pointwiseBecomePartialCurveObject(curve, 0.75, 0.25);
  const attributes = curvePartialFrameDataAttributes(frame);

  assert.equal(frame.sourceId, "curve");
  assert.equal(frame.curve.id, "curve");
  assert.equal(frame.curve.conceptId, "piecewise-path");
  assert.equal(frame.curve.colorRole, "function");
  assert.equal(frame.curve.style.strokeWidth, 5);
  assert.equal(frame.sourceContract, VMOBJECT_PARTIAL_CURVE_SOURCE_CONTRACT);
  assert.equal(frame.visibilityPolicy, VMOBJECT_PARTIAL_CURVE_VISIBILITY_POLICY);
  assert.deepEqual(frame.requestedRange, [0.75, 0.25]);
  assert.deepEqual(frame.normalizedRange, [0.25, 0.75]);
  assert.equal(frame.reversed, true);
  assert.deepEqual(frame.curve.samples, [
    [2, 1, 0],
    [2, 0, 0],
    [1, 0, 0]
  ]);
  assert.equal(frame.visibleSampleCount, 3);
  assert.equal(frame.visibleLength, 2);
  assert.equal(frame.summary, "partialCurve:curve:range=0.250..0.750:requested=0.750..0.250:reversed=true:samples=3:length=2.000");
  assert.deepEqual(attributes, {
    "data-viz-curve-partial-length": "2.000",
    "data-viz-curve-partial-normalized-range": "0.250..0.750",
    "data-viz-curve-partial-requested-range": "0.750..0.250",
    "data-viz-curve-partial-reversed": "true",
    "data-viz-curve-partial-sample-count": "3",
    "data-viz-curve-partial-source-id": "curve",
    "data-viz-curve-partial-source-contract": VMOBJECT_PARTIAL_CURVE_SOURCE_CONTRACT,
    "data-viz-curve-partial-summary": "partialCurve:curve:range=0.250..0.750:requested=0.750..0.250:reversed=true:samples=3:length=2.000",
    "data-viz-curve-partial-visibility-policy": VMOBJECT_PARTIAL_CURVE_VISIBILITY_POLICY
  });
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
  assert.match(updaterSource, /pointwiseBecomePartialCurveObject/);
  assert.match(updaterSource, /pointAtArcProgress/);
  assert.doesNotMatch(updaterSource, /Math\.max\(0\.08, progress\)/);

  const curveSource = fs.readFileSync("components/visualizations/three/manim/mathCurveObject.ts", "utf8");

  assert.match(curveSource, /VMOBJECT_PARTIAL_CURVE_SOURCE_CONTRACT/);
  assert.match(curveSource, /VMOBJECT_PARTIAL_CURVE_VISIBILITY_POLICY/);
  assert.equal(
    VMOBJECT_PARTIAL_CURVE_SOURCE_CONTRACT,
    "VMobject.pointwise_become_partial preserves object identity and style while swapping in a partial path"
  );
  assert.equal(VMOBJECT_PARTIAL_CURVE_VISIBILITY_POLICY, "showcreation-uses-partial-path-by-alpha");
});
