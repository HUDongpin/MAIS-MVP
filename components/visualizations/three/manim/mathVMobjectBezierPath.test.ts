import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  buildVMobjectBezierPathFromPoints,
  buildVMobjectBezierPathFromSvgPath,
  partialVMobjectBezierPathByArcRange,
  sampleVMobjectBezierPath,
  summarizeVMobjectBezierPaths,
  VMOBJECT_BEZIER_PATH_SOURCE_CONTRACT,
  vmobjectBezierPathDataAttributes
} from "./mathVMobjectBezierPath";

test("builds Manim-style VMobject path arrays from sampled curve anchors", () => {
  const path = buildVMobjectBezierPathFromPoints({
    conceptId: "piecewise-path",
    id: "curve",
    points: [
      [0, 0, 0],
      [2, 0, 0],
      [2, 2, 0]
    ]
  });

  assert.equal(path.id, "curve");
  assert.equal(path.conceptId, "piecewise-path");
  assert.equal(path.segmentCount, 2);
  assert.equal(path.lineSegmentCount, 2);
  assert.equal(path.cubicSegmentCount, 0);
  assert.equal(path.anchorPointCount, 3);
  assert.equal(path.handlePointCount, 0);
  assert.equal(path.closed, false);
  assert.equal(path.totalLength, 4);
  assert.deepEqual(path.points.map((entry) => entry.kind), ["anchor", "anchor", "anchor"]);
});

test("builds cubic VMobject path arrays from SVG path commands", () => {
  const path = buildVMobjectBezierPathFromSvgPath({
    conceptId: "glyph-shape",
    id: "formula-glyph",
    path: "M 0 0 C 0 1 1 1 1 0 L 2 0 Z"
  });

  assert.equal(path.segmentCount, 3);
  assert.equal(path.cubicSegmentCount, 1);
  assert.equal(path.lineSegmentCount, 2);
  assert.equal(path.anchorPointCount, 4);
  assert.equal(path.handlePointCount, 2);
  assert.equal(path.closed, true);
  assert.deepEqual(
    path.points.map((entry) => `${entry.kind}:${entry.point.join(",")}`),
    [
      "anchor:0,0,0",
      "handle:0,1,0",
      "handle:1,1,0",
      "anchor:1,0,0",
      "anchor:2,0,0",
      "anchor:0,0,0"
    ]
  );
});

test("samples and partially reveals VMobject Bezier paths by visual arc length", () => {
  const path = buildVMobjectBezierPathFromSvgPath({
    conceptId: "glyph-shape",
    id: "formula-glyph",
    path: "M 0 0 C 0 1 1 1 1 0 L 3 0"
  });
  const samples = sampleVMobjectBezierPath(path, 4);
  const partial = partialVMobjectBezierPathByArcRange(path, 0.25, 0.75, 8);

  assert.equal(samples[0][0], 0);
  assert.equal(samples.at(-1)?.[0], 3);
  assert.ok(samples.length > path.segmentCount);
  assert.ok(partial.length >= 3);
  assert.deepEqual(partial[0].map((value) => Number(value.toFixed(6))), [0.502976, 0.74924, 0]);
  assert.deepEqual(partial.at(-1)?.map((value) => Number(value.toFixed(6))), [2.003071, 0, 0]);
});

test("summarizes VMobject Bezier path coverage for browser QA attributes", () => {
  const paths = [
    buildVMobjectBezierPathFromPoints({
      conceptId: "curve",
      id: "curve",
      points: [[0, 0, 0], [1, 0, 0], [1, 1, 0]]
    }),
    buildVMobjectBezierPathFromSvgPath({
      conceptId: "glyph",
      id: "glyph",
      path: "M 0 0 C 0 1 1 1 1 0"
    })
  ];
  const summary = summarizeVMobjectBezierPaths(paths);
  const attributes = vmobjectBezierPathDataAttributes(summary);

  assert.equal(summary.pathCount, 2);
  assert.equal(summary.segmentCount, 3);
  assert.equal(summary.cubicSegmentCount, 1);
  assert.equal(summary.anchorPointCount, 5);
  assert.equal(summary.handlePointCount, 2);
  assert.equal(summary.closedPathCount, 0);
  assert.equal(summary.samplePointCount, 8);
  assert.equal(summary.sourceContract, VMOBJECT_BEZIER_PATH_SOURCE_CONTRACT);
  assert.equal(summary.summary, "bezierPaths=2;segments=3;cubic=1;anchors=5;handles=2;closed=0;samples=8;ids=curve,glyph");
  assert.match(VMOBJECT_BEZIER_PATH_SOURCE_CONTRACT, /VMobject/);
  assert.match(VMOBJECT_BEZIER_PATH_SOURCE_CONTRACT, /pointwise_become_partial/);
  assert.match(VMOBJECT_BEZIER_PATH_SOURCE_CONTRACT, /SVG path/);
  assert.equal(attributes["data-viz-vmobject-bezier-path-count"], "2");
  assert.equal(attributes["data-viz-vmobject-bezier-segment-count"], "3");
  assert.equal(attributes["data-viz-vmobject-bezier-cubic-segment-count"], "1");
  assert.equal(attributes["data-viz-vmobject-bezier-anchor-count"], "5");
  assert.equal(attributes["data-viz-vmobject-bezier-handle-count"], "2");
  assert.equal(attributes["data-viz-vmobject-bezier-sample-count"], "8");
  assert.equal(attributes["data-viz-vmobject-bezier-source-contract"], VMOBJECT_BEZIER_PATH_SOURCE_CONTRACT);
  assert.equal(attributes["data-viz-vmobject-bezier-summary"], summary.summary);
});

test("VMobject Bezier path source stays pure and feeds browser evidence", () => {
  const bezierSource = fs.readFileSync("components/visualizations/three/manim/mathVMobjectBezierPath.ts", "utf8");
  const evidenceSource = fs.readFileSync("components/visualizations/three/manim/mathEvidenceHarness.ts", "utf8");

  assert.doesNotMatch(bezierSource, /"use client"|@react-three\/fiber|@react-three\/drei|from "three"/);
  assert.match(bezierSource, /VMOBJECT_BEZIER_PATH_SOURCE_CONTRACT/);
  assert.match(bezierSource, /buildVMobjectBezierPathFromSvgPath/);
  assert.match(bezierSource, /partialVMobjectBezierPathByArcRange/);
  assert.match(evidenceSource, /summarizeVMobjectBezierPaths/);
  assert.match(evidenceSource, /vmobjectBezierPathDataAttributes/);
});
