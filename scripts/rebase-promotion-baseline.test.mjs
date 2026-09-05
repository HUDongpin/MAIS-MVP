import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";
import * as baselineTools from "./rebase-promotion-baseline.mjs";
import { analyzeRuntimeLoaderCalls, fingerprint } from "../coordination/integration/promotion-gate-lib.mjs";

import {
  buildReaffirmedEvidence,
  buildReaffirmedLegacyRegistry,
  buildReviewedLegacyCandidateByteRefresh,
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

function run(args, env = process.env) {
  return spawnSync(process.execPath, [script, ...args], {
    cwd: repoRoot,
    env,
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
  assert.match(result.stdout, /--review-legacy-candidate-bytes/u);
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

test("reviewed legacy candidate refresh accepts only de-reached byte changes with stable semantic identity", () => {
  const source = {
    targetBaselineCommit: "1".repeat(40),
    resolutions: [
      {
        decision: "de-reached",
        candidate: {
          path: "data/generated-content/legacy-a/question-pack.json",
          rawSha256: "a".repeat(64),
          packageId: "legacy-a",
          containerKeys: ["questions"],
          idCount: 2,
          idSetDigest: "b".repeat(64)
        }
      },
      {
        decision: "de-reached",
        candidate: {
          path: "data/generated-content/legacy-b/question-pack.json",
          rawSha256: "c".repeat(64),
          packageId: "legacy-b",
          containerKeys: ["questions"],
          idCount: 3,
          idSetDigest: "d".repeat(64)
        }
      }
    ]
  };
  const result = buildReviewedLegacyCandidateByteRefresh({
    sourceRegistry: source,
    targetCommit: "2".repeat(40),
    protectedRuntimePaths: ["data/generated-content/legacy-a/question-pack.json"],
    targetCandidates: [
      {
        path: "data/generated-content/legacy-a/question-pack.json",
        rawSha256: "e".repeat(64),
        profile: {
          packageId: "legacy-a",
          containerKeys: ["questions"],
          idCount: 2,
          idSetDigest: "b".repeat(64)
        }
      },
      {
        path: "data/generated-content/legacy-b/question-pack.json",
        rawSha256: "c".repeat(64),
        profile: {
          packageId: "legacy-b",
          containerKeys: ["questions"],
          idCount: 3,
          idSetDigest: "d".repeat(64)
        }
      }
    ]
  });

  assert.equal(result.registry.targetBaselineCommit, "2".repeat(40));
  assert.equal(result.registry.resolutions[0].candidate.rawSha256, "e".repeat(64));
  assert.equal(result.registry.resolutions[1].candidate.rawSha256, "c".repeat(64));
  assert.equal(result.proof.schemaVersion, "promotion-legacy-candidate-byte-reaffirmation.v1");
  assert.equal(result.proof.changedCandidateCount, 1);
  assert.equal(result.proof.allChangedCandidatesDeReached, true);
  assert.equal(result.proof.semanticIdentityUnchanged, true);
  assert.equal(result.proof.liveAllowed, false);
  assert.deepEqual(result.proof.changedPaths, ["data/generated-content/legacy-a/question-pack.json"]);
  assert.equal(source.resolutions[0].candidate.rawSha256, "a".repeat(64));
});

test("reviewed legacy candidate refresh rejects approved, hidden, or semantic candidate changes", () => {
  const candidate = {
    path: "data/generated-content/legacy-a/question-pack.json",
    rawSha256: "a".repeat(64),
    packageId: "legacy-a",
    containerKeys: ["questions"],
    idCount: 2,
    idSetDigest: "b".repeat(64)
  };
  const target = {
    path: candidate.path,
    rawSha256: "c".repeat(64),
    profile: {
      packageId: candidate.packageId,
      containerKeys: candidate.containerKeys,
      idCount: candidate.idCount,
      idSetDigest: candidate.idSetDigest
    }
  };
  const build = (decision, protectedRuntimePaths, targetCandidates = [target]) =>
    buildReviewedLegacyCandidateByteRefresh({
      sourceRegistry: {
        targetBaselineCommit: "1".repeat(40),
        resolutions: [{ decision, candidate }]
      },
      targetCommit: "2".repeat(40),
      protectedRuntimePaths,
      targetCandidates
    });

  assert.throws(() => build("approved-projection", [candidate.path]), /de-reached/u);
  assert.throws(() => build("de-reached", []), /protected runtime delta/u);
  assert.throws(
    () => build("de-reached", [candidate.path], [{
      ...target,
      profile: { ...target.profile, idSetDigest: "d".repeat(64) }
    }]),
    /semantic identity/u
  );
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

function callsiteFile(filePath, source) {
  const bytes = Buffer.from(source);
  const gitBlobId = crypto.createHash("sha1").update(`blob ${bytes.length}\0`).update(bytes).digest("hex");
  return { path: filePath, mode: "100644", gitBlobId, bytes };
}

function projectedCallsites(files) {
  return files.flatMap(({ path: sourcePath, bytes }) => {
    const parsed = analyzeRuntimeLoaderCalls(sourcePath, bytes.toString("utf8"));
    return parsed.nextDynamicCalls.map(({ position, literalImports, nonliteralImportCount, normalizedExpressionDigest }) => ({
      sourcePath, sourceRawSha256: parsed.sourceRawSha256, position,
      literalImports, nonliteralImportCount, normalizedExpressionDigest
    }));
  }).sort((a, b) => {
    const left = `${a.sourcePath}\0${a.position}`, right = `${b.sourcePath}\0${b.position}`;
    return left < right ? -1 : left > right ? 1 : 0;
  });
}

function callsiteRebindingFixture(targetSource) {
  const source = 'import dynamic from "next/dynamic";\nconst A = dynamic(() => import("./A"), { ssr: false });\nconst B = dynamic(() => import("./B"));\n';
  const sourceFiles = [callsiteFile("components/Card.tsx", source)];
  const targetFiles = [callsiteFile("components/Card.tsx", targetSource ?? `// offset-only import/copy change\n${source}`)];
  const sourceCallsites = projectedCallsites(sourceFiles), targetCallsites = projectedCallsites(targetFiles);
  const sourceObservedPolicy = {
    coveredFileCount: 3, coveredFilesDigest: "1".repeat(64), classificationsDigest: "2".repeat(64),
    frameworkEntrypointCount: 1, seedCount: 1, reachablePathCount: 3, reachablePathsDigest: "3".repeat(64),
    edgeCount: 2, edgeDigest: "4".repeat(64), topologyEdgeCount: 2, topologyEdgeDigest: "5".repeat(64),
    nextDynamicCallCount: 2, nextDynamicLiteralImportCount: 2, nextDynamicNonliteralImportCount: 0,
    nextDynamicCallsiteDigest: fingerprint(sourceCallsites), fsReadAllowlistCount: 0,
    fsReadAllowlistDigest: fingerprint([]), zeroBaselineCallCount: 0
  };
  return {
    sourceCommit: "1".repeat(40), targetCommit: "2".repeat(40),
    sourceExpectedPolicy: structuredClone(sourceObservedPolicy), sourceObservedPolicy,
    targetObservedPolicy: { ...sourceObservedPolicy, nextDynamicCallsiteDigest: fingerprint(targetCallsites) },
    sourceFsReadAllowlist: [], targetFsReadAllowlist: [], sourceCallsites, targetCallsites, sourceFiles, targetFiles
  };
}

function rebind(input) {
  assert.equal(typeof baselineTools.buildReviewedRuntimeCallsiteRebinding, "function", "bounded callsite rebinding is missing");
  return baselineTools.buildReviewedRuntimeCallsiteRebinding(input);
}

test("callsite rebinding binds exact Git blobs and allows only source bytes/positions to change", () => {
  const input = callsiteRebindingFixture();
  const before = structuredClone(input);
  const proof = rebind(input);
  assert.equal(proof.schemaVersion, "promotion-runtime-callsite-rebinding.v1");
  assert.deepEqual(proof.changedFields, ["nextDynamicCallsiteDigest"]);
  assert.equal(proof.changedCallsiteCount, 2);
  assert.equal(proof.sourceCommit, input.sourceCommit);
  assert.equal(proof.targetCommit, input.targetCommit);
  assert.equal(proof.sourcePolicyDigest, fingerprint(input.sourceObservedPolicy));
  assert.equal(proof.targetPolicyDigest, fingerprint(input.targetObservedPolicy));
  assert.equal(proof.callsiteSemanticsUnchanged, true);
  assert.equal(proof.liveAllowed, false);
  assert.equal(proof.sourceFiles[0].gitBlobId, input.sourceFiles[0].gitBlobId);
  assert.equal(proof.targetFiles[0].gitBlobId, input.targetFiles[0].gitBlobId);
  assert.equal(JSON.stringify(proof).includes("ssr"), false, "proof must not contain source text");
  assert.deepEqual(structuredClone(input), before);
});

test("callsite rebinding rejects changed targets and expressions even with recomputed digests", () => {
  const source = callsiteRebindingFixture().sourceFiles[0].bytes.toString("utf8");
  for (const changed of [source.replace('"./A"', '"./C"'), source.replace("ssr: false", "ssr: true")]) {
    assert.throws(() => rebind(callsiteRebindingFixture(changed)), /callsite.*(semantics|expression)/u);
  }
});

test("callsite rebinding rejects every other policy field and incomplete policy schemas", () => {
  const original = callsiteRebindingFixture();
  for (const field of Object.keys(original.targetObservedPolicy).filter((key) => key !== "nextDynamicCallsiteDigest")) {
    const input = callsiteRebindingFixture();
    input.targetObservedPolicy[field] = typeof input.targetObservedPolicy[field] === "number"
      ? input.targetObservedPolicy[field] + 1 : "f".repeat(64);
    assert.throws(() => rebind(input), /policy/u, field);
  }
  for (const mutation of [
    (p) => { delete p.edgeDigest; }, (p) => { p.extra = true; },
    (p) => { p.edgeCount = NaN; }, (p) => { p.edgeCount = -1; }
  ]) {
    const input = callsiteRebindingFixture(); mutation(input.sourceExpectedPolicy);
    assert.throws(() => rebind(input), /policy/u);
  }
});

test("callsite rebinding rejects absent duplicate forged and unbound callsites or source blobs", () => {
  for (const mutate of [
    (i) => { i.targetCallsites.pop(); },
    (i) => { i.targetCallsites.push(i.targetCallsites[0]); },
    (i) => { i.targetCallsites[0].position += 1; },
    (i) => { i.targetCallsites[0].sourceRawSha256 = "0".repeat(64); },
    (i) => { i.targetCallsites[0].normalizedExpressionDigest = "0".repeat(64); },
    (i) => { i.targetCallsites[0].extra = true; },
    (i) => { i.targetFiles[0].gitBlobId = "0".repeat(40); },
    (i) => { i.targetFiles[0].mode = "120000"; },
    (i) => { i.targetFiles[0].path = "../escape.tsx"; },
    (i) => { i.targetFiles.push(i.targetFiles[0]); },
    (i) => { i.targetFiles = []; },
    (i) => { i.targetFiles[0].bytes = Buffer.from([0xff]); },
    (i) => { i.targetFsReadAllowlist = [{ policy: "new-capability" }]; },
    (i) => { i.targetCommit = i.sourceCommit; }
  ]) {
    const input = callsiteRebindingFixture(); mutate(input);
    assert.throws(() => rebind(input), /rebinding/u);
  }
});

test("callsite rebinding CLI is explicit and mutually exclusive with historical refresh modes", () => {
  const help = run(["--help"]);
  assert.equal(help.status, 0);
  assert.match(help.stdout, /--rebind-runtime-callsites/u);
  for (const flag of ["--refresh-runtime-policy", "--review-runtime-policy"]) {
    const before = digestFiles();
    const result = run(["--rebind-runtime-callsites", flag]);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /mutually exclusive/u);
    assert.deepEqual(digestFiles(), before);
  }
});

test("callsite rebinding rejects no-op and a decimal-width offset does not reorder paired calls", () => {
  const source = callsiteRebindingFixture().sourceFiles[0].bytes.toString("utf8");
  assert.throws(() => rebind(callsiteRebindingFixture(source)), /policy may change only/u);
  const input = callsiteRebindingFixture(`${" ".repeat(70)}${source}`);
  assert.equal(rebind(input).changedCallsiteCount, 2);
});

test("callsite rebinding rejects shallow history before loading inputs or materializing any tree", (t) => {
  const dotGitPath = path.join(repoRoot, ".git");
  const gitDir = fs.lstatSync(dotGitPath).isDirectory() ? dotGitPath
    : path.resolve(repoRoot, fs.readFileSync(dotGitPath, "utf8").trim().slice("gitdir: ".length));
  const shallow = spawnSync("git", ["--no-optional-locks", `--git-dir=${gitDir}`, `--work-tree=${repoRoot}`,
    "-c", `core.worktree=${repoRoot}`, "rev-parse", "--is-shallow-repository"], { encoding: "utf8" });
  assert.equal(shallow.status, 0);
  if (shallow.stdout.trim() !== "true") { t.skip("host has full history; shallow-host check is not applicable"); return; }
  const before = digestFiles();
  const result = run(["--manifest", "not-loaded.json", "--target", "HEAD", "--revision-root", revisionRoot, "--rebind-runtime-callsites"]);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /REBINDING_FULL_HISTORY_REQUIRED/u);
  assert.deepEqual(digestFiles(), before);
});

test("callsite rebinding does not mix candidate-byte revision or inherited Git routing overrides", () => {
  const combined = run(["--rebind-runtime-callsites", "--review-legacy-candidate-bytes"]);
  assert.notEqual(combined.status, 0);
  assert.match(combined.stderr, /cannot combine with candidate-byte revision/u);
  const result = run(["--manifest", manifest, "--target", "HEAD", "--revision-root", revisionRoot], {
    ...process.env, GIT_INDEX_FILE: "/nonexistent/foreign-index", GIT_OBJECT_DIRECTORY: "/nonexistent/foreign-objects",
    GIT_WORK_TREE: "/nonexistent/foreign-tree", GIT_SHALLOW_FILE: "/dev/null"
  });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /DRY RUN/u);
});

test("callsite projection requires the entire Git tree including non-callsite files and modes", () => {
  assert.equal(typeof baselineTools.verifyCallsiteProjectionRecords, "function", "exact archive projection verification missing");
  const records = [
    { path: "app/page.tsx", mode: "100644", objectId: "1".repeat(40) },
    { path: "lib/non-callsite.ts", mode: "100644", objectId: "2".repeat(40) }
  ];
  assert.equal(baselineTools.verifyCallsiteProjectionRecords(records, structuredClone(records)), fingerprint(records));
  for (const actual of [
    records.slice(0, 1), [...records, { path: "extra.ts", mode: "100644", objectId: "3".repeat(40) }],
    [records[0], { ...records[1], objectId: "4".repeat(40) }],
    [records[0], { ...records[1], mode: "100755" }], [records[0], records[0]],
    [records[0], { ...records[1], mode: "120000" }]
  ]) assert.throws(() => baselineTools.verifyCallsiteProjectionRecords(records, actual), /projection/u);
});
