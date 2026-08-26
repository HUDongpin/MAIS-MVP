import assert from "node:assert/strict";
import test from "node:test";

import { sealV5R3Artifact } from "./execution-integrity-v5-r3.mjs";
import { runDeepSeekEvaluationAttemptV5R3 } from "./deepseek-live-evaluation-runner-v5-r3.mjs";
import { runOpenAIReferenceAttemptV5R3 } from "./openai-live-reference-runner-v5-r3.mjs";

const H = (character) => character.repeat(64);

function request(role, provider) {
  return sealV5R3Artifact({
    schemaVersion: provider === "OPENAI_DIRECT" ? "OpenAIReferenceRequestV5R3" : "DeepSeekEvaluationRequestV5R3",
    provider,
    role,
    itemHash: H("a"),
    itemIdPseudonym: "item-1",
  });
}

function prior(role, provider = "OPENAI_DIRECT") {
  const attemptReceipt = sealV5R3Artifact({
    schemaVersion: "ProviderEventReceiptV3", attemptId: `${role}-1`, role, itemHash: H("a"), itemIdPseudonym: "item-1", attemptStatus: "SUCCEEDED",
  });
  const artifact = sealV5R3Artifact({
    schemaVersion: provider === "OPENAI_DIRECT" ? "OpenAIReferenceRoleOutputV5R3" : "DeepSeekEvaluationRoleOutputV5R3",
    attemptId: attemptReceipt.attemptId, attemptReceiptHash: attemptReceipt.selfHash, role, itemHash: H("a"), itemIdPseudonym: "item-1",
  });
  return { artifact, attemptReceipt };
}

test("OpenAI label/adjudicator wrappers require the exact same-item successful role lineage", async () => {
  let reserves = 0;
  const common = { ledger: { reserve: async () => { reserves += 1; } } };
  const missing = await runOpenAIReferenceAttemptV5R3({ ...common, request: request("A_LABEL", "OPENAI_DIRECT"), priorArtifacts: {} });
  assert.equal(missing.status, "PRIOR_LINEAGE_BLOCKED");
  assert.equal(reserves, 0);
  assert.match(missing.errors.join("\n"), /A_SOLVE/u);
  const incompleteAdjudicator = await runOpenAIReferenceAttemptV5R3({
    ...common,
    request: request("ADJUDICATOR", "OPENAI_DIRECT"),
    priorArtifacts: { A_SOLVE: prior("A_SOLVE"), A_LABEL: prior("A_LABEL") },
  });
  assert.equal(incompleteAdjudicator.status, "PRIOR_LINEAGE_BLOCKED");
  assert.match(incompleteAdjudicator.errors.join("\n"), /B_SOLVE|B_LABEL/u);
});

test("DeepSeek revision wrapper rejects missing, tampered, or cross-item critique lineage", async () => {
  let reserves = 0;
  const common = { ledger: { reserve: async () => { reserves += 1; } }, request: request("B_PRIME_REVISION", "DEEPSEEK_DIRECT") };
  assert.equal((await runDeepSeekEvaluationAttemptV5R3({ ...common, priorArtifacts: {} })).status, "PRIOR_LINEAGE_BLOCKED");
  const valid = prior("B_PRIME_CRITIQUE", "DEEPSEEK_DIRECT");
  const tampered = { ...valid, artifact: { ...valid.artifact, itemHash: H("b") } };
  const result = await runDeepSeekEvaluationAttemptV5R3({ ...common, priorArtifacts: { B_PRIME_CRITIQUE: tampered } });
  assert.equal(result.status, "PRIOR_LINEAGE_BLOCKED");
  assert.equal(reserves, 0);
  assert.match(result.errors.join("\n"), /self-hash|item/u);
});

test("solve, critique, and C0 roles reject extra prior artifacts", async () => {
  const extra = { A_SOLVE: prior("A_SOLVE") };
  assert.equal((await runOpenAIReferenceAttemptV5R3({ request: request("A_SOLVE", "OPENAI_DIRECT"), priorArtifacts: extra })).status, "PRIOR_LINEAGE_BLOCKED");
  assert.equal((await runDeepSeekEvaluationAttemptV5R3({ request: request("C0_PRIME_ROLE_1", "DEEPSEEK_DIRECT"), priorArtifacts: { B_PRIME_CRITIQUE: prior("B_PRIME_CRITIQUE", "DEEPSEEK_DIRECT") } })).status, "PRIOR_LINEAGE_BLOCKED");
});
