import assert from "node:assert/strict";
import test from "node:test";
import { buildVisualizationBrowserRegressionPlan } from "../../visualizationBrowserRegressionPackages";
import { buildMathSceneTeachingInspectionTargetQueue } from "./mathSceneTeachingInspectionTargets";
import { classifyManimReviewPackage } from "./mathSceneReviewPackages";
import {
  browserRegressionLabs,
  buildMathSceneV2CatalogDecoupledFixtureHandoffManifest,
  buildMathSceneV2CatalogDecoupledFixtureManifest,
  mathSceneV2CatalogDecoupledFixtureHandoffDataAttributes,
  mathSceneV2CatalogDecoupledFixtureDataAttributes,
  MATH_SCENE_V2_CATALOG_DECOUPLED_FIXTURE_SOURCE_CONTRACT,
  renderedReviewLabs
} from "./mathSceneV2CatalogDecoupledFixtures";

test("MAIS Manim v2 catalog-decoupled fixtures cover every rendered teaching target", () => {
  const targetFamilyIds = buildMathSceneTeachingInspectionTargetQueue().targets.map((target) => target.familyId);
  const renderedFamilyIds = renderedReviewLabs.map((lab) => lab.threeD?.familyId);

  assert.equal(renderedReviewLabs.length, 12);
  assert.deepEqual(new Set(renderedFamilyIds), new Set(targetFamilyIds));
  assert.equal(renderedReviewLabs.every((lab) => lab.threeD?.enabled), true);
});

test("MAIS Manim v2 catalog-decoupled fixtures keep A11 projection-view browser representative", () => {
  const projectionLab = browserRegressionLabs.find((lab) => lab.threeD?.familyId === "three-projection-views");

  assert.equal(browserRegressionLabs.length, renderedReviewLabs.length + 1);
  assert.ok(projectionLab);
  assert.equal(projectionLab.labId, "pep-junior-s3-lower-inverse-similarity-trigonometry");
  assert.equal(projectionLab.threeD?.premiumLaunch, true);
});

test("MAIS Manim v2 catalog-decoupled fixtures can build the browser regression plan without live catalog input", () => {
  const plan = buildVisualizationBrowserRegressionPlan(browserRegressionLabs as never, { maxLabsPerPackage: 8 });
  const plannedLabIds = [
    ...plan.hkDemoSafePackages,
    ...plan.premiumSceneVariantPackages
  ].flatMap((regressionPackage) => regressionPackage.labIds);

  assert.ok(plannedLabIds.includes("pep-junior-s3-lower-inverse-similarity-trigonometry"));
  assert.ok(plan.premiumSceneVariants.includes("projection-views"));
  assert.ok(plan.hkDemoSafePackages.length > 0);
  assert.equal(new Set(plannedLabIds).size, plannedLabIds.length);
});

test("MAIS Manim v2 catalog-decoupled fixtures belong to the evidence review package", () => {
  assert.equal(classifyManimReviewPackage("mathSceneV2CatalogDecoupledFixtures.ts"), "evidence");
  assert.equal(classifyManimReviewPackage("mathSceneV2CatalogDecoupledFixtures.test.ts"), "evidence");
});

test("MAIS Manim v2 catalog-decoupled fixtures serialize review manifest attributes", () => {
  const manifest = buildMathSceneV2CatalogDecoupledFixtureManifest();
  const attributes = mathSceneV2CatalogDecoupledFixtureDataAttributes(manifest);

  assert.equal(manifest.sourceContract, MATH_SCENE_V2_CATALOG_DECOUPLED_FIXTURE_SOURCE_CONTRACT);
  assert.equal(manifest.renderedReviewLabCount, 12);
  assert.equal(manifest.browserRegressionLabCount, 13);
  assert.equal(manifest.projectionViewsIncluded, true);
  assert.equal(manifest.liveCatalogInputRequired, false);
  assert.deepEqual(manifest.missingRenderedFamilyIds, []);
  assert.ok(manifest.renderedFamilyIds.includes("three-function-graph"));
  assert.ok(manifest.browserFamilyIds.includes("three-projection-views"));
  assert.equal(
    attributes["data-viz-manim-v2-catalog-decoupled-fixture-source-contract"],
    MATH_SCENE_V2_CATALOG_DECOUPLED_FIXTURE_SOURCE_CONTRACT
  );
  assert.equal(attributes["data-viz-manim-v2-catalog-decoupled-fixture-rendered"], "12");
  assert.equal(attributes["data-viz-manim-v2-catalog-decoupled-fixture-browser"], "13");
  assert.equal(attributes["data-viz-manim-v2-catalog-decoupled-fixture-projection-views"], "included");
  assert.equal(attributes["data-viz-manim-v2-catalog-decoupled-fixture-live-catalog"], "not-required");
  assert.equal(attributes["data-viz-manim-v2-catalog-decoupled-fixture-missing-families"], "none");
});

test("MAIS Manim v2 catalog-decoupled fixtures serialize A11/A18/A22 handoff manifest attributes", () => {
  const handoff = buildMathSceneV2CatalogDecoupledFixtureHandoffManifest();
  const attributes = mathSceneV2CatalogDecoupledFixtureHandoffDataAttributes(handoff);

  assert.deepEqual(handoff.ownerAgentIds, ["A11", "A18", "A22"]);
  assert.deepEqual(handoff.requiredDownstreamEvidenceIds, [
    "a11-browser-regression",
    "a18-rendered-teaching-review",
    "a22-clean-release-slice"
  ]);
  assert.equal(handoff.a11BrowserLabIds.length, 13);
  assert.equal(handoff.a18RenderedReviewLabIds.length, 12);
  assert.equal(handoff.a22LiveCatalogInputPolicy, "not-required");
  assert.ok(handoff.a11BrowserLabIds.includes("pep-junior-s3-lower-inverse-similarity-trigonometry"));
  assert.ok(handoff.a18RenderedReviewLabIds.includes("s3-function-graph"));
  assert.equal(
    attributes["data-viz-manim-v2-catalog-decoupled-handoff-owners"],
    "A11,A18,A22"
  );
  assert.equal(attributes["data-viz-manim-v2-catalog-decoupled-handoff-a11-lab-count"], "13");
  assert.equal(attributes["data-viz-manim-v2-catalog-decoupled-handoff-a18-lab-count"], "12");
  assert.equal(attributes["data-viz-manim-v2-catalog-decoupled-handoff-a22-live-catalog"], "not-required");
  assert.match(
    attributes["data-viz-manim-v2-catalog-decoupled-handoff-required-evidence"],
    /a11-browser-regression\|a18-rendered-teaching-review\|a22-clean-release-slice/
  );
});
