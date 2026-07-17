import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  SUB_ALPHA_SOURCE_CONTRACT,
  SUB_ALPHA_WINDOW_POLICY,
  buildSubAlphaSchedule,
  serializeSubAlphaSchedule,
  subAlphaScheduleDataAttributes,
  summarizeSubAlphaSchedule
} from "./mathSubAlphaSchedule";
import type { MathAnimationRuntimeFrame } from "./mathAnimationRuntime";
import { TRANSFORM_FAMILY_ALIGNMENT_ZIP_POLICY, type TransformFamilyAlignmentPlan } from "./mathTransformFamilyAlignment";

const frame: MathAnimationRuntimeFrame = {
  active: true,
  activePlanIds: ["curve-lift"],
  nodeFrames: [
    {
      boundingBox: { kind: "empty" },
      laggedProgress: 0.75,
      objectId: "function-curve",
      progress: 0.84375,
      rateFunction: "smooth",
      rawProgress: 0.375,
      renderState: { kind: "empty" }
    },
    {
      boundingBox: { kind: "empty" },
      laggedProgress: 0.25,
      objectId: "moving-probe",
      progress: 0.15625,
      rateFunction: "smooth",
      rawProgress: 0.375,
      renderState: { kind: "empty" }
    },
    {
      boundingBox: { kind: "empty" },
      laggedProgress: 0,
      objectId: "probe-trace",
      progress: 0,
      rateFunction: "smooth",
      rawProgress: 0.375,
      renderState: { kind: "empty" }
    }
  ],
  objectId: "function-curve",
  progress: 0.316406,
  targetObjectId: "function-curve:target"
};

const familyAlignment: TransformFamilyAlignmentPlan = {
  entries: [
    {
      conceptId: "function-rule",
      interpolationObjectId: "function-curve",
      kind: "matched",
      sourceId: "function-curve",
      targetId: "function-curve:target"
    },
    {
      conceptId: "probe-point",
      interpolationObjectId: "moving-probe",
      kind: "matched",
      sourceId: "moving-probe",
      targetId: "moving-probe:target"
    }
  ],
  sourceRootId: "function-curve",
  targetRootId: "function-curve:target"
};

test("summarizes Manim interpolate_mobject sub-alpha rows from runtime node frames", () => {
  const schedule = buildSubAlphaSchedule({
    frame,
    familyAlignment,
    sceneId: "sub-alpha-probe"
  });

  assert.equal(schedule.activePlanCount, 1);
  assert.equal(schedule.completeNodeCount, 0);
  assert.equal(schedule.delayedNodeCount, 2);
  assert.equal(schedule.easedMax, 0.84375);
  assert.equal(schedule.easedMin, 0);
  assert.equal(schedule.laggedMax, 0.75);
  assert.equal(schedule.laggedMin, 0);
  assert.equal(schedule.leadingNodeCount, 1);
  assert.equal(
    schedule.nodeWindowSummary,
    "function-curve:raw=0.375>lagged=0.750>eased=0.844;moving-probe:raw=0.375>lagged=0.250>eased=0.156;probe-trace:raw=0.375>lagged=0.000>eased=0.000"
  );
  assert.equal(schedule.nodeFrameCount, 3);
  assert.equal(schedule.objectIds, "function-curve,moving-probe,probe-trace");
  assert.equal(schedule.familyZipCoveredNodeCount, 2);
  assert.equal(schedule.familyZipMissingNodeCount, 1);
  assert.equal(schedule.familyZipPolicy, TRANSFORM_FAMILY_ALIGNMENT_ZIP_POLICY);
  assert.equal(schedule.familyZipSequence, "function-curve|function-curve|function-curve:target;moving-probe|moving-probe|moving-probe:target");
  assert.equal(schedule.familyZipTupleCount, 2);
  assert.equal(schedule.familyZipUncoveredObjectIds, "probe-trace");
  assert.equal(schedule.partialNodeCount, 2);
  assert.equal(schedule.rateFunctionIds, "smooth");
  assert.equal(schedule.rawMax, 0.375);
  assert.equal(schedule.rawMin, 0.375);
  assert.equal(schedule.sourceContract, SUB_ALPHA_SOURCE_CONTRACT);
  assert.equal(schedule.staggeredNodeCount, 3);
  assert.equal(schedule.windowPolicy, SUB_ALPHA_WINDOW_POLICY);
  assert.equal(schedule.zeroNodeCount, 1);
  assert.equal(
    summarizeSubAlphaSchedule(schedule),
    "subAlpha:sub-alpha-probe:nodes=3:plans=1:raw=0.375..0.375:lag=0.000..0.750:eased=0.000..0.844:staggered=3:lead=1:delay=2:zero=1:partial=2:complete=0:rates=smooth:objects=function-curve,moving-probe,probe-trace"
  );
});

test("sub-alpha family zip rows preserve ghost source and target tuple ids", () => {
  const alignmentWithEnterExitRows: TransformFamilyAlignmentPlan = {
    entries: [
      ...familyAlignment.entries,
      {
        conceptId: "trace-history",
        interpolationObjectId: "probe-trace",
        kind: "exiting",
        sourceId: "probe-trace"
      },
      {
        conceptId: "tangent-line",
        interpolationObjectId: "target-tangent",
        kind: "entering",
        targetId: "target-tangent"
      }
    ],
    sourceRootId: "function-curve",
    targetRootId: "function-curve:target"
  };

  const schedule = buildSubAlphaSchedule({
    frame,
    familyAlignment: alignmentWithEnterExitRows,
    sceneId: "sub-alpha-ghost-rows"
  });

  assert.equal(schedule.familyZipCoveredNodeCount, 3);
  assert.equal(schedule.familyZipMissingNodeCount, 0);
  assert.equal(schedule.familyZipTupleCount, 4);
  assert.equal(schedule.familyZipUncoveredObjectIds, "none");
  assert.equal(
    schedule.familyZipSequence,
    "function-curve|function-curve|function-curve:target;moving-probe|moving-probe|moving-probe:target;probe-trace|probe-trace|ghost-target:probe-trace;target-tangent|ghost-source:target-tangent|target-tangent"
  );
});

test("serializes sub-alpha schedule evidence as browser QA data attributes", () => {
  const schedule = buildSubAlphaSchedule({
    frame,
    familyAlignment,
    sceneId: "sub-alpha-probe"
  });

  assert.deepEqual(subAlphaScheduleDataAttributes(schedule), {
    "data-viz-manim-sub-alpha-active-plan-count": "1",
    "data-viz-manim-sub-alpha-complete-node-count": "0",
    "data-viz-manim-sub-alpha-delayed-node-count": "2",
    "data-viz-manim-sub-alpha-eased-max": "0.844",
    "data-viz-manim-sub-alpha-eased-min": "0.000",
    "data-viz-manim-sub-alpha-eased-range": "0.000..0.844",
    "data-viz-manim-sub-alpha-family-zip-covered-node-count": "2",
    "data-viz-manim-sub-alpha-family-zip-missing-node-count": "1",
    "data-viz-manim-sub-alpha-family-zip-policy": TRANSFORM_FAMILY_ALIGNMENT_ZIP_POLICY,
    "data-viz-manim-sub-alpha-family-zip-sequence":
      "function-curve|function-curve|function-curve:target;moving-probe|moving-probe|moving-probe:target",
    "data-viz-manim-sub-alpha-family-zip-tuple-count": "2",
    "data-viz-manim-sub-alpha-family-zip-uncovered-object-ids": "probe-trace",
    "data-viz-manim-sub-alpha-lagged-max": "0.750",
    "data-viz-manim-sub-alpha-lagged-min": "0.000",
    "data-viz-manim-sub-alpha-lagged-range": "0.000..0.750",
    "data-viz-manim-sub-alpha-leading-node-count": "1",
    "data-viz-manim-sub-alpha-node-window-summary":
      "function-curve:raw=0.375>lagged=0.750>eased=0.844;moving-probe:raw=0.375>lagged=0.250>eased=0.156;probe-trace:raw=0.375>lagged=0.000>eased=0.000",
    "data-viz-manim-sub-alpha-node-count": "3",
    "data-viz-manim-sub-alpha-object-ids": "function-curve,moving-probe,probe-trace",
    "data-viz-manim-sub-alpha-partial-node-count": "2",
    "data-viz-manim-sub-alpha-rate-function-ids": "smooth",
    "data-viz-manim-sub-alpha-raw-max": "0.375",
    "data-viz-manim-sub-alpha-raw-min": "0.375",
    "data-viz-manim-sub-alpha-raw-range": "0.375..0.375",
    "data-viz-manim-sub-alpha-source-contract": SUB_ALPHA_SOURCE_CONTRACT,
    "data-viz-manim-sub-alpha-staggered-node-count": "3",
    "data-viz-manim-sub-alpha-summary":
      "subAlpha:sub-alpha-probe:nodes=3:plans=1:raw=0.375..0.375:lag=0.000..0.750:eased=0.000..0.844:staggered=3:lead=1:delay=2:zero=1:partial=2:complete=0:rates=smooth:objects=function-curve,moving-probe,probe-trace",
    "data-viz-manim-sub-alpha-window-policy": SUB_ALPHA_WINDOW_POLICY,
    "data-viz-manim-sub-alpha-zero-node-count": "1"
  });

  const json = serializeSubAlphaSchedule(schedule);
  assert.doesNotMatch(json, /</);
  assert.deepEqual(JSON.parse(json), {
    activePlanCount: 1,
    completeNodeCount: 0,
    delayedNodeCount: 2,
    easedMax: 0.84375,
    easedMin: 0,
    easedRange: "0.000..0.844",
    familyZipCoveredNodeCount: 2,
    familyZipMissingNodeCount: 1,
    familyZipPolicy: TRANSFORM_FAMILY_ALIGNMENT_ZIP_POLICY,
    familyZipSequence: "function-curve|function-curve|function-curve:target;moving-probe|moving-probe|moving-probe:target",
    familyZipTupleCount: 2,
    familyZipUncoveredObjectIds: "probe-trace",
    laggedMax: 0.75,
    laggedMin: 0,
    laggedRange: "0.000..0.750",
    leadingNodeCount: 1,
    nodeWindowSummary:
      "function-curve:raw=0.375>lagged=0.750>eased=0.844;moving-probe:raw=0.375>lagged=0.250>eased=0.156;probe-trace:raw=0.375>lagged=0.000>eased=0.000",
    nodeFrameCount: 3,
    objectIds: "function-curve,moving-probe,probe-trace",
    partialNodeCount: 2,
    rateFunctionIds: "smooth",
    rawMax: 0.375,
    rawMin: 0.375,
    rawRange: "0.375..0.375",
    sceneId: "sub-alpha-probe",
    sourceContract: SUB_ALPHA_SOURCE_CONTRACT,
    staggeredNodeCount: 3,
    summary:
      "subAlpha:sub-alpha-probe:nodes=3:plans=1:raw=0.375..0.375:lag=0.000..0.750:eased=0.000..0.844:staggered=3:lead=1:delay=2:zero=1:partial=2:complete=0:rates=smooth:objects=function-curve,moving-probe,probe-trace",
    windowPolicy: SUB_ALPHA_WINDOW_POLICY,
    zeroNodeCount: 1
  });
});

test("sub-alpha schedule stays pure and documents the interpolate_mobject source contract", () => {
  const source = fs.readFileSync("components/visualizations/three/manim/mathSubAlphaSchedule.ts", "utf8");

  assert.doesNotMatch(source, /"use client"|@react-three\/fiber|@react-three\/drei|from "three"/);
  assert.match(source, /SUB_ALPHA_SOURCE_CONTRACT/);
  assert.match(source, /SUB_ALPHA_WINDOW_POLICY/);
  assert.match(source, /TRANSFORM_FAMILY_ALIGNMENT_ZIP_POLICY/);
  assert.match(source, /familyAlignment/);
  assert.match(source, /serializeSubAlphaSchedule/);
  assert.match(source, /interpolate_mobject/);
  assert.match(source, /laggedProgress/);
});
