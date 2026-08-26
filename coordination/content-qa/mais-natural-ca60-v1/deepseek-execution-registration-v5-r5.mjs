import {
  canonicalJsonV5R3,
  sealV5R3Artifact,
} from "./execution-integrity-v5-r3.mjs";
import {
  assertClosedSelfHashedArtifactV5R5,
  validateClosedSelfHashedArtifactV5R5,
} from "./schema-contract-v5-r5.mjs";
import {
  validateMachineReferenceSealV5R5,
} from "./reference-label-seal-v5-r5.mjs";
import {
  validateProviderActivationV5R5,
} from "./activation-guard-v5-r5.mjs";

function requireCondition(condition, message) { if (!condition) throw new TypeError(message); }

export function buildReferenceSealValidationReceiptV5R5(input) {
  const errors = validateMachineReferenceSealV5R5({ ...input.referenceSealContext, activeRegistration: input.activeRegistration,
    registration: input.registration, inventory: input.inventory, seal: input.referenceSeal });
  requireCondition(errors.length === 0, errors.join("; "));
  requireCondition(Number.isFinite(Date.parse(input.validatedAt))
    && Date.parse(input.validatedAt) > Date.parse(input.referenceSeal.sealedAt),
  "R5 reference-seal validation must strictly postdate sealing");
  const receipt = sealV5R3Artifact({
    schemaVersion: "ReferenceSealValidationReceiptV2",
    designId: "MAIS-NATURAL-CA60-V5",
    activeRunnerRegistrationHash: input.activeRegistration.selfHash,
    compatibilityBaseRunnerRegistrationHash: input.registration.selfHash,
    referenceSealHash: input.referenceSeal.selfHash,
    referenceAttemptChainHash: input.referenceSeal.attemptChainHash,
    referenceLedgerTerminalHash: input.referenceSeal.executionLedgerTerminalHash,
    finalLabelRoot: input.referenceSeal.finalLabelRoot,
    itemCount: 60,
    labelBlindnessVerified: true,
    sameModelCorrelatedErrorRisk: true,
    validationStatus: "FULL_RAW_LEDGER_RECONSTRUCTION_VALID",
    validatedAt: input.validatedAt,
  });
  assertClosedSelfHashedArtifactV5R5(receipt, "ReferenceSealValidationReceiptV2");
  return receipt;
}
export function validateReferenceSealValidationReceiptV5R5(input) {
  const errors = [...validateClosedSelfHashedArtifactV5R5(input?.referenceSealValidationReceipt, "ReferenceSealValidationReceiptV2")];
  try {
    const rebuilt = buildReferenceSealValidationReceiptV5R5({ ...input,
      validatedAt: input.referenceSealValidationReceipt?.validatedAt });
    if (canonicalJsonV5R3(rebuilt) !== canonicalJsonV5R3(input.referenceSealValidationReceipt)) {
      errors.push("R5 reference-seal validation receipt differs from full raw-ledger reconstruction");
    }
  } catch (error) { errors.push(error instanceof Error ? error.message : String(error)); }
  return Object.freeze([...new Set(errors)]);
}

export function buildDeepSeekExecutionRegistrationV5R5(input) {
  const errors = [
    ...validateProviderActivationV5R5({ ...input.deepSeekActivationContext, ...input, provider: "DEEPSEEK_DIRECT", at: input.registeredAt }),
    ...validateMachineReferenceSealV5R5({ ...input.referenceSealContext, activeRegistration: input.activeRegistration,
      registration: input.registration, inventory: input.inventory, seal: input.referenceSeal }),
    ...validateReferenceSealValidationReceiptV5R5(input),
  ];
  requireCondition(errors.length === 0, errors.join("; "));
  requireCondition(input.authorization.provider === "DEEPSEEK_DIRECT"
    && input.authorization.referenceSealHash === input.referenceSeal.selfHash
    && input.authorization.referenceAttemptChainHash === input.referenceSeal.attemptChainHash
    && input.authorization.sampleExecutionInventoryHash === input.inventory.selfHash,
  "DeepSeek authorization does not bind the authoritative R5 reference seal and inventory");
  requireCondition(Date.parse(input.referenceSeal.sealedAt) < Date.parse(input.referenceSealValidationReceipt.validatedAt)
    && Date.parse(input.referenceSealValidationReceipt.validatedAt) < Date.parse(input.authorization.issuedAt)
    && Date.parse(input.authorization.issuedAt) < Date.parse(input.registeredAt),
  "reference seal, validation, DeepSeek authorization, and execution registration chronology is invalid");
  const registration = sealV5R3Artifact({
    schemaVersion: "DeepSeekExecutionRegistrationV3",
    designId: "MAIS-NATURAL-CA60-V5",
    registeredAt: input.registeredAt,
    activeRunnerRegistrationHash: input.activeRegistration.selfHash,
    compatibilityBaseRunnerRegistrationHash: input.registration.selfHash,
    freshRunnerReviewHash: input.freshReview.selfHash,
    deepSeekAuthorizationHash: input.authorization.selfHash,
    referenceSealHash: input.referenceSeal.selfHash,
    referenceAttemptChainHash: input.referenceSeal.attemptChainHash,
    referenceLedgerTerminalHash: input.referenceSeal.executionLedgerTerminalHash,
    referenceSealValidationReceiptHash: input.referenceSealValidationReceipt.selfHash,
    sampleExecutionInventoryHash: input.inventory.selfHash,
    frameRegistrationHash: input.registration.frameRegistrationHash,
    sampleManifestHash: input.registration.sampleManifestHash,
    c0RandomAuditHash: input.registration.c0RandomAuditHash,
    authenticatedRouteEvidenceHash: input.authenticatedRouteEvidence.selfHash,
    costPreviewHash: input.costPreview.selfHash,
    provider: "DEEPSEEK_DIRECT",
    model: "deepseek-v4-pro",
    endpoint: "https://api.deepseek.com/chat/completions",
    resolvedProjectResidency: input.authenticatedRouteEvidence.projectResidency,
    resolvedDataRegion: input.authenticatedRouteEvidence.dataRegion,
    adapterHash: input.authorization.providerImplementationHash,
  });
  assertClosedSelfHashedArtifactV5R5(registration, "DeepSeekExecutionRegistrationV3");
  return registration;
}

export function validateDeepSeekExecutionRegistrationV5R5(input) {
  const errors = [...validateClosedSelfHashedArtifactV5R5(input?.executionRegistration, "DeepSeekExecutionRegistrationV3")];
  try {
    const rebuilt = buildDeepSeekExecutionRegistrationV5R5({ ...input, registeredAt: input.executionRegistration?.registeredAt });
    if (canonicalJsonV5R3(rebuilt) !== canonicalJsonV5R3(input.executionRegistration)) {
      errors.push("R5 DeepSeek execution registration differs from full activation/reference reconstruction");
    }
  } catch (error) { errors.push(error instanceof Error ? error.message : String(error)); }
  return Object.freeze([...new Set(errors)]);
}
