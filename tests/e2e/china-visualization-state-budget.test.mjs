import assert from "node:assert/strict";
import test from "node:test";

import {
  buildChinaVisualizationStateBudgetManifest,
  chinaVisualizationPackageTimeoutMs,
  CHINA_VISUALIZATION_STATE_BUDGET_POLICY,
  validateChinaVisualizationStateBudgetManifest
} from "./china-visualization-state-budget.mjs";

const receipt = (labId, state) => JSON.stringify([labId, state]);

function fixturePackages() {
  return [
    {
      id: "package-a",
      labIds: ["lab-a", "lab-b"],
      stateIds: [receipt("lab-a", "default"), receipt("lab-a", "reset"), receipt("lab-b", "default")]
    },
    {
      id: "package-b",
      labIds: ["lab-c"],
      stateIds: [receipt("lab-c", "default"), receipt("lab-c", "direct/range=0:value=1"), receipt("lab-c", "reset")]
    }
  ];
}

test("timeout budget grows from exact lab and state counts", () => {
  const small = chinaVisualizationPackageTimeoutMs({ labCount: 1, stateCount: 3 });
  const manyStates = chinaVisualizationPackageTimeoutMs({ labCount: 1, stateCount: 2_099 });
  const manyLabs = chinaVisualizationPackageTimeoutMs({ labCount: 8, stateCount: 3 });
  assert.equal(small >= CHINA_VISUALIZATION_STATE_BUDGET_POLICY.minimumPackageTimeoutMs, true);
  assert.equal(manyStates > small, true);
  assert.equal(manyLabs > small, true);
});

test("preflight manifest freezes deterministic counts, offsets, order, hashes, and timeouts", () => {
  const packages = fixturePackages();
  const manifest = buildChinaVisualizationStateBudgetManifest(packages);
  assert.equal(Object.isFrozen(manifest), true);
  assert.equal(Object.isFrozen(manifest.packagePlans), true);
  assert.equal(manifest.packageCount, 2);
  assert.equal(manifest.labCount, 3);
  assert.equal(manifest.stateCount, 6);
  assert.deepEqual(manifest.packagePlans.map(({ labOffset, stateOffset }) => ({ labOffset, stateOffset })), [
    { labOffset: 0, stateOffset: 0 },
    { labOffset: 2, stateOffset: 3 }
  ]);
  assert.deepEqual(
    validateChinaVisualizationStateBudgetManifest({
      manifest,
      plannedLabIds: packages.flatMap(({ labIds }) => labIds),
      plannedPackageIds: packages.map(({ id }) => id),
      plannedStateIds: packages.flatMap(({ stateIds }) => stateIds)
    }),
    []
  );
});

test("manifest construction and validation fail closed on duplicates, gaps, and timeout drift", () => {
  const packages = fixturePackages();
  assert.throws(
    () => buildChinaVisualizationStateBudgetManifest([
      packages[0],
      { ...packages[1], stateIds: [receipt("lab-c", "default"), receipt("lab-c", "default")] }
    ]),
    /duplicates/u
  );
  const manifest = structuredClone(buildChinaVisualizationStateBudgetManifest(packages));
  manifest.packagePlans[1].stateOffset += 1;
  manifest.packagePlans[1].timeoutMs -= 1;
  const errors = validateChinaVisualizationStateBudgetManifest({
    manifest,
    plannedLabIds: packages.flatMap(({ labIds }) => labIds),
    plannedPackageIds: packages.map(({ id }) => id),
    plannedStateIds: packages.flatMap(({ stateIds }) => stateIds)
  });
  assert.equal(errors.some((error) => /gap|timeout drift/u.test(error)), true);
});

test("state receipts cannot escape their package or leave a lab empty", () => {
  assert.throws(
    () => buildChinaVisualizationStateBudgetManifest([{
      id: "bad-owner",
      labIds: ["lab-a"],
      stateIds: [receipt("lab-b", "default")]
    }]),
    /not owned/u
  );
  assert.throws(
    () => buildChinaVisualizationStateBudgetManifest([{
      id: "empty-lab",
      labIds: ["lab-a", "lab-b"],
      stateIds: [receipt("lab-a", "default")]
    }]),
    /no planned state/u
  );
});
