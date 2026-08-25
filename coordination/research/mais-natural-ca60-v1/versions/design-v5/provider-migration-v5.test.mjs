import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const packageDirectory = path.dirname(fileURLToPath(import.meta.url));

test("V5 freezes the owner-selected OpenAI GPT-5.6 Luna US reference route without authorizing execution", async () => {
  const registration = JSON.parse(await readFile(path.join(packageDirectory, "design-registration.json"), "utf8"));

  assert.equal(registration.schemaVersion, "NaturalCaPilotDesignRegistrationV5");
  assert.equal(registration.designId, "MAIS-NATURAL-CA60-V5");
  assert.equal(registration.version, 5);
  assert.equal(registration.providerEventCount, 0);
  assert.equal(registration.firstProviderExecutionAllowed, false);
  assert.equal(registration.providerControls.firstProviderExecutionAllowed, false);
  assert.equal(Object.hasOwn(registration.providerControls, "qwenEnvelope"), false);

  const envelope = registration.providerControls.openaiReferenceEnvelope;
  assert.equal(envelope.provider, "OPENAI_DIRECT");
  assert.equal(envelope.projectResidency, "US_STORAGE_PROCESSING");
  assert.equal(envelope.region, "US");
  assert.equal(envelope.method, "POST");
  assert.equal(envelope.endpoint, "https://us.api.openai.com/v1/responses");
  assert.equal(envelope.requestedOrigin, "https://us.api.openai.com/v1/responses");
  assert.equal(envelope.observedOriginRequired, "https://us.api.openai.com/v1/responses");
  assert.equal(envelope.requestedModel, "gpt-5.6-luna");
  assert.equal(envelope.observedModelRequired, "gpt-5.6-luna");
  assert.equal(envelope.apiSurface, "RESPONSES_API_V1");
  assert.equal(envelope.fullAuthorizationAllowed, false);

  assert.deepEqual(envelope.requestTemplate, {
    envelopeStage: "LOGICAL_REQUEST_PRE_ADAPTER_V5",
    model: "gpt-5.6-luna",
    stream: false,
    store: false,
    background: false,
    reasoning: { effort: "high", context: "current_turn" },
    text: {
      verbosity: "medium",
      format: {
        type: "json_schema",
        name: "ROLE_BOUND_AT_DISPATCH",
        strict: true,
        schema: "ROLE_OUTPUT_SCHEMA_BOUND_AT_DISPATCH",
      },
    },
    max_output_tokens: 8192,
    tools: [],
    previous_response_id: null,
    conversation: null,
    requestedSeed: null,
  });

  assert.deepEqual(envelope.wireRequestTemplate, {
    model: "gpt-5.6-luna",
    stream: false,
    store: false,
    background: false,
    reasoning: { effort: "high", context: "current_turn" },
    text: {
      verbosity: "medium",
      format: {
        type: "json_schema",
        name: "ROLE_BOUND_AT_DISPATCH",
        strict: true,
        schema: "ROLE_OUTPUT_SCHEMA_BOUND_AT_DISPATCH",
      },
    },
    max_output_tokens: 8192,
    tools: [],
  });

  assert.equal(Object.hasOwn(envelope.wireRequestTemplate, "seed"), false);
  assert.equal(Object.hasOwn(envelope.wireRequestTemplate, "temperature"), false);
  assert.equal(Object.hasOwn(envelope.wireRequestTemplate, "max_tokens"), false);

  assert.deepEqual(registration.proposedSupersedesCandidate, {
    designId: "MAIS-NATURAL-CA60-V4",
    version: 4,
    disposition: "SUPERSEDED_NOT_EXECUTED",
    providerEventCount: 0,
    reasonCode: "OWNER_REPLACED_QWEN_WITH_OPENAI_GPT_5_6_LUNA_BEFORE_ANY_PROVIDER_CALL",
  });
});
