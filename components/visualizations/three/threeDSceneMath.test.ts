import assert from "node:assert/strict";
import test from "node:test";
import type { ThreeDRegionalPriority } from "./threeDSceneTypes";
import {
  buildThreeDStateSummary,
  familyForVisualizationTemplate,
  isPremiumThreeDLaunchLab,
  premiumThreeDLaunchLabIds,
  regionalPriorityForThreeDLaunchLab,
  sceneVariantForThreeDFamily,
  threeDFamilyIds,
  threeDTemplateFamilyMap
} from "./threeDSceneMath";

test("maps all existing visualization templates to Three.js families", () => {
  assert.equal(Object.keys(threeDTemplateFamilyMap).length, 18);
  assert.equal(threeDTemplateFamilyMap["number-line"], "three-number-line");
  assert.equal(threeDTemplateFamilyMap["base-ten"], "three-base-ten-blocks");
  assert.equal(threeDTemplateFamilyMap["array-area"], "three-array-area-blocks");
  assert.equal(threeDTemplateFamilyMap["fraction-bar"], "three-fraction-slices");
  assert.equal(threeDTemplateFamilyMap["clock-money-data"], "three-clock-money-data");
  assert.equal(threeDTemplateFamilyMap["measurement-scale"], "three-measurement-scale");
  assert.equal(threeDTemplateFamilyMap["angle-geometry"], "three-angle-geometry");
  assert.equal(threeDTemplateFamilyMap["right-triangle-pythagorean"], "three-right-triangle-pythagorean");
  assert.equal(threeDTemplateFamilyMap["coordinate-transform"], "three-coordinate-transform");
  assert.equal(threeDTemplateFamilyMap["equation-balance"], "three-equation-balance");
  assert.equal(threeDTemplateFamilyMap["function-graph"], "three-function-graph");
  assert.equal(threeDTemplateFamilyMap["function-family"], "three-function-family");
  assert.equal(threeDTemplateFamilyMap["complex-plane"], "three-complex-plane");
  assert.equal(threeDTemplateFamilyMap["trig-unit-wave"], "three-trig-unit-wave");
  assert.equal(threeDTemplateFamilyMap["probability-simulation"], "three-probability-machine");
  assert.equal(threeDTemplateFamilyMap["statistics-distribution"], "three-statistics-distribution");
  assert.equal(threeDTemplateFamilyMap["calculus-rate-area"], "three-calculus-rate-area");
  assert.equal(threeDTemplateFamilyMap["vector-conic-3d/strategy-map"], "three-vector-conic-strategy");
});

test("exposes 26 total Three.js families", () => {
  assert.equal(threeDFamilyIds.length, 26);
  assert.equal(new Set(threeDFamilyIds).size, 26);
});

test("returns finite math summaries for every family", () => {
  for (const familyId of threeDFamilyIds) {
    const summary = buildThreeDStateSummary({
      comparison: 7,
      familyId,
      mode: 1,
      templateId: "function-family",
      value: 6
    });

    assert.equal(summary.familyId, familyId);
    assert.ok(Number.isFinite(summary.primaryValue));
    assert.ok(Number.isFinite(summary.secondaryValue));
    assert.ok(Number.isFinite(summary.depthValue));
    assert.match(summary.stateSummary, /^family=/);
  }
});

test("selects the approved regional premium launch bands", () => {
  const counts: Record<ThreeDRegionalPriority, number> = {
    mainland: 0,
    california: 0,
    "hong-kong": 0,
    "cross-region": 0
  };

  assert.equal(premiumThreeDLaunchLabIds.size, 80);

  for (const labId of premiumThreeDLaunchLabIds) {
    const region = regionalPriorityForThreeDLaunchLab(labId);
    assert.ok(region, `${labId} should have a premium launch region`);
    counts[region] += 1;
    assert.equal(isPremiumThreeDLaunchLab(labId), true);
  }

  assert.deepEqual(counts, {
    mainland: 40,
    california: 12,
    "hong-kong": 9,
    "cross-region": 19
  });

  assert.equal(isPremiumThreeDLaunchLab("pep-high-s5-conics"), true);
  assert.equal(isPremiumThreeDLaunchLab("us-ca-math-s6-chapter-05"), true);
  assert.equal(isPremiumThreeDLaunchLab("calculus"), true);
  assert.equal(isPremiumThreeDLaunchLab("capstone-hk-mainland-crosswalk-explorer"), true);
  assert.equal(isPremiumThreeDLaunchLab("p1-counting-number-bonds"), false);
});

test("looks up fallback family for a template", () => {
  assert.equal(familyForVisualizationTemplate("calculus-rate-area"), "three-calculus-rate-area");
  assert.equal(familyForVisualizationTemplate("vector-conic-3d/strategy-map"), "three-vector-conic-strategy");
});

test("premium deep Three.js families resolve to bespoke scene variants", () => {
  assert.equal(sceneVariantForThreeDFamily("three-solid-nets-folding"), "solid-net-fold");
  assert.equal(sceneVariantForThreeDFamily("three-cross-section-slicer"), "cross-section-slicer");
  assert.equal(sceneVariantForThreeDFamily("three-space-vectors-lines-planes"), "space-vector-plane");
  assert.equal(sceneVariantForThreeDFamily("three-conic-sections-deep"), "conic-section-deep");
  assert.equal(sceneVariantForThreeDFamily("three-optimization-modeling"), "optimization-landscape");
  assert.equal(sceneVariantForThreeDFamily("three-curriculum-crosswalk-map"), "curriculum-crosswalk");
  assert.equal(sceneVariantForThreeDFamily("three-exam-strategy-capstone"), "exam-strategy-capstone");
  assert.notEqual(sceneVariantForThreeDFamily("three-statistical-inference-lab"), "distribution-machine");
});
