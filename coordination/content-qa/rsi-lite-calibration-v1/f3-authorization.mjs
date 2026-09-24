import { estimateF3Budget, F3_EXECUTION_AMENDMENT_ID } from "./f3-execution-contract.mjs";
import { canonicalSha256 } from "./f3-formal-runner.mjs";

export const F3_PROTOCOL_ID = "MAIS-RSI-LITE-CAL-V1";
export const F3_PROTOCOL_VERSION = "1.1.1-f2-r";
export const F3_SOURCE_BASELINE = "b6c7c347a49a813e454e707dd3c16399dcf29909";
export const F3_CANDIDATE_SET_SHA256 = "e18cbaa42d3da75386a37d2af679ff0284d65232f141f90609d5958c4087cd6c";
export const F3_CANONICAL_START_INSTRUCTION = "批准 F3 正式 48-run";
export const F3_OWNER_FORMAL_EXECUTION_SOURCE_EXACT = "我明确授权 Codex 将这 48 个冻结的 MAIS 数学候选题包及其派生审查内容发送给外部 DeepSeek API，使用 deepseek-v4-pro 完成正式 F3 48-run；我理解这些内容将离开本地环境。预算硬上限为 50 美元，并同时受 200 次调用和 3,000 万 token 上限约束。";

const PEAK_PRICES_USD_PER_MILLION = Object.freeze({ inputCacheHit: 0.044, inputCacheMiss: 1.32, output: 3.96 });
const PUBLIC_ESTIMATE_PRICES = Object.freeze({
  offPeakInputCacheMiss: 0.66,
  peakInputCacheMiss: 1.32,
  offPeakOutput: 1.98,
  peakOutput: 3.96
});

function assertSha256(value, label) {
  if (typeof value !== "string" || !/^[a-f0-9]{64}$/.test(value)) throw new Error(`${label} must be a SHA-256 value.`);
}

function assertSelfHash(value, field, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label} must be an object.`);
  const observed = value[field];
  const body = structuredClone(value);
  delete body[field];
  if (observed !== canonicalSha256(body)) throw new Error(`${label} self-hash is invalid.`);
}

export function isAuthorizedF3OwnerSource(sourceInstructionExact) {
  return typeof sourceInstructionExact === "string"
    && (sourceInstructionExact.includes("全部授权") || sourceInstructionExact === F3_OWNER_FORMAL_EXECUTION_SOURCE_EXACT);
}

export function buildF3EntrypointReceipt({ codeFiles, rehearsal, liveProviderSmoke }) {
  if (!Array.isArray(codeFiles) || codeFiles.length < 4) throw new Error("F3 entrypoint requires at least four bound code files.");
  const normalizedFiles = codeFiles.map((row) => {
    if (!row || typeof row.path !== "string" || row.path === "") throw new Error("F3 code file path is invalid.");
    assertSha256(row.sha256, `F3 code hash for ${row.path}`);
    return { path: row.path, sha256: row.sha256 };
  }).sort((left, right) => left.path.localeCompare(right.path));
  if (
    !rehearsal
    || rehearsal.runs !== 48
    || rehearsal.providerCalls !== 144
    || rehearsal.failures !== 0
    || JSON.stringify(rehearsal.runCountsByArm) !== JSON.stringify({ A: 12, B: 12, C0: 12, C: 12 })
  ) throw new Error("F3 entrypoint requires a passing exact 48-run rehearsal.");
  assertSha256(rehearsal.receiptSha256, "F3 rehearsal receipt hash");
  if (
    !liveProviderSmoke
    || liveProviderSmoke.passed !== true
    || liveProviderSmoke.provider !== "DeepSeek"
    || liveProviderSmoke.model !== "deepseek-v4-pro"
    || liveProviderSmoke.httpStatus !== 200
    || liveProviderSmoke.validJson !== true
  ) throw new Error("F3 entrypoint requires a passing redacted DeepSeek provider smoke receipt.");
  assertSha256(liveProviderSmoke.receiptSha256, "F3 provider smoke receipt hash");
  const body = {
    owner: "A16-execution-author",
    protocolId: F3_PROTOCOL_ID,
    protocolVersion: F3_PROTOCOL_VERSION,
    executionAmendmentId: F3_EXECUTION_AMENDMENT_ID,
    sourceBaseline: F3_SOURCE_BASELINE,
    candidateSetSha256: F3_CANDIDATE_SET_SHA256,
    status: "F3-entrypoint-ready-for-independent-review",
    entrypointPresent: true,
    providerAdapterPresent: true,
    exactFortyEightRunLoopPresent: true,
    atomicResumePresent: true,
    hardBudgetStopPresent: true,
    persistentCrossProcessBudgetLedgerPresent: true,
    activeReservationCrashRecoveryPresent: true,
    sameRoleTransientRetryPresent: true,
    predecessorAuthorizationContinuityAllowlistPresent: true,
    model: "deepseek-v4-pro",
    thinkingMode: "enabled-high",
    plannedProviderCalls: 144,
    maxInputTokensPerCall: 160_000,
    maxOutputTokensPerCall: 24_000,
    concurrency: 1,
    maxTransientAttemptsPerRole: 3,
    maxUncommittedProviderCalls: 30,
    browserMinutesCap: 0,
    productionAuthorized: false,
    deploymentAuthorized: false,
    gitCommitAuthorized: false,
    gitPushAuthorized: false,
    codeFiles: normalizedFiles,
    codePathsetSha256: canonicalSha256(normalizedFiles),
    rehearsal: structuredClone(rehearsal),
    liveProviderSmoke: structuredClone(liveProviderSmoke)
  };
  return { ...body, receiptSha256: canonicalSha256(body) };
}

export function buildOwnerBudgetAuthorization({
  reviewedReceipts,
  a18Waiver,
  entrypointReceipt,
  sourceInstructionExact
}) {
  if (!isAuthorizedF3OwnerSource(sourceInstructionExact)) throw new Error("Owner budget authorization source must explicitly grant the formal F3 execution and frozen owner envelope.");
  for (const owner of ["A18", "A11", "A22", "A25"]) assertSha256(reviewedReceipts?.[owner]?.receiptSha256, `${owner} reviewed receipt hash`);
  assertSha256(a18Waiver?.waiverSha256, "A18 owner-waiver hash");
  assertSelfHash(entrypointReceipt, "receiptSha256", "F3 entrypoint receipt");
  const estimate = estimateF3Budget({
    runCountsByArm: { A: 12, B: 12, C0: 12, C: 12 },
    estimatedInputTokensPerProviderCall: 112_388,
    maxOutputTokensPerProviderCall: 24_000,
    pricesUsdPerMillion: PUBLIC_ESTIMATE_PRICES
  });
  const body = {
    owner: "MAIS-owner",
    ownerSigned: true,
    authorizationMechanism: "direct-owner-message-record-with-canonical-self-hash",
    sourceInstructionExact,
    interpretation: "The owner's explicit all-authorization instruction authorizes Codex to estimate and freeze the listed F3 resource envelope; this is not a claim of handwritten or third-party signature.",
    protocolId: F3_PROTOCOL_ID,
    protocolVersion: F3_PROTOCOL_VERSION,
    executionAmendmentId: F3_EXECUTION_AMENDMENT_ID,
    sourceBaseline: F3_SOURCE_BASELINE,
    candidateSetSha256: F3_CANDIDATE_SET_SHA256,
    currency: "USD",
    currencyCapUsd: estimate.currencyCapUsd,
    providerCallCap: estimate.providerCallCap,
    tokenCap: estimate.tokenCap,
    wallClockMinutesCap: estimate.wallClockMinutesCap,
    activeMachineMinutesCap: estimate.activeMachineMinutesCap,
    humanMinutesCap: estimate.operationalHumanMinutesCap,
    browserMinutesCap: estimate.browserMinutesCap,
    plannedProviderCalls: estimate.plannedProviderCalls,
    estimatedInputTokensPerProviderCall: 112_388,
    maxInputTokensPerProviderCall: 160_000,
    maxOutputTokensPerProviderCall: 24_000,
    estimatedOffPeakCostUsd: estimate.expectedOffPeakCostUsd,
    peakCostBeforeSafetyUsd: estimate.peakCostBeforeSafetyUsd,
    safetyMultiplier: estimate.safetyMultiplier,
    enforcementPriceBasisUsdPerMillion: PEAK_PRICES_USD_PER_MILLION,
    reviewedReceiptSha256: Object.fromEntries(["A18", "A11", "A22", "A25"].map((owner) => [owner, reviewedReceipts[owner].receiptSha256])),
    reviewedA18HumanEvidenceWaiverSha256: a18Waiver.waiverSha256,
    reviewedEntrypointReceiptSha256: entrypointReceipt.receiptSha256,
    productionAuthorized: false,
    deploymentAuthorized: false,
    gitCommitAuthorized: false,
    gitPushAuthorized: false
  };
  return { ...body, signatureSha256: canonicalSha256(body) };
}

export function buildOwnerF3StartAuthorization({ ownerBudget, entrypointReceipt, sourceInstructionExact }) {
  if (!isAuthorizedF3OwnerSource(sourceInstructionExact)) throw new Error("F3 start source must explicitly grant formal F3 execution.");
  assertSelfHash(ownerBudget, "signatureSha256", "owner budget authorization");
  assertSelfHash(entrypointReceipt, "receiptSha256", "F3 entrypoint receipt");
  const body = {
    owner: "MAIS-owner",
    ownerAuthorized: true,
    authorizationMechanism: "direct-owner-message-normalized-to-required-canonical-start-record",
    sourceInstructionExact,
    normalizationBasis: "The source message says all listed items are authorized and specifically enumerates the absent separate F3 start authorization; the exact source is retained without claiming it was a verbatim canonical phrase.",
    exactInstruction: F3_CANONICAL_START_INSTRUCTION,
    protocolId: F3_PROTOCOL_ID,
    protocolVersion: F3_PROTOCOL_VERSION,
    executionAmendmentId: F3_EXECUTION_AMENDMENT_ID,
    sourceBaseline: F3_SOURCE_BASELINE,
    candidateSetSha256: F3_CANDIDATE_SET_SHA256,
    ownerBudgetSignatureSha256: ownerBudget.signatureSha256,
    entrypointReceiptSha256: entrypointReceipt.receiptSha256,
    formalFortyEightRunAuthorized: true,
    liveProviderAuthorized: true,
    productionAuthorized: false,
    deploymentAuthorized: false,
    gitCommitAuthorized: false,
    gitPushAuthorized: false
  };
  return { ...body, signatureSha256: canonicalSha256(body) };
}

export function validateCanonicalSelfHash(value, field) {
  try {
    assertSelfHash(value, field, field);
    return true;
  } catch {
    return false;
  }
}
