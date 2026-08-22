import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  premiumThreeDCandidateLabIds,
  selectThreeDRegionalCandidateAuditLabIds,
  summarizeThreeDLaunchCoverage,
  threeDLaunchCoverageRequirement,
  threeDLaunchRegionByLabId,
  validateThreeDLaunchCoverage
} from "./threeDSceneMath";

test("approved Three.js candidate coverage stays inside authoring bands without importing live content", () => {
  const report = summarizeThreeDLaunchCoverage();
  const issues = validateThreeDLaunchCoverage(report);

  assert.deepEqual(issues, []);
  assert.equal(report.familyCount, 27);
  assert.equal(report.topicPageCount, 80);
  assert.deepEqual(report.regionalCounts, {
    california: 12,
    "cross-region": 19,
    "hong-kong": 9,
    mainland: 40
  });
  assert.equal(report.requirement, threeDLaunchCoverageRequirement);
  assert.equal(report.familyCountInRange, true);
  assert.equal(report.topicPageCountInRange, true);
  assert.equal(report.regionalCountsInRange.mainland, true);
  assert.equal(report.regionalCountsInRange.california, true);
  assert.equal(report.regionalCountsInRange["hong-kong"], true);
});

test("every approved Three.js family is reachable from a template or premium override", () => {
  const report = summarizeThreeDLaunchCoverage();

  assert.deepEqual(report.unreachableFamilyIds, []);
  assert.equal(report.templateFamilyCount, 18);
  assert.equal(report.overrideFamilyCount, 10);
});

test("premium Three.js candidate manifest remains a unique audit inventory", () => {
  assert.equal(premiumThreeDCandidateLabIds.size, 80);
  assert.ok([...premiumThreeDCandidateLabIds].every((labId) => typeof labId === "string" && labId.length > 0));
});

test("regional Three.js candidate audit samples are deterministic", () => {
  const smokeTargets = selectThreeDRegionalCandidateAuditLabIds();

  assert.deepEqual(Object.keys(smokeTargets).sort(), ["california", "cross-region", "hong-kong", "mainland"]);
  assert.deepEqual(smokeTargets, {
    california: "us-ca-math-s2-chapter-02",
    "cross-region": "bnu-high-s6-数列",
    "hong-kong": "advanced-functions",
    mainland: "bnu-high-s4-三角函数"
  });

  for (const [region, labId] of Object.entries(smokeTargets)) {
    assert.equal(threeDLaunchRegionByLabId[labId], region);
    assert.equal(premiumThreeDCandidateLabIds.has(labId), true, `${labId} should remain in the candidate audit inventory`);
  }
});

test("pure Three.js coverage contracts avoid importing the live visualization catalog", () => {
  const pureThreeSources = [
    "components/visualizations/three/threeDSceneMath.ts",
    "components/visualizations/three/threeDSceneTypes.ts"
  ];

  for (const sourcePath of pureThreeSources) {
    const source = fs.readFileSync(sourcePath, "utf8");

    assert.doesNotMatch(source, /data\/visualizationLabs/);
    assert.doesNotMatch(source, /@\/data\/visualizationLabs/);
  }
});
