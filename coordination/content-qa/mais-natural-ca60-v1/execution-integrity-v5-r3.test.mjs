import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  buildDeepSeekC0TriggerReceiptV1,
  buildDeepSeekExecutionRegistrationV1,
  buildDeepSeekRouteProbeReceiptV1,
  buildOpenAIAdjudicationTriggerReceiptV1,
  buildOpenAIProjectRouteReceiptV1,
  buildProviderEventReceiptV3,
  buildRunnerReviewReceiptV2,
  buildSampleExecutionInventoryV1,
  canonicalJsonV5R3,
  deriveProviderCostUsd,
  sealV5R3Artifact,
  sha256V5R3,
  validateDeepSeekExecutionRegistrationV1,
  validatePriorRoleArtifactV5R3,
  validateRunnerReviewForAuthorizationV5R3,
  validateSampleExecutionInventoryV1,
} from "./execution-integrity-v5-r3.mjs";
import { createAtomicExecutionLedgerV5R3 } from "./atomic-execution-ledger-v5-r3.mjs";

const H = (character) => character.repeat(64);
const COMMIT = "c".repeat(40);

function runnerRegistration() {
  return sealV5R3Artifact({
    schemaVersion: "NaturalCaExecutionRunnerRegistrationV2",
    runnerVersion: "V5-R3",
    designId: "MAIS-NATURAL-CA60-V5",
    registeredAt: "2026-08-26T03:00:00.000Z",
    runnerSourceCommit: COMMIT,
    productionSourceRootHash: H("1"),
    testSourceRootHash: H("2"),
    frameRegistrationHash: H("3"),
    sampleManifestHash: H("4"),
    providerContractErratumHash: H("5"),
  });
}

function concurredReview(registration = runnerRegistration()) {
  return buildRunnerReviewReceiptV2({
    reviewedAt: "2026-08-26T03:30:00.000Z",
    decision: "CONCURRED",
    reviewedRegistration: registration,
    reviewerLane: "A11",
    findingCount: 0,
  });
}

function authorization(registration = runnerRegistration(), review = concurredReview(registration), overrides = {}) {
  return sealV5R3Artifact({
    schemaVersion: "ProviderAuthorizationV3",
    authorizationKind: "OPENAI_REFERENCE_LABELING",
    designId: "MAIS-NATURAL-CA60-V5",
    runnerRegistrationHash: registration.selfHash,
    runnerSourceCommit: registration.runnerSourceCommit,
    productionSourceRootHash: registration.productionSourceRootHash,
    testSourceRootHash: registration.testSourceRootHash,
    freshRunnerReviewHash: review.selfHash,
    issuedAt: "2026-08-26T04:00:00.000Z",
    expiresAt: "2026-08-27T04:00:00.000Z",
    provider: "OPENAI_DIRECT",
    model: "gpt-5.6-luna",
    endpoint: "https://us.api.openai.com/v1/responses",
    projectResidency: "US_STORAGE_PROCESSING",
    maximumAttempts: 3,
    maximumSuccessfulCalls: 2,
    maximumInputTokens: 500,
    maximumOutputTokens: 500,
    maximumTokens: 1000,
    maximumEstimatedUsd: 1,
    concurrencyCap: 1,
    maximumAttemptsPerRole: 2,
    roleReservationPolicy: {
      A_SOLVE: { inputTokens: 100, outputTokens: 100 },
      A_LABEL: { inputTokens: 100, outputTokens: 100 },
    },
    sampleExecutionInventoryHash: H("8"),
    priceSnapshotHash: H("6"),
    routeReceiptHash: H("7"),
    ...overrides,
  });
}

function priceSnapshot() {
  return sealV5R3Artifact({
    schemaVersion: "ProviderPriceSnapshotV1",
    provider: "OPENAI_DIRECT",
    model: "gpt-5.6-luna",
    currency: "USD",
    inputUsdPerMillionTokens: 1,
    outputUsdPerMillionTokens: 2,
    capturedAt: "2026-08-26T03:45:00.000Z",
  });
}

test("fresh runner review is post-registration, exact-root-bound, concurred, and pre-authorization", () => {
  const registration = runnerRegistration();
  const review = concurredReview(registration);
  const auth = authorization(registration, review);
  assert.deepEqual(validateRunnerReviewForAuthorizationV5R3({ registration, review, authorization: auth }), []);
  assert.match(review.selfHash, /^[0-9a-f]{64}$/u);

  const stale = { ...review, reviewedRunnerRegistrationHash: H("9") };
  assert.match(validateRunnerReviewForAuthorizationV5R3({ registration, review: stale, authorization: auth }).join("\n"), /self-hash|registration/u);
  const oldKind = sealV5R3Artifact({ schemaVersion: "IndependentDesignReviewReceiptV1", decision: "CONCURRED" });
  assert.match(validateRunnerReviewForAuthorizationV5R3({ registration, review: oldKind, authorization: auth }).join("\n"), /runner review schema/u);
  const discrepancy = buildRunnerReviewReceiptV2({
    reviewedAt: "2026-08-26T03:30:00.000Z",
    decision: "DISCREPANCY",
    reviewedRegistration: registration,
    reviewerLane: "A11",
    findingCount: 1,
  });
  assert.match(validateRunnerReviewForAuthorizationV5R3({ registration, review: discrepancy, authorization: authorization(registration, discrepancy) }).join("\n"), /CONCURRED/u);
});

test("sample execution inventory proves all 60 item, cluster, privacy, and rights memberships", () => {
  const items = Array.from({ length: 60 }, (_, index) => ({
    itemHash: sha256V5R3(`item-${index}`),
    itemIdPseudonym: `sample-${String(index + 1).padStart(2, "0")}`,
    clusterId: `cluster-${String(index + 1).padStart(2, "0")}`,
    privacyScreenEvidenceHash: sha256V5R3(`privacy-${index}`),
    rightsScreenEvidenceHash: sha256V5R3(`rights-${index}`),
    egressEligible: true,
  }));
  const registration = sealV5R3Artifact({
    schemaVersion: "NaturalCaExecutionRunnerRegistrationV2",
    runnerVersion: "V5-R3",
    designId: "MAIS-NATURAL-CA60-V5",
    sampleManifestHash: H("a"),
    samplePayloadSetHash: sha256V5R3(canonicalJsonV5R3(items.map(({ itemHash }) => itemHash).sort())),
    privacyScreenHash: sha256V5R3(canonicalJsonV5R3(items.map(({ itemHash, privacyScreenEvidenceHash }) => [itemHash, privacyScreenEvidenceHash]).sort((left, right) => left[0].localeCompare(right[0])))),
    rightsScreenHash: sha256V5R3(canonicalJsonV5R3(items.map(({ itemHash, rightsScreenEvidenceHash }) => [itemHash, rightsScreenEvidenceHash]).sort((left, right) => left[0].localeCompare(right[0])))),
  });
  const inventory = buildSampleExecutionInventoryV1({ registration, items });
  assert.deepEqual(validateSampleExecutionInventoryV1({ registration, inventory }), []);
  assert.equal(inventory.itemCount, 60);

  const substituted = structuredClone(inventory);
  substituted.items[0].itemHash = H("f");
  assert.match(validateSampleExecutionInventoryV1({ registration, inventory: substituted }).join("\n"), /self-hash|payload-set/u);
  const duplicateCluster = structuredClone(inventory);
  duplicateCluster.items[1].clusterId = duplicateCluster.items[0].clusterId;
  duplicateCluster.selfHash = sha256V5R3(canonicalJsonV5R3(Object.fromEntries(Object.entries(duplicateCluster).filter(([key]) => key !== "selfHash"))));
  assert.match(validateSampleExecutionInventoryV1({ registration, inventory: duplicateCluster }).join("\n"), /cluster/u);
});

test("atomic ledger derives caps from sealed authorization and pessimistic price, not caller snapshots", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "ca60-v5-r3-ledger-"));
  const registration = runnerRegistration();
  const review = concurredReview(registration);
  const price = priceSnapshot();
  const auth = authorization(registration, review, { priceSnapshotHash: price.selfHash });
  const ledger = await createAtomicExecutionLedgerV5R3({ root, authorization: auth, priceSnapshot: price });

  const first = await ledger.reserve({
    attemptId: "attempt-001",
    role: "A_SOLVE",
    itemHash: H("a"),
    itemIdPseudonym: "item-001",
    clusterId: "cluster-001",
  });
  assert.equal(first.status, "RESERVED");
  assert.equal(first.reservedTokens, 200);
  assert.equal(first.reservedUsd, 0.0003);
  await assert.rejects(
    ledger.reserve({ attemptId: "attempt-002", role: "A_LABEL", itemHash: H("a"), itemIdPseudonym: "item-001", clusterId: "cluster-001", budgetState: { attempts: 0 } }),
    /concurrency cap/u,
  );
  const firstEvent = buildProviderEventReceiptV3({
    reservation: first,
    provider: "OPENAI_DIRECT",
    requestedModel: "gpt-5.6-luna",
    observedModel: "gpt-5.6-luna",
    requestedEndpoint: "https://us.api.openai.com/v1/responses",
    observedEndpoint: "https://us.api.openai.com/v1/responses",
    transportStatus: "DELIVERED",
    bodyReadStatus: "BODY_READ_COMPLETE",
    httpStatus: 200,
    rawResponseBody: "{}",
    responseEnvelope: { usage: { input_tokens: 1, output_tokens: 1, total_tokens: 2 } },
    parseStatus: "PARSED",
    schemaStatus: "VALID",
    finishReason: "completed",
    priceSnapshot: price,
    completedAt: "2026-08-26T04:01:00.000Z",
    providerEventCount: 1,
    httpRequestCount: 1,
  });
  await ledger.complete({ reservationHash: first.selfHash, providerEventReceipt: firstEvent, attemptStatus: "SUCCEEDED" });
  const second = await ledger.reserve({ attemptId: "attempt-002", role: "A_LABEL", itemHash: H("a"), itemIdPseudonym: "item-001", clusterId: "cluster-001" });
  assert.equal(second.sequenceNumber, 3);
  await assert.rejects(
    ledger.reserve({ attemptId: "attempt-002", role: "A_LABEL", itemHash: H("a"), itemIdPseudonym: "item-001", clusterId: "cluster-001" }),
    /duplicate attemptId/u,
  );

  const files = (await readdir(root)).filter((name) => name.endsWith(".json"));
  assert.equal(files.length, 3);
  assert.ok(files.every((name) => /^\d{8}-[0-9a-f]{64}\.json$/u.test(name)));
  assert.ok((await readdir(root)).every((name) => !name.endsWith(".tmp")));
  assert.equal((await stat(path.join(root, files[0]))).mode & 0o777, 0o600);
  assert.deepEqual((await ledger.verify()).errors, []);

  const firstPath = path.join(root, files[0]);
  await writeFile(firstPath, `${await readFile(firstPath, "utf8")} `, { mode: 0o600 });
  assert.match((await ledger.verify()).errors.join("\n"), /canonical|hash/u);
});

test("concurrent reservations serialize and cannot spend the same cap snapshot", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "ca60-v5-r3-concurrent-"));
  const registration = runnerRegistration();
  const review = concurredReview(registration);
  const price = priceSnapshot();
  const ledger = await createAtomicExecutionLedgerV5R3({
    root,
    authorization: authorization(registration, review, { concurrencyCap: 1, priceSnapshotHash: price.selfHash }),
    priceSnapshot: price,
  });
  const settled = await Promise.allSettled([
    ledger.reserve({ attemptId: "parallel-1", role: "A_SOLVE", itemHash: H("a"), itemIdPseudonym: "item-1", clusterId: "cluster-1" }),
    ledger.reserve({ attemptId: "parallel-2", role: "A_SOLVE", itemHash: H("b"), itemIdPseudonym: "item-2", clusterId: "cluster-2" }),
  ]);
  assert.equal(settled.filter((entry) => entry.status === "fulfilled").length, 1);
  assert.equal(settled.filter((entry) => entry.status === "rejected").length, 1);
});

test("crash remnants and stale locks are detected and require manual fail-closed recovery", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "ca60-v5-r3-crash-"));
  const registration = runnerRegistration();
  const review = concurredReview(registration);
  const price = priceSnapshot();
  const ledger = await createAtomicExecutionLedgerV5R3({
    root,
    authorization: authorization(registration, review, { priceSnapshotHash: price.selfHash }),
    priceSnapshot: price,
  });
  await writeFile(path.join(root, ".orphan.tmp"), "partial", { mode: 0o600 });
  await writeFile(path.join(root, ".ledger.lock"), "LOCKED\n", { mode: 0o600 });
  const errors = (await ledger.verify()).errors.join("\n");
  assert.match(errors, /manual recovery/u);
  assert.match(errors, /incomplete atomic entry/u);
  await assert.rejects(ledger.reserve({ attemptId: "blocked", role: "A_SOLVE", itemHash: H("a"), itemIdPseudonym: "item", clusterId: "cluster" }), /busy/u);
});

test("provider-event receipt preserves drift, body failure, billable malformed usage, and derived cost", () => {
  const price = priceSnapshot();
  assert.equal(deriveProviderCostUsd({ inputTokens: 100, outputTokens: 50 }, price), 0.0002);
  const reservation = sealV5R3Artifact({
    schemaVersion: "ProviderDispatchReservationV1",
    authorizationHash: H("a"),
    attemptId: "attempt-1",
    role: "A_SOLVE",
    itemHash: H("b"),
    itemIdPseudonym: "item-1",
    clusterId: "cluster-1",
    sampleExecutionInventoryHash: H("c"),
    reservedTokens: 200,
    reservedUsd: 0.0003,
  });
  const receipt = buildProviderEventReceiptV3({
    reservation,
    provider: "OPENAI_DIRECT",
    requestedModel: "gpt-5.6-luna",
    observedModel: "gpt-5.6-luna-drift",
    requestedEndpoint: "https://us.api.openai.com/v1/responses",
    observedEndpoint: "https://wrong.example/v1/responses",
    transportStatus: "PROVIDER_ORIGIN_DRIFT",
    bodyReadStatus: "BODY_READ_FAILED_AFTER_DISPATCH",
    httpStatus: 200,
    rawResponseBody: null,
    responseEnvelope: { usage: { input_tokens: 100, output_tokens: 50, total_tokens: 150 } },
    parseStatus: "MALFORMED",
    schemaStatus: "NOT_EVALUATED",
    finishReason: "unknown_drift",
    priceSnapshot: price,
    completedAt: "2026-08-26T04:01:00.000Z",
    providerEventCount: 1,
    httpRequestCount: 1,
  });
  assert.equal(receipt.usageSource, "PROVIDER_ENVELOPE");
  assert.equal(receipt.totalTokens, 150);
  assert.equal(receipt.estimatedCostUsd, 0.0002);
  assert.equal(receipt.transportStatus, "PROVIDER_ORIGIN_DRIFT");
  assert.equal(receipt.bodyReadStatus, "BODY_READ_FAILED_AFTER_DISPATCH");
  assert.equal(receipt.observedModel, "gpt-5.6-luna-drift");
  assert.equal(receipt.finishReason, "unknown_drift");
  assert.match(receipt.selfHash, /^[0-9a-f]{64}$/u);
});

test("DeepSeek execution registration is fully self-hashed and authorization/seal/tuple bound", () => {
  const registration = runnerRegistration();
  const review = concurredReview(registration);
  const auth = authorization(registration, review, {
    authorizationKind: "DEEPSEEK_EVALUATION",
    provider: "DEEPSEEK_DIRECT",
    model: "deepseek-v4-pro",
    endpoint: "https://api.deepseek.com/chat/completions",
    projectResidency: "UNKNOWN_PENDING_ROUTE_PROBE_EVIDENCE",
  });
  const execution = buildDeepSeekExecutionRegistrationV1({
    registeredAt: "2026-08-26T05:00:00.000Z",
    runnerRegistration: registration,
    runnerReview: review,
    authorization: auth,
    referenceSealHash: H("8"),
    referenceAttemptChainHash: H("9"),
    frameRegistrationHash: registration.frameRegistrationHash,
    sampleManifestHash: registration.sampleManifestHash,
    routeReceiptHash: auth.routeReceiptHash,
    adapterHash: H("d"),
  });
  assert.deepEqual(validateDeepSeekExecutionRegistrationV1({ executionRegistration: execution, runnerRegistration: registration, runnerReview: review, authorization: auth }), []);
  assert.match(validateDeepSeekExecutionRegistrationV1({ executionRegistration: { selfHash: H("f") }, runnerRegistration: registration, runnerReview: review, authorization: auth }).join("\n"), /schema|self-hash|binding/u);
  assert.match(validateDeepSeekExecutionRegistrationV1({ executionRegistration: { ...execution, referenceSealHash: H("0") }, runnerRegistration: registration, runnerReview: review, authorization: auth }).join("\n"), /self-hash|reference/u);
});

test("prior-role lineage recomputes both artifact and successful attempt receipt hashes", () => {
  const attempt = sealV5R3Artifact({
    schemaVersion: "ProviderEventReceiptV3",
    attemptId: "attempt-1",
    role: "B_PRIME_CRITIQUE",
    itemHash: H("a"),
    itemIdPseudonym: "item-1",
    attemptStatus: "SUCCEEDED",
  });
  const artifact = sealV5R3Artifact({
    schemaVersion: "DeepSeekEvaluationRoleOutputV5R3",
    attemptId: attempt.attemptId,
    attemptReceiptHash: attempt.selfHash,
    role: attempt.role,
    itemHash: attempt.itemHash,
    itemIdPseudonym: attempt.itemIdPseudonym,
    parsedPayloadHash: H("b"),
  });
  assert.deepEqual(validatePriorRoleArtifactV5R3({ artifact, attemptReceipt: attempt, expectedRole: attempt.role, itemHash: attempt.itemHash, itemIdPseudonym: attempt.itemIdPseudonym }), []);
  assert.match(validatePriorRoleArtifactV5R3({ artifact: { ...artifact, parsedPayloadHash: H("c") }, attemptReceipt: attempt, expectedRole: attempt.role, itemHash: attempt.itemHash, itemIdPseudonym: attempt.itemIdPseudonym }).join("\n"), /self-hash/u);
  assert.match(validatePriorRoleArtifactV5R3({ artifact, attemptReceipt: { ...attempt, itemHash: H("d") }, expectedRole: attempt.role, itemHash: attempt.itemHash, itemIdPseudonym: attempt.itemIdPseudonym }).join("\n"), /self-hash|item/u);
});

test("adjudication and C0 requirements are derived from sealed same-item trigger inputs", () => {
  const item = { itemHash: H("a"), itemIdPseudonym: "item-1" };
  const a = sealV5R3Artifact({ schemaVersion: "MachineReferenceLabelV1", ...item, panelRole: "A_LABEL", uncertain: false, severity: "P1", codes: ["EVIDENCE_MISMATCH"] });
  const b = sealV5R3Artifact({ schemaVersion: "MachineReferenceLabelV1", ...item, panelRole: "B_LABEL", uncertain: false, severity: "NO_FINDING", codes: ["NO_FINDING"] });
  const trigger = buildOpenAIAdjudicationTriggerReceiptV1({ item, labelA: a, labelB: b, triggerEngineHash: H("e") });
  assert.equal(trigger.adjudicationRequired, true);
  assert.ok(trigger.reasons.includes("FIELD_DISAGREEMENT"));
  assert.throws(() => buildOpenAIAdjudicationTriggerReceiptV1({ item, labelA: { ...a, itemHash: H("f") }, labelB: b, triggerEngineHash: H("e") }), /self-hash|item/u);

  const c0 = buildDeepSeekC0TriggerReceiptV1({
    item,
    randomAuditSelectionReceipt: sealV5R3Artifact({ schemaVersion: "C0RandomAuditMembershipV1", ...item, selected: false }),
    mandatoryTriggerReceipt: sealV5R3Artifact({ schemaVersion: "C0MandatoryTriggerV1", ...item, triggeredCodes: ["ANSWER_CRITICAL_VISUAL"] }),
    triggerEngineHash: H("f"),
  });
  assert.equal(c0.c0Required, true);
  assert.deepEqual(c0.reasons, ["MANDATORY_POLICY_TRIGGER"]);
});

test("route builders produce closed self-hashed receipts bound to console/project or data-region evidence", () => {
  const openai = buildOpenAIProjectRouteReceiptV1({
    registrationHash: H("1"),
    preflightAuthorizationHash: H("2"),
    credentialReadinessReceiptHash: H("3"),
    projectResidencyConsoleEvidenceHash: H("4"),
    projectIdentityHash: H("5"),
    providerAttemptReceiptHash: H("6"),
    priceSnapshotHash: H("7"),
    observedEndpoint: "https://us.api.openai.com/v1/responses",
    observedModel: "gpt-5.6-luna",
    projectStorageAndProcessingConfirmed: true,
    modelAvailableOnProject: true,
    completedAt: "2026-08-26T04:00:00.000Z",
  });
  assert.equal(openai.preflightStatus, "CONFIRMED");
  assert.equal(openai.containsNaturalQuestionText, false);
  assert.equal(openai.projectIdentityHash, H("5"));

  const deepseek = buildDeepSeekRouteProbeReceiptV1({
    registrationHash: H("1"),
    probeAuthorizationHash: H("2"),
    credentialReadinessReceiptHash: H("3"),
    directBillingEvidenceHash: H("4"),
    dataRegionEvidenceHash: H("5"),
    providerAttemptReceiptHash: H("6"),
    priceSnapshotHash: H("7"),
    observedEndpoint: "https://api.deepseek.com/chat/completions",
    observedModel: "deepseek-v4-pro",
    directBillingConfirmed: true,
    dataRegion: "DIRECT_ROUTE_EVIDENCE_BOUND",
    completedAt: "2026-08-26T04:00:00.000Z",
  });
  assert.equal(deepseek.probeStatus, "CONFIRMED");
  assert.equal(deepseek.containsNaturalQuestionText, false);
  assert.match(deepseek.selfHash, /^[0-9a-f]{64}$/u);
});
