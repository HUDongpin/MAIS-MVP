import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import DESIGN_REGISTRATION from "../../research/mais-natural-ca60-v1/versions/design-v5/design-registration.json" with { type: "json" };
import { jcsHash } from "../../research/mais-natural-ca60-v1/versions/design-v5/design-contract.mjs";

async function subject() {
  return import("./deepseek-attempt-receipt-v5-r2.mjs").catch(() => ({}));
}

const hash = (character) => character.repeat(64);

function successInput(overrides = {}) {
  return {
    runId: "deepseek-v5-r2-fixture-run",
    registrationHash: DESIGN_REGISTRATION.registrationHash,
    frameRegistrationHash: hash("1"),
    sampleManifestHash: hash("2"),
    authorizationHash: hash("3"),
    referenceSealHash: hash("4"),
    executionRegistrationHash: hash("5"),
    itemIdPseudonym: "ca60-00000000000000000000000000000001",
    itemHash: hash("6"),
    clusterId: "cluster-001",
    role: "B_PRIME_CRITIQUE",
    attemptId: "deepseek-attempt-001",
    requestedProvider: "DEEPSEEK_DIRECT",
    observedProvider: "DEEPSEEK_DIRECT",
    requestedModel: "deepseek-v4-pro",
    observedModel: "deepseek-v4-pro",
    requestedEndpoint: "https://api.deepseek.com/chat/completions",
    observedEndpoint: "https://api.deepseek.com/chat/completions",
    projectResidency: "UNKNOWN_PENDING_ROUTE_PROBE_EVIDENCE",
    responseId: "deepseek-response-001",
    providerRequestId: "deepseek-request-001",
    requestBodyHash: hash("7"),
    responseBodyHash: hash("8"),
    parsedOutputHash: hash("9"),
    logicalRequestHash: hash("a"),
    wireRequestBodyHash: hash("7"),
    reasoningContextRequested: "NOT_APPLICABLE",
    reasoningContextObserved: "NOT_APPLICABLE",
    storeRequested: false,
    backgroundRequested: false,
    startedAt: "2026-08-26T04:30:00.000Z",
    finishedAt: "2026-08-26T04:30:01.000Z",
    latencyMs: 1_000,
    httpStatus: 200,
    finishReason: "stop",
    parseStatus: "PARSED",
    schemaStatus: "VALID",
    attemptStatus: "SUCCEEDED",
    inputTokens: 20,
    outputTokens: 8,
    reasoningTokens: 3,
    totalTokens: 28,
    costRateSnapshotHash: hash("b"),
    estimatedCost: 0.001,
    cumulativeCost: 0.001,
    retryClassification: "NOT_A_RETRY",
    redactedError: null,
    ...overrides,
  };
}

test("DeepSeek V2 receipt builder binds the sealed reference, execution registration, tuple, usage, and chain hash", async () => {
  const api = await subject();
  assert.equal(typeof api.buildDeepSeekProviderAttemptPayloadV2, "function");
  assert.equal(typeof api.validateDeepSeekProviderAttemptReceiptV2, "function");
  const payload = api.buildDeepSeekProviderAttemptPayloadV2(successInput());
  const body = { ...payload, sequenceNumber: 1, previousReceiptHash: null };
  const receipt = { ...body, selfHash: jcsHash(body) };
  assert.deepEqual(api.validateDeepSeekProviderAttemptReceiptV2(receipt), []);
  assert.equal(receipt.referenceSealHash, hash("4"));
  assert.equal(receipt.executionRegistrationHash, hash("5"));
  assert.equal(receipt.appendOnly, true);
  assert.equal(receipt.atomicWrite, true);
  assert.equal(receipt.fileMode, "0600");
});

test("DeepSeek receipt rejects null seals, model drift, inconsistent usage, and a tampered hash", async () => {
  const api = await subject();
  for (const overrides of [
    { referenceSealHash: null },
    { observedModel: "deepseek-other" },
    { totalTokens: 27 },
  ]) {
    assert.throws(() => api.buildDeepSeekProviderAttemptPayloadV2(successInput(overrides)), /invalid|seal|model|token|receipt/iu);
  }
  const payload = api.buildDeepSeekProviderAttemptPayloadV2(successInput());
  const body = { ...payload, sequenceNumber: 1, previousReceiptHash: null };
  const receipt = { ...body, selfHash: jcsHash(body), httpStatus: 201 };
  assert.match(api.validateDeepSeekProviderAttemptReceiptV2(receipt).join("\n"), /hash/iu);
});

test("DeepSeek receipt store is append-only, mode 0600, and screens secret sentinels", async (t) => {
  const api = await subject();
  assert.equal(typeof api.createDeepSeekProviderAttemptReceiptStoreV2, "function");
  const root = await mkdtemp(path.join(tmpdir(), "mais-ca60-deepseek-receipts-r2-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const store = api.createDeepSeekProviderAttemptReceiptStoreV2({ repoRoot: root, runId: "deepseek-v5-r2-fixture-run" });
  const receipt = await store.append(api.buildDeepSeekProviderAttemptPayloadV2(successInput()));
  assert.equal(receipt.sequenceNumber, 1);
  assert.equal((await store.read()).length, 1);
  assert.equal((await stat(store.path)).mode & 0o777, 0o600);
  assert.doesNotMatch(await readFile(store.path, "utf8"), /Bearer|sk-/u);
  const failedPayload = api.buildDeepSeekProviderAttemptPayloadV2(successInput({
    attemptId: "deepseek-attempt-002",
    observedModel: null,
    responseId: null,
    parsedOutputHash: null,
    httpStatus: 500,
    finishReason: null,
    parseStatus: "NOT_PARSED",
    schemaStatus: "NOT_EVALUATED",
    attemptStatus: "HTTP_500",
    inputTokens: 0,
    outputTokens: 0,
    reasoningTokens: 0,
    totalTokens: 0,
    estimatedCost: 0,
    retryClassification: "HTTP_500",
    redactedError: "HTTP_500",
  }));
  await assert.rejects(store.append({
    ...failedPayload,
    redactedError: "Bearer sk-forbidden-secret-sentinel-123456789",
  }), /secret|credential|invalid/iu);
});
