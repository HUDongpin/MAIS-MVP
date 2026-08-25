import assert from "node:assert/strict";
import test from "node:test";

import {
  buildFrozenProviderRequest,
  C0_MANDATORY_REASON_CODES,
  calculateArtifactHash,
  canonicalJson,
  DEEPSEEK_EGRESS_ALLOWLIST,
  DEEPSEEK_ROLE_CONTRACTS,
  DEEPSEEK_ROLE_SET,
  deriveC0ExecutionSet,
  deriveC0TriggerDecision,
  providerRequestTemplateHash,
  reduceC0RoleOutputBundle,
  sha256Hex,
} from "./design-contract.mjs";

const hash = (character) => character.repeat(64);

function withHash(artifact, field) {
  artifact[field] = calculateArtifactHash(artifact, field);
  return artifact;
}

function validTriggerInput(overrides = {}) {
  const input = {
    schemaVersion: "C0TriggerInputV1",
    designId: "MAIS-NATURAL-CA60-V3",
    registrationHash: hash("3"),
    sampleManifestHash: hash("4"),
    executionRegistrationHash: hash("5"),
    itemHash: hash("6"),
    clusterId: "cluster-001",
    itemIdPseudonym: "item-pseudo-001",
    localDeterministicEvidence: {
      schemaVersion: "C0LocalDeterministicEvidenceV1",
      algorithmSetHash: hash("7"),
      itemHash: hash("6"),
      mathAnswerKey: {
        screenComplete: true,
        issueCodes: [],
      },
      rightsProvenanceReconstruction: {
        screenComplete: true,
        disposition: "CLEARED_FOR_AUTHORIZED_EGRESS",
        issueCodes: [],
      },
      learnerFit: {
        screenComplete: true,
        checkedDimensions: ["AGE", "GRADE", "CURRICULUM", "LANGUAGE", "REGION"],
        issueCodes: [],
      },
      answerCriticalEvidence: {
        screenComplete: true,
        requiredAssetTypes: [],
        verifiedAssetTypes: [],
        issueCodes: [],
      },
      validation: {
        schemaValid: true,
        roleSequenceValid: true,
        taxonomyCodesValid: true,
        errorCodes: [],
      },
      deterministicFindingKeys: ["RESPONSE_ACCEPTANCE:EQUIVALENT_ANSWER_NOT_ACCEPTED"],
    },
    bPrimeCritique: withHash({
      schemaVersion: "BPrimeCritiqueEvidenceV1",
      itemHash: hash("6"),
      requiredRevisionCodes: ["CHECK_EQUIVALENT_RESPONSE"],
      validityStatus: "VALID",
    }, "artifactHash"),
    bPrimeRevision: withHash({
      schemaVersion: "BPrimeRevisionEvidenceV1",
      itemHash: hash("6"),
      resolvedCritiqueCodes: ["CHECK_EQUIVALENT_RESPONSE"],
      finalFindingKeys: ["RESPONSE_ACCEPTANCE:EQUIVALENT_ANSWER_NOT_ACCEPTED"],
      validityStatus: "VALID",
    }, "artifactHash"),
    validatedScope: {
      schemaVersion: "C0ValidatedScopeV1",
      itemHash: hash("6"),
      itemScopeTags: ["CA", "US_CA_MATH", "STUDENT"],
      allowedScopeTags: ["CA", "US_CA_MATH", "STUDENT"],
      metadataEvidenceComplete: true,
      declaredDistribution: "IN_SCOPE",
    },
    registeredRandomAudit: false,
    qwenInputCount: 0,
    derivedAtStage: "AFTER_B_PRIME_REVISION_BEFORE_ANY_C0_CALL",
    ...overrides,
  };
  return withHash(input, "inputHash");
}

test("C0 mandatory predicates are derived from evidence rather than caller booleans", () => {
  const clear = deriveC0TriggerDecision(validTriggerInput());
  assert.deepEqual(clear.mandatoryReasonCodes, []);
  assert.deepEqual(clear.selectionReasonCodes, []);
  assert.equal(clear.selectedForC0, false);

  const rightsRisk = validTriggerInput();
  rightsRisk.localDeterministicEvidence.rightsProvenanceReconstruction.disposition = "RECONSTRUCTION_RISK";
  rightsRisk.localDeterministicEvidence.rightsProvenanceReconstruction.issueCodes = ["SOURCE_RECONSTRUCTION"];
  withHash(rightsRisk, "inputHash");
  const riskDecision = deriveC0TriggerDecision(rightsRisk);
  assert.deepEqual(riskDecision.mandatoryReasonCodes, ["SOURCE_RIGHTS_OR_RECONSTRUCTION_RISK"]);
  assert.equal(riskDecision.selectedForC0, true);
  assert.equal(riskDecision.selectionReasonCodes.includes("REGISTERED_RANDOM_AUDIT"), false);

  const callerBoolean = validTriggerInput({ possibleP0OrP1MathOrAnswerKey: false });
  assert.throws(() => deriveC0TriggerDecision(callerBoolean), /caller-supplied predicate|unexpected C0 trigger input field/u);
});

test("missing, unknown, and malformed evidence fail safe to the corresponding mandatory trigger", () => {
  const missing = validTriggerInput();
  delete missing.localDeterministicEvidence.rightsProvenanceReconstruction;
  withHash(missing, "inputHash");
  const missingDecision = deriveC0TriggerDecision(missing);
  assert.equal(missingDecision.mandatoryReasonCodes.includes("SOURCE_RIGHTS_OR_RECONSTRUCTION_RISK"), true);
  assert.equal(missingDecision.failSafeReasonCodes.includes("SOURCE_RIGHTS_OR_RECONSTRUCTION_RISK"), true);

  const malformed = validTriggerInput();
  malformed.bPrimeRevision.validityStatus = "MALFORMED";
  withHash(malformed.bPrimeRevision, "artifactHash");
  withHash(malformed, "inputHash");
  const malformedDecision = deriveC0TriggerDecision(malformed);
  assert.equal(malformedDecision.mandatoryReasonCodes.includes("DETERMINISTIC_VS_B_PRIME_CONFLICT"), true);
  assert.equal(malformedDecision.mandatoryReasonCodes.includes("CRITIQUE_VS_REVISION_CONFLICT"), true);
  assert.equal(malformedDecision.mandatoryReasonCodes.includes("INVALID_TAXONOMY_SCHEMA_OR_ROLE"), true);
});

test("C0 trigger input rejects every Qwen/reference leakage path and binds its own hash", () => {
  const leaked = validTriggerInput({ qwenReferenceLabelHash: hash("9") });
  assert.throws(() => deriveC0TriggerDecision(leaked), /Qwen or reference input|unexpected C0 trigger input field/u);

  const tampered = validTriggerInput();
  tampered.validatedScope.declaredDistribution = "OUT_OF_DISTRIBUTION";
  assert.throws(() => deriveC0TriggerDecision(tampered), /input hash/u);
});

test("registered random audit remains separate from mandatory reasons", () => {
  const randomOnly = deriveC0TriggerDecision(validTriggerInput({ registeredRandomAudit: true }));
  assert.deepEqual(randomOnly.mandatoryReasonCodes, []);
  assert.deepEqual(randomOnly.selectionReasonCodes, ["REGISTERED_RANDOM_AUDIT"]);
  assert.equal(randomOnly.selectedForC0, true);
  assert.equal(C0_MANDATORY_REASON_CODES.includes("REGISTERED_RANDOM_AUDIT"), false);
});

test("C0 execution set is the unique union of random 12 and mandatory items with exact call math", () => {
  const sampleRows = Array.from({ length: 60 }, (_, index) => ({
    itemIdPseudonym: `item-pseudo-${String(index + 1).padStart(3, "0")}`,
    itemHash: calculateArtifactHash({ index }, "none"),
    clusterId: `cluster-${String(index + 1).padStart(3, "0")}`,
  }));
  const randomAuditRows = sampleRows.slice(0, 12);
  const mandatoryDecision = (row, reason) => {
    const input = validTriggerInput();
    input.itemIdPseudonym = row.itemIdPseudonym;
    input.itemHash = row.itemHash;
    input.clusterId = row.clusterId;
    input.localDeterministicEvidence.itemHash = row.itemHash;
    input.bPrimeCritique.itemHash = row.itemHash;
    withHash(input.bPrimeCritique, "artifactHash");
    input.bPrimeRevision.itemHash = row.itemHash;
    withHash(input.bPrimeRevision, "artifactHash");
    input.validatedScope.itemHash = row.itemHash;
    if (reason === "SOURCE_RIGHTS_OR_RECONSTRUCTION_RISK") {
      input.localDeterministicEvidence.rightsProvenanceReconstruction.disposition = "RECONSTRUCTION_RISK";
      input.localDeterministicEvidence.rightsProvenanceReconstruction.issueCodes = ["SOURCE_RECONSTRUCTION"];
    } else {
      input.validatedScope.declaredDistribution = "OUT_OF_DISTRIBUTION";
    }
    withHash(input, "inputHash");
    return deriveC0TriggerDecision(input);
  };
  const mandatoryDecisions = [
    mandatoryDecision(sampleRows[0], "SOURCE_RIGHTS_OR_RECONSTRUCTION_RISK"),
    mandatoryDecision(sampleRows[12], "DECLARED_OUT_OF_DISTRIBUTION"),
  ];
  const executionSet = deriveC0ExecutionSet({
    sampleRows,
    registeredRandomAuditRows: randomAuditRows,
    mandatoryDecisions,
    deepSeekSuccessfulCallCap: 420,
  });
  assert.equal(executionSet.registeredRandomAuditCount, 12);
  assert.equal(executionSet.mandatoryItemCount, 2);
  assert.equal(executionSet.uniqueC0ItemCount, 13);
  assert.equal(executionSet.expectedSuccessfulCallCount, 120 + 5 * 13);
  assert.equal(executionSet.c0Rows.filter((row) => row.itemIdPseudonym === sampleRows[0].itemIdPseudonym).length, 1);

  assert.throws(() => deriveC0ExecutionSet({
    sampleRows,
    registeredRandomAuditRows: randomAuditRows,
    mandatoryDecisions,
    deepSeekSuccessfulCallCap: 184,
  }), /cap insufficient|fail closed/u);
});

function deepSeekAuthorization() {
  const priceSnapshot = withHash({
    officialSourceHash: hash("0"),
    snapshotAt: "2026-08-25T03:00:00.000Z",
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
  const worstCaseUsagePlan = {
    inputTokens: 3_000_000,
    outputTokens: 3_000_000,
    reasoningTokens: 0,
    totalTokens: 6_000_000,
    maximumSuccessfulCalls: 420,
  };
  const worstCaseCostPreviewUsd = 0.9;
  return withHash({
    schemaVersion: "ProviderAuthorizationV1",
    designId: "MAIS-NATURAL-CA60-V3",
    registrationHash: hash("3"),
    frameRegistrationHash: hash("a"),
    samplingFrameHash: hash("b"),
    sampleManifestHash: hash("4"),
    runtimeConfigHash: hash("c"),
    promptSetHash: hash("d"),
    schemaSetHash: hash("e"),
    runnerCommit: "f".repeat(40),
    runnerHash: hash("1"),
    adapterHash: hash("2"),
    provider: "DEEPSEEK_DIRECT",
    region: "PROVIDER_MANAGED",
    endpoint: "https://api.deepseek.com/chat/completions",
    model: "deepseek-v4-pro",
    roleSet: [...DEEPSEEK_ROLE_SET],
    requestTemplateHash: providerRequestTemplateHash("DEEPSEEK_DIRECT"),
    payloadSetHash: sha256Hex(canonicalJson(DEEPSEEK_EGRESS_ALLOWLIST)),
    allowedOrigin: "FROZEN_RUNTIME_VISIBLE_CA_FRAME",
    egressAllowlist: [...DEEPSEEK_EGRESS_ALLOWLIST],
    egressDenylist: [
      "QWEN_FINAL_REFERENCE_TO_DEEPSEEK",
      "DEEPSEEK_OUTPUT_TO_QWEN",
      "SOURCE_PATH",
      "GIT_METADATA",
      "CREDENTIAL",
      "STUDENT_OR_USER_DATA",
      "OTHER_ITEM",
      "UNAUTHORIZED_COPYRIGHT_CONTENT",
      "INTERNAL_RESEARCH_RECORD",
    ],
    privacyScreenHash: hash("7"),
    rightsScreenHash: hash("8"),
    issuedAt: "2026-08-25T03:30:00.000Z",
    expiresAt: "2026-08-25T05:00:00.000Z",
    maximumAttempts: 850,
    maximumSuccessfulCalls: 420,
    maximumInputTokens: 6_000_000,
    maximumOutputTokens: 6_000_000,
    maximumTokens: 6_000_000,
    maximumEstimatedUsd: 25,
    currency: "USD",
    concurrencyCap: 4,
    worstCaseUsagePlan,
    worstCaseCostPreviewUsd,
    costBufferMultiplier: 1.2,
    bufferedWorstCaseUsd: worstCaseCostPreviewUsd * 1.2,
    priceSnapshot,
    authorizedBy: "owner-pseudonym",
    ownerGrantHash: hash("5"),
    authorizationEvidenceHash: hash("6"),
    nonAuthorizations: ["NO_DEPLOYMENT", "NO_LIVE_QUESTION_BANK_MUTATION", "NO_GIT_MUTATION", "NO_MODEL_FALLBACK", "NO_BUDGET_TRANSFER", "NO_PROMPT_TUNING", "NO_RESULT_DEPENDENT_REPLACEMENT"],
    previousAuthorizationHash: null,
  }, "authorizationHash");
}

const C0_ROLES = Array.from({ length: 5 }, (_, index) => `C0_PRIME_ROLE_${index + 1}`);

function c0RoleBundle({ identityByRole = {}, parsedPayloadByRole = {} } = {}) {
  const authorization = deepSeekAuthorization();
  const itemProjection = {
    prompt: "What is 1 + 1?",
    options: ["1", "2", "3"],
    storedAnswer: "2",
    acceptedAnswers: ["2"],
    explanation: "One plus one is two.",
    rubric: "Use the frozen taxonomy.",
    difficulty: "Low",
    itemPseudonym: "item-pseudo-001",
  };
  const context = {
    registrationHash: hash("3"),
    frameRegistrationHash: hash("a"),
    sampleManifestHash: hash("4"),
    runtimeConfigHash: hash("c"),
    referenceSealHash: hash("f"),
    executionRegistrationHash: hash("5"),
    itemHash: hash("6"),
    clusterId: "cluster-001",
  };
  const attempts = [];
  const outputs = [];
  const requestBodies = {};
  const responseBodies = {};
  let cumulativeCost = 0;
  for (const [index, role] of C0_ROLES.entries()) {
    const identity = {
      itemIdPseudonym: itemProjection.itemPseudonym,
      itemHash: context.itemHash,
      clusterId: context.clusterId,
      ...(identityByRole[role] ?? {}),
    };
    const contract = DEEPSEEK_ROLE_CONTRACTS[role];
    const requestInput = { ...itemProjection, itemPseudonym: identity.itemIdPseudonym };
    requestBodies[role] = buildFrozenProviderRequest(role, requestInput);
    const parsedPayload = parsedPayloadByRole[role] ?? {
      valid: true,
      surfaceDisposition: "FINDING",
      findings: [{ findingId: "shared-finding-001", evidenceLocator: "ACCEPTED_ANSWERS", code: "EQUIVALENT_ANSWER_NOT_ACCEPTED", family: "RESPONSE_ACCEPTANCE", severity: "P1" }],
    };
    responseBodies[role] = { output: parsedPayload };
    const inputTokens = 100;
    const outputTokens = 50;
    const reasoningTokens = 25;
    const estimatedCost = (inputTokens * 0.1 + outputTokens * 0.2) / 1_000_000;
    cumulativeCost += estimatedCost;
    const startedAt = new Date(Date.parse("2026-08-25T04:01:00.000Z") + index * 2_000).toISOString();
    const finishedAt = new Date(Date.parse(startedAt) + 1_000).toISOString();
    const attempt = withHash({
      schemaVersion: "ProviderAttemptReceiptV1",
      designId: "MAIS-NATURAL-CA60-V3",
      runId: "run-c0-001",
      registrationHash: context.registrationHash,
      frameRegistrationHash: context.frameRegistrationHash,
      sampleManifestHash: context.sampleManifestHash,
      runtimeConfigHash: context.runtimeConfigHash,
      authorizationHash: authorization.authorizationHash,
      referenceSealHash: context.referenceSealHash,
      executionRegistrationHash: context.executionRegistrationHash,
      itemIdPseudonym: identity.itemIdPseudonym,
      itemHash: identity.itemHash,
      attemptId: `attempt-c0-${index + 1}`,
      role,
      sequenceNumber: index + 1,
      requestedProvider: "DEEPSEEK_DIRECT",
      observedProvider: "DEEPSEEK_DIRECT",
      requestedModel: "deepseek-v4-pro",
      observedModel: "deepseek-v4-pro",
      requestedEndpoint: "https://api.deepseek.com/chat/completions",
      observedEndpointHostname: "api.deepseek.com",
      requestBodyHash: sha256Hex(canonicalJson(requestBodies[role])),
      responseBodyHash: sha256Hex(canonicalJson(responseBodies[role])),
      parsedOutputHash: sha256Hex(canonicalJson(parsedPayload)),
      startedAt,
      finishedAt,
      latencyMs: 1000,
      httpStatus: 200,
      providerRequestId: `provider-request-c0-${index + 1}`,
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
      cumulativeCost,
      retryClassification: "NONE",
      redactedError: null,
      appendOnly: true,
      atomicWrite: true,
      fileMode: "0600",
      completedItemCommitMarkerHash: null,
      cacheHit: false,
      providerInvoiceAuthoritative: true,
      previousReceiptHash: attempts.at(-1)?.selfHash ?? null,
    }, "selfHash");
    attempts.push(attempt);
    outputs.push(withHash({
      schemaVersion: "C0RoleOutputV1",
      designId: "MAIS-NATURAL-CA60-V3",
      registrationHash: context.registrationHash,
      sampleManifestHash: context.sampleManifestHash,
      executionRegistrationHash: context.executionRegistrationHash,
      authorizationHash: authorization.authorizationHash,
      itemIdPseudonym: identity.itemIdPseudonym,
      itemHash: identity.itemHash,
      clusterId: identity.clusterId,
      role,
      promptHash: contract.promptHash,
      schemaHash: contract.schemaHash,
      attemptReceiptHash: attempt.selfHash,
      parsedOutputHash: attempt.parsedOutputHash,
      parsedPayload,
    }, "outputHash"));
  }
  const triggerInput = validTriggerInput();
  triggerInput.localDeterministicEvidence.rightsProvenanceReconstruction.disposition = "RECONSTRUCTION_RISK";
  triggerInput.localDeterministicEvidence.rightsProvenanceReconstruction.issueCodes = ["SOURCE_RECONSTRUCTION"];
  withHash(triggerInput, "inputHash");
  return {
    authorization,
    authorizationExpected: {
      ...context,
      samplingFrameHash: authorization.samplingFrameHash,
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
      at: "2026-08-25T04:00:00.000Z",
    },
    context,
    itemProjection,
    triggerDecision: deriveC0TriggerDecision(triggerInput),
    attempts,
    outputs,
    requestBodies,
    responseBodies,
  };
}

test("DeepSeek B-prime and C0 roles freeze exact egress, literal prompts, and real output schemas", () => {
  assert.deepEqual(DEEPSEEK_EGRESS_ALLOWLIST, ["prompt", "options", "storedAnswer", "acceptedAnswers", "explanation", "rubric", "difficulty", "itemPseudonym"]);
  assert.deepEqual(Object.keys(DEEPSEEK_ROLE_CONTRACTS), DEEPSEEK_ROLE_SET);
  for (const contract of Object.values(DEEPSEEK_ROLE_CONTRACTS)) {
    assert.deepEqual(contract.inputFieldNames, DEEPSEEK_EGRESS_ALLOWLIST);
    assert.equal(contract.promptHash, sha256Hex(contract.promptLiteral));
    assert.equal(contract.schemaHash, sha256Hex(canonicalJson(contract.outputSchema)));
    assert.equal(contract.outputSchema.additionalProperties, false);
  }
  assert.notEqual(DEEPSEEK_ROLE_CONTRACTS.B_PRIME_CRITIQUE.promptHash, DEEPSEEK_ROLE_CONTRACTS.B_PRIME_REVISION.promptHash);
});

test("C0 reducer validates exact five-role lineage and deterministically deduplicates findings", () => {
  const bundle = c0RoleBundle();
  const reduced = reduceC0RoleOutputBundle(bundle);
  assert.equal(reduced.status, "RESOLVED");
  assert.equal(reduced.findings.length, 1);
  assert.deepEqual(reduced.findings[0], {
    itemId: "item-pseudo-001",
    findingId: "shared-finding-001",
    evidenceLocator: "ACCEPTED_ANSWERS",
    family: "RESPONSE_ACCEPTANCE",
    code: "EQUIVALENT_ANSWER_NOT_ACCEPTED",
    severity: "P1",
  });
  assert.deepEqual(reduceC0RoleOutputBundle({ ...bundle, outputs: [...bundle.outputs].reverse() }), reduced);

  const duplicateRole = c0RoleBundle();
  duplicateRole.outputs[4] = { ...duplicateRole.outputs[3] };
  assert.throws(() => reduceC0RoleOutputBundle(duplicateRole), /exact five roles|duplicate role/u);
  const sixth = c0RoleBundle();
  sixth.outputs.push({ ...sixth.outputs[0], role: "C0_PRIME_ROLE_6" });
  assert.throws(() => reduceC0RoleOutputBundle(sixth), /exactly five|sixth/u);
});

test("C0 reducer preserves multiple independent same-code findings by stable findingId and evidence locator", () => {
  const independent = [
    { findingId: "acceptance-case-001", evidenceLocator: "ACCEPTED_ANSWERS[0]", code: "EQUIVALENT_ANSWER_NOT_ACCEPTED", family: "RESPONSE_ACCEPTANCE", severity: "P1" },
    { findingId: "acceptance-case-002", evidenceLocator: "ACCEPTED_ANSWERS[1]", code: "EQUIVALENT_ANSWER_NOT_ACCEPTED", family: "RESPONSE_ACCEPTANCE", severity: "P1" },
  ];
  const bundle = c0RoleBundle({
    parsedPayloadByRole: Object.fromEntries(C0_ROLES.map((role) => [role, { valid: true, surfaceDisposition: "FINDING", findings: independent }])),
  });
  const reduced = reduceC0RoleOutputBundle(bundle);
  assert.equal(reduced.status, "RESOLVED");
  assert.deepEqual(reduced.findings.map((finding) => finding.findingId), ["acceptance-case-001", "acceptance-case-002"]);
});

test("C0 reducer rejects five roles mixed across items, prompts, schemas, or execution roots", () => {
  const mixedItems = c0RoleBundle({
    identityByRole: Object.fromEntries(C0_ROLES.map((role, index) => [role, {
      itemIdPseudonym: `other-item-${index + 1}`,
      itemHash: calculateArtifactHash({ other: index }, "none"),
      clusterId: `other-cluster-${index + 1}`,
    }])),
  });
  assert.throws(() => reduceC0RoleOutputBundle(mixedItems), /same item|item lineage|request value/u);

  const promptDrift = c0RoleBundle();
  promptDrift.outputs[0].promptHash = hash("f");
  withHash(promptDrift.outputs[0], "outputHash");
  assert.throws(() => reduceC0RoleOutputBundle(promptDrift), /prompt.*schema|role contract/u);
});

test("C0 reducer handles unknown codes and cross-role conflicts conservatively without a sixth call", () => {
  const unknown = c0RoleBundle({
    parsedPayloadByRole: {
      C0_PRIME_ROLE_5: {
        valid: true,
        surfaceDisposition: "FINDING",
        findings: [{ code: "RUNTIME_FREE_TEXT_CODE", family: "FREE_TEXT", severity: "P0" }],
      },
    },
  });
  const unknownReduced = reduceC0RoleOutputBundle(unknown);
  assert.equal(unknownReduced.status, "UNRESOLVED");
  assert.deepEqual(unknownReduced.unknownCodes, ["RUNTIME_FREE_TEXT_CODE"]);
  assert.equal(unknownReduced.successfulRoleCallCount, 5);

  const conflict = c0RoleBundle({
    parsedPayloadByRole: {
      C0_PRIME_ROLE_4: { valid: true, surfaceDisposition: "NO_FINDING", findings: [] },
    },
  });
  const conflictReduced = reduceC0RoleOutputBundle(conflict);
  assert.equal(conflictReduced.status, "UNRESOLVED");
  assert.equal(conflictReduced.conflictCodes.includes("CROSS_ROLE_SURFACE_DISPOSITION_CONFLICT"), true);
  assert.equal(conflictReduced.successfulRoleCallCount, 5);
});
