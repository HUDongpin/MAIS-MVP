import assert from "node:assert/strict";
import test from "node:test";

import DESIGN_REGISTRATION from "../../research/mais-natural-ca60-v1/versions/design-v5/design-registration.json" with { type: "json" };
import PACKAGE_MANIFEST from "../../research/mais-natural-ca60-v1/versions/design-v5/package-manifest.json" with { type: "json" };
import { jcsHash } from "../../research/mais-natural-ca60-v1/versions/design-v5/design-contract.mjs";
import { buildDeepSeekEvaluationRequestV5R2 } from "./deepseek-evaluation-adapter-v5-r2.mjs";

async function subject() {
  return import("./deepseek-authorization-guard-v5-r2.mjs").catch(() => ({}));
}

const hash = (character) => character.repeat(64);

function providerInput() {
  return {
    prompt: "What is 2 + 3?",
    options: ["4", "5", "6"],
    storedAnswer: "5",
    acceptedAnswers: ["5"],
    explanation: "Add two and three.",
    rubric: "Exact numeric answer.",
    difficulty: "Low",
    itemPseudonym: "ca60-00000000000000000000000000000001",
  };
}

function requestFixture(overrides = {}) {
  const adapter = buildDeepSeekEvaluationRequestV5R2({ role: "B_PRIME_CRITIQUE", providerInput: providerInput() });
  return {
    itemIdPseudonym: providerInput().itemPseudonym,
    itemHash: hash("f"),
    clusterId: "cluster-001",
    provider: "DEEPSEEK_DIRECT",
    model: "deepseek-v4-pro",
    endpoint: "https://api.deepseek.com/chat/completions",
    projectResidency: "UNKNOWN_PENDING_ROUTE_PROBE_EVIDENCE",
    apiSurface: "CHAT_COMPLETIONS_OPENAI_COMPATIBLE",
    role: "B_PRIME_CRITIQUE",
    logicalRequest: adapter.logicalRequest,
    logicalRequestHash: adapter.logicalRequestHash,
    wireRequest: adapter.wireRequestBody,
    wireRequestBodyHash: adapter.wireRequestBodyHash,
    adapterTransformHash: adapter.adapterTransformHash,
    referenceInputCount: 0,
    reserveInputTokens: 8_000,
    reserveOutputTokens: 8_192,
    reserveTokens: 16_192,
    reserveUsd: 0.25,
    ...overrides,
  };
}

const EGRESS_ALLOWLIST = [
  "prompt", "options", "storedAnswer", "acceptedAnswers", "explanation",
  "rubric", "difficulty", "itemPseudonym", "bPrimeCritiqueArtifact",
];
const EGRESS_DENYLIST = [
  "OPENAI_REFERENCE_FINAL_REFERENCE_TO_DEEPSEEK", "DEEPSEEK_OUTPUT_TO_OPENAI_REFERENCE",
  "SOURCE_PATH", "GIT_METADATA", "CREDENTIAL", "STUDENT_OR_USER_DATA", "OTHER_ITEM",
  "UNAUTHORIZED_COPYRIGHT_CONTENT", "INTERNAL_RESEARCH_RECORD",
];

function authorizationFixture(request, overrides = {}) {
  const body = {
    schemaVersion: "ProviderAuthorizationV2",
    authorizationId: "auth-deepseek-fixture-r2-001",
    authorizationKind: "DEEPSEEK_EVALUATION",
    designId: "MAIS-NATURAL-CA60-V5",
    registrationHash: DESIGN_REGISTRATION.registrationHash,
    frameRegistrationHash: hash("1"),
    samplingFrameHash: hash("2"),
    sampleManifestHash: hash("3"),
    runtimeConfigHash: hash("4"),
    promptSetHash: DESIGN_REGISTRATION.providerControls.deepSeekRoleContractCatalog.inheritedRoleContractRootHash,
    schemaSetHash: DESIGN_REGISTRATION.interfaces.schemaSetHash,
    runnerCommit: "5".repeat(40),
    runnerHash: hash("6"),
    adapterHash: request.adapterTransformHash,
    providerRouteDecisionHash: hash("7"),
    projectRoutePreflightReceiptHash: hash("8"),
    provider: "DEEPSEEK_DIRECT",
    projectResidency: "UNKNOWN_PENDING_ROUTE_PROBE_EVIDENCE",
    dataRegion: "CONFIRMED_BY_BOUND_ROUTE_EVIDENCE",
    apiSurface: "CHAT_COMPLETIONS_OPENAI_COMPATIBLE",
    endpoint: "https://api.deepseek.com/chat/completions",
    model: "deepseek-v4-pro",
    roleSet: ["B_PRIME_CRITIQUE", "B_PRIME_REVISION", "C0_PRIME_ROLE_1", "C0_PRIME_ROLE_2", "C0_PRIME_ROLE_3", "C0_PRIME_ROLE_4", "C0_PRIME_ROLE_5"],
    logicalRequestTemplateHash: DESIGN_REGISTRATION.providerControls.deepSeekRoleContractCatalog.inheritedRequestTemplateHash,
    wireRequestTemplateHash: DESIGN_REGISTRATION.providerControls.deepSeekRoleContractCatalog.inheritedRequestTemplateHash,
    payloadSetHash: jcsHash([request.itemHash]),
    allowedOrigin: "https://api.deepseek.com",
    egressAllowlist: EGRESS_ALLOWLIST,
    egressDenylist: EGRESS_DENYLIST,
    privacyScreenHash: hash("9"),
    rightsScreenHash: hash("a"),
    issuedAt: "2026-08-26T04:00:00.000Z",
    expiresAt: "2026-08-26T05:00:00.000Z",
    maximumAttempts: 850,
    maximumSuccessfulCalls: 420,
    maximumInputTokens: 3_000_000,
    maximumOutputTokens: 3_000_000,
    maximumTokens: 6_000_000,
    maximumEstimatedUsd: 25,
    currency: "USD",
    concurrencyCap: 4,
    worstCaseCostPreviewUsd: 20,
    costBufferMultiplier: 1.2,
    bufferedWorstCaseUsd: 24,
    priceSnapshotHash: hash("b"),
    authorizedBy: "owner-pseudonym",
    ownerGrantHash: hash("c"),
    authorizationEvidenceHash: hash("d"),
    nonAuthorizations: [
      "NO_DEPLOYMENT", "NO_LIVE_QUESTION_BANK_MUTATION", "NO_GIT_MUTATION",
      "NO_MODEL_FALLBACK", "NO_BUDGET_TRANSFER", "NO_PROMPT_TUNING",
      "NO_RESULT_DEPENDENT_REPLACEMENT",
    ],
    previousAuthorizationHash: null,
    isCurrentAuthorization: true,
    referenceSealHash: hash("e"),
    referenceAttemptChainHash: hash("0"),
    routeProbeAuthorizationHash: hash("1"),
    routeProbeReceiptHash: hash("2"),
    ...overrides,
  };
  return { ...body, authorizationHash: jcsHash(body) };
}

function reviewFixture(request) {
  const body = {
    schemaVersion: "IndependentDesignReviewReceiptV1",
    designId: "MAIS-NATURAL-CA60-V5",
    designRegistrationHash: DESIGN_REGISTRATION.registrationHash,
    reviewedDesignPackageRootHash: PACKAGE_MANIFEST.packageRootHash,
    runnerCommit: "5".repeat(40),
    runnerHash: hash("6"),
    adapterHash: request.adapterTransformHash,
    reviewerLane: "A11",
    decision: "CONCURRED",
    reviewedAt: "2026-08-26T03:00:00.000Z",
  };
  return { ...body, reviewHash: jcsHash(body) };
}

function context(overrides = {}) {
  const request = requestFixture();
  const authorization = authorizationFixture(request);
  const review = reviewFixture(request);
  return {
    designRegistration: DESIGN_REGISTRATION,
    activeDesignPointer: {
      activeDesignId: "MAIS-NATURAL-CA60-V5",
      activeDesignPath: "versions/design-v5/design-registration.json",
      activeRegistrationHash: DESIGN_REGISTRATION.registrationHash,
      pointerUpdatedAt: "2026-08-26T03:30:00.000Z",
    },
    independentReviewReceipt: review,
    authorization,
    trustedAuthorization: {
      at: "2026-08-26T04:30:00.000Z",
      ...Object.fromEntries([
        "authorizationHash", "ownerGrantHash", "authorizationEvidenceHash", "priceSnapshotHash",
        "projectRoutePreflightReceiptHash", "providerRouteDecisionHash", "frameRegistrationHash",
        "samplingFrameHash", "sampleManifestHash", "runtimeConfigHash", "promptSetHash", "schemaSetHash",
        "runnerCommit", "runnerHash", "adapterHash", "privacyScreenHash", "rightsScreenHash",
        "referenceSealHash", "referenceAttemptChainHash", "routeProbeAuthorizationHash", "routeProbeReceiptHash",
      ].map((field) => [field, authorization[field]])),
      priceSnapshotCurrent: true,
      directBillingConfirmed: true,
      dataRegionConfirmed: true,
      routeProbeObservedProvider: "DEEPSEEK_DIRECT",
      routeProbeObservedModel: "deepseek-v4-pro",
      routeProbeObservedEndpoint: "https://api.deepseek.com/chat/completions",
      authorizedItemHashes: [request.itemHash],
    },
    request,
    budgetState: {
      attemptsUsed: 0, successfulCallsUsed: 0, inputTokensUsed: 0, outputTokensUsed: 0,
      totalTokensUsed: 0, estimatedUsdUsed: 0, pendingReservedInputTokens: 0,
      pendingReservedOutputTokens: 0, pendingReservedTokens: 0, pendingReservedUsd: 0,
      concurrencyActive: 0, roleAttemptsUsed: 0,
    },
    transport: { kind: "LIVE_PROVIDER_HTTP_AUTHORIZED_V1", async send() { throw new Error("guard must not send"); } },
    ...overrides,
  };
}

test("DeepSeek live guard blocks absent authority before a credential or HTTP primitive", async () => {
  const api = await subject();
  assert.equal(typeof api.evaluateDeepSeekLiveDispatchPreflightV5R2, "function");
  const input = context();
  input.authorization = null;
  input.trustedAuthorization = null;
  const result = api.evaluateDeepSeekLiveDispatchPreflightV5R2(input);
  assert.equal(result.dispatchAllowed, false);
  assert.equal(result.providerEventCount, 0);
  assert.equal(result.httpRequestCount, 0);
  assert.equal(result.permit, null);
});

test("DeepSeek live guard issues one self-hashed permit only after exact seal, route, review, payload, and cap bindings", async () => {
  const api = await subject();
  const input = context();
  const result = api.evaluateDeepSeekLiveDispatchPreflightV5R2(input);
  assert.equal(result.dispatchAllowed, true, result.errors.join("\n"));
  assert.equal(result.providerEventCount, 0);
  assert.equal(result.httpRequestCount, 0);
  assert.equal(result.permit.provider, "DEEPSEEK_DIRECT");
  assert.equal(result.permit.productionEndpoint, "https://api.deepseek.com/chat/completions");
  assert.equal(result.permit.expectedModel, "deepseek-v4-pro");
  assert.equal(result.permit.providerEventCount, 1);
  const body = structuredClone(result.permit);
  delete body.permitHash;
  assert.equal(result.permit.permitHash, jcsHash(body));
});

test("DeepSeek live guard fails closed on reference leakage, missing route evidence, or pessimistic cap exhaustion", async () => {
  const api = await subject();
  for (const mutate of [
    (input) => { input.request = { ...input.request, referenceLabel: "NO_FINDING" }; },
    (input) => { input.trustedAuthorization = { ...input.trustedAuthorization, dataRegionConfirmed: false }; },
    (input) => { input.budgetState = { ...input.budgetState, roleAttemptsUsed: 2 }; },
  ]) {
    const input = context();
    mutate(input);
    const result = api.evaluateDeepSeekLiveDispatchPreflightV5R2(input);
    assert.equal(result.dispatchAllowed, false);
    assert.equal(result.permit, null);
    assert.equal(result.httpRequestCount, 0);
    assert.equal(result.errors.length > 0, true);
  }
});

export { authorizationFixture, context, requestFixture };
