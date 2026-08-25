import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { runRuntimeDiagnosticV1 } from "./runtime-diagnostic";

test("aggregate runtime diagnostic is reproducible without exposing item bodies or claiming frame freeze", async () => {
  const receipt = await runRuntimeDiagnosticV1({ createdAt: "2026-08-25T15:00:00.000Z" });
  assert.equal(receipt.schemaVersion, "RuntimeDiagnosticAggregateReceiptV1");
  assert.equal(receipt.diagnosticOnly, true);
  assert.equal(receipt.frameFreezeAuthorized, false);
  assert.equal(receipt.sampleFreezeAuthorized, false);
  assert.equal(receipt.providerRequestCount, 0);
  assert.equal(receipt.runtimeSemanticChecksPassed, true);
  assert.equal(receipt.homologyChecksPassed, true);
  assert.ok(receipt.runtimeVisibleItemCount >= 60);
  assert.ok(receipt.independentClusterCount >= 60);
  assert.match(receipt.runtimeInventoryRootHash, /^[0-9a-f]{64}$/u);
  assert.match(receipt.homologyAuditRootHash, /^[0-9a-f]{64}$/u);
  assert.match(receipt.receiptHash, /^[0-9a-f]{64}$/u);
  assert.deepEqual(Object.keys(receipt).sort(), [
    "blockingAnomalyCounts",
    "claimCeiling",
    "createdAt",
    "designId",
    "designLifecycleStatus",
    "diagnosticOnly",
    "edgeCount",
    "frameFailureCount",
    "frameFreezeAuthorized",
    "gradeCounts",
    "homologyAuditRootHash",
    "homologyChecksPassed",
    "independentClusterCount",
    "largestComponentItemCount",
    "largestComponentShare",
    "providerRequestCount",
    "receiptHash",
    "runtimeInventoryRootHash",
    "runtimeSemanticChecksPassed",
    "runtimeVisibleItemCount",
    "sampleFreezeAuthorized",
    "schemaVersion",
    "singletonCount",
    "singletonRate",
    "sourceCleanProofBound",
  ].sort());
  const serialized = JSON.stringify(receipt);
  for (const forbidden of ["itemRecords", "itemAssignments", "prompt", "answer", "explanation", "rawQuestion"]) {
    assert.equal(serialized.includes(forbidden), false, forbidden);
  }

  const here = path.dirname(fileURLToPath(import.meta.url));
  const schema = JSON.parse(await readFile(path.join(here, "schemas/RuntimeDiagnosticAggregateReceiptV1.schema.json"), "utf8"));
  assert.equal(schema.additionalProperties, false);
  assert.deepEqual([...schema.required].sort(), Object.keys(receipt).sort());
  assert.deepEqual(Object.keys(schema.properties).sort(), Object.keys(receipt).sort());
  assert.equal(schema.properties.diagnosticOnly.const, true);
  assert.equal(schema.properties.sourceCleanProofBound.const, false);
  assert.equal(schema.properties.frameFreezeAuthorized.const, false);
  assert.equal(schema.properties.sampleFreezeAuthorized.const, false);
  assert.equal(schema.properties.providerRequestCount.const, 0);
});
