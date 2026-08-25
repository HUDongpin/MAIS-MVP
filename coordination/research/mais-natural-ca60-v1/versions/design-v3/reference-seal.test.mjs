import assert from "node:assert/strict";
import test from "node:test";

import {
  acceptedCodeSet,
  buildFrozenProviderRequest,
  calculateArtifactHash,
  calculateFrozenNaturalItemLeafHashV3,
  calculateReferenceLabelSealRoot,
  canonicalJson,
  deriveDeterministicFindingMatches,
  EGRESS_DENYLIST,
  NON_AUTHORIZATIONS,
  providerRequestTemplateHash,
  QWEN_EGRESS_ALLOWLIST,
  QWEN_ROLE_CONTRACTS,
  QWEN_ROLE_SET,
  sha256Hex,
  validateReferenceLabelSealBundle,
  validateReferenceLabelSealV1,
} from "./design-contract.mjs";

const hash = (character) => character.repeat(64);

function withHash(artifact, field) {
  artifact[field] = calculateArtifactHash(artifact, field);
  return artifact;
}

const ITEM_LEAF = Object.freeze({
  schemaVersion: "FrozenNaturalItemLeafV1",
  itemId: "item-001",
  clusterId: "cluster-001",
  region: "CALIFORNIA",
  curriculumProfile: "US_CA_MATH",
  prompt: "What is 1 + 1?",
  options: ["1", "2", "3"],
  locale: "en-US",
  grade: "1",
  topic: "addition",
  canonicalTopic: "addition",
  responseForm: "multiple-choice",
  difficulty: "Low",
  sourceModuleHash: hash("9"),
  storedAnswer: "2",
  acceptedAnswers: ["2"],
  explanation: "One plus one is two.",
  lineageKind: null,
  batchId: null,
  sourceLineageClusterId: null,
  topicId: null,
  generationTemplate: null,
  sourceLessonSlug: null,
});
const ITEM_HASH = calculateFrozenNaturalItemLeafHashV3(ITEM_LEAF);

function qwenAuthorization() {
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
  const worstCaseUsagePlan = {
    inputTokens: 2_000_000,
    outputTokens: 2_000_000,
    reasoningTokens: 0,
    totalTokens: 4_000_000,
    maximumSuccessfulCalls: 300,
  };
  return withHash({
    schemaVersion: "ProviderAuthorizationV1",
    designId: "MAIS-NATURAL-CA60-V3",
    registrationHash: hash("3"),
    frameRegistrationHash: hash("6"),
    samplingFrameHash: hash("2"),
    sampleManifestHash: hash("4"),
    runtimeConfigHash: hash("7"),
    promptSetHash: hash("a"),
    schemaSetHash: hash("b"),
    runnerCommit: "c".repeat(40),
    runnerHash: hash("d"),
    adapterHash: hash("e"),
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
    privacyScreenHash: hash("f"),
    rightsScreenHash: hash("0"),
    issuedAt: "2026-08-25T03:30:00.000Z",
    expiresAt: "2026-08-25T05:00:00.000Z",
    maximumAttempts: 610,
    maximumSuccessfulCalls: 300,
    maximumInputTokens: 4_000_000,
    maximumOutputTokens: 4_000_000,
    maximumTokens: 4_000_000,
    maximumEstimatedUsd: 25,
    currency: "USD",
    concurrencyCap: 4,
    worstCaseUsagePlan,
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
    at: "2026-08-25T04:00:00.000Z",
  };
}

function solveArtifact(role) {
  const contract = QWEN_ROLE_CONTRACTS[role];
  const solveOutput = {
    solution: `${role}-solution`,
    solvability: "SOLVABLE",
    uncertain: false,
  };
  return withHash({
    schemaVersion: "MachineReferenceSolveV1",
    designId: "MAIS-NATURAL-CA60-V3",
    registrationHash: hash("3"),
    sampleManifestHash: hash("4"),
    clusterId: "cluster-001",
    itemId: "item-001",
    itemHash: ITEM_HASH,
    role,
    promptLiteral: contract.promptLiteral,
    promptHash: contract.promptHash,
    schemaHash: contract.schemaHash,
    inputFieldNames: [...contract.inputFieldNames],
    solveAttemptReceiptHash: null,
    deepSeekOutputNotSeen: true,
    otherRaterArtifactsNotSeen: true,
    solveOutput,
    parsedOutputHash: sha256Hex(canonicalJson(solveOutput)),
  }, "artifactHash");
}

function roleInput(role, solveArtifactValue = null) {
  const base = {
    prompt: "What is 1 + 1?",
    options: ["1", "2", "3"],
    locale: "en-US",
    grade: "1",
    topic: "addition",
    responseForm: "multiple-choice",
  };
  if (role.endsWith("_LABEL")) return {
    ...base,
    storedAnswer: "2",
    acceptedAnswers: ["2"],
    explanation: "One plus one is two.",
    itemSolveArtifact: solveArtifactValue,
  };
  return base;
}

function adjudicatorInput(bundle) {
  return {
    prompt: "What is 1 + 1?",
    options: ["1", "2", "3"],
    locale: "en-US",
    grade: "1",
    topic: "addition",
    responseForm: "multiple-choice",
    storedAnswer: "2",
    acceptedAnswers: ["2"],
    explanation: "One plus one is two.",
    aSolveArtifact: bundle.aSolve,
    aLabelArtifact: bundle.aLabel,
    bSolveArtifact: bundle.bSolve,
    bLabelArtifact: bundle.bLabel,
  };
}

function baseAttempt(authorization, role, requestBody, responseBody, parsedOutputHash, sequenceNumber, previousReceiptHash, cumulativeCost) {
  const inputTokens = 100;
  const outputTokens = 50;
  const reasoningTokens = 25;
  const estimatedCost = (inputTokens * authorization.priceSnapshot.inputRate + outputTokens * authorization.priceSnapshot.outputRate) / 1_000_000;
  const startedAt = new Date(Date.parse("2026-08-25T04:01:00.000Z") + (sequenceNumber - 1) * 2_000).toISOString();
  const finishedAt = new Date(Date.parse(startedAt) + 1_000).toISOString();
  return withHash({
    schemaVersion: "ProviderAttemptReceiptV1",
    designId: "MAIS-NATURAL-CA60-V3",
    runId: "run-reference-001",
    registrationHash: hash("3"),
    frameRegistrationHash: hash("6"),
    sampleManifestHash: hash("4"),
    runtimeConfigHash: hash("7"),
    authorizationHash: authorization.authorizationHash,
    referenceSealHash: null,
    executionRegistrationHash: null,
    itemIdPseudonym: "item-pseudo-001",
    itemId: "item-001",
    itemHash: ITEM_HASH,
    clusterId: "cluster-001",
    role,
    attemptId: `reference-attempt-${sequenceNumber}`,
    sequenceNumber,
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
    finishedAt,
    latencyMs: 1000,
    httpStatus: 200,
    providerRequestId: `provider-reference-${sequenceNumber}`,
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
    cumulativeCost: cumulativeCost + estimatedCost,
    retryClassification: "NONE",
    redactedError: null,
    appendOnly: true,
    atomicWrite: true,
    fileMode: "0600",
    completedItemCommitMarkerHash: null,
    cacheHit: false,
    providerInvoiceAuthoritative: true,
    previousReceiptHash,
  }, "selfHash");
}

function rawLabel(role, codes, { uncertain = false } = {}) {
  const ambiguous = codes.includes("FALSE_ACCEPT_CORRECT_RESPONSE");
  const minorWording = codes.includes("MINOR_WORDING_OR_FORMAT");
  return withHash({
    schemaVersion: "MachineReferenceLabelV1",
    designId: "MAIS-NATURAL-CA60-V3",
    registrationHash: hash("3"),
    sampleManifestHash: hash("4"),
    clusterId: "cluster-001",
    itemId: "item-001",
    itemHash: ITEM_HASH,
    labelStage: "RAW_RATER",
    role,
    promptHash: role === "A_LABEL" ? hash("a") : hash("b"),
    schemaHash: hash("c"),
    ownSolveArtifactHash: role === "A_LABEL" ? hash("d") : hash("e"),
    labelAttemptReceiptHash: role === "A_LABEL" ? hash("f") : hash("0"),
    inputFieldNames: ["acceptedAnswers", "explanation", "itemSolveReceipt", "options", "prompt", "storedAnswer"],
    rawLabel: codes.includes("NO_FINDING") ? "NO_FINDING" : "DEFECT",
    rawTaxonomyCodes: codes,
    rawSeverity: ambiguous ? "P0" : minorWording ? "P2" : "NONE",
    rawFindingFamilies: ambiguous
      ? { FALSE_ACCEPT_CORRECT_RESPONSE: "RESPONSE_ACCEPTANCE" }
      : minorWording
        ? { MINOR_WORDING_OR_FORMAT: "WORDING_FORMAT" }
      : { NO_FINDING: null },
    rawFindings: codes.filter((code) => !["NO_FINDING", "UNASSESSABLE", "SCHEMA_GAP"].includes(code)).map((code, index) => ({
      findingId: `${role.toLowerCase()}-finding-${String(index + 1).padStart(3, "0")}`,
      evidenceLocator: "STORED_ANSWER",
      code,
      family: code === "FALSE_ACCEPT_CORRECT_RESPONSE" ? "RESPONSE_ACCEPTANCE" : "WORDING_FORMAT",
      severity: code === "FALSE_ACCEPT_CORRECT_RESPONSE" ? "P0" : "P2",
    })),
    rawUncertain: uncertain,
    deepSeekOutputNotSeen: true,
  }, "labelHash");
}

function finalLabel({ stage = "FINAL_AGREEMENT_MERGE", label = "NO_FINDING", codes = ["NO_FINDING"], reasons = [] } = {}) {
  const findingCodes = codes.filter((code) => !["NO_FINDING", "UNASSESSABLE", "SCHEMA_GAP"].includes(code));
  const severity = label === "UNRESOLVED_REFERENCE" ? "UNRESOLVED"
    : findingCodes.length > 0 ? (findingCodes.some((code) => ["WRONG_CANONICAL_ANSWER", "UNSOLVABLE_OR_INTERNALLY_INCONSISTENT", "FALSE_ACCEPT_CORRECT_RESPONSE", "FALSE_ACCEPT_NEAR_MISS", "FALSE_REJECT_CORRECT_RESPONSE", "ORACLE_OR_PROMPT_LEAKAGE"].includes(code)) ? "P0" : "P1") : "NONE";
  const families = Object.fromEntries(codes.map((code) => [code, code === "FALSE_ACCEPT_CORRECT_RESPONSE" ? "RESPONSE_ACCEPTANCE" : null]));
  return withHash({
    schemaVersion: "MachineReferenceLabelV1",
    designId: "MAIS-NATURAL-CA60-V3",
    registrationHash: hash("3"),
    sampleManifestHash: hash("4"),
    clusterId: "cluster-001",
    itemId: "item-001",
    itemHash: ITEM_HASH,
    labelStage: stage,
    finalizationMode: stage,
    role: stage === "FINAL_AGREEMENT_MERGE" ? "DETERMINISTIC_MERGER" : "ADJUDICATOR",
    providerCall: stage !== "FINAL_AGREEMENT_MERGE",
    rawLabelHashes: [],
    finalLabel: label,
    finalTaxonomyCodes: codes,
    finalSeverity: severity,
    finalFindingFamilies: families,
    finalFindings: findingCodes.map((code, index) => ({
      findingId: `final-finding-${String(index + 1).padStart(3, "0")}`,
      evidenceLocator: "STORED_ANSWER",
      code,
      family: families[code],
      severity: code === "FALSE_ACCEPT_CORRECT_RESPONSE" ? "P0" : "P1",
    })),
    acceptedCodeSets: findingCodes.map((code) => ({ primaryCode: code, family: families[code], acceptedCodes: acceptedCodeSet(code) })),
    disagreementStatus: stage === "FINAL_AGREEMENT_MERGE" ? "AGREEMENT" : "DISAGREEMENT",
    adjudicationReasonCodes: reasons,
    disagreementAdjudicationReceiptHash: stage === "FINAL_AGREEMENT_MERGE" ? null : hash("1"),
  }, "labelHash");
}

function contradictoryAmbiguousBundle() {
  const aLabel = rawLabel("A_LABEL", ["FALSE_ACCEPT_CORRECT_RESPONSE"]);
  const bLabel = rawLabel("B_LABEL", ["NO_FINDING"]);
  const final = finalLabel();
  final.rawLabelHashes = [aLabel.labelHash, bLabel.labelHash];
  withHash(final, "labelHash");
  const seal = withHash({
    schemaVersion: "ItemReferenceLabelSealV1",
    designId: "MAIS-NATURAL-CA60-V3",
    registrationHash: hash("3"),
    sampleManifestHash: hash("4"),
    itemId: "item-001",
    itemHash: ITEM_HASH,
    clusterId: "cluster-001",
    aLabelHash: aLabel.labelHash,
    bLabelHash: bLabel.labelHash,
    finalLabelHash: final.labelHash,
    sealMode: "FINAL_AGREEMENT_MERGE",
    finalizationMode: "FINAL_AGREEMENT_MERGE",
  }, "sealHash");
  return bindSolveArtifacts({ seal, aLabel, bLabel, finalLabel: final });
}

test("FALSE_ACCEPT_CORRECT_RESPONSE is a formal P0 that triggers adjudication and metric credit", () => {
  const errors = validateReferenceLabelSealBundle(contradictoryAmbiguousBundle());
  assert.equal(errors.some((error) => error.includes("triggered") || error.includes("FINAL_ADJUDICATED")), true, errors.join("\n"));
  assert.deepEqual(acceptedCodeSet("FALSE_ACCEPT_CORRECT_RESPONSE"), ["FALSE_ACCEPT_CORRECT_RESPONSE"]);
  const matching = deriveDeterministicFindingMatches(
    [{ itemId: "item-001", findingId: "reference-finding-001", evidenceLocator: "ACCEPTED_ANSWERS", family: "RESPONSE_ACCEPTANCE", code: "FALSE_ACCEPT_CORRECT_RESPONSE", severity: "P0" }],
    [{ itemId: "item-001", findingId: "machine-finding-001", evidenceLocator: "ACCEPTED_ANSWERS", family: "RESPONSE_ACCEPTANCE", code: "FALSE_ACCEPT_CORRECT_RESPONSE", severity: "P0" }],
  );
  assert.equal(matching.matches.length, 1);
});

function agreementBundle() {
  const aLabel = rawLabel("A_LABEL", ["NO_FINDING"]);
  const bLabel = rawLabel("B_LABEL", ["NO_FINDING"]);
  const final = finalLabel();
  final.rawLabelHashes = [aLabel.labelHash, bLabel.labelHash];
  withHash(final, "labelHash");
  const seal = withHash({
    schemaVersion: "ItemReferenceLabelSealV1",
    designId: "MAIS-NATURAL-CA60-V3",
    registrationHash: hash("3"),
    sampleManifestHash: hash("4"),
    itemId: "item-001",
    itemHash: ITEM_HASH,
    clusterId: "cluster-001",
    aLabelHash: aLabel.labelHash,
    bLabelHash: bLabel.labelHash,
    finalLabelHash: final.labelHash,
    sealMode: "FINAL_AGREEMENT_MERGE",
    finalizationMode: "FINAL_AGREEMENT_MERGE",
  }, "sealHash");
  return bindSolveArtifacts({ seal, aLabel, bLabel, finalLabel: final });
}

function bindSolveArtifacts(bundle) {
  bundle.itemLeaf = structuredClone(ITEM_LEAF);
  bundle.manifestRow = {
    itemId: ITEM_LEAF.itemId,
    itemHash: ITEM_HASH,
    clusterId: ITEM_LEAF.clusterId,
    itemIdPseudonym: "item-pseudo-001",
    sampleManifestHash: hash("4"),
  };
  bundle.itemProjection = Object.fromEntries([
    "prompt", "options", "locale", "grade", "topic", "responseForm", "storedAnswer", "acceptedAnswers", "explanation",
  ].map((field) => [field, ITEM_LEAF[field]]));
  bundle.authorization = qwenAuthorization();
  bundle.authorizationExpected = authorizationExpected(bundle.authorization);
  bundle.requestBodies = {};
  bundle.responseBodies = {};
  bundle.parsedOutputs = {};
  bundle.baseAttemptReceipts = {};
  let previousReceiptHash = null;
  let cumulativeCost = 0;
  let sequenceNumber = 0;
  const bindSolve = (role) => {
    const solve = solveArtifact(role);
    const requestBody = buildFrozenProviderRequest(role, roleInput(role));
    const responseBody = { output: solve.solveOutput };
    sequenceNumber += 1;
    const attempt = baseAttempt(bundle.authorization, role, requestBody, responseBody, solve.parsedOutputHash, sequenceNumber, previousReceiptHash, cumulativeCost);
    solve.solveAttemptReceiptHash = attempt.selfHash;
    withHash(solve, "artifactHash");
    bundle.requestBodies[role] = requestBody;
    bundle.responseBodies[role] = responseBody;
    bundle.parsedOutputs[role] = structuredClone(solve.solveOutput);
    bundle.baseAttemptReceipts[role] = attempt;
    previousReceiptHash = attempt.selfHash;
    cumulativeCost = attempt.cumulativeCost;
    return solve;
  };
  const bindLabel = (label, solve, role) => {
    const contract = QWEN_ROLE_CONTRACTS[role];
    label.promptLiteral = contract.promptLiteral;
    label.promptHash = contract.promptHash;
    label.schemaHash = contract.schemaHash;
    label.inputFieldNames = [...contract.inputFieldNames];
    label.ownSolveArtifactHash = solve.artifactHash;
    const parsedPayload = {
      rawLabel: label.rawLabel,
      rawTaxonomyCodes: label.rawTaxonomyCodes,
      rawSeverity: label.rawSeverity,
      rawFindingFamilies: label.rawFindingFamilies,
      rawFindings: label.rawFindings,
      rawUncertain: label.rawUncertain,
    };
    label.parsedOutputHash = sha256Hex(canonicalJson(parsedPayload));
    const requestBody = buildFrozenProviderRequest(role, roleInput(role, solve));
    const responseBody = { output: parsedPayload };
    sequenceNumber += 1;
    const attempt = baseAttempt(bundle.authorization, role, requestBody, responseBody, label.parsedOutputHash, sequenceNumber, previousReceiptHash, cumulativeCost);
    label.labelAttemptReceiptHash = attempt.selfHash;
    withHash(label, "labelHash");
    bundle.requestBodies[role] = requestBody;
    bundle.responseBodies[role] = responseBody;
    bundle.parsedOutputs[role] = parsedPayload;
    bundle.baseAttemptReceipts[role] = attempt;
    previousReceiptHash = attempt.selfHash;
    cumulativeCost = attempt.cumulativeCost;
  };
  bundle.aSolve = bindSolve("A_SOLVE");
  bindLabel(bundle.aLabel, bundle.aSolve, "A_LABEL");
  bundle.bSolve = bindSolve("B_SOLVE");
  bindLabel(bundle.bLabel, bundle.bSolve, "B_LABEL");
  bundle.finalLabel.rawLabelHashes = [bundle.aLabel.labelHash, bundle.bLabel.labelHash];
  withHash(bundle.finalLabel, "labelHash");
  bundle.seal.aSolveHash = bundle.aSolve.artifactHash;
  bundle.seal.bSolveHash = bundle.bSolve.artifactHash;
  bundle.seal.aLabelHash = bundle.aLabel.labelHash;
  bundle.seal.bLabelHash = bundle.bLabel.labelHash;
  bundle.seal.qwenAuthorizationHash = bundle.authorization.authorizationHash;
  bundle.seal.baseAttemptReceiptHashes = ["A_SOLVE", "A_LABEL", "B_SOLVE", "B_LABEL"].map((role) => bundle.baseAttemptReceipts[role].selfHash);
  bundle.attemptChain = ["A_SOLVE", "A_LABEL", "B_SOLVE", "B_LABEL"].map((role) => bundle.baseAttemptReceipts[role]);
  bundle.seal.finalLabelHash = bundle.finalLabel.labelHash;
  withHash(bundle.seal, "sealHash");
  return bundle;
}

function rebindBundle(bundle) {
  if (bundle.aSolve) withHash(bundle.aSolve, "artifactHash");
  if (bundle.bSolve) withHash(bundle.bSolve, "artifactHash");
  if (bundle.aSolve) bundle.aLabel.ownSolveArtifactHash = bundle.aSolve.artifactHash;
  if (bundle.bSolve) bundle.bLabel.ownSolveArtifactHash = bundle.bSolve.artifactHash;
  withHash(bundle.aLabel, "labelHash");
  withHash(bundle.bLabel, "labelHash");
  bundle.finalLabel.rawLabelHashes = [bundle.aLabel.labelHash, bundle.bLabel.labelHash];
  withHash(bundle.finalLabel, "labelHash");
  bundle.seal.aLabelHash = bundle.aLabel.labelHash;
  bundle.seal.bLabelHash = bundle.bLabel.labelHash;
  if (bundle.aSolve) bundle.seal.aSolveHash = bundle.aSolve.artifactHash;
  if (bundle.bSolve) bundle.seal.bSolveHash = bundle.bSolve.artifactHash;
  bundle.seal.finalLabelHash = bundle.finalLabel.labelHash;
  withHash(bundle.seal, "sealHash");
  return bundle;
}

test("deterministic final merge is local-only and rejects A/B disagreement", () => {
  assert.deepEqual(validateReferenceLabelSealBundle(agreementBundle()), []);

  const disagreement = agreementBundle();
  disagreement.bLabel.rawLabel = "DEFECT";
  disagreement.bLabel.rawTaxonomyCodes = ["MINOR_WORDING_OR_FORMAT"];
  disagreement.bLabel.rawSeverity = "P2";
  disagreement.bLabel.rawFindingFamilies = { MINOR_WORDING_OR_FORMAT: "WORDING_FORMAT" };
  rebindBundle(disagreement);
  assert.equal(validateReferenceLabelSealBundle(disagreement).some((error) => error.includes("exactly agree")), true);

  const fabricatedReceipt = agreementBundle();
  fabricatedReceipt.finalLabel.disagreementAdjudicationReceiptHash = hash("1");
  rebindBundle(fabricatedReceipt);
  assert.equal(validateReferenceLabelSealBundle(fabricatedReceipt).some((error) => error.includes("provider receipt")), true);
});

function adjudicatedAmbiguousBundle() {
  const bundle = contradictoryAmbiguousBundle();
  bundle.finalLabel.labelStage = "FINAL_ADJUDICATED";
  bundle.finalLabel.finalizationMode = "FINAL_ADJUDICATED";
  bundle.finalLabel.role = "ADJUDICATOR";
  bundle.finalLabel.providerCall = true;
  bundle.finalLabel.finalLabel = "DEFECT";
  bundle.finalLabel.finalTaxonomyCodes = ["FALSE_ACCEPT_CORRECT_RESPONSE"];
  bundle.finalLabel.finalSeverity = "P0";
  bundle.finalLabel.finalFindingFamilies = { FALSE_ACCEPT_CORRECT_RESPONSE: "RESPONSE_ACCEPTANCE" };
  bundle.finalLabel.finalFindings = [{
    findingId: "final-finding-001",
    evidenceLocator: "STORED_ANSWER",
    code: "FALSE_ACCEPT_CORRECT_RESPONSE",
    family: "RESPONSE_ACCEPTANCE",
    severity: "P0",
  }];
  bundle.finalLabel.acceptedCodeSets = [{ primaryCode: "FALSE_ACCEPT_CORRECT_RESPONSE", family: "RESPONSE_ACCEPTANCE", acceptedCodes: ["FALSE_ACCEPT_CORRECT_RESPONSE"] }];
  bundle.finalLabel.disagreementStatus = "DISAGREEMENT";
  bundle.finalLabel.adjudicationReasonCodes = ["ANY_FIELD_DISAGREEMENT", "ANY_RATER_P0"];
  bundle.finalLabel.promptLiteral = QWEN_ROLE_CONTRACTS.ADJUDICATOR.promptLiteral;
  bundle.finalLabel.promptHash = QWEN_ROLE_CONTRACTS.ADJUDICATOR.promptHash;
  bundle.finalLabel.schemaHash = QWEN_ROLE_CONTRACTS.ADJUDICATOR.schemaHash;
  bundle.finalLabel.inputFieldNames = [...QWEN_ROLE_CONTRACTS.ADJUDICATOR.inputFieldNames];
  const parsedOutput = {
    finalLabel: bundle.finalLabel.finalLabel,
    finalTaxonomyCodes: bundle.finalLabel.finalTaxonomyCodes,
    finalSeverity: bundle.finalLabel.finalSeverity,
    finalFindingFamilies: bundle.finalLabel.finalFindingFamilies,
    finalFindings: bundle.finalLabel.finalFindings,
    adjudicationReasonCodes: bundle.finalLabel.adjudicationReasonCodes,
  };
  bundle.finalLabel.parsedOutputHash = sha256Hex(canonicalJson(parsedOutput));
  const requestBody = buildFrozenProviderRequest("ADJUDICATOR", adjudicatorInput(bundle));
  const responseBody = { output: parsedOutput };
  const previous = bundle.baseAttemptReceipts.B_LABEL;
  const attempt = baseAttempt(bundle.authorization, "ADJUDICATOR", requestBody, responseBody, bundle.finalLabel.parsedOutputHash, 5, previous.selfHash, previous.cumulativeCost);
  bundle.finalLabel.disagreementAdjudicationReceiptHash = attempt.selfHash;
  withHash(bundle.finalLabel, "labelHash");
  bundle.seal.finalLabelHash = bundle.finalLabel.labelHash;
  bundle.seal.sealMode = "FINAL_ADJUDICATED";
  bundle.seal.finalizationMode = "FINAL_ADJUDICATED";
  bundle.seal.adjudicationAttemptReceiptHash = attempt.selfHash;
  withHash(bundle.seal, "sealHash");
  bundle.adjudicationAttemptReceipt = attempt;
  bundle.attemptChain = [...bundle.attemptChain, attempt];
  bundle.adjudicationRequestBody = requestBody;
  bundle.adjudicationResponseBody = responseBody;
  bundle.adjudicationParsedOutput = parsedOutput;
  return bundle;
}

test("triggered final disposition requires one real Qwen adjudication receipt", () => {
  assert.deepEqual(validateReferenceLabelSealBundle(adjudicatedAmbiguousBundle()), []);

  const missing = adjudicatedAmbiguousBundle();
  missing.finalLabel.disagreementAdjudicationReceiptHash = null;
  withHash(missing.finalLabel, "labelHash");
  missing.seal.finalLabelHash = missing.finalLabel.labelHash;
  missing.seal.adjudicationAttemptReceiptHash = null;
  withHash(missing.seal, "sealHash");
  delete missing.adjudicationAttemptReceipt;
  assert.equal(validateReferenceLabelSealBundle(missing).some((error) => error.includes("one adjudication receipt")), true);
});

test("reference seal enforces exact role input and prompt contracts", () => {
  assert.deepEqual(validateReferenceLabelSealBundle(agreementBundle()), []);

  const missingGrade = agreementBundle();
  missingGrade.aSolve.inputFieldNames = missingGrade.aSolve.inputFieldNames.filter((field) => field !== "grade");
  rebindBundle(missingGrade);
  assert.equal(validateReferenceLabelSealBundle(missingGrade).some((error) => error.includes("A_SOLVE input allowlist")), true);

  const samePrompt = agreementBundle();
  samePrompt.bSolve.promptLiteral = samePrompt.aSolve.promptLiteral;
  samePrompt.bSolve.promptHash = samePrompt.aSolve.promptHash;
  rebindBundle(samePrompt);
  assert.equal(validateReferenceLabelSealBundle(samePrompt).some((error) => error.includes("distinct adversarial")), true);
});

test("reference seal recomputes actual base-call request and response lineage", () => {
  assert.deepEqual(validateReferenceLabelSealBundle(agreementBundle()), []);

  const leakedInput = agreementBundle();
  leakedInput.requestBodies.A_SOLVE.input.deepSeekOutput = "forbidden";
  assert.equal(validateReferenceLabelSealBundle(leakedInput).some((error) => error.includes("actual A_SOLVE egress allowlist")), true);

  const changedResponse = agreementBundle();
  changedResponse.responseBodies.B_LABEL.output = "different response body";
  assert.equal(validateReferenceLabelSealBundle(changedResponse).some((error) => error.includes("B_LABEL") && error.includes("response body")), true);

  const otherItemUnderLegalKey = agreementBundle();
  otherItemUnderLegalKey.requestBodies.A_SOLVE.input.prompt = "Prompt copied from a different item";
  assert.equal(validateReferenceLabelSealBundle(otherItemUnderLegalKey).some((error) => error.includes("A_SOLVE") && error.includes("input value projection")), true);
});

test("reference seal recomputes the adjudicator request, response, and parsed projection", () => {
  assert.deepEqual(validateReferenceLabelSealBundle(adjudicatedAmbiguousBundle()), []);

  const leaked = adjudicatedAmbiguousBundle();
  leaked.adjudicationRequestBody.input.deepSeekOutput = "forbidden";
  assert.equal(validateReferenceLabelSealBundle(leaked).some((error) => error.includes("actual ADJUDICATOR egress allowlist")), true);

  const changed = adjudicatedAmbiguousBundle();
  changed.adjudicationResponseBody.output = "different adjudicator response";
  assert.equal(validateReferenceLabelSealBundle(changed).some((error) => error.includes("ADJUDICATOR response body")), true);
});

function aggregateReferenceSeal() {
  const itemSeals = Array.from({ length: 60 }, (_, index) => ({
    itemId: `item-${String(index + 1).padStart(3, "0")}`,
    itemHash: sha256Hex(`item-hash-${index + 1}`),
    clusterId: `cluster-${String(index + 1).padStart(3, "0")}`,
    itemSealHash: sha256Hex(`item-seal-${index + 1}`),
    finalLabelHash: sha256Hex(`final-label-${index + 1}`),
    sealMode: index < 12 ? "FINAL_ADJUDICATED" : "FINAL_AGREEMENT_MERGE",
    adjudicationAttemptReceiptHash: index < 12 ? sha256Hex(`adjudication-${index + 1}`) : null,
  }));
  return withHash({
    schemaVersion: "ReferenceLabelSealV1",
    designId: "MAIS-NATURAL-CA60-V3",
    registrationHash: hash("3"),
    frameRegistrationHash: hash("6"),
    sampleManifestHash: hash("4"),
    qwenAuthorizationHash: hash("8"),
    expectedItemCount: 60,
    itemSeals,
    itemSealRoot: calculateReferenceLabelSealRoot(itemSeals),
    baseSuccessfulCallCount: 240,
    adjudicationSuccessfulCallCount: 12,
    totalSuccessfulCallCount: 252,
    totalAttemptCount: 252,
    retryAttemptCount: 0,
    adjudicationRate: 0.2,
    referenceLabelsFrozenAt: "2026-08-25T04:30:00.000Z",
    providerEventCountAtSeal: 252,
  }, "sealHash");
}

test("global reference seal binds exactly 60 item seals and truthful Qwen call math", () => {
  assert.deepEqual(validateReferenceLabelSealV1(aggregateReferenceSeal()), []);

  const duplicate = aggregateReferenceSeal();
  duplicate.itemSeals[1].itemId = duplicate.itemSeals[0].itemId;
  duplicate.itemSealRoot = calculateReferenceLabelSealRoot(duplicate.itemSeals);
  withHash(duplicate, "sealHash");
  assert.equal(validateReferenceLabelSealV1(duplicate).some((error) => error.includes("60 unique")), true);

  const fabricatedRate = aggregateReferenceSeal();
  fabricatedRate.adjudicationRate = 0;
  withHash(fabricatedRate, "sealHash");
  assert.equal(validateReferenceLabelSealV1(fabricatedRate).some((error) => error.includes("adjudication rate")), true);
});

test("reference bundle recomputes taxonomy severity and family semantics", () => {
  const wrongSeverity = agreementBundle();
  for (const label of [wrongSeverity.aLabel, wrongSeverity.bLabel]) label.rawSeverity = "P0";
  wrongSeverity.finalLabel.finalSeverity = "P0";
  rebindBundle(wrongSeverity);
  assert.equal(validateReferenceLabelSealBundle(wrongSeverity).some((error) => error.includes("raw taxonomy semantics")), true);

  const wrongFamily = agreementBundle();
  for (const label of [wrongFamily.aLabel, wrongFamily.bLabel]) label.rawFindingFamilies = { NO_FINDING: "EVIDENCE_INTEGRITY" };
  wrongFamily.finalLabel.finalFindingFamilies = { NO_FINDING: "EVIDENCE_INTEGRITY" };
  rebindBundle(wrongFamily);
  assert.equal(validateReferenceLabelSealBundle(wrongFamily).some((error) => error.includes("raw taxonomy semantics")), true);
});

test("reference label finding leaves are parsed, stable, and exactly consistent with taxonomy codes", () => {
  const hiddenFinding = agreementBundle();
  hiddenFinding.finalLabel.finalFindings = [{
    findingId: "hidden-finding-001",
    evidenceLocator: "STORED_ANSWER",
    code: "WRONG_CANONICAL_ANSWER",
    family: "CANONICAL_ANSWER_SOLVABILITY",
    severity: "P0",
  }];
  rebindBundle(hiddenFinding);
  assert.equal(validateReferenceLabelSealBundle(hiddenFinding).some((error) => error.includes("finding leaves") || error.includes("taxonomy")), true);

  const rawHidden = agreementBundle();
  rawHidden.aLabel.rawFindings = [{
    findingId: "raw-hidden-001",
    evidenceLocator: "EXPLANATION",
    code: "MINOR_EXPLANATION_WEAKNESS",
    family: "EXPLANATION_INTEGRITY",
    severity: "P2",
  }];
  rebindBundle(rawHidden);
  assert.equal(validateReferenceLabelSealBundle(rawHidden).some((error) => error.includes("finding leaves") || error.includes("parsed output")), true);
});
