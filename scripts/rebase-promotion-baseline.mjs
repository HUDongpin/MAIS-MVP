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
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { computeV2EvidenceSemanticDigest } from "../coordination/integration/v2/promotion-gate-v2-lib.mjs";

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
    "  rebase-promotion-baseline.mjs --manifest <source> --target <commit> --revision-root <new-path> --write-evidence --produced-at <ISO> --attested-by <roles> --justification <committed-path>",
    "  rebase-promotion-baseline.mjs --manifest <source> --target <commit> --revision-root <new-path> --write-bindings --evidence-commit <commit> --attested-by <roles> --justification <committed-path>"
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

export function buildReaffirmedLegacyRegistry(sourceRegistry, targetCommit) {
  const next = structuredClone(sourceRegistry);
  if (!commitPattern.test(next?.targetBaselineCommit ?? "")) {
    throw new Error("Source legacy registry has no valid target baseline.");
  }
  next.targetBaselineCommit = targetCommit;
  return next;
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
  next.semanticPayload.baselineReaffirmation = {
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
    liveAllowed: false
  };
  return next;
}

function planRevision(manifestFile, targetCommit, revisionRoot, options) {
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
  const legacyValue = buildReaffirmedLegacyRegistry(legacySource.value, targetCommit);
  const legacyRelative = `${revisionRoot.relative}/inputs/legacy-resolution-registry.v2.6.json`;
  const legacyBytes = Buffer.from(canonicalJson(legacyValue), "utf8");
  const legacyRawSha256 = sha256(legacyBytes);
  const protectedDiff = collectProtectedDiff(manifest.targetBaselineCommit, targetCommit);

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
  const nextIndex = structuredClone(sourceIndex.value);
  nextIndex.targetBaselineCommit = plan.targetCommit;
  nextIndex.entries = refreshedBindings;
  const nextIndexBytes = Buffer.from(canonicalJson(nextIndex), "utf8");

  const nextManifest = structuredClone(plan.manifest);
  nextManifest.targetBaselineCommit = plan.targetCommit;
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

export function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  if (options.help) {
    process.stdout.write(`${usage()}\n`);
    return;
  }
  if (options.rejectedMonolithicWrite) {
    throw new Error("Monolithic --write is disabled; create an append-only revision with the two committed phases.");
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
  assertAncestor(targetCommit, resolveCommit("HEAD", "HEAD"), "Target baseline");
  const revisionRoot = resolveRevisionRoot(manifestFile.relative, options.revisionRoot);
  if (options.writeEvidence) assertProducedAt(options.producedAt);
  const plan = planRevision(manifestFile, targetCommit, revisionRoot, options);
  printPlan(plan);
  if (options.writeEvidence) writeEvidencePhase(options, plan);
  else if (options.writeBindings) writeBindingPhase(options, plan);
  else process.stdout.write("\nDRY RUN — no files written.\n");
}

if (process.argv[1] && path.resolve(process.argv[1]) === scriptPath) main();
