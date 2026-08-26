import DESIGN from "../../research/mais-natural-ca60-v1/versions/design-v5/design-registration.json" with { type: "json" };
import {
  canonicalJsonV5R3,
  sealV5R3Artifact,
} from "./execution-integrity-v5-r3.mjs";
import {
  assertClosedSelfHashedArtifactV5R4,
  validateClosedSelfHashedArtifactV5R4,
} from "./schema-contract-v5-r4.mjs";
import {
  executionLedgerTerminalEvidenceV5R4,
  validateExecutionLedgerEntriesV5R4,
} from "./atomic-execution-ledger-v5-r4.mjs";
import { validateCanaryGateReceiptV5R4 } from "./execution-state-v5-r4.mjs";
import { validateAggregateScoreReceiptV5R4 } from "./scorer-v5-r4.mjs";

const LIMITATIONS = Object.freeze([
  "CALIFORNIA_EGRESS_ELIGIBLE_SUBPOPULATION_ONLY",
  "MACHINE_REFERENCE_PANEL_NOT_HUMAN_GOLD",
  "SAME_MODEL_CORRELATED_ERROR_RISK",
  "CA60_STRUCTURALLY_UNDERPOWERED_FOR_JOINT_SURFACE_GATES",
  "NO_CROSS_REGION_COMPARISON",
  "NO_GENERAL_MACHINE_QA_VALIDITY_CLAIM",
  "NO_AUTOMATIC_PROMOTION_DEPLOYMENT_OR_LIVE_CONTENT_MUTATION",
]);

function requireCondition(condition, message) { if (!condition) throw new TypeError(message); }
function validTime(value) { return typeof value === "string" && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value; }

export function buildFinalExecutionVerificationReceiptV5R4(input) {
  const scoreErrors = validateAggregateScoreReceiptV5R4(input);
  const referenceLedgerErrors = validateExecutionLedgerEntriesV5R4({ entries: input.referenceLedgerEntries, authorization: input.openAIAuthorization, inventory: input.inventory });
  const deepSeekLedgerErrors = validateExecutionLedgerEntriesV5R4({ entries: input.deepSeekLedgerEntries, authorization: input.deepSeekAuthorization, inventory: input.inventory });
  const canaryErrors = validateCanaryGateReceiptV5R4({ ...input, canaryGate: input.canaryGate });
  requireCondition(scoreErrors.length + referenceLedgerErrors.length + deepSeekLedgerErrors.length + canaryErrors.length === 0,
    [...scoreErrors, ...referenceLedgerErrors, ...deepSeekLedgerErrors, ...canaryErrors].join("; "));
  requireCondition(validTime(input.verifiedAt) && Date.parse(input.verifiedAt) >= Date.parse(input.scoreReceipt.scoredAt), "final verification chronology is invalid");
  const referenceChain = executionLedgerTerminalEvidenceV5R4(input.referenceLedgerEntries);
  const deepSeekChain = executionLedgerTerminalEvidenceV5R4(input.deepSeekLedgerEntries);
  requireCondition(input.referenceSeal.attemptChainHash === referenceChain.attemptChainHash
    && input.referenceSeal.executionLedgerTerminalHash === referenceChain.terminalHash, "final verification reference attempt chain differs from the sealed reference labels");
  const completedResults = input.scoreReceipt.itemResults.filter(({ executionDisposition }) => executionDisposition === "COMPLETE").length;
  const receipt = sealV5R3Artifact({
    schemaVersion: "FinalExecutionVerificationReceiptV1",
    designId: "MAIS-NATURAL-CA60-V5",
    runnerRegistrationHash: input.registration.selfHash,
    sampleExecutionInventoryHash: input.inventory.selfHash,
    referenceSealHash: input.referenceSeal.selfHash,
    executionRegistrationHash: input.executionRegistration.selfHash,
    c0ExecutionSetHash: input.c0ExecutionSet.selfHash,
    aggregateScoreReceiptHash: input.scoreReceipt.selfHash,
    referenceAttemptChainHash: referenceChain.attemptChainHash,
    deepSeekAttemptChainHash: deepSeekChain.attemptChainHash,
    referenceLabelCount: input.referenceSeal.finalLabels.length,
    naturalQuestionResultCount: completedResults,
    validationStatus: "FULL_CHAIN_RECOMPUTED",
    overallDecision: input.scoreReceipt.overallDecision,
    decisionCeiling: "INCONCLUSIVE_MACHINE_REFERENCE",
    passClaimAllowed: false,
    verifiedAt: input.verifiedAt,
  });
  assertClosedSelfHashedArtifactV5R4(receipt, "FinalExecutionVerificationReceiptV1");
  return receipt;
}

export function validateFinalExecutionVerificationReceiptV5R4(input) {
  const errors = [...validateClosedSelfHashedArtifactV5R4(input?.finalVerificationReceipt, "FinalExecutionVerificationReceiptV1")];
  try {
    const rebuilt = buildFinalExecutionVerificationReceiptV5R4({ ...input, verifiedAt: input.finalVerificationReceipt?.verifiedAt });
    if (canonicalJsonV5R3(rebuilt) !== canonicalJsonV5R3(input.finalVerificationReceipt)) errors.push("final verification receipt differs from complete raw-evidence reconstruction");
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
  }
  return Object.freeze([...new Set(errors)]);
}

export function evaluateAggregateExportGateV5R4(input) {
  const errors = [
    ...validateFinalExecutionVerificationReceiptV5R4(input),
    ...validateClosedSelfHashedArtifactV5R4(input?.independentResultReview, "IndependentExecutionResultReviewReceiptV1"),
    ...validateClosedSelfHashedArtifactV5R4(input?.claimBoundaryReview, "ClaimBoundaryReviewReceiptV2"),
  ];
  const resultReview = input?.independentResultReview;
  const claimReview = input?.claimBoundaryReview;
  if (resultReview?.runnerRegistrationHash !== input?.registration?.selfHash
    || resultReview?.aggregateScoreReceiptHash !== input?.scoreReceipt?.selfHash
    || resultReview?.finalVerificationReceiptHash !== input?.finalVerificationReceipt?.selfHash
    || resultReview?.reviewerLane !== "A11" || resultReview?.independentImplementation !== true
    || resultReview?.decision !== "CONCURRED" || resultReview?.discrepancyCodes?.length !== 0) errors.push("aggregate export requires exact independent A11 result concurrence");
  if (claimReview?.runnerRegistrationHash !== input?.registration?.selfHash
    || claimReview?.aggregateScoreReceiptHash !== input?.scoreReceipt?.selfHash
    || claimReview?.independentResultReviewHash !== resultReview?.selfHash
    || claimReview?.reviewerLane !== "A18" || claimReview?.humanGoldLabelReview !== false
    || claimReview?.claimBoundaryStatus !== "NO_OBJECTION" || claimReview?.objectionCodes?.length !== 0) errors.push("aggregate export requires exact A18 claim-boundary NO_OBJECTION");
  if (!validTime(resultReview?.reviewedAt) || !validTime(claimReview?.reviewedAt)
    || Date.parse(resultReview.reviewedAt) <= Date.parse(input?.finalVerificationReceipt?.verifiedAt ?? "")
    || Date.parse(claimReview.reviewedAt) <= Date.parse(resultReview.reviewedAt)) errors.push("aggregate review chronology is invalid");
  errors.push("CURRENT_V5_R4_REGISTRATION_HAS_NO_A21_PROTECTED_CUSTODY_OR_SEPARATE_TRACKED_PUBLICATION_AUTHORIZATION");
  return Object.freeze({
    allowed: false,
    status: "AGGREGATE_EXPORT_BLOCKED_PENDING_SEPARATE_TRACKED_PUBLICATION_REGISTRATION",
    errors: Object.freeze([...new Set(errors)]),
    limitationCodes: LIMITATIONS,
    decisionCeiling: DESIGN.scope.decisionCeiling,
    passClaimAllowed: false,
  });
}

export const VERIFICATION_PUBLICATION_V5_R4_CONSTANTS = Object.freeze({
  limitationCodes: LIMITATIONS,
  aggregateExportAuthorizedByThisRegistration: false,
  publicationResumeGate: "SEPARATE_TRACKED_A21_CUSTODY_AND_OWNER_PUBLICATION_REGISTRATION_AFTER_A11_AND_A18",
});
