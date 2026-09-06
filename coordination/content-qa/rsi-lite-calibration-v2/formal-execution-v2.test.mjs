import assert from "node:assert/strict";
import path from "node:path";
import os from "node:os";
import { mkdtemp, rm } from "node:fs/promises";
import { createFrozenCandidateFixtureV2 } from "./test-fixtures.mjs";
import test from "node:test";

async function subject() {
  return import("./formal-execution-v2.mjs");
}

test("independently reopens a test-owned 72-package candidate set without loading gold", async () => {
  const { loadFrozenCandidateBlindV2 } = await subject();
  const root = await mkdtemp(path.join(os.tmpdir(), "mais-v2-frozen-fixture-"));
  try {
    const { candidateRoot } = await createFrozenCandidateFixtureV2(root);
    const frozen = await loadFrozenCandidateBlindV2({ candidateRoot });
    assert.equal(frozen.packages.size, 72);
    assert.equal(frozen.publicManifest.counts.questions, 7200);
    assert.equal(frozen.publicManifest.counts.lessons, 144);
    assert.equal(frozen.sealedManifest.packageAssignments.length, 72);
    assert.equal(Object.hasOwn(frozen, "goldLedger"), false);
    assert.equal(frozen.bundleReadiness.auditIssueCount, 0);
    assert.ok([...frozen.packages.values()].every((row) => row.questions.length === 100 && row.lessons.length === 2));
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("enforces all three owner caps against attempts and conservative failed-call debit", async () => {
  const { assertOwnerCapsV2 } = await subject();
  const base = {
    providerCalls: 220,
    promptCacheHitTokens: 1_000,
    promptCacheMissTokens: 2_000,
    outputTokens: 3_000,
    conservativeFailureDebitTokens: 4_000,
    apiCostUsd: 5,
    conservativeFailureDebitUsd: 2,
    activeReservations: 0
  };
  assert.equal(assertOwnerCapsV2(base), true);
  assert.throws(() => assertOwnerCapsV2({ ...base, providerCalls: 221 }), /attempt cap/);
  assert.throws(() => assertOwnerCapsV2({ ...base, conservativeFailureDebitTokens: 39_995_001 }), /token cap/);
  assert.throws(() => assertOwnerCapsV2({ ...base, conservativeFailureDebitUsd: 21 }), /currency cap/);
  assert.throws(() => assertOwnerCapsV2({ ...base, activeReservations: 1 }), /active reservation/);
});

test("calculates a separately labeled current-listed-price estimate from successful usage only", async () => {
  const { estimateCurrentListedPriceUsdV2 } = await subject();
  const estimate = estimateCurrentListedPriceUsdV2({ promptCacheHitTokens: 1_000_000, promptCacheMissTokens: 1_000_000, outputTokens: 1_000_000 });
  assert.equal(estimate, 1.308625);
});
