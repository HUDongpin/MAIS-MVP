import path from "node:path";

import { F3_EXECUTION_AMENDMENT_ID } from "./f3-execution-contract.mjs";
import {
  F3_CANDIDATE_SET_SHA256,
  F3_PROTOCOL_ID,
  F3_PROTOCOL_VERSION,
  F3_SOURCE_BASELINE
} from "./f3-authorization.mjs";
import { canonicalSha256 } from "./f3-formal-runner.mjs";

const PRE_V2_CARRYOVER = Object.freeze({ providerCalls: 26, tokens: 4_082_340, usd: 6.733699104 });
const PRIOR_V2_UNCOMMITTED_DEBIT = Object.freeze({ providerCalls: 15, tokens: 2_760_000, usd: 4.5936 });
const FORMAL_SUCCESSFUL_CALL_DENOMINATOR = 144;

function assertSha256(value, label) {
  if (typeof value !== "string" || !/^[a-f0-9]{64}$/.test(value)) throw new Error(`${label} must be a SHA-256 value.`);
}

function ownerCaps(ownerBudget) {
  const caps = {
    providerCallCap: ownerBudget?.providerCallCap,
    tokenCap: ownerBudget?.tokenCap,
    currencyCapUsd: ownerBudget?.currencyCapUsd
  };
  if (caps.providerCallCap !== 200 || caps.tokenCap !== 30_000_000 || caps.currencyCapUsd !== 50) throw new Error("V2 retry bootstrap owner caps drifted.");
  return caps;
}

function finiteNonnegative(value, label) {
  if (!Number.isFinite(value) || value < 0) throw new Error(`${label} must be a finite non-negative number.`);
  return value;
}

function aggregateCommitted(receipts) {
  if (!Array.isArray(receipts) || receipts.length !== 10) throw new Error("V2 retry bootstrap requires exactly ten committed run receipts.");
  const commitments = receipts.map((receipt) => {
    assertSha256(receipt?.receiptSha256, `receipt hash for ${receipt?.packageId ?? "unknown package"}`);
    if (typeof receipt?.packageId !== "string" || receipt.packageId === "") throw new Error("V2 retry bootstrap receipt package ID is invalid.");
    return { packageId: receipt.packageId, receiptSha256: receipt.receiptSha256 };
  }).sort((left, right) => left.packageId.localeCompare(right.packageId));
  if (new Set(commitments.map((row) => row.packageId)).size !== 10) throw new Error("V2 retry bootstrap contains duplicate committed package IDs.");
  const resourceUsage = receipts.reduce((total, receipt) => {
    const usage = receipt.resourceUsage ?? {};
    total.providerCalls += finiteNonnegative(usage.providerCalls ?? 0, "committed provider calls");
    total.providerAttempts += finiteNonnegative(usage.providerAttempts ?? usage.providerCalls ?? 0, "committed provider attempts");
    total.promptCacheHitTokens += finiteNonnegative(usage.promptCacheHitTokens ?? 0, "committed cache-hit tokens");
    total.promptCacheMissTokens += finiteNonnegative(usage.promptCacheMissTokens ?? 0, "committed cache-miss tokens");
    total.outputTokens += finiteNonnegative(usage.outputTokens ?? 0, "committed output tokens");
    total.apiCostUsd = Number((total.apiCostUsd + finiteNonnegative(usage.apiCostUsd ?? 0, "committed API cost")).toFixed(9));
    total.conservativeFailureDebitTokens += finiteNonnegative(usage.conservativeFailureDebitTokens ?? 0, "committed failure tokens");
    total.conservativeFailureDebitUsd = Number((total.conservativeFailureDebitUsd + finiteNonnegative(usage.conservativeFailureDebitUsd ?? 0, "committed failure cost")).toFixed(9));
    return total;
  }, {
    providerCalls: 0,
    providerAttempts: 0,
    promptCacheHitTokens: 0,
    promptCacheMissTokens: 0,
    outputTokens: 0,
    apiCostUsd: 0,
    conservativeFailureDebitTokens: 0,
    conservativeFailureDebitUsd: 0
  });
  if (resourceUsage.providerCalls !== 30 || resourceUsage.providerAttempts !== 30) throw new Error("V2 retry bootstrap requires the observed 30 committed successful provider calls and no committed retry attempts.");
  const tokens = resourceUsage.promptCacheHitTokens + resourceUsage.promptCacheMissTokens + resourceUsage.outputTokens + resourceUsage.conservativeFailureDebitTokens;
  const usd = Number((resourceUsage.apiCostUsd + resourceUsage.conservativeFailureDebitUsd).toFixed(9));
  return {
    runCount: receipts.length,
    providerCalls: resourceUsage.providerCalls,
    providerAttempts: resourceUsage.providerAttempts,
    tokens,
    usd,
    resourceUsage,
    receiptCommitments: commitments,
    receiptCommitmentSha256: canonicalSha256(commitments)
  };
}

export function buildF3V2RetryBootstrap({
  entrypointReceiptSha256,
  predecessorAuthorizationBindingSha256,
  outputRoot,
  committedReceipts,
  ownerBudget
}) {
  assertSha256(entrypointReceiptSha256, "successor F3 entrypoint receipt hash");
  assertSha256(predecessorAuthorizationBindingSha256, "predecessor authorization binding hash");
  if (!path.isAbsolute(outputRoot)) throw new Error("V2 retry bootstrap output root must be absolute.");
  const caps = ownerCaps(ownerBudget);
  const committedCampaign = aggregateCommitted(committedReceipts);
  const maxUncommittedProviderCalls = (caps.providerCallCap - PRE_V2_CARRYOVER.providerCalls) - FORMAL_SUCCESSFUL_CALL_DENOMINATOR;
  const remainingAdditionalFailureOrLostCallSlots = maxUncommittedProviderCalls - PRIOR_V2_UNCOMMITTED_DEBIT.providerCalls;
  if (maxUncommittedProviderCalls !== 30 || remainingAdditionalFailureOrLostCallSlots !== 15) throw new Error("V2 retry bootstrap provider-call slack calculation drifted.");
  const cumulativeConservativeUsage = {
    providerCalls: PRE_V2_CARRYOVER.providerCalls + committedCampaign.providerAttempts + PRIOR_V2_UNCOMMITTED_DEBIT.providerCalls,
    tokens: PRE_V2_CARRYOVER.tokens + committedCampaign.tokens + PRIOR_V2_UNCOMMITTED_DEBIT.tokens,
    usd: Number((PRE_V2_CARRYOVER.usd + committedCampaign.usd + PRIOR_V2_UNCOMMITTED_DEBIT.usd).toFixed(9))
  };
  const remainingOwnerCaps = {
    providerCalls: caps.providerCallCap - cumulativeConservativeUsage.providerCalls,
    tokens: caps.tokenCap - cumulativeConservativeUsage.tokens,
    usd: Number((caps.currencyCapUsd - cumulativeConservativeUsage.usd).toFixed(9))
  };
  const body = {
    schemaVersion: "MAIS-F3-V2-PERSISTENT-RETRY-BOOTSTRAP-V1",
    protocolId: F3_PROTOCOL_ID,
    protocolVersion: F3_PROTOCOL_VERSION,
    executionAmendmentId: F3_EXECUTION_AMENDMENT_ID,
    sourceBaseline: F3_SOURCE_BASELINE,
    candidateSetSha256: F3_CANDIDATE_SET_SHA256,
    status: "persistent-resume-authorized-within-original-owner-envelope",
    entrypointReceiptSha256,
    predecessorAuthorizationBindingSha256,
    allowedResumeAuthorizationBindingSha256: [predecessorAuthorizationBindingSha256],
    outputRoot,
    ownerCaps: caps,
    preV2ExternalUsageCarryover: PRE_V2_CARRYOVER,
    committedCampaign,
    priorV2UncommittedDebit: PRIOR_V2_UNCOMMITTED_DEBIT,
    formalSuccessfulProviderCallDenominator: FORMAL_SUCCESSFUL_CALL_DENOMINATOR,
    remainingSuccessfulProviderCalls: FORMAL_SUCCESSFUL_CALL_DENOMINATOR - committedCampaign.providerCalls,
    maxUncommittedProviderCalls,
    remainingAdditionalFailureOrLostCallSlots,
    concurrency: 1,
    maxTransientAttemptsPerRole: 3,
    cumulativeConservativeUsage,
    remainingOwnerCaps,
    retryPolicy: {
      retryable: ["pre-http-network-failure", "HTTP-408", "HTTP-409", "HTTP-429", "HTTP-5xx", "SSE-read-interruption", "SSE-truncation", "missing-final-usage"],
      nonRetryable: ["model-JSON-invalid", "role-result-contract-invalid", "HTTP-4xx-other-than-408-409-429"],
      sameRoleOnly: true,
      packageMutationAllowed: false,
      stopWhenAnyOwnerCapWouldBeExceeded: true
    },
    productionAuthorized: false,
    deploymentAuthorized: false,
    gitCommitAuthorized: false,
    gitPushAuthorized: false
  };
  return { ...body, bootstrapSha256: canonicalSha256(body) };
}

export function validateF3V2RetryBootstrap(args) {
  try {
    const expected = buildF3V2RetryBootstrap(args);
    const { bootstrapSha256, ...body } = args.bootstrap ?? {};
    return bootstrapSha256 === canonicalSha256(body) && canonicalSha256(args.bootstrap) === canonicalSha256(expected);
  } catch {
    return false;
  }
}
