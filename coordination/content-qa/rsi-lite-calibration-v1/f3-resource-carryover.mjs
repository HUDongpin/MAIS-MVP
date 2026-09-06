import { F3_EXECUTION_AMENDMENT_ID } from "./f3-execution-contract.mjs";
import {
  F3_CANDIDATE_SET_SHA256,
  F3_OWNER_FORMAL_EXECUTION_SOURCE_EXACT,
  F3_PROTOCOL_ID,
  F3_PROTOCOL_VERSION,
  F3_SOURCE_BASELINE
} from "./f3-authorization.mjs";
import { canonicalSha256 } from "./f3-formal-runner.mjs";

const PRICE_BASIS = Object.freeze({ inputCacheHit: 0.044, inputCacheMiss: 1.32, output: 3.96 });
const MAX_INPUT_TOKENS_PER_FAILED_CALL = 160_000;
const MAX_OUTPUT_TOKENS_PER_FAILED_CALL = 24_000;
export const F3_EXPLICIT_EGRESS_SOURCE_EXACT = F3_OWNER_FORMAL_EXECUTION_SOURCE_EXACT;

function assertSha256(value, label) {
  if (typeof value !== "string" || !/^[a-f0-9]{64}$/.test(value)) throw new Error(`${label} must be a SHA-256 value.`);
}

function exactCost({ promptCacheHitTokens, promptCacheMissTokens, outputTokens }) {
  return Number(((
    promptCacheHitTokens * PRICE_BASIS.inputCacheHit
    + promptCacheMissTokens * PRICE_BASIS.inputCacheMiss
    + outputTokens * PRICE_BASIS.output
  ) / 1_000_000).toFixed(9));
}

function ownerCaps(ownerBudget) {
  const caps = {
    providerCallCap: ownerBudget?.providerCallCap,
    tokenCap: ownerBudget?.tokenCap,
    currencyCapUsd: ownerBudget?.currencyCapUsd
  };
  if (caps.providerCallCap !== 200 || caps.tokenCap !== 30_000_000 || caps.currencyCapUsd !== 50) {
    throw new Error("Owner budget does not match the frozen USD 50 / 200-call / 30M-token envelope.");
  }
  return caps;
}

export function buildF3ExplicitExternalEgressAuthorization({ sourceInstructionExact, entrypointReceiptSha256, ownerBudget }) {
  if (sourceInstructionExact !== F3_EXPLICIT_EGRESS_SOURCE_EXACT) throw new Error("Explicit external-egress source instruction does not match the owner's exact payload-and-destination authorization.");
  assertSha256(entrypointReceiptSha256, "F3 entrypoint receipt hash");
  const caps = ownerCaps(ownerBudget);
  const body = {
    schemaVersion: "MAIS-F3-EXPLICIT-EXTERNAL-EGRESS-AUTHORIZATION-V1",
    owner: "MAIS-owner",
    ownerAuthorized: true,
    authorizationMechanism: "direct-owner-message-record-with-canonical-self-hash",
    sourceInstructionExact,
    protocolId: F3_PROTOCOL_ID,
    protocolVersion: F3_PROTOCOL_VERSION,
    executionAmendmentId: F3_EXECUTION_AMENDMENT_ID,
    sourceBaseline: F3_SOURCE_BASELINE,
    candidateSetSha256: F3_CANDIDATE_SET_SHA256,
    entrypointReceiptSha256,
    payloadScope: "48 frozen MAIS mathematics candidate packages and derived review content",
    externalDestination: "DeepSeek API",
    model: "deepseek-v4-pro",
    purpose: "formal F3 48-run calibration",
    dataLeavesLocalEnvironmentAcknowledged: true,
    ownerCaps: caps,
    formalFortyEightRunAuthorized: true,
    liveProviderAuthorized: true,
    productionAuthorized: false,
    deploymentAuthorized: false,
    gitCommitAuthorized: false,
    gitPushAuthorized: false
  };
  return { ...body, authorizationSha256: canonicalSha256(body) };
}

export function validateF3ExplicitExternalEgressAuthorization({ authorization, sourceInstructionExact, entrypointReceiptSha256, ownerBudget }) {
  try {
    const expected = buildF3ExplicitExternalEgressAuthorization({ sourceInstructionExact, entrypointReceiptSha256, ownerBudget });
    const body = structuredClone(authorization);
    delete body.authorizationSha256;
    return authorization?.authorizationSha256 === canonicalSha256(body)
      && canonicalSha256(authorization) === canonicalSha256(expected);
  } catch {
    return false;
  }
}

export function buildF3PriorExternalUsageCarryover({ entrypointReceiptSha256, ownerBudget }) {
  assertSha256(entrypointReceiptSha256, "F3 entrypoint receipt hash");
  const caps = ownerCaps(ownerBudget);
  const committedPartialCampaign = {
    committedRuns: 3,
    providerCalls: 4,
    promptCacheHitTokens: 0,
    promptCacheMissTokens: 347_750,
    outputTokens: 27_709,
    tokens: 375_459,
    usd: 0.56875764,
    runReceiptSha256: [
      "cbf854d94aa2a2d55657b73c346aa70a0133598478b4e80a4037d2f895e6cd78",
      "eca993d8d25b0c47625e4a0345c50a60fa440204e7d68aa22be66e31d618af3f",
      "83d827b1fcf8b9c9ba62f28d5db02d8f8bcf479602f0d82388e84e45d640ae2b"
    ].sort()
  };
  const failedProviderCallUpperBound = 2 * 2 * 5;
  const failedNonstreamAttempts = {
    attempts: 2,
    concurrentRunsPerAttempt: 2,
    maximumRoleCallsPerRun: 5,
    accountingBasis: "2 attempts x 2 concurrent runs x 5 maximum role calls",
    providerCallUpperBound: failedProviderCallUpperBound,
    maxInputTokensPerCall: MAX_INPUT_TOKENS_PER_FAILED_CALL,
    maxOutputTokensPerCall: MAX_OUTPUT_TOKENS_PER_FAILED_CALL,
    tokens: failedProviderCallUpperBound * (MAX_INPUT_TOKENS_PER_FAILED_CALL + MAX_OUTPUT_TOKENS_PER_FAILED_CALL),
    usd: Number((failedProviderCallUpperBound * exactCost({
      promptCacheHitTokens: 0,
      promptCacheMissTokens: MAX_INPUT_TOKENS_PER_FAILED_CALL,
      outputTokens: MAX_OUTPUT_TOKENS_PER_FAILED_CALL
    })).toFixed(9)),
    failure: "Provider response body could not be read; request-id=unavailable.",
    accountingInterpretation: "Each uncommitted concurrent run is conservatively debited as if all five provider roles were called at the maximum reservation, even though the observed failure may have occurred earlier."
  };
  const streamDiagnostic = {
    providerCalls: 1,
    promptCacheHitTokens: 16_384,
    promptCacheMissTokens: 49,
    outputTokens: 9_751,
    tokens: 26_184,
    usd: exactCost({ promptCacheHitTokens: 16_384, promptCacheMissTokens: 49, outputTokens: 9_751 }),
    candidateContentSent: true,
    contentPersisted: false,
    rawReasoningPersisted: false
  };
  const syntheticStreamSmoke = {
    providerCalls: 1,
    promptCacheHitTokens: 512,
    promptCacheMissTokens: 5,
    outputTokens: 180,
    tokens: 697,
    usd: exactCost({ promptCacheHitTokens: 512, promptCacheMissTokens: 5, outputTokens: 180 }),
    candidateContentSent: false,
    contentPersisted: false,
    rawReasoningPersisted: false
  };
  const debit = {
    providerCalls: committedPartialCampaign.providerCalls + failedNonstreamAttempts.providerCallUpperBound + streamDiagnostic.providerCalls + syntheticStreamSmoke.providerCalls,
    tokens: committedPartialCampaign.tokens + failedNonstreamAttempts.tokens + streamDiagnostic.tokens + syntheticStreamSmoke.tokens,
    usd: Number((committedPartialCampaign.usd + failedNonstreamAttempts.usd + streamDiagnostic.usd + syntheticStreamSmoke.usd).toFixed(9))
  };
  const remainingCaps = {
    providerCallCap: caps.providerCallCap - debit.providerCalls,
    tokenCap: caps.tokenCap - debit.tokens,
    currencyCapUsd: Number((caps.currencyCapUsd - debit.usd).toFixed(9))
  };
  const body = {
    schemaVersion: "MAIS-F3-PRIOR-EXTERNAL-USAGE-CARRYOVER-V1",
    protocolId: F3_PROTOCOL_ID,
    protocolVersion: F3_PROTOCOL_VERSION,
    executionAmendmentId: F3_EXECUTION_AMENDMENT_ID,
    sourceBaseline: F3_SOURCE_BASELINE,
    candidateSetSha256: F3_CANDIDATE_SET_SHA256,
    entrypointReceiptSha256,
    status: "conservative-prior-external-usage-debit",
    priceBasisUsdPerMillion: PRICE_BASIS,
    ownerCaps: caps,
    committedPartialCampaign,
    failedNonstreamAttempts,
    streamDiagnostic,
    syntheticStreamSmoke,
    debit,
    remainingCaps,
    productionAuthorized: false,
    deploymentAuthorized: false,
    gitCommitAuthorized: false,
    gitPushAuthorized: false
  };
  return { ...body, carryoverSha256: canonicalSha256(body) };
}

export function remainingF3CapsAfterCarryover({ carryover, entrypointReceiptSha256, ownerBudget }) {
  assertSha256(entrypointReceiptSha256, "F3 entrypoint receipt hash");
  const caps = ownerCaps(ownerBudget);
  if (carryover?.entrypointReceiptSha256 !== entrypointReceiptSha256) throw new Error("Prior-usage carryover is bound to a different F3 entrypoint receipt.");
  if (
    carryover?.ownerCaps?.providerCallCap !== caps.providerCallCap
    || carryover?.ownerCaps?.tokenCap !== caps.tokenCap
    || carryover?.ownerCaps?.currencyCapUsd !== caps.currencyCapUsd
  ) throw new Error("Prior-usage carryover owner budget binding drifted.");
  const body = structuredClone(carryover);
  delete body.carryoverSha256;
  if (carryover?.carryoverSha256 !== canonicalSha256(body)) throw new Error("Prior-usage carryover self-hash is invalid.");
  const expected = buildF3PriorExternalUsageCarryover({ entrypointReceiptSha256, ownerBudget });
  if (canonicalSha256(carryover) !== canonicalSha256(expected)) throw new Error("Prior-usage carryover facts or conservative debit drifted.");
  return structuredClone(carryover.remainingCaps);
}
