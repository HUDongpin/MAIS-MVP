import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { canonicalJsonV5R3, validateSelfHashV5R3 } from "../../../../content-qa/mais-natural-ca60-v1/execution-integrity-v5-r3.mjs";
import { buildProviderContractErratumV5R3, V5_R2_A11_DISCREPANCY_RECEIPT_HASH } from "./build-provider-contract-erratum.mjs";

const ROOT = path.dirname(fileURLToPath(import.meta.url));

test("append-only provider-name erratum exactly rebuilds without changing frozen prompt bytes", async () => {
  const artifact = JSON.parse(await readFile(path.join(ROOT, "provider-contract-erratum.json"), "utf8"));
  assert.equal(validateSelfHashV5R3(artifact), true);
  assert.equal(artifact.previousReceiptHash, V5_R2_A11_DISCREPANCY_RECEIPT_HASH);
  assert.equal(artifact.promptBytesChanged, false);
  assert.equal(artifact.referenceInputCountRequiredForDeepSeek, 0);
  assert.match(artifact.operativeInterpretation, /OpenAI GPT-5\.6 Luna/u);
  assert.equal(canonicalJsonV5R3(buildProviderContractErratumV5R3({ recordedAt: artifact.recordedAt })), canonicalJsonV5R3(artifact));
});

test("erratum does not grant credentials, provider calls, egress, tokens, attempts, or USD", async () => {
  const bytes = await readFile(path.join(ROOT, "provider-contract-erratum.json"), "utf8");
  for (const forbidden of ["apiKey", "credentialValue", "providerExecutionAuthorized", "naturalQuestionEgressAuthorized", "maximumTokens", "maximumEstimatedUsd"]) {
    assert.equal(bytes.includes(forbidden), false, `erratum must not contain ${forbidden}`);
  }
});
