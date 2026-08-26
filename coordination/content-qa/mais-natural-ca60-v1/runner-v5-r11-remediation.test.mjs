import assert from "node:assert/strict";
import { mkdtemp, readFile, realpath, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  sealV5R3Artifact,
  sha256V5R3,
} from "./execution-integrity-v5-r3.mjs";
import {
  buildFrozenStatisticalBundleV5R11,
} from "./statistical-kernel-v5-r11.mjs";
import {
  inspectInterruptedAttemptCustodyV5R11,
  validateResumeCustodyV5R11,
} from "./attempt-recovery-v5-r11.mjs";
import {
  reconstructDecisionEvidenceV5R11,
} from "./decision-evidence-v5-r11.mjs";
import {
  validateTrustedProviderEvidenceEnvelopeV5R11,
} from "./trusted-provider-evidence-v5-r11.mjs";
import {
  createNativeProviderAdapterV5R11,
} from "./native-provider-adapter-v5-r11.mjs";
import {
  createRunnerRuntimeV5R11,
  persistFinalCommandJournalV5R11,
  V5_R11_RUNTIME_PATHS,
} from "./runner-v5-r11-runtime.mjs";
import {
  reloadCommandJournalSidecarsV5R11,
} from "./workflow-index-v5-r11.mjs";
import {
  atomicWriteProtectedJsonV5R4,
  establishProtectedRootV5R4,
} from "./protected-storage-v5-r4.mjs";

const H = (value) => sha256V5R3(`v5-r11:${value}`);
const ROOTS = Object.freeze({
  activeRunnerRegistrationHash: H("active"),
  sampleExecutionInventoryHash: H("inventory"),
  sampleManifestHash: H("sample"),
  referenceSealHash: H("reference"),
  executionRegistrationHash: H("execution"),
  deepSeekAuthorizationHash: H("deepseek-auth"),
  c0ExecutionSetHash: H("c0"),
});

function finding(itemId, findingId) {
  return { itemId, findingId, evidenceLocator: `${itemId}:${findingId}`,
    code: "WRONG_CANONICAL_ANSWER", family: "CANONICAL_ANSWER_SOLVABILITY", severity: "P0" };
}

function item(index, { referenceFindings = [], machineFindings = [] } = {}) {
  const itemIdPseudonym = `ca60-r9-${String(index + 1).padStart(2, "0")}`;
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
    executionDisposition: "COMPLETE",
    machineDisposition: "RESOLVED",
    machineNonresolvedReasonCodes: [],
    referenceDisposition: referenceFindings.length > 0 ? "RESOLVED_POSITIVE" : "RESOLVED_NEGATIVE",
    machineSurfaceFinding: machineFindings.length > 0,
    referenceFindings,
    machineFindings,
    finalReferenceLabelHash: H(`label:${index}`),
    requiredRoleOrder: ["B_PRIME_CRITIQUE", "B_PRIME_REVISION"],
    successfulRoleOutputHashes: [H(`critique:${index}`), H(`revision:${index}`)],
    attemptReceiptHashes: [H(`attempt:${index}:1`), H(`attempt:${index}:2`)],
    completedItemMarkerHash: H(`marker:${index}`),
  });
}

function statisticalInput(itemResults) {
  return { ...ROOTS, itemResults,
    thresholdsFrozenAt: "2026-08-25T00:00:00.000Z",
    firstReferenceAttemptAt: "2026-08-26T10:00:00.000Z",
    firstEvaluationAttemptAt: "2026-08-26T11:00:00.000Z",
    receiptChainValid: true, providerTupleValid: true, capsValid: true,
    terminalProviderFailure: false, materialDeviation: false, postResultDesignDrift: false,
    labelLeakage: false, unauthorizedProviderCall: false,
    scoredAt: "2026-08-26T12:00:00.000Z" };
}

test("R11 accepts the same local findingId on different items using the frozen composite key", () => {
  const rows = Array.from({ length: 60 }, (_, index) => {
    const id = `ca60-r9-${String(index + 1).padStart(2, "0")}`;
    return item(index, index < 2 ? { referenceFindings: [finding(id, "F1")],
      machineFindings: [finding(id, "F1")] } : {});
  });
  const built = buildFrozenStatisticalBundleV5R11(statisticalInput(rows));
  assert.equal(built.observedLedger.findingCounts.referenceFindingCount, 2);
  assert.equal(built.observedLedger.findingCounts.exactMatchedReferenceCount, 2);
});

test("R11 rejects an orphan DISPATCH_COMPLETED ledger row before any resume", () => {
  const completion = sealV5R3Artifact({ entryType: "DISPATCH_COMPLETED",
    attemptId: "orphan-attempt", reservationHash: H("missing-reservation") });
  assert.ok(validateResumeCustodyV5R11({ ledgerEntries: [completion], preparedCompletions: [],
    attemptCommitIntents: [], resolvedAttemptReceipts: [] })
    .some((error) => /orphan ledger completion/iu.test(error)));
});

test("R11 custody requires retained prepared-completion bytes for a durable intent", () => {
  const reservation = sealV5R3Artifact({ entryType: "DISPATCH_RESERVED", attemptId: "attempt-1",
    requestArtifactHash: H("request"), itemHash: H("item"), role: "B_PRIME_CRITIQUE" });
  const completion = sealV5R3Artifact({ entryType: "DISPATCH_COMPLETED", attemptId: "attempt-1",
    reservationHash: reservation.selfHash });
  const intent = sealV5R3Artifact({ schemaVersion: "ProviderAttemptCommitIntentV1",
    attemptId: "attempt-1", reservationHash: reservation.selfHash,
    requestArtifactHash: H("request"), preparedCompletionHash: completion.selfHash });
  assert.throws(() => inspectInterruptedAttemptCustodyV5R11({ ledgerEntries: [reservation],
    preparedCompletions: [], attemptCommitIntents: [intent], resolvedAttemptReceipts: [],
    reservationHash: reservation.selfHash }), /prepared-completion bytes/iu);
});

function emptyDecisionInput(overrides = {}) {
  const activeRegistration = sealV5R3Artifact({ sampleManifestHash: H("sample"),
    frameRegistrationHash: H("frame"), c0RandomAuditHash: H("c0-audit") });
  const inventory = sealV5R3Artifact({ items: Array.from({ length: 60 }, (_, index) => ({
    itemHash: H(`decision-item:${index}`),
  })) });
  const c0ExecutionSet = sealV5R3Artifact({ selectedItemHashes: [] });
  const deepSeekAttemptGraphReceipt = sealV5R3Artifact({ graphStatus: "COMPLETE_VALID",
    bidirectionalSetEqualityVerified: true, resolvedAttemptCount: 0, activeReservationCount: 0,
    roleAttemptEvidenceReceipts: [] });
  const executionRegistration = sealV5R3Artifact({ activeRunnerRegistrationHash: activeRegistration.selfHash,
    frameRegistrationHash: activeRegistration.frameRegistrationHash,
    sampleManifestHash: activeRegistration.sampleManifestHash,
    c0RandomAuditHash: activeRegistration.c0RandomAuditHash,
    registeredAt: "2026-08-26T10:30:00.000Z" });
  return { activeRegistration, inventory, c0ExecutionSet, deepSeekAttemptGraphReceipt,
    executionRegistration, authorizations: [], requestArtifacts: [], resolvedAttemptReceipts: [],
    commandJournals: [], thresholdsFrozenAt: "2026-08-25T00:00:00.000Z",
    firstReferenceAttemptAt: "2026-08-26T10:00:00.000Z",
    firstEvaluationAttemptAt: "2026-08-26T11:00:00.000Z",
    reconstructedAt: "2026-08-26T12:00:00.000Z", ...overrides };
}

function commandJournal(activeRunnerRegistrationHash, overrides = {}) {
  return sealV5R3Artifact({
    schemaVersion: "CommandTransitionJournalReceiptV2",
    designId: "MAIS-NATURAL-CA60-V5",
    commandId: H("command"),
    activeRunnerRegistrationHash,
    status: "COMPLETED",
    preparedIntentCount: 0,
    preparedIntentHashes: [],
    observedDurableTransitionCount: 0,
    observedDurableSteps: [],
    observedDurableTransitionHashes: [],
    persistedSubreceiptCount: 0,
    persistedSubreceiptHashes: [],
    lastObservedDurableWorkflowIndexHash: null,
    providerDispatchIntentCount: 0,
    providerEventCountLowerBound: 0,
    httpRequestCountLowerBound: 0,
    credentialReadCountLowerBound: 0,
    naturalQuestionEgressCountLowerBound: 0,
    activityAccountingStatus: "EXACT",
    errorClass: null,
    startedAt: "2026-08-26T11:00:00.000Z",
    finishedAt: "2026-08-26T11:00:01.000Z",
    ...overrides,
  });
}

test("R11 decision evidence ignores caller-authored favorable or adverse integrity flags", () => {
  const base = emptyDecisionInput();
  const favorable = reconstructDecisionEvidenceV5R11({ ...base, receiptChainValid: true,
    providerTupleValid: true, capsValid: true, terminalProviderFailure: false,
    materialDeviation: false, postResultDesignDrift: false, labelLeakage: false,
    unauthorizedProviderCall: false });
  const adverse = reconstructDecisionEvidenceV5R11({ ...base, receiptChainValid: false,
    providerTupleValid: false, capsValid: false, terminalProviderFailure: true,
    materialDeviation: true, postResultDesignDrift: true, labelLeakage: true,
    unauthorizedProviderCall: true });
  assert.deepEqual(favorable, adverse);
  assert.equal(favorable.terminalProviderFailure, true);
});

test("R11 self-hashed but schema-invalid authorizations cannot manufacture provider or cap validity", () => {
  const base = emptyDecisionInput();
  const authorizations = [
    sealV5R3Artifact({ schemaVersion: "ProviderAuthorizationV5", provider: "OPENAI_DIRECT",
      activeRunnerRegistrationHash: base.activeRegistration.selfHash }),
    sealV5R3Artifact({ schemaVersion: "ProviderAuthorizationV5", provider: "DEEPSEEK_DIRECT",
      activeRunnerRegistrationHash: base.activeRegistration.selfHash }),
  ];
  const receipt = reconstructDecisionEvidenceV5R11({ ...base, authorizations });
  assert.equal(receipt.receiptChainValid, false);
  assert.equal(receipt.providerTupleValid, false);
  assert.equal(receipt.capsValid, false);
  assert.ok(receipt.causeCodes.includes("RECEIPT_CHAIN_UNVERIFIABLE_FROM_RAW_GRAPH"));
  assert.ok(receipt.causeCodes.includes("PROVIDER_ORIGIN_OR_MODEL_DRIFT_FROM_RESOLVED_RECEIPTS"));
  assert.ok(receipt.causeCodes.includes("TOKEN_ATTEMPT_OR_USD_CAP_EXCEEDED_FROM_RAW_RECEIPTS"));
});

test("R11 unknown command-journal accounting forces terminal fail-closed decision evidence", () => {
  const base = emptyDecisionInput();
  const journal = commandJournal(base.activeRegistration.selfHash, {
    status: "PROVIDER_ACTIVITY_POSSIBLE_ACCOUNTING_INCOMPLETE",
    providerDispatchIntentCount: 1,
    activityAccountingStatus: "UNKNOWN_FAIL_CLOSED",
    errorClass: "Error",
  });
  const receipt = reconstructDecisionEvidenceV5R11({ ...base, commandJournals: [journal] });
  assert.equal(receipt.receiptChainValid, false);
  assert.equal(receipt.capsValid, false);
  assert.equal(receipt.terminalProviderFailure, true);
  assert.ok(receipt.causeCodes.includes("COMMAND_JOURNAL_PROVIDER_ACTIVITY_ACCOUNTING_INCOMPLETE"));
});

test("R11 failed or successful final command journals share the same required workflow-index custody path", async () => {
  const activeRegistration = sealV5R3Artifact({ registration: "r9" });
  const context = { activeRegistration };
  const journal = commandJournal(activeRegistration.selfHash, {
    status: "FAILED_BEFORE_DURABLE_TRANSITION", errorClass: "Error",
  });
  const calls = [];
  const transition = await persistFinalCommandJournalV5R11({
    context,
    journal,
    command: "commit-failed-provider-command-journal",
    committedAt: "2026-08-26T11:00:02.000Z",
    advanceWorkflow: async (input) => { calls.push(input); return { persisted: true }; },
  });
  assert.deepEqual(transition, { persisted: true });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].appendedArtifacts.length, 1);
  assert.equal(calls[0].appendedArtifacts[0].value.selfHash, journal.selfHash);
  assert.equal(calls[0].appendedArtifacts[0].family, "transition-journals-indexed");
});

test("R11 reloads a valid protected command-journal sidecar that was not yet indexed", async (t) => {
  const realTemporaryParent = await realpath(os.tmpdir());
  const temporaryRoot = await mkdtemp(path.join(realTemporaryParent, "mais-ca60-r9-journal-"));
  t.after(async () => rm(temporaryRoot, { recursive: true, force: true }));
  const trustedRoot = await establishProtectedRootV5R4(temporaryRoot);
  const activeRegistration = sealV5R3Artifact({ registration: "r9-sidecar" });
  const journal = commandJournal(activeRegistration.selfHash, {
    status: "FAILED_AFTER_DURABLE_TRANSITION", errorClass: "Error",
  });
  await atomicWriteProtectedJsonV5R4({ trustedRoot,
    relativePath: path.join("runtime-custody-v5-r11", "transition-journals",
      `${journal.selfHash}.json`),
    value: journal });
  const reloaded = await reloadCommandJournalSidecarsV5R11({ trustedRoot, activeRegistration });
  assert.equal(reloaded.length, 1);
  assert.deepEqual(reloaded[0], journal);
});

test("R11 route validation rejects a signed-summary-shaped envelope without raw source and probe custody", () => {
  const activeRegistration = { selfHash: H("route-registration"), trustedProviderEvidenceAnchors: [] };
  const errors = validateTrustedProviderEvidenceEnvelopeV5R11({ envelope: null,
    activeRegistration, authenticatedRouteEvidence: null, routeProbeArtifacts: null,
    priceSnapshot: null, at: "2026-08-26T12:00:00.000Z" });
  assert.ok(errors.some((error) => /object|envelope|schema|source|probe|anchor/iu.test(error)));
});

test("R11 final adapter reloads immutable Git custody before credential access", async () => {
  let credentialReads = 0;
  let fetches = 0;
  const adapter = createNativeProviderAdapterV5R11({
    repoRoot: process.cwd(),
    protectedRoot: process.cwd(),
    credentialReader: async () => { credentialReads += 1; return null; },
    fetchImplementation: async () => { fetches += 1; throw new Error("must not dispatch"); },
  });
  await assert.rejects(() => adapter.send({ activeRegistration: { selfHash: H("fake") },
    registrationEvidence: { selfHash: H("fake-evidence") } }),
  /V5-R11 registration path|Git|registration|A07 closeout|review/iu);
  assert.equal(credentialReads, 0);
  assert.equal(fetches, 0);
});

test("R11 default runtime installs the native workflow and blocks absent authority at exact zero activity", async () => {
  const runtime = createRunnerRuntimeV5R11({ clock: () => "2026-08-26T15:00:00.000Z" });
  assert.equal(V5_R11_RUNTIME_PATHS.defaultNativePlannerExecutorInstalled, true);
  assert.equal(V5_R11_RUNTIME_PATHS.defaultRecoveryLoaderInstalled, true);
  assert.equal(typeof runtime.loadRecoveryInput, "function");
  assert.equal(typeof runtime.sealReferenceLabels, "function");
  assert.equal(typeof runtime.freezeDeepSeekExecutionRegistration, "function");
  for (const execute of [runtime.executeOpenAIResumeStep,
    runtime.executeDeepSeekCanaryStep, runtime.executeDeepSeekResumeStep]) {
    const result = await execute({});
    assert.notEqual(result.status, "NATIVE_PROVIDER_ATTEMPT_EXECUTOR_NOT_BOUND_ZERO_HTTP");
    assert.equal(result.providerEventCount, 0);
    assert.equal(result.httpRequestCount, 0);
    assert.equal(result.credentialReadCount, 0);
    assert.equal(result.naturalQuestionEgressCount, 0);
    assert.equal(result.activityAccountingStatus, "EXACT");
  }
});

test("R11 runtime has no caller-authored scoring or all-missing terminal fallback", async () => {
  const source = await readFile(new URL("./runner-v5-r11-runtime.mjs", import.meta.url), "utf8");
  const scorerSource = await readFile(new URL("./scorer-verifier-v5-r11.mjs", import.meta.url), "utf8");
  assert.doesNotMatch(source, /scoringInputBuilder|terminalEvidenceBuilder|buildTerminalMissingItemResultsV5R11/u);
  assert.doesNotMatch(source, /naturalQuestionEgressCount:\s*run\.providerEventCount/u);
  assert.doesNotMatch(scorerSource, /buildTerminalMissingItemResultsV5R11/u);
  assert.match(source, /buildTerminalExecutionBundleFromRawCustodyV5R11/u);
  assert.match(scorerSource, /buildTerminalItemEvaluationEvidenceV5R11/u);
  assert.match(source, /nativeScoringEvidence/u);
  assert.match(source, /naturalQuestionEgressCount:\s*run\.naturalQuestionEgressCount/u);
});
