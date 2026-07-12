import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  VMOBJECT_SMOOTH_PATH_SOURCE_CONTRACT,
  alignSmoothVMobjectPathsForMorph,
  buildSmoothVMobjectPathFromAnchors,
  buildVMobjectSmoothPathEvidence,
  buildVMobjectSmoothPathPlansFromObjectGraph,
  sampleSmoothVMobjectPathFromAnchors,
  vmobjectSmoothPathDataAttributes
} from "./mathVMobjectSmoothPath";
import { buildMathSceneRuntimeState } from "./mathSceneRuntimeState";
import { buildMathSceneSpecForThreeDFamily } from "./mathSceneRegistry";

test("builds Manim-style smooth cubic handles from sampled anchors", () => {
  const plan = buildSmoothVMobjectPathFromAnchors({
    conceptId: "curve",
    id: "curve",
    points: [
      [0, 0, 0],
      [1, 1, 0],
      [2, 0, 0]
    ]
  });

  assert.equal(plan.sourceContract, VMOBJECT_SMOOTH_PATH_SOURCE_CONTRACT);
  assert.match(VMOBJECT_SMOOTH_PATH_SOURCE_CONTRACT, /set_points_smoothly/);
  assert.match(VMOBJECT_SMOOTH_PATH_SOURCE_CONTRACT, /make_smooth/);
  assert.match(VMOBJECT_SMOOTH_PATH_SOURCE_CONTRACT, /change_anchor_mode/);
  assert.equal(plan.path.segmentCount, 2);
  assert.equal(plan.path.lineSegmentCount, 0);
  assert.equal(plan.path.cubicSegmentCount, 2);
  assert.equal(plan.path.anchorPointCount, 3);
  assert.equal(plan.path.handlePointCount, 4);
  assert.equal(plan.commandSummary, "setPointsSmoothly=1;makeSmooth=1;changeAnchorMode=1;insertNCurves=0");
  assert.equal(plan.smoothingMode, "catmull-rom-cubic");
  assert.equal(plan.continuityPassCount, 1);
  assert.equal(plan.path.points[1].kind, "handle");
  assert.equal(plan.path.points[2].kind, "handle");
  assert.deepEqual(plan.path.points[0].point, [0, 0, 0]);
  assert.deepEqual(plan.path.points.at(-1)?.point, [2, 0, 0]);
});

test("summarizes smooth VMobject path evidence for browser QA", () => {
  const evidence = buildVMobjectSmoothPathEvidence([
    buildSmoothVMobjectPathFromAnchors({
      conceptId: "curve",
      id: "curve-a",
      points: [[0, 0, 0], [1, 1, 0], [2, 0, 0]]
    }),
    buildSmoothVMobjectPathFromAnchors({
      conceptId: "curve",
      id: "curve-b",
      points: [[0, 0, 0], [1, 0, 0]]
    })
  ]);
  const attributes = vmobjectSmoothPathDataAttributes(evidence);

  assert.equal(evidence.pathCount, 2);
  assert.equal(evidence.commandCount, 6);
  assert.equal(evidence.setPointsSmoothlyCount, 2);
  assert.equal(evidence.makeSmoothCount, 2);
  assert.equal(evidence.changeAnchorModeCount, 2);
  assert.equal(evidence.insertNCurvesCount, 0);
  assert.equal(evidence.cubicSegmentCount, 3);
  assert.equal(evidence.handlePointCount, 6);
  assert.equal(evidence.anchorPointCount, 5);
  assert.equal(evidence.pathIds, "curve-a,curve-b");
  assert.equal(evidence.sourceContract, VMOBJECT_SMOOTH_PATH_SOURCE_CONTRACT);
  assert.match(evidence.signature, /^vmobject-smooth-path-[0-9a-f]{8}$/);
  assert.equal(
    evidence.summary,
    "vmobject-smooth-path:paths=2:commands=6:cubic=3:anchors=5:handles=6:continuity=2:maxHandle=0.471:ids=curve-a,curve-b"
  );
  assert.equal(attributes["data-viz-vmobject-smooth-path-count"], "2");
  assert.equal(attributes["data-viz-vmobject-smooth-path-command-count"], "6");
  assert.equal(attributes["data-viz-vmobject-smooth-path-cubic-segment-count"], "3");
  assert.equal(attributes["data-viz-vmobject-smooth-path-handle-point-count"], "6");
  assert.equal(attributes["data-viz-vmobject-smooth-path-source-contract"], VMOBJECT_SMOOTH_PATH_SOURCE_CONTRACT);
  assert.equal(attributes["data-viz-vmobject-smooth-path-summary"], evidence.summary);
});

test("inserts additional smooth cubic curves for Manim-style curve-count alignment", () => {
  const plan = buildSmoothVMobjectPathFromAnchors({
    conceptId: "morphing-curve",
    id: "curve",
    points: [[0, 0, 0], [2, 0, 0]],
    targetCurveCount: 4
  });
  const evidence = buildVMobjectSmoothPathEvidence([plan]);
  const attributes = vmobjectSmoothPathDataAttributes(evidence);

  assert.equal(plan.path.segmentCount, 4);
  assert.equal(plan.path.cubicSegmentCount, 4);
  assert.equal(plan.path.anchorPointCount, 5);
  assert.equal(plan.path.handlePointCount, 8);
  assert.equal(plan.insertNCurvesCount, 3);
  assert.equal(plan.commandCount, 4);
  assert.equal(plan.commandSummary, "setPointsSmoothly=1;makeSmooth=1;changeAnchorMode=1;insertNCurves=1");
  assert.equal(evidence.insertNCurvesCount, 3);
  assert.equal(evidence.cubicSegmentCount, 4);
  assert.equal(evidence.anchorPointCount, 5);
  assert.equal(evidence.handlePointCount, 8);
  assert.equal(attributes["data-viz-vmobject-smooth-path-insert-n-curves-count"], "3");
  assert.equal(
    evidence.summary,
    "vmobject-smooth-path:paths=1:commands=4:cubic=4:anchors=5:handles=8:continuity=1:maxHandle=0.667:ids=curve"
  );
});

test("aligns smooth VMobject paths for morphs with insert_n_curves semantics", () => {
  const alignment = alignSmoothVMobjectPathsForMorph({
    conceptId: "morphing-curve",
    sourceId: "source-curve",
    sourcePoints: [
      [0, 0, 0],
      [2, 1, 0],
      [4, 0, 0]
    ],
    targetId: "target-curve",
    targetPoints: [[0, 0, 0], [2, 0, 0]]
  });

  assert.equal(alignment.sourceContract, VMOBJECT_SMOOTH_PATH_SOURCE_CONTRACT);
  assert.equal(alignment.alignedCurveCount, 2);
  assert.equal(alignment.alignedPointCount, 3);
  assert.equal(alignment.sourceInsertNCurvesCount, 0);
  assert.equal(alignment.targetInsertNCurvesCount, 1);
  assert.deepEqual(alignment.source, [[0, 0, 0], [2, 1, 0], [4, 0, 0]]);
  assert.deepEqual(alignment.target, [[0, 0, 0], [1, 0, 0], [2, 0, 0]]);
  assert.equal(
    alignment.summary,
    "vmobject-morph-align:source=source-curve:target=target-curve:curves=2:points=3:sourceInsert=0:targetInsert=1"
  );
});

test("samples smooth cubic paths densely for runtime curve rendering", () => {
  const samples = sampleSmoothVMobjectPathFromAnchors({
    conceptId: "curve",
    id: "curve",
    points: [[0, 0, 0], [1, 1, 0], [2, 0, 0]],
    samplesPerSegment: 4
  });

  assert.equal(samples.length, 9);
  assert.deepEqual(samples[0], [0, 0, 0]);
  assert.deepEqual(samples.at(-1), [2, 0, 0]);
  assert.notDeepEqual(samples[1], [1, 1, 0]);
  assert.equal(samples.every((point) => point.every(Number.isFinite)), true);
});

test("derives smooth path plans from runtime polyline objects", () => {
  const scene = buildMathSceneSpecForThreeDFamily({
    accent: "#22d3ee",
    state: {
      comparison: 5,
      depthValue: 1.4,
      familyId: "three-function-graph",
      mode: 0,
      primaryValue: 6,
      secondaryValue: 5,
      stateSummary: "family=three-function-graph;template=function-graph;value=6.000;comparison=5.000;depth=1.400",
      templateId: "function-graph",
      value: 6
    }
  });
  assert.ok(scene);
  const runtimeState = buildMathSceneRuntimeState(scene, 0);
  const plans = buildVMobjectSmoothPathPlansFromObjectGraph(runtimeState.objectGraph);
  const evidence = buildVMobjectSmoothPathEvidence(plans);

  assert.equal(plans.length, 1);
  assert.equal(plans[0].id, "function-curve");
  assert.equal(evidence.pathCount, 1);
  assert.equal(evidence.cubicSegmentCount, 71);
  assert.equal(evidence.anchorPointCount, 72);
  assert.equal(evidence.handlePointCount, 142);
  assert.equal(evidence.setPointsSmoothlyCount, 1);
  assert.equal(evidence.makeSmoothCount, 1);
  assert.equal(evidence.changeAnchorModeCount, 1);
  assert.equal(evidence.pathIds, "function-curve");
});

test("VMobject smooth-path source stays pure and feeds the evidence harness", () => {
  const source = fs.readFileSync("components/visualizations/three/manim/mathVMobjectSmoothPath.ts", "utf8");
  const evidenceSource = fs.readFileSync("components/visualizations/three/manim/mathEvidenceHarness.ts", "utf8");
  const runtimeSource = fs.readFileSync("components/visualizations/three/manim/MathSceneRuntime.tsx", "utf8");

  assert.doesNotMatch(source, /"use client"|@react-three\/fiber|@react-three\/drei|from "three"/);
  assert.match(source, /buildSmoothVMobjectPathFromAnchors/);
  assert.match(source, /sampleSmoothVMobjectPathFromAnchors/);
  assert.match(source, /buildVMobjectSmoothPathPlansFromObjectGraph/);
  assert.match(source, /vmobjectSmoothPathDataAttributes/);
  assert.match(evidenceSource, /buildVMobjectSmoothPathPlansFromObjectGraph/);
  assert.match(evidenceSource, /vmobjectSmoothPathDataAttributes/);
  assert.match(runtimeSource, /sampleSmoothVMobjectPathFromAnchors/);
});
