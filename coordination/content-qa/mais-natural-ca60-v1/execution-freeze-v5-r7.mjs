import {
  canonicalJsonV5R3,
  sealV5R3Artifact,
} from "./execution-integrity-v5-r3.mjs";
import {
  validateRawAuthoritativeMachineReferenceSealV5R7,
  validateRawAuthoritativeReferenceValidationV5R7,
} from "./raw-authoritative-reference-v5-r7.mjs";
import {
  assertClosedSelfHashedArtifactV5R7,
  validateClosedSelfHashedArtifactV5R7,
} from "./schema-contract-v5-r7.mjs";

function requireCondition(condition, message) {
  if (!condition) throw new TypeError(message);
}

export function buildDeepSeekExecutionRegistrationV5R7(input) {
  const referenceErrors = [
    ...validateRawAuthoritativeMachineReferenceSealV5R7({
      ...(input.referenceSealContext ?? {}),
      seal: input.referenceSeal,
      compatibilityReferenceSeal: input.compatibilityReferenceSeal,
    }),
    ...validateRawAuthoritativeReferenceValidationV5R7({
      ...(input.referenceSealContext ?? {}),
      validationReceipt: input.referenceSealValidationReceipt,
      seal: input.referenceSeal,
      compatibilityReferenceSeal: input.compatibilityReferenceSeal,
    }),
    ...validateClosedSelfHashedArtifactV5R7(input.authorization, "ProviderAuthorizationV5"),
  ];
  requireCondition(referenceErrors.length === 0, referenceErrors.join("; "));
  const authorization = input.authorization;
  const seal = input.referenceSeal;
  const validation = input.referenceSealValidationReceipt;
  requireCondition(authorization.provider === "DEEPSEEK_DIRECT"
    && authorization.referenceSealHash === seal.selfHash
    && authorization.referenceAttemptChainHash === seal.attemptChainHash
    && authorization.activeRunnerRegistrationHash === input.activeRegistration.selfHash
    && authorization.freshRunnerReviewHash === input.freshReview.selfHash
    && validation.referenceSealHash === seal.selfHash
    && validation.referenceAttemptChainHash === seal.attemptChainHash
    && validation.referenceLedgerTerminalHash === seal.executionLedgerTerminalHash
    && validation.finalLabelRoot === seal.finalLabelRoot,
  "R7 DeepSeek authorization/validation does not bind the raw-authoritative reference seal");
  requireCondition(Date.parse(seal.sealedAt) < Date.parse(validation.validatedAt)
    && Date.parse(validation.validatedAt) < Date.parse(authorization.issuedAt)
    && Date.parse(authorization.issuedAt) < Date.parse(input.registeredAt),
  "R7 reference/authorization/execution-registration chronology is invalid");
  const receipt = sealV5R3Artifact({
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
  assertClosedSelfHashedArtifactV5R7(receipt, "DeepSeekExecutionRegistrationV4");
  return receipt;
}

export function validateDeepSeekExecutionRegistrationV5R7({ executionRegistration, ...input }) {
  const errors = [...validateClosedSelfHashedArtifactV5R7(executionRegistration,
    "DeepSeekExecutionRegistrationV4")];
  try {
    const rebuilt = buildDeepSeekExecutionRegistrationV5R7({
      ...input,
      registeredAt: executionRegistration?.registeredAt,
    });
    if (canonicalJsonV5R3(rebuilt) !== canonicalJsonV5R3(executionRegistration)) {
      errors.push("R7 DeepSeek execution registration differs from raw-authoritative reconstruction");
    }
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
  }
  return Object.freeze([...new Set(errors)]);
}
