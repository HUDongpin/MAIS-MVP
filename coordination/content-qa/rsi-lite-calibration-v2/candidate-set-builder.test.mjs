import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

async function subject() {
  return import("./candidate-set-builder.mjs");
}

const TEST_SEED = "MAIS-RSI-LITE-V2-CANDIDATE-TEST-SEED-20260824";

test("builds 24 matched triplets with 72 frozen packages and the 168-call core allocation", async () => {
  const { buildV2CandidateSet, auditV2CandidateSet } = await subject();
  const candidate = buildV2CandidateSet({ masterSeed: TEST_SEED, itemsPerPackage: 80 });

  assert.equal(candidate.sealedManifest.latentBundles.length, 24);
  assert.equal(candidate.sealedManifest.packageAssignments.length, 72);
  assert.equal(candidate.packages.length, 72);
  assert.deepEqual(candidate.publicManifest.counts, {
    independentClusters: 24,
    packages: 72,
    questions: 5_760,
    lessons: 144,
    browserRoutes: 0,
    coreSuccessfulProviderCalls: 168
  });
  assert.deepEqual(
    Object.fromEntries(["A_PRIME", "B_PRIME", "C0_PRIME"].map((arm) => [
      arm,
      candidate.sealedManifest.packageAssignments.filter((row) => row.arm === arm).length
    ])),
    { A_PRIME: 24, B_PRIME: 24, C0_PRIME: 24 }
  );
  assert.equal(candidate.sealedManifest.packageAssignments.some((row) => row.arm === "C" || row.arm === "C_PRIME"), false);
  assert.deepEqual(auditV2CandidateSet(candidate), []);
});

test("keeps each triplet isomorphic and every induced defect matched across all three arms", async () => {
  const { buildV2CandidateSet } = await subject();
  const candidate = buildV2CandidateSet({ masterSeed: TEST_SEED, itemsPerPackage: 80 });

  for (const bundle of candidate.sealedManifest.latentBundles) {
    const assignments = candidate.sealedManifest.packageAssignments.filter((row) => row.latentBundleId === bundle.id);
    assert.equal(assignments.length, 3);
    assert.equal(new Set(assignments.map((row) => row.variantId)).size, 3);
    assert.deepEqual(assignments.map((row) => row.arm).sort(), ["A_PRIME", "B_PRIME", "C0_PRIME"]);
    const packageRows = assignments.map((assignment) => candidate.packages.find((row) => row.packageId === assignment.packageId));
    for (let index = 0; index < 80; index += 1) {
      const contracts = packageRows.map((row) => row.content.questions[index].homologyContract);
      assert.deepEqual(contracts.slice(1), [contracts[0], contracts[0]], `${bundle.id}:${index}`);
      assert.ok(packageRows.every((row) => typeof row.content.questions[index].type === "string"));
    }
  }

  assert.equal(candidate.goldLedger.latentDefects.length, 108);
  assert.equal(candidate.goldLedger.instances.length, 324);
  for (const [latentDefectId, instances] of Map.groupBy(candidate.goldLedger.instances, (row) => row.latentDefectId)) {
    assert.equal(instances.length, 3, latentDefectId);
    assert.deepEqual(instances.map((row) => row.arm).sort(), ["A_PRIME", "B_PRIME", "C0_PRIME"]);
    assert.ok(instances.every((row) => row.acceptedCodes.length === 1));
  }
});

test("keeps arm, gold, seed, and defect assignment out of public package content", async () => {
  const { buildV2CandidateSet } = await subject();
  const candidate = buildV2CandidateSet({ masterSeed: TEST_SEED, itemsPerPackage: 80 });
  const forbidden = new Set(["arm", "latentBundleId", "defectBlock", "gold", "goldLedger", "seed", "masterSeed"]);
  const collectKeys = (value, into = []) => {
    if (Array.isArray(value)) value.forEach((row) => collectKeys(row, into));
    else if (value && typeof value === "object") Object.entries(value).forEach(([key, child]) => {
      into.push(key);
      collectKeys(child, into);
    });
    return into;
  };

  assert.equal(collectKeys(candidate.publicManifest).some((key) => forbidden.has(key)), false);
  for (const row of candidate.packages) {
    assert.equal(collectKeys(row.content).some((key) => forbidden.has(key)), false, row.packageId);
    assert.equal(row.content.protocolId, "MAIS-RSI-LITE-CAL-V2");
    assert.equal(row.content.protocolVersion, "2.0.0-candidate");
  }
});

test("is deterministic for one master seed and changes commitments for another", async () => {
  const { buildV2CandidateSet } = await subject();
  const first = buildV2CandidateSet({ masterSeed: TEST_SEED, itemsPerPackage: 80 });
  const second = buildV2CandidateSet({ masterSeed: TEST_SEED, itemsPerPackage: 80 });
  const changed = buildV2CandidateSet({ masterSeed: `${TEST_SEED}-changed`, itemsPerPackage: 80 });

  assert.equal(first.candidateSetSha256, second.candidateSetSha256);
  assert.equal(first.seedCommitmentSha256, second.seedCommitmentSha256);
  assert.notEqual(first.candidateSetSha256, changed.candidateSetSha256);
  assert.notEqual(first.seedCommitmentSha256, changed.seedCommitmentSha256);
});

test("atomically writes a mode-protected frozen candidate set and verifies an idempotent reopen", async () => {
  const { buildV2CandidateSet, writeFrozenV2CandidateSet } = await subject();
  const candidate = buildV2CandidateSet({ masterSeed: TEST_SEED, itemsPerPackage: 80 });
  const parent = await mkdtemp(path.join(os.tmpdir(), "mais-v2-candidate-test-"));
  const outputRoot = path.join(parent, "candidate-set");
  try {
    const first = await writeFrozenV2CandidateSet({ candidate, outputRoot });
    const second = await writeFrozenV2CandidateSet({ candidate, outputRoot });
    assert.equal(first.candidateSetSha256, candidate.candidateSetSha256);
    assert.deepEqual(second, first);
    assert.equal(first.packageFileCount, 72);
    assert.match(first.receiptSha256, /^[a-f0-9]{64}$/);
    assert.equal((await stat(outputRoot)).mode & 0o777, 0o700);
    assert.equal((await stat(path.join(outputRoot, "sealed-manifest.json"))).mode & 0o777, 0o600);
    assert.equal((await stat(path.join(outputRoot, "packages", `${candidate.packages[0].packageId}.json`))).mode & 0o777, 0o600);
    const stored = JSON.parse(await readFile(path.join(outputRoot, "BUNDLE-READINESS.json"), "utf8"));
    assert.equal(stored.receiptSha256, first.receiptSha256);
    assert.equal(stored.formalExecutionAuthorized, false);
    assert.equal(stored.liveProviderAuthorized, false);
  } finally {
    await rm(parent, { recursive: true, force: true });
  }
});
