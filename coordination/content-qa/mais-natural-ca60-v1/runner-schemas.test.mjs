import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  buildProtectedExecutionCustodyRegistryV1,
  buildProtectedExecutionCustodyRegistryV2,
  validateProtectedExecutionCustodyRegistryV1,
  validateProtectedExecutionCustodyRegistryV2,
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

test("V5 custody schema mirrors the exact nonauthorizing runner migration artifact", async () => {
  const document = await schema("ProtectedExecutionCustodyRegistryV2");
  const registry = buildProtectedExecutionCustodyRegistryV2({
    repoRoot: "/tmp/mais-natural-ca60-schema-fixture",
    designRegistrationHash: "e240f1fb1af588fb3dbf085b8f57af1c41635bdb8576be8019838d4512fa0632",
    registrationPackageRootHash: "1".repeat(64),
    runnerCommit: "2".repeat(40),
    runnerSourceManifest: [
      { path: "coordination/content-qa/mais-natural-ca60-v1/openai-reference-adapter-v5.mjs", byteLength: 42, sha256: "3".repeat(64) },
    ],
    adapterHash: "3".repeat(64),
    createdAt: "2026-08-26T01:00:00.000Z",
    previousRegistryHash: null,
  });
  assertClosedExactShape(document, registry);
  assert.equal(document.properties.designId.const, "MAIS-NATURAL-CA60-V5");
  assert.equal(document.properties.runnerCommit.pattern, "^[0-9a-f]{40}$");
  assert.equal(document.properties.v5RunnerMigrationComplete.const, true);
  assert.equal(document.properties.providerExecutionAuthorized.const, false);
  assert.equal(document.properties.aggregatePublicationAuthorized.const, false);
  assert.deepEqual(validateProtectedExecutionCustodyRegistryV2(registry, {
    repoRoot: "/tmp/mais-natural-ca60-schema-fixture",
  }), []);
});

test("pre-activation A11 review schema binds the exact V5 design package and reviewed runner roots", async () => {
  const document = await schema("IndependentDesignReviewReceiptV1");
  const body = {
    schemaVersion: "IndependentDesignReviewReceiptV1",
    designId: "MAIS-NATURAL-CA60-V5",
    designRegistrationHash: "e240f1fb1af588fb3dbf085b8f57af1c41635bdb8576be8019838d4512fa0632",
    reviewedDesignPackageRootHash: "66a78409c64d65fa8d7e0208386f2046b276de5295602261fdb41e53e08544a1",
    runnerCommit: "1".repeat(40),
    runnerHash: "2".repeat(64),
    adapterHash: "3".repeat(64),
    reviewerLane: "A11",
    decision: "CONCURRED",
    reviewedAt: "2026-08-26T01:00:00.000Z",
  };
  const receipt = { ...body, reviewHash: calculateArtifactHash(body, "reviewHash") };
  assertClosedExactShape(document, receipt);
  assert.equal(document.properties.reviewedDesignPackageRootHash.const, "66a78409c64d65fa8d7e0208386f2046b276de5295602261fdb41e53e08544a1");
  assert.equal(document.properties.runnerCommit.pattern, "^[0-9a-f]{40}$");
  assert.deepEqual(document.properties.decision.enum, ["CONCURRED", "DISCREPANCY", "UNREVIEWABLE"]);
});
