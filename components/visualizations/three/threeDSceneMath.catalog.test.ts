import assert from "node:assert/strict";
import test from "node:test";
import { visualizationLabCatalog, visualizationTrackLabels } from "../../../data/visualizationLabs";
import { getPremiumThreeDDirectLab } from "../premiumThreeDDirectLabs";
import { isLivePremiumThreeDLab } from "./premiumThreeDLiveContract";
import type { ThreeDRegionalPriority } from "./threeDSceneTypes";
import { threeDFamilyIds } from "./threeDSceneMath";

const mainlandPepPrimaryThreeDCapsuleLabIds = [
  "pep-primary-p1-upper-shapes-position-time",
  "pep-primary-p2-upper-length-angles-observation",
  "pep-primary-p5-lower-volume-data"
] as const;

const mainlandPepJuniorSpatialImagination3DLabIds = [
  "pep-junior-s1-upper-geometric-figures",
  "pep-junior-s1-lower-lines-coordinates",
  "pep-junior-s3-lower-inverse-similarity-trigonometry"
] as const;

const mainlandPepJuniorStandard3DCapsuleLabIds = mainlandPepJuniorSpatialImagination3DLabIds.slice(0, 2);
const hongKongStandardThreeDCapsuleFamilyByLabId = {
  "p3-multiplication-division": "three-array-area-blocks",
  "p4-angles": "three-angle-geometry",
  "p4-large-numbers": "three-number-line",
  "p6-ratio-proportion": "three-fraction-slices",
  "statistics-s1": "three-statistics-distribution"
} as const;
const hongKongStandardThreeDCapsuleLabIds = Object.keys(hongKongStandardThreeDCapsuleFamilyByLabId);

test("catalog metadata keeps learner-live premium routes separate from historical 3D candidates", () => {
  const premiumCounts: Record<ThreeDRegionalPriority, number> = {
    mainland: 0,
    california: 0,
    "hong-kong": 0,
    "cross-region": 0
  };
  const threeDEnabled = visualizationLabCatalog.filter((lab) => lab.threeD?.enabled);
  const premium = visualizationLabCatalog.filter(isLivePremiumThreeDLab);
  const nonThreeDLabs = visualizationLabCatalog.filter((lab) => !lab.threeD?.enabled);
  const standard3DCapsules = threeDEnabled.filter((lab) => !lab.threeD?.premiumLaunch);

  assert.ok(visualizationLabCatalog.length >= threeDEnabled.length);
  assert.equal(nonThreeDLabs.length, visualizationLabCatalog.length - threeDEnabled.length);
  assert.ok(threeDEnabled.length >= premium.length, "every premium live lab must also be 3D-enabled");
  assert.ok(
    standard3DCapsules.every((lab) => lab.threeD?.coverageTier === "standard-3d"),
    "an enabled non-premium capsule must use the standard coverage tier"
  );
  for (const lab of premium) {
    const directLab = getPremiumThreeDDirectLab(lab.labId);
    assert.ok(directLab, `${lab.labId} should resolve from the generated live registry`);
    assert.equal(directLab.moduleId, "configured-visualization-lab");
  }
  assert.equal(visualizationLabCatalog.find((lab) => lab.labId === "p1-counting-number-bonds")?.threeD?.enabled, false);
  for (const [labId, familyId] of Object.entries(hongKongStandardThreeDCapsuleFamilyByLabId)) {
    const lab = visualizationLabCatalog.find((entry) => entry.labId === labId);
    assert.equal(lab?.threeD?.coverageTier, "standard-3d", `${labId} should retain its historical classroom-capsule metadata`);
    assert.equal(lab?.threeD?.familyId, familyId, `${labId} should route to the expected family`);
    assert.equal(lab?.threeD?.premiumLaunch, false, `${labId} should not become a premium topic page`);
    assert.equal(lab?.threeD?.regionalPriority, "hong-kong", `${labId} should keep HK representative metadata`);
  }
  assert.ok(
    visualizationLabCatalog.find((lab) => lab.labId === "pep-high-s5-conics")?.threeD,
    "historical Mainland authoring metadata should remain auditable even when learner-live flags are disabled"
  );

  for (const lab of premium) {
    assert.ok(lab.threeD?.regionalPriority, `${lab.labId} should have a regional 3D launch priority`);
    premiumCounts[lab.threeD.regionalPriority] += 1;
  }

  assert.equal(
    Object.values(premiumCounts).reduce((total, count) => total + count, 0),
    premium.length,
    "catalog-derived regional live counts must partition the exact double-flag live set"
  );
});

test("Mainland PEP junior keeps one Visualization Lab track with a focused spatial-imagination 3D pack", () => {
  const pepJuniorLabs = visualizationLabCatalog.filter((lab) => lab.curriculumTrack === "MAINLAND_PEP_JUNIOR");
  const spatialCandidateIds = new Set<string>(mainlandPepJuniorSpatialImagination3DLabIds);
  const standardCandidateIds = new Set<string>(mainlandPepJuniorStandard3DCapsuleLabIds);
  const pepJunior3DCandidates = pepJuniorLabs.filter((lab) => spatialCandidateIds.has(lab.labId));
  const standardPepJunior3DCapsules = pepJunior3DCandidates.filter((lab) => standardCandidateIds.has(lab.labId));
  const premiumPepJuniorPackLab = pepJuniorLabs.find((lab) => lab.labId === "pep-junior-s3-lower-inverse-similarity-trigonometry");

  assert.equal(pepJuniorLabs.length, 11);
  assert.deepEqual(
    pepJunior3DCandidates.map((lab) => lab.labId).sort(),
    [...mainlandPepJuniorSpatialImagination3DLabIds].sort()
  );
  assert.deepEqual(
    standardPepJunior3DCapsules.map((lab) => lab.labId).sort(),
    [...mainlandPepJuniorStandard3DCapsuleLabIds].sort()
  );
  assert.equal(premiumPepJuniorPackLab?.labId, "pep-junior-s3-lower-inverse-similarity-trigonometry");
  assert.equal(premiumPepJuniorPackLab?.threeD?.coverageTier, "premium-3d");
  assert.equal(premiumPepJuniorPackLab?.threeD?.familyId, "three-projection-views");
  assert.equal(premiumPepJuniorPackLab?.templateId, "right-triangle-pythagorean");
  assert.equal(premiumPepJuniorPackLab?.templateConfig.formula?.zhHans, "正视图 + 俯视图 + 左视图 -> 空间模型");

  for (const lab of standardPepJunior3DCapsules) {
    assert.equal(lab.threeD?.coverageTier, "standard-3d", `${lab.labId} should be a standard classroom capsule`);
    assert.equal(lab.threeD?.premiumLaunch, false, `${lab.labId} should not become a premium topic page`);
    assert.equal(lab.threeD?.regionalPriority, "mainland", `${lab.labId} should keep Mainland curriculum metadata`);
  }

  assert.equal(
    visualizationLabCatalog.find((lab) => lab.labId === "pep-junior-s1-upper-geometric-figures")?.threeD?.familyId,
    "three-solid-nets-folding"
  );
  assert.equal(
    visualizationLabCatalog.find((lab) => lab.labId === "pep-junior-s1-lower-lines-coordinates")?.threeD?.familyId,
    "three-coordinate-transform"
  );
  assert.equal(
    visualizationTrackLabels.MAINLAND_PEP_JUNIOR.zhHans,
    "中国大陆人教版初中"
  );
  assert.deepEqual(
    Object.keys(visualizationTrackLabels).filter((track) => track === "MAINLAND_PEP_JUNIOR_3D"),
    [],
    "The junior pack should not create a separate 3D curriculum track"
  );
});

test("Mainland PEP primary keeps one Visualization Lab track with three auditable 3D candidates", () => {
  const pepPrimaryLabs = visualizationLabCatalog.filter((lab) => lab.curriculumTrack === "MAINLAND_PEP_PRIMARY");
  const primaryCandidateIds = new Set<string>(mainlandPepPrimaryThreeDCapsuleLabIds);
  const standard3DCapsules = pepPrimaryLabs.filter((lab) => primaryCandidateIds.has(lab.labId));
  const p6CoordinateMap = pepPrimaryLabs.find((lab) => lab.labId === "pep-primary-p6-upper-coordinate-data");

  assert.equal(pepPrimaryLabs.length, 24);
  assert.deepEqual(
    standard3DCapsules.map((lab) => lab.labId).sort(),
    [...mainlandPepPrimaryThreeDCapsuleLabIds].sort()
  );

  for (const lab of standard3DCapsules) {
    assert.equal(lab.threeD?.coverageTier, "standard-3d", `${lab.labId} should be a standard classroom capsule`);
    assert.equal(lab.threeD?.premiumLaunch, false, `${lab.labId} should not become a premium topic page`);
    assert.equal(lab.threeD?.regionalPriority, "mainland", `${lab.labId} should keep Mainland curriculum metadata`);
  }

  assert.equal(
    visualizationLabCatalog.find((lab) => lab.labId === "pep-primary-p1-upper-shapes-position-time")?.threeD?.familyId,
    "three-solid-nets-folding"
  );
  assert.equal(
    visualizationLabCatalog.find((lab) => lab.labId === "pep-primary-p2-upper-length-angles-observation")?.threeD?.familyId,
    "three-solid-nets-folding"
  );
  assert.equal(
    visualizationLabCatalog.find((lab) => lab.labId === "pep-primary-p5-lower-volume-data")?.threeD?.familyId,
    "three-solid-nets-folding"
  );
  assert.equal(
    visualizationLabCatalog.find((lab) => lab.labId === "pep-primary-p5-lower-volume-data")?.templateConfig.formula?.zhHans,
    "底面积 x 高 = 体积"
  );

  assert.equal(p6CoordinateMap?.templateId, "coordinate-transform");
  assert.equal(p6CoordinateMap?.threeD?.enabled, false, "P6 scale and direction should stay as a 2.5D coordinate/map lab");
  assert.deepEqual(
    Object.keys(visualizationTrackLabels).filter((track) => track.startsWith("MAINLAND_PEP")),
    ["MAINLAND_PEP_PRIMARY", "MAINLAND_PEP_JUNIOR", "MAINLAND_PEP_HIGH"]
  );
});

test("catalog metadata exercises every approved Three.js family", () => {
  const liveFamilyIds = new Set(
    visualizationLabCatalog
      .map((lab) => lab.threeD?.familyId)
      .filter((familyId): familyId is (typeof threeDFamilyIds)[number] => Boolean(familyId))
  );

  assert.deepEqual([...liveFamilyIds].sort(), [...threeDFamilyIds].sort());
  assert.equal(
    visualizationLabCatalog.find((lab) => lab.labId === "pep-high-s4-solid-geometry-intro")?.threeD?.familyId,
    "three-solid-nets-folding"
  );
  assert.equal(
    visualizationLabCatalog.find((lab) => lab.labId === "pep-high-s5-conics")?.threeD?.familyId,
    "three-conic-sections-deep"
  );
  assert.equal(
    visualizationLabCatalog.find((lab) => lab.labId === "capstone-hk-mainland-crosswalk-explorer")?.threeD?.familyId,
    "three-curriculum-crosswalk-map"
  );
  assert.equal(
    visualizationLabCatalog.find((lab) => lab.labId === "functions")?.threeD?.familyId,
    "three-function-graph"
  );
  assert.equal(
    visualizationLabCatalog.find((lab) => lab.labId === "advanced-functions")?.threeD?.familyId,
    "three-function-family"
  );
});
