import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
  canonicalJson,
} from "../../research/mais-natural-ca60-v1/versions/design-v5/design-contract.mjs";

const RECEIPT_PATH = path.resolve(
  import.meta.dirname,
  "../../reports/2026-08-26-A11-MAIS-NATURAL-CA60-V5-INDEPENDENT-FORMAL-FREEZE-REVIEW.json",
);
const SCHEMA_PATH = path.resolve(
  import.meta.dirname,
  "schemas/IndependentFrameSampleFreezeReviewReceiptV1.schema.json",
);

function hashJson(value) {
  return createHash("sha256").update(canonicalJson(value)).digest("hex");
}

test("sealed A11 review receipt is self-hashed, closed, aggregate-only, and concurrence-limited", async () => {
  const receipt = JSON.parse(await readFile(RECEIPT_PATH, "utf8"));
  const schema = JSON.parse(await readFile(SCHEMA_PATH, "utf8"));
  const preimage = { ...receipt };
  delete preimage.independentReviewHash;
  assert.equal(hashJson(preimage), receipt.independentReviewHash);
  assert.equal(receipt.independentReviewHash, "431c06140638d9bd278f99c5bc9c373895ce8c133bc0bdf03e51ae152f6b38f9");
  assert.equal(receipt.reviewResult, "CONCURRED");
  assert.equal(receipt.checkCount, 108);
  assert.equal(receipt.matchedCheckCount, 108);
  assert.equal(receipt.mismatchCount, 0);
  assert.equal(new Set(receipt.checks.map((entry) => entry.checkId)).size, 108);
  assert.ok(receipt.checks.every((entry) => entry.status === "MATCH"));
  assert.equal(receipt.aggregateConclusionPublicationAllowedNow, false);
  assert.equal(receipt.providerExecutionAuthorized, false);
  assert.equal(receipt.providerRequestCount, 0);
  assert.equal(receipt.naturalQuestionResultCount, 0);
  assert.equal(schema.additionalProperties, false);
  assert.deepEqual([...schema.required].sort(), Object.keys(receipt).sort());
  assert.deepEqual(Object.keys(schema.properties).sort(), Object.keys(receipt).sort());
  assert.doesNotMatch(JSON.stringify(receipt), /"itemId"|"prompt"|"answer"|"explanation"/u);
});
