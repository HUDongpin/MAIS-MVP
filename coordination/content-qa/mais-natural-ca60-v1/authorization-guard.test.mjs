import assert from "node:assert/strict";
import test from "node:test";

import ON_DISK_DESIGN_REGISTRATION from "../../research/mais-natural-ca60-v1/versions/design-v4/design-registration.json" with { type: "json" };
import {
  buildFrozenProviderRequest,
  calculateArtifactHash,
  canonicalJson,
  EGRESS_DENYLIST,
  providerRequestTemplateHash,
  QWEN_EGRESS_ALLOWLIST,
  QWEN_ROLE_CONTRACTS,
  QWEN_ROLE_SET,
  sha256Hex,
} from "../../research/mais-natural-ca60-v1/versions/design-v4/design-contract.mjs";
import {
  buildHypotheticalFrozenRegistrationV4,
} from "../../research/mais-natural-ca60-v1/versions/design-v4/review-test-fixtures.mjs";

async function subject() {
  return import("./authorization-guard.mjs");
}

const hash = (character) => character.repeat(64);

function bindHash(artifact, field) {
  artifact[field] = calculateArtifactHash(artifact, field);
  return artifact;
}

function authorizationFixture(registration, overrides = {}) {
  const priceSnapshot = bindHash({
    officialSourceHash: hash("1"),
    snapshotAt: "2026-08-25T04:55:00.000Z",
    dataRegion: "cn-beijing",
    currency: "USD",
    inputRate: 0.1,
    outputRate: 0.2,
    reasoningRate: null,
    reasoningIncludedInCompletion: true,
    usageMappingVersion: "OPENAI_COMPAT_REASONING_INCLUDED_IN_COMPLETION_V1",
    rateUnit: "USD_PER_MILLION_TOKENS",
    currentAtAuthorization: true,
  }, "priceSnapshotHash");
  const worstCaseUsagePlan = {
    inputTokens: 2_000_000,
    outputTokens: 2_000_000,
    reasoningTokens: 0,
    totalTokens: 4_000_000,
    maximumSuccessfulCalls: 300,
  };
  const worstCaseCostPreviewUsd = 0.6;
  const authorization = {
    schemaVersion: "ProviderAuthorizationV1",
    designId: "MAIS-NATURAL-CA60-V4",
    registrationHash: registration.registrationHash,
    frameRegistrationHash: hash("2"),
    samplingFrameHash: hash("3"),
    sampleManifestHash: hash("4"),
    runtimeConfigHash: hash("5"),
    promptSetHash: hash("6"),
    schemaSetHash: hash("7"),
    runnerCommit: "8".repeat(40),
    runnerHash: hash("9"),
    adapterHash: hash("a"),
    providerRouteDecisionHash: hash("b"),
    provider: "ALIBABA_CLOUD_MODEL_STUDIO",
    region: "cn-beijing",
    endpoint: "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
    model: "qwen3.8-max",
    roleSet: [...QWEN_ROLE_SET],
    requestTemplateHash: providerRequestTemplateHash("ALIBABA_CLOUD_MODEL_STUDIO"),
    payloadSetHash: sha256Hex(canonicalJson(QWEN_EGRESS_ALLOWLIST)),
    allowedOrigin: "FROZEN_RUNTIME_VISIBLE_CA_FRAME",
    egressAllowlist: [...QWEN_EGRESS_ALLOWLIST],
    egressDenylist: [...EGRESS_DENYLIST],
    privacyScreenHash: hash("c"),
    rightsScreenHash: hash("d"),
    issuedAt: "2026-08-25T05:00:00.000Z",
    expiresAt: "2026-08-25T06:00:00.000Z",
    maximumAttempts: 610,
    maximumSuccessfulCalls: 300,
    maximumInputTokens: 4_000_000,
    maximumOutputTokens: 4_000_000,
    maximumTokens: 4_000_000,
    maximumEstimatedUsd: 25,
    currency: "USD",
    concurrencyCap: 4,
    worstCaseUsagePlan,
    worstCaseCostPreviewUsd,
    costBufferMultiplier: 1.2,
    bufferedWorstCaseUsd: worstCaseCostPreviewUsd * 1.2,
    priceSnapshot,
    authorizedBy: "owner-pseudonym",
    ownerGrantHash: hash("e"),
    authorizationEvidenceHash: hash("f"),
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
    trustedOutOfBandRootsRequired: true,
    deepSeekRouteProbeAuthorizationHash: null,
    deepSeekRouteProbeReceiptHash: null,
    referenceSealHash: null,
    qwenAttemptChainHash: null,
    directBillingEvidenceHash: null,
    dataRegionEvidenceHash: null,
    ...overrides,
  };
  return bindHash(authorization, "authorizationHash");
}

function trustedAuthorizationFixture(authorization, at = "2026-08-25T05:30:00.000Z") {
  return {
    registrationHash: authorization.registrationHash,
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
    priceSnapshotHash: authorization.priceSnapshot.priceSnapshotHash,
    ownerGrantHash: authorization.ownerGrantHash,
    authorizationEvidenceHash: authorization.authorizationEvidenceHash,
    authorizedBy: authorization.authorizedBy,
    authorizationHash: authorization.authorizationHash,
    trustedAuthorizationHash: authorization.authorizationHash,
    trustedPriceSnapshotHash: authorization.priceSnapshot.priceSnapshotHash,
    trustedOwnerGrantRootHash: authorization.ownerGrantHash,
    at,
  };
}

function requestFixture() {
  const role = "A_SOLVE";
  const providerInput = Object.fromEntries(
    QWEN_ROLE_CONTRACTS[role].inputFieldNames.map((field) => [field, `${field}-fixture-value`]),
  );
  return {
    provider: "ALIBABA_CLOUD_MODEL_STUDIO",
    model: "qwen3.8-max",
    endpoint: "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
    role,
    providerInput,
    wireRequest: buildFrozenProviderRequest(role, providerInput),
    reserveTokens: 12_000,
    reserveUsd: 0.01,
  };
}

function budgetFixture(overrides = {}) {
  return {
    attemptsUsed: 0,
    successfulCallsUsed: 0,
    totalTokensUsed: 0,
    estimatedUsdUsed: 0,
    pendingReservedTokens: 0,
    pendingReservedUsd: 0,
    concurrencyActive: 0,
    ...overrides,
  };
}

function fixtureTransport() {
  let calls = 0;
  return {
    kind: "FIXTURE_ONLY_NO_NETWORK_V1",
    get calls() {
      return calls;
    },
    async send(request) {
      calls += 1;
      return {
        fixture: true,
        requestHash: sha256Hex(canonicalJson(request)),
      };
    },
  };
}

async function assertBlocked({ registration, authorization, trusted, request, budget, transport = fixtureTransport() }, pattern) {
  const api = await subject();
  const result = await api.dispatchFixtureTransportAgainstExplicitRegistrationForTestV1({
    designRegistration: registration,
    authorization,
    trustedAuthorization: trusted,
    request,
    budgetState: budget,
    transport,
  });
  assert.equal(result.dispatchAllowed, false);
  assert.equal(result.httpRequestCount, 0);
  assert.equal(result.fixtureDispatchCount, 0);
  assert.equal(transport.calls, 0);
  assert.match(result.errors.join("\n"), pattern);
}

test("the production dispatcher is pinned to the on-disk candidate and performs zero transport calls", async () => {
  const api = await subject();
  const hypothetical = buildHypotheticalFrozenRegistrationV4();
  const authorization = authorizationFixture(hypothetical);
  const transport = fixtureTransport();
  const result = await api.dispatchAuthorizedFixtureTransportV1({
    authorization,
    trustedAuthorization: trustedAuthorizationFixture(authorization),
    request: requestFixture(),
    budgetState: budgetFixture(),
    transport,
  });
  assert.equal(ON_DISK_DESIGN_REGISTRATION.freezeAllowed, false);
  assert.equal(result.dispatchAllowed, false);
  assert.equal(result.httpRequestCount, 0);
  assert.equal(result.fixtureDispatchCount, 0);
  assert.equal(transport.calls, 0);
  assert.match(result.errors.join("\n"), /candidate|not frozen|blocking|registration/iu);
});

test("missing and expired authorization fail closed before fixture dispatch", async () => {
  const registration = buildHypotheticalFrozenRegistrationV4();
  await assertBlocked({
    registration,
    authorization: null,
    trusted: {},
    request: requestFixture(),
    budget: budgetFixture(),
  }, /authorization/iu);

  const expired = authorizationFixture(registration, { expiresAt: "2026-08-25T05:10:00.000Z" });
  await assertBlocked({
    registration,
    authorization: expired,
    trusted: trustedAuthorizationFixture(expired, "2026-08-25T05:30:00.000Z"),
    request: requestFixture(),
    budget: budgetFixture(),
  }, /expiry|window|expired/iu);
});

test("wrong origin, tuple drift, and unknown price each keep the transport count at zero", async () => {
  const registration = buildHypotheticalFrozenRegistrationV4();
  for (const [authorization, pattern] of [
    [authorizationFixture(registration, { allowedOrigin: "UNFROZEN_CONTENT" }), /origin/iu],
    [authorizationFixture(registration, { model: "deepseek-v4-pro" }), /model|tuple|persisted/iu],
    [authorizationFixture(registration, {
      priceSnapshot: bindHash({
        ...authorizationFixture(registration).priceSnapshot,
        currentAtAuthorization: false,
      }, "priceSnapshotHash"),
    }), /price/iu],
  ]) {
    await assertBlocked({
      registration,
      authorization,
      trusted: trustedAuthorizationFixture(authorization),
      request: requestFixture(),
      budget: budgetFixture(),
    }, pattern);
  }
});

test("attempt, token, USD, and concurrency exhaustion are pre-dispatch blockers", async () => {
  const registration = buildHypotheticalFrozenRegistrationV4();
  const authorization = authorizationFixture(registration);
  const trusted = trustedAuthorizationFixture(authorization);
  for (const [budget, pattern] of [
    [budgetFixture({ attemptsUsed: 610 }), /attempt/iu],
    [budgetFixture({ successfulCallsUsed: 300 }), /successful/iu],
    [budgetFixture({ totalTokensUsed: 3_995_000 }), /token/iu],
    [budgetFixture({ estimatedUsdUsed: 24.995 }), /USD|cost/iu],
    [budgetFixture({ concurrencyActive: 4 }), /concurrency/iu],
  ]) {
    await assertBlocked({ registration, authorization, trusted, request: requestFixture(), budget }, pattern);
  }
});

test("a valid hypothetical frozen context may invoke exactly one fixture-only transport", async () => {
  const api = await subject();
  const registration = buildHypotheticalFrozenRegistrationV4();
  const authorization = authorizationFixture(registration);
  const transport = fixtureTransport();
  const result = await api.dispatchFixtureTransportAgainstExplicitRegistrationForTestV1({
    designRegistration: registration,
    authorization,
    trustedAuthorization: trustedAuthorizationFixture(authorization),
    request: requestFixture(),
    budgetState: budgetFixture(),
    transport,
  });
  assert.equal(result.dispatchAllowed, true);
  assert.equal(result.httpRequestCount, 0);
  assert.equal(result.fixtureDispatchCount, 1);
  assert.equal(transport.calls, 1);
  assert.equal(result.transportKind, "FIXTURE_ONLY_NO_NETWORK_V1");
  assert.equal(result.response.fixture, true);
});

test("the A21 guard rejects any transport not explicitly marked fixture-only", async () => {
  const registration = buildHypotheticalFrozenRegistrationV4();
  const authorization = authorizationFixture(registration);
  let calls = 0;
  const liveLikeTransport = {
    kind: "LIVE_HTTP",
    get calls() {
      return calls;
    },
    async send() {
      calls += 1;
      return {};
    },
  };
  await assertBlocked({
    registration,
    authorization,
    trusted: trustedAuthorizationFixture(authorization),
    request: requestFixture(),
    budget: budgetFixture(),
    transport: liveLikeTransport,
  }, /fixture-only|transport/iu);
});
