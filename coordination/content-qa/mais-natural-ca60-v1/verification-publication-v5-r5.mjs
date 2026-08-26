import {
  canonicalJsonV5R3,
  sealV5R3Artifact,
  sha256V5R3,
} from "./execution-integrity-v5-r3.mjs";
import {
  assertClosedSelfHashedArtifactV5R5,
  validateClosedSelfHashedArtifactV5R5,
} from "./schema-contract-v5-r5.mjs";
import {
  executionLedgerTerminalEvidenceV5R4,
  validateExecutionLedgerEntriesV5R4,
} from "./atomic-execution-ledger-v5-r4.mjs";
import { validateAggregateScoreReceiptV5R5 } from "./scorer-v5-r5.mjs";

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
function hashSet(values) { return sha256V5R3(canonicalJsonV5R3(values)); }

export function buildFinalExecutionVerificationReceiptV5R5(input) {
  const scoreErrors = validateAggregateScoreReceiptV5R5(input);
  const referenceLedgerErrors = validateExecutionLedgerEntriesV5R4({ entries: input.referenceLedgerEntries,
    authorization: input.openAIAuthorization, inventory: input.inventory });
  const deepSeekLedgerErrors = validateExecutionLedgerEntriesV5R4({ entries: input.deepSeekLedgerEntries,
    authorization: input.deepSeekAuthorization, inventory: input.inventory });
  requireCondition(scoreErrors.length + referenceLedgerErrors.length + deepSeekLedgerErrors.length === 0,
    [...scoreErrors, ...referenceLedgerErrors, ...deepSeekLedgerErrors].join("; "));
  requireCondition(validTime(input.verifiedAt) && Date.parse(input.verifiedAt) >= Date.parse(input.scoreReceipt.scoredAt),
    "R5 final verification chronology is invalid");
  const referenceChain = executionLedgerTerminalEvidenceV5R4(input.referenceLedgerEntries);
  const deepSeekChain = executionLedgerTerminalEvidenceV5R4(input.deepSeekLedgerEntries);
  requireCondition(input.referenceSeal.attemptChainHash === referenceChain.attemptChainHash
    && input.referenceSeal.executionLedgerTerminalHash === referenceChain.terminalHash,
  "R5 final verification reference chain differs from the authoritative seal");
  const base = input.scoreReceipt.baseAggregateScoreReceipt;
  const completedResults = base.itemResults.filter(({ executionDisposition }) => executionDisposition === "COMPLETE").length;
  const receipt = sealV5R3Artifact({
    schemaVersion: "FinalExecutionVerificationReceiptV2",
    designId: "MAIS-NATURAL-CA60-V5",
    activeRunnerRegistrationHash: input.activeRegistration.selfHash,
    sampleExecutionInventoryHash: input.inventory.selfHash,
    referenceSealHash: input.referenceSeal.selfHash,
    executionRegistrationHash: input.executionRegistration.selfHash,
    c0ExecutionSetHash: input.c0ExecutionSet.selfHash,
    aggregateScoreReceiptHash: input.scoreReceipt.selfHash,
    referenceAttemptChainHash: referenceChain.attemptChainHash,
    deepSeekAttemptChainHash: deepSeekChain.attemptChainHash,
    requestArtifactRootHash: hashSet(input.requestArtifacts.map(({ selfHash }) => selfHash)),
    dispatchAuditRootHash: hashSet(input.dispatchAudits.map(({ selfHash }) => selfHash)),
    itemResultSetHash: base.itemResultSetHash,
    completedItemMarkerRootHash: base.completedItemMarkerRootHash,
    referenceLabelCount: input.referenceSeal.finalLabels.length,
    naturalQuestionResultCount: completedResults,
    executionIntegrityDisposition: input.scoreReceipt.executionIntegrityEvidence.overallIntegrityDisposition,
    validationStatus: "FULL_AUTHORITATIVE_R5_CHAIN_RECOMPUTED",
    overallDecision: input.scoreReceipt.overallDecision,
    decisionCeiling: "INCONCLUSIVE_MACHINE_REFERENCE",
    passClaimAllowed: false,
    limitedGeneralizationEvidenceAllowed: false,
    verifiedAt: input.verifiedAt,
  });
  assertClosedSelfHashedArtifactV5R5(receipt, "FinalExecutionVerificationReceiptV2");
  return receipt;
}

export function validateFinalExecutionVerificationReceiptV5R5(input) {
  const errors = [...validateClosedSelfHashedArtifactV5R5(input?.finalVerificationReceipt,
    "FinalExecutionVerificationReceiptV2")];
  try {
    const rebuilt = buildFinalExecutionVerificationReceiptV5R5({ ...input,
      verifiedAt: input.finalVerificationReceipt?.verifiedAt });
    if (canonicalJsonV5R3(rebuilt) !== canonicalJsonV5R3(input.finalVerificationReceipt)) {
      errors.push("R5 final verification receipt differs from full authoritative-chain reconstruction");
    }
  } catch (error) { errors.push(error instanceof Error ? error.message : String(error)); }
  return Object.freeze([...new Set(errors)]);
}

export function evaluateAggregateExportGateV5R5(input) {
  const errors = [...validateFinalExecutionVerificationReceiptV5R5(input)];
  if (!input?.independentResultReview) errors.push("independent A11 result review is absent");
  if (!input?.claimBoundaryReview) errors.push("A18 claim-boundary review is absent");
  if (!input?.publicationAuthorization) errors.push("separate owner aggregate-publication authorization is absent");
  errors.push("V5_R5_PRE_FIRST_PROVIDER_REGISTRATION_DOES_NOT_AUTHORIZE_PUBLICATION");
  return Object.freeze({ allowed: false,
    status: "AGGREGATE_EXPORT_BLOCKED_PENDING_SEPARATE_RESULT_REVIEWS_AND_PUBLICATION_AUTHORIZATION",
    errors: Object.freeze([...new Set(errors)]), limitationCodes: LIMITATIONS,
    decisionCeiling: "INCONCLUSIVE_MACHINE_REFERENCE", passClaimAllowed: false,
    limitedGeneralizationEvidenceAllowed: false });
}

export const VERIFICATION_PUBLICATION_V5_R5_CONSTANTS = Object.freeze({
  limitationCodes: LIMITATIONS,
  aggregateExportAuthorizedByThisRegistration: false,
  publicationResumeGate: "SEPARATE_A11_RESULT_REVIEW_A18_CLAIM_REVIEW_AND_OWNER_PUBLICATION_AUTHORIZATION",
});
