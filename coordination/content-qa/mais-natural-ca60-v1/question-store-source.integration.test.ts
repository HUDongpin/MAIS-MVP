import assert from "node:assert/strict";
import test from "node:test";

import { extractCaliforniaRuntimeInventoryV1 } from "./runtime-extractor";
import { createQuestionStoreCaliforniaAdapterV1 } from "./question-store-source";

test("the real questionStore California adapter enumerates one complete 13-grade runtime inventory without provider calls", async () => {
  const adapter = createQuestionStoreCaliforniaAdapterV1();
  const result = await extractCaliforniaRuntimeInventoryV1({ adapter });
  assert.equal(result.providerRequestCount, 0);
  assert.equal(result.gradeProjectionInvocations.length, 13);
  assert.equal(result.rawSourceItemCount, result.convertedItemCount);
  assert.equal(result.convertedItemCount, result.runtimeVisibleItemCount);
  assert.ok(result.runtimeVisibleItemCount >= 60);
  assert.equal(result.itemRecords.length, result.runtimeVisibleItemCount);
  assert.equal(new Set(result.itemRecords.map((record) => record.itemId)).size, result.runtimeVisibleItemCount);
  assert.equal(result.frameFailureLedger.length, 0, result.frameFailureLedger.map((entry) => `${entry.code}:${entry.itemId}`).join(","));
  assert.equal(result.freezeEligible, true);
});
