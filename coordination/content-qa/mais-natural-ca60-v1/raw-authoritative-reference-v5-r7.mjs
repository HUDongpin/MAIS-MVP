import V5_R5_REGISTRATION from "../../research/mais-natural-ca60-v1/runner-registrations/v5-r5/runner-registration.json" with { type: "json" };

import SEAL_SCHEMA from "./schemas/MachineReferenceSealV6.schema.json" with { type: "json" };
import VALIDATION_SCHEMA from "./schemas/ReferenceSealValidationReceiptV4.schema.json" with { type: "json" };

import {
  canonicalJsonV5R3,
  sealV5R3Artifact,
  validateSelfHashV5R3,
} from "./execution-integrity-v5-r3.mjs";
import {
  reconstructAttemptGraphV5R7,
  validateAttemptGraphReconstructionReceiptV5R7,
} from "./attempt-graph-v5-r7.mjs";
import {
  buildMachineReferenceSealV5R5,
  validateMachineReferenceSealV5R5,
} from "./reference-label-seal-v5-r5.mjs";
import {
  assertClosedSelfHashedAgainstV5R5,
  validateClosedSelfHashedAgainstV5R5,
} from "./schema-contract-v5-r5.mjs";
import {
  validateClosedSelfHashedArtifactV5R7,
} from "./schema-contract-v5-r7.mjs";

function requireCondition(condition, message) {
  if (!condition) throw new TypeError(message);
}

function exactSet(left, right) {
  return Array.isArray(left) && Array.isArray(right) && new Set(left).size === left.length
    && new Set(right).size === right.length
    && canonicalJsonV5R3([...left].sort()) === canonicalJsonV5R3([...right].sort());
}

function validateGraphAndBlindness(input) {
  const graphErrors = validateAttemptGraphReconstructionReceiptV5R7({
    ...(input.attemptGraphContext ?? {}),
    attemptGraphReceipt: input.attemptGraphReceipt,
  });
  requireCondition(graphErrors.length === 0 && input.attemptGraphReceipt.graphStatus === "COMPLETE_VALID"
    && input.attemptGraphReceipt.provider === "OPENAI_DIRECT",
  `R7 reference seal requires a complete independently rebuilt OpenAI attempt graph: ${graphErrors.join("; ")}`);
  const evidence = input.attemptGraphReceipt.roleAttemptEvidenceReceipts;
  const successfulEvidence = evidence.filter(({ attemptStatus }) => attemptStatus === "SUCCEEDED");
  requireCondition(successfulEvidence.length >= 240 && successfulEvidence.length <= 300
    && evidence.length <= input.authorization.maximumAttempts
    && evidence.every((receipt) => receipt.provider === "OPENAI_DIRECT"
      && (receipt.attemptStatus !== "SUCCEEDED" || receipt.rawResponseReparsed === true)
      && receipt.lineageRebuilt === true && receipt.naturalQuestionReferenceInputCount === 0
      && ["A_SOLVE", "A_LABEL", "B_SOLVE", "B_LABEL", "ADJUDICATOR"].includes(receipt.role)),
  "R7 reference graph contains missing successes, non-reparsed success, leaked input, or extra-role evidence");
  const successfulOutputHashes = (input.attemptGraphContext?.ledgerEntries ?? [])
    .filter(({ entryType, attemptStatus }) => entryType === "DISPATCH_COMPLETED" && attemptStatus === "SUCCEEDED")
    .map(({ roleOutputHash }) => roleOutputHash);
  requireCondition(exactSet(successfulOutputHashes,
    successfulEvidence.map(({ roleOutputHash }) => roleOutputHash)),
    "R7 reference graph evidence does not equal the complete successful compatibility output set");
}

export function buildRawAuthoritativeMachineReferenceSealV5R7(input) {
  requireCondition(validateSelfHashV5R3(input?.activeRegistration)
    && validateSelfHashV5R3(input?.freshReview)
    && input.freshReview.decision === "CONCURRED" && input.freshReview.findingCount === 0,
  "R7 reference seal requires the exact active registration and fresh A11 concurrence");
  const authErrors = validateClosedSelfHashedArtifactV5R7(input?.authorization, "ProviderAuthorizationV5");
  requireCondition(authErrors.length === 0 && input.authorization.provider === "OPENAI_DIRECT"
    && input.authorization.activeRunnerRegistrationHash === input.activeRegistration.selfHash
    && input.authorization.freshRunnerReviewHash === input.freshReview.selfHash
    && input.authorization.referenceSealHash === null
    && input.authorization.referenceAttemptChainHash === null,
  `R7 OpenAI reference authorization is invalid: ${authErrors.join("; ")}`);
  validateGraphAndBlindness(input);
  const compatibilityReferenceSeal = buildMachineReferenceSealV5R5({
    activeRegistration: V5_R5_REGISTRATION,
    registration: input.registration,
    authorization: input.authorization.compatibilityAuthorization,
    inventory: input.inventory,
    ledgerEntries: input.attemptGraphContext.ledgerEntries,
    sealedAt: input.sealedAt,
  });
  const graph = input.attemptGraphReceipt;
  requireCondition(compatibilityReferenceSeal.totalSuccessfulCallCount === graph.successfulAttemptCount
    && compatibilityReferenceSeal.totalAttemptCount === graph.reservationCount
    && compatibilityReferenceSeal.executionLedgerTerminalHash === graph.ledgerTerminalHash,
  "R7 compatibility reference seal differs from the raw-authoritative attempt graph");
  const seal = sealV5R3Artifact({
    schemaVersion: "MachineReferenceSealV6",
    designId: "MAIS-NATURAL-CA60-V5",
    activeRunnerRegistrationHash: input.activeRegistration.selfHash,
    freshRunnerReviewHash: input.freshReview.selfHash,
    compatibilityRunnerRegistrationHash: V5_R5_REGISTRATION.selfHash,
    compatibilityReferenceSealHash: compatibilityReferenceSeal.selfHash,
    openAIReferenceAuthorizationHash: input.authorization.selfHash,
    compatibilityOpenAIReferenceAuthorizationHash: input.authorization.compatibilityAuthorizationHash,
    sampleExecutionInventoryHash: input.inventory.selfHash,
    sampleManifestHash: input.activeRegistration.sampleManifestHash,
    samplePayloadSetHash: input.activeRegistration.samplePayloadSetHash,
    provider: "OPENAI_DIRECT",
    model: "gpt-5.6-luna",
    endpoint: "https://us.api.openai.com/v1/responses",
    labelSourceType: "machine_reference_panel",
    humanGold: false,
    sameModelCorrelatedErrorRisk: true,
    itemCount: 60,
    totalSuccessfulCallCount: compatibilityReferenceSeal.totalSuccessfulCallCount,
    totalAttemptCount: compatibilityReferenceSeal.totalAttemptCount,
    providerEventCountAtSeal: compatibilityReferenceSeal.providerEventCountAtSeal,
    executionLedgerTerminalHash: compatibilityReferenceSeal.executionLedgerTerminalHash,
    attemptChainHash: compatibilityReferenceSeal.attemptChainHash,
    attemptGraphReconstructionReceiptHash: graph.selfHash,
    roleAttemptEvidenceRootHash: graph.roleAttemptEvidenceRootHash,
    rawResponseArtifactRootHash: graph.rawResponseArtifactRootHash,
    rawResponseBindingRootHash: graph.rawResponseBindingRootHash,
    attemptCommitIntentRootHash: graph.attemptCommitIntentRootHash,
    resolvedAttemptReceiptRootHash: graph.resolvedAttemptReceiptRootHash,
    finalLabelRoot: compatibilityReferenceSeal.finalLabelRoot,
    unresolvedCount: compatibilityReferenceSeal.unresolvedCount,
    unresolvedWithinExecutionCap: compatibilityReferenceSeal.unresolvedWithinExecutionCap,
    labelBlindnessVerified: true,
    sealReconstructionStatus: "FULL_RAW_RESPONSE_REPARSE_AND_ATTEMPT_GRAPH_RECONSTRUCTION_BOUND_TO_R7",
    sealedAt: input.sealedAt,
  });
  assertClosedSelfHashedAgainstV5R5(seal, SEAL_SCHEMA, seal.schemaVersion);
  return Object.freeze({ seal, compatibilityReferenceSeal });
}

export function validateRawAuthoritativeMachineReferenceSealV5R7({ seal, compatibilityReferenceSeal,
  ...input }) {
  const errors = [...validateClosedSelfHashedAgainstV5R5(seal, SEAL_SCHEMA)];
  errors.push(...validateMachineReferenceSealV5R5({
    activeRegistration: V5_R5_REGISTRATION,
    registration: input.registration,
    authorization: input.authorization?.compatibilityAuthorization,
    inventory: input.inventory,
    ledgerEntries: input.attemptGraphContext?.ledgerEntries,
    seal: compatibilityReferenceSeal,
  }));
  try {
    const rebuilt = buildRawAuthoritativeMachineReferenceSealV5R7({
      ...input,
      sealedAt: seal?.sealedAt,
    });
    if (canonicalJsonV5R3(rebuilt.seal) !== canonicalJsonV5R3(seal)
      || canonicalJsonV5R3(rebuilt.compatibilityReferenceSeal)
        !== canonicalJsonV5R3(compatibilityReferenceSeal)) {
      errors.push("R7 reference seal differs from raw-authoritative graph and label reconstruction");
    }
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
  }
  return Object.freeze([...new Set(errors)]);
}

export function buildRawAuthoritativeReferenceValidationV5R7({ seal, compatibilityReferenceSeal,
  validatedAt, ...input }) {
  const errors = validateRawAuthoritativeMachineReferenceSealV5R7({
    ...input,
    seal,
    compatibilityReferenceSeal,
  });
  requireCondition(errors.length === 0 && Date.parse(validatedAt) > Date.parse(seal.sealedAt),
    `R7 reference validation failed or does not postdate sealing: ${errors.join("; ")}`);
  const graph = input.attemptGraphReceipt;
  const receipt = sealV5R3Artifact({
    schemaVersion: "ReferenceSealValidationReceiptV4",
    designId: "MAIS-NATURAL-CA60-V5",
    activeRunnerRegistrationHash: input.activeRegistration.selfHash,
    freshRunnerReviewHash: input.freshReview.selfHash,
    referenceSealHash: seal.selfHash,
    compatibilityReferenceSealHash: compatibilityReferenceSeal.selfHash,
    openAIReferenceAuthorizationHash: input.authorization.selfHash,
    sampleExecutionInventoryHash: input.inventory.selfHash,
    attemptGraphReconstructionReceiptHash: graph.selfHash,
    roleAttemptEvidenceRootHash: graph.roleAttemptEvidenceRootHash,
    rawResponseArtifactRootHash: graph.rawResponseArtifactRootHash,
    rawResponseBindingRootHash: graph.rawResponseBindingRootHash,
    attemptCommitIntentRootHash: graph.attemptCommitIntentRootHash,
    resolvedAttemptReceiptRootHash: graph.resolvedAttemptReceiptRootHash,
    referenceAttemptChainHash: seal.attemptChainHash,
    referenceLedgerTerminalHash: seal.executionLedgerTerminalHash,
    finalLabelRoot: seal.finalLabelRoot,
    itemCount: 60,
    labelBlindnessVerified: true,
    sameModelCorrelatedErrorRisk: true,
    validationStatus: "RAW_AUTHORITATIVE_ATTEMPT_GRAPH_REBUILT_AND_BOUND_TO_R7",
    validatedAt,
  });
  assertClosedSelfHashedAgainstV5R5(receipt, VALIDATION_SCHEMA, receipt.schemaVersion);
  return receipt;
}

export function validateRawAuthoritativeReferenceValidationV5R7({ validationReceipt, ...input }) {
  const errors = [...validateClosedSelfHashedAgainstV5R5(validationReceipt, VALIDATION_SCHEMA)];
  try {
    const rebuilt = buildRawAuthoritativeReferenceValidationV5R7({
      ...input,
      validatedAt: validationReceipt?.validatedAt,
    });
    if (canonicalJsonV5R3(rebuilt) !== canonicalJsonV5R3(validationReceipt)) {
      errors.push("R7 reference validation receipt differs from exact reconstruction");
    }
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
  }
  return Object.freeze([...new Set(errors)]);
}

export const RAW_AUTHORITATIVE_REFERENCE_V5_R7_CONSTANTS = Object.freeze({
  rawArtifactsMandatory: true,
  independentReparseMandatory: true,
  attemptGraphMandatory: true,
  referenceInputCountAllowed: 0,
  labelSourceType: "machine_reference_panel",
  humanGold: false,
});
