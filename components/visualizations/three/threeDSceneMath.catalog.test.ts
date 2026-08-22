import assert from "node:assert/strict";
import test from "node:test";
import {
  hongKongSemanticallyVerifiedThreeDLabIds,
  mainlandSemanticallyVerifiedThreeDLabIds,
  mainlandThreeDCandidateLabIds,
  visualizationLabCatalog,
  visualizationTrackLabels
} from "../../../data/visualizationLabs";
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
  "p4-large-numbers": "three-array-area-blocks",
  "p6-ratio-proportion": "three-statistics-distribution",
  "statistics-s1": "three-statistics-distribution"
} as const;

test("catalog metadata keeps live premium 3D limited to the verified US and CAPSTONE allocation", () => {
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

  assert.equal(visualizationLabCatalog.length, 691);
  assert.deepEqual(hongKongSemanticallyVerifiedThreeDLabIds, []);
  assert.deepEqual(mainlandSemanticallyVerifiedThreeDLabIds, []);
  assert.equal(threeDEnabled.length, 24);
  assert.equal(nonThreeDLabs.length, visualizationLabCatalog.length - threeDEnabled.length);
  assert.equal(premium.length, 24);
  assert.deepEqual(standard3DCapsules, []);
  assert.equal(premium.filter((lab) => lab.curriculumTrack === "US").length, 19);
  assert.equal(premium.filter((lab) => lab.curriculumTrack === "CAPSTONE").length, 5);
  const californiaSignaturePremiumLabs = premium.filter((lab) => lab.moduleId !== "configured-visualization-lab");
  assert.equal(californiaSignaturePremiumLabs.length, 12);
  assert.ok(
    californiaSignaturePremiumLabs.every(
      (lab) => lab.curriculumTrack === "US" && lab.publisher === "US_CA_MATH" && lab.moduleId === "signature-lab"
    )
  );
  assert.equal(visualizationLabCatalog.find((lab) => lab.labId === "p1-counting-number-bonds")?.threeD?.enabled, false);
  for (const [labId, familyId] of Object.entries(hongKongStandardThreeDCapsuleFamilyByLabId)) {
    const lab = visualizationLabCatalog.find((entry) => entry.labId === labId);
    assert.equal(lab?.threeD?.enabled, false, `${labId} must remain disabled while the HK verified allowlist is empty`);
    assert.equal(lab?.threeD?.coverageTier, "standard-3d", `${labId} should preserve candidate authoring metadata`);
    assert.equal(lab?.threeD?.familyId, familyId, `${labId} should preserve its candidate family metadata`);
    assert.equal(lab?.threeD?.premiumLaunch, false, `${labId} should not become a premium topic page`);
    assert.equal(lab?.threeD?.regionalPriority, "hong-kong", `${labId} should keep HK candidate metadata`);
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

test("Mainland PEP junior preserves candidate metadata while its verified 3D allowlist stays empty", () => {
  const pepJuniorLabs = visualizationLabCatalog.filter((lab) => lab.curriculumTrack === "MAINLAND_PEP_JUNIOR");
  const activePepJunior3DLabs = pepJuniorLabs.filter((lab) => lab.threeD?.enabled);
  const standardPepJunior3DCapsules = activePepJunior3DLabs.filter((lab) => !lab.threeD?.premiumLaunch);
  const premiumPepJuniorPackLab = activePepJunior3DLabs.find((lab) => lab.threeD?.premiumLaunch);

  assert.equal(pepJuniorLabs.length, 11);
  assert.deepEqual(activePepJunior3DLabs, []);
  assert.deepEqual(standardPepJunior3DCapsules, []);
  assert.equal(premiumPepJuniorPackLab, undefined);
  assert.ok(mainlandPepJuniorSpatialImagination3DLabIds.every((labId) => mainlandThreeDCandidateLabIds.includes(labId)));

  for (const labId of mainlandPepJuniorStandard3DCapsuleLabIds) {
    const lab = visualizationLabCatalog.find((entry) => entry.labId === labId);
    assert.equal(lab?.threeD?.enabled, false, `${labId} must remain disabled before independent verification`);
    assert.equal(lab?.threeD?.coverageTier, "standard-3d", `${labId} should retain candidate coverage metadata`);
    assert.equal(lab?.threeD?.premiumLaunch, false, `${labId} should not become a premium topic page`);
    assert.equal(lab?.threeD?.regionalPriority, "mainland", `${labId} should keep Mainland candidate metadata`);
  }

  const premiumCandidate = visualizationLabCatalog.find(
    (lab) => lab.labId === "pep-junior-s3-lower-inverse-similarity-trigonometry"
  );
  assert.equal(premiumCandidate?.threeD?.enabled, false);
  assert.equal(premiumCandidate?.threeD?.coverageTier, "premium-3d");
  assert.equal(premiumCandidate?.threeD?.premiumLaunch, false);
  assert.equal(premiumCandidate?.threeD?.familyId, "three-projection-views");
  assert.equal(premiumCandidate?.templateId, "right-triangle-pythagorean");
  assert.equal(premiumCandidate?.templateConfig.formula?.zhHans, "正视图 + 俯视图 + 左视图 -> 空间模型");

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

test("Mainland PEP primary preserves three candidate capsules while live 3D stays disabled", () => {
  const pepPrimaryLabs = visualizationLabCatalog.filter((lab) => lab.curriculumTrack === "MAINLAND_PEP_PRIMARY");
  const standard3DCapsules = pepPrimaryLabs.filter((lab) => lab.threeD?.enabled);
  const p6CoordinateMap = pepPrimaryLabs.find((lab) => lab.labId === "pep-primary-p6-upper-coordinate-data");

  assert.equal(pepPrimaryLabs.length, 24);
  assert.deepEqual(standard3DCapsules, []);
  assert.ok(mainlandPepPrimaryThreeDCapsuleLabIds.every((labId) => mainlandThreeDCandidateLabIds.includes(labId)));

  for (const labId of mainlandPepPrimaryThreeDCapsuleLabIds) {
    const lab = visualizationLabCatalog.find((entry) => entry.labId === labId);
    assert.equal(lab?.threeD?.enabled, false, `${labId} must remain disabled before independent verification`);
    assert.equal(lab?.threeD?.coverageTier, "standard-3d", `${labId} should retain candidate coverage metadata`);
    assert.equal(lab?.threeD?.premiumLaunch, false, `${labId} should not become a premium topic page`);
    assert.equal(lab?.threeD?.regionalPriority, "mainland", `${labId} should keep Mainland candidate metadata`);
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
