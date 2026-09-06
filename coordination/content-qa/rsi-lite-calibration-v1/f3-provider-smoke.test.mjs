import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { runF3ProviderSmoke, writeF3ProviderSmokeReceipt } from "./f3-provider-smoke.mjs";
import { canonicalSha256 } from "./f3-formal-runner.mjs";

test("provider smoke sends only a synthetic answer-blind surface and emits a secret-free self-hashed receipt", async () => {
  const secretCanary = "test-secret-never-persist";
  let observedProjection;
  const providerAdapter = {
    provider: "DeepSeek",
    model: "deepseek-v4-pro",
    async runRole({ role, packageId, projection }) {
      observedProjection = projection;
      return {
        provider: "DeepSeek",
        httpStatus: 200,
        model: "deepseek-v4-pro",
        systemFingerprint: "fp-smoke",
        providerRequestId: "smoke-request",
        finishReason: "stop",
        latencyMs: 5,
        usage: { promptCacheHitTokens: 0, promptCacheMissTokens: 40, completionTokens: 10, totalTokens: 50 },
        providerResponseSha256: "7".repeat(64),
        roleResult: { schemaVersion: 1, role, packageId, inspectionComplete: true, inspectedSurfaceIds: ["synthetic-q-1"], findings: [] }
      };
    },
    secretCanary
  };
  const receipt = await runF3ProviderSmoke({ providerAdapter });
  assert.equal(observedProjection.packageId, "f3-synthetic-provider-smoke");
  assert.equal(JSON.stringify(observedProjection).includes("e18cbaa"), false);
  assert.equal(receipt.passed, true);
  assert.equal(receipt.candidateContentSent, false);
  assert.equal(receipt.secretPersisted, false);
  assert.equal(JSON.stringify(receipt).includes(secretCanary), false);
  const { receiptSha256, ...body } = receipt;
  assert.equal(receiptSha256, canonicalSha256(body));
});

test("provider smoke receipt is written as a protected exact file", async () => {
  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "mais-f3-smoke-test-"));
  try {
    const body = { passed: true, provider: "DeepSeek", model: "deepseek-v4-pro", receiptSha256: "8".repeat(64) };
    const outputPath = path.join(temporaryRoot, "smoke.json");
    await writeF3ProviderSmokeReceipt(outputPath, body);
    assert.deepEqual(JSON.parse(await readFile(outputPath, "utf8")), body);
    await assert.rejects(writeF3ProviderSmokeReceipt(outputPath, { ...body, model: "other" }), /refusing to overwrite/i);
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
});
