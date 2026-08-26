import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { createLiveProviderHttpTransportV5R2 } from "./live-provider-http-v5-r2.mjs";
import { createProviderAttemptReceiptStoreV2 } from "./runner-storage-v5.mjs";
import {
  validOpenAIReferenceContext,
} from "./runner-v5-r2-test-fixtures.mjs";

async function guard() {
  return import("./authorization-guard-v5.mjs");
}

async function runner() {
  return import("./openai-live-reference-runner-v5-r2.mjs").catch(() => ({}));
}

function referenceEnvelope(outputPayload) {
  return {
    id: "resp_reference_failure_fixture_001",
    object: "response",
    status: "completed",
    model: "gpt-5.6-luna",
    reasoning: { effort: "high", context: "current_turn" },
    output: [{
      id: "msg_reference_failure_fixture_001",
      type: "message",
      status: "completed",
      role: "assistant",
      content: [{ type: "output_text", text: JSON.stringify(outputPayload), annotations: [] }],
    }],
    usage: {
      input_tokens: 120,
      output_tokens: 40,
      output_tokens_details: { reasoning_tokens: 10 },
      total_tokens: 160,
    },
  };
}

test("post-freeze OpenAI live guard issues an exact permit only after every frozen authorization gate", async () => {
  const api = await guard();
  assert.equal(typeof api.evaluateOpenAILiveDispatchPreflightV5R2, "function");
  const context = validOpenAIReferenceContext({
    kind: "LIVE_PROVIDER_HTTP_AUTHORIZED_V1",
    async send() { throw new Error("guard evaluation must not send"); },
  });
  const result = api.evaluateOpenAILiveDispatchPreflightV5R2(context);
  assert.equal(result.dispatchAllowed, true);
  assert.equal(result.providerEventCount, 0);
  assert.equal(result.httpRequestCount, 0);
  assert.equal(result.permit.transportKind, "LIVE_PROVIDER_HTTP_AUTHORIZED_V1");
  assert.equal(result.permit.providerCallAllowed, true);
  assert.equal(result.permit.credentialReadAllowed, true);
  assert.equal(result.permit.authorizationHash, context.authorization.authorizationHash);
  assert.match(result.permit.permitHash, /^[0-9a-f]{64}$/u);
});

test("live reference runner blocks before credential or transport access when authorization is missing", async () => {
  const api = await runner();
  assert.equal(typeof api.runOpenAIReferenceAttemptV5R2, "function");
  let transportCalls = 0;
  const context = validOpenAIReferenceContext({
    kind: "LIVE_PROVIDER_HTTP_AUTHORIZED_V1",
    async send() {
      transportCalls += 1;
      throw new Error("must not dispatch");
    },
  });
  context.authorization = null;
  context.trustedAuthorization = null;
  const result = await api.runOpenAIReferenceAttemptV5R2({
    ...context,
    runId: "run-r2-fixture-001",
    attemptId: "attempt-r2-fixture-001",
  });
  assert.equal(result.status, "AUTHORIZATION_BLOCKED");
  assert.equal(result.providerEventCount, 0);
  assert.equal(result.httpRequestCount, 0);
  assert.equal(result.credentialReadCount, 0);
  assert.equal(result.attemptReceipt, null);
  assert.equal(transportCalls, 0);
});

test("one authorized in-memory OpenAI attempt appends a semantic receipt and role output without persisting the bearer token", async (t) => {
  const api = await runner();
  const fakeToken = "sk-reference-fixture-sentinel-never-persist-123456789";
  const root = await mkdtemp(path.join(tmpdir(), "mais-ca60-openai-runner-r2-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const responseEnvelope = {
    id: "resp_reference_fixture_001",
    object: "response",
    status: "completed",
    model: "gpt-5.6-luna",
    reasoning: { effort: "high", context: "current_turn" },
    output: [{ id: "rs_fixture", type: "reasoning", summary: [] }, {
      id: "msg_reference_fixture_001",
      type: "message",
      status: "completed",
      role: "assistant",
      content: [{
        type: "output_text",
        text: JSON.stringify({
          solution: "2 + 3 = 5.",
          solvability: "SOLVABLE",
          uncertain: false,
        }),
        annotations: [],
      }],
    }],
    usage: {
      input_tokens: 120,
      output_tokens: 40,
      output_tokens_details: { reasoning_tokens: 10 },
      total_tokens: 160,
    },
  };
  const transport = createLiveProviderHttpTransportV5R2({
    provider: "OPENAI_DIRECT",
    endpoint: "https://us.api.openai.com/v1/responses",
    expectedModel: "gpt-5.6-luna",
    timeoutMs: 1_000,
    credentialSource: { async readBearerToken() { return fakeToken; } },
    async fetchImpl() {
      return {
        status: 200,
        redirected: false,
        url: "https://us.api.openai.com/v1/responses",
        headers: new Headers({
          "content-type": "application/json",
          "x-request-id": "req_reference_fixture_001",
        }),
        async text() { return JSON.stringify(responseEnvelope); },
      };
    },
  });
  const context = validOpenAIReferenceContext(transport);
  const receiptStore = createProviderAttemptReceiptStoreV2({ repoRoot: root, runId: "run-r2-fixture-001" });
  const result = await api.runOpenAIReferenceAttemptV5R2({
    ...context,
    runId: "run-r2-fixture-001",
    attemptId: "attempt-r2-fixture-001",
    startedAt: "2026-08-26T01:30:00.000Z",
    finishedAt: "2026-08-26T01:30:01.000Z",
    costRateSnapshotHash: context.authorization.priceSnapshotHash,
    estimatedCost: 0.001,
    cumulativeCost: 0.001,
    retryClassification: "NOT_A_RETRY",
    receiptStore,
  });
  assert.equal(result.status, "SUCCEEDED");
  assert.equal(result.providerEventCount, 1);
  assert.equal(result.httpRequestCount, 1);
  assert.equal(result.credentialReadCount, 1);
  assert.equal(result.attemptReceipt.attemptStatus, "SUCCEEDED");
  assert.equal(result.attemptReceipt.observedModel, "gpt-5.6-luna");
  assert.equal(result.roleOutput.role, "A_SOLVE");
  assert.equal((await receiptStore.read()).length, 1);
  assert.doesNotMatch(await readFile(receiptStore.path, "utf8"), /sk-reference-fixture-sentinel/u);
});

test("HTTP 429 is appended as a consumed retryable attempt without a role output", async (t) => {
  const api = await runner();
  const root = await mkdtemp(path.join(tmpdir(), "mais-ca60-openai-429-r2-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const transport = createLiveProviderHttpTransportV5R2({
    provider: "OPENAI_DIRECT",
    endpoint: "https://us.api.openai.com/v1/responses",
    expectedModel: "gpt-5.6-luna",
    timeoutMs: 1_000,
    credentialSource: { async readBearerToken() { return "fixture-token"; } },
    async fetchImpl() {
      return {
        status: 429,
        redirected: false,
        url: "https://us.api.openai.com/v1/responses",
        headers: new Headers({ "x-request-id": "req_429_fixture_001" }),
        async text() { return JSON.stringify({ error: { type: "rate_limit" } }); },
      };
    },
  });
  const context = validOpenAIReferenceContext(transport);
  const receiptStore = createProviderAttemptReceiptStoreV2({ repoRoot: root, runId: "run-r2-429-001" });
  const result = await api.runOpenAIReferenceAttemptV5R2({
    ...context,
    runId: "run-r2-429-001",
    attemptId: "attempt-r2-429-001",
    startedAt: "2026-08-26T01:30:00.000Z",
    finishedAt: "2026-08-26T01:30:01.000Z",
    costRateSnapshotHash: context.authorization.priceSnapshotHash,
    estimatedCost: 0,
    cumulativeCost: 0,
    retryClassification: "NOT_A_RETRY",
    receiptStore,
  });
  assert.equal(result.status, "HTTP_429");
  assert.equal(result.providerEventCount, 1);
  assert.equal(result.attemptReceipt.attemptStatus, "HTTP_429");
  assert.equal(result.attemptReceipt.retryClassification, "HTTP_429");
  assert.equal(result.attemptReceipt.httpStatus, 429);
  assert.equal(result.attemptReceipt.observedModel, null);
  assert.equal(result.roleOutput, null);
  assert.equal((await receiptStore.read()).length, 1);
});

test("malformed and schema-invalid 200 responses are appended as retryable consumed attempts", async (t) => {
  const api = await runner();
  for (const [rawBody, expectedStatus, expectedParse, expectedSchema] of [
    ["{", "MALFORMED_200", "MALFORMED", "NOT_EVALUATED"],
    [JSON.stringify(referenceEnvelope({ solution: "missing required fields" })), "SCHEMA_FAILURE", "PARSED", "INVALID"],
  ]) {
    const root = await mkdtemp(path.join(tmpdir(), `mais-ca60-openai-${expectedStatus.toLowerCase()}-`));
    t.after(() => rm(root, { recursive: true, force: true }));
    const transport = createLiveProviderHttpTransportV5R2({
      provider: "OPENAI_DIRECT",
      endpoint: "https://us.api.openai.com/v1/responses",
      expectedModel: "gpt-5.6-luna",
      timeoutMs: 1_000,
      credentialSource: { async readBearerToken() { return "fixture-token"; } },
      async fetchImpl() {
        return {
          status: 200,
          redirected: false,
          url: "https://us.api.openai.com/v1/responses",
          headers: new Headers({ "x-request-id": `req_${expectedStatus.toLowerCase()}_001` }),
          async text() { return rawBody; },
        };
      },
    });
    const context = validOpenAIReferenceContext(transport);
    const runId = `run-r2-${expectedStatus.toLowerCase()}-001`;
    const receiptStore = createProviderAttemptReceiptStoreV2({ repoRoot: root, runId });
    const result = await api.runOpenAIReferenceAttemptV5R2({
      ...context,
      runId,
      attemptId: `attempt-r2-${expectedStatus.toLowerCase()}-001`,
      startedAt: "2026-08-26T01:30:00.000Z",
      finishedAt: "2026-08-26T01:30:01.000Z",
      costRateSnapshotHash: context.authorization.priceSnapshotHash,
      estimatedCost: 0,
      cumulativeCost: 0,
      retryClassification: "NOT_A_RETRY",
      receiptStore,
    });
    assert.equal(result.status, expectedStatus);
    assert.equal(result.attemptReceipt.attemptStatus, expectedStatus);
    assert.equal(result.attemptReceipt.retryClassification, expectedStatus);
    assert.equal(result.attemptReceipt.parseStatus, expectedParse);
    assert.equal(result.attemptReceipt.schemaStatus, expectedSchema);
    assert.equal(result.roleOutput, null);
    assert.equal((await receiptStore.read()).length, 1);
  }
});
