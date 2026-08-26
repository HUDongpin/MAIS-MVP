import assert from "node:assert/strict";
import { execFile as execFileCallback } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";

import {
  PromotionGateError,
  assertSafeRepoRelativePath,
  assertSnapshotsEqual,
  fingerprint,
  parseCanonicalJsonBytes,
  readAuthoritativeFile,
  sha256,
  stableJson
} from "../promotion-gate-lib.mjs";
import { parseV2CommandLine } from "./promotion-gate-v2.mjs";
import {
  PROMOTION_V2_CANDIDATE,
  PROMOTION_V2_CHECKER_BUNDLE_PATHS,
  PROMOTION_V2_CHECKER_VERSION,
  PROMOTION_V2_REQUIRED_CHECK_IDS,
  attachV2ReceiptDigests,
  buildV2ShadowDtos,
  collectV2BaselineProof,
  collectV2CheckerReleaseProof,
  collectV2ExternalSideEffectProof,
  computeV2EvidenceSemanticDigest,
  evaluateV2AcceptedAnswer,
  loadV2Candidate,
  rehearseV2ShadowOutputs,
  validateV2ContentSemantics,
  validateV2Evidence,
  validateV2Manifest
} from "./promotion-gate-v2-lib.mjs";

const execFile = promisify(execFileCallback);

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../../..");
const pilotRoot = "coordination/integration/pilots/us-ca-math-rag-v2-g6-ratios-v2/attempt-002";
const manifestPath = "coordination/integration/pilots/us-ca-math-rag-v2-g6-ratios-v2/attempt-005/promotion-manifest.v2.json";
const workflowPath = path.join(repoRoot, ".github/workflows/promotion-shadow.yml");

async function readJson(relativePath) {
  const loaded = await readAuthoritativeFile(repoRoot, relativePath);
  return parseCanonicalJsonBytes(loaded.bytes, "TEST_JSON_INVALID", relativePath);
}

async function readWorkflowManifestPath() {
  const workflowSource = await readFile(workflowPath, "utf8");
  const match = workflowSource.match(/^\s*PROMOTION_MANIFEST:\s+([^\s]+)\s*$/mu);
  assert.ok(match, "Promotion Shadow workflow must declare PROMOTION_MANIFEST");
  return match[1];
}

async function loadCandidateFixture() {
  const records = [];
  for (const [index, binding] of PROMOTION_V2_CANDIDATE.artifacts.entries()) {
    const loaded = await readAuthoritativeFile(repoRoot, binding.path);
    const value = parseCanonicalJsonBytes(loaded.bytes, "TEST_JSON_INVALID", binding.path);
    records.push({
      index,
      binding: {
        ...binding,
        rawFileSha256: loaded.rawSha256,
        recordSha256: fingerprint(value)
      },
      loaded,
      value
    });
  }
  const candidatePackage = await readJson(PROMOTION_V2_CANDIDATE.packagePath);
  const aggregateArtifacts = records.map(({ binding }) => ({
    kind: binding.kind,
    id: binding.id,
    path: binding.path,
    rawFileSha256: binding.rawFileSha256,
    recordSha256: binding.recordSha256
  }));
  return {
    candidatePackage,
    records,
    aggregateArtifacts,
    candidateDigest: fingerprint({
      packageId: candidatePackage.packageId,
      candidateVersion: candidatePackage.candidateVersion,
      artifacts: aggregateArtifacts
    })
  };
}

async function loadEvidenceFixture() {
  const files = {
    A18: `${pilotRoot}/inputs/evidence/a18-independent-qa.v2.1.json`,
    A04: `${pilotRoot}/inputs/evidence/a04-practice-semantics.v2.1.json`,
    A05: `${pilotRoot}/inputs/evidence/a05-lesson-semantics.v2.1.json`,
    A24: `${pilotRoot}/inputs/evidence/a24-exact-layer.v2.1.json`
  };
  const entries = await Promise.all(Object.entries(files).map(async ([role, relativePath]) => [role, await readJson(relativePath)]));
  return new Map(entries);
}

test("new v2 candidate has a fresh immutable identity and aggregate digest", async () => {
  const candidate = await loadCandidateFixture();
  assert.equal(candidate.candidatePackage.supersedesAttempt.attemptId, "attempt-001");
  assert.equal(candidate.candidatePackage.supersedesAttempt.disposition, "repair_required");
  assert.equal(candidate.candidatePackage.supersedesAttempt.reuseReceipt, false);
  assert.equal(candidate.candidateDigest, "c83c47392c79256ee47726dafe3c53b72e5e7454edcb313a421eb3b32066cbf6");
  assert.deepEqual(candidate.records.map(({ value }) => value.id), [
    "ca-rag-v2-cluster-grade-6-6-rp-ratios-v2",
    "s04-ca-rag-v2-q031-6-rp-ratios-v2",
    "s05-ca-rag-v2-lesson-031-6-rp-ratios-v2"
  ]);
});

test("content QA proves exact ratio math, standards boundaries, lesson alignment, and localization blocker", async () => {
  const candidate = await loadCandidateFixture();
  const proof = validateV2ContentSemantics(candidate, await loadEvidenceFixture());
  assert.equal(proof.numericOracle, 12);
  assert.deepEqual(proof.clusterStandards, ["6.RP.1", "6.RP.2", "6.RP.3"]);
  assert.deepEqual(proof.directlyAssessedStandards, ["6.RP.3"]);
  assert.equal(proof.ratioOrderPreserved, true);
  assert.equal(proof.localizationStatus, "blocked-for-live");
  assert.deepEqual(proof.exactLayerFieldPaths, []);
  assert.equal(proof.liveAllowed, false);
});

test("content validation reports missing mappings and never supplies defaults", async () => {
  const candidate = await loadCandidateFixture();
  const evidence = await loadEvidenceFixture();
  const missingDomain = {
    ...candidate,
    records: candidate.records.map((entry) =>
      entry.binding.kind === "safe-card"
        ? { ...entry, value: { ...entry.value, domainIds: undefined } }
        : entry
    )
  };
  assert.throws(
    () => validateV2ContentSemantics(missingDomain, evidence),
    (error) => error instanceof PromotionGateError && error.code === "V2_SAFE_CARD_INVALID"
  );
  const wrongAnswer = {
    ...candidate,
    records: candidate.records.map((entry) =>
      entry.binding.kind === "practice"
        ? { ...entry, value: { ...entry.value, answer: "20 cups" } }
        : entry
    )
  };
  assert.throws(
    () => validateV2ContentSemantics(wrongAnswer, evidence),
    (error) => error instanceof PromotionGateError && error.code === "V2_PRACTICE_MATH_INVALID"
  );
});

test("accepted-answer policy is exact and never fuzzy", async () => {
  const candidate = await loadCandidateFixture();
  const practice = candidate.records.find(({ binding }) => binding.kind === "practice").value;
  assert.equal(evaluateV2AcceptedAnswer(practice, "12"), true);
  assert.equal(evaluateV2AcceptedAnswer(practice, " 12 cups "), true);
  assert.equal(evaluateV2AcceptedAnswer(practice, "12.0"), false);
  assert.equal(evaluateV2AcceptedAnswer(practice, "twelve"), false);
  assert.equal(evaluateV2AcceptedAnswer(practice, "about 12"), false);
  assert.equal(evaluateV2AcceptedAnswer(practice, "12 CUPS"), false);
});

test("shadow adapter explicitly maps safe-card to standards and preserves compatibility metadata", async () => {
  const outputs = buildV2ShadowDtos(await loadCandidateFixture());
  assert.deepEqual(outputs.map(({ dto }) => dto.schemaVersion), [
    "shadow-standards-dto.v2",
    "shadow-practice-dto.v2",
    "shadow-lesson-dto.v2",
    "shadow-compatibility-report.v2"
  ]);
  assert.equal(outputs[0].dto.category, "standards");
  assert.equal(outputs[0].dto.mappingMode, "explicit-shadow-only");
  assert.deepEqual(outputs[0].dto.compatibilityMetadata.canonicalStandardIds, ["6.RP.1", "6.RP.2", "6.RP.3"]);
  assert.deepEqual(outputs[0].dto.compatibilityMetadata.maisStandardIds, [
    "CA.CCSS.Math.G6.RP.1",
    "CA.CCSS.Math.G6.RP.2",
    "CA.CCSS.Math.G6.RP.3"
  ]);
  assert.equal(outputs[0].dto.compatibilityMetadata.runtimeDisposition, "preserved-outside-runtime");
  assert.deepEqual(outputs[3].dto.defaultsUsed, []);
  assert.ok(outputs.every(({ dto }) => dto.liveAllowed === false));
});

test("evidence currentness digest excludes time but binds all semantic inputs", async () => {
  const evidence = {
    ...await readJson(`${pilotRoot}/inputs/evidence/a18-independent-qa.v2.1.json`),
    checkerVersion: PROMOTION_V2_CHECKER_VERSION
  };
  validateV2Evidence(evidence);
  const digest = computeV2EvidenceSemanticDigest(evidence);
  assert.equal(digest, computeV2EvidenceSemanticDigest({ ...evidence, producedAt: "2030-01-01T00:00:00Z" }));
  assert.notEqual(digest, computeV2EvidenceSemanticDigest({ ...evidence, candidateDigest: "0".repeat(64) }));
  assert.notEqual(digest, computeV2EvidenceSemanticDigest({ ...evidence, targetBaselineCommit: "0".repeat(40) }));
  assert.notEqual(digest, computeV2EvidenceSemanticDigest({ ...evidence, checkerVersion: "promotion-gate-shadow-v3" }));
});

test("A24 not_applicable requires a substantive machine-readable rationale", async () => {
  const evidence = {
    ...await readJson(`${pilotRoot}/inputs/evidence/a24-exact-layer.v2.1.json`),
    checkerVersion: PROMOTION_V2_CHECKER_VERSION
  };
  validateV2Evidence(evidence);
  assert.throws(
    () => validateV2Evidence({ ...evidence, semanticPayload: { ...evidence.semanticPayload, rationale: "none" } }),
    (error) => error instanceof PromotionGateError && error.code === "V2_A24_DISPOSITION_MISSING"
  );
});

test("repository-relative path contract rejects absolute, traversal, NUL, and Windows separators", () => {
  for (const unsafe of ["/tmp/x", "../x", "safe/../../x", "safe\0x", "safe\\x"]) {
    assert.throws(() => assertSafeRepoRelativePath(unsafe), PromotionGateError);
  }
  assert.equal(assertSafeRepoRelativePath("coordination/integration/v2/example.json"), "coordination/integration/v2/example.json");
});

test("authoritative reads reject a symlink escape", async () => {
  const fixtureRoot = await mkdtemp(path.join(os.tmpdir(), "promotion-v2-symlink-fixture-"));
  const outsideRoot = await mkdtemp(path.join(os.tmpdir(), "promotion-v2-symlink-outside-"));
  try {
    await mkdir(path.join(fixtureRoot, "safe"));
    await writeFile(path.join(outsideRoot, "secret.json"), "{}\n", { flag: "wx" });
    await symlink(path.join(outsideRoot, "secret.json"), path.join(fixtureRoot, "safe", "escape.json"));
    await assert.rejects(
      () => readAuthoritativeFile(fixtureRoot, "safe/escape.json"),
      (error) => error instanceof PromotionGateError && error.code === "AUTHORITATIVE_PATH_UNSAFE"
    );
  } finally {
    await rm(fixtureRoot, { recursive: true, force: true });
    await rm(outsideRoot, { recursive: true, force: true });
  }
});

test("source and forbidden-path snapshot drift fails closed", () => {
  const before = {
    schemaVersion: "promotion-source-snapshot.v1",
    files: [{ path: "data/live.json", rawSha256: "a".repeat(64) }],
    digest: "b".repeat(64)
  };
  const after = {
    schemaVersion: "promotion-source-snapshot.v1",
    files: [{ path: "data/live.json", rawSha256: "c".repeat(64) }],
    digest: "d".repeat(64)
  };
  assert.throws(
    () => assertSnapshotsEqual(before, after, "V2_FORBIDDEN_PATH_MUTATION"),
    (error) => error instanceof PromotionGateError && error.code === "V2_FORBIDDEN_PATH_MUTATION"
  );
});

test("baseline proof permits test-only drift and blocks runtime drift", async () => {
  const fixtureRoot = await mkdtemp(path.join(os.tmpdir(), "promotion-v2-baseline-fixture-"));
  const git = (...args) => execFile("git", args, { cwd: fixtureRoot });
  try {
    await git("init", "--quiet");
    await git("config", "user.name", "Promotion Gate Test");
    await git("config", "user.email", "promotion-gate-test@example.invalid");
    await mkdir(path.join(fixtureRoot, "data"));
    await writeFile(path.join(fixtureRoot, "data/live.ts"), "export const live = 1;\n", { flag: "wx" });
    await git("add", "--", "data/live.ts");
    await git("commit", "--quiet", "-m", "baseline");
    const { stdout: baselineStdout } = await git("rev-parse", "HEAD");
    const targetBaselineCommit = baselineStdout.trim();

    await writeFile(path.join(fixtureRoot, "data/live.test.ts"), "export const testOnly = true;\n", { flag: "wx" });
    await git("add", "--", "data/live.test.ts");
    await git("commit", "--quiet", "-m", "test-only");
    const { stdout: testOnlyStdout } = await git("rev-parse", "HEAD");
    const testOnlyProof = await collectV2BaselineProof(
      fixtureRoot,
      { targetBaselineCommit },
      testOnlyStdout.trim()
    );
    assert.equal(testOnlyProof.observedChangedPathCount, 1);
    assert.equal(testOnlyProof.allowedTestOnlyPathCount, 1);
    assert.equal(testOnlyProof.runtimeChangedPathCount, 0);

    await writeFile(path.join(fixtureRoot, "data/live.ts"), "export const live = 2;\n");
    await git("add", "--", "data/live.ts");
    await git("commit", "--quiet", "-m", "runtime-drift");
    const { stdout: runtimeStdout } = await git("rev-parse", "HEAD");
    await assert.rejects(
      () => collectV2BaselineProof(fixtureRoot, { targetBaselineCommit }, runtimeStdout.trim()),
      (error) => error instanceof PromotionGateError && error.code === "V2_TARGET_BASELINE_DRIFT"
    );
  } finally {
    await rm(fixtureRoot, { recursive: true, force: true });
  }
});

test("CLI exposes only validate, shadow, and verify-receipt", () => {
  assert.equal(parseV2CommandLine(["validate", "--manifest", "x.json", "--json"]).command, "validate");
  assert.equal(parseV2CommandLine(["shadow", "--manifest", "x.json", "--run-id", "run-1", "--json"]).command, "shadow");
  assert.equal(parseV2CommandLine(["verify-receipt", "--receipt", "x.json", "--json"]).command, "verify-receipt");
  for (const command of ["preview", "deploy", "promote-live", "live", "vercel", "shadow-live"]) {
    assert.throws(() => parseV2CommandLine([command, "--json"]), PromotionGateError);
  }
  assert.throws(
    () => parseV2CommandLine(["shadow", "--manifest", "x.json", "--run-id", "r", "--command", "rm", "--json"]),
    PromotionGateError
  );
});

test("semantic Receipt digest ignores run metadata while raw digest remains unique", () => {
  const base = {
    schemaVersion: "promotion-receipt.v2",
    run: { runId: "run-a", producedAt: "2026-08-26T00:00:00Z", ciMetadata: null },
    result: "pass",
    binding: { candidateDigest: "a".repeat(64), liveAllowed: false }
  };
  const first = attachV2ReceiptDigests(base);
  const second = attachV2ReceiptDigests({
    ...base,
    run: { runId: "run-b", producedAt: "2026-08-27T00:00:00Z", ciMetadata: { job: "2" } }
  });
  assert.equal(first.semanticReceiptDigest, second.semanticReceiptDigest);
  assert.notEqual(first.rawReceiptDigest, second.rawReceiptDigest);
});

test("semantic Receipt digest normalizes safe host temp paths while raw proof remains exact", () => {
  const externalProofA = {
    schemaVersion: "promotion-external-side-effect-proof.v2",
    policy: "read-only-git-local-temp-only.v2",
    checkerBundleDigest: "a".repeat(64),
    registeredOperations: ["create-new-os-temp-root"],
    sourceBindings: [],
    sourceBindingsDigest: "b".repeat(64),
    tempEnvironment: [
      {
        name: "node-os-tmpdir",
        canonicalPathDigest: "c".repeat(64),
        outsideRepository: true
      },
      {
        name: "TMPDIR",
        canonicalPathDigest: "c".repeat(64),
        outsideRepository: true
      }
    ],
    networkRequestCount: 0,
    providerCallCount: 0,
    databaseWriteCount: 0,
    deploymentCommandCount: 0,
    productionWriteCount: 0,
    liveRegistryWriteCount: 0,
    digest: "d".repeat(64)
  };
  const externalProofB = {
    ...externalProofA,
    tempEnvironment: [
      {
        name: "node-os-tmpdir",
        canonicalPathDigest: "e".repeat(64),
        outsideRepository: true
      }
    ],
    digest: "f".repeat(64)
  };
  const base = {
    schemaVersion: "promotion-receipt.v2",
    run: { runId: "run-a", producedAt: "2026-08-26T00:00:00Z", ciMetadata: null },
    result: "pass",
    binding: { candidateDigest: "a".repeat(64), liveAllowed: false },
    externalSideEffectProof: externalProofA,
    checks: [
      {
        id: "external-side-effects-v2",
        result: "pass",
        details: { proofDigest: externalProofA.digest, externalSideEffectCount: 0 },
        digest: "1".repeat(64)
      }
    ]
  };
  const first = attachV2ReceiptDigests(base);
  const second = attachV2ReceiptDigests({
    ...base,
    externalSideEffectProof: externalProofB,
    checks: [
      {
        id: "external-side-effects-v2",
        result: "pass",
        details: { proofDigest: externalProofB.digest, externalSideEffectCount: 0 },
        digest: "2".repeat(64)
      }
    ]
  });
  const unsafe = attachV2ReceiptDigests({
    ...base,
    externalSideEffectProof: {
      ...externalProofA,
      tempEnvironment: externalProofA.tempEnvironment.map((entry, index) =>
        index === 0 ? { ...entry, outsideRepository: false } : entry
      )
    }
  });

  assert.equal(first.semanticReceiptDigest, second.semanticReceiptDigest);
  assert.notEqual(first.rawReceiptDigest, second.rawReceiptDigest);
  assert.notEqual(first.semanticReceiptDigest, unsafe.semanticReceiptDigest);
});

test("shadow output creation rejects target collisions and case collisions, then removes its owned temp root", async () => {
  const collisionRoot = await mkdtemp(path.join(os.tmpdir(), "promotion-shadow-v2-"));
  try {
    await assert.rejects(
      () => rehearseV2ShadowOutputs(repoRoot, [{ path: "one.json", dto: { schemaVersion: "one" } }], { tempRoot: collisionRoot }),
      (error) => error instanceof PromotionGateError && error.code === "V2_TEMP_ROOT_CREATION_COLLISION"
    );
  } finally {
    await rm(collisionRoot, { recursive: true, force: true });
  }
  await assert.rejects(
    () => rehearseV2ShadowOutputs(repoRoot, [
      { path: "A.json", dto: { schemaVersion: "one" } },
      { path: "a.json", dto: { schemaVersion: "two" } }
    ]),
    (error) => error instanceof PromotionGateError && error.code === "V2_OUTPUT_PATH_COLLISION"
  );
  for (const unsafeOutputPath of ["../escape.json", "/tmp/escape.json", "safe\\escape.json", "safe\0escape.json"]) {
    await assert.rejects(
      () => rehearseV2ShadowOutputs(repoRoot, [
        { path: unsafeOutputPath, dto: { schemaVersion: "unsafe" } }
      ]),
      PromotionGateError
    );
  }
});

test("isolated output rehearsal restores the exact absent preimage", async () => {
  const outputs = buildV2ShadowDtos(await loadCandidateFixture());
  const proof = await rehearseV2ShadowOutputs(repoRoot, outputs);
  assert.equal(proof.isolationProof.outputCount, 4);
  assert.equal(proof.isolationProof.repositoryWriteCount, 0);
  assert.equal(proof.rollbackProof.preimage, "absent");
  assert.equal(proof.rollbackProof.postimage, "absent");
  assert.equal(proof.rollbackProof.exactPreimageRestored, true);
});

test("checker bundle has no receipt, mutable manifest, package script, or release ledger", () => {
  assert.equal(new Set(PROMOTION_V2_CHECKER_BUNDLE_PATHS).size, PROMOTION_V2_CHECKER_BUNDLE_PATHS.length);
  assert.ok(PROMOTION_V2_CHECKER_BUNDLE_PATHS.every((bundlePath) =>
    !/(?:receipt|promotion-manifest\.v2|checker-releases\.v2|package(?:-lock)?\.json)$/u.test(bundlePath)
  ));
});

test("workflow-selected real Manifest has an executable immutable checker release", async (t) => {
  const activeManifestPath = await readWorkflowManifestPath();
  let manifest;
  try {
    manifest = await readJson(activeManifestPath);
  } catch (error) {
    if (error?.code === "AUTHORITATIVE_PATH_MISSING") {
      return t.skip("active Manifest is frozen after the checker release commit");
    }
    throw error;
  }
  const { stdout } = await execFile("git", ["rev-parse", "HEAD"], { cwd: repoRoot });
  const proof = await collectV2CheckerReleaseProof(repoRoot, manifest, stdout.trim());
  assert.equal(proof.version, manifest.checkerVersion);
  assert.equal(proof.releaseCommit, manifest.checkerRelease.releaseCommit);
  assert.equal(proof.bundleDigest, manifest.checkerRelease.bundleDigest);
});

test("checker capability proof permits only local read-only Git and owned temp output", async () => {
  const proof = await collectV2ExternalSideEffectProof(repoRoot, {
    checkerRelease: { bundleDigest: "a".repeat(64) }
  });
  assert.equal(proof.networkRequestCount, 0);
  assert.equal(proof.providerCallCount, 0);
  assert.equal(proof.databaseWriteCount, 0);
  assert.equal(proof.deploymentCommandCount, 0);
  assert.equal(proof.productionWriteCount, 0);
});

test("attempt-001 and its original candidate source bytes remain immutable", async () => {
  const expected = new Map([
    ["coordination/integration/pilots/us-ca-math-rag-v2-g6-ratios-v1/promotion-manifest.v1.json", "7bcb27d6b9604a1dd4c41f75fba18718b03a7d97046f44923790aa7f207943bc"],
    ["coordination/integration/pilots/us-ca-math-rag-v2-g6-ratios-v1/shadow-receipt.v1.json", "04c83d2b44fd0ec1daf588b7b28509c6a193eee539d99be09a5dc7420ee8e668"],
    ["coordination/integration/pilots/us-ca-math-rag-v2-g6-ratios-v1/attempt-disposition.v1.json", "a9de500e46aca1b9c9d6be100838d39e35d90e3b3cc57b0d8764a9f1dded9fc1"],
    ["coordination/content-qa/us-ca-math-rag-v2-candidate/safe-card-drafts.json", "55dbd69f3155c395800ae7ab5f756e9ffc46ebfb749aa5da8bde665f98d7becb"],
    ["coordination/content-qa/us-ca-math-rag-v2-candidate/s04-question-candidate-pack.json", "e86451098fce936f00b804ba8247486e3fb0bb7be80c5833ed6e9035f9b2ae50"],
    ["coordination/content-qa/us-ca-math-rag-v2-candidate/s05-lesson-candidate-pack.json", "5904f83d47620749c97fa2471029e7d0c56d41cdefa5f57649f78d7131e23de3"]
  ]);
  for (const [relativePath, digest] of expected) {
    assert.equal(sha256(await readFile(path.join(repoRoot, relativePath))), digest, relativePath);
  }
});

test("pure Manifest validation rejects currentness drift before evidence I/O", async () => {
  const previous = await readJson(`${pilotRoot}/promotion-manifest.v2.json`);
  const manifest = {
    ...previous,
    attemptId: "attempt-005",
    checkerVersion: PROMOTION_V2_CHECKER_VERSION,
    checkerRelease: {
      ...previous.checkerRelease,
      version: PROMOTION_V2_CHECKER_VERSION
    },
    evidenceBindings: previous.evidenceBindings.map((entry) => ({
      ...entry,
      currentness: {
        ...entry.currentness,
        checkerVersion: PROMOTION_V2_CHECKER_VERSION
      }
    }))
  };
  validateV2Manifest(manifest);
  assert.throws(
    () => validateV2Manifest({
      ...manifest,
      evidenceBindings: manifest.evidenceBindings.map((entry, index) =>
        index === 0
          ? { ...entry, currentness: { ...entry.currentness, targetBaselineCommit: "0".repeat(40) } }
          : entry
      )
    }),
    (error) => error instanceof PromotionGateError && error.code === "V2_EVIDENCE_BINDING_MISMATCH"
  );
});

test("real manifest is exact and fail-closed when present", async (t) => {
  let manifest;
  try {
    manifest = await readJson(manifestPath);
  } catch (error) {
    if (error?.code === "AUTHORITATIVE_PATH_MISSING") return t.skip("manifest is added after checker release freeze");
    throw error;
  }
  validateV2Manifest(manifest);
  const candidate = await loadV2Candidate(repoRoot, manifest);
  assert.equal(candidate.candidateDigest, manifest.candidateDigest);
  assert.deepEqual(manifest.allowlistedCheckIds, PROMOTION_V2_REQUIRED_CHECK_IDS);
  assert.throws(() => validateV2Manifest({ ...manifest, schemaVersion: "promotion-manifest.v3" }), PromotionGateError);
  assert.throws(() => validateV2Manifest({ ...manifest, command: "echo unsafe" }), PromotionGateError);
  assert.throws(() => validateV2Manifest({
    ...manifest,
    authorizations: { ...manifest.authorizations, liveAllowed: true }
  }), PromotionGateError);
  assert.throws(() => validateV2Manifest({
    ...manifest,
    lifecycle: { ...manifest.lifecycle, currentState: "candidate_hold" }
  }), PromotionGateError);
  assert.throws(() => validateV2Manifest({
    ...manifest,
    allowlistedCheckIds: [...manifest.allowlistedCheckIds, "unknown-check"]
  }), PromotionGateError);
  assert.throws(() => validateV2Manifest({
    ...manifest,
    evidenceBindings: manifest.evidenceBindings.map((entry, index) =>
      index === 1 ? { ...entry, evidencePath: manifest.evidenceBindings[0].evidencePath } : entry
    )
  }), PromotionGateError);
  assert.throws(() => validateV2Manifest({
    ...manifest,
    evidenceBindings: manifest.evidenceBindings.map((entry, index) =>
      index === 0 ? { ...entry, currentness: { ...entry.currentness, targetBaselineCommit: "0".repeat(40) } } : entry
    )
  }), PromotionGateError);
});

test("registered check ids include isolation, rollback, live scan, and ratchet hard gates", () => {
  for (const id of [
    "live-unreachable-v2",
    "legacy-drift-ratchet-v2",
    "source-immutability-v2",
    "output-isolation-v2",
    "rollback-rehearsal-v2",
    "external-side-effects-v2"
  ]) {
    assert.ok(PROMOTION_V2_REQUIRED_CHECK_IDS.includes(id));
  }
  assert.equal(stableJson(PROMOTION_V2_REQUIRED_CHECK_IDS), stableJson([...PROMOTION_V2_REQUIRED_CHECK_IDS]));
});
