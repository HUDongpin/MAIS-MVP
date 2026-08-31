import { createHash } from "node:crypto";
import { execFile as execFileCallback } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";

import {
  assertSafeRepoRelativePath,
  fingerprint,
  observeCanonicalRuntimePolicy,
  readAuthoritativeFile,
  stableJson
} from "../coordination/integration/promotion-gate-lib.mjs";
import {
  collectV2BaselineProof,
  collectV2CheckerReleaseProof,
  collectV2ExternalSideEffectProof,
  collectV2GitWorktreeProof,
  collectV2ProvenanceProof,
  collectV2RuntimeAndLegacyProof,
  loadV2Candidate,
  loadV2Evidence,
  loadV2Manifest,
  projectV2RuntimePolicy,
  validateV2ContentSemantics
} from "../coordination/integration/v2/promotion-gate-v2-lib.mjs";
import { parsePromotionWorkflowJsonBytes } from "./promotion-workflow-json-guard.mjs";

export const PROMOTION_REQUIRED_CHECK_SEMANTIC_RESCOPE_SCHEMA =
  "promotion-required-check-semantic-rescope.v1";
export const PROMOTION_REQUIRED_CHECK_DECISION_SCHEMA =
  "promotion-required-check-enforcement-decision.v1";

const COMMIT = /^[a-f0-9]{40}$/u;
const SHA256 = /^[a-f0-9]{64}$/u;
const STATIC_PROMOTION_CONTROLLED_PATHS = Object.freeze([
  ".github/workflows/promotion-shadow.yml",
  "package.json",
  "package-lock.json"
]);
const execFile = promisify(execFileCallback);
const GIT_EXECUTABLE = "/usr/bin/git";
const GIT_MAX_BUFFER = (32 * 1024 * 1024) + 1024;
const GIT_ENV = Object.freeze({
  PATH: "/usr/bin:/bin",
  GIT_CONFIG_GLOBAL: "/dev/null",
  GIT_CONFIG_NOSYSTEM: "1",
  GIT_OPTIONAL_LOCKS: "0",
  GIT_PAGER: "cat",
  GIT_TERMINAL_PROMPT: "0",
  LC_ALL: "C"
});
const fatalUtf8Decoder = new TextDecoder("utf-8", { fatal: true });

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function result(input, code, details = {}) {
  const decision = {
    schemaVersion: PROMOTION_REQUIRED_CHECK_SEMANTIC_RESCOPE_SCHEMA,
    result: code === "historical_pilot_intact_semantic_runtime_safe" ? "pass" : "blocked",
    code,
    liveAllowed: false,
    binding: details.binding ?? null,
    promotionControlledPathCount: details.promotionControlledPathCount ?? 0,
    graph: details.graph ?? null,
    reviewQueue: details.reviewQueue ?? [],
    decisionDigest: ""
  };
  const digestPayload = structuredClone(decision);
  delete digestPayload.decisionDigest;
  decision.decisionDigest = sha256(stableJson(digestPayload));
  return decision;
}

function assertCommit(value, code) {
  if (typeof value !== "string" || !COMMIT.test(value)) throw new Error(code);
}

function assertDigest(value, code) {
  if (typeof value !== "string" || !SHA256.test(value)) throw new Error(code);
}

function safePath(value) {
  try {
    assertSafeRepoRelativePath(value);
    return value;
  } catch {
    throw new Error("PROMOTION_PATH_INVALID");
  }
}

function codePointCompare(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

export function normalizePromotionChangedPaths(rawNul) {
  if (typeof rawNul !== "string" || (rawNul.length > 0 && !rawNul.endsWith("\0"))) {
    throw new Error("GITHUB_DIFF_PATHS_INVALID");
  }
  const paths = rawNul.length === 0 ? [] : rawNul.slice(0, -1).split("\0");
  const exact = new Set();
  const folded = new Set();
  for (const entry of paths) {
    safePath(entry);
    const lowered = entry.toLocaleLowerCase("en-US");
    if (exact.has(entry) || folded.has(lowered)) throw new Error("GITHUB_DIFF_PATHS_INVALID");
    exact.add(entry);
    folded.add(lowered);
  }
  return [...exact].sort(codePointCompare);
}

export function parseStrictGithubEventJson(bytes) {
  const event = parsePromotionWorkflowJsonBytes(bytes);
  const actual = event !== null && typeof event === "object" && !Array.isArray(event)
    ? Object.keys(event).sort(codePointCompare)
    : [];
  if (stableJson(actual) !== stableJson(["base", "head", "number"])) throw new Error("GITHUB_EVENT_INVALID");
  if (!Number.isSafeInteger(event.number) || event.number < 1) throw new Error("GITHUB_EVENT_INVALID");
  for (const key of ["base", "head"]) {
    if (event[key] === null || typeof event[key] !== "object" || Array.isArray(event[key]) ||
      stableJson(Object.keys(event[key]).sort(codePointCompare)) !== stableJson(["sha"])) {
      throw new Error("GITHUB_EVENT_INVALID");
    }
    assertCommit(event[key].sha, "GITHUB_EVENT_INVALID");
  }
  return event;
}

export function parseStrictGithubPushEventJson(bytes) {
  const event = parsePromotionWorkflowJsonBytes(bytes);
  const actual = event !== null && typeof event === "object" && !Array.isArray(event)
    ? Object.keys(event).sort(codePointCompare)
    : [];
  if (stableJson(actual) !== stableJson(["after", "before", "ref"])) throw new Error("GITHUB_EVENT_INVALID");
  assertCommit(event.before, "GITHUB_EVENT_INVALID");
  assertCommit(event.after, "GITHUB_EVENT_INVALID");
  if (event.ref !== "refs/heads/main") throw new Error("GITHUB_EVENT_INVALID");
  return event;
}

function parseGithubEventEnvelope(bytes, eventName) {
  const value = parsePromotionWorkflowJsonBytes(bytes);
  if (value === null || typeof value !== "object" || Array.isArray(value)) throw new Error("GITHUB_EVENT_INVALID");
  if (eventName === "pull_request") {
    const pullRequest = value.pull_request;
    const normalized = {
      number: value.number,
      base: pullRequest?.base,
      head: pullRequest?.head
    };
    return parseStrictGithubEventJson(Buffer.from(JSON.stringify(normalized), "utf8"));
  }
  if (eventName === "push") {
    const normalized = { before: value.before, after: value.after, ref: value.ref };
    return parseStrictGithubPushEventJson(Buffer.from(JSON.stringify(normalized), "utf8"));
  }
  throw new Error("GITHUB_EVENT_INVALID");
}

async function runReadonlyGit({ repoRoot, args }) {
  try {
    const { stdout } = await execFile(GIT_EXECUTABLE, args, {
      cwd: repoRoot,
      shell: false,
      timeout: 10_000,
      maxBuffer: GIT_MAX_BUFFER,
      env: GIT_ENV,
      encoding: "buffer"
    });
    return Buffer.from(stdout);
  } catch {
    throw new Error("GITHUB_GIT_EVIDENCE_UNAVAILABLE");
  }
}

async function gitBytes(runner, repoRoot, args) {
  const value = await runner({ repoRoot, args: Object.freeze([...args]), executable: GIT_EXECUTABLE });
  if (!Buffer.isBuffer(value) && !(value instanceof Uint8Array)) throw new Error("GITHUB_GIT_EVIDENCE_UNAVAILABLE");
  return Buffer.from(value);
}

function parseTrackedTreeEntry(bytes, filePath) {
  if (bytes.length === 0 || bytes[bytes.length - 1] !== 0) {
    throw new Error("PROMOTION_AUTHORITY_UNTRACKED");
  }
  const entries = bytes.subarray(0, -1).toString("utf8").split("\0");
  if (entries.length !== 1) throw new Error("PROMOTION_AUTHORITY_UNTRACKED");
  const separator = entries[0].indexOf("\t");
  if (separator < 0) throw new Error("PROMOTION_AUTHORITY_UNTRACKED");
  const metadata = entries[0].slice(0, separator).split(" ");
  const trackedPath = entries[0].slice(separator + 1);
  if (
    metadata.length !== 3 ||
    !new Set(["100644", "100755"]).has(metadata[0]) ||
    metadata[1] !== "blob" ||
    !/^[a-f0-9]{40}$/u.test(metadata[2]) ||
    trackedPath !== filePath
  ) {
    throw new Error("PROMOTION_AUTHORITY_INVALID");
  }
  return { mode: metadata[0], objectId: metadata[2] };
}

export async function readTrackedAuthorityBytes({
  repoRoot,
  filePath,
  expectedRawSha256 = null,
  _gitRunner = runReadonlyGit
}) {
  safePath(filePath);
  const working = await readAuthoritativeFile(repoRoot, filePath);
  let treeBytes;
  let committedBytes;
  try {
    treeBytes = await gitBytes(_gitRunner, repoRoot, ["ls-tree", "--full-tree", "-z", "HEAD", "--", filePath]);
    committedBytes = await gitBytes(_gitRunner, repoRoot, ["show", `HEAD:${filePath}`]);
  } catch {
    throw new Error("PROMOTION_AUTHORITY_UNTRACKED");
  }
  const tracked = parseTrackedTreeEntry(treeBytes, filePath);
  if (!working.bytes.equals(committedBytes)) throw new Error("PROMOTION_AUTHORITY_HEAD_DRIFT");
  if (expectedRawSha256 !== null) {
    assertDigest(expectedRawSha256, "PROMOTION_AUTHORITY_DIGEST_INVALID");
    if (working.rawSha256 !== expectedRawSha256) throw new Error("PROMOTION_AUTHORITY_DIGEST_MISMATCH");
  }
  return Object.freeze({
    path: filePath,
    rawSha256: working.rawSha256,
    mode: tracked.mode,
    objectId: tracked.objectId,
    bytes: Buffer.from(working.bytes)
  });
}

export async function readTrackedStrictJsonAuthority(options) {
  const loaded = await readTrackedAuthorityBytes(options);
  return Object.freeze({
    path: loaded.path,
    rawSha256: loaded.rawSha256,
    mode: loaded.mode,
    objectId: loaded.objectId,
    value: parsePromotionWorkflowJsonBytes(loaded.bytes)
  });
}

function singleGitLine(bytes, code) {
  const value = bytes.toString("utf8");
  if (!value.endsWith("\n") || value.slice(0, -1).includes("\n")) throw new Error(code);
  return value.slice(0, -1);
}

export async function collectGithubDiffEvidence({ repoRoot, eventName, eventBytes, _gitRunner = runReadonlyGit }) {
  if (typeof repoRoot !== "string" || !Buffer.isBuffer(eventBytes)) throw new Error("GITHUB_EVENT_INVALID");
  const event = parseGithubEventEnvelope(eventBytes, eventName);
  const base = eventName === "pull_request" ? event.base.sha : event.before;
  const head = eventName === "pull_request" ? event.head.sha : event.after;
  const checkoutHead = singleGitLine(await gitBytes(_gitRunner, repoRoot, ["rev-parse", "HEAD"]), "GITHUB_HEAD_BINDING_INVALID");
  assertCommit(checkoutHead, "GITHUB_HEAD_BINDING_INVALID");
  if (checkoutHead !== head) throw new Error("GITHUB_HEAD_BINDING_INVALID");
  const shallow = singleGitLine(await gitBytes(_gitRunner, repoRoot, ["rev-parse", "--is-shallow-repository"]), "GITHUB_DIFF_TRUNCATED");
  if (shallow !== "false") throw new Error("GITHUB_DIFF_TRUNCATED");
  try {
    await gitBytes(_gitRunner, repoRoot, ["cat-file", "-e", `${base}^{commit}`]);
    await gitBytes(_gitRunner, repoRoot, ["cat-file", "-e", `${head}^{commit}`]);
  } catch {
    throw new Error("GITHUB_DIFF_COMMIT_UNAVAILABLE");
  }
  try {
    await gitBytes(_gitRunner, repoRoot, ["merge-base", "--is-ancestor", base, head]);
  } catch {
    throw new Error("GITHUB_DIFF_ANCESTRY_INVALID");
  }
  const diffArgs = ["diff", "--name-only", "--no-renames", "-z", base, head, "--"];
  const treeArgs = ["diff-tree", "--no-commit-id", "-r", "--name-only", "--no-renames", "-z", base, head, "--"];
  const diffBytes = await gitBytes(_gitRunner, repoRoot, diffArgs);
  const treeBytes = await gitBytes(_gitRunner, repoRoot, treeArgs);
  if (!diffBytes.equals(treeBytes)) throw new Error("GITHUB_DIFF_INCONSISTENT");
  let rawNul;
  try {
    rawNul = fatalUtf8Decoder.decode(diffBytes);
  } catch {
    throw new Error("GITHUB_DIFF_PATHS_INVALID");
  }
  const paths = normalizePromotionChangedPaths(rawNul);
  return Object.freeze({
    eventName,
    pullRequestNumber: eventName === "pull_request" ? event.number : null,
    base,
    head,
    checkoutHead,
    shallow: false,
    ancestor: true,
    command: "git diff --name-only --no-renames -z <base> <head> --",
    diffBytes,
    paths
  });
}

const DEFAULT_SEMANTIC_NATIVE = Object.freeze({
  loadV2Manifest,
  collectV2GitWorktreeProof,
  loadV2Candidate,
  collectV2ProvenanceProof,
  collectV2BaselineProof,
  collectV2CheckerReleaseProof,
  loadV2Evidence,
  validateV2ContentSemantics,
  collectV2ExternalSideEffectProof,
  readTrackedStrictJsonAuthority,
  observeCanonicalRuntimePolicy,
  projectV2RuntimePolicy,
  collectV2RuntimeAndLegacyProof,
  fingerprint
});

function normalizeBaselineObservation(proof) {
  return {
    targetDrift: false,
    runtimeChangedPathCount: proof.runtimeChangedPathCount,
    runtimeChangedPathsDigest: proof.runtimeChangedPathsDigest,
    allowedTestOnlyPathCount: proof.allowedTestOnlyPathCount,
    allowedTestOnlyPathsDigest: proof.allowedTestOnlyPathsDigest,
    proofDigest: fingerprint(proof)
  };
}

function normalizeBaselineDrift(error) {
  if (
    error?.code !== "V2_TARGET_BASELINE_DRIFT" ||
    error?.outcome !== "blocked" ||
    !Number.isSafeInteger(error?.details?.changedPathCount) ||
    !Number.isSafeInteger(error?.details?.allowedTestOnlyPathCount)
  ) {
    throw error;
  }
  assertDigest(error.details.changedPathsDigest, "SEMANTIC_BASELINE_EVIDENCE_INVALID");
  assertDigest(error.details.allowedTestOnlyPathsDigest, "SEMANTIC_BASELINE_EVIDENCE_INVALID");
  return {
    targetDrift: true,
    runtimeChangedPathCount: error.details.changedPathCount,
    runtimeChangedPathsDigest: error.details.changedPathsDigest,
    allowedTestOnlyPathCount: error.details.allowedTestOnlyPathCount,
    allowedTestOnlyPathsDigest: error.details.allowedTestOnlyPathsDigest,
    proofDigest: sha256(stableJson({
      code: error.code,
      outcome: error.outcome,
      details: error.details
    }))
  };
}

function publicRuntimePolicyProjection(policy, policyDigest) {
  return {
    policyDigest,
    coveredFileCount: policy.coveredFileCount ?? null,
    reachablePathCount: policy.reachablePathCount ?? null,
    edgeCount: policy.edgeCount ?? null,
    topologyEdgeCount: policy.topologyEdgeCount ?? null,
    nextDynamicNonliteralImportCount: policy.nextDynamicNonliteralImportCount ?? null,
    zeroBaselineCallCount: policy.zeroBaselineCallCount ?? null
  };
}

export async function collectCurrentHeadSemanticProof({
  repoRoot,
  manifestPath,
  exactHead,
  _native = DEFAULT_SEMANTIC_NATIVE
}) {
  assertCommit(exactHead, "SEMANTIC_HEAD_BINDING_INVALID");
  const [{ manifest, loaded: manifestLoaded }, worktreeProof] = await Promise.all([
    _native.loadV2Manifest(repoRoot, manifestPath),
    _native.collectV2GitWorktreeProof(repoRoot)
  ]);
  if (worktreeProof?.clean !== true) throw new Error("SEMANTIC_WORKTREE_DIRTY");
  if (worktreeProof?.headCommit !== exactHead) throw new Error("SEMANTIC_WORKTREE_HEAD_MISMATCH");

  const strictManifest = await _native.readTrackedStrictJsonAuthority({
    repoRoot,
    filePath: manifestPath,
    expectedRawSha256: manifestLoaded.rawSha256
  });
  if (stableJson(strictManifest.value) !== stableJson(manifest)) {
    throw new Error("SEMANTIC_MANIFEST_BINDING_INVALID");
  }

  const candidate = await _native.loadV2Candidate(repoRoot, manifest);
  const [provenanceProof, checkerReleaseProof] = await Promise.all([
    _native.collectV2ProvenanceProof(repoRoot, manifest, candidate, exactHead),
    _native.collectV2CheckerReleaseProof(repoRoot, manifest, exactHead)
  ]);
  let baseline;
  try {
    baseline = normalizeBaselineObservation(
      await _native.collectV2BaselineProof(repoRoot, manifest, exactHead)
    );
  } catch (error) {
    baseline = normalizeBaselineDrift(error);
  }
  const evidence = await _native.loadV2Evidence(repoRoot, manifest, exactHead);
  const contentProof = _native.validateV2ContentSemantics(candidate, evidence.evidenceByRole);
  const externalSideEffectProof = await _native.collectV2ExternalSideEffectProof(repoRoot, manifest);
  if (
    externalSideEffectProof?.networkRequestCount !== 0 ||
    externalSideEffectProof?.providerCallCount !== 0 ||
    externalSideEffectProof?.databaseWriteCount !== 0 ||
    externalSideEffectProof?.deploymentCommandCount !== 0 ||
    externalSideEffectProof?.productionWriteCount !== 0 ||
    externalSideEffectProof?.liveRegistryWriteCount !== 0
  ) {
    throw new Error("SEMANTIC_EXTERNAL_SIDE_EFFECT_PROOF_INVALID");
  }

  const compatibility = await _native.readTrackedStrictJsonAuthority({
    repoRoot,
    filePath: manifest.liveReachability.compatibilityManifestPath,
    expectedRawSha256: manifest.liveReachability.compatibilityManifestRawSha256
  });
  const runtimeObservation = await _native.observeCanonicalRuntimePolicy(repoRoot, compatibility.value);
  const observedRuntimePolicy = _native.projectV2RuntimePolicy(runtimeObservation);
  const expectedRuntimePolicy = manifest.liveReachability.expectedRuntimePolicy;
  const expectedPolicyDigest = _native.fingerprint(expectedRuntimePolicy);
  const observedPolicyDigest = _native.fingerprint(observedRuntimePolicy);
  const semanticManifest = structuredClone(manifest);
  semanticManifest.liveReachability.expectedRuntimePolicy = structuredClone(observedRuntimePolicy);
  const runtimeAndLegacy = await _native.collectV2RuntimeAndLegacyProof(
    repoRoot,
    semanticManifest,
    exactHead
  );
  if (
    stableJson(runtimeAndLegacy.runtimePolicy) !== stableJson(observedRuntimePolicy) ||
    runtimeAndLegacy.proof?.liveAllowed !== false ||
    runtimeAndLegacy.proof?.selectedIdentityHits !== 0 ||
    runtimeAndLegacy.proof?.resolutionCount !== 18 ||
    runtimeAndLegacy.proof?.approvedProjectionCount !== 3 ||
    runtimeAndLegacy.proof?.dereachedCount !== 15
  ) {
    throw new Error("SEMANTIC_RUNTIME_PROOF_INVALID");
  }

  const payload = {
    schemaVersion: "promotion-current-head-semantic-proof.v1",
    result: "pass",
    exactHead,
    manifest: {
      pathDigest: sha256(manifestPath),
      rawSha256: manifestLoaded.rawSha256
    },
    immutable: {
      candidateDigest: candidate.candidateDigest,
      provenanceDigest: _native.fingerprint(provenanceProof),
      checkerBundleDigest: checkerReleaseProof.bundleDigest,
      evidenceBindingsDigest: evidence.proof.bindingsDigest,
      contentProofDigest: _native.fingerprint(contentProof),
      externalSideEffectProofDigest: externalSideEffectProof.digest
    },
    baseline,
    semantic: {
      runtimePolicyDigest: runtimeAndLegacy.proof.runtimePolicyDigest,
      canonicalAuditDigest: runtimeAndLegacy.canonicalAudit.auditDigest,
      resolutionProofsDigest: runtimeAndLegacy.proof.resolutionProofsDigest,
      resolutionCount: runtimeAndLegacy.proof.resolutionCount,
      approvedProjectionCount: runtimeAndLegacy.proof.approvedProjectionCount,
      dereachedCount: runtimeAndLegacy.proof.dereachedCount,
      selectedIdentityHits: 0,
      nextDynamicNonliteralImportCount: observedRuntimePolicy.nextDynamicNonliteralImportCount ?? 0,
      zeroBaselineCallCount: observedRuntimePolicy.zeroBaselineCallCount ?? 0
    },
    graph: {
      drift: stableJson(expectedRuntimePolicy) !== stableJson(observedRuntimePolicy),
      expected: publicRuntimePolicyProjection(expectedRuntimePolicy, expectedPolicyDigest),
      observed: publicRuntimePolicyProjection(observedRuntimePolicy, observedPolicyDigest)
    },
    liveAllowed: false,
    integrationAllowed: false,
    previewAllowed: false,
    deployAllowed: false
  };
  return Object.freeze({
    ...payload,
    proofDigest: sha256(stableJson(payload))
  });
}

function addBoundAuthorityPath(expectedByPath, filePath, expectedRawSha256 = null) {
  safePath(filePath);
  if (expectedRawSha256 !== null) assertDigest(expectedRawSha256, "PROMOTION_AUTHORITY_DIGEST_INVALID");
  const current = expectedByPath.get(filePath);
  if (current !== undefined && current !== null && expectedRawSha256 !== null && current !== expectedRawSha256) {
    throw new Error("PROMOTION_AUTHORITY_BINDING_CONFLICT");
  }
  if (current === undefined || (current === null && expectedRawSha256 !== null)) {
    expectedByPath.set(filePath, expectedRawSha256);
  }
}

function addReceiptAuthorityPaths(expectedByPath, receipt) {
  if (typeof receipt?.manifest?.path === "string") addBoundAuthorityPath(expectedByPath, receipt.manifest.path);
  for (const filePath of receipt?.candidateSourceProof?.paths ?? []) {
    addBoundAuthorityPath(expectedByPath, filePath);
  }
  for (const binding of receipt?.evidenceProof?.bindings ?? []) {
    if (typeof binding?.evidencePath === "string") addBoundAuthorityPath(expectedByPath, binding.evidencePath);
  }
  for (const binding of receipt?.checkerReleaseProof?.sourceBindings ?? []) {
    if (typeof binding?.path === "string") addBoundAuthorityPath(expectedByPath, binding.path, binding.rawSha256 ?? null);
  }
  for (const resolution of receipt?.runtimeAndLegacyProof?.resolutionProofs ?? []) {
    if (typeof resolution?.candidatePath === "string") {
      addBoundAuthorityPath(expectedByPath, resolution.candidatePath, resolution.candidateRawSha256 ?? null);
    }
    if (typeof resolution?.liveProjection?.path === "string") {
      addBoundAuthorityPath(expectedByPath, resolution.liveProjection.path, resolution.liveProjection.rawSha256 ?? null);
    }
  }
}

export async function collectTrackedPromotionAuthorities({
  repoRoot,
  manifestPath,
  canonicalReceiptPath,
  _readJson = readTrackedStrictJsonAuthority,
  _readBytes = readTrackedAuthorityBytes
}) {
  const expectedByPath = new Map();
  const jsonCache = new Map();
  const bindings = new Map();
  const loadJson = async (filePath, expectedRawSha256 = null) => {
    addBoundAuthorityPath(expectedByPath, filePath, expectedRawSha256);
    if (!jsonCache.has(filePath)) {
      const loaded = await _readJson({ repoRoot, filePath, expectedRawSha256 });
      jsonCache.set(filePath, loaded.value);
      bindings.set(filePath, {
        path: filePath,
        rawSha256: loaded.rawSha256,
        mode: loaded.mode,
        objectId: loaded.objectId
      });
    }
    return jsonCache.get(filePath);
  };
  const loadBytes = async (filePath, expectedRawSha256 = null) => {
    addBoundAuthorityPath(expectedByPath, filePath, expectedRawSha256);
    if (!bindings.has(filePath)) {
      const loaded = await _readBytes({ repoRoot, filePath, expectedRawSha256 });
      bindings.set(filePath, {
        path: filePath,
        rawSha256: loaded.rawSha256,
        mode: loaded.mode,
        objectId: loaded.objectId
      });
    }
  };

  const manifest = await loadJson(manifestPath);
  const receipt = await loadJson(canonicalReceiptPath);
  addReceiptAuthorityPaths(expectedByPath, receipt);

  addBoundAuthorityPath(
    expectedByPath,
    manifest.candidatePackage.path,
    manifest.candidatePackage.rawSha256
  );
  for (const artifact of manifest.candidateArtifacts ?? []) {
    addBoundAuthorityPath(expectedByPath, artifact.path, artifact.rawFileSha256 ?? artifact.rawSha256 ?? null);
  }
  addBoundAuthorityPath(
    expectedByPath,
    manifest.checkerRelease.ledgerPath,
    manifest.checkerRelease.ledgerRawSha256
  );
  addBoundAuthorityPath(expectedByPath, manifest.evidenceIndex.path, manifest.evidenceIndex.rawSha256);
  for (const evidence of manifest.evidenceBindings ?? []) {
    addBoundAuthorityPath(expectedByPath, evidence.evidencePath, evidence.rawSha256);
  }
  addBoundAuthorityPath(
    expectedByPath,
    manifest.legacyResolution.registryPath,
    manifest.legacyResolution.rawSha256
  );
  addBoundAuthorityPath(
    expectedByPath,
    manifest.liveReachability.compatibilityManifestPath,
    manifest.liveReachability.compatibilityManifestRawSha256
  );

  const [candidatePackage, checkerLedger, evidenceIndex, registry] = await Promise.all([
    loadJson(manifest.candidatePackage.path, manifest.candidatePackage.rawSha256),
    loadJson(manifest.checkerRelease.ledgerPath, manifest.checkerRelease.ledgerRawSha256),
    loadJson(manifest.evidenceIndex.path, manifest.evidenceIndex.rawSha256),
    loadJson(manifest.legacyResolution.registryPath, manifest.legacyResolution.rawSha256)
  ]);
  await loadJson(
    manifest.liveReachability.compatibilityManifestPath,
    manifest.liveReachability.compatibilityManifestRawSha256
  );

  for (const record of candidatePackage.records ?? []) {
    if (typeof record?.path === "string") addBoundAuthorityPath(expectedByPath, record.path);
  }
  for (const entry of evidenceIndex.entries ?? []) {
    if (typeof entry?.evidencePath === "string") {
      addBoundAuthorityPath(expectedByPath, entry.evidencePath, entry.rawSha256 ?? null);
    }
  }
  const checkerEntry = (checkerLedger.entries ?? []).filter(
    (entry) => entry?.version === manifest.checkerRelease.version
  );
  if (checkerEntry.length !== 1 || !Array.isArray(checkerEntry[0].bundlePaths)) {
    throw new Error("PROMOTION_CHECKER_AUTHORITY_INVALID");
  }
  for (const filePath of checkerEntry[0].bundlePaths) addBoundAuthorityPath(expectedByPath, filePath);

  for (const resolution of registry.resolutions ?? []) {
    if (typeof resolution?.candidate?.path === "string") {
      addBoundAuthorityPath(expectedByPath, resolution.candidate.path, resolution.candidate.rawSha256 ?? null);
    }
    if (typeof resolution?.liveProjection?.path === "string") {
      addBoundAuthorityPath(expectedByPath, resolution.liveProjection.path, resolution.liveProjection.rawSha256 ?? null);
    }
    for (const approval of resolution?.approvalReferences ?? []) {
      if (typeof approval?.path === "string") {
        addBoundAuthorityPath(expectedByPath, approval.path, approval.rawSha256 ?? null);
      }
    }
  }

  for (const [filePath, expectedRawSha256] of [...expectedByPath.entries()].sort(
    ([left], [right]) => codePointCompare(left, right)
  )) {
    if (filePath.endsWith(".json")) await loadJson(filePath, expectedRawSha256);
    else await loadBytes(filePath, expectedRawSha256);
  }

  const candidateRoot = path.posix.dirname(manifest.candidatePackage.path);
  if (candidateRoot === ".") throw new Error("PROMOTION_CANDIDATE_ROOT_INVALID");
  const paths = [...expectedByPath.keys()].sort(codePointCompare);
  const bindingProjection = paths.map((filePath) => bindings.get(filePath));
  if (bindingProjection.some((binding) => binding === undefined)) {
    throw new Error("PROMOTION_AUTHORITY_INCOMPLETE");
  }
  return Object.freeze({
    schemaVersion: "promotion-controlled-authority-set.v1",
    candidateRoot,
    paths,
    pathCount: paths.length,
    pathsDigest: sha256(stableJson(paths)),
    bindingsDigest: sha256(stableJson(bindingProjection)),
    jsonPathCount: paths.filter((filePath) => filePath.endsWith(".json")).length
  });
}

function collectArtifactPaths(value, paths = []) {
  if (Array.isArray(value)) {
    for (const item of value) collectArtifactPaths(item, paths);
  } else if (value !== null && typeof value === "object") {
    for (const [key, item] of Object.entries(value)) {
      if (key === "path") {
        if (typeof item !== "string") throw new Error("CANONICAL_BINDING_INVALID");
        safePath(item);
        paths.push(item);
      } else {
        collectArtifactPaths(item, paths);
      }
    }
  }
  return paths;
}

// Pure fixture oracles below preserve the original 15-case RED matrix. They are
// deliberately test-only; the workflow and CLI use the tracked Git/authority
// collectors and never accept caller-supplied safety booleans.
export function __testOnlyBuildPromotionControlledPathUnion(canonicalIntegrity) {
  if (canonicalIntegrity === null || typeof canonicalIntegrity !== "object") {
    throw new Error("CANONICAL_BINDING_INVALID");
  }
  const union = new Set(STATIC_PROMOTION_CONTROLLED_PATHS);
  for (const key of ["manifest", "receipt", "checker", "evidence", "registry", "candidate", "approval"]) {
    const artifact = canonicalIntegrity[key];
    if (artifact === null || typeof artifact !== "object") throw new Error("CANONICAL_BINDING_INVALID");
    for (const artifactPath of collectArtifactPaths(artifact)) union.add(artifactPath);
    if (key !== "checker" && typeof artifact.bytes === "string") {
      for (const artifactPath of collectArtifactPaths(parsePromotionWorkflowJsonBytes(Buffer.from(artifact.bytes, "utf8")))) {
        union.add(artifactPath);
      }
    }
  }
  return [...union].sort(codePointCompare);
}

export function __testOnlyIsPromotionControlledPath(filePath, canonicalIntegrity) {
  safePath(filePath);
  if (filePath.startsWith("scripts/promotion-") || filePath.startsWith("coordination/integration/")) return true;
  return __testOnlyBuildPromotionControlledPathUnion(canonicalIntegrity).includes(filePath);
}

function validateCanonicalIntegrity(canonicalIntegrity) {
  const paths = __testOnlyBuildPromotionControlledPathUnion(canonicalIntegrity);
  for (const key of ["manifest", "receipt", "checker", "evidence", "registry", "candidate", "approval"]) {
    const artifact = canonicalIntegrity[key];
    if (typeof artifact.bytes !== "string" || typeof artifact.rawSha256 !== "string") {
      throw new Error("CANONICAL_ARTIFACT_INVALID");
    }
    safePath(artifact.path);
    assertDigest(artifact.rawSha256, "CANONICAL_ARTIFACT_INVALID");
    if (sha256(artifact.bytes) !== artifact.rawSha256) throw new Error("CANONICAL_BYTE_DRIFT");
    if (key !== "checker") parsePromotionWorkflowJsonBytes(Buffer.from(artifact.bytes, "utf8"));
  }
  for (const key of ["replay", "verification"]) {
    const proof = canonicalIntegrity[key];
    if (proof?.result !== "pass") throw new Error("CANONICAL_REPLAY_OR_DIGEST_MISMATCH");
    assertDigest(proof.digest, "CANONICAL_REPLAY_OR_DIGEST_MISMATCH");
  }
  if (canonicalIntegrity.liveAllowed !== false) throw new Error("LIVE_ESCALATION_FORBIDDEN");
  return paths;
}

function validateGithub(github) {
  let base;
  let head;
  let pullRequestNumber = null;
  if (typeof github?.eventBytes !== "string") throw new Error("GITHUB_EVENT_INVALID");
  if (github?.eventName === "pull_request") {
    const event = parseStrictGithubEventJson(Buffer.from(github.eventBytes, "utf8"));
    if (stableJson(event) !== stableJson(github.pullRequest)) throw new Error("GITHUB_EVENT_INVALID");
    base = event.base.sha;
    head = event.head.sha;
    pullRequestNumber = event.number;
  } else if (github?.eventName === "push" && github.ref === "refs/heads/main") {
    const event = parseStrictGithubPushEventJson(Buffer.from(github.eventBytes, "utf8"));
    if (event.before !== github.before || event.after !== github.after || event.ref !== github.ref) {
      throw new Error("GITHUB_EVENT_INVALID");
    }
    base = event.before;
    head = event.after;
  } else {
    throw new Error("GITHUB_EVENT_INVALID");
  }
  assertCommit(github.checkoutHead, "GITHUB_HEAD_BINDING_INVALID");
  if (github.checkoutHead !== head) throw new Error("GITHUB_HEAD_BINDING_INVALID");
  const diff = github.diff;
  if (diff === null || typeof diff !== "object") throw new Error("GITHUB_DIFF_MISSING");
  if (diff.complete !== true || diff.shallow !== false) throw new Error("GITHUB_DIFF_TRUNCATED");
  if (diff.ancestor !== true) throw new Error("GITHUB_DIFF_ANCESTRY_INVALID");
  if (diff.base !== base || diff.head !== head) throw new Error("GITHUB_DIFF_INCONSISTENT");
  if (diff.command !== "git diff --name-only -z <base> <head> --") throw new Error("GITHUB_DIFF_INCONSISTENT");
  const paths = normalizePromotionChangedPaths(diff.rawNul);
  return { eventName: github.eventName, base, head, paths, pullRequestNumber };
}

function validateSemantic(semantic, head) {
  if (semantic?.result === "internal" || semantic?.scanAvailable !== true) {
    throw new Error("SEMANTIC_RUNTIME_SCAN_UNAVAILABLE");
  }
  if (semantic.exactHead !== head) throw new Error("SEMANTIC_HEAD_BINDING_INVALID");
  for (const key of [
    "nonliteralNextDynamic", "zeroBaselineLoaders", "alternateEntrypoints", "unknownClassifications"
  ]) if (!Number.isSafeInteger(semantic[key]) || semantic[key] !== 0) throw new Error("SEMANTIC_RUNTIME_SAFETY_FAILED");
  for (const key of ["selectedCandidateReachable", "legacyCandidateReachable", "approvedProjectionDrift", "canonicalConflictDrift"]) {
    if (semantic[key] !== false) throw new Error("SEMANTIC_RUNTIME_SAFETY_FAILED");
  }
}

function validateGraph(graph) {
  if (graph === null || typeof graph !== "object") throw new Error("GRAPH_DIGEST_UNAVAILABLE");
  assertDigest(graph.digest, "GRAPH_DIGEST_UNAVAILABLE");
  if (typeof graph.targetDrift !== "boolean") throw new Error("GRAPH_DIGEST_UNAVAILABLE");
  return structuredClone(graph);
}

function validateCurrentValidation(currentValidation) {
  if (currentValidation?.liveAllowed !== false) throw new Error("LIVE_ESCALATION_FORBIDDEN");
  if (currentValidation?.result === "pass") return;
  if (currentValidation?.result === "blocked" && ["V2_TARGET_BASELINE_DRIFT", "V2_RUNTIME_GRAPH_DRIFT"].includes(currentValidation?.code)) return;
  throw new Error("CURRENT_VALIDATION_UNACCEPTABLE");
}

export function __testOnlyEvaluatePromotionRequiredCheckSemanticRescope(input) {
  try {
    const github = validateGithub(input?.github);
    validateCurrentValidation(input.currentValidation);
    const controlledPaths = validateCanonicalIntegrity(input.canonicalIntegrity);
    validateSemantic(input.semantic, github.head);
    const graph = validateGraph(input.graph);
    const promotionControlledPathCount = github.paths.filter((filePath) =>
      __testOnlyIsPromotionControlledPath(filePath, input.canonicalIntegrity)
    ).length;
    const binding = {
      pullRequestNumber: github.pullRequestNumber,
      eventName: github.eventName,
      baseCommit: github.base,
      headCommit: github.head,
      changedPathsDigest: sha256(stableJson(github.paths)),
      canonicalPathUnionDigest: sha256(stableJson(controlledPaths))
    };
    if (promotionControlledPathCount > 0) {
      return result(input, graph.targetDrift
        ? "PROMOTION_CONTROLLED_GRAPH_DRIFT_FULL_VALIDATION_REQUIRED"
        : "PROMOTION_CONTROLLED_FULL_VALIDATION_REQUIRED", {
        binding, promotionControlledPathCount, graph, reviewQueue: ["A23", "A25"]
      });
    }
    return result(input, "historical_pilot_intact_semantic_runtime_safe", {
      binding, promotionControlledPathCount, graph, reviewQueue: ["A23", "A25"]
    });
  } catch (error) {
    return result(input, error instanceof Error ? error.message : "PROMOTION_REQUIRED_CHECK_INTERNAL");
  }
}

function assertPassingReceipt(receipt, label) {
  if (
    receipt?.schemaVersion !== "promotion-receipt.v2" ||
    receipt?.result !== "pass" ||
    receipt?.binding?.liveAllowed !== false ||
    receipt?.lifecycle?.liveAllowed !== false ||
    receipt?.binding?.parentPackageStatus !== "candidate-only" ||
    receipt?.worktreeProof?.cleanBeforeAndAfter !== true ||
    receipt?.worktreeProof?.unchangedHead !== true ||
    typeof receipt?.run?.runId !== "string" ||
    receipt.run.runId.length === 0
  ) {
    throw new Error("PROMOTION_CANONICAL_EVIDENCE_INVALID");
  }
  safePath(receipt.manifest?.path);
  assertDigest(receipt.manifest?.rawSha256, "PROMOTION_CANONICAL_EVIDENCE_INVALID");
  assertDigest(receipt.semanticReceiptDigest, "PROMOTION_CANONICAL_EVIDENCE_INVALID");
  assertDigest(receipt.rawReceiptDigest, "PROMOTION_CANONICAL_EVIDENCE_INVALID");
  for (const key of ["candidateDigest", "checkerBundleDigest"]) {
    assertDigest(receipt.binding?.[key], "PROMOTION_CANONICAL_EVIDENCE_INVALID");
  }
  for (const key of ["sourceCommit", "targetBaselineCommit"]) {
    assertCommit(receipt.binding?.[key], "PROMOTION_CANONICAL_EVIDENCE_INVALID");
  }
  assertCommit(receipt.worktreeProof?.executionCommit, "PROMOTION_CANONICAL_EVIDENCE_INVALID");
  return {
    label,
    manifestPath: receipt.manifest.path,
    manifestRawSha256: receipt.manifest.rawSha256,
    binding: receipt.binding,
    semanticReceiptDigest: receipt.semanticReceiptDigest,
    rawReceiptDigest: receipt.rawReceiptDigest,
    executionCommit: receipt.worktreeProof.executionCommit,
    runId: receipt.run.runId
  };
}

function assertPassingVerification(verification, receiptProjection, label) {
  if (
    verification?.schemaVersion !== "promotion-receipt-verification.v2" ||
    verification?.result !== "pass" ||
    verification?.valid !== true ||
    verification?.liveAllowed !== false ||
    verification?.manifestPath !== receiptProjection.manifestPath ||
    verification?.manifestRawSha256 !== receiptProjection.manifestRawSha256 ||
    verification?.semanticReceiptDigest !== receiptProjection.semanticReceiptDigest ||
    verification?.rawReceiptDigest !== receiptProjection.rawReceiptDigest
  ) {
    throw new Error("PROMOTION_CANONICAL_EVIDENCE_INVALID");
  }
  assertCommit(verification.executionCommit, "PROMOTION_CANONICAL_EVIDENCE_INVALID");
  return {
    label,
    executionCommit: verification.executionCommit,
    semanticReceiptDigest: verification.semanticReceiptDigest,
    rawReceiptDigest: verification.rawReceiptDigest
  };
}

export function validateCanonicalReceiptEvidence({ manifestPath, manifestRawSha256, receipts, verifications }) {
  safePath(manifestPath);
  assertDigest(manifestRawSha256, "PROMOTION_CANONICAL_EVIDENCE_INVALID");
  const labels = ["fresh", "replay", "canonical"];
  const receiptProjections = labels.map((label) => assertPassingReceipt(receipts?.[label], label));
  if (
    receiptProjections.some((projection) =>
      projection.manifestPath !== manifestPath || projection.manifestRawSha256 !== manifestRawSha256
    ) ||
    !receiptProjections.every((projection) =>
      projection.semanticReceiptDigest === receiptProjections[0].semanticReceiptDigest
    ) ||
    !receiptProjections.every((projection) =>
      projection.executionCommit === receiptProjections[0].executionCommit
    ) ||
    !receiptProjections.every((projection) => stableJson(projection.binding) === stableJson(receiptProjections[0].binding))
  ) {
    throw new Error("PROMOTION_CANONICAL_EVIDENCE_INVALID");
  }
  const runIds = receiptProjections.map(({ runId }) => runId);
  if (new Set(runIds).size !== 3) throw new Error("PROMOTION_CANONICAL_EVIDENCE_INVALID");
  const verificationProjections = labels.map((label, index) =>
    assertPassingVerification(verifications?.[label], receiptProjections[index], label)
  );
  if (!verificationProjections.every(({ executionCommit }) =>
    executionCommit === verificationProjections[0].executionCommit &&
    executionCommit === receiptProjections[0].executionCommit
  )) {
    throw new Error("PROMOTION_CANONICAL_EVIDENCE_INVALID");
  }
  const safeReceiptProjection = receiptProjections.map(({ label, manifestPath: pathValue, manifestRawSha256: raw, binding, semanticReceiptDigest, rawReceiptDigest, executionCommit, runId }) => ({
    label,
    manifestPathDigest: sha256(pathValue),
    manifestRawSha256: raw,
    bindingDigest: sha256(stableJson(binding)),
    semanticReceiptDigest,
    rawReceiptDigest,
    executionCommit,
    runIdentityDigest: sha256(runId)
  }));
  return Object.freeze({
    schemaVersion: "promotion-canonical-receipt-evidence.v1",
    manifestPath,
    manifestRawSha256,
    semanticReceiptDigest: receiptProjections[0].semanticReceiptDigest,
    executionCommit: verificationProjections[0].executionCommit,
    distinctRunIdentityCount: 3,
    bindingDigest: sha256(stableJson(receiptProjections[0].binding)),
    receiptSetDigest: sha256(stableJson(safeReceiptProjection)),
    verificationSetDigest: sha256(stableJson(verificationProjections)),
    liveAllowed: false
  });
}

function validateSemanticProofForDecision(semanticProof, exactHead) {
  if (
    semanticProof?.schemaVersion !== "promotion-current-head-semantic-proof.v1" ||
    semanticProof?.result !== "pass" ||
    semanticProof?.exactHead !== exactHead ||
    semanticProof?.liveAllowed !== false ||
    semanticProof?.integrationAllowed !== false ||
    semanticProof?.previewAllowed !== false ||
    semanticProof?.deployAllowed !== false ||
    semanticProof?.semantic?.selectedIdentityHits !== 0 ||
    semanticProof?.semantic?.nextDynamicNonliteralImportCount !== 0 ||
    semanticProof?.semantic?.zeroBaselineCallCount !== 0
  ) {
    throw new Error("PROMOTION_SEMANTIC_PROOF_INVALID");
  }
  for (const value of [
    semanticProof.proofDigest,
    semanticProof.semantic.runtimePolicyDigest,
    semanticProof.semantic.canonicalAuditDigest,
    semanticProof.semantic.resolutionProofsDigest,
    semanticProof.graph?.expected?.policyDigest,
    semanticProof.graph?.observed?.policyDigest
  ]) assertDigest(value, "PROMOTION_SEMANTIC_PROOF_INVALID");
}

function validateCurrentValidationForDecision(currentValidation, semanticProof) {
  if (
    currentValidation?.result === "pass" &&
    currentValidation?.schemaVersion === "promotion-validation-result.v2" &&
    currentValidation?.liveAllowed === false &&
    currentValidation?.pilotUnitStatus === "shadow_ready"
  ) {
    return { result: "pass", code: null };
  }
  if (currentValidation?.result !== "blocked" || currentValidation?.schemaVersion !== "promotion-gate-error.v2") {
    throw new Error("CURRENT_VALIDATION_UNACCEPTABLE");
  }
  if (currentValidation.code === "V2_TARGET_BASELINE_DRIFT") {
    const details = currentValidation.details;
    const baseline = semanticProof.baseline;
    if (
      details?.changedPathCount !== baseline?.runtimeChangedPathCount ||
      details?.changedPathsDigest !== baseline?.runtimeChangedPathsDigest ||
      details?.allowedTestOnlyPathCount !== baseline?.allowedTestOnlyPathCount ||
      details?.allowedTestOnlyPathsDigest !== baseline?.allowedTestOnlyPathsDigest
    ) {
      throw new Error("CURRENT_VALIDATION_UNACCEPTABLE");
    }
    return { result: "blocked", code: currentValidation.code };
  }
  if (
    currentValidation.code === "V2_RUNTIME_GRAPH_DRIFT" &&
    currentValidation.details?.observedPolicyDigest === semanticProof.graph?.observed?.policyDigest
  ) {
    return { result: "blocked", code: currentValidation.code };
  }
  throw new Error("CURRENT_VALIDATION_UNACCEPTABLE");
}

function promotionControlledPath(filePath, authorities) {
  safePath(filePath);
  if (STATIC_PROMOTION_CONTROLLED_PATHS.includes(filePath)) return true;
  if (filePath.startsWith("scripts/promotion-") || filePath.startsWith("coordination/integration/")) return true;
  if (filePath === authorities.candidateRoot || filePath.startsWith(`${authorities.candidateRoot}/`)) return true;
  return authorities.paths.includes(filePath);
}

function validateAuthoritySetForDecision(authorities) {
  if (
    authorities?.schemaVersion !== "promotion-controlled-authority-set.v1" ||
    !Array.isArray(authorities.paths) ||
    authorities.pathCount !== authorities.paths.length ||
    typeof authorities.candidateRoot !== "string"
  ) {
    throw new Error("PROMOTION_AUTHORITY_SET_INVALID");
  }
  const normalized = authorities.paths.length === 0
    ? []
    : normalizePromotionChangedPaths(`${authorities.paths.join("\0")}\0`);
  if (stableJson(normalized) !== stableJson(authorities.paths)) {
    throw new Error("PROMOTION_AUTHORITY_SET_INVALID");
  }
  assertDigest(authorities.pathsDigest, "PROMOTION_AUTHORITY_SET_INVALID");
  assertDigest(authorities.bindingsDigest, "PROMOTION_AUTHORITY_SET_INVALID");
  safePath(`${authorities.candidateRoot}/candidate-root-sentinel`);
}

function canonicalGithubProjection(githubEvidence) {
  assertCommit(githubEvidence?.base, "GITHUB_EVENT_INVALID");
  assertCommit(githubEvidence?.head, "GITHUB_EVENT_INVALID");
  assertCommit(githubEvidence?.checkoutHead, "GITHUB_EVENT_INVALID");
  if (
    githubEvidence.head !== githubEvidence.checkoutHead ||
    !new Set(["pull_request", "push"]).has(githubEvidence.eventName) ||
    !Array.isArray(githubEvidence.paths)
  ) {
    throw new Error("GITHUB_EVENT_INVALID");
  }
  const paths = githubEvidence.paths.length === 0
    ? []
    : normalizePromotionChangedPaths(`${githubEvidence.paths.join("\0")}\0`);
  return {
    eventName: githubEvidence.eventName,
    pullRequestNumber: githubEvidence.eventName === "pull_request" ? githubEvidence.pullRequestNumber : null,
    baseCommit: githubEvidence.base,
    headCommit: githubEvidence.head,
    checkoutHead: githubEvidence.checkoutHead,
    paths
  };
}

export function buildPromotionRequiredCheckDecision({
  githubEvidence,
  authorities,
  semanticProof,
  currentValidation,
  receiptEvidence
}) {
  const event = canonicalGithubProjection(githubEvidence);
  validateAuthoritySetForDecision(authorities);
  validateSemanticProofForDecision(semanticProof, event.headCommit);
  const validation = validateCurrentValidationForDecision(currentValidation, semanticProof);
  const canonical = validateCanonicalReceiptEvidence(receiptEvidence);
  const changedPaths = event.paths;
  const controlledPaths = changedPaths.filter((filePath) => promotionControlledPath(filePath, authorities));
  let resultValue;
  let code;
  if (validation.result === "pass") {
    resultValue = "pass";
    code = "full_promotion_validation_passed";
  } else if (controlledPaths.length === 0) {
    resultValue = "pass";
    code = "historical_pilot_intact_semantic_runtime_safe";
  } else {
    resultValue = "blocked";
    code = "PROMOTION_CONTROLLED_FULL_VALIDATION_REQUIRED";
  }
  const reviewQueue = semanticProof.graph.drift || semanticProof.baseline.targetDrift ? ["A23", "A25"] : [];
  const payload = {
    schemaVersion: PROMOTION_REQUIRED_CHECK_DECISION_SCHEMA,
    result: resultValue,
    code,
    event: {
      eventName: event.eventName,
      pullRequestNumber: event.pullRequestNumber,
      baseCommit: event.baseCommit,
      headCommit: event.headCommit,
      checkoutHead: event.checkoutHead
    },
    changedPaths: {
      count: changedPaths.length,
      digest: sha256(stableJson(changedPaths))
    },
    promotionControlledPaths: {
      count: controlledPaths.length,
      digest: sha256(stableJson(controlledPaths)),
      authorityPathsDigest: authorities.pathsDigest,
      authorityBindingsDigest: authorities.bindingsDigest,
      candidateRootDigest: sha256(authorities.candidateRoot)
    },
    currentValidation: {
      result: validation.result,
      code: validation.code,
      artifactDigest: sha256(stableJson(currentValidation))
    },
    baseline: structuredClone(semanticProof.baseline),
    canonical: {
      manifestRawSha256: canonical.manifestRawSha256,
      semanticReceiptDigest: canonical.semanticReceiptDigest,
      executionCommit: canonical.executionCommit,
      distinctRunIdentityCount: canonical.distinctRunIdentityCount,
      bindingDigest: canonical.bindingDigest,
      receiptSetDigest: canonical.receiptSetDigest,
      verificationSetDigest: canonical.verificationSetDigest,
      liveAllowed: false
    },
    semantic: {
      exactHead: semanticProof.exactHead,
      proofDigest: semanticProof.proofDigest,
      runtimePolicyDigest: semanticProof.semantic.runtimePolicyDigest,
      canonicalAuditDigest: semanticProof.semantic.canonicalAuditDigest,
      resolutionProofsDigest: semanticProof.semantic.resolutionProofsDigest,
      selectedIdentityHits: semanticProof.semantic.selectedIdentityHits,
      nextDynamicNonliteralImportCount: semanticProof.semantic.nextDynamicNonliteralImportCount,
      zeroBaselineCallCount: semanticProof.semantic.zeroBaselineCallCount
    },
    graph: structuredClone(semanticProof.graph),
    reviewQueue,
    permissions: {
      liveAllowed: false,
      integrationAllowed: false,
      previewAllowed: false,
      deployAllowed: false
    }
  };
  return Object.freeze({ ...payload, decisionDigest: sha256(stableJson(payload)) });
}

export function parseStrictDecisionJson(bytes) {
  const decision = parsePromotionWorkflowJsonBytes(bytes);
  const legacyKeys = [
    "schemaVersion", "result", "code", "liveAllowed", "binding", "promotionControlledPathCount",
    "graph", "reviewQueue", "decisionDigest"
  ];
  const enforcementKeys = [
    "schemaVersion", "result", "code", "event", "changedPaths", "promotionControlledPaths",
    "currentValidation", "baseline", "canonical", "semantic", "graph", "reviewQueue", "permissions", "decisionDigest"
  ];
  const expectedKeys = (decision?.schemaVersion === PROMOTION_REQUIRED_CHECK_DECISION_SCHEMA
    ? enforcementKeys
    : legacyKeys).sort(codePointCompare);
  const actualKeys = decision !== null && typeof decision === "object" && !Array.isArray(decision)
    ? Object.keys(decision).sort(codePointCompare)
    : [];
  if (stableJson(actualKeys) !== stableJson(expectedKeys)) throw new Error("PROMOTION_DECISION_INVALID");
  if (![PROMOTION_REQUIRED_CHECK_SEMANTIC_RESCOPE_SCHEMA, PROMOTION_REQUIRED_CHECK_DECISION_SCHEMA].includes(decision?.schemaVersion) ||
    typeof decision.decisionDigest !== "string" || !SHA256.test(decision.decisionDigest)) {
    throw new Error("PROMOTION_DECISION_INVALID");
  }
  if (decision.schemaVersion === PROMOTION_REQUIRED_CHECK_DECISION_SCHEMA) {
    if (
      !new Set(["pass", "blocked"]).has(decision.result) ||
      !Array.isArray(decision.reviewQueue) ||
      decision.permissions?.liveAllowed !== false ||
      decision.permissions?.integrationAllowed !== false ||
      decision.permissions?.previewAllowed !== false ||
      decision.permissions?.deployAllowed !== false ||
      decision.canonical?.liveAllowed !== false ||
      typeof decision.baseline?.targetDrift !== "boolean" ||
      !Number.isSafeInteger(decision.baseline?.runtimeChangedPathCount) ||
      !Number.isSafeInteger(decision.baseline?.allowedTestOnlyPathCount)
    ) {
      throw new Error("PROMOTION_DECISION_INVALID");
    }
    for (const value of [
      decision.changedPaths?.digest,
      decision.promotionControlledPaths?.digest,
      decision.promotionControlledPaths?.authorityPathsDigest,
      decision.promotionControlledPaths?.authorityBindingsDigest,
      decision.currentValidation?.artifactDigest,
      decision.baseline?.runtimeChangedPathsDigest,
      decision.baseline?.allowedTestOnlyPathsDigest,
      decision.canonical?.manifestRawSha256,
      decision.canonical?.semanticReceiptDigest,
      decision.canonical?.bindingDigest,
      decision.canonical?.receiptSetDigest,
      decision.canonical?.verificationSetDigest,
      decision.semantic?.proofDigest,
      decision.semantic?.runtimePolicyDigest,
      decision.semantic?.canonicalAuditDigest,
      decision.semantic?.resolutionProofsDigest
    ]) assertDigest(value, "PROMOTION_DECISION_INVALID");
    assertCommit(decision.event?.baseCommit, "PROMOTION_DECISION_INVALID");
    assertCommit(decision.event?.headCommit, "PROMOTION_DECISION_INVALID");
    assertCommit(decision.event?.checkoutHead, "PROMOTION_DECISION_INVALID");
    assertCommit(decision.canonical?.executionCommit, "PROMOTION_DECISION_INVALID");
  }
  const digestPayload = structuredClone(decision);
  delete digestPayload.decisionDigest;
  const expected = sha256(stableJson(digestPayload));
  if (decision.decisionDigest !== expected) throw new Error("PROMOTION_DECISION_DIGEST_MISMATCH");
  return decision;
}

export function verifyPromotionRequiredCheckDecision(decision, evidence) {
  try {
    const parsed = parseStrictDecisionJson(Buffer.from(stableJson(decision), "utf8"));
    if (parsed.schemaVersion !== PROMOTION_REQUIRED_CHECK_DECISION_SCHEMA) return false;
    const recomputed = buildPromotionRequiredCheckDecision(evidence);
    return stableJson(parsed) === stableJson(recomputed);
  } catch {
    return false;
  }
}

export function __testOnlyCanEnforcePromotionRequiredCheckSuccess(decision, evidence) {
  try {
    if (evidence === undefined) return false;
    const recomputed = __testOnlyEvaluatePromotionRequiredCheckSemanticRescope(evidence);
    return decision?.result === "pass" &&
      decision?.code === "historical_pilot_intact_semantic_runtime_safe" &&
      decision?.liveAllowed === false &&
      Array.isArray(decision.reviewQueue) && decision.reviewQueue.includes("A23") && decision.reviewQueue.includes("A25") &&
      typeof decision.graph?.digest === "string" && SHA256.test(decision.graph.digest) &&
      parseStrictDecisionJson(Buffer.from(JSON.stringify(decision), "utf8")).result === "pass" &&
      recomputed.result === "pass" &&
      recomputed.decisionDigest === decision.decisionDigest &&
      recomputed.binding.baseCommit === decision.binding?.baseCommit &&
      recomputed.binding.headCommit === decision.binding?.headCommit &&
      recomputed.binding.changedPathsDigest === decision.binding?.changedPathsDigest;
  } catch {
    return false;
  }
}

export function assertRequiredWorkflowShape(workflow) {
  if (workflow === null || typeof workflow !== "object" || workflow.on === null || typeof workflow.on !== "object") {
    throw new Error("PROMOTION_WORKFLOW_INVALID");
  }
  if (Object.hasOwn(workflow.on, "workflow_dispatch")) throw new Error("PROMOTION_WORKFLOW_DISPATCH_FORBIDDEN");
  for (const trigger of Object.values(workflow.on)) {
    if (trigger !== null && typeof trigger === "object" && (Object.hasOwn(trigger, "paths") || Object.hasOwn(trigger, "paths-ignore"))) {
      throw new Error("PROMOTION_WORKFLOW_PATH_FILTER_FORBIDDEN");
    }
  }
  const job = workflow.jobs?.["promotion-shadow-gate"];
  if (job?.name !== "promotion-shadow-gate" || Object.hasOwn(job, "if")) {
    throw new Error("PROMOTION_REQUIRED_JOB_SKIPPABLE");
  }
}
