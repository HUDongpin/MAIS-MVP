import assert from "node:assert/strict";
import { chmod, mkdir, mkdtemp, readFile, rm, stat, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  calculateArtifactHash,
  sha256Hex,
  validateRunnerPersistenceProofV1,
} from "../../research/mais-natural-ca60-v1/versions/design-v4/design-contract.mjs";

async function loadSubject() {
  return import("./runner-storage.mjs");
}

async function temporaryRepo(t) {
  const root = await mkdtemp(path.join(tmpdir(), "mais-natural-ca60-storage-"));
  t.after(async () => rm(root, { recursive: true, force: true }));
  return root;
}

function sourceManifest() {
  return [
    { path: "coordination/content-qa/mais-natural-ca60-v1/cli.mjs", byteLength: 20, sha256: "1".repeat(64) },
    { path: "coordination/content-qa/mais-natural-ca60-v1/runner-storage.mjs", byteLength: 30, sha256: "2".repeat(64) },
  ];
}

function registryInput(repoRoot) {
  return {
    repoRoot,
    designRegistrationHash: "3".repeat(64),
    runnerCommit: "4".repeat(40),
    runnerSourceManifest: sourceManifest(),
    adapterHash: null,
    createdAt: "2026-08-25T14:00:00.000Z",
    previousRegistryHash: null,
  };
}

function marker(overrides = {}) {
  const body = {
    schemaVersion: "CompletedItemCommitMarkerV1",
    designId: "MAIS-NATURAL-CA60-V4",
    registrationHash: "3".repeat(64),
    sampleManifestHash: "4".repeat(64),
    referenceSealHash: "5".repeat(64),
    executionRegistrationHash: "6".repeat(64),
    itemId: "runtime-item-001",
    itemHash: "7".repeat(64),
    clusterId: "cluster-001",
    roleOrder: ["B_PRIME_CRITIQUE", "B_PRIME_REVISION"],
    attemptReceiptHashes: ["8".repeat(64), "9".repeat(64)],
    outputHashes: ["a".repeat(64), "b".repeat(64)],
    atomicWrite: true,
    fileMode: "0600",
    ...overrides,
  };
  return { ...body, markerHash: calculateArtifactHash(body, "markerHash") };
}

test("protected custody registry is closed, self-hashed, nonauthorizing, and stored at a fixed repo-local path", async (t) => {
  const subject = await loadSubject();
  const repoRoot = await temporaryRepo(t);
  const registry = subject.buildProtectedExecutionCustodyRegistryV1(registryInput(repoRoot));

  assert.deepEqual(subject.validateProtectedExecutionCustodyRegistryV1(registry, {
    repoRoot,
    designRegistrationHash: "3".repeat(64),
    runnerCommit: "4".repeat(40),
  }), []);
  assert.equal(registry.providerExecutionAuthorized, false);
  assert.equal(registry.aggregatePublicationAuthorized, false);
  assert.equal(registry.adapterHash, null);
  assert.equal(registry.runnerSourceManifest.length, 2);

  const stored = await subject.writeProtectedExecutionCustodyRegistryV1({ repoRoot, registry });
  assert.equal(stored.created, true);
  assert.equal(stored.path, path.join(repoRoot, ".local/mais-natural-ca60-v1/custody/registry.json"));
  assert.equal((await stat(stored.path)).mode & 0o777, 0o600);
  assert.deepEqual(await subject.readProtectedExecutionCustodyRegistryV1({ repoRoot }), registry);

  const repeated = await subject.writeProtectedExecutionCustodyRegistryV1({ repoRoot, registry });
  assert.equal(repeated.created, false);
  const conflict = subject.buildProtectedExecutionCustodyRegistryV1({
    ...registryInput(repoRoot),
    runnerCommit: "5".repeat(40),
  });
  await assert.rejects(
    subject.writeProtectedExecutionCustodyRegistryV1({ repoRoot, registry: conflict }),
    /conflict/iu,
  );
});

test("runner source manifest hashes only regular package-local files in deterministic path order", async (t) => {
  const subject = await loadSubject();
  const repoRoot = await temporaryRepo(t);
  const packageDirectory = path.join(repoRoot, "coordination/content-qa/mais-natural-ca60-v1");
  await mkdir(packageDirectory, { recursive: true });
  await writeFile(path.join(packageDirectory, "z.mjs"), "export const z = 1;\n", "utf8");
  await writeFile(path.join(packageDirectory, "a.mjs"), "export const a = 2;\n", "utf8");
  await writeFile(path.join(packageDirectory, "é.mjs"), "export const accented = 3;\n", "utf8");
  const manifest = await subject.buildRunnerSourceManifestV1({
    repoRoot,
    relativePaths: [
      "coordination/content-qa/mais-natural-ca60-v1/z.mjs",
      "coordination/content-qa/mais-natural-ca60-v1/a.mjs",
      "coordination/content-qa/mais-natural-ca60-v1/é.mjs",
    ],
  });
  assert.deepEqual(manifest.map((row) => row.path), [
    "coordination/content-qa/mais-natural-ca60-v1/a.mjs",
    "coordination/content-qa/mais-natural-ca60-v1/z.mjs",
    "coordination/content-qa/mais-natural-ca60-v1/é.mjs",
  ]);
  assert.equal(manifest[0].byteLength, 20);
  assert.match(manifest[0].sha256, /^[0-9a-f]{64}$/u);
  assert.deepEqual(await subject.buildRunnerSourceManifestV1({
    repoRoot,
    relativePaths: [...manifest.map((row) => row.path)].reverse(),
  }), manifest);

  await symlink(path.join(packageDirectory, "a.mjs"), path.join(packageDirectory, "link.mjs"));
  await assert.rejects(subject.buildRunnerSourceManifestV1({
    repoRoot,
    relativePaths: ["coordination/content-qa/mais-natural-ca60-v1/link.mjs"],
  }), /regular file|symbolic/iu);
  await assert.rejects(subject.buildRunnerSourceManifestV1({
    repoRoot,
    relativePaths: ["../outside.mjs"],
  }), /path|package/iu);
});

test("attempt receipt store appends a canonical chain with sequence and previous hash under mode 0600", async (t) => {
  const subject = await loadSubject();
  const repoRoot = await temporaryRepo(t);
  const store = subject.createAttemptReceiptStoreV1({ repoRoot, runId: "run-001" });

  const first = await store.append({
    schemaVersion: "RunnerAttemptEnvelopeV1",
    runId: "run-001",
    attemptId: "attempt-001",
    role: "A_SOLVE",
    redactedError: null,
  });
  const second = await store.append({
    schemaVersion: "RunnerAttemptEnvelopeV1",
    runId: "run-001",
    attemptId: "attempt-002",
    role: "A_LABEL",
    redactedError: "NETWORK_FAILURE_REDACTED",
  });

  assert.equal(first.sequenceNumber, 1);
  assert.equal(first.previousReceiptHash, null);
  assert.equal(second.sequenceNumber, 2);
  assert.equal(second.previousReceiptHash, first.selfHash);
  assert.equal((await stat(store.path)).mode & 0o777, 0o600);
  assert.deepEqual((await store.validate()).errors, []);
  assert.deepEqual(await store.read(), [first, second]);
});

test("protected artifacts fail closed after their file mode is weakened", async (t) => {
  const subject = await loadSubject();
  const repoRoot = await temporaryRepo(t);
  const registry = subject.buildProtectedExecutionCustodyRegistryV1(registryInput(repoRoot));
  const stored = await subject.writeProtectedExecutionCustodyRegistryV1({ repoRoot, registry });
  await chmod(stored.path, 0o644);
  await assert.rejects(
    subject.readProtectedExecutionCustodyRegistryV1({ repoRoot }),
    /mode is not 0600/iu,
  );

  const store = subject.createAttemptReceiptStoreV1({ repoRoot, runId: "run-mode-check" });
  await store.append({
    schemaVersion: "RunnerAttemptEnvelopeV1",
    runId: "run-mode-check",
    attemptId: "attempt-001",
    role: "A_SOLVE",
    redactedError: null,
  });
  await chmod(store.path, 0o644);
  assert.match((await store.validate()).errors.join("\n"), /mode is not 0600/iu);
});

test("attempt receipt chain detects byte tampering and refuses ambiguous trailing data", async (t) => {
  const subject = await loadSubject();
  const repoRoot = await temporaryRepo(t);
  const store = subject.createAttemptReceiptStoreV1({ repoRoot, runId: "run-002" });
  await store.append({
    schemaVersion: "RunnerAttemptEnvelopeV1",
    runId: "run-002",
    attemptId: "attempt-001",
    role: "B_SOLVE",
    redactedError: null,
  });

  const original = await readFile(store.path, "utf8");
  await writeFile(store.path, original.replace("B_SOLVE", "A_SOLVE"), "utf8");
  assert.match((await store.validate()).errors.join("\n"), /self hash/iu);

  await writeFile(store.path, `${original}{`, "utf8");
  assert.match((await store.validate()).errors.join("\n"), /incomplete|parse/iu);
});

test("attempt persistence rejects secret-bearing fields and does not create a receipt", async (t) => {
  const subject = await loadSubject();
  const repoRoot = await temporaryRepo(t);
  const store = subject.createAttemptReceiptStoreV1({ repoRoot, runId: "run-003" });

  await assert.rejects(store.append({
    schemaVersion: "RunnerAttemptEnvelopeV1",
    runId: "run-003",
    attemptId: "attempt-001",
    role: "A_SOLVE",
    apiKey: "sk-this-is-a-secret-sentinel",
  }), /secret/iu);
  assert.deepEqual(await store.read(), []);
});

test("completed-item marker is atomic and idempotent but conflicting bytes fail closed", async (t) => {
  const subject = await loadSubject();
  const repoRoot = await temporaryRepo(t);
  const first = marker();
  const created = await subject.writeCompletedItemCommitMarkerV1({ repoRoot, runId: "run-004", marker: first });
  assert.equal(created.created, true);
  assert.equal((await stat(created.path)).mode & 0o777, 0o600);

  const repeated = await subject.writeCompletedItemCommitMarkerV1({ repoRoot, runId: "run-004", marker: first });
  assert.equal(repeated.created, false);

  const changed = marker({ outputHashes: ["c".repeat(64), "d".repeat(64)] });
  await assert.rejects(
    subject.writeCompletedItemCommitMarkerV1({ repoRoot, runId: "run-004", marker: changed }),
    /conflict/iu,
  );
});

test("runner persistence proof is the exact V4 closed artifact and fails after field drift", async () => {
  const subject = await loadSubject();
  const proof = subject.buildRunnerPersistenceProofV1({
    appendOnlyTestPassed: true,
    atomicRenameTestPassed: true,
    fileModeObserved: "0600",
    fileStatTestPassed: true,
    fsyncFileTestPassed: true,
    fsyncDirectoryTestPassed: true,
    secretSentinelAbsent: true,
    rawErrorSentinelAbsent: true,
    testCommandHash: sha256Hex("runner-storage.test.mjs"),
    fixtureRootHash: sha256Hex("fixture-root"),
  });
  assert.deepEqual(validateRunnerPersistenceProofV1(proof), []);
  assert.notEqual(proof.proofHash, undefined);
  assert.notDeepEqual(validateRunnerPersistenceProofV1({ ...proof, appendOnlyTestPassed: false }), []);
});

test("unsafe run IDs and roots outside the fixed protected package are rejected", async (t) => {
  const subject = await loadSubject();
  const repoRoot = await temporaryRepo(t);
  assert.throws(() => subject.createAttemptReceiptStoreV1({ repoRoot, runId: "../escape" }), /runId/iu);
  assert.throws(() => subject.protectedPathsV1("relative/path"), /absolute/iu);
  await chmod(repoRoot, 0o700);
});
