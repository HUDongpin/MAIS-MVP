import assert from "node:assert/strict";
import test from "node:test";

import {
  parseExactArgumentsV5R8,
  runCliV5R8,
  V5_R8_CLI_COMMANDS,
} from "./runner-v5-r8-cli.mjs";
import {
  sha256V5R3,
} from "./execution-integrity-v5-r3.mjs";
import {
  validateClosedSelfHashedArtifactV5R8,
} from "./schema-contract-v5-r8.mjs";

const H = (value) => sha256V5R3(`r8-cli:${value}`);
const EXPECTED_COMMANDS = Object.freeze([
  "register", "freeze-frame", "audit-clusters", "freeze-sample", "register-route-evidence",
  "label-reference", "label-qwen", "seal-reference-labels", "dry-run", "authorize-check",
  "freeze-deepseek-registration", "execute-deepseek", "score", "verify",
  "export-aggregate-report", "audit-attempt-custody", "reconcile-interrupted-attempt",
]);

function context() {
  return { activeRegistration: { selfHash: H("registration"),
    routeAuthenticityState: "ROUTE_AUTHENTICITY_BLOCKED_NO_PINNED_TRUST_ANCHOR" } };
}

test("R8 public CLI exposes the complete offline, custody, scoring, and provider vocabulary", () => {
  assert.deepEqual([...V5_R8_CLI_COMMANDS], EXPECTED_COMMANDS);
  assert.deepEqual(parseExactArgumentsV5R8([
    "execute-deepseek", "--context", "/protected/index.json", "--canary", "1",
  ]), { command: "execute-deepseek", contextPath: "/protected/index.json",
    provider: null, canary: "1", resume: false, recoveryPath: null });
});

test("CLI rejects ambiguous provider flags before loading protected workflow state", async () => {
  let loads = 0;
  const deps = { loadWorkflowContext: async () => { loads += 1; } };
  for (const argv of [
    ["label-reference", "--context", "/protected/index.json"],
    ["execute-deepseek", "--context", "/protected/index.json", "--canary", "2"],
    ["authorize-check", "--context", "/protected/index.json", "--provider", "openai", "--resume"],
    ["reconcile-interrupted-attempt", "--context", "/protected/index.json", "--provider", "openai"],
  ]) {
    const result = await runCliV5R8(argv, deps);
    assert.equal(result.exitCode, 2);
    assert.equal(result.receipt.providerCommandInvoked, false);
  }
  assert.equal(loads, 0);
});

test("unexpected provider-engine failure is activity-unknown and cannot fabricate exact zero", async () => {
  const result = await runCliV5R8([
    "label-reference", "--context", "/protected/index.json", "--resume",
  ], {
    loadWorkflowContext: async () => context(),
    executeOpenAIResumeStep: async () => { throw new Error("fixture after-dispatch uncertainty"); },
  });
  assert.equal(result.exitCode, 3);
  assert.equal(result.receipt.activityAccountingStatus, "UNKNOWN_FAIL_CLOSED");
  assert.equal(result.receipt.providerCommandInvoked, true);
  assert.equal(result.receipt.providerEventCount, null);
  assert.equal(result.receipt.httpRequestCount, null);
  assert.equal(result.receipt.credentialReadCount, null);
  assert.equal(result.receipt.naturalQuestionEgressCount, null);
  assert.deepEqual(validateClosedSelfHashedArtifactV5R8(result.receipt,
    "NaturalCaRunnerCommandReceiptV7"), []);
});

test("zero-HTTP reconciliation is reachable only with exact provider and recovery inputs", async () => {
  let calls = 0;
  const current = context();
  const recovery = { fixture: true };
  const result = await runCliV5R8([
    "reconcile-interrupted-attempt", "--context", "/protected/index.json",
    "--provider", "openai", "--recovery", "recovery.json",
  ], {
    loadWorkflowContext: async () => current,
    loadRecoveryInput: async (recoveryPath, provider, actualContext) => {
      assert.equal(recoveryPath, "recovery.json");
      assert.equal(provider, "OPENAI_DIRECT");
      assert.equal(actualContext, current);
      return recovery;
    },
    reconcileInterruptedAttempt: async (actualContext, actualRecovery) => {
      calls += 1;
      assert.equal(actualContext, current);
      assert.equal(actualRecovery, recovery);
      return { ok: true, status: "INTERRUPTED_ATTEMPT_RECONCILIATION_APPLIED_ZERO_HTTP",
        providerEventCount: 0, httpRequestCount: 0, credentialReadCount: 0,
        naturalQuestionEgressCount: 0, referenceLabelCount: 0, naturalQuestionResultCount: 0,
        activityAccountingStatus: "EXACT", reconciliationReceipt: { selfHash: H("recovery") } };
    },
  });
  assert.equal(calls, 1);
  assert.equal(result.exitCode, 0);
  assert.equal(result.receipt.reconciliationReceiptHash, H("recovery"));
  assert.equal(result.receipt.providerCommandInvoked, false);
});
