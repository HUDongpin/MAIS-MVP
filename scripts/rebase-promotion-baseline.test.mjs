import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  buildReaffirmedEvidence,
  buildReaffirmedLegacyRegistry,
  buildReviewedRuntimePolicyEvolution,
  buildReaffirmedRuntimePolicyRefresh
} from "./rebase-promotion-baseline.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const script = path.join(repoRoot, "scripts/rebase-promotion-baseline.mjs");
const manifest = "coordination/integration/pilots/us-ca-math-rag-v2-g6-ratios-v2/attempt-007/promotion-manifest.v2.json";
const revisionRoot = "coordination/integration/pilots/us-ca-math-rag-v2-g6-ratios-v2/attempt-007/reaffirmations/test-dry-run";
const manifestValue = JSON.parse(fs.readFileSync(path.join(repoRoot, manifest), "utf8"));
const protectedFiles = [
  manifest,
  manifestValue.evidenceIndex.path,
  manifestValue.legacyResolution.registryPath,
  ...manifestValue.evidenceBindings.map((binding) => binding.evidencePath)
];

function digestFiles() {
  return protectedFiles.map((file) => ({
    file,
    digest: crypto.createHash("sha256").update(fs.readFileSync(path.join(repoRoot, file))).digest("hex")
  }));
}

function run(args) {
  return spawnSync(process.execPath, [script, ...args], {
    cwd: repoRoot,
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024
  });
}

test("baseline re-affirmation exposes an append-only revision and two committed phases", () => {
  const result = run(["--help"]);
  assert.equal(result.status, 0);
  assert.match(result.stdout, /--revision-root/u);
  assert.match(result.stdout, /--write-evidence/u);
  assert.match(result.stdout, /--write-bindings/u);
  assert.match(result.stdout, /--evidence-commit/u);
  assert.match(result.stdout, /--refresh-runtime-policy/u);
  assert.match(result.stdout, /--review-runtime-policy/u);
});

test("the unsafe monolithic write mode is rejected before changing historical artifacts", () => {
  const before = digestFiles();
  const result = run([
    "--manifest", manifest,
    "--target", "HEAD",
    "--revision-root", revisionRoot,
    "--write"
  ]);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Monolithic --write is disabled/u);
  assert.deepEqual(digestFiles(), before);
});

test("runtime-policy refresh modes are mutually exclusive", () => {
  const before = digestFiles();
  const result = run([
    "--manifest", manifest,
    "--target", "HEAD",
    "--revision-root", revisionRoot,
    "--refresh-runtime-policy",
    "--review-runtime-policy"
  ]);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /mutually exclusive/u);
  assert.deepEqual(digestFiles(), before);
});

test("dry-run plans ten evidence files and two bindings without mutating history", () => {
  const before = digestFiles();
  const result = run([
    "--manifest", manifest,
    "--target", "HEAD",
    "--revision-root", revisionRoot
  ]);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Evidence phase \(10 new files\)/u);
  assert.match(result.stdout, /Binding phase \(2 new files/u);
  assert.match(result.stdout, /DRY RUN — no files written/u);
  assert.equal(fs.existsSync(path.join(repoRoot, revisionRoot)), false);
  assert.deepEqual(digestFiles(), before);
});

test("legacy registry re-affirmation updates only the top-level baseline identity", () => {
  const source = {
    targetBaselineCommit: "1".repeat(40),
    resolutions: [{ resolutionCommits: ["1".repeat(40)] }]
  };
  const next = buildReaffirmedLegacyRegistry(source, "2".repeat(40));
  assert.equal(next.targetBaselineCommit, "2".repeat(40));
  assert.deepEqual(next.resolutions[0].resolutionCommits, ["1".repeat(40)]);
  assert.equal(source.targetBaselineCommit, "1".repeat(40));
});

test("evidence re-affirmation preserves historical commits and records the exact current delta", () => {
  const source = {
    evidenceId: "a23-source",
    role: "A23",
    producedAt: "2026-08-26T00:00:00.000Z",
    targetBaselineCommit: "1".repeat(40),
    semanticPayload: {
      reviewedCompositionCommit: "1".repeat(40),
      targetBaselineCommit: "1".repeat(40),
      legacyResolutionRegistryPath: "old-registry.json",
      legacyResolutionRegistryRawSha256: "a".repeat(64),
      historicalFailure: { liveContractRepairCommit: "1".repeat(40) }
    }
  };
  const next = buildReaffirmedEvidence(source, {
    revisionId: "auth-private-no-store-20260827",
    producedAt: "2026-08-27T00:00:00.000Z",
    targetCommit: "2".repeat(40),
    legacyRegistryPath: "revision/registry.json",
    legacyRegistryRawSha256: "b".repeat(64),
    justificationPath: "justification.md",
    protectedDiff: {
      changedPaths: ["lib/server/authRouteGuards.test.ts", "lib/server/authRouteGuards.ts"],
      testOnlyPaths: ["lib/server/authRouteGuards.test.ts"],
      runtimePaths: ["lib/server/authRouteGuards.ts"]
    },
    sourceEvidencePath: "source.json",
    sourceEvidenceRawSha256: "c".repeat(64)
  });
  assert.equal(next.targetBaselineCommit, "2".repeat(40));
  assert.equal(next.semanticPayload.targetBaselineCommit, "2".repeat(40));
  assert.equal(next.semanticPayload.reviewedCompositionCommit, "1".repeat(40));
  assert.equal(next.semanticPayload.historicalFailure.liveContractRepairCommit, "1".repeat(40));
  assert.equal(next.semanticPayload.legacyResolutionRegistryPath, "revision/registry.json");
  assert.equal(next.semanticPayload.legacyResolutionRegistryRawSha256, "b".repeat(64));
  assert.deepEqual(next.semanticPayload.baselineReaffirmation.runtimeChangedPaths, ["lib/server/authRouteGuards.ts"]);
  assert.equal(source.semanticPayload.targetBaselineCommit, "1".repeat(40));
});

test("runtime-policy refresh accepts only an unchanged observed graph with source-bound fs callsites", () => {
  const expected = {
    reachablePathCount: 10,
    reachablePathsDigest: "1".repeat(64),
    fsReadAllowlistCount: 1,
    fsReadAllowlistDigest: "2".repeat(64),
    nextDynamicNonliteralImportCount: 0,
    zeroBaselineCallCount: 0
  };
  const observed = {
    ...expected,
    fsReadAllowlistDigest: "3".repeat(64)
  };
  const allowlist = [{
    sourcePath: "lib/server/userStore.ts",
    sourceRawSha256: "4".repeat(64),
    callee: "node:fs/promises.readFile",
    position: 123,
    argumentShape: "identifier(path)",
    normalizedExpressionDigest: "5".repeat(64),
    policy: "runtime-storage-read-only-non-module"
  }];
  const refresh = buildReaffirmedRuntimePolicyRefresh({
    sourceExpectedPolicy: expected,
    sourceObservedPolicy: observed,
    targetObservedPolicy: structuredClone(observed),
    sourceFsReadAllowlist: allowlist,
    targetFsReadAllowlist: structuredClone(allowlist)
  });
  assert.deepEqual(refresh.changedFields, ["fsReadAllowlistDigest"]);
  assert.equal(refresh.fsReadAllowlistCount, 1);
  assert.equal(refresh.sourceAndTargetRuntimePolicyEqual, true);
  assert.equal(refresh.sourceAndTargetFsReadAllowlistEqual, true);
});

test("runtime-policy refresh rejects a changed target graph or fs-read callsite", () => {
  const expected = {
    reachablePathCount: 10,
    reachablePathsDigest: "1".repeat(64),
    fsReadAllowlistCount: 1,
    fsReadAllowlistDigest: "2".repeat(64),
    nextDynamicNonliteralImportCount: 0,
    zeroBaselineCallCount: 0
  };
  const observed = {
    ...expected,
    fsReadAllowlistDigest: "3".repeat(64)
  };
  const allowlist = [{
    sourcePath: "lib/server/userStore.ts",
    sourceRawSha256: "4".repeat(64),
    callee: "node:fs/promises.readFile",
    position: 123,
    argumentShape: "identifier(path)",
    normalizedExpressionDigest: "5".repeat(64),
    policy: "runtime-storage-read-only-non-module"
  }];
  assert.throws(
    () => buildReaffirmedRuntimePolicyRefresh({
      sourceExpectedPolicy: expected,
      sourceObservedPolicy: observed,
      targetObservedPolicy: { ...observed, reachablePathCount: 11 },
      sourceFsReadAllowlist: allowlist,
      targetFsReadAllowlist: allowlist
    }),
    /target runtime policy differs/u
  );
  assert.throws(
    () => buildReaffirmedRuntimePolicyRefresh({
      sourceExpectedPolicy: expected,
      sourceObservedPolicy: observed,
      targetObservedPolicy: observed,
      sourceFsReadAllowlist: allowlist,
      targetFsReadAllowlist: [{ ...allowlist[0], argumentShape: "identifier(otherPath)" }]
    }),
    /fs-read allowlist differs/u
  );
});

test("reviewed runtime-policy evolution accepts only literal-import graph growth with no capability or reachability expansion", () => {
  const source = {
    coveredFileCount: 3799,
    coveredFilesDigest: "1".repeat(64),
    classificationsDigest: "2".repeat(64),
    frameworkEntrypointCount: 301,
    seedCount: 316,
    reachablePathCount: 1451,
    reachablePathsDigest: "3".repeat(64),
    edgeCount: 3582,
    edgeDigest: "4".repeat(64),
    topologyEdgeCount: 3582,
    topologyEdgeDigest: "5".repeat(64),
    nextDynamicCallCount: 482,
    nextDynamicLiteralImportCount: 944,
    nextDynamicNonliteralImportCount: 0,
    nextDynamicCallsiteDigest: "6".repeat(64),
    fsReadAllowlistCount: 5,
    fsReadAllowlistDigest: "7".repeat(64),
    zeroBaselineCallCount: 0
  };
  const target = {
    ...source,
    coveredFileCount: 3800,
    coveredFilesDigest: "8".repeat(64),
    classificationsDigest: "9".repeat(64),
    edgeCount: 3589,
    edgeDigest: "a".repeat(64),
    topologyEdgeCount: 3589,
    topologyEdgeDigest: "b".repeat(64),
    nextDynamicCallCount: 489,
    nextDynamicLiteralImportCount: 951,
    nextDynamicCallsiteDigest: "c".repeat(64)
  };
  const fsReadAllowlist = Array.from({ length: 5 }, (_, index) => ({
    sourcePath: `lib/server/userStore${index}.ts`,
    sourceRawSha256: "d".repeat(64),
    callee: "node:fs/promises.readFile",
    position: 123 + index,
    argumentShape: "identifier(path)",
    normalizedExpressionDigest: "e".repeat(64),
    policy: "runtime-storage-read-only-non-module"
  }));
  const proof = buildReviewedRuntimePolicyEvolution({
    sourceExpectedPolicy: source,
    sourceObservedPolicy: structuredClone(source),
    targetObservedPolicy: target,
    sourceFsReadAllowlist: fsReadAllowlist,
    targetFsReadAllowlist: structuredClone(fsReadAllowlist)
  });
  assert.equal(proof.schemaVersion, "promotion-runtime-policy-reviewed-evolution.v1");
  assert.equal(proof.literalDynamicImportDelta, 7);
  assert.equal(proof.sourceAndTargetReachablePathsEqual, true);
  assert.equal(proof.sourceAndTargetFsReadAllowlistEqual, true);
  assert.deepEqual(proof.changedFields, [
    "classificationsDigest",
    "coveredFileCount",
    "coveredFilesDigest",
    "edgeCount",
    "edgeDigest",
    "nextDynamicCallCount",
    "nextDynamicCallsiteDigest",
    "nextDynamicLiteralImportCount",
    "topologyEdgeCount",
    "topologyEdgeDigest"
  ]);
});

test("reviewed runtime-policy evolution rejects reachability, loader capability, blind-spot, and incoherent edge changes", () => {
  const source = {
    coveredFileCount: 10,
    coveredFilesDigest: "1".repeat(64),
    classificationsDigest: "2".repeat(64),
    frameworkEntrypointCount: 2,
    seedCount: 3,
    reachablePathCount: 4,
    reachablePathsDigest: "3".repeat(64),
    edgeCount: 8,
    edgeDigest: "4".repeat(64),
    topologyEdgeCount: 8,
    topologyEdgeDigest: "5".repeat(64),
    nextDynamicCallCount: 2,
    nextDynamicLiteralImportCount: 2,
    nextDynamicNonliteralImportCount: 0,
    nextDynamicCallsiteDigest: "6".repeat(64),
    fsReadAllowlistCount: 1,
    fsReadAllowlistDigest: "7".repeat(64),
    zeroBaselineCallCount: 0
  };
  const validTarget = {
    ...source,
    coveredFileCount: 11,
    coveredFilesDigest: "8".repeat(64),
    classificationsDigest: "9".repeat(64),
    edgeCount: 9,
    edgeDigest: "a".repeat(64),
    topologyEdgeCount: 9,
    topologyEdgeDigest: "b".repeat(64),
    nextDynamicCallCount: 3,
    nextDynamicLiteralImportCount: 3,
    nextDynamicCallsiteDigest: "c".repeat(64)
  };
  const allowlist = [{ sourcePath: "lib/server/userStore.ts", policy: "read-only" }];
  const build = (targetObservedPolicy, targetFsReadAllowlist = allowlist) =>
    buildReviewedRuntimePolicyEvolution({
      sourceExpectedPolicy: source,
      sourceObservedPolicy: structuredClone(source),
      targetObservedPolicy,
      sourceFsReadAllowlist: allowlist,
      targetFsReadAllowlist
    });
  assert.throws(
    () => build({ ...validTarget, reachablePathsDigest: "f".repeat(64) }),
    /reachable path set/u
  );
  assert.throws(
    () => build(validTarget, [{ sourcePath: "lib/server/other.ts", policy: "read-only" }]),
    /fs-read allowlist/u
  );
  assert.throws(
    () => build({ ...validTarget, nextDynamicNonliteralImportCount: 1 }),
    /nonliteral dynamic imports/u
  );
  assert.throws(
    () => build({ ...validTarget, edgeCount: 10, topologyEdgeCount: 10 }),
    /literal-import and edge deltas/u
  );
  assert.throws(
    () => build({ ...validTarget, zeroBaselineCallCount: 1 }),
    /zero-baseline loader calls/u
  );
  assert.throws(
    () => buildReviewedRuntimePolicyEvolution({
      sourceExpectedPolicy: source,
      sourceObservedPolicy: { ...source, coveredFileCount: 11 },
      targetObservedPolicy: validTarget,
      sourceFsReadAllowlist: allowlist,
      targetFsReadAllowlist: allowlist
    }),
    /source expected policy differs/u
  );
});
