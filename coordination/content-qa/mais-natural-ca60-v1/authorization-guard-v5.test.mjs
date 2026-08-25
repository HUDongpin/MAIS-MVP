import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import ACTIVE_POINTER from "../../research/mais-natural-ca60-v1/ACTIVE-DESIGN-REGISTRATION.json" with { type: "json" };
import DESIGN_REGISTRATION from "../../research/mais-natural-ca60-v1/versions/design-v5/design-registration.json" with { type: "json" };
import V5_PACKAGE_MANIFEST from "../../research/mais-natural-ca60-v1/versions/design-v5/package-manifest.json" with { type: "json" };
import {
  jcsHash,
} from "../../research/mais-natural-ca60-v1/versions/design-v5/design-contract.mjs";
import {
  buildOpenAIReferenceLogicalRequestV5,
  buildOpenAIReferenceWireRequestV5,
} from "./openai-reference-adapter-v5.mjs";

async function subject() {
  return import("./authorization-guard-v5.mjs");
}

const hash = (character) => character.repeat(64);

function solveInput() {
  return {
    prompt: "What is 2 + 3?",
    options: ["4", "5", "6"],
    locale: "en-US",
    grade: "2",
    topic: "addition",
    responseForm: "multiple-choice",
  };
}

function requestFixture() {
  const logicalRequest = buildOpenAIReferenceLogicalRequestV5({ role: "A_SOLVE", providerInput: solveInput() });
  return {
    itemIdPseudonym: "item-pseudo-001",
    itemHash: "f".repeat(64),
    clusterId: "cluster-001",
    provider: "OPENAI_DIRECT",
    model: "gpt-5.6-luna",
    endpoint: "https://us.api.openai.com/v1/responses",
    projectResidency: "US_STORAGE_PROCESSING",
    apiSurface: "RESPONSES_API_V1",
    role: "A_SOLVE",
    logicalRequest,
    wireRequest: buildOpenAIReferenceWireRequestV5(logicalRequest),
    reserveInputTokens: 8_000,
    reserveOutputTokens: 8_192,
    reserveTokens: 16_192,
    reserveUsd: 0.25,
  };
}

function activePointerFixture() {
  return {
    schemaVersion: "NaturalCaActiveDesignPointerV1",
    artifactKind: "ACTIVE_DESIGN_POINTER_NOT_A_REGISTRATION",
    designFamily: "MAIS-NATURAL-CA60",
    activeDesignId: "MAIS-NATURAL-CA60-V5",
    activeDesignPath: "versions/design-v5/design-registration.json",
    activeRegistrationHash: DESIGN_REGISTRATION.registrationHash,
    predecessorDesignId: "MAIS-NATURAL-CA60-V3",
    predecessorRegistrationHash: ACTIVE_POINTER.activeRegistrationHash,
    pointerUpdatedAt: "2026-08-26T01:00:00.000Z",
    reason: "fixture-only hypothetical activation after independent review",
    firstProviderExecutionAllowed: false,
  };
}

function reviewFixture() {
  const body = {
    schemaVersion: "IndependentDesignReviewReceiptV1",
    designId: "MAIS-NATURAL-CA60-V5",
    designRegistrationHash: DESIGN_REGISTRATION.registrationHash,
    reviewedDesignPackageRootHash: V5_PACKAGE_MANIFEST.packageRootHash,
    runnerCommit: "5".repeat(40),
    runnerHash: hash("6"),
    adapterHash: hash("7"),
    reviewerLane: "A11",
    decision: "CONCURRED",
    reviewedAt: "2026-08-26T00:50:00.000Z",
  };
  return { ...body, reviewHash: jcsHash(body) };
}

const OPENAI_ALLOWLIST = [
  "prompt", "options", "locale", "grade", "topic", "responseForm",
  "storedAnswer", "acceptedAnswers", "explanation", "itemSolveArtifact",
  "aSolveArtifact", "aLabelArtifact", "bSolveArtifact", "bLabelArtifact",
];

const EGRESS_DENYLIST = [
  "OPENAI_REFERENCE_FINAL_REFERENCE_TO_DEEPSEEK",
  "DEEPSEEK_OUTPUT_TO_OPENAI_REFERENCE",
  "SOURCE_PATH",
  "GIT_METADATA",
  "CREDENTIAL",
  "STUDENT_OR_USER_DATA",
  "OTHER_ITEM",
  "UNAUTHORIZED_COPYRIGHT_CONTENT",
  "INTERNAL_RESEARCH_RECORD",
];

function authorizationFixture(request, overrides = {}) {
  const body = {
    schemaVersion: "ProviderAuthorizationV2",
    authorizationId: "auth-openai-fixture-001",
    authorizationKind: "OPENAI_REFERENCE_LABELING",
    designId: "MAIS-NATURAL-CA60-V5",
    registrationHash: DESIGN_REGISTRATION.registrationHash,
    frameRegistrationHash: hash("1"),
    samplingFrameHash: hash("2"),
    sampleManifestHash: hash("3"),
    runtimeConfigHash: hash("4"),
    promptSetHash: DESIGN_REGISTRATION.providerControls.openaiReferenceRoleContractCatalog.roleContractRootHash,
    schemaSetHash: DESIGN_REGISTRATION.interfaces.schemaSetHash,
    runnerCommit: "5".repeat(40),
    runnerHash: hash("6"),
    adapterHash: hash("7"),
    providerRouteDecisionHash: hash("8"),
    projectRoutePreflightReceiptHash: hash("9"),
    provider: "OPENAI_DIRECT",
    projectResidency: "US_STORAGE_PROCESSING",
    dataRegion: "US",
    apiSurface: "RESPONSES_API_V1",
    endpoint: "https://us.api.openai.com/v1/responses",
    model: "gpt-5.6-luna",
    roleSet: ["A_SOLVE", "A_LABEL", "B_SOLVE", "B_LABEL", "ADJUDICATOR"],
    logicalRequestTemplateHash: DESIGN_REGISTRATION.providerControls.openaiReferenceEnvelope.logicalRequestTemplateHash,
    wireRequestTemplateHash: DESIGN_REGISTRATION.providerControls.openaiReferenceEnvelope.wireRequestTemplateHash,
    payloadSetHash: jcsHash([request.itemHash]),
    allowedOrigin: "https://us.api.openai.com",
    egressAllowlist: OPENAI_ALLOWLIST,
    egressDenylist: EGRESS_DENYLIST,
    privacyScreenHash: hash("a"),
    rightsScreenHash: hash("b"),
    issuedAt: "2026-08-26T01:10:00.000Z",
    expiresAt: "2026-08-26T02:10:00.000Z",
    maximumAttempts: 610,
    maximumSuccessfulCalls: 300,
    maximumInputTokens: 2_000_000,
    maximumOutputTokens: 2_000_000,
    maximumTokens: 4_000_000,
    maximumEstimatedUsd: 25,
    currency: "USD",
    concurrencyCap: 4,
    worstCaseCostPreviewUsd: 20,
    costBufferMultiplier: 1.2,
    bufferedWorstCaseUsd: 24,
    priceSnapshotHash: hash("c"),
    authorizedBy: "owner-pseudonym",
    ownerGrantHash: hash("d"),
    authorizationEvidenceHash: hash("e"),
    nonAuthorizations: [
      "NO_DEPLOYMENT",
      "NO_LIVE_QUESTION_BANK_MUTATION",
      "NO_GIT_MUTATION",
      "NO_MODEL_FALLBACK",
      "NO_BUDGET_TRANSFER",
      "NO_PROMPT_TUNING",
      "NO_RESULT_DEPENDENT_REPLACEMENT",
    ],
    previousAuthorizationHash: null,
    isCurrentAuthorization: true,
    referenceSealHash: null,
    referenceAttemptChainHash: null,
    routeProbeAuthorizationHash: null,
    routeProbeReceiptHash: null,
    ...overrides,
  };
  return { ...body, authorizationHash: jcsHash(body) };
}

function trustedFixture(authorization, request, overrides = {}) {
  return {
    at: "2026-08-26T01:30:00.000Z",
    authorizationHash: authorization.authorizationHash,
    ownerGrantHash: authorization.ownerGrantHash,
    authorizationEvidenceHash: authorization.authorizationEvidenceHash,
    priceSnapshotHash: authorization.priceSnapshotHash,
    priceSnapshotCurrent: true,
    projectRoutePreflightReceiptHash: authorization.projectRoutePreflightReceiptHash,
    providerRouteDecisionHash: authorization.providerRouteDecisionHash,
    frameRegistrationHash: authorization.frameRegistrationHash,
    samplingFrameHash: authorization.samplingFrameHash,
    sampleManifestHash: authorization.sampleManifestHash,
    runtimeConfigHash: authorization.runtimeConfigHash,
    promptSetHash: authorization.promptSetHash,
    schemaSetHash: authorization.schemaSetHash,
    runnerCommit: authorization.runnerCommit,
    runnerHash: authorization.runnerHash,
    adapterHash: authorization.adapterHash,
    privacyScreenHash: authorization.privacyScreenHash,
    rightsScreenHash: authorization.rightsScreenHash,
    authorizedItemHashes: [request.itemHash],
    ...overrides,
  };
}

function budgetFixture(overrides = {}) {
  return {
    attemptsUsed: 0,
    successfulCallsUsed: 0,
    inputTokensUsed: 0,
    outputTokensUsed: 0,
    totalTokensUsed: 0,
    estimatedUsdUsed: 0,
    pendingReservedInputTokens: 0,
    pendingReservedOutputTokens: 0,
    pendingReservedTokens: 0,
    pendingReservedUsd: 0,
    concurrencyActive: 0,
    roleAttemptsUsed: 0,
    ...overrides,
  };
}

function fixtureTransport() {
  let calls = 0;
  return {
    kind: "FIXTURE_ONLY_NO_NETWORK_V2",
    get calls() { return calls; },
    async send(request) {
      calls += 1;
      return { fixtureOnly: true, providerEventCount: 0, requestHash: jcsHash(request) };
    },
  };
}

async function validContext() {
  const request = requestFixture();
  const authorization = authorizationFixture(request);
  return {
    designRegistration: DESIGN_REGISTRATION,
    activeDesignPointer: activePointerFixture(),
    independentReviewReceipt: reviewFixture(),
    authorization,
    trustedAuthorization: trustedFixture(authorization, request),
    request,
    budgetState: budgetFixture(),
    transport: fixtureTransport(),
  };
}

test("production dispatch stays at zero because the immutable active pointer is still V3", async () => {
  const api = await subject();
  const context = await validContext();
  const result = await api.dispatchAuthorizedOpenAIFixtureTransportV5(context);
  assert.equal(ACTIVE_POINTER.activeDesignId, "MAIS-NATURAL-CA60-V3");
  assert.equal(result.dispatchAllowed, false);
  assert.equal(result.httpRequestCount, 0);
  assert.equal(result.fixtureDispatchCount, 0);
  assert.equal(context.transport.calls, 0);
  assert.match(result.errors.join("\n"), /active.*V5|pointer/iu);
});

test("the V5 guard exposes no live network, credential, or environment-variable primitive", async () => {
  const source = await readFile(new URL("./authorization-guard-v5.mjs", import.meta.url), "utf8");
  assert.doesNotMatch(source, /\bfetch\s*\(/u);
  assert.doesNotMatch(source, /process\.env/u);
  assert.doesNotMatch(source, /OPENAI_API_KEY/u);
  assert.doesNotMatch(source, /from\s+["']openai["']/u);
  assert.doesNotMatch(source, /https\.request|http\.request|node:net|node:tls/u);
});

test("a complete hypothetical V5 context permits one fixture dispatch and zero HTTP requests", async () => {
  const api = await subject();
  const context = await validContext();
  const result = await api.dispatchOpenAIFixtureAgainstExplicitContextForTestV5(context);
  assert.equal(result.dispatchAllowed, true);
  assert.equal(result.httpRequestCount, 0);
  assert.equal(result.fixtureDispatchCount, 1);
  assert.equal(context.transport.calls, 1);
  assert.equal(result.transportKind, "FIXTURE_ONLY_NO_NETWORK_V2");
  assert.equal(result.response.fixtureOnly, true);
  assert.equal(result.response.providerEventCount, 0);
});

test("payload authorization binds the frozen sample item, while a later label request may bind its newly sealed solve receipt", async () => {
  const api = await subject();
  const context = await validContext();
  const logicalRequest = buildOpenAIReferenceLogicalRequestV5({
    role: "A_LABEL",
    providerInput: {
      ...solveInput(),
      storedAnswer: "5",
      acceptedAnswers: ["5"],
      explanation: "Add two and three.",
      itemSolveArtifact: {
        schemaVersion: "OpenAIReferenceRoleOutputV1",
        itemHash: context.request.itemHash,
        role: "A_SOLVE",
        selfHash: hash("a"),
      },
    },
  });
  context.request = {
    ...context.request,
    role: "A_LABEL",
    logicalRequest,
    wireRequest: buildOpenAIReferenceWireRequestV5(logicalRequest),
  };
  context.authorization = authorizationFixture(context.request);
  context.trustedAuthorization = trustedFixture(context.authorization, context.request);
  const result = await api.dispatchOpenAIFixtureAgainstExplicitContextForTestV5(context);
  assert.equal(result.dispatchAllowed, true);
  assert.equal(result.httpRequestCount, 0);
  assert.equal(result.fixtureDispatchCount, 1);
});

test("a label request cannot import a solve artifact from another item or panel role", async () => {
  const api = await subject();
  const context = await validContext();
  const logicalRequest = buildOpenAIReferenceLogicalRequestV5({
    role: "A_LABEL",
    providerInput: {
      ...solveInput(),
      storedAnswer: "5",
      acceptedAnswers: ["5"],
      explanation: "Add two and three.",
      itemSolveArtifact: {
        schemaVersion: "OpenAIReferenceRoleOutputV1",
        itemHash: hash("e"),
        role: "B_SOLVE",
        selfHash: hash("a"),
      },
    },
  });
  context.request = {
    ...context.request,
    role: "A_LABEL",
    logicalRequest,
    wireRequest: buildOpenAIReferenceWireRequestV5(logicalRequest),
  };
  context.authorization = authorizationFixture(context.request);
  context.trustedAuthorization = trustedFixture(context.authorization, context.request);
  const result = await api.dispatchOpenAIFixtureAgainstExplicitContextForTestV5(context);
  assert.equal(result.dispatchAllowed, false);
  assert.equal(context.transport.calls, 0);
  assert.match(result.errors.join("\n"), /prior artifact|item|role/iu);
});

test("authorization expiry, model drift, missing route proof, unknown price, and payload drift fail before dispatch", async () => {
  const api = await subject();
  for (const [mutate, pattern] of [
    [(context) => {
      context.authorization = authorizationFixture(context.request, { expiresAt: "2026-08-26T01:20:00.000Z" });
      context.trustedAuthorization = trustedFixture(context.authorization, context.request);
    }, /expired|window/iu],
    [(context) => {
      context.authorization = authorizationFixture(context.request, { model: "gpt-5.6-luna-preview" });
      context.trustedAuthorization = trustedFixture(context.authorization, context.request);
    }, /model|tuple/iu],
    [(context) => {
      context.authorization = authorizationFixture(context.request, { projectRoutePreflightReceiptHash: null });
      context.trustedAuthorization = trustedFixture(context.authorization, context.request);
    }, /route.*preflight/iu],
    [(context) => { context.trustedAuthorization.priceSnapshotCurrent = false; }, /price/iu],
    [(context) => { context.trustedAuthorization.authorizedItemHashes = [hash("e")]; }, /payload|sample|item/iu],
  ]) {
    const context = await validContext();
    mutate(context);
    const result = await api.dispatchOpenAIFixtureAgainstExplicitContextForTestV5(context);
    assert.equal(result.dispatchAllowed, false);
    assert.equal(result.httpRequestCount, 0);
    assert.equal(result.fixtureDispatchCount, 0);
    assert.equal(context.transport.calls, 0);
    assert.match(result.errors.join("\n"), pattern);
  }
});

test("attempt, role-attempt, input, output, total-token, USD, and concurrency caps are pessimistic pre-dispatch gates", async () => {
  const api = await subject();
  for (const [budgetState, pattern] of [
    [budgetFixture({ attemptsUsed: 610 }), /attempt cap/iu],
    [budgetFixture({ roleAttemptsUsed: 2 }), /role.*attempt/iu],
    [budgetFixture({ successfulCallsUsed: 300 }), /successful/iu],
    [budgetFixture({ inputTokensUsed: 1_999_000 }), /input token/iu],
    [budgetFixture({ outputTokensUsed: 1_999_000 }), /output token/iu],
    [budgetFixture({ totalTokensUsed: 3_990_000 }), /total token/iu],
    [budgetFixture({ estimatedUsdUsed: 24.9 }), /USD|cost/iu],
    [budgetFixture({ concurrencyActive: 4 }), /concurrency/iu],
  ]) {
    const context = await validContext();
    context.budgetState = budgetState;
    const result = await api.dispatchOpenAIFixtureAgainstExplicitContextForTestV5(context);
    assert.equal(result.dispatchAllowed, false);
    assert.equal(context.transport.calls, 0);
    assert.match(result.errors.join("\n"), pattern);
  }
});

test("non-fixture transports and non-concurred review receipts are categorically rejected", async () => {
  const api = await subject();
  const context = await validContext();
  context.independentReviewReceipt = {
    ...context.independentReviewReceipt,
    decision: "DISCREPANCY",
  };
  context.transport = { kind: "LIVE_HTTP", async send() { throw new Error("must not be called"); } };
  const result = await api.dispatchOpenAIFixtureAgainstExplicitContextForTestV5(context);
  assert.equal(result.dispatchAllowed, false);
  assert.equal(result.httpRequestCount, 0);
  assert.match(result.errors.join("\n"), /CONCURRED|review/iu);
  assert.match(result.errors.join("\n"), /fixture-only|transport/iu);
});
