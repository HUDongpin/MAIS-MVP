import assert from "node:assert/strict";
import test from "node:test";

async function subject() {
  return import("./cli.mjs");
}

const EXPECTED_COMMANDS = [
  "register",
  "freeze-frame",
  "audit-clusters",
  "freeze-sample",
  "label-qwen",
  "seal-reference-labels",
  "dry-run",
  "authorize-check",
  "execute-deepseek",
  "score",
  "verify",
  "export-aggregate-report",
];

test("help exposes the complete frozen public CLI command set", async () => {
  const api = await subject();
  const result = await api.runCliV1({ argv: ["--help"] });
  assert.equal(result.exitCode, 0);
  assert.deepEqual(result.receipt.commands, EXPECTED_COMMANDS);
  assert.equal(result.receipt.providerRequestCount, 0);
  assert.equal(result.receipt.protectedArtifactMutationCount, 0);
});

test("offline dry-run succeeds but says explicitly that no natural item was executed", async () => {
  const api = await subject();
  const result = await api.runCliV1({ argv: ["dry-run"] });
  assert.equal(result.exitCode, 0);
  assert.equal(result.receipt.ok, true);
  assert.equal(result.receipt.status, "OFFLINE_DRY_RUN_READY");
  assert.equal(result.receipt.executionMode, "OFFLINE_NO_PROVIDER");
  assert.equal(result.receipt.providerRequestCount, 0);
  assert.equal(result.receipt.naturalItemResultCount, 0);
  assert.equal(result.receipt.formalDecision, null);
  assert.match(result.receipt.receiptHash, /^[0-9a-f]{64}$/u);
});

test("registration and every upstream freeze command fail closed while V4 remains a candidate", async () => {
  const api = await subject();
  for (const [command, status] of [
    ["register", "DESIGN_FREEZE_BLOCKED"],
    ["freeze-frame", "UPSTREAM_DESIGN_NOT_FROZEN"],
    ["audit-clusters", "FRAME_NOT_FROZEN"],
    ["freeze-sample", "FRAME_NOT_FROZEN"],
    ["label-qwen", "QWEN_AUTHORIZATION_NOT_FROZEN"],
    ["seal-reference-labels", "REFERENCE_LABELS_NOT_COMPLETE"],
  ]) {
    const result = await api.runCliV1({ argv: [command] });
    assert.equal(result.exitCode, 2, command);
    assert.equal(result.receipt.ok, false, command);
    assert.equal(result.receipt.status, status, command);
    assert.equal(result.receipt.providerRequestCount, 0, command);
    assert.equal(result.receipt.naturalItemResultCount, 0, command);
  }
});

test("authorization check and both DeepSeek execution modes make zero provider requests", async () => {
  const api = await subject();
  for (const argv of [
    ["authorize-check"],
    ["execute-deepseek", "--canary", "1"],
    ["execute-deepseek", "--resume"],
  ]) {
    const result = await api.runCliV1({ argv });
    assert.equal(result.exitCode, 2, argv.join(" "));
    assert.equal(result.receipt.status, "AUTHORIZATION_BLOCKED", argv.join(" "));
    assert.equal(result.receipt.providerRequestCount, 0, argv.join(" "));
    assert.equal(result.receipt.fixtureDispatchCount, 0, argv.join(" "));
  }
});

test("score, verify, and aggregate export cannot fabricate missing natural evidence", async () => {
  const api = await subject();
  for (const [command, status] of [
    ["score", "NO_NATURAL_RESULTS"],
    ["verify", "NO_EXECUTION_RECEIPTS"],
    ["export-aggregate-report", "AGGREGATE_PUBLICATION_BLOCKED"],
  ]) {
    const result = await api.runCliV1({ argv: [command] });
    assert.equal(result.exitCode, 2);
    assert.equal(result.receipt.status, status);
    assert.equal(result.receipt.formalDecision, null);
    assert.equal(result.receipt.providerRequestCount, 0);
  }
});

test("invalid command forms are usage errors and do not fall through to execution", async () => {
  const api = await subject();
  for (const argv of [
    [],
    ["unknown"],
    ["execute-deepseek"],
    ["execute-deepseek", "--canary", "2"],
    ["execute-deepseek", "--resume", "extra"],
  ]) {
    const result = await api.runCliV1({ argv });
    assert.equal(result.exitCode, 64, argv.join(" "));
    assert.equal(result.receipt.status, "USAGE_ERROR", argv.join(" "));
    assert.equal(result.receipt.providerRequestCount, 0, argv.join(" "));
  }
});
