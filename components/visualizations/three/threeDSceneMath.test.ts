import assert from "node:assert/strict";
import test from "node:test";
import type { ThreeDRegionalPriority } from "./threeDSceneTypes";
import {
  buildThreeDStateSummary,
  familyForVisualizationTemplate,
  heldCandidatePremiumThreeDLabIds,
  familyForVisualizationLab,
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

test("exposes 27 total Three.js families", () => {
  assert.equal(threeDFamilyIds.length, 27);
  assert.equal(new Set(threeDFamilyIds).size, 27);
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

  assert.equal(premiumThreeDLaunchLabIds.size, 42);

  for (const labId of premiumThreeDLaunchLabIds) {
    const region = regionalPriorityForThreeDLaunchLab(labId);
    assert.ok(region, `${labId} should have a premium launch region`);
    counts[region] += 1;
    assert.equal(isPremiumThreeDLaunchLab(labId), true);
  }

  assert.deepEqual(counts, {
    mainland: 24,
    california: 0,
    "hong-kong": 9,
    "cross-region": 9
  });

  assert.equal(isPremiumThreeDLaunchLab("pep-high-s5-conics"), true);
  assert.equal(isPremiumThreeDLaunchLab("us-ca-math-s6-chapter-05"), false);
  assert.equal(isPremiumThreeDLaunchLab("calculus"), true);
  assert.equal(isPremiumThreeDLaunchLab("capstone-hk-mainland-crosswalk-explorer"), true);
  assert.equal(isPremiumThreeDLaunchLab("p1-counting-number-bonds"), false);
  assert.ok([...heldCandidatePremiumThreeDLabIds].every((labId) => !isPremiumThreeDLaunchLab(labId)));
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
  assert.equal(sceneVariantForThreeDFamily("three-projection-views"), "projection-views");
  assert.equal(sceneVariantForThreeDFamily("three-curriculum-crosswalk-map"), "curriculum-crosswalk");
  assert.equal(sceneVariantForThreeDFamily("three-exam-strategy-capstone"), "exam-strategy-capstone");
  assert.notEqual(sceneVariantForThreeDFamily("three-statistical-inference-lab"), "distribution-machine");
});

test("Mainland PEP junior spatial-imagination pack maps only targeted labs to deep spatial families", () => {
  const packLabIds = [
    "pep-junior-s1-upper-geometric-figures",
    "pep-junior-s1-lower-lines-coordinates",
    "pep-junior-s3-lower-inverse-similarity-trigonometry"
  ] as const;

  assert.equal(
    familyForVisualizationLab("pep-junior-s1-upper-geometric-figures", "angle-geometry"),
    "three-solid-nets-folding"
  );
  assert.equal(
    familyForVisualizationLab("pep-junior-s1-lower-lines-coordinates", "coordinate-transform"),
    "three-coordinate-transform"
  );
  assert.equal(
    familyForVisualizationLab("pep-junior-s3-lower-inverse-similarity-trigonometry", "right-triangle-pythagorean"),
    "three-projection-views"
  );
  assert.equal(sceneVariantForThreeDFamily("three-projection-views" as never), "projection-views");

  assert.equal(isPremiumThreeDLaunchLab("pep-junior-s1-upper-geometric-figures"), false);
  assert.equal(isPremiumThreeDLaunchLab("pep-junior-s1-lower-lines-coordinates"), false);
  assert.equal(isPremiumThreeDLaunchLab("pep-junior-s3-lower-inverse-similarity-trigonometry"), true);
  assert.equal(regionalPriorityForThreeDLaunchLab("pep-junior-s3-lower-inverse-similarity-trigonometry"), "cross-region");

  const nonSpatialPepJuniorLabs = [
    "pep-junior-s1-upper-rational-numbers",
    "pep-junior-s1-upper-expressions-linear-equations",
    "pep-junior-s1-lower-equations-inequalities-data",
    "pep-junior-s2-upper-polynomials-fractions",
    "pep-junior-s2-lower-linear-functions-data",
    "pep-junior-s3-upper-quadratics-circle-probability"
  ];

  for (const labId of nonSpatialPepJuniorLabs) {
    assert.equal(
      packLabIds.includes(labId as (typeof packLabIds)[number]),
      false,
      `${labId} should not be part of the dedicated junior spatial-imagination 3D pack`
    );
  }
});
