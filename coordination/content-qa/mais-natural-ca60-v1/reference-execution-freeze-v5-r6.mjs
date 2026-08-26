import V5_R5_REGISTRATION from "../../research/mais-natural-ca60-v1/runner-registrations/v5-r5/runner-registration.json" with { type: "json" };

import DEEPSEEK_REGISTRATION_SCHEMA from "./schemas/DeepSeekExecutionRegistrationV4.schema.json" with { type: "json" };
import REFERENCE_SEAL_SCHEMA from "./schemas/MachineReferenceSealV5.schema.json" with { type: "json" };
import REFERENCE_VALIDATION_SCHEMA from "./schemas/ReferenceSealValidationReceiptV3.schema.json" with { type: "json" };
import {
  canonicalJsonV5R3,
  sealV5R3Artifact,
} from "./execution-integrity-v5-r3.mjs";
import {
  validateActiveRunnerRegistrationV5R6,
  validateExactRunnerRegistrationEvidenceV5R6,
  validateFreshRunnerReviewV5R6,
} from "./execution-evidence-v5-r6.mjs";
import {
  buildMachineReferenceSealV5R5,
  validateMachineReferenceSealV5R5,
} from "./reference-label-seal-v5-r5.mjs";
import {
  validateResolvedProviderAuthorizationV5R6,
} from "./provider-request-v5-r6.mjs";
import {
  validateExternallyAttestedRouteEvidenceV5R6,
} from "./route-evidence-custody-v5-r6.mjs";
import {
  assertClosedSelfHashedAgainstV5R5,
  validateClosedSelfHashedAgainstV5R5,
} from "./schema-contract-v5-r5.mjs";

function requireCondition(condition, message) {
  if (!condition) throw new TypeError(message);
}

function commonErrors(input) {
  return [
    ...validateExactRunnerRegistrationEvidenceV5R6(input?.registrationEvidence),
    ...validateActiveRunnerRegistrationV5R6(input?.activeRegistration),
    ...validateFreshRunnerReviewV5R6(input ?? {}),
    ...validateResolvedProviderAuthorizationV5R6(input?.authorization),
    ...validateExternallyAttestedRouteEvidenceV5R6(input?.authenticatedRouteEvidence),
  ];
}

export function buildMachineReferenceSealV5R6(input) {
  const errors = commonErrors(input);
  requireCondition(errors.length === 0, errors.join("; "));
  requireCondition(input.authorization.provider === "OPENAI_DIRECT"
    && input.authorization.activeRunnerRegistrationHash === input.activeRegistration.selfHash
    && input.authorization.freshRunnerReviewHash === input.freshReview.selfHash
    && input.authorization.referenceSealHash === null
    && input.authorization.referenceAttemptChainHash === null,
  "R6 reference-seal authorization tuple, chronology, or pre-seal null binding is invalid");
  const compatibilityReferenceSeal = buildMachineReferenceSealV5R5({
    activeRegistration: V5_R5_REGISTRATION,
    registration: input.registration,
    authorization: input.authorization.compatibilityAuthorization,
    inventory: input.inventory,
    ledgerEntries: input.ledgerEntries,
    sealedAt: input.sealedAt,
  });
  const seal = sealV5R3Artifact({
    schemaVersion: "MachineReferenceSealV5",
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
    finalLabelRoot: compatibilityReferenceSeal.finalLabelRoot,
    unresolvedCount: compatibilityReferenceSeal.unresolvedCount,
    unresolvedWithinExecutionCap: compatibilityReferenceSeal.unresolvedWithinExecutionCap,
    labelBlindnessVerified: true,
    sealReconstructionStatus: "FULL_COMPATIBILITY_LEDGER_RECONSTRUCTION_BOUND_TO_R6",
    sealedAt: input.sealedAt,
  });
  assertClosedSelfHashedAgainstV5R5(seal, REFERENCE_SEAL_SCHEMA, seal.schemaVersion);
  return Object.freeze({ seal, compatibilityReferenceSeal });
}

export function validateMachineReferenceSealV5R6({ seal, compatibilityReferenceSeal, ...input }) {
  const errors = [...validateClosedSelfHashedAgainstV5R5(seal, REFERENCE_SEAL_SCHEMA)];
  errors.push(...validateMachineReferenceSealV5R5({
    activeRegistration: V5_R5_REGISTRATION,
    registration: input.registration,
    authorization: input.authorization?.compatibilityAuthorization,
    inventory: input.inventory,
    ledgerEntries: input.ledgerEntries,
    seal: compatibilityReferenceSeal,
  }));
  try {
    const rebuilt = buildMachineReferenceSealV5R6({ ...input, sealedAt: seal?.sealedAt });
    if (canonicalJsonV5R3(rebuilt.seal) !== canonicalJsonV5R3(seal)
      || canonicalJsonV5R3(rebuilt.compatibilityReferenceSeal) !== canonicalJsonV5R3(compatibilityReferenceSeal)) {
      errors.push("R6 reference seal differs from full compatibility-ledger reconstruction");
    }
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
  }
  return Object.freeze([...new Set(errors)]);
}

export function buildReferenceSealValidationReceiptV5R6({ seal, compatibilityReferenceSeal, validatedAt, ...input }) {
  const errors = validateMachineReferenceSealV5R6({ ...input, seal, compatibilityReferenceSeal });
  requireCondition(errors.length === 0, errors.join("; "));
  requireCondition(Number.isFinite(Date.parse(validatedAt)) && Date.parse(validatedAt) > Date.parse(seal.sealedAt),
    "R6 reference-seal validation must strictly postdate sealing");
  const receipt = sealV5R3Artifact({
    schemaVersion: "ReferenceSealValidationReceiptV3",
    designId: "MAIS-NATURAL-CA60-V5",
    activeRunnerRegistrationHash: input.activeRegistration.selfHash,
    freshRunnerReviewHash: input.freshReview.selfHash,
    referenceSealHash: seal.selfHash,
    compatibilityReferenceSealHash: compatibilityReferenceSeal.selfHash,
    openAIReferenceAuthorizationHash: input.authorization.selfHash,
    compatibilityOpenAIReferenceAuthorizationHash: input.authorization.compatibilityAuthorizationHash,
    sampleExecutionInventoryHash: input.inventory.selfHash,
    referenceAttemptChainHash: seal.attemptChainHash,
    referenceLedgerTerminalHash: seal.executionLedgerTerminalHash,
    finalLabelRoot: seal.finalLabelRoot,
    itemCount: 60,
    labelBlindnessVerified: true,
    sameModelCorrelatedErrorRisk: true,
    validationStatus: "FULL_RAW_LEDGER_RECONSTRUCTION_VALID_AND_BOUND_TO_R6",
    validatedAt,
  });
  assertClosedSelfHashedAgainstV5R5(receipt, REFERENCE_VALIDATION_SCHEMA, receipt.schemaVersion);
  return receipt;
}

export function validateReferenceSealValidationReceiptV5R6({ referenceSealValidationReceipt, ...input }) {
  const errors = [...validateClosedSelfHashedAgainstV5R5(referenceSealValidationReceipt,
    REFERENCE_VALIDATION_SCHEMA)];
  try {
    const rebuilt = buildReferenceSealValidationReceiptV5R6({
      ...input,
      validatedAt: referenceSealValidationReceipt?.validatedAt,
    });
    if (canonicalJsonV5R3(rebuilt) !== canonicalJsonV5R3(referenceSealValidationReceipt)) {
      errors.push("R6 reference-seal validation receipt differs from full reconstruction");
    }
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
  }
  return Object.freeze([...new Set(errors)]);
}

export function buildDeepSeekExecutionRegistrationV5R6(input) {
  const errors = [
    ...commonErrors(input),
    ...validateClosedSelfHashedAgainstV5R5(input?.referenceSeal, REFERENCE_SEAL_SCHEMA),
    ...validateClosedSelfHashedAgainstV5R5(input?.referenceSealValidationReceipt,
      REFERENCE_VALIDATION_SCHEMA),
  ];
  requireCondition(errors.length === 0, errors.join("; "));
  const authorization = input.authorization;
  const seal = input.referenceSeal;
  const validation = input.referenceSealValidationReceipt;
  requireCondition(authorization.provider === "DEEPSEEK_DIRECT"
    && authorization.referenceSealHash === seal.selfHash
    && authorization.referenceAttemptChainHash === seal.attemptChainHash
    && authorization.activeRunnerRegistrationHash === input.activeRegistration.selfHash
    && authorization.freshRunnerReviewHash === input.freshReview.selfHash,
  "DeepSeek R6 authorization does not bind the active runner, review, reference seal, and attempt chain");
  requireCondition(validation.referenceSealHash === seal.selfHash
    && validation.referenceAttemptChainHash === seal.attemptChainHash
    && validation.referenceLedgerTerminalHash === seal.executionLedgerTerminalHash
    && validation.finalLabelRoot === seal.finalLabelRoot,
  "DeepSeek R6 reference-seal validation binding is invalid");
  requireCondition(Date.parse(seal.sealedAt) < Date.parse(validation.validatedAt)
    && Date.parse(validation.validatedAt) < Date.parse(authorization.issuedAt)
    && Date.parse(authorization.issuedAt) < Date.parse(input.registeredAt),
  "reference seal, validation, DeepSeek authorization, and R6 execution registration chronology is invalid");
  const registration = sealV5R3Artifact({
    schemaVersion: "DeepSeekExecutionRegistrationV4",
    designId: "MAIS-NATURAL-CA60-V5",
    registeredAt: input.registeredAt,
    activeRunnerRegistrationHash: input.activeRegistration.selfHash,
    freshRunnerReviewHash: input.freshReview.selfHash,
    deepSeekAuthorizationHash: authorization.selfHash,
    authenticatedRouteEvidenceHash: input.authenticatedRouteEvidence.selfHash,
    costPreviewHash: input.costPreview.selfHash,
    referenceSealHash: seal.selfHash,
    referenceSealValidationReceiptHash: validation.selfHash,
    referenceAttemptChainHash: seal.attemptChainHash,
    referenceLedgerTerminalHash: seal.executionLedgerTerminalHash,
    finalLabelRoot: seal.finalLabelRoot,
    sampleExecutionInventoryHash: input.inventory.selfHash,
    frameRegistrationHash: input.activeRegistration.frameRegistrationHash,
    sampleManifestHash: input.activeRegistration.sampleManifestHash,
    c0RandomAuditHash: input.activeRegistration.c0RandomAuditHash,
    provider: "DEEPSEEK_DIRECT",
    model: "deepseek-v4-pro",
    endpoint: "https://api.deepseek.com/chat/completions",
    resolvedProjectResidency: authorization.projectResidency,
    resolvedDataRegion: authorization.dataRegion,
    adapterHash: authorization.compatibilityAuthorization.providerImplementationHash,
    decisionCeiling: "INCONCLUSIVE_MACHINE_REFERENCE",
    passClaimAllowed: false,
    limitedGeneralizationEvidenceAllowed: false,
  });
  assertClosedSelfHashedAgainstV5R5(registration, DEEPSEEK_REGISTRATION_SCHEMA,
    registration.schemaVersion);
  return registration;
}

export function validateDeepSeekExecutionRegistrationV5R6({ executionRegistration, ...input }) {
  const errors = [...validateClosedSelfHashedAgainstV5R5(executionRegistration,
    DEEPSEEK_REGISTRATION_SCHEMA)];
  try {
    const rebuilt = buildDeepSeekExecutionRegistrationV5R6({
      ...input,
      registeredAt: executionRegistration?.registeredAt,
    });
    if (canonicalJsonV5R3(rebuilt) !== canonicalJsonV5R3(executionRegistration)) {
      errors.push("DeepSeek R6 execution registration differs from exact frozen reconstruction");
    }
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
  }
  return Object.freeze([...new Set(errors)]);
}

export const REFERENCE_EXECUTION_FREEZE_V5_R6_CONSTANTS = Object.freeze({
  compatibilityRunnerRegistrationHash: V5_R5_REGISTRATION.selfHash,
  labelSourceType: "machine_reference_panel",
  humanGold: false,
  decisionCeiling: "INCONCLUSIVE_MACHINE_REFERENCE",
});
