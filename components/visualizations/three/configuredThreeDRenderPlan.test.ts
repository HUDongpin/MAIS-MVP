import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { resolveConfiguredThreeDRenderPlan } from "./configuredThreeDRenderPlan";
import { familyForVisualizationTemplate, threeDFamilyIds } from "./threeDSceneMath";
import type { ThreeDFamilyId } from "./threeDSceneTypes";

test("configured Three.js render plan prefers explicit lab family over template fallback", () => {
  const plan = resolveConfiguredThreeDRenderPlan({
    comparison: 4,
    explicitFamilyId: "three-conic-sections-deep",
    mode: 2,
    templateId: "function-graph",
    value: 7
  });

  assert.equal(plan.familyId, "three-conic-sections-deep");
  assert.equal(plan.runtime, "primitive");
  assert.equal(plan.showThreeDCanvas, true);
  assert.equal(plan.state.familyId, "three-conic-sections-deep");
  assert.equal(plan.state.templateId, "function-graph");
  assert.match(plan.state.stateSummary, /family=three-conic-sections-deep/);
});

test("configured Three.js render plan falls back from template for standard labs", () => {
  const plan = resolveConfiguredThreeDRenderPlan({
    comparison: 3,
    explicitFamilyId: null,
    mode: 1,
    templateId: "statistics-distribution",
    value: 5
  });

  assert.equal(plan.familyId, familyForVisualizationTemplate("statistics-distribution"));
  assert.equal(plan.runtime, "primitive");
  assert.equal(plan.showThreeDCanvas, true);
  assert.equal(plan.state.templateId, "statistics-distribution");
});

test("configured Three.js render plan marks every approved family ready", () => {
  for (const familyId of threeDFamilyIds) {
    const plan = resolveConfiguredThreeDRenderPlan({
      comparison: 6,
      explicitFamilyId: familyId,
      mode: 0,
      templateId: "vector-conic-3d/strategy-map",
      value: 6
    });

    assert.equal(plan.showThreeDCanvas, true, `${familyId} should be routed to ThreeDLabCanvas`);
  }
});

test("configured Three.js render plan routes migrated families through MAIS Manim", () => {
  const migratedFamilies: Array<{
    familyId: ThreeDFamilyId;
    templateId:
      | "function-graph"
      | "function-family"
      | "complex-plane"
      | "trig-unit-wave"
      | "calculus-rate-area"
      | "vector-conic-3d/strategy-map";
  }> = [
    { familyId: "three-function-graph", templateId: "function-graph" },
    { familyId: "three-function-family", templateId: "function-family" },
    { familyId: "three-complex-plane", templateId: "complex-plane" },
    { familyId: "three-trig-unit-wave", templateId: "trig-unit-wave" },
    { familyId: "three-calculus-rate-area", templateId: "calculus-rate-area" },
    { familyId: "three-vector-conic-strategy", templateId: "vector-conic-3d/strategy-map" },
    { familyId: "three-space-vectors-lines-planes", templateId: "vector-conic-3d/strategy-map" }
  ];

  for (const { familyId, templateId } of migratedFamilies) {
    const plan = resolveConfiguredThreeDRenderPlan({
      comparison: 5,
      explicitFamilyId: familyId,
      mode: 0,
      templateId,
      value: 6
    });

    assert.equal(plan.runtime, "mais-manim", `${familyId} should use the semantic Manim-style runtime`);
    assert.equal(plan.showThreeDCanvas, true);
  }
});

test("configured renderer consumes the pure Three.js render plan", () => {
  const source = fs.readFileSync("components/visualizations/ConfiguredVisualizationLab.tsx", "utf8");

  assert.match(source, /import \{ resolveConfiguredThreeDRenderPlan \} from "@\/components\/visualizations\/three\/configuredThreeDRenderPlan"/);
  assert.match(source, /const threeDRenderPlan = resolveConfiguredThreeDRenderPlan\(/);
  assert.match(source, /showThreeDCanvas = threeDRenderPlan\.showThreeDCanvas/);
  assert.match(source, /runtime=\{threeDRenderPlan\.runtime\}/);
  assert.match(source, /state=\{threeDRenderPlan\.state\}/);
});
