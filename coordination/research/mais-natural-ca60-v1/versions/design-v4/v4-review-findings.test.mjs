import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import * as contracts from "./design-contract.mjs";
import * as sample from "./sample-contract.mjs";

const hash = (character) => character.repeat(64);

function requiredFunction(module, name) {
  assert.equal(typeof module[name], "function", `${name} must be an executable V4 contract`);
  return module[name];
}

function requiredValue(module, name) {
  assert.notEqual(module[name], undefined, `${name} must be frozen by V4`);
  return module[name];
}

function makeCompleteDeepSeekTimeoutAttempt({
  authorizationHash = hash("a"),
  registrationHash = hash("1"),
  sampleManifestHash = hash("2"),
  executionRegistrationHash = hash("3"),
  itemHash = hash("4"),
  itemIdPseudonym = `ca60-${"1".repeat(32)}`,
  clusterId = "cluster-001",
  sequenceNumber = 1,
  previousReceiptHash = null,
} = {}) {
  const attempt = {
    schemaVersion: "ProviderAttemptReceiptV1",
    designId: contracts.DESIGN_ID,
    runId: "run-v4-review-timeout-001",
    registrationHash,
    frameRegistrationHash: hash("8"),
    sampleManifestHash,
    runtimeConfigHash: hash("9"),
    authorizationHash,
    referenceSealHash: hash("b"),
    executionRegistrationHash,
    itemIdPseudonym,
    itemHash,
    clusterId,
    role: "B_PRIME_CRITIQUE",
    attemptId: `attempt-${sequenceNumber}`,
    sequenceNumber,
    requestedProvider: "DEEPSEEK_DIRECT",
    observedProvider: null,
    requestedModel: "deepseek-v4-pro",
    observedModel: null,
    requestedEndpoint: "https://api.deepseek.com/chat/completions",
    observedEndpointHostname: null,
    provider: "DEEPSEEK_DIRECT",
    model: "deepseek-v4-pro",
    endpoint: "https://api.deepseek.com/chat/completions",
    requestBodyHash: hash("e"),
    responseBodyHash: null,
    parsedOutputHash: null,
    logicalRequestHash: hash("f"),
    wireRequestBodyHash: hash("e"),
    rawWireResponseHash: null,
    parsedProviderEnvelopeHash: null,
    extractedMessageContentHash: null,
    parsedRolePayloadHash: null,
    providerUsageHash: null,
    adapterTransformHash: hash("d"),
    dispatchState: "DISPATCHED",
    usageState: "USAGE_UNKNOWN_PENDING_PROVIDER_RECONCILIATION",
    reservedTokens: 16384,
    reservedUsd: 1,
    reconciliationReceiptHash: null,
    startedAt: "2026-08-25T09:00:00.000Z",
    finishedAt: "2026-08-25T09:00:01.000Z",
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
    costRateSnapshotHash: hash("c"),
    estimatedCost: 0,
    cumulativeCost: 0,
    retryClassification: "TRANSIENT_RETRY_ALLOWED_ONLY_IF_REMAINING_CAP_COVERS_NEW_RESERVE",
    redactedError: "PROVIDER_TIMEOUT_REDACTED",
    appendOnly: true,
    atomicWrite: true,
    fileMode: "0600",
    completedItemCommitMarkerHash: null,
    cacheHit: false,
    providerInvoiceAuthoritative: true,
    previousReceiptHash,
  };
  attempt.selfHash = contracts.calculateArtifactHash(attempt, "selfHash");
  return attempt;
}

test("V4 item identity binds the complete localized provider projection and frozen rubric", () => {
  const calculate = requiredFunction(contracts, "calculateFrozenNaturalItemLeafHashV4");
  const deriveProjection = requiredFunction(contracts, "deriveProtectedFrozenItemProjectionV4");
  const leaf = {
    itemId: "item-001",
    sourceCommit: "a".repeat(40),
    sourceIds: ["runtime:item-001"],
    clusterId: "cluster-001",
    homologyClusterId: "cluster-001",
    region: "CALIFORNIA",
    curriculumProfile: "US_CA_MATH",
    grade: "5",
    canonicalTopic: "fractions",
    responseForm: "short-answer",
    difficulty: "Medium",
    sourceModuleHash: hash("a"),
    prompt: { en: "What is one half plus one half?", zh: "二分之一加二分之一是多少？" },
    options: null,
    answer: "1",
    storedAnswer: "1",
    acceptedAnswers: ["1"],
    explanation: { en: "Two halves make one.", zh: "兩個二分之一合成一。" },
    localePolicy: contracts.V4_PROVIDER_ITEM_LOCALE_POLICY,
    topic: { en: "Fractions", zh: "分數" },
    rubric: contracts.V4_PROVIDER_ITEM_RUBRIC,
    diagram: null,
    questionAssets: null,
    lineageKind: null,
    batchId: null,
    topicId: null,
    generationTemplate: null,
    sourceLessonSlug: null,
  };
  const original = calculate(leaf);
  for (const field of ["prompt", "topic"]) {
    const changed = structuredClone(leaf);
    changed[field].en = `${changed[field].en} changed`;
    assert.notEqual(calculate(changed), original, `${field} must change item identity`);
  }
  assert.throws(() => calculate({ ...leaf, localePolicy: "en-US" }), /complete localized runtime bundle/u);
  assert.throws(() => calculate({ ...leaf, locale: "en-US" }), /complete localized runtime bundle/u);
  assert.throws(() => calculate({ ...leaf, rubric: `${leaf.rubric}-changed` }), /frozen rubric literal/u);
  const projection = deriveProjection(leaf);
  assert.equal(projection.projectionDisposition, "PROTECTED_LOCAL_ONLY_NOT_PROVIDER_PAYLOAD");
  assert.deepEqual(projection.prompt, leaf.prompt);
  assert.deepEqual(projection.topic, leaf.topic);
  assert.equal(projection.localePolicy, contracts.V4_PROVIDER_ITEM_LOCALE_POLICY);
  assert.deepEqual(projection.options, { presence: "NULL" });
  assert.deepEqual(projection.storedAnswer, { presence: "PRESENT", value: "1" });
  assert.deepEqual(projection.explanation, { presence: "PRESENT", value: leaf.explanation });
  assert.equal(projection.rubric, contracts.V4_PROVIDER_ITEM_RUBRIC);
});

test("C0 V4 derives exactly one trigger decision for every one of 60 sample rows", () => {
  const derive = requiredFunction(contracts, "deriveC0ExecutionSetV4");
  const sampleRows = Array.from({ length: 60 }, (_, index) => ({
    itemHash: String(index + 1).padStart(64, "0"),
    itemIdPseudonym: `p-${index + 1}`,
    clusterId: `c-${index + 1}`,
  }));
  const triggerInputs = sampleRows.map((row, index) => {
    const input = {
      schemaVersion: "C0TriggerInputV1",
      designId: contracts.DESIGN_ID,
      registrationHash: hash("1"),
      sampleManifestHash: hash("2"),
      executionRegistrationHash: hash("3"),
      itemHash: row.itemHash,
      clusterId: row.clusterId,
      itemIdPseudonym: row.itemIdPseudonym,
      localDeterministicEvidence: {
        schemaVersion: "C0LocalDeterministicEvidenceV1",
        algorithmSetHash: hash("4"),
        itemHash: row.itemHash,
        mathAnswerKey: { screenComplete: true, issueCodes: index === 12 ? ["POSSIBLE_P1"] : [] },
        rightsProvenanceReconstruction: { screenComplete: true, disposition: "CLEARED_FOR_AUTHORIZED_EGRESS", issueCodes: [] },
        learnerFit: { screenComplete: true, checkedDimensions: ["AGE", "GRADE", "CURRICULUM", "LANGUAGE", "REGION"], issueCodes: [] },
        answerCriticalEvidence: { screenComplete: true, requiredAssetTypes: [], verifiedAssetTypes: [], issueCodes: [] },
        validation: { schemaValid: true, roleSequenceValid: true, taxonomyCodesValid: true, errorCodes: [] },
        deterministicFindingKeys: [],
      },
      bPrimeCritique: {
        schemaVersion: "BPrimeCritiqueEvidenceV1",
        itemHash: row.itemHash,
        requiredRevisionCodes: [],
        validityStatus: "VALID",
      },
      bPrimeRevision: {
        schemaVersion: "BPrimeRevisionEvidenceV1",
        itemHash: row.itemHash,
        resolvedCritiqueCodes: [],
        finalFindingKeys: [],
        validityStatus: "VALID",
      },
      validatedScope: {
        schemaVersion: "C0ValidatedScopeV1",
        itemHash: row.itemHash,
        itemScopeTags: ["CA", "US_CA_MATH", "STUDENT"],
        allowedScopeTags: ["CA", "US_CA_MATH", "STUDENT"],
        metadataEvidenceComplete: true,
        declaredDistribution: "IN_SCOPE",
      },
      registeredRandomAudit: index < 12,
      qwenInputCount: 0,
      derivedAtStage: "AFTER_B_PRIME_REVISION_BEFORE_ANY_C0_CALL",
    };
    input.bPrimeCritique.artifactHash = contracts.calculateArtifactHash(input.bPrimeCritique, "artifactHash");
    input.bPrimeRevision.artifactHash = contracts.calculateArtifactHash(input.bPrimeRevision, "artifactHash");
    input.inputHash = contracts.calculateArtifactHash(input, "inputHash");
    return input;
  });
  const randomRows = sampleRows.slice(0, 12);
  const artifact = derive({
    registrationHash: hash("1"),
    sampleManifestHash: hash("2"),
    executionRegistrationHash: hash("3"),
    sampleRows,
    registeredRandomAuditRows: randomRows,
    triggerInputs,
    deepSeekSuccessfulCallCap: 420,
  });
  assert.equal(artifact.triggerDecisionCount, 60);
  assert.equal(artifact.uniqueC0ItemCount, 13);
  assert.equal(artifact.expectedSuccessfulCallCount, 185);
  assert.equal(artifact.registrationHash, hash("1"));
  assert.throws(() => derive({
    registrationHash: hash("1"),
    sampleManifestHash: hash("2"),
    executionRegistrationHash: hash("3"),
    sampleRows,
    registeredRandomAuditRows: randomRows,
    triggerInputs: triggerInputs.slice(1),
    deepSeekSuccessfulCallCap: 420,
  }), /exactly 60|one trigger/u);
});

test("unknown provider taxonomy is terminally normalized to schema gap without semantic retry", () => {
  const derive = requiredFunction(contracts, "deriveMachineReferenceStateV4");
  const raw = {
    codes: ["MODEL_INVENTED_CODE"],
    uncertain: false,
    assessability: "ASSESSABLE",
  };
  const result = derive({ aRawProviderOutput: raw, bRawProviderOutput: raw });
  assert.deepEqual(result.normalizedA.rawTaxonomyCodes, ["SCHEMA_GAP"]);
  assert.deepEqual(result.normalizedB.rawTaxonomyCodes, ["SCHEMA_GAP"]);
  assert.equal(result.normalizedA.normalizationDisposition, "TERMINAL_SCHEMA_GAP");
  assert.equal(result.requiresAdjudication, true);
  assert.equal(result.finalLabel.finalLabel, "UNRESOLVED_REFERENCE");
  assert.equal(result.retryAllowed, false);
  assert.deepEqual(result.rawA, raw);
  assert.match(result.normalizedA.rawProviderOutputHash, /^[a-f0-9]{64}$/u);
  const classify = requiredFunction(contracts, "classifyMachineReferenceFailureV4");
  assert.equal(classify({ transportStatus: "DELIVERED", parseStatus: "PARSED_JSON", schemaStatus: "UNKNOWN_TAXONOMY_ENUM" }).retryAllowed, false);
  assert.equal(classify({ transportStatus: "DELIVERED", parseStatus: "TRUNCATED_JSON", schemaStatus: "NOT_EVALUATED" }).retryAllowed, true);
});

test("provider-facing machine-reference schema and prompt contain the complete frozen taxonomy enums", () => {
  const taxonomyCodes = Object.keys(contracts.MACHINE_REFERENCE_RAW_LABEL_OUTPUT_SCHEMA.properties.rawTaxonomyCodes.items.enum ?? {});
  assert.deepEqual(contracts.MACHINE_REFERENCE_RAW_LABEL_OUTPUT_SCHEMA.properties.rawTaxonomyCodes.items.enum, contracts.MACHINE_REFERENCE_OPERATIONAL_CODES_V4);
  assert.equal(taxonomyCodes.length > 0, true);
  for (const role of ["A_LABEL", "B_LABEL", "ADJUDICATOR"]) {
    const prompt = contracts.QWEN_ROLE_CONTRACTS[role].promptLiteral;
    for (const code of contracts.MACHINE_REFERENCE_OPERATIONAL_CODES_V4) assert.equal(prompt.includes(code), true, `${role} prompt omits ${code}`);
  }
});

test("triggered agreement and adjudicator undecided have one coherent final-label state machine", () => {
  const derive = requiredFunction(contracts, "deriveReferenceFinalizationStateV4");
  assert.deepEqual(derive({ exactAgreement: true, highestSeverity: "P1", uncertain: false, adjudicatorUndecided: false }), {
    disagreementStatus: "TRIGGERED_AGREEMENT",
    finalizationMode: "FINAL_ADJUDICATED",
    requiresAdjudication: true,
    finalLabelStatus: "RESOLVED_REFERENCE",
  });
  assert.deepEqual(derive({ exactAgreement: false, highestSeverity: "P2", uncertain: false, adjudicatorUndecided: true }), {
    disagreementStatus: "ADJUDICATOR_UNDECIDED",
    finalizationMode: "FINAL_ADJUDICATED",
    requiresAdjudication: true,
    finalLabelStatus: "UNRESOLVED_REFERENCE",
  });
});

test("B-prime revision receives the critique and authoritative reducer removes withdrawn findings", () => {
  const buildRequest = requiredFunction(contracts, "buildBPrimeRevisionRequestV4");
  const reduce = requiredFunction(contracts, "reduceBPrimeCritiqueRevisionV4");
  const critique = {
    itemHash: hash("1"),
    critiqueHash: hash("2"),
    findings: [
      { findingId: "f-1", code: "EVIDENCE_MISMATCH", requiredResolution: true },
      { findingId: "f-2", code: "MINOR_WORDING_OR_FORMAT", requiredResolution: true },
    ],
  };
  const request = buildRequest({ itemHash: hash("1"), critique });
  assert.equal(request.input.critiqueArtifactHash, hash("2"));
  assert.deepEqual(request.input.critiqueArtifact, critique);
  const final = reduce({
    itemHash: hash("1"),
    critique,
    revision: {
      itemHash: hash("1"),
      critiqueHash: hash("2"),
      resolutions: [
        { findingId: "f-1", disposition: "WITHDRAWN" },
        { findingId: "f-2", disposition: "RETAINED" },
      ],
      findings: [{ findingId: "f-2", code: "MINOR_WORDING_OR_FORMAT" }],
    },
  });
  assert.deepEqual(final.findings.map((finding) => finding.findingId), ["f-2"]);
  assert.throws(() => reduce({ itemHash: hash("1"), critique, revision: { itemHash: hash("1"), critiqueHash: hash("2"), resolutions: [], findings: [] } }), /every critique|resolution/u);
});

test("wire evidence binds logical request exact wire body raw response parsed role payload and adapter", () => {
  const build = requiredFunction(contracts, "buildProviderWireEvidenceV4");
  const parsedRolePayload = {
    valid: true,
    surfaceDisposition: "NO_FINDING",
    findings: [],
    requiredRevisionCodes: [],
  };
  const providerEnvelope = {
    id: "req-1",
    model: "deepseek-v4-pro",
    choices: [{
      index: 0,
      message: { role: "assistant", content: contracts.canonicalJson(parsedRolePayload) },
      finish_reason: "stop",
    }],
    usage: {
      prompt_tokens: 10,
      completion_tokens: 5,
      completion_tokens_details: { reasoning_tokens: 2 },
      total_tokens: 15,
    },
  };
  let evidence;
  assert.doesNotThrow(() => {
    evidence = build({
    provider: "DEEPSEEK_DIRECT",
    role: "B_PRIME_CRITIQUE",
    endpoint: "https://api.deepseek.com/chat/completions",
    model: "deepseek-v4-pro",
    systemPrompt: "Frozen system prompt.",
    userPayload: { prompt: "2+2?" },
    responseSchema: contracts.DEEPSEEK_ROLE_CONTRACTS.B_PRIME_CRITIQUE.outputSchema,
    adapterTransformHash: hash("a"),
    rawWireResponseBytes: JSON.stringify(providerEnvelope),
    parsedRolePayload,
    });
  }, "V4 wire evidence must accept exact raw UTF-8 response bytes");
  for (const field of ["logicalRequestHash", "wireRequestBodyHash", "rawWireResponseHash", "parsedRolePayloadHash", "adapterTransformHash"]) {
    assert.match(evidence[field], /^[a-f0-9]{64}$/u, field);
  }
  assert.equal(evidence.wireRequestBody.messages[0].content.includes("Frozen system prompt."), true);
  assert.equal(evidence.wireRequestBody.messages[0].content.includes(evidence.logicalRequest.responseSchemaLiteral), true);
  assert.equal(evidence.wireRequestBody.messages[0].content.includes(evidence.logicalRequest.responseSchemaHash), true);
  assert.deepEqual(evidence.wireRequestBody.response_format, { type: "json_object" });
  assert.equal(evidence.wireRequestSerializationAlgorithm, "UTF8_RFC8785_JCS_EXACT_BYTES_V1");
  assert.equal(evidence.rawWireResponseEncoding, "PROVIDER_HTTP_BODY_EXACT_UTF8_BYTES_V1");
  const whitespaceVariant = build({
    provider: "DEEPSEEK_DIRECT",
    role: "B_PRIME_CRITIQUE",
    endpoint: "https://api.deepseek.com/chat/completions",
    model: "deepseek-v4-pro",
    systemPrompt: "Frozen system prompt.",
    userPayload: { prompt: "2+2?" },
    responseSchema: contracts.DEEPSEEK_ROLE_CONTRACTS.B_PRIME_CRITIQUE.outputSchema,
    adapterTransformHash: hash("a"),
    rawWireResponseBytes: JSON.stringify(providerEnvelope, null, 2),
    parsedRolePayload,
  });
  assert.notEqual(whitespaceVariant.rawWireResponseHash, evidence.rawWireResponseHash, "raw response hash must bind exact bytes, not normalized JSON");
  assert.equal(whitespaceVariant.parsedRolePayloadHash, evidence.parsedRolePayloadHash);
});

test("post-dispatch unknown usage reserves worst case and cannot become a free retry", () => {
  const derive = requiredFunction(contracts, "deriveAttemptAccountingV4");
  const pre = derive({ dispatchState: "NOT_DISPATCHED", failureClass: "LOCAL_PREFLIGHT_REJECTION", worstCaseReserve: { inputTokens: 100, outputTokens: 200, reasoningTokens: 50, usd: 1 } });
  assert.deepEqual(pre, { usageState: "ZERO_COST_PRE_DISPATCH", reservedTokens: 0, reservedUsd: 0, retryConsumesReserve: false });
  const post = derive({ dispatchState: "DISPATCHED", failureClass: "TIMEOUT", worstCaseReserve: { inputTokens: 100, outputTokens: 200, reasoningTokens: 50, usd: 1 } });
  assert.equal(post.usageState, "USAGE_UNKNOWN_PENDING_PROVIDER_RECONCILIATION");
  assert.equal(post.reservedTokens, 350);
  assert.equal(post.reservedUsd, 1);
  assert.equal(post.retryConsumesReserve, true);
});

test("trusted out-of-band authorization roots are mandatory before dispatch", () => {
  const check = requiredFunction(contracts, "authorizeDispatchCheckV4");
  const supplied = { authorizationHash: hash("1"), priceSnapshotHash: hash("2"), ownerGrantRootHash: hash("3") };
  assert.deepEqual(check({ supplied, trusted: supplied }), { dispatchAllowed: true, httpRequestCount: 0, errors: [] });
  const missing = check({ supplied, trusted: null });
  assert.equal(missing.dispatchAllowed, false);
  assert.equal(missing.httpRequestCount, 0);
  assert.equal(missing.errors.length > 0, true);
});

test("public V4 authorization and attempt validators reject partial persisted artifacts and preserve pessimistic reserve", () => {
  const validateAuthorization = requiredFunction(contracts, "validateProviderAuthorizationV4");
  const validateAttempt = requiredFunction(contracts, "validateProviderAttemptReceiptV4");
  const authorization = {
    schemaVersion: "ProviderAuthorizationV1",
    provider: "DEEPSEEK_DIRECT",
    model: "deepseek-v4-pro",
    endpoint: "https://api.deepseek.com/chat/completions",
    ownerGrantHash: hash("1"),
    priceSnapshot: { priceSnapshotHash: hash("2") },
  };
  authorization.authorizationHash = contracts.calculateArtifactHash(authorization, "authorizationHash");
  const trusted = {
    trustedAuthorizationHash: authorization.authorizationHash,
    trustedPriceSnapshotHash: hash("2"),
    trustedOwnerGrantRootHash: hash("1"),
  };
  assert.equal(validateAuthorization(authorization, trusted).some((error) => /persisted schema|closed/iu.test(error)), true);
  assert.equal(validateAuthorization(authorization, {}).length > 0, true);

  const attempt = makeCompleteDeepSeekTimeoutAttempt({ authorizationHash: authorization.authorizationHash });
  const attemptErrors = validateAttempt(attempt, authorization, { ...trusted, worstCasePerRequestReserve: { tokens: 16384, usd: 1 } });
  assert.equal(attemptErrors.some((error) => /authorization.*persisted schema|authorization.*closed/iu.test(error)), true);
  assert.equal(attemptErrors.some((error) => /attempt.*persisted schema|attempt.*closed/iu.test(error)), false);
  const freeTimeout = { ...attempt, reservedTokens: 0, reservedUsd: 0 };
  freeTimeout.selfHash = contracts.calculateArtifactHash(freeTimeout, "selfHash");
  assert.equal(validateAttempt(freeTimeout, authorization, { ...trusted, worstCasePerRequestReserve: { tokens: 16384, usd: 1 } }).some((error) => /reserve|usage/iu.test(error)), true);
});

test("57 to 59 complete items use hash-bound missing receipt bundles", () => {
  const buildMissing = requiredFunction(contracts, "buildMissingReceiptItemBundleV1");
  const validateAccounting = requiredFunction(contracts, "validateExecutionItemAccountingV4");
  const missingInput = (itemHash, itemIdPseudonym, clusterId) => ({
    itemAttemptReceipts: [makeCompleteDeepSeekTimeoutAttempt({ itemHash, itemIdPseudonym, clusterId })],
    successfulRoleEvidence: [],
    registrationHash: hash("1"),
    sampleManifestHash: hash("2"),
    executionRegistrationHash: hash("3"),
    itemHash,
    itemId: `item-${itemIdPseudonym}`,
    itemIdPseudonym,
    clusterId,
    reasonCode: "PROVIDER_NETWORK_TERMINAL_FAILURE",
  });
  const missing = buildMissing(missingInput(hash("4"), `ca60-${"1".repeat(32)}`, "c-001"));
  const missing2 = buildMissing(missingInput(hash("6"), `ca60-${"2".repeat(32)}`, "c-002"));
  const missing3 = buildMissing(missingInput(hash("7"), `ca60-${"3".repeat(32)}`, "c-003"));
  const underfitAttempt = {
    itemHash: hash("a"),
    itemIdPseudonym: `ca60-${"a".repeat(32)}`,
    sequenceNumber: 1,
    attemptStatus: "TIMEOUT",
  };
  underfitAttempt.selfHash = contracts.calculateArtifactHash(underfitAttempt, "selfHash");
  assert.throws(() => buildMissing({
    ...missingInput(hash("a"), `ca60-${"a".repeat(32)}`, "c-underfit"),
    itemAttemptReceipts: [underfitAttempt],
  }), /ProviderAttemptReceiptV1|persisted schema|closed/u);
  const complete = Array.from({ length: 57 }, (_, index) => ({
    itemHash: String(index + 100).padStart(64, "0"),
    itemIdPseudonym: `ca60-${(index + 100).toString(16).padStart(32, "0")}`,
    clusterId: `complete-cluster-${index}`,
    executionDisposition: "COMPLETE",
  }));
  assert.equal(missing.executionDisposition, "MISSING_RECEIPT");
  assert.match(missing.missingReceiptBundleHash, /^[a-f0-9]{64}$/u);
  const sampleManifestRows = [...complete, missing, missing2, missing3].map(({ itemHash, itemIdPseudonym, clusterId }) => ({ itemHash, itemIdPseudonym, clusterId }));
  assert.deepEqual(validateAccounting({ expectedItemCount: 60, sampleManifestRows, completeItemBundles: complete, missingItemBundles: [missing, missing2, missing3], unresolvedReferenceItemCount: 0, invalidItemCount: 0 }), []);
  assert.equal(validateAccounting({ expectedItemCount: 60, sampleManifestRows, completeItemBundles: complete, missingItemBundles: [missing, missing2, missing3], unresolvedReferenceItemCount: 1, invalidItemCount: 0 }).some((error) => /nonresolved/u.test(error)), true);
  const substituted = structuredClone(sampleManifestRows);
  substituted[59].itemHash = hash("f");
  assert.equal(validateAccounting({ expectedItemCount: 60, sampleManifestRows: substituted, completeItemBundles: complete, missingItemBundles: [missing, missing2, missing3], unresolvedReferenceItemCount: 0, invalidItemCount: 0 }).some((error) => /manifest|identity/u.test(error)), true);
});

test("provider aggregate reports consumed and post-dispatch pending reserve without understating caps", () => {
  const recompute = requiredFunction(contracts, "recomputeProviderAggregateV4");
  const attempts = [
    { attemptStatus: "SUCCESS", usageState: "PROVIDER_USAGE_RECONCILED", totalTokens: 150, estimatedCost: 0.01, latencyMs: 10, reconciliationReceiptHash: null },
    { attemptStatus: "TIMEOUT", usageState: "USAGE_UNKNOWN_PENDING_PROVIDER_RECONCILIATION", totalTokens: 0, estimatedCost: 0, reservedTokens: 16384, reservedUsd: 1, latencyMs: 20, reconciliationReceiptHash: null },
  ];
  const aggregate = recompute(attempts, "DEEPSEEK_DIRECT", "deepseek-v4-pro");
  assert.equal(aggregate.consumedTokens, 150);
  assert.equal(aggregate.pendingReservedTokens, 16384);
  assert.equal(aggregate.capAccountedTokens, 16534);
  assert.equal(aggregate.capAccountedUsd, 1.01);
  assert.equal(aggregate.usageReconciliationPendingCount, 1);
  assert.equal(aggregate.providerInvoiceAuthoritative, true);
});

test("one public limitation enum is shared by registration report and A18 gate", () => {
  const limitations = requiredValue(contracts, "FROZEN_PUBLIC_LIMITATIONS_V4");
  assert.deepEqual(limitations, [
    "CALIFORNIA_EGRESS_ELIGIBLE_SUBPOPULATION_ONLY",
    "MACHINE_REFERENCE_PANEL_NOT_HUMAN_GOLD",
    "SAME_MODEL_CORRELATED_ERROR_RISK",
    "CA60_STRUCTURALLY_UNDERPOWERED_FOR_JOINT_SURFACE_GATES",
    "NO_CROSS_REGION_COMPARISON",
    "NO_GENERAL_MACHINE_QA_VALIDITY_CLAIM",
    "NO_AUTOMATIC_PROMOTION_DEPLOYMENT_OR_LIVE_CONTENT_MUTATION",
  ]);
});

test("final receipt materializes matching strata weights Kish agreement and adjudication summaries", () => {
  const derive = requiredFunction(contracts, "deriveFinalReceiptSummariesV4");
  const summary = derive({
    matchingMatrix: [{ referenceFindingId: "r1", machineFindingId: "m1", matchType: "EXACT" }],
    strata: [{ stratum: "short-answer::Medium", selectedCount: 60 }],
    clusterWeights: [{ clusterId: "c1", primaryWeight: 1, analysisWeight: 2 }],
    kishEffectiveSampleSize: 59.5,
    agreement: { rawAgreement: 0.9, cohenKappa: 0.8, gwetAc1: 0.85, familyJaccard: 0.9, codeJaccard: 0.88, severityAgreement: 0.92 },
    adjudicationCount: 12,
    itemCount: 60,
  });
  assert.equal(summary.adjudicationSummary.adjudicationRate, 0.2);
  for (const field of ["matchingMatrixHash", "strataSummaryHash", "clusterWeightSummaryHash", "agreementSummaryHash", "finalSummaryRootHash"]) assert.match(summary[field], /^[a-f0-9]{64}$/u);
});

test("DeepSeek route probe has a separate minimal authorization and no natural item text", () => {
  const validate = requiredFunction(contracts, "validateDeepSeekRouteProbeReceiptV1");
  const validateAuthorization = requiredFunction(contracts, "validateDeepSeekRouteProbeAuthorizationV1");
  const authorization = {
    schemaVersion: "DeepSeekRouteProbeAuthorizationV1",
    registrationHash: hash("0"),
    provider: "DEEPSEEK_DIRECT",
    endpoint: "https://api.deepseek.com/chat/completions",
    requestedModel: "deepseek-v4-pro",
    role: "DEEPSEEK_DIRECT_ROUTE_PROBE",
    maximumAttempts: 1,
    maximumTokens: 256,
    maximumEstimatedUsd: 0.1,
    containsNaturalItemTextAuthorized: false,
    ownerGrantRootHash: hash("3"),
    issuedAt: "2026-08-25T09:00:00.000Z",
    expiresAt: "2026-08-25T10:00:00.000Z",
  };
  authorization.authorizationHash = contracts.calculateArtifactHash(authorization, "authorizationHash");
  assert.deepEqual(validateAuthorization(authorization, { trustedAuthorizationHash: authorization.authorizationHash, trustedOwnerGrantRootHash: hash("3"), at: "2026-08-25T09:30:00.000Z" }), []);
  const receipt = {
    schemaVersion: "DeepSeekRouteProbeReceiptV1",
    authorizationHash: authorization.authorizationHash,
    provider: "DEEPSEEK_DIRECT",
    endpoint: "https://api.deepseek.com/chat/completions",
    observedEndpointHostname: "api.deepseek.com",
    requestedModel: "deepseek-v4-pro",
    observedModel: "deepseek-v4-pro",
    role: "DEEPSEEK_DIRECT_ROUTE_PROBE",
    containsNaturalItemText: false,
    payloadKind: "STATIC_NON_NATURAL_ROUTE_PROBE",
  };
  receipt.receiptHash = contracts.calculateArtifactHash(receipt, "receiptHash");
  assert.deepEqual(validate(receipt, { trustedAuthorizationHash: authorization.authorizationHash }), []);
  assert.equal(validate({ ...receipt, containsNaturalItemText: true }, { trustedAuthorizationHash: authorization.authorizationHash }).length > 0, true);
});

test("owner authorization template literals and hashes are frozen but are not current grants", () => {
  const templates = requiredValue(contracts, "OWNER_AUTHORIZATION_TEMPLATES_V4");
  for (const provider of ["QWEN_MACHINE_REFERENCE", "DEEPSEEK_EVALUATION"]) {
    assert.equal(typeof templates[provider].literal, "string");
    assert.match(templates[provider].templateHash, /^[a-f0-9]{64}$/u);
    assert.equal(templates[provider].isCurrentAuthorization, false);
  }
});

test("credential readiness receipt is closed and cannot carry a credential value", () => {
  const validate = requiredFunction(contracts, "validateCredentialReadinessReceiptV1");
  const receipt = {
    schemaVersion: "CredentialReadinessReceiptV1",
    provider: "DEEPSEEK_DIRECT",
    variableName: "DEEPSEEK_API_KEY",
    targetEnvironment: "LOCAL_EXECUTION_WORKTREE",
    status: "present",
    checkedAt: "2026-08-25T10:00:00.000Z",
  };
  receipt.receiptHash = contracts.calculateArtifactHash(receipt, "receiptHash");
  assert.deepEqual(validate(receipt), []);
  assert.equal(validate({ ...receipt, credentialValue: "must-not-appear" }).length > 0, true);
});

test("frame freeze requires an explicit lineage-rule owner approval hash", () => {
  const validate = requiredFunction(sample, "validateLineageRuleApprovalV4");
  assert.deepEqual(validate({ lineageRuleApprovalHash: hash("1"), approvedRuleHash: sample.LINEAGE_RULE_HASH_V4 }, { trustedOwnerApprovalHash: hash("1") }), []);
  assert.equal(validate({ lineageRuleApprovalHash: null, approvedRuleHash: sample.LINEAGE_RULE_HASH_V4 }, { trustedOwnerApprovalHash: null }).length > 0, true);
});

test("redacted errors are bounded enums and runner persistence proof is executable", () => {
  const sanitize = requiredFunction(contracts, "sanitizeRedactedErrorV4");
  const validate = requiredFunction(contracts, "validateRunnerPersistenceProofV1");
  assert.equal(sanitize("timeout with /Users/name/secret and arbitrary provider body"), "PROVIDER_TIMEOUT_REDACTED");
  assert.equal(sanitize("totally unknown exception text"), "UNCLASSIFIED_ERROR_REDACTED");
  const proof = {
    schemaVersion: "RunnerPersistenceProofV1",
    appendOnlyTestPassed: true,
    atomicRenameTestPassed: true,
    fileModeObserved: "0600",
    fileStatTestPassed: true,
    fsyncFileTestPassed: true,
    fsyncDirectoryTestPassed: true,
    secretSentinelAbsent: true,
    rawErrorSentinelAbsent: true,
    testCommandHash: hash("1"),
    fixtureRootHash: hash("2"),
  };
  proof.proofHash = contracts.calculateArtifactHash(proof, "proofHash");
  assert.deepEqual(validate(proof), []);
  assert.equal(validate({ ...proof, fsyncDirectoryTestPassed: false }).length > 0, true);
});

test("V4 registration and schema are actual new append-only artifacts", () => {
  const registration = JSON.parse(fs.readFileSync(new URL("./design-registration.json", import.meta.url), "utf8"));
  assert.equal(registration.designId, "MAIS-NATURAL-CA60-V4");
  assert.equal(registration.version, 4);
  assert.equal(registration.proposedSupersedesRegistrationHash, "08e89a4d0c6736b48c1dde0048d8f620c35fc486e1d1feaf272e30a1aae4973d");
  assert.equal(registration.proposedSupersedesDispositionAfterValidFreeze, "SUPERSEDED_NOT_EXECUTED");
  assert.equal(Object.hasOwn(registration, "supersedesRegistrationHash"), false);
  assert.equal(registration.providerEventCount, 0);
  assert.equal(registration.firstProviderExecutionAllowed, false);
});
