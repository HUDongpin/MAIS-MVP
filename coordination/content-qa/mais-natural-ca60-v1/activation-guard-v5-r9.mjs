import {
  canonicalJsonV5R3,
} from "./execution-integrity-v5-r3.mjs";
import {
  validateActiveRunnerRegistrationV5R9,
  validateExactRunnerRegistrationEvidenceV5R9,
} from "./execution-evidence-v5-r9.mjs";
import {
  validateFreshRunnerReviewV5R9,
} from "./review-evidence-v5-r9.mjs";
import {
  validateTrustedProviderEvidenceEnvelopeV5R9,
} from "./trusted-provider-evidence-v5-r9.mjs";
import {
  validateResumeCustodyV5R9,
} from "./attempt-recovery-v5-r9.mjs";
import {
  validateManifestBoundInventoryV5R5,
} from "./execution-evidence-v5-r5.mjs";
import {
  validateResolvedProviderAuthorizationV5R6,
} from "./provider-request-v5-r6.mjs";
import {
  validateClosedSelfHashedArtifactV5R9,
} from "./schema-contract-v5-r9.mjs";
import {
  validateRawAuthoritativeMachineReferenceSealV5R9,
  validateRawAuthoritativeReferenceValidationV5R9,
} from "./raw-authoritative-reference-v5-r9.mjs";

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
    endpoint: "https://us.api.openai.com/v1/responses", projectResidency: "US_STORAGE_PROCESSING",
    dataRegion: "US", maximumAttempts: 610, maximumSuccessfulCalls: 300,
    maximumTokens: 4_000_000, maximumEstimatedUsd: 25 }),
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

function priceEvidence(input) {
  const route = input?.authenticatedRouteEvidence;
  return route ? Object.freeze({
    inputUsdPerMillionTokens: route.inputUsdPerMillionTokens,
    outputUsdPerMillionTokens: route.outputUsdPerMillionTokens,
  }) : null;
}

function validateCostPreview(input, errors) {
  const preview = input?.costPreview;
  const authorization = input?.authorization;
  const price = priceEvidence(input);
  errors.push(...validateClosedSelfHashedArtifactV5R9(preview, "ProviderCostPreviewReceiptV1"));
  const completeOutputTokens = authorization?.maximumSuccessfulCalls
    * preview?.reservedOutputTokensPerSuccessfulCall;
  const recomputedWorst = Number((((authorization?.maximumInputTokens
    * price?.inputUsdPerMillionTokens) + (authorization?.maximumOutputTokens
      * price?.outputUsdPerMillionTokens)) / 1_000_000).toFixed(12));
  const recomputedBuffered = Number((recomputedWorst * 1.2).toFixed(12));
  add(errors, preview?.activeRunnerRegistrationHash === input?.activeRegistration?.selfHash
    && preview?.provider === authorization?.provider
    && preview?.maximumAttempts === authorization?.maximumAttempts
    && preview?.maximumSuccessfulCalls === authorization?.maximumSuccessfulCalls
    && preview?.maximumInputTokens === authorization?.maximumInputTokens
    && preview?.maximumOutputTokens === authorization?.maximumOutputTokens
    && preview?.maximumTokens === authorization?.maximumTokens
    && preview?.completeSuccessfulCallGraphOutputTokens === completeOutputTokens
    && preview?.inputUsdPerMillionTokens === price?.inputUsdPerMillionTokens
    && preview?.outputUsdPerMillionTokens === price?.outputUsdPerMillionTokens
    && preview?.priceEvidenceHash === input?.routeEvidenceEnvelope?.selfHash
    && preview?.worstCaseCostPreviewUsd === recomputedWorst
    && preview?.bufferMultiplier === 1.2
    && preview?.bufferedWorstCaseUsd === recomputedBuffered
    && preview?.maximumEstimatedUsd === authorization?.maximumEstimatedUsd
    && recomputedBuffered <= authorization?.maximumEstimatedUsd,
  "R9 cost preview is not an exact signed-route price reconstruction with a 20 percent buffer");
}

export function validateProviderActivationV5R9(input) {
  const errors = [
    ...validateExactRunnerRegistrationEvidenceV5R9(input?.registrationEvidence),
    ...validateActiveRunnerRegistrationV5R9(input?.activeRegistration),
    ...validateFreshRunnerReviewV5R9(input ?? {}),
    ...validateResolvedProviderAuthorizationV5R6(input?.authorization),
    ...validateClosedSelfHashedArtifactV5R9(input?.ownerActivationGrant,
      "OwnerRunnerActivationGrantV1"),
    ...validateClosedSelfHashedArtifactV5R9(input?.priceSnapshot, "ProviderPriceSnapshotV2"),
    ...validateResumeCustodyV5R9(input?.attemptCustody ?? {}),
  ];
  try {
    errors.push(...validateTrustedProviderEvidenceEnvelopeV5R9({
      envelope: input?.routeEvidenceEnvelope,
      activeRegistration: input?.activeRegistration,
      authenticatedRouteEvidence: input?.authenticatedRouteEvidence,
      routeProbeArtifacts: input?.routeProbeArtifacts,
      priceSnapshot: input?.priceSnapshot,
      at: input?.at,
    }));
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
  }
  try {
    errors.push(...validateManifestBoundInventoryV5R5({ registration: input?.registration,
      inventory: input?.inventory, sampleManifest: input?.sampleManifest,
      c0RandomAudit: input?.c0RandomAudit, screenEvidence: input?.screenEvidence }));
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
  }
  try { validateCostPreview(input, errors); }
  catch (error) { errors.push(error instanceof Error ? error.message : String(error)); }

  const registration = input?.activeRegistration;
  const evidence = input?.registrationEvidence;
  const review = input?.freshReview;
  const route = input?.routeEvidenceEnvelope;
  const authorization = input?.authorization;
  const grant = input?.ownerActivationGrant;
  const preview = input?.costPreview;
  const price = priceEvidence(input);
  const envelope = ENVELOPES[authorization?.provider];
  add(errors, evidence?.activeRegistration?.selfHash === registration?.selfHash,
    "R9 exact registration evidence does not bind the supplied active registration");
  add(errors, envelope && authorization?.model === envelope.model
    && authorization?.endpoint === envelope.endpoint,
  "R9 authorization provider, model, or endpoint differs from the frozen direct route");
  add(errors, authorization?.activeRunnerRegistrationHash === registration?.selfHash
    && authorization?.freshRunnerReviewHash === review?.selfHash
    && authorization?.authenticatedRouteEvidenceHash === route?.selfHash
    && authorization?.compatibilityBaseRunnerRegistrationHash === input?.registration?.selfHash,
  "R9 authorization does not bind the exact registration, review, signed route, and compatibility base");
  for (const field of ["provider", "model", "endpoint", "projectResidency", "dataRegion"]) {
    add(errors, authorization?.[field] === route?.[field],
    `R9 authorization ${field} differs from signed route evidence`);
  }
  add(errors, authorization?.projectIdentityHash === route?.subjectIdentityHash,
    "R9 authorization subject differs from signed route evidence");
  add(errors, authorization?.provider !== "OPENAI_DIRECT"
    || (authorization?.projectResidency === envelope.projectResidency
      && authorization?.dataRegion === envelope.dataRegion),
  "R9 OpenAI authorization is not bound to US_STORAGE_PROCESSING and US data region");
  add(errors, !/UNKNOWN|PENDING|UNRESOLVED/iu.test(
    `${authorization?.projectResidency}:${authorization?.dataRegion}`),
  "R9 provider residency and data region remain unresolved");
  add(errors, envelope && authorization?.maximumAttempts === envelope.maximumAttempts
    && authorization?.maximumSuccessfulCalls === envelope.maximumSuccessfulCalls
    && authorization?.maximumTokens === envelope.maximumTokens
    && authorization?.maximumEstimatedUsd === envelope.maximumEstimatedUsd
    && authorization?.maximumInputTokens + authorization?.maximumOutputTokens
      === authorization?.maximumTokens
    && authorization?.concurrencyCap <= 4 && authorization?.maximumAttemptsPerItemRole === 2,
  "R9 provider authorization differs from the frozen attempt, token, USD, or concurrency envelope");
  add(errors, allLiveAuthorityFlags(authorization) && allLiveAuthorityFlags(grant),
    "R9 provider authorization or owner activation grant lacks explicit live authority flags");
  add(errors, grant?.activeRunnerRegistrationHash === registration?.selfHash
    && grant?.compatibilityBaseRunnerRegistrationHash === input?.registration?.selfHash
    && grant?.freshRunnerReviewHash === review?.selfHash
    && grant?.providerAuthorizationHash === authorization?.selfHash
    && grant?.authenticatedRouteEvidenceHash === route?.selfHash
    && grant?.costPreviewHash === preview?.selfHash
    && grant?.sampleExecutionInventoryHash === input?.inventory?.selfHash,
  "R9 owner grant does not bind the exact registration, review, route, cost, authorization, and inventory");
  add(errors, grant?.provider === authorization?.provider && grant?.model === authorization?.model
    && grant?.endpoint === authorization?.endpoint
    && grant?.resolvedProjectResidency === authorization?.projectResidency
    && grant?.resolvedDataRegion === authorization?.dataRegion,
  "R9 owner grant tuple differs from the signed resolved authorization");
  add(errors, grant?.maximumAttempts === authorization?.maximumAttempts
    && grant?.maximumSuccessfulCalls === authorization?.maximumSuccessfulCalls
    && grant?.maximumInputTokens === authorization?.maximumInputTokens
    && grant?.maximumOutputTokens === authorization?.maximumOutputTokens
    && grant?.maximumTokens === authorization?.maximumTokens
    && grant?.maximumEstimatedUsd === authorization?.maximumEstimatedUsd
    && grant?.currency === "USD" && exactSet(grant?.nonAuthorizations, REQUIRED_NON_AUTHORIZATIONS),
  "R9 owner grant caps, currency, or non-authorizations differ from the frozen envelope");
  add(errors, authorization?.compatibilityAuthorizationHash
      === authorization?.compatibilityAuthorization?.selfHash
    && authorization?.compatibilityAuthorization?.priceSnapshotHash === input?.priceSnapshot?.selfHash
    && input?.priceSnapshot?.inputUsdPerMillionTokens === price?.inputUsdPerMillionTokens
    && input?.priceSnapshot?.outputUsdPerMillionTokens === price?.outputUsdPerMillionTokens
    && authorization?.compatibilityAuthorization?.sampleExecutionInventoryHash
      === input?.inventory?.selfHash,
  "R9 compatibility ledger authorization, signed price, or inventory binding is invalid");
  add(errors, Number.isFinite(Date.parse(input?.at ?? ""))
    && Date.parse(authorization?.issuedAt ?? "") > Date.parse(review?.reviewedAt ?? "")
    && Date.parse(grant?.issuedAt ?? "") > Date.parse(review?.reviewedAt ?? "")
    && Date.parse(input.at) >= Date.parse(authorization?.issuedAt ?? "")
    && Date.parse(input.at) < Date.parse(authorization?.expiresAt ?? "")
    && Date.parse(input.at) >= Date.parse(grant?.issuedAt ?? "")
    && Date.parse(input.at) < Date.parse(grant?.expiresAt ?? ""),
  "R9 authorization or grant chronology is invalid or expired");

  if (authorization?.provider === "DEEPSEEK_DIRECT") {
    errors.push(...validateRawAuthoritativeMachineReferenceSealV5R9({
      ...(input?.referenceSealContext ?? {}), seal: input?.referenceSeal,
      compatibilityReferenceSeal: input?.compatibilityReferenceSeal,
    }));
    errors.push(...validateRawAuthoritativeReferenceValidationV5R9({
      ...(input?.referenceSealContext ?? {}), validationReceipt: input?.referenceSealValidationReceipt,
      seal: input?.referenceSeal, compatibilityReferenceSeal: input?.compatibilityReferenceSeal,
    }));
    errors.push(...validateClosedSelfHashedArtifactV5R9(input?.executionRegistration,
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
    "R9 DeepSeek execution registration is not bound to the sealed reference and exact live tuple");
  }
  return Object.freeze([...new Set(errors)]);
}

export function assertProviderActivationV5R9(input) {
  const errors = validateProviderActivationV5R9(input);
  if (errors.length > 0) throw new TypeError(errors.join("; "));
  return input.authorization;
}

export const ACTIVATION_GUARD_V5_R9_CONSTANTS = Object.freeze({
  requiredNonAuthorizations: REQUIRED_NON_AUTHORIZATIONS,
  providerEnvelopes: ENVELOPES,
  trustAnchoredRouteEvidenceRequired: true,
  exactFreshA11ProcessEvidenceRequired: true,
  interruptedAttemptCustodyMustBeFullyReconciled: true,
  credentialReadAfterAllGuardsOnly: true,
  defaultLiveAuthority: false,
});
