import assert from "node:assert/strict";
import { mkdtemp, readFile, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { buildOpenAIProjectRouteReceiptV1 } from "./execution-integrity-v5-r3.mjs";
import { writeRouteReceiptV5R3 } from "./route-receipt-store-v5-r3.mjs";

const H = (character) => character.repeat(64);

function receipt() {
  return buildOpenAIProjectRouteReceiptV1({
    registrationHash: H("1"), preflightAuthorizationHash: H("2"), credentialReadinessReceiptHash: H("3"),
    projectResidencyConsoleEvidenceHash: H("4"), projectIdentityHash: H("5"), providerAttemptReceiptHash: H("6"),
    priceSnapshotHash: H("7"), observedEndpoint: "https://us.api.openai.com/v1/responses", observedModel: "gpt-5.6-luna",
    projectStorageAndProcessingConfirmed: true, modelAvailableOnProject: true, completedAt: "2026-08-26T04:00:00.000Z",
  });
}

test("route receipts use immutable atomic files under 0600 and idempotent exact bytes", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "ca60-v5-r3-route-"));
  const value = receipt();
  const first = await writeRouteReceiptV5R3({ root, receipt: value });
  const second = await writeRouteReceiptV5R3({ root, receipt: value });
  assert.equal(first.path, second.path);
  assert.equal(first.created, true);
  assert.equal(second.created, false);
  assert.equal((await stat(first.path)).mode & 0o777, 0o600);
  assert.equal(JSON.parse(await readFile(first.path, "utf8")).selfHash, value.selfHash);
  await writeFile(first.path, "{}", { mode: 0o600 });
  await assert.rejects(writeRouteReceiptV5R3({ root, receipt: value }), /immutable route receipt conflict/u);
});

test("writer rejects unsealed, non-route, or non-absolute storage targets", async () => {
  await assert.rejects(writeRouteReceiptV5R3({ root: "relative", receipt: receipt() }), /absolute/u);
  const root = await mkdtemp(path.join(tmpdir(), "ca60-v5-r3-route-invalid-"));
  await assert.rejects(writeRouteReceiptV5R3({ root, receipt: { selfHash: H("a") } }), /sealed route receipt/u);
});
