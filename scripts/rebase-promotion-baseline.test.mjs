import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  assertExactReconstructedBytes,
  assertSourceEvidenceBinding,
  buildReaffirmedEvidence,
  buildReaffirmedLegacyRegistry,
  buildReviewedLegacyCandidateByteRefresh,
  buildReviewedRuntimePolicyEvolution,
  buildReaffirmedRuntimePolicyRefresh,
  jsonPointerDifferences
} from "./rebase-promotion-baseline.mjs";
import {
  computeV2EvidenceSemanticDigest,
  projectV2RuntimePolicy
} from "../coordination/integration/v2/promotion-gate-v2-lib.mjs";

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
  const next = buildReaffirmedLegacyRegistry(source, "2".repeat(40), "1".repeat(40));
  assert.equal(next.targetBaselineCommit, "2".repeat(40));
  assert.deepEqual(next.resolutions[0].resolutionCommits, ["1".repeat(40)]);
  assert.deepEqual(jsonPointerDifferences(source, next), ["/targetBaselineCommit"]);
  assert.equal(source.targetBaselineCommit, "1".repeat(40));
});

test("recursive JSON-pointer differences identify exact nested fields with RFC 6901 escaping", () => {
  const source = {
    targetBaselineCommit: "1".repeat(40),
    nested: { "a/b": { "x~y": "source" } },
    array: [{ value: 1 }]
  };
  const target = structuredClone(source);
  target.targetBaselineCommit = "2".repeat(40);
  target.nested["a/b"]["x~y"] = "target";
  target.array[0].value = 2;
  assert.deepEqual(jsonPointerDifferences(source, target), [
    "/array/0/value",
    "/nested/a~1b/x~0y",
    "/targetBaselineCommit"
  ]);
});

test("binding phase accepts only bytes reconstructed exactly from the reviewed plan", () => {
  const planned = Buffer.from("exact planned evidence bytes\n", "utf8");
  assert.equal(assertExactReconstructedBytes(planned, Buffer.from(planned)), true);
  assert.throws(
    () => assertExactReconstructedBytes(planned, Buffer.from("different bytes\n", "utf8"), "A23 evidence"),
    /A23 evidence bytes do not exactly match the reviewed plan/u
  );
});

test("source evidence binding requires exact semantic identity and current Manifest fields", () => {
  const manifest = {
    candidateDigest: "1".repeat(64),
    sourceCommit: "2".repeat(40),
    targetBaselineCommit: "3".repeat(40),
    checkerVersion: "promotion-gate-shadow-v2.6"
  };
  const sourceEvidence = {
    evidenceId: "a23-source",
    role: "A23",
    result: "pass",
    candidateDigest: manifest.candidateDigest,
    sourceCommit: manifest.sourceCommit,
    targetBaselineCommit: manifest.targetBaselineCommit,
    checkerVersion: manifest.checkerVersion,
    semanticPayload: { readiness: "reviewed" }
  };
  const binding = {
    evidenceId: sourceEvidence.evidenceId,
    role: sourceEvidence.role,
    expectedResult: sourceEvidence.result,
    semanticDigest: computeV2EvidenceSemanticDigest(sourceEvidence),
    currentness: structuredClone(manifest)
  };
  assert.equal(assertSourceEvidenceBinding(sourceEvidence, binding, manifest), true);

  const stale = structuredClone(binding);
  stale.currentness.targetBaselineCommit = "4".repeat(40);
  assert.throws(
    () => assertSourceEvidenceBinding(sourceEvidence, stale, manifest),
    /semantic identity or currentness is invalid/u
  );

  const semanticallyChanged = structuredClone(sourceEvidence);
  semanticallyChanged.semanticPayload.readiness = "unreviewed";
  assert.throws(
    () => assertSourceEvidenceBinding(semanticallyChanged, binding, manifest),
    /semantic identity or currentness is invalid/u
  );
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
    sourceEvidenceRawSha256: "c".repeat(64),
    candidateBytesChanged: false
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

const runtimePaths = {
  languageToggle: "components/ui/LanguageToggle.tsx",
  i18n: "lib/i18n.ts",
  storageBase: "lib/server/storageBase.ts",
  userStore: "lib/server/userStore.ts"
};
const sourceBaselineCommit = "1".repeat(40);
const targetBaselineCommit = "2".repeat(40);
const sourceUserStoreRawSha256 = "3".repeat(64);
const targetUserStoreRawSha256 = "4".repeat(64);
const stableRuntimeRawSha256 = "5".repeat(64);
const candidateRawSha256 = "6".repeat(64);
const normalizedFsDigest = "7".repeat(64);
const normalizedNextDigest = "8".repeat(64);

function sha256CanonicalJson(value) {
  return crypto.createHash("sha256").update(`${JSON.stringify(value, null, 2)}\n`).digest("hex");
}

function makeRuntimeObservation({ target = false, fsRawTransition = true } = {}) {
  const actualFiles = Object.values(runtimePaths).sort();
  const classifications = [{
    kind: "runtime-code",
    count: actualFiles.length,
    pathsDigest: "9".repeat(64)
  }];
  const sourceEdge = {
    from: runtimePaths.userStore,
    specifier: "./storageBase",
    to: runtimePaths.storageBase,
    kind: "import",
    typeOnly: false
  };
  const addedEdge = {
    from: runtimePaths.languageToggle,
    specifier: "@/lib/i18n",
    to: runtimePaths.i18n,
    kind: "import",
    typeOnly: false
  };
  const edges = target ? [sourceEdge, addedEdge] : [sourceEdge];
  const topologyEdges = edges.map(({ from, to }) => ({ from, to }));
  const sourceFsRead = {
    sourcePath: runtimePaths.userStore,
    sourceRawSha256: sourceUserStoreRawSha256,
    callee: "node:fs/promises.readFile",
    position: 101,
    argumentShape: "identifier(legacyJsonDbPath),literal(string)",
    normalizedExpressionDigest: normalizedFsDigest,
    policy: "runtime-storage-read-only-non-module"
  };
  const targetFsRead = fsRawTransition
    ? { ...sourceFsRead, sourceRawSha256: targetUserStoreRawSha256, position: 103 }
    : structuredClone(sourceFsRead);
  const fsReadAllowlist = [target ? targetFsRead : sourceFsRead];
  const nextDynamicCalls = [{
    sourcePath: runtimePaths.storageBase,
    sourceRawSha256: stableRuntimeRawSha256,
    position: 41,
    literalImports: ["./storage-adapter"],
    nonliteralImportCount: 0,
    normalizedExpressionDigest: normalizedNextDigest
  }];
  const importMetaUrlReferences = [{
    sourcePath: runtimePaths.storageBase,
    sourceRawSha256: stableRuntimeRawSha256,
    specifier: "./storage-schema.json"
  }];
  const graphPolicy = {
    parser: { name: "typescript", version: "test" },
    seedCount: 2,
    seedDigest: "a".repeat(64),
    reachablePathCount: actualFiles.length,
    reachablePathsDigest: "b".repeat(64),
    edgeCount: edges.length,
    edgeDigest: (target ? "c" : "d").repeat(64),
    topologyEdgeCount: topologyEdges.length,
    topologyEdgeDigest: (target ? "e" : "f").repeat(64)
  };
  return {
    snapshot: { digest: "0".repeat(64), files: actualFiles.map((pathValue) => ({ path: pathValue })) },
    actualFiles,
    classifications,
    resolverPolicy: { schemaVersion: "runtime-resolver-policy.test.v1", aliases: ["@/*"] },
    frameworkBoundary: { schemaVersion: "framework-boundary.test.v1", alternateEntrypoints: [] },
    frameworkEntrypoints: [runtimePaths.languageToggle],
    specialFiles: [{ path: "middleware.ts", rawSha256: stableRuntimeRawSha256 }],
    graph: {
      frameworkEntrypoints: [runtimePaths.languageToggle],
      runtimeSeeds: [runtimePaths.languageToggle, runtimePaths.userStore],
      reachablePaths: new Set(actualFiles),
      edges,
      topologyEdges,
      detachedEdges: [],
      unresolvedCalls: [],
      loaderInventory: {
        fsReads: structuredClone(fsReadAllowlist),
        nextDynamicCalls,
        zeroBaselineCalls: [],
        importMetaUrlReferences: structuredClone(importMetaUrlReferences)
      }
    },
    graphPolicy,
    loaderPolicy: {
      schemaVersion: "promotion-runtime-loader-policy.v1",
      parser: { name: "typescript", version: "test" },
      fsReadAllowlist,
      fsReadAllowlistDigest: (target && fsRawTransition ? "0" : "1").repeat(64),
      nextDynamic: {
        callCount: nextDynamicCalls.length,
        literalImportCount: 1,
        nonliteralImportCount: 0,
        callsiteDigest: "2".repeat(64)
      },
      importMetaUrlReferences,
      importMetaUrlReferencesDigest: "3".repeat(64),
      zeroBaselineKinds: ["require-context"],
      zeroBaselineCallCount: 0
    },
    sensitiveAnchors: [{ path: "middleware.ts", rawSha256: stableRuntimeRawSha256 }],
    sensitiveAnchorsDigest: "4".repeat(64),
    rawObservation: {
      coveredFileCount: actualFiles.length,
      coveredFilesDigest: "5".repeat(64),
      coveredFilesAggregateDigest: "6".repeat(64),
      classifications,
      classificationDigest: "7".repeat(64)
    }
  };
}

function makeRuntimeEvolutionCase({ fsRawTransition = true } = {}) {
  const sourceObservation = makeRuntimeObservation();
  const targetObservation = makeRuntimeObservation({ target: true, fsRawTransition });
  const reviewedRuntimeDiff = [
    { path: runtimePaths.userStore, status: "M" },
    { path: runtimePaths.languageToggle, status: "M" }
  ];
  const reviewedPaths = structuredClone(reviewedRuntimeDiff).sort((left, right) =>
    left.path < right.path ? -1 : left.path > right.path ? 1 : 0
  );
  const candidateArtifactBindings = [{
    path: "coordination/content-qa/candidate.json",
    sourceRawSha256: candidateRawSha256,
    targetRawSha256: candidateRawSha256,
    unchanged: true
  }];
  const addedEdges = [structuredClone(targetObservation.graph.edges[1])];
  const addedTopologyEdges = [{ from: addedEdges[0].from, to: addedEdges[0].to }];
  const sourceFsRead = sourceObservation.loaderPolicy.fsReadAllowlist[0];
  const targetFsRead = targetObservation.loaderPolicy.fsReadAllowlist[0];
  const fsRawTransitions = fsRawTransition
    ? [{
        normalized: {
          sourcePath: sourceFsRead.sourcePath,
          callee: sourceFsRead.callee,
          argumentShape: sourceFsRead.argumentShape,
          normalizedExpressionDigest: sourceFsRead.normalizedExpressionDigest,
          policy: sourceFsRead.policy
        },
        source: structuredClone(sourceFsRead),
        target: structuredClone(targetFsRead)
      }]
    : [];
  const changedPolicyFields = [
    "edgeCount",
    "edgeDigest",
    ...(fsRawTransition ? ["fsReadAllowlistDigest"] : []),
    "topologyEdgeCount",
    "topologyEdgeDigest"
  ].sort();
  const reviewAttestation = {
    schemaVersion: "promotion-runtime-policy-review-attestation.v1",
    sourceBaselineCommit,
    targetBaselineCommit,
    reviewedPaths,
    changedPolicyFields,
    addedEdges,
    removedEdges: [],
    addedTopologyEdges,
    removedTopologyEdges: [],
    fsRawTransitions,
    nextDynamicRawTransitions: [],
    candidateArtifactBindings: structuredClone(candidateArtifactBindings),
    candidateBytesChanged: false,
    liveAllowed: false
  };
  return {
    sourceExpectedPolicy: projectV2RuntimePolicy(sourceObservation),
    sourceObservation,
    targetObservation,
    reviewedRuntimeDiff,
    sourceBaselineCommit,
    targetBaselineCommit,
    reviewAttestation,
    reviewAttestationRawSha256: sha256CanonicalJson(reviewAttestation),
    candidateArtifactBindings,
    rawBindingsVerified: true
  };
}

test("reviewed runtime-policy evolution v2 accepts one exact reviewed static edge and an optional raw-only fs transition", async (t) => {
  for (const fsRawTransition of [true, false]) {
    await t.test(`fs raw transition ${fsRawTransition ? "present" : "absent"}`, () => {
      const args = makeRuntimeEvolutionCase({ fsRawTransition });
      const proof = buildReviewedRuntimePolicyEvolution(args);
      assert.equal(proof.schemaVersion, "promotion-runtime-policy-reviewed-evolution.v2");
      assert.equal(proof.sourceBaselineCommit, sourceBaselineCommit);
      assert.equal(proof.targetBaselineCommit, targetBaselineCommit);
      assert.deepEqual(proof.graphProof.addedEdges, [args.targetObservation.graph.edges[1]]);
      assert.deepEqual(proof.graphProof.removedEdges, []);
      assert.equal(proof.inventoryProof.actualFiles.equal, true);
      assert.equal(proof.inventoryProof.reachablePaths.equal, true);
      assert.equal(proof.loaderProof.fsRead.normalizedEqual, true);
      assert.equal(proof.loaderProof.fsRead.transitions.length, fsRawTransition ? 1 : 0);
      assert.equal(proof.candidateBytesChanged, false);
      assert.equal(proof.rawBindingsVerified, true);
      assert.equal(proof.reviewAttestationRawSha256, args.reviewAttestationRawSha256);
      assert.equal(proof.liveAllowed, false);
    });
  }
});

test("reviewed runtime-policy evolution v2 rejects removals hidden by a net-positive edge count", () => {
  const args = makeRuntimeEvolutionCase();
  const replacementEdges = [
    args.targetObservation.graph.edges[1],
    {
      from: runtimePaths.languageToggle,
      specifier: "@/lib/server/storageBase",
      to: runtimePaths.storageBase,
      kind: "import",
      typeOnly: false
    }
  ];
  args.targetObservation.graph.edges = replacementEdges;
  args.targetObservation.graph.topologyEdges = replacementEdges.map(({ from, to }) => ({ from, to }));
  assert.equal(
    args.targetObservation.graph.edges.length - args.sourceObservation.graph.edges.length,
    1,
    "the fixture must retain a misleading positive net edge delta"
  );
  assert.throws(
    () => buildReviewedRuntimePolicyEvolution(args),
    /additive-only exact static graph edges/u
  );
});

test("reviewed runtime-policy evolution v2 rejects same-count inventory substitutions", async (t) => {
  const cases = [
    {
      name: "actual file",
      mutate: ({ targetObservation }) => {
        targetObservation.actualFiles[0] = "components/ui/Replaced.tsx";
      },
      pattern: /actual files multiset/u
    },
    {
      name: "classification",
      mutate: ({ targetObservation }) => {
        targetObservation.classifications[0] = {
          ...targetObservation.classifications[0],
          kind: "test-code"
        };
      },
      pattern: /runtime classifications multiset/u
    },
    {
      name: "runtime seed",
      mutate: ({ targetObservation }) => {
        targetObservation.graph.runtimeSeeds[0] = runtimePaths.i18n;
      },
      pattern: /runtime seeds multiset/u
    },
    {
      name: "reachable path",
      mutate: ({ targetObservation }) => {
        const paths = [...targetObservation.graph.reachablePaths];
        paths[0] = "lib/replacement.ts";
        targetObservation.graph.reachablePaths = new Set(paths);
      },
      pattern: /reachable paths multiset/u
    }
  ];
  for (const entry of cases) {
    await t.test(entry.name, () => {
      const args = makeRuntimeEvolutionCase();
      entry.mutate(args);
      assert.throws(() => buildReviewedRuntimePolicyEvolution(args), entry.pattern);
    });
  }
});

test("reviewed runtime-policy evolution v2 accepts only reviewed non-type static imports to source-reachable targets", async (t) => {
  const cases = [
    {
      name: "unreviewed importer",
      mutate: (edge) => {
        edge.from = runtimePaths.storageBase;
      }
    },
    {
      name: "new target",
      mutate: (edge) => {
        edge.to = "lib/newly-reachable.ts";
      }
    },
    {
      name: "wrong kind",
      mutate: (edge) => {
        edge.kind = "dynamic-import";
      }
    },
    {
      name: "type-only edge",
      mutate: (edge) => {
        edge.typeOnly = true;
      }
    }
  ];
  for (const entry of cases) {
    await t.test(entry.name, () => {
      const args = makeRuntimeEvolutionCase();
      entry.mutate(args.targetObservation.graph.edges[1]);
      assert.throws(
        () => buildReviewedRuntimePolicyEvolution(args),
        /unreviewed or capability-expanding static edge/u
      );
    });
  }
});

test("reviewed runtime-policy evolution v2 rejects normalized fs capability and multiplicity changes", async (t) => {
  await t.test("normalized field", () => {
    const args = makeRuntimeEvolutionCase();
    args.targetObservation.loaderPolicy.fsReadAllowlist[0].argumentShape = "identifier(otherPath)";
    assert.throws(
      () => buildReviewedRuntimePolicyEvolution(args),
      /fs-read allowlist normalized entries multiset/u
    );
  });
  await t.test("normalized multiplicity", () => {
    const args = makeRuntimeEvolutionCase();
    args.targetObservation.loaderPolicy.fsReadAllowlist.push(
      structuredClone(args.targetObservation.loaderPolicy.fsReadAllowlist[0])
    );
    assert.throws(
      () => buildReviewedRuntimePolicyEvolution(args),
      /fs-read allowlist normalized entries multiset|fs-read allowlist multiplicity/u
    );
  });
});

test("reviewed runtime-policy evolution v2 rejects loader blind spots and incomplete graphs", async (t) => {
  const cases = [
    {
      name: "nonliteral next/dynamic",
      mutate: (args) => {
        for (const observation of [args.sourceObservation, args.targetObservation]) {
          observation.graph.loaderInventory.nextDynamicCalls[0].nonliteralImportCount = 1;
          observation.loaderPolicy.nextDynamic.nonliteralImportCount = 1;
        }
        args.sourceExpectedPolicy = projectV2RuntimePolicy(args.sourceObservation);
      },
      pattern: /nonliteral dynamic imports/u
    },
    {
      name: "zero-baseline loader",
      mutate: (args) => {
        for (const observation of [args.sourceObservation, args.targetObservation]) {
          observation.graph.loaderInventory.zeroBaselineCalls = [{
            sourcePath: runtimePaths.storageBase,
            sourceRawSha256: stableRuntimeRawSha256,
            position: 52,
            kind: "require-context"
          }];
          observation.loaderPolicy.zeroBaselineCallCount = 1;
        }
        args.sourceExpectedPolicy = projectV2RuntimePolicy(args.sourceObservation);
      },
      pattern: /zero-baseline loader calls/u
    },
    {
      name: "detached edge",
      mutate: ({ sourceObservation }) => {
        sourceObservation.graph.detachedEdges = [{
          from: runtimePaths.userStore,
          specifier: "./candidate",
          target: "coordination/content-qa/candidate.json"
        }];
      },
      pattern: /detached edges/u
    },
    {
      name: "unresolved call",
      mutate: ({ targetObservation }) => {
        targetObservation.graph.unresolvedCalls = [{ path: runtimePaths.userStore, call: "require" }];
      },
      pattern: /unresolved calls/u
    }
  ];
  for (const entry of cases) {
    await t.test(entry.name, () => {
      const args = makeRuntimeEvolutionCase();
      entry.mutate(args);
      assert.throws(() => buildReviewedRuntimePolicyEvolution(args), entry.pattern);
    });
  }
});

test("reviewed runtime-policy evolution v2 requires an exact committed review attestation", async (t) => {
  const cases = [
    {
      name: "missing attestation",
      mutate: (args) => {
        args.reviewAttestation = undefined;
      }
    },
    {
      name: "wrong reviewed path",
      mutate: ({ reviewAttestation }) => {
        reviewAttestation.reviewedPaths[0].path = "lib/unreviewed.ts";
      }
    },
    {
      name: "wrong reviewed status",
      mutate: ({ reviewAttestation }) => {
        reviewAttestation.reviewedPaths[0].status = "A";
      }
    },
    {
      name: "wrong added edge",
      mutate: ({ reviewAttestation }) => {
        reviewAttestation.addedEdges[0].specifier = "@/lib/not-i18n";
      }
    },
    {
      name: "wrong changed fields",
      mutate: ({ reviewAttestation }) => {
        reviewAttestation.changedPolicyFields = ["edgeCount", "edgeDigest"];
      }
    },
    {
      name: "wrong fs raw transition",
      mutate: ({ reviewAttestation }) => {
        reviewAttestation.fsRawTransitions[0].target.position += 1;
      }
    }
  ];
  for (const entry of cases) {
    await t.test(entry.name, () => {
      const args = makeRuntimeEvolutionCase();
      entry.mutate(args);
      assert.throws(
        () => buildReviewedRuntimePolicyEvolution(args),
        /does not exactly match the committed review attestation/u
      );
    });
  }
});

test("reviewed runtime-policy evolution v2 rejects changed candidates and unverified raw bindings", async (t) => {
  await t.test("candidate bytes changed", () => {
    const args = makeRuntimeEvolutionCase();
    args.candidateArtifactBindings[0].targetRawSha256 = "a".repeat(64);
    args.candidateArtifactBindings[0].unchanged = false;
    assert.throws(
      () => buildReviewedRuntimePolicyEvolution(args),
      /byte-identical candidate artifacts/u
    );
  });
  await t.test("raw bindings unverified", () => {
    const args = makeRuntimeEvolutionCase();
    args.rawBindingsVerified = false;
    assert.throws(
      () => buildReviewedRuntimePolicyEvolution(args),
      /verified raw commit bindings/u
    );
  });
});
