import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  PromotionGateError,
  fingerprint,
  sha256
} from "../promotion-gate-lib.mjs";

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDirectory, "../../..");
const modulePath = path.join(testDirectory, "promotion-shadow-finalization-v2-lib.mjs");
const pilotRoot = "coordination/integration/pilots/us-ca-math-rag-v2-g6-ratios-v2/attempt-003";
const finalClosurePath = `${pilotRoot}/shadow-closure.v2.json`;
const finalRegistryPath = `${pilotRoot}/lifecycle-registry.v2.json`;
const trustBoundary =
  "Repository hash-bound readback record; GitHub API authenticity requires independent repository-admin readback.";

async function loadApi() {
  assert.equal(
    existsSync(modulePath),
    true,
    "The Promotion Shadow finalization v2 module must exist before final closure can be validated."
  );
  return import(pathToFileURL(modulePath).href);
}

async function readArtifact(relativePath) {
  const bytes = await readFile(path.join(repoRoot, relativePath));
  return {
    path: relativePath,
    bytes,
    value: JSON.parse(bytes.toString("utf8"))
  };
}

function syntheticArtifact(relativePath, value) {
  return {
    path: relativePath,
    value,
    bytes: Buffer.from(`${JSON.stringify(value, null, 2)}\n`, "utf8")
  };
}

function fileReference(artifact) {
  return { path: artifact.path, rawSha256: sha256(artifact.bytes) };
}

function withDigest(value, digestField) {
  return { ...value, [digestField]: fingerprint(value) };
}

function lifecycleEvent(value) {
  return withDigest(value, "eventDigest");
}

function clone(value) {
  return structuredClone(value);
}

function cloneFixture(fixture) {
  return {
    closure: clone(fixture.closure),
    registry: clone(fixture.registry),
    artifacts: { ...fixture.artifacts }
  };
}

async function buildFixture() {
  const manifest = await readArtifact(`${pilotRoot}/promotion-manifest.v2.json`);
  const evidenceIndex = await readArtifact(`${pilotRoot}/inputs/evidence-index.v2.json`);
  const receipt = await readArtifact(`${pilotRoot}/shadow-receipt.v2.json`);
  const a11Replay = await readArtifact(`${pilotRoot}/postrun/a11-independent-replay.v2.json`);
  const a22Isolation = await readArtifact(`${pilotRoot}/postrun/a22-shadow-isolation.v2.json`);
  const legacyRegistry = await readArtifact("coordination/integration/v2/legacy-resolution-registry.v2.json");
  const compositionHeadCommit = "1".repeat(40);
  const mergeCommit = "2".repeat(40);

  const prCheck = syntheticArtifact(`${pilotRoot}/postrun/a11-pr-check-proof.v2.json`, {
    schemaVersion: "promotion-pr-check-proof.v2",
    role: "A11",
    result: "pass",
    repository: "HUDongpin/MAIS-MVP",
    pullRequestNumber: 162,
    headCommit: compositionHeadCommit,
    workflowName: "promotion-shadow-gate",
    checkName: "promotion-shadow-gate",
    event: "pull_request",
    runId: "33000000001",
    runAttempt: 1,
    jobId: "99000000001",
    conclusion: "success",
    manifestRawSha256: sha256(manifest.bytes),
    candidateDigest: manifest.value.candidateDigest,
    semanticReceiptDigest: receipt.value.semanticReceiptDigest,
    liveAllowed: false,
    observedAt: "2026-08-26T06:00:00Z",
    url: "https://github.com/HUDongpin/MAIS-MVP/actions/runs/33000000001",
    trustBoundary
  });
  const requiredChecks = syntheticArtifact(`${pilotRoot}/postrun/a22-required-check-proof.v2.json`, {
    schemaVersion: "promotion-required-check-proof.v2",
    role: "A22",
    result: "pass",
    repository: "HUDongpin/MAIS-MVP",
    branch: "main",
    checks: [
      { context: "promotion-shadow-gate", appId: 15368 },
      { context: "validate", appId: 15368 }
    ],
    strict: false,
    enforceAdmins: true,
    required: true,
    observedAt: "2026-08-26T06:10:00Z",
    apiUrl: "https://api.github.com/repos/HUDongpin/MAIS-MVP/branches/main/protection",
    trustBoundary
  });
  const mainPostMerge = syntheticArtifact(`${pilotRoot}/postrun/a22-main-postmerge-proof.v2.json`, {
    schemaVersion: "promotion-main-postmerge-proof.v2",
    role: "A22",
    result: "pass",
    repository: "HUDongpin/MAIS-MVP",
    branch: "main",
    event: "push",
    mergeCommit,
    workflowName: "promotion-shadow-gate",
    checkName: "promotion-shadow-gate",
    runId: "33000000002",
    runAttempt: 1,
    jobId: "99000000002",
    conclusion: "success",
    manifestRawSha256: sha256(manifest.bytes),
    candidateDigest: manifest.value.candidateDigest,
    semanticReceiptDigest: receipt.value.semanticReceiptDigest,
    requiredCheckObserved: true,
    liveAllowed: false,
    observedAt: "2026-08-26T06:30:00Z",
    url: "https://github.com/HUDongpin/MAIS-MVP/actions/runs/33000000002",
    trustBoundary
  });
  const a25Closeout = syntheticArtifact(`${pilotRoot}/postrun/a25-review-package-closeout.v2.json`, {
    schemaVersion: "promotion-review-package-closeout.v2",
    role: "A25",
    result: "pass",
    repository: "HUDongpin/MAIS-MVP",
    pullRequestNumber: 162,
    reviewedHeadCommit: compositionHeadCommit,
    mergeCommit,
    finalDisposition: "reviewed commit",
    ownerPackageFinalStates: [
      "A04", "A05", "A10", "A11", "A18", "A21", "A22", "A23", "A24", "A25"
    ].map((owner) => ({ owner, finalState: "reviewed commit" })),
    authorizationReference: "https://github.com/HUDongpin/MAIS-MVP/pull/162",
    liveAllowed: false,
    observedAt: "2026-08-26T06:40:00Z",
    trustBoundary
  });

  const artifacts = {
    manifest,
    evidenceIndex,
    receipt,
    a11Replay,
    a22Isolation,
    legacyRegistry,
    prCheck,
    requiredChecks,
    mainPostMerge,
    a25Closeout
  };
  const closureWithoutDigest = {
    schemaVersion: "promotion-shadow-closure.v2",
    binding: {
      gateId: manifest.value.gateId,
      pilotUnitId: manifest.value.pilotUnitId,
      attemptId: manifest.value.attemptId,
      parentPackageId: manifest.value.parentPackage.id,
      candidateDigest: manifest.value.candidateDigest,
      sourceCommit: manifest.value.sourceCommit,
      targetBaselineCommit: manifest.value.targetBaselineCommit,
      checkerVersion: manifest.value.checkerVersion,
      checkerBundleDigest: manifest.value.checkerRelease.bundleDigest,
      executionCommit: receipt.value.worktreeProof.executionCommit,
      compositionHeadCommit,
      mergeCommit
    },
    artifacts: Object.fromEntries(
      Object.entries(artifacts).map(([name, artifact]) => [name, fileReference(artifact)])
    ),
    receiptDigests: {
      rawReceiptDigest: receipt.value.rawReceiptDigest,
      semanticReceiptDigest: receipt.value.semanticReceiptDigest,
      independentRawReceiptDigest: a11Replay.value.independentReplay.rawReceiptDigest
    },
    legacyDisposition: {
      packageId: "us-ca-k5-knowledge-point-practice-v1",
      deadline: "2026-09-24T00:00:00Z",
      terminalDecision: "remove-live",
      activeExceptionCount: 0,
      unresolvedConflictCount: 0,
      runtimeGraphBlindSpotCount: 0
    },
    stateTransition: {
      fromState: "shadow_ready",
      toState: "shadow_passed",
      parentPackageStatus: "candidate-only",
      pilotUnitStatus: "shadow_passed",
      liveAllowed: false,
      liveEvidence: "none",
      maturityClaim: "Shadow-mature / live-unproven"
    },
    unmetShadowConditions: [],
    liveBlockers: [
      "missing-zh-localization",
      "missing-zhHans-localization",
      "live-integration-and-release-unproven"
    ],
    trustBoundary
  };
  const closure = withDigest(closureWithoutDigest, "closureDigest");

  const genesis = lifecycleEvent({
    sequence: 1,
    eventId: "attempt-003-candidate-hold",
    fromState: null,
    toState: "candidate_hold",
    evidence: null,
    previousEventDigest: null
  });
  const ready = lifecycleEvent({
    sequence: 2,
    eventId: "attempt-003-shadow-ready",
    fromState: "candidate_hold",
    toState: "shadow_ready",
    evidence: {
      manifest: fileReference(manifest),
      evidenceIndex: fileReference(evidenceIndex)
    },
    previousEventDigest: genesis.eventDigest
  });
  const passed = lifecycleEvent({
    sequence: 3,
    eventId: "attempt-003-shadow-passed",
    fromState: "shadow_ready",
    toState: "shadow_passed",
    evidence: {
      closure: {
        path: `${pilotRoot}/shadow-closure.v2.json`,
        digest: closure.closureDigest
      }
    },
    previousEventDigest: ready.eventDigest
  });
  const registry = withDigest({
    schemaVersion: "promotion-lifecycle-registry.v2",
    pilotUnitId: manifest.value.pilotUnitId,
    attemptId: manifest.value.attemptId,
    parentPackageStatus: "candidate-only",
    pilotUnitStatus: "shadow_passed",
    liveAllowed: false,
    liveEvidence: "none",
    maturityClaim: "Shadow-mature / live-unproven",
    events: [genesis, ready, passed]
  }, "registryDigest");

  return { closure, registry, artifacts };
}

function replaceArtifact(fixture, key, value) {
  const artifact = syntheticArtifact(fixture.artifacts[key].path, value);
  const next = cloneFixture(fixture);
  next.artifacts[key] = artifact;
  next.closure.artifacts[key] = fileReference(artifact);
  const { closureDigest, ...closurePayload } = next.closure;
  next.closure = withDigest(closurePayload, "closureDigest");
  return next;
}

function mutateClosure(fixture, mutator) {
  const next = cloneFixture(fixture);
  mutator(next.closure);
  const { closureDigest, ...payload } = next.closure;
  next.closure = withDigest(payload, "closureDigest");
  return next;
}

function mutateRegistry(fixture, mutator) {
  const next = cloneFixture(fixture);
  mutator(next.registry);
  const { registryDigest, ...payload } = next.registry;
  next.registry = withDigest(payload, "registryDigest");
  return next;
}

test("finalization module and public schemas exist outside the frozen checker bundle", async () => {
  const api = await loadApi();
  assert.equal(api.PROMOTION_SHADOW_CLOSURE_V2_SCHEMA, "promotion-shadow-closure.v2");
  assert.equal(api.PROMOTION_LIFECYCLE_REGISTRY_V2_SCHEMA, "promotion-lifecycle-registry.v2");
  for (const schemaName of [
    "promotion-shadow-closure.v2.schema.json",
    "promotion-lifecycle-registry.v2.schema.json"
  ]) {
    const schema = JSON.parse(await readFile(path.join(testDirectory, "schemas", schemaName), "utf8"));
    assert.equal(schema.$schema, "https://json-schema.org/draft/2020-12/schema");
    assert.equal(schema.additionalProperties, false);
  }
  const releaseLedger = JSON.parse(await readFile(
    path.join(repoRoot, "coordination/integration/checker-releases.v2.json"),
    "utf8"
  ));
  const frozen = releaseLedger.entries.find(({ version }) => version === "promotion-gate-shadow-v2.2");
  assert.ok(frozen);
  assert.equal(frozen.bundlePaths.some((entry) => entry.includes("finalization")), false);
});

test("valid external proofs close attempt-003 into one shadow_passed non-live registry", async () => {
  const api = await loadApi();
  const fixture = await buildFixture();
  const closureResult = api.validateV2ShadowClosure(fixture.closure, fixture.artifacts);
  assert.deepEqual(closureResult, {
    result: "pass",
    state: "shadow_passed",
    closureDigest: fixture.closure.closureDigest,
    semanticReceiptDigest: fixture.artifacts.receipt.value.semanticReceiptDigest,
    liveAllowed: false
  });
  const registryResult = api.validateV2LifecycleRegistry(fixture.registry, {
    manifest: fixture.artifacts.manifest,
    evidenceIndex: fixture.artifacts.evidenceIndex,
    closure: fixture.closure,
    closurePath: `${pilotRoot}/shadow-closure.v2.json`,
    closureArtifacts: fixture.artifacts
  });
  assert.deepEqual(registryResult, {
    result: "pass",
    state: "shadow_passed",
    registryDigest: fixture.registry.registryDigest,
    liveAllowed: false
  });
});

test("closure rejects stale Receipt identity even when its self digest is recomputed", async () => {
  const api = await loadApi();
  const fixture = mutateClosure(await buildFixture(), (closure) => {
    closure.receiptDigests.semanticReceiptDigest = "0".repeat(64);
  });
  assert.throws(
    () => api.validateV2ShadowClosure(fixture.closure, fixture.artifacts),
    (error) => error instanceof PromotionGateError && error.code === "V2_FINALIZATION_RECEIPT_MISMATCH"
  );
});

test("closure rejects a failed or wrong-head PR check proof", async () => {
  const api = await loadApi();
  let fixture = await buildFixture();
  fixture = replaceArtifact(fixture, "prCheck", {
    ...fixture.artifacts.prCheck.value,
    conclusion: "failure"
  });
  assert.throws(
    () => api.validateV2ShadowClosure(fixture.closure, fixture.artifacts),
    (error) => error instanceof PromotionGateError && error.code === "V2_FINALIZATION_PR_CHECK_INVALID"
  );

  fixture = await buildFixture();
  fixture = replaceArtifact(fixture, "prCheck", {
    ...fixture.artifacts.prCheck.value,
    headCommit: "3".repeat(40)
  });
  assert.throws(
    () => api.validateV2ShadowClosure(fixture.closure, fixture.artifacts),
    (error) => error instanceof PromotionGateError && error.code === "V2_FINALIZATION_PR_CHECK_INVALID"
  );
});

test("closure requires exactly validate and promotion-shadow-gate as GitHub Actions required checks", async () => {
  const api = await loadApi();
  let fixture = await buildFixture();
  fixture = replaceArtifact(fixture, "requiredChecks", {
    ...fixture.artifacts.requiredChecks.value,
    checks: [{ context: "validate", appId: 15368 }]
  });
  assert.throws(
    () => api.validateV2ShadowClosure(fixture.closure, fixture.artifacts),
    (error) => error instanceof PromotionGateError && error.code === "V2_FINALIZATION_REQUIRED_CHECK_INVALID"
  );

  fixture = await buildFixture();
  fixture = replaceArtifact(fixture, "requiredChecks", {
    ...fixture.artifacts.requiredChecks.value,
    required: false
  });
  assert.throws(
    () => api.validateV2ShadowClosure(fixture.closure, fixture.artifacts),
    (error) => error instanceof PromotionGateError && error.code === "V2_FINALIZATION_REQUIRED_CHECK_INVALID"
  );
});

test("closure rejects non-main, non-push, or non-success post-merge evidence", async () => {
  const api = await loadApi();
  for (const mutation of [
    { branch: "release" },
    { event: "workflow_dispatch" },
    { conclusion: "failure" },
    { requiredCheckObserved: false }
  ]) {
    let fixture = await buildFixture();
    fixture = replaceArtifact(fixture, "mainPostMerge", {
      ...fixture.artifacts.mainPostMerge.value,
      ...mutation
    });
    assert.throws(
      () => api.validateV2ShadowClosure(fixture.closure, fixture.artifacts),
      (error) => error instanceof PromotionGateError && error.code === "V2_FINALIZATION_MAIN_PROOF_INVALID"
    );
  }
});

test("closure requires A25 final disposition for every owner review package", async () => {
  const api = await loadApi();
  let fixture = await buildFixture();
  fixture = replaceArtifact(fixture, "a25Closeout", {
    ...fixture.artifacts.a25Closeout.value,
    ownerPackageFinalStates: fixture.artifacts.a25Closeout.value.ownerPackageFinalStates.slice(1)
  });
  assert.throws(
    () => api.validateV2ShadowClosure(fixture.closure, fixture.artifacts),
    (error) => error instanceof PromotionGateError && error.code === "V2_FINALIZATION_A25_CLOSEOUT_INVALID"
  );
});

test("closure proves the 492-question deadline was closed by de-reaching with zero graph blind spots", async () => {
  const api = await loadApi();
  for (const mutation of [
    { terminalDecision: "re-certify" },
    { activeExceptionCount: 1 },
    { unresolvedConflictCount: 1 },
    { runtimeGraphBlindSpotCount: 1 }
  ]) {
    const fixture = mutateClosure(await buildFixture(), (closure) => {
      Object.assign(closure.legacyDisposition, mutation);
    });
    assert.throws(
      () => api.validateV2ShadowClosure(fixture.closure, fixture.artifacts),
      (error) => error instanceof PromotionGateError && error.code === "V2_FINALIZATION_LEGACY_INVALID"
    );
  }
});

test("independent owner artifacts cannot reuse one evidence path", async () => {
  const api = await loadApi();
  const fixture = mutateClosure(await buildFixture(), (closure) => {
    closure.artifacts.a22Isolation.path = closure.artifacts.a11Replay.path;
  });
  assert.throws(
    () => api.validateV2ShadowClosure(fixture.closure, fixture.artifacts),
    (error) => error instanceof PromotionGateError && error.code === "V2_FINALIZATION_EVIDENCE_REUSE"
  );
});

test("lifecycle registry rejects skipped transitions, broken event chains, and every live authorization", async () => {
  const api = await loadApi();
  let fixture = mutateRegistry(await buildFixture(), (registry) => {
    registry.events = [registry.events[0], registry.events[2]];
  });
  assert.throws(
    () => api.validateV2LifecycleRegistry(fixture.registry, {
      manifest: fixture.artifacts.manifest,
      evidenceIndex: fixture.artifacts.evidenceIndex,
      closure: fixture.closure,
      closurePath: `${pilotRoot}/shadow-closure.v2.json`,
      closureArtifacts: fixture.artifacts
    }),
    (error) => error instanceof PromotionGateError && error.code === "V2_FINALIZATION_REGISTRY_TRANSITION_INVALID"
  );

  fixture = mutateRegistry(await buildFixture(), (registry) => {
    registry.events[2].previousEventDigest = "0".repeat(64);
  });
  assert.throws(
    () => api.validateV2LifecycleRegistry(fixture.registry, {
      manifest: fixture.artifacts.manifest,
      evidenceIndex: fixture.artifacts.evidenceIndex,
      closure: fixture.closure,
      closurePath: `${pilotRoot}/shadow-closure.v2.json`,
      closureArtifacts: fixture.artifacts
    }),
    (error) => error instanceof PromotionGateError && error.code === "V2_FINALIZATION_REGISTRY_EVENT_INVALID"
  );

  fixture = mutateRegistry(await buildFixture(), (registry) => {
    registry.liveAllowed = true;
  });
  assert.throws(
    () => api.validateV2LifecycleRegistry(fixture.registry, {
      manifest: fixture.artifacts.manifest,
      evidenceIndex: fixture.artifacts.evidenceIndex,
      closure: fixture.closure,
      closurePath: `${pilotRoot}/shadow-closure.v2.json`,
      closureArtifacts: fixture.artifacts
    }),
    (error) => error instanceof PromotionGateError && error.code === "V2_FINALIZATION_LIVE_FORBIDDEN"
  );
});

test("Promotion Gate test script and CI execute the finalization suite without adding a live command", async () => {
  await loadApi();
  const pkg = JSON.parse(await readFile(path.join(repoRoot, "package.json"), "utf8"));
  assert.match(
    pkg.scripts["test:promotion-gate"],
    /coordination\/integration\/finalization\/promotion-shadow-finalization-v2\.test\.mjs/u
  );
  const workflowSource = await readFile(path.join(repoRoot, ".github/workflows/promotion-shadow.yml"), "utf8");
  assert.match(workflowSource, /name: Validate Promotion Shadow finalization contract/u);
  assert.match(workflowSource, /npm run test:promotion-gate/u);
  assert.doesNotMatch(workflowSource, /promotion:(?:preview|deploy|live|promote-live)/u);
});

test("repository finalization verifier accepts only one coherent paired repository state", async () => {
  const api = await loadApi();
  assert.equal(typeof api.verifyRepositoryV2Finalization, "function");
  const result = await api.verifyRepositoryV2Finalization(repoRoot);
  if (result.result === "pending") {
    assert.deepEqual(result, {
      result: "pending",
      state: "shadow_ready",
      closurePresent: false,
      registryPresent: false,
      liveAllowed: false
    });
  } else {
    assert.equal(result.result, "pass");
    assert.equal(result.state, "shadow_passed");
    assert.match(result.closureDigest, /^[a-f0-9]{64}$/u);
    assert.match(result.registryDigest, /^[a-f0-9]{64}$/u);
    assert.match(result.semanticReceiptDigest, /^[a-f0-9]{64}$/u);
    assert.equal(result.liveAllowed, false);
  }
});

test("repository finalization verifier fails closed when only one terminal artifact exists", async () => {
  const api = await loadApi();
  assert.equal(typeof api.verifyRepositoryV2Finalization, "function");
  const fixtureRoot = await mkdtemp(path.join(os.tmpdir(), "promotion-finalization-partial-"));
  try {
    const closurePath = path.join(fixtureRoot, finalClosurePath);
    await mkdir(path.dirname(closurePath), { recursive: true });
    await writeFile(closurePath, "{}\n", { flag: "wx" });
    await assert.rejects(
      () => api.verifyRepositoryV2Finalization(fixtureRoot),
      (error) => error instanceof PromotionGateError && error.code === "V2_FINALIZATION_PARTIAL"
    );
  } finally {
    await rm(fixtureRoot, { recursive: true, force: true });
  }
});

test("repository finalization verifier loads and validates every committed artifact when closure is present", async () => {
  const api = await loadApi();
  assert.equal(typeof api.verifyRepositoryV2Finalization, "function");
  const fixture = await buildFixture();
  const fixtureRoot = await mkdtemp(path.join(os.tmpdir(), "promotion-finalization-complete-"));
  try {
    for (const artifact of Object.values(fixture.artifacts)) {
      const target = path.join(fixtureRoot, artifact.path);
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, artifact.bytes, { flag: "wx" });
    }
    const closurePath = path.join(fixtureRoot, finalClosurePath);
    const registryPath = path.join(fixtureRoot, finalRegistryPath);
    await mkdir(path.dirname(closurePath), { recursive: true });
    await writeFile(closurePath, `${JSON.stringify(fixture.closure, null, 2)}\n`, { flag: "wx" });
    await writeFile(registryPath, `${JSON.stringify(fixture.registry, null, 2)}\n`, { flag: "wx" });
    const result = await api.verifyRepositoryV2Finalization(fixtureRoot);
    assert.deepEqual(result, {
      result: "pass",
      state: "shadow_passed",
      closureDigest: fixture.closure.closureDigest,
      registryDigest: fixture.registry.registryDigest,
      semanticReceiptDigest: fixture.artifacts.receipt.value.semanticReceiptDigest,
      liveAllowed: false
    });
  } finally {
    await rm(fixtureRoot, { recursive: true, force: true });
  }
});
