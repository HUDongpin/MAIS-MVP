#!/usr/bin/env node

import crypto from "node:crypto";
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  abortMutationEpochMonitor,
  assertEvidenceRootMarker,
  assertEvidenceWriterLockOwned,
  ensureEvidenceRoot,
  gitBuffer,
  listWorktrees,
  parseNul,
  parseStatusPorcelainZ,
  repositoryIdentity,
  resolveEvidenceRoot,
  runEvidenceWriterUnderLock,
  settleMutationEpochState,
  startMutationEpochMonitor,
  stableJson,
  stopMutationEpochMonitor,
  writeEvidenceReport
} from "./evidence-archive-lib.mjs";
import {
  compileOwnerPathspecManifest,
  resolveOwnerPath,
  validateOwnerPathspecManifest
} from "../../scripts/release-package-gate.mjs";

const compiledPolicyCache = new WeakMap();

function compileDispositionPolicy(policy) {
  const cached = compiledPolicyCache.get(policy);
  if (cached) return cached;
  const external = policy.externalEvidence ?? {};
  const compiled = {
    humanInputs: new Set(policy.humanInputPaths ?? []),
    archivePrefixes: external.archivePrefixes ?? [],
    evidenceDirectoryPatterns: (external.evidenceDirectoryPatterns ?? [])
      .map((pattern) => new RegExp(pattern, "u")),
    rawSuffixes: external.rawSuffixes ?? [],
    officeLockPattern: new RegExp(external.officeLockPattern, "u"),
    latestPattern: new RegExp(external.latestPattern, "u"),
    dirtyMapPattern: new RegExp(external.dirtyMapPattern, "u"),
    repeatedSelectionPattern: new RegExp(external.repeatedSelectionPattern, "u"),
    datedLatestPairs: external.datedLatestPairs === true
  };
  compiledPolicyCache.set(policy, compiled);
  return compiled;
}

function hasDatedLatestPair(filePath, allPaths, compiledPolicy) {
  if (!filePath.startsWith("coordination/release-intake/")) return false;
  const basename = path.posix.basename(filePath);
  const match = basename.match(/^[0-9]{4}-[0-9]{2}-[0-9]{2}-(.+)$/u);
  if (!match) return false;
  const latestPath = path.posix.join(path.posix.dirname(filePath), `latest-${match[1]}`);
  return allPaths.has(latestPath)
    && !compiledPolicy.humanInputs.has(latestPath)
    && compiledPolicy.latestPattern.test(latestPath);
}

export function isExternalEvidencePath(filePath, allPaths, policy) {
  const compiledPolicy = compileDispositionPolicy(policy);
  if (compiledPolicy.humanInputs.has(filePath)) return false;
  if (compiledPolicy.archivePrefixes.some((prefix) => filePath.startsWith(prefix))) {
    return true;
  }
  if (compiledPolicy.evidenceDirectoryPatterns.some((pattern) => pattern.test(filePath))) {
    return true;
  }
  if (compiledPolicy.rawSuffixes.some((suffix) => filePath.endsWith(suffix))) {
    return true;
  }
  if (compiledPolicy.officeLockPattern.test(filePath)) return true;
  if (compiledPolicy.latestPattern.test(filePath)) return true;
  if (compiledPolicy.dirtyMapPattern.test(filePath)) return true;
  if (compiledPolicy.repeatedSelectionPattern.test(filePath)) return true;
  return compiledPolicy.datedLatestPairs && hasDatedLatestPair(filePath, allPaths, compiledPolicy);
}

export function classifyDisposition({ path: filePath, sourcePackageId, allPaths, policy }) {
  if (isExternalEvidencePath(filePath, allPaths, policy)) {
    return { ...policy.externalPackage };
  }

  const matches = (policy.packageAssignments ?? []).filter((assignment) => {
    if (assignment.sourcePackageId !== sourcePackageId) return false;
    if (Array.isArray(assignment.includePaths)) {
      return assignment.includePaths.includes(filePath);
    }
    if (Array.isArray(assignment.excludePaths)) {
      return !assignment.excludePaths.includes(filePath);
    }
    return true;
  });
  if (matches.length !== 1) {
    throw new Error(
      `closure disposition package assignment must be unique for ${JSON.stringify(filePath)}; got ${matches.length}`
    );
  }
  const [{ packageId, wave, finalState }] = matches;
  return { packageId, wave, finalState };
}

function assertString(value, label) {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${label} must be a non-empty string`);
  }
}

function assertUniqueStrings(values, label) {
  if (!Array.isArray(values) || values.some((value) => typeof value !== "string" || value.length === 0)) {
    throw new Error(`${label} must be an array of non-empty strings`);
  }
  if (new Set(values).size !== values.length) {
    throw new Error(`${label} must not contain duplicates`);
  }
}

function sortedStrings(values) {
  return [...values].sort((left, right) => Buffer.compare(Buffer.from(left), Buffer.from(right)));
}

export function validateDispositionPolicy(policy) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy) || policy.version !== 1) {
    throw new Error("closure disposition policy schema is invalid");
  }
  assertUniqueStrings(policy.humanInputPaths, "humanInputPaths");
  for (const filePath of policy.humanInputPaths) assertCanonicalRepoPath(filePath);
  const external = policy.externalEvidence;
  if (!external || typeof external !== "object" || Array.isArray(external)) {
    throw new Error("externalEvidence must be an object");
  }
  assertUniqueStrings(external.archivePrefixes, "externalEvidence.archivePrefixes");
  assertUniqueStrings(external.evidenceDirectoryPatterns, "externalEvidence.evidenceDirectoryPatterns");
  assertUniqueStrings(external.rawSuffixes, "externalEvidence.rawSuffixes");
  for (const pattern of [
    ...external.evidenceDirectoryPatterns,
    external.latestPattern,
    external.dirtyMapPattern,
    external.repeatedSelectionPattern,
    external.officeLockPattern
  ]) {
    assertString(pattern, "external evidence pattern");
    new RegExp(pattern, "u");
  }
  if (external.datedLatestPairs !== true) {
    throw new Error("datedLatestPairs must be true");
  }

  const allowedWaves = new Set(["P1", "P2", "P3", "P4", "P5", "P6", "P7", "P8"]);
  const allowedFinalStates = new Set([
    "reviewed commit",
    "owner-approved discard",
    "evidence archive",
    "blocker report"
  ]);
  const validateAssignment = (assignment, label) => {
    if (!assignment || typeof assignment !== "object" || Array.isArray(assignment)) {
      throw new Error(`${label} must be an object`);
    }
    assertString(assignment.packageId, `${label}.packageId`);
    if (!allowedWaves.has(assignment.wave)) throw new Error(`${label}.wave is invalid`);
    if (!allowedFinalStates.has(assignment.finalState)) throw new Error(`${label}.finalState is invalid`);
  };
  validateAssignment(policy.externalPackage, "externalPackage");
  if (policy.externalPackage.finalState !== "evidence archive") {
    throw new Error("externalPackage must use evidence archive finalState");
  }

  if (!Array.isArray(policy.packageAssignments) || policy.packageAssignments.length === 0) {
    throw new Error("packageAssignments must be a non-empty array");
  }
  const groups = new Map();
  for (const [index, assignment] of policy.packageAssignments.entries()) {
    const label = `packageAssignments[${index}]`;
    validateAssignment(assignment, label);
    assertString(assignment.sourcePackageId, `${label}.sourcePackageId`);
    if (assignment.includePaths !== undefined) {
      assertUniqueStrings(assignment.includePaths, `${label}.includePaths`);
      for (const filePath of assignment.includePaths) assertCanonicalRepoPath(filePath);
    }
    if (assignment.excludePaths !== undefined) {
      assertUniqueStrings(assignment.excludePaths, `${label}.excludePaths`);
      for (const filePath of assignment.excludePaths) assertCanonicalRepoPath(filePath);
    }
    if (assignment.includePaths !== undefined && assignment.excludePaths !== undefined) {
      throw new Error(`${label} cannot contain both includePaths and excludePaths`);
    }
    const group = groups.get(assignment.sourcePackageId) ?? [];
    group.push(assignment);
    groups.set(assignment.sourcePackageId, group);
  }
  for (const [sourcePackageId, assignments] of groups) {
    if (assignments.length === 1) {
      if (assignments[0].includePaths || assignments[0].excludePaths) {
        throw new Error(`${sourcePackageId} has an incomplete path partition`);
      }
      continue;
    }
    if (assignments.length !== 2) throw new Error(`${sourcePackageId} has a multiply assigned partition`);
    const included = assignments.find((assignment) => assignment.includePaths);
    const excluded = assignments.find((assignment) => assignment.excludePaths);
    if (!included || !excluded || JSON.stringify(sortedStrings(included.includePaths)) !== JSON.stringify(sortedStrings(excluded.excludePaths))) {
      throw new Error(`${sourcePackageId} include/exclude partitions must be exact complements`);
    }
  }
  compileDispositionPolicy(policy);
  return policy;
}

function compareUtf8(left, right) {
  return Buffer.compare(Buffer.from(left), Buffer.from(right));
}

function statusInventoryBuffer(entries) {
  return Buffer.concat(
    [...entries]
      .sort((left, right) => compareUtf8(left.path, right.path) || left.status.localeCompare(right.status))
      .flatMap((entry) => [
        Buffer.from(entry.status),
        Buffer.from([0]),
        Buffer.from(entry.path),
        Buffer.from([0]),
        Buffer.from(entry.originalPath ?? ""),
        Buffer.from([0])
      ])
  );
}

function currentGitDirectory(repoRoot) {
  const value = gitBuffer(["rev-parse", "--git-dir"], repoRoot).toString("utf8").trim();
  if (value.length === 0 || value.includes("\0")) {
    throw new Error("current worktree Git directory is invalid");
  }
  const absolutePath = path.resolve(repoRoot, value);
  const stat = fs.lstatSync(absolutePath);
  if (stat.isSymbolicLink() || !stat.isDirectory()) {
    throw new Error("current worktree Git directory must be a direct directory");
  }
  return fs.realpathSync(absolutePath);
}

const INDEX_MUTATION_MONITOR_CHILD_SOURCE = String.raw`
import fs from "node:fs";
import path from "node:path";
const [gitDirectory, scratch, parentPidText, sessionId] = process.argv.slice(1);
const parentPid = Number(parentPidText);
const epochPath = path.join(scratch, "epoch");
const readyPath = path.join(scratch, "ready");
const stopPath = path.join(scratch, "stop");
const stoppedPath = path.join(scratch, "stopped");
const errorPath = path.join(scratch, "error");
const indexPath = path.join(gitDirectory, "index");
let indexEpoch = 0;
let sequence = 0;
let stopping = false;
let stopped = false;
let terminalTimer;
let watcher;
let pollTimer;
let stopTimer;
let parentTimer;
const publishJson = (destination, value) => {
  const temporary = destination + ".tmp-" + process.pid + "-" + (++sequence);
  const descriptor = fs.openSync(temporary, fs.constants.O_WRONLY | fs.constants.O_CREAT
    | fs.constants.O_EXCL | (fs.constants.O_NOFOLLOW ?? 0), 0o600);
  try {
    fs.writeFileSync(descriptor, JSON.stringify(value) + "\n");
    fs.fsyncSync(descriptor);
  } finally {
    fs.closeSync(descriptor);
  }
  fs.renameSync(temporary, destination);
};
const state = (status) => ({ schemaVersion: 1, sessionId, indexEpoch, status });
const publishEpoch = () => publishJson(epochPath, state("active"));
const close = () => {
  try { watcher?.close(); } catch {}
  if (pollTimer) clearInterval(pollTimer);
  if (stopTimer) clearInterval(stopTimer);
  if (parentTimer) clearInterval(parentTimer);
  if (terminalTimer) clearTimeout(terminalTimer);
};
const fail = (reason) => {
  if (stopped) return;
  stopped = true;
  close();
  const detail = reason instanceof Error ? reason.message : String(reason ?? "unspecified failure");
  try { fs.writeFileSync(errorPath, "index mutation monitor failed closed: " + detail + "\n", { mode: 0o600 }); } catch {}
  process.exit(91);
};
const snapshot = () => {
  let stat;
  try { stat = fs.lstatSync(indexPath, { bigint: true }); } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
  if (stat.isSymbolicLink() || !stat.isFile() || stat.nlink !== 1n) {
    throw new Error("Git index is not a direct regular file with one link");
  }
  return {
    dev: String(stat.dev),
    ino: String(stat.ino),
    mode: String(stat.mode),
    nlink: String(stat.nlink),
    size: String(stat.size),
    mtimeNs: String(stat.mtimeNs),
    ctimeNs: String(stat.ctimeNs)
  };
};
let lastSnapshot;
const scheduleTerminal = () => {
  if (!stopping || stopped) return;
  if (terminalTimer) clearTimeout(terminalTimer);
  terminalTimer = setTimeout(finalize, 100);
};
const recordMutation = () => {
  indexEpoch += 1;
  publishEpoch();
  scheduleTerminal();
};
const sample = () => {
  const current = snapshot();
  if (JSON.stringify(current) === JSON.stringify(lastSnapshot)) return false;
  lastSnapshot = current;
  recordMutation();
  return true;
};
function finalize() {
  try {
    if (sample()) return;
    publishEpoch();
    publishJson(stoppedPath, state("stopped"));
    stopped = true;
    close();
    process.exit(0);
  } catch (error) {
    fail(error);
  }
}
try {
  const gitStat = fs.lstatSync(gitDirectory);
  const scratchStat = fs.lstatSync(scratch);
  if (!gitStat.isDirectory() || gitStat.isSymbolicLink()
    || !scratchStat.isDirectory() || scratchStat.isSymbolicLink()
    || (scratchStat.mode & 0o777) !== 0o700
    || !Number.isSafeInteger(parentPid) || parentPid <= 1
    || typeof sessionId !== "string" || sessionId.length === 0) {
    throw new Error("invalid index mutation monitor bootstrap");
  }
  lastSnapshot = snapshot();
  watcher = fs.watch(gitDirectory, { persistent: true, recursive: false }, (_eventType, filename) => {
    try {
      if (filename === null || filename === undefined) throw new Error("index watcher returned a null filename");
      const name = Buffer.isBuffer(filename) ? filename.toString("utf8") : String(filename);
      if (name === "index" || name === "index.lock") recordMutation();
    } catch (error) {
      fail(error);
    }
  });
  watcher.on("error", fail);
  if (sample()) throw new Error("Git index changed during mutation monitor startup");
  publishEpoch();
  publishJson(readyPath, state("ready"));
  pollTimer = setInterval(() => {
    try { sample(); } catch (error) { fail(error); }
  }, 20);
  stopTimer = setInterval(() => {
    if (stopping || !fs.existsSync(stopPath)) return;
    stopping = true;
    scheduleTerminal();
  }, 10);
  parentTimer = setInterval(() => {
    try { process.kill(parentPid, 0); } catch { fail("parent process exited"); }
  }, 250);
} catch (error) {
  fail(error);
}
`;

function synchronousWait(milliseconds) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, milliseconds);
}

function processIsAlive(pid) {
  if (!Number.isSafeInteger(pid) || pid <= 1) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function cleanupIndexMutationMonitor(monitor) {
  if (!monitor) return;
  if (processIsAlive(monitor.child.pid)) {
    try { monitor.child.kill("SIGKILL"); } catch {}
    const deadline = Date.now() + 1_000;
    while (processIsAlive(monitor.child.pid) && Date.now() < deadline) synchronousWait(20);
  }
  fs.rmSync(monitor.scratch, { recursive: true, force: true });
}

function readIndexMonitorState(filePath, sessionId, expectedStatus) {
  const value = JSON.parse(fs.readFileSync(filePath, "utf8"));
  if (!value || typeof value !== "object" || Array.isArray(value)
    || JSON.stringify(Object.keys(value).sort())
      !== JSON.stringify(["indexEpoch", "schemaVersion", "sessionId", "status"])
    || value.schemaVersion !== 1 || value.sessionId !== sessionId
    || !Number.isSafeInteger(value.indexEpoch) || value.indexEpoch < 0
    || value.status !== expectedStatus) {
    throw new Error("index mutation monitor state is invalid");
  }
  return value;
}

function waitForIndexMonitorFile(monitor, filename, expectedStatus, timeoutMs) {
  const destination = path.join(monitor.scratch, filename);
  const errorPath = path.join(monitor.scratch, "error");
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (fs.existsSync(errorPath)) {
      throw new Error(fs.readFileSync(errorPath, "utf8").trim());
    }
    if (fs.existsSync(destination)) {
      return readIndexMonitorState(destination, monitor.sessionId, expectedStatus);
    }
    if (!processIsAlive(monitor.child.pid)) {
      throw new Error("index mutation monitor exited before acknowledgement");
    }
    synchronousWait(20);
  }
  throw new Error("index mutation monitor acknowledgement timed out");
}

function startIndexMutationMonitor(gitDirectory) {
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "mais-index-epoch-"));
  fs.chmodSync(scratch, 0o700);
  const sessionId = crypto.randomUUID();
  const child = spawn(process.execPath, [
    "--input-type=module",
    "-e",
    INDEX_MUTATION_MONITOR_CHILD_SOURCE,
    gitDirectory,
    scratch,
    String(process.pid),
    sessionId
  ], {
    env: process.env,
    stdio: ["ignore", "ignore", "ignore"]
  });
  child.on("error", () => {});
  child.unref();
  const monitor = { child, scratch, sessionId };
  try {
    const baseline = waitForIndexMonitorFile(monitor, "ready", "ready", 10_000);
    return { ...monitor, baselineEpoch: baseline.indexEpoch };
  } catch (error) {
    cleanupIndexMutationMonitor(monitor);
    throw error;
  }
}

function stopIndexMutationMonitor(monitor) {
  try {
    fs.writeFileSync(path.join(monitor.scratch, "stop"), "stop\n", {
      flag: "wx",
      mode: 0o600
    });
    const terminal = waitForIndexMonitorFile(monitor, "stopped", "stopped", 10_000);
    if (terminal.indexEpoch !== monitor.baselineEpoch) {
      throw new Error("current worktree Git index mutation epoch changed");
    }
  } finally {
    cleanupIndexMutationMonitor(monitor);
  }
}

function withRepoMutationBarrier(repoRoot, operation) {
  assertSecureRepoRoot(repoRoot);
  const gitDirectory = currentGitDirectory(repoRoot);
  const indexPath = path.join(gitDirectory, "index");
  const indexStat = lstatBigInt(indexPath, "current worktree Git index");
  if (indexStat && (indexStat.isSymbolicLink() || !indexStat.isFile())) {
    throw new Error("current worktree Git index must be a direct regular file");
  }
  let sourceMonitor;
  let indexMonitor;
  try {
    indexMonitor = startIndexMutationMonitor(gitDirectory);
    sourceMonitor = startMutationEpochMonitor([repoRoot], { terminalQuietMs: 100 });
    const sourceBaseline = settleMutationEpochState(sourceMonitor);
    const result = operation();
    stopMutationEpochMonitor(sourceMonitor, {
      expectedEpoch: sourceBaseline.sourceEpoch,
      expectedMetadataEpoch: sourceBaseline.metadataEpoch
    });
    sourceMonitor = null;
    stopIndexMutationMonitor(indexMonitor);
    indexMonitor = null;
    return result;
  } catch (error) {
    abortMutationEpochMonitor(sourceMonitor);
    cleanupIndexMutationMonitor(indexMonitor);
    throw error;
  }
}

function buildDispositionRowsUnderBarrier({
  repoRoot,
  ownerManifest,
  policy,
  afterHash = () => {},
  beforeRevalidate = () => {}
}) {
  validateDispositionPolicy(policy);
  const ownerValidation = validateOwnerPathspecManifest(ownerManifest);
  if (!ownerValidation.valid) {
    throw new Error(`owner pathspec manifest is invalid: ${ownerValidation.errors.join("; ")}`);
  }
  const compiledOwners = compileOwnerPathspecManifest(ownerManifest);
  const before = readRawStatus(repoRoot);
  const uniquePaths = new Set(before.map((entry) => entry.path));
  if (uniquePaths.size !== before.length) {
    throw new Error("raw dirty status contains duplicate destination paths");
  }
  const allPaths = new Set(uniquePaths);
  const capturedRows = before.map((entry, index) => {
    const resolution = resolveOwnerPath(entry.path, compiledOwners);
    if (resolution.status !== "resolved" || resolution.finalOwners.length !== 1) {
      throw new Error(
        `dirty path must resolve to one owner: ${JSON.stringify(entry.path)} (${resolution.status})`
      );
    }
    const disposition = classifyDisposition({
      path: entry.path,
      ownerId: resolution.ownerId,
      sourcePackageId: resolution.packageId,
      allPaths,
      policy
    });
    const captured = captureDispositionPath(repoRoot, entry);
    afterHash(entry, index);
    return {
      entry,
      captured,
      row: {
        path: entry.path,
        status: entry.status,
        sha256: captured.sha256,
        ownerId: resolution.ownerId,
        packageId: disposition.packageId,
        wave: disposition.wave,
        finalState: disposition.finalState
      }
    };
  });

  const after = readRawStatus(repoRoot);
  const beforeInventory = statusInventoryBuffer(before);
  const afterInventory = statusInventoryBuffer(after);
  if (!beforeInventory.equals(afterInventory)) {
    throw new Error("raw dirty status changed while building the disposition manifest");
  }
  for (const [index, { entry, captured }] of capturedRows.entries()) {
    beforeRevalidate(entry, index);
    revalidateDispositionPath(repoRoot, entry, captured);
  }
  const finalInventory = statusInventoryBuffer(readRawStatus(repoRoot));
  if (!beforeInventory.equals(finalInventory)) {
    throw new Error("raw dirty status changed during disposition revalidation");
  }
  const rows = capturedRows
    .map(({ row }) => row)
    .sort((left, right) => compareUtf8(left.path, right.path));
  return {
    rows,
    rawStatusSignature: crypto.createHash("sha256").update(beforeInventory).digest("hex"),
    coverage: {
      inputRows: before.length,
      outputRows: rows.length,
      uniquePaths: uniquePaths.size,
      duplicatePaths: before.length - uniquePaths.size,
      uncovered: 0,
      multiplyAssigned: 0
    }
  };
}

export function buildDispositionRows(options) {
  return withRepoMutationBarrier(
    options.repoRoot,
    () => buildDispositionRowsUnderBarrier(options)
  );
}

function readStableDirectArtifact(filePath, label, { requireMode } = {}) {
  const initial = fs.lstatSync(filePath, { bigint: true });
  if (!initial.isFile() || initial.isSymbolicLink() || initial.nlink !== 1n) {
    throw new Error(`${label} must be a direct regular file with one link`);
  }
  if (requireMode !== undefined && (initial.mode & 0o777n) !== BigInt(requireMode)) {
    throw new Error(`${label} must use mode ${requireMode.toString(8)}`);
  }
  const descriptor = fs.openSync(filePath, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW);
  try {
    const before = fs.fstatSync(descriptor, { bigint: true });
    if (!sameIdentity(initial, before)) throw new Error(`${label} changed before reading`);
    const bytes = fs.readFileSync(descriptor);
    const after = fs.fstatSync(descriptor, { bigint: true });
    const final = fs.lstatSync(filePath, { bigint: true });
    if (BigInt(bytes.length) !== before.size || !sameIdentity(before, after) || !sameIdentity(after, final)) {
      throw new Error(`${label} changed while reading`);
    }
    return { bytes, identity: identityRecord(before) };
  } finally {
    fs.closeSync(descriptor);
  }
}

function readStableDirectFile(filePath, label) {
  return readStableDirectArtifact(filePath, label).bytes;
}

function readStableRepoArtifact(repoRoot, filePath, label) {
  if (!path.isAbsolute(repoRoot) || !path.isAbsolute(filePath)
    || path.resolve(repoRoot) !== repoRoot || path.resolve(filePath) !== filePath) {
    throw new Error(`${label} authoritative input path must be canonical and absolute`);
  }
  const relativePath = path.relative(repoRoot, filePath).split(path.sep).join("/");
  try {
    assertCanonicalRepoPath(relativePath);
  } catch {
    throw new Error(`${label} authoritative input must remain inside the repository`);
  }
  let ancestors;
  try {
    ancestors = captureSecureAncestors(repoRoot, relativePath);
  } catch (error) {
    throw new Error(`${label} authoritative input ancestor is an unsafe symlink or path (${error.message})`);
  }
  const artifact = readStableDirectArtifact(ancestors.absolutePath, label);
  try {
    revalidateSecureAncestors(repoRoot, relativePath, ancestors);
  } catch (error) {
    throw new Error(`${label} authoritative input ancestor changed while reading (${error.message})`);
  }
  return artifact;
}

function assertNoDuplicateJsonObjectKeys(text, label) {
  let cursor = 0;
  const invalid = () => {
    throw new Error(`${label} is not valid JSON`);
  };
  const skipWhitespace = () => {
    while (cursor < text.length && /[\t\n\r ]/u.test(text[cursor])) cursor += 1;
  };
  const parseString = () => {
    if (text[cursor] !== "\"") invalid();
    const start = cursor;
    cursor += 1;
    while (cursor < text.length) {
      const character = text[cursor];
      if (character === "\"") {
        cursor += 1;
        try {
          return JSON.parse(text.slice(start, cursor));
        } catch {
          invalid();
        }
      }
      if (character === "\\") {
        cursor += 1;
        if (cursor >= text.length) invalid();
        if (text[cursor] === "u") {
          if (!/^[0-9a-fA-F]{4}$/u.test(text.slice(cursor + 1, cursor + 5))) invalid();
          cursor += 5;
          continue;
        }
        if (!/["\\/bfnrt]/u.test(text[cursor])) invalid();
        cursor += 1;
        continue;
      }
      if (text.charCodeAt(cursor) <= 0x1f) invalid();
      cursor += 1;
    }
    invalid();
  };
  const parseNumber = () => {
    const match = text.slice(cursor).match(/^-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?/u);
    if (!match) invalid();
    cursor += match[0].length;
  };
  const parseLiteral = (literal) => {
    if (!text.startsWith(literal, cursor)) invalid();
    cursor += literal.length;
  };
  const parseArray = () => {
    cursor += 1;
    skipWhitespace();
    if (text[cursor] === "]") {
      cursor += 1;
      return;
    }
    while (true) {
      parseValue();
      skipWhitespace();
      if (text[cursor] === "]") {
        cursor += 1;
        return;
      }
      if (text[cursor] !== ",") invalid();
      cursor += 1;
      skipWhitespace();
    }
  };
  const parseObject = () => {
    cursor += 1;
    skipWhitespace();
    if (text[cursor] === "}") {
      cursor += 1;
      return;
    }
    const keys = new Set();
    while (true) {
      const key = parseString();
      if (keys.has(key)) {
        throw new Error(`${label} contains duplicate JSON object key ${JSON.stringify(key)}`);
      }
      keys.add(key);
      skipWhitespace();
      if (text[cursor] !== ":") invalid();
      cursor += 1;
      parseValue();
      skipWhitespace();
      if (text[cursor] === "}") {
        cursor += 1;
        return;
      }
      if (text[cursor] !== ",") invalid();
      cursor += 1;
      skipWhitespace();
    }
  };
  function parseValue() {
    skipWhitespace();
    const character = text[cursor];
    if (character === "{") parseObject();
    else if (character === "[") parseArray();
    else if (character === "\"") parseString();
    else if (character === "t") parseLiteral("true");
    else if (character === "f") parseLiteral("false");
    else if (character === "n") parseLiteral("null");
    else if (character === "-" || /[0-9]/u.test(character)) parseNumber();
    else invalid();
  }

  parseValue();
  skipWhitespace();
  if (cursor !== text.length) invalid();
}

function parseDirectJson(repoRoot, filePath, label) {
  const bytes = readStableRepoArtifact(repoRoot, filePath, label).bytes;
  const text = bytes.toString("utf8");
  try {
    assertNoDuplicateJsonObjectKeys(text, label);
    return { bytes, value: JSON.parse(text) };
  } catch (error) {
    if (error?.message?.includes("duplicate JSON object key")) throw error;
    throw new Error(`${label} is not valid JSON`);
  }
}

function repoRelative(repoRoot, filePath, label) {
  const relative = path.relative(repoRoot, filePath).split(path.sep).join("/");
  assertCanonicalRepoPath(relative);
  if (path.resolve(repoRoot, relative) !== path.resolve(filePath)) {
    throw new Error(`${label} must remain inside the repository`);
  }
  return relative;
}

function commonDirectory(repoRoot) {
  const value = gitBuffer(["rev-parse", "--git-common-dir"], repoRoot).toString("utf8").trim();
  return fs.realpathSync(path.isAbsolute(value) ? value : path.resolve(repoRoot, value));
}

function currentWorktreeRoots(repoRoot) {
  const roots = listWorktrees(repoRoot).map((entry) => entry.path);
  if (roots.length === 0 || roots.some((root) => typeof root !== "string" || !path.isAbsolute(root))) {
    throw new Error("linked worktree inventory is invalid");
  }
  return roots;
}

function isWithinPath(candidate, parent) {
  const relative = path.relative(parent, candidate);
  return relative === "" || (relative !== ".." && !relative.startsWith(`..${path.sep}`));
}

function canonicalizePossiblyMissingPath(candidate) {
  let cursor = path.resolve(candidate);
  const missingTail = [];
  while (!fs.existsSync(cursor)) {
    const parent = path.dirname(cursor);
    if (parent === cursor) throw new Error(`cannot resolve registered worktree path: ${candidate}`);
    missingTail.unshift(path.basename(cursor));
    cursor = parent;
  }
  return path.join(fs.realpathSync(cursor), ...missingTail);
}

export function resolveDispositionEvidenceRoot({ repoRoot, commonDir, evidenceRoot }) {
  const worktreeRoots = currentWorktreeRoots(repoRoot);
  const resolved = resolveEvidenceRoot({
    repoRoot,
    commonDir: commonDir ?? commonDirectory(repoRoot),
    explicitRoot: evidenceRoot,
    worktreeRoots
  });
  const registeredRoots = worktreeRoots.map(canonicalizePossiblyMissingPath);
  if (registeredRoots.some((root) => isWithinPath(resolved, root) || isWithinPath(root, resolved))) {
    throw new Error("evidence root must be outside the repository, linked worktrees, and Git common directory");
  }
  return resolved;
}

export function readEvidenceRootMarkerArtifact(evidenceRoot, repositoryId) {
  const artifact = readStableDirectArtifact(
    path.join(evidenceRoot, ".mais-evidence-root.json"),
    "evidence root marker",
    { requireMode: 0o600 }
  );
  let marker;
  try {
    marker = JSON.parse(artifact.bytes.toString("utf8"));
  } catch {
    throw new Error("evidence root marker is invalid JSON");
  }
  assertEvidenceRootMarker(marker, { repositoryId });
  return {
    marker,
    binding: {
      sha256: crypto.createHash("sha256").update(artifact.bytes).digest("hex"),
      ...artifact.identity
    }
  };
}

function assertNoUnmergedIndex(repoRoot) {
  if (gitBuffer(["ls-files", "-u", "-z"], repoRoot).length !== 0) {
    throw new Error("unsupported unmerged Git index state");
  }
}

function readCanonicalIndexState(repoRoot) {
  assertNoUnmergedIndex(repoRoot);
  const seen = new Set();
  const entries = parseNul(gitBuffer(["ls-files", "--stage", "-z"], repoRoot)).map((record) => {
    const separator = record.indexOf("\t");
    if (separator <= 0) throw new Error("canonical Git index entry is invalid");
    const match = record.slice(0, separator).match(
      /^([0-7]{6}) ([0-9a-f]{40}|[0-9a-f]{64}) ([0-3])$/u
    );
    if (!match) throw new Error("canonical Git index metadata is invalid");
    const [, mode, objectId, stage] = match;
    const filePath = record.slice(separator + 1);
    assertCanonicalRepoPath(filePath);
    if (stage !== "0") throw new Error("unsupported unmerged Git index stage");
    const identity = `${stage}\0${filePath}`;
    if (seen.has(identity)) throw new Error("canonical Git index contains duplicate entries");
    seen.add(identity);
    return { mode, objectId, stage, path: filePath };
  });
  assertNoUnmergedIndex(repoRoot);
  entries.sort((left, right) => (
    compareUtf8(left.path, right.path)
    || left.stage.localeCompare(right.stage)
    || left.mode.localeCompare(right.mode)
    || left.objectId.localeCompare(right.objectId)
  ));
  const canonical = Buffer.concat(entries.flatMap((entry) => [
    Buffer.from(entry.mode),
    Buffer.from([0]),
    Buffer.from(entry.objectId),
    Buffer.from([0]),
    Buffer.from(entry.stage),
    Buffer.from([0]),
    Buffer.from(entry.path),
    Buffer.from([0])
  ]));
  return {
    entryCount: entries.length,
    sha256: crypto.createHash("sha256").update(canonical).digest("hex")
  };
}

function dispositionFingerprint(manifest) {
  const { dispositionFingerprint: _ignored, ...boundManifest } = manifest;
  return crypto.createHash("sha256").update(stableJson(boundManifest)).digest("hex");
}

function assertDirtyMapSelfOutputCoverage(rows, dirtyMap) {
  if (!dirtyMap || typeof dirtyMap !== "object" || !Array.isArray(dirtyMap.entries)) {
    throw new Error("dirty-map entries are invalid");
  }
  const raw = new Map(rows.map((row) => [row.path, row.status]));
  const mapped = new Map();
  for (const entry of dirtyMap.entries) {
    assertCanonicalRepoPath(entry.path);
    if (typeof entry.status !== "string" || entry.status.length !== 2 || mapped.has(entry.path)) {
      throw new Error("dirty-map entry status/path coverage is invalid");
    }
    mapped.set(entry.path, entry.status);
  }
  const configuredOutputs = Object.values(dirtyMap.outputPaths ?? {});
  assertUniqueStrings(configuredOutputs, "dirtyMap.outputPaths");
  const excludedOutputPaths = configuredOutputs.filter((filePath) => raw.has(filePath)).sort(compareUtf8);
  for (const [filePath, status] of raw) {
    if (excludedOutputPaths.includes(filePath)) continue;
    if (mapped.get(filePath) !== status) {
      throw new Error(`raw status is not covered by dirty-map plus exact self outputs: ${JSON.stringify(filePath)}`);
    }
  }
  for (const [filePath, status] of mapped) {
    if (raw.get(filePath) !== status) {
      throw new Error(`dirty-map contains a stale raw status entry: ${JSON.stringify(filePath)}`);
    }
  }
  return excludedOutputPaths;
}

function buildDispositionManifestUnderBarrier({
  repoRoot,
  ownerManifestPath,
  policyPath,
  dirtyMapPath,
  repositoryId,
  evidenceRootId,
  evidenceRootMarker,
  generatedAt = new Date().toISOString(),
  afterFinalIndexRead = () => {}
}) {
  const initialIndexState = readCanonicalIndexState(repoRoot);
  const ownerArtifact = parseDirectJson(repoRoot, ownerManifestPath, "owner pathspec manifest");
  const policyArtifact = parseDirectJson(repoRoot, policyPath, "closure disposition policy");
  const dirtyMapArtifact = parseDirectJson(repoRoot, dirtyMapPath, "latest dirty-map");
  const built = buildDispositionRowsUnderBarrier({
    repoRoot,
    ownerManifest: ownerArtifact.value,
    policy: policyArtifact.value
  });
  const excludedOutputPaths = assertDirtyMapSelfOutputCoverage(built.rows, dirtyMapArtifact.value);
  if (typeof dirtyMapArtifact.value.statusSignature !== "string" || !/^[0-9a-f]{64}$/u.test(dirtyMapArtifact.value.statusSignature)) {
    throw new Error("dirty-map status signature is invalid");
  }
  const manifest = {
    schemaVersion: 1,
    generatedAt,
    repositoryId,
    evidenceRootId,
    evidenceRootMarker,
    head: gitBuffer(["rev-parse", "HEAD"], repoRoot).toString("utf8").trim(),
    indexState: initialIndexState,
    ownerPathspecs: {
      path: repoRelative(repoRoot, ownerManifestPath, "owner pathspec manifest"),
      sha256: crypto.createHash("sha256").update(ownerArtifact.bytes).digest("hex")
    },
    policy: {
      path: repoRelative(repoRoot, policyPath, "closure disposition policy"),
      sha256: crypto.createHash("sha256").update(policyArtifact.bytes).digest("hex")
    },
    dirtyMap: {
      path: repoRelative(repoRoot, dirtyMapPath, "latest dirty-map"),
      sha256: crypto.createHash("sha256").update(dirtyMapArtifact.bytes).digest("hex"),
      statusSignature: dirtyMapArtifact.value.statusSignature,
      excludedOutputPaths
    },
    rawStatusSignature: built.rawStatusSignature,
    dispositionFingerprint: "",
    coverage: built.coverage,
    rows: built.rows
  };
  manifest.dispositionFingerprint = dispositionFingerprint(manifest);
  const finalIndexState = readCanonicalIndexState(repoRoot);
  if (stableJson(finalIndexState) !== stableJson(initialIndexState)) {
    throw new Error("canonical Git index changed while building the disposition manifest");
  }
  afterFinalIndexRead();
  return manifest;
}

export function buildDispositionManifest(options) {
  return withRepoMutationBarrier(
    options.repoRoot,
    () => buildDispositionManifestUnderBarrier(options)
  );
}

export function writeDispositionReport({
  repoRoot,
  evidenceRoot,
  ownerManifestPath,
  policyPath,
  dirtyMapPath,
  generatedAt = new Date().toISOString()
}) {
  const commonDir = commonDirectory(repoRoot);
  const repositoryId = repositoryIdentity(commonDir);
  const resolvedEvidenceRoot = resolveDispositionEvidenceRoot({
    repoRoot,
    commonDir,
    evidenceRoot
  });
  const marker = ensureEvidenceRoot({ evidenceRoot: resolvedEvidenceRoot, repositoryId });
  const markerArtifact = readEvidenceRootMarkerArtifact(resolvedEvidenceRoot, repositoryId);
  if (markerArtifact.marker.rootId !== marker.rootId) {
    throw new Error("evidence root marker changed before disposition generation");
  }
  const manifest = buildDispositionManifest({
    repoRoot,
    ownerManifestPath,
    policyPath,
    dirtyMapPath,
    repositoryId,
    evidenceRootId: marker.rootId,
    evidenceRootMarker: markerArtifact.binding,
    generatedAt
  });
  return writeEvidenceReport({
    evidenceRoot: resolvedEvidenceRoot,
    evidenceRootId: marker.rootId,
    filename: "mais-closure-disposition-v1.json",
    payload: manifest
  });
}

function assertCanonicalRepoPath(filePath) {
  if (
    typeof filePath !== "string" ||
    filePath.length === 0 ||
    filePath.includes("\0") ||
    path.posix.isAbsolute(filePath) ||
    filePath.split("/").some((part) => part === "" || part === "." || part === "..")
  ) {
    throw new Error(`dirty status path is not a canonical repo-relative path: ${JSON.stringify(filePath)}`);
  }
}

function sameIdentity(left, right) {
  return left.dev === right.dev &&
    left.ino === right.ino &&
    left.mode === right.mode &&
    left.nlink === right.nlink &&
    left.size === right.size &&
    left.mtimeNs === right.mtimeNs &&
    left.ctimeNs === right.ctimeNs;
}

function identityRecord(stat) {
  return {
    dev: String(stat.dev),
    ino: String(stat.ino),
    mode: String(stat.mode),
    nlink: String(stat.nlink),
    size: String(stat.size),
    mtimeNs: String(stat.mtimeNs),
    ctimeNs: String(stat.ctimeNs)
  };
}

function matchesIdentityRecord(stat, record) {
  return stableJson(identityRecord(stat)) === stableJson(record);
}

function lstatBigInt(absolutePath, label) {
  try {
    return fs.lstatSync(absolutePath, { bigint: true });
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw new Error(`${label} cannot be inspected safely (${error.message})`);
  }
}

function assertSecureRepoRoot(repoRoot) {
  if (typeof repoRoot !== "string" || !path.isAbsolute(repoRoot)) {
    throw new Error("repository root must be an absolute direct directory");
  }
  const rootStat = lstatBigInt(repoRoot, "repository root");
  if (!rootStat || rootStat.isSymbolicLink() || !rootStat.isDirectory()) {
    throw new Error("repository root must be an absolute direct directory, not a symlink");
  }
  return rootStat;
}

function captureSecureAncestors(repoRoot, filePath, { allowMissing = false } = {}) {
  assertCanonicalRepoPath(filePath);
  const rootStat = assertSecureRepoRoot(repoRoot);
  const records = [{ relativePath: "", identity: identityRecord(rootStat) }];
  let cursor = repoRoot;
  const components = filePath.split("/");
  for (const [index, component] of components.slice(0, -1).entries()) {
    cursor = path.join(cursor, component);
    const stat = lstatBigInt(cursor, "dirty path ancestor");
    if (stat === null) {
      if (!allowMissing) {
        throw new Error(`dirty path ancestor is missing: ${JSON.stringify(filePath)}`);
      }
      return {
        absolutePath: path.join(repoRoot, ...components),
        records,
        missingAncestor: components.slice(0, index + 1).join("/")
      };
    }
    if (stat.isSymbolicLink() || !stat.isDirectory()) {
      throw new Error(`dirty path ancestor is an unsafe symlink or non-directory: ${JSON.stringify(filePath)}`);
    }
    records.push({
      relativePath: components.slice(0, index + 1).join("/"),
      identity: identityRecord(stat)
    });
  }
  return {
    absolutePath: path.join(repoRoot, ...components),
    records,
    missingAncestor: null
  };
}

function revalidateSecureAncestors(repoRoot, filePath, captured) {
  for (const record of captured.records) {
    const absolutePath = record.relativePath === ""
      ? repoRoot
      : path.join(repoRoot, ...record.relativePath.split("/"));
    const stat = lstatBigInt(absolutePath, "dirty path ancestor revalidation");
    if (!stat || stat.isSymbolicLink() || !stat.isDirectory() || !matchesIdentityRecord(stat, record.identity)) {
      throw new Error(`dirty path ancestor changed while hashing or during revalidation: ${JSON.stringify(filePath)}`);
    }
  }
  if (captured.missingAncestor !== null) {
    const missingPath = path.join(repoRoot, ...captured.missingAncestor.split("/"));
    if (lstatBigInt(missingPath, "missing dirty path ancestor revalidation") !== null) {
      throw new Error(`dirty path ancestor changed while hashing or during revalidation: ${JSON.stringify(filePath)}`);
    }
  }
}

function assertStatusPathSafety(repoRoot, entry) {
  const allowMissing = entry.status.includes("D");
  const ancestors = captureSecureAncestors(repoRoot, entry.path, { allowMissing });
  if (ancestors.missingAncestor !== null) return;
  const leaf = lstatBigInt(ancestors.absolutePath, "dirty status path");
  if (leaf === null) {
    if (!allowMissing) throw new Error(`dirty status path is missing: ${JSON.stringify(entry.path)}`);
    return;
  }
  if (leaf.isSymbolicLink() || !leaf.isFile()) {
    throw new Error(`dirty status path must be a direct regular file, not a symlink: ${JSON.stringify(entry.path)}`);
  }
}

function assertOriginalPathSafety(repoRoot, originalPath) {
  const ancestors = captureSecureAncestors(repoRoot, originalPath, { allowMissing: true });
  if (ancestors.missingAncestor !== null) return;
  const leaf = lstatBigInt(ancestors.absolutePath, "rename source path");
  if (leaf !== null && (leaf.isSymbolicLink() || !leaf.isFile())) {
    throw new Error(`rename source path must be missing or a direct regular file: ${JSON.stringify(originalPath)}`);
  }
}

export function readRawStatus(repoRoot) {
  assertNoUnmergedIndex(repoRoot);
  const entries = parseStatusPorcelainZ(
    gitBuffer(["status", "--porcelain=v1", "-z", "-uall"], repoRoot)
  );
  assertNoUnmergedIndex(repoRoot);
  const unmergedStatuses = new Set(["DD", "AU", "UD", "UA", "DU", "AA", "UU"]);
  return entries.map((entry) => {
    assertCanonicalRepoPath(entry.path);
    if (unmergedStatuses.has(entry.xy) || /U/u.test(entry.xy)) {
      throw new Error(`unsupported unmerged dirty status ${JSON.stringify(entry.xy)} for ${JSON.stringify(entry.path)}`);
    }
    if (/[RC]/u.test(entry.xy) !== (entry.originalPath !== undefined)) {
      throw new Error(`rename/copy status source semantics are invalid for ${JSON.stringify(entry.path)}`);
    }
    const normalized = {
      status: entry.xy,
      path: entry.path,
      ...(entry.originalPath === undefined ? {} : { originalPath: entry.originalPath })
    };
    assertStatusPathSafety(repoRoot, normalized);
    if (entry.originalPath !== undefined) {
      assertCanonicalRepoPath(entry.originalPath);
      assertOriginalPathSafety(repoRoot, entry.originalPath);
    }
    return normalized;
  });
}

function deletedDispositionSha256(entry) {
  return crypto.createHash("sha256")
    .update(
      `MAIS-DISPOSITION-DELETED-V1\0${entry.status}\0${entry.path}`
      + (entry.originalPath === undefined ? "" : `\0${entry.originalPath}`)
    )
    .digest("hex");
}

function captureDispositionPath(repoRoot, entry, { afterRead = () => {} } = {}) {
  const ancestors = captureSecureAncestors(repoRoot, entry.path, {
    allowMissing: entry.status.includes("D")
  });
  const initial = ancestors.missingAncestor === null
    ? lstatBigInt(ancestors.absolutePath, "dirty path")
    : null;
  if (initial === null) {
    if (!entry.status.includes("D")) {
      throw new Error(`dirty path is missing while hashing: ${JSON.stringify(entry.path)}`);
    }
    afterRead();
    revalidateSecureAncestors(repoRoot, entry.path, ancestors);
    if (lstatBigInt(ancestors.absolutePath, "deleted dirty path revalidation") !== null) {
      throw new Error(`deleted dirty path changed while hashing: ${JSON.stringify(entry.path)}`);
    }
    return { kind: "deleted", sha256: deletedDispositionSha256(entry), ancestors };
  }
  if (entry.status.includes("D")) {
    throw new Error(`deleted dirty path unexpectedly exists: ${JSON.stringify(entry.path)}`);
  }
  if (initial.isSymbolicLink() || !initial.isFile() || initial.nlink !== 1n) {
    throw new Error(`dirty path must be a direct regular file with one link, not a symlink: ${JSON.stringify(entry.path)}`);
  }
  if (!Number.isInteger(fs.constants.O_NOFOLLOW)) {
    throw new Error("disposition hashing requires O_NOFOLLOW support");
  }

  const descriptor = fs.openSync(
    ancestors.absolutePath,
    fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW
  );
  try {
    const before = fs.fstatSync(descriptor, { bigint: true });
    if (!before.isFile() || !sameIdentity(initial, before)) {
      throw new Error(`dirty path changed before hashing: ${JSON.stringify(entry.path)}`);
    }
    const hash = crypto.createHash("sha256");
    const buffer = Buffer.allocUnsafe(1024 * 1024);
    let bytesReadTotal = 0n;
    while (true) {
      const bytesRead = fs.readSync(descriptor, buffer, 0, buffer.length, null);
      if (bytesRead === 0) break;
      bytesReadTotal += BigInt(bytesRead);
      hash.update(buffer.subarray(0, bytesRead));
    }
    afterRead();
    const after = fs.fstatSync(descriptor, { bigint: true });
    const final = fs.lstatSync(ancestors.absolutePath, { bigint: true });
    revalidateSecureAncestors(repoRoot, entry.path, ancestors);
    if (
      bytesReadTotal !== before.size ||
      !sameIdentity(before, after) ||
      !sameIdentity(after, final)
    ) {
      throw new Error(`dirty path changed while hashing: ${JSON.stringify(entry.path)}`);
    }
    return {
      kind: "file",
      sha256: hash.digest("hex"),
      identity: identityRecord(before),
      ancestors
    };
  } finally {
    fs.closeSync(descriptor);
  }
}

function revalidateDispositionPath(repoRoot, entry, captured) {
  revalidateSecureAncestors(repoRoot, entry.path, captured.ancestors);
  if (captured.kind === "deleted") {
    if (lstatBigInt(captured.ancestors.absolutePath, "deleted dirty path final revalidation") !== null) {
      throw new Error(`deleted dirty path changed after hashing: ${JSON.stringify(entry.path)}`);
    }
    if (captured.sha256 !== deletedDispositionSha256(entry)) {
      throw new Error(`deleted dirty path hash changed after hashing: ${JSON.stringify(entry.path)}`);
    }
    return;
  }
  const descriptor = fs.openSync(
    captured.ancestors.absolutePath,
    fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW
  );
  try {
    const before = fs.fstatSync(descriptor, { bigint: true });
    if (!before.isFile() || !matchesIdentityRecord(before, captured.identity)) {
      throw new Error(`dirty path metadata changed after hashing: ${JSON.stringify(entry.path)}`);
    }
    const hash = crypto.createHash("sha256");
    const buffer = Buffer.allocUnsafe(1024 * 1024);
    let bytesReadTotal = 0n;
    while (true) {
      const bytesRead = fs.readSync(descriptor, buffer, 0, buffer.length, null);
      if (bytesRead === 0) break;
      bytesReadTotal += BigInt(bytesRead);
      hash.update(buffer.subarray(0, bytesRead));
    }
    const after = fs.fstatSync(descriptor, { bigint: true });
    const final = fs.lstatSync(captured.ancestors.absolutePath, { bigint: true });
    revalidateSecureAncestors(repoRoot, entry.path, captured.ancestors);
    if (
      bytesReadTotal !== before.size ||
      !sameIdentity(before, after) ||
      !sameIdentity(after, final) ||
      !matchesIdentityRecord(after, captured.identity) ||
      hash.digest("hex") !== captured.sha256
    ) {
      throw new Error(`dirty path bytes or metadata changed after hashing: ${JSON.stringify(entry.path)}`);
    }
  } finally {
    fs.closeSync(descriptor);
  }
}

export function hashDispositionPath(repoRoot, entry, options = {}) {
  return captureDispositionPath(repoRoot, entry, options).sha256;
}

const GENERATOR_HELP = `Usage: node coordination/release-intake/generate-closure-disposition-manifest.mjs [options]

Options:
  --repo-root <absolute-path>
  --evidence-root <absolute-path>
  --owner-manifest <path>
  --policy <path>
  --dirty-map <path>
  --generated-at <ISO-8601>
  --help
`;

function requireCliOptionValue(argv, index, option) {
  const value = argv[index + 1];
  if (typeof value !== "string" || value.length === 0 || value.startsWith("--")) {
    throw new Error(`${option} requires a value`);
  }
  return value;
}

function parseGeneratorArgs(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help") options.help = true;
    else if (arg === "--repo-root") options.repoRoot = requireCliOptionValue(argv, index++, arg);
    else if (arg === "--evidence-root") options.evidenceRoot = requireCliOptionValue(argv, index++, arg);
    else if (arg === "--owner-manifest") options.ownerManifestPath = requireCliOptionValue(argv, index++, arg);
    else if (arg === "--policy") options.policyPath = requireCliOptionValue(argv, index++, arg);
    else if (arg === "--dirty-map") options.dirtyMapPath = requireCliOptionValue(argv, index++, arg);
    else if (arg === "--generated-at") options.generatedAt = requireCliOptionValue(argv, index++, arg);
    else throw new Error(`unknown generator argument: ${arg}`);
  }
  return options;
}

function resolveGeneratorOptions(options) {
  const defaultRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
  const repoRoot = path.resolve(options.repoRoot ?? defaultRoot);
  const commonDir = commonDirectory(repoRoot);
  const evidenceRoot = resolveDispositionEvidenceRoot({
    repoRoot,
    commonDir,
    evidenceRoot: options.evidenceRoot ?? process.env.MAIS_EVIDENCE_ROOT
  });
  const fromRepo = (value, fallback) => path.resolve(repoRoot, value ?? fallback);
  return {
    repoRoot,
    commonDir,
    evidenceRoot,
    ownerManifestPath: fromRepo(options.ownerManifestPath, "coordination/release-intake/owner-pathspecs.json"),
    policyPath: fromRepo(options.policyPath, "coordination/release-intake/closure-disposition-policy.json"),
    dirtyMapPath: fromRepo(options.dirtyMapPath, "coordination/release-intake/latest-A25-dirty-tree-map.json"),
    generatedAt: options.generatedAt
  };
}

function generatorMain(argv) {
  const parsed = parseGeneratorArgs(argv);
  if (parsed.help) {
    process.stdout.write(GENERATOR_HELP);
    return;
  }
  const options = resolveGeneratorOptions(parsed);
  const assertLockHealthy = () => assertEvidenceWriterLockOwned({ commonDir: options.commonDir });
  try {
    assertLockHealthy();
  } catch {
    runEvidenceWriterUnderLock({
      commonDir: options.commonDir,
      scriptPath: fileURLToPath(import.meta.url),
      args: argv
    });
    return;
  }
  const reportPath = writeDispositionReport(options);
  assertLockHealthy();
  process.stdout.write(`${JSON.stringify({ reportPath }, null, 2)}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    generatorMain(process.argv.slice(2));
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}
