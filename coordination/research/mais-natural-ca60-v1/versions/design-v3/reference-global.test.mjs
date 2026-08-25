import assert from "node:assert/strict";
import test from "node:test";

import {
  buildFrozenProviderRequest,
  calculateArtifactHash,
  calculateFrozenNaturalItemLeafHashV3,
  calculateProviderAttemptChainHash,
  calculateReferenceLabelSealRoot,
  canonicalJson,
  deriveReferenceAgreementStatistics,
  createMetricInputLedger,
  deriveCounterfactualLedger,
  deriveExecutionIntegrity,
  deriveObservedEvaluationLedger,
  deriveOverallDecision,
  DEEPSEEK_EGRESS_ALLOWLIST,
  DEEPSEEK_ROLE_CONTRACTS,
  DEEPSEEK_ROLE_SET,
  EGRESS_DENYLIST,
  NON_AUTHORIZATIONS,
  providerRequestTemplateHash,
  QWEN_EGRESS_ALLOWLIST,
  QWEN_ROLE_CONTRACTS,
  QWEN_ROLE_SET,
  recomputeMetricSet,
  sha256Hex,
  validateReferenceLabelSealExecutionBundle,
  validateFinalEvaluationBundle,
} from "./design-contract.mjs";
import { buildFullSampleContractFixture } from "./test-fixtures.mjs";

const hash = (character) => character.repeat(64);

function withHash(artifact, field) {
  artifact[field] = calculateArtifactHash(artifact, field);
  return artifact;
}

function qwenAuthorization(bindings = {}) {
  const priceSnapshot = withHash({
    officialSourceHash: hash("1"),
    snapshotAt: "2026-08-25T03:00:00.000Z",
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
  return withHash({
    schemaVersion: "ProviderAuthorizationV1",
    designId: "MAIS-NATURAL-CA60-V3",
    registrationHash: bindings.registrationHash ?? hash("3"),
    frameRegistrationHash: bindings.frameRegistrationHash ?? hash("6"),
    samplingFrameHash: bindings.samplingFrameHash ?? hash("2"),
    sampleManifestHash: bindings.sampleManifestHash ?? hash("4"),
    runtimeConfigHash: bindings.runtimeConfigHash ?? hash("7"),
    promptSetHash: bindings.promptSetHash ?? hash("a"),
    schemaSetHash: bindings.schemaSetHash ?? hash("b"),
    runnerCommit: bindings.runnerCommit ?? "c".repeat(40),
    runnerHash: bindings.runnerHash ?? hash("d"),
    adapterHash: bindings.adapterHash ?? hash("e"),
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
    privacyScreenHash: bindings.privacyScreenHash ?? hash("f"),
    rightsScreenHash: bindings.rightsScreenHash ?? hash("0"),
    issuedAt: "2026-08-25T05:10:00.000Z",
    expiresAt: "2026-08-25T08:00:00.000Z",
    maximumAttempts: 610,
    maximumSuccessfulCalls: 300,
    maximumInputTokens: 4_000_000,
    maximumOutputTokens: 4_000_000,
    maximumTokens: 4_000_000,
    maximumEstimatedUsd: 25,
    currency: "USD",
    concurrencyCap: 4,
    worstCaseUsagePlan: { inputTokens: 2_000_000, outputTokens: 2_000_000, reasoningTokens: 0, totalTokens: 4_000_000, maximumSuccessfulCalls: 300 },
    worstCaseCostPreviewUsd: 0.6,
    costBufferMultiplier: 1.2,
    bufferedWorstCaseUsd: 0.72,
    priceSnapshot,
    authorizedBy: "owner-pseudonym",
    ownerGrantHash: hash("5"),
    authorizationEvidenceHash: hash("8"),
    nonAuthorizations: [...NON_AUTHORIZATIONS],
    previousAuthorizationHash: null,
  }, "authorizationHash");
}

function authorizationExpected(authorization) {
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
    ownerGrantHash: authorization.ownerGrantHash,
    authorizationEvidenceHash: authorization.authorizationEvidenceHash,
    authorizedBy: authorization.authorizedBy,
    authorizationHash: authorization.authorizationHash,
    at: "2026-08-25T05:20:00.000Z",
  };
}

function makeAttempt({ authorization, role, requestBody, responseBody, parsedOutputHash, item, state }) {
  state.sequenceNumber += 1;
  const inputTokens = 100;
  const outputTokens = 50;
  const reasoningTokens = 25;
  const estimatedCost = (inputTokens * authorization.priceSnapshot.inputRate + outputTokens * authorization.priceSnapshot.outputRate) / 1_000_000;
  state.cumulativeCost += estimatedCost;
  const startedAt = new Date(Date.parse("2026-08-25T05:11:00.000Z") + (state.sequenceNumber - 1) * 2_000).toISOString();
  const attempt = withHash({
    schemaVersion: "ProviderAttemptReceiptV1",
    designId: "MAIS-NATURAL-CA60-V3",
    runId: "run-reference-global-001",
    registrationHash: authorization.registrationHash,
    frameRegistrationHash: authorization.frameRegistrationHash,
    sampleManifestHash: authorization.sampleManifestHash,
    runtimeConfigHash: authorization.runtimeConfigHash,
    authorizationHash: authorization.authorizationHash,
    referenceSealHash: null,
    executionRegistrationHash: null,
    itemIdPseudonym: item.itemIdPseudonym,
    itemId: item.itemId,
    itemHash: item.itemHash,
    clusterId: item.clusterId,
    role,
    attemptId: `reference-attempt-${String(state.sequenceNumber).padStart(3, "0")}`,
    sequenceNumber: state.sequenceNumber,
    requestedProvider: "ALIBABA_CLOUD_MODEL_STUDIO",
    observedProvider: "ALIBABA_CLOUD_MODEL_STUDIO",
    requestedModel: "qwen3.8-max",
    observedModel: "qwen3.8-max",
    requestedEndpoint: "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
    observedEndpointHostname: "dashscope.aliyuncs.com",
    requestBodyHash: sha256Hex(canonicalJson(requestBody)),
    responseBodyHash: sha256Hex(canonicalJson(responseBody)),
    parsedOutputHash,
    startedAt,
    finishedAt: new Date(Date.parse(startedAt) + 1_000).toISOString(),
    latencyMs: 1000,
    httpStatus: 200,
    providerRequestId: `qwen-request-${state.sequenceNumber}`,
    finishReason: "stop",
    parseStatus: "VALID",
    schemaStatus: "VALID",
    attemptStatus: "SUCCESS",
    inputTokens,
    outputTokens,
    reasoningTokens,
    totalTokens: inputTokens + outputTokens,
    rawUsage: { promptTokens: inputTokens, completionTokens: outputTokens, reasoningTokens },
    usageMappingVersion: "OPENAI_COMPAT_REASONING_INCLUDED_IN_COMPLETION_V1",
    costRateSnapshotHash: authorization.priceSnapshot.priceSnapshotHash,
    estimatedCost,
    cumulativeCost: state.cumulativeCost,
    retryClassification: "NONE",
    redactedError: null,
    appendOnly: true,
    atomicWrite: true,
    fileMode: "0600",
    completedItemCommitMarkerHash: null,
    cacheHit: false,
    providerInvoiceAuthoritative: true,
    previousReceiptHash: state.previousReceiptHash,
  }, "selfHash");
  state.previousReceiptHash = attempt.selfHash;
  state.attempts.push(attempt);
  return attempt;
}

function makeTransientFailureAttempt({ authorization, role, requestBody, item, state }) {
  state.sequenceNumber += 1;
  const startedAt = new Date(Date.parse("2026-08-25T05:11:00.000Z") + (state.sequenceNumber - 1) * 2_000).toISOString();
  const attempt = withHash({
    schemaVersion: "ProviderAttemptReceiptV1",
    designId: "MAIS-NATURAL-CA60-V3",
    runId: "run-reference-global-001",
    registrationHash: authorization.registrationHash,
    frameRegistrationHash: authorization.frameRegistrationHash,
    sampleManifestHash: authorization.sampleManifestHash,
    runtimeConfigHash: authorization.runtimeConfigHash,
    authorizationHash: authorization.authorizationHash,
    referenceSealHash: null,
    executionRegistrationHash: null,
    itemIdPseudonym: item.itemIdPseudonym,
    itemId: item.itemId,
    itemHash: item.itemHash,
    clusterId: item.clusterId,
    role,
    attemptId: `reference-attempt-${String(state.sequenceNumber).padStart(3, "0")}`,
    sequenceNumber: state.sequenceNumber,
    requestedProvider: "ALIBABA_CLOUD_MODEL_STUDIO",
    observedProvider: null,
    requestedModel: "qwen3.8-max",
    observedModel: null,
    requestedEndpoint: "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
    observedEndpointHostname: null,
    requestBodyHash: sha256Hex(canonicalJson(requestBody)),
    responseBodyHash: null,
    parsedOutputHash: null,
    startedAt,
    finishedAt: new Date(Date.parse(startedAt) + 1_000).toISOString(),
    latencyMs: 1000,
    httpStatus: null,
    providerRequestId: null,
    finishReason: null,
    parseStatus: "NOT_ATTEMPTED",
    schemaStatus: "NOT_ATTEMPTED",
    attemptStatus: "TIMEOUT",
    inputTokens: 0,
    outputTokens: 0,
    reasoningTokens: 0,
    totalTokens: 0,
    rawUsage: { promptTokens: 0, completionTokens: 0, reasoningTokens: 0 },
    usageMappingVersion: "OPENAI_COMPAT_REASONING_INCLUDED_IN_COMPLETION_V1",
    costRateSnapshotHash: authorization.priceSnapshot.priceSnapshotHash,
    estimatedCost: 0,
    cumulativeCost: state.cumulativeCost,
    retryClassification: "TRANSIENT_RETRY_ALLOWED",
    redactedError: "timeout",
    appendOnly: true,
    atomicWrite: true,
    fileMode: "0600",
    completedItemCommitMarkerHash: null,
    cacheHit: false,
    providerInvoiceAuthoritative: true,
    previousReceiptHash: state.previousReceiptHash,
  }, "selfHash");
  state.previousReceiptHash = attempt.selfHash;
  state.attempts.push(attempt);
  return attempt;
}

function projectionFromLeaf(itemLeaf) {
  return Object.fromEntries([
    "prompt", "options", "locale", "grade", "topic", "responseForm", "storedAnswer", "acceptedAnswers", "explanation",
  ].map((field) => [field, itemLeaf[field]]));
}

function frozenLeafFromSample(frameRow, selectedRow, index) {
  if (!frameRow || !selectedRow || frameRow.itemId !== selectedRow.itemId || frameRow.itemHash !== selectedRow.itemHash
    || frameRow.homologyClusterId !== selectedRow.clusterId) throw new TypeError("sample/frame item leaf binding mismatch");
  return {
    schemaVersion: "FrozenNaturalItemLeafV1",
    itemHashAlgorithm: "SAMPLING_FRAME_ITEM_CONTENT_V3",
    itemId: selectedRow.itemId,
    clusterId: selectedRow.clusterId,
    region: frameRow.region,
    curriculumProfile: frameRow.curriculumProfile,
    prompt: frameRow.prompt,
    options: frameRow.options,
    locale: "en-US",
    grade: frameRow.grade,
    topic: frameRow.canonicalTopic,
    canonicalTopic: frameRow.canonicalTopic,
    responseForm: frameRow.responseForm,
    storedAnswer: frameRow.storedAnswer,
    acceptedAnswers: frameRow.acceptedAnswers,
    explanation: frameRow.explanation,
    rubric: "MAIS_NATURAL_CA60_QA_RUBRIC_V1",
    difficulty: frameRow.difficulty,
    sourceModuleHash: frameRow.sourceModuleHash,
    lineageKind: frameRow.lineageKind,
    batchId: frameRow.batchId,
    sourceLineageClusterId: frameRow.clusterId,
    topicId: frameRow.topicId,
    generationTemplate: frameRow.generationTemplate,
    sourceLessonSlug: frameRow.sourceLessonSlug,
    fixtureOrdinal: index,
  };
}

function makeMergedItemBundle(index, authorization, state, sampleItem = null) {
  const suffix = String(index + 1).padStart(3, "0");
  const itemLeaf = sampleItem ? frozenLeafFromSample(sampleItem.frameRow, sampleItem.selectedRow, index) : {
    schemaVersion: "FrozenNaturalItemLeafV1",
    itemId: `item-${suffix}`,
    clusterId: `cluster-${suffix}`,
    region: "CALIFORNIA",
    curriculumProfile: "US_CA_MATH",
    prompt: `What is ${index + 1} + 0?`,
    options: [String(index), String(index + 1), String(index + 2)],
    locale: "en-US",
    grade: "1",
    topic: "addition",
    canonicalTopic: "addition",
    responseForm: "multiple-choice",
    storedAnswer: String(index + 1),
    acceptedAnswers: [String(index + 1)],
    explanation: "Adding zero preserves the number.",
    rubric: "MAIS_NATURAL_CA60_QA_RUBRIC_V1",
    difficulty: "Low",
    sourceModuleHash: hash("7"),
    lineageKind: null,
    batchId: null,
    sourceLineageClusterId: null,
    topicId: null,
    generationTemplate: null,
    sourceLessonSlug: null,
  };
  const item = {
    itemId: itemLeaf.itemId,
    itemHash: calculateFrozenNaturalItemLeafHashV3(itemLeaf),
    clusterId: itemLeaf.clusterId,
    itemIdPseudonym: `item-pseudo-${suffix}`,
  };
  if (sampleItem && item.itemHash !== sampleItem.selectedRow.itemHash) throw new TypeError("frozen item leaf hash does not match selected sample itemHash");
  const itemProjection = projectionFromLeaf(itemLeaf);
  const bundle = {
    itemLeaf,
    itemProjection,
    manifestRow: { ...item, sampleManifestHash: authorization.sampleManifestHash },
    authorization,
    authorizationExpected: authorizationExpected(authorization),
    requestBodies: {},
    responseBodies: {},
    parsedOutputs: {},
    baseAttemptReceipts: {},
  };
  for (const role of ["A_SOLVE", "A_LABEL", "B_SOLVE", "B_LABEL"]) {
    const contract = QWEN_ROLE_CONTRACTS[role];
    if (role.endsWith("_SOLVE")) {
      const solveOutput = { solution: `${role}-${suffix}-solution`, solvability: "SOLVABLE", uncertain: false };
      const requestBody = buildFrozenProviderRequest(role, Object.fromEntries(contract.inputFieldNames.map((field) => [field, itemProjection[field]])));
      const responseBody = { output: solveOutput };
      if (state.injectFirstTransientFailure === true && index === 0 && role === "A_SOLVE") {
        makeTransientFailureAttempt({ authorization, role, requestBody, item, state });
      }
      const attempt = makeAttempt({ authorization, role, requestBody, responseBody, parsedOutputHash: sha256Hex(canonicalJson(solveOutput)), item, state });
      const solve = withHash({
        schemaVersion: "MachineReferenceSolveV1",
        designId: "MAIS-NATURAL-CA60-V3",
        registrationHash: authorization.registrationHash,
        sampleManifestHash: authorization.sampleManifestHash,
        clusterId: item.clusterId,
        itemId: item.itemId,
        itemHash: item.itemHash,
        role,
        promptLiteral: contract.promptLiteral,
        promptHash: contract.promptHash,
        schemaHash: contract.schemaHash,
        inputFieldNames: [...contract.inputFieldNames],
        solveAttemptReceiptHash: attempt.selfHash,
        deepSeekOutputNotSeen: true,
        otherRaterArtifactsNotSeen: true,
        solveOutput,
        parsedOutputHash: attempt.parsedOutputHash,
      }, "artifactHash");
      bundle[role === "A_SOLVE" ? "aSolve" : "bSolve"] = solve;
      bundle.requestBodies[role] = requestBody;
      bundle.responseBodies[role] = responseBody;
      bundle.parsedOutputs[role] = solveOutput;
      bundle.baseAttemptReceipts[role] = attempt;
    } else {
      const ownSolve = role === "A_LABEL" ? bundle.aSolve : bundle.bSolve;
      const parsedOutput = {
        rawLabel: "NO_FINDING",
        rawTaxonomyCodes: ["NO_FINDING"],
        rawSeverity: "NONE",
        rawFindingFamilies: { NO_FINDING: null },
        rawFindings: [],
        rawUncertain: false,
      };
      const input = Object.fromEntries(contract.inputFieldNames.map((field) => [field, field === "itemSolveArtifact" ? ownSolve : itemProjection[field]]));
      const requestBody = buildFrozenProviderRequest(role, input);
      const responseBody = { output: parsedOutput };
      const attempt = makeAttempt({ authorization, role, requestBody, responseBody, parsedOutputHash: sha256Hex(canonicalJson(parsedOutput)), item, state });
      const label = withHash({
        schemaVersion: "MachineReferenceLabelV1",
        designId: "MAIS-NATURAL-CA60-V3",
        registrationHash: authorization.registrationHash,
        sampleManifestHash: authorization.sampleManifestHash,
        clusterId: item.clusterId,
        itemId: item.itemId,
        itemHash: item.itemHash,
        labelStage: "RAW_RATER",
        role,
        promptLiteral: contract.promptLiteral,
        promptHash: contract.promptHash,
        schemaHash: contract.schemaHash,
        inputFieldNames: [...contract.inputFieldNames],
        ownSolveArtifactHash: ownSolve.artifactHash,
        labelAttemptReceiptHash: attempt.selfHash,
        ...parsedOutput,
        parsedOutputHash: attempt.parsedOutputHash,
        deepSeekOutputNotSeen: true,
      }, "labelHash");
      bundle[role === "A_LABEL" ? "aLabel" : "bLabel"] = label;
      bundle.requestBodies[role] = requestBody;
      bundle.responseBodies[role] = responseBody;
      bundle.parsedOutputs[role] = parsedOutput;
      bundle.baseAttemptReceipts[role] = attempt;
    }
  }
  bundle.finalLabel = withHash({
    schemaVersion: "MachineReferenceLabelV1",
    designId: "MAIS-NATURAL-CA60-V3",
    registrationHash: authorization.registrationHash,
    sampleManifestHash: authorization.sampleManifestHash,
    clusterId: item.clusterId,
    itemId: item.itemId,
    itemHash: item.itemHash,
    labelStage: "FINAL_AGREEMENT_MERGE",
    finalizationMode: "FINAL_AGREEMENT_MERGE",
    role: "DETERMINISTIC_MERGER",
    providerCall: false,
    rawLabelHashes: [bundle.aLabel.labelHash, bundle.bLabel.labelHash],
    finalLabel: "NO_FINDING",
    finalTaxonomyCodes: ["NO_FINDING"],
    finalSeverity: "NONE",
    finalFindingFamilies: { NO_FINDING: null },
    finalFindings: [],
    acceptedCodeSets: [],
    disagreementStatus: "AGREEMENT",
    adjudicationReasonCodes: [],
    disagreementAdjudicationReceiptHash: null,
  }, "labelHash");
  bundle.seal = withHash({
    schemaVersion: "ItemReferenceLabelSealV1",
    designId: "MAIS-NATURAL-CA60-V3",
    registrationHash: authorization.registrationHash,
    sampleManifestHash: authorization.sampleManifestHash,
    qwenAuthorizationHash: authorization.authorizationHash,
    itemId: item.itemId,
    itemHash: item.itemHash,
    clusterId: item.clusterId,
    aSolveHash: bundle.aSolve.artifactHash,
    bSolveHash: bundle.bSolve.artifactHash,
    aLabelHash: bundle.aLabel.labelHash,
    bLabelHash: bundle.bLabel.labelHash,
    finalLabelHash: bundle.finalLabel.labelHash,
    baseAttemptReceiptHashes: ["A_SOLVE", "A_LABEL", "B_SOLVE", "B_LABEL"].map((role) => bundle.baseAttemptReceipts[role].selfHash),
    sealMode: "FINAL_AGREEMENT_MERGE",
    finalizationMode: "FINAL_AGREEMENT_MERGE",
    adjudicationAttemptReceiptHash: null,
  }, "sealHash");
  bundle.attemptChain = ["A_SOLVE", "A_LABEL", "B_SOLVE", "B_LABEL"].map((role) => bundle.baseAttemptReceipts[role]);
  return bundle;
}

export function buildGlobalReferenceExecutionFixture(options = {}) {
  const sampleFixture = options.sampleFixture ?? null;
  const authorization = qwenAuthorization(sampleFixture ? {
    registrationHash: sampleFixture.sampleManifest.registrationHash,
    frameRegistrationHash: sampleFixture.frameRegistration.frameRegistrationHash,
    samplingFrameHash: sampleFixture.frameRegistration.samplingFrameHash,
    sampleManifestHash: sampleFixture.sampleManifest.sampleManifestHash,
    runtimeConfigHash: sampleFixture.frameRegistration.runtimeConfigHash,
    ...options.authorizationBindings,
  } : options.authorizationBindings);
  const state = { sequenceNumber: 0, previousReceiptHash: null, cumulativeCost: 0, attempts: [], injectFirstTransientFailure: options.injectFirstTransientFailure === true };
  const selectedRows = sampleFixture
    ? [...sampleFixture.sampleManifest.selectedRows].sort((left, right) => left.itemId < right.itemId ? -1 : left.itemId > right.itemId ? 1 : 0)
    : Array.from({ length: 60 }, () => null);
  const itemBundles = selectedRows.map((selectedRow, index) => makeMergedItemBundle(index, authorization, state, selectedRow ? {
    selectedRow,
    frameRow: sampleFixture.frameRows.find((row) => row.itemId === selectedRow.itemId),
  } : null));
  const itemSeals = itemBundles.map((bundle) => ({
    itemId: bundle.seal.itemId,
    itemHash: bundle.seal.itemHash,
    clusterId: bundle.seal.clusterId,
    itemSealHash: bundle.seal.sealHash,
    finalLabelHash: bundle.seal.finalLabelHash,
    sealMode: bundle.seal.sealMode,
    adjudicationAttemptReceiptHash: null,
  }));
  const agreementStatistics = deriveReferenceAgreementStatistics(itemBundles);
  const referenceSeal = withHash({
    schemaVersion: "ReferenceLabelSealV1",
    designId: "MAIS-NATURAL-CA60-V3",
    registrationHash: authorization.registrationHash,
    frameRegistrationHash: authorization.frameRegistrationHash,
    sampleManifestHash: authorization.sampleManifestHash,
    qwenAuthorizationHash: authorization.authorizationHash,
    expectedItemCount: 60,
    itemSeals,
    itemSealRoot: calculateReferenceLabelSealRoot(itemSeals),
    attemptChainHash: calculateProviderAttemptChainHash(state.attempts),
    totalAttemptCount: state.attempts.length,
    baseSuccessfulCallCount: 240,
    adjudicationSuccessfulCallCount: 0,
    totalSuccessfulCallCount: 240,
    retryAttemptCount: state.attempts.length - 240,
    adjudicationRate: 0,
    agreementStatistics,
    labelSourceType: "machine_reference_panel",
    humanGold: false,
    sameModelCorrelatedErrorRisk: true,
    referenceLabelsFrozenAt: "2026-08-25T06:00:00.000Z",
    providerEventCountAtSeal: state.attempts.length,
  }, "sealHash");
  return { referenceSeal, itemBundles, attemptChain: state.attempts, authorization, authorizationExpected: authorizationExpected(authorization) };
}

function deepSeekAuthorization(referenceExecutionBundle, bindings = {}) {
  const priceSnapshot = withHash({
    officialSourceHash: hash("9"),
    snapshotAt: "2026-08-25T06:01:00.000Z",
    dataRegion: "DIRECT_BILLING_ROUTE",
    currency: "USD",
    inputRate: 0.1,
    outputRate: 0.2,
    reasoningRate: null,
    reasoningIncludedInCompletion: true,
    usageMappingVersion: "OPENAI_COMPAT_REASONING_INCLUDED_IN_COMPLETION_V1",
    rateUnit: "USD_PER_MILLION_TOKENS",
    currentAtAuthorization: true,
  }, "priceSnapshotHash");
  return withHash({
    schemaVersion: "ProviderAuthorizationV1",
    designId: "MAIS-NATURAL-CA60-V3",
    registrationHash: referenceExecutionBundle.referenceSeal.registrationHash,
    frameRegistrationHash: referenceExecutionBundle.referenceSeal.frameRegistrationHash,
    samplingFrameHash: referenceExecutionBundle.authorization.samplingFrameHash,
    sampleManifestHash: referenceExecutionBundle.referenceSeal.sampleManifestHash,
    runtimeConfigHash: referenceExecutionBundle.authorization.runtimeConfigHash,
    promptSetHash: bindings.promptSetHash ?? referenceExecutionBundle.authorization.promptSetHash,
    schemaSetHash: bindings.schemaSetHash ?? referenceExecutionBundle.authorization.schemaSetHash,
    runnerCommit: bindings.runnerCommit ?? referenceExecutionBundle.authorization.runnerCommit,
    runnerHash: bindings.runnerHash ?? referenceExecutionBundle.authorization.runnerHash,
    adapterHash: bindings.adapterHash ?? referenceExecutionBundle.authorization.adapterHash,
    provider: "DEEPSEEK_DIRECT",
    region: "PROVIDER_MANAGED",
    endpoint: "https://api.deepseek.com/chat/completions",
    model: "deepseek-v4-pro",
    roleSet: [...DEEPSEEK_ROLE_SET],
    requestTemplateHash: providerRequestTemplateHash("DEEPSEEK_DIRECT"),
    payloadSetHash: sha256Hex(canonicalJson(DEEPSEEK_EGRESS_ALLOWLIST)),
    allowedOrigin: "FROZEN_RUNTIME_VISIBLE_CA_FRAME",
    egressAllowlist: [...DEEPSEEK_EGRESS_ALLOWLIST],
    egressDenylist: [...EGRESS_DENYLIST],
    privacyScreenHash: bindings.privacyScreenHash ?? referenceExecutionBundle.authorization.privacyScreenHash,
    rightsScreenHash: bindings.rightsScreenHash ?? referenceExecutionBundle.authorization.rightsScreenHash,
    issuedAt: "2026-08-25T06:05:00.000Z",
    expiresAt: "2026-08-25T10:00:00.000Z",
    maximumAttempts: 850,
    maximumSuccessfulCalls: 420,
    maximumInputTokens: 6_000_000,
    maximumOutputTokens: 6_000_000,
    maximumTokens: 6_000_000,
    maximumEstimatedUsd: 25,
    currency: "USD",
    concurrencyCap: 4,
    worstCaseUsagePlan: { inputTokens: 3_000_000, outputTokens: 3_000_000, reasoningTokens: 0, totalTokens: 6_000_000, maximumSuccessfulCalls: 420 },
    worstCaseCostPreviewUsd: 0.9,
    costBufferMultiplier: 1.2,
    bufferedWorstCaseUsd: 1.08,
    priceSnapshot,
    authorizedBy: "owner-pseudonym",
    ownerGrantHash: hash("5"),
    authorizationEvidenceHash: hash("8"),
    nonAuthorizations: [...NON_AUTHORIZATIONS],
    previousAuthorizationHash: null,
  }, "authorizationHash");
}

function deepSeekAuthorizationExpected(authorization, referenceSealHash, executionRegistrationHash) {
  return {
    ...authorizationExpected(authorization),
    referenceSealHash,
    executionRegistrationHash,
    at: "2026-08-25T06:06:00.000Z",
  };
}

function makeDeepSeekAttempt({ authorization, referenceSealHash, executionRegistrationHash, role, requestBody, responseBody, parsedOutputHash, item, state }) {
  state.sequenceNumber += 1;
  const inputTokens = 100;
  const outputTokens = 50;
  const reasoningTokens = 25;
  const estimatedCost = (inputTokens * authorization.priceSnapshot.inputRate + outputTokens * authorization.priceSnapshot.outputRate) / 1_000_000;
  state.cumulativeCost += estimatedCost;
  const startedAt = new Date(Date.parse("2026-08-25T06:10:00.000Z") + (state.sequenceNumber - 1) * 2_000).toISOString();
  const attempt = withHash({
    schemaVersion: "ProviderAttemptReceiptV1",
    designId: "MAIS-NATURAL-CA60-V3",
    runId: "run-deepseek-global-001",
    registrationHash: authorization.registrationHash,
    frameRegistrationHash: authorization.frameRegistrationHash,
    sampleManifestHash: authorization.sampleManifestHash,
    runtimeConfigHash: authorization.runtimeConfigHash,
    authorizationHash: authorization.authorizationHash,
    referenceSealHash,
    executionRegistrationHash,
    itemIdPseudonym: item.itemIdPseudonym,
    itemId: item.itemId,
    itemHash: item.itemHash,
    clusterId: item.clusterId,
    role,
    attemptId: `deepseek-attempt-${String(state.sequenceNumber).padStart(3, "0")}`,
    sequenceNumber: state.sequenceNumber,
    requestedProvider: "DEEPSEEK_DIRECT",
    observedProvider: "DEEPSEEK_DIRECT",
    requestedModel: "deepseek-v4-pro",
    observedModel: "deepseek-v4-pro",
    requestedEndpoint: "https://api.deepseek.com/chat/completions",
    observedEndpointHostname: "api.deepseek.com",
    requestBodyHash: sha256Hex(canonicalJson(requestBody)),
    responseBodyHash: sha256Hex(canonicalJson(responseBody)),
    parsedOutputHash,
    startedAt,
    finishedAt: new Date(Date.parse(startedAt) + 1_000).toISOString(),
    latencyMs: 1000,
    httpStatus: 200,
    providerRequestId: `deepseek-request-${state.sequenceNumber}`,
    finishReason: "stop",
    parseStatus: "VALID",
    schemaStatus: "VALID",
    attemptStatus: "SUCCESS",
    inputTokens,
    outputTokens,
    reasoningTokens,
    totalTokens: inputTokens + outputTokens,
    rawUsage: { promptTokens: inputTokens, completionTokens: outputTokens, reasoningTokens },
    usageMappingVersion: "OPENAI_COMPAT_REASONING_INCLUDED_IN_COMPLETION_V1",
    costRateSnapshotHash: authorization.priceSnapshot.priceSnapshotHash,
    estimatedCost,
    cumulativeCost: state.cumulativeCost,
    retryClassification: "NONE",
    redactedError: null,
    appendOnly: true,
    atomicWrite: true,
    fileMode: "0600",
    completedItemCommitMarkerHash: null,
    cacheHit: false,
    providerInvoiceAuthoritative: true,
    previousReceiptHash: state.previousReceiptHash,
  }, "selfHash");
  state.previousReceiptHash = attempt.selfHash;
  state.attempts.push(attempt);
  return attempt;
}

function deepSeekProjection(referenceItemBundle) {
  return {
    prompt: referenceItemBundle.itemLeaf.prompt,
    options: referenceItemBundle.itemLeaf.options,
    storedAnswer: referenceItemBundle.itemLeaf.storedAnswer,
    acceptedAnswers: referenceItemBundle.itemLeaf.acceptedAnswers,
    explanation: referenceItemBundle.itemLeaf.explanation,
    rubric: referenceItemBundle.itemLeaf.rubric,
    difficulty: referenceItemBundle.itemLeaf.difficulty,
    itemPseudonym: referenceItemBundle.manifestRow.itemIdPseudonym,
  };
}

function makeDeepSeekItemBundle(referenceItemBundle, selectedForC0, authorization, expected, executionRegistrationHash, state) {
  const projection = deepSeekProjection(referenceItemBundle);
  const item = referenceItemBundle.manifestRow;
  const roles = ["B_PRIME_CRITIQUE", "B_PRIME_REVISION", ...(selectedForC0 ? ["C0_PRIME_ROLE_1", "C0_PRIME_ROLE_2", "C0_PRIME_ROLE_3", "C0_PRIME_ROLE_4", "C0_PRIME_ROLE_5"] : [])];
  const requestBodies = {};
  const responseBodies = {};
  const outputs = {};
  const attemptReceipts = {};
  for (const role of roles) {
    const contract = DEEPSEEK_ROLE_CONTRACTS[role];
    const parsedPayload = role === "B_PRIME_CRITIQUE"
      ? { valid: true, surfaceDisposition: "NO_FINDING", findings: [], requiredRevisionCodes: [] }
      : role === "B_PRIME_REVISION"
        ? { valid: true, surfaceDisposition: "NO_FINDING", findings: [], resolvedCritiqueCodes: [] }
        : { valid: true, surfaceDisposition: "NO_FINDING", findings: [] };
    const requestBody = buildFrozenProviderRequest(role, projection);
    const responseBody = { output: parsedPayload };
    const parsedOutputHash = sha256Hex(canonicalJson(parsedPayload));
    const attempt = makeDeepSeekAttempt({
      authorization,
      referenceSealHash: expected.referenceSealHash,
      executionRegistrationHash,
      role,
      requestBody,
      responseBody,
      parsedOutputHash,
      item,
      state,
    });
    const output = withHash({
      schemaVersion: "DeepSeekRoleOutputV1",
      designId: "MAIS-NATURAL-CA60-V3",
      registrationHash: authorization.registrationHash,
      sampleManifestHash: authorization.sampleManifestHash,
      referenceSealHash: expected.referenceSealHash,
      executionRegistrationHash,
      authorizationHash: authorization.authorizationHash,
      itemId: item.itemId,
      itemIdPseudonym: item.itemIdPseudonym,
      itemHash: item.itemHash,
      clusterId: item.clusterId,
      role,
      promptHash: contract.promptHash,
      schemaHash: contract.schemaHash,
      parsedPayload,
      parsedOutputHash,
      attemptReceiptHash: attempt.selfHash,
    }, "outputHash");
    requestBodies[role] = requestBody;
    responseBodies[role] = responseBody;
    outputs[role] = output;
    attemptReceipts[role] = attempt;
  }
  const completedItemMarker = withHash({
    schemaVersion: "CompletedItemCommitMarkerV1",
    designId: "MAIS-NATURAL-CA60-V3",
    registrationHash: authorization.registrationHash,
    sampleManifestHash: authorization.sampleManifestHash,
    referenceSealHash: expected.referenceSealHash,
    executionRegistrationHash,
    itemId: item.itemId,
    itemHash: item.itemHash,
    clusterId: item.clusterId,
    roleOrder: roles,
    attemptReceiptHashes: roles.map((role) => attemptReceipts[role].selfHash),
    outputHashes: roles.map((role) => outputs[role].outputHash),
    atomicWrite: true,
    fileMode: "0600",
  }, "markerHash");
  const itemResult = withHash({
    schemaVersion: "ItemEvaluationResultV1",
    designId: "MAIS-NATURAL-CA60-V3",
    registrationHash: authorization.registrationHash,
    sampleManifestHash: authorization.sampleManifestHash,
    referenceSealHash: expected.referenceSealHash,
    executionRegistrationHash,
    itemId: item.itemId,
    itemHash: item.itemHash,
    clusterId: item.clusterId,
    executionDisposition: "COMPLETE",
    referenceDisposition: "RESOLVED_NEGATIVE",
    machineSurfaceFinding: false,
    referenceFindings: [],
    machineFindings: [],
    finalReferenceLabelHash: referenceItemBundle.finalLabel.labelHash,
    attemptReceiptHashes: roles.map((role) => attemptReceipts[role].selfHash),
    completedItemCommitMarkerHash: completedItemMarker.markerHash,
  }, "itemResultHash");
  return {
    manifestRow: structuredClone(referenceItemBundle.manifestRow),
    itemLeaf: structuredClone(referenceItemBundle.itemLeaf),
    itemProjection: projection,
    referenceFinalLabel: structuredClone(referenceItemBundle.finalLabel),
    referenceItemSealSummary: {
      itemId: referenceItemBundle.seal.itemId,
      itemHash: referenceItemBundle.seal.itemHash,
      clusterId: referenceItemBundle.seal.clusterId,
      itemSealHash: referenceItemBundle.seal.sealHash,
      finalLabelHash: referenceItemBundle.seal.finalLabelHash,
      sealMode: referenceItemBundle.seal.sealMode,
      adjudicationAttemptReceiptHash: null,
    },
    selectedForC0,
    requestBodies,
    responseBodies,
    outputs,
    attemptReceipts,
    completedItemMarker,
    itemResult,
  };
}

export function buildFullFinalExecutionFixture(options = {}) {
  const sampleFixture = options.sampleFixture ?? null;
  const referenceExecutionBundle = buildGlobalReferenceExecutionFixture({
    sampleFixture,
    authorizationBindings: options.authorizationBindings,
  });
  const authorization = deepSeekAuthorization(referenceExecutionBundle, options.authorizationBindings);
  const executionBindings = options.executionRegistrationBindings ?? {};
  const executionRegistration = withHash({
    schemaVersion: "ExecutionRegistrationV1",
    designId: "MAIS-NATURAL-CA60-V3",
    registrationHash: authorization.registrationHash,
    frameRegistrationHash: authorization.frameRegistrationHash,
    samplingFrameHash: authorization.samplingFrameHash,
    sampleManifestHash: authorization.sampleManifestHash,
    referenceSealHash: referenceExecutionBundle.referenceSeal.sealHash,
    qwenAuthorizationHash: referenceExecutionBundle.authorization.authorizationHash,
    deepSeekAuthorizationHash: authorization.authorizationHash,
    runtimeConfigHash: authorization.runtimeConfigHash,
    promptSetHash: authorization.promptSetHash,
    schemaSetHash: authorization.schemaSetHash,
    runnerCommit: authorization.runnerCommit,
    runnerHash: authorization.runnerHash,
    adapterHash: authorization.adapterHash,
    c0RandomAuditSelectionHash: sampleFixture?.c0RandomAudit?.auditHash ?? hash("9"),
    thresholdHash: executionBindings.thresholdHash ?? hash("1"),
    taxonomyHash: executionBindings.taxonomyHash ?? hash("2"),
    labelSchemaHash: executionBindings.labelSchemaHash ?? hash("3"),
    adjudicationMethodHash: executionBindings.adjudicationMethodHash ?? hash("4"),
    severityRuleHash: executionBindings.severityRuleHash ?? hash("5"),
    statisticalPowerHash: executionBindings.statisticalPowerHash ?? hash("6"),
    designSupersedesHash: executionBindings.designSupersedesHash ?? hash("7"),
    frozenAt: "2026-08-25T06:07:00.000Z",
    registeredAt: "2026-08-25T06:07:00.000Z",
    firstProviderCallAt: "2026-08-25T06:10:00.000Z",
    providerEventCountBeforeRegistration: 0,
  }, "executionRegistrationHash");
  const executionRegistrationHash = executionRegistration.executionRegistrationHash;
  const expected = deepSeekAuthorizationExpected(authorization, referenceExecutionBundle.referenceSeal.sealHash, executionRegistrationHash);
  const state = { sequenceNumber: 0, previousReceiptHash: null, cumulativeCost: 0, attempts: [] };
  const randomC0ItemIds = sampleFixture
    ? new Set(sampleFixture.c0RandomAudit.selectedRows.map((row) => row.itemId))
    : new Set(referenceExecutionBundle.itemBundles.slice(0, 12).map((item) => item.manifestRow.itemId));
  const deepSeekItemBundles = referenceExecutionBundle.itemBundles.map((item) => makeDeepSeekItemBundle(item, randomC0ItemIds.has(item.manifestRow.itemId), authorization, expected, executionRegistrationHash, state));
  const c0Rows = deepSeekItemBundles.filter((item) => item.selectedForC0).map((item) => ({
    itemIdPseudonym: item.manifestRow.itemIdPseudonym,
    itemHash: item.manifestRow.itemHash,
    clusterId: item.manifestRow.clusterId,
    selectionReasonCodes: ["REGISTERED_RANDOM_AUDIT"],
  }));
  const c0ExecutionSet = withHash({
    schemaVersion: "C0ExecutionSetV1",
    designId: "MAIS-NATURAL-CA60-V3",
    registrationHash: authorization.registrationHash,
    sampleManifestHash: authorization.sampleManifestHash,
    executionRegistrationHash,
    registeredRandomAuditCount: 12,
    mandatoryItemCount: 0,
    uniqueC0ItemCount: 12,
    bPrimeSuccessfulCallCount: 120,
    c0SuccessfulCallCount: 60,
    expectedSuccessfulCallCount: 180,
    roleCallsPerC0Item: 5,
    c0Rows,
  }, "executionSetHash");
  const deviationEvidence = withHash({
    schemaVersion: "ExecutionDeviationEvidenceV1",
    designId: "MAIS-NATURAL-CA60-V3",
    registrationHash: authorization.registrationHash,
    executionRegistrationHash,
    materialDeviationRecords: [],
    postResultDesignDriftRecords: [],
    labelLeakageRecords: [],
    unauthorizedProviderCallRecords: [],
    terminalProviderFailureRecords: [],
  }, "deviationEvidenceHash");
  const itemResults = deepSeekItemBundles.map((item) => item.itemResult);
  const observed = deriveObservedEvaluationLedger(itemResults);
  const counterfactualLedger = deriveCounterfactualLedger(observed);
  const metricInputs = createMetricInputLedger(observed);
  const metricResults = recomputeMetricSet(observed, counterfactualLedger);
  const integrity = deriveExecutionIntegrity({
    ...observed.accounting,
    receiptChainValid: true,
    providerTupleValid: true,
    capsValid: true,
    terminalProviderFailure: false,
  });
  const conclusion = deriveOverallDecision({
    integrity,
    metrics: metricResults,
    materialDeviation: false,
    postResultDesignDrift: false,
    labelLeakage: false,
    unauthorizedProviderCall: false,
  });
  const qwenChainHash = calculateProviderAttemptChainHash(referenceExecutionBundle.attemptChain);
  const deepSeekChainHash = calculateProviderAttemptChainHash(state.attempts);
  const recomputedAttemptChainHash = sha256Hex(canonicalJson({ qwenChainHash, deepSeekChainHash }));
  const recomputedMatchingHash = sha256Hex(canonicalJson(observed.matchRecords));
  const recomputedMetricSetHash = sha256Hex(canonicalJson(metricResults));
  const completedItemMarkerRoot = sha256Hex(canonicalJson(deepSeekItemBundles.map((item) => [item.manifestRow.itemId, item.completedItemMarker.markerHash])));
  const providerAggregates = {
    QWEN: {
      requestedProvider: "ALIBABA_CLOUD_MODEL_STUDIO",
      requestedModel: "qwen3.8-max",
      observedProvider: "ALIBABA_CLOUD_MODEL_STUDIO",
      observedModel: "qwen3.8-max",
      attemptCount: referenceExecutionBundle.attemptChain.length,
      successfulCallCount: 240,
      retryCount: 0,
      totalTokens: referenceExecutionBundle.attemptChain.reduce((sum, attempt) => sum + attempt.totalTokens, 0),
      estimatedCost: referenceExecutionBundle.attemptChain.reduce((sum, attempt) => sum + attempt.estimatedCost, 0),
      totalLatencyMs: referenceExecutionBundle.attemptChain.reduce((sum, attempt) => sum + attempt.latencyMs, 0),
    },
    DEEPSEEK: {
      requestedProvider: "DEEPSEEK_DIRECT",
      requestedModel: "deepseek-v4-pro",
      observedProvider: "DEEPSEEK_DIRECT",
      observedModel: "deepseek-v4-pro",
      attemptCount: state.attempts.length,
      successfulCallCount: 180,
      retryCount: 0,
      totalTokens: state.attempts.reduce((sum, attempt) => sum + attempt.totalTokens, 0),
      estimatedCost: state.attempts.reduce((sum, attempt) => sum + attempt.estimatedCost, 0),
      totalLatencyMs: state.attempts.reduce((sum, attempt) => sum + attempt.latencyMs, 0),
    },
  };
  const providerAggregatesHash = sha256Hex(canonicalJson(providerAggregates));
  const finalReceipt = withHash({
    schemaVersion: "FinalEvaluationReceiptV1",
    designId: "MAIS-NATURAL-CA60-V3",
    registrationHash: observed.registrationHash,
    frameRegistrationHash: authorization.frameRegistrationHash,
    samplingFrameHash: authorization.samplingFrameHash,
    sampleManifestHash: observed.sampleManifestHash,
    referenceSealHash: observed.referenceSealHash,
    qwenAuthorizationHash: referenceExecutionBundle.authorization.authorizationHash,
    deepSeekAuthorizationHash: authorization.authorizationHash,
    executionRegistrationHash: observed.executionRegistrationHash,
    runtimeConfigHash: authorization.runtimeConfigHash,
    runnerHash: authorization.runnerHash,
    adapterHash: authorization.adapterHash,
    itemResultSetHash: observed.itemResultSetHash,
    counterfactualLedgerHash: counterfactualLedger.counterfactualLedgerHash,
    metricInputLedgerHash: metricInputs.metricInputLedgerHash,
    expectedSampleSize: 60,
    ...observed.accounting,
    unifiedNonresolvedItemCount: integrity.totalNonresolvedItemCount,
    confusionMatrix: observed.confusionMatrix,
    metricResults,
    completeAttemptReceiptCount: referenceExecutionBundle.attemptChain.length + state.attempts.length,
    receiptChainValid: true,
    providerTupleValid: true,
    capsValid: true,
    terminalProviderFailure: false,
    materialDeviation: false,
    postResultDesignDrift: false,
    labelLeakage: false,
    unauthorizedProviderCall: false,
    executionIntegrityStatus: integrity.status,
    policyRevisionRequired: conclusion === "POLICY_REVISION_REQUIRED_MACHINE_REFERENCE",
    structuralFeasibilityGatePassed: false,
    decisionCeiling: "INCONCLUSIVE_MACHINE_REFERENCE",
    claimCeiling: "CALIFORNIA_RUNTIME_EGRESS_ELIGIBLE_MACHINE_REFERENCE_PILOT_ONLY",
    conclusion,
    recomputedFrameHash: authorization.samplingFrameHash,
    recomputedSampleHash: authorization.sampleManifestHash,
    recomputedAttemptChainHash,
    recomputedMatchingHash,
    recomputedMetricSetHash,
    completedItemMarkerRoot,
    c0ExecutionSetHash: c0ExecutionSet.executionSetHash,
    deviationEvidenceHash: deviationEvidence.deviationEvidenceHash,
    providerAggregates,
    providerAggregatesHash,
    calculatedAt: "2026-08-25T07:00:00.000Z",
    finalFinishedAt: "2026-08-25T07:00:00.000Z",
    previousReceiptHash: null,
  }, "receiptHash");
  return {
    sampleFixture,
    finalReceipt,
    itemResults,
    counterfactualLedger,
    metricInputs,
    executionEvidence: {
      referenceExecutionBundle,
      deepSeekAuthorization: authorization,
      deepSeekAuthorizationExpected: expected,
      deepSeekAttemptChain: state.attempts,
      deepSeekItemBundles,
      c0ExecutionSet,
      executionRegistration,
      deviationEvidence,
    },
  };
}

test("global reference execution seal recomputes all 60 bundles, the full chain, call math, and agreement", () => {
  const bundle = buildGlobalReferenceExecutionFixture();
  assert.deepEqual(validateReferenceLabelSealExecutionBundle(bundle), []);
  assert.equal(bundle.referenceSeal.agreementStatistics.rawLabelAgreement, 1);
  assert.equal(bundle.referenceSeal.agreementStatistics.cohenKappa, null);
  assert.equal(bundle.referenceSeal.agreementStatistics.cohenKappaDegenerateReason, "SINGLE_CATEGORY_NO_CHANCE_VARIANCE");
  assert.equal(bundle.referenceSeal.agreementStatistics.gwetAc1, 1);
});

test("one failed transient Qwen attempt followed by success counts as an event and retry, not an extra success", () => {
  const fixture = buildGlobalReferenceExecutionFixture({ injectFirstTransientFailure: true });
  assert.equal(fixture.attemptChain.length, 241);
  assert.equal(fixture.referenceSeal.providerEventCountAtSeal, 241);
  assert.equal(fixture.referenceSeal.totalAttemptCount, 241);
  assert.equal(fixture.referenceSeal.retryAttemptCount, 1);
  assert.equal(fixture.referenceSeal.totalSuccessfulCallCount, 240);
  assert.deepEqual(validateReferenceLabelSealExecutionBundle(fixture), []);
});

test("global reference execution seal rejects fake summaries, extra best-of-N, and fabricated agreement", () => {
  const fakeSummary = buildGlobalReferenceExecutionFixture();
  fakeSummary.referenceSeal.itemSeals[0].itemSealHash = hash("f");
  fakeSummary.referenceSeal.itemSealRoot = calculateReferenceLabelSealRoot(fakeSummary.referenceSeal.itemSeals);
  withHash(fakeSummary.referenceSeal, "sealHash");
  assert.equal(validateReferenceLabelSealExecutionBundle(fakeSummary).some((error) => error.includes("item summary") || error.includes("item seal")), true);

  const extra = buildGlobalReferenceExecutionFixture();
  const source = extra.attemptChain.at(-1);
  const duplicate = structuredClone(source);
  duplicate.attemptId = "best-of-n-extra";
  duplicate.sequenceNumber += 1;
  duplicate.previousReceiptHash = source.selfHash;
  duplicate.startedAt = "2026-08-25T06:00:00.000Z";
  duplicate.finishedAt = "2026-08-25T06:00:01.000Z";
  duplicate.cumulativeCost += duplicate.estimatedCost;
  withHash(duplicate, "selfHash");
  extra.attemptChain.push(duplicate);
  extra.referenceSeal.attemptChainHash = calculateProviderAttemptChainHash(extra.attemptChain);
  extra.referenceSeal.totalAttemptCount += 1;
  extra.referenceSeal.totalSuccessfulCallCount += 1;
  extra.referenceSeal.providerEventCountAtSeal += 1;
  withHash(extra.referenceSeal, "sealHash");
  assert.equal(validateReferenceLabelSealExecutionBundle(extra).some((error) => error.includes("best-of-N") || error.includes("call graph") || error.includes("successful")), true);

  const fabricatedAgreement = buildGlobalReferenceExecutionFixture();
  fabricatedAgreement.referenceSeal.agreementStatistics.rawLabelAgreement = 0.5;
  withHash(fabricatedAgreement.referenceSeal, "sealHash");
  assert.equal(validateReferenceLabelSealExecutionBundle(fabricatedAgreement).some((error) => error.includes("agreement statistics")), true);
});

test("final execution validator recomputes 60 item results from sealed labels and the full DeepSeek call graph", () => {
  const bundle = buildFullFinalExecutionFixture();
  assert.deepEqual(validateFinalEvaluationBundle(bundle), []);
  assert.equal(bundle.finalReceipt.completeReceiptItemCount, 60);
  assert.equal(bundle.finalReceipt.completeAttemptReceiptCount, 420);
  assert.equal(bundle.finalReceipt.providerAggregates.DEEPSEEK.successfulCallCount, 180);
  assert.equal(bundle.finalReceipt.conclusion, "INCONCLUSIVE_MACHINE_REFERENCE");
});

test("full execution fixture composes the real frame, sample, and registered C0 roots without placeholders", () => {
  const sampleFixture = buildFullSampleContractFixture();
  const bundle = buildFullFinalExecutionFixture({ sampleFixture });
  assert.deepEqual(validateFinalEvaluationBundle(bundle), []);
  assert.equal(bundle.finalReceipt.registrationHash, sampleFixture.sampleManifest.registrationHash);
  assert.equal(bundle.finalReceipt.frameRegistrationHash, sampleFixture.frameRegistration.frameRegistrationHash);
  assert.equal(bundle.finalReceipt.samplingFrameHash, sampleFixture.frameRegistration.samplingFrameHash);
  assert.equal(bundle.finalReceipt.sampleManifestHash, sampleFixture.sampleManifest.sampleManifestHash);
  assert.equal(bundle.executionEvidence.executionRegistration.c0RandomAuditSelectionHash, sampleFixture.c0RandomAudit.auditHash);
  assert.deepEqual(
    bundle.executionEvidence.deepSeekItemBundles.filter((item) => item.selectedForC0).map((item) => item.manifestRow.itemId).sort(),
    sampleFixture.c0RandomAudit.selectedRows.map((row) => row.itemId).sort(),
  );
});

test("final execution validator rejects cross-item output mixing, invented flags, and aggregate drift", () => {
  const mixed = buildFullFinalExecutionFixture();
  mixed.executionEvidence.deepSeekItemBundles[0].outputs.B_PRIME_REVISION.itemHash = mixed.executionEvidence.deepSeekItemBundles[1].manifestRow.itemHash;
  withHash(mixed.executionEvidence.deepSeekItemBundles[0].outputs.B_PRIME_REVISION, "outputHash");
  assert.equal(validateFinalEvaluationBundle(mixed).some((error) => error.includes("item lineage") || error.includes("output")), true);

  const inventedLeakage = buildFullFinalExecutionFixture();
  inventedLeakage.finalReceipt.labelLeakage = true;
  withHash(inventedLeakage.finalReceipt, "receiptHash");
  assert.equal(validateFinalEvaluationBundle(inventedLeakage).some((error) => error.includes("deviation evidence") || error.includes("invalidation")), true);

  const fabricatedAggregate = buildFullFinalExecutionFixture();
  fabricatedAggregate.finalReceipt.providerAggregates.DEEPSEEK.totalTokens = 0;
  fabricatedAggregate.finalReceipt.providerAggregatesHash = sha256Hex(canonicalJson(fabricatedAggregate.finalReceipt.providerAggregates));
  withHash(fabricatedAggregate.finalReceipt, "receiptHash");
  assert.equal(validateFinalEvaluationBundle(fabricatedAggregate).some((error) => error.includes("provider aggregate") || error.includes("token")), true);
});
