import assert from "node:assert/strict";
import test from "node:test";
import {
  hongKongSemanticallyVerifiedThreeDLabIds,
  hongKongThreeDCandidateLabIds,
  mainlandSemanticallyVerifiedThreeDLabIds,
  mainlandThreeDCandidateLabIds,
  visualizationLabCatalog,
  visualizationTrackLabels
} from "../../../data/visualizationLabs";
import type { ThreeDRegionalPriority } from "./threeDSceneTypes";
import { threeDFamilyIds } from "./threeDSceneMath";

const mainlandPepPrimaryThreeDCandidateLabIds = [
  "pep-primary-p1-upper-shapes-position-time",
  "pep-primary-p2-upper-length-angles-observation",
  "pep-primary-p5-lower-volume-data"
] as const;

const mainlandPepJuniorSpatialImagination3DCandidateLabIds = [
  "pep-junior-s1-upper-geometric-figures",
  "pep-junior-s1-lower-lines-coordinates",
  "pep-junior-s3-lower-inverse-similarity-trigonometry"
] as const;

const hongKongStandardThreeDCapsuleFamilyByLabId = {
  "p3-multiplication-division": "three-array-area-blocks",
  "p4-angles": "three-angle-geometry",
  "p4-large-numbers": "three-array-area-blocks",
  "p6-ratio-proportion": "three-statistics-distribution",
  "statistics-s1": "three-statistics-distribution"
} as const;

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
  assert.equal(
    threeDEnabled.length,
    premium.length,
    "The live registry is catalog-derived and currently contains no standard-only 3D entries"
  );
  assert.equal(nonThreeDLabs.length, visualizationLabCatalog.length - threeDEnabled.length);
  assert.equal(
    premium.every((lab) => lab.threeD?.enabled === true && lab.threeD?.premiumLaunch === true),
    true,
    "Every live entry must satisfy both catalog flags"
  );
  assert.deepEqual(
    standard3DCapsules.map((lab) => lab.labId).sort(),
    [],
    "No unverified regional standard capsule should remain live"
  );
  assert.deepEqual(
    premium
      .filter((lab) => lab.curriculumTrack.startsWith("MAINLAND_"))
      .filter((lab) => lab.moduleId !== "configured-visualization-lab")
      .map((lab) => lab.labId),
    []
  );
  assert.equal(visualizationLabCatalog.find((lab) => lab.labId === "p1-counting-number-bonds")?.threeD?.enabled, false);
  for (const [labId, familyId] of Object.entries(hongKongStandardThreeDCapsuleFamilyByLabId)) {
    const lab = visualizationLabCatalog.find((entry) => entry.labId === labId);
    assert.equal(lab?.threeD?.enabled, false, `${labId} should use the accurate 2D learner model`);
    assert.equal(lab?.threeD?.coverageTier, "standard-3d", `${labId} should retain candidate audit metadata`);
    assert.equal(lab?.threeD?.familyId, familyId, `${labId} should route to the expected family`);
    assert.equal(lab?.threeD?.premiumLaunch, false, `${labId} should not become a premium topic page`);
    assert.equal(lab?.threeD?.regionalPriority, "hong-kong", `${labId} should keep HK representative metadata`);
  }
  assert.equal(visualizationLabCatalog.find((lab) => lab.labId === "pep-high-s5-conics")?.threeD?.enabled, false);

  for (const lab of premium) {
    assert.ok(lab.threeD?.regionalPriority, `${lab.labId} should have a regional 3D launch priority`);
    premiumCounts[lab.threeD.regionalPriority] += 1;
  }

  assert.deepEqual(premiumCounts, {
    mainland: 0,
    california: 12,
    "hong-kong": 0,
    "cross-region": 12
  });
});

test("Mainland serves all 52 registered 3D candidates through accurate 2D after the cross-contract audit", () => {
  const mainlandLabs = visualizationLabCatalog.filter((lab) => lab.curriculumTrack.startsWith("MAINLAND_"));
  const activeMainlandThreeD = mainlandLabs.filter((lab) => lab.threeD?.enabled);

  assert.deepEqual(
    activeMainlandThreeD.map((lab) => lab.labId).sort(),
    [...mainlandSemanticallyVerifiedThreeDLabIds].sort()
  );
  assert.equal(mainlandSemanticallyVerifiedThreeDLabIds.length, 0);
  assert.equal(activeMainlandThreeD.length, 0);

  assert.equal(mainlandThreeDCandidateLabIds.length, 52);
  assert.equal(new Set(mainlandThreeDCandidateLabIds).size, 52);
  const downgradedCandidates = mainlandThreeDCandidateLabIds.map((labId) => {
    const lab = mainlandLabs.find((entry) => entry.labId === labId);
    assert.ok(lab, `${labId} should remain in the Mainland catalog`);
    return lab;
  });
  assert.equal(downgradedCandidates.length, 52);
  assert.equal(downgradedCandidates.every((lab) => lab.threeD?.enabled === false), true);
  assert.equal(downgradedCandidates.every((lab) => lab.threeD?.premiumLaunch === false), true);
});

test("Hong Kong serves all 14 registered 3D candidates through accurate 2D after the pass-through audit", () => {
  const hongKongLabs = visualizationLabCatalog.filter((lab) => lab.curriculumTrack === "HK");
  const activeHongKongThreeD = hongKongLabs.filter((lab) => lab.threeD?.enabled);

  assert.deepEqual(
    activeHongKongThreeD.map((lab) => lab.labId).sort(),
    [...hongKongSemanticallyVerifiedThreeDLabIds].sort()
  );
  assert.equal(hongKongSemanticallyVerifiedThreeDLabIds.length, 0);
  assert.equal(activeHongKongThreeD.length, 0);
  assert.equal(hongKongThreeDCandidateLabIds.length, 14);
  assert.equal(new Set(hongKongThreeDCandidateLabIds).size, 14);

  const downgradedCandidates = hongKongThreeDCandidateLabIds.map((labId) => {
    const lab = hongKongLabs.find((entry) => entry.labId === labId);
    assert.ok(lab, `${labId} should remain in the Hong Kong catalog`);
    return lab;
  });
  assert.equal(downgradedCandidates.every((lab) => lab.threeD?.enabled === false), true);
  assert.equal(downgradedCandidates.every((lab) => lab.threeD?.premiumLaunch === false), true);
});

test("Mainland PEP junior keeps one Visualization Lab track and downgrades unverified spatial candidates to 2D", () => {
  const pepJuniorLabs = visualizationLabCatalog.filter((lab) => lab.curriculumTrack === "MAINLAND_PEP_JUNIOR");
  const activePepJunior3DLabs = pepJuniorLabs.filter((lab) => lab.threeD?.enabled);
  const candidateLabs = pepJuniorLabs.filter((lab) =>
    mainlandPepJuniorSpatialImagination3DCandidateLabIds.includes(lab.labId as never)
  );

  assert.equal(pepJuniorLabs.length, 11);
  assert.equal(activePepJunior3DLabs.length, 0);
  assert.equal(candidateLabs.length, 3);
  assert.equal(candidateLabs.every((lab) => lab.threeD?.enabled === false), true);
  assert.equal(candidateLabs.every((lab) => lab.threeD?.premiumLaunch === false), true);

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

test("Mainland PEP primary keeps one Visualization Lab track and downgrades unverified 3D capsules to 2D", () => {
  const pepPrimaryLabs = visualizationLabCatalog.filter((lab) => lab.curriculumTrack === "MAINLAND_PEP_PRIMARY");
  const standard3DCapsules = pepPrimaryLabs.filter((lab) => lab.threeD?.enabled);
  const p6CoordinateMap = pepPrimaryLabs.find((lab) => lab.labId === "pep-primary-p6-upper-coordinate-data");

  assert.equal(pepPrimaryLabs.length, 24);
  assert.equal(standard3DCapsules.length, 0);
  for (const labId of mainlandPepPrimaryThreeDCandidateLabIds) {
    const lab = pepPrimaryLabs.find((entry) => entry.labId === labId);
    assert.equal(lab?.threeD?.enabled, false, `${labId} should use the accurate 2D learner model`);
    assert.equal(lab?.threeD?.premiumLaunch, false, `${labId} should not promise a 3D topic page`);
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
