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

import {
  inspectLegacyCandidateDocument,
  observeCanonicalRuntimePolicy
} from "../coordination/integration/promotion-gate-lib.mjs";
import {
  computeV2EvidenceSemanticDigest,
  projectV2RuntimePolicy
} from "../coordination/integration/v2/promotion-gate-v2-lib.mjs";

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
    "  rebase-promotion-baseline.mjs --manifest <source> --target <commit> --revision-root <new-path> --write-evidence --produced-at <ISO> --attested-by <roles> --justification <committed-path> [--refresh-runtime-policy|--review-runtime-policy] [--review-legacy-candidate-bytes]",
    "  rebase-promotion-baseline.mjs --manifest <source> --target <commit> --revision-root <new-path> --write-bindings --evidence-commit <commit> --produced-at <same-ISO> --attested-by <roles> --justification <committed-path> [--refresh-runtime-policy|--review-runtime-policy] [--review-legacy-candidate-bytes]"
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
    else if (argument === "--review-legacy-candidate-bytes") options.reviewLegacyCandidateBytes = true;
    else if (argument === "--write") options.rejectedMonolithicWrite = true;
    else if (argument === "--help" || argument === "-h") options.help = true;
    else throw new Error(`Unknown argument: ${argument}`);
  }
  return options;
}

function git(args, encoding = "utf8") {
  return execFileSync("git", args, {
    cwd: repoRoot,
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

function assertExactCommitChangedPaths(commit, expectedPaths, label) {
  const parentLine = git(["rev-list", "--parents", "-n", "1", commit]).trim().split(/\s+/u);
  if (parentLine.length !== 2) throw new Error(`${label} must be one single-parent commit.`);
  const output = git(["diff-tree", "--no-commit-id", "--name-only", "-r", "-z", commit], null);
  const actual = output.toString("utf8").split("\0").filter(Boolean).sort(codePointCompare);
  const expected = [...expectedPaths].sort(codePointCompare);
  if (!jsonEqual(actual, expected)) {
    throw new Error(`${label} changed files outside the exact reviewed artifact set.`);
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

function codePointCompare(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function exactObjectKeys(value, keys, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be one object.`);
  }
  if (!jsonEqual(Object.keys(value).sort(), [...keys].sort())) {
    throw new Error(`${label} has an unexpected field set.`);
  }
}

function collectionArray(value, label) {
  if (Array.isArray(value)) return value;
  if (value instanceof Set) return [...value];
  throw new Error(`${label} must be one array or Set.`);
}

function sortedCanonicalMultiset(values, label) {
  return collectionArray(values, label)
    .map((value) => structuredClone(value))
    .sort((left, right) => codePointCompare(JSON.stringify(left), JSON.stringify(right)));
}

function canonicalMultisetDelta(sourceValues, targetValues, label) {
  const source = sortedCanonicalMultiset(sourceValues, `${label} source`);
  const target = sortedCanonicalMultiset(targetValues, `${label} target`);
  const sourceCounts = new Map();
  const targetCounts = new Map();
  for (const value of source) {
    const key = JSON.stringify(value);
    sourceCounts.set(key, (sourceCounts.get(key) ?? 0) + 1);
  }
  for (const value of target) {
    const key = JSON.stringify(value);
    targetCounts.set(key, (targetCounts.get(key) ?? 0) + 1);
  }
  const removed = [];
  const added = [];
  for (const key of [...new Set([...sourceCounts.keys(), ...targetCounts.keys()])].sort(codePointCompare)) {
    const sourceCount = sourceCounts.get(key) ?? 0;
    const targetCount = targetCounts.get(key) ?? 0;
    for (let index = targetCount; index < sourceCount; index += 1) removed.push(JSON.parse(key));
    for (let index = sourceCount; index < targetCount; index += 1) added.push(JSON.parse(key));
  }
  return { source, target, removed, added };
}

function assertExactMultiset(sourceValues, targetValues, label) {
  const delta = canonicalMultisetDelta(sourceValues, targetValues, label);
  if (delta.removed.length > 0 || delta.added.length > 0) {
    throw new Error(`Reviewed runtime-policy evolution changed the exact ${label} multiset.`);
  }
  return {
    count: delta.source.length,
    sourceDigest: jsonDigest(delta.source),
    targetDigest: jsonDigest(delta.target),
    equal: true
  };
}

const fsReadRawKeys = [
  "sourcePath",
  "sourceRawSha256",
  "callee",
  "position",
  "argumentShape",
  "normalizedExpressionDigest",
  "policy"
];
const fsReadNormalizedKeys = [
  "sourcePath",
  "callee",
  "argumentShape",
  "normalizedExpressionDigest",
  "policy"
];
const nextDynamicRawKeys = [
  "sourcePath",
  "sourceRawSha256",
  "position",
  "literalImports",
  "nonliteralImportCount",
  "normalizedExpressionDigest"
];
const nextDynamicNormalizedKeys = [
  "sourcePath",
  "literalImports",
  "nonliteralImportCount",
  "normalizedExpressionDigest"
];

function normalizeExactEntry(entry, rawKeys, normalizedKeys, label) {
  exactObjectKeys(entry, rawKeys, label);
  return Object.fromEntries(normalizedKeys.map((key) => [key, structuredClone(entry[key])]));
}

function pairRawOnlyTransitions(sourceEntries, targetEntries, rawKeys, normalizedKeys, label) {
  const source = collectionArray(sourceEntries, `${label} source`).map((entry, index) => ({
    raw: structuredClone(entry),
    normalized: normalizeExactEntry(entry, rawKeys, normalizedKeys, `${label} source[${index}]`)
  }));
  const target = collectionArray(targetEntries, `${label} target`).map((entry, index) => ({
    raw: structuredClone(entry),
    normalized: normalizeExactEntry(entry, rawKeys, normalizedKeys, `${label} target[${index}]`)
  }));
  assertExactMultiset(
    source.map(({ normalized }) => normalized),
    target.map(({ normalized }) => normalized),
    `${label} normalized entries`
  );
  const group = (entries) => {
    const groups = new Map();
    for (const entry of entries) {
      const key = JSON.stringify(entry.normalized);
      const values = groups.get(key) ?? [];
      values.push(entry.raw);
      groups.set(key, values);
    }
    for (const values of groups.values()) {
      values.sort((left, right) => codePointCompare(JSON.stringify(left), JSON.stringify(right)));
    }
    return groups;
  };
  const sourceGroups = group(source);
  const targetGroups = group(target);
  const transitions = [];
  for (const key of [...sourceGroups.keys()].sort(codePointCompare)) {
    const sourceGroup = sourceGroups.get(key);
    const targetGroup = targetGroups.get(key);
    if (!targetGroup || sourceGroup.length !== targetGroup.length) {
      throw new Error(`Reviewed runtime-policy evolution changed ${label} multiplicity.`);
    }
    for (let index = 0; index < sourceGroup.length; index += 1) {
      if (jsonEqual(sourceGroup[index], targetGroup[index])) continue;
      transitions.push({
        normalized: JSON.parse(key),
        source: sourceGroup[index],
        target: targetGroup[index]
      });
    }
  }
  const sourceRaw = sortedCanonicalMultiset(source.map(({ raw }) => raw), `${label} source raw entries`);
  const targetRaw = sortedCanonicalMultiset(target.map(({ raw }) => raw), `${label} target raw entries`);
  return {
    count: source.length,
    normalizedDigest: jsonDigest(sortedCanonicalMultiset(
      source.map(({ normalized }) => normalized),
      `${label} normalized entries`
    )),
    sourceRawDigest: jsonDigest(sourceRaw),
    targetRawDigest: jsonDigest(targetRaw),
    transitions: transitions.sort((left, right) =>
      codePointCompare(JSON.stringify(left), JSON.stringify(right))
    ),
    normalizedEqual: true
  };
}

function normalizeReviewedDiff(entries) {
  const normalized = collectionArray(entries, "reviewed protected diff").map((entry, index) => {
    exactObjectKeys(entry, ["path", "status"], `reviewed protected diff[${index}]`);
    if (entry.status !== "M" || typeof entry.path !== "string" || entry.path.length === 0) {
      throw new Error("Reviewed runtime-policy evolution accepts only exact modified-path entries.");
    }
    return { path: entry.path, status: entry.status };
  }).sort((left, right) => codePointCompare(left.path, right.path));
  if (new Set(normalized.map(({ path: reviewedPath }) => reviewedPath)).size !== normalized.length) {
    throw new Error("Reviewed runtime-policy evolution protected paths are duplicated.");
  }
  return normalized;
}

function normalizeCandidateArtifactBindings(bindings) {
  return collectionArray(bindings, "candidate artifact bindings").map((binding, index) => {
    exactObjectKeys(
      binding,
      ["path", "sourceRawSha256", "targetRawSha256", "unchanged"],
      `candidate artifact bindings[${index}]`
    );
    if (
      typeof binding.path !== "string"
      || !/^[a-f0-9]{64}$/u.test(binding.sourceRawSha256)
      || !/^[a-f0-9]{64}$/u.test(binding.targetRawSha256)
      || binding.unchanged !== true
      || binding.sourceRawSha256 !== binding.targetRawSha256
    ) {
      throw new Error("Reviewed runtime-policy evolution requires byte-identical candidate artifacts.");
    }
    return structuredClone(binding);
  }).sort((left, right) => codePointCompare(left.path, right.path));
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
  sourceObservation,
  targetObservation,
  reviewedRuntimeDiff,
  sourceBaselineCommit,
  targetBaselineCommit,
  reviewAttestation,
  reviewAttestationRawSha256,
  candidateArtifactBindings,
  rawBindingsVerified
}) {
  exactObjectKeys(sourceExpectedPolicy, Object.keys(sourceExpectedPolicy ?? {}), "source expected runtime policy");
  for (const [observation, label] of [
    [sourceObservation, "source runtime observation"],
    [targetObservation, "target runtime observation"]
  ]) {
    if (
      !observation
      || typeof observation !== "object"
      || !observation.rawObservation
      || !observation.graph
      || !observation.graphPolicy
      || !observation.loaderPolicy
      || !observation.graph.loaderInventory
    ) {
      throw new Error(`${label} is incomplete.`);
    }
  }
  if (
    !commitPattern.test(sourceBaselineCommit ?? "")
    || !commitPattern.test(targetBaselineCommit ?? "")
    || sourceBaselineCommit === targetBaselineCommit
  ) {
    throw new Error("Reviewed runtime-policy evolution requires distinct exact source and target commits.");
  }
  if (!/^[a-f0-9]{64}$/u.test(reviewAttestationRawSha256 ?? "")) {
    throw new Error("Reviewed runtime-policy evolution requires the exact review-attestation digest.");
  }
  if (rawBindingsVerified !== true) {
    throw new Error("Reviewed runtime-policy evolution requires verified raw commit bindings.");
  }

  const sourceObservedPolicy = projectV2RuntimePolicy(sourceObservation);
  const targetObservedPolicy = projectV2RuntimePolicy(targetObservation);
  const expectedKeys = Object.keys(sourceExpectedPolicy).sort();
  const sourceKeys = Object.keys(sourceObservedPolicy).sort();
  const targetKeys = Object.keys(targetObservedPolicy).sort();
  if (!jsonEqual(expectedKeys, sourceKeys) || !jsonEqual(sourceKeys, targetKeys)) {
    throw new Error("Reviewed runtime-policy evolution cannot change the policy schema.");
  }
  if (!jsonEqual(sourceExpectedPolicy, sourceObservedPolicy)) {
    throw new Error("Reviewed runtime-policy evolution source expected policy differs from its exact observed baseline.");
  }

  const reviewedPaths = normalizeReviewedDiff(reviewedRuntimeDiff);
  const reviewedRuntimePaths = new Set(
    reviewedPaths.filter(({ path: reviewedPath }) => !isTestOnlyPath(reviewedPath)).map(({ path: reviewedPath }) => reviewedPath)
  );
  const candidateBindings = normalizeCandidateArtifactBindings(candidateArtifactBindings);
  const inventoryProof = {
    actualFiles: assertExactMultiset(sourceObservation.actualFiles, targetObservation.actualFiles, "actual files"),
    classifications: assertExactMultiset(
      sourceObservation.classifications,
      targetObservation.classifications,
      "runtime classifications"
    ),
    frameworkEntrypoints: assertExactMultiset(
      sourceObservation.frameworkEntrypoints,
      targetObservation.frameworkEntrypoints,
      "framework entrypoints"
    ),
    runtimeSeeds: assertExactMultiset(
      sourceObservation.graph.runtimeSeeds,
      targetObservation.graph.runtimeSeeds,
      "runtime seeds"
    ),
    reachablePaths: assertExactMultiset(
      sourceObservation.graph.reachablePaths,
      targetObservation.graph.reachablePaths,
      "reachable paths"
    ),
    specialFiles: assertExactMultiset(
      sourceObservation.specialFiles,
      targetObservation.specialFiles,
      "runtime special files"
    ),
    sensitiveAnchors: assertExactMultiset(
      sourceObservation.sensitiveAnchors,
      targetObservation.sensitiveAnchors,
      "runtime sensitive anchors"
    )
  };
  for (const [sourceValue, targetValue, label] of [
    [sourceObservation.resolverPolicy, targetObservation.resolverPolicy, "resolver policy"],
    [sourceObservation.frameworkBoundary, targetObservation.frameworkBoundary, "framework boundary"]
  ]) {
    if (!jsonEqual(sourceValue, targetValue)) {
      throw new Error(`Reviewed runtime-policy evolution changed the exact ${label}.`);
    }
  }

  const fsReadProof = pairRawOnlyTransitions(
    sourceObservation.loaderPolicy.fsReadAllowlist,
    targetObservation.loaderPolicy.fsReadAllowlist,
    fsReadRawKeys,
    fsReadNormalizedKeys,
    "fs-read allowlist"
  );
  const nextDynamicProof = pairRawOnlyTransitions(
    sourceObservation.graph.loaderInventory.nextDynamicCalls,
    targetObservation.graph.loaderInventory.nextDynamicCalls,
    nextDynamicRawKeys,
    nextDynamicNormalizedKeys,
    "next/dynamic callsites"
  );
  const importMetaProof = assertExactMultiset(
    sourceObservation.loaderPolicy.importMetaUrlReferences,
    targetObservation.loaderPolicy.importMetaUrlReferences,
    "import.meta.url references"
  );
  if (
    sourceObservedPolicy.nextDynamicNonliteralImportCount !== 0
    || targetObservedPolicy.nextDynamicNonliteralImportCount !== 0
    || sourceObservation.graph.loaderInventory.nextDynamicCalls.some(({ nonliteralImportCount }) => nonliteralImportCount !== 0)
    || targetObservation.graph.loaderInventory.nextDynamicCalls.some(({ nonliteralImportCount }) => nonliteralImportCount !== 0)
  ) {
    throw new Error("Reviewed runtime-policy evolution cannot introduce nonliteral dynamic imports.");
  }
  if (
    sourceObservedPolicy.zeroBaselineCallCount !== 0
    || targetObservedPolicy.zeroBaselineCallCount !== 0
    || sourceObservation.graph.loaderInventory.zeroBaselineCalls.length !== 0
    || targetObservation.graph.loaderInventory.zeroBaselineCalls.length !== 0
  ) {
    throw new Error("Reviewed runtime-policy evolution cannot introduce zero-baseline loader calls.");
  }
  for (const [sourceValues, targetValues, label] of [
    [sourceObservation.graph.detachedEdges, targetObservation.graph.detachedEdges, "detached edges"],
    [sourceObservation.graph.unresolvedCalls, targetObservation.graph.unresolvedCalls, "unresolved calls"]
  ]) {
    if (collectionArray(sourceValues, `${label} source`).length !== 0 || collectionArray(targetValues, `${label} target`).length !== 0) {
      throw new Error(`Reviewed runtime-policy evolution cannot retain or introduce ${label}.`);
    }
  }

  const edgeDelta = canonicalMultisetDelta(
    sourceObservation.graph.edges,
    targetObservation.graph.edges,
    "runtime graph edges"
  );
  if (edgeDelta.removed.length > 0 || edgeDelta.added.length === 0) {
    throw new Error("Reviewed runtime-policy evolution requires additive-only exact static graph edges.");
  }
  const sourceReachablePaths = new Set(collectionArray(sourceObservation.graph.reachablePaths, "source reachable paths"));
  for (const [index, edge] of edgeDelta.added.entries()) {
    exactObjectKeys(edge, ["from", "specifier", "to", "kind", "typeOnly"], `added runtime edge[${index}]`);
    if (
      edge.kind !== "import"
      || edge.typeOnly !== false
      || !reviewedRuntimePaths.has(edge.from)
      || !sourceReachablePaths.has(edge.to)
    ) {
      throw new Error("Reviewed runtime-policy evolution added an unreviewed or capability-expanding static edge.");
    }
  }
  const topologyDelta = canonicalMultisetDelta(
    sourceObservation.graph.topologyEdges,
    targetObservation.graph.topologyEdges,
    "runtime topology edges"
  );
  if (topologyDelta.removed.length > 0) {
    throw new Error("Reviewed runtime-policy evolution cannot remove topology edges.");
  }
  const sourceTopologyKeys = new Set(
    collectionArray(sourceObservation.graph.topologyEdges, "source topology edges")
      .map((edge) => JSON.stringify(edge))
  );
  const expectedAddedTopology = [...new Map(edgeDelta.added.map(({ from, to }) => {
    const projected = { from, to };
    return [JSON.stringify(projected), projected];
  })).values()]
    .filter((edge) => !sourceTopologyKeys.has(JSON.stringify(edge)))
    .sort((left, right) => codePointCompare(JSON.stringify(left), JSON.stringify(right)));
  if (!jsonEqual(topologyDelta.added, expectedAddedTopology)) {
    throw new Error("Reviewed runtime-policy evolution topology delta does not match the exact edge projection.");
  }

  for (const transition of [...fsReadProof.transitions, ...nextDynamicProof.transitions]) {
    if (!reviewedRuntimePaths.has(transition.normalized.sourcePath)) {
      throw new Error("Reviewed runtime-policy evolution has a raw loader transition outside reviewed runtime paths.");
    }
  }

  const changedFields = expectedKeys.filter(
    (field) => !jsonEqual(sourceObservedPolicy[field], targetObservedPolicy[field])
  );
  const expectedChangedFields = ["edgeCount", "edgeDigest"];
  if (topologyDelta.added.length > 0) expectedChangedFields.push("topologyEdgeCount", "topologyEdgeDigest");
  if (fsReadProof.sourceRawDigest !== fsReadProof.targetRawDigest) {
    expectedChangedFields.push("fsReadAllowlistDigest");
  }
  if (nextDynamicProof.sourceRawDigest !== nextDynamicProof.targetRawDigest) {
    expectedChangedFields.push("nextDynamicCallsiteDigest");
  }
  expectedChangedFields.sort();
  if (!jsonEqual(changedFields, expectedChangedFields)) {
    throw new Error("Reviewed runtime-policy evolution changed an unreviewable runtime-policy field.");
  }

  const expectedAttestation = {
    schemaVersion: "promotion-runtime-policy-review-attestation.v1",
    sourceBaselineCommit,
    targetBaselineCommit,
    reviewedPaths,
    changedPolicyFields: changedFields,
    addedEdges: edgeDelta.added,
    removedEdges: [],
    addedTopologyEdges: topologyDelta.added,
    removedTopologyEdges: [],
    fsRawTransitions: fsReadProof.transitions,
    nextDynamicRawTransitions: nextDynamicProof.transitions,
    candidateArtifactBindings: candidateBindings,
    candidateBytesChanged: false,
    liveAllowed: false
  };
  if (!jsonEqual(reviewAttestation, expectedAttestation)) {
    throw new Error("Reviewed runtime-policy evolution does not exactly match the committed review attestation.");
  }

  return {
    schemaVersion: "promotion-runtime-policy-reviewed-evolution.v2",
    sourceBaselineCommit,
    targetBaselineCommit,
    reviewedPaths,
    reviewedPathsDigest: jsonDigest(reviewedPaths),
    changedFields,
    sourceExpectedPolicyDigest: jsonDigest(sourceExpectedPolicy),
    sourceObservedPolicyDigest: jsonDigest(sourceObservedPolicy),
    targetObservedPolicyDigest: jsonDigest(targetObservedPolicy),
    inventoryProof,
    graphProof: {
      sourceEdgeDigest: jsonDigest(edgeDelta.source),
      targetEdgeDigest: jsonDigest(edgeDelta.target),
      addedEdges: edgeDelta.added,
      removedEdges: [],
      sourceTopologyDigest: jsonDigest(topologyDelta.source),
      targetTopologyDigest: jsonDigest(topologyDelta.target),
      addedTopologyEdges: topologyDelta.added,
      removedTopologyEdges: []
    },
    loaderProof: {
      fsRead: fsReadProof,
      nextDynamic: nextDynamicProof,
      importMetaUrlReferences: importMetaProof
    },
    candidateArtifactBindings: candidateBindings,
    candidateBytesChanged: false,
    rawBindingsVerified: true,
    reviewAttestationRawSha256,
    nextDynamicNonliteralImportCount: 0,
    zeroBaselineCallCount: 0,
    liveAllowed: false
  };
}

function loadCanonicalJson(file, label) {
  const bytes = fs.readFileSync(file.absolute);
  let value;
  try {
    value = JSON.parse(bytes.toString("utf8"));
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

function loadCommittedRepositoryFile(input, label, commitish = "HEAD") {
  const file = resolveRepositoryFile(input, label);
  let committed;
  try {
    committed = gitBlob(commitish, file.relative);
  } catch {
    throw new Error(`${label} must already be committed at the required binding commit.`);
  }
  const working = fs.readFileSync(file.absolute);
  if (!working.equals(committed)) throw new Error(`${label} bytes differ from the required binding commit.`);
  return { ...file, bytes: committed, rawSha256: sha256(committed) };
}

function loadReviewJustification(
  justificationInput,
  commitish,
  { sourceBaselineCommit, targetCommit, roles, revisionRoot }
) {
  const loaded = loadCommittedRepositoryFile(justificationInput, "Runtime-policy review justification", commitish);
  let value;
  try {
    value = JSON.parse(loaded.bytes.toString("utf8"));
  } catch {
    throw new Error("Runtime-policy review justification must be canonical JSON.");
  }
  if (!loaded.bytes.equals(Buffer.from(canonicalJson(value), "utf8"))) {
    throw new Error("Runtime-policy review justification must use canonical JSON bytes.");
  }
  exactObjectKeys(
    value,
    [
      "schemaVersion",
      "sourceBaselineCommit",
      "targetBaselineCommit",
      "revisionRoot",
      "roles",
      "runtimePolicyReview",
      "liveAllowed"
    ],
    "runtime-policy review justification"
  );
  if (
    value.schemaVersion !== "promotion-baseline-review-justification.v1"
    || value.sourceBaselineCommit !== sourceBaselineCommit
    || value.targetBaselineCommit !== targetCommit
    || value.revisionRoot !== revisionRoot
    || !Array.isArray(value.roles)
    || !jsonEqual([...value.roles].sort(), [...roles].sort())
    || value.liveAllowed !== false
  ) {
    throw new Error("Runtime-policy review justification does not bind the exact source, target, revision, roles, and non-live boundary.");
  }
  return { ...loaded, value };
}

function assertCommittedJustification(
  justificationInput,
  targetCommit,
  roles,
  revisionRoot,
  { commitish = "HEAD", expectedRawSha256 = null } = {}
) {
  if (expectedRawSha256) {
    const loaded = loadCommittedRepositoryFile(justificationInput, "Runtime-policy review justification", commitish);
    if (loaded.rawSha256 !== expectedRawSha256) {
      throw new Error("Runtime-policy review justification bytes differ from the reviewed plan.");
    }
    return loaded;
  }
  const file = resolveRepositoryFile(justificationInput, "Justification");
  let committed;
  try {
    committed = gitBlob(commitish, file.relative);
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
    throw new Error("Every write phase requires one explicit ISO --produced-at value.");
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
  const output = git([
    "diff",
    "--name-status",
    "--no-renames",
    "-z",
    `${fromCommit}..${toCommit}`,
    "--",
    ...protectedPaths
  ], null);
  const tokens = output.toString("utf8").split("\0");
  if (tokens.at(-1) === "") tokens.pop();
  if (tokens.length % 2 !== 0) throw new Error("Protected diff did not produce exact status/path pairs.");
  const entries = [];
  for (let index = 0; index < tokens.length; index += 2) {
    entries.push({ status: tokens[index], path: tokens[index + 1] });
  }
  entries.sort((left, right) => codePointCompare(left.path, right.path));
  const changedPaths = entries.map(({ path: changedPath }) => changedPath);
  return {
    entries,
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
  if (!entry.isFile() || entry.isSymbolicLink()) {
    throw new Error(`${label} must be one regular projected repository file.`);
  }
  const bytes = fs.readFileSync(absolute);
  let value;
  try {
    value = JSON.parse(bytes.toString("utf8"));
  } catch {
    throw new Error(`${label} is not valid JSON.`);
  }
  return { absolute, bytes, value, rawSha256: sha256(bytes) };
}

function rawFileSha256AtRoot(root, relativePath, label) {
  assertSafeRelative(relativePath, label);
  const absolute = path.resolve(root, relativePath);
  if (!absolute.startsWith(`${root}${path.sep}`)) throw new Error(`${label} escapes its projected repository root.`);
  const entry = fs.lstatSync(absolute);
  if (!entry.isFile() || entry.isSymbolicLink()) {
    throw new Error(`${label} must be one regular projected repository file.`);
  }
  return sha256(fs.readFileSync(absolute));
}

function assertObservationRawBindings(root, observation, label) {
  const cache = new Map();
  const verify = (relativePath, expectedRawSha256, entryLabel) => {
    if (typeof relativePath !== "string" || !/^[a-f0-9]{64}$/u.test(expectedRawSha256 ?? "")) {
      throw new Error(`${entryLabel} has an invalid raw source binding.`);
    }
    let actual = cache.get(relativePath);
    if (!actual) {
      actual = rawFileSha256AtRoot(root, relativePath, `${entryLabel} source path`);
      cache.set(relativePath, actual);
    }
    if (actual !== expectedRawSha256) {
      throw new Error(`${entryLabel} raw source digest does not match its exact commit tree.`);
    }
  };
  for (const [entries, entryLabel, pathField, digestField] of [
    [observation.loaderPolicy.fsReadAllowlist, "fs-read allowlist", "sourcePath", "sourceRawSha256"],
    [observation.graph.loaderInventory.nextDynamicCalls, "next/dynamic callsite", "sourcePath", "sourceRawSha256"],
    [observation.loaderPolicy.importMetaUrlReferences, "import.meta.url reference", "sourcePath", "sourceRawSha256"],
    [observation.specialFiles, "runtime special file", "path", "rawSha256"],
    [observation.sensitiveAnchors, "runtime sensitive anchor", "path", "rawSha256"]
  ]) {
    for (const [index, entry] of collectionArray(entries, `${label} ${entryLabel}`).entries()) {
      verify(entry[pathField], entry[digestField], `${label} ${entryLabel}[${index}]`);
    }
  }
  return true;
}

function collectCandidateArtifactBindings(manifest, sourceBaselineCommit, targetCommit) {
  if (!Array.isArray(manifest.candidateArtifacts) || manifest.candidateArtifacts.length === 0) {
    throw new Error("Source Manifest has no candidate artifact bindings.");
  }
  return manifest.candidateArtifacts.map((artifact, index) => {
    if (typeof artifact?.path !== "string" || !/^[a-f0-9]{64}$/u.test(artifact.rawFileSha256 ?? "")) {
      throw new Error(`Candidate artifact[${index}] has an invalid path or raw digest.`);
    }
    assertSafeRelative(artifact.path, `candidate artifact[${index}] path`);
    let sourceBytes;
    let targetBytes;
    try {
      sourceBytes = gitBlob(sourceBaselineCommit, artifact.path);
      targetBytes = gitBlob(targetCommit, artifact.path);
    } catch {
      throw new Error(`Candidate artifact[${index}] is absent from an exact reviewed commit.`);
    }
    const sourceRawSha256 = sha256(sourceBytes);
    const targetRawSha256 = sha256(targetBytes);
    if (sourceRawSha256 !== artifact.rawFileSha256) {
      throw new Error(`Candidate artifact[${index}] source bytes differ from the Source Manifest.`);
    }
    if (sourceRawSha256 !== targetRawSha256) {
      throw new Error("Reviewed runtime-policy evolution cannot change candidate artifact bytes.");
    }
    return {
      path: artifact.path,
      sourceRawSha256,
      targetRawSha256,
      unchanged: true
    };
  }).sort((left, right) => codePointCompare(left.path, right.path));
}

function materializeCommitTree(commit) {
  const ownerRoot = fs.mkdtempSync(path.join(os.tmpdir(), "mais-promotion-runtime-policy-"));
  const treeRoot = path.join(ownerRoot, "tree");
  const archivePath = path.join(ownerRoot, "source.tar");
  fs.mkdirSync(treeRoot, { mode: 0o700 });
  try {
    execFileSync("git", ["archive", "--format=tar", `--output=${archivePath}`, commit], {
      cwd: repoRoot,
      encoding: "utf8",
      maxBuffer: 16 * 1024 * 1024,
      stdio: ["ignore", "pipe", "pipe"]
    });
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

async function collectReviewedRuntimePolicyEvolution(
  manifest,
  targetCommit,
  protectedDiff,
  reviewJustification
) {
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
    const targetObservedPolicy = projectV2RuntimePolicy(targetObservation);
    const sourceRawBindingsVerified = assertObservationRawBindings(
      sourceProjection.root,
      sourceObservation,
      "source runtime observation"
    );
    const targetRawBindingsVerified = assertObservationRawBindings(
      targetProjection.root,
      targetObservation,
      "target runtime observation"
    );
    const candidateArtifactBindings = collectCandidateArtifactBindings(
      manifest,
      manifest.targetBaselineCommit,
      targetCommit
    );
    const proof = buildReviewedRuntimePolicyEvolution({
      sourceExpectedPolicy: manifest.liveReachability.expectedRuntimePolicy,
      sourceObservation,
      targetObservation,
      reviewedRuntimeDiff: protectedDiff.entries,
      sourceBaselineCommit: manifest.targetBaselineCommit,
      targetBaselineCommit: targetCommit,
      reviewAttestation: reviewJustification.value.runtimePolicyReview,
      reviewAttestationRawSha256: reviewJustification.rawSha256,
      candidateArtifactBindings,
      rawBindingsVerified: sourceRawBindingsVerified && targetRawBindingsVerified
    });
    return { proof, targetObservedPolicy };
  } finally {
    targetProjection?.dispose();
    sourceProjection.dispose();
  }
}

function escapeJsonPointerSegment(segment) {
  return String(segment).replaceAll("~", "~0").replaceAll("/", "~1");
}

export function jsonPointerDifferences(source, target, pointer = "") {
  if (jsonEqual(source, target)) return [];
  const sourceIsObject = source !== null && typeof source === "object";
  const targetIsObject = target !== null && typeof target === "object";
  if (!sourceIsObject || !targetIsObject || Array.isArray(source) !== Array.isArray(target)) {
    return [pointer || "/"];
  }
  const sourceKeys = Object.keys(source);
  const targetKeys = Object.keys(target);
  const keys = [...new Set([...sourceKeys, ...targetKeys])].sort(codePointCompare);
  const differences = [];
  for (const key of keys) {
    const childPointer = `${pointer}/${escapeJsonPointerSegment(key)}`;
    if (!Object.hasOwn(source, key) || !Object.hasOwn(target, key)) differences.push(childPointer);
    else differences.push(...jsonPointerDifferences(source[key], target[key], childPointer));
  }
  return differences;
}

export function buildReaffirmedLegacyRegistry(sourceRegistry, targetCommit, sourceBaselineCommit = null) {
  const next = structuredClone(sourceRegistry);
  if (!commitPattern.test(next?.targetBaselineCommit ?? "") || !commitPattern.test(targetCommit ?? "")) {
    throw new Error("Source legacy registry has no valid target baseline.");
  }
  if (sourceBaselineCommit && next.targetBaselineCommit !== sourceBaselineCommit) {
    throw new Error("Source legacy registry target does not match the Source Manifest baseline.");
  }
  next.targetBaselineCommit = targetCommit;
  if (!jsonEqual(jsonPointerDifferences(sourceRegistry, next), ["/targetBaselineCommit"])) {
    throw new Error("Legacy registry re-affirmation may change only /targetBaselineCommit.");
  }
  return next;
}

export function assertExactReconstructedBytes(plannedBytes, committedBytes, label = "Reconstructed artifact") {
  if (!Buffer.isBuffer(plannedBytes) || !Buffer.isBuffer(committedBytes) || !plannedBytes.equals(committedBytes)) {
    throw new Error(`${label} bytes do not exactly match the reviewed plan.`);
  }
  return true;
}

export function assertSourceEvidenceBinding(sourceEvidence, binding, manifest) {
  for (const [value, label] of [
    [sourceEvidence, "source evidence"],
    [binding, "source evidence binding"],
    [manifest, "Source Manifest"]
  ]) {
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label} must be one object.`);
  }
  exactObjectKeys(
    binding.currentness,
    ["candidateDigest", "sourceCommit", "targetBaselineCommit", "checkerVersion"],
    `${binding.role ?? "unknown"} binding currentness`
  );
  if (
    sourceEvidence.evidenceId !== binding.evidenceId
    || sourceEvidence.role !== binding.role
    || sourceEvidence.result !== binding.expectedResult
    || sourceEvidence.candidateDigest !== manifest.candidateDigest
    || sourceEvidence.sourceCommit !== manifest.sourceCommit
    || sourceEvidence.targetBaselineCommit !== manifest.targetBaselineCommit
    || sourceEvidence.checkerVersion !== manifest.checkerVersion
    || binding.currentness.candidateDigest !== manifest.candidateDigest
    || binding.currentness.sourceCommit !== manifest.sourceCommit
    || binding.currentness.targetBaselineCommit !== manifest.targetBaselineCommit
    || binding.currentness.checkerVersion !== manifest.checkerVersion
    || computeV2EvidenceSemanticDigest(sourceEvidence) !== binding.semanticDigest
  ) {
    throw new Error(`${binding.role ?? "unknown"} source evidence semantic identity or currentness is invalid.`);
  }
  return true;
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
  if (context.candidateBytesChanged !== false) {
    throw new Error("Baseline re-affirmation requires candidate bytes to remain unchanged.");
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
  const roles = requiredRoles(manifest);
  const reviewJustification = options.reviewRuntimePolicy
    ? loadReviewJustification(
        options.justification,
        options.justificationCommit,
        {
          sourceBaselineCommit: manifest.targetBaselineCommit,
          targetCommit,
          roles,
          revisionRoot: revisionRoot.relative
        }
      )
    : null;
  const candidateArtifactBindings = collectCandidateArtifactBindings(
    manifest,
    manifest.targetBaselineCommit,
    targetCommit
  );
  const legacyCandidateRevision = options.reviewLegacyCandidateBytes
    ? collectReviewedLegacyCandidateByteRefresh(legacySource.value, targetCommit, protectedDiff)
    : null;
  const legacyValue = legacyCandidateRevision?.registry
    ?? buildReaffirmedLegacyRegistry(
      legacySource.value,
      targetCommit,
      manifest.targetBaselineCommit
    );
  const legacyRelative = `${revisionRoot.relative}/inputs/legacy-resolution-registry.v2.6.json`;
  const legacyBytes = Buffer.from(canonicalJson(legacyValue), "utf8");
  const legacyRawSha256 = sha256(legacyBytes);
  const runtimePolicyRevision = options.refreshRuntimePolicy
    ? await collectRuntimePolicyRefresh(manifest)
    : options.reviewRuntimePolicy
      ? await collectReviewedRuntimePolicyEvolution(
          manifest,
          targetCommit,
          protectedDiff,
          reviewJustification
        )
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
    assertSourceEvidenceBinding(sourceLoaded.value, binding, manifest);
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
          candidateBytesChanged: candidateArtifactBindings.some(({ unchanged }) => unchanged !== true),
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
    reviewJustification,
    justificationCommit: options.justificationCommit,
    candidateArtifactBindings,
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
        : plan.runtimePolicyRevision?.proof.schemaVersion === "promotion-runtime-policy-reviewed-evolution.v2"
          ? "reviewed exact static-edge/runtime-policy evolution"
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
  assertCommittedJustification(
    options.justification,
    plan.targetCommit,
    roles,
    plan.revisionRoot.relative,
    {
      commitish: plan.justificationCommit,
      expectedRawSha256: plan.reviewJustification?.rawSha256 ?? null
    }
  );
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
  assertProducedAt(options.producedAt);
  const roles = requiredRoles(plan.manifest);
  assertAttestations(plan.manifest, options.attestedBy);
  assertCommittedJustification(
    options.justification,
    plan.targetCommit,
    roles,
    plan.revisionRoot.relative,
    {
      commitish: plan.justificationCommit,
      expectedRawSha256: plan.reviewJustification?.rawSha256 ?? null
    }
  );
  if (!options.evidenceCommit) throw new Error("--write-bindings requires --evidence-commit.");
  const evidenceCommit = options.resolvedEvidenceCommit ?? resolveCommit(options.evidenceCommit, "Evidence commit");
  assertAncestor(plan.targetCommit, evidenceCommit, "Target baseline");
  assertAncestor(evidenceCommit, resolveCommit("HEAD", "HEAD"), "Evidence commit");
  assertExactCommitChangedPaths(
    evidenceCommit,
    [plan.legacy.destination.relative, ...plan.evidence.map(({ destination }) => destination.relative)],
    "Evidence commit"
  );
  assertDestinationAbsent(plan.destinationManifest, "Revision Manifest");
  assertDestinationAbsent(plan.evidenceIndex, "Revision evidence index");

  const committedLegacy = gitBlob(evidenceCommit, plan.legacy.destination.relative);
  const workingLegacy = fs.readFileSync(plan.legacy.destination.absolute);
  if (!workingLegacy.equals(committedLegacy)) {
    throw new Error("Revision legacy registry must exactly match --evidence-commit.");
  }
  assertExactReconstructedBytes(plan.legacy.bytes, committedLegacy, "Revision legacy registry");
  const legacyValue = JSON.parse(committedLegacy.toString("utf8"));
  if (legacyValue.targetBaselineCommit !== plan.targetCommit) {
    throw new Error("Committed revision legacy registry has the wrong target baseline.");
  }
  const legacyRawSha256 = sha256(committedLegacy);

  const refreshedBindings = plan.evidence.map(({ binding, destination, bytes }) => {
    const committed = gitBlob(evidenceCommit, destination.relative);
    const working = fs.readFileSync(destination.absolute);
    if (!working.equals(committed)) {
      throw new Error(`${binding.role} revision evidence must exactly match --evidence-commit.`);
    }
    assertExactReconstructedBytes(bytes, committed, `${binding.role} revision evidence`);
    const evidence = JSON.parse(committed.toString("utf8"));
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
  if (
    sourceIndex.value.schemaVersion !== "promotion-evidence-index.v2"
    || sourceIndex.value.candidateDigest !== plan.manifest.candidateDigest
    || sourceIndex.value.sourceCommit !== plan.manifest.sourceCommit
    || sourceIndex.value.targetBaselineCommit !== plan.manifest.targetBaselineCommit
    || sourceIndex.value.checkerVersion !== plan.manifest.checkerVersion
    || !jsonEqual(sourceIndex.value.entries, plan.manifest.evidenceBindings)
  ) {
    throw new Error("Source evidence index semantic identity or currentness is invalid.");
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
  if (options.refreshRuntimePolicy && options.reviewRuntimePolicy) {
    throw new Error("--refresh-runtime-policy and --review-runtime-policy are mutually exclusive.");
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
  const manifestFile = loadManifest(options.manifest);
  const targetCommit = resolveCommit(options.target, "Target baseline");
  const sourceBaselineCommit = resolveCommit(
    manifestFile.value.targetBaselineCommit,
    "Source baseline"
  );
  assertAncestor(sourceBaselineCommit, targetCommit, "Source baseline");
  assertAncestor(targetCommit, resolveCommit("HEAD", "HEAD"), "Target baseline");
  const revisionRoot = resolveRevisionRoot(manifestFile.relative, options.revisionRoot);
  if (options.writeEvidence || options.writeBindings) assertProducedAt(options.producedAt);
  if (options.writeBindings) {
    if (!options.evidenceCommit) throw new Error("--write-bindings requires --evidence-commit.");
    options.resolvedEvidenceCommit = resolveCommit(options.evidenceCommit, "Evidence commit");
    options.justificationCommit = options.resolvedEvidenceCommit;
  } else {
    options.justificationCommit = resolveCommit("HEAD", "HEAD");
  }
  if (options.refreshRuntimePolicy || options.reviewRuntimePolicy) assertCleanWorktree();
  const plan = await planRevision(manifestFile, targetCommit, revisionRoot, options);
  printPlan(plan);
  if (options.writeEvidence) writeEvidencePhase(options, plan);
  else if (options.writeBindings) writeBindingPhase(options, plan);
  else process.stdout.write("\nDRY RUN — no files written.\n");
}

if (process.argv[1] && path.resolve(process.argv[1]) === scriptPath) await main();
