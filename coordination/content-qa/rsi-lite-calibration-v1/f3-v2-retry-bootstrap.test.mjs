import assert from "node:assert/strict";
import test from "node:test";

import {
  buildF3V2RetryBootstrap,
  validateF3V2RetryBootstrap
} from "./f3-v2-retry-bootstrap.mjs";

const ENTRYPOINT = "a".repeat(64);
const PREDECESSOR = "b".repeat(64);
const OUTPUT_ROOT = "/protected/.local/f3-v2";
const OWNER_BUDGET = Object.freeze({ providerCallCap: 200, tokenCap: 30_000_000, currencyCapUsd: 50 });

function receipts() {
  return Array.from({ length: 10 }, (_, index) => ({
    packageId: `pkg-${String(index).padStart(2, "0")}`,
    receiptSha256: String(index).padStart(64, "0"),
    resourceUsage: {
      providerCalls: 3,
      promptCacheHitTokens: 10,
      promptCacheMissTokens: 20,
      outputTokens: 30,
      apiCostUsd: 0.0002,
      conservativeFailureDebitTokens: 0,
      conservativeFailureDebitUsd: 0
    }
  }));
}

test("builds a self-hashed v2 retry bootstrap that leaves exactly fifteen uncommitted-call slots beyond the 144-run denominator", () => {
  const bootstrap = buildF3V2RetryBootstrap({
    entrypointReceiptSha256: ENTRYPOINT,
    predecessorAuthorizationBindingSha256: PREDECESSOR,
    outputRoot: OUTPUT_ROOT,
    committedReceipts: receipts(),
    ownerBudget: OWNER_BUDGET
  });
  assert.equal(bootstrap.committedCampaign.runCount, 10);
  assert.equal(bootstrap.committedCampaign.providerCalls, 30);
  assert.deepEqual(bootstrap.priorV2UncommittedDebit, { providerCalls: 15, tokens: 2_760_000, usd: 4.5936 });
  assert.equal(bootstrap.maxUncommittedProviderCalls, 30);
  assert.equal(bootstrap.remainingAdditionalFailureOrLostCallSlots, 15);
  assert.equal(bootstrap.concurrency, 1);
  assert.equal(bootstrap.maxTransientAttemptsPerRole, 3);
  assert.deepEqual(bootstrap.allowedResumeAuthorizationBindingSha256, [PREDECESSOR]);
  assert.match(bootstrap.bootstrapSha256, /^[a-f0-9]{64}$/);
  assert.equal(validateF3V2RetryBootstrap({
    bootstrap,
    entrypointReceiptSha256: ENTRYPOINT,
    predecessorAuthorizationBindingSha256: PREDECESSOR,
    outputRoot: OUTPUT_ROOT,
    committedReceipts: receipts(),
    ownerBudget: OWNER_BUDGET
  }), true);
});

test("rejects receipt drift, output-root drift, and any attempt to expand concurrency or retry slack", () => {
  const bootstrap = buildF3V2RetryBootstrap({
    entrypointReceiptSha256: ENTRYPOINT,
    predecessorAuthorizationBindingSha256: PREDECESSOR,
    outputRoot: OUTPUT_ROOT,
    committedReceipts: receipts(),
    ownerBudget: OWNER_BUDGET
  });
  for (const mutated of [
    { ...bootstrap, concurrency: 2 },
    { ...bootstrap, maxUncommittedProviderCalls: 31 },
    { ...bootstrap, outputRoot: `${OUTPUT_ROOT}-other` }
  ]) {
    assert.equal(validateF3V2RetryBootstrap({
      bootstrap: mutated,
      entrypointReceiptSha256: ENTRYPOINT,
      predecessorAuthorizationBindingSha256: PREDECESSOR,
      outputRoot: OUTPUT_ROOT,
      committedReceipts: receipts(),
      ownerBudget: OWNER_BUDGET
    }), false);
  }
  const changedReceipts = receipts();
  changedReceipts[0] = { ...changedReceipts[0], receiptSha256: "f".repeat(64) };
  assert.equal(validateF3V2RetryBootstrap({
    bootstrap,
    entrypointReceiptSha256: ENTRYPOINT,
    predecessorAuthorizationBindingSha256: PREDECESSOR,
    outputRoot: OUTPUT_ROOT,
    committedReceipts: changedReceipts,
    ownerBudget: OWNER_BUDGET
  }), false);
});
