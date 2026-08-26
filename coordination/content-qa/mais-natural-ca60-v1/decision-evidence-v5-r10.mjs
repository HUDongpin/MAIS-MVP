import {
  canonicalJsonV5R3,
  sealV5R3Artifact,
  sha256V5R3,
  validateSelfHashV5R3,
} from "./execution-integrity-v5-r3.mjs";
import {
  assertClosedSelfHashedArtifactV5R10,
  validateClosedSelfHashedArtifactV5R10,
} from "./schema-contract-v5-r10.mjs";

const BASE_ROLES = Object.freeze(["B_PRIME_CRITIQUE", "B_PRIME_REVISION"]);
const C0_ROLES = Object.freeze(["C0_PRIME_ROLE_1", "C0_PRIME_ROLE_2", "C0_PRIME_ROLE_3",
  "C0_PRIME_ROLE_4", "C0_PRIME_ROLE_5"]);
const LEAKAGE = /(?:qwen|reference(?:label|seal)|final(?:reference)?label|gold[ _-]?label)/iu;

function requireCondition(condition, message) {
  if (!condition) throw new TypeError(message);
}

function root(values) {
  return sha256V5R3(canonicalJsonV5R3([...values].sort()));
}

function unique(values) {
  return [...new Set(values)];
}

function authorizationByHash(authorizations) {
  const map = new Map();
  for (const authorization of authorizations ?? []) {
    requireCondition(validateSelfHashV5R3(authorization),
      "R10 decision evidence contains an unsealed provider authorization");
    requireCondition(!map.has(authorization.selfHash),
      "R10 decision evidence contains duplicate provider authorization hashes");
    map.set(authorization.selfHash, authorization);
  }
  return map;
}

function expectedDeepSeekRoleKeys(inventory, c0ExecutionSet) {
  requireCondition(Array.isArray(inventory?.items) && inventory.items.length === 60,
    "R10 decision reconstruction requires the exact 60-item inventory");
  const selected = new Set(c0ExecutionSet?.selectedItemHashes ?? []);
  return inventory.items.flatMap(({ itemHash }) => [...BASE_ROLES, ...(selected.has(itemHash) ? C0_ROLES : [])]
    .map((role) => `${itemHash}:${role}`));
}

function chronologyValid(authorization, resolved) {
  const time = Date.parse(resolved.completedAt ?? "");
  return Number.isFinite(time) && Date.parse(authorization.issuedAt) <= time
    && time < Date.parse(authorization.expiresAt);
}

function requestLeakage(request) {
  return request?.referenceInputCount !== 0
    || LEAKAGE.test(canonicalJsonV5R3(request?.providerInput ?? {}));
}

export function reconstructDecisionEvidenceV5R10(input) {
  requireCondition(validateSelfHashV5R3(input.activeRegistration)
    && validateSelfHashV5R3(input.deepSeekAttemptGraphReceipt)
    && validateSelfHashV5R3(input.inventory)
    && validateSelfHashV5R3(input.c0ExecutionSet),
  "R10 decision reconstruction requires sealed registration, graph, inventory, and C0 roots");
  const requests = [...(input.requestArtifacts ?? [])];
  const resolved = [...(input.resolvedAttemptReceipts ?? [])];
  const journals = [...(input.commandJournals ?? [])];
  const authorizations = [...(input.authorizations ?? [])];
  const authByHash = authorizationByHash(authorizations);
  const causes = [];
  const authorizationSchemasValid = authorizations.every((value) =>
    validateClosedSelfHashedArtifactV5R10(value, "ProviderAuthorizationV5").length === 0
      && value.activeRunnerRegistrationHash === input.activeRegistration.selfHash);
  const authorizationProviders = authorizations.map(({ provider }) => provider).sort();
  const authorizationSetComplete = canonicalJsonV5R3(authorizationProviders)
    === canonicalJsonV5R3(["DEEPSEEK_DIRECT", "OPENAI_DIRECT"]);
  const requestSchemasValid = requests.every((value) =>
    validateClosedSelfHashedArtifactV5R10(value, "ProviderRequestArtifactV5").length === 0);
  const resolvedSchemasValid = resolved.every((value) =>
    validateClosedSelfHashedArtifactV5R10(value, "ResolvedProviderAttemptReceiptV2").length === 0);
  const journalSchemasValid = journals.every((value) =>
    validateClosedSelfHashedArtifactV5R10(value, "CommandTransitionJournalReceiptV2").length === 0
      && value.activeRunnerRegistrationHash === input.activeRegistration.selfHash);
  const journalAccountingComplete = journals.every(({ activityAccountingStatus }) =>
    activityAccountingStatus === "EXACT");
  const allSealed = [...authorizations, ...requests, ...resolved, ...journals]
    .every(validateSelfHashV5R3);
  const graphValid = input.deepSeekAttemptGraphReceipt.graphStatus === "COMPLETE_VALID"
    && input.deepSeekAttemptGraphReceipt.bidirectionalSetEqualityVerified === true;
  const requestByHash = new Map(requests.map((value) => [value.selfHash, value]));
  const uniqueRequests = requestByHash.size === requests.length;
  const uniqueResolved = new Set(resolved.map(({ selfHash }) => selfHash)).size === resolved.length;
  const allResolvedLinked = resolved.every((attempt) => requestByHash.has(attempt.requestArtifactHash));
  const receiptChainValid = allSealed && authorizationSchemasValid && authorizationSetComplete
    && requestSchemasValid && resolvedSchemasValid && journalSchemasValid && journalAccountingComplete
    && graphValid && uniqueRequests && uniqueResolved && allResolvedLinked
    && input.deepSeekAttemptGraphReceipt.resolvedAttemptCount === resolved.length;
  if (!receiptChainValid) causes.push("RECEIPT_CHAIN_UNVERIFIABLE_FROM_RAW_GRAPH");
  if (!journalAccountingComplete) {
    causes.push("COMMAND_JOURNAL_PROVIDER_ACTIVITY_ACCOUNTING_INCOMPLETE");
  }

  let providerTupleValid = authorizationSchemasValid && authorizationSetComplete;
  let unauthorizedProviderCall = false;
  let materialDeviation = false;
  let labelLeakage = false;
  const totalsByAuthorization = new Map();
  for (const attempt of resolved) {
    const authorization = authByHash.get(attempt.authorizationHash);
    const request = requestByHash.get(attempt.requestArtifactHash);
    const providerActivity = (attempt.providerEventCount ?? 0) > 0 || (attempt.httpRequestCount ?? 0) > 0;
    if (!authorization || !request || (providerActivity && !chronologyValid(authorization, attempt))) {
      unauthorizedProviderCall ||= providerActivity;
    }
    if (!authorization || attempt.provider !== authorization.provider
      || attempt.requestedModel !== authorization.model || attempt.observedModel !== authorization.model
      || attempt.requestedEndpoint !== authorization.endpoint
      || attempt.observedEndpoint !== authorization.endpoint) providerTupleValid = false;
    if (!request || request.activeRunnerRegistrationHash !== input.activeRegistration.selfHash
      || request.authorizationHash !== attempt.authorizationHash
      || request.provider !== attempt.provider || request.model !== attempt.requestedModel
      || request.endpoint !== attempt.requestedEndpoint
      || request.sampleManifestHash !== input.activeRegistration.sampleManifestHash) materialDeviation = true;
    labelLeakage ||= requestLeakage(request);
    const prior = totalsByAuthorization.get(attempt.authorizationHash)
      ?? { attempts: 0, successes: 0, inputTokens: 0, outputTokens: 0, totalTokens: 0, usd: 0 };
    prior.attempts += 1;
    prior.successes += attempt.attemptStatus === "SUCCEEDED" ? 1 : 0;
    prior.inputTokens += attempt.inputTokens ?? request?.reservedInputTokens ?? 0;
    prior.outputTokens += attempt.outputTokens ?? request?.reservedOutputTokens ?? 0;
    prior.totalTokens += attempt.totalTokens ?? request?.reservedTokens ?? 0;
    prior.usd += attempt.estimatedCostUsd ?? 0;
    totalsByAuthorization.set(attempt.authorizationHash, prior);
  }
  if (!providerTupleValid) causes.push("PROVIDER_ORIGIN_OR_MODEL_DRIFT_FROM_RESOLVED_RECEIPTS");
  if (unauthorizedProviderCall) causes.push("UNAUTHORIZED_PROVIDER_CALL_FROM_AUTHORIZATION_CHRONOLOGY");
  if (materialDeviation) causes.push("REQUEST_REGISTRATION_OR_PROVIDER_BINDING_DRIFT");
  if (labelLeakage) causes.push("REFERENCE_LABEL_LEAKAGE_IN_DEEPSEEK_REQUEST");

  let capsValid = authorizationSchemasValid && authorizationSetComplete && journalAccountingComplete;
  for (const [authorizationHash, totals] of totalsByAuthorization) {
    const authorization = authByHash.get(authorizationHash);
    if (!authorization || totals.attempts > authorization.maximumAttempts
      || totals.successes > authorization.maximumSuccessfulCalls
      || totals.inputTokens > authorization.maximumInputTokens
      || totals.outputTokens > authorization.maximumOutputTokens
      || totals.totalTokens > authorization.maximumTokens
      || totals.usd > authorization.maximumEstimatedUsd) capsValid = false;
  }
  if (!capsValid) causes.push("TOKEN_ATTEMPT_OR_USD_CAP_EXCEEDED_FROM_RAW_RECEIPTS");

  const successfulKeys = new Set(input.deepSeekAttemptGraphReceipt.roleAttemptEvidenceReceipts
    .filter(({ attemptStatus }) => attemptStatus === "SUCCEEDED")
    .map(({ itemHash, role }) => `${itemHash}:${role}`));
  const expectedKeys = expectedDeepSeekRoleKeys(input.inventory, input.c0ExecutionSet);
  const activeReservations = input.deepSeekAttemptGraphReceipt.activeReservationCount ?? 0;
  const terminalProviderFailure = expectedKeys.some((key) => !successfulKeys.has(key))
    || activeReservations > 0 || input.deepSeekAttemptGraphReceipt.graphStatus !== "COMPLETE_VALID"
    || !journalAccountingComplete;
  if (terminalProviderFailure) causes.push("FROZEN_REQUIRED_ROLE_GRAPH_INCOMPLETE_OR_INTERRUPTED");

  const thresholdsTime = Date.parse(input.thresholdsFrozenAt ?? "");
  const firstReference = Date.parse(input.firstReferenceAttemptAt ?? "");
  const firstEvaluation = Date.parse(input.firstEvaluationAttemptAt ?? "");
  const executionRegisteredAt = Date.parse(input.executionRegistration?.registeredAt ?? "");
  const postResultDesignDrift = ![thresholdsTime, firstReference, firstEvaluation].every(Number.isFinite)
    || thresholdsTime >= firstReference || thresholdsTime >= firstEvaluation
    || !Number.isFinite(executionRegisteredAt) || executionRegisteredAt >= firstEvaluation
    || input.executionRegistration?.activeRunnerRegistrationHash !== input.activeRegistration.selfHash
    || input.executionRegistration?.frameRegistrationHash !== input.activeRegistration.frameRegistrationHash
    || input.executionRegistration?.sampleManifestHash !== input.activeRegistration.sampleManifestHash
    || input.executionRegistration?.c0RandomAuditHash !== input.activeRegistration.c0RandomAuditHash;
  if (postResultDesignDrift) causes.push("THRESHOLD_TIMESTAMP_OR_EXECUTION_REGISTRATION_DRIFT");

  const totals = [...totalsByAuthorization.values()].reduce((sum, row) => ({
    attempts: sum.attempts + row.attempts,
    successes: sum.successes + row.successes,
    inputTokens: sum.inputTokens + row.inputTokens,
    outputTokens: sum.outputTokens + row.outputTokens,
    totalTokens: sum.totalTokens + row.totalTokens,
    usd: sum.usd + row.usd,
  }), { attempts: 0, successes: 0, inputTokens: 0, outputTokens: 0, totalTokens: 0, usd: 0 });
  return assertClosedSelfHashedArtifactV5R10(sealV5R3Artifact({
    schemaVersion: "DecisionEvidenceReceiptV1",
    designId: "MAIS-NATURAL-CA60-V5",
    activeRunnerRegistrationHash: input.activeRegistration.selfHash,
    referenceAttemptGraphHash: input.referenceAttemptGraphReceipt?.selfHash ?? null,
    deepSeekAttemptGraphHash: input.deepSeekAttemptGraphReceipt.selfHash,
    authorizationSetHash: root(authorizations.map(({ selfHash }) => selfHash)),
    requestArtifactRootHash: root(requests.map(({ selfHash }) => selfHash)),
    resolvedAttemptReceiptRootHash: root(resolved.map(({ selfHash }) => selfHash)),
    commandJournalRootHash: root(journals.map(({ selfHash }) => selfHash)),
    receiptChainValid,
    providerTupleValid,
    capsValid,
    terminalProviderFailure,
    materialDeviation,
    postResultDesignDrift,
    labelLeakage,
    unauthorizedProviderCall,
    attemptCount: totals.attempts,
    successfulCallCount: totals.successes,
    inputTokens: totals.inputTokens,
    outputTokens: totals.outputTokens,
    totalTokens: totals.totalTokens,
    estimatedUsd: Number(totals.usd.toFixed(12)),
    causeCodes: unique(causes).sort(),
    reconstructionMode: "IMMUTABLE_RAW_GRAPH_AUTHORIZATION_REQUEST_COST_AND_JOURNAL_RECONSTRUCTION",
    reconstructedAt: input.reconstructedAt,
  }), "DecisionEvidenceReceiptV1");
}

export function statisticalDecisionFlagsFromEvidenceV5R10(receipt) {
  requireCondition(validateSelfHashV5R3(receipt)
    && receipt.schemaVersion === "DecisionEvidenceReceiptV1",
  "R10 statistical decision facts require a sealed reconstructed decision-evidence receipt");
  return Object.freeze({
    receiptChainValid: receipt.receiptChainValid,
    providerTupleValid: receipt.providerTupleValid,
    capsValid: receipt.capsValid,
    terminalProviderFailure: receipt.terminalProviderFailure,
    materialDeviation: receipt.materialDeviation,
    postResultDesignDrift: receipt.postResultDesignDrift,
    labelLeakage: receipt.labelLeakage,
    unauthorizedProviderCall: receipt.unauthorizedProviderCall,
  });
}

export const DECISION_EVIDENCE_V5_R10_CONSTANTS = Object.freeze({
  callerSuppliedDecisionFlagsAccepted: false,
  authorizationChronologyReconstructed: true,
  providerTupleReconstructed: true,
  capsReconstructedFromRawReceipts: true,
  referenceLeakageReconstructedFromRequests: true,
});
