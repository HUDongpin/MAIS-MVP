import assert from "node:assert/strict";
import test from "node:test";
import { visualizationLabCatalog } from "../../../data/visualizationLabs";
import type { ThreeDRegionalPriority } from "./threeDSceneTypes";
import { threeDFamilyIds } from "./threeDSceneMath";

test("catalog metadata marks every lab and preserves the premium regional launch allocation", () => {
  const premiumCounts: Record<ThreeDRegionalPriority, number> = {
    mainland: 0,
    california: 0,
    "hong-kong": 0,
    "cross-region": 0
  };
  const threeDEnabled = visualizationLabCatalog.filter((lab) => lab.threeD?.enabled);
  const premium = visualizationLabCatalog.filter((lab) => lab.threeD?.premiumLaunch);

  assert.ok(visualizationLabCatalog.length >= 695);
  assert.equal(threeDEnabled.length, visualizationLabCatalog.length);
  assert.equal(premium.length, 80);
  assert.deepEqual(
    premium.filter((lab) => lab.moduleId !== "configured-visualization-lab").map((lab) => lab.labId),
    []
  );

  for (const lab of premium) {
    assert.ok(lab.threeD?.regionalPriority, `${lab.labId} should have a regional 3D launch priority`);
    premiumCounts[lab.threeD.regionalPriority] += 1;
  }

  assert.deepEqual(premiumCounts, {
    mainland: 40,
    california: 12,
    "hong-kong": 9,
    "cross-region": 19
  });
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
});
