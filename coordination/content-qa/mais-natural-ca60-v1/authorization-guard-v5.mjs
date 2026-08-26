import ACTIVE_DESIGN_POINTER from "../../research/mais-natural-ca60-v1/ACTIVE-DESIGN-REGISTRATION.json" with { type: "json" };
import ON_DISK_DESIGN_REGISTRATION from "../../research/mais-natural-ca60-v1/versions/design-v5/design-registration.json" with { type: "json" };
import V5_PACKAGE_MANIFEST from "../../research/mais-natural-ca60-v1/versions/design-v5/package-manifest.json" with { type: "json" };
import AUTHORIZATION_SCHEMA from "../../research/mais-natural-ca60-v1/versions/design-v5/schemas/ProviderAuthorizationV2.schema.json" with { type: "json" };
import {
  calculateRegistrationHash,
  canonicalJson,
  jcsHash,
} from "../../research/mais-natural-ca60-v1/versions/design-v5/design-contract.mjs";
import {
  OPENAI_REFERENCE_V5_CONSTANTS,
  validateOpenAIReferenceWireRequestV5,
  validateProviderLogicalRequestV2,
} from "./openai-reference-adapter-v5.mjs";

const {
  designId: DESIGN_ID,
  registrationHash: REGISTRATION_HASH,
  provider: PROVIDER,
  model: MODEL,
  endpoint: ENDPOINT,
  projectResidency: PROJECT_RESIDENCY,
  apiSurface: API_SURFACE,
  roles: ROLE_SET,
} = OPENAI_REFERENCE_V5_CONSTANTS;

const FIXTURE_TRANSPORT_KIND = "FIXTURE_ONLY_NO_NETWORK_V2";
const LIVE_TRANSPORT_KIND = "LIVE_PROVIDER_HTTP_AUTHORIZED_V1";
const SHA256 = /^[0-9a-f]{64}$/u;
const GIT_SHA1 = /^[0-9a-f]{40}$/u;
const REQUEST_FIELDS = Object.freeze([
  "itemIdPseudonym",
  "itemHash",
  "clusterId",
  "provider",
  "model",
  "endpoint",
  "projectResidency",
  "apiSurface",
  "role",
  "logicalRequest",
  "wireRequest",
  "reserveInputTokens",
  "reserveOutputTokens",
  "reserveTokens",
  "reserveUsd",
]);
const BUDGET_FIELDS = Object.freeze([
  "attemptsUsed",
  "successfulCallsUsed",
  "inputTokensUsed",
  "outputTokensUsed",
  "totalTokensUsed",
  "estimatedUsdUsed",
  "pendingReservedInputTokens",
  "pendingReservedOutputTokens",
  "pendingReservedTokens",
  "pendingReservedUsd",
  "concurrencyActive",
  "roleAttemptsUsed",
]);
const REVIEW_FIELDS = Object.freeze([
  "schemaVersion",
  "designId",
  "designRegistrationHash",
  "reviewedDesignPackageRootHash",
  "runnerCommit",
  "runnerHash",
  "adapterHash",
  "reviewerLane",
  "decision",
  "reviewedAt",
  "reviewHash",
]);
const OPENAI_EGRESS_ALLOWLIST = Object.freeze([
  "prompt",
  "options",
  "locale",
  "grade",
  "topic",
  "responseForm",
  "storedAnswer",
  "acceptedAnswers",
  "explanation",
  "itemSolveArtifact",
  "aSolveArtifact",
  "aLabelArtifact",
  "bSolveArtifact",
  "bLabelArtifact",
]);
const OPENAI_EGRESS_DENYLIST = Object.freeze([
  "OPENAI_REFERENCE_FINAL_REFERENCE_TO_DEEPSEEK",
  "DEEPSEEK_OUTPUT_TO_OPENAI_REFERENCE",
  "SOURCE_PATH",
  "GIT_METADATA",
  "CREDENTIAL",
  "STUDENT_OR_USER_DATA",
  "OTHER_ITEM",
  "UNAUTHORIZED_COPYRIGHT_CONTENT",
  "INTERNAL_RESEARCH_RECORD",
]);
const REQUIRED_NON_AUTHORIZATIONS = Object.freeze([
  "NO_DEPLOYMENT",
  "NO_LIVE_QUESTION_BANK_MUTATION",
  "NO_GIT_MUTATION",
  "NO_MODEL_FALLBACK",
  "NO_BUDGET_TRANSFER",
  "NO_PROMPT_TUNING",
  "NO_RESULT_DEPENDENT_REPLACEMENT",
]);
const TRUSTED_BINDINGS = Object.freeze([
  "authorizationHash",
  "ownerGrantHash",
  "authorizationEvidenceHash",
  "priceSnapshotHash",
  "projectRoutePreflightReceiptHash",
  "providerRouteDecisionHash",
  "frameRegistrationHash",
  "samplingFrameHash",
  "sampleManifestHash",
  "runtimeConfigHash",
  "promptSetHash",
  "schemaSetHash",
  "runnerCommit",
  "runnerHash",
  "adapterHash",
  "privacyScreenHash",
  "rightsScreenHash",
]);

function plainObject(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function exactFields(value, expected) {
  return plainObject(value)
    && canonicalJson(Object.keys(value).sort()) === canonicalJson([...expected].sort());
}

function validTimestamp(value) {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

function add(errors, message) {
  if (typeof message === "string" && message.length > 0 && !errors.includes(message)) errors.push(message);
}

function hashWithout(value, field) {
  const copy = deepClone(value);
  delete copy[field];
  return jcsHash(copy);
}

function sameSet(left, right) {
  return Array.isArray(left) && Array.isArray(right)
    && canonicalJson([...left].sort()) === canonicalJson([...right].sort());
}

function validateDesignRegistration(registration) {
  const errors = [];
  if (!plainObject(registration)) return ["V5 design registration is missing"];
  if (registration.designId !== DESIGN_ID || registration.registrationHash !== REGISTRATION_HASH) {
    add(errors, "V5 design registration identity mismatch");
  }
  if (registration.lifecycleStatus !== "SEALED_CANDIDATE_PENDING_INDEPENDENT_REVIEW"
    || registration.freezeAllowed !== true) {
    add(errors, "V5 sealed design candidate contract mismatch");
  }
  if (registration.providerEventCount !== 0 || registration.preExecutionState?.providerEventCount !== 0) {
    add(errors, "V5 design candidate does not preserve zero provider events");
  }
  if (registration.scope?.decisionCeiling !== "INCONCLUSIVE_MACHINE_REFERENCE") {
    add(errors, "V5 decision ceiling drift");
  }
  try {
    if (calculateRegistrationHash(registration) !== registration.registrationHash) add(errors, "V5 design registration self hash mismatch");
  } catch (error) {
    add(errors, `V5 design registration hash validation failed: ${error instanceof Error ? error.message : "unknown"}`);
  }
  return errors;
}

function validateActivePointer(pointer, registration) {
  const errors = [];
  if (!plainObject(pointer)) return ["active V5 design pointer is missing"];
  if (pointer.activeDesignId !== DESIGN_ID
    || pointer.activeDesignPath !== "versions/design-v5/design-registration.json"
    || pointer.activeRegistrationHash !== registration?.registrationHash) {
    add(errors, "active V5 design pointer does not bind the exact registration");
  }
  if (!validTimestamp(pointer.pointerUpdatedAt)
    || !validTimestamp(registration?.frozenAt)
    || Date.parse(pointer.pointerUpdatedAt) <= Date.parse(registration.frozenAt)) {
    add(errors, "active V5 pointer chronology is invalid");
  }
  return errors;
}

function validateIndependentReview(review, registration, pointer) {
  const errors = [];
  if (!exactFields(review, REVIEW_FIELDS)) return ["A11 independent design review receipt fields are invalid"];
  if (review.schemaVersion !== "IndependentDesignReviewReceiptV1" || review.designId !== DESIGN_ID
    || review.designRegistrationHash !== registration?.registrationHash || review.reviewerLane !== "A11") {
    add(errors, "A11 independent design review identity mismatch");
  }
  if (review.decision !== "CONCURRED") add(errors, "A11 independent design review is not CONCURRED");
  if (review.reviewedDesignPackageRootHash !== V5_PACKAGE_MANIFEST.packageRootHash) {
    add(errors, "A11 reviewed design package root does not bind the exact V5 package");
  }
  if (!GIT_SHA1.test(review.runnerCommit ?? "") || !SHA256.test(review.runnerHash ?? "") || !SHA256.test(review.adapterHash ?? "")) {
    add(errors, "A11 reviewed runner or adapter roots are invalid");
  }
  if (!validTimestamp(review.reviewedAt)
    || !validTimestamp(registration?.frozenAt)
    || Date.parse(review.reviewedAt) <= Date.parse(registration.frozenAt)
    || (validTimestamp(pointer?.pointerUpdatedAt) && Date.parse(review.reviewedAt) >= Date.parse(pointer.pointerUpdatedAt))) {
    add(errors, "A11 review chronology is invalid");
  }
  if (!SHA256.test(review.reviewHash ?? "") || hashWithout(review, "reviewHash") !== review.reviewHash) {
    add(errors, "A11 independent design review self hash mismatch");
  }
  return errors;
}

function validateAuthorizationShape(authorization) {
  const errors = [];
  if (!plainObject(authorization)) return ["OpenAI ProviderAuthorizationV2 is missing"];
  const expectedFields = Object.keys(AUTHORIZATION_SCHEMA.properties);
  if (!exactFields(authorization, expectedFields)) add(errors, "ProviderAuthorizationV2 fields are invalid");
  for (const field of [
    "registrationHash", "promptSetHash", "schemaSetHash", "runnerHash", "adapterHash",
    "providerRouteDecisionHash", "priceSnapshotHash", "ownerGrantHash", "authorizationEvidenceHash",
    "authorizationHash", "privacyScreenHash", "rightsScreenHash",
  ]) {
    if (!SHA256.test(authorization[field] ?? "")) add(errors, `ProviderAuthorizationV2 ${field} is invalid`);
  }
  for (const field of ["frameRegistrationHash", "samplingFrameHash", "sampleManifestHash", "runtimeConfigHash", "projectRoutePreflightReceiptHash"]) {
    if (!SHA256.test(authorization[field] ?? "")) add(errors, `ProviderAuthorizationV2 ${field} is required for reference labeling`);
  }
  if (!GIT_SHA1.test(authorization.runnerCommit ?? "")) add(errors, "ProviderAuthorizationV2 runnerCommit is not a Git SHA-1 object ID");
  if (authorization.schemaVersion !== "ProviderAuthorizationV2"
    || authorization.authorizationKind !== "OPENAI_REFERENCE_LABELING"
    || authorization.designId !== DESIGN_ID
    || authorization.registrationHash !== REGISTRATION_HASH) {
    add(errors, "ProviderAuthorizationV2 design or authorization kind mismatch");
  }
  if (typeof authorization.authorizationId !== "string" || authorization.authorizationId.length === 0
    || typeof authorization.authorizedBy !== "string" || authorization.authorizedBy.length === 0) {
    add(errors, "ProviderAuthorizationV2 authorization identity or authorizer is missing");
  }
  if (authorization.provider !== PROVIDER || authorization.model !== MODEL || authorization.endpoint !== ENDPOINT
    || authorization.projectResidency !== PROJECT_RESIDENCY || authorization.dataRegion !== "US"
    || authorization.apiSurface !== API_SURFACE || authorization.allowedOrigin !== "https://us.api.openai.com") {
    add(errors, "ProviderAuthorizationV2 provider/model/endpoint/residency tuple mismatch");
  }
  if (!sameSet(authorization.roleSet, ROLE_SET)) add(errors, "ProviderAuthorizationV2 role set mismatch");
  if (!sameSet(authorization.egressAllowlist, OPENAI_EGRESS_ALLOWLIST)) add(errors, "ProviderAuthorizationV2 egress allowlist mismatch");
  if (!sameSet(authorization.egressDenylist, OPENAI_EGRESS_DENYLIST)) add(errors, "ProviderAuthorizationV2 egress denylist mismatch");
  if (!Array.isArray(authorization.nonAuthorizations)
    || REQUIRED_NON_AUTHORIZATIONS.some((entry) => !authorization.nonAuthorizations.includes(entry))) {
    add(errors, "ProviderAuthorizationV2 required non-authorizations are missing");
  }
  const envelope = ON_DISK_DESIGN_REGISTRATION.providerControls.openaiReferenceEnvelope;
  if (authorization.promptSetHash !== ON_DISK_DESIGN_REGISTRATION.providerControls.openaiReferenceRoleContractCatalog.roleContractRootHash
    || authorization.schemaSetHash !== ON_DISK_DESIGN_REGISTRATION.interfaces.schemaSetHash
    || authorization.logicalRequestTemplateHash !== envelope.logicalRequestTemplateHash
    || authorization.wireRequestTemplateHash !== envelope.wireRequestTemplateHash) {
    add(errors, "ProviderAuthorizationV2 prompt/schema/request-template roots mismatch");
  }
  if (!validTimestamp(authorization.issuedAt) || !validTimestamp(authorization.expiresAt)
    || Date.parse(authorization.issuedAt) >= Date.parse(authorization.expiresAt)) {
    add(errors, "ProviderAuthorizationV2 authorization window is invalid");
  }
  for (const field of ["maximumAttempts", "maximumSuccessfulCalls", "maximumTokens", "concurrencyCap"]) {
    if (!Number.isSafeInteger(authorization[field]) || authorization[field] < 1) add(errors, `ProviderAuthorizationV2 ${field} is invalid`);
  }
  for (const field of ["maximumInputTokens", "maximumOutputTokens"]) {
    if (!Number.isSafeInteger(authorization[field]) || authorization[field] < 0) add(errors, `ProviderAuthorizationV2 ${field} is invalid`);
  }
  if (authorization.maximumAttempts > 610 || authorization.maximumSuccessfulCalls > 300
    || authorization.maximumTokens > 4_000_000 || authorization.maximumInputTokens > 4_000_000
    || authorization.maximumOutputTokens > 4_000_000 || authorization.concurrencyCap > 4) {
    add(errors, "ProviderAuthorizationV2 exceeds the frozen OpenAI call/token/concurrency caps");
  }
  if (!Number.isFinite(authorization.maximumEstimatedUsd) || authorization.maximumEstimatedUsd <= 0
    || authorization.maximumEstimatedUsd > 25 || authorization.currency !== "USD") {
    add(errors, "ProviderAuthorizationV2 exceeds or invalidates the frozen USD cap");
  }
  if (!Number.isFinite(authorization.worstCaseCostPreviewUsd) || authorization.worstCaseCostPreviewUsd < 0
    || authorization.costBufferMultiplier !== 1.2 || !Number.isFinite(authorization.bufferedWorstCaseUsd)
    || Math.abs(authorization.bufferedWorstCaseUsd - authorization.worstCaseCostPreviewUsd * 1.2) > 1e-9
    || authorization.bufferedWorstCaseUsd > authorization.maximumEstimatedUsd) {
    add(errors, "ProviderAuthorizationV2 worst-case price buffer is invalid");
  }
  if (authorization.isCurrentAuthorization !== true) add(errors, "ProviderAuthorizationV2 is not current");
  if (authorization.previousAuthorizationHash !== null && !SHA256.test(authorization.previousAuthorizationHash ?? "")) {
    add(errors, "ProviderAuthorizationV2 previous authorization hash is invalid");
  }
  if (authorization.referenceSealHash !== null || authorization.referenceAttemptChainHash !== null
    || authorization.routeProbeAuthorizationHash !== null || authorization.routeProbeReceiptHash !== null) {
    add(errors, "OpenAI reference authorization chronology fields must be null before labeling");
  }
  if (!SHA256.test(authorization.authorizationHash ?? "") || hashWithout(authorization, "authorizationHash") !== authorization.authorizationHash) {
    add(errors, "ProviderAuthorizationV2 self hash mismatch");
  }
  return errors;
}

export function validateOpenAIProviderAuthorizationV2(authorization, {
  trustedAuthorization,
  request,
  independentReviewReceipt,
  activeDesignPointer,
} = {}) {
  const errors = validateAuthorizationShape(authorization);
  if (!plainObject(authorization)) return [...new Set(errors)];
  if (!plainObject(trustedAuthorization)) return [...new Set([...errors, "trusted out-of-band authorization roots are missing"])];
  if (!validTimestamp(trustedAuthorization.at)) add(errors, "trusted authorization evaluation time is invalid");
  else if (validTimestamp(authorization.issuedAt) && validTimestamp(authorization.expiresAt)
    && (Date.parse(trustedAuthorization.at) < Date.parse(authorization.issuedAt)
      || Date.parse(trustedAuthorization.at) >= Date.parse(authorization.expiresAt))) {
    add(errors, "ProviderAuthorizationV2 is expired or outside its authorization window");
  }
  if (validTimestamp(authorization.issuedAt) && validTimestamp(independentReviewReceipt?.reviewedAt)
    && Date.parse(authorization.issuedAt) <= Date.parse(independentReviewReceipt.reviewedAt)) {
    add(errors, "ProviderAuthorizationV2 was issued before A11 concurrence");
  }
  if (validTimestamp(authorization.issuedAt) && validTimestamp(activeDesignPointer?.pointerUpdatedAt)
    && Date.parse(authorization.issuedAt) <= Date.parse(activeDesignPointer.pointerUpdatedAt)) {
    add(errors, "ProviderAuthorizationV2 was issued before V5 activation");
  }
  for (const field of TRUSTED_BINDINGS) {
    if (trustedAuthorization[field] !== authorization[field]) add(errors, `trusted authorization ${field} mismatch`);
  }
  for (const field of ["runnerCommit", "runnerHash", "adapterHash"]) {
    if (independentReviewReceipt?.[field] !== authorization[field]) add(errors, `A11 review ${field} differs from ProviderAuthorizationV2`);
  }
  if (trustedAuthorization.priceSnapshotCurrent !== true) add(errors, "trusted current price snapshot evidence is missing");
  if (!Array.isArray(trustedAuthorization.authorizedItemHashes)
    || trustedAuthorization.authorizedItemHashes.some((value) => !SHA256.test(value))
    || new Set(trustedAuthorization.authorizedItemHashes).size !== trustedAuthorization.authorizedItemHashes.length) {
    add(errors, "trusted authorized sample item payload set is invalid");
  } else {
    const normalized = [...trustedAuthorization.authorizedItemHashes].sort();
    if (jcsHash(normalized) !== authorization.payloadSetHash) add(errors, "authorization payload set hash mismatch");
    if (request?.itemHash && !trustedAuthorization.authorizedItemHashes.includes(request.itemHash)) {
      add(errors, "dispatch item is outside the authorized frozen sample payload set");
    }
  }
  return [...new Set(errors)];
}

function validateRequest(request, authorization) {
  const errors = [];
  if (!exactFields(request, REQUEST_FIELDS)) return ["OpenAI dispatch request fields are invalid"];
  if (typeof request.itemIdPseudonym !== "string" || request.itemIdPseudonym.length === 0
    || !SHA256.test(request.itemHash ?? "") || typeof request.clusterId !== "string" || request.clusterId.length === 0) {
    add(errors, "OpenAI dispatch request item/sample identity is invalid");
  }
  if (request.provider !== PROVIDER || request.model !== MODEL || request.endpoint !== ENDPOINT
    || request.projectResidency !== PROJECT_RESIDENCY || request.apiSurface !== API_SURFACE) {
    add(errors, "OpenAI dispatch request tuple mismatch");
  }
  if (!ROLE_SET.includes(request.role) || request.logicalRequest?.role !== request.role) add(errors, "OpenAI dispatch request role mismatch");
  if (plainObject(authorization)
    && (request.provider !== authorization.provider || request.model !== authorization.model
      || request.endpoint !== authorization.endpoint || request.projectResidency !== authorization.projectResidency
      || request.apiSurface !== authorization.apiSurface || !authorization.roleSet?.includes(request.role))) {
    add(errors, "OpenAI dispatch request differs from the authorization tuple");
  }
  validateProviderLogicalRequestV2(request.logicalRequest).forEach((error) => add(errors, `logical request: ${error}`));
  validateOpenAIReferenceWireRequestV5(request.wireRequest, request.logicalRequest)
    .forEach((error) => add(errors, `wire request: ${error}`));
  const priorArtifactContracts = {
    A_LABEL: [["itemSolveArtifact", "A_SOLVE"]],
    B_LABEL: [["itemSolveArtifact", "B_SOLVE"]],
    ADJUDICATOR: [
      ["aSolveArtifact", "A_SOLVE"],
      ["aLabelArtifact", "A_LABEL"],
      ["bSolveArtifact", "B_SOLVE"],
      ["bLabelArtifact", "B_LABEL"],
    ],
  };
  for (const [field, expectedRole] of priorArtifactContracts[request.role] ?? []) {
    const artifact = request.logicalRequest?.inputPayload?.[field];
    if (!plainObject(artifact)
      || artifact.schemaVersion !== "OpenAIReferenceRoleOutputV1"
      || artifact.itemHash !== request.itemHash
      || artifact.role !== expectedRole
      || !SHA256.test(artifact.selfHash ?? "")) {
      add(errors, `OpenAI ${request.role} prior artifact ${field} has an item or role binding mismatch`);
    }
  }
  for (const field of ["reserveInputTokens", "reserveOutputTokens", "reserveTokens"]) {
    if (!Number.isSafeInteger(request[field]) || request[field] <= 0) add(errors, `OpenAI request ${field} must be a positive integer`);
  }
  if (request.reserveInputTokens + request.reserveOutputTokens !== request.reserveTokens) {
    add(errors, "OpenAI request total token reserve differs from input plus output reserves");
  }
  if (request.reserveOutputTokens !== 8192) add(errors, "OpenAI request output reserve must equal the frozen max_output_tokens");
  if (!Number.isFinite(request.reserveUsd) || request.reserveUsd <= 0) add(errors, "OpenAI request USD reserve must be positive and finite");
  return errors;
}

function validateBudgetState(budget, request, authorization) {
  const errors = [];
  if (!exactFields(budget, BUDGET_FIELDS)) return ["OpenAI budget state fields are invalid"];
  for (const field of [
    "attemptsUsed", "successfulCallsUsed", "inputTokensUsed", "outputTokensUsed", "totalTokensUsed",
    "pendingReservedInputTokens", "pendingReservedOutputTokens", "pendingReservedTokens", "concurrencyActive", "roleAttemptsUsed",
  ]) {
    if (!Number.isSafeInteger(budget[field]) || budget[field] < 0) add(errors, `OpenAI budget ${field} is invalid`);
  }
  for (const field of ["estimatedUsdUsed", "pendingReservedUsd"]) {
    if (!Number.isFinite(budget[field]) || budget[field] < 0) add(errors, `OpenAI budget ${field} is invalid`);
  }
  if (errors.length > 0 || !plainObject(authorization) || !plainObject(request)) return errors;
  if (budget.attemptsUsed + 1 > authorization.maximumAttempts) add(errors, "OpenAI attempt cap is exhausted");
  if (budget.roleAttemptsUsed + 1 > 2) add(errors, "OpenAI per-role attempt cap is exhausted");
  if (budget.successfulCallsUsed + 1 > authorization.maximumSuccessfulCalls) add(errors, "OpenAI successful-call cap is exhausted");
  if (budget.inputTokensUsed + budget.pendingReservedInputTokens + request.reserveInputTokens > authorization.maximumInputTokens) {
    add(errors, "OpenAI input token cap cannot cover the pessimistic reserve");
  }
  if (budget.outputTokensUsed + budget.pendingReservedOutputTokens + request.reserveOutputTokens > authorization.maximumOutputTokens) {
    add(errors, "OpenAI output token cap cannot cover the pessimistic reserve");
  }
  if (budget.totalTokensUsed + budget.pendingReservedTokens + request.reserveTokens > authorization.maximumTokens) {
    add(errors, "OpenAI total token cap cannot cover the pessimistic reserve");
  }
  if (budget.estimatedUsdUsed + budget.pendingReservedUsd + request.reserveUsd > authorization.maximumEstimatedUsd) {
    add(errors, "OpenAI USD cost cap cannot cover the pessimistic reserve");
  }
  if (budget.concurrencyActive + 1 > authorization.concurrencyCap) add(errors, "OpenAI concurrency cap is exhausted");
  return errors;
}

export function evaluateOpenAIFixtureDispatchPreflightV5({
  designRegistration,
  activeDesignPointer,
  independentReviewReceipt,
  authorization,
  trustedAuthorization,
  request,
  budgetState,
  transport,
}) {
  const errors = [];
  validateDesignRegistration(designRegistration).forEach((error) => add(errors, error));
  validateActivePointer(activeDesignPointer, designRegistration).forEach((error) => add(errors, error));
  validateIndependentReview(independentReviewReceipt, designRegistration, activeDesignPointer).forEach((error) => add(errors, error));
  validateRequest(request, authorization).forEach((error) => add(errors, error));
  validateOpenAIProviderAuthorizationV2(authorization, {
    trustedAuthorization,
    request,
    independentReviewReceipt,
    activeDesignPointer,
  }).forEach((error) => add(errors, error));
  validateBudgetState(budgetState, request, authorization).forEach((error) => add(errors, error));
  if (!plainObject(transport) || transport.kind !== FIXTURE_TRANSPORT_KIND || typeof transport.send !== "function") {
    add(errors, "A21 permits only the fixture-only no-network transport; live provider transport remains A07-owned");
  }
  return Object.freeze({
    schemaVersion: "OpenAIFixtureDispatchPreflightV5",
    designId: DESIGN_ID,
    registrationHash: REGISTRATION_HASH,
    executionMode: "OFFLINE_FIXTURE_ONLY_NO_PROVIDER_EVENT",
    dispatchAllowed: errors.length === 0,
    providerEventCount: 0,
    itemIdPseudonym: request?.itemIdPseudonym ?? null,
    itemHash: request?.itemHash ?? null,
    clusterId: request?.clusterId ?? null,
    httpRequestCount: 0,
    fixtureDispatchCount: 0,
    errors: Object.freeze([...errors]),
  });
}

export function evaluateOpenAILiveDispatchPreflightV5R2({
  designRegistration,
  activeDesignPointer,
  independentReviewReceipt,
  authorization,
  trustedAuthorization,
  request,
  budgetState,
  transport,
}) {
  const errors = [];
  validateDesignRegistration(designRegistration).forEach((error) => add(errors, error));
  validateActivePointer(activeDesignPointer, designRegistration).forEach((error) => add(errors, error));
  validateIndependentReview(independentReviewReceipt, designRegistration, activeDesignPointer).forEach((error) => add(errors, error));
  validateRequest(request, authorization).forEach((error) => add(errors, error));
  validateOpenAIProviderAuthorizationV2(authorization, {
    trustedAuthorization,
    request,
    independentReviewReceipt,
    activeDesignPointer,
  }).forEach((error) => add(errors, error));
  validateBudgetState(budgetState, request, authorization).forEach((error) => add(errors, error));
  if (!plainObject(transport) || transport.kind !== LIVE_TRANSPORT_KIND || typeof transport.send !== "function") {
    add(errors, "A07 live OpenAI transport kind or send primitive is missing");
  }
  let permit = null;
  if (errors.length === 0) {
    const body = {
      schemaVersion: "ProviderDispatchPermitV1",
      transportKind: LIVE_TRANSPORT_KIND,
      provider: PROVIDER,
      productionEndpoint: ENDPOINT,
      expectedModel: MODEL,
      dispatchAllowed: true,
      credentialReadAllowed: true,
      providerCallAllowed: true,
      providerEventCount: 1,
      authorizationHash: authorization.authorizationHash,
    };
    permit = Object.freeze({ ...body, permitHash: jcsHash(body) });
  }
  return Object.freeze({
    schemaVersion: "OpenAILiveDispatchPreflightV5R2",
    designId: DESIGN_ID,
    registrationHash: REGISTRATION_HASH,
    executionMode: "LIVE_PROVIDER_ONLY_AFTER_EXACT_AUTHORIZATION",
    dispatchAllowed: errors.length === 0,
    providerEventCount: 0,
    itemIdPseudonym: request?.itemIdPseudonym ?? null,
    itemHash: request?.itemHash ?? null,
    clusterId: request?.clusterId ?? null,
    httpRequestCount: 0,
    permit,
    errors: Object.freeze([...errors]),
  });
}

/**
 * Test seam only. The explicit context can exercise a hypothetical post-review
 * branch, but the only accepted transport declares that it has no network
 * primitive and the result always reports zero provider events and HTTP calls.
 */
export async function dispatchOpenAIFixtureAgainstExplicitContextForTestV5(input) {
  const preflight = evaluateOpenAIFixtureDispatchPreflightV5(input);
  if (!preflight.dispatchAllowed) return preflight;
  const response = await input.transport.send(Object.freeze({
    fixtureOnly: true,
    providerEventCount: 0,
    provider: PROVIDER,
    model: MODEL,
    endpoint: ENDPOINT,
    projectResidency: PROJECT_RESIDENCY,
    itemIdPseudonym: input.request.itemIdPseudonym,
    itemHash: input.request.itemHash,
    clusterId: input.request.clusterId,
    role: input.request.role,
    wireRequest: deepClone(input.request.wireRequest),
  }));
  return Object.freeze({
    ...preflight,
    fixtureDispatchCount: 1,
    transportKind: FIXTURE_TRANSPORT_KIND,
    response,
  });
}

/**
 * Production package entrypoint. It hard-pins both immutable on-disk trust
 * roots. The current pointer remains V3, so this path cannot dispatch even a
 * fixture. This module intentionally contains no fetch, SDK, socket, key, or
 * environment-variable access.
 */
export async function dispatchAuthorizedOpenAIFixtureTransportV5(input = {}) {
  return dispatchOpenAIFixtureAgainstExplicitContextForTestV5({
    ...input,
    designRegistration: ON_DISK_DESIGN_REGISTRATION,
    activeDesignPointer: ACTIVE_DESIGN_POINTER,
  });
}

export const OPENAI_AUTHORIZATION_GUARD_V5_CONSTANTS = Object.freeze({
  fixtureTransportKind: FIXTURE_TRANSPORT_KIND,
  liveTransportKind: LIVE_TRANSPORT_KIND,
  egressAllowlist: OPENAI_EGRESS_ALLOWLIST,
  egressDenylist: OPENAI_EGRESS_DENYLIST,
  requiredNonAuthorizations: REQUIRED_NON_AUTHORIZATIONS,
});
