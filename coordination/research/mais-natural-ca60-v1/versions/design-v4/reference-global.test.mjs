import assert from "node:assert/strict";
import test from "node:test";

import {
  buildFrozenProviderRequest,
  buildMissingReceiptItemBundleV1,
  buildProviderRequestEvidenceV4,
  buildProviderWireEvidenceV4,
  calculateArtifactHash,
  calculateFrozenNaturalItemLeafHashV3,
  calculateProviderAttemptChainHash,
  calculateReferenceLabelSealRoot,
  canonicalJson,
  deriveReferenceAgreementStatistics,
  createMetricInputLedger,
  deriveCounterfactualLedger,
  deriveBPrimeCritiqueArtifactV4,
  deriveC0ExecutionSetV4,
  deriveC0TriggerDecision,
  deriveExecutionIntegrity,
  deriveDeepSeekProviderInputV4,
  deriveFinalReceiptSummariesV4,
  deriveObservedEvaluationLedger,
  deriveQwenProviderInputV4,
  deriveOverallDecision,
  DEEPSEEK_EGRESS_ALLOWLIST,
  DEEPSEEK_ROLE_CONTRACTS,
  DEEPSEEK_ROLE_SET,
  EGRESS_DENYLIST,
  FROZEN_PUBLIC_LIMITATIONS_V4,
  FROZEN_PUBLIC_LIMITATIONS_V4_HASH,
  NON_AUTHORIZATIONS,
  providerRequestTemplateHash,
  QWEN_EGRESS_ALLOWLIST,
  QWEN_ROLE_CONTRACTS,
  QWEN_ROLE_SET,
  recomputeMetricSet,
  recomputeProviderAggregateV4,
  recomputeC0TriggerInputFromProtectedItemV4,
  reduceBPrimeCritiqueRevisionV4,
  SAMPLE_ITEM_PSEUDONYM_FORMULA_V4,
  sha256Hex,
  validateReferenceLabelSealExecutionBundle,
  validateFinalEvaluationBundle,
} from "./design-contract.mjs";
import {
  calculateManifestTupleRootV3,
  materializeSamplePseudonymFieldsV4,
  SAMPLE_ALGORITHM_VERSION,
} from "./sample-contract.mjs";
import { buildFullSampleContractFixture } from "./test-fixtures.mjs";

const hash = (character) => character.repeat(64);

function withHash(artifact, field) {
  artifact[field] = calculateArtifactHash(artifact, field);
  return artifact;
}

function providerResponseEnvelope(parsedPayload, suffix, model = "qwen3.8-max") {
  return {
    id: `chatcmpl-${suffix}`,
    model,
    choices: [{ index: 0, message: { role: "assistant", content: canonicalJson(parsedPayload) }, finish_reason: "stop" }],
    usage: {
      prompt_tokens: 100,
      completion_tokens: 50,
      completion_tokens_details: { reasoning_tokens: 25 },
      total_tokens: 150,
    },
    provider_extra: { retained: true },
  };
}

function exactProviderResponseBytes(responseBody) {
  return `${JSON.stringify(responseBody, null, 2)}\n`;
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
    designId: "MAIS-NATURAL-CA60-V4",
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
    providerRouteDecisionHash: bindings.providerRouteDecisionHash ?? hash("9"),
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
    isCurrentAuthorization: true,
    trustedOutOfBandRootsRequired: true,
    deepSeekRouteProbeAuthorizationHash: null,
    deepSeekRouteProbeReceiptHash: null,
    referenceSealHash: null,
    qwenAttemptChainHash: null,
    directBillingEvidenceHash: null,
    dataRegionEvidenceHash: null,
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
    trustedAuthorizationHash: authorization.authorizationHash,
    trustedPriceSnapshotHash: authorization.priceSnapshot.priceSnapshotHash,
    trustedOwnerGrantRootHash: authorization.ownerGrantHash,
    worstCasePerRequestReserve: { tokens: 16384, usd: 1 },
    at: "2026-08-25T05:20:00.000Z",
  };
}

function makeAttempt({ authorization, role, requestBody, responseBody, parsedOutput, item, state }) {
  state.sequenceNumber += 1;
  const inputTokens = 100;
  const outputTokens = 50;
  const reasoningTokens = 25;
  const estimatedCost = (inputTokens * authorization.priceSnapshot.inputRate + outputTokens * authorization.priceSnapshot.outputRate) / 1_000_000;
  state.cumulativeCost += estimatedCost;
  const startedAt = new Date(Date.parse("2026-08-25T05:11:00.000Z") + (state.sequenceNumber - 1) * 2_000).toISOString();
  const contract = QWEN_ROLE_CONTRACTS[role];
  const wireEvidence = buildProviderWireEvidenceV4({
    provider: "ALIBABA_CLOUD_MODEL_STUDIO",
    role,
    endpoint: authorization.endpoint,
    model: authorization.model,
    systemPrompt: contract.promptLiteral,
    userPayload: requestBody.input,
    responseSchema: contract.outputSchema,
    adapterTransformHash: authorization.adapterHash,
    rawWireResponseBytes: exactProviderResponseBytes(responseBody),
    parsedRolePayload: parsedOutput,
  });
  const parsedOutputHash = sha256Hex(canonicalJson(parsedOutput));
  const attempt = withHash({
    schemaVersion: "ProviderAttemptReceiptV1",
    designId: "MAIS-NATURAL-CA60-V4",
    runId: "run-reference-global-001",
    registrationHash: authorization.registrationHash,
    frameRegistrationHash: authorization.frameRegistrationHash,
    sampleManifestHash: authorization.sampleManifestHash,
    runtimeConfigHash: authorization.runtimeConfigHash,
    authorizationHash: authorization.authorizationHash,
    referenceSealHash: null,
    executionRegistrationHash: null,
    itemIdPseudonym: item.itemIdPseudonym,
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
    provider: "ALIBABA_CLOUD_MODEL_STUDIO",
    model: "qwen3.8-max",
    endpoint: "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
    requestBodyHash: wireEvidence.wireRequestBodyHash,
    responseBodyHash: wireEvidence.rawWireResponseHash,
    parsedOutputHash,
    logicalRequestHash: wireEvidence.logicalRequestHash,
    wireRequestBodyHash: wireEvidence.wireRequestBodyHash,
    rawWireResponseHash: wireEvidence.rawWireResponseHash,
    parsedProviderEnvelopeHash: wireEvidence.parsedProviderEnvelopeHash,
    extractedMessageContentHash: wireEvidence.extractedMessageContentHash,
    parsedRolePayloadHash: wireEvidence.parsedRolePayloadHash,
    providerUsageHash: wireEvidence.providerUsageHash,
    adapterTransformHash: wireEvidence.adapterTransformHash,
    dispatchState: "DISPATCHED",
    usageState: "PROVIDER_USAGE_RECONCILED",
    reservedTokens: 0,
    reservedUsd: 0,
    reconciliationReceiptHash: null,
    startedAt,
    finishedAt: new Date(Date.parse(startedAt) + 1_000).toISOString(),
    latencyMs: 1000,
    httpStatus: 200,
    providerRequestId: wireEvidence.providerResponseId,
    finishReason: wireEvidence.finishReason,
    parseStatus: "VALID",
    schemaStatus: "VALID",
    attemptStatus: "SUCCESS",
    inputTokens,
    outputTokens,
    reasoningTokens,
    totalTokens: inputTokens + outputTokens,
    rawUsage: structuredClone(wireEvidence.providerUsage),
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
  const contract = QWEN_ROLE_CONTRACTS[role];
  const placeholderPayload = { solution: "not-dispatched-placeholder", solvability: "UNCERTAIN", uncertain: true };
  const requestEvidence = buildProviderWireEvidenceV4({
    provider: "ALIBABA_CLOUD_MODEL_STUDIO",
    role,
    endpoint: authorization.endpoint,
    model: authorization.model,
    systemPrompt: contract.promptLiteral,
    userPayload: requestBody.input,
    responseSchema: contract.outputSchema,
    adapterTransformHash: authorization.adapterHash,
    rawWireResponseBytes: exactProviderResponseBytes(providerResponseEnvelope(placeholderPayload, "not-dispatched-placeholder")),
    parsedRolePayload: placeholderPayload,
  });
  const attempt = withHash({
    schemaVersion: "ProviderAttemptReceiptV1",
    designId: "MAIS-NATURAL-CA60-V4",
    runId: "run-reference-global-001",
    registrationHash: authorization.registrationHash,
    frameRegistrationHash: authorization.frameRegistrationHash,
    sampleManifestHash: authorization.sampleManifestHash,
    runtimeConfigHash: authorization.runtimeConfigHash,
    authorizationHash: authorization.authorizationHash,
    referenceSealHash: null,
    executionRegistrationHash: null,
    itemIdPseudonym: item.itemIdPseudonym,
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
    provider: "ALIBABA_CLOUD_MODEL_STUDIO",
    model: "qwen3.8-max",
    endpoint: "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
    requestBodyHash: requestEvidence.wireRequestBodyHash,
    responseBodyHash: null,
    parsedOutputHash: null,
    logicalRequestHash: requestEvidence.logicalRequestHash,
    wireRequestBodyHash: requestEvidence.wireRequestBodyHash,
    rawWireResponseHash: null,
    parsedProviderEnvelopeHash: null,
    extractedMessageContentHash: null,
    parsedRolePayloadHash: null,
    providerUsageHash: null,
    adapterTransformHash: authorization.adapterHash,
    dispatchState: "DISPATCHED",
    usageState: "USAGE_UNKNOWN_PENDING_PROVIDER_RECONCILIATION",
    reservedTokens: 16384,
    reservedUsd: 1,
    reconciliationReceiptHash: null,
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
    rawUsage: { promptTokens: 0, completionTokens: 0, reasoningTokens: 0, totalTokens: 0 },
    usageMappingVersion: "OPENAI_COMPAT_REASONING_INCLUDED_IN_COMPLETION_V1",
    costRateSnapshotHash: authorization.priceSnapshot.priceSnapshotHash,
    estimatedCost: 0,
    cumulativeCost: state.cumulativeCost,
    retryClassification: "TRANSIENT_RETRY_ALLOWED_ONLY_IF_REMAINING_CAP_COVERS_NEW_RESERVE",
    redactedError: "PROVIDER_TIMEOUT_REDACTED",
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

function presenceFromLeaf(itemLeaf, field) {
  if (!Object.hasOwn(itemLeaf, field)) return { presence: "MISSING" };
  if (itemLeaf[field] === null) return { presence: "NULL" };
  return { presence: "PRESENT", value: itemLeaf[field] };
}

function projectionFromLeaf(itemLeaf, sampleManifest) {
  const solveProjection = deriveQwenProviderInputV4({ role: "A_SOLVE", itemLeaf, sampleManifest });
  return {
    ...solveProjection,
    storedAnswer: presenceFromLeaf(itemLeaf, Object.hasOwn(itemLeaf, "storedAnswer") ? "storedAnswer" : "answer"),
    acceptedAnswers: presenceFromLeaf(itemLeaf, "acceptedAnswers"),
    explanation: presenceFromLeaf(itemLeaf, "explanation"),
  };
}

function frozenLeafFromSample(frameRow, selectedRow, index) {
  if (!frameRow || !selectedRow || frameRow.itemId !== selectedRow.itemId || frameRow.itemHash !== selectedRow.itemHash
    || frameRow.homologyClusterId !== selectedRow.clusterId) throw new TypeError("sample/frame item leaf binding mismatch");
  return {
    schemaVersion: "FrozenNaturalItemLeafV1",
    itemHashAlgorithm: "SAMPLING_FRAME_ITEM_CONTENT_V4_FULL_RUNTIME_LOCALIZED_BUNDLE",
    itemId: selectedRow.itemId,
    clusterId: frameRow.clusterId,
    homologyClusterId: selectedRow.clusterId,
    sourceCommit: frameRow.sourceCommit,
    sourceIds: frameRow.sourceIds,
    region: frameRow.region,
    curriculumProfile: frameRow.curriculumProfile,
    prompt: frameRow.prompt,
    options: frameRow.options,
    grade: frameRow.grade,
    topic: frameRow.topic,
    canonicalTopic: frameRow.canonicalTopic,
    responseForm: frameRow.responseForm,
    answer: frameRow.answer,
    storedAnswer: frameRow.storedAnswer,
    acceptedAnswers: frameRow.acceptedAnswers,
    explanation: frameRow.explanation,
    diagram: frameRow.diagram,
    questionAssets: frameRow.questionAssets,
    localePolicy: frameRow.localePolicy,
    rubric: frameRow.rubric,
    difficulty: frameRow.difficulty,
    sourceModuleHash: frameRow.sourceModuleHash,
    lineageKind: frameRow.lineageKind,
    batchId: frameRow.batchId,
    topicId: frameRow.topicId,
    generationTemplate: frameRow.generationTemplate,
    sourceLessonSlug: frameRow.sourceLessonSlug,
    fixtureOrdinal: index,
  };
}

function syntheticFrozenItemLeafV4(index) {
  const suffix = String(index + 1).padStart(3, "0");
  return {
    schemaVersion: "FrozenNaturalItemLeafV1",
    itemId: `item-${suffix}`,
    clusterId: `source-lineage-cluster-${suffix}`,
    homologyClusterId: `cluster-${suffix}`,
    region: "CALIFORNIA",
    curriculumProfile: "US_CA_MATH",
    sourceCommit: "a".repeat(40),
    sourceIds: ["california-math-common-core-skill"],
    prompt: { en: `What is ${index + 1} + 0?`, zh: `${index + 1} 加 0 是多少？`, zhHans: `${index + 1} 加 0 是多少？` },
    options: [String(index), String(index + 1), String(index + 2)]
      .map((option) => ({ en: option, zh: option, zhHans: option })),
    localePolicy: "FULL_RUNTIME_LOCALIZED_BUNDLE",
    grade: "P1",
    topic: { en: "addition", zh: "加法", zhHans: "加法" },
    canonicalTopic: "addition",
    responseForm: "multiple-choice",
    answer: String(index + 1),
    storedAnswer: String(index + 1),
    acceptedAnswers: [String(index + 1)],
    explanation: { en: "Adding zero preserves the number.", zh: "加零不改變原數。", zhHans: "加零不改变原数。" },
    diagram: null,
    questionAssets: [],
    rubric: "MAIS_NATURAL_CA60_QA_RUBRIC_V4",
    difficulty: "Low",
    sourceModuleHash: hash("7"),
    lineageKind: null,
    batchId: null,
    sourceLineageClusterId: null,
    topicId: null,
    generationTemplate: null,
    sourceLessonSlug: null,
  };
}

function buildSyntheticSampleManifestV4() {
  const selectedRows = Array.from({ length: 60 }, (_, index) => {
    const itemLeaf = syntheticFrozenItemLeafV4(index);
    return {
      itemId: itemLeaf.itemId,
      itemHash: calculateFrozenNaturalItemLeafHashV3(itemLeaf),
      clusterId: itemLeaf.homologyClusterId,
      stratum: `${itemLeaf.responseForm}::${itemLeaf.difficulty}`,
      responseForm: itemLeaf.responseForm,
      difficulty: itemLeaf.difficulty,
      selectionDigest: sha256Hex(canonicalJson([itemLeaf.itemId, itemLeaf.homologyClusterId])),
      clusterInclusionProbability: 1,
      representativeSelectionProbability: 1,
      itemInclusionProbability: 1,
      inclusionProbability: 1,
      analysisWeight: 1,
      secondaryAnalysisWeight: 1,
    };
  });
  return withHash(materializeSamplePseudonymFieldsV4({
    schemaVersion: "SampleManifestV2",
    designId: "MAIS-NATURAL-CA60-V4",
    registrationHash: hash("3"),
    frameRegistrationHash: hash("6"),
    manifestFrozenAt: "2026-08-25T05:00:00.000Z",
    sampleVersion: 1,
    supersedesSampleManifestHash: null,
    algorithmVersion: SAMPLE_ALGORITHM_VERSION,
    manifestTupleRootHash: calculateManifestTupleRootV3(selectedRows),
    stratumAllocations: [{
      stratum: "multiple-choice::Low",
      responseForm: "multiple-choice",
      difficulty: "Low",
      eligibleClusterCount: 60,
      executionEligibleClusterCount: 60,
      baseMinimumAllocation: 2,
      finalAllocation: 60,
    }],
    primaryAnalysisWeight: 1,
    secondaryWeightMethod: "INVERSE_INCLUSION_PROBABILITY_DESCRIPTIVE_WITH_KISH_EFFECTIVE_N",
    secondaryEstimand: "FROZEN_ELIGIBLE_HOMOLOGY_CLUSTER_REPRESENTATIVE_INVENTORY",
    secondaryWeightSummary: {
      itemCount: 60,
      sumWeights: 60,
      sumSquaredWeights: 60,
      kishEffectiveSampleSize: 60,
    },
    selectedRows,
  }), "sampleManifestHash");
}

function makeMergedItemBundle(index, authorization, state, sampleItem = null, behavior = {}) {
  const suffix = String(index + 1).padStart(3, "0");
  const itemLeaf = sampleItem?.itemLeaf
    ?? (sampleItem ? frozenLeafFromSample(sampleItem.frameRow, sampleItem.selectedRow, index) : syntheticFrozenItemLeafV4(index));
  const itemHash = calculateFrozenNaturalItemLeafHashV3(itemLeaf);
  const sampleManifest = sampleItem?.sampleManifest;
  if (!sampleManifest) throw new TypeError("reference item construction requires the complete authoritative sample manifest");
  const itemIdPseudonym = sampleItem.selectedRow.itemIdPseudonym;
  const item = {
    itemId: itemLeaf.itemId,
    itemHash,
    clusterId: itemLeaf.homologyClusterId,
    itemIdPseudonym,
  };
  if (sampleItem && item.itemHash !== sampleItem.selectedRow.itemHash) throw new TypeError("frozen item leaf hash does not match selected sample itemHash");
  const manifestRow = structuredClone(sampleItem.selectedRow);
  if (canonicalJson(item) !== canonicalJson(Object.fromEntries(["itemId", "itemHash", "clusterId", "itemIdPseudonym"].map((field) => [field, manifestRow[field]])))) {
    throw new TypeError("reference item does not equal the authoritative sample manifest row");
  }
  const itemProjection = projectionFromLeaf(itemLeaf, sampleManifest);
  const bundle = {
    itemLeaf,
    sampleManifest: structuredClone(sampleManifest),
    itemProjection,
    manifestRow,
    authorization,
    authorizationExpected: authorizationExpected(authorization),
    requestBodies: {},
    responseBodies: {},
    parsedOutputs: {},
    rawProviderOutputs: {},
    baseAttemptReceipts: {},
    wireEvidences: {},
  };
  for (const role of ["A_SOLVE", "A_LABEL", "B_SOLVE", "B_LABEL"]) {
    const contract = QWEN_ROLE_CONTRACTS[role];
    if (role.endsWith("_SOLVE")) {
      const solveOutput = { solution: `${role}-${suffix}-solution`, solvability: "SOLVABLE", uncertain: false };
      const requestBody = buildFrozenProviderRequest(role, deriveQwenProviderInputV4({ role, itemLeaf, sampleManifest }));
      const responseBody = providerResponseEnvelope(solveOutput, `${role.toLowerCase()}-${suffix}`);
      if (state.injectFirstTransientFailure === true && index === 0 && role === "A_SOLVE") {
        makeTransientFailureAttempt({ authorization, role, requestBody, item, state });
      }
      const attempt = makeAttempt({ authorization, role, requestBody, responseBody, parsedOutput: solveOutput, item, state });
      const solve = withHash({
        schemaVersion: "MachineReferenceSolveV1",
        designId: "MAIS-NATURAL-CA60-V4",
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
        parsedOutputHash: sha256Hex(canonicalJson(solveOutput)),
      }, "artifactHash");
      bundle[role === "A_SOLVE" ? "aSolve" : "bSolve"] = solve;
      bundle.requestBodies[role] = requestBody;
      bundle.responseBodies[role] = responseBody;
      bundle.parsedOutputs[role] = solveOutput;
      bundle.rawProviderOutputs[role] = solveOutput;
      bundle.baseAttemptReceipts[role] = attempt;
      bundle.wireEvidences[role] = buildProviderWireEvidenceV4({ provider: "ALIBABA_CLOUD_MODEL_STUDIO", role, endpoint: authorization.endpoint, model: authorization.model, systemPrompt: contract.promptLiteral, userPayload: requestBody.input, responseSchema: contract.outputSchema, adapterTransformHash: authorization.adapterHash, rawWireResponseBytes: exactProviderResponseBytes(responseBody), parsedRolePayload: solveOutput });
    } else {
      const ownSolve = role === "A_LABEL" ? bundle.aSolve : bundle.bSolve;
      const finding = {
        findingId: `p1-${suffix}`,
        evidenceLocator: "acceptedAnswers",
        code: "EQUIVALENT_ANSWER_NOT_ACCEPTED",
        family: "RESPONSE_ACCEPTANCE",
        severity: "P1",
      };
      const ordinaryParsedOutput = behavior.p1Agreement === true || behavior.adjudicatorUndecided === true ? {
        rawLabel: "DEFECT",
        rawTaxonomyCodes: ["EQUIVALENT_ANSWER_NOT_ACCEPTED"],
        rawSeverity: "P1",
        rawFindingFamilies: { EQUIVALENT_ANSWER_NOT_ACCEPTED: "RESPONSE_ACCEPTANCE" },
        rawFindings: [finding],
        rawUncertain: false,
      } : {
        rawLabel: "NO_FINDING",
        rawTaxonomyCodes: ["NO_FINDING"],
        rawSeverity: "NONE",
        rawFindingFamilies: { NO_FINDING: null },
        rawFindings: [],
        rawUncertain: false,
      };
      const rawProviderOutput = behavior.unknownTaxonomy === true ? {
        rawLabel: "DEFECT",
        rawTaxonomyCodes: ["FUTURE_UNKNOWN_CODE"],
        rawSeverity: "P0",
        rawFindingFamilies: { FUTURE_UNKNOWN_CODE: "UNKNOWN_FAMILY" },
        rawFindings: [],
        rawUncertain: false,
      } : ordinaryParsedOutput;
      const parsedOutput = behavior.unknownTaxonomy === true ? {
        rawLabel: "UNRESOLVED_REFERENCE",
        rawTaxonomyCodes: ["SCHEMA_GAP"],
        rawSeverity: "UNRESOLVED",
        rawFindingFamilies: { SCHEMA_GAP: null },
        rawFindings: [],
        rawUncertain: false,
      } : ordinaryParsedOutput;
      const input = deriveQwenProviderInputV4({
        role,
        itemLeaf,
        sampleManifest,
        localArtifacts: role === "A_LABEL" ? { aSolve: ownSolve } : { bSolve: ownSolve },
      });
      const requestBody = buildFrozenProviderRequest(role, input);
      const responseBody = providerResponseEnvelope(rawProviderOutput, `${role.toLowerCase()}-${suffix}`);
      const attempt = makeAttempt({ authorization, role, requestBody, responseBody, parsedOutput: rawProviderOutput, item, state });
      const label = withHash({
        schemaVersion: "MachineReferenceLabelV1",
        designId: "MAIS-NATURAL-CA60-V4",
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
        parsedOutputHash: sha256Hex(canonicalJson(parsedOutput)),
        deepSeekOutputNotSeen: true,
      }, "labelHash");
      bundle[role === "A_LABEL" ? "aLabel" : "bLabel"] = label;
      bundle.requestBodies[role] = requestBody;
      bundle.responseBodies[role] = responseBody;
      bundle.parsedOutputs[role] = parsedOutput;
      bundle.rawProviderOutputs[role] = rawProviderOutput;
      bundle.baseAttemptReceipts[role] = attempt;
      bundle.wireEvidences[role] = buildProviderWireEvidenceV4({ provider: "ALIBABA_CLOUD_MODEL_STUDIO", role, endpoint: authorization.endpoint, model: authorization.model, systemPrompt: contract.promptLiteral, userPayload: requestBody.input, responseSchema: contract.outputSchema, adapterTransformHash: authorization.adapterHash, rawWireResponseBytes: exactProviderResponseBytes(responseBody), parsedRolePayload: rawProviderOutput });
    }
  }
  const triggered = behavior.p1Agreement === true || behavior.unknownTaxonomy === true || behavior.adjudicatorUndecided === true;
  const finalUnresolved = behavior.unknownTaxonomy === true || behavior.adjudicatorUndecided === true;
  const finalCodes = finalUnresolved ? ["SCHEMA_GAP"] : triggered ? ["EQUIVALENT_ANSWER_NOT_ACCEPTED"] : ["NO_FINDING"];
  const finalFindings = finalUnresolved || !triggered ? [] : [{
    findingId: `adjudicated-p1-${suffix}`,
    evidenceLocator: "acceptedAnswers",
    code: "EQUIVALENT_ANSWER_NOT_ACCEPTED",
    family: "RESPONSE_ACCEPTANCE",
    severity: "P1",
  }];
  const adjudicationReasonCodes = behavior.unknownTaxonomy === true ? ["ANY_SCHEMA_GAP"] : triggered ? ["ANY_RATER_P1"] : [];
  let adjudicationAttempt = null;
  let adjudicationParsedOutput = null;
  if (triggered) {
    const contract = QWEN_ROLE_CONTRACTS.ADJUDICATOR;
    const input = deriveQwenProviderInputV4({
      role: "ADJUDICATOR",
      itemLeaf,
      sampleManifest,
      localArtifacts: { aSolve: bundle.aSolve, aLabel: bundle.aLabel, bSolve: bundle.bSolve, bLabel: bundle.bLabel },
    });
    const requestBody = buildFrozenProviderRequest("ADJUDICATOR", input);
    adjudicationParsedOutput = {
      finalLabel: finalUnresolved ? "UNRESOLVED_REFERENCE" : "DEFECT",
      finalTaxonomyCodes: finalCodes,
      finalSeverity: finalUnresolved ? "UNRESOLVED" : "P1",
      finalFindingFamilies: finalUnresolved ? { SCHEMA_GAP: null } : { EQUIVALENT_ANSWER_NOT_ACCEPTED: "RESPONSE_ACCEPTANCE" },
      finalFindings,
      adjudicationReasonCodes,
    };
    const responseBody = providerResponseEnvelope(adjudicationParsedOutput, `adjudicator-${suffix}`);
    adjudicationAttempt = makeAttempt({ authorization, role: "ADJUDICATOR", requestBody, responseBody, parsedOutput: adjudicationParsedOutput, item, state });
    bundle.adjudicationRequestBody = requestBody;
    bundle.adjudicationResponseBody = responseBody;
    bundle.adjudicationParsedOutput = adjudicationParsedOutput;
    bundle.adjudicationAttemptReceipt = adjudicationAttempt;
    bundle.wireEvidences.ADJUDICATOR = buildProviderWireEvidenceV4({ provider: "ALIBABA_CLOUD_MODEL_STUDIO", role: "ADJUDICATOR", endpoint: authorization.endpoint, model: authorization.model, systemPrompt: contract.promptLiteral, userPayload: requestBody.input, responseSchema: contract.outputSchema, adapterTransformHash: authorization.adapterHash, rawWireResponseBytes: exactProviderResponseBytes(responseBody), parsedRolePayload: adjudicationParsedOutput });
  }
  bundle.finalLabel = withHash({
    schemaVersion: "MachineReferenceLabelV1",
    designId: "MAIS-NATURAL-CA60-V4",
    registrationHash: authorization.registrationHash,
    sampleManifestHash: authorization.sampleManifestHash,
    clusterId: item.clusterId,
    itemId: item.itemId,
    itemHash: item.itemHash,
    labelStage: triggered ? "FINAL_ADJUDICATED" : "FINAL_AGREEMENT_MERGE",
    finalizationMode: triggered ? "FINAL_ADJUDICATED" : "FINAL_AGREEMENT_MERGE",
    role: triggered ? "ADJUDICATOR" : "DETERMINISTIC_MERGER",
    providerCall: triggered,
    rawLabelHashes: [bundle.aLabel.labelHash, bundle.bLabel.labelHash],
    finalLabel: finalUnresolved ? "UNRESOLVED_REFERENCE" : triggered ? "DEFECT" : "NO_FINDING",
    finalTaxonomyCodes: finalCodes,
    finalSeverity: finalUnresolved ? "UNRESOLVED" : triggered ? "P1" : "NONE",
    finalFindingFamilies: finalUnresolved ? { SCHEMA_GAP: null } : triggered ? { EQUIVALENT_ANSWER_NOT_ACCEPTED: "RESPONSE_ACCEPTANCE" } : { NO_FINDING: null },
    finalFindings,
    acceptedCodeSets: finalUnresolved || !triggered ? [] : [{ primaryCode: "EQUIVALENT_ANSWER_NOT_ACCEPTED", family: "RESPONSE_ACCEPTANCE", acceptedCodes: ["EQUIVALENT_ANSWER_NOT_ACCEPTED"] }],
    disagreementStatus: finalUnresolved ? "ADJUDICATOR_UNDECIDED" : triggered ? "TRIGGERED_AGREEMENT" : "AGREEMENT",
    adjudicationReasonCodes,
    disagreementAdjudicationReceiptHash: adjudicationAttempt?.selfHash ?? null,
    ...(triggered ? {
      promptLiteral: QWEN_ROLE_CONTRACTS.ADJUDICATOR.promptLiteral,
      promptHash: QWEN_ROLE_CONTRACTS.ADJUDICATOR.promptHash,
      schemaHash: QWEN_ROLE_CONTRACTS.ADJUDICATOR.schemaHash,
      inputFieldNames: [...QWEN_ROLE_CONTRACTS.ADJUDICATOR.inputFieldNames],
      parsedOutputHash: sha256Hex(canonicalJson(adjudicationParsedOutput)),
    } : {}),
  }, "labelHash");
  bundle.seal = withHash({
    schemaVersion: "ItemReferenceLabelSealV1",
    designId: "MAIS-NATURAL-CA60-V4",
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
    sealMode: triggered ? "FINAL_ADJUDICATED" : "FINAL_AGREEMENT_MERGE",
    finalizationMode: triggered ? "FINAL_ADJUDICATED" : "FINAL_AGREEMENT_MERGE",
    adjudicationAttemptReceiptHash: adjudicationAttempt?.selfHash ?? null,
  }, "sealHash");
  bundle.attemptChain = ["A_SOLVE", "A_LABEL", "B_SOLVE", "B_LABEL"].map((role) => bundle.baseAttemptReceipts[role]);
  if (adjudicationAttempt) bundle.attemptChain.push(adjudicationAttempt);
  return bundle;
}

export function buildGlobalReferenceExecutionFixture(options = {}) {
  const sampleFixture = options.sampleFixture ?? null;
  const sampleManifest = sampleFixture?.sampleManifest ?? buildSyntheticSampleManifestV4();
  const authorization = qwenAuthorization({
    registrationHash: sampleManifest.registrationHash,
    frameRegistrationHash: sampleFixture?.frameRegistration.frameRegistrationHash ?? sampleManifest.frameRegistrationHash,
    samplingFrameHash: sampleFixture?.frameRegistration.samplingFrameHash ?? hash("2"),
    sampleManifestHash: sampleManifest.sampleManifestHash,
    runtimeConfigHash: sampleFixture?.frameRegistration.runtimeConfigHash ?? hash("7"),
    ...options.authorizationBindings,
  });
  const state = { sequenceNumber: 0, previousReceiptHash: null, cumulativeCost: 0, attempts: [], injectFirstTransientFailure: options.injectFirstTransientFailure === true };
  const selectedRows = [...sampleManifest.selectedRows]
    .sort((left, right) => left.itemId < right.itemId ? -1 : left.itemId > right.itemId ? 1 : 0);
  const itemBundles = selectedRows.map((selectedRow, index) => makeMergedItemBundle(index, authorization, state, {
    selectedRow,
    frameRow: sampleFixture?.frameRows.find((row) => row.itemId === selectedRow.itemId),
    itemLeaf: sampleFixture ? undefined : syntheticFrozenItemLeafV4(index),
    sampleManifest,
  }, index === 0 ? {
    p1Agreement: options.p1Agreement === true,
    unknownTaxonomy: options.unknownTaxonomy === true,
    adjudicatorUndecided: options.adjudicatorUndecided === true,
  } : {}));
  const itemSeals = itemBundles.map((bundle) => ({
    itemId: bundle.seal.itemId,
    itemHash: bundle.seal.itemHash,
    clusterId: bundle.seal.clusterId,
    itemSealHash: bundle.seal.sealHash,
    finalLabelHash: bundle.seal.finalLabelHash,
    sealMode: bundle.seal.sealMode,
    adjudicationAttemptReceiptHash: bundle.seal.adjudicationAttemptReceiptHash,
  }));
  const agreementStatistics = deriveReferenceAgreementStatistics(itemBundles);
  const adjudicationSuccessfulCallCount = itemBundles.filter((bundle) => bundle.seal.sealMode === "FINAL_ADJUDICATED").length;
  const totalSuccessfulCallCount = 240 + adjudicationSuccessfulCallCount;
  const referenceSeal = withHash({
    schemaVersion: "ReferenceLabelSealV1",
    designId: "MAIS-NATURAL-CA60-V4",
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
    adjudicationSuccessfulCallCount,
    totalSuccessfulCallCount,
    retryAttemptCount: state.attempts.length - totalSuccessfulCallCount,
    adjudicationRate: adjudicationSuccessfulCallCount / 60,
    agreementStatistics,
    labelSourceType: "machine_reference_panel",
    humanGold: false,
    sameModelCorrelatedErrorRisk: true,
    referenceLabelsFrozenAt: "2026-08-25T06:00:00.000Z",
    providerEventCountAtSeal: state.attempts.length,
  }, "sealHash");
  return {
    sampleManifest: structuredClone(sampleManifest),
    referenceSeal,
    itemBundles,
    attemptChain: state.attempts,
    authorization,
    authorizationExpected: authorizationExpected(authorization),
  };
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
    designId: "MAIS-NATURAL-CA60-V4",
    registrationHash: referenceExecutionBundle.referenceSeal.registrationHash,
    frameRegistrationHash: referenceExecutionBundle.referenceSeal.frameRegistrationHash,
    samplingFrameHash: referenceExecutionBundle.authorization.samplingFrameHash,
    sampleManifestHash: referenceExecutionBundle.referenceSeal.sampleManifestHash,
    referenceSealHash: referenceExecutionBundle.referenceSeal.sealHash,
    runtimeConfigHash: referenceExecutionBundle.authorization.runtimeConfigHash,
    promptSetHash: bindings.promptSetHash ?? referenceExecutionBundle.authorization.promptSetHash,
    schemaSetHash: bindings.schemaSetHash ?? referenceExecutionBundle.authorization.schemaSetHash,
    runnerCommit: bindings.runnerCommit ?? referenceExecutionBundle.authorization.runnerCommit,
    runnerHash: bindings.runnerHash ?? referenceExecutionBundle.authorization.runnerHash,
    adapterHash: bindings.adapterHash ?? referenceExecutionBundle.authorization.adapterHash,
    providerRouteDecisionHash: bindings.providerRouteDecisionHash ?? hash("7"),
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
    isCurrentAuthorization: true,
    trustedOutOfBandRootsRequired: true,
    deepSeekRouteProbeAuthorizationHash: hash("a"),
    deepSeekRouteProbeReceiptHash: hash("b"),
    qwenAttemptChainHash: calculateProviderAttemptChainHash(referenceExecutionBundle.attemptChain),
    directBillingEvidenceHash: hash("c"),
    dataRegionEvidenceHash: hash("d"),
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

function makeDeepSeekAttempt({ authorization, referenceSealHash, executionRegistrationHash, role, requestBody, responseBody, parsedPayload, item, state }) {
  state.sequenceNumber += 1;
  const inputTokens = 100;
  const outputTokens = 50;
  const reasoningTokens = 25;
  const estimatedCost = (inputTokens * authorization.priceSnapshot.inputRate + outputTokens * authorization.priceSnapshot.outputRate) / 1_000_000;
  state.cumulativeCost += estimatedCost;
  const startedAt = new Date(Date.parse("2026-08-25T06:10:00.000Z") + (state.sequenceNumber - 1) * 2_000).toISOString();
  const contract = DEEPSEEK_ROLE_CONTRACTS[role];
  const wireEvidence = buildProviderWireEvidenceV4({
    provider: "DEEPSEEK_DIRECT",
    role,
    endpoint: authorization.endpoint,
    model: authorization.model,
    systemPrompt: contract.promptLiteral,
    userPayload: requestBody.input,
    responseSchema: contract.outputSchema,
    adapterTransformHash: authorization.adapterHash,
    rawWireResponseBytes: exactProviderResponseBytes(responseBody),
    parsedRolePayload: parsedPayload,
  });
  const parsedOutputHash = sha256Hex(canonicalJson(parsedPayload));
  const attempt = withHash({
    schemaVersion: "ProviderAttemptReceiptV1",
    designId: "MAIS-NATURAL-CA60-V4",
    runId: "run-deepseek-global-001",
    registrationHash: authorization.registrationHash,
    frameRegistrationHash: authorization.frameRegistrationHash,
    sampleManifestHash: authorization.sampleManifestHash,
    runtimeConfigHash: authorization.runtimeConfigHash,
    authorizationHash: authorization.authorizationHash,
    referenceSealHash,
    executionRegistrationHash,
    itemIdPseudonym: item.itemIdPseudonym,
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
    provider: "DEEPSEEK_DIRECT",
    model: "deepseek-v4-pro",
    endpoint: "https://api.deepseek.com/chat/completions",
    requestBodyHash: wireEvidence.wireRequestBodyHash,
    responseBodyHash: wireEvidence.rawWireResponseHash,
    parsedOutputHash,
    logicalRequestHash: wireEvidence.logicalRequestHash,
    wireRequestBodyHash: wireEvidence.wireRequestBodyHash,
    rawWireResponseHash: wireEvidence.rawWireResponseHash,
    parsedProviderEnvelopeHash: wireEvidence.parsedProviderEnvelopeHash,
    extractedMessageContentHash: wireEvidence.extractedMessageContentHash,
    parsedRolePayloadHash: wireEvidence.parsedRolePayloadHash,
    providerUsageHash: wireEvidence.providerUsageHash,
    adapterTransformHash: wireEvidence.adapterTransformHash,
    dispatchState: "DISPATCHED",
    usageState: "PROVIDER_USAGE_RECONCILED",
    reservedTokens: 0,
    reservedUsd: 0,
    reconciliationReceiptHash: null,
    startedAt,
    finishedAt: new Date(Date.parse(startedAt) + 1_000).toISOString(),
    latencyMs: 1000,
    httpStatus: 200,
    providerRequestId: wireEvidence.providerResponseId,
    finishReason: wireEvidence.finishReason,
    parseStatus: "VALID",
    schemaStatus: "VALID",
    attemptStatus: "SUCCESS",
    inputTokens,
    outputTokens,
    reasoningTokens,
    totalTokens: inputTokens + outputTokens,
    rawUsage: structuredClone(wireEvidence.providerUsage),
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

function makeDeepSeekTerminalFailureAttempt({ authorization, referenceSealHash, executionRegistrationHash, role, requestBody, item, state, attemptStatus }) {
  if (!["TIMEOUT", "SCHEMA_FAILURE", "CAP_BLOCKED_BEFORE_REQUEST"].includes(attemptStatus)) {
    throw new TypeError("unsupported fixture terminal attempt status");
  }
  state.sequenceNumber += 1;
  const startedAt = new Date(Date.parse("2026-08-25T06:10:00.000Z") + (state.sequenceNumber - 1) * 2_000).toISOString();
  const contract = DEEPSEEK_ROLE_CONTRACTS[role];
  const requestEvidence = buildProviderRequestEvidenceV4({
    provider: "DEEPSEEK_DIRECT",
    role,
    endpoint: authorization.endpoint,
    model: authorization.model,
    systemPrompt: contract.promptLiteral,
    userPayload: requestBody.input,
    responseSchema: contract.outputSchema,
    adapterTransformHash: authorization.adapterHash,
  });
  const schemaFailure = attemptStatus === "SCHEMA_FAILURE";
  const capBlocked = attemptStatus === "CAP_BLOCKED_BEFORE_REQUEST";
  const inputTokens = schemaFailure ? 100 : 0;
  const outputTokens = schemaFailure ? 50 : 0;
  const reasoningTokens = schemaFailure ? 25 : 0;
  const totalTokens = inputTokens + outputTokens;
  const rawUsage = { promptTokens: inputTokens, completionTokens: outputTokens, reasoningTokens, totalTokens };
  const estimatedCost = schemaFailure
    ? (inputTokens * authorization.priceSnapshot.inputRate + outputTokens * authorization.priceSnapshot.outputRate) / 1_000_000
    : 0;
  state.cumulativeCost += estimatedCost;
  const rawWireResponseHash = schemaFailure ? sha256Hex(`schema-failure-raw:${item.itemHash}:${role}:${state.sequenceNumber}`) : null;
  const parsedProviderEnvelopeHash = schemaFailure ? sha256Hex(`schema-failure-envelope:${item.itemHash}:${role}:${state.sequenceNumber}`) : null;
  const extractedMessageContentHash = schemaFailure ? sha256Hex(`schema-failure-content:${item.itemHash}:${role}:${state.sequenceNumber}`) : null;
  const parsedRolePayloadHash = schemaFailure ? sha256Hex(`schema-failure-payload:${item.itemHash}:${role}:${state.sequenceNumber}`) : null;
  const attempt = withHash({
    schemaVersion: "ProviderAttemptReceiptV1",
    designId: "MAIS-NATURAL-CA60-V4",
    runId: "run-deepseek-global-001",
    registrationHash: authorization.registrationHash,
    frameRegistrationHash: authorization.frameRegistrationHash,
    sampleManifestHash: authorization.sampleManifestHash,
    runtimeConfigHash: authorization.runtimeConfigHash,
    authorizationHash: authorization.authorizationHash,
    referenceSealHash,
    executionRegistrationHash,
    itemIdPseudonym: item.itemIdPseudonym,
    itemHash: item.itemHash,
    clusterId: item.clusterId,
    role,
    attemptId: `deepseek-attempt-${String(state.sequenceNumber).padStart(3, "0")}`,
    sequenceNumber: state.sequenceNumber,
    requestedProvider: "DEEPSEEK_DIRECT",
    observedProvider: schemaFailure ? "DEEPSEEK_DIRECT" : null,
    requestedModel: "deepseek-v4-pro",
    observedModel: schemaFailure ? "deepseek-v4-pro" : null,
    requestedEndpoint: "https://api.deepseek.com/chat/completions",
    observedEndpointHostname: schemaFailure ? "api.deepseek.com" : null,
    provider: "DEEPSEEK_DIRECT",
    model: "deepseek-v4-pro",
    endpoint: "https://api.deepseek.com/chat/completions",
    requestBodyHash: capBlocked ? null : requestEvidence.wireRequestBodyHash,
    responseBodyHash: rawWireResponseHash,
    parsedOutputHash: parsedRolePayloadHash,
    logicalRequestHash: requestEvidence.logicalRequestHash,
    wireRequestBodyHash: requestEvidence.wireRequestBodyHash,
    rawWireResponseHash,
    parsedProviderEnvelopeHash,
    extractedMessageContentHash,
    parsedRolePayloadHash,
    providerUsageHash: schemaFailure ? sha256Hex(canonicalJson(rawUsage)) : null,
    adapterTransformHash: requestEvidence.logicalRequest.adapterTransformHash,
    dispatchState: capBlocked ? "NOT_DISPATCHED" : "DISPATCHED",
    usageState: schemaFailure ? "PROVIDER_USAGE_RECONCILED" : capBlocked ? "ZERO_COST_PRE_DISPATCH" : "USAGE_UNKNOWN_PENDING_PROVIDER_RECONCILIATION",
    reservedTokens: capBlocked || schemaFailure ? 0 : 16384,
    reservedUsd: capBlocked || schemaFailure ? 0 : 1,
    reconciliationReceiptHash: null,
    startedAt,
    finishedAt: new Date(Date.parse(startedAt) + 1_000).toISOString(),
    latencyMs: 1000,
    httpStatus: schemaFailure ? 200 : null,
    providerRequestId: schemaFailure ? `schema-failure-${state.sequenceNumber}` : null,
    finishReason: schemaFailure ? "stop" : null,
    parseStatus: schemaFailure ? "VALID" : "NOT_ATTEMPTED",
    schemaStatus: schemaFailure ? "INVALID" : "NOT_ATTEMPTED",
    attemptStatus,
    inputTokens,
    outputTokens,
    reasoningTokens,
    totalTokens,
    rawUsage,
    usageMappingVersion: "OPENAI_COMPAT_REASONING_INCLUDED_IN_COMPLETION_V1",
    costRateSnapshotHash: authorization.priceSnapshot.priceSnapshotHash,
    estimatedCost,
    cumulativeCost: state.cumulativeCost,
    retryClassification: schemaFailure ? "SCHEMA_RETRY_ALLOWED" : capBlocked ? "CAP_BLOCKED" : "TRANSIENT_RETRY_ALLOWED_ONLY_IF_REMAINING_CAP_COVERS_NEW_RESERVE",
    redactedError: schemaFailure ? "SCHEMA_VALIDATION_FAILURE_REDACTED" : capBlocked ? "LOCAL_PREFLIGHT_REJECTION_REDACTED" : "PROVIDER_TIMEOUT_REDACTED",
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
  return deriveDeepSeekProviderInputV4({
    role: "B_PRIME_CRITIQUE",
    itemLeaf: referenceItemBundle.itemLeaf,
    sampleManifest: referenceItemBundle.sampleManifest,
  });
}

function makeDeepSeekItemBundle(referenceItemBundle, selectedForC0, authorization, expected, executionRegistrationHash, state, machineUnresolved = false, terminalFailurePlan = null) {
  const projection = deepSeekProjection(referenceItemBundle);
  const item = referenceItemBundle.manifestRow;
  const roles = ["B_PRIME_CRITIQUE", "B_PRIME_REVISION", ...(selectedForC0 ? ["C0_PRIME_ROLE_1", "C0_PRIME_ROLE_2", "C0_PRIME_ROLE_3", "C0_PRIME_ROLE_4", "C0_PRIME_ROLE_5"] : [])];
  const requestBodies = {};
  const responseBodies = {};
  const outputs = {};
  const attemptReceipts = {};
  const wireEvidences = {};
  for (const role of roles) {
    const contract = DEEPSEEK_ROLE_CONTRACTS[role];
    const critiqueArtifact = role === "B_PRIME_REVISION" ? deriveBPrimeCritiqueArtifactV4(outputs.B_PRIME_CRITIQUE) : null;
    const parsedPayload = role === "B_PRIME_CRITIQUE"
      ? { valid: true, surfaceDisposition: machineUnresolved ? "UNASSESSABLE" : "NO_FINDING", findings: [], requiredRevisionCodes: [] }
      : role === "B_PRIME_REVISION"
        ? { valid: true, surfaceDisposition: "NO_FINDING", findings: [], critiqueArtifactHash: critiqueArtifact.critiqueArtifactHash, resolutions: [] }
        : { valid: true, surfaceDisposition: "NO_FINDING", findings: [] };
    const roleProjection = deriveDeepSeekProviderInputV4({
      role,
      itemLeaf: referenceItemBundle.itemLeaf,
      sampleManifest: referenceItemBundle.sampleManifest,
      ...(role === "B_PRIME_REVISION" ? { bPrimeCritiqueArtifact: critiqueArtifact } : {}),
    });
    const requestBody = buildFrozenProviderRequest(role, roleProjection);
    if (role === terminalFailurePlan?.role) {
      for (let attemptIndex = 0; attemptIndex < terminalFailurePlan.attemptCount; attemptIndex += 1) {
        makeDeepSeekTerminalFailureAttempt({
          authorization,
          referenceSealHash: expected.referenceSealHash,
          executionRegistrationHash,
          role,
          requestBody,
          item,
          state,
          attemptStatus: terminalFailurePlan.attemptStatus,
        });
      }
      break;
    }
    const responseBody = providerResponseEnvelope(parsedPayload, `${role.toLowerCase()}-${item.itemIdPseudonym}`, "deepseek-v4-pro");
    const wireEvidence = buildProviderWireEvidenceV4({
      provider: "DEEPSEEK_DIRECT",
      role,
      endpoint: authorization.endpoint,
      model: authorization.model,
      systemPrompt: contract.promptLiteral,
      userPayload: requestBody.input,
      responseSchema: contract.outputSchema,
      adapterTransformHash: authorization.adapterHash,
      rawWireResponseBytes: exactProviderResponseBytes(responseBody),
      parsedRolePayload: parsedPayload,
    });
    const attempt = makeDeepSeekAttempt({
      authorization,
      referenceSealHash: expected.referenceSealHash,
      executionRegistrationHash,
      role,
      requestBody,
      responseBody,
      parsedPayload,
      item,
      state,
    });
    const output = withHash({
      schemaVersion: "DeepSeekRoleOutputV1",
      designId: "MAIS-NATURAL-CA60-V4",
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
      parsedOutputHash: sha256Hex(canonicalJson(parsedPayload)),
      attemptReceiptHash: attempt.selfHash,
    }, "outputHash");
    requestBodies[role] = requestBody;
    responseBodies[role] = responseBody;
    outputs[role] = output;
    attemptReceipts[role] = attempt;
    wireEvidences[role] = wireEvidence;
  }
  const critiqueForReducer = {
    itemHash: item.itemHash,
    critiqueHash: deriveBPrimeCritiqueArtifactV4(outputs.B_PRIME_CRITIQUE).critiqueArtifactHash,
    findings: outputs.B_PRIME_CRITIQUE.parsedPayload.findings,
  };
  const revisionForReducer = {
    itemHash: item.itemHash,
    critiqueHash: outputs.B_PRIME_REVISION.parsedPayload.critiqueArtifactHash,
    resolutions: outputs.B_PRIME_REVISION.parsedPayload.resolutions,
    findings: outputs.B_PRIME_REVISION.parsedPayload.findings,
  };
  const bPrimeAuthoritativeReduction = reduceBPrimeCritiqueRevisionV4({ itemHash: item.itemHash, critique: critiqueForReducer, revision: revisionForReducer });
  const completedItemMarker = terminalFailurePlan === null ? withHash({
    schemaVersion: "CompletedItemCommitMarkerV1",
    designId: "MAIS-NATURAL-CA60-V4",
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
  }, "markerHash") : null;
  const itemResult = terminalFailurePlan === null ? withHash({
    schemaVersion: "ItemEvaluationResultV1",
    designId: "MAIS-NATURAL-CA60-V4",
    registrationHash: authorization.registrationHash,
    sampleManifestHash: authorization.sampleManifestHash,
    referenceSealHash: expected.referenceSealHash,
    executionRegistrationHash,
    itemId: item.itemId,
    itemHash: item.itemHash,
    clusterId: item.clusterId,
    executionDisposition: "COMPLETE",
    machineDisposition: machineUnresolved ? "UNRESOLVED_MACHINE" : "RESOLVED",
    machineNonresolvedReasonCodes: machineUnresolved ? ["B_PRIME_CRITIQUE_UNASSESSABLE"] : [],
    referenceDisposition: "RESOLVED_NEGATIVE",
    machineSurfaceFinding: machineUnresolved ? null : bPrimeAuthoritativeReduction.findings.length > 0,
    referenceFindings: [],
    machineFindings: bPrimeAuthoritativeReduction.findings,
    finalReferenceLabelHash: referenceItemBundle.finalLabel.labelHash,
    attemptReceiptHashes: roles.map((role) => attemptReceipts[role].selfHash),
    completedItemCommitMarkerHash: completedItemMarker.markerHash,
  }, "itemResultHash") : null;
  return {
    sampleManifest: structuredClone(referenceItemBundle.sampleManifest),
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
    wireEvidences,
    bPrimeAuthoritativeReduction,
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
    designId: "MAIS-NATURAL-CA60-V4",
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
  const mandatoryIndex = Number.isInteger(options.mandatoryC0ItemIndex) ? options.mandatoryC0ItemIndex : -1;
  const selectedC0ItemIds = new Set(randomC0ItemIds);
  if (mandatoryIndex >= 0) selectedC0ItemIds.add(referenceExecutionBundle.itemBundles[mandatoryIndex].manifestRow.itemId);
  const machineUnresolvedIndex = Number.isInteger(options.machineUnresolvedIndex) ? options.machineUnresolvedIndex : -1;
  const terminalFailurePlans = {
    C0_NETWORK_TERMINAL_FAILURE: { reasonCode: "PROVIDER_NETWORK_TERMINAL_FAILURE", attemptStatus: "TIMEOUT", attemptCount: 1 },
    C0_SCHEMA_TERMINAL_FAILURE: { reasonCode: "PROVIDER_SCHEMA_TERMINAL_FAILURE", attemptStatus: "SCHEMA_FAILURE", attemptCount: 1 },
    C0_CAP_FAIL_CLOSED: { reasonCode: "CAP_FAIL_CLOSED_BEFORE_COMPLETION", attemptStatus: "CAP_BLOCKED_BEFORE_REQUEST", attemptCount: 1 },
    C0_ATTEMPTS_EXHAUSTED: { reasonCode: "PROVIDER_ATTEMPTS_EXHAUSTED", attemptStatus: "TIMEOUT", attemptCount: 2 },
  };
  const terminalFailurePlan = terminalFailurePlans[options.missingReceiptScenario] ?? null;
  const c0TerminalFailureIndex = terminalFailurePlan
    ? referenceExecutionBundle.itemBundles.findIndex((item) => selectedC0ItemIds.has(item.manifestRow.itemId))
    : -1;
  const deepSeekItemBundles = referenceExecutionBundle.itemBundles.map((item, index) => makeDeepSeekItemBundle(
    item,
    selectedC0ItemIds.has(item.manifestRow.itemId),
    authorization,
    expected,
    executionRegistrationHash,
    state,
    index === machineUnresolvedIndex,
    index === c0TerminalFailureIndex ? { role: "C0_PRIME_ROLE_5", ...terminalFailurePlan } : null,
  ));
  const c0ProtectedItemBundles = deepSeekItemBundles.map((item, index) => {
    const itemHash = item.manifestRow.itemHash;
    const issueCodes = index === mandatoryIndex ? ["POSSIBLE_P0"] : [];
    const localDeterministicEvidence = {
      schemaVersion: "C0LocalDeterministicEvidenceV1",
      itemHash,
      algorithmSetHash: hash("a"),
      mathAnswerKey: { screenComplete: true, issueCodes },
      rightsProvenanceReconstruction: { screenComplete: true, issueCodes: [], disposition: "CLEARED_FOR_AUTHORIZED_EGRESS" },
      learnerFit: { screenComplete: true, checkedDimensions: ["AGE", "GRADE", "CURRICULUM", "LANGUAGE", "REGION"], issueCodes: [] },
      answerCriticalEvidence: { screenComplete: true, requiredAssetTypes: [], verifiedAssetTypes: [], issueCodes: [] },
      validation: { schemaValid: true, roleSequenceValid: true, taxonomyCodesValid: true, errorCodes: [] },
      deterministicFindingKeys: [],
    };
    const bPrimeCritique = withHash({
      schemaVersion: "BPrimeCritiqueEvidenceV1",
      itemHash,
      providerOutputHash: item.outputs.B_PRIME_CRITIQUE.outputHash,
      validityStatus: item.outputs.B_PRIME_CRITIQUE.parsedPayload.surfaceDisposition === "UNASSESSABLE" ? "INVALID" : "VALID",
      requiredRevisionCodes: [],
    }, "artifactHash");
    const bPrimeRevision = withHash({
      schemaVersion: "BPrimeRevisionEvidenceV1",
      itemHash,
      providerOutputHash: item.outputs.B_PRIME_REVISION.outputHash,
      authoritativeReducerHash: item.bPrimeAuthoritativeReduction.reducerHash,
      validityStatus: "VALID",
      resolvedCritiqueCodes: [],
      finalFindingKeys: [],
    }, "artifactHash");
    const validatedScope = {
      schemaVersion: "C0ValidatedScopeV1",
      itemHash,
      itemScopeTags: ["US_CA_MATH"],
      allowedScopeTags: ["US_CA_MATH"],
      metadataEvidenceComplete: true,
      declaredDistribution: "IN_SCOPE",
    };
    return {
      itemIdentity: { itemHash, itemIdPseudonym: item.manifestRow.itemIdPseudonym, clusterId: item.manifestRow.clusterId },
      localDeterministicEvidence,
      bPrimeCritique,
      bPrimeRevision,
      bPrimeCritiqueProviderOutput: structuredClone(item.outputs.B_PRIME_CRITIQUE),
      bPrimeRevisionProviderOutput: structuredClone(item.outputs.B_PRIME_REVISION),
      bPrimeAuthoritativeReduction: structuredClone(item.bPrimeAuthoritativeReduction),
      validatedScope,
      registeredRandomAudit: randomC0ItemIds.has(item.manifestRow.itemId),
    };
  });
  const sampleRowsForC0 = structuredClone(referenceExecutionBundle.sampleManifest.selectedRows);
  const protectedC0ByCluster = new Map(c0ProtectedItemBundles.map((protectedItem) => [
    protectedItem.itemIdentity.clusterId,
    protectedItem,
  ]));
  const c0TriggerInputs = sampleRowsForC0.map((row) => recomputeC0TriggerInputFromProtectedItemV4(protectedC0ByCluster.get(row.clusterId), {
      registrationHash: authorization.registrationHash,
      sampleManifestHash: authorization.sampleManifestHash,
      executionRegistrationHash,
    }));
  const registeredRandomAuditRows = sampleRowsForC0.filter((row) => randomC0ItemIds.has(deepSeekItemBundles.find((item) => item.manifestRow.itemHash === row.itemHash).manifestRow.itemId));
  const c0ExecutionSet = deriveC0ExecutionSetV4({
    registrationHash: authorization.registrationHash,
    sampleManifestHash: authorization.sampleManifestHash,
    executionRegistrationHash,
    sampleRows: sampleRowsForC0,
    registeredRandomAuditRows,
    triggerInputs: c0TriggerInputs,
    deepSeekSuccessfulCallCap: 420,
  });
  const c0TriggerDecisions = c0TriggerInputs.map((input) => deriveC0TriggerDecision(input));
  const deviationEvidence = withHash({
    schemaVersion: "ExecutionDeviationEvidenceV1",
    designId: "MAIS-NATURAL-CA60-V4",
    registrationHash: authorization.registrationHash,
    executionRegistrationHash,
    materialDeviationRecords: [],
    postResultDesignDriftRecords: [],
    labelLeakageRecords: [],
    unauthorizedProviderCallRecords: [],
    terminalProviderFailureRecords: c0TerminalFailureIndex >= 0
      ? [{
          itemHash: deepSeekItemBundles[c0TerminalFailureIndex].manifestRow.itemHash,
          role: "C0_PRIME_ROLE_5",
          reasonCode: terminalFailurePlan.reasonCode,
        }]
      : [],
  }, "deviationEvidenceHash");
  const missingReceiptCount = c0TerminalFailureIndex >= 0
    ? 1
    : Number.isInteger(options.missingReceiptCount) ? options.missingReceiptCount : 0;
  if (missingReceiptCount < 0 || missingReceiptCount > 3) throw new RangeError("fixture missingReceiptCount must be between zero and three");
  const incompleteRawBundles = c0TerminalFailureIndex >= 0
    ? [deepSeekItemBundles[c0TerminalFailureIndex]]
    : deepSeekItemBundles.slice(60 - missingReceiptCount);
  const incompleteItemHashes = new Set(incompleteRawBundles.map((item) => item.manifestRow.itemHash));
  const deepSeekCompleteItemBundles = deepSeekItemBundles.filter((item) => !incompleteItemHashes.has(item.manifestRow.itemHash));
  const deepSeekMissingReceiptItemBundles = incompleteRawBundles.map((item) => {
    const itemAttemptReceipts = state.attempts.filter((attempt) => attempt.itemHash === item.manifestRow.itemHash);
    const successfulRoleEvidence = itemAttemptReceipts.filter((attempt) => attempt.attemptStatus === "SUCCESS").map((attempt) => ({
      role: attempt.role,
      attemptReceiptHash: attempt.selfHash,
      requestBody: structuredClone(item.requestBodies[attempt.role]),
      responseBody: structuredClone(item.responseBodies[attempt.role]),
      output: structuredClone(item.outputs[attempt.role]),
      wireEvidence: structuredClone(item.wireEvidences[attempt.role]),
    }));
    return buildMissingReceiptItemBundleV1({
      registrationHash: authorization.registrationHash,
      sampleManifestHash: authorization.sampleManifestHash,
      executionRegistrationHash,
      itemId: item.manifestRow.itemId,
      itemHash: item.manifestRow.itemHash,
      itemIdPseudonym: item.manifestRow.itemIdPseudonym,
      clusterId: item.manifestRow.clusterId,
      reasonCode: c0TerminalFailureIndex >= 0
        ? terminalFailurePlan.reasonCode
        : "ITEM_RESULT_FINALIZATION_FAILED_CLOSED",
      itemAttemptReceipts,
      successfulRoleEvidence,
    });
  });
  const missingResults = incompleteRawBundles.map((item) => withHash({
    schemaVersion: "ItemEvaluationResultV1",
    designId: "MAIS-NATURAL-CA60-V4",
    registrationHash: authorization.registrationHash,
    sampleManifestHash: authorization.sampleManifestHash,
    referenceSealHash: expected.referenceSealHash,
    executionRegistrationHash,
    itemId: item.manifestRow.itemId,
    itemHash: item.manifestRow.itemHash,
    clusterId: item.manifestRow.clusterId,
    executionDisposition: "MISSING_RECEIPT",
    machineDisposition: "MISSING_RECEIPT",
    machineNonresolvedReasonCodes: ["MISSING_RECEIPT"],
    referenceDisposition: "RESOLVED_NEGATIVE",
    machineSurfaceFinding: null,
    referenceFindings: [],
    machineFindings: [],
    finalReferenceLabelHash: item.referenceFinalLabel.labelHash,
    attemptReceiptHashes: state.attempts.filter((attempt) => attempt.itemHash === item.manifestRow.itemHash).map((attempt) => attempt.selfHash),
    completedItemCommitMarkerHash: null,
  }, "itemResultHash"));
  const itemResults = [...deepSeekCompleteItemBundles.map((item) => item.itemResult), ...missingResults];
  const observed = deriveObservedEvaluationLedger(itemResults);
  const counterfactualLedger = deriveCounterfactualLedger(observed);
  const metricInputs = createMetricInputLedger(observed);
  const metricResults = recomputeMetricSet(observed, counterfactualLedger);
  const hasTerminalProviderFailure = c0TerminalFailureIndex >= 0;
  const integrity = deriveExecutionIntegrity({
    ...observed.accounting,
    receiptChainValid: true,
    providerTupleValid: true,
    capsValid: true,
    terminalProviderFailure: hasTerminalProviderFailure,
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
  const completedItemMarkerRoot = sha256Hex(canonicalJson(deepSeekCompleteItemBundles.map((item) => [item.manifestRow.itemId, item.completedItemMarker.markerHash])));
  const providerAggregates = {
    QWEN: recomputeProviderAggregateV4(referenceExecutionBundle.attemptChain, "ALIBABA_CLOUD_MODEL_STUDIO", "qwen3.8-max"),
    DEEPSEEK: recomputeProviderAggregateV4(state.attempts, "DEEPSEEK_DIRECT", "deepseek-v4-pro"),
  };
  const providerAggregatesHash = sha256Hex(canonicalJson(providerAggregates));
  const strataSummary = structuredClone(referenceExecutionBundle.sampleManifest.stratumAllocations);
  const clusterWeightSummary = sampleRowsForC0.map((row) => ({
    itemId: row.itemId,
    itemHash: row.itemHash,
    clusterId: row.clusterId,
    stratum: row.stratum,
    primaryAnalysisWeight: row.primaryAnalysisWeight ?? row.analysisWeight,
    secondaryAnalysisWeight: row.secondaryAnalysisWeight,
    inclusionProbability: row.inclusionProbability,
    clusterInclusionProbability: row.clusterInclusionProbability,
    representativeSelectionProbability: row.representativeSelectionProbability,
  })).sort((left, right) => left.itemId.localeCompare(right.itemId));
  const kishEffectiveSampleSize = referenceExecutionBundle.sampleManifest.secondaryWeightSummary.kishEffectiveSampleSize;
  const finalSummaries = deriveFinalReceiptSummariesV4({
    matchingMatrix: observed.matchRecords,
    strata: strataSummary,
    clusterWeights: clusterWeightSummary,
    kishEffectiveSampleSize,
    agreement: referenceExecutionBundle.referenceSeal.agreementStatistics,
    adjudicationCount: referenceExecutionBundle.referenceSeal.adjudicationSuccessfulCallCount,
    itemCount: 60,
  });
  const finalReceipt = withHash({
    schemaVersion: "FinalEvaluationReceiptV1",
    designId: "MAIS-NATURAL-CA60-V4",
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
    terminalProviderFailure: hasTerminalProviderFailure,
    materialDeviation: false,
    postResultDesignDrift: false,
    labelLeakage: false,
    unauthorizedProviderCall: false,
    executionIntegrityStatus: integrity.status,
    policyRevisionRequired: conclusion === "POLICY_REVISION_REQUIRED_MACHINE_REFERENCE",
    structuralFeasibilityGatePassed: false,
    decisionCeiling: "INCONCLUSIVE_MACHINE_REFERENCE",
    claimScopeCeiling: "CALIFORNIA_RUNTIME_EGRESS_ELIGIBLE_MACHINE_REFERENCE_PILOT_ONLY",
    publicLimitations: [...FROZEN_PUBLIC_LIMITATIONS_V4],
    publicLimitationSetHash: FROZEN_PUBLIC_LIMITATIONS_V4_HASH,
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
    ...finalSummaries,
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
      sampleManifest: structuredClone(referenceExecutionBundle.sampleManifest),
      referenceExecutionBundle,
      deepSeekAuthorization: authorization,
      deepSeekAuthorizationExpected: expected,
      deepSeekAttemptChain: state.attempts,
      deepSeekItemBundles,
      deepSeekCompleteItemBundles,
      deepSeekMissingReceiptItemBundles,
      c0ProtectedItemBundles,
      c0TriggerInputs,
      c0TriggerDecisions,
      sampleManifestRows: sampleRowsForC0,
      registeredRandomAuditRows,
      deepSeekSuccessfulCallCap: 420,
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

test("reference execution identities are the exact authoritative 60-row frozen sample manifest", () => {
  const fixture = buildGlobalReferenceExecutionFixture();
  assert.equal(fixture.sampleManifest?.selectedRows?.length, 60);
  assert.equal(
    fixture.sampleManifest.sampleManifestHash,
    calculateArtifactHash(fixture.sampleManifest, "sampleManifestHash"),
  );
  const authoritativeRows = [...fixture.sampleManifest.selectedRows]
    .sort((left, right) => left.itemId.localeCompare(right.itemId));
  const executionRows = fixture.itemBundles.map(({ manifestRow }) => manifestRow)
    .sort((left, right) => left.itemId.localeCompare(right.itemId));
  assert.deepEqual(executionRows, authoritativeRows);

  const substituted = structuredClone(fixture);
  substituted.itemBundles[0].manifestRow.itemIdPseudonym = "caller-substituted-pseudonym";
  assert.equal(validateReferenceLabelSealExecutionBundle(substituted).some((error) => /authoritative.*sample|manifest.*identity|pseudonym/iu.test(error)), true);
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

test("actual Qwen raw unknown taxonomy bytes normalize once to terminal SCHEMA_GAP and unresolved seal", () => {
  const fixture = buildGlobalReferenceExecutionFixture({ unknownTaxonomy: true });
  const item = fixture.itemBundles[0];
  assert.equal(item.rawProviderOutputs.A_LABEL.rawTaxonomyCodes[0], "FUTURE_UNKNOWN_CODE");
  assert.equal(item.wireEvidences.A_LABEL.rawWireResponseBytes.includes("FUTURE_UNKNOWN_CODE"), true);
  assert.deepEqual(item.aLabel.rawTaxonomyCodes, ["SCHEMA_GAP"]);
  assert.equal(item.finalLabel.finalLabel, "UNRESOLVED_REFERENCE");
  assert.equal(item.finalLabel.disagreementStatus, "ADJUDICATOR_UNDECIDED");
  assert.equal(item.baseAttemptReceipts.A_LABEL.retryClassification, "NONE");
  assert.deepEqual(validateReferenceLabelSealExecutionBundle(fixture), []);
});

test("exactly agreed P1 still triggers one adjudication with TRIGGERED_AGREEMENT", () => {
  const fixture = buildGlobalReferenceExecutionFixture({ p1Agreement: true });
  const item = fixture.itemBundles[0];
  assert.equal(item.aLabel.rawSeverity, "P1");
  assert.equal(item.bLabel.rawSeverity, "P1");
  assert.equal(item.finalLabel.disagreementStatus, "TRIGGERED_AGREEMENT");
  assert.equal(item.seal.sealMode, "FINAL_ADJUDICATED");
  assert.equal(fixture.referenceSeal.adjudicationSuccessfulCallCount, 1);
  assert.deepEqual(validateReferenceLabelSealExecutionBundle(fixture), []);
});

test("adjudicator undecided is sealed as UNRESOLVED_REFERENCE", () => {
  const fixture = buildGlobalReferenceExecutionFixture({ adjudicatorUndecided: true });
  const item = fixture.itemBundles[0];
  assert.equal(item.finalLabel.disagreementStatus, "ADJUDICATOR_UNDECIDED");
  assert.equal(item.finalLabel.finalLabel, "UNRESOLVED_REFERENCE");
  assert.deepEqual(item.finalLabel.finalTaxonomyCodes, ["SCHEMA_GAP"]);
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
  assert.equal(bundle.finalReceipt.conclusion, "POLICY_REVISION_REQUIRED_MACHINE_REFERENCE");
});

test("B-prime UNASSESSABLE emits a disjoint machine-nonresolved item rather than a TN", () => {
  const bundle = buildFullFinalExecutionFixture({ machineUnresolvedIndex: 0 });
  assert.deepEqual(validateFinalEvaluationBundle(bundle), []);
  const first = bundle.itemResults[0];
  assert.equal(first.machineDisposition, "UNRESOLVED_MACHINE");
  assert.equal(first.machineSurfaceFinding, null);
  assert.deepEqual(first.machineFindings, []);
  assert.deepEqual(first.machineNonresolvedReasonCodes, ["B_PRIME_CRITIQUE_UNASSESSABLE"]);
  const observed = deriveObservedEvaluationLedger(bundle.itemResults);
  assert.equal(observed.accounting.invalidItemCount, 1);
  assert.equal(observed.accounting.resolvedNegativeItemCount, 59);
  assert.equal(observed.confusionMatrix.tn, 59);
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

test("V4 full execution rebuilds all 60 C0 trigger inputs and the exact random-plus-mandatory union", () => {
  const bundle = buildFullFinalExecutionFixture();
  assert.equal(Array.isArray(bundle.executionEvidence.c0TriggerInputs), true, "full execution must expose protected C0 trigger inputs");
  assert.equal(Array.isArray(bundle.executionEvidence.c0TriggerDecisions), true, "full execution must expose recomputed C0 decisions");
  assert.equal(bundle.executionEvidence.c0TriggerInputs.length, 60);
  assert.equal(bundle.executionEvidence.c0TriggerDecisions.length, 60);
  assert.deepEqual(validateFinalEvaluationBundle(bundle), []);

  const omitted = buildFullFinalExecutionFixture();
  omitted.executionEvidence.c0TriggerInputs.splice(12, 1);
  assert.equal(validateFinalEvaluationBundle(omitted).some((error) => /60 trigger|C0.*trigger|exact union/iu.test(error)), true);

  const suppressedMandatory = buildFullFinalExecutionFixture({ mandatoryC0ItemIndex: 12 });
  suppressedMandatory.executionEvidence.c0ExecutionSet.c0Rows = suppressedMandatory.executionEvidence.c0ExecutionSet.c0Rows
    .filter((row) => row.itemHash !== suppressedMandatory.executionEvidence.deepSeekItemBundles[12].manifestRow.itemHash);
  withHash(suppressedMandatory.executionEvidence.c0ExecutionSet, "executionSetHash");
  assert.equal(validateFinalEvaluationBundle(suppressedMandatory).some((error) => /mandatory|exact union|C0/iu.test(error)), true);
});

test("V4 C0 trigger input cannot substitute self-consistent B-prime evidence for the protected actual outputs", () => {
  const bundle = buildFullFinalExecutionFixture();
  const protectedItem = bundle.executionEvidence.c0ProtectedItemBundles[20];
  protectedItem.bPrimeRevision.providerOutputHash = hash("f");
  withHash(protectedItem.bPrimeRevision, "artifactHash");
  bundle.executionEvidence.c0TriggerInputs[20] = recomputeC0TriggerInputFromProtectedItemV4(protectedItem, {
    registrationHash: bundle.executionEvidence.executionRegistration.registrationHash,
    sampleManifestHash: bundle.executionEvidence.executionRegistration.sampleManifestHash,
    executionRegistrationHash: bundle.executionEvidence.executionRegistration.executionRegistrationHash,
  });
  bundle.executionEvidence.c0TriggerDecisions[20] = deriveC0TriggerDecision(bundle.executionEvidence.c0TriggerInputs[20]);
  assert.equal(validateFinalEvaluationBundle(bundle).some((error) => /protected C0|actual B-prime|raw-leaf/iu.test(error)), true);
});

test("V4 B-prime revision wire request contains the exact critique and final scoring uses the authoritative reducer", () => {
  const bundle = buildFullFinalExecutionFixture();
  const first = bundle.executionEvidence.deepSeekItemBundles[0];
  assert.equal(typeof first.requestBodies.B_PRIME_REVISION.input.bPrimeCritiqueArtifact, "object", "revision request must carry the critique artifact");
  assert.equal(typeof first.bPrimeAuthoritativeReduction, "object", "item bundle must carry the local authoritative reducer output");
  assert.deepEqual(first.requestBodies.B_PRIME_REVISION.input.bPrimeCritiqueArtifact.parsedPayload, first.outputs.B_PRIME_CRITIQUE.parsedPayload);
  assert.equal(Object.hasOwn(first.requestBodies.B_PRIME_REVISION.input.bPrimeCritiqueArtifact, "sourceOutputHash"), false);
  assert.equal(Object.hasOwn(first.requestBodies.B_PRIME_REVISION.input.bPrimeCritiqueArtifact, "itemHash"), false);
  assert.equal(first.bPrimeAuthoritativeReduction.authoritativeForScoring, true);
  assert.deepEqual(first.itemResult.machineFindings, first.bPrimeAuthoritativeReduction.findings);

  const unresolved = buildFullFinalExecutionFixture();
  unresolved.executionEvidence.deepSeekItemBundles[0].outputs.B_PRIME_REVISION.parsedPayload.resolutions = [{ findingId: "not-in-critique", disposition: "RETAINED" }];
  withHash(unresolved.executionEvidence.deepSeekItemBundles[0].outputs.B_PRIME_REVISION, "outputHash");
  assert.equal(validateFinalEvaluationBundle(unresolved).some((error) => /critique|resolution|authoritative reducer/iu.test(error)), true);
});

test("V4 full execution binds exact wire and parsed hashes for every provider success", () => {
  const bundle = buildFullFinalExecutionFixture();
  const attempt = bundle.executionEvidence.deepSeekAttemptChain[0];
  for (const field of ["logicalRequestHash", "wireRequestBodyHash", "rawWireResponseHash", "parsedProviderEnvelopeHash", "extractedMessageContentHash", "parsedRolePayloadHash", "adapterTransformHash"]) {
    assert.match(attempt[field], /^[a-f0-9]{64}$/u, field);
  }
  assert.deepEqual(validateFinalEvaluationBundle(bundle), []);
  const drifted = buildFullFinalExecutionFixture();
  drifted.executionEvidence.deepSeekAttemptChain[0].wireRequestBodyHash = hash("f");
  withHash(drifted.executionEvidence.deepSeekAttemptChain[0], "selfHash");
  assert.equal(validateFinalEvaluationBundle(drifted).some((error) => /wire|attempt|chain/iu.test(error)), true);
});

test("V4 final receipt materializes and binds every required aggregate summary", () => {
  const bundle = buildFullFinalExecutionFixture();
  for (const field of ["matchingMatrix", "strataSummary", "clusterWeightSummary", "kishEffectiveSampleSize", "agreementSummary", "adjudicationSummary", "finalSummaryRootHash"]) {
    assert.notEqual(bundle.finalReceipt[field], undefined, field);
  }
  assert.deepEqual(validateFinalEvaluationBundle(bundle), []);
  const fabricated = buildFullFinalExecutionFixture();
  fabricated.finalReceipt.kishEffectiveSampleSize += 1;
  withHash(fabricated.finalReceipt, "receiptHash");
  assert.equal(validateFinalEvaluationBundle(fabricated).some((error) => /Kish|summary/iu.test(error)), true);
});

test("V4 public final gate accepts 57 complete plus three manifest-bound MISSING_RECEIPT items", () => {
  const bundle = buildFullFinalExecutionFixture({ missingReceiptCount: 3 });
  assert.equal(bundle.executionEvidence.deepSeekCompleteItemBundles.length, 57);
  assert.equal(bundle.executionEvidence.deepSeekMissingReceiptItemBundles.length, 3);
  assert.equal(bundle.finalReceipt.completeReceiptItemCount, 57);
  assert.equal(bundle.finalReceipt.missingReceiptItemCount, 3);
  assert.deepEqual(validateFinalEvaluationBundle(bundle), []);

  const substituted = buildFullFinalExecutionFixture({ missingReceiptCount: 3 });
  substituted.executionEvidence.deepSeekMissingReceiptItemBundles[0].itemHash = hash("f");
  withHash(substituted.executionEvidence.deepSeekMissingReceiptItemBundles[0], "missingReceiptBundleHash");
  assert.equal(validateFinalEvaluationBundle(substituted).some((error) => /missing receipt|manifest|identity/iu.test(error)), true);
});

test("MISSING_RECEIPT cannot delete the item raw provider evidence", () => {
  const bundle = buildFullFinalExecutionFixture({ missingReceiptCount: 3 });
  bundle.executionEvidence.deepSeekItemBundles = structuredClone(bundle.executionEvidence.deepSeekCompleteItemBundles);
  assert.equal(
    validateFinalEvaluationBundle(bundle).some((error) => /missing receipt|raw provider|wire evidence|item bundle/iu.test(error)),
    true,
  );
});

test("MISSING_RECEIPT terminal root and reason are recomputed from the real item attempt subchain", () => {
  const forgedRoot = buildFullFinalExecutionFixture({ missingReceiptCount: 1 });
  forgedRoot.executionEvidence.deepSeekMissingReceiptItemBundles[0].terminalAttemptChainHash = hash("f");
  withHash(forgedRoot.executionEvidence.deepSeekMissingReceiptItemBundles[0], "missingReceiptBundleHash");
  assert.equal(
    validateFinalEvaluationBundle(forgedRoot).some((error) => /terminal.*attempt|attempt.*subchain|missing receipt/iu.test(error)),
    true,
  );

  const forgedReason = buildFullFinalExecutionFixture({ missingReceiptCount: 1 });
  forgedReason.executionEvidence.deepSeekMissingReceiptItemBundles[0].reasonCode = "PROVIDER_NETWORK_TERMINAL_FAILURE";
  withHash(forgedReason.executionEvidence.deepSeekMissingReceiptItemBundles[0], "missingReceiptBundleHash");
  assert.equal(
    validateFinalEvaluationBundle(forgedReason).some((error) => /reason|terminal.*state|network.*failure/iu.test(error)),
    true,
  );
});

test("global DeepSeek SUCCESS set rejects an orphan not backed by complete or missing raw role evidence", () => {
  const bundle = buildFullFinalExecutionFixture({ missingReceiptCount: 1 });
  const missing = bundle.executionEvidence.deepSeekMissingReceiptItemBundles[0];
  const rawItem = bundle.executionEvidence.deepSeekItemBundles.find((item) => item.manifestRow.itemHash === missing.itemHash);
  for (const field of ["requestBodies", "responseBodies", "outputs", "attemptReceipts", "wireEvidences"]) {
    delete rawItem[field].B_PRIME_REVISION;
  }
  assert.equal(
    validateFinalEvaluationBundle(bundle).some((error) => /orphan|extra success|verified.*success|raw role evidence/iu.test(error)),
    true,
  );
});

test("a real terminal C0 role failure preserves the attempted graph without inventing later SUCCESS calls", () => {
  const bundle = buildFullFinalExecutionFixture({ missingReceiptScenario: "C0_NETWORK_TERMINAL_FAILURE" });
  assert.deepEqual(validateFinalEvaluationBundle(bundle), []);
  assert.equal(bundle.executionEvidence.deepSeekMissingReceiptItemBundles.length, 1);
  const missing = bundle.executionEvidence.deepSeekMissingReceiptItemBundles[0];
  assert.equal(missing.reasonCode, "PROVIDER_NETWORK_TERMINAL_FAILURE");
  const terminalAttempt = missing.itemAttemptReceipts.at(-1);
  assert.equal(terminalAttempt.role, "C0_PRIME_ROLE_5");
  assert.equal(terminalAttempt.attemptStatus, "TIMEOUT");
  assert.equal(missing.successfulRoleEvidence.some((entry) => entry.role === "C0_PRIME_ROLE_5"), false);
  const missingResult = bundle.itemResults.find((item) => item.itemHash === missing.itemHash);
  assert.deepEqual(
    missingResult.attemptReceiptHashes,
    missing.itemAttemptReceipts.map((attempt) => attempt.selfHash),
    "the item result must preserve its complete ordered failed attempt history",
  );
  assert.equal(
    bundle.executionEvidence.deepSeekAttemptChain.some((attempt) => attempt.itemHash === missing.itemHash
      && attempt.sequenceNumber > terminalAttempt.sequenceNumber),
    false,
  );
});

test("MISSING_RECEIPT persisted artifact is a closed exact shape even after a valid self-rehash", () => {
  const bundle = buildFullFinalExecutionFixture({ missingReceiptCount: 1 });
  bundle.executionEvidence.deepSeekMissingReceiptItemBundles[0].unregisteredEscapeHatch = true;
  withHash(bundle.executionEvidence.deepSeekMissingReceiptItemBundles[0], "missingReceiptBundleHash");
  assert.equal(
    validateFinalEvaluationBundle(bundle).some((error) => /closed|additional|exact.*shape|missing receipt.*field/iu.test(error)),
    true,
  );
});

test("MISSING_RECEIPT reason codes require their exact terminal attempt status and exhaustion count", () => {
  const baseline = buildFullFinalExecutionFixture({ missingReceiptScenario: "C0_NETWORK_TERMINAL_FAILURE" });
  for (const reasonCode of ["PROVIDER_SCHEMA_TERMINAL_FAILURE", "CAP_FAIL_CLOSED_BEFORE_COMPLETION", "PROVIDER_ATTEMPTS_EXHAUSTED"]) {
    const mutated = structuredClone(baseline);
    mutated.executionEvidence.deepSeekMissingReceiptItemBundles[0].reasonCode = reasonCode;
    withHash(mutated.executionEvidence.deepSeekMissingReceiptItemBundles[0], "missingReceiptBundleHash");
    assert.equal(
      validateFinalEvaluationBundle(mutated).some((error) => /reason|terminal.*state|schema|cap|exhaust/iu.test(error)),
      true,
      reasonCode,
    );
  }
});

test("every non-finalization MISSING_RECEIPT reason has a real accepted terminal attempt graph", () => {
  const scenarios = [
    ["C0_NETWORK_TERMINAL_FAILURE", "PROVIDER_NETWORK_TERMINAL_FAILURE", ["TIMEOUT"]],
    ["C0_SCHEMA_TERMINAL_FAILURE", "PROVIDER_SCHEMA_TERMINAL_FAILURE", ["SCHEMA_FAILURE"]],
    ["C0_CAP_FAIL_CLOSED", "CAP_FAIL_CLOSED_BEFORE_COMPLETION", ["CAP_BLOCKED_BEFORE_REQUEST"]],
    ["C0_ATTEMPTS_EXHAUSTED", "PROVIDER_ATTEMPTS_EXHAUSTED", ["TIMEOUT", "TIMEOUT"]],
  ];
  const crossReasonMutation = {
    PROVIDER_NETWORK_TERMINAL_FAILURE: "PROVIDER_SCHEMA_TERMINAL_FAILURE",
    PROVIDER_SCHEMA_TERMINAL_FAILURE: "CAP_FAIL_CLOSED_BEFORE_COMPLETION",
    CAP_FAIL_CLOSED_BEFORE_COMPLETION: "PROVIDER_ATTEMPTS_EXHAUSTED",
    PROVIDER_ATTEMPTS_EXHAUSTED: "PROVIDER_NETWORK_TERMINAL_FAILURE",
  };
  for (const [scenario, reasonCode, terminalStatuses] of scenarios) {
    const bundle = buildFullFinalExecutionFixture({ missingReceiptScenario: scenario });
    assert.deepEqual(validateFinalEvaluationBundle(bundle), [], scenario);
    assert.equal(bundle.executionEvidence.deepSeekMissingReceiptItemBundles.length, 1, scenario);
    const missing = bundle.executionEvidence.deepSeekMissingReceiptItemBundles[0];
    assert.equal(missing.reasonCode, reasonCode, scenario);
    const terminalRole = missing.itemAttemptReceipts.at(-1).role;
    assert.deepEqual(
      missing.itemAttemptReceipts.filter((attempt) => attempt.role === terminalRole).map((attempt) => attempt.attemptStatus),
      terminalStatuses,
      scenario,
    );
    assert.equal(
      missing.itemAttemptReceipts.some((attempt) => attempt.role === terminalRole && attempt.attemptStatus === "SUCCESS"),
      false,
      scenario,
    );
    const relabeled = structuredClone(bundle);
    relabeled.executionEvidence.deepSeekMissingReceiptItemBundles[0].reasonCode = crossReasonMutation[reasonCode];
    withHash(relabeled.executionEvidence.deepSeekMissingReceiptItemBundles[0], "missingReceiptBundleHash");
    assert.equal(
      validateFinalEvaluationBundle(relabeled).some((error) => /reason|terminal.*state|schema|cap|exhaust|network/iu.test(error)),
      true,
      `${scenario} cannot be relabeled as ${crossReasonMutation[reasonCode]}`,
    );
  }
});

test("a real B-prime revision terminal failure cannot retain a forged 60-item C0 protected-input aggregate", () => {
  const bundle = buildFullFinalExecutionFixture({ missingReceiptCount: 1 });
  const missing = bundle.executionEvidence.deepSeekMissingReceiptItemBundles[0];
  const rawItem = bundle.executionEvidence.deepSeekItemBundles.find((item) => item.manifestRow.itemHash === missing.itemHash);
  const globalAttempts = bundle.executionEvidence.deepSeekAttemptChain;
  const terminalIndex = globalAttempts.findLastIndex((attempt) => attempt.itemHash === missing.itemHash);
  const originalTerminal = globalAttempts[terminalIndex];
  assert.equal(originalTerminal.role, "B_PRIME_REVISION");
  assert.equal(terminalIndex, globalAttempts.length - 1);
  const failedTerminal = {
    ...structuredClone(originalTerminal),
    observedProvider: null,
    observedModel: null,
    observedEndpointHostname: null,
    responseBodyHash: null,
    parsedOutputHash: null,
    rawWireResponseHash: null,
    parsedProviderEnvelopeHash: null,
    extractedMessageContentHash: null,
    parsedRolePayloadHash: null,
    providerUsageHash: null,
    dispatchState: "DISPATCHED",
    usageState: "USAGE_UNKNOWN_PENDING_PROVIDER_RECONCILIATION",
    reservedTokens: 16384,
    reservedUsd: 1,
    reconciliationReceiptHash: null,
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
    rawUsage: { promptTokens: 0, completionTokens: 0, reasoningTokens: 0, totalTokens: 0 },
    estimatedCost: 0,
    cumulativeCost: globalAttempts[terminalIndex - 1].cumulativeCost,
    retryClassification: "TRANSIENT_RETRY_ALLOWED_ONLY_IF_REMAINING_CAP_COVERS_NEW_RESERVE",
    redactedError: "PROVIDER_TIMEOUT_REDACTED",
    completedItemCommitMarkerHash: null,
  };
  withHash(failedTerminal, "selfHash");
  globalAttempts[terminalIndex] = failedTerminal;
  for (const field of ["requestBodies", "responseBodies", "outputs", "attemptReceipts", "wireEvidences"]) delete rawItem[field].B_PRIME_REVISION;
  const successfulRoleEvidence = missing.successfulRoleEvidence.filter((entry) => entry.role === "B_PRIME_CRITIQUE");
  bundle.executionEvidence.deepSeekMissingReceiptItemBundles[0] = buildMissingReceiptItemBundleV1({
    registrationHash: missing.registrationHash,
    sampleManifestHash: missing.sampleManifestHash,
    executionRegistrationHash: missing.executionRegistrationHash,
    itemId: missing.itemId,
    itemHash: missing.itemHash,
    itemIdPseudonym: missing.itemIdPseudonym,
    clusterId: missing.clusterId,
    reasonCode: "PROVIDER_NETWORK_TERMINAL_FAILURE",
    itemAttemptReceipts: globalAttempts.filter((attempt) => attempt.itemHash === missing.itemHash),
    successfulRoleEvidence,
  });
  assert.equal(
    validateFinalEvaluationBundle(bundle).some((error) => /C0.*actual B-prime|protected C0.*raw|60-item trigger reconstruction/iu.test(error)),
    true,
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
