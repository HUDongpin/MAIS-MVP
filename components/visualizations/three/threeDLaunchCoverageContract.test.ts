import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  buildPremiumThreeDTopicStaticParams,
  hubRouteForRetiredPremiumThreeDLab,
  premiumThreeDLaunchLabIds,
  retiredCaliforniaPremiumThreeDLabIds,
  selectThreeDRegionalLaunchSmokeLabIds,
  selectThreeDRegionalLaunchSmokeTargets,
  summarizeThreeDLaunchCoverage,
  threeDLaunchCoverageRequirement,
  threeDLaunchRegionByLabId,
  validateThreeDLaunchCoverage
} from "./threeDSceneMath";

test("approved aggressive Three.js launch coverage stays inside required bands without importing live content", () => {
  const report = summarizeThreeDLaunchCoverage();
  const issues = validateThreeDLaunchCoverage(report);

  assert.deepEqual(issues, []);
  assert.equal(report.familyCount, 27);
  // 80 until 2026-08-25, when the 12 California premium-3D topics were retired
  // (Phase 2a of the Codex-lab replacement plan): their canonical lab is the
  // Claude signature bench, and the california band is pinned to 0-0 so a CA
  // id reappearing in the launch map fails this contract.
  assert.equal(report.topicPageCount, 68);
  assert.deepEqual(report.regionalCounts, {
    california: 0,
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

test("premium Three.js topic static params come from the approved launch manifest", () => {
  const params = buildPremiumThreeDTopicStaticParams();
  const labIds = params.map((param) => param.labId);
  const uniqueLabIds = new Set(labIds);

  assert.equal(params.length, 68);
  assert.equal(uniqueLabIds.size, params.length);
  assert.deepEqual(uniqueLabIds, premiumThreeDLaunchLabIds);
  assert.ok(params.every((param) => typeof param.labId === "string" && param.labId.length > 0));
});

test("regional Three.js smoke targets are deterministic static topic pages", () => {
  const smokeTargets = selectThreeDRegionalLaunchSmokeLabIds();
  const staticParamIds = new Set(buildPremiumThreeDTopicStaticParams().map((param) => param.labId));

  // No california smoke target since the 2026-08-25 descope — CA topics have
  // no premium-3D launch page to smoke; the signature bench is canonical.
  assert.deepEqual(Object.keys(smokeTargets).sort(), ["cross-region", "hong-kong", "mainland"]);
  assert.deepEqual(smokeTargets, {
    "cross-region": "bnu-high-s6-数列",
    "hong-kong": "advanced-functions",
    mainland: "bnu-high-s4-三角函数"
  });

  for (const [region, labId] of Object.entries(smokeTargets)) {
    assert.equal(threeDLaunchRegionByLabId[labId], region);
    assert.equal(staticParamIds.has(labId), true, `${labId} should be statically generated for regional smoke`);
  }
});

test("regional Three.js smoke targets include browser hrefs and runtime assertions", () => {
  const targets = selectThreeDRegionalLaunchSmokeTargets();

  assert.deepEqual(
    targets.map((target) => target.region),
    ["mainland", "hong-kong", "cross-region"]
  );

  assert.deepEqual(
    targets.map((target) => target.href),
    [
      "/student/tools/visualizations/bnu-high-s4-%E4%B8%89%E8%A7%92%E5%87%BD%E6%95%B0",
      "/student/tools/visualizations/advanced-functions",
      "/student/tools/visualizations/bnu-high-s6-%E6%95%B0%E5%88%97"
    ]
  );

  for (const target of targets) {
    assert.equal(target.expectedCanvasAttributes["data-viz-premium-launch"], "true");
    assert.equal(target.expectedCanvasAttributes["data-viz-regional-priority"], target.region);
    assert.equal(premiumThreeDLaunchLabIds.has(target.labId), true);
  }
});

test("retired California premium-3D topics stay off the launch manifest and redirect to the hub", () => {
  assert.equal(retiredCaliforniaPremiumThreeDLabIds.size, 12);

  for (const labId of retiredCaliforniaPremiumThreeDLabIds) {
    assert.match(labId, /^us-ca-math-/);
    assert.equal(premiumThreeDLaunchLabIds.has(labId), false, `${labId} must stay retired`);
    assert.equal(
      hubRouteForRetiredPremiumThreeDLab(labId),
      `/visualization-lab?lab=${encodeURIComponent(labId)}`
    );
  }

  // Non-retired labs pass through untouched.
  assert.equal(hubRouteForRetiredPremiumThreeDLab("advanced-functions"), null);

  // The direct route wires the redirect ahead of the premium-launch gate.
  const routeSource = fs.readFileSync("app/student/tools/visualizations/[labId]/page.tsx", "utf8");
  assert.match(routeSource, /hubRouteForRetiredPremiumThreeDLab\(normalizedLabId\)/);
  assert.match(routeSource, /if \(hubRoute\) redirect\(hubRoute\);/);
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
