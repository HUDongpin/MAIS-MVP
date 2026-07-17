import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  VMOBJECT_PATH_BUILDER_SOURCE_CONTRACT,
  buildVMobjectPathConstructionEvidence,
  buildVMobjectPathFromCorners,
  createVMobjectPathBuilder,
  vmobjectPathConstructionDataAttributes
} from "./mathVMobjectPathBuilder";
import { sampleVMobjectBezierPath } from "./mathVMobjectBezierPath";

test("constructs a VMobject path with start_new_path, line, cubic, and close_path verbs", () => {
  const plan = createVMobjectPathBuilder({ conceptId: "loop", id: "loop-path" })
    .startNewPath([0, 0, 0])
    .addLineTo([1, 0, 0])
    .addCubicBezierCurveTo([1, 0.5, 0], [0.5, 1, 0], [0, 1, 0])
    .closePath()
    .build();

  assert.equal(plan.sourceContract, VMOBJECT_PATH_BUILDER_SOURCE_CONTRACT);
  assert.match(VMOBJECT_PATH_BUILDER_SOURCE_CONTRACT, /start_new_path/);
  assert.match(VMOBJECT_PATH_BUILDER_SOURCE_CONTRACT, /add_line_to/);
  assert.match(VMOBJECT_PATH_BUILDER_SOURCE_CONTRACT, /add_cubic_bezier_curve_to/);
  assert.match(VMOBJECT_PATH_BUILDER_SOURCE_CONTRACT, /close_path/);
  assert.equal(plan.path.closed, true);
  assert.equal(plan.path.segmentCount, 3);
  assert.equal(plan.path.lineSegmentCount, 2);
  assert.equal(plan.path.cubicSegmentCount, 1);
  assert.equal(plan.path.anchorPointCount, 4);
  assert.equal(plan.path.handlePointCount, 2);
  assert.equal(plan.commandCount, 4);
  assert.equal(plan.commandSummary, "startNewPath=1;addLineTo=1;addCubicBezierCurveTo=1;closePath=1;setPointsAsCorners=0");
  assert.deepEqual(plan.commandIds, ["startNewPath", "addLineTo", "addCubicBezierCurveTo", "closePath"]);
  assert.equal(sampleVMobjectBezierPath(plan.path, 2).length, 7);
});

test("models set_points_as_corners as a start_new_path followed by line segments", () => {
  const plan = buildVMobjectPathFromCorners({
    conceptId: "polyline",
    id: "corner-path",
    points: [[0, 0, 0], [1, 0, 0], [1, 1, 0]]
  });

  assert.equal(plan.path.closed, false);
  assert.equal(plan.path.segmentCount, 2);
  assert.equal(plan.path.lineSegmentCount, 2);
  assert.equal(plan.path.cubicSegmentCount, 0);
  assert.equal(plan.path.anchorPointCount, 3);
  assert.equal(plan.path.handlePointCount, 0);
  assert.equal(plan.commandCount, 4);
  assert.equal(plan.commandSummary, "startNewPath=1;addLineTo=2;addCubicBezierCurveTo=0;closePath=0;setPointsAsCorners=1");
  assert.deepEqual(plan.commandIds, ["setPointsAsCorners", "startNewPath", "addLineTo", "addLineTo"]);
  assert.match(VMOBJECT_PATH_BUILDER_SOURCE_CONTRACT, /set_points_as_corners/);
});

test("summarizes VMobject path-construction evidence for browser QA", () => {
  const cornerPlan = buildVMobjectPathFromCorners({
    conceptId: "polyline",
    id: "corner-path",
    points: [[0, 0, 0], [1, 0, 0], [1, 1, 0]]
  });
  const loopPlan = createVMobjectPathBuilder({ conceptId: "loop", id: "loop-path" })
    .startNewPath([0, 0, 0])
    .addLineTo([1, 0, 0])
    .addCubicBezierCurveTo([1, 0.5, 0], [0.5, 1, 0], [0, 1, 0])
    .closePath()
    .build();
  const evidence = buildVMobjectPathConstructionEvidence([cornerPlan, loopPlan]);
  const attributes = vmobjectPathConstructionDataAttributes(evidence);

  assert.equal(evidence.pathCount, 2);
  assert.equal(evidence.commandCount, 8);
  assert.equal(evidence.startNewPathCount, 2);
  assert.equal(evidence.addLineToCount, 3);
  assert.equal(evidence.addCubicBezierCurveToCount, 1);
  assert.equal(evidence.closePathCount, 1);
  assert.equal(evidence.setPointsAsCornersCount, 1);
  assert.equal(evidence.lineSegmentCount, 4);
  assert.equal(evidence.cubicSegmentCount, 1);
  assert.equal(evidence.closedPathCount, 1);
  assert.equal(evidence.anchorPointCount, 7);
  assert.equal(evidence.handlePointCount, 2);
  assert.equal(evidence.pathIds, "corner-path,loop-path");
  assert.equal(evidence.sourceContract, VMOBJECT_PATH_BUILDER_SOURCE_CONTRACT);
  assert.match(evidence.signature, /^vmobject-path-builder-[0-9a-f]{8}$/);
  assert.equal(
    evidence.summary,
    "vmobject-path-builder:paths=2:commands=8:start=2:line=3:cubic=1:close=1:corners=1:segments=5:closed=1:ids=corner-path,loop-path"
  );
  assert.equal(attributes["data-viz-vmobject-path-builder-path-count"], "2");
  assert.equal(attributes["data-viz-vmobject-path-builder-command-count"], "8");
  assert.equal(attributes["data-viz-vmobject-path-builder-operation-summary"], evidence.operationSummary);
  assert.equal(attributes["data-viz-vmobject-path-builder-source-contract"], VMOBJECT_PATH_BUILDER_SOURCE_CONTRACT);
  assert.equal(attributes["data-viz-vmobject-path-builder-summary"], evidence.summary);
});

test("VMobject path-builder source stays pure and feeds the evidence harness", () => {
  const source = fs.readFileSync("components/visualizations/three/manim/mathVMobjectPathBuilder.ts", "utf8");
  const evidenceSource = fs.readFileSync("components/visualizations/three/manim/mathEvidenceHarness.ts", "utf8");

  assert.doesNotMatch(source, /"use client"|@react-three\/fiber|@react-three\/drei|from "three"/);
  assert.match(source, /createVMobjectPathBuilder/);
  assert.match(source, /buildVMobjectPathFromCorners/);
  assert.match(source, /buildVMobjectPathConstructionEvidence/);
  assert.match(source, /vmobjectPathConstructionDataAttributes/);
  assert.match(evidenceSource, /buildVMobjectPathConstructionPlansFromObjectGraph/);
  assert.match(evidenceSource, /vmobjectPathConstructionDataAttributes/);
});
