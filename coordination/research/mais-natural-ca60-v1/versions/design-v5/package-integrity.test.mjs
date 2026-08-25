import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  buildDesignRegistrationV5,
  buildPredecessorPackageInventoryV4,
  buildStatisticalPowerV5,
  buildV5PackageManifest,
  canonicalJson,
  jcsHash,
} from "./design-contract.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));

async function loadJson(filename) {
  return JSON.parse(await readFile(path.join(HERE, filename), "utf8"));
}

test("the V5 package manifest exact-binds every tracked package byte except its own cyclic leaf", async () => {
  const actual = await loadJson("package-manifest.json");
  const expected = await buildV5PackageManifest();
  assert.deepEqual(actual, expected);
  assert.equal(actual.schemaVersion, "V5PackageManifestV1");
  assert.equal(actual.excludedSelfPath, "package-manifest.json");
  assert.equal(actual.entries.some((entry) => entry.path === "package-manifest.json"), false);
  assert.equal(actual.fileCount, actual.entries.length);
  assert.equal(actual.packageRootHash, jcsHash(actual.entries));
  const preimage = { ...actual };
  delete preimage.selfHash;
  assert.equal(actual.selfHash, jcsHash(preimage));
});

test("all generated roots reproduce exactly from current immutable inputs", async () => {
  const registration = await loadJson("design-registration.json");
  const inventory = await loadJson("predecessor-package-inventory-v4.json");
  const power = await loadJson("statistical-power.json");

  assert.deepEqual(inventory, await buildPredecessorPackageInventoryV4());
  assert.deepEqual(registration, await buildDesignRegistrationV5());
  assert.deepEqual(power, buildStatisticalPowerV5(registration.registrationHash));
});

test("tracked V5 JSON evidence contains no provider execution, credential, question, label, or result payload", async () => {
  const registration = await loadJson("design-registration.json");
  const inventory = await loadJson("predecessor-package-inventory-v4.json");
  const power = await loadJson("statistical-power.json");
  const manifest = await loadJson("package-manifest.json");
  const text = canonicalJson({ registration, inventory, power, manifest });

  assert.equal(registration.providerEventCount, 0);
  assert.equal(registration.firstProviderExecutionAllowed, false);
  assert.equal(registration.preExecutionState.openaiReferenceAttemptCount, 0);
  assert.equal(registration.preExecutionState.deepSeekNaturalItemAttemptCount, 0);
  assert.equal(registration.preExecutionState.frameRegistrationHash, null);
  assert.equal(registration.preExecutionState.sampleManifestHash, null);
  assert.equal(registration.preExecutionState.referenceLabelSealHash, null);
  assert.doesNotMatch(text, /"apiKey"|"authorizationHeader"|"credentialValue"|"questionText"|"rawProviderResponse"/u);
});

test("offline V5 production utilities expose no HTTP or credential-reading primitive", async () => {
  for (const filename of [
    "build-design-registration.mjs",
    "design-contract.mjs",
    "validate-design-registration.mjs",
  ]) {
    const source = await readFile(path.join(HERE, filename), "utf8");
    assert.doesNotMatch(source, /\bfetch\s*\(|https?\.request\s*\(|OpenAI\s*\(|\.env(?:\.local)?|All API Keys\.docx/u, filename);
  }
});
