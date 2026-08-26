import assert from "node:assert/strict";
import test from "node:test";

import { sealV5R3Artifact, validateSelfHashV5R3 } from "./execution-integrity-v5-r3.mjs";
import { buildDeepSeekEvaluationRequestV5R3, buildOpenAIReferenceRequestV5R3 } from "./provider-request-adapters-v5-r3.mjs";

const H = (character) => character.repeat(64);
const IDENTITY = Object.freeze({ attemptId: "attempt-1", itemHash: H("a"), itemIdPseudonym: "item-1", clusterId: "cluster-1", sampleManifestHash: H("b"), samplePayloadSetHash: H("c"), privacyScreenHash: H("d"), rightsScreenHash: H("e") });

test("OpenAI V5-R3 request preserves the exact US Responses tuple and zero DeepSeek input", () => {
  const request = buildOpenAIReferenceRequestV5R3({
    ...IDENTITY,
    role: "A_SOLVE",
    providerInput: { prompt: "2+2?", options: ["3", "4"], locale: "en-US", grade: "G1", topic: "addition", responseForm: "multiple-choice" },
  });
  assert.equal(validateSelfHashV5R3(request), true);
  assert.equal(request.endpoint, "https://us.api.openai.com/v1/responses");
  assert.equal(request.model, "gpt-5.6-luna");
  assert.equal(request.deepSeekInputCount, 0);
  assert.deepEqual(request.priorArtifactHashes, {});
});

test("DeepSeek revision request binds the exact validated critique hash and contains zero reference inputs", () => {
  const critique = sealV5R3Artifact({ role: "B_PRIME_CRITIQUE", itemPseudonym: "item-1", parsedPayload: { valid: true }, marker: "same-item-deepseek-only" });
  const request = buildDeepSeekEvaluationRequestV5R3({
    ...IDENTITY,
    role: "B_PRIME_REVISION",
    providerInput: {
      prompt: "2+2?", options: ["3", "4"], storedAnswer: "4", acceptedAnswers: ["4"], explanation: "2+2=4",
      rubric: "correct arithmetic", difficulty: "EASY", itemPseudonym: "item-1", bPrimeCritiqueArtifact: critique,
    },
  });
  assert.equal(validateSelfHashV5R3(request), true);
  assert.equal(request.referenceInputCount, 0);
  assert.equal(request.priorArtifactHashes.B_PRIME_CRITIQUE, critique.selfHash);
  const bytes = JSON.stringify(request);
  assert.doesNotMatch(bytes, /OpenAIReferenceRoleOutput|MachineReferenceLabel|referenceSealHash/u);
});

test("request builders reject an unsealed prior artifact before constructing outbound bytes", () => {
  assert.throws(() => buildDeepSeekEvaluationRequestV5R3({
    ...IDENTITY,
    role: "B_PRIME_REVISION",
    providerInput: {
      prompt: "x", options: [], storedAnswer: "x", acceptedAnswers: ["x"], explanation: "x", rubric: "x", difficulty: "EASY", itemPseudonym: "item-1",
      bPrimeCritiqueArtifact: { role: "B_PRIME_CRITIQUE", itemPseudonym: "item-1", parsedPayload: {} },
    },
  }), /self-hash/u);
});
