// Test-only full Promotion Receipt v2 fixture builder. Runtime modules must not import this file.
import { attachReceiptDigests, fingerprint } from "./discover-promotion-gate.mjs";

const H = "a".repeat(64);
const CANDIDATE = "b".repeat(64);
const CHECKER = "c".repeat(64);
const SOURCE = "1".repeat(40);
const BASELINE = "2".repeat(40);
const EXECUTION = "3".repeat(40);
const RELEASE = "4".repeat(40);

export const FULL_BINDING = Object.freeze({
  gateId: "fixture-gate-v2",
  pilotUnitId: "fixture-unit-v2",
  attemptId: "attempt-fixture-v2",
  candidateDigest: CANDIDATE,
  sourceCommit: SOURCE,
  targetBaselineCommit: BASELINE,
  checkerVersion: "promotion-checker-fixture-v2",
  checkerBundleDigest: CHECKER,
  parentPackageId: "fixture-package-v2",
  parentPackageStatus: "candidate-only",
  liveAllowed: false,
});

function makeChecks() {
  const definitions = [
    ["candidate-binding-v2", { artifactCount: 1, candidateDigest: CANDIDATE }],
    ["git-baseline-v2", { baselineDigest: H, provenanceDigest: H }],
    ["owner-evidence-v2", { bindingsDigest: H, independentFileCount: 1 }],
    ["content-qa-v2", { contentProofDigest: H, numericOracle: 1 }],
    ["shadow-adapter-v2", { outputContractCount: 1, semanticOutputDigest: H }],
    ["live-unreachable-v2", { runtimePolicyDigest: H, selectedIdentityHits: 0 }],
    ["legacy-drift-ratchet-v2", { activeExceptionCount: 0, canonicalAuditDigest: H, resolutionProofsDigest: H }],
    ["source-immutability-v2", {
      candidatePostSnapshotDigest: H,
      candidatePreSnapshotDigest: H,
      changedPathCount: 0,
      forbiddenPostSnapshotDigest: H,
      forbiddenPreSnapshotDigest: H,
    }],
    ["output-isolation-v2", { isolationProofDigest: H, outputAggregateDigest: H }],
    ["rollback-rehearsal-v2", {
      exactPreimageRestored: true,
      postimage: "absent",
      preimage: "absent",
      schemaVersion: "promotion-rollback-proof.v2",
      strategy: "remove-new-isolated-temp-root",
    }],
    ["external-side-effects-v2", { externalSideEffectCount: 0, proofDigest: H }],
    ["state-transition-v2", { currentState: "shadow_ready", priorState: "candidate_hold", requestedState: "shadow_passed" }],
    ["semantic-stability-v2", {
      equal: true,
      firstSemanticOutputDigest: H,
      independentBuildCount: 2,
      schemaVersion: "promotion-semantic-stability.v2",
      secondSemanticOutputDigest: H,
      writtenSemanticOutputDigest: H,
    }],
  ];
  return definitions.map(([id, details]) => {
    const check = { id, result: "pass", details };
    return { ...check, digest: fingerprint(check) };
  });
}

function makeRuntimeProof() {
  const runtimePolicy = {
    classificationsDigest: H,
    coveredFileCount: 1,
    coveredFilesDigest: H,
    edgeCount: 0,
    edgeDigest: H,
    frameworkEntrypointCount: 1,
    fsReadAllowlistCount: 1,
    fsReadAllowlistDigest: H,
    nextDynamicCallCount: 0,
    nextDynamicCallsiteDigest: H,
    nextDynamicLiteralImportCount: 0,
    nextDynamicNonliteralImportCount: 0,
    reachablePathCount: 1,
    reachablePathsDigest: H,
    seedCount: 1,
    topologyEdgeCount: 0,
    topologyEdgeDigest: H,
    zeroBaselineCallCount: 0,
  };
  const canonicalAudit = {
    ambiguousConflictCount: 0,
    ambiguousConflictDigest: H,
    auditDigest: H,
    candidateLikeCount: 0,
    candidateSetDigest: H,
    correlatedConflictCount: 0,
    correlatedConflictDigest: H,
    directConflictCount: 0,
    directConflictDigest: H,
    knownConflictCount: 0,
    newConflictCount: 0,
    newConflictDigest: H,
    opaqueConflictCount: 0,
    opaqueConflictDigest: H,
    reachableCandidateLikeCount: 0,
    reachableConflictDigest: H,
    schemaVersion: "promotion-canonical-audit.v2",
    secondaryBlockedCondition: null,
  };
  return {
    approvedProjectionCount: 0,
    canonicalAudit,
    canonicalAuditDigest: H,
    dereachedCount: 0,
    legacyRegistryRawSha256: H,
    liveAllowed: false,
    resolutionCount: 0,
    resolutionProofs: [],
    resolutionProofsDigest: H,
    runtimePolicy,
    runtimePolicyDigest: H,
    schemaVersion: "promotion-runtime-proof.v2",
    selectedIdentityHits: 0,
    selectedIdentityNeedleCount: 1,
  };
}

function makeExternalProof(runId) {
  const sourceBindings = [{ path: "coordination/integration/fixture/source.json", rawSha256: H }];
  const proof = {
    schemaVersion: "promotion-external-side-effect-proof.v2",
    policy: "read-only-git-local-temp-only.v2",
    checkerBundleDigest: CHECKER,
    registeredOperations: [
      "read-authoritative-repository-file",
      "read-only-git-probe",
      "create-new-os-temp-root",
      "write-shadow-json-exclusively",
      "remove-owned-os-temp-root",
    ],
    sourceBindings,
    sourceBindingsDigest: fingerprint(sourceBindings),
    tempEnvironment: [{ name: `fixture-${runId}`, canonicalPathDigest: H, outsideRepository: true }],
    networkRequestCount: 0,
    providerCallCount: 0,
    databaseWriteCount: 0,
    deploymentCommandCount: 0,
    productionWriteCount: 0,
    liveRegistryWriteCount: 0,
  };
  return { ...proof, digest: fingerprint(proof) };
}

export function makeFullReceipt(runId = "fixture-run", mutate = undefined) {
  const statusDigest = fingerprint("");
  const body = {
    schemaVersion: "promotion-receipt.v2",
    manifest: { path: "coordination/integration/fixture/promotion-manifest.v2.json", rawSha256: H },
    run: { runId, producedAt: "2026-08-27T01:02:03.004Z", ciMetadata: null },
    mode: "shadow",
    result: "pass",
    exitReasons: [],
    binding: { ...FULL_BINDING },
    worktreeProof: {
      cleanBeforeAndAfter: true,
      executionCommit: EXECUTION,
      pre: { clean: true, headCommit: EXECUTION, schemaVersion: "promotion-worktree-state.v2", statusDigest },
      post: { clean: true, headCommit: EXECUTION, schemaVersion: "promotion-worktree-state.v2", statusDigest },
      unchangedHead: true,
    },
    provenanceProof: {
      candidateDigest: CANDIDATE,
      candidatePathCount: 1,
      candidatePathDigest: H,
      schemaVersion: "promotion-provenance-proof.v2",
      sourceBlobAggregateDigest: H,
      sourceCommit: SOURCE,
      sourceCommitIsAncestor: true,
    },
    baselineProof: {
      allowedTestOnlyPathCount: 0,
      allowedTestOnlyPathsDigest: H,
      executionCommit: EXECUTION,
      observedChangedPathCount: 0,
      observedChangedPathsDigest: H,
      protectedPaths: ["app", "data", "lib"],
      runtimeChangedPathCount: 0,
      runtimeChangedPathsDigest: H,
      schemaVersion: "promotion-baseline-proof.v2",
      targetBaselineCommit: BASELINE,
    },
    checkerReleaseProof: {
      bundleAlgorithm: "git-blob-mode-path-v1",
      bundleDigest: CHECKER,
      bundlePathCount: 1,
      bundlePathsDigest: H,
      ledgerRawSha256: H,
      releaseCommit: RELEASE,
      schemaVersion: "promotion-checker-release-proof.v2",
      version: "promotion-checker-fixture-v2",
    },
    evidenceProof: {
      bindings: [{
        evidenceId: "fixture-review",
        evidencePath: "coordination/integration/fixture/review.json",
        rawSha256: H,
        result: "pass",
        reviewedCommit: SOURCE,
        role: "independent-review",
        semanticDigest: H,
      }],
      bindingsDigest: H,
      independentFileCount: 1,
      roleCount: 1,
      roles: ["independent-review"],
      schemaVersion: "promotion-evidence-proof.v2",
    },
    contentProof: {
      acceptedAnswerAssertions: [{ expected: true, observed: true, submitted: "fixture-answer" }],
      clusterId: "fixture-cluster",
      clusterStandards: ["fixture-standard"],
      directlyAssessedStandards: ["fixture-standard"],
      exactLayerFieldPaths: ["answer"],
      grade: "fixture-grade",
      liveAllowed: false,
      localizationStatus: "fixture-complete",
      misconceptionCoverage: ["fixture-misconception"],
      numericOracle: 1,
      ratioOrderPreserved: true,
      recordIds: ["fixture-record"],
      schemaVersion: "promotion-content-proof.v2",
    },
    candidateSourceProof: {
      byteIdentical: true,
      paths: ["coordination/integration/fixture/source.json"],
      postAggregateDigest: H,
      postSnapshotDigest: H,
      preAggregateDigest: H,
      preSnapshotDigest: H,
    },
    shadowOutputProof: {
      aggregateDigest: H,
      files: [{ bytes: 1, path: "shadow-output.json", rawSha256: H, schemaVersion: "promotion-shadow-output.v2", semanticDigest: H }],
      semanticAggregateDigest: H,
    },
    compatibilityReportDigest: H,
    runtimeAndLegacyProof: makeRuntimeProof(),
    liveReachabilityProof: {
      liveAllowed: false,
      registeredRuntimePathCount: 1,
      registeredRuntimePathsDigest: H,
      scanBlindSpotCount: 0,
      selectedCandidateHitCount: 0,
      selectedCandidateIdentityCount: 1,
      unknownLiveRegistryCount: 0,
      unresolvedDynamicImportCount: 0,
    },
    manifestParentProof: {
      manifestPath: "coordination/integration/fixture/promotion-manifest.v2.json",
      manifestRawSha256: H,
    },
    forbiddenPathDiff: {
      changedPathCount: 0,
      changedPathsDigest: H,
      paths: ["app", "data", "lib"],
      postSnapshotDigest: H,
      preSnapshotDigest: H,
    },
    externalSideEffectProof: makeExternalProof(runId),
    rollbackProof: {
      exactPreimageRestored: true,
      postimage: "absent",
      preimage: "absent",
      schemaVersion: "promotion-rollback-proof.v2",
      strategy: "remove-new-isolated-temp-root",
    },
    checks: makeChecks(),
    lifecycle: {
      priorState: "candidate_hold",
      currentState: "shadow_ready",
      recommendedState: "shadow_passed",
      parentPackageStatus: "candidate-only",
      maturityClaim: "shadow-only",
      liveAllowed: false,
    },
    unmetConditions: [{ code: "LIVE_UNPROVEN", owner: "fixture-owner", scope: "live" }],
  };
  mutate?.(body);
  return attachReceiptDigests(body);
}

// Deliberately bypasses runtime validation so adversarial tests can model an attacker
// who understands and consistently recomputes both declared digests.
export function unsafeRehashReceipt(value) {
  const body = structuredClone(value);
  delete body.semanticReceiptDigest;
  delete body.rawReceiptDigest;
  const { digest: _externalDigest, tempEnvironment, ...stableExternal } = body.externalSideEffectProof;
  const normalizedExternal = {
    ...stableExternal,
    tempEnvironment: {
      observed: Array.isArray(tempEnvironment) && tempEnvironment.length > 0,
      allOutsideRepository: Array.isArray(tempEnvironment) && tempEnvironment.length > 0 && tempEnvironment.every((entry) => entry?.outsideRepository === true),
    },
  };
  normalizedExternal.digest = fingerprint(normalizedExternal);
  const checks = body.checks.map((check) => {
    const safeRole = check.id === "external-side-effects" || /^external-side-effects-v[1-9][0-9]*$/u.test(check.id);
    if (!safeRole) return check;
    const { digest: _checkDigest, id: exactSafeRole, ...withoutDigest } = check;
    const normalized = { id: exactSafeRole, ...withoutDigest, details: { ...check.details, proofDigest: normalizedExternal.digest } };
    return { ...normalized, digest: fingerprint(normalized) };
  });
  const semanticProjection = {
    ...body,
    run: { ...body.run, runId: null, producedAt: null, ciMetadata: null },
    externalSideEffectProof: normalizedExternal,
    checks,
  };
  const semanticReceiptDigest = fingerprint(semanticProjection);
  const rawReceiptDigest = fingerprint({ ...body, semanticReceiptDigest });
  return { ...body, semanticReceiptDigest, rawReceiptDigest };
}

export function closedTestSchemaFor(value) {
  if (value === null) return { type: "null" };
  if (Array.isArray(value)) {
    if (value.length === 0) return { type: "array", maxItems: 0 };
    return { type: "array", items: closedTestSchemaFor(value[0]) };
  }
  if (value && typeof value === "object") {
    const keys = Object.keys(value);
    return {
      type: "object",
      required: keys,
      properties: Object.fromEntries(keys.map((key) => [key, closedTestSchemaFor(value[key])])),
      additionalProperties: false,
    };
  }
  if (typeof value === "number") return { type: Number.isInteger(value) ? "integer" : "number" };
  return { type: typeof value };
}

export function fullReceiptTestSchema() {
  const schema = closedTestSchemaFor(makeFullReceipt("schema-shape"));
  schema.properties.schemaVersion = { const: "promotion-receipt.v2" };
  schema.properties.mode = { const: "shadow" };
  schema.properties.exitReasons = { type: "array" };
  schema.properties.checks = { type: "array", minItems: 1 };
  schema.properties.run.properties.ciMetadata = {};
  return schema;
}

export const FULL_FIXTURE_CONSTANTS = Object.freeze({ H, CANDIDATE, CHECKER, SOURCE, BASELINE, EXECUTION, RELEASE });
