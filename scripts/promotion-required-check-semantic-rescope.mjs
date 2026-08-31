import { createHash } from "node:crypto";
import { execFile as execFileCallback } from "node:child_process";
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

const COMMIT = /^[a-f0-9]{40}$/u;
const SHA256 = /^[a-f0-9]{64}$/u;
const STATIC_PROMOTION_CONTROLLED_PATHS = Object.freeze([
  ".github/workflows/promotion-shadow.yml",
  "package.json",
  "package-lock.json"
]);
const execFile = promisify(execFileCallback);
const GIT_EXECUTABLE = "/usr/bin/git";
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
      maxBuffer: 4 * 1024 * 1024,
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
  if (!bytes.equals(Buffer.from(bytes)) || bytes.length === 0 || bytes[bytes.length - 1] !== 0) {
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

export async function readTrackedStrictJsonAuthority({
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
    value: parsePromotionWorkflowJsonBytes(working.bytes)
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

export function buildPromotionControlledPathUnion(canonicalIntegrity) {
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

export function isPromotionControlledPath(filePath, canonicalIntegrity) {
  safePath(filePath);
  if (filePath.startsWith("scripts/promotion-") || filePath.startsWith("coordination/integration/")) return true;
  return buildPromotionControlledPathUnion(canonicalIntegrity).includes(filePath);
}

function validateCanonicalIntegrity(canonicalIntegrity) {
  const paths = buildPromotionControlledPathUnion(canonicalIntegrity);
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

export function evaluatePromotionRequiredCheckSemanticRescope(input) {
  try {
    const github = validateGithub(input?.github);
    validateCurrentValidation(input.currentValidation);
    const controlledPaths = validateCanonicalIntegrity(input.canonicalIntegrity);
    validateSemantic(input.semantic, github.head);
    const graph = validateGraph(input.graph);
    const promotionControlledPathCount = github.paths.filter((filePath) =>
      isPromotionControlledPath(filePath, input.canonicalIntegrity)
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

export function parseStrictDecisionJson(bytes) {
  const decision = parsePromotionWorkflowJsonBytes(bytes);
  const expectedKeys = [
    "schemaVersion", "result", "code", "liveAllowed", "binding", "promotionControlledPathCount",
    "graph", "reviewQueue", "decisionDigest"
  ].sort(codePointCompare);
  const actualKeys = decision !== null && typeof decision === "object" && !Array.isArray(decision)
    ? Object.keys(decision).sort(codePointCompare)
    : [];
  if (stableJson(actualKeys) !== stableJson(expectedKeys)) throw new Error("PROMOTION_DECISION_INVALID");
  if (decision?.schemaVersion !== PROMOTION_REQUIRED_CHECK_SEMANTIC_RESCOPE_SCHEMA ||
    typeof decision.decisionDigest !== "string" || !SHA256.test(decision.decisionDigest)) {
    throw new Error("PROMOTION_DECISION_INVALID");
  }
  const digestPayload = structuredClone(decision);
  delete digestPayload.decisionDigest;
  const expected = sha256(stableJson(digestPayload));
  if (decision.decisionDigest !== expected) throw new Error("PROMOTION_DECISION_DIGEST_MISMATCH");
  return decision;
}

export function canEnforcePromotionRequiredCheckSuccess(decision, evidence) {
  try {
    if (evidence === undefined) return false;
    const recomputed = evaluatePromotionRequiredCheckSemanticRescope(evidence);
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
