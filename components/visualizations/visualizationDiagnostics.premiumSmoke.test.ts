import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  buildPremiumThreeDTopicPagePath,
  buildVisualizationLabHref,
  selectThreeDSceneVariantSmokeLabs,
  selectPremiumThreeDSceneVariantSmokeLabs
} from "./visualizationDiagnostics";

const baseLab = {
  analyticsSource: "visualization-lab",
  category: { en: "3D", zh: "3D", zhHans: "3D" },
  description: { en: "Fixture", zh: "Fixture", zhHans: "Fixture" },
  grade: "S5",
  gradeLabel: { en: "S5", zh: "S5", zhHans: "S5" },
  moduleId: "configured-visualization-lab",
  primaryForTopic: true,
  publisher: "MAINLAND_PEP",
  qaProfile: "geometry-heavy",
  templateConfig: {
    accent: "#22d3ee",
    focus: { en: "Fixture", zh: "Fixture", zhHans: "Fixture" },
    formula: { en: "f(x)", zh: "f(x)", zhHans: "f(x)" },
    variant: "fixture"
  },
  templateId: "vector-conic-3d/strategy-map",
  title: { en: "Fixture", zh: "Fixture", zhHans: "Fixture" },
  topicId: "fixture-topic"
} as const;

test("premium scene variant selector works without importing the live visualization catalog", () => {
  const labs = [
    {
      ...baseLab,
      labId: "fixture-conics",
      curriculumTrack: "MAINLAND_PEP_HIGH",
      threeD: {
        coverageTier: "premium-3d",
        enabled: true,
        fallbackTemplateId: "vector-conic-3d/strategy-map",
        familyId: "three-conic-sections-deep",
        premiumLaunch: true,
        regionalPriority: "mainland"
      }
    },
    {
      ...baseLab,
      labId: "fixture-statistics",
      curriculumTrack: "US",
      publisher: "US_CA_MATH",
      threeD: {
        coverageTier: "premium-3d",
        enabled: true,
        fallbackTemplateId: "statistics-distribution",
        familyId: "three-statistical-inference-lab",
        premiumLaunch: true,
        regionalPriority: "california"
      }
    },
    {
      ...baseLab,
      labId: "fixture-duplicate-conics",
      curriculumTrack: "MAINLAND_PEP_HIGH",
      threeD: {
        coverageTier: "premium-3d",
        enabled: true,
        fallbackTemplateId: "vector-conic-3d/strategy-map",
        familyId: "three-conic-sections-deep",
        premiumLaunch: true,
        regionalPriority: "mainland"
      }
    }
  ];

  const targets = selectPremiumThreeDSceneVariantSmokeLabs(labs as never);

  assert.deepEqual(targets.map((target) => target.sceneVariant), [
    "conic-section-deep",
    "statistical-inference"
  ]);
  assert.deepEqual(targets.map((target) => target.lab.labId), [
    "fixture-conics",
    "fixture-statistics"
  ]);

  for (const target of targets) {
    assert.equal(target.href, buildVisualizationLabHref(target.lab));
    assert.equal(new URL(target.href, "https://mais.local").pathname, buildPremiumThreeDTopicPagePath(target.lab));
  }
});

test("scene variant selector covers standard-only Three.js variants without importing the live catalog", () => {
  const labs = [
    {
      ...baseLab,
      labId: "fixture-array-area",
      curriculumTrack: "HK",
      templateId: "array-area",
      threeD: {
        coverageTier: "standard-3d",
        enabled: true,
        fallbackTemplateId: "array-area",
        familyId: "three-array-area-blocks"
      }
    },
    {
      ...baseLab,
      labId: "fixture-base-ten",
      curriculumTrack: "HK",
      templateId: "base-ten",
      threeD: {
        coverageTier: "standard-3d",
        enabled: true,
        fallbackTemplateId: "base-ten",
        familyId: "three-base-ten-blocks"
      }
    },
    {
      ...baseLab,
      labId: "fixture-balance",
      curriculumTrack: "MAINLAND_PEP_JUNIOR",
      templateId: "equation-balance",
      threeD: {
        coverageTier: "standard-3d",
        enabled: true,
        fallbackTemplateId: "equation-balance",
        familyId: "three-equation-balance"
      }
    },
    {
      ...baseLab,
      labId: "fixture-conics-premium",
      curriculumTrack: "MAINLAND_PEP_HIGH",
      threeD: {
        coverageTier: "premium-3d",
        enabled: true,
        fallbackTemplateId: "vector-conic-3d/strategy-map",
        familyId: "three-conic-sections-deep",
        premiumLaunch: true,
        regionalPriority: "mainland"
      }
    },
    {
      ...baseLab,
      labId: "fixture-disabled-three-d",
      curriculumTrack: "HK",
      threeD: {
        coverageTier: "standard-3d",
        enabled: false,
        fallbackTemplateId: "fraction-bar",
        familyId: "three-fraction-slices"
      }
    }
  ];

  const targets = selectThreeDSceneVariantSmokeLabs(labs as never);

  assert.deepEqual(targets.map((target) => target.sceneVariant), [
    "array-blocks",
    "balance-scale",
    "conic-section-deep",
    "place-value-blocks"
  ]);
  assert.deepEqual(targets.map((target) => target.lab.labId), [
    "fixture-array-area",
    "fixture-balance",
    "fixture-conics-premium",
    "fixture-base-ten"
  ]);

  const standardTargets = targets.filter((target) => !target.lab.threeD?.premiumLaunch);
  for (const target of standardTargets) {
    const url = new URL(target.href, "https://mais.local");

    assert.equal(url.pathname, "/visualization-lab");
    assert.equal(url.searchParams.get("lab"), target.lab.labId);
    assert.equal(url.searchParams.get("grade"), target.lab.grade);
  }
});

test("premium CAPSTONE topic pages are allowed through the authenticated learner curriculum gate", () => {
  const pageSource = fs.readFileSync("components/visualizations/VisualizationLabPage.tsx", "utf8");

  assert.match(pageSource, /lab\.curriculumTrack === "CAPSTONE"/);
  assert.match(pageSource, /premiumLaunch/);
  assert.match(pageSource, /labMatchesLearnerCurriculum/);
});

test("premium direct topic labs render the same template and 3D family as the catalog", async () => {
  const [{ getPremiumThreeDDirectLab }, { premiumThreeDLaunchLabIds }, { getVisualizationLabByLabId }] = await Promise.all([
    import("./premiumThreeDDirectLabs"),
    import("./three/threeDSceneMath"),
    import("../../data/visualizationLabs")
  ]);

  for (const labId of premiumThreeDLaunchLabIds) {
    const directLab = getPremiumThreeDDirectLab(labId);
    const catalogLab = getVisualizationLabByLabId(labId);

    assert.ok(directLab, `${labId} should resolve on the premium direct route`);
    assert.ok(catalogLab, `${labId} should exist in the visualization catalog`);
    assert.equal(
      directLab!.templateId,
      catalogLab!.templateId,
      `${labId} direct-route template must match the catalog (regenerate catalogTemplateByPremiumLabId)`
    );
    assert.equal(
      directLab!.threeD?.familyId,
      catalogLab!.threeD?.familyId,
      `${labId} direct-route 3D family must match the catalog`
    );
  }
});
