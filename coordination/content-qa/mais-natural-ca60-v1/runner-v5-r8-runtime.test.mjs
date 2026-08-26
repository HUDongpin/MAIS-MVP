import assert from "node:assert/strict";
import test from "node:test";

import {
  sealV5R3Artifact,
  sha256V5R3,
} from "./execution-integrity-v5-r3.mjs";
import {
  createNativeProviderAdapterV5R8,
} from "./native-provider-adapter-v5-r8.mjs";
import {
  createRunnerRuntimeV5R8,
} from "./runner-v5-r8-runtime.mjs";

const H = (value) => sha256V5R3(`r8-runtime:${value}`);

function terminalEvidenceBase() {
  const items = Array.from({ length: 60 }, (_, index) => ({
    manifestOrdinal: index + 1,
    itemHash: H(`item:${index}`),
    itemIdPseudonym: `ca60-runtime-${String(index + 1).padStart(2, "0")}`,
    clusterId: `cluster-${index + 1}`,
  }));
  const labels = items.map((item) => sealV5R3Artifact({
    schemaVersion: "FixtureFinalReferenceLabelV1",
    itemHash: item.itemHash,
    itemIdPseudonym: item.itemIdPseudonym,
    clusterId: item.clusterId,
    label: "NO_FINDING",
    unresolved: false,
    findings: [],
  }));
  return {
    activeRegistration: sealV5R3Artifact({ schemaVersion: "FixtureRegistrationV1",
      sampleManifestHash: H("sample") }),
    inventory: sealV5R3Artifact({ schemaVersion: "FixtureInventoryV1", items }),
    referenceSeal: sealV5R3Artifact({ schemaVersion: "FixtureReferenceSealV1" }),
    compatibilityReferenceSeal: sealV5R3Artifact({
      schemaVersion: "FixtureCompatibilityReferenceSealV1", finalLabels: labels }),
    executionRegistration: sealV5R3Artifact({ schemaVersion: "FixtureExecutionRegistrationV1",
      registeredAt: "2026-08-26T12:00:00.000Z" }),
    deepSeekAuthorization: sealV5R3Artifact({ schemaVersion: "FixtureAuthorizationV1" }),
    c0ExecutionSet: sealV5R3Artifact({ schemaVersion: "FixtureC0SetV1", selectedItemHashes: [] }),
    firstReferenceAttemptAt: "2026-08-26T12:10:00.000Z",
    firstEvaluationAttemptAt: "2026-08-26T12:20:00.000Z",
    receiptChainValid: false,
    providerTupleValid: false,
    capsValid: false,
    terminalProviderFailure: true,
  };
}

test("default R8 runtime exposes the protected loader and blocks provider steps at exact zero activity", async () => {
  const runtime = createRunnerRuntimeV5R8({ clock: () => "2026-08-26T14:00:00.000Z" });
  assert.equal(typeof runtime.loadWorkflowContext, "function");
  await assert.rejects(runtime.loadWorkflowContext("relative/index.json"), /must be absolute/);
  for (const execute of [runtime.executeOpenAIResumeStep,
    runtime.executeDeepSeekCanaryStep, runtime.executeDeepSeekResumeStep]) {
    const result = await execute({});
    assert.equal(result.status, "PROVIDER_EXECUTION_BLOCKED_ZERO_HTTP");
    assert.equal(result.providerEventCount, 0);
    assert.equal(result.httpRequestCount, 0);
    assert.equal(result.credentialReadCount, 0);
    assert.equal(result.naturalQuestionEgressCount, 0);
  }
});

test("native R8 adapter rejects before credential read and HTTP when activation evidence is absent", async () => {
  let credentialReads = 0;
  let fetches = 0;
  const adapter = createNativeProviderAdapterV5R8({
    credentialReader: async () => { credentialReads += 1; return null; },
    fetchImplementation: async () => { fetches += 1; throw new Error("must not dispatch"); },
  });
  await assert.rejects(adapter.send({}), /rejected before durable dispatch boundary/);
  assert.equal(credentialReads, 0);
  assert.equal(fetches, 0);
});

test("scoring failure persists 60 missing rows plus an authoritative terminal integrity decision", async () => {
  const persisted = [];
  const runtime = createRunnerRuntimeV5R8({
    clock: () => "2026-08-26T14:00:00.000Z",
    scoringInputBuilder: async () => { throw new Error("fixture graph unavailable"); },
    terminalEvidenceBuilder: async () => terminalEvidenceBase(),
    advanceWorkflow: async ({ appendedArtifacts }) => {
      persisted.push(...appendedArtifacts);
      return { nextIndex: { selfHash: H("next-index") } };
    },
  });
  const result = await runtime.score({});
  assert.equal(result.ok, false);
  assert.equal(result.status, "EXECUTION_INTEGRITY_FAILED");
  assert.equal(result.providerEventCount, 0);
  assert.equal(result.httpRequestCount, 0);
  assert.equal(result.credentialReadCount, 0);
  assert.equal(result.naturalQuestionEgressCount, 0);
  assert.equal(result.terminalReceipt.overallDecision, "EXECUTION_INTEGRITY_FAILED");
  assert.equal(persisted.filter(({ value }) => value.schemaVersion === "ItemEvaluationResultV2").length, 60);
  assert.equal(persisted.filter(({ value }) =>
    value.schemaVersion === "TerminalExecutionDecisionReceiptV1").length, 1);
});
