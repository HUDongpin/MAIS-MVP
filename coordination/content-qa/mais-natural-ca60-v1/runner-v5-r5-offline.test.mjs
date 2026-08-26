import assert from "node:assert/strict";
import { execFile as nodeExecFile } from "node:child_process";
import { chmod, mkdtemp, realpath, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";
import test from "node:test";

import {
  canonicalJsonV5R3,
  sealV5R3Artifact,
  sha256V5R3,
} from "./execution-integrity-v5-r3.mjs";
import {
  buildC0PredicateInputFromProtectedEvidenceV5R5,
  buildC0PredicateReceiptV5R5,
} from "./c0-trigger-v5-r5.mjs";
import { deriveExecutionIntegrityEvidenceV5R5 } from "./scorer-v5-r5.mjs";
import { runCliV5R5 } from "./runner-v5-r5-cli.mjs";
import {
  buildActiveRegistrationFixtureV5R5,
  buildExactRegistrationEvidenceFixtureV5R5,
  buildFreshReviewFixtureV5R5,
  H_V5_R5,
} from "./runner-v5-r5-test-fixtures.mjs";
import {
  buildAuthorizationFixtureV5R4,
  buildRunnerFixtureV5R4,
} from "./runner-v5-r4-test-fixtures.mjs";
import { buildProviderRequestArtifactV5R4 } from "./provider-request-v5-r4.mjs";
import {
  atomicWriteProtectedJsonV5R4,
  establishProtectedRootV5R4,
} from "./protected-storage-v5-r4.mjs";
import { createAtomicExecutionLedgerV5R5 } from "./atomic-execution-ledger-v5-r5.mjs";
import { buildLedgerRecoveryAuthorizationV5R5 } from "./recovery-v5-r5.mjs";
import { V5_R4_REGISTRATION_HASH } from "./execution-evidence-v5-r5.mjs";
import {
  advanceProtectedWorkflowIndexV5R5,
  loadProtectedWorkflowIndexV5R5,
} from "./workflow-index-v5-r5.mjs";

const execFileAsync = promisify(nodeExecFile);

function roleOutput(role, itemHash, parsedPayload) {
  return sealV5R3Artifact({
    schemaVersion: "ProviderRoleOutputV1", designId: "MAIS-NATURAL-CA60-V5",
    runnerRegistrationHash: H_V5_R5("fixture-active"), sampleExecutionInventoryHash: H_V5_R5("fixture-inventory"),
    authorizationHash: H_V5_R5("fixture-authorization"), provider: "DEEPSEEK_DIRECT", model: "deepseek-v4-pro",
    endpoint: "https://api.deepseek.com/chat/completions", role, attemptId: `${role}-fixture-attempt`,
    attemptReceiptHash: H_V5_R5(`${role}:receipt`), requestArtifactHash: H_V5_R5(`${role}:request`),
    itemHash, itemIdPseudonym: "fixture-item-pseudonym", clusterId: "fixture-cluster",
    rolePromptHash: H_V5_R5(`${role}:prompt`), roleSchemaHash: H_V5_R5(`${role}:schema`),
    parsedPayload, parsedPayloadHash: sha256V5R3(canonicalJsonV5R3(parsedPayload)),
    referenceInputCount: 0, deepSeekInputCount: 0,
  });
}

test("C0 predicates are rebuilt only from the frozen four fields and fail closed on reference-state injection", () => {
  const itemHash = H_V5_R5("c0-item");
  const item = { manifestOrdinal: 1, itemHash, itemIdPseudonym: "fixture-item-pseudonym", registeredRandomAudit: false, egressEligible: true };
  const itemLeaf = { prompt: { en: "1+1?", zh: "1+1?" }, storedAnswer: "2", acceptedAnswers: ["2"],
    responseForm: "short-answer", region: "CALIFORNIA", curriculumProfile: "US_CA_MATH", difficulty: "Low",
    grade: "2", canonicalTopic: "addition", diagram: null, questionAssets: [] };
  const critique = roleOutput("B_PRIME_CRITIQUE", itemHash,
    { valid: true, surfaceDisposition: "NO_FINDING", findings: [], requiredRevisionCodes: [] });
  const revision = roleOutput("B_PRIME_REVISION", itemHash,
    { valid: true, surfaceDisposition: "NO_FINDING", findings: [], resolutions: [] });
  const predicateInput = buildC0PredicateInputFromProtectedEvidenceV5R5({ item, itemLeaf, critiqueOutput: critique,
    revisionOutput: revision });
  assert.deepEqual(Object.keys(predicateInput).sort(), ["bPrimeCritique", "bPrimeRevision", "localDeterministicEvidence", "validatedScope"]);
  assert.doesNotMatch(canonicalJsonV5R3(predicateInput), /openai|reference|qwen/iu);
  const receipt = buildC0PredicateReceiptV5R5({ activeRunnerRegistrationHash: H_V5_R5("active"),
    executionRegistrationHash: H_V5_R5("execution"), inventoryHash: H_V5_R5("inventory"), item, predicateInput });
  assert.equal(receipt.mandatoryTrigger, false);
  assert.throws(() => buildC0PredicateReceiptV5R5({ activeRunnerRegistrationHash: H_V5_R5("active"),
    executionRegistrationHash: H_V5_R5("execution"), inventoryHash: H_V5_R5("inventory"), item,
    predicateInput: { ...predicateInput, referenceSeal: H_V5_R5("forbidden") } }), /validation failed|additional property/iu);
});

test("integrity decision precedence distinguishes incomplete execution from unauthorized or extra execution", () => {
  const common = { activeRunnerRegistrationHash: H_V5_R5("active"), receiptChainErrors: [], capErrors: [],
    providerTupleErrors: [], activeAttemptCount: 0, postResultDesignDrift: false, labelLeakage: false,
    thresholdFrozenAfterLabelOrResult: false, derivedAt: "2026-08-26T05:50:00.000Z" };
  const expectedCallGraph = [{ itemHash: H_V5_R5("item"), role: "B_PRIME_CRITIQUE" }];
  const incomplete = deriveExecutionIntegrityEvidenceV5R5({ ...common, expectedCallGraph, completedCalls: [] });
  assert.equal(incomplete.overallIntegrityDisposition, "EXECUTION_INTEGRITY_FAILED");
  const extra = deriveExecutionIntegrityEvidenceV5R5({ ...common, expectedCallGraph, completedCalls: [
    { itemHash: H_V5_R5("extra"), role: "C0_PRIME_ROLE_1", attemptStatus: "SUCCEEDED", stateBound: false,
      terminalProviderFailure: false, canaryOrOrderViolation: true },
  ] });
  assert.equal(extra.overallIntegrityDisposition, "INVALID_FOR_GENERALIZATION");
});

test("CLI rejects ambiguous execution arguments before context load and reports absent live bindings with zero activity", async () => {
  let contextLoads = 0; let engineCalls = 0;
  const activeRegistration = buildActiveRegistrationFixtureV5R5();
  const deps = {
    loadWorkflowContext: async () => { contextLoads += 1; return { activeRegistration }; },
    executeDeepSeekCanaryStep: async () => { engineCalls += 1; return { ok: false, status: "LIVE_BINDINGS_NOT_INSTALLED",
      providerEventCount: 0, httpRequestCount: 0, credentialReadCount: 0, naturalQuestionEgressCount: 0 }; },
  };
  const ambiguous = await runCliV5R5(["execute-deepseek", "--context", "fixture", "--canary", "1", "--resume"], deps);
  assert.equal(ambiguous.exitCode, 2);
  assert.equal(contextLoads, 0); assert.equal(engineCalls, 0);
  const blocked = await runCliV5R5(["execute-deepseek", "--context", "fixture", "--canary", "1"], deps);
  assert.equal(blocked.receipt.status, "LIVE_BINDINGS_NOT_INSTALLED");
  assert.equal(blocked.receipt.providerCommandInvoked, false);
  assert.equal(blocked.receipt.providerEventCount, 0); assert.equal(blocked.receipt.httpRequestCount, 0);
  assert.equal(blocked.receipt.credentialReadCount, 0); assert.equal(blocked.receipt.naturalQuestionEgressCount, 0);
  assert.equal(contextLoads, 1); assert.equal(engineCalls, 1);
});

test("CLI command receipt covers request, state-audit, and terminal workflow transitions in exact order", async () => {
  const activeRegistration = buildActiveRegistrationFixtureV5R5();
  const hashes = ["prior", "request-index", "audit-index", "completion-index", "request", "audit", "completion"]
    .map(H_V5_R5);
  const transition = (prior, next, contentHash, suffix) => ({
    nextIndex: { selfHash: next },
    nextIndexPath: `/protected/${suffix}.json`,
    transitionRelativePath: `transitions/${suffix}.json`,
    transitionReceipt: { priorWorkflowIndexHash: prior },
    persistedArtifacts: [{ contentHash }],
  });
  const output = {
    ok: false, status: "SCHEMA_FAILURE", providerEventCount: 1, httpRequestCount: 1, credentialReadCount: 1,
    naturalQuestionEgressCount: 1,
    requestTransition: transition(hashes[0], hashes[1], hashes[4], "request"),
    auditTransition: transition(hashes[1], hashes[2], hashes[5], "audit"),
    workflowTransition: transition(hashes[2], hashes[3], hashes[6], "completion"),
  };
  const result = await runCliV5R5(["execute-deepseek", "--context", "fixture", "--canary", "1"], {
    loadWorkflowContext: async () => ({ activeRegistration }),
    executeDeepSeekCanaryStep: async () => output,
  });
  assert.equal(result.receipt.stateTransitionCommitted, true);
  assert.equal(result.receipt.priorWorkflowIndexHash, hashes[0]);
  assert.equal(result.receipt.nextWorkflowIndexHash, hashes[3]);
  assert.deepEqual(result.receipt.derivedArtifactHashes, hashes.slice(4));
  assert.equal(result.nextWorkflowIndexPath, "/protected/completion.json");
  assert.equal(result.receipt.providerCommandInvoked, true);
});

test("interrupted reservation and stale lock recovery require exact owner authorization and remain provider-success negative", async () => {
  const realTemporaryRoot = await realpath(os.tmpdir());
  const temporary = await mkdtemp(path.join(realTemporaryRoot, "mais-v5-r5-ledger-"));
  try {
    const trustedRoot = await establishProtectedRootV5R4(temporary);
    const core = buildRunnerFixtureV5R4();
    const fixture = buildAuthorizationFixtureV5R4(core, "OPENAI_DIRECT");
    const activeRegistration = buildActiveRegistrationFixtureV5R5();
    const freshReview = buildFreshReviewFixtureV5R5(activeRegistration);
    const ledgerRelativePath = "fixture-ledger";
    const fixedTime = "2026-08-26T05:52:00.000Z";
    const ledger = await createAtomicExecutionLedgerV5R5({ trustedRoot, ledgerRelativePath, activeRegistration,
      authorization: fixture.authorization, inventory: fixture.inventory, priceSnapshot: fixture.priceSnapshot,
      clock: () => new Date(fixedTime), ownerPid: process.pid });
    const item = fixture.inventory.items[0];
    const attemptId = `V5R5:${activeRegistration.selfHash}:${item.itemHash}:1`;
    const requestArtifact = buildProviderRequestArtifactV5R4({ registration: fixture.registration,
      authorization: fixture.authorization, inventory: fixture.inventory, sampleManifest: fixture.sampleManifest,
      itemLeaf: fixture.itemLeaves[0], role: "A_SOLVE", attemptId, ledgerEntries: [] });
    const reservation = await ledger.reserve({ requestArtifact });
    const plan = sealV5R3Artifact({ schemaVersion: "ExecutionPlanReceiptV1", designId: "MAIS-NATURAL-CA60-V5",
      runnerRegistrationHash: fixture.registration.selfHash, provider: "OPENAI_DIRECT", mode: "REFERENCE_RESUME",
      planStatus: "NEXT_ACTION", itemHash: item.itemHash, manifestOrdinal: 1, role: "A_SOLVE",
      failedAttemptsForItemRole: 0, ledgerTerminalHash: null, c0DecisionHash: null,
      generatedAt: "2026-08-26T05:50:00.000Z" });
    const dispatchAudit = sealV5R3Artifact({ schemaVersion: "StateBoundDispatchAuditReceiptV1",
      designId: "MAIS-NATURAL-CA60-V5", activeRunnerRegistrationHash: activeRegistration.selfHash,
      compatibilityBaseRunnerRegistrationHash: fixture.registration.selfHash, freshRunnerReviewHash: freshReview.selfHash,
      ownerActivationGrantHash: H_V5_R5("activation"), providerAuthorizationHash: fixture.authorization.selfHash,
      authenticatedRouteEvidenceHash: H_V5_R5("authenticated-route"), costPreviewHash: H_V5_R5("cost-preview"),
      sampleExecutionInventoryHash: fixture.inventory.selfHash, executionRegistrationHash: null,
      c0ExecutionSetHash: null, canaryPredicateReceiptHash: null, adjudicationTriggerHash: null, canaryGateHash: null,
      executionPlan: plan, executionPlanHash: plan.selfHash, preReservationLedgerTerminalHash: null,
      itemHash: item.itemHash, role: "A_SOLVE", attemptOrdinal: 1, attemptId,
      issuedAt: "2026-08-26T05:50:00.000Z" });
    const recoveryAuthorization = buildLedgerRecoveryAuthorizationV5R5({
      activeRunnerRegistrationHash: activeRegistration.selfHash, providerAuthorizationHash: fixture.authorization.selfHash,
      ledgerRelativePathHash: sha256V5R3(ledgerRelativePath), recoveryKind: "INTERRUPTED_RESERVATION",
      exactTargetHash: reservation.selfHash, automaticRecoveryAuthorized: false, authorizedBy: "FIXTURE_OWNER",
      ownerAuthorizationTextHash: H_V5_R5("explicit-interrupted-owner-text"),
      issuedAt: "2026-08-26T05:51:00.000Z", expiresAt: "2026-08-26T06:10:00.000Z" });
    const recovered = await ledger.recoverInterruptedReservation({ recoveryAuthorization, requestArtifact, dispatchAudit,
      freshReview, recoveredBy: "FIXTURE_OWNER", recoveredAt: fixedTime });
    assert.equal(recovered.providerSuccessCreated, false);
    assert.equal(recovered.providerCallMadeByRecovery, false);
    assert.equal(recovered.credentialReadMadeByRecovery, false);
    assert.equal(recovered.completion.attemptStatus, "INTERRUPTED_RECOVERY_UNCERTAIN");
    const afterInterrupted = await ledger.verify();
    assert.deepEqual(afterInterrupted.errors, []); assert.equal(afterInterrupted.accounting.active.length, 0);
    assert.equal(afterInterrupted.accounting.accountedTokens, reservation.reservedTokens);

    const lock = sealV5R3Artifact({ schemaVersion: "ExecutionLedgerLockV1", designId: "MAIS-NATURAL-CA60-V5",
      activeRunnerRegistrationHash: activeRegistration.selfHash, authorizationHash: fixture.authorization.selfHash,
      ledgerRelativePathHash: sha256V5R3(ledgerRelativePath), ownerPid: 999_999_991,
      lockNonce: "fixture-stale-lock-nonce-0001", acquiredAt: "2026-08-26T05:51:00.000Z" });
    const lockPath = path.join(temporary, ledgerRelativePath, ".ledger.lock");
    await writeFile(lockPath, `${canonicalJsonV5R3(lock)}\n`, { encoding: "utf8", mode: 0o600, flag: "wx" });
    await chmod(lockPath, 0o600);
    const staleAuthorization = buildLedgerRecoveryAuthorizationV5R5({
      activeRunnerRegistrationHash: activeRegistration.selfHash, providerAuthorizationHash: fixture.authorization.selfHash,
      ledgerRelativePathHash: sha256V5R3(ledgerRelativePath), recoveryKind: "STALE_LOCK", exactTargetHash: lock.selfHash,
      automaticRecoveryAuthorized: false, authorizedBy: "FIXTURE_OWNER",
      ownerAuthorizationTextHash: H_V5_R5("explicit-stale-owner-text"),
      issuedAt: "2026-08-26T05:51:00.000Z", expiresAt: "2026-08-26T06:10:00.000Z" });
    const stale = await ledger.recoverStaleLock({ recoveryAuthorization: staleAuthorization, recoveredBy: "FIXTURE_OWNER",
      recoveredAt: fixedTime, pidProbe: async () => false });
    assert.equal(stale.automaticRecoveryUsed, false);
    assert.deepEqual((await ledger.verify()).errors, []);
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
});

test("a separately started Node process reloads the exact persisted V2 workflow index and artifact", async () => {
  const realTemporaryRoot = await realpath(os.tmpdir());
  const temporary = await mkdtemp(path.join(realTemporaryRoot, "mais-v5-r5-workflow-"));
  try {
    const trustedRoot = await establishProtectedRootV5R4(temporary);
    const activeRegistration = buildActiveRegistrationFixtureV5R5();
    const exactEvidence = buildExactRegistrationEvidenceFixtureV5R5(activeRegistration);
    const legacyArtifact = sealV5R3Artifact({ schemaVersion: "FixtureLegacyArtifactV1", value: "legacy-base" });
    const legacyRelativePath = "legacy-v5-r4/fixture-base.json";
    await atomicWriteProtectedJsonV5R4({ trustedRoot, relativePath: legacyRelativePath, value: legacyArtifact });
    const initialIndex = sealV5R3Artifact({
      schemaVersion: "ProtectedWorkflowIndexV1",
      designId: "MAIS-NATURAL-CA60-V5",
      runnerRegistrationHash: V5_R4_REGISTRATION_HASH,
      artifactEntries: [{ kind: "SAMPLE_INVENTORY", relativePath: legacyRelativePath,
        contentHash: sha256V5R3(Buffer.from(canonicalJsonV5R3(legacyArtifact), "utf8")) }],
      createdAt: "2026-08-26T05:55:00.000Z",
    });
    const initialRelativePath = "workflow-indexes-v5-r4/fixture-initial.json";
    await atomicWriteProtectedJsonV5R4({ trustedRoot, relativePath: initialRelativePath, value: initialIndex });
    const repoRoot = path.resolve(".");
    const context = await loadProtectedWorkflowIndexV5R5(path.join(temporary, initialRelativePath), {
      protectedRoot: temporary,
      repoRoot,
      registrationEvidenceLoader: async () => exactEvidence,
    });
    const derived = sealV5R3Artifact({ schemaVersion: "FixtureDerivedArtifactV1", value: "persisted-across-process" });
    const transition = await advanceProtectedWorkflowIndexV5R5({
      context,
      command: "adopt-r5-index",
      appendedArtifacts: [{ kind: "FIXTURE_PERSISTED_ARTIFACT", family: "fixture-artifacts", value: derived }],
      committedAt: "2026-08-26T05:56:00.000Z",
    });

    const workflowModuleUrl = pathToFileURL(path.resolve("coordination/content-qa/mais-natural-ca60-v1/workflow-index-v5-r5.mjs")).href;
    const fixtureModuleUrl = pathToFileURL(path.resolve("coordination/content-qa/mais-natural-ca60-v1/runner-v5-r5-test-fixtures.mjs")).href;
    const childPath = path.join(temporary, "reload-workflow.mjs");
    await writeFile(childPath, [
      `import { loadProtectedWorkflowIndexV5R5 } from ${JSON.stringify(workflowModuleUrl)};`,
      `import { buildExactRegistrationEvidenceFixtureV5R5 } from ${JSON.stringify(fixtureModuleUrl)};`,
      "const [indexPath, protectedRoot, repoRoot] = process.argv.slice(2);",
      "const evidence = buildExactRegistrationEvidenceFixtureV5R5();",
      "const context = await loadProtectedWorkflowIndexV5R5(indexPath, { protectedRoot, repoRoot, registrationEvidenceLoader: async () => evidence });",
      "const value = context.artifacts.get('FIXTURE_PERSISTED_ARTIFACT');",
      "if (!value || value.value !== 'persisted-across-process') throw new Error('persisted artifact not visible in fresh process');",
      "process.stdout.write(JSON.stringify({ indexHash: context.index.selfHash, artifactHash: value.selfHash }));",
      "",
    ].join("\n"), { encoding: "utf8", mode: 0o600 });
    const { stdout, stderr } = await execFileAsync(process.execPath,
      [childPath, transition.nextIndexPath, temporary, repoRoot], { encoding: "utf8" });
    assert.equal(stderr, "");
    assert.deepEqual(JSON.parse(stdout), { indexHash: transition.nextIndex.selfHash, artifactHash: derived.selfHash });
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
});
