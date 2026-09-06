import assert from "node:assert/strict";
import test from "node:test";

import {
  buildDeepSeekRoleRequest,
  createDeepSeekProviderAdapter
} from "./f3-provider-adapter.mjs";

const API_KEY = "test-only-provider-key-never-log";

function projection() {
  return {
    packageId: "pkg-safe",
    protocolId: "MAIS-RSI-LITE-CAL-V1",
    protocolVersion: "1.1.1-f2-r",
    sourceBaseline: "b6c7c347a49a813e454e707dd3c16399dcf29909",
    region: "CA",
    questions: [{ id: "q-1", prompt: { en: "What is 2 + 2?" } }],
    lessons: [{ id: "lesson-1", title: { en: "Addition" } }]
  };
}

function validRoleResult() {
  return {
    schemaVersion: 1,
    role: "evidence-verifier",
    packageId: "pkg-safe",
    inspectionComplete: true,
    inspectedSurfaceIds: ["q-1", "lesson-1"],
    findings: []
  };
}

function streamingResponse({ content = JSON.stringify(validRoleResult()), includeUsage = true, includeDone = true } = {}) {
  const chunks = [
    {
      id: "chatcmpl-local-1",
      model: "deepseek-v4-pro",
      system_fingerprint: "fp_local",
      choices: [{ index: 0, finish_reason: null, delta: { role: "assistant", reasoning_content: "must-not-" } }],
      usage: null
    },
    {
      id: "chatcmpl-local-1",
      model: "deepseek-v4-pro",
      system_fingerprint: "fp_local",
      choices: [{ index: 0, finish_reason: null, delta: { reasoning_content: "be-persisted" } }],
      usage: null
    },
    {
      id: "chatcmpl-local-1",
      model: "deepseek-v4-pro",
      system_fingerprint: "fp_local",
      choices: [{ index: 0, finish_reason: null, delta: { content: content.slice(0, Math.ceil(content.length / 2)) } }],
      usage: null
    },
    {
      id: "chatcmpl-local-1",
      model: "deepseek-v4-pro",
      system_fingerprint: "fp_local",
      choices: [{ index: 0, finish_reason: "stop", delta: { content: content.slice(Math.ceil(content.length / 2)) } }],
      usage: null
    },
    ...(includeUsage ? [{
      id: "chatcmpl-local-1",
      model: "deepseek-v4-pro",
      system_fingerprint: "fp_local",
      choices: [],
      usage: { prompt_tokens: 123, prompt_cache_hit_tokens: 20, prompt_cache_miss_tokens: 103, completion_tokens: 45, total_tokens: 168 }
    }] : [])
  ];
  const payload = `${chunks.map((chunk) => `data: ${JSON.stringify(chunk)}\n\n`).join("")}${includeDone ? "data: [DONE]\n\n" : ""}`;
  const bytes = new TextEncoder().encode(payload);
  const body = new ReadableStream({
    start(controller) {
      for (let offset = 0; offset < bytes.length; offset += 37) controller.enqueue(bytes.slice(offset, offset + 37));
      controller.close();
    }
  });
  return new Response(body, { status: 200, headers: { "content-type": "text/event-stream", "x-request-id": "req-local-1" } });
}

test("builds a strict JSON, thinking-enabled, streaming role request with final usage and no sampling knobs", () => {
  const body = buildDeepSeekRoleRequest({
    model: "deepseek-v4-pro",
    role: "evidence-verifier",
    packageId: "pkg-safe",
    projection: projection(),
    maxOutputTokens: 16_000,
    userId: "mais-rsi-lite-f3"
  });

  assert.equal(body.model, "deepseek-v4-pro");
  assert.deepEqual(body.response_format, { type: "json_object" });
  assert.deepEqual(body.thinking, { type: "enabled" });
  assert.equal(body.reasoning_effort, "high");
  assert.equal(body.max_tokens, 16_000);
  assert.equal(body.stream, true);
  assert.deepEqual(body.stream_options, { include_usage: true });
  assert.equal(body.user, "mais-rsi-lite-f3");
  assert.equal(Object.hasOwn(body, "temperature"), false);
  assert.equal(Object.hasOwn(body, "top_p"), false);
  assert.match(body.messages[0].content, /untrusted content/i);
  assert.match(body.messages[0].content, /JSON/i);
  assert.match(body.messages[1].content, /evidence-verifier/);
});

test("calls a DeepSeek-compatible endpoint, validates the role result, and emits a secret-free receipt", async () => {
  let capturedAuthorization = null;
  let capturedBody = null;
  const fetchImpl = async (_url, init) => {
    capturedAuthorization = init.headers.authorization;
    capturedBody = JSON.parse(init.body);
    return streamingResponse();
  };
  const adapter = createDeepSeekProviderAdapter({ apiKey: API_KEY, baseUrl: "https://provider.invalid", model: "deepseek-v4-pro", fetchImpl });
  const receipt = await adapter.runRole({
    role: "evidence-verifier",
    packageId: "pkg-safe",
    projection: projection(),
    maxOutputTokens: 16_000,
    userId: "mais-rsi-lite-f3"
  });

  assert.equal(receipt.roleResult.inspectionComplete, true);
  assert.equal(receipt.httpStatus, 200);
  assert.equal(receipt.model, "deepseek-v4-pro");
  assert.equal(receipt.systemFingerprint, "fp_local");
  assert.equal(receipt.finishReason, "stop");
  assert.equal(receipt.transport, "sse-stream");
  assert.equal(receipt.streamEventCount, 5);
  assert.deepEqual(receipt.usage, { promptCacheHitTokens: 20, promptCacheMissTokens: 103, completionTokens: 45, totalTokens: 168 });
  assert.match(receipt.providerResponseSha256, /^[a-f0-9]{64}$/);
  assert.equal(JSON.stringify(receipt).includes(API_KEY), false);
  assert.equal(JSON.stringify(receipt).includes("must-not-be-persisted"), false);

  assert.equal(capturedAuthorization, `Bearer ${API_KEY}`);
  assert.equal(capturedBody.model, "deepseek-v4-pro");
  assert.equal(capturedBody.messages.length, 2);
  assert.equal(capturedBody.stream, true);
  assert.deepEqual(capturedBody.stream_options, { include_usage: true });
});

test("sanitizes provider errors and never echoes the key or provider response body", async () => {
  const fetchImpl = async () => new Response(
    JSON.stringify({ error: { message: `sensitive upstream body ${API_KEY}` } }),
    { status: 429, headers: { "content-type": "application/json", "x-request-id": "req-rate-limited" } }
  );
  const adapter = createDeepSeekProviderAdapter({ apiKey: API_KEY, baseUrl: "https://provider.invalid", model: "deepseek-v4-pro", fetchImpl });
  await assert.rejects(
    adapter.runRole({ role: "evidence-verifier", packageId: "pkg-safe", projection: projection(), maxOutputTokens: 16_000 }),
    (error) => {
      assert.match(error.message, /HTTP 429/);
      assert.match(error.message, /req-rate-limited/);
      assert.equal(error.message.includes(API_KEY), false);
      assert.equal(error.message.includes("sensitive upstream body"), false);
      assert.equal(error.retryable, true);
      return true;
    }
  );
});

test("rejects malformed JSON and contract-invalid model output before it becomes a run receipt", async () => {
  for (const content of [
    "not-json",
    JSON.stringify({ ...validRoleResult(), inspectedSurfaceIds: ["q-1"] })
  ]) {
    const fetchImpl = async () => streamingResponse({ content });
    const adapter = createDeepSeekProviderAdapter({ apiKey: API_KEY, baseUrl: "https://provider.invalid", model: "deepseek-v4-pro", fetchImpl });
    await assert.rejects(
      adapter.runRole({ role: "evidence-verifier", packageId: "pkg-safe", projection: projection(), maxOutputTokens: 16_000 }),
      (error) => {
        assert.match(error.message, /invalid JSON|role-result contract/i);
        assert.equal(error.retryable, false);
        return true;
      }
    );
  }
});

test("rejects a truncated stream or a stream that omits final usage", async () => {
  for (const response of [
    streamingResponse({ includeDone: false }),
    streamingResponse({ includeUsage: false })
  ]) {
    const adapter = createDeepSeekProviderAdapter({
      apiKey: API_KEY,
      baseUrl: "https://provider.invalid",
      model: "deepseek-v4-pro",
      fetchImpl: async () => response
    });
    await assert.rejects(
      adapter.runRole({ role: "evidence-verifier", packageId: "pkg-safe", projection: projection(), maxOutputTokens: 16_000 }),
      (error) => {
        assert.match(error.message, /stream|usage/i);
        assert.equal(error.retryable, true);
        return true;
      }
    );
  }
});

test("classifies an SSE body read interruption as retryable without exposing the upstream error", async () => {
  const body = new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode("data: {\"choices\":[]}\n\n"));
      controller.error(new Error(`sensitive transport detail ${API_KEY}`));
    }
  });
  const adapter = createDeepSeekProviderAdapter({
    apiKey: API_KEY,
    baseUrl: "https://provider.invalid",
    model: "deepseek-v4-pro",
    fetchImpl: async () => new Response(body, { status: 200 })
  });
  await assert.rejects(
    adapter.runRole({ role: "evidence-verifier", packageId: "pkg-safe", projection: projection(), maxOutputTokens: 16_000 }),
    (error) => {
      assert.match(error.message, /body could not be read/i);
      assert.equal(error.retryable, true);
      assert.equal(error.message.includes(API_KEY), false);
      assert.equal(error.message.includes("sensitive transport detail"), false);
      return true;
    }
  );
});
