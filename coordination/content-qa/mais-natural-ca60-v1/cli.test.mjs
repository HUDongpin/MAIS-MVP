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
  "label-openai",
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
  assert.equal(result.receipt.status, "OFFLINE_V5_R2_RUNNER_READY_PENDING_FRESH_A11");
  assert.equal(result.receipt.executionMode, "OFFLINE_NO_PROVIDER");
  assert.equal(result.receipt.providerRequestCount, 0);
  assert.equal(result.receipt.naturalItemResultCount, 0);
  assert.equal(result.receipt.formalDecision, null);
  assert.match(result.receipt.receiptHash, /^[0-9a-f]{64}$/u);
});

test("registration interface and immutable upstream freeze commands report the completed V5 frame/sample boundary", async () => {
  const api = await subject();
  for (const [command, status] of [
    ["register", "PRE_FIRST_PROVIDER_SUPERSEDING_REGISTRATION_INTERFACE_READY"],
    ["freeze-frame", "FRAME_ALREADY_FROZEN_IMMUTABLE"],
    ["audit-clusters", "CLUSTER_AUDIT_ALREADY_FROZEN_IMMUTABLE"],
    ["freeze-sample", "SAMPLE_ALREADY_FROZEN_IMMUTABLE"],
  ]) {
    const result = await api.runCliV1({ argv: [command] });
    assert.equal(result.exitCode, 0, command);
    assert.equal(result.receipt.ok, true, command);
    assert.equal(result.receipt.status, status, command);
    assert.equal(result.receipt.providerRequestCount, 0, command);
    assert.equal(result.receipt.naturalItemResultCount, 0, command);
  }
  for (const [command, status] of [
    ["label-openai", "OPENAI_PROJECT_ROUTE_AND_LABEL_AUTHORIZATIONS_MISSING"],
    ["seal-reference-labels", "REFERENCE_LABELS_NOT_COMPLETE"],
  ]) {
    const result = await api.runCliV1({ argv: [command] });
    assert.equal(result.exitCode, 2, command);
    assert.equal(result.receipt.status, status, command);
    assert.equal(result.receipt.providerRequestCount, 0, command);
  }
});

test("command receipts bind the exact V5 registration while preserving the zero-evidence boundary", async () => {
  const api = await subject();
  const result = await api.runCliV1({ argv: ["dry-run"], now: "2026-08-26T01:00:00.000Z" });
  assert.equal(result.receipt.designId, "MAIS-NATURAL-CA60-V5");
  assert.match(result.receipt.designRegistrationHash, /^[0-9a-f]{64}$/u);
  assert.equal(result.receipt.designLifecycleStatus, "SEALED_CANDIDATE_PENDING_INDEPENDENT_REVIEW");
  assert.equal(result.receipt.designFreezeAllowed, true);
  assert.equal(result.receipt.activeDesignId, "MAIS-NATURAL-CA60-V5");
  assert.equal(result.receipt.frameRegistrationHash, "b8a4752e05fb8bf39a34afa6c63beb363731d08530069d9c454ad1b3e3fe975f");
  assert.equal(result.receipt.sampleManifestHash, "d8856f0fb60f38eeecce5249e2018ba90417d68e0f84ef6e2ad9522016d9e159");
  assert.equal(result.receipt.providerRequestCount, 0);
  assert.equal(result.receipt.naturalItemResultCount, 0);
  assert.equal(result.receipt.formalDecision, null);
  assert.equal(result.receipt.decisionCeiling, "INCONCLUSIVE_MACHINE_REFERENCE");
});

test("authorization check and both DeepSeek execution modes expose the exact current blocker with zero provider requests", async () => {
  const api = await subject();
  const authorization = await api.runCliV1({ argv: ["authorize-check"] });
  assert.equal(authorization.exitCode, 2);
  assert.equal(authorization.receipt.status, "PROVIDER_AUTHORIZATIONS_MISSING");
  assert.equal(authorization.receipt.providerRequestCount, 0);
  for (const argv of [
    ["execute-deepseek", "--canary", "1"],
    ["execute-deepseek", "--resume"],
  ]) {
    const result = await api.runCliV1({ argv });
    assert.equal(result.exitCode, 2, argv.join(" "));
    assert.equal(result.receipt.status, "REFERENCE_LABEL_SEAL_MISSING", argv.join(" "));
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
    ["label-qwen"],
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
