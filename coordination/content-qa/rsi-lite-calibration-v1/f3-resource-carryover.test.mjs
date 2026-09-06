import assert from "node:assert/strict";
import test from "node:test";

import {
  buildF3ExplicitExternalEgressAuthorization,
  buildF3PriorExternalUsageCarryover,
  remainingF3CapsAfterCarryover,
  validateF3ExplicitExternalEgressAuthorization
} from "./f3-resource-carryover.mjs";

const entrypointReceiptSha256 = "a".repeat(64);
const ownerBudget = {
  currencyCapUsd: 50,
  providerCallCap: 200,
  tokenCap: 30_000_000
};
const sourceInstructionExact = "我明确授权 Codex 将这 48 个冻结的 MAIS 数学候选题包及其派生审查内容发送给外部 DeepSeek API，使用 deepseek-v4-pro 完成正式 F3 48-run；我理解这些内容将离开本地环境。预算硬上限为 50 美元，并同时受 200 次调用和 3,000 万 token 上限约束。";

test("binds the owner's exact payload-and-destination egress authorization without widening scope", () => {
  const authorization = buildF3ExplicitExternalEgressAuthorization({
    sourceInstructionExact,
    entrypointReceiptSha256,
    ownerBudget
  });
  assert.equal(authorization.payloadScope, "48 frozen MAIS mathematics candidate packages and derived review content");
  assert.equal(authorization.externalDestination, "DeepSeek API");
  assert.equal(authorization.model, "deepseek-v4-pro");
  assert.equal(authorization.dataLeavesLocalEnvironmentAcknowledged, true);
  assert.equal(authorization.productionAuthorized, false);
  assert.equal(authorization.deploymentAuthorized, false);
  assert.equal(validateF3ExplicitExternalEgressAuthorization({ authorization, sourceInstructionExact, entrypointReceiptSha256, ownerBudget }), true);
  assert.equal(validateF3ExplicitExternalEgressAuthorization({ authorization: { ...authorization, model: "other" }, sourceInstructionExact, entrypointReceiptSha256, ownerBudget }), false);
});

test("conservatively debits every pre-v2 external call from the one owner envelope", () => {
  const carryover = buildF3PriorExternalUsageCarryover({ entrypointReceiptSha256, ownerBudget });

  assert.equal(carryover.debit.providerCalls, 26);
  assert.equal(carryover.debit.tokens, 4_082_340);
  assert.equal(carryover.debit.usd, 6.733699104);
  assert.deepEqual(carryover.remainingCaps, {
    providerCallCap: 174,
    tokenCap: 25_917_660,
    currencyCapUsd: 43.266300896
  });
  assert.equal(carryover.failedNonstreamAttempts.providerCallUpperBound, 20);
  assert.equal(carryover.failedNonstreamAttempts.accountingBasis, "2 attempts x 2 concurrent runs x 5 maximum role calls");
  assert.match(carryover.carryoverSha256, /^[a-f0-9]{64}$/);
});

test("remaining-cap validation fails closed on entrypoint drift, tampering, or a different owner envelope", () => {
  const carryover = buildF3PriorExternalUsageCarryover({ entrypointReceiptSha256, ownerBudget });
  assert.deepEqual(remainingF3CapsAfterCarryover({ carryover, entrypointReceiptSha256, ownerBudget }), carryover.remainingCaps);

  assert.throws(
    () => remainingF3CapsAfterCarryover({ carryover, entrypointReceiptSha256: "b".repeat(64), ownerBudget }),
    /entrypoint/i
  );
  assert.throws(
    () => remainingF3CapsAfterCarryover({ carryover: { ...carryover, debit: { ...carryover.debit, providerCalls: 25 } }, entrypointReceiptSha256, ownerBudget }),
    /self-hash/i
  );
  assert.throws(
    () => remainingF3CapsAfterCarryover({ carryover, entrypointReceiptSha256, ownerBudget: { ...ownerBudget, currencyCapUsd: 51 } }),
    /owner budget/i
  );
});
