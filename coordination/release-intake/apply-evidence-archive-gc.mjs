#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  assertEvidenceWriterLockOwned,
  gitText,
  repositoryIdentity,
  resolveEvidenceRoot,
  runEvidenceWriterUnderLock
} from "./evidence-archive-lib.mjs";
import { buildEvidenceArchiveGcPlan } from "./plan-evidence-archive-gc.mjs";

const SHA256_PATTERN = /^[0-9a-f]{64}$/u;

function fsyncDirectory(directory) {
  const descriptor = fs.openSync(directory, "r");
  try {
    fs.fsyncSync(descriptor);
  } finally {
    fs.closeSync(descriptor);
  }
}

function managedPath(evidenceRoot, relativePath, { kind, prefix }) {
  if (typeof relativePath !== "string" || path.isAbsolute(relativePath)) {
    throw new Error(`${kind} delete path must be relative`);
  }
  const components = relativePath.split("/");
  if (components.length < 2 || components.some((component) => !component || component === "." || component === "..")) {
    throw new Error(`${kind} delete path is noncanonical`);
  }
  if (!relativePath.startsWith(prefix)) throw new Error(`${kind} delete path is outside its managed prefix`);
  const absolutePath = path.join(evidenceRoot, ...components);
  const relative = path.relative(evidenceRoot, absolutePath);
  if (relative === ".." || relative.startsWith(`..${path.sep}`)) throw new Error(`${kind} delete path escapes the evidence root`);
  let cursor = evidenceRoot;
  for (const component of components) {
    cursor = path.join(cursor, component);
    const stat = fs.lstatSync(cursor);
    if (stat.isSymbolicLink()) throw new Error(`${kind} delete path contains a symlink`);
  }
  return absolutePath;
}

function assertSetCandidate(evidenceRoot, relativePath) {
  const absolutePath = managedPath(evidenceRoot, relativePath, { kind: "archive set", prefix: "sets/" });
  const stat = fs.lstatSync(absolutePath);
  if (!stat.isDirectory() || (stat.mode & 0o777) !== 0o700) throw new Error("archive set delete candidate is unsafe");
  return absolutePath;
}

function assertFileCandidate(evidenceRoot, candidate, kind) {
  const absolutePath = managedPath(evidenceRoot, candidate.path, {
    kind,
    prefix: "blobs/sha256/"
  });
  const stat = fs.lstatSync(absolutePath);
  if (!stat.isFile() || stat.isSymbolicLink() || (stat.mode & 0o777) !== 0o600 || stat.nlink !== 1) {
    throw new Error(`${kind} delete candidate is unsafe or still linked`);
  }
  if (stat.size !== candidate.bytes || stat.blocks * 512 !== candidate.allocatedBytes) {
    throw new Error(`${kind} delete candidate changed after planning`);
  }
  return absolutePath;
}

function assertZeroCandidateSummary(plan) {
  const summary = plan.summary;
  if (summary.orphanSetDirectories !== 0
    || summary.candidateBlobFiles !== 0
    || summary.candidateTemporaryFiles !== 0
    || summary.reclaimableUniqueInodes !== 0
    || summary.reclaimableLogicalBytes !== 0
    || summary.reclaimableAllocatedBytes !== 0) {
    throw new Error("post-apply evidence GC plan still contains deletion candidates");
  }
}

export function applyEvidenceArchiveGcPlan({
  evidenceRoot,
  publicationDirectory,
  repositoryId,
  retainSetFingerprints = [],
  expectedPlanFingerprint,
  assertLockHealthy = () => {}
}) {
  if (typeof expectedPlanFingerprint !== "string" || !SHA256_PATTERN.test(expectedPlanFingerprint)) {
    throw new Error("authorized evidence GC plan fingerprint is invalid");
  }
  assertLockHealthy();
  const before = buildEvidenceArchiveGcPlan({
    evidenceRoot,
    publicationDirectory,
    repositoryId,
    retainSetFingerprints
  });
  assertLockHealthy();
  if (before.planFingerprint !== expectedPlanFingerprint) {
    throw new Error(`authorized evidence GC plan fingerprint is stale: expected ${expectedPlanFingerprint}, observed ${before.planFingerprint}`);
  }
  const setDirectories = before.deletePaths.setDirectories;
  const blobCandidates = before.candidateBlobs;
  const temporaryCandidates = before.candidateTemporaryFiles;
  if (setDirectories.length !== before.summary.orphanSetDirectories
    || blobCandidates.length !== before.summary.candidateBlobFiles
    || temporaryCandidates.length !== before.summary.candidateTemporaryFiles) {
    throw new Error("authorized evidence GC plan candidate counts are inconsistent");
  }

  for (const relativePath of setDirectories) {
    assertLockHealthy();
    const absolutePath = assertSetCandidate(evidenceRoot, relativePath);
    fs.rmSync(absolutePath, { recursive: true, force: false });
    assertLockHealthy();
  }
  fsyncDirectory(path.join(evidenceRoot, "sets"));

  const syncedBlobDirectories = new Set();
  for (const candidate of temporaryCandidates) {
    assertLockHealthy();
    const absolutePath = assertFileCandidate(evidenceRoot, candidate, "temporary blob");
    fs.unlinkSync(absolutePath);
    syncedBlobDirectories.add(path.dirname(absolutePath));
    assertLockHealthy();
  }
  for (const candidate of blobCandidates) {
    assertLockHealthy();
    const absolutePath = assertFileCandidate(evidenceRoot, candidate, "content-addressed blob");
    fs.unlinkSync(absolutePath);
    syncedBlobDirectories.add(path.dirname(absolutePath));
    assertLockHealthy();
  }
  for (const directory of [...syncedBlobDirectories].sort()) fsyncDirectory(directory);
  fsyncDirectory(path.join(evidenceRoot, "blobs", "sha256"));

  assertLockHealthy();
  const after = buildEvidenceArchiveGcPlan({
    evidenceRoot,
    publicationDirectory,
    repositoryId,
    retainSetFingerprints
  });
  assertLockHealthy();
  assertZeroCandidateSummary(after);
  if (after.retainedSets.join("\0") !== before.retainedSets.join("\0")) {
    throw new Error("retained archive-set inventory changed during evidence GC apply");
  }
  return {
    schemaVersion: 1,
    operation: "evidence-archive-gc-apply",
    authorizedPlanFingerprint: expectedPlanFingerprint,
    deleted: {
      setDirectories: setDirectories.length,
      blobFiles: blobCandidates.length,
      temporaryFiles: temporaryCandidates.length,
      expectedAllocatedBytes: before.summary.reclaimableAllocatedBytes
    },
    retainedSets: after.retainedSets,
    before,
    after
  };
}

function parseCli(argv) {
  const options = { retainSetFingerprints: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--json") continue;
    if (["--repo-root", "--evidence-root", "--publication-directory", "--retain-set", "--authorized-plan"].includes(argument)) {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) throw new Error(`${argument} requires a value`);
      index += 1;
      if (argument === "--repo-root") options.repoRoot = path.resolve(value);
      else if (argument === "--evidence-root") options.evidenceRoot = path.resolve(value);
      else if (argument === "--publication-directory") options.publicationDirectory = path.resolve(value);
      else if (argument === "--retain-set") options.retainSetFingerprints.push(value);
      else options.expectedPlanFingerprint = value;
      continue;
    }
    throw new Error(`unknown argument: ${argument}`);
  }
  if (!options.expectedPlanFingerprint) throw new Error("--authorized-plan is required");
  return options;
}

function main() {
  const options = parseCli(process.argv.slice(2));
  const repoRoot = options.repoRoot ?? gitText(["rev-parse", "--show-toplevel"]);
  const commonDir = path.resolve(repoRoot, gitText(["rev-parse", "--git-common-dir"], repoRoot));
  const evidenceRoot = options.evidenceRoot ?? resolveEvidenceRoot({ repoRoot, commonDir });
  const publicationDirectory = options.publicationDirectory
    ?? path.join(repoRoot, "coordination", "release-intake", "archive");
  const assertLockHealthy = () => assertEvidenceWriterLockOwned({ commonDir });
  try {
    assertLockHealthy();
  } catch {
    runEvidenceWriterUnderLock({
      commonDir,
      scriptPath: fileURLToPath(import.meta.url),
      args: process.argv.slice(2),
      timeoutMs: 10 * 60 * 1000
    });
    return;
  }
  const result = applyEvidenceArchiveGcPlan({
    evidenceRoot,
    publicationDirectory,
    repositoryId: repositoryIdentity(commonDir),
    retainSetFingerprints: options.retainSetFingerprints,
    expectedPlanFingerprint: options.expectedPlanFingerprint,
    assertLockHealthy
  });
  process.stdout.write(`${JSON.stringify({
    schemaVersion: result.schemaVersion,
    operation: result.operation,
    authorizedPlanFingerprint: result.authorizedPlanFingerprint,
    deleted: result.deleted,
    retainedSets: result.retainedSets,
    postApplySummary: result.after.summary,
    postApplyPlanFingerprint: result.after.planFingerprint
  }, null, 2)}\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    main();
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}
