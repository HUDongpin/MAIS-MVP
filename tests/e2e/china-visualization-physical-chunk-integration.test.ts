import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const sourcePath = path.resolve("tests/e2e/china-visualization-labs.spec.ts");
const source = readFileSync(sourcePath, "utf8");

test("the 71-package spec binds package plans to physical max-32 state chunks", () => {
  assert.match(source, /buildChinaVisualizationStateChunkPlan\(\{/u);
  assert.match(source, /for \(const chunk of stateChunkPlan\.chunks/u);
  assert.match(source, /const page = await context\.newPage\(\)/u);
  assert.match(source, /prepareTargetStateFromFreshMount\(/u);
  assert.match(source, /createChinaVisualizationStateChunkReceipt\(\{/u);
  assert.match(source, /aggregateChinaVisualizationStateChunkReceipts\(\{/u);
  assert.match(source, /Number\(entry\.maxStatesPerChunk\) <= 32/u);
});

test("package timeout is recomputed from physical chunk budgets instead of reusing one long-page budget", () => {
  assert.match(
    source,
    /stateChunkPlan\.chunks\.reduce\([\s\S]*?total \+ chunk\.timeoutMs/u,
  );
  assert.doesNotMatch(source, /test\.setTimeout\(stateBudget\.timeoutMs\)/u);
});

test("a receipt is issued only after target requested, before-scan, and after-scan hashes agree", () => {
  assert.match(source, /if \(requestedSha !== observedBeforeSha\)/u);
  assert.match(source, /if \(requestedSha !== observedAfterSha\)/u);
  assert.match(
    source,
    /scanState\([\s\S]*?prepared\.executionPlan,[\s\S]*?false\s*\)/u,
  );
  assert.match(source, /executedShardStateIds\.push\(stateId\)/u);
});

test("collision-layout receipts bind the real non-empty browser scanner snapshot", () => {
  assert.match(
    source,
    /installHkVisualizationEffectiveVisibilityInspector\(page\)/u,
  );
  assert.match(source, /scanHkVisualizationCollisions\(section, state\)/u);
  assert.match(
    source,
    /chinaVisualizationCollisionSnapshotIssues\(snapshot\)/u,
  );
  assert.match(
    source,
    /auditId === "collision-layout"[\s\S]*?executed\.collisionReceipts/u,
  );
  assert.doesNotMatch(
    source,
    /auditEvidence:\s*\{\s*observedAfter,\s*observedBefore\s*\},\s*auditId:\s*"collision-layout"/u,
  );
});

test("full run ledger rejects missing package aggregates, reused pages, and oversized chunks", () => {
  assert.match(
    source,
    /stateChunkPackageAggregates\.map\(\(entry\) => entry\.packageId\)/u,
  );
  assert.match(
    source,
    /Number\(entry\.pageInstanceCount\) === Number\(entry\.chunkCount\)/u,
  );
  assert.match(
    source,
    /stateChunkPolicyId: "china-visualization-state-chunks-v2"/u,
  );
});
