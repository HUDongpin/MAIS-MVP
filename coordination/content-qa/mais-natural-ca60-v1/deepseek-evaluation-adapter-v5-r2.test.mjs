import assert from "node:assert/strict";
import test from "node:test";

import DESIGN_REGISTRATION from "../../research/mais-natural-ca60-v1/versions/design-v5/design-registration.json" with { type: "json" };

async function subject() {
  return import("./deepseek-evaluation-adapter-v5-r2.mjs").catch(() => ({}));
}

function itemInput() {
  return {
    prompt: "What is 2 + 3?",
    options: ["4", "5", "6"],
    storedAnswer: "5",
    acceptedAnswers: ["5"],
    explanation: "Add two and three.",
    rubric: "Exact numeric answer.",
    difficulty: "Low",
    itemPseudonym: "ca60-00000000000000000000000000000001",
  };
}

test("DeepSeek B-prime logical and wire requests bind the exact direct tuple and remain reference-label blind", async () => {
  const api = await subject();
  assert.equal(typeof api.buildDeepSeekEvaluationRequestV5R2, "function");
  const request = api.buildDeepSeekEvaluationRequestV5R2({
    role: "B_PRIME_CRITIQUE",
    providerInput: itemInput(),
  });
  assert.equal(request.logicalRequest.provider, "DEEPSEEK_DIRECT");
  assert.equal(request.logicalRequest.endpoint, "https://api.deepseek.com/chat/completions");
  assert.equal(request.logicalRequest.model, "deepseek-v4-pro");
  assert.equal(request.logicalRequest.role, "B_PRIME_CRITIQUE");
  assert.equal(request.logicalRequest.responseSchemaHash,
    DESIGN_REGISTRATION.providerControls.deepSeekRoleContractCatalog.roles.B_PRIME_CRITIQUE.schemaHash);
  assert.equal(request.wireRequestBody.model, "deepseek-v4-pro");
  assert.equal(request.wireRequestBody.stream, false);
  assert.equal(request.wireRequestBody.temperature, 0);
  assert.deepEqual(request.wireRequestBody.thinking, { type: "enabled" });
  assert.equal(request.wireRequestBody.reasoning_effort, "high");
  assert.deepEqual(request.wireRequestBody.response_format, { type: "json_object" });
  assert.equal(request.wireRequestBody.max_tokens, 8192);
  const serialized = JSON.stringify(request);
  assert.doesNotMatch(serialized, /referenceLabel|referenceSeal|OpenAIReference|Qwen/iu);
  assert.throws(() => api.buildDeepSeekEvaluationRequestV5R2({
    role: "B_PRIME_CRITIQUE",
    providerInput: { ...itemInput(), referenceLabel: "NO_FINDING" },
  }), /field|allowlist|reference/iu);
});

function successfulPayload() {
  return {
    valid: true,
    surfaceDisposition: "NO_FINDING",
    findings: [],
    requiredRevisionCodes: [],
  };
}

function responseEnvelope(payload = successfulPayload(), overrides = {}) {
  return {
    id: "ds-response-fixture-001",
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

test("DeepSeek response parsing binds exact raw bytes, model, usage, schema, and request", async () => {
  const api = await subject();
  assert.equal(typeof api.parseDeepSeekEvaluationResponseV5R2, "function");
  const request = api.buildDeepSeekEvaluationRequestV5R2({
    role: "B_PRIME_CRITIQUE",
    providerInput: itemInput(),
  });
  const rawResponseBody = JSON.stringify(responseEnvelope());
  const parsed = api.parseDeepSeekEvaluationResponseV5R2({ request, rawResponseBody });
  assert.equal(parsed.provider, "DEEPSEEK_DIRECT");
  assert.equal(parsed.observedModel, "deepseek-v4-pro");
  assert.equal(parsed.responseId, "ds-response-fixture-001");
  assert.equal(parsed.finishReason, "stop");
  assert.deepEqual(parsed.usage, {
    inputTokens: 20,
    outputTokens: 8,
    reasoningTokens: 3,
    totalTokens: 28,
  });
  assert.deepEqual(parsed.structuredPayload, successfulPayload());
  assert.equal(parsed.wireEvidence.rawWireResponseBytes, rawResponseBody);
  assert.equal(parsed.wireEvidence.logicalRequestHash, request.logicalRequestHash);
  assert.equal(parsed.wireEvidence.wireRequestBodyHash, request.wireRequestBodyHash);
  assert.match(parsed.responseBodyHash, /^[0-9a-f]{64}$/u);
  assert.match(parsed.structuredPayloadHash, /^[0-9a-f]{64}$/u);
  assert.match(parsed.parseHash, /^[0-9a-f]{64}$/u);
});

test("DeepSeek response parsing fails closed on model drift, malformed payload, and schema drift", async () => {
  const api = await subject();
  const request = api.buildDeepSeekEvaluationRequestV5R2({
    role: "B_PRIME_CRITIQUE",
    providerInput: itemInput(),
  });
  assert.throws(() => api.parseDeepSeekEvaluationResponseV5R2({
    request,
    rawResponseBody: JSON.stringify(responseEnvelope(successfulPayload(), { model: "deepseek-other" })),
  }), /model|bound/iu);
  assert.throws(() => api.parseDeepSeekEvaluationResponseV5R2({
    request,
    rawResponseBody: JSON.stringify(responseEnvelope(undefined, {
      choices: [{ index: 0, message: { role: "assistant", content: "not-json" }, finish_reason: "stop" }],
    })),
  }), /valid JSON/iu);
  assert.throws(() => api.parseDeepSeekEvaluationResponseV5R2({
    request,
    rawResponseBody: JSON.stringify(responseEnvelope({
      valid: true,
      surfaceDisposition: "NO_FINDING",
      findings: [],
      requiredRevisionCodes: [],
      inventedField: true,
    })),
  }), /schema|nonconforming/iu);
});
