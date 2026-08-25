import assert from "node:assert/strict";
import test from "node:test";

import {
  buildFrozenProviderRequest,
  calculateArtifactHash,
  canonicalJson,
  DEEPSEEK_EGRESS_ALLOWLIST,
  DEEPSEEK_ROLE_SET,
  EGRESS_DENYLIST,
  providerRequestTemplateHash,
  QWEN_EGRESS_ALLOWLIST,
  QWEN_ROLE_CONTRACTS,
  QWEN_ROLE_SET,
  sha256Hex,
  validateFrozenProviderRequest,
  validateProviderAttemptReceiptV1,
  validateProviderAttemptChainV1,
  validateProviderAuthorizationV1,
} from "./design-contract.mjs";

const hash = (character) => character.repeat(64);

function bindHash(artifact, field) {
  artifact[field] = calculateArtifactHash(artifact, field);
  return artifact;
}

const authorizationContext = Object.freeze({
  registrationHash: hash("3"),
  frameRegistrationHash: hash("4"),
  samplingFrameHash: hash("5"),
  sampleManifestHash: hash("6"),
  runtimeConfigHash: hash("7"),
  promptSetHash: hash("8"),
  schemaSetHash: hash("9"),
  runnerCommit: "a".repeat(40),
  runnerHash: hash("a"),
  adapterHash: hash("b"),
  privacyScreenHash: hash("c"),
  rightsScreenHash: hash("d"),
  priceSnapshotHashes: Object.freeze({}),
  ownerGrantHash: hash("e"),
  authorizationEvidenceHash: hash("f"),
  authorizedBy: "owner-pseudonym",
  referenceSealHash: hash("2"),
  executionRegistrationHash: hash("3"),
  at: "2026-08-25T04:00:00.000Z",
});

function validAuthorization(provider = "ALIBABA_CLOUD_MODEL_STUDIO") {
  const qwen = provider === "ALIBABA_CLOUD_MODEL_STUDIO";
  const tokenCap = qwen ? 4_000_000 : 6_000_000;
  const priceSnapshot = bindHash({
    officialSourceHash: hash("1"),
    snapshotAt: "2026-08-25T03:00:00.000Z",
    dataRegion: qwen ? "cn-beijing" : "DIRECT_BILLING_ROUTE",
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
    inputTokens: tokenCap / 2,
    outputTokens: tokenCap / 2,
    reasoningTokens: 0,
    totalTokens: tokenCap,
    maximumSuccessfulCalls: qwen ? 300 : 420,
  };
  const worstCaseCostPreviewUsd = (worstCaseUsagePlan.inputTokens * priceSnapshot.inputRate
    + worstCaseUsagePlan.outputTokens * priceSnapshot.outputRate) / 1_000_000;
  return bindHash({
    schemaVersion: "ProviderAuthorizationV1",
    designId: "MAIS-NATURAL-CA60-V3",
    registrationHash: authorizationContext.registrationHash,
    frameRegistrationHash: authorizationContext.frameRegistrationHash,
    samplingFrameHash: authorizationContext.samplingFrameHash,
    sampleManifestHash: authorizationContext.sampleManifestHash,
    runtimeConfigHash: authorizationContext.runtimeConfigHash,
    promptSetHash: authorizationContext.promptSetHash,
    schemaSetHash: authorizationContext.schemaSetHash,
    runnerCommit: authorizationContext.runnerCommit,
    runnerHash: authorizationContext.runnerHash,
    adapterHash: authorizationContext.adapterHash,
    provider,
    region: qwen ? "cn-beijing" : "PROVIDER_MANAGED",
    endpoint: qwen
      ? "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions"
      : "https://api.deepseek.com/chat/completions",
    model: qwen ? "qwen3.8-max" : "deepseek-v4-pro",
    roleSet: [...(qwen ? QWEN_ROLE_SET : DEEPSEEK_ROLE_SET)],
    requestTemplateHash: providerRequestTemplateHash(provider),
    payloadSetHash: sha256Hex(canonicalJson(qwen ? QWEN_EGRESS_ALLOWLIST : DEEPSEEK_EGRESS_ALLOWLIST)),
    allowedOrigin: "FROZEN_RUNTIME_VISIBLE_CA_FRAME",
    egressAllowlist: [...(qwen ? QWEN_EGRESS_ALLOWLIST : DEEPSEEK_EGRESS_ALLOWLIST)],
    egressDenylist: [...EGRESS_DENYLIST],
    privacyScreenHash: authorizationContext.privacyScreenHash,
    rightsScreenHash: authorizationContext.rightsScreenHash,
    issuedAt: "2026-08-25T03:30:00.000Z",
    expiresAt: "2026-08-25T05:00:00.000Z",
    maximumAttempts: qwen ? 610 : 850,
    maximumSuccessfulCalls: qwen ? 300 : 420,
    maximumInputTokens: tokenCap,
    maximumOutputTokens: tokenCap,
    maximumTokens: tokenCap,
    maximumEstimatedUsd: 25,
    currency: "USD",
    concurrencyCap: 4,
    worstCaseUsagePlan,
    worstCaseCostPreviewUsd,
    costBufferMultiplier: 1.2,
    bufferedWorstCaseUsd: worstCaseCostPreviewUsd * 1.2,
    priceSnapshot,
    authorizedBy: "owner-pseudonym",
    ownerGrantHash: authorizationContext.ownerGrantHash,
    authorizationEvidenceHash: authorizationContext.authorizationEvidenceHash,
    nonAuthorizations: ["NO_DEPLOYMENT", "NO_LIVE_QUESTION_BANK_MUTATION", "NO_GIT_MUTATION", "NO_MODEL_FALLBACK", "NO_BUDGET_TRANSFER", "NO_PROMPT_TUNING", "NO_RESULT_DEPENDENT_REPLACEMENT"],
    previousAuthorizationHash: null,
  }, "authorizationHash");
}

test("provider authorization enforces exact provider, model, route, role, and cap tuple", () => {
  assert.deepEqual(validateProviderAuthorizationV1(validAuthorization(), authorizationContext), []);
  assert.deepEqual(validateProviderAuthorizationV1(validAuthorization("DEEPSEEK_DIRECT"), authorizationContext), []);

  const crossModel = validAuthorization();
  crossModel.model = "deepseek-v4-pro";
  bindHash(crossModel, "authorizationHash");
  assert.equal(validateProviderAuthorizationV1(crossModel, authorizationContext).some((error) => error.includes("provider tuple")), true);

  const crossRole = validAuthorization("DEEPSEEK_DIRECT");
  crossRole.roleSet = ["A_SOLVE"];
  bindHash(crossRole, "authorizationHash");
  assert.equal(validateProviderAuthorizationV1(crossRole, authorizationContext).some((error) => error.includes("role set")), true);

  const incompleteDenylist = validAuthorization();
  incompleteDenylist.egressDenylist = incompleteDenylist.egressDenylist.slice(1);
  bindHash(incompleteDenylist, "authorizationHash");
  assert.equal(validateProviderAuthorizationV1(incompleteDenylist, authorizationContext).some((error) => error.includes("denylist")), true);
});

function validAttempt(authorization, role = authorization.provider === "ALIBABA_CLOUD_MODEL_STUDIO" ? "A_SOLVE" : "B_PRIME_CRITIQUE") {
  const qwen = authorization.provider === "ALIBABA_CLOUD_MODEL_STUDIO";
  const reasoningTokens = 0;
  const estimatedCost = (100 * authorization.priceSnapshot.inputRate + 50 * authorization.priceSnapshot.outputRate) / 1_000_000;
  return bindHash({
    schemaVersion: "ProviderAttemptReceiptV1",
    designId: "MAIS-NATURAL-CA60-V3",
    runId: "run-001",
    registrationHash: authorization.registrationHash,
    frameRegistrationHash: authorization.frameRegistrationHash,
    sampleManifestHash: authorization.sampleManifestHash,
    runtimeConfigHash: authorization.runtimeConfigHash,
    authorizationHash: authorization.authorizationHash,
    referenceSealHash: qwen ? null : authorizationContext.referenceSealHash,
    executionRegistrationHash: qwen ? null : authorizationContext.executionRegistrationHash,
    itemIdPseudonym: "item-pseudo-001",
    itemHash: hash("5"),
    attemptId: "attempt-001",
    role,
    sequenceNumber: 1,
    requestedProvider: authorization.provider,
    observedProvider: authorization.provider,
    requestedModel: authorization.model,
    observedModel: authorization.model,
    requestedEndpoint: authorization.endpoint,
    observedEndpointHostname: qwen ? "dashscope.aliyuncs.com" : "api.deepseek.com",
    requestBodyHash: hash("4"),
    responseBodyHash: hash("5"),
    parsedOutputHash: hash("6"),
    startedAt: "2026-08-25T04:01:00.000Z",
    finishedAt: "2026-08-25T04:01:01.000Z",
    latencyMs: 1000,
    httpStatus: 200,
    providerRequestId: "provider-request-001",
    finishReason: "stop",
    parseStatus: "VALID",
    schemaStatus: "VALID",
    attemptStatus: "SUCCESS",
    inputTokens: 100,
    outputTokens: 50,
    reasoningTokens,
    totalTokens: 150,
    rawUsage: { promptTokens: 100, completionTokens: 50, reasoningTokens },
    usageMappingVersion: "OPENAI_COMPAT_REASONING_INCLUDED_IN_COMPLETION_V1",
    costRateSnapshotHash: authorization.priceSnapshot.priceSnapshotHash,
    estimatedCost,
    cumulativeCost: estimatedCost,
    retryClassification: "NONE",
    redactedError: null,
    appendOnly: true,
    atomicWrite: true,
    fileMode: "0600",
    completedItemCommitMarkerHash: null,
    cacheHit: false,
    providerInvoiceAuthoritative: true,
    previousReceiptHash: null,
  }, "selfHash");
}

test("provider attempt receipt rejects cross-provider models and roles", () => {
  const qwenAuthorization = validAuthorization();
  assert.deepEqual(validateProviderAttemptReceiptV1(validAttempt(qwenAuthorization), qwenAuthorization, authorizationContext), []);

  const crossModel = validAttempt(qwenAuthorization);
  crossModel.requestedModel = "deepseek-v4-pro";
  crossModel.observedModel = "deepseek-v4-pro";
  bindHash(crossModel, "selfHash");
  assert.equal(validateProviderAttemptReceiptV1(crossModel, qwenAuthorization, authorizationContext).some((error) => error.includes("provider tuple")), true);

  const crossRole = validAttempt(qwenAuthorization, "B_PRIME_CRITIQUE");
  assert.equal(validateProviderAttemptReceiptV1(crossRole, qwenAuthorization, authorizationContext).some((error) => error.includes("authorized role")), true);

  const deepSeekAuthorization = validAuthorization("DEEPSEEK_DIRECT");
  const qwenRoleOnDeepSeek = validAttempt(deepSeekAuthorization, "A_SOLVE");
  assert.equal(validateProviderAttemptReceiptV1(qwenRoleOnDeepSeek, deepSeekAuthorization, authorizationContext).some((error) => error.includes("authorized role")), true);
});

function twoAttemptChain() {
  const authorization = validAuthorization();
  const first = validAttempt(authorization);
  const second = validAttempt(authorization, "A_LABEL");
  second.attemptId = "attempt-002";
  second.sequenceNumber = 2;
  second.previousReceiptHash = first.selfHash;
  second.startedAt = "2026-08-25T04:01:02.000Z";
  second.finishedAt = "2026-08-25T04:01:03.000Z";
  second.cumulativeCost = first.estimatedCost + second.estimatedCost;
  bindHash(second, "selfHash");
  return { authorization, attempts: [first, second] };
}

function expectedTwoAttemptGraph(authorization) {
  return {
    ...authorizationContext,
    authorizationHash: authorization.authorizationHash,
    requiredSuccessfulCallGraph: [
      { itemHash: hash("5"), role: "A_SOLVE" },
      { itemHash: hash("5"), role: "A_LABEL" },
    ],
    requireCompleteRun: true,
  };
}

test("provider attempt chain recomputes time, price, sequence, cumulative caps, and per-role attempts", () => {
  const valid = twoAttemptChain();
  assert.deepEqual(validateProviderAttemptChainV1(valid.attempts, valid.authorization, expectedTwoAttemptGraph(valid.authorization)), []);

  const brokenPrevious = twoAttemptChain();
  brokenPrevious.attempts[1].previousReceiptHash = hash("f");
  bindHash(brokenPrevious.attempts[1], "selfHash");
  assert.equal(validateProviderAttemptChainV1(brokenPrevious.attempts, brokenPrevious.authorization, authorizationContext).some((error) => error.includes("previous receipt")), true);

  const beforeAuthorization = twoAttemptChain();
  beforeAuthorization.attempts[0].startedAt = "2026-08-25T03:00:00.000Z";
  beforeAuthorization.attempts[0].finishedAt = "2026-08-25T03:00:01.000Z";
  bindHash(beforeAuthorization.attempts[0], "selfHash");
  beforeAuthorization.attempts[1].previousReceiptHash = beforeAuthorization.attempts[0].selfHash;
  bindHash(beforeAuthorization.attempts[1], "selfHash");
  assert.equal(validateProviderAttemptChainV1(beforeAuthorization.attempts, beforeAuthorization.authorization, authorizationContext).some((error) => error.includes("authorization time window")), true);

  const fabricatedCost = twoAttemptChain();
  fabricatedCost.attempts[0].estimatedCost = 1;
  fabricatedCost.attempts[0].cumulativeCost = 1;
  bindHash(fabricatedCost.attempts[0], "selfHash");
  fabricatedCost.attempts[1].previousReceiptHash = fabricatedCost.attempts[0].selfHash;
  fabricatedCost.attempts[1].cumulativeCost = 1 + fabricatedCost.attempts[1].estimatedCost;
  bindHash(fabricatedCost.attempts[1], "selfHash");
  assert.equal(validateProviderAttemptChainV1(fabricatedCost.attempts, fabricatedCost.authorization, authorizationContext).some((error) => error.includes("frozen price")), true);
});

test("provider chain validates the out-of-band authorization root and exact successful call graph", () => {
  const valid = twoAttemptChain();
  const expected = expectedTwoAttemptGraph(valid.authorization);
  assert.deepEqual(validateProviderAttemptChainV1(valid.attempts, valid.authorization, expected), []);

  assert.equal(validateProviderAttemptChainV1([], valid.authorization, expected).some((error) => error.includes("required call graph") || error.includes("empty")), true);

  const extra = twoAttemptChain();
  const third = structuredClone(extra.attempts[1]);
  third.attemptId = "attempt-extra-success";
  third.role = "B_SOLVE";
  third.sequenceNumber = 3;
  third.previousReceiptHash = extra.attempts[1].selfHash;
  third.startedAt = "2026-08-25T04:01:04.000Z";
  third.finishedAt = "2026-08-25T04:01:05.000Z";
  third.cumulativeCost = extra.attempts[1].cumulativeCost + third.estimatedCost;
  bindHash(third, "selfHash");
  assert.equal(validateProviderAttemptChainV1([...extra.attempts, third], extra.authorization, expectedTwoAttemptGraph(extra.authorization)).some((error) => error.includes("required call graph") || error.includes("extra")), true);

  const forgedAuthorization = structuredClone(valid.authorization);
  forgedAuthorization.ownerGrantHash = hash("0");
  bindHash(forgedAuthorization, "authorizationHash");
  assert.equal(validateProviderAttemptChainV1(valid.attempts, forgedAuthorization, expected).some((error) => error.includes("authorization") || error.includes("owner")), true);
});

test("every failed attempt state has an exact fail-closed receipt shape", () => {
  const authorization = validAuthorization();
  const network = validAttempt(authorization);
  Object.assign(network, {
    attemptStatus: "TIMEOUT",
    observedProvider: null,
    observedModel: null,
    observedEndpointHostname: null,
    httpStatus: null,
    responseBodyHash: null,
    parsedOutputHash: null,
    providerRequestId: null,
    finishReason: null,
    parseStatus: "NOT_ATTEMPTED",
    schemaStatus: "NOT_ATTEMPTED",
    inputTokens: 0,
    outputTokens: 0,
    reasoningTokens: 0,
    totalTokens: 0,
    rawUsage: { promptTokens: 0, completionTokens: 0, reasoningTokens: 0 },
    estimatedCost: 0,
    cumulativeCost: 0,
    retryClassification: "TRANSIENT_RETRY_ALLOWED",
    redactedError: "timeout",
  });
  bindHash(network, "selfHash");
  assert.deepEqual(validateProviderAttemptReceiptV1(network, authorization, authorizationContext), []);

  const timeoutWithUsage = structuredClone(network);
  timeoutWithUsage.inputTokens = 1;
  timeoutWithUsage.totalTokens = 1;
  timeoutWithUsage.rawUsage.promptTokens = 1;
  bindHash(timeoutWithUsage, "selfHash");
  assert.equal(validateProviderAttemptReceiptV1(timeoutWithUsage, authorization, authorizationContext).some((error) => error.includes("failure receipt") || error.includes("zero consumption")), true);

  const malformed429 = validAttempt(authorization);
  Object.assign(malformed429, {
    attemptStatus: "HTTP_429",
    httpStatus: 429,
    parsedOutputHash: null,
    parseStatus: "NOT_ATTEMPTED",
    schemaStatus: "NOT_ATTEMPTED",
    finishReason: null,
    inputTokens: 0,
    outputTokens: 0,
    reasoningTokens: 0,
    totalTokens: 0,
    rawUsage: { promptTokens: 0, completionTokens: 0, reasoningTokens: 0 },
    estimatedCost: 0,
    cumulativeCost: 0,
    retryClassification: "TRANSIENT_RETRY_ALLOWED",
  });
  bindHash(malformed429, "selfHash");
  assert.deepEqual(validateProviderAttemptReceiptV1(malformed429, authorization, authorizationContext), []);
  malformed429.schemaStatus = "VALID";
  bindHash(malformed429, "selfHash");
  assert.equal(validateProviderAttemptReceiptV1(malformed429, authorization, authorizationContext).some((error) => error.includes("429") || error.includes("failure receipt")), true);
});

test("provider requests freeze the complete provider-specific envelope and reject top-level drift", () => {
  const qwenInput = Object.fromEntries(QWEN_ROLE_CONTRACTS.A_SOLVE.inputFieldNames.map((field) => [field, `${field}-value`]));
  const qwen = buildFrozenProviderRequest("A_SOLVE", qwenInput);
  assert.equal(qwen.model, "qwen3.8-max");
  assert.equal(qwen.stream, false);
  assert.equal(qwen.n, 1);
  assert.equal(qwen.enable_thinking, true);
  assert.equal(qwen.temperature, 0);
  assert.equal(Object.hasOwn(qwen, "top_p"), false);
  assert.deepEqual(qwen.response_format, { type: "json_object" });
  assert.equal(qwen.max_tokens, 8192);
  assert.deepEqual(qwen.tools, []);
  assert.equal(qwen.enable_search, false);
  assert.equal(qwen.seed, null);
  assert.deepEqual(validateFrozenProviderRequest(qwen, "A_SOLVE", qwenInput), []);

  const deepSeekInput = Object.fromEntries(DEEPSEEK_EGRESS_ALLOWLIST.map((field) => [field, `${field}-value`]));
  const deepSeek = buildFrozenProviderRequest("C0_PRIME_ROLE_1", deepSeekInput);
  assert.equal(deepSeek.model, "deepseek-v4-pro");
  assert.equal(deepSeek.thinking, "enabled");
  assert.equal(deepSeek.reasoning_effort, "high");
  assert.equal(Object.hasOwn(deepSeek, "top_p"), false);
  assert.deepEqual(validateFrozenProviderRequest(deepSeek, "C0_PRIME_ROLE_1", deepSeekInput), []);

  const drift = { ...qwen, top_p: 1 };
  assert.equal(validateFrozenProviderRequest(drift, "A_SOLVE", qwenInput).some((error) => error.includes("envelope")), true);
  assert.match(providerRequestTemplateHash("ALIBABA_CLOUD_MODEL_STUDIO"), /^[0-9a-f]{64}$/u);
  assert.equal(providerRequestTemplateHash("ALIBABA_CLOUD_MODEL_STUDIO"), providerRequestTemplateHash("ALIBABA_CLOUD_MODEL_STUDIO"));
});

test("authorization rejects NaN rates and a fabricated worst-case cost preview", () => {
  const nonFinite = validAuthorization();
  nonFinite.priceSnapshot.inputRate = Number.NaN;
  assert.equal(validateProviderAuthorizationV1(nonFinite, authorizationContext).some((error) => error.includes("finite") || error.includes("price")), true);

  const fabricatedPreview = validAuthorization("DEEPSEEK_DIRECT");
  fabricatedPreview.worstCaseCostPreviewUsd = 0;
  fabricatedPreview.bufferedWorstCaseUsd = 0;
  bindHash(fabricatedPreview, "authorizationHash");
  assert.equal(validateProviderAuthorizationV1(fabricatedPreview, authorizationContext).some((error) => error.includes("worst-case") || error.includes("cost preview")), true);
});

test("attempt usage mapping never double-counts reasoning tokens and status is closed", () => {
  const authorization = validAuthorization("DEEPSEEK_DIRECT");
  const receipt = validAttempt(authorization);
  receipt.rawUsage = { promptTokens: 100, completionTokens: 50, reasoningTokens: 25 };
  receipt.usageMappingVersion = "OPENAI_COMPAT_REASONING_INCLUDED_IN_COMPLETION_V1";
  receipt.reasoningTokens = 25;
  receipt.totalTokens = 150;
  receipt.estimatedCost = (100 * authorization.priceSnapshot.inputRate + 50 * authorization.priceSnapshot.outputRate) / 1_000_000;
  receipt.cumulativeCost = receipt.estimatedCost;
  bindHash(receipt, "selfHash");
  assert.deepEqual(validateProviderAttemptReceiptV1(receipt, authorization, authorizationContext), []);

  const doubleCounted = structuredClone(receipt);
  doubleCounted.totalTokens = 175;
  bindHash(doubleCounted, "selfHash");
  assert.equal(validateProviderAttemptReceiptV1(doubleCounted, authorization, authorizationContext).some((error) => error.includes("usage mapping") || error.includes("token arithmetic")), true);

  const unknownStatus = structuredClone(receipt);
  unknownStatus.attemptStatus = "MYSTERY_FAILURE";
  bindHash(unknownStatus, "selfHash");
  assert.equal(validateProviderAttemptReceiptV1(unknownStatus, authorization, authorizationContext).some((error) => error.includes("attempt status")), true);
});

test("per-role attempt cap keys by manifest itemHash, not replaceable pseudonym", () => {
  const authorization = validAuthorization();
  const attempts = Array.from({ length: 3 }, (_, index) => validAttempt(authorization, "A_SOLVE"));
  let cumulativeCost = 0;
  for (const [index, attempt] of attempts.entries()) {
    attempt.attemptId = `same-item-attempt-${index + 1}`;
    attempt.itemIdPseudonym = `replaceable-pseudonym-${index + 1}`;
    attempt.sequenceNumber = index + 1;
    attempt.previousReceiptHash = attempts[index - 1]?.selfHash ?? null;
    attempt.startedAt = new Date(Date.parse("2026-08-25T04:01:00.000Z") + index * 2_000).toISOString();
    attempt.finishedAt = new Date(Date.parse(attempt.startedAt) + 1_000).toISOString();
    cumulativeCost += attempt.estimatedCost;
    attempt.cumulativeCost = cumulativeCost;
    bindHash(attempt, "selfHash");
  }
  assert.equal(validateProviderAttemptChainV1(attempts, authorization, authorizationContext).some((error) => error.includes("two attempts per item role")), true);
});
