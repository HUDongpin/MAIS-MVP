import INTEGRITY_SCHEMA from "./schemas/ExecutionIntegrityEvidenceV2.schema.json" with { type: "json" };
import SCORE_SCHEMA from "./schemas/NaturalCaAggregateScoreReceiptV4.schema.json" with { type: "json" };

import {
  canonicalJsonV5R3,
  sealV5R3Artifact,
  sha256V5R3,
} from "./execution-integrity-v5-r3.mjs";
import {
  assertClosedSelfHashedAgainstV5R5,
  validateClosedSelfHashedAgainstV5R5,
} from "./schema-contract-v5-r5.mjs";

function requireCondition(condition, message) {
  if (!condition) throw new TypeError(message);
}

function callKey(call) {
  return `${call.itemHash}:${call.role}`;
}

function exactUniqueErrors(values) {
  return [...new Set(Array.isArray(values) ? values : [])];
}

export function deriveExecutionIntegrityEvidenceV5R6(input) {
  requireCondition(Array.isArray(input.expectedCallGraph) && Array.isArray(input.completedCalls),
    "R6 integrity requires expected and completed attempt graphs");
  const expectedKeys = input.expectedCallGraph.map(callKey);
  requireCondition(new Set(expectedKeys).size === expectedKeys.length, "R6 expected call graph contains duplicate item-role keys");
  const successful = input.completedCalls.filter(({ attemptStatus }) => attemptStatus === "SUCCEEDED");
  const successfulKeys = successful.map(callKey);
  const extraCompletedCalls = input.completedCalls.filter((call) => !expectedKeys.includes(callKey(call)));
  const missingSuccessfulCalls = input.expectedCallGraph.filter((call) => !successfulKeys.includes(callKey(call)));
  const duplicateSuccessfulCallKeys = [...new Set(successfulKeys.filter((value, index) => successfulKeys.indexOf(value) !== index))];
  const nonStateBoundCalls = input.completedCalls.filter(({ stateBound }) => stateBound !== true);
  const planInvalidCalls = input.completedCalls.filter(({ planHash, attemptOrdinal }) => !/^[0-9a-f]{64}$/u.test(planHash ?? "")
    || ![1, 2].includes(attemptOrdinal));
  const receiptChainErrors = exactUniqueErrors(input.receiptChainErrors);
  const providerTupleErrors = exactUniqueErrors(input.providerTupleErrors);
  const capErrors = exactUniqueErrors(input.capErrors);
  const receiptChainValid = receiptChainErrors.length === 0;
  const providerTupleValid = providerTupleErrors.length === 0;
  const capsValid = capErrors.length === 0;
  const terminalProviderFailure = (input.activeAttemptCount ?? 0) > 0 || missingSuccessfulCalls.length > 0
    || input.completedCalls.some(({ terminalProviderFailure }) => terminalProviderFailure === true);
  const unauthorizedProviderCall = extraCompletedCalls.length > 0 || nonStateBoundCalls.length > 0 || planInvalidCalls.length > 0;
  const materialDeviation = unauthorizedProviderCall || duplicateSuccessfulCallKeys.length > 0
    || input.completedCalls.some(({ canaryOrOrderViolation }) => canaryOrOrderViolation === true);
  const invalid = input.postResultDesignDrift === true || input.labelLeakage === true
    || input.thresholdFrozenAfterLabelOrResult === true || unauthorizedProviderCall || materialDeviation;
  const overallIntegrityDisposition = invalid ? "INVALID_FOR_GENERALIZATION"
    : !receiptChainValid || !providerTupleValid || !capsValid || terminalProviderFailure
      ? "EXECUTION_INTEGRITY_FAILED"
      : "INTACT_PENDING_FROZEN_METRIC_DECISION";
  const evidence = sealV5R3Artifact({
    schemaVersion: "ExecutionIntegrityEvidenceV2",
    designId: "MAIS-NATURAL-CA60-V5",
    activeRunnerRegistrationHash: input.activeRunnerRegistrationHash,
    expectedCallGraphHash: sha256V5R3(canonicalJsonV5R3(input.expectedCallGraph)),
    completedAttemptGraphHash: sha256V5R3(canonicalJsonV5R3(input.completedCalls)),
    expectedSuccessfulCallCount: input.expectedCallGraph.length,
    observedSuccessfulCallCount: successful.length,
    completedAttemptCount: input.completedCalls.length,
    extraCompletedCalls: extraCompletedCalls.map((call) => structuredClone(call)),
    missingSuccessfulCalls: missingSuccessfulCalls.map((call) => structuredClone(call)),
    duplicateSuccessfulCallKeys,
    nonStateBoundCallCount: nonStateBoundCalls.length,
    activeAttemptCount: input.activeAttemptCount ?? 0,
    receiptChainValid,
    providerTupleValid,
    capsValid,
    terminalProviderFailure,
    materialDeviation,
    postResultDesignDrift: input.postResultDesignDrift === true,
    labelLeakage: input.labelLeakage === true,
    unauthorizedProviderCall,
    thresholdFrozenAfterLabelOrResult: input.thresholdFrozenAfterLabelOrResult === true,
    receiptChainErrors,
    providerTupleErrors,
    capErrors,
    overallIntegrityDisposition,
    derivedAt: input.derivedAt,
  });
  assertClosedSelfHashedAgainstV5R5(evidence, INTEGRITY_SCHEMA, evidence.schemaVersion);
  return evidence;
}

export function validateExecutionIntegrityEvidenceV5R6(evidence) {
  return validateClosedSelfHashedAgainstV5R5(evidence, INTEGRITY_SCHEMA);
}

export function buildIncompleteExecutionScoreReceiptV5R6({
  activeRunnerRegistrationHash,
  inventoryHash,
  c0ExecutionSetHash,
  integrityEvidence,
  observedItemResultHashes,
  scoredAt,
}) {
  const integrityErrors = validateExecutionIntegrityEvidenceV5R6(integrityEvidence);
  requireCondition(integrityErrors.length === 0, integrityErrors.join("; "));
  requireCondition(integrityEvidence.activeRunnerRegistrationHash === activeRunnerRegistrationHash,
    "incomplete score integrity evidence does not bind the active R6 registration");
  requireCondition(integrityEvidence.overallIntegrityDisposition !== "INTACT_PENDING_FROZEN_METRIC_DECISION",
    "incomplete score receipt cannot replace a complete frozen metric analysis");
  requireCondition(Array.isArray(observedItemResultHashes) && observedItemResultHashes.length <= 60
    && observedItemResultHashes.every((value) => /^[0-9a-f]{64}$/u.test(value)),
  "incomplete score observed item-result hash set is invalid");
  const overallDecision = integrityEvidence.overallIntegrityDisposition;
  const score = sealV5R3Artifact({
    schemaVersion: "NaturalCaAggregateScoreReceiptV4",
    designId: "MAIS-NATURAL-CA60-V5",
    activeRunnerRegistrationHash,
    sampleExecutionInventoryHash: inventoryHash,
    c0ExecutionSetHash,
    executionIntegrityEvidenceHash: integrityEvidence.selfHash,
    executionIntegrityEvidence: structuredClone(integrityEvidence),
    analysisStatus: "INCOMPLETE_EXECUTION_NO_METRIC_INFERENCE",
    observedItemResultCount: observedItemResultHashes.length,
    observedItemResultSetHash: sha256V5R3(canonicalJsonV5R3(observedItemResultHashes)),
    missingItemCount: 60 - observedItemResultHashes.length,
    metricResults: null,
    overallDecision,
    decisionCeiling: "INCONCLUSIVE_MACHINE_REFERENCE",
    claimCeiling: "CALIFORNIA_RUNTIME_EGRESS_ELIGIBLE_MACHINE_REFERENCE_PILOT_ONLY",
    passClaimAllowed: false,
    limitedGeneralizationEvidenceAllowed: false,
    missingDataImputedAsNegative: false,
    scoredAt,
  });
  assertClosedSelfHashedAgainstV5R5(score, SCORE_SCHEMA, score.schemaVersion);
  return score;
}

export function validateAggregateScoreReceiptV5R6(receipt) {
  return validateClosedSelfHashedAgainstV5R5(receipt, SCORE_SCHEMA);
}
