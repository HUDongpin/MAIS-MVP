import assert from "node:assert/strict";
import test from "node:test";

import { samplePackage } from "./test-fixtures.mjs";
import { buildRoleProjectionV2 } from "./role-contract.mjs";

async function subject() {
  return import("./provider-adapter-v2.mjs");
}

function completeResult(role, projection) {
  return {
    schemaVersion: 2,
    role,
    packageId: projection.packageId,
    inspectionComplete: true,
    inspectedSurfaceIds: [
      ...(projection.questions ?? []).map((row) => row.id),
      ...(projection.lessons ?? []).map((row) => row.id)
    ],
    findings: []
  };
}

function sseResponse({ role, projection, responseId = "ds-response-1", model = "deepseek-v4-pro", content = null } = {}) {
  const json = content ?? JSON.stringify(completeResult(role, projection));
  const midpoint = Math.floor(json.length / 2);
  const events = [
    ": keep-alive\n\n",
    `data: ${JSON.stringify({ id: responseId, model, created: 1787529600, choices: [{ delta: { reasoning_content: "private reasoning" }, finish_reason: null }] })}\n\n`,
    `data: ${JSON.stringify({ id: responseId, model, created: 1787529600, choices: [{ delta: { content: json.slice(0, midpoint) }, finish_reason: null }] })}\n\n`,
    `data: ${JSON.stringify({ id: responseId, model, created: 1787529600, choices: [{ delta: { content: json.slice(midpoint) }, finish_reason: "stop" }], usage: { prompt_tokens: 120, prompt_cache_hit_tokens: 20, prompt_cache_miss_tokens: 100, completion_tokens: 30, total_tokens: 150 } })}\n\n`,
    "data: [DONE]\n\n"
  ].join("");
  return new Response(events, { status: 200, headers: { "content-type": "text/event-stream", "x-request-id": "http-request-1" } });
}

test("builds the frozen DeepSeek V4-Pro JSON request and records a valid secret-free call receipt", async () => {
  const { buildDeepSeekRoleRequestV2, createDeepSeekProviderAdapterV2 } = await subject();
  const packageContent = samplePackage();
  const role = "tool-verifier";
  const projection = buildRoleProjectionV2({ role, packageContent });
  let observedRequest;
  const adapter = createDeepSeekProviderAdapterV2({
    apiKey: "sk-test-not-real",
    now: () => 1000,
    fetchImpl: async (_url, init) => {
      observedRequest = JSON.parse(init.body);
      assert.equal(init.headers.authorization, "Bearer sk-test-not-real");
      return sseResponse({ role, projection });
    }
  });

  const request = buildDeepSeekRoleRequestV2({ role, packageId: packageContent.packageId, projection });
  assert.equal(request.model, "deepseek-v4-pro");
  assert.equal(request.temperature, 0);
  assert.equal(request.top_p, 1);
  assert.equal(request.stream, true);
  assert.deepEqual(request.response_format, { type: "json_object" });
  assert.deepEqual(request.thinking, { type: "enabled" });
  assert.equal(request.reasoning_effort, "high");

  const receipt = await adapter.runRole({ role, packageId: packageContent.packageId, projection });
  assert.deepEqual(observedRequest, request);
  assert.equal(receipt.roleResult.inspectionComplete, true);
  assert.equal(receipt.callRecord.request.stream, true);
  assert.equal(receipt.callRecord.response.responseId, "ds-response-1");
  assert.equal(receipt.callRecord.response.observedModel, "deepseek-v4-pro");
  assert.deepEqual(receipt.usage, {
    promptCacheHitTokens: 20,
    promptCacheMissTokens: 100,
    completionTokens: 30,
    totalTokens: 150
  });
  assert.match(receipt.requestBodySha256, /^[a-f0-9]{64}$/);
  assert.match(receipt.providerResponseSha256, /^[a-f0-9]{64}$/);
  assert.equal(JSON.stringify(receipt).includes("sk-test-not-real"), false);
  assert.equal(JSON.stringify(receipt).includes("private reasoning"), false);
});

test("classifies transient transport and HTTP failures without persisting upstream bodies", async () => {
  const { createDeepSeekProviderAdapterV2 } = await subject();
  const packageContent = samplePackage();
  const role = "answer-blind-solver";
  const projection = buildRoleProjectionV2({ role, packageContent });

  const networkAdapter = createDeepSeekProviderAdapterV2({ apiKey: "sk-test-not-real", fetchImpl: async () => { throw new Error("secret upstream detail"); } });
  await assert.rejects(
    () => networkAdapter.runRole({ role, packageId: packageContent.packageId, projection }),
    (error) => error.retryable === true && !error.message.includes("secret upstream detail")
  );

  const rateLimited = createDeepSeekProviderAdapterV2({ apiKey: "sk-test-not-real", fetchImpl: async () => new Response("do-not-log", { status: 429 }) });
  await assert.rejects(
    () => rateLimited.runRole({ role, packageId: packageContent.packageId, projection }),
    (error) => error.retryable === true && !error.message.includes("do-not-log")
  );

  const unauthorized = createDeepSeekProviderAdapterV2({ apiKey: "sk-test-not-real", fetchImpl: async () => new Response("do-not-log", { status: 401 }) });
  await assert.rejects(
    () => unauthorized.runRole({ role, packageId: packageContent.packageId, projection }),
    (error) => error.retryable === false && error.message.includes("HTTP 401")
  );
});

test("rejects model drift and treats malformed or contract-invalid model output as retryable", async () => {
  const { createDeepSeekProviderAdapterV2 } = await subject();
  const packageContent = samplePackage();
  const role = "bilingual-curriculum-critic";
  const projection = buildRoleProjectionV2({ role, packageContent });

  const drifted = createDeepSeekProviderAdapterV2({
    apiKey: "sk-test-not-real",
    fetchImpl: async () => sseResponse({ role, projection, model: "deepseek-v4-flash" })
  });
  await assert.rejects(
    () => drifted.runRole({ role, packageId: packageContent.packageId, projection }),
    (error) => error.retryable === false && error.message.includes("model drift")
  );

  const malformed = createDeepSeekProviderAdapterV2({
    apiKey: "sk-test-not-real",
    fetchImpl: async () => sseResponse({ role, projection, content: "{not-json" })
  });
  await assert.rejects(
    () => malformed.runRole({ role, packageId: packageContent.packageId, projection }),
    (error) => error.retryable === true && error.message.includes("invalid JSON")
  );

  const incomplete = createDeepSeekProviderAdapterV2({
    apiKey: "sk-test-not-real",
    fetchImpl: async () => sseResponse({
      role,
      projection,
      content: JSON.stringify({ ...completeResult(role, projection), inspectedSurfaceIds: [] })
    })
  });
  await assert.rejects(
    () => incomplete.runRole({ role, packageId: packageContent.packageId, projection }),
    (error) => error.retryable === true && error.message.includes("contract")
  );
});

test("fails closed when the SSE completion marker or usage accounting is absent", async () => {
  const { createDeepSeekProviderAdapterV2 } = await subject();
  const packageContent = samplePackage();
  const role = "evidence-verifier";
  const projection = buildRoleProjectionV2({ role, packageContent });
  const partial = `data: ${JSON.stringify({ id: "partial", model: "deepseek-v4-pro", choices: [{ delta: { content: "{}" }, finish_reason: "stop" }] })}\n\n`;
  const adapter = createDeepSeekProviderAdapterV2({
    apiKey: "sk-test-not-real",
    fetchImpl: async () => new Response(partial, { status: 200, headers: { "content-type": "text/event-stream" } })
  });
  await assert.rejects(
    () => adapter.runRole({ role, packageId: packageContent.packageId, projection }),
    (error) => error.retryable === true
  );
});
