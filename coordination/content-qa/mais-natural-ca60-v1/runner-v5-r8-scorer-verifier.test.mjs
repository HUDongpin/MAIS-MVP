import assert from "node:assert/strict";
import test from "node:test";

import {
  sealV5R3Artifact,
  sha256V5R3,
} from "./execution-integrity-v5-r3.mjs";
import {
  buildTerminalMissingItemResultsV5R8,
  validateCompletedItemMarkerBindingsV5R8,
} from "./scorer-verifier-v5-r8.mjs";

const H = (value) => sha256V5R3(`r8-scorer:${value}`);
const RUNNER = H("runner");
const SAMPLE = H("sample");
const REFERENCE = H("reference");
const EXECUTION = H("execution");

function completeFixture() {
  const completedItemMarkers = [];
  const itemResults = [];
  for (let index = 0; index < 60; index += 1) {
    const identity = { itemHash: H(`item:${index}`),
      itemIdPseudonym: `ca60-scorer-${String(index + 1).padStart(2, "0")}`,
      clusterId: `cluster-${index + 1}` };
    const requiredRoleOrder = ["B_PRIME_CRITIQUE", "B_PRIME_REVISION"];
    const successfulRoleOutputHashes = [H(`critique:${index}`), H(`revision:${index}`)];
    const attemptReceiptHashes = [H(`attempt-a:${index}`), H(`attempt-b:${index}`)];
    const marker = sealV5R3Artifact({
      schemaVersion: "CompletedItemCommitMarkerV2",
      designId: "MAIS-NATURAL-CA60-V5",
      runnerRegistrationHash: RUNNER,
      sampleManifestHash: SAMPLE,
      referenceSealHash: REFERENCE,
      executionRegistrationHash: EXECUTION,
      ...identity,
      requiredRoleOrder,
      successfulRoleOutputHashes,
      attemptReceiptHashes,
      executionDisposition: "COMPLETE",
      atomicWrite: true,
      fileMode: "0600",
    });
    completedItemMarkers.push(marker);
    itemResults.push(sealV5R3Artifact({
      schemaVersion: "ItemEvaluationResultV2",
      designId: "MAIS-NATURAL-CA60-V5",
      runnerRegistrationHash: RUNNER,
      sampleExecutionInventoryHash: H("inventory"),
      referenceSealHash: REFERENCE,
      executionRegistrationHash: EXECUTION,
      deepSeekAuthorizationHash: H("deepseek-authorization"),
      c0ExecutionSetHash: H("c0"),
      manifestOrdinal: index + 1,
      ...identity,
      executionDisposition: "COMPLETE",
      machineDisposition: "RESOLVED",
      machineNonresolvedReasonCodes: [],
      referenceDisposition: "RESOLVED_NEGATIVE",
      machineSurfaceFinding: false,
      referenceFindings: [],
      machineFindings: [],
      finalReferenceLabelHash: H(`label:${index}`),
      requiredRoleOrder,
      successfulRoleOutputHashes,
      attemptReceiptHashes,
      completedItemMarkerHash: marker.selfHash,
    }));
  }
  return { itemResults, completedItemMarkers };
}

test("R8 requires an exact one-to-one full marker artifact for every complete item result", () => {
  const valid = completeFixture();
  assert.deepEqual(validateCompletedItemMarkerBindingsV5R8(valid), []);

  const crossed = completeFixture();
  const { selfHash: _discarded, ...body } = crossed.itemResults[0];
  crossed.itemResults[0] = sealV5R3Artifact({ ...body,
    completedItemMarkerHash: crossed.completedItemMarkers[1].selfHash });
  assert.ok(validateCompletedItemMarkerBindingsV5R8(crossed)
    .some((error) => /one unused|differ/i.test(error)));

  const dangling = completeFixture();
  dangling.completedItemMarkers.push(sealV5R3Artifact({
    ...Object.fromEntries(Object.entries(dangling.completedItemMarkers[0])
      .filter(([key]) => key !== "selfHash")),
    itemHash: H("dangling-item"),
  }));
  assert.ok(validateCompletedItemMarkerBindingsV5R8(dangling)
    .some((error) => /set size|dangling/i.test(error)));
});

test("terminal scorer custody emits all 60 sealed missing-receipt rows without imputation", () => {
  const items = Array.from({ length: 60 }, (_, index) => ({ manifestOrdinal: index + 1,
    itemHash: H(`terminal-item:${index}`), itemIdPseudonym: `terminal-${index + 1}`,
    clusterId: `terminal-cluster-${index + 1}` }));
  const finalLabels = items.map((item) => sealV5R3Artifact({
    schemaVersion: "FixtureReferenceLabelV1", itemHash: item.itemHash,
    itemIdPseudonym: item.itemIdPseudonym, clusterId: item.clusterId,
    label: "NO_FINDING", unresolved: false, findings: [],
  }));
  const rows = buildTerminalMissingItemResultsV5R8({
    activeRegistration: sealV5R3Artifact({ schemaVersion: "FixtureRegistrationV1" }),
    inventory: sealV5R3Artifact({ schemaVersion: "FixtureInventoryV1", items }),
    referenceSeal: sealV5R3Artifact({ schemaVersion: "FixtureReferenceSealV1" }),
    compatibilityReferenceSeal: sealV5R3Artifact({
      schemaVersion: "FixtureCompatibilityReferenceSealV1", finalLabels }),
    executionRegistration: sealV5R3Artifact({ schemaVersion: "FixtureExecutionRegistrationV1" }),
    deepSeekAuthorization: sealV5R3Artifact({ schemaVersion: "FixtureDeepSeekAuthorizationV1" }),
    c0ExecutionSet: sealV5R3Artifact({ schemaVersion: "FixtureC0V1", selectedItemHashes: [] }),
    reasonCodes: ["RAW_ATTEMPT_GRAPH_OR_SCORING_CUSTODY_UNRECONSTRUCTABLE"],
  });
  assert.equal(rows.length, 60);
  assert.equal(new Set(rows.map(({ itemHash }) => itemHash)).size, 60);
  assert.ok(rows.every((row) => row.executionDisposition === "MISSING_RECEIPT"
    && row.machineDisposition === "MISSING_RECEIPT"
    && row.machineSurfaceFinding === null
    && row.completedItemMarkerHash === null
    && row.machineFindings.length === 0));
});
