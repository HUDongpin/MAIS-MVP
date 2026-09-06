import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { buildV2CandidateSet, canonicalSha256 } from "./candidate-set-builder.mjs";
import { offlineRunFixtureV2 } from "./test-fixtures.mjs";
import { runPackageRepeatV2 } from "./formal-runner-v2.mjs";

async function subject() {
  return import("./formal-campaign-v2.mjs");
}

function candidate() {
  return buildV2CandidateSet({ masterSeed: "campaign-test-seed-0123456789abcdef0123456789abcdef", itemsPerPackage: 80 });
}

async function committedFixture() {
  return offlineRunFixtureV2();
}

test("precommits exactly six region-balanced repeat packages and 21 successful repeat calls", async () => {
  const { buildCorePlanV2, buildRepeatPlanV2, validateCorePlanV2, validateRepeatPlanV2 } = await subject();
  const frozen = candidate();
  const repeatPlan = buildRepeatPlanV2({ sealedManifest: frozen.sealedManifest, candidateSetSha256: frozen.candidateSetSha256 });
  assert.equal(repeatPlan.packageRepeats.length, 6);
  assert.equal(repeatPlan.successfulProviderCalls, 21);
  assert.deepEqual(Map.groupBy(repeatPlan.packageRepeats, (row) => row.region).values().map((rows) => rows.length).toArray(), [2, 2, 2]);
  assert.deepEqual(new Set(repeatPlan.packageRepeats.map((row) => row.arm)), new Set(["B_PRIME", "C0_PRIME"]));
  assert.deepEqual(validateRepeatPlanV2(repeatPlan, frozen.sealedManifest, frozen.candidateSetSha256), []);

  const authorizationBinding = { authorizationSha256: "a".repeat(64) };
  const corePlan = buildCorePlanV2({
    sealedManifest: frozen.sealedManifest,
    candidateSetSha256: frozen.candidateSetSha256,
    authorizationBinding,
    repeatPlan
  });
  assert.equal(corePlan.length, 72);
  assert.equal(corePlan.filter((row) => row.repeatGroupId).length, 6);
  assert.deepEqual(validateCorePlanV2(corePlan), { A_PRIME: 24, B_PRIME: 24, C0_PRIME: 24 });
});

test("atomically commits a protected receipt, resumes idempotently, and rejects tampering", async () => {
  const { readCommittedRunV2, writeCommittedRunV2 } = await subject();
  const root = await mkdtemp(path.join(os.tmpdir(), "mais-v2-commit-test-"));
  try {
    const { expectedPackage, receipt } = await committedFixture();
    const first = await writeCommittedRunV2({ collectionRoot: root, receipt, expectedPackage });
    assert.equal(first.resumed, false);
    const second = await writeCommittedRunV2({ collectionRoot: root, receipt, expectedPackage });
    assert.equal(second.resumed, true);
    const stored = await readCommittedRunV2({
      collectionRoot: root,
      expectedPackage,
      expected: {
        runId: receipt.runId,
        runKind: "core",
        packageId: receipt.packageId,
        arm: receipt.arm,
        candidateSetSha256: receipt.candidateSetSha256,
        authorizationBinding: receipt.authorizationBinding,
        inputSha256: receipt.inputSha256,
        status: receipt.status
      }
    });
    assert.equal(stored.receipt.receiptSha256, receipt.receiptSha256);
    const receiptPath = path.join(root, receipt.runId, "receipt.json");
    const tampered = JSON.parse(await readFile(receiptPath, "utf8"));
    tampered.arm = "B_PRIME";
    await writeFile(receiptPath, `${JSON.stringify(tampered)}\n`);
    await assert.rejects(() => readCommittedRunV2({
      collectionRoot: root,
      expectedPackage,
      expected: {
        runId: receipt.runId,
        runKind: "core",
        packageId: receipt.packageId,
        arm: receipt.arm,
        candidateSetSha256: receipt.candidateSetSha256,
        authorizationBinding: receipt.authorizationBinding,
        inputSha256: receipt.inputSha256,
        status: receipt.status
      }
    }), /failed resume verification/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("separates successful calls, total attempts, conservative failure debits, and listed-price estimate", async () => {
  const { sumReceiptUsageV2 } = await subject();
  const totals = sumReceiptUsageV2([
    { resourceUsage: { providerCalls: 2, providerAttempts: 3, failedProviderAttempts: 1, promptCacheHitTokens: 10, promptCacheMissTokens: 100, outputTokens: 20, apiCostUsd: 0.5, conservativeFailureDebitTokens: 244_000, conservativeFailureDebitUsd: 0.3, liveLatencyMilliseconds: 100, browserLaunches: 0, childProcesses: 0 } },
    { resourceUsage: { providerCalls: 5, providerAttempts: 5, failedProviderAttempts: 0, promptCacheHitTokens: 20, promptCacheMissTokens: 200, outputTokens: 40, apiCostUsd: 0.7, conservativeFailureDebitTokens: 0, conservativeFailureDebitUsd: 0, liveLatencyMilliseconds: 200, browserLaunches: 0, childProcesses: 0 } }
  ]);
  assert.equal(totals.providerCalls, 7);
  assert.equal(totals.providerAttempts, 8);
  assert.equal(totals.failedProviderAttempts, 1);
  assert.equal(totals.totalTokens, 390);
  assert.equal(totals.apiCostUsd, 1.2);
  assert.equal(totals.conservativeFailureDebitTokens, 244_000);
});

test("computes per-role repeat finding stability without mixing repeats into core outcomes", async () => {
  const { computeRepeatabilityV2 } = await subject();
  const finding = (surfaceId) => ({ findingId: `finding-${surfaceId}`, surfaceId, family: "F1", severity: "P0", code: "ANSWER_INDEPENDENT_MISMATCH", detail: "Synthetic repeat scoring fixture" });
  const findingsByRole = { "same-reviewer-critique": [finding("q-mc")] };
  const fixture = await offlineRunFixtureV2({ arm: "B_PRIME", findingsByRole });
  findingsByRole["same-reviewer-critique"].push(finding("q-fill"));
  const repeated = await runPackageRepeatV2({ ...fixture, originalReceipt: fixture.receipt,
    repeatPlanRow: { originalPackageId: fixture.receipt.packageId, arm: "B_PRIME", repeatGroupId: fixture.receipt.repeatGroupId, providerCalls: 2, repeatIndex: 1 } });
  const result = computeRepeatabilityV2({ coreReceipts: [fixture.receipt], repeatReceipts: [repeated], expectedPackages: [fixture.expectedPackage] });
  assert.equal(result.callPairs, 2);
  assert.equal(result.pairs.find((row) => row.role === "same-reviewer-critique").exactFindingKeyJaccard, 0.5);
  assert.equal(result.pairs.find((row) => row.role === "same-reviewer-revision").exactFindingKeyJaccard, 1);
  assert.equal(result.exactFindingKeyAgreement.jaccardMean, 0.75);
  assert.equal(result.includedInCoreEstimand, false);
});

for (const boundary of ["write", "resume"]) {
  test(`${boundary} rejects a semantically contradictory receipt with valid outer commitments`, async () => {
    const { readCommittedRunV2, writeCommittedRunV2 } = await subject();
    const root = await mkdtemp(path.join(os.tmpdir(), "mais-v2-semantic-resume-"));
    try {
      const { expectedPackage, receipt } = await committedFixture();
      if (boundary === "resume") await writeCommittedRunV2({ collectionRoot: root, receipt, expectedPackage });
      const invalid = structuredClone(receipt);
      invalid.findings = [{ findingId: "finding-1", surfaceId: expectedPackage.questions[0].id, family: "F2", severity: "P1", code: "MISSING_OPTIONS" }];
      invalid.surfaceResults[0].findingIds = ["finding-1"];
      const { evidenceSha256, ...surface } = invalid.surfaceResults[0];
      invalid.surfaceResults[0].evidenceSha256 = canonicalSha256(surface);
      const { receiptSha256, ...body } = invalid;
      invalid.receiptSha256 = canonicalSha256(body);
      if (boundary === "write") {
        await assert.rejects(() => writeCommittedRunV2({ collectionRoot: root, receipt: invalid, expectedPackage }), /surface|finding|disposition|semantic/i);
      } else {
        const directory = path.join(root, receipt.runId);
        const markerPath = path.join(directory, "COMMITTED.json");
        const marker = JSON.parse(await readFile(markerPath, "utf8"));
        marker.receiptSha256 = invalid.receiptSha256;
        marker.receiptFileCanonicalSha256 = canonicalSha256(invalid);
        const { markerSha256, ...markerBody } = marker;
        marker.markerSha256 = canonicalSha256(markerBody);
        await writeFile(path.join(directory, "receipt.json"), JSON.stringify(invalid));
        await writeFile(markerPath, JSON.stringify(marker));
        await assert.rejects(() => readCommittedRunV2({
          collectionRoot: root, expected: { runId: receipt.runId }, expectedPackage
        }), /surface|finding|disposition|semantic/i);
      }
    } finally { await rm(root, { recursive: true, force: true }); }
  });
}
