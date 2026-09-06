import { validateA18HumanEvidenceOwnerWaiver } from "./a18-owner-waiver.mjs";
import { F3_EXECUTION_AMENDMENT_ID } from "./f3-execution-contract.mjs";
import {
  F3_CANONICAL_START_INSTRUCTION,
  F3_CANDIDATE_SET_SHA256,
  F3_PROTOCOL_ID,
  F3_PROTOCOL_VERSION,
  F3_SOURCE_BASELINE,
  isAuthorizedF3OwnerSource,
  validateCanonicalSelfHash
} from "./f3-authorization.mjs";
import { canonicalSha256 } from "./f3-formal-runner.mjs";

function blocker(code, detail) {
  return { code, detail };
}

function baseBinding(value) {
  return value?.protocolId === F3_PROTOCOL_ID
    && value?.protocolVersion === F3_PROTOCOL_VERSION
    && value?.executionAmendmentId === F3_EXECUTION_AMENDMENT_ID
    && value?.sourceBaseline === F3_SOURCE_BASELINE
    && value?.candidateSetSha256 === F3_CANDIDATE_SET_SHA256;
}

function validEntrypoint(receipt) {
  return baseBinding(receipt)
    && validateCanonicalSelfHash(receipt, "receiptSha256")
    && receipt.status === "F3-entrypoint-ready-for-independent-review"
    && receipt.entrypointPresent === true
    && receipt.providerAdapterPresent === true
    && receipt.exactFortyEightRunLoopPresent === true
    && receipt.atomicResumePresent === true
    && receipt.hardBudgetStopPresent === true
    && receipt.persistentCrossProcessBudgetLedgerPresent === true
    && receipt.activeReservationCrashRecoveryPresent === true
    && receipt.sameRoleTransientRetryPresent === true
    && receipt.predecessorAuthorizationContinuityAllowlistPresent === true
    && receipt.model === "deepseek-v4-pro"
    && receipt.thinkingMode === "enabled-high"
    && receipt.plannedProviderCalls === 144
    && receipt.maxInputTokensPerCall === 160_000
    && receipt.maxOutputTokensPerCall === 24_000
    && receipt.concurrency === 1
    && receipt.maxTransientAttemptsPerRole === 3
    && receipt.maxUncommittedProviderCalls === 30
    && receipt.browserMinutesCap === 0
    && receipt.rehearsal?.runs === 48
    && receipt.rehearsal?.providerCalls === 144
    && receipt.rehearsal?.failures === 0
    && receipt.liveProviderSmoke?.passed === true
    && receipt.liveProviderSmoke?.httpStatus === 200
    && receipt.liveProviderSmoke?.validJson === true
    && receipt.productionAuthorized === false
    && receipt.deploymentAuthorized === false;
}

function validExecutionGate(owner, receipt, entrypointReceipt) {
  if (!baseBinding(receipt) || !validateCanonicalSelfHash(receipt, "receiptSha256") || receipt.owner !== owner || receipt.independent !== true) return false;
  if (receipt.entrypointReceiptSha256 !== entrypointReceipt?.receiptSha256 || !/^[a-f0-9]{64}$/.test(receipt.evidenceSha256 ?? "")) return false;
  if (owner === "A11") {
    return receipt.verdict === "approved-for-F3-execution"
      && receipt.rehearsalRuns === 48
      && receipt.rehearsalProviderCalls === 144
      && receipt.failures === 0;
  }
  if (owner === "A22") {
    return receipt.verdict === "approved-for-F3-execution"
      && receipt.seatbeltRuntimeRehearsalPass === true
      && receipt.credentialEnvironmentAbsent === true
      && receipt.networkDenied === true
      && receipt.repositoryReadDenied === true;
  }
  if (owner === "A25") {
    return receipt.verdict === "approved-for-F3-execution-intake"
      && receipt.isolatedWorktree === true
      && receipt.mainNotMutated === true
      && receipt.stagedPaths === 0
      && receipt.trackedUnstagedPaths === 0
      && receipt.commitPushPerformed === false;
  }
  return false;
}

function validBudget(budget, gateReceipts, waiver, entrypointReceipt) {
  if (!baseBinding(budget) || !validateCanonicalSelfHash(budget, "signatureSha256") || budget.ownerSigned !== true) return false;
  if (
    budget.currency !== "USD"
    || budget.currencyCapUsd !== 50
    || budget.providerCallCap !== 200
    || budget.tokenCap !== 30_000_000
    || budget.wallClockMinutesCap !== 720
    || budget.activeMachineMinutesCap !== 720
    || budget.humanMinutesCap !== 120
    || budget.browserMinutesCap !== 0
    || budget.plannedProviderCalls !== 144
    || budget.maxInputTokensPerProviderCall !== 160_000
    || budget.maxOutputTokensPerProviderCall !== 24_000
  ) return false;
  if (budget.reviewedEntrypointReceiptSha256 !== entrypointReceipt?.receiptSha256) return false;
  if (budget.reviewedA18HumanEvidenceWaiverSha256 !== waiver?.waiverSha256) return false;
  return ["A18", "A11", "A22", "A25"].every((owner) => budget.reviewedReceiptSha256?.[owner] === gateReceipts?.[owner]?.receiptSha256);
}

function validStartAuthorization(authorization, budget, entrypointReceipt) {
  return baseBinding(authorization)
    && validateCanonicalSelfHash(authorization, "signatureSha256")
    && authorization.ownerAuthorized === true
    && authorization.exactInstruction === F3_CANONICAL_START_INSTRUCTION
    && isAuthorizedF3OwnerSource(authorization.sourceInstructionExact)
    && authorization.ownerBudgetSignatureSha256 === budget?.signatureSha256
    && authorization.entrypointReceiptSha256 === entrypointReceipt?.receiptSha256
    && authorization.formalFortyEightRunAuthorized === true
    && authorization.liveProviderAuthorized === true
    && authorization.productionAuthorized === false
    && authorization.deploymentAuthorized === false
    && authorization.gitCommitAuthorized === false
    && authorization.gitPushAuthorized === false;
}

export function buildF3StartPreflightDecision({
  entrypointReceipt,
  gateReceipts = {},
  a18HumanEvidenceOwnerWaiver,
  ownerBudget,
  ownerStartAuthorization
}) {
  const blockers = [];
  const gateAcceptance = {};
  if (!validEntrypoint(entrypointReceipt)) blockers.push(blocker("F3-execution-entrypoint", "The formal provider adapter, exact 48-run campaign, rehearsal, smoke, or bound code-pathset receipt is absent or drifted."));

  const a18Accepted = validateA18HumanEvidenceOwnerWaiver(
    a18HumanEvidenceOwnerWaiver,
    { sourceBaseline: F3_SOURCE_BASELINE, candidateSetSha256: F3_CANDIDATE_SET_SHA256, a18Receipt: gateReceipts.A18 }
  );
  gateAcceptance.A18 = a18Accepted ? "machine-ready-receipt-plus-owner-human-evidence-waiver" : "not-accepted";
  if (!a18Accepted) blockers.push(blocker("A18-receipt", "The unchanged candidate requires its exact independent machine-ready A18 receipt plus the pilot-scoped owner human-evidence waiver."));
  for (const owner of ["A11", "A22", "A25"]) {
    const accepted = validExecutionGate(owner, gateReceipts[owner], entrypointReceipt);
    gateAcceptance[owner] = accepted ? "independent-F3-execution-receipt" : "not-accepted";
    if (!accepted) blockers.push(blocker(`${owner}-receipt`, `${owner} must independently approve the exact F3 entrypoint receipt and its required rehearsal or worktree invariants.`));
  }
  if (!validBudget(ownerBudget, gateReceipts, a18HumanEvidenceOwnerWaiver, entrypointReceipt)) {
    blockers.push(blocker("owner-budget", "The owner budget must bind the exact A18/A11/A22/A25 and entrypoint hashes and retain the frozen USD 50 / 200-call / 30M-token / zero-browser caps."));
  }
  if (!validStartAuthorization(ownerStartAuthorization, ownerBudget, entrypointReceipt)) {
    blockers.push(blocker("separate-F3-start-authorization", "The preserved all-authorization source must normalize to the canonical separate F3 start instruction and bind the final budget and entrypoint hashes."));
  }
  const formalExecutionAuthorized = blockers.length === 0;
  const body = {
    protocolId: F3_PROTOCOL_ID,
    protocolVersion: F3_PROTOCOL_VERSION,
    executionAmendmentId: F3_EXECUTION_AMENDMENT_ID,
    sourceBaseline: F3_SOURCE_BASELINE,
    candidateSetSha256: F3_CANDIDATE_SET_SHA256,
    gateAcceptance,
    entrypointReceiptSha256: entrypointReceipt?.receiptSha256 ?? null,
    ownerBudgetSignatureSha256: ownerBudget?.signatureSha256 ?? null,
    ownerStartAuthorizationSha256: ownerStartAuthorization?.signatureSha256 ?? null,
    formalExecutionAuthorized,
    executionEntrypointPresent: validEntrypoint(entrypointReceipt),
    liveProviderAuthorized: formalExecutionAuthorized,
    productionAuthorized: false,
    deploymentAuthorized: false,
    gitCommitAuthorized: false,
    gitPushAuthorized: false,
    blockers,
    interpretation: formalExecutionAuthorized
      ? "Authorized only for the protected, content-only formal 48-run calibration with the exact bound DeepSeek entrypoint and hard resource caps."
      : "Fail-closed: no formal provider call may start until every blocker is removed."
  };
  return { ...body, preflightSha256: canonicalSha256(body) };
}
