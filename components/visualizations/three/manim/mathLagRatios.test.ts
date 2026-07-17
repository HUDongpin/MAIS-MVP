import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  LAG_RATIO_SOURCE_CONTRACT,
  LAG_RATIO_SUB_ALPHA_POLICY,
  buildLagRatioCatalog,
  lagRatioCatalogDataAttributes,
  serializeLagRatioCatalog,
  summarizeLagRatioCatalog
} from "./mathLagRatios";
import type { MathSceneAnimatePlanSpec, MathSceneAnimationCompositionSpec } from "./mathSceneTypes";

const animationPlans: MathSceneAnimatePlanSpec[] = [
  {
    duration: 1.2,
    id: "curve-attention-lift",
    lagRatio: 0.18,
    objectId: "function-curve",
    operations: [{ type: "shift", vector: [0, 0.18, 0.08] }],
    targetObjectId: "function-curve:target"
  },
  {
    duration: 1.2,
    id: "probe-attention-pulse",
    objectId: "moving-probe",
    operations: [{ type: "setColorRole", colorRole: "attention" }],
    targetObjectId: "moving-probe:target"
  }
];

const animationCompositions: MathSceneAnimationCompositionSpec[] = [
  {
    animationPlanIds: ["curve-attention-lift", "probe-attention-pulse"],
    id: "attention-lagged-start",
    lagRatio: 0.2,
    type: "laggedStart"
  }
];

test("builds a deterministic lag-ratio catalog from animation plans and compositions", () => {
  const catalog = buildLagRatioCatalog({
    animationCompositions,
    animationPlans,
    sceneId: "lag-ratio-probe"
  });

  assert.equal(catalog.animationPlanCount, 2);
  assert.equal(catalog.compositionCount, 1);
  assert.equal(catalog.authoredLagRatioCount, 2);
  assert.equal(catalog.nonZeroLagRatioCount, 2);
  assert.equal(catalog.zeroLagRatioCount, 1);
  assert.equal(catalog.maxLagRatio, 0.2);
  assert.equal(catalog.objectIds, "function-curve,moving-probe");
  assert.equal(catalog.compositionIds, "attention-lagged-start");
  assert.equal(catalog.sourceContract, LAG_RATIO_SOURCE_CONTRACT);
  assert.equal(catalog.subAlphaPolicy, LAG_RATIO_SUB_ALPHA_POLICY);
  assert.deepEqual(
    catalog.entries.map((entry) => [entry.sourceType, entry.sourceId, entry.lagRatio, entry.authored]),
    [
      ["animationPlan", "curve-attention-lift", 0.18, true],
      ["animationPlan", "probe-attention-pulse", 0, false],
      ["animationComposition", "attention-lagged-start", 0.2, true]
    ]
  );
  assert.equal(
    summarizeLagRatioCatalog(catalog),
    "lagRatios:lag-ratio-probe:plans=2:compositions=1:authored=2:nonzero=2:zero=1:max=0.200:objects=function-curve,moving-probe:compositions=attention-lagged-start"
  );
});

test("serializes lag-ratio catalog fields as browser QA data attributes", () => {
  const catalog = buildLagRatioCatalog({
    animationCompositions,
    animationPlans,
    sceneId: "lag-ratio-probe"
  });

  assert.deepEqual(lagRatioCatalogDataAttributes(catalog), {
    "data-viz-manim-lag-ratio-animation-plan-count": "2",
    "data-viz-manim-lag-ratio-authored-count": "2",
    "data-viz-manim-lag-ratio-composition-count": "1",
    "data-viz-manim-lag-ratio-composition-ids": "attention-lagged-start",
    "data-viz-manim-lag-ratio-max": "0.200",
    "data-viz-manim-lag-ratio-nonzero-count": "2",
    "data-viz-manim-lag-ratio-object-ids": "function-curve,moving-probe",
    "data-viz-manim-lag-ratio-source-contract": LAG_RATIO_SOURCE_CONTRACT,
    "data-viz-manim-lag-ratio-sub-alpha-policy": LAG_RATIO_SUB_ALPHA_POLICY,
    "data-viz-manim-lag-ratio-summary":
      "lagRatios:lag-ratio-probe:plans=2:compositions=1:authored=2:nonzero=2:zero=1:max=0.200:objects=function-curve,moving-probe:compositions=attention-lagged-start",
    "data-viz-manim-lag-ratio-zero-count": "1"
  });

  const json = serializeLagRatioCatalog(catalog);
  assert.doesNotMatch(json, /</);
  assert.deepEqual(JSON.parse(json), {
    animationPlanCount: 2,
    authoredLagRatioCount: 2,
    compositionCount: 1,
    compositionIds: "attention-lagged-start",
    entries: [
      {
        authored: true,
        lagRatio: 0.18,
        objectId: "function-curve",
        sourceId: "curve-attention-lift",
        sourceType: "animationPlan"
      },
      {
        authored: false,
        lagRatio: 0,
        objectId: "moving-probe",
        sourceId: "probe-attention-pulse",
        sourceType: "animationPlan"
      },
      {
        authored: true,
        lagRatio: 0.2,
        objectId: "none",
        sourceId: "attention-lagged-start",
        sourceType: "animationComposition"
      }
    ],
    maxLagRatio: 0.2,
    nonZeroLagRatioCount: 2,
    objectIds: "function-curve,moving-probe",
    sceneId: "lag-ratio-probe",
    sourceContract: LAG_RATIO_SOURCE_CONTRACT,
    subAlphaPolicy: LAG_RATIO_SUB_ALPHA_POLICY,
    summary:
      "lagRatios:lag-ratio-probe:plans=2:compositions=1:authored=2:nonzero=2:zero=1:max=0.200:objects=function-curve,moving-probe:compositions=attention-lagged-start",
    zeroLagRatioCount: 1
  });
});

test("lag-ratio catalog remains a pure Manim timing contract", () => {
  const source = fs.readFileSync("components/visualizations/three/manim/mathLagRatios.ts", "utf8");

  assert.doesNotMatch(source, /"use client"|@react-three\/fiber|@react-three\/drei|from "three"/);
  assert.match(source, /LAG_RATIO_SOURCE_CONTRACT/);
  assert.match(source, /LAG_RATIO_SUB_ALPHA_POLICY/);
  assert.match(source, /serializeLagRatioCatalog/);
  assert.match(source, /animationCompositions/);
  assert.match(source, /animationPlans/);
});
