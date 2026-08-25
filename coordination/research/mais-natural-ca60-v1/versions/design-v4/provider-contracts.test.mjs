import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  buildFrozenProviderRequest,
  buildProviderWireEvidenceV4,
  calculateArtifactHash,
  calculateFrozenNaturalItemLeafHashV4,
  canonicalJson,
  DEEPSEEK_EGRESS_ALLOWLIST,
  DEEPSEEK_ROLE_CONTRACTS,
  DEEPSEEK_ROLE_SET,
  EGRESS_DENYLIST,
  deriveDeepSeekProviderInputV4,
  deriveProtectedFrozenItemProjectionV4,
  deriveQwenProviderInputV4,
  providerRequestTemplateHash,
  QWEN_EGRESS_ALLOWLIST,
  QWEN_ROLE_CONTRACTS,
  QWEN_ROLE_SET,
  SAMPLE_ITEM_PSEUDONYM_FORMULA_V4,
  sha256Hex,
  validateFrozenProviderRequest,
  validateQwenProviderRequestV4,
  validateProviderAttemptReceiptV1,
  validateProviderAttemptChainV1,
  validateProviderAttemptWireBindingV4,
  validateProviderAuthorizationV1,
} from "./design-contract.mjs";
import {
  calculateManifestTupleRootV3,
  calculateItemContentHashV4,
  materializeSamplePseudonymFieldsV4,
  SAMPLE_ALGORITHM_VERSION,
  SAMPLE_ITEM_PSEUDONYM_FORMULA_V4 as SAMPLE_CONTRACT_PSEUDONYM_FORMULA_V4,
} from "./sample-contract.mjs";

const hash = (character) => character.repeat(64);

function localized(en, zh = `ZH ${en}`) {
  return { en, zh };
}

function frozenItemLeaf(overrides = {}) {
  return {
    itemId: "real-runtime-question-id",
    sourceCommit: "1".repeat(40),
    sourceIds: ["california-runtime-bank"],
    region: "California",
    curriculumProfile: "US_CA_MATH",
    grade: "P5",
    canonicalTopic: "operations-and-algebraic-thinking",
    responseForm: "multiple-choice",
    difficulty: "MEDIUM",
    sourceModuleHash: hash("2"),
    prompt: localized("What is 2 + 2?", "2 + 2 等于多少？"),
    options: [localized("3", "3"), localized("4", "4")],
    answer: "4",
    storedAnswer: "4",
    acceptedAnswers: ["4"],
    explanation: localized("Two plus two is four.", "二加二等于四。"),
    diagram: null,
    questionAssets: [],
    localePolicy: "FULL_RUNTIME_LOCALIZED_BUNDLE",
    topic: localized("Operations and algebraic thinking", "运算与代数思维"),
    rubric: "MAIS_NATURAL_CA60_QA_RUBRIC_V4",
    lineageKind: "RUNTIME_SOURCE",
    batchId: null,
    clusterId: "source-lineage-cluster-001",
    homologyClusterId: "homology-cluster-001",
    topicId: "topic-001",
    generationTemplate: null,
    sourceLessonSlug: null,
    ...overrides,
  };
}

function localSolveArtifact(itemLeaf, role = "A_SOLVE") {
  const artifact = {
    schemaVersion: "MachineReferenceSolveV1",
    designId: "MAIS-NATURAL-CA60-V4",
    registrationHash: hash("3"),
    sampleManifestHash: hash("6"),
    itemId: itemLeaf.itemId,
    itemHash: calculateFrozenNaturalItemLeafHashV4(itemLeaf),
    clusterId: itemLeaf.homologyClusterId,
    role,
    solveOutput: {
      solution: "4",
      solvability: "SOLVABLE",
      uncertain: false,
    },
  };
  return bindHash(artifact, "artifactHash");
}

function localLabelArtifact(itemLeaf, role = "A_LABEL") {
  const artifact = {
    schemaVersion: "MachineReferenceLabelV1",
    designId: "MAIS-NATURAL-CA60-V4",
    registrationHash: hash("3"),
    sampleManifestHash: hash("6"),
    itemId: itemLeaf.itemId,
    itemHash: calculateFrozenNaturalItemLeafHashV4(itemLeaf),
    clusterId: itemLeaf.homologyClusterId,
    role,
    rawLabel: "NO_FINDING",
    rawTaxonomyCodes: ["NO_FINDING"],
    rawSeverity: "NONE",
    rawFindingFamilies: { NO_FINDING: null },
    rawFindings: [],
    rawUncertain: false,
  };
  return bindHash(artifact, "labelHash");
}

function manifestRowFor(itemLeaf, itemIdPseudonym = "sample-pseudonym-001") {
  const itemHash = calculateFrozenNaturalItemLeafHashV4(itemLeaf);
  const pseudonymSeedRootHash = sha256Hex(`fixture-pseudonym-seed:${itemIdPseudonym}`);
  const boundPseudonym = `ca60-${sha256Hex(canonicalJson([
    pseudonymSeedRootHash,
    itemLeaf.itemId,
    itemHash,
    itemLeaf.homologyClusterId,
  ])).slice(0, 32)}`;
  return {
    itemId: itemLeaf.itemId,
    itemHash,
    clusterId: itemLeaf.homologyClusterId,
    itemIdPseudonym: boundPseudonym,
    sampleManifestHash: hash("6"),
    pseudonymFormula: SAMPLE_CONTRACT_PSEUDONYM_FORMULA_V4,
    pseudonymSeedRootHash,
    pseudonymMappingRootHash: sha256Hex(canonicalJson([[
      itemLeaf.itemId,
      itemHash,
      itemLeaf.homologyClusterId,
      boundPseudonym,
    ]])),
  };
}

function frozenSampleManifestFor(itemLeaf) {
  const itemHash = calculateFrozenNaturalItemLeafHashV4(itemLeaf);
  const selectedRows = [{
    itemId: itemLeaf.itemId,
    itemHash,
    clusterId: itemLeaf.homologyClusterId,
  }, ...Array.from({ length: 59 }, (_, index) => ({
    itemId: `fixture-sample-item-${String(index + 2).padStart(3, "0")}`,
    itemHash: sha256Hex(`fixture-sample-hash-${index + 2}`),
    clusterId: `fixture-sample-cluster-${String(index + 2).padStart(3, "0")}`,
  }))];
  const draft = {
    schemaVersion: "SampleManifestV2",
    designId: "MAIS-NATURAL-CA60-V4",
    registrationHash: hash("3"),
    frameRegistrationHash: hash("4"),
    manifestFrozenAt: "2026-08-25T05:03:00.000Z",
    sampleVersion: 1,
    supersedesSampleManifestHash: null,
    algorithmVersion: SAMPLE_ALGORITHM_VERSION,
    manifestTupleRootHash: calculateManifestTupleRootV3(selectedRows),
    selectedRows,
  };
  return bindHash(materializeSamplePseudonymFieldsV4(draft), "sampleManifestHash");
}

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
    designId: "MAIS-NATURAL-CA60-V4",
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
    designId: "MAIS-NATURAL-CA60-V4",
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
  assert.equal(Object.hasOwn(qwen, "n"), false);
  assert.equal(qwen.enable_thinking, true);
  assert.equal(qwen.temperature, 0);
  assert.equal(Object.hasOwn(qwen, "top_p"), false);
  assert.deepEqual(qwen.response_format, { type: "json_object" });
  assert.equal(qwen.max_tokens, 8192);
  assert.equal(Object.hasOwn(qwen, "tools"), false);
  assert.equal(qwen.enable_search, false);
  assert.equal(qwen.requestedSeed, null);
  assert.equal(Object.hasOwn(qwen, "seed"), false);
  assert.deepEqual(validateFrozenProviderRequest(qwen, "A_SOLVE", qwenInput), []);

  const deepSeekInput = Object.fromEntries(DEEPSEEK_ROLE_CONTRACTS.C0_PRIME_ROLE_1.inputFieldNames.map((field) => [field, `${field}-value`]));
  const deepSeek = buildFrozenProviderRequest("C0_PRIME_ROLE_1", deepSeekInput);
  assert.equal(deepSeek.model, "deepseek-v4-pro");
  assert.deepEqual(deepSeek.thinking, { type: "enabled" });
  assert.equal(deepSeek.reasoning_effort, "high");
  assert.equal(deepSeek.requestedSeed, null);
  assert.equal(Object.hasOwn(deepSeek, "seed"), false);
  assert.equal(Object.hasOwn(deepSeek, "n"), false);
  assert.equal(Object.hasOwn(deepSeek, "tools"), false);
  assert.equal(Object.hasOwn(deepSeek, "top_p"), false);
  assert.deepEqual(validateFrozenProviderRequest(deepSeek, "C0_PRIME_ROLE_1", deepSeekInput), []);

  const drift = { ...qwen, top_p: 1 };
  assert.equal(validateFrozenProviderRequest(drift, "A_SOLVE", qwenInput).some((error) => error.includes("envelope")), true);
  assert.match(providerRequestTemplateHash("ALIBABA_CLOUD_MODEL_STUDIO"), /^[0-9a-f]{64}$/u);
  assert.equal(providerRequestTemplateHash("ALIBABA_CLOUD_MODEL_STUDIO"), providerRequestTemplateHash("ALIBABA_CLOUD_MODEL_STUDIO"));
});

test("logical requestedSeed metadata never becomes an unsupported provider wire seed", () => {
  for (const provider of ["ALIBABA_CLOUD_MODEL_STUDIO", "DEEPSEEK_DIRECT"]) {
    const role = provider === "ALIBABA_CLOUD_MODEL_STUDIO" ? "A_SOLVE" : "C0_PRIME_ROLE_1";
    const contract = provider === "ALIBABA_CLOUD_MODEL_STUDIO" ? QWEN_ROLE_CONTRACTS[role] : DEEPSEEK_ROLE_CONTRACTS[role];
    const parsedRolePayload = provider === "ALIBABA_CLOUD_MODEL_STUDIO"
      ? { solution: "4", solvability: "SOLVABLE", uncertain: false }
      : { valid: true, surfaceDisposition: "NO_FINDING", findings: [] };
    const evidence = buildProviderWireEvidenceV4({
      provider,
      role,
      endpoint: provider === "ALIBABA_CLOUD_MODEL_STUDIO"
        ? "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions"
        : "https://api.deepseek.com/chat/completions",
      model: provider === "ALIBABA_CLOUD_MODEL_STUDIO" ? "qwen3.8-max" : "deepseek-v4-pro",
      systemPrompt: contract.promptLiteral,
      userPayload: Object.fromEntries(contract.inputFieldNames.map((field) => [field, `${field}-value`])),
      responseSchema: contract.outputSchema,
      adapterTransformHash: hash("a"),
      rawWireResponseBytes: canonicalJson({
        id: `provider-${provider}-request`,
        model: provider === "ALIBABA_CLOUD_MODEL_STUDIO" ? "qwen3.8-max" : "deepseek-v4-pro",
        choices: [{ index: 0, message: { role: "assistant", content: canonicalJson(parsedRolePayload) }, finish_reason: "stop" }],
        usage: { prompt_tokens: 10, completion_tokens: 12, total_tokens: 22 },
      }),
      parsedRolePayload,
    });
    assert.equal(evidence.logicalRequest.requestedSeed, null);
    assert.equal(Object.hasOwn(evidence.wireRequestBody, "seed"), false);
    assert.equal(Object.hasOwn(evidence.wireRequestBody, "n"), false);
    assert.equal(Object.hasOwn(evidence.wireRequestBody, "tools"), false);
    if (provider === "DEEPSEEK_DIRECT") assert.deepEqual(evidence.wireRequestBody.thinking, { type: "enabled" });
  }
});

test("wire evidence parses the exact OpenAI-compatible response bytes into independently hashed layers", () => {
  const role = "A_SOLVE";
  const contract = QWEN_ROLE_CONTRACTS[role];
  const parsedRolePayload = {
    uncertain: false,
    solvability: "SOLVABLE",
    solution: "4",
  };
  const extractedMessageContent = ` {\n  "solution" : "4",\n  "solvability" : "SOLVABLE",\n  "uncertain" : false\n } `;
  const rawWireResponseBytes = ` {\n  "provider_extra": {"trace":"opaque"},\n  "choices": [{"finish_reason":"stop","message":{"content":${JSON.stringify(extractedMessageContent)},"role":"assistant"},"index":0}],\n  "id":"chatcmpl-provider-1",\n  "model":"qwen3.8-max",\n  "usage":{"completion_tokens":12,"prompt_tokens":10,"total_tokens":22}\n } `;
  const evidence = buildProviderWireEvidenceV4({
    provider: "ALIBABA_CLOUD_MODEL_STUDIO",
    role,
    endpoint: "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
    model: "qwen3.8-max",
    systemPrompt: contract.promptLiteral,
    userPayload: Object.fromEntries(contract.inputFieldNames.map((field) => [field, `${field}-value`])),
    responseSchema: contract.outputSchema,
    adapterTransformHash: hash("a"),
    rawWireResponseBytes,
    parsedRolePayload,
  });

  assert.equal(evidence.rawWireResponseBytes, rawWireResponseBytes);
  assert.equal(evidence.rawWireResponseHash, sha256Hex(rawWireResponseBytes));
  assert.equal(evidence.parsedProviderEnvelopeHash, sha256Hex(canonicalJson(JSON.parse(rawWireResponseBytes))));
  assert.equal(evidence.extractedMessageContent, extractedMessageContent);
  assert.equal(evidence.extractedMessageContentHash, sha256Hex(extractedMessageContent));
  assert.deepEqual(evidence.parsedRolePayload, parsedRolePayload);
  assert.equal(evidence.parsedRolePayloadHash, sha256Hex(canonicalJson(parsedRolePayload)));
  assert.equal(evidence.wireRequestBodyHash, sha256Hex(evidence.wireRequestBodyBytes));
  assert.equal(evidence.providerResponseId, "chatcmpl-provider-1");
  assert.equal(evidence.providerResponseModel, "qwen3.8-max");
  assert.equal(evidence.finishReason, "stop");
  assert.deepEqual(evidence.providerUsage, {
    promptTokens: 10,
    completionTokens: 12,
    reasoningTokens: 0,
    totalTokens: 22,
  });

  const authorization = validAuthorization();
  const attempt = validAttempt(authorization);
  Object.assign(attempt, {
    providerRequestId: evidence.providerResponseId,
    observedModel: evidence.providerResponseModel,
    finishReason: evidence.finishReason,
    inputTokens: evidence.providerUsage.promptTokens,
    outputTokens: evidence.providerUsage.completionTokens,
    reasoningTokens: evidence.providerUsage.reasoningTokens,
    totalTokens: evidence.providerUsage.totalTokens,
    rawUsage: structuredClone(evidence.providerUsage),
    providerUsageHash: evidence.providerUsageHash,
    requestBodyHash: evidence.wireRequestBodyHash,
    responseBodyHash: evidence.rawWireResponseHash,
    logicalRequestHash: evidence.logicalRequestHash,
    wireRequestBodyHash: evidence.wireRequestBodyHash,
    rawWireResponseHash: evidence.rawWireResponseHash,
    parsedProviderEnvelopeHash: evidence.parsedProviderEnvelopeHash,
    extractedMessageContentHash: evidence.extractedMessageContentHash,
    parsedRolePayloadHash: evidence.parsedRolePayloadHash,
    parsedOutputHash: evidence.parsedRolePayloadHash,
    adapterTransformHash: evidence.adapterTransformHash,
  });
  bindHash(attempt, "selfHash");
  assert.deepEqual(validateProviderAttemptWireBindingV4(attempt, evidence), []);
  for (const [field, replacement] of [
    ["providerRequestId", "mutated-id"],
    ["observedModel", "mutated-model"],
    ["finishReason", "length"],
    ["inputTokens", 11],
    ["providerUsageHash", hash("f")],
  ]) {
    const mutatedAttempt = { ...attempt, [field]: replacement };
    bindHash(mutatedAttempt, "selfHash");
    assert.equal(validateProviderAttemptWireBindingV4(mutatedAttempt, evidence).length > 0, true, field);
  }

  for (const mutateEnvelope of [
    (envelope) => { envelope.choices.push(structuredClone(envelope.choices[0])); },
    (envelope) => { envelope.choices[0].index = 1; },
    (envelope) => { envelope.choices[0].message.role = "tool"; },
  ]) {
    const envelope = JSON.parse(rawWireResponseBytes);
    mutateEnvelope(envelope);
    assert.throws(() => buildProviderWireEvidenceV4({
      provider: "ALIBABA_CLOUD_MODEL_STUDIO",
      role,
      endpoint: "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
      model: "qwen3.8-max",
      systemPrompt: contract.promptLiteral,
      userPayload: Object.fromEntries(contract.inputFieldNames.map((field) => [field, `${field}-value`])),
      responseSchema: contract.outputSchema,
      adapterTransformHash: hash("a"),
      rawWireResponseBytes: JSON.stringify(envelope),
      parsedRolePayload,
    }), /unique|single|index|assistant|choice/iu);
  }

  assert.throws(() => buildProviderWireEvidenceV4({
    provider: "ALIBABA_CLOUD_MODEL_STUDIO",
    role,
    endpoint: "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
    model: "qwen3.8-max",
    systemPrompt: contract.promptLiteral,
    userPayload: Object.fromEntries(contract.inputFieldNames.map((field) => [field, `${field}-value`])),
    responseSchema: contract.outputSchema,
    adapterTransformHash: hash("a"),
    rawWireResponseBytes: canonicalJson({ output: parsedRolePayload }),
    parsedRolePayload,
  }), /OpenAI-compatible|choices|message\.content/u);
});

test("provider attempt receipt rejects a real itemId even when its self-hash is recomputed", () => {
  const authorization = validAuthorization();
  const leaked = validAttempt(authorization);
  leaked.itemId = "real-runtime-question-id";
  bindHash(leaked, "selfHash");
  assert.equal(validateProviderAttemptReceiptV1(leaked, authorization, authorizationContext).some((error) => /real itemId|itemId/u.test(error)), true);
});

test("Qwen label and adjudicator inputs use minimal same-item projections instead of local sealed artifacts", () => {
  const itemLeaf = frozenItemLeaf();
  const aSolve = localSolveArtifact(itemLeaf, "A_SOLVE");
  const bSolve = localSolveArtifact(itemLeaf, "B_SOLVE");
  const aLabel = localLabelArtifact(itemLeaf, "A_LABEL");
  const bLabel = localLabelArtifact(itemLeaf, "B_LABEL");
  const context = {
    itemLeaf,
    sampleManifest: frozenSampleManifestFor(itemLeaf),
    localArtifacts: { aSolve, bSolve, aLabel, bLabel },
  };
  const boundPseudonym = context.sampleManifest.selectedRows.find(({ itemId }) => itemId === itemLeaf.itemId).itemIdPseudonym;

  const aLabelInput = deriveQwenProviderInputV4({ ...context, role: "A_LABEL" });
  assert.deepEqual(Object.keys(aLabelInput).sort(), [...QWEN_ROLE_CONTRACTS.A_LABEL.inputFieldNames].sort());
  assert.deepEqual(aLabelInput.itemSolveArtifact, {
    itemIdPseudonym: boundPseudonym,
    role: "A_SOLVE",
    solution: "4",
    solvability: "SOLVABLE",
    uncertain: false,
  });

  const adjudicatorInput = deriveQwenProviderInputV4({ ...context, role: "ADJUDICATOR" });
  assert.deepEqual(adjudicatorInput.aLabelArtifact, {
    itemIdPseudonym: boundPseudonym,
    role: "A_LABEL",
    rawLabel: "NO_FINDING",
    rawTaxonomyCodes: ["NO_FINDING"],
    rawSeverity: "NONE",
    rawFindingFamilies: { NO_FINDING: null },
    rawFindings: [],
    rawUncertain: false,
  });
  const serialized = canonicalJson({ aLabelInput, adjudicatorInput });
  for (const forbidden of [
    itemLeaf.itemId,
    calculateFrozenNaturalItemLeafHashV4(itemLeaf),
    aSolve.registrationHash,
    aSolve.sampleManifestHash,
    aSolve.artifactHash,
    aLabel.labelHash,
  ]) assert.equal(serialized.includes(forbidden), false);
  for (const forbiddenKey of ["itemId", "itemHash", "registrationHash", "sampleManifestHash", "clusterId", "artifactHash", "labelHash", "receiptHash", "authorizationHash"]) {
    assert.equal(serialized.includes(`"${forbiddenKey}"`), false);
  }

  const request = buildFrozenProviderRequest("A_LABEL", aLabelInput);
  assert.deepEqual(validateQwenProviderRequestV4(request, { ...context, role: "A_LABEL" }), []);
  const leaked = structuredClone(request);
  leaked.input.itemSolveArtifact = aSolve;
  assert.equal(validateQwenProviderRequestV4(leaked, { ...context, role: "A_LABEL" }).some((error) => /projection|artifact|egress/u.test(error)), true);
});

test("frozen-item normalization rejects accessors before invocation and emits closed missing/null/present states", () => {
  let getterCalls = 0;
  const getterLeaf = frozenItemLeaf();
  Object.defineProperty(getterLeaf, "prompt", {
    enumerable: true,
    get() {
      getterCalls += 1;
      return localized("side effect", "副作用");
    },
  });
  assert.throws(() => calculateFrozenNaturalItemLeafHashV4(getterLeaf), /accessor|getter|descriptor/u);
  assert.equal(getterCalls, 0);
  assert.throws(() => deriveQwenProviderInputV4({ role: "A_SOLVE", itemLeaf: getterLeaf, sampleManifest: frozenSampleManifestFor(frozenItemLeaf()) }), /accessor|getter|descriptor/u);
  assert.equal(getterCalls, 0);

  let proxyTrapCalls = 0;
  const proxyLeaf = new Proxy(frozenItemLeaf(), {
    get(target, key, receiver) {
      proxyTrapCalls += 1;
      return Reflect.get(target, key, receiver);
    },
    getOwnPropertyDescriptor(target, key) {
      proxyTrapCalls += 1;
      return Reflect.getOwnPropertyDescriptor(target, key);
    },
    getPrototypeOf(target) {
      proxyTrapCalls += 1;
      return Reflect.getPrototypeOf(target);
    },
    ownKeys(target) {
      proxyTrapCalls += 1;
      return Reflect.ownKeys(target);
    },
  });
  assert.throws(() => calculateFrozenNaturalItemLeafHashV4(proxyLeaf), /proxy/u);
  assert.equal(proxyTrapCalls, 0);

  const missingLeaf = frozenItemLeaf();
  delete missingLeaf.options;
  delete missingLeaf.answer;
  delete missingLeaf.storedAnswer;
  delete missingLeaf.acceptedAnswers;
  delete missingLeaf.explanation;
  const missingProjection = deriveProtectedFrozenItemProjectionV4(missingLeaf);
  assert.equal(missingProjection.projectionDisposition, "PROTECTED_LOCAL_ONLY_NOT_PROVIDER_PAYLOAD");
  assert.deepEqual(missingProjection.options, { presence: "MISSING" });
  assert.deepEqual(missingProjection.storedAnswer, { presence: "MISSING" });
  assert.deepEqual(missingProjection.acceptedAnswers, { presence: "MISSING" });
  assert.deepEqual(missingProjection.explanation, { presence: "MISSING" });
  assert.match(calculateFrozenNaturalItemLeafHashV4(missingLeaf), /^[a-f0-9]{64}$/u);

  const missingMcInput = deriveQwenProviderInputV4({
    role: "A_LABEL",
    itemLeaf: missingLeaf,
    sampleManifest: frozenSampleManifestFor(missingLeaf),
    localArtifacts: { aSolve: localSolveArtifact(missingLeaf, "A_SOLVE") },
  });
  assert.deepEqual(missingMcInput.options, { presence: "MISSING" });
  assert.deepEqual(missingMcInput.storedAnswer, { presence: "MISSING" });
  assert.deepEqual(missingMcInput.explanation, { presence: "MISSING" });

  const nullLeaf = frozenItemLeaf({ options: null, explanation: null });
  const presentLeaf = frozenItemLeaf();
  assert.deepEqual(deriveProtectedFrozenItemProjectionV4(nullLeaf).options, { presence: "NULL" });
  assert.deepEqual(deriveProtectedFrozenItemProjectionV4(presentLeaf).options.presence, "PRESENT");
  assert.notEqual(calculateFrozenNaturalItemLeafHashV4(missingLeaf), calculateFrozenNaturalItemLeafHashV4(nullLeaf));
  assert.notEqual(calculateFrozenNaturalItemLeafHashV4(nullLeaf), calculateFrozenNaturalItemLeafHashV4(presentLeaf));
});

test("method itemHash is byte-for-byte authoritative sample V4 identity while homology identity stays separate", () => {
  const itemLeaf = frozenItemLeaf();
  assert.notEqual(itemLeaf.clusterId, itemLeaf.homologyClusterId);
  assert.equal(calculateFrozenNaturalItemLeafHashV4(itemLeaf), calculateItemContentHashV4(itemLeaf));

  const aSolve = localSolveArtifact(itemLeaf, "A_SOLVE");
  assert.equal(aSolve.clusterId, itemLeaf.homologyClusterId);
  assert.doesNotThrow(() => deriveQwenProviderInputV4({
    role: "A_LABEL",
    itemLeaf,
    sampleManifest: frozenSampleManifestFor(itemLeaf),
    localArtifacts: { aSolve },
  }));
  const wrongCluster = structuredClone(aSolve);
  wrongCluster.clusterId = itemLeaf.clusterId;
  bindHash(wrongCluster, "artifactHash");
  assert.throws(() => deriveQwenProviderInputV4({
    role: "A_LABEL",
    itemLeaf,
    sampleManifest: frozenSampleManifestFor(itemLeaf),
    localArtifacts: { aSolve: wrongCluster },
  }), /identity|homology|cluster/u);
});

test("all provider item APIs are role-specific and DeepSeek remains reference-label blind", () => {
  const itemLeaf = frozenItemLeaf();
  const input = deriveDeepSeekProviderInputV4({
    role: "B_PRIME_CRITIQUE",
    itemLeaf,
    sampleManifest: frozenSampleManifestFor(itemLeaf),
  });
  assert.deepEqual(Object.keys(input).sort(), [...DEEPSEEK_ROLE_CONTRACTS.B_PRIME_CRITIQUE.inputFieldNames].sort());
  assert.equal(input.itemPseudonym, frozenSampleManifestFor(itemLeaf).selectedRows[0].itemIdPseudonym);
  assert.equal(/qwen|reference|gold/iu.test(canonicalJson(input)), false);

  const source = readFileSync(new URL("./design-contract.mjs", import.meta.url), "utf8");
  assert.equal(/export function deriveProviderVisibleItemProjectionV4/u.test(source), false);
});

test("role-specific provider builders reject caller-chosen or manifest-inconsistent pseudonyms", () => {
  assert.equal(SAMPLE_ITEM_PSEUDONYM_FORMULA_V4, SAMPLE_CONTRACT_PSEUDONYM_FORMULA_V4);
  const itemLeaf = frozenItemLeaf();
  const sampleManifest = frozenSampleManifestFor(itemLeaf);
  assert.throws(() => deriveQwenProviderInputV4({
    role: "A_SOLVE",
    itemLeaf,
    sampleManifest,
    itemIdPseudonym: "caller-chosen-pseudonym",
  }), /caller-chosen|unexpected|manifest/u);
  const mismatched = structuredClone(sampleManifest);
  mismatched.selectedRows[0].itemHash = hash("f");
  bindHash(mismatched, "sampleManifestHash");
  assert.throws(() => deriveDeepSeekProviderInputV4({
    role: "B_PRIME_CRITIQUE",
    itemLeaf,
    sampleManifest: mismatched,
  }), /manifest|itemHash|identity/u);
  const callerReplacedPseudonym = structuredClone(sampleManifest);
  callerReplacedPseudonym.selectedRows[0].itemIdPseudonym = "caller-replaced-pseudonym";
  bindHash(callerReplacedPseudonym, "sampleManifestHash");
  assert.throws(() => deriveQwenProviderInputV4({
    role: "A_SOLVE",
    itemLeaf,
    sampleManifest: callerReplacedPseudonym,
  }), /pseudonym.*formula|mapping|manifest/iu);
  const missingMappingRoot = structuredClone(sampleManifest);
  delete missingMappingRoot.pseudonymMappingRootHash;
  bindHash(missingMappingRoot, "sampleManifestHash");
  assert.throws(() => deriveDeepSeekProviderInputV4({
    role: "B_PRIME_CRITIQUE",
    itemLeaf,
    sampleManifest: missingMappingRoot,
  }), /pseudonym.*root|mapping|manifest/iu);
});

test("provider identity is derived from the complete self-hashed 60-row sample manifest", () => {
  const itemLeaf = frozenItemLeaf();
  const sampleManifest = frozenSampleManifestFor(itemLeaf);
  const selected = sampleManifest.selectedRows.find(({ itemId }) => itemId === itemLeaf.itemId);
  const input = deriveQwenProviderInputV4({ role: "A_SOLVE", itemLeaf, sampleManifest });
  assert.equal(input.prompt.en, itemLeaf.prompt.en);

  const corruptedMapping = structuredClone(sampleManifest);
  corruptedMapping.pseudonymMappingRootHash = hash("f");
  bindHash(corruptedMapping, "sampleManifestHash");
  assert.throws(() => deriveQwenProviderInputV4({
    role: "A_SOLVE",
    itemLeaf,
    sampleManifest: corruptedMapping,
  }), /mapping root|sample manifest|pseudonym/iu);

  assert.throws(() => deriveQwenProviderInputV4({
    role: "A_SOLVE",
    itemLeaf,
    manifestRow: { ...selected, sampleManifestHash: sampleManifest.sampleManifestHash },
  }), /complete.*sample|unexpected|manifest/iu);
});

test("every item-review prompt binds the closed presence-state contract and treats missing MC options as reviewable", () => {
  for (const contract of [...Object.values(QWEN_ROLE_CONTRACTS), ...Object.values(DEEPSEEK_ROLE_CONTRACTS)]) {
    assert.match(contract.promptLiteral, /FROZEN_FIELD_PRESENCE_V4/u);
    assert.match(contract.promptLiteral, /MISSING.*NULL.*PRESENT/u);
    assert.match(contract.promptLiteral, /multiple-choice.*missing options.*defect/iu);
  }
});

test("protected C0 trigger reconstruction contains exactly one B-prime critique property", () => {
  const source = readFileSync(new URL("./design-contract.mjs", import.meta.url), "utf8");
  const start = source.indexOf("export function recomputeC0TriggerInputFromProtectedItemV4");
  const end = source.indexOf("export function deriveC0ExecutionSetV4", start);
  assert.notEqual(start, -1);
  assert.notEqual(end, -1);
  const functionSource = source.slice(start, end);
  assert.equal((functionSource.match(/\bbPrimeCritique\s*:/gu) ?? []).length, 1);
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
