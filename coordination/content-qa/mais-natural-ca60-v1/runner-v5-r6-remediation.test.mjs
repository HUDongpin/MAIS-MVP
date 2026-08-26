import assert from "node:assert/strict";
import { mkdtemp, readFile, realpath, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  canonicalJsonV5R3,
  sealV5R3Artifact,
  sha256V5R3,
} from "./execution-integrity-v5-r3.mjs";
import {
  buildTerminalC0PredicateReceiptV5R6,
  buildTerminalC0ExecutionSetV5R6,
} from "./c0-terminal-v5-r6.mjs";
import {
  deriveExecutionIntegrityEvidenceV5R6,
  buildIncompleteExecutionScoreReceiptV5R6,
} from "./scorer-v5-r6.mjs";
import {
  buildExternallyAttestedRouteEvidenceV5R6,
  buildProtectedProviderEvidenceArtifactV5R6,
  buildRouteEvidenceCaptureReceiptV5R6,
  validateExternallyAttestedRouteEvidenceV5R6,
} from "./route-evidence-custody-v5-r6.mjs";
import {
  buildResolvedProviderAuthorizationFixtureV5R6,
  buildResolvedProviderRequestFixtureV5R6,
  H_V5_R6,
} from "./runner-v5-r6-test-fixtures.mjs";
import {
  validateAndRebuildProviderRequestArtifactV5R6,
} from "./provider-request-v5-r6.mjs";
import {
  buildWorkflowIndexSupersessionV5R6,
  ACTIVE_REVIEW_KIND_V5_R6,
} from "./workflow-index-v5-r6.mjs";
import {
  createRawResponseCustodyStoreV5R6,
  independentlyReparseRawResponseV5R6,
} from "./raw-response-custody-v5-r6.mjs";
import {
  createCommandTransitionJournalV5R6,
  runJournaledTransitionSequenceV5R6,
} from "./transition-journal-v5-r6.mjs";

const AT = "2026-08-26T08:30:00.000Z";

function item(ordinal = 1) {
  return {
    manifestOrdinal: ordinal,
    itemHash: H_V5_R6(`item-${ordinal}`),
    itemIdPseudonym: `fixture-item-${ordinal}`,
    clusterId: `fixture-cluster-${ordinal}`,
    registeredRandomAudit: ordinal <= 12,
    egressEligible: true,
  };
}

test("terminal missing B-prime evidence becomes a frozen C0 trigger and an authoritative integrity failure", () => {
  const activeRunnerRegistrationHash = H_V5_R6("active-r6");
  const executionRegistrationHash = H_V5_R6("execution-registration");
  const inventory = sealV5R3Artifact({
    schemaVersion: "FixtureInventoryV1",
    items: Array.from({ length: 60 }, (_, index) => item(index + 1)),
  });
  const decisions = inventory.items.map((entry) => buildTerminalC0PredicateReceiptV5R6({
    activeRunnerRegistrationHash,
    executionRegistrationHash,
    inventoryHash: inventory.selfHash,
    item: entry,
    critiqueEvidence: null,
    revisionEvidence: null,
    terminalEvidenceCode: "ATTEMPT_CAP_EXHAUSTED",
  }));
  assert.equal(decisions[0].selectedForC0, true);
  assert.deepEqual(decisions[0].mandatoryReasonCodes, ["INVALID_TAXONOMY_SCHEMA_OR_ROLE"]);
  assert.equal(decisions[0].critiqueEvidenceStatus, "MISSING");
  assert.equal(decisions[0].revisionEvidenceStatus, "MISSING");
  const c0ExecutionSet = buildTerminalC0ExecutionSetV5R6({
    activeRunnerRegistrationHash,
    executionRegistrationHash,
    inventory,
    predicateReceipts: decisions,
  });
  assert.equal(c0ExecutionSet.selectedItemCount, 60);
  const integrity = deriveExecutionIntegrityEvidenceV5R6({
    activeRunnerRegistrationHash,
    expectedCallGraph: inventory.items.flatMap((entry) => [
      { itemHash: entry.itemHash, role: "B_PRIME_CRITIQUE" },
      { itemHash: entry.itemHash, role: "B_PRIME_REVISION" },
      ...Array.from({ length: 5 }, (_, index) => ({ itemHash: entry.itemHash, role: `C0_PRIME_ROLE_${index + 1}` })),
    ]),
    completedCalls: [],
    receiptChainErrors: [],
    providerTupleErrors: [],
    capErrors: [],
    activeAttemptCount: 0,
    postResultDesignDrift: false,
    labelLeakage: false,
    thresholdFrozenAfterLabelOrResult: false,
    derivedAt: AT,
  });
  assert.equal(integrity.overallIntegrityDisposition, "EXECUTION_INTEGRITY_FAILED");
  const score = buildIncompleteExecutionScoreReceiptV5R6({
    activeRunnerRegistrationHash,
    inventoryHash: inventory.selfHash,
    c0ExecutionSetHash: c0ExecutionSet.selfHash,
    integrityEvidence: integrity,
    observedItemResultHashes: [],
    scoredAt: AT,
  });
  assert.equal(score.overallDecision, "EXECUTION_INTEGRITY_FAILED");
  assert.equal(score.analysisStatus, "INCOMPLETE_EXECUTION_NO_METRIC_INFERENCE");
  assert.equal(score.metricResults, null);
  assert.equal(score.passClaimAllowed, false);
});

test("every failed or successful out-of-graph completion is an unauthorized provider call", () => {
  const expected = [{ itemHash: H_V5_R6("expected"), role: "B_PRIME_CRITIQUE" }];
  const evidence = deriveExecutionIntegrityEvidenceV5R6({
    activeRunnerRegistrationHash: H_V5_R6("active-r6"),
    expectedCallGraph: expected,
    completedCalls: [{
      itemHash: H_V5_R6("extra"), role: "C0_PRIME_ROLE_1", attemptOrdinal: 1,
      attemptStatus: "HTTP_FAILURE", stateBound: true, planHash: H_V5_R6("extra-plan"),
      terminalProviderFailure: true, canaryOrOrderViolation: false,
    }],
    receiptChainErrors: [], providerTupleErrors: [], capErrors: [], activeAttemptCount: 0,
    postResultDesignDrift: false, labelLeakage: false, thresholdFrozenAfterLabelOrResult: false,
    derivedAt: AT,
  });
  assert.equal(evidence.extraCompletedCalls.length, 1);
  assert.equal(evidence.unauthorizedProviderCall, true);
  assert.equal(evidence.materialDeviation, true);
  assert.equal(evidence.overallIntegrityDisposition, "INVALID_FOR_GENERALIZATION");
});

test("DeepSeek request contract carries route-resolved residency and data region through exact reconstruction", () => {
  const authorization = buildResolvedProviderAuthorizationFixtureV5R6("DEEPSEEK_DIRECT", {
    projectResidency: "US_CONTRACTED_PROCESSING",
    dataRegion: "US",
  });
  const fixture = buildResolvedProviderRequestFixtureV5R6(authorization);
  assert.equal(fixture.requestArtifact.projectResidency, "US_CONTRACTED_PROCESSING");
  assert.equal(fixture.requestArtifact.dataRegion, "US");
  assert.equal(fixture.requestArtifact.authenticatedRouteEvidenceHash, authorization.authenticatedRouteEvidenceHash);
  assert.deepEqual(validateAndRebuildProviderRequestArtifactV5R6(fixture), []);
  const unresolved = sealV5R3Artifact({
    ...Object.fromEntries(Object.entries(authorization).filter(([key]) => key !== "selfHash")),
    projectResidency: "UNRESOLVED",
  });
  assert.throws(() => buildResolvedProviderRequestFixtureV5R6(unresolved), /resolved|residency/iu);
});

test("route evidence cannot self-confirm from caller JSON and enforces evidence-kind/source-kind provenance", () => {
  const common = {
    activeRunnerRegistrationHash: H_V5_R6("active-r6"),
    provider: "OPENAI_DIRECT",
    model: "gpt-5.6-luna",
    endpoint: "https://us.api.openai.com/v1/responses",
    projectResidency: "US_STORAGE_PROCESSING",
    dataRegion: "US",
    subjectIdentityHash: H_V5_R6("project"),
    capturedAt: "2026-08-26T08:10:00.000Z",
    expiresAt: "2026-08-27T08:10:00.000Z",
  };
  assert.throws(() => buildRouteEvidenceCaptureReceiptV5R6({
    ...common,
    evidenceKind: "PRICE",
    sourceKind: "PROVIDER_CONSOLE_EXPORT",
    rawSourceArtifactHash: H_V5_R6("raw"),
    rawSourceBytesHash: H_V5_R6("raw-bytes"),
    rawSourceByteLength: 10,
    sourceLocatorHash: H_V5_R6("locator"),
    captureLane: "A19",
    authenticatedSessionEvidenceHash: H_V5_R6("session"),
    ownerAttestationReceiptHash: null,
  }), /source kind|price/iu);
  assert.throws(() => buildRouteEvidenceCaptureReceiptV5R6({
    ...common,
    evidenceKind: "ACCOUNT_PROJECT_IDENTITY",
    sourceKind: "PROVIDER_CONSOLE_EXPORT",
    rawSourceArtifactHash: H_V5_R6("raw"),
    rawSourceBytesHash: H_V5_R6("raw-bytes"),
    rawSourceByteLength: 10,
    sourceLocatorHash: H_V5_R6("locator"),
    captureLane: "A19",
    authenticatedSessionEvidenceHash: null,
    ownerAttestationReceiptHash: null,
  }), /protected raw-source|caller-authored hashes/iu);

  const kinds = [
    ["ACCOUNT_PROJECT_IDENTITY", "PROVIDER_CONSOLE_EXPORT"],
    ["DIRECT_BILLING_ROUTE", "PROVIDER_BILLING_EXPORT"],
    ["DATA_REGION", "PROVIDER_CONSOLE_EXPORT"],
    ["PRICE", "PROVIDER_OFFICIAL_RATE_CARD"],
    ["ROUTE_PROBE_RESPONSE", "GUARDED_ZERO_CONTENT_ROUTE_PROBE"],
  ];
  const rawSourceArtifacts = kinds.map(([evidenceKind, sourceKind]) =>
    buildProtectedProviderEvidenceArtifactV5R6({
      ...common,
      evidenceKind,
      sourceKind,
      sourceLocatorHash: H_V5_R6(`locator:${evidenceKind}`),
      rawSourceBody: JSON.stringify({ evidenceKind, sourceKind, fixture: "non-secret offline evidence" }),
    }));
  const captures = kinds.map(([evidenceKind, sourceKind], index) => buildRouteEvidenceCaptureReceiptV5R6({
    ...common, evidenceKind, sourceKind,
    rawSourceArtifact: rawSourceArtifacts[index],
    captureLane: evidenceKind === "ROUTE_PROBE_RESPONSE" ? "A07" : "A19",
    authenticatedSessionEvidenceHash: H_V5_R6(`session:${evidenceKind}`),
    ownerAttestationReceiptHash: H_V5_R6(`owner:${evidenceKind}`),
    guardedProviderEventReceiptHash: evidenceKind === "ROUTE_PROBE_RESPONSE" ? H_V5_R6("probe-event") : null,
    zeroNaturalContentRequestHash: evidenceKind === "ROUTE_PROBE_RESPONSE" ? H_V5_R6("zero-content") : null,
  }));
  const receipt = buildExternallyAttestedRouteEvidenceV5R6({
    ...common,
    captures,
    rawSourceArtifacts,
    directBillingConfirmed: true,
    inputUsdPerMillionTokens: 1,
    outputUsdPerMillionTokens: 2,
    validatedAt: AT,
  });
  assert.equal(receipt.provenanceStatus, "EXTERNALLY_ATTESTED_AND_REPLAYABLE");
  assert.deepEqual(validateExternallyAttestedRouteEvidenceV5R6(receipt), []);
  assert.throws(() => buildProtectedProviderEvidenceArtifactV5R6({
    ...common,
    evidenceKind: "PRICE",
    sourceKind: "PROVIDER_OFFICIAL_RATE_CARD",
    sourceLocatorHash: H_V5_R6("secret-locator"),
    rawSourceBody: JSON.stringify({ api_key: "sk-fixture-secret-must-be-rejected" }),
  }), /credential-like/iu);
});

test("V1 migration retains legacy review history while installing a versioned R6 active review", () => {
  const legacyReview = sealV5R3Artifact({ schemaVersion: "FixtureLegacyReviewV1", value: "r4" });
  const priorIndex = sealV5R3Artifact({
    schemaVersion: "ProtectedWorkflowIndexV1",
    designId: "MAIS-NATURAL-CA60-V5",
    runnerRegistrationHash: H_V5_R6("r4-registration"),
    artifactEntries: [{
      kind: "FRESH_RUNNER_REVIEW",
      relativePath: "legacy/review.json",
      contentHash: sha256V5R3(Buffer.from(canonicalJsonV5R3(legacyReview), "utf8")),
    }],
    createdAt: "2026-08-26T08:00:00.000Z",
  });
  const r6Review = sealV5R3Artifact({ schemaVersion: "FixtureR6ReviewV1", value: "r6" });
  const next = buildWorkflowIndexSupersessionV5R6({
    activeRunnerRegistrationHash: H_V5_R6("active-r6"),
    priorIndex,
    legacyPriorArtifactValues: new Map([["FRESH_RUNNER_REVIEW", legacyReview]]),
    appendedArtifacts: [{ kind: ACTIVE_REVIEW_KIND_V5_R6, relativePath: "r6/review.json", value: r6Review }],
    createdAt: "2026-08-26T08:01:00.000Z",
  });
  assert.equal(next.artifactEntries.some(({ kind }) => kind === "FRESH_RUNNER_REVIEW"), true);
  assert.equal(next.artifactEntries.some(({ kind }) => kind === ACTIVE_REVIEW_KIND_V5_R6), true);
  assert.equal(new Set(next.artifactEntries.map(({ kind }) => kind)).size, next.artifactEntries.length);
});

test("raw provider response is persisted before completion and can be independently reparsed", async () => {
  const temporary = await mkdtemp(path.join(await realpath(os.tmpdir()), "mais-v5-r6-raw-"));
  try {
    const store = await createRawResponseCustodyStoreV5R6({ protectedRoot: temporary });
    const authorization = buildResolvedProviderAuthorizationFixtureV5R6("OPENAI_DIRECT");
    const fixture = buildResolvedProviderRequestFixtureV5R6(authorization);
    const rawResponseBody = JSON.stringify({
      id: "fixture-response", object: "response", model: "gpt-5.6-luna", status: "completed",
      reasoning: { effort: "high", context: "current_turn" },
      output: [{ id: "fixture-message", type: "message", role: "assistant", status: "completed",
        content: [{ type: "output_text", text: JSON.stringify({
        solution: "2", solvability: "SOLVABLE", uncertain: false,
      }), annotations: [] }] }],
      usage: { input_tokens: 10, output_tokens: 5,
        output_tokens_details: { reasoning_tokens: 0 }, total_tokens: 15 },
    });
    const persisted = await store.persist({
      activeRunnerRegistrationHash: authorization.activeRunnerRegistrationHash,
      authorizationHash: authorization.selfHash,
      requestArtifactHash: fixture.requestArtifact.selfHash,
      reservationHash: H_V5_R6("reservation"),
      dispatchAuditHash: H_V5_R6("audit"),
      attemptId: fixture.requestArtifact.attemptId,
      provider: "OPENAI_DIRECT",
      role: fixture.requestArtifact.role,
      itemHash: fixture.requestArtifact.itemHash,
      transportStatus: "DELIVERED",
      bodyReadStatus: "COMPLETE",
      httpStatus: 200,
      rawResponseBody,
      capturedAt: AT,
    });
    assert.equal(persisted.persistedBeforeCompletion, true);
    const bytes = await readFile(persisted.absolutePath, "utf8");
    assert.match(bytes, /fixture-response/);
    const reparsed = independentlyReparseRawResponseV5R6({
      rawResponseArtifact: persisted.artifact,
      requestArtifact: fixture.requestArtifact,
    });
    assert.equal(reparsed.observedModel, "gpt-5.6-luna");
    assert.equal(reparsed.parsedPayload.solvability, "SOLVABLE");
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
});

test("transition journal reports every durable subtransition after a later step fails", async () => {
  const journal = createCommandTransitionJournalV5R6({
    commandId: H_V5_R6("command"),
    activeRunnerRegistrationHash: H_V5_R6("active-r6"),
    startedAt: AT,
  });
  const transition = (label) => ({
    nextIndex: { selfHash: H_V5_R6(`${label}:next`) },
    transitionReceipt: { selfHash: H_V5_R6(`${label}:transition`), priorWorkflowIndexHash: H_V5_R6(`${label}:prior`) },
    persistedArtifacts: [{ semanticSelfHash: H_V5_R6(`${label}:artifact`) }],
  });
  const result = await runJournaledTransitionSequenceV5R6({
    journal,
    steps: [
      { name: "REQUEST", run: async () => transition("request") },
      { name: "DISPATCH_AUDIT", run: async () => transition("audit") },
      { name: "RESERVATION", run: async () => { throw new Error("fixture crash after two durable transitions"); } },
    ],
    finishedAt: "2026-08-26T08:30:01.000Z",
  });
  assert.equal(result.ok, false);
  assert.equal(result.journal.committedTransitionCount, 2);
  assert.deepEqual(result.journal.committedSteps, ["REQUEST", "DISPATCH_AUDIT"]);
  assert.equal(result.journal.lastDurableWorkflowIndexHash, H_V5_R6("audit:next"));
  assert.match(result.error, /fixture crash/);
});
