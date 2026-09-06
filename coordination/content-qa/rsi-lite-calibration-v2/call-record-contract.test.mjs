import assert from "node:assert/strict";
import test from "node:test";

async function subject() {
  return import("./call-record-contract.mjs");
}

function recordInput(overrides = {}) {
  return {
    packageId: "pkg-1",
    role: "tool-verifier",
    projectionSha256: "a".repeat(64),
    repeatGroupId: null,
    request: {
      provider: "DeepSeek",
      model: "deepseek-v4-pro",
      temperature: 0,
      topP: 1,
      maxOutputTokens: 24_000,
      stream: false,
      requestedSeed: null,
      seedSupport: "not-assumed"
    },
    response: {
      responseId: "response-1",
      observedModel: "deepseek-v4-pro",
      createdAt: "2026-08-24T00:00:00.000Z",
      finishReason: "stop",
      usage: {
        promptCacheHitTokens: 10,
        promptCacheMissTokens: 100,
        outputTokens: 20
      }
    },
    ...overrides
  };
}

test("records requested stochastic parameters and observed provider metadata without claiming seed support", async () => {
  const { createProviderCallRecordV2, validateProviderCallRecordV2 } = await subject();
  const record = createProviderCallRecordV2(recordInput());

  assert.equal(record.schemaVersion, 2);
  assert.equal(record.stochasticParametersRecorded, true);
  assert.equal(record.request.temperature, 0);
  assert.equal(record.request.topP, 1);
  assert.equal(record.request.requestedSeed, null);
  assert.equal(record.request.seedSupport, "not-assumed");
  assert.match(record.requestParametersSha256, /^[a-f0-9]{64}$/);
  assert.match(record.recordSha256, /^[a-f0-9]{64}$/);
  assert.deepEqual(validateProviderCallRecordV2(record), []);
});

test("rejects an incomplete stochastic record", async () => {
  const { createProviderCallRecordV2, validateProviderCallRecordV2 } = await subject();
  const input = recordInput();
  delete input.request.temperature;
  const record = createProviderCallRecordV2(input);
  const issues = validateProviderCallRecordV2(record);

  assert.ok(issues.some((row) => row.code === "stochastic-parameter-missing"));
});

test("rejects provider or requested-model drift from the registered DeepSeek reviewer", async () => {
  const { createProviderCallRecordV2, validateProviderCallRecordV2 } = await subject();
  const wrongProviderInput = recordInput();
  wrongProviderInput.request.provider = "AnotherProvider";
  const wrongProviderIssues = validateProviderCallRecordV2(createProviderCallRecordV2(wrongProviderInput));
  assert.ok(wrongProviderIssues.some((row) => row.code === "provider-contract-drift"));

  const wrongModelInput = recordInput();
  wrongModelInput.request.model = "another-model";
  const wrongModelIssues = validateProviderCallRecordV2(createProviderCallRecordV2(wrongModelInput));
  assert.ok(wrongModelIssues.some((row) => row.code === "model-contract-drift"));
});

test("requires repeat observations to reuse the frozen projection and request parameters", async () => {
  const { auditRepeatPairV2, createProviderCallRecordV2 } = await subject();
  const original = createProviderCallRecordV2(recordInput({ repeatGroupId: "repeat-1" }));
  const repeated = createProviderCallRecordV2(recordInput({
    repeatGroupId: "repeat-1",
    response: {
      ...recordInput().response,
      responseId: "response-2",
      createdAt: "2026-08-24T00:05:00.000Z"
    }
  }));
  assert.deepEqual(auditRepeatPairV2([original, repeated]), []);

  const drifted = structuredClone(repeated);
  drifted.projectionSha256 = "b".repeat(64);
  assert.ok(auditRepeatPairV2([original, drifted]).some((row) => row.code === "repeat-projection-drift"));
});
