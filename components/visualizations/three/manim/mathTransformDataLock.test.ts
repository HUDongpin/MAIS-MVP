import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { buildMathObjectTransformPlan } from "./mathObjectTransform";
import {
  TRANSFORM_DATA_LOCK_SOURCE_CONTRACT,
  buildRuntimeTransformDataLockPlan,
  buildTransformDataLockPlan,
  serializeTransformDataLockEvidence,
  summarizeTransformDataLockEvidence,
  transformDataLockEvidenceDataAttributes
} from "./mathTransformDataLock";
import type { MathObjectSpec, Vec3 } from "./mathSceneTypes";

test("summarizes Transform.begin data-lock evidence for browser QA", () => {
  const sourceVector: MathObjectSpec = {
    type: "vector",
    id: "source-vector",
    conceptId: "locked-vector",
    colorRole: "parameter",
    from: [0, 0, 0],
    to: [1, 0, 0]
  };
  const targetVector: MathObjectSpec = {
    type: "vector",
    id: "target-vector",
    conceptId: "locked-vector",
    colorRole: "parameter",
    from: [0, 0, 0],
    to: [1, 1, 0]
  };
  const vectorPlan = buildTransformDataLockPlan(buildMathObjectTransformPlan(sourceVector, targetVector));
  const pointPlan = buildRuntimeTransformDataLockPlan({
    objectId: "runtime-point",
    sourceRenderState: { kind: "point", position: [2, 3, 0] },
    targetObjectId: "runtime-point-target",
    targetRenderState: { kind: "point", position: [2, 3, 0] }
  });
  const evidence = summarizeTransformDataLockEvidence([vectorPlan, pointPlan]);
  const attributes = transformDataLockEvidenceDataAttributes(evidence);
  const serialized = serializeTransformDataLockEvidence(evidence);

  assert.equal(vectorPlan.totalPointCount, 2);
  assert.deepEqual(vectorPlan.lockedPointIndices, [0]);
  assert.equal(vectorPlan.lockedPointCount, 1);
  assert.equal(vectorPlan.movingPointCount, 1);
  assert.equal(pointPlan.lockedPointCount, 1);
  assert.equal(evidence.planCount, 2);
  assert.equal(evidence.totalPointCount, 3);
  assert.equal(evidence.lockedPointCount, 2);
  assert.equal(evidence.movingPointCount, 1);
  assert.equal(evidence.objectIds, "runtime-point,source-vector");
  assert.equal(evidence.targetObjectIds, "runtime-point-target,target-vector");
  assert.equal(evidence.kindSummary, "vector=1;point=1");
  assert.equal(evidence.sourceContract, TRANSFORM_DATA_LOCK_SOURCE_CONTRACT);
  assert.equal(
    evidence.summary,
    "transform-data-lock:plans=2:total=3:locked=2:moving=1:objects=runtime-point,source-vector:kinds=vector=1;point=1"
  );
  assert.equal(attributes["data-viz-manim-transform-data-lock-plan-count"], "2");
  assert.equal(attributes["data-viz-manim-transform-data-lock-total-point-count"], "3");
  assert.equal(attributes["data-viz-manim-transform-data-lock-locked-point-count"], "2");
  assert.equal(attributes["data-viz-manim-transform-data-lock-moving-point-count"], "1");
  assert.equal(attributes["data-viz-manim-transform-data-lock-object-ids"], "runtime-point,source-vector");
  assert.equal(attributes["data-viz-manim-transform-data-lock-target-object-ids"], "runtime-point-target,target-vector");
  assert.equal(attributes["data-viz-manim-transform-data-lock-kind-summary"], "vector=1;point=1");
  assert.equal(attributes["data-viz-manim-transform-data-lock-source-contract"], TRANSFORM_DATA_LOCK_SOURCE_CONTRACT);
  assert.equal(attributes["data-viz-manim-transform-data-lock-summary"], evidence.summary);
  assert.doesNotMatch(serialized, /<\/script|undefined|NaN|Infinity/i);
  assert.deepEqual(JSON.parse(serialized), evidence);
});

test("runtime polyline data-lock uses aligned curve samples instead of last-point padding", () => {
  const runtimeCurvePlan = buildRuntimeTransformDataLockPlan({
    objectId: "source-curve",
    sourceRenderState: {
      kind: "polyline",
      points: [
        [0, 0, 0],
        [2, 0, 0]
      ]
    },
    targetObjectId: "target-curve",
    targetRenderState: {
      kind: "polyline",
      points: [
        [0, 0, 0],
        [1, 0, 0],
        [2, 0, 0]
      ]
    }
  });

  assert.equal(runtimeCurvePlan.kind, "curve");
  assert.equal(runtimeCurvePlan.totalPointCount, 3);
  assert.deepEqual(runtimeCurvePlan.lockedPointIndices, [0, 1, 2]);
  assert.equal(runtimeCurvePlan.lockedPointCount, 3);
  assert.equal(runtimeCurvePlan.movingPointCount, 0);
  assert.equal(
    runtimeCurvePlan.sourceSummary,
    "runtime-polyline-align:source=2:target=3:aligned=3:strategy=arc-length"
  );
  const evidence = summarizeTransformDataLockEvidence([runtimeCurvePlan]);
  const attributes = transformDataLockEvidenceDataAttributes(evidence);

  assert.equal(
    evidence.alignmentSummary,
    "runtime-polyline-align:source=2:target=3:aligned=3:strategy=arc-length"
  );
  assert.equal(
    attributes["data-viz-manim-transform-data-lock-alignment-summary"],
    "runtime-polyline-align:source=2:target=3:aligned=3:strategy=arc-length"
  );
});

test("runtime surface data-lock uses aligned surface samples instead of flattened last-point padding", () => {
  const sourceRows = [
    [
      [0, 0, 0],
      [2, 0, 0]
    ],
    [
      [0, 2, 0],
      [2, 2, 0]
    ]
  ] satisfies Vec3[][];
  const targetRows = [
    [
      [0, 0, 0],
      [1, 0, 0],
      [2, 0, 0]
    ],
    [
      [0, 1, 0],
      [1, 1, 0],
      [2, 1, 0]
    ],
    [
      [0, 2, 0],
      [1, 2, 0],
      [2, 2, 0]
    ]
  ] satisfies Vec3[][];
  const runtimeSurfacePlan = buildRuntimeTransformDataLockPlan({
    objectId: "source-surface",
    sourceRenderState: {
      columns: 2,
      kind: "surface",
      points: sourceRows.flat(),
      rows: 2,
      wireframeColumns: [
        [sourceRows[0][0], sourceRows[1][0]],
        [sourceRows[0][1], sourceRows[1][1]]
      ],
      wireframeRows: sourceRows
    },
    targetObjectId: "target-surface",
    targetRenderState: {
      columns: 3,
      kind: "surface",
      points: targetRows.flat(),
      rows: 3,
      wireframeColumns: [
        [targetRows[0][0], targetRows[1][0], targetRows[2][0]],
        [targetRows[0][1], targetRows[1][1], targetRows[2][1]],
        [targetRows[0][2], targetRows[1][2], targetRows[2][2]]
      ],
      wireframeRows: targetRows
    }
  });

  assert.equal(runtimeSurfacePlan.kind, "surface");
  assert.equal(runtimeSurfacePlan.totalPointCount, 9);
  assert.deepEqual(runtimeSurfacePlan.lockedPointIndices, [0, 1, 2, 3, 4, 5, 6, 7, 8]);
  assert.equal(runtimeSurfacePlan.lockedPointCount, 9);
  assert.equal(runtimeSurfacePlan.movingPointCount, 0);
  assert.equal(
    runtimeSurfacePlan.sourceSummary,
    "runtime-surface-align:source=2x2:target=3x3:aligned=3x3:strategy=surface-grid"
  );
  const evidence = summarizeTransformDataLockEvidence([runtimeSurfacePlan]);
  const attributes = transformDataLockEvidenceDataAttributes(evidence);

  assert.equal(
    evidence.alignmentSummary,
    "runtime-surface-align:source=2x2:target=3x3:aligned=3x3:strategy=surface-grid"
  );
  assert.equal(
    attributes["data-viz-manim-transform-data-lock-alignment-summary"],
    "runtime-surface-align:source=2x2:target=3x3:aligned=3x3:strategy=surface-grid"
  );
});

test("Transform data-lock evidence stays pure and source-owned", () => {
  const dataLockSource = fs.readFileSync("components/visualizations/three/manim/mathTransformDataLock.ts", "utf8");
  const evidenceSource = fs.readFileSync("components/visualizations/three/manim/mathEvidenceHarness.ts", "utf8");

  assert.match(dataLockSource, /TRANSFORM_DATA_LOCK_SOURCE_CONTRACT/);
  assert.match(dataLockSource, /buildTransformDataLockPlan/);
  assert.match(dataLockSource, /buildRuntimeTransformDataLockPlan/);
  assert.match(dataLockSource, /summarizeTransformDataLockEvidence/);
  assert.match(dataLockSource, /transformDataLockEvidenceDataAttributes/);
  assert.match(dataLockSource, /serializeTransformDataLockEvidence/);
  assert.match(dataLockSource, /resampleCurveByArcLength/);
  assert.match(dataLockSource, /alignSurfaceSamplesForMorph/);
  assert.match(evidenceSource, /summarizeTransformDataLockEvidence/);
  assert.match(evidenceSource, /transformDataLockEvidenceDataAttributes/);
  assert.equal(TRANSFORM_DATA_LOCK_SOURCE_CONTRACT, "Transform.begin:lock_matching_data");
  assert.doesNotMatch(dataLockSource, /"use client"|@react-three\/fiber|@react-three\/drei|from "three"/);
});
