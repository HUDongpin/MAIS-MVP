import {
  canonicalJsonV5R3,
} from "./execution-integrity-v5-r3.mjs";
import {
  validateActiveRunnerRegistrationV5R7,
  validateExactRunnerRegistrationEvidenceV5R7,
  validateFreshRunnerReviewV5R7,
} from "./execution-evidence-v5-r7.mjs";
import {
  validateManifestBoundInventoryV5R5,
} from "./execution-evidence-v5-r5.mjs";
import {
  validateAttestedRouteEvidenceV5R7,
  validateProviderCostPreviewV5R7,
} from "./evidence-attestation-v5-r7.mjs";
import {
  validateResolvedProviderAuthorizationV5R6,
} from "./provider-request-v5-r6.mjs";
import {
  validateRawAuthoritativeMachineReferenceSealV5R7,
  validateRawAuthoritativeReferenceValidationV5R7,
} from "./raw-authoritative-reference-v5-r7.mjs";
import {
  validateClosedSelfHashedArtifactV5R7,
} from "./schema-contract-v5-r7.mjs";

const REQUIRED_NON_AUTHORIZATIONS = Object.freeze([
  "NO_DEPLOYMENT",
  "NO_LIVE_QUESTION_BANK_MUTATION",
  "NO_GIT_MUTATION",
  "NO_MODEL_FALLBACK",
  "NO_BUDGET_TRANSFER",
  "NO_PROMPT_TUNING",
  "NO_RESULT_DEPENDENT_REPLACEMENT",
]);

const ENVELOPES = Object.freeze({
  OPENAI_DIRECT: Object.freeze({ model: "gpt-5.6-luna",
    endpoint: "https://us.api.openai.com/v1/responses", maximumAttempts: 610,
    maximumSuccessfulCalls: 300, maximumTokens: 4_000_000, maximumEstimatedUsd: 25 }),
  DEEPSEEK_DIRECT: Object.freeze({ model: "deepseek-v4-pro",
    endpoint: "https://api.deepseek.com/chat/completions", maximumAttempts: 850,
    maximumSuccessfulCalls: 420, maximumTokens: 6_000_000, maximumEstimatedUsd: 25 }),
});

function add(errors, condition, message) {
  if (!condition && !errors.includes(message)) errors.push(message);
}

function exactSet(actual, expected) {
  return Array.isArray(actual) && new Set(actual).size === actual.length
    && canonicalJsonV5R3([...actual].sort()) === canonicalJsonV5R3([...expected].sort());
}

function allLiveAuthorityFlags(value) {
  return value?.credentialReadAuthorized === true
    && value.providerExecutionAuthorized === true
    && value.naturalQuestionEgressAuthorized === true
    && value.tokenAuthorizationCreated === true
    && value.attemptAuthorizationCreated === true
    && value.usdAuthorizationCreated === true;
}

export function validateProviderActivationV5R7(input) {
  const errors = [
    ...validateExactRunnerRegistrationEvidenceV5R7(input?.registrationEvidence),
    ...validateActiveRunnerRegistrationV5R7(input?.activeRegistration),
    ...validateFreshRunnerReviewV5R7(input ?? {}),
    ...validateResolvedProviderAuthorizationV5R6(input?.authorization),
    ...validateAttestedRouteEvidenceV5R7(input?.authenticatedRouteEvidence),
    ...validateClosedSelfHashedArtifactV5R7(input?.ownerActivationGrant,
      "OwnerRunnerActivationGrantV1"),
    ...validateClosedSelfHashedArtifactV5R7(input?.priceSnapshot, "ProviderPriceSnapshotV2"),
  ];
  try {
    errors.push(...validateProviderCostPreviewV5R7({
      routeEvidence: input?.authenticatedRouteEvidence,
      preview: input?.costPreview,
    }));
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
  }
  try {
    errors.push(...validateManifestBoundInventoryV5R5({
      registration: input?.registration,
      inventory: input?.inventory,
      sampleManifest: input?.sampleManifest,
      c0RandomAudit: input?.c0RandomAudit,
      screenEvidence: input?.screenEvidence,
    }));
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
  }

  const registration = input?.activeRegistration;
  const evidence = input?.registrationEvidence;
  const review = input?.freshReview;
  const authorization = input?.authorization;
  const route = input?.authenticatedRouteEvidence;
  const preview = input?.costPreview;
  const grant = input?.ownerActivationGrant;
  const envelope = ENVELOPES[authorization?.provider];
  add(errors, evidence?.activeRegistration?.selfHash === registration?.selfHash,
    "R7 activation evidence does not bind the supplied active registration");
  add(errors, envelope && authorization?.model === envelope.model
    && authorization?.endpoint === envelope.endpoint,
  "R7 authorization provider/model/endpoint tuple is not the frozen direct route");
  add(errors, authorization?.activeRunnerRegistrationHash === registration?.selfHash
    && authorization?.freshRunnerReviewHash === review?.selfHash
    && authorization?.authenticatedRouteEvidenceHash === route?.selfHash
    && authorization?.compatibilityBaseRunnerRegistrationHash === input?.registration?.selfHash,
  "R7 authorization does not bind the exact registration, review, route, and compatibility base");
  for (const field of ["provider", "model", "endpoint", "projectResidency", "dataRegion"]) {
    add(errors, authorization?.[field] === route?.[field],
      `R7 authorization ${field} differs from raw-derived route evidence`);
  }
  add(errors, authorization?.projectIdentityHash === route?.subjectIdentityHash,
    "R7 authorization identity differs from raw-derived route evidence");
  add(errors, authorization?.provider !== "DEEPSEEK_DIRECT"
    || !["UNRESOLVED", "UNKNOWN_PENDING_ROUTE_PROBE_EVIDENCE"].includes(authorization?.projectResidency),
  "DeepSeek residency remains unresolved and is not live-dispatch eligible");
  add(errors, authorization?.provider !== "OPENAI_DIRECT"
    || authorization?.projectResidency === "US_STORAGE_PROCESSING",
  "OpenAI reference authorization is not bound to US_STORAGE_PROCESSING");
  add(errors, envelope && authorization?.maximumAttempts === envelope.maximumAttempts
    && authorization?.maximumSuccessfulCalls === envelope.maximumSuccessfulCalls
    && authorization?.maximumTokens === envelope.maximumTokens
    && authorization?.maximumEstimatedUsd === envelope.maximumEstimatedUsd
    && authorization?.maximumInputTokens + authorization?.maximumOutputTokens
      === authorization?.maximumTokens
    && authorization?.concurrencyCap <= 4 && authorization?.maximumAttemptsPerItemRole === 2,
  "R7 provider authorization differs from the frozen attempt/token/USD/concurrency envelope");
  add(errors, allLiveAuthorityFlags(authorization) && allLiveAuthorityFlags(grant),
    "R7 provider authorization or owner grant lacks explicit live authority flags");
  add(errors, grant?.activeRunnerRegistrationHash === registration?.selfHash
    && grant?.compatibilityBaseRunnerRegistrationHash === input?.registration?.selfHash
    && grant?.freshRunnerReviewHash === review?.selfHash
    && grant?.providerAuthorizationHash === authorization?.selfHash
    && grant?.authenticatedRouteEvidenceHash === route?.selfHash
    && grant?.costPreviewHash === preview?.selfHash
    && grant?.sampleExecutionInventoryHash === input?.inventory?.selfHash,
  "R7 owner grant does not bind the exact registration/review/authorization/route/cost/inventory tuple");
  add(errors, grant?.provider === authorization?.provider && grant?.model === authorization?.model
    && grant?.endpoint === authorization?.endpoint
    && grant?.resolvedProjectResidency === authorization?.projectResidency
    && grant?.resolvedDataRegion === authorization?.dataRegion,
  "R7 owner grant tuple differs from the resolved authorization");
  add(errors, grant?.maximumAttempts === authorization?.maximumAttempts
    && grant?.maximumSuccessfulCalls === authorization?.maximumSuccessfulCalls
    && grant?.maximumInputTokens === authorization?.maximumInputTokens
    && grant?.maximumOutputTokens === authorization?.maximumOutputTokens
    && grant?.maximumTokens === authorization?.maximumTokens
    && grant?.maximumEstimatedUsd === authorization?.maximumEstimatedUsd
    && grant?.currency === "USD" && exactSet(grant?.nonAuthorizations, REQUIRED_NON_AUTHORIZATIONS),
  "R7 owner grant caps, currency, or non-authorizations differ from the frozen envelope");
  add(errors, preview?.activeRunnerRegistrationHash === registration?.selfHash
    && preview?.provider === authorization?.provider
    && preview?.maximumAttempts === authorization?.maximumAttempts
    && preview?.maximumSuccessfulCalls === authorization?.maximumSuccessfulCalls
    && preview?.maximumInputTokens === authorization?.maximumInputTokens
    && preview?.maximumOutputTokens === authorization?.maximumOutputTokens
    && preview?.maximumTokens === authorization?.maximumTokens
    && preview?.maximumEstimatedUsd === authorization?.maximumEstimatedUsd
    && preview?.priceEvidenceHash === route?.selfHash
    && preview?.bufferMultiplier === 1.2
    && preview?.bufferedWorstCaseUsd <= authorization?.maximumEstimatedUsd,
  "R7 cost preview is not a recomputed route-bound full envelope with a 20% buffer");
  add(errors, authorization?.compatibilityAuthorizationHash
      === authorization?.compatibilityAuthorization?.selfHash
    && authorization?.compatibilityAuthorization?.priceSnapshotHash === input?.priceSnapshot?.selfHash
    && input?.priceSnapshot?.inputUsdPerMillionTokens === route?.inputUsdPerMillionTokens
    && input?.priceSnapshot?.outputUsdPerMillionTokens === route?.outputUsdPerMillionTokens
    && authorization?.compatibilityAuthorization?.sampleExecutionInventoryHash === input?.inventory?.selfHash,
  "R7 compatibility ledger authorization, price snapshot, or inventory binding is invalid");
  add(errors, Number.isFinite(Date.parse(input?.at ?? ""))
    && Date.parse(authorization?.issuedAt ?? "") > Date.parse(review?.reviewedAt ?? "")
    && Date.parse(grant?.issuedAt ?? "") > Date.parse(review?.reviewedAt ?? "")
    && Date.parse(input.at) >= Date.parse(authorization?.issuedAt ?? "")
    && Date.parse(input.at) < Date.parse(authorization?.expiresAt ?? "")
    && Date.parse(input.at) >= Date.parse(grant?.issuedAt ?? "")
    && Date.parse(input.at) < Date.parse(grant?.expiresAt ?? ""),
  "R7 authorization/grant chronology is invalid or expired");

  if (authorization?.provider === "DEEPSEEK_DIRECT") {
    errors.push(...validateRawAuthoritativeMachineReferenceSealV5R7({
      ...(input?.referenceSealContext ?? {}),
      seal: input?.referenceSeal,
      compatibilityReferenceSeal: input?.compatibilityReferenceSeal,
    }));
    errors.push(...validateRawAuthoritativeReferenceValidationV5R7({
      ...(input?.referenceSealContext ?? {}),
      validationReceipt: input?.referenceSealValidationReceipt,
      seal: input?.referenceSeal,
      compatibilityReferenceSeal: input?.compatibilityReferenceSeal,
    }));
    errors.push(...validateClosedSelfHashedArtifactV5R7(input?.executionRegistration,
      "DeepSeekExecutionRegistrationV4"));
    add(errors, authorization?.referenceSealHash === input?.referenceSeal?.selfHash
      && authorization?.referenceAttemptChainHash === input?.referenceSeal?.attemptChainHash
      && input?.executionRegistration?.activeRunnerRegistrationHash === registration?.selfHash
      && input?.executionRegistration?.freshRunnerReviewHash === review?.selfHash
      && input?.executionRegistration?.deepSeekAuthorizationHash === authorization?.selfHash
      && input?.executionRegistration?.authenticatedRouteEvidenceHash === route?.selfHash
      && input?.executionRegistration?.costPreviewHash === preview?.selfHash
      && input?.executionRegistration?.referenceSealHash === input?.referenceSeal?.selfHash
      && input?.executionRegistration?.referenceSealValidationReceiptHash
        === input?.referenceSealValidationReceipt?.selfHash
      && input?.executionRegistration?.sampleExecutionInventoryHash === input?.inventory?.selfHash,
    "R7 DeepSeek execution registration is not bound to the raw-authoritative reference and exact live tuple");
  }
  return Object.freeze([...new Set(errors)]);
}

export function assertProviderActivationV5R7(input) {
  const errors = validateProviderActivationV5R7(input);
  if (errors.length > 0) throw new TypeError(errors.join("; "));
  return input.authorization;
}

export const ACTIVATION_GUARD_V5_R7_CONSTANTS = Object.freeze({
  requiredNonAuthorizations: REQUIRED_NON_AUTHORIZATIONS,
  providerEnvelopes: ENVELOPES,
  routeClaimsDerivedFromProtectedRawBytes: true,
  costPreviewRecomputedWithTwentyPercentBuffer: true,
  freshA11ConcurrenceRequiredBeforeCredentialRead: true,
  defaultLiveAuthority: false,
});
