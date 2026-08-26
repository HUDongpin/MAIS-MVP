import assert from "node:assert/strict";
import test from "node:test";

import {
  parseExactArgumentsV5R10,
  runCliV5R10,
  V5_R10_CLI_COMMANDS,
} from "./runner-v5-r10-cli.mjs";
import {
  sha256V5R3,
} from "./execution-integrity-v5-r3.mjs";
import {
  validateClosedSelfHashedArtifactV5R10,
} from "./schema-contract-v5-r10.mjs";

const H = (value) => sha256V5R3(`r9-cli:${value}`);
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

test("R10 public CLI exposes the complete registered workflow and V9 command receipts", async () => {
  assert.deepEqual([...V5_R10_CLI_COMMANDS], EXPECTED_COMMANDS);
  assert.deepEqual(parseExactArgumentsV5R10([
    "execute-deepseek", "--context", "/protected/index.json", "--canary", "1",
  ]), { command: "execute-deepseek", contextPath: "/protected/index.json",
    provider: null, canary: "1", resume: false, recoveryPath: null });
  let adopted = 0;
  const result = await runCliV5R10(["register", "--context", "/protected/index.json"], {
    loadWorkflowContext: async () => context(),
    adoptR9WorkflowIndex: async () => { adopted += 1; return { ok: true,
      status: "V5_R10_WORKFLOW_INDEX_ADOPTED_NO_PROVIDER_ACTIVITY",
      providerEventCount: 0, httpRequestCount: 0, credentialReadCount: 0,
      naturalQuestionEgressCount: 0, referenceLabelCount: 0, naturalQuestionResultCount: 0,
      activityAccountingStatus: "EXACT" }; },
  });
  assert.equal(adopted, 1);
  assert.equal(result.exitCode, 0);
  assert.deepEqual(validateClosedSelfHashedArtifactV5R10(result.receipt,
    "NaturalCaRunnerCommandReceiptV9"), []);
});

test("R10 CLI rejects ambiguous provider flags before loading protected state", async () => {
  let loads = 0;
  const deps = { loadWorkflowContext: async () => { loads += 1; } };
  for (const argv of [
    ["label-reference", "--context", "/protected/index.json"],
    ["execute-deepseek", "--context", "/protected/index.json", "--canary", "2"],
    ["authorize-check", "--context", "/protected/index.json", "--provider", "openai", "--resume"],
    ["reconcile-interrupted-attempt", "--context", "/protected/index.json", "--provider", "openai"],
  ]) {
    const result = await runCliV5R10(argv, deps);
    assert.equal(result.exitCode, 2);
    assert.equal(result.receipt.providerCommandInvoked, false);
  }
  assert.equal(loads, 0);
});

test("R10 public default recovery command reaches its exact loader and zero-HTTP engine", async () => {
  const current = context();
  const recovery = { fixture: true };
  let loads = 0;
  let reconciliations = 0;
  const result = await runCliV5R10([
    "reconcile-interrupted-attempt", "--context", "/protected/index.json",
    "--provider", "openai", "--recovery", "/protected/recovery.json",
  ], {
    loadWorkflowContext: async () => current,
    loadRecoveryInput: async (recoveryPath, provider, actualContext) => {
      loads += 1;
      assert.equal(recoveryPath, "/protected/recovery.json");
      assert.equal(provider, "OPENAI_DIRECT");
      assert.equal(actualContext, current);
      return recovery;
    },
    reconcileInterruptedAttempt: async (actualContext, actualRecovery) => {
      reconciliations += 1;
      assert.equal(actualContext, current);
      assert.equal(actualRecovery, recovery);
      return { ok: true, status: "INTERRUPTED_ATTEMPT_RECONCILIATION_APPLIED_ZERO_HTTP",
        providerEventCount: 0, httpRequestCount: 0, credentialReadCount: 0,
        naturalQuestionEgressCount: 0, referenceLabelCount: 0, naturalQuestionResultCount: 0,
        activityAccountingStatus: "EXACT", reconciliationReceipt: { selfHash: H("recovery") } };
    },
  });
  assert.equal(loads, 1);
  assert.equal(reconciliations, 1);
  assert.equal(result.exitCode, 0);
  assert.equal(result.receipt.reconciliationReceiptHash, H("recovery"));
  assert.equal(result.receipt.providerCommandInvoked, false);
});

test("unexpected provider-engine failure remains activity-unknown rather than fabricated zero", async () => {
  const result = await runCliV5R10([
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
});
