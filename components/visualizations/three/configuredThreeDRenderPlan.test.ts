import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { resolveConfiguredThreeDRenderPlan } from "./configuredThreeDRenderPlan";
import { familyForVisualizationTemplate, threeDFamilyIds } from "./threeDSceneMath";
import type { ThreeDFamilyId } from "./threeDSceneTypes";

test("configured Three.js render plan prefers explicit lab family over template fallback", () => {
  const plan = resolveConfiguredThreeDRenderPlan({
    comparison: 4,
    explicitFamilyId: "three-base-ten-blocks",
    mode: 2,
    templateId: "function-graph",
    threeDEnabled: true,
    value: 7
  });

  assert.equal(plan.familyId, "three-base-ten-blocks");
  assert.equal(plan.runtime, "mais-manim");
  assert.equal(plan.showThreeDCanvas, true);
  assert.equal(plan.state.familyId, "three-base-ten-blocks");
  assert.equal(plan.state.templateId, "function-graph");
  assert.match(plan.state.stateSummary, /family=three-base-ten-blocks/);
});

test("configured Three.js render plan keeps non-promoted standard labs on the 2D renderer", () => {
  const plan = resolveConfiguredThreeDRenderPlan({
    comparison: 3,
    explicitFamilyId: null,
    labId: "p1-counting-number-bonds",
    mode: 1,
    templateId: "angle-geometry",
    value: 5
  });

  assert.equal(plan.familyId, familyForVisualizationTemplate("angle-geometry"));
  assert.equal(plan.runtime, "mais-manim");
  assert.equal(plan.showThreeDCanvas, false);
  assert.equal(plan.state.templateId, "angle-geometry");
});

test("configured Three.js render plan allows standard PEP primary 3D capsules without premium routing", () => {
  const plan = resolveConfiguredThreeDRenderPlan({
    comparison: 3,
    coverageTier: "standard-3d",
    explicitFamilyId: "three-solid-nets-folding",
    labId: "pep-primary-p5-lower-volume-data",
    mode: 1,
    premiumLaunch: false,
    regionalPriority: "mainland",
    templateId: "array-area",
    threeDEnabled: true,
    value: 5
  });

  assert.equal(plan.familyId, "three-solid-nets-folding");
  assert.equal(plan.coverageTier, "standard-3d");
  assert.equal(plan.premiumLaunch, false);
  assert.equal(plan.regionalPriority, "mainland");
  assert.equal(plan.runtime, "mais-manim");
  assert.equal(plan.showThreeDCanvas, true);
});

test("configured Three.js render plan marks every approved family ready", () => {
  for (const familyId of threeDFamilyIds) {
    const plan = resolveConfiguredThreeDRenderPlan({
      comparison: 6,
      explicitFamilyId: familyId,
      mode: 0,
      templateId: "vector-conic-3d/strategy-map",
      threeDEnabled: true,
      value: 6
    });

    assert.equal(plan.showThreeDCanvas, true, `${familyId} should be routed to ThreeDLabCanvas`);
  }
});

test("configured Three.js render plan routes every approved family through MAIS Manim", () => {
  const migratedFamilies: Array<{
    familyId: ThreeDFamilyId;
    templateId:
      | "array-area"
      | "base-ten"
      | "clock-money-data"
      | "coordinate-transform"
      | "equation-balance"
      | "fraction-bar"
      | "function-graph"
      | "function-family"
      | "complex-plane"
      | "trig-unit-wave"
      | "probability-simulation"
      | "statistics-distribution"
      | "angle-geometry"
      | "number-line"
      | "measurement-scale"
      | "right-triangle-pythagorean"
      | "calculus-rate-area"
      | "vector-conic-3d/strategy-map";
  }> = [
    { familyId: "three-number-line", templateId: "number-line" },
    { familyId: "three-base-ten-blocks", templateId: "base-ten" },
    { familyId: "three-array-area-blocks", templateId: "array-area" },
    { familyId: "three-fraction-slices", templateId: "fraction-bar" },
    { familyId: "three-clock-money-data", templateId: "clock-money-data" },
    { familyId: "three-measurement-scale", templateId: "measurement-scale" },
    { familyId: "three-angle-geometry", templateId: "angle-geometry" },
    { familyId: "three-right-triangle-pythagorean", templateId: "right-triangle-pythagorean" },
    { familyId: "three-coordinate-transform", templateId: "coordinate-transform" },
    { familyId: "three-equation-balance", templateId: "equation-balance" },
    { familyId: "three-function-graph", templateId: "function-graph" },
    { familyId: "three-function-family", templateId: "function-family" },
    { familyId: "three-complex-plane", templateId: "complex-plane" },
    { familyId: "three-trig-unit-wave", templateId: "trig-unit-wave" },
    { familyId: "three-probability-machine", templateId: "probability-simulation" },
    { familyId: "three-statistics-distribution", templateId: "statistics-distribution" },
    { familyId: "three-calculus-rate-area", templateId: "calculus-rate-area" },
    { familyId: "three-vector-conic-strategy", templateId: "vector-conic-3d/strategy-map" },
    { familyId: "three-solid-nets-folding", templateId: "angle-geometry" },
    { familyId: "three-cross-section-slicer", templateId: "angle-geometry" },
    { familyId: "three-space-vectors-lines-planes", templateId: "vector-conic-3d/strategy-map" },
    { familyId: "three-conic-sections-deep", templateId: "vector-conic-3d/strategy-map" },
    { familyId: "three-optimization-modeling", templateId: "calculus-rate-area" },
    { familyId: "three-projection-views", templateId: "right-triangle-pythagorean" },
    { familyId: "three-statistical-inference-lab", templateId: "statistics-distribution" },
    { familyId: "three-curriculum-crosswalk-map", templateId: "vector-conic-3d/strategy-map" },
    { familyId: "three-exam-strategy-capstone", templateId: "vector-conic-3d/strategy-map" }
  ];

  assert.equal(migratedFamilies.length, threeDFamilyIds.length);

  for (const { familyId, templateId } of migratedFamilies) {
    const plan = resolveConfiguredThreeDRenderPlan({
      comparison: 5,
      explicitFamilyId: familyId,
      mode: 0,
      templateId,
      threeDEnabled: true,
      value: 6
    });

    assert.equal(plan.runtime, "mais-manim", `${familyId} should use the semantic Manim-style runtime`);
    assert.equal(plan.showThreeDCanvas, true);
  }
});

test("configured Three.js render plan infers premium regional smoke metadata from lab id", () => {
  const premiumPlan = resolveConfiguredThreeDRenderPlan({
    comparison: 5,
    explicitFamilyId: null,
    labId: "us-ca-math-s6-chapter-03",
    mode: 1,
    templateId: "statistics-distribution",
    value: 6
  });

  assert.equal(premiumPlan.coverageTier, "premium-3d");
  assert.equal(premiumPlan.premiumLaunch, true);
  assert.equal(premiumPlan.regionalPriority, "california");
  assert.equal(premiumPlan.showThreeDCanvas, true);

  const standardPlan = resolveConfiguredThreeDRenderPlan({
    comparison: 5,
    explicitFamilyId: null,
    labId: "p1-counting-number-bonds",
    mode: 1,
    templateId: "number-line",
    value: 6
  });

  assert.equal(standardPlan.coverageTier, "standard-3d");
  assert.equal(standardPlan.premiumLaunch, false);
  assert.equal(standardPlan.regionalPriority, undefined);
  assert.equal(standardPlan.showThreeDCanvas, false);

  const capstonePlan = resolveConfiguredThreeDRenderPlan({
    comparison: 5,
    coverageTier: "capstone-3d",
    explicitFamilyId: "three-curriculum-crosswalk-map",
    labId: "capstone-hk-mainland-crosswalk-explorer",
    mode: 1,
    premiumLaunch: true,
    regionalPriority: "cross-region",
    templateId: "vector-conic-3d/strategy-map",
    threeDEnabled: true,
    value: 6
  });

  assert.equal(capstonePlan.coverageTier, "capstone-3d");
  assert.equal(capstonePlan.premiumLaunch, true);
  assert.equal(capstonePlan.regionalPriority, "cross-region");
});

test("configured Three.js render plan keeps the reported California S6 function-rate lab on the audited 2D value renderer", () => {
  const plan = resolveConfiguredThreeDRenderPlan({
    comparison: 4,
    explicitFamilyId: null,
    labId: "us-ca-math-s6-chapter-04",
    mode: 0,
    templateId: "function-family",
    value: 5
  });

  assert.equal(plan.familyId, "three-function-family");
  assert.equal(plan.coverageTier, "premium-3d");
  assert.equal(plan.premiumLaunch, true);
  assert.equal(plan.regionalPriority, "california");
  assert.equal(plan.showThreeDCanvas, false);
  assert.equal(plan.state.templateId, "function-family");
});

test("configured renderer consumes the pure Three.js render plan", () => {
  const source = fs.readFileSync("components/visualizations/ConfiguredVisualizationLab.tsx", "utf8");

  assert.match(source, /import \{ resolveConfiguredThreeDRenderPlan \} from "@\/components\/visualizations\/three\/configuredThreeDRenderPlan"/);
  assert.match(source, /const threeDRenderPlan = resolveConfiguredThreeDRenderPlan\(/);
  assert.match(source, /labId: lab\?\.labId/);
  assert.match(source, /threeDEnabled: lab\?\.threeD\?\.enabled === true/);
  assert.match(source, /showThreeDCanvas = threeDRenderPlan\.showThreeDCanvas/);
  assert.match(source, /coverageTier=\{threeDRenderPlan\.coverageTier\}/);
  assert.match(source, /premiumLaunch=\{threeDRenderPlan\.premiumLaunch\}/);
  assert.match(source, /regionalPriority=\{threeDRenderPlan\.regionalPriority\}/);
  assert.match(source, /runtime=\{threeDRenderPlan\.runtime\}/);
  assert.match(source, /state=\{threeDRenderPlan\.state\}/);
});
