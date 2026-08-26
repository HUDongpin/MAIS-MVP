import {
  canonicalJsonV5R3,
  sealV5R3Artifact,
  validateSelfHashV5R3,
} from "./execution-integrity-v5-r3.mjs";
import {
  validateClosedSelfHashedArtifactV5R4,
} from "./schema-contract-v5-r4.mjs";
import {
  assertClosedSelfHashedArtifactV5R5,
  validateClosedSelfHashedArtifactV5R5,
} from "./schema-contract-v5-r5.mjs";
import {
  validateRunnerRegistrationV5R4,
} from "./execution-evidence-v5-r4.mjs";
import {
  V5_R4_AUTHORIZATION_CONSTANTS,
  providerEgressPolicyV5R4,
} from "./route-authorization-v5-r4.mjs";
import {
  validateActiveRunnerRegistrationV5R5,
  validateFreshRunnerReviewV5R5,
  validateManifestBoundInventoryV5R5,
} from "./execution-evidence-v5-r5.mjs";
import {
  validateAuthenticatedRouteEvidenceV5R5,
} from "./route-authorization-v5-r5.mjs";

const TUPLES = Object.freeze({
  OPENAI_DIRECT: Object.freeze({ model: "gpt-5.6-luna", endpoint: "https://us.api.openai.com/v1/responses", roles: V5_R4_AUTHORIZATION_CONSTANTS.openAIRoles, attempts: 610, calls: 300, tokens: 4_000_000 }),
  DEEPSEEK_DIRECT: Object.freeze({ model: "deepseek-v4-pro", endpoint: "https://api.deepseek.com/chat/completions", roles: V5_R4_AUTHORIZATION_CONSTANTS.deepSeekRoles, attempts: 850, calls: 420, tokens: 6_000_000 }),
});
const REQUIRED_NON_AUTHORIZATIONS = Object.freeze([
  "NO_DEPLOYMENT", "NO_LIVE_QUESTION_BANK_MUTATION", "NO_GIT_MUTATION", "NO_MODEL_FALLBACK",
  "NO_BUDGET_TRANSFER", "NO_PROMPT_TUNING", "NO_RESULT_DEPENDENT_REPLACEMENT",
]);

function add(errors, condition, message) { if (!condition && !errors.includes(message)) errors.push(message); }
function exactSet(actual, expected) {
  return Array.isArray(actual) && new Set(actual).size === actual.length
    && canonicalJsonV5R3([...actual].sort()) === canonicalJsonV5R3([...expected].sort());
}

export function buildOwnerRunnerActivationGrantV5R5(input) {
  const tuple = TUPLES[input?.provider];
  if (!tuple) throw new TypeError("owner activation provider is invalid");
  const hashes = ["activeRunnerRegistrationHash", "compatibilityBaseRunnerRegistrationHash", "freshRunnerReviewHash",
    "providerAuthorizationHash", "authenticatedRouteEvidenceHash", "costPreviewHash", "sampleExecutionInventoryHash",
    "ownerAuthorizationTextHash"];
  if (!hashes.every((field) => /^[0-9a-f]{64}$/u.test(input?.[field] ?? ""))) throw new TypeError("owner activation hash binding is invalid");
  if (input.model !== tuple.model || input.endpoint !== tuple.endpoint || typeof input.resolvedDataRegion !== "string"
    || input.resolvedDataRegion.length === 0 || typeof input.resolvedProjectResidency !== "string"
    || input.resolvedProjectResidency.length === 0 || /UNKNOWN|PENDING|UNRESOLVED/iu.test(`${input.resolvedDataRegion}:${input.resolvedProjectResidency}`)) {
    throw new TypeError("owner activation exact tuple, data region, or project residency is unresolved");
  }
  if (input.maximumAttempts !== tuple.attempts || input.maximumSuccessfulCalls !== tuple.calls
    || input.maximumTokens !== tuple.tokens || !Number.isSafeInteger(input.maximumInputTokens)
    || !Number.isSafeInteger(input.maximumOutputTokens) || input.maximumInputTokens < 0 || input.maximumOutputTokens < 0
    || input.maximumInputTokens + input.maximumOutputTokens !== tuple.tokens || !Number.isFinite(input.maximumEstimatedUsd)
    || input.maximumEstimatedUsd <= 0 || input.maximumEstimatedUsd > 25) throw new TypeError("owner activation caps differ from the frozen provider envelope");
  if (!exactSet(input.nonAuthorizations, REQUIRED_NON_AUTHORIZATIONS)) throw new TypeError("owner activation non-authorizations are incomplete");
  if (typeof input.authorizedBy !== "string" || input.authorizedBy.length === 0
    || !Number.isFinite(Date.parse(input.issuedAt)) || !Number.isFinite(Date.parse(input.expiresAt))
    || new Date(input.issuedAt).toISOString() !== input.issuedAt || new Date(input.expiresAt).toISOString() !== input.expiresAt
    || Date.parse(input.issuedAt) >= Date.parse(input.expiresAt)) throw new TypeError("owner activation attribution or chronology is invalid");
  const grant = sealV5R3Artifact({
    schemaVersion: "OwnerRunnerActivationGrantV1",
    designId: "MAIS-NATURAL-CA60-V5",
    activeRunnerRegistrationHash: input.activeRunnerRegistrationHash,
    compatibilityBaseRunnerRegistrationHash: input.compatibilityBaseRunnerRegistrationHash,
    freshRunnerReviewHash: input.freshRunnerReviewHash,
    providerAuthorizationHash: input.providerAuthorizationHash,
    authenticatedRouteEvidenceHash: input.authenticatedRouteEvidenceHash,
    costPreviewHash: input.costPreviewHash,
    sampleExecutionInventoryHash: input.sampleExecutionInventoryHash,
    ownerAuthorizationTextHash: input.ownerAuthorizationTextHash,
    provider: input.provider,
    model: input.model,
    endpoint: input.endpoint,
    resolvedDataRegion: input.resolvedDataRegion,
    resolvedProjectResidency: input.resolvedProjectResidency,
    credentialReadAuthorized: true,
    providerExecutionAuthorized: true,
    naturalQuestionEgressAuthorized: true,
    tokenAuthorizationCreated: true,
    attemptAuthorizationCreated: true,
    usdAuthorizationCreated: true,
    maximumAttempts: input.maximumAttempts,
    maximumSuccessfulCalls: input.maximumSuccessfulCalls,
    maximumInputTokens: input.maximumInputTokens,
    maximumOutputTokens: input.maximumOutputTokens,
    maximumTokens: input.maximumTokens,
    maximumEstimatedUsd: input.maximumEstimatedUsd,
    currency: "USD",
    nonAuthorizations: [...input.nonAuthorizations],
    authorizedBy: input.authorizedBy,
    issuedAt: input.issuedAt,
    expiresAt: input.expiresAt,
  });
  assertClosedSelfHashedArtifactV5R5(grant, "OwnerRunnerActivationGrantV1");
  return grant;
}

function validateActivationGrant(input) {
  const grant = input.ownerActivationGrant;
  const errors = [...validateClosedSelfHashedArtifactV5R5(grant, "OwnerRunnerActivationGrantV1")];
  add(errors, validateSelfHashV5R3(grant) && grant?.schemaVersion === "OwnerRunnerActivationGrantV1", "owner V5-R5 activation grant is absent or invalid");
  add(errors, grant?.designId === "MAIS-NATURAL-CA60-V5"
    && grant?.activeRunnerRegistrationHash === input.activeRegistration?.selfHash
    && grant?.compatibilityBaseRunnerRegistrationHash === input.registration?.selfHash
    && grant?.freshRunnerReviewHash === input.freshReview?.selfHash,
  "owner activation grant runner/base/review binding is invalid");
  add(errors, grant?.providerAuthorizationHash === input.authorization?.selfHash
    && grant?.authenticatedRouteEvidenceHash === input.authenticatedRouteEvidence?.selfHash
    && grant?.costPreviewHash === input.costPreview?.selfHash
    && grant?.sampleExecutionInventoryHash === input.inventory?.selfHash,
  "owner activation grant authorization/route/cost/inventory binding is invalid");
  add(errors, grant?.provider === input.authorization?.provider && grant?.model === input.authorization?.model
    && grant?.endpoint === input.authorization?.endpoint && grant?.resolvedDataRegion === input.authenticatedRouteEvidence?.dataRegion
    && grant?.resolvedProjectResidency === input.authenticatedRouteEvidence?.projectResidency,
  "owner activation grant provider tuple or resolved region binding is invalid");
  add(errors, /^[0-9a-f]{64}$/u.test(grant?.ownerAuthorizationTextHash ?? "")
    && typeof grant?.authorizedBy === "string" && grant.authorizedBy.length > 0
    && grant?.currency === "USD" && exactSet(grant?.nonAuthorizations, REQUIRED_NON_AUTHORIZATIONS),
  "owner activation grant lacks the explicit owner-text hash, attribution, currency, or frozen non-authorizations");
  add(errors, grant?.credentialReadAuthorized === true && grant?.providerExecutionAuthorized === true
    && grant?.naturalQuestionEgressAuthorized === true && grant?.tokenAuthorizationCreated === true
    && grant?.attemptAuthorizationCreated === true && grant?.usdAuthorizationCreated === true,
  "owner activation grant booleans are incomplete");
  add(errors, grant?.maximumAttempts === input.authorization?.maximumAttempts
    && grant?.maximumSuccessfulCalls === input.authorization?.maximumSuccessfulCalls
    && grant?.maximumInputTokens === input.authorization?.maximumInputTokens
    && grant?.maximumOutputTokens === input.authorization?.maximumOutputTokens
    && grant?.maximumTokens === input.authorization?.maximumTokens
    && grant?.maximumEstimatedUsd === input.authorization?.maximumEstimatedUsd,
  "owner activation grant caps differ from the provider authorization");
  add(errors, Number.isFinite(Date.parse(grant?.issuedAt)) && Number.isFinite(Date.parse(grant?.expiresAt))
    && Date.parse(grant.issuedAt) > Date.parse(input.freshReview?.reviewedAt ?? "")
    && Date.parse(input.at) >= Date.parse(grant.issuedAt) && Date.parse(input.at) < Date.parse(grant.expiresAt),
  "owner activation grant chronology or expiry is invalid");
  return errors;
}

export function validateProviderActivationV5R5(input) {
  const errors = [
    ...validateActiveRunnerRegistrationV5R5({ activeRegistration: input.activeRegistration, baseRegistration: input.registration }),
    ...validateFreshRunnerReviewV5R5(input),
    ...validateRunnerRegistrationV5R4(input.registration),
    ...validateManifestBoundInventoryV5R5(input),
    ...validateAuthenticatedRouteEvidenceV5R5({ receipt: input.authenticatedRouteEvidence }),
    ...validateClosedSelfHashedArtifactV5R4(input.authorization, "ProviderAuthorizationV4"),
    ...validateClosedSelfHashedArtifactV5R4(input.ownerGrant, "OwnerProviderGrantV2"),
    ...validateClosedSelfHashedArtifactV5R4(input.credentialReadinessReceipt, "CredentialReadinessReceiptV2"),
    ...validateClosedSelfHashedArtifactV5R4(input.priceSnapshot, "ProviderPriceSnapshotV2"),
    ...validateActivationGrant(input),
  ];
  const authorization = input.authorization;
  const tuple = TUPLES[authorization?.provider];
  add(errors, tuple && authorization?.model === tuple.model && authorization?.endpoint === tuple.endpoint
    && exactSet(authorization?.roleSet, tuple.roles), "provider authorization tuple or exact role set is invalid");
  add(errors, authorization?.runnerRegistrationHash === input.registration?.selfHash
    && authorization?.freshRunnerReviewHash === input.freshReview?.selfHash
    && authorization?.sampleExecutionInventoryHash === input.inventory?.selfHash,
  "provider authorization base registration, fresh R5 review, or inventory binding is invalid");
  add(errors, input.ownerGrant?.runnerRegistrationHash === input.registration?.selfHash
    && input.ownerGrant?.freshRunnerReviewHash === input.freshReview?.selfHash
    && input.ownerGrant?.sampleExecutionInventoryHash === input.inventory?.selfHash
    && input.authorization?.ownerGrantHash === input.ownerGrant?.selfHash,
  "provider owner grant does not bind the exact base/R5-review/inventory/authorization chain");
  add(errors, authorization?.credentialReadinessReceiptHash === input.credentialReadinessReceipt?.selfHash
    && input.credentialReadinessReceipt?.credentialValueRecorded === false,
  "credential readiness receipt is absent, mismatched, or records a credential value");
  add(errors, authorization?.maximumAttempts === tuple?.attempts && authorization?.maximumSuccessfulCalls === tuple?.calls
    && authorization?.maximumTokens === tuple?.tokens && authorization?.maximumInputTokens + authorization?.maximumOutputTokens === tuple?.tokens
    && authorization?.maximumEstimatedUsd <= 25 && authorization?.maximumAttemptsPerItemRole === 2
    && authorization?.concurrencyCap <= 4, "provider authorization caps differ from the frozen envelope");
  add(errors, input.costPreview?.schemaVersion === "ProviderCostPreviewReceiptV1"
    && validateSelfHashV5R3(input.costPreview)
    && input.costPreview?.activeRunnerRegistrationHash === input.activeRegistration?.selfHash
    && input.costPreview?.provider === authorization?.provider
    && input.costPreview?.maximumAttempts === authorization?.maximumAttempts
    && input.costPreview?.maximumSuccessfulCalls === authorization?.maximumSuccessfulCalls
    && input.costPreview?.maximumInputTokens === authorization?.maximumInputTokens
    && input.costPreview?.maximumOutputTokens === authorization?.maximumOutputTokens
    && input.costPreview?.maximumTokens === authorization?.maximumTokens
    && input.costPreview?.maximumEstimatedUsd === authorization?.maximumEstimatedUsd
    && input.costPreview?.worstCaseCostPreviewUsd === authorization?.worstCaseCostPreviewUsd
    && input.costPreview?.bufferedWorstCaseUsd === authorization?.bufferedWorstCaseUsd,
  "provider authorization cost fields differ from the independently recomputed preview");
  add(errors, input.authenticatedRouteEvidence?.provider === authorization?.provider
    && input.authenticatedRouteEvidence?.model === authorization?.model
    && input.authenticatedRouteEvidence?.endpoint === authorization?.endpoint
    && input.authenticatedRouteEvidence?.subjectIdentityHash === authorization?.projectIdentityHash,
  "authenticated route evidence does not bind the exact provider/project tuple");
  add(errors, input.priceSnapshot?.inputUsdPerMillionTokens === input.authenticatedRouteEvidence?.inputUsdPerMillionTokens
    && input.priceSnapshot?.outputUsdPerMillionTokens === input.authenticatedRouteEvidence?.outputUsdPerMillionTokens,
  "ledger price snapshot rates differ from authenticated raw price evidence");
  add(errors, authorization?.egressPolicyHash === providerEgressPolicyV5R4(authorization?.provider).policyHash,
    "provider authorization egress policy is invalid");
  add(errors, authorization?.credentialReadAuthorized === true && authorization?.providerExecutionAuthorized === true
    && authorization?.naturalQuestionEgressAuthorized === true && authorization?.tokenAuthorizationCreated === true
    && authorization?.attemptAuthorizationCreated === true && authorization?.usdAuthorizationCreated === true,
  "provider authorization grant booleans are incomplete");
  add(errors, Number.isFinite(Date.parse(authorization?.issuedAt)) && Number.isFinite(Date.parse(authorization?.expiresAt))
    && Date.parse(authorization.issuedAt) > Date.parse(input.freshReview?.reviewedAt ?? "")
    && Date.parse(input.at) >= Date.parse(authorization.issuedAt) && Date.parse(input.at) < Date.parse(authorization.expiresAt),
  "provider authorization chronology or expiry is invalid");
  if (authorization?.provider === "DEEPSEEK_DIRECT") {
    add(errors, !/UNKNOWN|PENDING|UNRESOLVED/iu.test(input.authenticatedRouteEvidence?.projectResidency ?? "")
      && !/UNKNOWN|PENDING|UNRESOLVED/iu.test(input.authenticatedRouteEvidence?.dataRegion ?? ""),
    "DeepSeek activation remains blocked until route residency and data region are resolved");
  }
  return Object.freeze([...new Set(errors)]);
}

export function assertProviderActivationV5R5(input) {
  const errors = validateProviderActivationV5R5(input);
  if (errors.length > 0) throw new TypeError(errors.join("; "));
  return input.authorization;
}
