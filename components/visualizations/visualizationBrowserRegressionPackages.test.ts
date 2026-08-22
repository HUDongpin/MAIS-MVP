import assert from "node:assert/strict";
import test from "node:test";
import { visualizationLabCatalog } from "../../data/visualizationLabs";
import type { FeaturedLabDefinition } from "../../data/visualizationLabs";
import { isLivePremiumThreeDLab } from "./three/premiumThreeDLiveContract";
import { sceneVariantForThreeDFamily } from "./three/threeDSceneMath";
import { threeDCanvasRequiredDataAttributes } from "./three/threeDCanvasSurfaceContract";
import {
  buildVisualizationBrowserRegressionPlan,
  VISUALIZATION_BROWSER_REGRESSION_RUN_FROM_BEAT_CHECKPOINT_INVALIDATION_DATA_ATTRIBUTES,
  visualizationBrowserRegressionPlanDataAttributes,
  VISUALIZATION_BROWSER_REGRESSION_PLAN_SOURCE_CONTRACT
} from "./visualizationBrowserRegressionPackages";

const baseLab = {
  analyticsSource: "visualization-lab",
  category: { en: "3D", zh: "3D", zhHans: "3D" },
  description: { en: "Fixture", zh: "Fixture", zhHans: "Fixture" },
  gradeLabel: { en: "S4", zh: "S4", zhHans: "S4" },
  moduleId: "configured-visualization-lab",
  primaryForTopic: true,
  publisher: "HK",
  qaProfile: "geometry-heavy",
  templateConfig: {
    accent: "#22d3ee",
    focus: { en: "Fixture", zh: "Fixture", zhHans: "Fixture" },
    formula: { en: "f(x)", zh: "f(x)", zhHans: "f(x)" },
    variant: "fixture"
  },
  templateId: "function-graph",
  title: { en: "Fixture", zh: "Fixture", zhHans: "Fixture" },
  topicId: "fixture-topic"
} as const;

function fixtureLab(
  labId: string,
  grade: string,
  curriculumTrack: string,
  familyId = "three-function-graph"
) {
  return {
    ...baseLab,
    curriculumTrack,
    grade,
    gradeLabel: { en: grade, zh: grade, zhHans: grade },
    labId,
    threeD: {
      coverageTier: "standard-3d",
      enabled: true,
      fallbackTemplateId: "function-graph",
      familyId
    }
  } as unknown as FeaturedLabDefinition;
}

test("Visualization Lab browser regression plan chunks HK demo-safe sweeps", () => {
  const plan = buildVisualizationBrowserRegressionPlan(
    [
      fixtureLab("hk-s4-a", "S4", "HK"),
      fixtureLab("hk-s4-b", "S4", "HK"),
      fixtureLab("hk-s4-c", "S4", "HK"),
      fixtureLab("hk-s5-a", "S5", "HK"),
      fixtureLab("pep-s4-a", "S4", "MAINLAND_PEP_HIGH")
    ],
    { maxLabsPerPackage: 2 }
  );

  assert.equal(plan.sourceContract, VISUALIZATION_BROWSER_REGRESSION_PLAN_SOURCE_CONTRACT);
  assert.deepEqual(plan.hkDemoSafePackages.map((regressionPackage) => regressionPackage.id), [
    "hk-demo-S4-part-1",
    "hk-demo-S4-part-2",
    "hk-demo-S5-part-1"
  ]);
  assert.ok(plan.hkDemoSafePackages.every((regressionPackage) => regressionPackage.labIds.length <= 2));
  assert.ok(plan.hkDemoSafePackages.every((regressionPackage) => regressionPackage.commandEnv.VISUALIZATION_SWEEP_TRACKS === "HK"));
  assert.deepEqual(plan.nonHkDemoAccountTracks, ["MAINLAND_PEP_HIGH"]);
  assert.deepEqual(plan.accountScopeWarnings, [
    "MAINLAND_PEP_HIGH requires a non-HK demo account or per-lab registration; do not include it in the HK demo catalog sweep."
  ]);
});

test("Visualization Lab browser regression plan derives every live premium variant from the final catalog", () => {
  const plan = buildVisualizationBrowserRegressionPlan(visualizationLabCatalog);
  const expectedVariants = [...new Set(
    visualizationLabCatalog
      .filter(isLivePremiumThreeDLab)
      .map((lab) => sceneVariantForThreeDFamily(lab.threeD!.familyId))
  )].sort();

  assert.ok(expectedVariants.length > 0, "the live premium scene-variant plan must not be empty");
  assert.deepEqual(plan.premiumSceneVariants, expectedVariants);
  assert.equal(plan.premiumSceneVariantPackages.length, plan.premiumSceneVariants.length);
  assert.deepEqual(
    plan.premiumSceneVariantPackages.map((regressionPackage) => regressionPackage.sceneVariant).sort(),
    expectedVariants
  );
  for (const regressionPackage of plan.premiumSceneVariantPackages) {
    assert.equal(regressionPackage.labIds.length, 1);
    const lab = visualizationLabCatalog.find((candidate) => candidate.labId === regressionPackage.labIds[0]);
    assert.ok(lab, `${regressionPackage.id}: missing live catalog lab`);
    assert.equal(isLivePremiumThreeDLab(lab), true, `${regressionPackage.id}: candidate-only lab entered live plan`);
  }
});

test("Visualization Lab browser regression plan covers every HK lab without cross-track mixing", () => {
  const plan = buildVisualizationBrowserRegressionPlan(visualizationLabCatalog, { maxLabsPerPackage: 8 });
  const hkCatalogLabIds = visualizationLabCatalog
    .filter((lab) => lab.curriculumTrack === "HK")
    .map((lab) => lab.labId)
    .sort();
  const plannedLabIds = plan.hkDemoSafePackages.flatMap((regressionPackage) => regressionPackage.labIds).sort();

  assert.deepEqual(plannedLabIds, hkCatalogLabIds);
  assert.ok(plan.hkDemoSafePackages.every((regressionPackage) => regressionPackage.curriculumTracks.join(",") === "HK"));
  assert.ok(plan.hkDemoSafePackages.every((regressionPackage) => regressionPackage.labIds.length <= 8));
  assert.ok(plan.hkDemoSafePackages.every((regressionPackage) => regressionPackage.commandEnv.VISUALIZATION_SWEEP_LABS));
});

test("Visualization Lab browser regression plan serializes stable A11 handoff attributes", () => {
  const plan = buildVisualizationBrowserRegressionPlan(visualizationLabCatalog, { maxLabsPerPackage: 8 });
  const attributes = visualizationBrowserRegressionPlanDataAttributes(plan);
  const expectedProjectionState = plan.premiumSceneVariants.includes("projection-views") ? "included" : "missing";

  assert.equal(
    attributes["data-viz-browser-regression-plan-source-contract"],
    VISUALIZATION_BROWSER_REGRESSION_PLAN_SOURCE_CONTRACT
  );
  assert.equal(
    attributes["data-viz-browser-regression-plan-premium-variant-count"],
    String(plan.premiumSceneVariants.length)
  );
  assert.equal(attributes["data-viz-browser-regression-plan-projection-views"], expectedProjectionState);
  assert.equal(attributes["data-viz-browser-regression-plan-hk-package-max-labs"], "8");
  assert.equal(
    attributes["data-viz-browser-regression-plan-premium-variants"],
    plan.premiumSceneVariants.join(",")
  );
  assert.match(attributes["data-viz-browser-regression-plan-non-hk-tracks"], /MAINLAND_PEP_HIGH/);
});

test("Visualization Lab browser regression plan publishes root attributes A11 should smoke-check", () => {
  const plan = buildVisualizationBrowserRegressionPlan(visualizationLabCatalog, { maxLabsPerPackage: 8 });
  const attributes = visualizationBrowserRegressionPlanDataAttributes(plan);
  const expectedRunFromBeatCheckpointInvalidationAttributes = [
    "data-viz-manim-run-from-beat-checkpoint-invalidates-count",
    "data-viz-manim-run-from-beat-checkpoint-invalidated-keys",
    "data-viz-manim-run-from-beat-checkpoint-invalidation-summary",
    "data-viz-manim-run-from-beat-checkpoint-retained-keys-after-restore",
    "data-viz-manim-run-from-beat-checkpoint-restore-action"
  ] as const satisfies typeof VISUALIZATION_BROWSER_REGRESSION_RUN_FROM_BEAT_CHECKPOINT_INVALIDATION_DATA_ATTRIBUTES;

  assert.deepEqual(
    plan.requiredRunFromBeatCheckpointInvalidationDataAttributes,
    expectedRunFromBeatCheckpointInvalidationAttributes
  );
  assert.ok(
    expectedRunFromBeatCheckpointInvalidationAttributes.every((attribute) =>
      plan.requiredRootDataAttributes.includes(attribute)
    )
  );
  assert.ok(
    expectedRunFromBeatCheckpointInvalidationAttributes.every((attribute) =>
      threeDCanvasRequiredDataAttributes.includes(attribute as (typeof threeDCanvasRequiredDataAttributes)[number])
    )
  );
  assert.equal(
    attributes["data-viz-browser-regression-plan-run-from-beat-checkpoint-invalidation-attributes"],
    expectedRunFromBeatCheckpointInvalidationAttributes.join(",")
  );
  assert.equal(
    attributes["data-viz-browser-regression-plan-required-root-attribute-count"],
    String(plan.requiredRootDataAttributes.length)
  );
});
