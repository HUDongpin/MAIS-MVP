import assert from "node:assert/strict";
import { generateKeyPairSync, sign } from "node:crypto";
import test from "node:test";

import {
  canonicalJsonV5R3,
  sealV5R3Artifact,
  sha256V5R3,
} from "./execution-integrity-v5-r3.mjs";
import {
  BOOTSTRAP_GOLDEN_VECTORS_V5_R8,
  bootstrapBoundedIndexV5R8,
  buildFrozenStatisticalBundleV5R8,
  buildTerminalExecutionDecisionReceiptV5R8,
  verifyFrozenStatisticalBundleV5R8,
  verifyTerminalExecutionDecisionReceiptV5R8,
} from "./statistical-kernel-v5-r8.mjs";
import {
  validateFreshRunnerReviewV5R8,
} from "./review-evidence-v5-r8.mjs";
import {
  buildTrustedProviderEvidenceEnvelopeV5R8,
  validateTrustedProviderEvidenceEnvelopeV5R8,
} from "./trusted-provider-evidence-v5-r8.mjs";
import {
  reconstructAttemptGraphV5R8,
} from "./attempt-graph-v5-r8.mjs";
import {
  applyInterruptedAttemptReconciliationV5R8,
  inspectInterruptedAttemptCustodyV5R8,
  reconcileInterruptedAttemptV5R8,
  validateResumeCustodyV5R8,
} from "./attempt-recovery-v5-r8.mjs";

const H = (value) => sha256V5R3(`v5-r8:${value}`);
const ROOTS = Object.freeze({
  activeRunnerRegistrationHash: H("active"),
  sampleExecutionInventoryHash: H("inventory"),
  sampleManifestHash: H("sample"),
  referenceSealHash: H("reference"),
  executionRegistrationHash: H("execution"),
  deepSeekAuthorizationHash: H("deepseek-auth"),
  c0ExecutionSetHash: H("c0"),
});

function finding(itemId, findingId, code = "WRONG_CANONICAL_ANSWER",
  family = "CANONICAL_ANSWER_SOLVABILITY", severity = "P0") {
  return { itemId, findingId, evidenceLocator: `fixture:${findingId}`, code, family, severity };
}

function item(index, overrides = {}) {
  const itemIdPseudonym = `ca60-r8-${String(index + 1).padStart(2, "0")}`;
  const referenceFindings = overrides.referenceFindings ?? [];
  const machineFindings = overrides.machineFindings ?? [];
  const executionDisposition = overrides.executionDisposition ?? "COMPLETE";
  const machineDisposition = overrides.machineDisposition
    ?? (executionDisposition === "COMPLETE" ? "RESOLVED" : "MISSING_RECEIPT");
  const referenceDisposition = overrides.referenceDisposition
    ?? (referenceFindings.length > 0 ? "RESOLVED_POSITIVE" : "RESOLVED_NEGATIVE");
  const markerHash = executionDisposition === "COMPLETE" ? H(`marker:${index}`) : null;
  return sealV5R3Artifact({
    schemaVersion: "ItemEvaluationResultV2",
    designId: "MAIS-NATURAL-CA60-V5",
    runnerRegistrationHash: ROOTS.activeRunnerRegistrationHash,
    sampleExecutionInventoryHash: ROOTS.sampleExecutionInventoryHash,
    referenceSealHash: ROOTS.referenceSealHash,
    executionRegistrationHash: ROOTS.executionRegistrationHash,
    deepSeekAuthorizationHash: ROOTS.deepSeekAuthorizationHash,
    c0ExecutionSetHash: ROOTS.c0ExecutionSetHash,
    manifestOrdinal: index + 1,
    itemHash: H(`item:${index}`),
    itemIdPseudonym,
    clusterId: `cluster-${index + 1}`,
    executionDisposition,
    machineDisposition,
    machineNonresolvedReasonCodes: machineDisposition === "RESOLVED" ? [] : [overrides.reason ?? machineDisposition],
    referenceDisposition,
    machineSurfaceFinding: machineDisposition === "RESOLVED" ? machineFindings.length > 0 : null,
    referenceFindings,
    machineFindings,
    finalReferenceLabelHash: H(`label:${index}`),
    requiredRoleOrder: ["B_PRIME_CRITIQUE", "B_PRIME_REVISION"],
    successfulRoleOutputHashes: executionDisposition === "COMPLETE" ? [H(`critique:${index}`), H(`revision:${index}`)] : [],
    attemptReceiptHashes: executionDisposition === "COMPLETE" ? [H(`attempt:${index}:1`), H(`attempt:${index}:2`)] : [],
    completedItemMarkerHash: markerHash,
  });
}

function sixty(overridesByIndex = new Map()) {
  return Array.from({ length: 60 }, (_, index) => {
    const overrides = overridesByIndex.get(index) ?? {};
    const id = `ca60-r8-${String(index + 1).padStart(2, "0")}`;
    const mapFinding = (value) => typeof value === "function" ? value(id) : value;
    return item(index, {
      ...overrides,
      referenceFindings: (overrides.referenceFindings ?? []).map(mapFinding),
      machineFindings: (overrides.machineFindings ?? []).map(mapFinding),
    });
  });
}

function statisticalInput(itemResults, overrides = {}) {
  return {
    ...ROOTS,
    itemResults,
    thresholdsFrozenAt: "2026-08-25T00:00:00.000Z",
    firstReferenceAttemptAt: "2026-08-26T10:00:00.000Z",
    firstEvaluationAttemptAt: "2026-08-26T11:00:00.000Z",
    receiptChainValid: true,
    providerTupleValid: true,
    capsValid: true,
    terminalProviderFailure: false,
    materialDeviation: false,
    postResultDesignDrift: false,
    labelLeakage: false,
    unauthorizedProviderCall: false,
    scoredAt: "2026-08-26T12:00:00.000Z",
    ...overrides,
  };
}

test("R8 uses the literal counter-SHA256 PRNG and all three frozen golden vectors", () => {
  assert.deepEqual(BOOTSTRAP_GOLDEN_VECTORS_V5_R8.map((vector) =>
    bootstrapBoundedIndexV5R8(vector)), [8, 13, 21]);
});

test("R8 materializes 60 sealed item results and evaluates integrity-valid 57 and 59 complete worlds", () => {
  const missingThree = new Map([57, 58, 59].map((index) => [index, {
    executionDisposition: "MISSING_RECEIPT",
    machineDisposition: "MISSING_RECEIPT",
  }]));
  const fiftySeven = buildFrozenStatisticalBundleV5R8(statisticalInput(sixty(missingThree)));
  assert.equal(fiftySeven.itemResults.length, 60);
  assert.equal(fiftySeven.completedItemMarkers.length, 57);
  assert.equal(fiftySeven.observedLedger.accounting.completeReceiptItemCount, 57);
  assert.equal(fiftySeven.observedLedger.accounting.missingReceiptItemCount, 3);
  assert.equal(fiftySeven.observedLedger.accounting.unifiedNonresolvedItemCount, 3);
  assert.equal(fiftySeven.executionIntegrity.status, "INTACT");
  assert.equal(fiftySeven.counterfactualLedger.surfaceAssignmentCount, 8);
  assert.equal(fiftySeven.metricResults.length, 11);
  assert.equal(fiftySeven.finalReceipt.overallDecision, "INCONCLUSIVE_MACHINE_REFERENCE");
  assert.deepEqual(verifyFrozenStatisticalBundleV5R8(statisticalInput(sixty(missingThree)), fiftySeven), []);

  const oneMissingTwoUnresolved = new Map([
    [57, { executionDisposition: "MISSING_RECEIPT", machineDisposition: "MISSING_RECEIPT" }],
    [58, { referenceDisposition: "UNRESOLVED_REFERENCE" }],
    [59, { referenceDisposition: "UNRESOLVED_REFERENCE" }],
  ]);
  const fiftyNine = buildFrozenStatisticalBundleV5R8(statisticalInput(sixty(oneMissingTwoUnresolved)));
  assert.equal(fiftyNine.observedLedger.accounting.completeReceiptItemCount, 59);
  assert.equal(fiftyNine.observedLedger.accounting.unresolvedReferenceItemCount, 2);
  assert.equal(fiftyNine.executionIntegrity.status, "INTACT");
  assert.equal(fiftyNine.counterfactualLedger.findingDecisionBoundUnidentified, true);
  assert.ok(fiftyNine.metricResults.filter(({ metric }) => ["FAMILY_RECALL", "EXACT_CODE_AND_FAMILY_RECALL", "P1_RECALL", "P2_MISSED_OR_UNRESOLVED_RATE"].includes(metric))
    .every(({ status, worstCaseMissingLower, worstCaseMissingUpper }) =>
      status === "UNDERPOWERED" && worstCaseMissingLower === 0 && worstCaseMissingUpper === 1));
});

test("R8 enforces the single nonresolved allowance without double counting", () => {
  const invalid = new Map([
    [56, { executionDisposition: "MISSING_RECEIPT", machineDisposition: "MISSING_RECEIPT" }],
    [57, { executionDisposition: "MISSING_RECEIPT", machineDisposition: "MISSING_RECEIPT" }],
    [58, { executionDisposition: "MISSING_RECEIPT", machineDisposition: "MISSING_RECEIPT" }],
    [59, { referenceDisposition: "UNRESOLVED_REFERENCE" }],
  ]);
  const built = buildFrozenStatisticalBundleV5R8(statisticalInput(sixty(invalid)));
  assert.equal(built.observedLedger.accounting.completeReceiptItemCount, 57);
  assert.equal(built.observedLedger.accounting.missingReceiptItemCount, 3);
  assert.equal(built.observedLedger.accounting.unresolvedReferenceItemCount, 1);
  assert.equal(built.observedLedger.accounting.unifiedNonresolvedItemCount, 4);
  assert.equal(built.executionIntegrity.status, "FAILED");
  assert.equal(built.metricResults, null);
  assert.equal(built.finalReceipt.overallDecision, "EXECUTION_INTEGRITY_FAILED");
});

test("R8 frozen matching is one-to-one, exact-first, and taxonomy-order deterministic", () => {
  const refA = (id) => finding(id, "ref-a", "FALSE_ACCEPT_CORRECT_RESPONSE", "RESPONSE_ACCEPTANCE", "P0");
  const refB = (id) => finding(id, "ref-b", "EQUIVALENT_ANSWER_NOT_ACCEPTED", "RESPONSE_ACCEPTANCE", "P1");
  const machine = (id) => finding(id, "machine-one", "EQUIVALENT_ANSWER_NOT_ACCEPTED", "RESPONSE_ACCEPTANCE", "P1");
  const items = sixty(new Map([[0, { referenceFindings: [refA, refB], machineFindings: [machine] }]]));
  const built = buildFrozenStatisticalBundleV5R8(statisticalInput(items));
  assert.equal(built.observedLedger.matchRecords.length, 1);
  assert.equal(built.observedLedger.matchRecords[0].referenceFindingId, "ref-b");
  assert.equal(built.observedLedger.matchRecords[0].matchType, "EXACT_CODE_AND_FAMILY");
  assert.equal(built.observedLedger.findingCounts.unmatchedReferenceCount, 1);
});

test("R8 emits and independently reconstructs an authoritative terminal integrity receipt", () => {
  const input = statisticalInput(sixty(), {
    receiptChainValid: false,
    terminalProviderFailure: true,
  });
  const receipt = buildTerminalExecutionDecisionReceiptV5R8({
    ...input,
    terminalCauseCodes: ["RECEIPT_CHAIN_UNVERIFIABLE", "PROVIDER_OR_NETWORK_FAILURE_PREVENTS_FROZEN_COMPLETION"],
  });
  assert.equal(receipt.overallDecision, "EXECUTION_INTEGRITY_FAILED");
  assert.equal(receipt.metricResults, null);
  assert.equal(receipt.analysisStatus, "TERMINAL_INTEGRITY_DECISION_NO_METRIC_INFERENCE");
  assert.deepEqual(verifyTerminalExecutionDecisionReceiptV5R8({
    ...input,
    terminalCauseCodes: receipt.terminalCauseCodes,
    receipt,
  }), []);
  const { selfHash: _terminalHash, ...terminalBody } = receipt;
  const fabricated = sealV5R3Artifact({ ...terminalBody,
    terminalCauseCodes: ["COMPLETE_ITEM_RECEIPTS_BELOW_57"] });
  assert.ok(verifyTerminalExecutionDecisionReceiptV5R8({
    ...input,
    terminalCauseCodes: receipt.terminalCauseCodes,
    receipt: fabricated,
  }).length > 0);
});

test("R8 rejects a self-hashed A11 concurrence without all eight recomputable process-evidence fields", () => {
  const fake = sealV5R3Artifact({
    schemaVersion: "IndependentExecutionRunnerReviewReceiptV6",
    designId: "MAIS-NATURAL-CA60-V5",
    runnerVersion: "V5-R8",
    reviewedAt: "2026-08-26T15:00:00.000Z",
    decision: "CONCURRED",
    reviewerLane: "A11",
    independentImplementation: true,
    findingCount: 0,
    reviewedRunnerRegistrationHash: H("registration"),
    reviewedRunnerRegistrationCommit: "a".repeat(40),
    reviewedRunnerSourceCommit: "b".repeat(40),
    reviewedProductionSourceRootHash: H("production"),
    reviewedTestSourceRootHash: H("tests"),
    reviewedImportClosureRootHash: H("imports"),
    reviewedRemediatedFindingIds: Array.from({ length: 8 }, (_, index) =>
      `A11-R7-${String(index + 1).padStart(3, "0")}`),
    credentialReadCount: 0,
    naturalQuestionReadCount: 0,
    providerCallCount: 0,
    naturalQuestionEgressCount: 0,
    tokenCount: 0,
    attemptCount: 0,
    usdSpent: 0,
  });
  const errors = validateFreshRunnerReviewV5R8({
    activeRegistration: {
      selfHash: fake.reviewedRunnerRegistrationHash,
      runnerSourceCommit: fake.reviewedRunnerSourceCommit,
      productionSourceRootHash: fake.reviewedProductionSourceRootHash,
      testSourceRootHash: fake.reviewedTestSourceRootHash,
      importClosureRootHash: fake.reviewedImportClosureRootHash,
      registeredAt: "2026-08-26T14:00:00.000Z",
    },
    registrationEvidence: { registrationCommit: fake.reviewedRunnerRegistrationCommit },
    freshReview: fake,
    processArtifacts: {},
  });
  assert.ok(errors.some((error) => /process evidence|schema/i.test(error)));
});

test("R8 route evidence is unresolved without a pinned trust anchor and verifies a pinned Ed25519 signature", () => {
  const source = (evidenceKind, extra = {}) => sealV5R3Artifact({
    schemaVersion: "TrustedProviderEvidenceSourceV1",
    designId: "MAIS-NATURAL-CA60-V5",
    evidenceKind,
    provider: "OPENAI_DIRECT",
    model: "gpt-5.6-luna",
    endpoint: "https://us.api.openai.com/v1/responses",
    subjectIdentityHash: H("subject"),
    authenticatedSource: true,
    retrievalMode: evidenceKind === "PRICE_SOURCE" ? "OFFICIAL_PROVIDER_RATE_CARD"
      : evidenceKind === "ZERO_CONTENT_PROBE_GRAPH" ? "GUARDED_ZERO_CONTENT_PROBE_GRAPH"
        : "AUTHENTICATED_PROVIDER_EXPORT",
    sourceLocator: `https://platform.openai.com/evidence/${evidenceKind.toLowerCase()}`,
    contentSha256: H(`content:${evidenceKind}`),
    ...extra,
  });
  const artifacts = [
    source("ACCOUNT_PROJECT_IDENTITY"),
    source("DIRECT_BILLING_ROUTE", { directBilling: true }),
    source("DATA_REGION", { projectResidency: "US_STORAGE_PROCESSING", dataRegion: "US" }),
    source("PRICE_SOURCE", { currency: "USD", inputUsdPerMillionTokens: 1,
      outputUsdPerMillionTokens: 2 }),
    source("ZERO_CONTENT_PROBE_GRAPH", {
      graphStatus: "COMPLETE_VALID", providerEventCount: 1, httpRequestCount: 1,
      naturalQuestionContentCount: 0, requestArtifactHash: H("probe-request"),
      providerEventReceiptHash: H("probe-event"), rawResponseArtifactHash: H("probe-raw"),
      rawResponseBindingReceiptHash: H("probe-binding"),
      resolvedAttemptReceiptHash: H("probe-resolved"),
    }),
  ];
  const price = artifacts.find(({ evidenceKind }) => evidenceKind === "PRICE_SOURCE");
  const probe = artifacts.find(({ evidenceKind }) => evidenceKind === "ZERO_CONTENT_PROBE_GRAPH");
  const claims = {
    provider: "OPENAI_DIRECT",
    model: "gpt-5.6-luna",
    endpoint: "https://us.api.openai.com/v1/responses",
    projectResidency: "US_STORAGE_PROCESSING",
    dataRegion: "US",
    subjectIdentityHash: H("subject"),
    directBilling: true,
    priceSnapshotHash: price.selfHash,
    zeroContentProbeGraphHash: probe.selfHash,
  };
  const unsigned = buildTrustedProviderEvidenceEnvelopeV5R8({
    activeRunnerRegistrationHash: ROOTS.activeRunnerRegistrationHash,
    claims,
    evidenceArtifactHashes: artifacts.map(({ selfHash }) => selfHash),
    trustAnchorId: "owner-route-evidence-ed25519-v1",
    signatureBase64: null,
    capturedAt: "2026-08-26T10:00:00.000Z",
    expiresAt: "2026-08-27T10:00:00.000Z",
  });
  assert.ok(validateTrustedProviderEvidenceEnvelopeV5R8({
    envelope: unsigned,
    activeRegistration: { selfHash: ROOTS.activeRunnerRegistrationHash,
      trustedProviderEvidenceAnchors: [] },
    evidenceArtifacts: [],
  }).some((error) => /trust anchor|signature/i.test(error)));

  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const publicKeyPem = publicKey.export({ type: "spki", format: "pem" });
  const anchor = { trustAnchorId: "owner-route-evidence-ed25519-v1", algorithm: "Ed25519",
    publicKeySpkiPem: publicKeyPem, publicKeyFingerprint: sha256V5R3(publicKey.export({ type: "spki", format: "der" })) };
  const payload = unsigned.signaturePayload;
  const signatureBase64 = sign(null, Buffer.from(canonicalJsonV5R3(payload), "utf8"), privateKey).toString("base64");
  const signed = buildTrustedProviderEvidenceEnvelopeV5R8({
    activeRunnerRegistrationHash: unsigned.activeRunnerRegistrationHash,
    claims: unsigned.claims,
    evidenceArtifactHashes: unsigned.evidenceArtifactHashes,
    trustAnchorId: unsigned.trustAnchorId,
    capturedAt: unsigned.capturedAt,
    expiresAt: unsigned.expiresAt,
    signatureBase64,
  });
  assert.deepEqual(validateTrustedProviderEvidenceEnvelopeV5R8({
    envelope: signed,
    activeRegistration: { selfHash: ROOTS.activeRunnerRegistrationHash,
      trustedProviderEvidenceAnchors: [anchor] },
    evidenceArtifacts: artifacts,
  }), []);
});

test("R8 rejects dangling evidence of every attempt-graph collection type", () => {
  const base = {
    activeRegistration: { selfHash: H("active") },
    authorization: { selfHash: H("authorization"), provider: "OPENAI_DIRECT",
      compatibilityAuthorizationHash: H("compat-auth"), compatibilityAuthorization: {
        selfHash: H("compat-auth"), maximumAttempts: 610, concurrencyCap: 4,
        maximumSuccessfulCalls: 300, maximumInputTokens: 4_000_000,
        maximumOutputTokens: 4_000_000, maximumTokens: 4_000_000,
        maximumEstimatedUsd: 25, maximumAttemptsPerItemRole: 2,
      } },
    inventory: { selfHash: H("inventory") },
    ledgerEntries: [], requestArtifacts: [], dispatchAudits: [], semanticDispatchAuthorities: [],
    dispatchPermits: [], compatibilityDispatchPermits: [], rawResponseArtifacts: [],
    rawResponseBindingReceipts: [], attemptCommitIntents: [], resolvedAttemptReceipts: [],
    derivedAt: "2026-08-26T00:00:00.000Z",
  };
  for (const collection of ["requestArtifacts", "dispatchAudits", "semanticDispatchAuthorities",
    "dispatchPermits", "compatibilityDispatchPermits", "rawResponseArtifacts",
    "rawResponseBindingReceipts", "attemptCommitIntents", "resolvedAttemptReceipts"]) {
    const graph = reconstructAttemptGraphV5R8({ ...base,
      [collection]: [{ selfHash: H(`dangling:${collection}`), compatibilityRequestArtifactHash: H(`compat:${collection}`),
        reservationHash: H(`reservation:${collection}`) }] });
    assert.equal(graph.receipt.graphStatus, "INCOMPLETE_INVALID", collection);
    assert.ok(graph.receipt.lineageErrors.some((error) => error.includes(collection)), collection);
  }
});

test("R8 exposes zero-HTTP custody reconciliation for crashes after reservation, intent, completion, and final receipt", () => {
  const reservation = sealV5R3Artifact({ entryType: "DISPATCH_RESERVED", attemptId: "attempt-1",
    requestArtifactHash: H("request"), itemHash: H("item"), role: "B_PRIME_CRITIQUE" });
  const completion = sealV5R3Artifact({ entryType: "DISPATCH_COMPLETED", attemptId: "attempt-1",
    reservationHash: reservation.selfHash, attemptStatus: "SUCCEEDED", requestArtifactHash: H("request"),
    providerEventReceiptHash: H("event"), roleOutputHash: H("output") });
  const intent = sealV5R3Artifact({ schemaVersion: "ProviderAttemptCommitIntentV1", attemptId: "attempt-1",
    reservationHash: reservation.selfHash, requestArtifactHash: H("request"),
    preparedCompletionHash: completion.selfHash, preparedAt: "2026-08-26T10:00:01.000Z" });
  const resolved = sealV5R3Artifact({ schemaVersion: "ResolvedProviderAttemptReceiptV2", attemptId: "attempt-1",
    reservationHash: reservation.selfHash, requestArtifactHash: H("request"),
    attemptCommitIntentHash: intent.selfHash, completionHash: completion.selfHash });
  const authorization = sealV5R3Artifact({ schemaVersion: "AttemptCustodyReconciliationAuthorizationV1",
    designId: "MAIS-NATURAL-CA60-V5",
    activeRunnerRegistrationHash: ROOTS.activeRunnerRegistrationHash,
    providerAuthorizationHash: H("authorization"), reservationHash: reservation.selfHash,
    recoveryScope: "EXACT_SINGLE_INTERRUPTED_ATTEMPT_ZERO_HTTP", authorizedBy: "OWNER",
    ownerAuthorizationTextHash: H("owner-recovery-text"), automaticRecoveryAuthorized: false,
    zeroHttpOnly: true,
    issuedAt: "2026-08-26T10:05:00.000Z", expiresAt: "2026-08-26T11:05:00.000Z" });
  const states = [
    { ledgerEntries: [reservation], attemptCommitIntents: [], resolvedAttemptReceipts: [], expected: "RESERVATION_WITHOUT_DURABLE_INTENT" },
    { ledgerEntries: [reservation], attemptCommitIntents: [intent], resolvedAttemptReceipts: [], expected: "INTENT_WITHOUT_LEDGER_COMPLETION" },
    { ledgerEntries: [reservation, completion], attemptCommitIntents: [intent], resolvedAttemptReceipts: [], expected: "COMPLETION_WITHOUT_RESOLVED_RECEIPT" },
    { ledgerEntries: [reservation, completion], attemptCommitIntents: [intent], resolvedAttemptReceipts: [resolved], expected: "FULLY_RECONCILED" },
  ];
  for (const state of states) {
    assert.equal(inspectInterruptedAttemptCustodyV5R8({ ...state, reservationHash: reservation.selfHash }).state,
      state.expected);
    let transportCalls = 0;
    const result = reconcileInterruptedAttemptV5R8({ ...state, reservationHash: reservation.selfHash,
      activeRunnerRegistrationHash: ROOTS.activeRunnerRegistrationHash,
      providerAuthorizationHash: H("authorization"), recoveryAuthorization: authorization,
      recoveredCompletion: completion, recoveredResolvedAttemptReceipt: resolved,
      at: "2026-08-26T10:06:00.000Z", transport: async () => { transportCalls += 1; } });
    assert.equal(transportCalls, 0);
    assert.equal(result.httpRequestCount, 0);
    assert.equal(result.providerEventCount, 0);
    assert.equal(result.receipt.zeroHttpRecovery, true);
  }
  assert.deepEqual(validateResumeCustodyV5R8({ ledgerEntries: [reservation, completion],
    attemptCommitIntents: [intent], resolvedAttemptReceipts: [resolved] }), []);
  assert.ok(validateResumeCustodyV5R8({ ledgerEntries: [reservation], attemptCommitIntents: [],
    resolvedAttemptReceipts: [] }).some((error) => /reconciliation/i.test(error)));
});

test("R8 applies every recoverable interrupted-attempt state through exact append-only callbacks", async () => {
  const reservation = sealV5R3Artifact({ entryType: "DISPATCH_RESERVED", attemptId: "attempt-apply",
    requestArtifactHash: H("apply-request"), itemHash: H("apply-item"), role: "B_PRIME_CRITIQUE" });
  const completion = sealV5R3Artifact({ entryType: "DISPATCH_COMPLETED", attemptId: "attempt-apply",
    reservationHash: reservation.selfHash, attemptStatus: "SUCCEEDED",
    requestArtifactHash: H("apply-request"), providerEventReceiptHash: H("apply-event"),
    roleOutputHash: H("apply-output") });
  const intent = sealV5R3Artifact({ schemaVersion: "ProviderAttemptCommitIntentV1",
    attemptId: "attempt-apply", reservationHash: reservation.selfHash,
    requestArtifactHash: H("apply-request"), preparedCompletionHash: completion.selfHash,
    preparedAt: "2026-08-26T10:00:01.000Z" });
  const resolved = sealV5R3Artifact({ schemaVersion: "ResolvedProviderAttemptReceiptV2",
    attemptId: "attempt-apply", reservationHash: reservation.selfHash,
    requestArtifactHash: H("apply-request"), attemptCommitIntentHash: intent.selfHash,
    completionHash: completion.selfHash });
  const ownerTextHash = H("apply-owner-text");
  const recoveryAuthorization = sealV5R3Artifact({
    schemaVersion: "AttemptCustodyReconciliationAuthorizationV1",
    designId: "MAIS-NATURAL-CA60-V5",
    activeRunnerRegistrationHash: ROOTS.activeRunnerRegistrationHash,
    providerAuthorizationHash: H("apply-authorization"),
    reservationHash: reservation.selfHash,
    recoveryScope: "EXACT_SINGLE_INTERRUPTED_ATTEMPT_ZERO_HTTP",
    authorizedBy: "OWNER", ownerAuthorizationTextHash: ownerTextHash,
    automaticRecoveryAuthorized: false, zeroHttpOnly: true,
    issuedAt: "2026-08-26T10:05:00.000Z", expiresAt: "2026-08-26T11:05:00.000Z",
  });
  const ledgerRecoveryAuthorization = sealV5R3Artifact({
    schemaVersion: "LedgerRecoveryAuthorizationV1",
    activeRunnerRegistrationHash: ROOTS.activeRunnerRegistrationHash,
    providerAuthorizationHash: H("apply-authorization"),
    recoveryKind: "INTERRUPTED_RESERVATION",
    exactTargetHash: intent.selfHash,
    ownerAuthorizationTextHash: ownerTextHash,
    automaticRecoveryAuthorized: false,
  });
  const appended = [];
  const store = { append: async (value) => {
    appended.push(value.selfHash);
    return { contentHash: value.selfHash };
  } };
  let ledgerRecoveries = 0;
  const common = {
    reservationHash: reservation.selfHash,
    activeRunnerRegistrationHash: ROOTS.activeRunnerRegistrationHash,
    providerAuthorizationHash: H("apply-authorization"),
    recoveryAuthorization,
    recoveredCompletion: completion,
    recoveredResolvedAttemptReceipt: resolved,
    ledgerRecoveryAuthorization,
    ledger: { recoverIntentBoundCompletion: async ({ intent: actualIntent,
      preparedCompletion }) => {
      ledgerRecoveries += 1;
      assert.equal(actualIntent.selfHash, intent.selfHash);
      assert.equal(preparedCompletion.selfHash, completion.selfHash);
      return { completion: preparedCompletion, providerCallMade: false };
    } },
    resolvedAttemptReceiptStore: store,
    reconciliationReceiptStore: store,
    at: "2026-08-26T10:06:00.000Z",
  };
  const intentOnly = await applyInterruptedAttemptReconciliationV5R8({ ...common,
    ledgerEntries: [reservation], attemptCommitIntents: [intent], resolvedAttemptReceipts: [] });
  assert.equal(intentOnly.persistenceCompleted, true);
  assert.equal(intentOnly.resumeAllowedAfterPlannedAppend, true);
  assert.equal(ledgerRecoveries, 1);
  assert.deepEqual(intentOnly.persistedArtifactHashes,
    [completion.selfHash, resolved.selfHash, intentOnly.receipt.selfHash]);

  const completionOnly = await applyInterruptedAttemptReconciliationV5R8({ ...common,
    ledgerEntries: [reservation, completion], attemptCommitIntents: [intent],
    resolvedAttemptReceipts: [] });
  assert.equal(completionOnly.persistenceCompleted, true);
  assert.equal(ledgerRecoveries, 1);
  assert.deepEqual(completionOnly.persistedArtifactHashes,
    [resolved.selfHash, completionOnly.receipt.selfHash]);

  const complete = await applyInterruptedAttemptReconciliationV5R8({ ...common,
    ledgerEntries: [reservation, completion], attemptCommitIntents: [intent],
    resolvedAttemptReceipts: [resolved] });
  assert.equal(complete.persistenceCompleted, true);
  assert.equal(complete.persistedArtifactHashes.length, 1);
  assert.equal(complete.providerEventCount, 0);
  assert.equal(complete.httpRequestCount, 0);
  assert.equal(complete.credentialReadCount, 0);
  assert.equal(complete.naturalQuestionEgressCount, 0);
  assert.ok(appended.includes(complete.receipt.selfHash));
});
