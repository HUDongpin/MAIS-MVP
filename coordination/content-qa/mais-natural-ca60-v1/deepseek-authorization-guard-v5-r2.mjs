import DESIGN_REGISTRATION from "../../research/mais-natural-ca60-v1/versions/design-v5/design-registration.json" with { type: "json" };
import PACKAGE_MANIFEST from "../../research/mais-natural-ca60-v1/versions/design-v5/package-manifest.json" with { type: "json" };
import AUTHORIZATION_SCHEMA from "../../research/mais-natural-ca60-v1/versions/design-v5/schemas/ProviderAuthorizationV2.schema.json" with { type: "json" };
import { canonicalJson, jcsHash } from "../../research/mais-natural-ca60-v1/versions/design-v5/design-contract.mjs";
import { DEEPSEEK_EVALUATION_ADAPTER_V5_R2_CONSTANTS } from "./deepseek-evaluation-adapter-v5-r2.mjs";
import { LIVE_PROVIDER_HTTP_V5_R2_CONSTANTS } from "./live-provider-http-v5-r2.mjs";

const DESIGN_ID = "MAIS-NATURAL-CA60-V5";
const PROVIDER = "DEEPSEEK_DIRECT";
const MODEL = "deepseek-v4-pro";
const ENDPOINT = "https://api.deepseek.com/chat/completions";
const PROJECT_RESIDENCY = "UNKNOWN_PENDING_ROUTE_PROBE_EVIDENCE";
const API_SURFACE = "CHAT_COMPLETIONS_OPENAI_COMPATIBLE";
const SHA256 = /^[0-9a-f]{64}$/u;
const GIT_SHA1 = /^[0-9a-f]{40}$/u;
const ROLE_SET = Object.freeze([
  "B_PRIME_CRITIQUE", "B_PRIME_REVISION", "C0_PRIME_ROLE_1", "C0_PRIME_ROLE_2",
  "C0_PRIME_ROLE_3", "C0_PRIME_ROLE_4", "C0_PRIME_ROLE_5",
]);
const REQUEST_FIELDS = Object.freeze([
  "itemIdPseudonym", "itemHash", "clusterId", "provider", "model", "endpoint",
  "projectResidency", "apiSurface", "role", "logicalRequest", "logicalRequestHash",
  "wireRequest", "wireRequestBodyHash", "adapterTransformHash", "referenceInputCount",
  "reserveInputTokens", "reserveOutputTokens", "reserveTokens", "reserveUsd",
]);
const BUDGET_FIELDS = Object.freeze([
  "attemptsUsed", "successfulCallsUsed", "inputTokensUsed", "outputTokensUsed", "totalTokensUsed",
  "estimatedUsdUsed", "pendingReservedInputTokens", "pendingReservedOutputTokens",
  "pendingReservedTokens", "pendingReservedUsd", "concurrencyActive", "roleAttemptsUsed",
]);
const EGRESS_ALLOWLIST = Object.freeze([
  "prompt", "options", "storedAnswer", "acceptedAnswers", "explanation", "rubric",
  "difficulty", "itemPseudonym", "bPrimeCritiqueArtifact",
]);
const EGRESS_DENYLIST = Object.freeze([
  "OPENAI_REFERENCE_FINAL_REFERENCE_TO_DEEPSEEK", "DEEPSEEK_OUTPUT_TO_OPENAI_REFERENCE",
  "SOURCE_PATH", "GIT_METADATA", "CREDENTIAL", "STUDENT_OR_USER_DATA", "OTHER_ITEM",
  "UNAUTHORIZED_COPYRIGHT_CONTENT", "INTERNAL_RESEARCH_RECORD",
]);
const REQUIRED_NON_AUTHORIZATIONS = Object.freeze([
  "NO_DEPLOYMENT", "NO_LIVE_QUESTION_BANK_MUTATION", "NO_GIT_MUTATION", "NO_MODEL_FALLBACK",
  "NO_BUDGET_TRANSFER", "NO_PROMPT_TUNING", "NO_RESULT_DEPENDENT_REPLACEMENT",
]);
const TRUSTED_HASH_FIELDS = Object.freeze([
  "authorizationHash", "ownerGrantHash", "authorizationEvidenceHash", "priceSnapshotHash",
  "projectRoutePreflightReceiptHash", "providerRouteDecisionHash", "frameRegistrationHash",
  "samplingFrameHash", "sampleManifestHash", "runtimeConfigHash", "promptSetHash", "schemaSetHash",
  "runnerCommit", "runnerHash", "adapterHash", "privacyScreenHash", "rightsScreenHash",
  "referenceSealHash", "referenceAttemptChainHash", "routeProbeAuthorizationHash", "routeProbeReceiptHash",
]);

function plainObject(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function same(left, right) {
  return canonicalJson(left) === canonicalJson(right);
}

function add(errors, message) {
  if (!errors.includes(message)) errors.push(message);
}

function selfHashValid(value, field) {
  if (!plainObject(value) || !SHA256.test(value[field] ?? "")) return false;
  const body = structuredClone(value);
  delete body[field];
  return value[field] === jcsHash(body);
}

function validateDesignAndReview({ designRegistration, activeDesignPointer, independentReviewReceipt, authorization }) {
  const errors = [];
  if (designRegistration?.designId !== DESIGN_ID
    || designRegistration?.registrationHash !== DESIGN_REGISTRATION.registrationHash
    || designRegistration?.providerEventCount !== 0
    || designRegistration?.scope?.decisionCeiling !== "INCONCLUSIVE_MACHINE_REFERENCE") {
    add(errors, "DeepSeek V5 design identity, zero-event state, or decision ceiling drifted");
  }
  if (activeDesignPointer?.activeDesignId !== DESIGN_ID
    || activeDesignPointer?.activeRegistrationHash !== DESIGN_REGISTRATION.registrationHash
    || activeDesignPointer?.activeDesignPath !== "versions/design-v5/design-registration.json") {
    add(errors, "DeepSeek active design pointer does not bind V5");
  }
  if (independentReviewReceipt?.schemaVersion !== "IndependentDesignReviewReceiptV1"
    || independentReviewReceipt?.designId !== DESIGN_ID
    || independentReviewReceipt?.designRegistrationHash !== DESIGN_REGISTRATION.registrationHash
    || independentReviewReceipt?.reviewedDesignPackageRootHash !== PACKAGE_MANIFEST.packageRootHash
    || independentReviewReceipt?.reviewerLane !== "A11" || independentReviewReceipt?.decision !== "CONCURRED"
    || !selfHashValid(independentReviewReceipt, "reviewHash")) {
    add(errors, "DeepSeek A11 review is absent, non-concurring, or hash-drifted");
  }
  if (authorization && independentReviewReceipt
    && (authorization.runnerCommit !== independentReviewReceipt.runnerCommit
      || authorization.runnerHash !== independentReviewReceipt.runnerHash
      || authorization.adapterHash !== independentReviewReceipt.adapterHash)) {
    add(errors, "DeepSeek authorization runner/adapter differs from A11 review");
  }
  const reviewedAt = Date.parse(independentReviewReceipt?.reviewedAt);
  const pointerAt = Date.parse(activeDesignPointer?.pointerUpdatedAt);
  const issuedAt = Date.parse(authorization?.issuedAt);
  if (![reviewedAt, pointerAt, issuedAt].every(Number.isFinite) || reviewedAt >= pointerAt || pointerAt >= issuedAt) {
    add(errors, "DeepSeek review, activation, and authorization chronology is invalid");
  }
  return errors;
}

function validateAuthorization(authorization, trusted, request) {
  const errors = [];
  if (!plainObject(authorization)) return ["DeepSeek ProviderAuthorizationV2 is missing"];
  if (!same(Object.keys(authorization).sort(), Object.keys(AUTHORIZATION_SCHEMA.properties).sort())) {
    add(errors, "DeepSeek ProviderAuthorizationV2 fields are invalid");
  }
  if (authorization.schemaVersion !== "ProviderAuthorizationV2"
    || authorization.authorizationKind !== "DEEPSEEK_EVALUATION" || authorization.designId !== DESIGN_ID
    || authorization.registrationHash !== DESIGN_REGISTRATION.registrationHash
    || authorization.provider !== PROVIDER || authorization.model !== MODEL || authorization.endpoint !== ENDPOINT
    || authorization.allowedOrigin !== "https://api.deepseek.com"
    || authorization.projectResidency !== PROJECT_RESIDENCY || authorization.apiSurface !== API_SURFACE) {
    add(errors, "DeepSeek authorization provider/model/endpoint/design tuple mismatch");
  }
  if (!GIT_SHA1.test(authorization.runnerCommit ?? "")) add(errors, "DeepSeek authorization runner commit is invalid");
  for (const field of [
    "frameRegistrationHash", "samplingFrameHash", "sampleManifestHash", "runtimeConfigHash", "promptSetHash",
    "schemaSetHash", "runnerHash", "adapterHash", "providerRouteDecisionHash",
    "projectRoutePreflightReceiptHash", "privacyScreenHash", "rightsScreenHash", "priceSnapshotHash",
    "ownerGrantHash", "authorizationEvidenceHash", "referenceSealHash", "referenceAttemptChainHash",
    "routeProbeAuthorizationHash", "routeProbeReceiptHash", "authorizationHash",
  ]) {
    if (!SHA256.test(authorization[field] ?? "")) add(errors, `DeepSeek authorization ${field} is missing or invalid`);
  }
  if (!selfHashValid(authorization, "authorizationHash")) add(errors, "DeepSeek authorization self hash mismatch");
  if (!same([...authorization.roleSet].sort(), [...ROLE_SET].sort())) add(errors, "DeepSeek authorization role set mismatch");
  if (!same([...authorization.egressAllowlist].sort(), [...EGRESS_ALLOWLIST].sort())) add(errors, "DeepSeek egress allowlist mismatch");
  if (!same([...authorization.egressDenylist].sort(), [...EGRESS_DENYLIST].sort())) add(errors, "DeepSeek egress denylist mismatch");
  if (REQUIRED_NON_AUTHORIZATIONS.some((entry) => !authorization.nonAuthorizations?.includes(entry))) {
    add(errors, "DeepSeek authorization non-authorizations are incomplete");
  }
  if (authorization.promptSetHash !== DESIGN_REGISTRATION.providerControls.deepSeekRoleContractCatalog.inheritedRoleContractRootHash
    || authorization.schemaSetHash !== DESIGN_REGISTRATION.interfaces.schemaSetHash
    || authorization.logicalRequestTemplateHash !== DESIGN_REGISTRATION.providerControls.deepSeekRoleContractCatalog.inheritedRequestTemplateHash
    || authorization.wireRequestTemplateHash !== DESIGN_REGISTRATION.providerControls.deepSeekRoleContractCatalog.inheritedRequestTemplateHash
    || authorization.adapterHash !== DEEPSEEK_EVALUATION_ADAPTER_V5_R2_CONSTANTS.adapterTransformHash) {
    add(errors, "DeepSeek prompt/schema/request/adapter roots mismatch");
  }
  if (authorization.maximumAttempts > 850 || authorization.maximumSuccessfulCalls > 420
    || authorization.maximumTokens > 6_000_000 || authorization.maximumInputTokens > 6_000_000
    || authorization.maximumOutputTokens > 6_000_000 || authorization.concurrencyCap > 4
    || authorization.maximumEstimatedUsd > 25 || authorization.currency !== "USD") {
    add(errors, "DeepSeek authorization exceeds frozen caps");
  }
  if (authorization.costBufferMultiplier !== 1.2
    || Math.abs(authorization.bufferedWorstCaseUsd - authorization.worstCaseCostPreviewUsd * 1.2) > 1e-9
    || authorization.bufferedWorstCaseUsd > authorization.maximumEstimatedUsd) {
    add(errors, "DeepSeek authorization cost buffer is invalid");
  }
  const issuedAt = Date.parse(authorization.issuedAt);
  const expiresAt = Date.parse(authorization.expiresAt);
  const evaluatedAt = Date.parse(trusted?.at);
  if (![issuedAt, expiresAt, evaluatedAt].every(Number.isFinite)
    || issuedAt >= expiresAt || evaluatedAt < issuedAt || evaluatedAt >= expiresAt) {
    add(errors, "DeepSeek authorization is expired or outside its window");
  }
  for (const field of TRUSTED_HASH_FIELDS) {
    if (trusted?.[field] !== authorization[field]) add(errors, `DeepSeek trusted ${field} mismatch`);
  }
  if (trusted?.priceSnapshotCurrent !== true || trusted?.directBillingConfirmed !== true
    || trusted?.dataRegionConfirmed !== true || trusted?.routeProbeObservedProvider !== PROVIDER
    || trusted?.routeProbeObservedModel !== MODEL || trusted?.routeProbeObservedEndpoint !== ENDPOINT) {
    add(errors, "DeepSeek route, billing, data-region, or current-price evidence is missing");
  }
  if (!Array.isArray(trusted?.authorizedItemHashes)
    || trusted.authorizedItemHashes.some((value) => !SHA256.test(value))
    || new Set(trusted.authorizedItemHashes).size !== trusted.authorizedItemHashes.length
    || jcsHash([...trusted.authorizedItemHashes].sort()) !== authorization.payloadSetHash
    || !trusted.authorizedItemHashes.includes(request?.itemHash)) {
    add(errors, "DeepSeek authorized item payload set is missing or mismatched");
  }
  return errors;
}

function validateRequest(request, authorization) {
  const errors = [];
  if (!plainObject(request) || !same(Object.keys(request).sort(), [...REQUEST_FIELDS].sort())) {
    return ["DeepSeek dispatch request fields are invalid or contain reference data"];
  }
  if (!SHA256.test(request.itemHash ?? "") || typeof request.itemIdPseudonym !== "string"
    || typeof request.clusterId !== "string" || !ROLE_SET.includes(request.role)
    || request.provider !== PROVIDER || request.model !== MODEL || request.endpoint !== ENDPOINT
    || request.projectResidency !== PROJECT_RESIDENCY || request.apiSurface !== API_SURFACE
    || request.referenceInputCount !== 0) {
    add(errors, "DeepSeek request identity, tuple, role, or reference-blindness mismatch");
  }
  if (request.logicalRequest?.role !== request.role || request.logicalRequest?.provider !== PROVIDER
    || request.logicalRequest?.model !== MODEL || request.logicalRequest?.endpoint !== ENDPOINT
    || request.logicalRequestHash !== jcsHash(request.logicalRequest)
    || request.wireRequestBodyHash !== jcsHash(request.wireRequest)
    || request.adapterTransformHash !== DEEPSEEK_EVALUATION_ADAPTER_V5_R2_CONSTANTS.adapterTransformHash) {
    add(errors, "DeepSeek logical/wire/adapter request binding mismatch");
  }
  const allowedInputFields = DESIGN_REGISTRATION.providerControls.deepSeekRoleContractCatalog.roles[request.role]?.inputFieldNames;
  if (!allowedInputFields || !same(Object.keys(request.logicalRequest?.userPayload ?? {}).sort(), [...allowedInputFields].sort())) {
    add(errors, "DeepSeek logical input differs from the frozen role allowlist");
  }
  if (authorization && (authorization.provider !== request.provider || authorization.model !== request.model
    || authorization.endpoint !== request.endpoint || !authorization.roleSet?.includes(request.role))) {
    add(errors, "DeepSeek request differs from authorization");
  }
  if (![request.reserveInputTokens, request.reserveOutputTokens, request.reserveTokens]
    .every((value) => Number.isSafeInteger(value) && value > 0)
    || request.reserveInputTokens + request.reserveOutputTokens !== request.reserveTokens
    || request.reserveOutputTokens !== 8192 || !(request.reserveUsd > 0)) {
    add(errors, "DeepSeek pessimistic request reserve is invalid");
  }
  return errors;
}

function validateBudget(budget, request, authorization) {
  const errors = [];
  if (!plainObject(budget) || !same(Object.keys(budget).sort(), [...BUDGET_FIELDS].sort())) return ["DeepSeek budget fields are invalid"];
  for (const field of BUDGET_FIELDS.filter((field) => !["estimatedUsdUsed", "pendingReservedUsd"].includes(field))) {
    if (!Number.isSafeInteger(budget[field]) || budget[field] < 0) add(errors, `DeepSeek budget ${field} is invalid`);
  }
  for (const field of ["estimatedUsdUsed", "pendingReservedUsd"]) {
    if (!Number.isFinite(budget[field]) || budget[field] < 0) add(errors, `DeepSeek budget ${field} is invalid`);
  }
  if (!authorization || !request) return errors;
  if (budget.attemptsUsed + 1 > authorization.maximumAttempts) add(errors, "DeepSeek attempt cap is exhausted");
  if (budget.roleAttemptsUsed + 1 > 2) add(errors, "DeepSeek per-role attempt cap is exhausted");
  if (budget.successfulCallsUsed + 1 > authorization.maximumSuccessfulCalls) add(errors, "DeepSeek successful-call cap is exhausted");
  if (budget.inputTokensUsed + budget.pendingReservedInputTokens + request.reserveInputTokens > authorization.maximumInputTokens
    || budget.outputTokensUsed + budget.pendingReservedOutputTokens + request.reserveOutputTokens > authorization.maximumOutputTokens
    || budget.totalTokensUsed + budget.pendingReservedTokens + request.reserveTokens > authorization.maximumTokens
    || budget.estimatedUsdUsed + budget.pendingReservedUsd + request.reserveUsd > authorization.maximumEstimatedUsd) {
    add(errors, "DeepSeek token or USD cap cannot cover the pessimistic reserve");
  }
  if (budget.concurrencyActive + 1 > authorization.concurrencyCap) add(errors, "DeepSeek concurrency cap is exhausted");
  return errors;
}

export function evaluateDeepSeekLiveDispatchPreflightV5R2(input = {}) {
  const errors = [];
  validateDesignAndReview(input).forEach((error) => add(errors, error));
  validateRequest(input.request, input.authorization).forEach((error) => add(errors, error));
  validateAuthorization(input.authorization, input.trustedAuthorization, input.request).forEach((error) => add(errors, error));
  validateBudget(input.budgetState, input.request, input.authorization).forEach((error) => add(errors, error));
  if (!plainObject(input.transport)
    || input.transport.kind !== LIVE_PROVIDER_HTTP_V5_R2_CONSTANTS.liveTransportKind
    || typeof input.transport.send !== "function") {
    add(errors, "DeepSeek live transport kind or send primitive is missing");
  }
  let permit = null;
  if (errors.length === 0) {
    const body = {
      schemaVersion: "ProviderDispatchPermitV1",
      transportKind: LIVE_PROVIDER_HTTP_V5_R2_CONSTANTS.liveTransportKind,
      provider: PROVIDER,
      productionEndpoint: ENDPOINT,
      expectedModel: MODEL,
      dispatchAllowed: true,
      credentialReadAllowed: true,
      providerCallAllowed: true,
      providerEventCount: 1,
      authorizationHash: input.authorization.authorizationHash,
    };
    permit = Object.freeze({ ...body, permitHash: jcsHash(body) });
  }
  return Object.freeze({
    schemaVersion: "DeepSeekLiveDispatchPreflightV5R2",
    designId: DESIGN_ID,
    registrationHash: DESIGN_REGISTRATION.registrationHash,
    executionMode: "LIVE_PROVIDER_ONLY_AFTER_REFERENCE_SEAL_ROUTE_BILLING_REGION_AND_EXACT_AUTHORIZATION",
    dispatchAllowed: errors.length === 0,
    providerEventCount: 0,
    httpRequestCount: 0,
    itemIdPseudonym: input.request?.itemIdPseudonym ?? null,
    itemHash: input.request?.itemHash ?? null,
    clusterId: input.request?.clusterId ?? null,
    permit,
    errors: Object.freeze(errors),
  });
}

export const DEEPSEEK_AUTHORIZATION_GUARD_V5_R2_CONSTANTS = Object.freeze({
  provider: PROVIDER,
  endpoint: ENDPOINT,
  model: MODEL,
  roles: ROLE_SET,
  egressAllowlist: EGRESS_ALLOWLIST,
  egressDenylist: EGRESS_DENYLIST,
  maximumAttempts: 850,
  maximumSuccessfulCalls: 420,
  maximumTokens: 6_000_000,
  maximumEstimatedUsd: 25,
  concurrencyCap: 4,
});
