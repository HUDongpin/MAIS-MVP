import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import DESIGN_REGISTRATION from "../../research/mais-natural-ca60-v1/versions/design-v5/design-registration.json" with { type: "json" };
import {
  jcsHash,
} from "../../research/mais-natural-ca60-v1/versions/design-v5/design-contract.mjs";

async function subject() {
  return import("./openai-reference-adapter-v5.mjs");
}

function solveInput() {
  return {
    prompt: "What is 2 + 3?",
    options: ["4", "5", "6"],
    locale: "en-US",
    grade: "2",
    topic: "addition",
    responseForm: "multiple-choice",
  };
}

function responseEnvelope({
  model = "gpt-5.6-luna",
  outputText = JSON.stringify({
    solution: "2 + 3 = 5.",
    solvability: "SOLVABLE",
    uncertain: false,
  }),
  reasoningContext = "current_turn",
  duplicateOutputText = false,
} = {}) {
  const content = [{ type: "output_text", text: outputText, annotations: [] }];
  if (duplicateOutputText) content.push({ type: "output_text", text: outputText, annotations: [] });
  const response = {
    id: "resp_fixture_001",
    object: "response",
    status: "completed",
    model,
    reasoning: { effort: "high", context: reasoningContext },
    output: [
      { id: "rs_fixture", type: "reasoning", summary: [] },
      {
        id: "msg_fixture",
        type: "message",
        status: "completed",
        role: "assistant",
        content,
      },
    ],
    usage: {
      input_tokens: 120,
      output_tokens: 40,
      output_tokens_details: { reasoning_tokens: 10 },
      total_tokens: 160,
    },
  };
  return response;
}

test("logical and wire requests bind the exact GPT-5.6 Luna US Responses tuple and role schema", async () => {
  const api = await subject();
  const logical = api.buildOpenAIReferenceLogicalRequestV5({
    role: "A_SOLVE",
    providerInput: solveInput(),
  });
  const repeated = api.buildOpenAIReferenceLogicalRequestV5({
    role: "A_SOLVE",
    providerInput: solveInput(),
  });
  assert.deepEqual(repeated, logical);
  assert.equal(logical.schemaVersion, "ProviderLogicalRequestV2");
  assert.equal(logical.provider, "OPENAI_DIRECT");
  assert.equal(logical.endpoint, "https://us.api.openai.com/v1/responses");
  assert.equal(logical.projectResidency, "US_STORAGE_PROCESSING");
  assert.equal(logical.model, "gpt-5.6-luna");
  assert.equal(logical.requestedSeed, null);
  assert.equal(logical.previousResponseId, null);
  assert.equal(logical.conversation, null);
  assert.equal(logical.responseSchemaHash,
    DESIGN_REGISTRATION.providerControls.openaiReferenceRoleContractCatalog.roles.A_SOLVE.schemaHash);
  assert.equal(api.validateProviderLogicalRequestV2(logical).length, 0);

  const wire = api.buildOpenAIReferenceWireRequestV5(logical);
  assert.equal(wire.model, "gpt-5.6-luna");
  assert.equal(wire.store, false);
  assert.equal(wire.background, false);
  assert.equal(wire.stream, false);
  assert.deepEqual(wire.reasoning, { effort: "high", context: "current_turn" });
  assert.equal(wire.text.format.type, "json_schema");
  assert.equal(wire.text.format.strict, true);
  assert.deepEqual(wire.text.format.schema, logical.responseSchema);
  assert.equal(wire.instructions, logical.systemPrompt);
  assert.equal(Object.hasOwn(wire, "previous_response_id"), false);
  assert.equal(Object.hasOwn(wire, "conversation"), false);
  assert.equal(Object.hasOwn(wire, "requestedSeed"), false);
  assert.equal(Object.hasOwn(wire, "temperature"), false);
  assert.equal(Object.hasOwn(wire, "max_tokens"), false);
  assert.equal(api.validateOpenAIReferenceWireRequestV5(wire, logical).length, 0);
});

test("role input is exact and solve roles cannot receive stored answers or cross-panel artifacts", async () => {
  const api = await subject();
  assert.throws(() => api.buildOpenAIReferenceLogicalRequestV5({
    role: "A_SOLVE",
    providerInput: { ...solveInput(), storedAnswer: "5" },
  }), /input fields|allowlist/iu);
  assert.throws(() => api.buildOpenAIReferenceLogicalRequestV5({
    role: "B_SOLVE",
    providerInput: { ...solveInput(), aSolveArtifact: { answer: "5" } },
  }), /input fields|allowlist/iu);
  assert.throws(() => api.buildOpenAIReferenceLogicalRequestV5({
    role: "NOT_A_ROLE",
    providerInput: solveInput(),
  }), /role/iu);
});

test("the A21 adapter has no live network, SDK, key, or environment-variable primitive", async () => {
  const source = await readFile(new URL("./openai-reference-adapter-v5.mjs", import.meta.url), "utf8");
  assert.doesNotMatch(source, /\bfetch\s*\(/u);
  assert.doesNotMatch(source, /process\.env/u);
  assert.doesNotMatch(source, /OPENAI_API_KEY/u);
  assert.doesNotMatch(source, /from\s+["']openai["']/u);
  assert.doesNotMatch(source, /https\.request|http\.request|node:net|node:tls/u);
});

test("fixture response parsing accepts reasoning items, validates the structured leaf, and preserves byte hashes", async () => {
  const api = await subject();
  const logical = api.buildOpenAIReferenceLogicalRequestV5({ role: "A_SOLVE", providerInput: solveInput() });
  const wire = api.buildOpenAIReferenceWireRequestV5(logical);
  const response = responseEnvelope();
  const rawResponseBody = `${JSON.stringify(response)}\n`;
  const parsed = api.parseOpenAIReferenceFixtureResponseV5({
    role: "A_SOLVE",
    logicalRequest: logical,
    wireRequest: wire,
    rawResponseBody,
    responseEnvelope: response,
    responseHeaders: {
      "x-request-id": "req_fixture_001",
      "openai-processing-ms": "12",
    },
  });
  assert.equal(parsed.fixtureOnly, true);
  assert.equal(parsed.providerEventCount, 0);
  assert.equal(parsed.responseId, "resp_fixture_001");
  assert.equal(parsed.observedModel, "gpt-5.6-luna");
  assert.equal(parsed.observedReasoningContext, "current_turn");
  assert.equal(parsed.parseStatus, "PARSED");
  assert.equal(parsed.schemaStatus, "VALID");
  assert.deepEqual(parsed.usage, {
    inputTokens: 120,
    outputTokens: 40,
    reasoningTokens: 10,
    totalTokens: 160,
  });
  assert.equal(parsed.structuredPayloadHash, jcsHash(parsed.structuredPayload));
  assert.equal(parsed.wireEvidence.rawResponseBodyHash, api.sha256Bytes(rawResponseBody));
  assert.equal(parsed.wireEvidence.requestBodyHash, jcsHash(wire));
  assert.equal(api.validateProviderWireEvidenceV2(parsed.wireEvidence, { logicalRequest: logical, wireRequest: wire }).length, 0);
});

test("live response parsing preserves the same frozen schema while recording one provider event", async () => {
  const api = await subject();
  assert.equal(typeof api.parseOpenAIReferenceLiveResponseV5R2, "function");
  const logical = api.buildOpenAIReferenceLogicalRequestV5({ role: "A_SOLVE", providerInput: solveInput() });
  const wire = api.buildOpenAIReferenceWireRequestV5(logical);
  const response = responseEnvelope();
  const parsed = api.parseOpenAIReferenceLiveResponseV5R2({
    role: "A_SOLVE",
    logicalRequest: logical,
    wireRequest: wire,
    rawResponseBody: JSON.stringify(response),
    responseEnvelope: response,
    responseHeaders: { "x-request-id": "req_live_parser_fixture_001" },
  });
  assert.equal(parsed.fixtureOnly, false);
  assert.equal(parsed.providerEventCount, 1);
  assert.equal(parsed.observedModel, "gpt-5.6-luna");
  assert.equal(parsed.parseStatus, "PARSED");
  assert.equal(parsed.schemaStatus, "VALID");
});

test("response parsing fails closed on model drift, duplicate output leaves, schema failure, and inconsistent usage", async () => {
  const api = await subject();
  const logical = api.buildOpenAIReferenceLogicalRequestV5({ role: "A_SOLVE", providerInput: solveInput() });
  const wire = api.buildOpenAIReferenceWireRequestV5(logical);
  for (const [response, pattern] of [
    [responseEnvelope({ model: "gpt-5.6-luna-preview" }), /model/iu],
    [responseEnvelope({ duplicateOutputText: true }), /exactly one|output_text/iu],
    [responseEnvelope({ outputText: JSON.stringify({ solution: "5" }) }), /schema|required/iu],
    [{ ...responseEnvelope(), usage: { input_tokens: 120, output_tokens: 40, total_tokens: 999 } }, /usage|total/iu],
    [responseEnvelope({ reasoningContext: "all_turns" }), /reasoning context/iu],
  ]) {
    assert.throws(() => api.parseOpenAIReferenceFixtureResponseV5({
      role: "A_SOLVE",
      logicalRequest: logical,
      wireRequest: wire,
      rawResponseBody: JSON.stringify(response),
      responseEnvelope: response,
      responseHeaders: {},
    }), pattern);
  }
});

test("an unreturned reasoning context remains explicitly unobserved rather than inferred", async () => {
  const api = await subject();
  const logical = api.buildOpenAIReferenceLogicalRequestV5({ role: "A_SOLVE", providerInput: solveInput() });
  const wire = api.buildOpenAIReferenceWireRequestV5(logical);
  const response = responseEnvelope();
  delete response.reasoning.context;
  const parsed = api.parseOpenAIReferenceFixtureResponseV5({
    role: "A_SOLVE",
    logicalRequest: logical,
    wireRequest: wire,
    rawResponseBody: JSON.stringify(response),
    responseEnvelope: response,
    responseHeaders: {},
  });
  assert.equal(parsed.observedReasoningContext, null);
  assert.equal(parsed.attemptReasoningContextObserved, "UNOBSERVED");
});

test("role-output artifacts bind a successful attempt receipt without creating a hash cycle", async () => {
  const api = await subject();
  const logical = api.buildOpenAIReferenceLogicalRequestV5({ role: "A_SOLVE", providerInput: solveInput() });
  const structuredPayload = {
    solution: "2 + 3 = 5.",
    solvability: "SOLVABLE",
    uncertain: false,
  };
  const attemptPayload = api.buildProviderAttemptPayloadV2({
    runId: "run-fixture-001",
    registrationHash: DESIGN_REGISTRATION.registrationHash,
    frameRegistrationHash: "1".repeat(64),
    sampleManifestHash: "2".repeat(64),
    authorizationHash: "3".repeat(64),
    referenceSealHash: null,
    executionRegistrationHash: null,
    itemIdPseudonym: "item-pseudo-001",
    itemHash: "4".repeat(64),
    clusterId: "cluster-001",
    role: "A_SOLVE",
    attemptId: "attempt-fixture-001",
    requestedProvider: "OPENAI_DIRECT",
    observedProvider: "OPENAI_DIRECT",
    requestedModel: "gpt-5.6-luna",
    observedModel: "gpt-5.6-luna",
    requestedEndpoint: "https://us.api.openai.com/v1/responses",
    observedEndpoint: "https://us.api.openai.com/v1/responses",
    projectResidency: "US_STORAGE_PROCESSING",
    responseId: "resp_fixture_001",
    providerRequestId: "req_fixture_001",
    requestBodyHash: "5".repeat(64),
    responseBodyHash: "6".repeat(64),
    logicalRequestHash: logical.logicalRequestHash,
    parsedOutputHash: jcsHash(structuredPayload),
    wireRequestBodyHash: "5".repeat(64),
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
    costRateSnapshotHash: "7".repeat(64),
    estimatedCost: 0.01,
    cumulativeCost: 0.01,
    retryClassification: "NOT_A_RETRY",
    redactedError: null,
  });
  const attemptBody = { ...attemptPayload, sequenceNumber: 1, previousReceiptHash: null };
  const attemptReceipt = { ...attemptBody, selfHash: jcsHash(attemptBody) };
  assert.deepEqual(api.validateProviderAttemptReceiptV2(attemptReceipt), []);
  const output = api.buildOpenAIReferenceRoleOutputV1({
    attemptReceipt,
    logicalRequest: logical,
    structuredPayload,
  });
  assert.equal(output.attemptReceiptHash, attemptReceipt.selfHash);
  assert.equal(output.structuredPayloadHash, attemptReceipt.parsedOutputHash);
  assert.equal(api.validateOpenAIReferenceRoleOutputV1(output).length, 0);
  assert.match(api.validateOpenAIReferenceRoleOutputV1({ ...output, observedModel: "wrong" }).join("\n"), /model|hash/iu);
});
