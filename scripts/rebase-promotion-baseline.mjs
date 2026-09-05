#!/usr/bin/env node
/**
 * Creates a hash-bound baseline re-affirmation revision without mutating the
 * finalized Promotion attempt that supplied the source evidence.
 *
 * The revision is intentionally committed in two phases:
 *
 *   1. --write-evidence creates a new legacy-registry snapshot and nine new
 *      role-evidence files under --revision-root.
 *   2. After those exact bytes are committed, --write-bindings creates the new
 *      Manifest and evidence index and binds every role to --evidence-commit.
 *
 * The source Manifest, source evidence, source registry, canonical Receipt,
 * closure, and lifecycle registry are read-only historical artifacts. The old
 * monolithic --write mode is rejected.
 */

import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import ts from "typescript";

import {
  analyzeRuntimeLoaderCalls,
  fingerprint,
  inspectLegacyCandidateDocument,
  observeCanonicalRuntimePolicy
} from "../coordination/integration/promotion-gate-lib.mjs";
import {
  computeV2EvidenceSemanticDigest,
  projectV2RuntimePolicy
} from "../coordination/integration/v2/promotion-gate-v2-lib.mjs";
import { parsePromotionWorkflowJsonBytes } from "./promotion-workflow-json-guard.mjs";

const scriptPath = fileURLToPath(import.meta.url);
const repoRoot = fs.realpathSync(path.resolve(path.dirname(scriptPath), ".."));
const commitPattern = /^[a-f0-9]{40}$/u;
const revisionIdPattern = /^[a-z0-9][a-z0-9-]{2,79}$/u;
const protectedPaths = [
  "app",
  "components",
  "data",
  "lib",
  "public",
  "middleware.ts",
  "next.config.ts",
  "tsconfig.json"
];

function usage() {
  return [
    "usage:",
    "  rebase-promotion-baseline.mjs --manifest <source> --target <commit> --revision-root <new-path>",
    "  Add --rebind-runtime-callsites for independently reviewed source-hash/position-only changes (requires full Git history; planning materializes owned temporary commit trees).",
    "  rebase-promotion-baseline.mjs --manifest <source> --target <commit> --revision-root <new-path> --write-evidence --produced-at <ISO> --attested-by <roles> --justification <committed-path> [--refresh-runtime-policy|--review-runtime-policy] [--review-legacy-candidate-bytes]",
    "  rebase-promotion-baseline.mjs --manifest <source> --target <commit> --revision-root <new-path> --write-bindings --evidence-commit <commit> --attested-by <roles> --justification <committed-path> [--refresh-runtime-policy|--review-runtime-policy] [--review-legacy-candidate-bytes]"
  ].join("\n");
}

function parseArgs(argv) {
  const options = {
    manifest: null,
    target: null,
    revisionRoot: null,
    producedAt: null,
    attestedBy: [],
    justification: null,
    evidenceCommit: null,
    writeEvidence: false,
    writeBindings: false,
    refreshRuntimePolicy: false,
    reviewRuntimePolicy: false,
    rebindRuntimeCallsites: false,
    reviewLegacyCandidateBytes: false,
    rejectedMonolithicWrite: false,
    help: false
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    const next = () => argv[++index];
    if (argument === "--manifest") options.manifest = next();
    else if (argument === "--target") options.target = next();
    else if (argument === "--revision-root") options.revisionRoot = next();
    else if (argument === "--produced-at") options.producedAt = next();
    else if (argument === "--attested-by") {
      options.attestedBy = (next() ?? "").split(",").map((role) => role.trim()).filter(Boolean);
    } else if (argument === "--justification") options.justification = next();
    else if (argument === "--evidence-commit") options.evidenceCommit = next();
    else if (argument === "--write-evidence") options.writeEvidence = true;
    else if (argument === "--write-bindings") options.writeBindings = true;
    else if (argument === "--refresh-runtime-policy") options.refreshRuntimePolicy = true;
    else if (argument === "--review-runtime-policy") options.reviewRuntimePolicy = true;
    else if (argument === "--rebind-runtime-callsites") options.rebindRuntimeCallsites = true;
    else if (argument === "--review-legacy-candidate-bytes") options.reviewLegacyCandidateBytes = true;
    else if (argument === "--write") options.rejectedMonolithicWrite = true;
    else if (argument === "--help" || argument === "-h") options.help = true;
    else throw new Error(`Unknown argument: ${argument}`);
  }
  return options;
}

function git(args, encoding = "utf8") {
  const dotGit = path.join(repoRoot, ".git");
  const entry = fs.lstatSync(dotGit);
  if (entry.isSymbolicLink()) throw new Error("Repository Git identity cannot be a symlink.");
  const pointer = entry.isDirectory() ? null : fs.readFileSync(dotGit, "utf8").trim().match(/^gitdir: (.+)$/u);
  if (!entry.isDirectory() && !pointer) throw new Error("Repository Git identity is invalid.");
  const gitDir = entry.isDirectory() ? dotGit : path.resolve(repoRoot, pointer[1]);
  return execFileSync("git", ["--no-optional-locks", "--no-replace-objects", `--git-dir=${gitDir}`,
    `--work-tree=${repoRoot}`, "-c", `core.worktree=${repoRoot}`, "-c", "core.fsmonitor=false", ...args], {
    cwd: repoRoot,
    env: Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith("GIT_") && key !== "NODE_OPTIONS")),
    encoding,
    maxBuffer: 32 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"]
  });
}

function resolveCommit(commitish, label) {
  try {
    const resolved = git(["rev-parse", "--verify", `${commitish}^{commit}`]).trim();
    if (!commitPattern.test(resolved)) throw new Error("invalid commit shape");
    return resolved;
  } catch {
    throw new Error(`${label} cannot be resolved to one commit in this repository.`);
  }
}

function assertAncestor(ancestor, descendant, label) {
  try {
    git(["merge-base", "--is-ancestor", ancestor, descendant]);
  } catch {
    throw new Error(`${label} is not an ancestor of the required execution commit.`);
  }
}

function assertCleanWorktree() {
  if (git(["status", "--porcelain=v1", "--untracked-files=all"]).trim() !== "") {
    throw new Error("A write phase requires an otherwise clean worktree.");
  }
}

function assertSafeRelative(input, label) {
  if (
    typeof input !== "string" ||
    input.length === 0 ||
    path.isAbsolute(input) ||
    input.includes("\0") ||
    input.includes("\\")
  ) {
    throw new Error(`${label} must be one safe repository-relative path.`);
  }
  const normalized = path.posix.normalize(input);
  if (normalized !== input || normalized === "." || normalized.startsWith("../")) {
    throw new Error(`${label} must be one safe repository-relative path.`);
  }
  const absolute = path.resolve(repoRoot, input);
  if (absolute === repoRoot || !absolute.startsWith(`${repoRoot}${path.sep}`)) {
    throw new Error(`${label} escapes the repository.`);
  }
  return { absolute, relative: input };
}

function resolveRepositoryFile(input, label) {
  const file = assertSafeRelative(input, label);
  const real = fs.realpathSync(file.absolute);
  if (real !== file.absolute || !fs.lstatSync(real).isFile()) {
    throw new Error(`${label} must be one exact regular repository file.`);
  }
  return file;
}

function resolveRevisionRoot(sourceManifestPath, revisionRootInput) {
  const root = assertSafeRelative(revisionRootInput, "Revision root");
  const sourceRoot = path.posix.dirname(sourceManifestPath);
  const expectedPrefix = `${sourceRoot}/reaffirmations/`;
  if (!root.relative.startsWith(expectedPrefix)) {
    throw new Error(`Revision root must be a new child of ${expectedPrefix}`);
  }
  const revisionId = path.posix.basename(root.relative);
  if (!revisionIdPattern.test(revisionId)) {
    throw new Error("Revision root basename must be a lowercase, hyphenated revision id.");
  }
  return { ...root, revisionId };
}

function gitBlob(commit, repositoryPath) {
  return git(["show", `${commit}:${repositoryPath}`], null);
}

function sha256(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function canonicalJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function jsonEqual(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function jsonDigest(value) {
  return sha256(Buffer.from(canonicalJson(value), "utf8"));
}

export function buildReaffirmedRuntimePolicyRefresh({
  sourceExpectedPolicy,
  sourceObservedPolicy,
  targetObservedPolicy,
  sourceFsReadAllowlist,
  targetFsReadAllowlist
}) {
  for (const [value, label] of [
    [sourceExpectedPolicy, "source expected runtime policy"],
    [sourceObservedPolicy, "source observed runtime policy"],
    [targetObservedPolicy, "target observed runtime policy"]
  ]) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new Error(`${label} must be one object.`);
    }
  }
  if (!Array.isArray(sourceFsReadAllowlist) || !Array.isArray(targetFsReadAllowlist)) {
    throw new Error("Runtime-policy refresh requires both exact fs-read allowlists.");
  }
  const expectedKeys = Object.keys(sourceExpectedPolicy).sort();
  const sourceKeys = Object.keys(sourceObservedPolicy).sort();
  const targetKeys = Object.keys(targetObservedPolicy).sort();
  if (!jsonEqual(expectedKeys, sourceKeys) || !jsonEqual(sourceKeys, targetKeys)) {
    throw new Error("Runtime-policy refresh cannot change the policy schema.");
  }
  const changedFields = expectedKeys.filter(
    (field) => !jsonEqual(sourceExpectedPolicy[field], sourceObservedPolicy[field])
  );
  if (!jsonEqual(changedFields, ["fsReadAllowlistDigest"])) {
    throw new Error("Runtime-policy refresh may repair only one stale fs-read allowlist digest.");
  }
  if (!jsonEqual(sourceObservedPolicy, targetObservedPolicy)) {
    throw new Error("Runtime-policy refresh target runtime policy differs from its source baseline.");
  }
  if (!jsonEqual(sourceFsReadAllowlist, targetFsReadAllowlist)) {
    throw new Error("Runtime-policy refresh target fs-read allowlist differs from its source baseline.");
  }
  const fsReadAllowlistCount = sourceFsReadAllowlist.length;
  if (
    sourceExpectedPolicy.fsReadAllowlistCount !== fsReadAllowlistCount
    || sourceObservedPolicy.fsReadAllowlistCount !== fsReadAllowlistCount
    || targetObservedPolicy.fsReadAllowlistCount !== fsReadAllowlistCount
    || sourceObservedPolicy.nextDynamicNonliteralImportCount !== 0
    || sourceObservedPolicy.zeroBaselineCallCount !== 0
  ) {
    throw new Error("Runtime-policy refresh cannot weaken loader completeness invariants.");
  }
  return {
    schemaVersion: "promotion-runtime-policy-reaffirmation.v1",
    changedFields,
    sourceExpectedPolicyDigest: jsonDigest(sourceExpectedPolicy),
    sourceObservedPolicyDigest: jsonDigest(sourceObservedPolicy),
    targetObservedPolicyDigest: jsonDigest(targetObservedPolicy),
    fsReadAllowlistCount,
    sourceAndTargetRuntimePolicyEqual: true,
    sourceAndTargetFsReadAllowlistEqual: true,
    nextDynamicNonliteralImportCount: 0,
    zeroBaselineCallCount: 0,
    liveAllowed: false
  };
}

export function buildReviewedRuntimePolicyEvolution({
  sourceExpectedPolicy,
  sourceObservedPolicy,
  targetObservedPolicy,
  sourceFsReadAllowlist,
  targetFsReadAllowlist
}) {
  for (const [value, label] of [
    [sourceExpectedPolicy, "source expected runtime policy"],
    [sourceObservedPolicy, "source observed runtime policy"],
    [targetObservedPolicy, "target observed runtime policy"]
  ]) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new Error(`${label} must be one object.`);
    }
  }
  if (!Array.isArray(sourceFsReadAllowlist) || !Array.isArray(targetFsReadAllowlist)) {
    throw new Error("Reviewed runtime-policy evolution requires both exact fs-read allowlists.");
  }
  const expectedKeys = Object.keys(sourceExpectedPolicy).sort();
  const sourceKeys = Object.keys(sourceObservedPolicy).sort();
  const targetKeys = Object.keys(targetObservedPolicy).sort();
  if (!jsonEqual(expectedKeys, sourceKeys) || !jsonEqual(sourceKeys, targetKeys)) {
    throw new Error("Reviewed runtime-policy evolution cannot change the policy schema.");
  }
  if (!jsonEqual(sourceExpectedPolicy, sourceObservedPolicy)) {
    throw new Error("Reviewed runtime-policy evolution source expected policy differs from its exact observed baseline.");
  }
  if (!jsonEqual(sourceFsReadAllowlist, targetFsReadAllowlist)) {
    throw new Error("Reviewed runtime-policy evolution fs-read allowlist differs from its source baseline.");
  }
  const fsReadAllowlistCount = sourceFsReadAllowlist.length;
  if (
    sourceExpectedPolicy.fsReadAllowlistCount !== fsReadAllowlistCount
    || sourceObservedPolicy.fsReadAllowlistCount !== fsReadAllowlistCount
    || targetObservedPolicy.fsReadAllowlistCount !== fsReadAllowlistCount
    || sourceObservedPolicy.fsReadAllowlistDigest !== targetObservedPolicy.fsReadAllowlistDigest
  ) {
    throw new Error("Reviewed runtime-policy evolution cannot change loader file-read capability.");
  }
  if (
    sourceObservedPolicy.reachablePathCount !== targetObservedPolicy.reachablePathCount
    || sourceObservedPolicy.reachablePathsDigest !== targetObservedPolicy.reachablePathsDigest
  ) {
    throw new Error("Reviewed runtime-policy evolution cannot change the reachable path set.");
  }
  if (
    sourceObservedPolicy.frameworkEntrypointCount !== targetObservedPolicy.frameworkEntrypointCount
    || sourceObservedPolicy.seedCount !== targetObservedPolicy.seedCount
  ) {
    throw new Error("Reviewed runtime-policy evolution cannot change framework entrypoints or seeds.");
  }
  if (
    sourceObservedPolicy.nextDynamicNonliteralImportCount !== 0
    || targetObservedPolicy.nextDynamicNonliteralImportCount !== 0
  ) {
    throw new Error("Reviewed runtime-policy evolution cannot introduce nonliteral dynamic imports.");
  }
  if (
    sourceObservedPolicy.zeroBaselineCallCount !== 0
    || targetObservedPolicy.zeroBaselineCallCount !== 0
  ) {
    throw new Error("Reviewed runtime-policy evolution cannot introduce zero-baseline loader calls.");
  }
  if (
    sourceObservedPolicy.topologyEdgeCount !== sourceObservedPolicy.edgeCount
    || targetObservedPolicy.topologyEdgeCount !== targetObservedPolicy.edgeCount
  ) {
    throw new Error("Reviewed runtime-policy evolution requires a complete topology edge inventory.");
  }
  const literalDynamicImportDelta =
    targetObservedPolicy.nextDynamicLiteralImportCount - sourceObservedPolicy.nextDynamicLiteralImportCount;
  const dynamicCallDelta =
    targetObservedPolicy.nextDynamicCallCount - sourceObservedPolicy.nextDynamicCallCount;
  const edgeDelta = targetObservedPolicy.edgeCount - sourceObservedPolicy.edgeCount;
  const topologyEdgeDelta =
    targetObservedPolicy.topologyEdgeCount - sourceObservedPolicy.topologyEdgeCount;
  if (
    !Number.isSafeInteger(literalDynamicImportDelta)
    || literalDynamicImportDelta <= 0
    || dynamicCallDelta !== literalDynamicImportDelta
    || edgeDelta !== literalDynamicImportDelta
    || topologyEdgeDelta !== literalDynamicImportDelta
  ) {
    throw new Error("Reviewed runtime-policy evolution requires coherent positive literal-import and edge deltas.");
  }
  if (targetObservedPolicy.coveredFileCount < sourceObservedPolicy.coveredFileCount) {
    throw new Error("Reviewed runtime-policy evolution cannot shrink the covered file inventory.");
  }
  const changedFields = expectedKeys.filter(
    (field) => !jsonEqual(sourceObservedPolicy[field], targetObservedPolicy[field])
  );
  const allowedChangedFields = new Set([
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
  if (changedFields.some((field) => !allowedChangedFields.has(field))) {
    throw new Error("Reviewed runtime-policy evolution changed an unreviewable runtime-policy field.");
  }
  return {
    schemaVersion: "promotion-runtime-policy-reviewed-evolution.v1",
    changedFields,
    sourceExpectedPolicyDigest: jsonDigest(sourceExpectedPolicy),
    sourceObservedPolicyDigest: jsonDigest(sourceObservedPolicy),
    targetObservedPolicyDigest: jsonDigest(targetObservedPolicy),
    literalDynamicImportDelta,
    coveredFileDelta: targetObservedPolicy.coveredFileCount - sourceObservedPolicy.coveredFileCount,
    fsReadAllowlistCount,
    sourceAndTargetReachablePathsEqual: true,
    sourceAndTargetFsReadAllowlistEqual: true,
    nextDynamicNonliteralImportCount: 0,
    zeroBaselineCallCount: 0,
    liveAllowed: false
  };
}

const callsitePolicyKeys = [
  "coveredFileCount", "coveredFilesDigest", "classificationsDigest", "frameworkEntrypointCount", "seedCount",
  "reachablePathCount", "reachablePathsDigest", "edgeCount", "edgeDigest", "topologyEdgeCount", "topologyEdgeDigest",
  "nextDynamicCallCount", "nextDynamicLiteralImportCount", "nextDynamicNonliteralImportCount",
  "nextDynamicCallsiteDigest", "fsReadAllowlistCount", "fsReadAllowlistDigest", "zeroBaselineCallCount"
].sort();
const callsiteKeys = ["sourcePath", "sourceRawSha256", "position", "literalImports", "nonliteralImportCount", "normalizedExpressionDigest"];
const rebindingLimits = Object.freeze({ maxFiles: 10_000, maxCalls: 100_000, maxFileBytes: 16 * 1024 * 1024, maxTotalBytes: 64 * 1024 * 1024 });

function rebindingFail(reason) {
  throw new Error(`callsite rebinding: ${reason}`);
}

function exactRebindingKeys(value, keys, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)
    || ![Object.prototype, null].includes(Object.getPrototypeOf(value))
    || !jsonEqual(Object.keys(value).sort(), [...keys].sort())) rebindingFail(`${label} schema is invalid`);
}

function compareCallsiteKeys(left, right) {
  const a = `${left.sourcePath}\0${left.position}`, b = `${right.sourcePath}\0${right.position}`;
  return a < b ? -1 : a > b ? 1 : 0;
}

function validateRebindingPolicy(policy) {
  exactRebindingKeys(policy, callsitePolicyKeys, "policy");
  for (const key of callsitePolicyKeys) {
    if (key.endsWith("Digest") ? !/^[a-f0-9]{64}$/u.test(policy[key] ?? "")
      : !Number.isSafeInteger(policy[key]) || policy[key] < 0) rebindingFail("policy value is invalid");
  }
  if (policy.nextDynamicNonliteralImportCount !== 0 || policy.zeroBaselineCallCount !== 0
    || policy.edgeCount !== policy.topologyEdgeCount) rebindingFail("policy capability ceiling is invalid");
}

function verifyCallsiteFiles(files, callsites, policy) {
  if (!Array.isArray(files) || files.length === 0 || files.length > rebindingLimits.maxFiles
    || !Array.isArray(callsites) || callsites.length === 0 || callsites.length > rebindingLimits.maxCalls) {
    rebindingFail("file or callsite inventory is missing or exceeds limits");
  }
  const parsedCalls = [], expressions = new Map(), records = [], seen = new Set();
  let totalBytes = 0;
  for (const file of files) {
    exactRebindingKeys(file, ["path", "mode", "gitBlobId", "bytes"], "source file");
    try { assertSafeRelative(file.path, "source file"); } catch { rebindingFail("source file path is unsafe"); }
    if (seen.has(file.path) || !["100644", "100755"].includes(file.mode)
      || !/^[a-f0-9]{40}$/u.test(file.gitBlobId ?? "") || !(file.bytes instanceof Uint8Array)
      || file.bytes.byteLength > rebindingLimits.maxFileBytes) rebindingFail("source file binding is invalid");
    totalBytes += file.bytes.byteLength;
    if (totalBytes > rebindingLimits.maxTotalBytes) rebindingFail("source byte inventory exceeds limits");
    seen.add(file.path);
    const bytes = Buffer.from(file.bytes);
    const blobId = crypto.createHash("sha1").update(`blob ${bytes.length}\0`).update(bytes).digest("hex");
    if (blobId !== file.gitBlobId) rebindingFail("source Git blob identity differs");
    let source;
    try { source = new TextDecoder("utf-8", { fatal: true }).decode(bytes); } catch { rebindingFail("source UTF-8 is invalid"); }
    const sourceHash = sha256(bytes);
    let parsed;
    try { parsed = analyzeRuntimeLoaderCalls(file.path, source); } catch { rebindingFail("source parser rejected the Git blob"); }
    if (parsed.sourceRawSha256 !== sourceHash || parsed.zeroBaselineCalls.length !== 0
      || parsed.nextDynamicCalls.length === 0) rebindingFail("source loader inventory is invalid");
    const syntax = ts.createSourceFile(file.path, source, ts.ScriptTarget.Latest, true);
    const callText = new Map();
    const visit = (node) => {
      if (ts.isCallExpression(node)) callText.set(node.getStart(syntax), node.getText(syntax));
      ts.forEachChild(node, visit);
    };
    visit(syntax);
    for (const { position, literalImports, nonliteralImportCount, normalizedExpressionDigest } of parsed.nextDynamicCalls) {
      if (!callText.has(position) || nonliteralImportCount !== 0) rebindingFail("callsite expression is unresolved");
      const call = { sourcePath: file.path, sourceRawSha256: sourceHash, position, literalImports, nonliteralImportCount, normalizedExpressionDigest };
      parsedCalls.push(call);
      expressions.set(`${file.path}\0${position}`, sha256(Buffer.from(callText.get(position))));
    }
    records.push({ path: file.path, mode: file.mode, gitBlobId: blobId, rawSha256: sourceHash });
  }
  for (const call of callsites) exactRebindingKeys(call, callsiteKeys, "callsite");
  parsedCalls.sort(compareCallsiteKeys);
  if (parsedCalls.length > rebindingLimits.maxCalls || fingerprint(parsedCalls) !== fingerprint(callsites)
    || fingerprint(parsedCalls) !== policy.nextDynamicCallsiteDigest
    || parsedCalls.length !== policy.nextDynamicCallCount
    || parsedCalls.reduce((n, call) => n + call.literalImports.length, 0) !== policy.nextDynamicLiteralImportCount) {
    rebindingFail("callsite inventory or policy digest is incomplete or differs from exact source blobs");
  }
  records.sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
  // Native digests sort positions lexically. Pair calls in source order instead,
  // so a byte offset crossing a decimal-width boundary cannot mispair them.
  const ordered = [...parsedCalls].sort((a, b) => a.sourcePath === b.sourcePath
    ? a.position - b.position : a.sourcePath < b.sourcePath ? -1 : 1);
  return { calls: ordered, expressions, records };
}

/** Bounded policy evidence only; never supplies candidate/domain approval. */
export function buildReviewedRuntimeCallsiteRebinding(input) {
  const { sourceCommit, targetCommit, sourceExpectedPolicy, sourceObservedPolicy, targetObservedPolicy,
    sourceFsReadAllowlist, targetFsReadAllowlist, sourceCallsites, targetCallsites, sourceFiles, targetFiles } = input;
  if (!commitPattern.test(sourceCommit ?? "") || !commitPattern.test(targetCommit ?? "") || sourceCommit === targetCommit) {
    rebindingFail("distinct exact source/target commits are required");
  }
  for (const policy of [sourceExpectedPolicy, sourceObservedPolicy, targetObservedPolicy]) validateRebindingPolicy(policy);
  if (fingerprint(sourceExpectedPolicy) !== fingerprint(sourceObservedPolicy)) rebindingFail("source expected policy differs from observation");
  const changedFields = callsitePolicyKeys.filter((key) => sourceObservedPolicy[key] !== targetObservedPolicy[key]);
  if (!jsonEqual(changedFields, ["nextDynamicCallsiteDigest"])) rebindingFail("policy may change only its callsite digest");
  if (!Array.isArray(sourceFsReadAllowlist) || !Array.isArray(targetFsReadAllowlist)
    || sourceFsReadAllowlist.length !== sourceObservedPolicy.fsReadAllowlistCount
    || fingerprint(sourceFsReadAllowlist) !== sourceObservedPolicy.fsReadAllowlistDigest
    || fingerprint(sourceFsReadAllowlist) !== fingerprint(targetFsReadAllowlist)) rebindingFail("fs-read policy or allowlist differs");
  const source = verifyCallsiteFiles(sourceFiles, sourceCallsites, sourceObservedPolicy);
  const target = verifyCallsiteFiles(targetFiles, targetCallsites, targetObservedPolicy);
  if (!jsonEqual(source.records.map(({ path, mode }) => ({ path, mode })), target.records.map(({ path, mode }) => ({ path, mode })))) {
    rebindingFail("callsite file set or modes differ");
  }
  const changes = [];
  for (let index = 0; index < source.calls.length; index += 1) {
    const oldCall = source.calls[index], newCall = target.calls[index];
    const { sourceRawSha256: oldHash, position: oldPosition, ...oldSemantic } = oldCall;
    const { sourceRawSha256: newHash, position: newPosition, ...newSemantic } = newCall;
    const oldExpression = source.expressions.get(`${oldCall.sourcePath}\0${oldPosition}`);
    const newExpression = target.expressions.get(`${newCall.sourcePath}\0${newPosition}`);
    if (fingerprint(oldSemantic) !== fingerprint(newSemantic) || oldExpression !== newExpression) {
      rebindingFail("callsite semantics or expression changed");
    }
    if (oldHash !== newHash || oldPosition !== newPosition) changes.push({
      sourcePath: oldCall.sourcePath, sourceRawSha256: oldHash, targetRawSha256: newHash,
      sourcePosition: oldPosition, targetPosition: newPosition, expressionDigest: oldExpression
    });
  }
  if (changes.length === 0) rebindingFail("no source-hash/position changes were proven");
  return {
    schemaVersion: "promotion-runtime-callsite-rebinding.v1", sourceCommit, targetCommit, changedFields,
    sourcePolicyDigest: fingerprint(sourceObservedPolicy), targetPolicyDigest: fingerprint(targetObservedPolicy),
    sourceCallsiteDigest: sourceObservedPolicy.nextDynamicCallsiteDigest,
    targetCallsiteDigest: targetObservedPolicy.nextDynamicCallsiteDigest,
    sourceFiles: source.records, targetFiles: target.records, changedCallsites: changes,
    changedCallsiteCount: changes.length, callsiteSemanticsUnchanged: true,
    otherPolicyFieldsUnchanged: true, liveAllowed: false
  };
}

function loadCanonicalJson(file, label) {
  const bytes = fs.readFileSync(file.absolute);
  let value;
  try {
    value = parsePromotionWorkflowJsonBytes(bytes);
  } catch {
    throw new Error(`${label} is not valid JSON.`);
  }
  return { ...file, bytes, value, rawSha256: sha256(bytes) };
}

function loadManifest(manifestInput) {
  const loaded = loadCanonicalJson(resolveRepositoryFile(manifestInput, "Source Manifest"), "Source Manifest");
  if (
    !commitPattern.test(loaded.value?.targetBaselineCommit ?? "") ||
    !Array.isArray(loaded.value?.evidenceBindings) ||
    typeof loaded.value?.legacyResolution?.registryPath !== "string"
  ) {
    throw new Error("Source Manifest does not expose valid baseline, evidence, and legacy bindings.");
  }
  return loaded;
}

function requiredRoles(manifest) {
  const roles = manifest.evidenceBindings.map((binding) => binding.role);
  if (roles.length === 0 || new Set(roles).size !== roles.length || roles.some((role) => typeof role !== "string")) {
    throw new Error("Source Manifest evidence roles are missing or duplicated.");
  }
  return roles;
}

function assertAttestations(manifest, attestedBy) {
  const expected = [...requiredRoles(manifest)].sort();
  const supplied = [...new Set(attestedBy)].sort();
  if (JSON.stringify(expected) !== JSON.stringify(supplied)) {
    const missing = expected.filter((role) => !supplied.includes(role));
    const unexpected = supplied.filter((role) => !expected.includes(role));
    throw new Error(
      `Re-affirmation set is not exact (missing=${missing.join(",") || "none"}; unexpected=${unexpected.join(",") || "none"}).`
    );
  }
}

function assertCommittedJustification(justificationInput, targetCommit, roles, revisionRoot) {
  const file = resolveRepositoryFile(justificationInput, "Justification");
  let committed;
  try {
    committed = gitBlob("HEAD", file.relative);
  } catch {
    throw new Error("Justification must already be committed before either write phase.");
  }
  const working = fs.readFileSync(file.absolute);
  if (!working.equals(committed)) throw new Error("Justification bytes differ from committed HEAD.");
  const text = working.toString("utf8");
  if (!text.includes(targetCommit) || !text.includes(revisionRoot) || roles.some((role) => !text.includes(role))) {
    throw new Error("Committed justification must name the exact target, revision root, and every re-affirming role.");
  }
  return file;
}

function assertProducedAt(value) {
  if (typeof value !== "string" || Number.isNaN(Date.parse(value))) {
    throw new Error("--write-evidence requires one explicit ISO --produced-at value.");
  }
}

function isTestOnlyPath(relativePath) {
  return (
    relativePath.startsWith("tests/") ||
    /(?:^|\/)(?:__tests__)(?:\/|$)/u.test(relativePath) ||
    /\.(?:test|spec)\.[cm]?[jt]sx?$/u.test(relativePath)
  );
}

function collectProtectedDiff(fromCommit, toCommit) {
  const output = git(["diff", "--name-only", `${fromCommit}..${toCommit}`, "--", ...protectedPaths]).trim();
  const changedPaths = output === "" ? [] : output.split("\n").filter(Boolean).sort();
  return {
    changedPaths,
    testOnlyPaths: changedPaths.filter(isTestOnlyPath),
    runtimePaths: changedPaths.filter((entry) => !isTestOnlyPath(entry))
  };
}

function loadCanonicalJsonAtRoot(root, relativePath, label) {
  assertSafeRelative(relativePath, label);
  const absolute = path.resolve(root, relativePath);
  if (!absolute.startsWith(`${root}${path.sep}`)) {
    throw new Error(`${label} escapes its projected repository root.`);
  }
  const entry = fs.lstatSync(absolute);
  if (!entry.isFile() || entry.isSymbolicLink() || fs.realpathSync(absolute) !== absolute) {
    throw new Error(`${label} must be one regular projected repository file.`);
  }
  const bytes = fs.readFileSync(absolute);
  let value;
  try {
    value = parsePromotionWorkflowJsonBytes(bytes);
  } catch {
    throw new Error(`${label} is not valid JSON.`);
  }
  return { absolute, bytes, value, rawSha256: sha256(bytes) };
}

function materializeCommitTree(commit) {
  const ownerRoot = fs.mkdtempSync(path.join(os.tmpdir(), "mais-promotion-runtime-policy-"));
  const treeRoot = path.join(ownerRoot, "tree");
  const archivePath = path.join(ownerRoot, "source.tar");
  fs.mkdirSync(treeRoot, { mode: 0o700 });
  try {
    git(["archive", "--format=tar", `--output=${archivePath}`, commit]);
    execFileSync("tar", ["-xf", archivePath, "-C", treeRoot], {
      encoding: "utf8",
      maxBuffer: 16 * 1024 * 1024,
      stdio: ["ignore", "pipe", "pipe"]
    });
    fs.unlinkSync(archivePath);
    return {
      root: fs.realpathSync(treeRoot),
      dispose: () => fs.rmSync(ownerRoot, { recursive: true, force: false })
    };
  } catch (error) {
    fs.rmSync(ownerRoot, { recursive: true, force: false });
    throw error;
  }
}

async function collectRuntimePolicyRefresh(manifest) {
  const compatibilityPath = manifest.liveReachability?.compatibilityManifestPath;
  const compatibilityRawSha256 = manifest.liveReachability?.compatibilityManifestRawSha256;
  if (typeof compatibilityPath !== "string" || !/^[a-f0-9]{64}$/u.test(compatibilityRawSha256 ?? "")) {
    throw new Error("Source Manifest runtime compatibility binding is invalid.");
  }
  const currentCompatibility = loadCanonicalJson(
    resolveRepositoryFile(compatibilityPath, "Current runtime compatibility Manifest"),
    "Current runtime compatibility Manifest"
  );
  if (currentCompatibility.rawSha256 !== compatibilityRawSha256) {
    throw new Error("Current runtime compatibility Manifest bytes drifted.");
  }
  const projection = materializeCommitTree(manifest.targetBaselineCommit);
  try {
    const sourceCompatibility = loadCanonicalJsonAtRoot(
      projection.root,
      compatibilityPath,
      "Source-baseline runtime compatibility Manifest"
    );
    if (sourceCompatibility.rawSha256 !== compatibilityRawSha256) {
      throw new Error("Source-baseline runtime compatibility Manifest bytes drifted.");
    }
    const sourceObservation = await observeCanonicalRuntimePolicy(projection.root, sourceCompatibility.value);
    const targetObservation = await observeCanonicalRuntimePolicy(repoRoot, currentCompatibility.value);
    const sourceObservedPolicy = projectV2RuntimePolicy(sourceObservation);
    const targetObservedPolicy = projectV2RuntimePolicy(targetObservation);
    const proof = buildReaffirmedRuntimePolicyRefresh({
      sourceExpectedPolicy: manifest.liveReachability.expectedRuntimePolicy,
      sourceObservedPolicy,
      targetObservedPolicy,
      sourceFsReadAllowlist: sourceObservation.loaderPolicy.fsReadAllowlist,
      targetFsReadAllowlist: targetObservation.loaderPolicy.fsReadAllowlist
    });
    return { proof, targetObservedPolicy };
  } finally {
    projection.dispose();
  }
}

async function collectReviewedRuntimePolicyEvolution(manifest, targetCommit) {
  const compatibilityPath = manifest.liveReachability?.compatibilityManifestPath;
  const compatibilityRawSha256 = manifest.liveReachability?.compatibilityManifestRawSha256;
  if (typeof compatibilityPath !== "string" || !/^[a-f0-9]{64}$/u.test(compatibilityRawSha256 ?? "")) {
    throw new Error("Source Manifest runtime compatibility binding is invalid.");
  }
  const sourceProjection = materializeCommitTree(manifest.targetBaselineCommit);
  let targetProjection;
  try {
    targetProjection = materializeCommitTree(targetCommit);
    const sourceCompatibility = loadCanonicalJsonAtRoot(
      sourceProjection.root,
      compatibilityPath,
      "Source-baseline runtime compatibility Manifest"
    );
    const targetCompatibility = loadCanonicalJsonAtRoot(
      targetProjection.root,
      compatibilityPath,
      "Target-baseline runtime compatibility Manifest"
    );
    if (
      sourceCompatibility.rawSha256 !== compatibilityRawSha256
      || targetCompatibility.rawSha256 !== compatibilityRawSha256
    ) {
      throw new Error("Reviewed runtime-policy evolution compatibility Manifest bytes drifted.");
    }
    const sourceObservation = await observeCanonicalRuntimePolicy(
      sourceProjection.root,
      sourceCompatibility.value
    );
    const targetObservation = await observeCanonicalRuntimePolicy(
      targetProjection.root,
      targetCompatibility.value
    );
    const sourceObservedPolicy = projectV2RuntimePolicy(sourceObservation);
    const targetObservedPolicy = projectV2RuntimePolicy(targetObservation);
    const proof = buildReviewedRuntimePolicyEvolution({
      sourceExpectedPolicy: manifest.liveReachability.expectedRuntimePolicy,
      sourceObservedPolicy,
      targetObservedPolicy,
      sourceFsReadAllowlist: sourceObservation.loaderPolicy.fsReadAllowlist,
      targetFsReadAllowlist: targetObservation.loaderPolicy.fsReadAllowlist
    });
    return { proof, targetObservedPolicy };
  } finally {
    targetProjection?.dispose();
    sourceProjection.dispose();
  }
}

function nativeCallsiteProjection(observation) {
  return observation.graph.loaderInventory.nextDynamicCalls.map((call) =>
    Object.fromEntries(callsiteKeys.map((key) => [key, call[key]])));
}

function validateProjectionRecords(records) {
  if (!Array.isArray(records) || records.length === 0 || records.length > 50_000) rebindingFail("projection inventory is invalid");
  const seen = new Set();
  for (const record of records) {
    exactRebindingKeys(record, ["path", "mode", "objectId"], "projection record");
    try { assertSafeRelative(record.path, "projection path"); } catch { rebindingFail("projection path is unsafe"); }
    if (record.path.split("/").includes(".git") || seen.has(record.path)
      || !["100644", "100755"].includes(record.mode) || !/^[a-f0-9]{40}$/u.test(record.objectId ?? "")) {
      rebindingFail("projection must contain unique regular Git blobs");
    }
    seen.add(record.path);
  }
  return [...records].sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
}

export function verifyCallsiteProjectionRecords(expected, actual) {
  const trusted = validateProjectionRecords(expected), observed = validateProjectionRecords(actual);
  if (fingerprint(trusted) !== fingerprint(observed)) rebindingFail("archive projection differs from the complete Git tree");
  return fingerprint(trusted);
}

function callsiteCommitTreeRecords(commit) {
  const raw = git(["ls-tree", "-r", "--full-tree", "-l", "-z", commit]);
  if (!raw.endsWith("\0")) rebindingFail("Git tree projection is incomplete");
  let totalBytes = 0;
  return validateProjectionRecords(raw.slice(0, -1).split("\0").map((entry, index) => {
    const match = entry.match(/^(100644|100755) blob ([a-f0-9]{40})\s+(\d+)\t([^\0]+)$/u);
    if (!match) rebindingFail("Git tree projection contains non-regular entries");
    const size = Number(match[3]);
    totalBytes += size;
    assertCallsiteProjectionBudget({ fileCount: index + 1, totalBytes, maxFileBytes: size });
    return { path: match[4], mode: match[1], objectId: match[2] };
  }));
}

export function assertCallsiteProjectionBudget({ fileCount, totalBytes, maxFileBytes }) {
  if ([fileCount, totalBytes, maxFileBytes].some((value) => !Number.isSafeInteger(value) || value < 0)
    || fileCount > 50_000 || maxFileBytes > 32 * 1024 * 1024 || totalBytes > 2 * 1024 ** 3) {
    rebindingFail("archive projection exceeds fixed limits");
  }
}

function verifyCallsiteArchive(root, expected) {
  const actual = [];
  let total = 0;
  const walk = (directory) => {
    for (const name of fs.readdirSync(directory)) {
      const absolute = path.join(directory, name), stat = fs.lstatSync(absolute);
      if (stat.isSymbolicLink()) rebindingFail("archive projection contains a symlink");
      if (stat.isDirectory()) { walk(absolute); continue; }
      total += stat.size;
      if (!stat.isFile()) rebindingFail("archive projection is non-regular");
      assertCallsiteProjectionBudget({ fileCount: actual.length + 1, totalBytes: total, maxFileBytes: stat.size });
      const bytes = fs.readFileSync(absolute);
      actual.push({ path: path.relative(root, absolute).split(path.sep).join("/"),
        mode: stat.mode & 0o111 ? "100755" : "100644",
        objectId: crypto.createHash("sha1").update(`blob ${bytes.length}\0`).update(bytes).digest("hex") });
    }
  };
  walk(root);
  return verifyCallsiteProjectionRecords(expected, actual);
}

function readCallsiteGitFiles(commit, root, callsites) {
  const paths = [...new Set(callsites.map(({ sourcePath }) => sourcePath))].sort();
  if (paths.length > rebindingLimits.maxFiles) rebindingFail("source file count exceeds limits");
  let total = 0;
  return paths.map((relativePath) => {
    const safe = assertSafeRelative(relativePath, "callsite source");
    const absolute = path.resolve(root, safe.relative);
    const stat = fs.lstatSync(absolute);
    total += stat.size;
    if (!stat.isFile() || stat.isSymbolicLink() || fs.realpathSync(absolute) !== absolute
      || stat.size > rebindingLimits.maxFileBytes || total > rebindingLimits.maxTotalBytes) rebindingFail("source file is unsafe or too large");
    const record = git(["ls-tree", "-z", commit, "--", relativePath]);
    const match = record.match(/^(100644|100755) blob ([a-f0-9]{40})\t([^\0]+)\0$/u);
    if (!match || match[3] !== relativePath) rebindingFail("exact regular Git blob is missing");
    return { path: relativePath, mode: match[1], gitBlobId: match[2], bytes: fs.readFileSync(absolute) };
  });
}

async function collectReviewedRuntimeCallsiteRebinding(manifest, targetCommit) {
  assertAncestor(manifest.targetBaselineCommit, targetCommit, "Callsite source baseline");
  const compatibilityPath = manifest.liveReachability?.compatibilityManifestPath;
  const compatibilityHash = manifest.liveReachability?.compatibilityManifestRawSha256;
  if (typeof compatibilityPath !== "string" || !/^[a-f0-9]{64}$/u.test(compatibilityHash ?? "")) rebindingFail("compatibility binding is invalid");
  const head = resolveCommit("HEAD", "HEAD");
  // Reject unsafe tree entries before extraction. Then bind every extracted
  // file, including non-callsite runtime files affected by export attributes.
  const sourceRecords = callsiteCommitTreeRecords(manifest.targetBaselineCommit);
  const targetRecords = callsiteCommitTreeRecords(targetCommit);
  const source = materializeCommitTree(manifest.targetBaselineCommit);
  let target;
  try {
    target = materializeCommitTree(targetCommit);
    const sourceTreeDigest = verifyCallsiteArchive(source.root, sourceRecords);
    const targetTreeDigest = verifyCallsiteArchive(target.root, targetRecords);
    const sourceCompatibility = loadCanonicalJsonAtRoot(source.root, compatibilityPath, "Source compatibility Manifest");
    const targetCompatibility = loadCanonicalJsonAtRoot(target.root, compatibilityPath, "Target compatibility Manifest");
    if (sourceCompatibility.rawSha256 !== compatibilityHash || targetCompatibility.rawSha256 !== compatibilityHash) rebindingFail("compatibility bytes drifted");
    const sourceObservation = await observeCanonicalRuntimePolicy(source.root, sourceCompatibility.value);
    const targetObservation = await observeCanonicalRuntimePolicy(target.root, targetCompatibility.value);
    const sourceCallsites = nativeCallsiteProjection(sourceObservation);
    const targetCallsites = nativeCallsiteProjection(targetObservation);
    const targetObservedPolicy = projectV2RuntimePolicy(targetObservation);
    const proof = buildReviewedRuntimeCallsiteRebinding({
      sourceCommit: manifest.targetBaselineCommit, targetCommit,
      sourceExpectedPolicy: manifest.liveReachability.expectedRuntimePolicy,
      sourceObservedPolicy: projectV2RuntimePolicy(sourceObservation), targetObservedPolicy,
      sourceFsReadAllowlist: sourceObservation.loaderPolicy.fsReadAllowlist,
      targetFsReadAllowlist: targetObservation.loaderPolicy.fsReadAllowlist,
      sourceCallsites, targetCallsites,
      sourceFiles: readCallsiteGitFiles(manifest.targetBaselineCommit, source.root, sourceCallsites),
      targetFiles: readCallsiteGitFiles(targetCommit, target.root, targetCallsites)
    });
    if (resolveCommit("HEAD", "HEAD") !== head) rebindingFail("execution HEAD drifted during observation");
    assertCleanWorktree();
    return { proof: { ...proof, sourceTreeDigest, targetTreeDigest }, targetObservedPolicy };
  } finally {
    target?.dispose();
    source.dispose();
  }
}

export function buildReaffirmedLegacyRegistry(sourceRegistry, targetCommit) {
  const next = structuredClone(sourceRegistry);
  if (!commitPattern.test(next?.targetBaselineCommit ?? "")) {
    throw new Error("Source legacy registry has no valid target baseline.");
  }
  next.targetBaselineCommit = targetCommit;
  return next;
}

export function buildReviewedLegacyCandidateByteRefresh({
  sourceRegistry,
  targetCommit,
  protectedRuntimePaths,
  targetCandidates
}) {
  const registry = buildReaffirmedLegacyRegistry(sourceRegistry, targetCommit);
  if (!Array.isArray(registry.resolutions) || registry.resolutions.length === 0) {
    throw new Error("Reviewed legacy candidate bytes require a non-empty source registry.");
  }
  if (!Array.isArray(protectedRuntimePaths) || !Array.isArray(targetCandidates)) {
    throw new Error("Reviewed legacy candidate bytes require exact runtime paths and target candidates.");
  }
  const protectedSet = new Set(protectedRuntimePaths);
  const targetByPath = new Map();
  for (const target of targetCandidates) {
    if (!target || typeof target.path !== "string" || targetByPath.has(target.path)) {
      throw new Error("Reviewed legacy target candidates are missing or duplicated.");
    }
    targetByPath.set(target.path, target);
  }
  if (
    targetByPath.size !== registry.resolutions.length
    || registry.resolutions.some(({ candidate }) => !targetByPath.has(candidate?.path))
  ) {
    throw new Error("Reviewed legacy target candidates do not exactly match the source registry.");
  }

  const changed = [];
  for (const resolution of registry.resolutions) {
    const target = targetByPath.get(resolution.candidate.path);
    if (!/^[a-f0-9]{64}$/u.test(target.rawSha256 ?? "") || !target.profile) {
      throw new Error("Reviewed legacy target candidate evidence is malformed.");
    }
    if (target.rawSha256 === resolution.candidate.rawSha256) continue;
    if (resolution.decision !== "de-reached") {
      throw new Error("Reviewed legacy candidate byte changes are restricted to de-reached candidates.");
    }
    if (!protectedSet.has(resolution.candidate.path)) {
      throw new Error("Reviewed legacy candidate byte change is absent from the protected runtime delta.");
    }
    const expectedProfile = {
      packageId: resolution.candidate.packageId,
      containerKeys: resolution.candidate.containerKeys,
      idCount: resolution.candidate.idCount,
      idSetDigest: resolution.candidate.idSetDigest
    };
    if (!jsonEqual(target.profile, expectedProfile)) {
      throw new Error("Reviewed legacy candidate semantic identity changed.");
    }
    const sourceRawSha256 = resolution.candidate.rawSha256;
    resolution.candidate.rawSha256 = target.rawSha256;
    changed.push({
      path: resolution.candidate.path,
      packageId: resolution.candidate.packageId,
      decision: resolution.decision,
      sourceRawSha256,
      targetRawSha256: target.rawSha256,
      semanticIdentityUnchanged: true
    });
  }
  if (changed.length === 0) {
    throw new Error("Reviewed legacy candidate byte refresh found no changed candidate bytes.");
  }
  changed.sort((left, right) => left.path < right.path ? -1 : left.path > right.path ? 1 : 0);
  const changedPaths = changed.map(({ path: candidatePath }) => candidatePath);
  return {
    registry,
    proof: {
      schemaVersion: "promotion-legacy-candidate-byte-reaffirmation.v1",
      targetBaselineCommit: targetCommit,
      changedCandidateCount: changed.length,
      changedPaths,
      changedPathsDigest: jsonDigest(changedPaths),
      candidates: changed,
      allChangedCandidatesDeReached: true,
      semanticIdentityUnchanged: true,
      liveAllowed: false
    }
  };
}

function collectReviewedLegacyCandidateByteRefresh(sourceRegistry, targetCommit, protectedDiff) {
  const targetCandidates = sourceRegistry.resolutions.map((resolution) => {
    const bytes = gitBlob(targetCommit, resolution.candidate.path);
    let value;
    try {
      value = JSON.parse(bytes.toString("utf8"));
    } catch {
      throw new Error("Reviewed legacy target candidate is not valid JSON.");
    }
    const profile = inspectLegacyCandidateDocument(value).contentProfile;
    if (!profile) {
      throw new Error("Reviewed legacy target candidate has no stable semantic profile.");
    }
    return {
      path: resolution.candidate.path,
      rawSha256: sha256(bytes),
      profile: {
        packageId: profile.packageId,
        containerKeys: profile.containerKeys,
        idCount: profile.idCount,
        idSetDigest: profile.idSetDigest
      }
    };
  });
  return buildReviewedLegacyCandidateByteRefresh({
    sourceRegistry,
    targetCommit,
    protectedRuntimePaths: protectedDiff.runtimePaths,
    targetCandidates
  });
}

export function buildReaffirmedEvidence(sourceEvidence, context) {
  const next = structuredClone(sourceEvidence);
  const sourceTarget = sourceEvidence.targetBaselineCommit;
  if (!commitPattern.test(sourceTarget ?? "") || !next?.semanticPayload || typeof next.semanticPayload !== "object") {
    throw new Error("Source evidence has no valid target baseline or semantic payload.");
  }
  next.evidenceId = `${sourceEvidence.evidenceId}-${context.revisionId}`;
  next.producedAt = context.producedAt;
  next.targetBaselineCommit = context.targetCommit;
  if (Object.hasOwn(next.semanticPayload, "targetBaselineCommit")) {
    next.semanticPayload.targetBaselineCommit = context.targetCommit;
  }
  if (Object.hasOwn(next.semanticPayload, "legacyResolutionRegistryPath")) {
    next.semanticPayload.legacyResolutionRegistryPath = context.legacyRegistryPath;
  }
  if (Object.hasOwn(next.semanticPayload, "legacyResolutionRegistryRawSha256")) {
    next.semanticPayload.legacyResolutionRegistryRawSha256 = context.legacyRegistryRawSha256;
  }
  const baselineReaffirmation = {
    schemaVersion: "promotion-baseline-reaffirmation.v1",
    revisionId: context.revisionId,
    sourceEvidenceId: sourceEvidence.evidenceId,
    sourceEvidencePath: context.sourceEvidencePath,
    sourceEvidenceRawSha256: context.sourceEvidenceRawSha256,
    priorTargetBaselineCommit: sourceTarget,
    targetBaselineCommit: context.targetCommit,
    justificationPath: context.justificationPath,
    protectedChangedPaths: context.protectedDiff.changedPaths,
    testOnlyChangedPaths: context.protectedDiff.testOnlyPaths,
    runtimeChangedPaths: context.protectedDiff.runtimePaths,
    candidateBytesChanged: false,
    legacyCandidateBytesChanged: Boolean(context.legacyCandidateByteReaffirmation),
    liveAllowed: false
  };
  if (context.runtimePolicyReaffirmation) {
    baselineReaffirmation.runtimePolicyReaffirmation = context.runtimePolicyReaffirmation;
  }
  if (context.legacyCandidateByteReaffirmation) {
    baselineReaffirmation.legacyCandidateByteReaffirmation = context.legacyCandidateByteReaffirmation;
  }
  next.semanticPayload.baselineReaffirmation = baselineReaffirmation;
  return next;
}

async function planRevision(manifestFile, targetCommit, revisionRoot, options) {
  const manifest = manifestFile.value;
  if (manifest.targetBaselineCommit === targetCommit) {
    throw new Error("The source Manifest already names the requested target; create no redundant revision.");
  }
  const legacySource = loadCanonicalJson(
    resolveRepositoryFile(manifest.legacyResolution.registryPath, "Source legacy registry"),
    "Source legacy registry"
  );
  if (legacySource.rawSha256 !== manifest.legacyResolution.rawSha256) {
    throw new Error("Source legacy registry bytes do not match the Source Manifest.");
  }
  const protectedDiff = collectProtectedDiff(manifest.targetBaselineCommit, targetCommit);
  const legacyCandidateRevision = options.reviewLegacyCandidateBytes
    ? collectReviewedLegacyCandidateByteRefresh(legacySource.value, targetCommit, protectedDiff)
    : null;
  const legacyValue = legacyCandidateRevision?.registry
    ?? buildReaffirmedLegacyRegistry(legacySource.value, targetCommit);
  const legacyRelative = `${revisionRoot.relative}/inputs/legacy-resolution-registry.v2.6.json`;
  const legacyBytes = Buffer.from(canonicalJson(legacyValue), "utf8");
  const legacyRawSha256 = sha256(legacyBytes);
  const runtimePolicyRevision = options.refreshRuntimePolicy
    ? await collectRuntimePolicyRefresh(manifest)
    : options.reviewRuntimePolicy
      ? await collectReviewedRuntimePolicyEvolution(manifest, targetCommit)
      : options.rebindRuntimeCallsites
        ? await collectReviewedRuntimeCallsiteRebinding(manifest, targetCommit)
        : null;

  const evidence = manifest.evidenceBindings.map((binding) => {
    const sourceFile = resolveRepositoryFile(binding.evidencePath, `${binding.role} source evidence`);
    const sourceLoaded = loadCanonicalJson(sourceFile, `${binding.role} source evidence`);
    if (sourceLoaded.rawSha256 !== binding.rawSha256) {
      throw new Error(`${binding.role} source evidence does not match its Manifest raw digest.`);
    }
    const reviewed = gitBlob(binding.reviewedCommit, sourceFile.relative);
    if (!sourceLoaded.bytes.equals(reviewed)) {
      throw new Error(`${binding.role} source evidence does not match its reviewed commit.`);
    }
    const destinationRelative = `${revisionRoot.relative}/inputs/evidence/${path.posix.basename(sourceFile.relative)}`;
    const value = options.producedAt
      ? buildReaffirmedEvidence(sourceLoaded.value, {
          revisionId: revisionRoot.revisionId,
          producedAt: options.producedAt,
          targetCommit,
          legacyRegistryPath: legacyRelative,
          legacyRegistryRawSha256: legacyRawSha256,
          justificationPath: options.justification,
          protectedDiff,
          runtimePolicyReaffirmation: runtimePolicyRevision?.proof ?? null,
          legacyCandidateByteReaffirmation: legacyCandidateRevision?.proof ?? null,
          sourceEvidencePath: sourceFile.relative,
          sourceEvidenceRawSha256: sourceLoaded.rawSha256
        })
      : null;
    return {
      binding,
      source: sourceLoaded,
      destination: assertSafeRelative(destinationRelative, `${binding.role} revision evidence`),
      value,
      bytes: value ? Buffer.from(canonicalJson(value), "utf8") : null
    };
  });

  return {
    manifestFile,
    manifest,
    targetCommit,
    revisionRoot,
    protectedDiff,
    runtimePolicyRevision,
    legacyCandidateRevision,
    legacy: {
      source: legacySource,
      destination: assertSafeRelative(legacyRelative, "Revision legacy registry"),
      value: legacyValue,
      bytes: legacyBytes,
      rawSha256: legacyRawSha256
    },
    evidence,
    evidenceIndex: assertSafeRelative(`${revisionRoot.relative}/inputs/evidence-index.v2.json`, "Revision evidence index"),
    destinationManifest: assertSafeRelative(`${revisionRoot.relative}/promotion-manifest.v2.json`, "Revision Manifest")
  };
}

function printPlan(plan) {
  process.stdout.write([
    "Promotion baseline immutable re-affirmation revision",
    `  source       : ${plan.manifestFile.relative}`,
    `  revision     : ${plan.revisionRoot.relative}`,
    `  from         : ${plan.manifest.targetBaselineCommit}`,
    `  to           : ${plan.targetCommit}`,
    `  roles        : ${requiredRoles(plan.manifest).join(", ")}`,
    `  runtime diff : ${plan.protectedDiff.runtimePaths.join(", ") || "none"}`,
    `  test diff    : ${plan.protectedDiff.testOnlyPaths.join(", ") || "none"}`,
    `  runtime policy: ${
      plan.runtimePolicyRevision?.proof.schemaVersion === "promotion-runtime-policy-reaffirmation.v1"
        ? "strict stale-fs-digest refresh"
        : plan.runtimePolicyRevision?.proof.schemaVersion === "promotion-runtime-policy-reviewed-evolution.v1"
          ? "reviewed literal-import graph evolution"
          : plan.runtimePolicyRevision?.proof.schemaVersion === "promotion-runtime-callsite-rebinding.v1"
            ? "exact source-hash/position-only callsite rebinding"
            : "retained"
    }`,
    `  legacy candidate bytes: ${
      plan.legacyCandidateRevision
        ? `reviewed ${plan.legacyCandidateRevision.proof.changedCandidateCount} de-reached change(s)`
        : "retained"
    }`,
    "",
    `Evidence phase (${plan.evidence.length + 1} new files):`,
    `  legacy ${plan.legacy.destination.relative}`,
    ...plan.evidence.map(({ binding, destination }) => `  ${binding.role.padEnd(6)} ${destination.relative}`),
    "",
    "Binding phase (2 new files, only after the evidence commit exists):",
    `  manifest       ${plan.destinationManifest.relative}`,
    `  evidence index ${plan.evidenceIndex.relative}`
  ].join("\n") + "\n");
}

function assertDestinationAbsent(destination, label) {
  if (fs.existsSync(destination.absolute)) {
    throw new Error(`${label} already exists; revisions are append-only and cannot be overwritten.`);
  }
}

function writeNewFile(destination, bytes) {
  fs.mkdirSync(path.dirname(destination.absolute), { recursive: true });
  fs.writeFileSync(destination.absolute, bytes, { flag: "wx" });
}

function writeEvidencePhase(options, plan) {
  assertCleanWorktree();
  assertProducedAt(options.producedAt);
  const roles = requiredRoles(plan.manifest);
  assertAttestations(plan.manifest, options.attestedBy);
  assertCommittedJustification(options.justification, plan.targetCommit, roles, plan.revisionRoot.relative);
  assertDestinationAbsent(plan.legacy.destination, "Revision legacy registry");
  for (const { destination } of plan.evidence) assertDestinationAbsent(destination, "Revision evidence");
  writeNewFile(plan.legacy.destination, plan.legacy.bytes);
  for (const { destination, bytes } of plan.evidence) writeNewFile(destination, bytes);
  process.stdout.write(
    `Evidence phase written (${plan.evidence.length + 1} new files). Commit only those files, then run --write-bindings with that commit.\n`
  );
}

function writeBindingPhase(options, plan) {
  assertCleanWorktree();
  const roles = requiredRoles(plan.manifest);
  assertAttestations(plan.manifest, options.attestedBy);
  assertCommittedJustification(options.justification, plan.targetCommit, roles, plan.revisionRoot.relative);
  if (!options.evidenceCommit) throw new Error("--write-bindings requires --evidence-commit.");
  const evidenceCommit = resolveCommit(options.evidenceCommit, "Evidence commit");
  assertAncestor(plan.targetCommit, evidenceCommit, "Target baseline");
  assertAncestor(evidenceCommit, resolveCommit("HEAD", "HEAD"), "Evidence commit");
  assertDestinationAbsent(plan.destinationManifest, "Revision Manifest");
  assertDestinationAbsent(plan.evidenceIndex, "Revision evidence index");

  const committedLegacy = gitBlob(evidenceCommit, plan.legacy.destination.relative);
  const workingLegacy = fs.readFileSync(plan.legacy.destination.absolute);
  if (!workingLegacy.equals(committedLegacy)) {
    throw new Error("Revision legacy registry must exactly match --evidence-commit.");
  }
  const legacyValue = JSON.parse(committedLegacy.toString("utf8"));
  if (legacyValue.targetBaselineCommit !== plan.targetCommit) {
    throw new Error("Committed revision legacy registry has the wrong target baseline.");
  }
  const legacyRawSha256 = sha256(committedLegacy);

  const refreshedBindings = plan.evidence.map(({ binding, destination }) => {
    const committed = gitBlob(evidenceCommit, destination.relative);
    const working = fs.readFileSync(destination.absolute);
    if (!working.equals(committed)) {
      throw new Error(`${binding.role} revision evidence must exactly match --evidence-commit.`);
    }
    const evidence = parsePromotionWorkflowJsonBytes(committed);
    if (options.rebindRuntimeCallsites && fingerprint(evidence.semanticPayload?.baselineReaffirmation?.runtimePolicyReaffirmation ?? null)
      !== fingerprint(plan.runtimePolicyRevision.proof)) rebindingFail("committed evidence does not bind the recomputed callsite proof");
    if (
      evidence.role !== binding.role ||
      evidence.result !== binding.expectedResult ||
      evidence.candidateDigest !== plan.manifest.candidateDigest ||
      evidence.sourceCommit !== plan.manifest.sourceCommit ||
      evidence.targetBaselineCommit !== plan.targetCommit ||
      evidence.checkerVersion !== plan.manifest.checkerVersion
    ) {
      throw new Error(`${binding.role} committed revision evidence has invalid identity or currentness.`);
    }
    if (
      (binding.role === "A23" || binding.role === "A25") &&
      (
        evidence.semanticPayload?.targetBaselineCommit !== plan.targetCommit ||
        evidence.semanticPayload?.legacyResolutionRegistryPath !== plan.legacy.destination.relative ||
        evidence.semanticPayload?.legacyResolutionRegistryRawSha256 !== legacyRawSha256
      )
    ) {
      throw new Error(`${binding.role} does not independently bind the revision registry and target baseline.`);
    }
    return {
      role: binding.role,
      evidenceId: evidence.evidenceId,
      evidencePath: destination.relative,
      rawSha256: sha256(committed),
      semanticDigest: computeV2EvidenceSemanticDigest(evidence),
      reviewedCommit: evidenceCommit,
      expectedResult: binding.expectedResult,
      currentness: {
        candidateDigest: evidence.candidateDigest,
        sourceCommit: evidence.sourceCommit,
        targetBaselineCommit: evidence.targetBaselineCommit,
        checkerVersion: evidence.checkerVersion
      }
    };
  });

  const sourceIndex = loadCanonicalJson(
    resolveRepositoryFile(plan.manifest.evidenceIndex.path, "Source evidence index"),
    "Source evidence index"
  );
  if (sourceIndex.rawSha256 !== plan.manifest.evidenceIndex.rawSha256) {
    throw new Error("Source evidence index bytes do not match the Source Manifest.");
  }
  const nextIndex = structuredClone(sourceIndex.value);
  nextIndex.targetBaselineCommit = plan.targetCommit;
  nextIndex.entries = refreshedBindings;
  const nextIndexBytes = Buffer.from(canonicalJson(nextIndex), "utf8");

  const nextManifest = structuredClone(plan.manifest);
  nextManifest.targetBaselineCommit = plan.targetCommit;
  if (plan.runtimePolicyRevision) {
    nextManifest.liveReachability.expectedRuntimePolicy = plan.runtimePolicyRevision.targetObservedPolicy;
  }
  nextManifest.legacyResolution = {
    registryPath: plan.legacy.destination.relative,
    rawSha256: legacyRawSha256
  };
  nextManifest.evidenceIndex = {
    path: plan.evidenceIndex.relative,
    rawSha256: sha256(nextIndexBytes)
  };
  nextManifest.evidenceBindings = refreshedBindings;

  writeNewFile(plan.evidenceIndex, nextIndexBytes);
  writeNewFile(plan.destinationManifest, Buffer.from(canonicalJson(nextManifest), "utf8"));
  process.stdout.write(
    `Binding phase written for evidence commit ${evidenceCommit}. Commit only the revision Manifest and evidence index, then run Promotion validation.\n`
  );
}

export async function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  if (options.help) {
    process.stdout.write(`${usage()}\n`);
    return;
  }
  if (options.rejectedMonolithicWrite) {
    throw new Error("Monolithic --write is disabled; create an append-only revision with the two committed phases.");
  }
  if ([options.refreshRuntimePolicy, options.reviewRuntimePolicy, options.rebindRuntimeCallsites].filter(Boolean).length > 1) {
    throw new Error("Runtime-policy refresh, review and callsite rebinding modes are mutually exclusive.");
  }
  if (options.rebindRuntimeCallsites && options.reviewLegacyCandidateBytes) {
    throw new Error("Callsite rebinding cannot combine with candidate-byte revision.");
  }
  if (
    !options.manifest ||
    !options.target ||
    !options.revisionRoot ||
    (options.writeEvidence && options.writeBindings)
  ) {
    process.stderr.write(`${usage()}\n`);
    process.exitCode = 2;
    return;
  }
  if (options.rebindRuntimeCallsites && git(["rev-parse", "--is-shallow-repository"]).trim() !== "false") {
    throw new Error("REBINDING_FULL_HISTORY_REQUIRED: shallow history cannot prove baseline ancestry.");
  }
  const manifestFile = loadManifest(options.manifest);
  const targetCommit = resolveCommit(options.target, "Target baseline");
  assertAncestor(targetCommit, resolveCommit("HEAD", "HEAD"), "Target baseline");
  const revisionRoot = resolveRevisionRoot(manifestFile.relative, options.revisionRoot);
  if (options.writeEvidence) assertProducedAt(options.producedAt);
  if (options.refreshRuntimePolicy || options.reviewRuntimePolicy || options.rebindRuntimeCallsites) assertCleanWorktree();
  const plan = await planRevision(manifestFile, targetCommit, revisionRoot, options);
  printPlan(plan);
  if (options.writeEvidence) writeEvidencePhase(options, plan);
  else if (options.writeBindings) writeBindingPhase(options, plan);
  else process.stdout.write("\nDRY RUN — no files written.\n");
}

if (process.argv[1] && path.resolve(process.argv[1]) === scriptPath) await main();
