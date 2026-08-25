import assert from "node:assert/strict";
import { mkdtemp, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import DESIGN_REGISTRATION from "../../research/mais-natural-ca60-v1/versions/design-v5/design-registration.json" with { type: "json" };
import {
  jcsHash,
} from "../../research/mais-natural-ca60-v1/versions/design-v5/design-contract.mjs";
import {
  buildProviderAttemptPayloadV2,
  validateProviderAttemptReceiptV2,
} from "./openai-reference-adapter-v5.mjs";

async function storage() {
  return import("./runner-storage.mjs");
}

async function providerStore() {
  return import("./runner-storage-v5.mjs");
}

async function temporaryRepo(t) {
  const root = await mkdtemp(path.join(tmpdir(), "mais-natural-ca60-v5-storage-"));
  t.after(async () => rm(root, { recursive: true, force: true }));
  return root;
}

const hash = (character) => character.repeat(64);

function registryInput(repoRoot) {
  return {
    repoRoot,
    designRegistrationHash: DESIGN_REGISTRATION.registrationHash,
    registrationPackageRootHash: "1".repeat(64),
    runnerCommit: "2".repeat(40),
    runnerSourceManifest: [
      { path: "coordination/content-qa/mais-natural-ca60-v1/openai-reference-adapter-v5.mjs", byteLength: 42, sha256: "3".repeat(64) },
      { path: "coordination/content-qa/mais-natural-ca60-v1/runner-storage-v5.mjs", byteLength: 43, sha256: "4".repeat(64) },
    ],
    adapterHash: "3".repeat(64),
    createdAt: "2026-08-26T01:00:00.000Z",
    previousRegistryHash: null,
  };
}

function attemptPayload() {
  return buildProviderAttemptPayloadV2({
    runId: "run-v5-001",
    registrationHash: DESIGN_REGISTRATION.registrationHash,
    frameRegistrationHash: hash("1"),
    sampleManifestHash: hash("2"),
    authorizationHash: hash("3"),
    referenceSealHash: null,
    executionRegistrationHash: null,
    itemIdPseudonym: "item-pseudo-001",
    itemHash: hash("4"),
    clusterId: "cluster-001",
    role: "A_SOLVE",
    attemptId: "attempt-001",
    requestedProvider: "OPENAI_DIRECT",
    observedProvider: "OPENAI_DIRECT",
    requestedModel: "gpt-5.6-luna",
    observedModel: "gpt-5.6-luna",
    requestedEndpoint: "https://us.api.openai.com/v1/responses",
    observedEndpoint: "https://us.api.openai.com/v1/responses",
    projectResidency: "US_STORAGE_PROCESSING",
    responseId: "resp_fixture_001",
    providerRequestId: "req_fixture_001",
    requestBodyHash: hash("5"),
    responseBodyHash: hash("6"),
    parsedOutputHash: hash("7"),
    logicalRequestHash: hash("8"),
    wireRequestBodyHash: hash("5"),
    reasoningContextRequested: "current_turn",
    reasoningContextObserved: "current_turn",
    storeRequested: false,
    backgroundRequested: false,
    startedAt: "2026-08-26T01:30:00.000Z",
    finishedAt: "2026-08-26T01:30:01.000Z",
    latencyMs: 1000,
    httpStatus: 200,
    finishReason: "completed",
    parseStatus: "PARSED",
    schemaStatus: "VALID",
    attemptStatus: "SUCCEEDED",
    inputTokens: 120,
    outputTokens: 40,
    reasoningTokens: 10,
    totalTokens: 160,
    costRateSnapshotHash: hash("9"),
    estimatedCost: 0.01,
    cumulativeCost: 0.01,
    retryClassification: "NOT_A_RETRY",
    redactedError: null,
  });
}

test("V5 protected custody is self-hashed, nonauthorizing, immutable, and mode 0600", async (t) => {
  const api = await storage();
  const repoRoot = await temporaryRepo(t);
  const registry = api.buildProtectedExecutionCustodyRegistryV2(registryInput(repoRoot));
  assert.equal(registry.schemaVersion, "ProtectedExecutionCustodyRegistryV2");
  assert.equal(registry.designId, "MAIS-NATURAL-CA60-V5");
  assert.equal(registry.designRegistrationHash, DESIGN_REGISTRATION.registrationHash);
  assert.equal(registry.providerExecutionAuthorized, false);
  assert.equal(registry.aggregatePublicationAuthorized, false);
  assert.equal(registry.v5RunnerMigrationComplete, true);
  assert.deepEqual(api.validateProtectedExecutionCustodyRegistryV2(registry, { repoRoot }), []);

  const written = await api.writeProtectedExecutionCustodyRegistryV2({ repoRoot, registry });
  assert.equal(written.created, true);
  assert.equal(written.path, path.join(repoRoot, ".local/mais-natural-ca60-v1/custody/registry-v5.json"));
  assert.equal((await stat(written.path)).mode & 0o777, 0o600);
  assert.deepEqual(await api.readProtectedExecutionCustodyRegistryV2({ repoRoot }), registry);
  assert.equal((await api.writeProtectedExecutionCustodyRegistryV2({ repoRoot, registry })).created, false);

  const conflict = api.buildProtectedExecutionCustodyRegistryV2({
    ...registryInput(repoRoot),
    runnerCommit: "a".repeat(40),
  });
  await assert.rejects(api.writeProtectedExecutionCustodyRegistryV2({ repoRoot, registry: conflict }), /conflict/iu);
});

test("ProviderAttemptReceiptV2 is appended only after semantic validation and has one canonical chain root", async (t) => {
  const api = await providerStore();
  const repoRoot = await temporaryRepo(t);
  const store = api.createProviderAttemptReceiptStoreV2({ repoRoot, runId: "run-v5-001" });
  const firstPayload = attemptPayload();
  const first = await store.append(firstPayload);
  assert.equal(first.sequenceNumber, 1);
  assert.equal(first.previousReceiptHash, null);
  assert.equal(first.selfHash, jcsHash(Object.fromEntries(Object.entries(first).filter(([key]) => key !== "selfHash"))));
  assert.deepEqual(validateProviderAttemptReceiptV2(first), []);
  assert.equal((await stat(store.path)).mode & 0o777, 0o600);

  const second = await store.append({
    ...attemptPayload(),
    attemptId: "attempt-002",
    cumulativeCost: 0.02,
  });
  assert.equal(second.sequenceNumber, 2);
  assert.equal(second.previousReceiptHash, first.selfHash);
  assert.deepEqual((await store.validate()).errors, []);
  assert.equal((await store.read()).length, 2);
});

test("invalid V2 receipts and secret-bearing payloads are rejected before a chain append", async (t) => {
  const api = await providerStore();
  const repoRoot = await temporaryRepo(t);
  const store = api.createProviderAttemptReceiptStoreV2({ repoRoot, runId: "run-v5-001" });
  await assert.rejects(store.append({ ...attemptPayload(), observedModel: "gpt-5.6-luna-preview" }), /model|receipt/iu);
  await assert.rejects(store.append({ ...attemptPayload(), apiKey: "sk-secret-sentinel-should-never-persist" }), /field|secret|receipt/iu);
  assert.deepEqual(await store.read(), []);
});
