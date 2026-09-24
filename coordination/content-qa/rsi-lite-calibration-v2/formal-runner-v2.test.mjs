import assert from "node:assert/strict";
import test from "node:test";

import { createProviderCallRecordV2 } from "./call-record-contract.mjs";
import { canonicalSha256 } from "./candidate-set-builder.mjs";
import { samplePackage } from "./test-fixtures.mjs";
import { createBudgetLedger } from "../rsi-lite-calibration-v1/f3-formal-runner.mjs";

async function subject() {
  return import("./formal-runner-v2.mjs");
}

const PRICES = Object.freeze({ inputCacheHit: 0.003625, inputCacheMiss: 0.435, output: 0.87 });
const CAPS = Object.freeze({ currencyCapUsd: 25, providerCallCap: 220, tokenCap: 40_000_000 });

function planRow(arm, packageContent = samplePackage()) {
  return {
    packageId: packageContent.packageId,
    latentBundleId: "CA-W1-L1-number-operations",
    variantId: "V1",
    region: "CA",
    arm,
    contentSha256: canonicalSha256(packageContent),
    candidateSetSha256: "a".repeat(64),
    authorizationBinding: { authorizationSha256: "b".repeat(64) },
    repeatGroupId: arm === "A_PRIME" ? null : "repeat-precommitted-1"
  };
}

function mockReceipt({ role, packageId, projection, repeatGroupId, responseId }) {
  const inspectedSurfaceIds = [
    ...(projection.questions ?? []).map((row) => row.id),
    ...(projection.lessons ?? []).map((row) => row.id)
  ];
  const roleResult = {
    schemaVersion: 2,
    role,
    packageId,
    inspectionComplete: true,
    inspectedSurfaceIds,
    findings: []
  };
  const request = {
    provider: "DeepSeek",
    model: "deepseek-v4-pro",
    temperature: 0,
    topP: 1,
    maxOutputTokens: 24_000,
    stream: true,
    requestedSeed: null,
    seedSupport: "not-assumed"
  };
  const callRecord = createProviderCallRecordV2({
    packageId,
    role,
    projectionSha256: canonicalSha256(projection),
    repeatGroupId,
    request,
    response: {
      responseId,
      observedModel: "deepseek-v4-pro",
      createdAt: "2026-08-24T00:00:00.000Z",
      finishReason: "stop",
      usage: { promptCacheHitTokens: 0, promptCacheMissTokens: 100, outputTokens: 20 }
    }
  });
  return {
    provider: "DeepSeek",
    requestedModel: "deepseek-v4-pro",
    requestBodySha256: canonicalSha256(request),
    projectionSha256: canonicalSha256(projection),
    providerResponseSha256: canonicalSha256(responseId),
    latencyMs: 10,
    usage: { promptCacheHitTokens: 0, promptCacheMissTokens: 100, completionTokens: 20, totalTokens: 120 },
    callRecord,
    roleResult
  };
}

function mockAdapter({ failFirst = false, responsePrefix = "response" } = {}) {
  const calls = [];
  let invocation = 0;
  return {
    provider: "DeepSeek",
    model: "deepseek-v4-pro",
    executionMode: "offline-mock",
    calls,
    async runRole(input) {
      invocation += 1;
      calls.push(structuredClone(input));
      if (failFirst && invocation === 1) {
        const error = new Error("transient fixture");
        error.retryable = true;
        throw error;
      }
      return mockReceipt({ ...input, responseId: `${responsePrefix}-${invocation}` });
    }
  };
}

function ledger() {
  return createBudgetLedger({ caps: CAPS, pricesUsdPerMillion: PRICES });
}

test("executes A-prime with zero provider calls and complete deterministic coverage", async () => {
  const { runPackageV2 } = await subject();
  const packageContent = samplePackage();
  const adapter = mockAdapter();
  const receipt = await runPackageV2({ planRow: planRow("A_PRIME", packageContent), packageContent, providerAdapter: adapter, budgetLedger: ledger() });
  assert.equal(adapter.calls.length, 0);
  assert.equal(receipt.resourceUsage.providerCalls, 0);
  assert.equal(receipt.roleExecutions.length, 1);
  assert.equal(receipt.coverage.notInspected, 0);
  assert.equal(receipt.liveProviderUsed, false);
  assert.equal(receipt.formalExecutionAuthorized, false);
  assert.equal(receipt.executionMode, "offline-mock");
  assert.match(receipt.receiptSha256, /^[a-f0-9]{64}$/);
});

test("executes B-prime critique then revision and aggregates baseline plus revision only", async () => {
  const { runPackageV2 } = await subject();
  const packageContent = samplePackage();
  const adapter = mockAdapter();
  const receipt = await runPackageV2({ planRow: planRow("B_PRIME", packageContent), packageContent, providerAdapter: adapter, budgetLedger: ledger() });
  assert.deepEqual(adapter.calls.map((row) => row.role), ["same-reviewer-critique", "same-reviewer-revision"]);
  assert.equal(adapter.calls[1].projection.reviewContext.priorRoleResult.role, "same-reviewer-critique");
  assert.equal(receipt.resourceUsage.providerCalls, 2);
  assert.equal(receipt.resourceUsage.providerAttempts, 2);
  assert.equal(receipt.liveProviderUsed, false);
  assert.equal(receipt.formalExecutionAuthorized, false);
  assert.deepEqual(receipt.aggregation.includedRoles, ["deterministic-baseline", "same-reviewer-revision"]);
  assert.ok(receipt.roleExecutions.filter((row) => row.providerCalls === 1).every((row) => row.projectionSha256 === canonicalSha256(row.projection)));
});

test("executes C0-prime as five independent bounded reviewer roles", async () => {
  const { C0_PROVIDER_ROLES, runPackageV2 } = await subject();
  const packageContent = samplePackage();
  const adapter = mockAdapter();
  const receipt = await runPackageV2({ planRow: planRow("C0_PRIME", packageContent), packageContent, providerAdapter: adapter, budgetLedger: ledger() });
  assert.deepEqual(adapter.calls.map((row) => row.role), C0_PROVIDER_ROLES);
  assert.equal(receipt.resourceUsage.providerCalls, 5);
  assert.equal(receipt.resourceUsage.providerAttempts, 5);
  assert.equal(receipt.coverage.notInspected, 0);
});

test("counts a failed retry as an attempt and conservative debit but only a valid result as a success", async () => {
  const { runPackageV2 } = await subject();
  const packageContent = samplePackage();
  const adapter = mockAdapter({ failFirst: true });
  const budgetLedger = ledger();
  const receipt = await runPackageV2({
    planRow: planRow("B_PRIME", packageContent),
    packageContent,
    providerAdapter: adapter,
    budgetLedger,
    maxAttemptsPerRole: 2
  });
  assert.equal(receipt.resourceUsage.providerCalls, 2);
  assert.equal(receipt.resourceUsage.providerAttempts, 3);
  assert.equal(receipt.resourceUsage.failedProviderAttempts, 1);
  assert.ok(receipt.resourceUsage.conservativeFailureDebitTokens > 0);
  assert.equal(budgetLedger.snapshot().providerCalls, 3);
});

test("repeats the exact frozen core projections and request parameters without feeding repeat critique into revision", async () => {
  const { runPackageRepeatV2, runPackageV2 } = await subject();
  const packageContent = samplePackage();
  const coreAdapter = mockAdapter();
  const core = await runPackageV2({ planRow: planRow("B_PRIME", packageContent), packageContent, providerAdapter: coreAdapter, budgetLedger: ledger() });
  const repeatAdapter = mockAdapter({ responsePrefix: "repeat-response" });
  const repeated = await runPackageRepeatV2({
    originalReceipt: core,
    expectedPackage: packageContent,
    providerAdapter: repeatAdapter,
    budgetLedger: ledger(),
    repeatPlanRow: {
      repeatGroupId: "repeat-precommitted-1",
      originalPackageId: packageContent.packageId,
      arm: "B_PRIME",
      providerCalls: 2,
      repeatIndex: 1
    }
  });
  const originals = core.roleExecutions.filter((row) => row.providerCalls === 1);
  assert.equal(repeated.liveProviderUsed, false);
  assert.equal(repeated.formalExecutionAuthorized, false);
  assert.equal(repeated.roleExecutions.length, 2);
  repeated.roleExecutions.forEach((execution, index) => {
    assert.equal(execution.projectionSha256, originals[index].projectionSha256);
    assert.equal(execution.providerReceipt.callRecord.requestParametersSha256, originals[index].providerReceipt.callRecord.requestParametersSha256);
    assert.notEqual(execution.providerReceipt.callRecord.response.responseId, originals[index].providerReceipt.callRecord.response.responseId);
  });
  assert.equal(
    canonicalSha256(repeatAdapter.calls[1].projection.reviewContext.priorRoleResult),
    canonicalSha256(coreAdapter.calls[1].projection.reviewContext.priorRoleResult)
  );
});

test("successful provider execution is not retried or debited as a failure when settlement throws", async () => {
  const { runPackageV2 } = await subject();
  const packageContent = samplePackage();
  const adapter = mockAdapter();
  const backingLedger = ledger();
  let failureSettlements = 0;
  const settlementError = Object.assign(new Error("fixture journal CAS drift"), { retryable: true });
  const budgetLedger = {
    reserve: (...args) => backingLedger.reserve(...args),
    settleSuccess() { throw settlementError; },
    settleFailure(...args) {
      failureSettlements += 1;
      return backingLedger.settleFailure(...args);
    }
  };
  await assert.rejects(() => runPackageV2({
    planRow: planRow("B_PRIME", packageContent), packageContent,
    providerAdapter: adapter, budgetLedger, maxAttemptsPerRole: 2
  }), (error) => error === settlementError);
  assert.equal(failureSettlements, 0);
  assert.equal(adapter.calls.length, 1);
});
