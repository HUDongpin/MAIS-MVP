import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { buildCaliforniaSignatureSourceManifest } from "./california-signature-control-manifest";
import {
  buildCaliforniaSignatureSourceExpectedEvidenceOracle,
  iterateCaliforniaSignatureSourceEvidenceOracleRows
} from "./california-signature-source-expected-provider";
import {
  buildCaliforniaSignatureSourceExecutionGroups,
  californiaSignatureAxisIdsForProject,
  iterateCaliforniaSignatureExpandedSourceEvidenceOracle
} from "./california-signature-exhaustive-qa";

const manifest = buildCaliforniaSignatureSourceManifest();

test("source and expanded oracle remain lazy while preserving every exact current-source identity", async () => {
  const oracle = await buildCaliforniaSignatureSourceExpectedEvidenceOracle(manifest);
  assert.equal(Object.prototype.hasOwnProperty.call(oracle, "evidenceRows"), false,
    "source oracle must not retain its 91,589 derived row objects");

  const rowKeys: string[] = [];
  let rowCount = 0;
  for (const row of iterateCaliforniaSignatureSourceEvidenceOracleRows({ manifest, oracle })) {
    assert.match(row.key, /^[a-f0-9]{64}$/);
    rowKeys.push(row.key);
    rowCount += 1;
  }
  assert.equal(rowCount, oracle.counts.evidenceRows);
  assert.equal(rowCount, 91_589);
  assert.equal(oracle.counts.evidenceCombinationRows, 77_722,
    "source truth must retain every exact pairwise combination row");
  assert.equal(oracle.counts.evidenceCombinationRows * 12, 932_664,
    "every exact pairwise combination must execute on all twelve layout axes");
  assert.equal(new Set(rowKeys).size, rowKeys.length);
  assert.equal(
    createHash("sha256").update(rowKeys.sort().join("\n")).digest("hex"),
    oracle.evidenceKeysSha256
  );

  let expandedCount = 0;
  let previousOrderKey: string | null = null;
  for (const expectation of iterateCaliforniaSignatureExpandedSourceEvidenceOracle({ manifest, oracle })) {
    assert.match(expectation.key, /^[a-f0-9]{64}$/);
    assert.ok(previousOrderKey === null || previousOrderKey < expectation.orderKey,
      `expanded source stream is duplicate or retrograde at ${expectation.orderKey}`);
    previousOrderKey = expectation.orderKey;
    expandedCount += 1;
  }
  assert.equal(expandedCount, 1_127_995);

  let partitionedCount = 0;
  for (const projectName of ["desktop-chrome", "mobile-chrome"] as const) {
    const axisIds = californiaSignatureAxisIdsForProject(projectName);
    assert.ok(axisIds.every((axisId) => axisId.startsWith(
      projectName === "desktop-chrome" ? "desktop-" : "mobile-"
    )));
    let projectCount = 0;
    for (const expectation of iterateCaliforniaSignatureExpandedSourceEvidenceOracle({
      axisIds,
      manifest,
      oracle
    })) {
      assert.ok(axisIds.includes(expectation.axisId));
      if (projectName === "mobile-chrome") assert.notEqual(expectation.phase, "functional");
      projectCount += 1;
    }
    assert.ok(projectCount > 0);
    partitionedCount += projectCount;
  }
  assert.equal(partitionedCount, expandedCount,
    "desktop/mobile physical artifacts must partition rather than duplicate the global oracle");

  const benchIds = manifest.benches.slice(0, 2).map((bench) => bench.benchId);
  const benchIdSet = new Set<string>(benchIds);
  for (const projectName of ["desktop-chrome", "mobile-chrome"] as const) {
    const groups = buildCaliforniaSignatureSourceExecutionGroups({
      benchIds,
      manifest,
      oracle,
      projectName
    });
    assert.ok(groups.every((group) => benchIdSet.has(group.benchId)));
    assert.equal(
      groups.reduce((sum, group) => sum + group.expectedRecordCount, 0),
      [...iterateCaliforniaSignatureExpandedSourceEvidenceOracle({
        axisIds: californiaSignatureAxisIdsForProject(projectName),
        benchIds,
        manifest,
        oracle
      })].length
    );
  }
});
