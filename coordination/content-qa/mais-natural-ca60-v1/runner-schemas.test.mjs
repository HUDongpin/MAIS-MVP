import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  buildProtectedExecutionCustodyRegistryV1,
  validateProtectedExecutionCustodyRegistryV1,
} from "./runner-storage.mjs";
import {
  calculateArtifactHash,
} from "../../research/mais-natural-ca60-v1/versions/design-v4/design-contract.mjs";
import { runCliV1 } from "./cli.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SCHEMA_DIR = path.join(HERE, "schemas");

async function schema(name) {
  return JSON.parse(await readFile(path.join(SCHEMA_DIR, `${name}.schema.json`), "utf8"));
}

function sorted(values) {
  return [...values].sort((left, right) => left.localeCompare(right, "en"));
}

function assertClosedExactShape(document, artifact) {
  assert.equal(document.type, "object");
  assert.equal(document.additionalProperties, false);
  assert.deepEqual(sorted(document.required), sorted(Object.keys(artifact)));
  assert.deepEqual(sorted(Object.keys(document.properties)), sorted(Object.keys(artifact)));
}

function registryFixture() {
  return buildProtectedExecutionCustodyRegistryV1({
    repoRoot: "/tmp/mais-natural-ca60-schema-fixture",
    designRegistrationHash: "1".repeat(64),
    runnerCommit: "2".repeat(40),
    runnerSourceManifest: [
      { path: "coordination/content-qa/mais-natural-ca60-v1/runner-storage.mjs", byteLength: 42, sha256: "3".repeat(64) },
    ],
    adapterHash: null,
    createdAt: "2026-08-25T14:00:00.000Z",
    previousRegistryHash: null,
  });
}

function markerFixture() {
  const body = {
    schemaVersion: "CompletedItemCommitMarkerV1",
    designId: "MAIS-NATURAL-CA60-V4",
    registrationHash: "1".repeat(64),
    sampleManifestHash: "2".repeat(64),
    referenceSealHash: "3".repeat(64),
    executionRegistrationHash: "4".repeat(64),
    itemId: "runtime-item-001",
    itemHash: "5".repeat(64),
    clusterId: "cluster-001",
    roleOrder: ["B_PRIME_CRITIQUE", "B_PRIME_REVISION"],
    attemptReceiptHashes: ["6".repeat(64), "7".repeat(64)],
    outputHashes: ["8".repeat(64), "9".repeat(64)],
    atomicWrite: true,
    fileMode: "0600",
  };
  return { ...body, markerHash: calculateArtifactHash(body, "markerHash") };
}

test("custody registry schema is closed and exactly mirrors the real self-hashed artifact", async () => {
  const document = await schema("ProtectedExecutionCustodyRegistryV1");
  const registry = registryFixture();
  assertClosedExactShape(document, registry);
  assert.equal(document.title, "ProtectedExecutionCustodyRegistryV1");
  assert.equal(document.properties.providerExecutionAuthorized.const, false);
  assert.equal(document.properties.aggregatePublicationAuthorized.const, false);
  assert.equal(document.properties.protectedArtifactRoot.pattern, "^/.+/.local/mais-natural-ca60-v1$");
  assert.equal(document.properties.runnerSourceManifest.minItems, 1);
  assert.equal(document.properties.runnerSourceManifest.uniqueItems, true);
  assert.deepEqual(validateProtectedExecutionCustodyRegistryV1(registry, {
    repoRoot: "/tmp/mais-natural-ca60-schema-fixture",
  }), []);
});

test("completed-item marker schema freezes the two allowed role orders and exact hash arrays", async () => {
  const document = await schema("CompletedItemCommitMarkerV1");
  const marker = markerFixture();
  assertClosedExactShape(document, marker);
  assert.equal(document.title, "CompletedItemCommitMarkerV1");
  assert.equal(document.properties.atomicWrite.const, true);
  assert.equal(document.properties.fileMode.const, "0600");
  assert.deepEqual(document.properties.roleOrder.oneOf.map((entry) => entry.prefixItems.map((item) => item.const)), [
    ["B_PRIME_CRITIQUE", "B_PRIME_REVISION"],
    ["B_PRIME_CRITIQUE", "B_PRIME_REVISION", "C0_PRIME_ROLE_1", "C0_PRIME_ROLE_2", "C0_PRIME_ROLE_3", "C0_PRIME_ROLE_4", "C0_PRIME_ROLE_5"],
  ]);
  assert.deepEqual(document.allOf.map((entry) => entry.then.properties.attemptReceiptHashes.minItems), [2, 7]);
  assert.deepEqual(document.allOf.map((entry) => entry.then.properties.outputHashes.maxItems), [2, 7]);
});

test("runner command receipt schema is closed and makes zero natural execution the only current shape", async () => {
  const document = await schema("NaturalCaRunnerCommandReceiptV1");
  const { receipt } = await runCliV1({ argv: ["dry-run"], now: "2026-08-25T15:00:00.000Z" });
  assertClosedExactShape(document, receipt);
  assert.equal(document.title, "NaturalCaRunnerCommandReceiptV1");
  assert.equal(document.properties.providerRequestCount.const, 0);
  assert.equal(document.properties.fixtureDispatchCount.const, 0);
  assert.equal(document.properties.protectedArtifactMutationCount.const, 0);
  assert.equal(document.properties.naturalItemResultCount.const, 0);
  assert.equal(document.properties.formalDecision.type, "null");
  assert.equal(document.properties.commands.items.enum.length, 12);
  assert.equal(document.not.required.includes("PASS"), true);
});
