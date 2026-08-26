import {
  canonicalJsonV5R3,
  validateSelfHashV5R3,
} from "./execution-integrity-v5-r3.mjs";
import {
  validateClosedSelfHashedArtifactV5R5,
} from "./schema-contract-v5-r5.mjs";
import {
  validateClosedSelfHashedArtifactV5R6,
} from "./schema-contract-v5-r6.mjs";
import {
  validateActiveRunnerRegistrationV5R6,
  validateExactRunnerRegistrationEvidenceV5R6,
  validateFreshRunnerReviewV5R6,
} from "./execution-evidence-v5-r6.mjs";
import {
  validateResolvedProviderAuthorizationV5R6,
} from "./provider-request-v5-r6.mjs";
import {
  validateExternallyAttestedRouteEvidenceV5R6,
} from "./route-evidence-custody-v5-r6.mjs";

const REQUIRED_NON_AUTHORIZATIONS = Object.freeze([
  "NO_DEPLOYMENT",
  "NO_LIVE_QUESTION_BANK_MUTATION",
  "NO_GIT_MUTATION",
  "NO_MODEL_FALLBACK",
  "NO_BUDGET_TRANSFER",
  "NO_PROMPT_TUNING",
  "NO_RESULT_DEPENDENT_REPLACEMENT",
]);

function add(errors, condition, message) {
  if (!condition && !errors.includes(message)) errors.push(message);
}

function exactSet(actual, expected) {
  return Array.isArray(actual) && new Set(actual).size === actual.length
    && canonicalJsonV5R3([...actual].sort()) === canonicalJsonV5R3([...expected].sort());
}

export function validateProviderActivationV5R6(input) {
  const errors = [
    ...validateExactRunnerRegistrationEvidenceV5R6(input?.registrationEvidence),
    ...validateActiveRunnerRegistrationV5R6(input?.activeRegistration),
    ...validateFreshRunnerReviewV5R6(input ?? {}),
    ...validateResolvedProviderAuthorizationV5R6(input?.authorization),
    ...validateExternallyAttestedRouteEvidenceV5R6(input?.authenticatedRouteEvidence),
    ...validateClosedSelfHashedArtifactV5R5(input?.ownerActivationGrant, "OwnerRunnerActivationGrantV1"),
  ];
  const registration = input?.activeRegistration;
  const evidence = input?.registrationEvidence;
  const review = input?.freshReview;
  const authorization = input?.authorization;
  const route = input?.authenticatedRouteEvidence;
  const grant = input?.ownerActivationGrant;
  add(errors, evidence?.activeRegistration?.selfHash === registration?.selfHash,
    "activation registration evidence does not bind the supplied active R6 registration");
  add(errors, authorization?.activeRunnerRegistrationHash === registration?.selfHash
    && authorization?.freshRunnerReviewHash === review?.selfHash
    && authorization?.authenticatedRouteEvidenceHash === route?.selfHash,
  "resolved authorization does not bind the active R6 registration, review, and externally attested route");
  for (const field of ["provider", "model", "endpoint", "projectResidency", "dataRegion"]) {
    add(errors, authorization?.[field] === route?.[field], `authorization ${field} differs from externally attested route evidence`);
  }
  add(errors, authorization?.projectIdentityHash === route?.subjectIdentityHash,
    "authorization projectIdentityHash differs from externally attested route subject identity");
  add(errors, grant?.activeRunnerRegistrationHash === registration?.selfHash
    && grant?.freshRunnerReviewHash === review?.selfHash
    && grant?.providerAuthorizationHash === authorization?.selfHash
    && grant?.authenticatedRouteEvidenceHash === route?.selfHash,
  "owner activation grant does not bind the exact R6 registration, fresh review, authorization, and route evidence");
  add(errors, grant?.provider === authorization?.provider && grant?.model === authorization?.model
    && grant?.endpoint === authorization?.endpoint && grant?.resolvedProjectResidency === authorization?.projectResidency
    && grant?.resolvedDataRegion === authorization?.dataRegion,
  "owner activation grant provider tuple or resolved residency differs from R6 authorization");
  add(errors, grant?.credentialReadAuthorized === true && grant?.providerExecutionAuthorized === true
    && grant?.naturalQuestionEgressAuthorized === true && grant?.tokenAuthorizationCreated === true
    && grant?.attemptAuthorizationCreated === true && grant?.usdAuthorizationCreated === true
    && authorization?.credentialReadAuthorized === true && authorization?.providerExecutionAuthorized === true
    && authorization?.naturalQuestionEgressAuthorized === true && authorization?.tokenAuthorizationCreated === true
    && authorization?.attemptAuthorizationCreated === true && authorization?.usdAuthorizationCreated === true,
  "owner activation and resolved authorization live-authority flags are incomplete");
  add(errors, exactSet(grant?.nonAuthorizations, REQUIRED_NON_AUTHORIZATIONS),
    "owner activation grant non-authorizations are incomplete");
  add(errors, validateSelfHashV5R3(input?.costPreview)
    && grant?.costPreviewHash === input?.costPreview?.selfHash
    && input?.costPreview?.activeRunnerRegistrationHash === registration?.selfHash
    && input?.costPreview?.provider === authorization?.provider
    && input?.costPreview?.maximumAttempts === authorization?.maximumAttempts
    && input?.costPreview?.maximumSuccessfulCalls === authorization?.maximumSuccessfulCalls
    && input?.costPreview?.maximumInputTokens === authorization?.maximumInputTokens
    && input?.costPreview?.maximumOutputTokens === authorization?.maximumOutputTokens
    && input?.costPreview?.maximumTokens === authorization?.maximumTokens
    && input?.costPreview?.maximumEstimatedUsd === authorization?.maximumEstimatedUsd,
  "independently recomputed cost preview is absent or differs from R6 authorization caps");
  add(errors, authorization?.compatibilityAuthorization?.priceSnapshotHash === input?.priceSnapshot?.selfHash
    && input?.priceSnapshot?.inputUsdPerMillionTokens === route?.inputUsdPerMillionTokens
    && input?.priceSnapshot?.outputUsdPerMillionTokens === route?.outputUsdPerMillionTokens,
  "ledger price snapshot is absent or differs from externally attested price evidence");
  add(errors, authorization?.compatibilityAuthorization?.sampleExecutionInventoryHash === input?.inventory?.selfHash
    && grant?.sampleExecutionInventoryHash === input?.inventory?.selfHash,
  "R6 activation inventory does not bind the authorization and owner activation grant");
  add(errors, Number.isFinite(Date.parse(input?.at ?? ""))
    && Date.parse(authorization?.issuedAt ?? "") > Date.parse(review?.reviewedAt ?? "")
    && Date.parse(grant?.issuedAt ?? "") > Date.parse(review?.reviewedAt ?? "")
    && Date.parse(input.at) >= Date.parse(authorization.issuedAt)
    && Date.parse(input.at) < Date.parse(authorization.expiresAt)
    && Date.parse(input.at) >= Date.parse(grant.issuedAt)
    && Date.parse(input.at) < Date.parse(grant.expiresAt),
  "R6 authorization or owner activation chronology is invalid or expired");
  if (authorization?.provider === "DEEPSEEK_DIRECT") {
    errors.push(...validateClosedSelfHashedArtifactV5R6(input?.referenceSeal, "MachineReferenceSealV5"));
    errors.push(...validateClosedSelfHashedArtifactV5R6(input?.referenceSealValidationReceipt,
      "ReferenceSealValidationReceiptV3"));
    errors.push(...validateClosedSelfHashedArtifactV5R6(input?.executionRegistration,
      "DeepSeekExecutionRegistrationV4"));
    add(errors, authorization?.referenceSealHash === input?.referenceSeal?.selfHash
      && authorization?.referenceAttemptChainHash === input?.referenceSeal?.attemptChainHash
      && authorization?.compatibilityAuthorization?.referenceSealHash
        === input?.referenceSeal?.compatibilityReferenceSealHash
      && authorization?.compatibilityAuthorization?.referenceAttemptChainHash
        === input?.referenceSeal?.attemptChainHash,
    "DeepSeek authorization does not bind the R6 and compatibility reference seals and attempt chain");
    add(errors, input?.referenceSeal?.activeRunnerRegistrationHash === registration?.selfHash
      && input?.referenceSeal?.freshRunnerReviewHash === review?.selfHash
      && input?.referenceSeal?.sampleExecutionInventoryHash === input?.inventory?.selfHash
      && input?.referenceSealValidationReceipt?.referenceSealHash === input?.referenceSeal?.selfHash
      && input?.referenceSealValidationReceipt?.referenceAttemptChainHash === input?.referenceSeal?.attemptChainHash,
    "DeepSeek reference seal or validation receipt does not bind the active R6 state");
    add(errors, input?.executionRegistration?.activeRunnerRegistrationHash === registration?.selfHash
      && input?.executionRegistration?.freshRunnerReviewHash === review?.selfHash
      && input?.executionRegistration?.deepSeekAuthorizationHash === authorization?.selfHash
      && input?.executionRegistration?.authenticatedRouteEvidenceHash === route?.selfHash
      && input?.executionRegistration?.costPreviewHash === input?.costPreview?.selfHash
      && input?.executionRegistration?.referenceSealHash === input?.referenceSeal?.selfHash
      && input?.executionRegistration?.referenceSealValidationReceiptHash
        === input?.referenceSealValidationReceipt?.selfHash
      && input?.executionRegistration?.referenceAttemptChainHash === input?.referenceSeal?.attemptChainHash
      && input?.executionRegistration?.sampleExecutionInventoryHash === input?.inventory?.selfHash
      && input?.executionRegistration?.resolvedProjectResidency === authorization?.projectResidency
      && input?.executionRegistration?.resolvedDataRegion === authorization?.dataRegion,
    "DeepSeek execution registration does not bind the exact R6 authorization, route, reference, inventory, and residency");
  }
  return Object.freeze([...new Set(errors)]);
}

export function assertProviderActivationV5R6(input) {
  const errors = validateProviderActivationV5R6(input);
  if (errors.length > 0) throw new TypeError(errors.join("; "));
  return input.authorization;
}

export const ACTIVATION_GUARD_V5_R6_CONSTANTS = Object.freeze({
  requiredNonAuthorizations: REQUIRED_NON_AUTHORIZATIONS,
  callerAuthoredRouteEvidenceAccepted: false,
  liveAuthorityInCurrentRegistration: false,
});
