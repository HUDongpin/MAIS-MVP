import assert from "node:assert/strict";
import test from "node:test";
import { visualizationLabCatalog, visualizationTrackLabels } from "../../../data/visualizationLabs";
import type { ThreeDRegionalPriority } from "./threeDSceneTypes";
import { dormantThreeDFamilyIds, threeDFamilyIds } from "./threeDSceneMath";

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

test("catalog metadata marks every lab and preserves the premium regional launch allocation", () => {
  const premiumCounts: Record<ThreeDRegionalPriority, number> = {
    mainland: 0,
    california: 0,
    "hong-kong": 0,
    "cross-region": 0
  };
  const threeDEnabled = visualizationLabCatalog.filter((lab) => lab.threeD?.enabled);
  const premium = visualizationLabCatalog.filter((lab) => lab.threeD?.premiumLaunch);
  const nonThreeDLabs = visualizationLabCatalog.filter((lab) => !lab.threeD?.enabled);
  const standard3DCapsules = threeDEnabled.filter((lab) => !lab.threeD?.premiumLaunch);

  assert.ok(visualizationLabCatalog.length >= threeDEnabled.length);
  // Candidate-hold packages are excluded from the live catalog and premium
  // direct-route graph; all remaining premium pages use configured modules.
  assert.equal(threeDEnabled.length, 52);
  assert.equal(nonThreeDLabs.length, visualizationLabCatalog.length - threeDEnabled.length);
  assert.equal(premium.length, 42);
  assert.deepEqual(
    standard3DCapsules.map((lab) => lab.labId).sort(),
    [...mainlandPepPrimaryThreeDCapsuleLabIds, ...mainlandPepJuniorStandard3DCapsuleLabIds, ...hongKongStandardThreeDCapsuleLabIds].sort(),
    "Only the approved Mainland PEP primary capsules, PEP junior spatial-imagination capsules, and HK representative classroom capsules should be standard 3D"
  );
  assert.deepEqual(
    premium.filter((lab) => lab.moduleId !== "configured-visualization-lab").map((lab) => lab.labId),
    []
  );
  assert.equal(visualizationLabCatalog.find((lab) => lab.labId === "p1-counting-number-bonds")?.threeD?.enabled, false);
  for (const [labId, familyId] of Object.entries(hongKongStandardThreeDCapsuleFamilyByLabId)) {
    const lab = visualizationLabCatalog.find((entry) => entry.labId === labId);
    assert.equal(lab?.threeD?.enabled, true, `${labId} should render through the standard 3D canvas`);
    assert.equal(lab?.threeD?.coverageTier, "standard-3d", `${labId} should stay a standard classroom capsule`);
    assert.equal(lab?.threeD?.familyId, familyId, `${labId} should route to the expected family`);
    assert.equal(lab?.threeD?.premiumLaunch, false, `${labId} should not become a premium topic page`);
    assert.equal(lab?.threeD?.regionalPriority, "hong-kong", `${labId} should keep HK representative metadata`);
  }
  assert.equal(visualizationLabCatalog.find((lab) => lab.labId === "pep-high-s5-conics")?.threeD?.enabled, true);

  for (const lab of premium) {
    assert.ok(lab.threeD?.regionalPriority, `${lab.labId} should have a regional 3D launch priority`);
    premiumCounts[lab.threeD.regionalPriority] += 1;
  }

  // california went 12 -> 0 on 2026-08-25: the CA premium-3D topics were
  // retired in favour of their Claude signature benches (replacement plan
  // Phase 2a), so no CA lab may carry premiumLaunch metadata any more.
  assert.deepEqual(premiumCounts, {
    mainland: 24,
    california: 0,
    "hong-kong": 9,
    "cross-region": 9
  });
});

test("Mainland PEP junior keeps one Visualization Lab track with a focused spatial-imagination 3D pack", () => {
  const pepJuniorLabs = visualizationLabCatalog.filter((lab) => lab.curriculumTrack === "MAINLAND_PEP_JUNIOR");
  const activePepJunior3DLabs = pepJuniorLabs.filter((lab) => lab.threeD?.enabled);
  const standardPepJunior3DCapsules = activePepJunior3DLabs.filter((lab) => !lab.threeD?.premiumLaunch);
  const premiumPepJuniorPackLab = activePepJunior3DLabs.find((lab) => lab.threeD?.premiumLaunch);

  assert.equal(pepJuniorLabs.length, 11);
  assert.deepEqual(
    activePepJunior3DLabs.map((lab) => lab.labId).sort(),
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

test("Mainland PEP primary keeps one Visualization Lab track with three standard 3D capsules", () => {
  const pepPrimaryLabs = visualizationLabCatalog.filter((lab) => lab.curriculumTrack === "MAINLAND_PEP_PRIMARY");
  const standard3DCapsules = pepPrimaryLabs.filter((lab) => lab.threeD?.enabled);
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

test("catalog metadata exercises every live Three.js family and no held-candidate-only family", () => {
  const liveFamilyIds = new Set(
    visualizationLabCatalog
      .map((lab) => lab.threeD?.familyId)
      .filter((familyId): familyId is (typeof threeDFamilyIds)[number] => Boolean(familyId))
  );

  assert.deepEqual(
    [...liveFamilyIds].sort(),
    threeDFamilyIds.filter((familyId) => !dormantThreeDFamilyIds.has(familyId)).sort()
  );
  assert.deepEqual([...dormantThreeDFamilyIds], ["three-cross-section-slicer"]);
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
