import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const helperSource = readFileSync(
  "tests/e2e/hk-visualization-machine-acceptance-helpers.ts",
  "utf8",
);
const stateContractSource = readFileSync(
  "tests/e2e/hk-visualization-state-chunk-contract.ts",
  "utf8",
);

test("machine helper discovers formula-only educational scrollports without changing state IDs", () => {
  assert.match(helperSource, /data-viz-formula-scroll-container/);
  assert.match(helperSource, /data-viz-formula-scroll/);
  assert.match(helperSource, /formula-and-surface/);
  assert.match(helperSource, /workspace-root>\$\{segments\.join\(">"\)\}/);
  assert.match(helperSource, /scrollWidth <= element\.clientWidth \+ 2/);
  assert.match(helperSource, /scrollObservationSets\.push/);
  assert.doesNotMatch(
    helperSource,
    /hk-state:[^\n]+scroll|scroll[^\n]+hk-state:/,
  );
});

test("every interactive state uses ordered all-start plus each container mid/end and restores all containers", () => {
  assert.match(
    helperSource,
    /observationId: "all-start"[\s\S]*?position: "all-start"/,
  );
  assert.match(helperSource, /observationId: `\$\{containerKey\}:mid`/);
  assert.match(helperSource, /observationId: `\$\{containerKey\}:end`/);
  assert.match(
    helperSource,
    /restoreHkVisualizationEducationalScrollContainers\([\s\S]*?buildHkVisualizationScrollObservationSet/,
  );
  assert.match(
    helperSource,
    /auditHkVisualizationPassThroughOracleState\([\s\S]*?discoverHkVisualizationEducationalScrollContainers\([\s\S]*?auditOneScrollObservation/,
  );
});

test("nested observations bind all six audit hashes, positive counts, and actual-count budget", () => {
  for (const auditId of [
    "layout",
    "collision",
    "contrast",
    "controlVisibility",
    "target44",
    "hitTarget",
  ]) {
    assert.match(
      helperSource,
      new RegExp(
        `passedScrollAuditReceipt\\(\\s*"${auditId}"`,
      ),
    );
  }
  assert.match(
    stateContractSource,
    /executionUnitCount \+\s*scrollPositionAuditCount/,
  );
  assert.match(
    stateContractSource,
    /multiplySafe\(\s*"scroll observation audit reserve",\s*count,\s*HK_VISUALIZATION_PROVISIONAL_SCROLL_OBSERVATION_AND_SIX_AUDITS_MS/,
  );
  assert.match(stateContractSource, /scrollObservationAggregateHash/);
  assert.match(stateContractSource, /stable scroll container key/);
});

test("both canonical declared-mode planning call sites keep transition audits disabled", () => {
  const calls = [...helperSource.matchAll(/exerciseDeclaredMode\(\s*workspace,\s*contract,\s*modeIndex,\s*result,\s*deadline,\s*(true|false),/g)];
  assert.equal(
    calls.length,
    2,
    "The helper must retain exactly the fresh-page and full-matrix canonical declared-mode planning calls.",
  );
  assert.deepEqual(
    calls.map((match) => match[1]),
    ["false", "false"],
    "Mode transitions are not scroll-audited; range/action/reset ledgers independently plan every audited phase.",
  );
});
