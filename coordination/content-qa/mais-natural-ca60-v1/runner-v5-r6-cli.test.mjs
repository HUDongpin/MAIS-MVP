import assert from "node:assert/strict";
import test from "node:test";

import {
  runCliV5R6,
  V5_R6_CLI_COMMANDS,
} from "./runner-v5-r6-cli.mjs";
import {
  createRunnerRuntimeV5R6,
} from "./runner-v5-r6-runtime.mjs";
import {
  H_V5_R6,
} from "./runner-v5-r6-test-fixtures.mjs";
import {
  validateClosedSelfHashedArtifactV5R6,
} from "./schema-contract-v5-r6.mjs";

const EXPECTED_COMMANDS = Object.freeze([
  "register",
  "freeze-frame",
  "audit-clusters",
  "freeze-sample",
  "register-route-evidence",
  "label-openai",
  "seal-reference-labels",
  "dry-run",
  "authorize-check",
  "freeze-deepseek-registration",
  "execute-deepseek",
  "score",
  "verify",
  "export-aggregate-report",
]);

function offlineOutcome(status) {
  return Object.freeze({
    ok: false,
    status,
    providerEventCount: 0,
    httpRequestCount: 0,
    credentialReadCount: 0,
    naturalQuestionEgressCount: 0,
    referenceLabelCount: 0,
    naturalQuestionResultCount: 0,
    errors: Object.freeze(["fixture deliberately remains offline"]),
  });
}

test("V5-R6 public CLI freezes the complete registered command vocabulary", () => {
  assert.deepEqual([...V5_R6_CLI_COMMANDS], EXPECTED_COMMANDS);
  const runtime = createRunnerRuntimeV5R6();
  for (const method of ["sealReferenceLabels", "freezeDeepSeekExecutionRegistration",
    "executeOpenAIResumeStep", "executeDeepSeekCanaryStep", "executeDeepSeekResumeStep", "score", "verify"]) {
    assert.equal(typeof runtime[method], "function", `${method} is not bound to the R6 runtime`);
  }
});

for (const [command, method, expectedStatus] of [
  ["seal-reference-labels", "sealReferenceLabels", "REFERENCE_LABEL_SEAL_BLOCKED_OFFLINE_FIXTURE"],
  ["freeze-deepseek-registration", "freezeDeepSeekExecutionRegistration",
    "DEEPSEEK_EXECUTION_REGISTRATION_BLOCKED_OFFLINE_FIXTURE"],
]) {
  test(`${command} reaches its versioned engine and emits a zero-activity command receipt`, async () => {
    let called = 0;
    const context = { activeRegistration: { selfHash: H_V5_R6("fixture-cli-active-registration") } };
    const result = await runCliV5R6([command, "--context", "/fixture/protected-index.json"], {
      loadWorkflowContext: async () => context,
      [method]: async () => {
        called += 1;
        return offlineOutcome(expectedStatus);
      },
    });
    assert.equal(called, 1);
    assert.equal(result.exitCode, 3);
    assert.equal(result.receipt.status, expectedStatus);
    assert.equal(result.receipt.providerCommandInvoked, false);
    assert.equal(result.receipt.providerEventCount, 0);
    assert.equal(result.receipt.httpRequestCount, 0);
    assert.equal(result.receipt.credentialReadCount, 0);
    assert.equal(result.receipt.naturalQuestionEgressCount, 0);
    assert.equal(result.receipt.passClaimAllowed, false);
    assert.equal(result.receipt.limitedGeneralizationEvidenceAllowed, false);
    assert.deepEqual(validateClosedSelfHashedArtifactV5R6(result.receipt,
      "NaturalCaRunnerCommandReceiptV5"), []);
  });
}

test("provider CLI commands reject ambiguous flags before loading any workflow state", async () => {
  let loads = 0;
  const deps = { loadWorkflowContext: async () => { loads += 1; } };
  for (const argv of [
    ["label-openai", "--context", "/fixture/index.json"],
    ["execute-deepseek", "--context", "/fixture/index.json", "--canary", "2"],
    ["authorize-check", "--context", "/fixture/index.json", "--provider", "openai", "--resume"],
  ]) {
    const result = await runCliV5R6(argv, deps);
    assert.equal(result.exitCode, 2);
    assert.equal(result.receipt.providerCommandInvoked, false);
  }
  assert.equal(loads, 0);
});
