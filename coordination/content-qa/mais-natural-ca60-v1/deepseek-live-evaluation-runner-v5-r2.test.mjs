import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { createDeepSeekProviderAttemptReceiptStoreV2 } from "./deepseek-attempt-receipt-v5-r2.mjs";
import { validDeepSeekContext } from "./deepseek-v5-r2-test-fixtures.mjs";
import { createLiveProviderHttpTransportV5R2 } from "./live-provider-http-v5-r2.mjs";

async function subject() {
  return import("./deepseek-live-evaluation-runner-v5-r2.mjs").catch(() => ({}));
}

function responseEnvelope(payload, overrides = {}) {
  return {
    id: "deepseek-response-fixture-001",
    model: "deepseek-v4-pro",
    choices: [{
      index: 0,
      message: { role: "assistant", content: JSON.stringify(payload) },
      finish_reason: "stop",
    }],
    usage: {
      prompt_tokens: 20,
      completion_tokens: 8,
      completion_tokens_details: { reasoning_tokens: 3 },
      total_tokens: 28,
    },
    ...overrides,
  };
}

function successfulPayload() {
  return { valid: true, surfaceDisposition: "NO_FINDING", findings: [], requiredRevisionCodes: [] };
}

function runnerInput(context, receiptStore, overrides = {}) {
  return {
    ...context,
    runId: "deepseek-v5-r2-fixture-run",
    attemptId: "deepseek-attempt-001",
    executionRegistrationHash: "5".repeat(64),
    startedAt: "2026-08-26T04:30:00.000Z",
    finishedAt: "2026-08-26T04:30:01.000Z",
    costRateSnapshotHash: context.authorization?.priceSnapshotHash ?? "b".repeat(64),
    estimatedCost: 0.001,
    cumulativeCost: 0.001,
    receiptStore,
    ...overrides,
  };
}

test("DeepSeek runner blocks before credential/transport/receipt activity without full evaluation authorization", async () => {
  const api = await subject();
  assert.equal(typeof api.runDeepSeekEvaluationAttemptV5R2, "function");
  let transportCalls = 0;
  let receiptWrites = 0;
  const context = validDeepSeekContext({
    kind: "LIVE_PROVIDER_HTTP_AUTHORIZED_V1",
    async send() { transportCalls += 1; },
  });
  context.authorization = null;
  context.trustedAuthorization = null;
  const result = await api.runDeepSeekEvaluationAttemptV5R2(runnerInput(context, {
    async append() { receiptWrites += 1; },
  }));
  assert.equal(result.status, "AUTHORIZATION_BLOCKED");
  assert.equal(result.providerEventCount, 0);
  assert.equal(result.httpRequestCount, 0);
  assert.equal(result.credentialReadCount, 0);
  assert.equal(result.attemptReceipt, null);
  assert.equal(transportCalls, 0);
  assert.equal(receiptWrites, 0);
});

test("authorized in-memory DeepSeek attempt appends a sealed blind receipt and role output without persisting the token", async (t) => {
  const api = await subject();
  const root = await mkdtemp(path.join(tmpdir(), "mais-ca60-deepseek-runner-r2-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const token = "sk-deepseek-fixture-sentinel-never-persist-123456789";
  const transport = createLiveProviderHttpTransportV5R2({
    provider: "DEEPSEEK_DIRECT",
    endpoint: "https://api.deepseek.com/chat/completions",
    expectedModel: "deepseek-v4-pro",
    timeoutMs: 1_000,
    credentialSource: { async readBearerToken() { return token; } },
    async fetchImpl() {
      return {
        status: 200,
        redirected: false,
        url: "https://api.deepseek.com/chat/completions",
        headers: new Headers({ "x-request-id": "deepseek-request-fixture-001" }),
        async text() { return JSON.stringify(responseEnvelope(successfulPayload())); },
      };
    },
  });
  const context = validDeepSeekContext(transport);
  const store = createDeepSeekProviderAttemptReceiptStoreV2({ repoRoot: root, runId: "deepseek-v5-r2-fixture-run" });
  const result = await api.runDeepSeekEvaluationAttemptV5R2(runnerInput(context, store));
  assert.equal(result.status, "SUCCEEDED", result.errors.join("\n"));
  assert.equal(result.providerEventCount, 1);
  assert.equal(result.httpRequestCount, 1);
  assert.equal(result.credentialReadCount, 1);
  assert.equal(result.attemptReceipt.referenceSealHash, context.authorization.referenceSealHash);
  assert.equal(result.attemptReceipt.executionRegistrationHash, "5".repeat(64));
  assert.equal(result.attemptReceipt.observedModel, "deepseek-v4-pro");
  assert.equal(result.roleOutput.role, "B_PRIME_CRITIQUE");
  assert.equal(result.roleOutput.referenceInputCount, 0);
  assert.doesNotMatch(JSON.stringify(result.roleOutput), /referenceLabel|OpenAIReference/iu);
  assert.equal((await store.read()).length, 1);
  assert.doesNotMatch(await readFile(store.path, "utf8"), /sk-deepseek-fixture-sentinel/u);
});

test("DeepSeek runner persists HTTP 429, malformed 200, and schema-invalid 200 as consumed attempts", async (t) => {
  const api = await subject();
  for (const [status, rawBody, expectedStatus] of [
    [429, JSON.stringify({ error: { type: "rate_limit" } }), "HTTP_429"],
    [200, "{", "MALFORMED_200"],
    [200, JSON.stringify(responseEnvelope({ valid: true, findings: [] })), "SCHEMA_FAILURE"],
  ]) {
    const root = await mkdtemp(path.join(tmpdir(), `mais-ca60-deepseek-${expectedStatus.toLowerCase()}-`));
    t.after(() => rm(root, { recursive: true, force: true }));
    const transport = createLiveProviderHttpTransportV5R2({
      provider: "DEEPSEEK_DIRECT",
      endpoint: "https://api.deepseek.com/chat/completions",
      expectedModel: "deepseek-v4-pro",
      timeoutMs: 1_000,
      credentialSource: { async readBearerToken() { return "fixture-token"; } },
      async fetchImpl() {
        return {
          status,
          redirected: false,
          url: "https://api.deepseek.com/chat/completions",
          headers: new Headers({ "x-request-id": `deepseek-${expectedStatus.toLowerCase()}-001` }),
          async text() { return rawBody; },
        };
      },
    });
    const context = validDeepSeekContext(transport);
    const runId = `deepseek-v5-r2-${expectedStatus.toLowerCase()}-run`;
    const store = createDeepSeekProviderAttemptReceiptStoreV2({ repoRoot: root, runId });
    const result = await api.runDeepSeekEvaluationAttemptV5R2(runnerInput(context, store, {
      runId,
      attemptId: `${expectedStatus.toLowerCase()}-attempt-001`,
      estimatedCost: 0,
      cumulativeCost: 0,
    }));
    assert.equal(result.status, expectedStatus);
    assert.equal(result.providerEventCount, 1);
    assert.equal(result.attemptReceipt.attemptStatus, expectedStatus);
    assert.equal(result.roleOutput, null);
    assert.equal((await store.read()).length, 1);
  }
});
