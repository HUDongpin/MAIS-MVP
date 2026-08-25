import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  buildActiveDesignPointerV5,
  buildActivationReceiptV1,
  canonicalJson,
  jcsHash,
  validateActivationPackageV1,
} from "./activation-contract.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const RESEARCH_ROOT = path.resolve(HERE, "../..");
const REPO_ROOT = path.resolve(RESEARCH_ROOT, "../../..");

async function json(relative) {
  return JSON.parse(await readFile(path.resolve(HERE, relative), "utf8"));
}

async function artifacts() {
  return {
    priorPointer: await json("prior-active-design-pointer.json"),
    activePointer: await json("../../ACTIVE-DESIGN-REGISTRATION.json"),
    registration: await json("../../versions/design-v5/design-registration.json"),
    packageManifest: await json("../../versions/design-v5/package-manifest.json"),
    verification: await json("../../../../reports/mais-natural-ca60-v5-preactivation-review/independent-preactivation-verification.json"),
    reviewReceipt: await json("../../../../reports/mais-natural-ca60-v5-preactivation-review/independent-design-review-receipt.json"),
    activationReceipt: await json("activation-receipt.json"),
  };
}

test("append-only activation exact-binds prior V3, reviewed V5, A21 custody, and A11 concurrence", async () => {
  const current = await artifacts();
  assert.deepEqual(current.activePointer, buildActiveDesignPointerV5());
  assert.deepEqual(current.activationReceipt, buildActivationReceiptV1(current));
  const result = validateActivationPackageV1(current);
  assert.equal(result.ok, true, result.errors.join("\n"));
  assert.equal(result.activationStatus, "V5_METHOD_ACTIVE_EXECUTION_BLOCKED");
  assert.equal(result.providerEventCount, 0);
  assert.equal(result.firstProviderExecutionAllowed, false);
});

test("active pointer is V5 but remains a nonauthorizing pointer rather than an execution registration", async () => {
  const pointer = await json("../../ACTIVE-DESIGN-REGISTRATION.json");
  assert.deepEqual(Object.keys(pointer).sort(), [
    "activeDesignId",
    "activeDesignPath",
    "activeRegistrationHash",
    "artifactKind",
    "designFamily",
    "firstProviderExecutionAllowed",
    "pointerUpdatedAt",
    "predecessorDesignId",
    "predecessorRegistrationHash",
    "reason",
    "schemaVersion",
  ].sort());
  assert.equal(pointer.activeDesignId, "MAIS-NATURAL-CA60-V5");
  assert.equal(pointer.activeDesignPath, "versions/design-v5/design-registration.json");
  assert.equal(pointer.activeRegistrationHash, "e240f1fb1af588fb3dbf085b8f57af1c41635bdb8576be8019838d4512fa0632");
  assert.equal(pointer.predecessorDesignId, "MAIS-NATURAL-CA60-V3");
  assert.equal(pointer.firstProviderExecutionAllowed, false);
  assert.match(pointer.reason, /2ab305f28bacc7d5d0d7889e1c48c2b5eba51e8da4bd1d8d0831f90aee9b04b9/u);
});

test("activation receipt preserves all remaining gates and cannot authorize a provider call", async () => {
  const receipt = await json("activation-receipt.json");
  assert.equal(receipt.providerEventCountAtActivation, 0);
  assert.equal(receipt.firstProviderExecutionAllowed, false);
  assert.equal(receipt.providerExecutionAuthorizationCreated, false);
  assert.equal(receipt.frameRegistrationHash, null);
  assert.equal(receipt.sampleManifestHash, null);
  assert.equal(receipt.openaiAuthorizationHash, null);
  assert.equal(receipt.deepSeekAuthorizationHash, null);
  assert.equal(receipt.executionRegistrationHash, null);
  assert.equal(receipt.postActivationBlockers.includes("FRAME_REGISTRATION_REQUIRED"), true);
  assert.equal(receipt.postActivationBlockers.includes("HASH_BOUND_OPENAI_AUTHORIZATION_REQUIRED"), true);
  assert.equal(receipt.postActivationBlockers.includes("HASH_BOUND_DEEPSEEK_AUTHORIZATION_REQUIRED"), true);
  assert.equal(receipt.selfHash, jcsHash(Object.fromEntries(Object.entries(receipt).filter(([key]) => key !== "selfHash"))));
});

test("activation leaves the exact V5 package bytes and A11 evidence roots unchanged", async () => {
  const current = await artifacts();
  assert.equal(current.packageManifest.packageRootHash, "66a78409c64d65fa8d7e0208386f2046b276de5295602261fdb41e53e08544a1");
  assert.equal(current.registration.registrationHash, "e240f1fb1af588fb3dbf085b8f57af1c41635bdb8576be8019838d4512fa0632");
  assert.equal(current.verification.verificationHash, "f57d16b7a6603960511d2aae59b36911cbb9fec1bffaa63967cbd125da98ade4");
  assert.equal(current.reviewReceipt.reviewHash, "2ab305f28bacc7d5d0d7889e1c48c2b5eba51e8da4bd1d8d0831f90aee9b04b9");
  assert.equal(current.activationReceipt.reviewReceiptHash, current.reviewReceipt.reviewHash);
  assert.equal(current.activationReceipt.independentVerificationHash, current.verification.verificationHash);
  assert.equal(current.activationReceipt.v5PackageRootHash, current.packageManifest.packageRootHash);
  assert.equal(current.activationReceipt.registrationHash, current.registration.registrationHash);
});

test("activation contract and tracked JSON contain no network, credential, question, label, or result payload", async () => {
  const source = await readFile(path.join(HERE, "activation-contract.mjs"), "utf8");
  const activation = await readFile(path.join(HERE, "activation-receipt.json"), "utf8");
  const pointer = await readFile(path.join(RESEARCH_ROOT, "ACTIVE-DESIGN-REGISTRATION.json"), "utf8");
  const text = `${source}\n${activation}\n${pointer}`;
  assert.doesNotMatch(source, /\bfetch\s*\(|process\.env|OPENAI_API_KEY|from\s+["']openai["']/u);
  assert.doesNotMatch(text, /"apiKey"|"credentialValue"|"questionText"|"rawProviderResponse"|"referenceLabel"|"naturalResult"/u);
  assert.equal(canonicalJson({ activation: JSON.parse(activation), pointer: JSON.parse(pointer) }).includes("PASS"), false);
});

test("activation and pointer schemas are closed and exact", async () => {
  const [pointerSchema, activationSchema, current] = await Promise.all([
    json("schemas/NaturalCaActiveDesignPointerV1.schema.json"),
    json("schemas/NaturalCaDesignActivationReceiptV1.schema.json"),
    artifacts(),
  ]);
  for (const [schema, artifact] of [
    [pointerSchema, current.activePointer],
    [activationSchema, current.activationReceipt],
  ]) {
    assert.equal(schema.type, "object");
    assert.equal(schema.additionalProperties, false);
    assert.deepEqual([...schema.required].sort(), Object.keys(artifact).sort());
    assert.deepEqual(Object.keys(schema.properties).sort(), Object.keys(artifact).sort());
  }
  assert.equal(pointerSchema.properties.firstProviderExecutionAllowed.const, false);
  assert.equal(activationSchema.properties.providerExecutionAuthorizationCreated.const, false);
});

test("reviewed production guard accepts the V5 pointer but still dispatches nothing without downstream authorization", async () => {
  const { dispatchAuthorizedOpenAIFixtureTransportV5 } = await import(
    "../../../../content-qa/mais-natural-ca60-v1/authorization-guard-v5.mjs"
  );
  const independentReviewReceipt = await json(
    "../../../../reports/mais-natural-ca60-v5-preactivation-review/independent-design-review-receipt.json",
  );
  const result = await dispatchAuthorizedOpenAIFixtureTransportV5({ independentReviewReceipt });

  assert.equal(result.dispatchAllowed, false);
  assert.equal(result.httpRequestCount, 0);
  assert.equal(result.fixtureDispatchCount, 0);
  assert.equal(result.errors.some((error) => /active.*pointer|independent.*review/iu.test(error)), false);
  assert.equal(result.errors.some((error) => /ProviderAuthorizationV2 is missing/u.test(error)), true);
});

test("review commit is an ancestor of the activation branch without treating branch state as provider evidence", async () => {
  const { execFileSync } = await import("node:child_process");
  assert.doesNotThrow(() => execFileSync("git", ["merge-base", "--is-ancestor", "85fb01b494851b034e27b909065d6729e6a6adc0", "HEAD"], {
    cwd: REPO_ROOT,
    stdio: "ignore",
  }));
});
