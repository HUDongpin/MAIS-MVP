#!/usr/bin/env node

import { spawn } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import {
  chmodSync,
  closeSync,
  constants as fsConstants,
  fstatSync,
  fsyncSync,
  linkSync,
  lstatSync,
  mkdirSync,
  openSync,
  readFileSync,
  realpathSync,
  renameSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { isDeepStrictEqual } from "node:util";
import {
  HK_VISUALIZATION_OWNED_PROCESS_LEDGER_BOUNDED_POLLING_LIMITATION,
  HK_VISUALIZATION_OWNED_PROCESS_LEDGER_CLEANUP_BUDGET_MS,
  HK_VISUALIZATION_OWNED_PROCESS_LEDGER_MONOTONIC_CLOCK,
  HK_VISUALIZATION_OWNED_PROCESS_LEDGER_POLL_MS,
  HK_VISUALIZATION_OWNED_PROCESS_LEDGER_PS_ARGS,
  HK_VISUALIZATION_OWNED_PROCESS_LEDGER_PS_MAX_BUFFER,
  HK_VISUALIZATION_OWNED_PROCESS_LEDGER_PS_TIMEOUT_MS,
  HK_VISUALIZATION_OWNED_PROCESS_LEDGER_SCHEMA,
  cleanupHkVisualizationOwnedProcessLedger,
  computeHkVisualizationLiveOwnedProcessEntries,
  sampleHkVisualizationOwnedProcessTable,
  seedHkVisualizationOwnedProcessLedger,
  updateHkVisualizationOwnedProcessLedger,
  verifyHkVisualizationProcessObserver,
} from "./hk-visualization-owned-process-ledger.mjs";
import {
  assertHkVisualizationStarshipPath,
  validateHkVisualizationStarshipPathManifest,
} from "./hk-visualization-starship-path-contract.mjs";

const supervisorSourcePath = fileURLToPath(import.meta.url);
const supervisorSourceDirectory = dirname(supervisorSourcePath);
const boundSourcePaths = Object.freeze({
  pathContract: resolve(
    supervisorSourceDirectory,
    "hk-visualization-starship-path-contract.mjs",
  ),
  releaseRunner: resolve(
    supervisorSourceDirectory,
    "run-hk-visualization-release-gate.mjs",
  ),
  ownedProcessLedger: resolve(
    supervisorSourceDirectory,
    "hk-visualization-owned-process-ledger.mjs",
  ),
  supervisor: supervisorSourcePath,
});

export const HK_VISUALIZATION_WORKLOAD_SUPERVISOR_SCHEMA =
  "hk-viz-workload-supervisor-v5";
export const HK_VISUALIZATION_PARENT_POLL_MS = 100;
export const HK_VISUALIZATION_WORKLOAD_OWNERSHIP_READY_MS = 10_000;
export const HK_VISUALIZATION_WORKLOAD_CLEANUP_OUTER_GRACE_MS = 30_000;
export const HK_VISUALIZATION_WORKLOAD_CLEANUP_POST_RESERVE_MS = 10_000;
export const HK_VISUALIZATION_WORKLOAD_CLEANUP_MAX_BUDGET_MS =
  HK_VISUALIZATION_OWNED_PROCESS_LEDGER_CLEANUP_BUDGET_MS;
export const HK_VISUALIZATION_WORKLOAD_START_BARRIER_SHELL = "/bin/sh";
export const HK_VISUALIZATION_WORKLOAD_START_BARRIER_PROGRAM =
  'kill -STOP "$$"; exec "$@"';

const requiredPathArguments = Object.freeze([
  ["--manifest", "manifestPath"],
  ["--receipt", "receiptPath"],
  ["--ready", "readyPath"],
  ["--start", "startPath"],
  ["--pid", "pidPath"],
  ["--leader", "leaderPath"],
  ["--next-env-snapshot", "nextEnvSnapshotPath"],
]);
const SOURCE_HASH_KEYS = Object.freeze([
  "pathContract",
  "releaseRunner",
  "ownedProcessLedger",
  "supervisor",
]);
const PROCESS_ENTRY_KEYS = Object.freeze([
  "pid",
  "ppid",
  "pgid",
  "lstartToken",
  "state",
  "executableSha256",
]);
const LEDGER_IDENTITY_KEYS = Object.freeze([
  "pid",
  "lstartToken",
  "firstSeenPpid",
  "firstSeenPgid",
  "lastPpid",
  "lastPgid",
  "state",
  "executableSha256",
  "discoveredFromPid",
  "discoveredFromLstartToken",
]);
const LEDGER_KEYS = Object.freeze([
  "schemaVersion",
  "revision",
  "leader",
  "identities",
  "boundedPollingLimitation",
]);
const LSTART_PATTERN =
  /^(?:Sun|Mon|Tue|Wed|Thu|Fri|Sat) (?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) (?:0[1-9]|[12][0-9]|3[01]) (?:[01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9] [0-9]{4}$/;
const STATE_PATTERN = /^(?:[A-Za-z][A-Za-z0-9+<>()?]*|\?)$/;
const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const NEXT_TSCONFIG_IDENTITY_KEYS = Object.freeze([
  "device",
  "inode",
  "mode",
  "size",
  "sha256",
]);
const NEXT_TSCONFIG_EVIDENCE_KEYS = Object.freeze([
  "expectedSha256",
  "preimage",
  "disposition",
  "removed",
]);

function isPlainObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function canonicalJson(value) {
  if (value === null || typeof value === "boolean" || typeof value === "string")
    return JSON.stringify(value);
  if (typeof value === "number") {
    if (!Number.isFinite(value))
      throw new Error("Workload supervisor evidence numbers must be finite.");
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (!isPlainObject(value))
    throw new Error("Workload supervisor evidence must be canonical JSON data.");
  return `{${Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
    .join(",")}}`;
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function safeArgumentFingerprint(value) {
  const text = String(value ?? "");
  return `length=${Buffer.byteLength(text, "utf8")},sha256=${sha256(text)}`;
}

function sha256Canonical(value) {
  return sha256(canonicalJson(value));
}

export function hashHkVisualizationWorkloadSupervisorSources() {
  return Object.freeze(
    Object.fromEntries(
      Object.entries(boundSourcePaths).map(([key, path]) => [
        key,
        sha256(readFileSync(path)),
      ]),
    ),
  );
}

function safeError(error) {
  if (error instanceof Error) return error.message;
  return typeof error === "string" ? error : "unknown workload supervisor error";
}

function exactObjectKeys(value, expected) {
  return (
    isPlainObject(value) &&
    isDeepStrictEqual(Object.keys(value).sort(), [...expected].sort())
  );
}

function pathIsStrictlyInside(candidate, root) {
  const child = relative(root, candidate);
  return child !== "" && !child.startsWith("..") && !isAbsolute(child);
}

function pathEntryExists(candidate) {
  try {
    lstatSync(candidate);
    return true;
  } catch (error) {
    if (error && typeof error === "object" && error.code === "ENOENT")
      return false;
    throw error;
  }
}

function captureStableRegularFileIdentity(
  candidate,
  {
    label,
    expectedSha256 = null,
    expectedMode = null,
    expectedDevice = null,
  },
) {
  assertHkVisualizationStarshipPath(label, candidate);
  const before = lstatSync(candidate, { bigint: true });
  if (before.isSymbolicLink() || !before.isFile() || before.nlink !== 1n) {
    throw new Error(`${label} must be one regular non-symlink file.`);
  }
  const noFollow = fsConstants.O_NOFOLLOW;
  if (!Number.isInteger(noFollow)) {
    throw new Error(`${label} cannot be read fail-closed because O_NOFOLLOW is unavailable.`);
  }
  const descriptor = openSync(candidate, fsConstants.O_RDONLY | noFollow);
  try {
    const openedBefore = fstatSync(descriptor, { bigint: true });
    if (
      !openedBefore.isFile() ||
      openedBefore.nlink !== 1n ||
      openedBefore.dev !== before.dev ||
      openedBefore.ino !== before.ino
    ) {
      throw new Error(`${label} changed identity while it was opened.`);
    }
    const bytes = readFileSync(descriptor);
    const openedAfter = fstatSync(descriptor, { bigint: true });
    const after = lstatSync(candidate, { bigint: true });
    if (
      after.isSymbolicLink() ||
      !after.isFile() ||
      after.nlink !== 1n ||
      openedAfter.dev !== openedBefore.dev ||
      openedAfter.ino !== openedBefore.ino ||
      openedAfter.size !== openedBefore.size ||
      openedAfter.mtimeNs !== openedBefore.mtimeNs ||
      openedAfter.ctimeNs !== openedBefore.ctimeNs ||
      after.dev !== openedAfter.dev ||
      after.ino !== openedAfter.ino ||
      after.size !== openedAfter.size ||
      after.mtimeNs !== openedAfter.mtimeNs ||
      after.ctimeNs !== openedAfter.ctimeNs
    ) {
      throw new Error(`${label} changed while it was read.`);
    }
    const identity = Object.freeze({
      device: openedAfter.dev.toString(),
      inode: openedAfter.ino.toString(),
      mode: Number(openedAfter.mode & 0o777n),
      size: Number(openedAfter.size),
      sha256: sha256(bytes),
    });
    if (expectedMode !== null && identity.mode !== expectedMode) {
      throw new Error(`${label} mode must be ${expectedMode.toString(8)}.`);
    }
    if (expectedDevice !== null && identity.device !== String(expectedDevice)) {
      throw new Error(`${label} device identity drifted from the Starship volume.`);
    }
    if (expectedSha256 !== null && identity.sha256 !== expectedSha256) {
      throw new Error(`${label} byte hash drifted.`);
    }
    return identity;
  } finally {
    closeSync(descriptor);
  }
}

function sameRegularFileIdentity(left, right) {
  return (
    left.device === right.device &&
    left.inode === right.inode &&
    left.mode === right.mode &&
    left.size === right.size &&
    left.sha256 === right.sha256
  );
}

function removeOwnedNextTsconfig(candidate, preimage) {
  if (!pathEntryExists(candidate)) {
    return Object.freeze({
      expectedSha256: preimage.sha256,
      preimage: { ...preimage },
      disposition: "removed-by-workload",
      removed: true,
    });
  }
  const current = captureStableRegularFileIdentity(candidate, {
    label: "workload supervisor run-specific tsconfig cleanup target",
    expectedMode: 0o600,
  });
  if (!sameRegularFileIdentity(current, preimage)) {
    return Object.freeze({
      expectedSha256: preimage.sha256,
      preimage: { ...preimage },
      disposition: "identity-drift",
      removed: false,
    });
  }
  const immediatelyBeforeUnlink = captureStableRegularFileIdentity(candidate, {
    label: "workload supervisor run-specific tsconfig pre-unlink target",
    expectedMode: 0o600,
    expectedSha256: preimage.sha256,
  });
  if (!sameRegularFileIdentity(immediatelyBeforeUnlink, preimage)) {
    return Object.freeze({
      expectedSha256: preimage.sha256,
      preimage: { ...preimage },
      disposition: "identity-drift",
      removed: false,
    });
  }
  unlinkSync(candidate);
  const removed = !pathEntryExists(candidate);
  return Object.freeze({
    expectedSha256: preimage.sha256,
    preimage: { ...preimage },
    disposition: removed ? "removed-by-supervisor" : "remove-failed",
    removed,
  });
}

function writeExclusiveTemporaryFile(destination, contents) {
  mkdirSync(dirname(destination), { recursive: true });
  const temporaryPath = resolve(
    dirname(destination),
    `.${basename(destination)}.${process.pid}.${Date.now()}.${Math.random()
      .toString(16)
      .slice(2)}.tmp`,
  );
  assertHkVisualizationStarshipPath(
    "workload supervisor atomic temporary file",
    temporaryPath,
  );
  const options = { flag: "wx", mode: 0o600 };
  writeFileSync(
    temporaryPath,
    contents,
    Buffer.isBuffer(contents) ? options : { ...options, encoding: "utf8" },
  );
  const fileDescriptor = openSync(temporaryPath, "r");
  try {
    fsyncSync(fileDescriptor);
  } finally {
    closeSync(fileDescriptor);
  }
  return temporaryPath;
}

function atomicWrite(destination, contents) {
  const temporaryPath = writeExclusiveTemporaryFile(destination, contents);
  try {
    linkSync(temporaryPath, destination);
  } finally {
    unlinkSync(temporaryPath);
  }
}

function atomicReplace(destination, contents, mode) {
  const temporaryPath = writeExclusiveTemporaryFile(destination, contents);
  try {
    chmodSync(temporaryPath, mode);
    renameSync(temporaryPath, destination);
  } catch (error) {
    rmSync(temporaryPath, { force: true });
    throw error;
  }
}

export function hashHkVisualizationWorkloadCommand(command, args) {
  if (typeof command !== "string" || !command.trim())
    throw new Error("Supervised workload command must be non-empty.");
  if (!Array.isArray(args) || args.some((value) => typeof value !== "string"))
    throw new Error("Supervised workload arguments must be strings.");
  return sha256Canonical({ args, command });
}

function assertExactManagedPlaywrightCommand(parsed, manifest) {
  const expectedNode = realpathSync(process.execPath);
  if (parsed.command !== process.execPath) {
    throw new Error("Workload supervisor command path must equal process.execPath.");
  }
  let actualNode;
  try {
    actualNode = realpathSync(parsed.command);
  } catch {
    throw new Error("Workload supervisor Node executable identity is unavailable.");
  }
  if (actualNode !== expectedNode) {
    throw new Error("Workload supervisor command must be this exact Node executable.");
  }
  const expectedCli = resolve(
    manifest.workspace,
    "node_modules/@playwright/test/cli.js",
  );
  if (parsed.args[0] !== expectedCli) {
    throw new Error("Workload supervisor first argument must be the exact Playwright CLI path.");
  }
  assertHkVisualizationStarshipPath(
    "workload supervisor Playwright CLI",
    expectedCli,
  );
  const cliMetadata = lstatSync(expectedCli, { bigint: true });
  if (cliMetadata.isSymbolicLink() || !cliMetadata.isFile()) {
    throw new Error("Workload supervisor Playwright CLI must be a regular non-symlink file.");
  }
  const cliRealpath = realpathSync(expectedCli);
  if (cliRealpath !== expectedCli) {
    throw new Error("Workload supervisor Playwright CLI realpath drifted.");
  }
  return Object.freeze({ node: actualNode, playwrightCli: cliRealpath });
}

export function resolveHkVisualizationWorkloadSupervisorPaths({
  manifest,
  manifestPath,
  receiptPath,
  readyPath,
  startPath,
  pidPath,
  leaderPath,
  nextEnvSnapshotPath,
}) {
  const manifestIssues = validateHkVisualizationStarshipPathManifest(manifest);
  if (manifestIssues.length > 0) {
    throw new Error(
      `Workload supervisor received an invalid Starship path manifest: ${manifestIssues.join("; ")}.`,
    );
  }
  const candidates = {
    manifestPath: assertHkVisualizationStarshipPath(
      "workload supervisor manifest",
      manifestPath,
    ),
    receiptPath: assertHkVisualizationStarshipPath(
      "workload supervisor receipt",
      receiptPath,
    ),
    readyPath: assertHkVisualizationStarshipPath(
      "workload supervisor ready evidence",
      readyPath,
    ),
    startPath: assertHkVisualizationStarshipPath(
      "workload supervisor start signal",
      startPath,
    ),
    pidPath: assertHkVisualizationStarshipPath(
      "workload supervisor pid",
      pidPath,
    ),
    leaderPath: assertHkVisualizationStarshipPath(
      "workload supervisor leader",
      leaderPath,
    ),
    nextEnvSnapshotPath: assertHkVisualizationStarshipPath(
      "workload supervisor next-env snapshot",
      nextEnvSnapshotPath,
    ),
  };
  const expected = {
    manifestPath: manifest.pathManifestFile,
    receiptPath: manifest.workloadSupervisorReceiptPath,
    readyPath: manifest.workloadSupervisorReadyPath,
    startPath: manifest.workloadSupervisorStartPath,
    pidPath: manifest.workloadSupervisorPidPath,
    leaderPath: manifest.workloadSupervisorLeaderPath,
    nextEnvSnapshotPath: manifest.workloadSupervisorNextEnvSnapshotPath,
  };
  if (
    manifest.workloadSupervisorDir !==
    resolve(manifest.artifactRoot, "workload-supervisor")
  ) {
    throw new Error(
      `Workload supervisor directory must equal ${resolve(manifest.artifactRoot, "workload-supervisor")}.`,
    );
  }
  for (const key of Object.keys(expected)) {
    if (candidates[key] !== expected[key]) {
      throw new Error(
        `Workload supervisor ${key} must equal ${expected[key]}; received a different path.`,
      );
    }
    if (
      key !== "manifestPath" &&
      !pathIsStrictlyInside(candidates[key], manifest.workloadSupervisorDir)
    ) {
      throw new Error(
        `Workload supervisor ${key} must stay inside ${manifest.workloadSupervisorDir}.`,
      );
    }
  }
  if (new Set(Object.values(candidates)).size !== Object.keys(candidates).length)
    throw new Error("Workload supervisor control paths must be distinct.");
  return Object.freeze(candidates);
}

export function parseHkVisualizationWorkloadSupervisorArgs(argv) {
  if (!Array.isArray(argv))
    throw new Error("Workload supervisor argv must be an array.");
  const separatorIndex = argv.indexOf("--");
  if (separatorIndex < 0 || separatorIndex === argv.length - 1)
    throw new Error("Workload supervisor requires -- followed by one command.");
  const controlArgs = argv.slice(0, separatorIndex);
  const workload = argv.slice(separatorIndex + 1);
  if (controlArgs.length % 2 !== 0)
    throw new Error("Workload supervisor control arguments must be --name value pairs.");
  const parsed = {};
  for (let index = 0; index < controlArgs.length; index += 2) {
    const flag = controlArgs[index];
    const value = controlArgs[index + 1];
    const pathEntry = requiredPathArguments.find(([name]) => name === flag);
    const scalarKey =
      flag === "--runner-pid"
        ? "runnerPid"
        : flag === "--deadline-epoch-ms"
          ? "deadlineEpochMs"
        : flag === "--command-hash"
          ? "commandHash"
          : flag === "--next-tsconfig-sha256"
            ? "nextTsconfigSha256"
          : flag === "--path-contract-source-hash"
            ? "pathContractSourceHash"
            : flag === "--release-runner-source-hash"
              ? "releaseRunnerSourceHash"
              : flag === "--owned-process-ledger-source-hash"
                ? "ownedProcessLedgerSourceHash"
                : flag === "--supervisor-source-hash"
                  ? "supervisorSourceHash"
                  : null;
    const key = pathEntry?.[1] ?? scalarKey;
    if (!key)
      throw new Error(
        `Workload supervisor rejected an unknown control argument at pair ${index / 2} (${safeArgumentFingerprint(flag)}).`,
      );
    if (Object.prototype.hasOwnProperty.call(parsed, key))
      throw new Error(
        `Workload supervisor received a duplicate recognized control argument at pair ${index / 2}.`,
      );
    if (typeof value !== "string" || !value.trim())
      throw new Error(
        `Workload supervisor control value at pair ${index / 2} must be non-empty (${safeArgumentFingerprint(value)}).`,
      );
    parsed[key] = value;
  }
  for (const [flag, key] of requiredPathArguments) {
    if (!Object.prototype.hasOwnProperty.call(parsed, key))
      throw new Error(`Workload supervisor requires ${flag}.`);
  }
  for (const [flag, key] of [
    ["--runner-pid", "runnerPid"],
    ["--deadline-epoch-ms", "deadlineEpochMs"],
    ["--command-hash", "commandHash"],
    ["--next-tsconfig-sha256", "nextTsconfigSha256"],
    ["--path-contract-source-hash", "pathContractSourceHash"],
    ["--release-runner-source-hash", "releaseRunnerSourceHash"],
    ["--owned-process-ledger-source-hash", "ownedProcessLedgerSourceHash"],
    ["--supervisor-source-hash", "supervisorSourceHash"],
  ]) {
    if (!Object.prototype.hasOwnProperty.call(parsed, key))
      throw new Error(`Workload supervisor requires ${flag}.`);
  }
  const runnerPid = Number(parsed.runnerPid);
  if (!Number.isSafeInteger(runnerPid) || runnerPid <= 1)
    throw new Error("Workload supervisor runner pid is invalid.");
  if (!/^\d+$/.test(parsed.deadlineEpochMs))
    throw new Error("Workload supervisor deadline epoch must be decimal milliseconds.");
  const deadlineEpochMs = Number(parsed.deadlineEpochMs);
  if (!Number.isSafeInteger(deadlineEpochMs) || deadlineEpochMs <= Date.now())
    throw new Error("Workload supervisor deadline epoch must be a future safe integer.");
  if (!SHA256_PATTERN.test(parsed.commandHash))
    throw new Error("Workload supervisor command hash must be lowercase SHA-256.");
  if (!SHA256_PATTERN.test(parsed.nextTsconfigSha256))
    throw new Error(
      "Workload supervisor next tsconfig hash must be lowercase SHA-256.",
    );
  for (const key of [
    "pathContractSourceHash",
    "releaseRunnerSourceHash",
    "ownedProcessLedgerSourceHash",
    "supervisorSourceHash",
  ]) {
    if (!SHA256_PATTERN.test(parsed[key]))
      throw new Error(`Workload supervisor ${key} must be lowercase SHA-256.`);
  }
  const [command, ...args] = workload;
  if (hashHkVisualizationWorkloadCommand(command, args) !== parsed.commandHash)
    throw new Error("Workload supervisor command hash drifted.");
  return Object.freeze({
    ...parsed,
    runnerPid,
    deadlineEpochMs,
    command,
    args: Object.freeze(args),
    sourceHashes: Object.freeze({
      pathContract: parsed.pathContractSourceHash,
      releaseRunner: parsed.releaseRunnerSourceHash,
      ownedProcessLedger: parsed.ownedProcessLedgerSourceHash,
      supervisor: parsed.supervisorSourceHash,
    }),
  });
}

function runnerStillAlive(runnerPid) {
  if (process.ppid !== runnerPid) return false;
  try {
    process.kill(runnerPid, 0);
    return true;
  } catch (error) {
    return Boolean(error && typeof error === "object" && error.code === "EPERM");
  }
}

function waitMilliseconds(milliseconds) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, milliseconds));
}

function validateMonotonicNanoseconds(label, value) {
  if (typeof value !== "bigint" || value < 0n) {
    throw new Error(
      `Workload supervisor cleanup ${label} must be non-negative bigint nanoseconds.`,
    );
  }
  return value;
}

export function deriveHkVisualizationWorkloadCleanupPlan({
  deadlineEpochMs,
  wallNowEpochMs = Date.now(),
  monotonicNowNs = process.hrtime.bigint(),
} = {}) {
  if (
    !Number.isSafeInteger(deadlineEpochMs) ||
    !Number.isSafeInteger(wallNowEpochMs)
  ) {
    throw new Error(
      "Workload supervisor cleanup plan requires safe integer wall deadlines.",
    );
  }
  const absoluteOuterDeadlineEpochMs =
    deadlineEpochMs + HK_VISUALIZATION_WORKLOAD_CLEANUP_OUTER_GRACE_MS;
  if (!Number.isSafeInteger(absoluteOuterDeadlineEpochMs)) {
    throw new Error("Workload supervisor cleanup outer deadline is unsafe.");
  }
  const startedMonotonicNs = validateMonotonicNanoseconds(
    "planned start",
    monotonicNowNs,
  );
  const availableBeforeReserveMs = Math.max(
    0,
    absoluteOuterDeadlineEpochMs -
      wallNowEpochMs -
      HK_VISUALIZATION_WORKLOAD_CLEANUP_POST_RESERVE_MS,
  );
  const plannedBudgetMs = Math.min(
    HK_VISUALIZATION_WORKLOAD_CLEANUP_MAX_BUDGET_MS,
    Math.floor(availableBeforeReserveMs),
  );
  const deadlineMonotonicNs =
    startedMonotonicNs + BigInt(plannedBudgetMs) * 1_000_000n;
  return Object.freeze({
    absoluteOuterDeadlineEpochMs,
    plannedBudgetMs,
    startedMonotonicNs,
    deadlineMonotonicNs,
  });
}

function remainingCleanupTimeoutMs(cleanupPlan, maximumMs) {
  const remainingNs =
    cleanupPlan.deadlineMonotonicNs - process.hrtime.bigint();
  if (remainingNs <= 0n) return 0;
  return Math.min(
    maximumMs,
    Math.max(1, Math.ceil(Number(remainingNs) / 1_000_000)),
  );
}

function copyProcessEntry(entry) {
  return Object.freeze({
    pid: entry.pid,
    ppid: entry.ppid,
    pgid: entry.pgid,
    lstartToken: entry.lstartToken,
    state: entry.state,
    executableSha256: entry.executableSha256,
  });
}

function copyLedgerIdentity(identity) {
  return Object.freeze({
    pid: identity.pid,
    lstartToken: identity.lstartToken,
    firstSeenPpid: identity.firstSeenPpid,
    firstSeenPgid: identity.firstSeenPgid,
    lastPpid: identity.lastPpid,
    lastPgid: identity.lastPgid,
    state: identity.state,
    executableSha256: identity.executableSha256,
    discoveredFromPid: identity.discoveredFromPid,
    discoveredFromLstartToken: identity.discoveredFromLstartToken,
  });
}

function copyLedger(ledger) {
  if (!ledger) return null;
  return Object.freeze({
    schemaVersion: ledger.schemaVersion,
    revision: ledger.revision,
    leader: Object.freeze({ ...ledger.leader }),
    identities: Object.freeze(ledger.identities.map(copyLedgerIdentity)),
    boundedPollingLimitation: ledger.boundedPollingLimitation,
  });
}

function processIdentityKey(entry) {
  return `${entry.pid}:${entry.lstartToken}`;
}

function observationEvidence(phase, members) {
  return Object.freeze({
    phase,
    members: Object.freeze(members.map(copyProcessEntry)),
  });
}

function createContinuousLedgerSampler({
  initialLedger,
  initialProcesses,
  sampleProcesses,
  pollMs = HK_VISUALIZATION_OWNED_PROCESS_LEDGER_POLL_MS,
}) {
  if (!Number.isSafeInteger(pollMs) || pollMs < 1 || pollMs > 50)
    throw new Error("Continuous owned-process polling must be an integer from 1 through 50 ms.");
  let ledger = initialLedger;
  let stopped = false;
  let failure = null;
  let sampleCount = 0;
  let previousSignature = null;
  let previousIdentityCount = -1;
  let lastSampleStartedMs = null;
  let maxSampleStartGapMs = 0;
  const startedAtUtc = new Date().toISOString();
  const digest = createHash("sha256");
  const observations = [];

  const applySample = (processes, phase) => {
    const sampleStartedMs = Date.now();
    if (lastSampleStartedMs !== null)
      maxSampleStartGapMs = Math.max(
        maxSampleStartGapMs,
        sampleStartedMs - lastSampleStartedMs,
      );
    lastSampleStartedMs = sampleStartedMs;
    ledger = updateHkVisualizationOwnedProcessLedger({ ledger, processes });
    const live = computeHkVisualizationLiveOwnedProcessEntries({
      ledger,
      processes,
    });
    sampleCount += 1;
    const signature = sha256Canonical(
      live.map(({ pid, pgid, lstartToken }) => ({ pid, pgid, lstartToken })),
    );
    digest.update(
      canonicalJson({
        index: sampleCount,
        ledgerRevision: ledger.revision,
        liveIdentitySha256: signature,
      }),
    );
    if (
      phase === "seed" ||
      signature !== previousSignature ||
      ledger.identities.length !== previousIdentityCount
    ) {
      observations.push(observationEvidence(phase, live));
    }
    previousSignature = signature;
    previousIdentityCount = ledger.identities.length;
    return live;
  };

  applySample(initialProcesses, "seed");
  const loopPromise = (async () => {
    while (!stopped) {
      const iterationStartedMs = Date.now();
      try {
        applySample(sampleProcesses(), "poll-change");
      } catch (error) {
        failure = error;
        break;
      }
      const elapsedMs = Date.now() - iterationStartedMs;
      await waitMilliseconds(Math.max(0, pollMs - elapsedMs));
    }
  })();

  return Object.freeze({
    async stop() {
      stopped = true;
      await loopPromise;
      return Object.freeze({
        ledger,
        failure,
        observations: Object.freeze([...observations]),
        polling: Object.freeze({
          configuredPollMs: pollMs,
          sampleCount,
          startedAtUtc,
          completedAtUtc: new Date().toISOString(),
          maxSampleStartGapMs,
          samplesDigestSha256: digest.digest("hex"),
        }),
      });
    },
  });
}

function expectedProcessTablePolicy() {
  return Object.freeze({
    command: "/bin/ps",
    args: Object.freeze([...HK_VISUALIZATION_OWNED_PROCESS_LEDGER_PS_ARGS]),
    timeoutMs: HK_VISUALIZATION_OWNED_PROCESS_LEDGER_PS_TIMEOUT_MS,
    maxBufferBytes: HK_VISUALIZATION_OWNED_PROCESS_LEDGER_PS_MAX_BUFFER,
    readsProcessEnvironment: false,
  });
}

function serializeCleanup(cleanup, fallbackLedger = null) {
  if (!cleanup) {
    return Object.freeze({
      ledger: copyLedger(fallbackLedger),
      termSentAtUtc: null,
      killSentAtUtc: null,
      observations: Object.freeze([]),
      signalEvidence: Object.freeze([]),
      signalErrors: Object.freeze([]),
      finalLiveEntries: Object.freeze([]),
      confirmedEmpty: false,
      finalConfirmationGapMs: 0,
    });
  }
  return Object.freeze({
    ledger: copyLedger(cleanup.ledger),
    termSentAtUtc: cleanup.termSentAtUtc,
    killSentAtUtc: cleanup.killSentAtUtc,
    observations: Object.freeze(
      cleanup.observations.map(({ phase, members }) =>
        observationEvidence(phase, members),
      ),
    ),
    signalEvidence: Object.freeze(
      cleanup.signalEvidence.map((entry) => Object.freeze({ ...entry })),
    ),
    signalErrors: Object.freeze(
      cleanup.signalErrors.map((entry) => Object.freeze({ ...entry })),
    ),
    finalLiveEntries: Object.freeze(
      cleanup.finalLiveEntries.map(copyProcessEntry),
    ),
    confirmedEmpty: cleanup.confirmedEmpty,
    finalConfirmationGapMs: cleanup.finalConfirmationGapMs,
  });
}

function serializeCleanupTiming({ cleanup, cleanupPlan, fallbackExpiryPhase }) {
  const timing = cleanup?.cleanupTiming ?? null;
  const completedMonotonicNs = timing
    ? BigInt(timing.completedMonotonicNs)
    : process.hrtime.bigint();
  const elapsedNs = completedMonotonicNs - cleanupPlan.startedMonotonicNs;
  const remainingNs =
    completedMonotonicNs < cleanupPlan.deadlineMonotonicNs
      ? cleanupPlan.deadlineMonotonicNs - completedMonotonicNs
      : 0n;
  const expired = timing
    ? timing.expired
    : completedMonotonicNs >= cleanupPlan.deadlineMonotonicNs;
  const expiryPhase = timing
    ? timing.expiryPhase
    : expired
      ? fallbackExpiryPhase ?? "supervisor-cleanup-complete"
      : null;
  if (
    timing &&
    (timing.clock !== HK_VISUALIZATION_OWNED_PROCESS_LEDGER_MONOTONIC_CLOCK ||
      timing.startedMonotonicNs !== cleanupPlan.startedMonotonicNs.toString() ||
      timing.deadlineMonotonicNs !== cleanupPlan.deadlineMonotonicNs.toString() ||
      timing.plannedBudgetMs !== cleanupPlan.plannedBudgetMs)
  ) {
    throw new Error("Workload supervisor cleanup timing drifted from its plan.");
  }
  return Object.freeze({
    clock: HK_VISUALIZATION_OWNED_PROCESS_LEDGER_MONOTONIC_CLOCK,
    outerGraceMs: HK_VISUALIZATION_WORKLOAD_CLEANUP_OUTER_GRACE_MS,
    postCleanupReserveMs:
      HK_VISUALIZATION_WORKLOAD_CLEANUP_POST_RESERVE_MS,
    maxBudgetMs: HK_VISUALIZATION_WORKLOAD_CLEANUP_MAX_BUDGET_MS,
    absoluteOuterDeadlineEpochMs:
      cleanupPlan.absoluteOuterDeadlineEpochMs,
    plannedBudgetMs: cleanupPlan.plannedBudgetMs,
    startedMonotonicNs: cleanupPlan.startedMonotonicNs.toString(),
    deadlineMonotonicNs: cleanupPlan.deadlineMonotonicNs.toString(),
    completedMonotonicNs: completedMonotonicNs.toString(),
    elapsedMs: timing ? timing.elapsedMs : Number(elapsedNs) / 1_000_000,
    remainingMs: timing
      ? timing.remainingMs
      : Number(remainingNs) / 1_000_000,
    expired,
    expiryPhase,
    sampleCount: timing?.sampleCount ?? 0,
    minimumSampleTimeoutMs: timing?.minimumSampleTimeoutMs ?? null,
    maximumSampleTimeoutMs: timing?.maximumSampleTimeoutMs ?? null,
  });
}

function buildReceipt({
  manifest,
  runnerPid,
  commandHash,
  deadlineEpochMs,
  observerIdentity,
  leaderIdentity,
  leaderPid,
  pgid,
  startedAtUtc,
  completedAtUtc,
  stopReason,
  workloadExitCode,
  workloadSignal,
  polling,
  pollingObservations,
  cleanup,
  cleanupPlan,
  cleanupFallbackExpiryPhase,
  ledgerFallback,
  lockNonceHash,
  nextEnvBeforeSha256,
  nextEnvAfterSha256,
  nextEnvRestored,
  nextTsconfigEvidence,
  sourceHashes,
  errors,
}) {
  const serializedCleanup = serializeCleanup(cleanup, ledgerFallback);
  const cleanupTiming = serializeCleanupTiming({
    cleanup,
    cleanupPlan,
    fallbackExpiryPhase: cleanupFallbackExpiryPhase,
  });
  const ledger = serializedCleanup.ledger;
  const observations = [
    ...(pollingObservations ?? []),
    ...serializedCleanup.observations,
  ].map(({ phase, members }) => ({
    phase,
    members: members.map((member) => ({ ...member })),
  }));
  const finalLiveEntries = serializedCleanup.finalLiveEntries.map((entry) => ({
    ...entry,
  }));
  const ownedPgids = ledger
    ? [
        ...new Set(
          ledger.identities.flatMap(({ firstSeenPgid, lastPgid }) => [
            firstSeenPgid,
            lastPgid,
          ]),
        ),
      ].sort((left, right) => left - right)
    : [];
  const status =
    stopReason === "workload-exit" &&
    workloadExitCode === 0 &&
    workloadSignal === null &&
    errors.length === 0 &&
    observerIdentity !== null &&
    leaderIdentity !== null &&
    ledger !== null &&
    polling !== null &&
    polling.sampleCount >= 1 &&
    serializedCleanup.confirmedEmpty === true &&
    cleanupTiming.expired === false &&
    serializedCleanup.signalErrors.length === 0 &&
    serializedCleanup.finalConfirmationGapMs >=
      HK_VISUALIZATION_OWNED_PROCESS_LEDGER_POLL_MS &&
    finalLiveEntries.length === 0 &&
    nextEnvRestored &&
    nextTsconfigEvidence?.removed === true &&
    nextTsconfigEvidence?.expectedSha256 ===
      nextTsconfigEvidence?.preimage?.sha256 &&
    ["removed-by-workload", "removed-by-supervisor"].includes(
      nextTsconfigEvidence?.disposition,
    )
      ? "complete"
      : "failed";
  return {
    schemaVersion: HK_VISUALIZATION_WORKLOAD_SUPERVISOR_SCHEMA,
    runId: manifest.runId,
    manifestHash: manifest.manifestHash,
    runnerPid,
    supervisorPid: process.pid,
    commandHash,
    deadlineEpochMs,
    lockNonceHash,
    sourceHashes: { ...sourceHashes },
    observerIdentity: observerIdentity ? { ...observerIdentity } : null,
    leaderIdentity: leaderIdentity ? { ...leaderIdentity } : null,
    leaderPid,
    pgid,
    startedAtUtc,
    completedAtUtc,
    stopReason,
    workloadExitCode,
    workloadSignal,
    processTable: { ...expectedProcessTablePolicy(), args: [...HK_VISUALIZATION_OWNED_PROCESS_LEDGER_PS_ARGS] },
    cleanupTiming: { ...cleanupTiming },
    boundedPollingLimitation:
      HK_VISUALIZATION_OWNED_PROCESS_LEDGER_BOUNDED_POLLING_LIMITATION,
    polling: polling ? { ...polling } : null,
    ledger: ledger
      ? {
          ...ledger,
          leader: { ...ledger.leader },
          identities: ledger.identities.map((identity) => ({ ...identity })),
        }
      : null,
    termSentAtUtc: serializedCleanup.termSentAtUtc,
    killSentAtUtc: serializedCleanup.killSentAtUtc,
    observations,
    signalEvidence: serializedCleanup.signalEvidence.map((entry) => ({ ...entry })),
    signalErrors: serializedCleanup.signalErrors.map((entry) => ({ ...entry })),
    confirmedEmpty: serializedCleanup.confirmedEmpty,
    finalConfirmationGapMs: serializedCleanup.finalConfirmationGapMs,
    finalLiveEntries,
    finalGroupMemberPids: finalLiveEntries.map(({ pid }) => pid),
    ownedPgids,
    nextEnvBeforeSha256,
    nextEnvAfterSha256,
    nextEnvRestored,
    nextTsconfigEvidence: nextTsconfigEvidence
      ? {
          ...nextTsconfigEvidence,
          preimage: { ...nextTsconfigEvidence.preimage },
        }
      : null,
    errors: [...errors],
    status,
  };
}

function validProcessEntry(entry) {
  return (
    exactObjectKeys(entry, PROCESS_ENTRY_KEYS) &&
    Number.isSafeInteger(entry.pid) &&
    entry.pid > 1 &&
    Number.isSafeInteger(entry.ppid) &&
    entry.ppid >= 0 &&
    Number.isSafeInteger(entry.pgid) &&
    entry.pgid > 1 &&
    LSTART_PATTERN.test(String(entry.lstartToken ?? "")) &&
    STATE_PATTERN.test(String(entry.state ?? "")) &&
    SHA256_PATTERN.test(String(entry.executableSha256 ?? ""))
  );
}

function validNextTsconfigIdentity(identity) {
  return (
    exactObjectKeys(identity, NEXT_TSCONFIG_IDENTITY_KEYS) &&
    /^(?:0|[1-9][0-9]{0,29})$/.test(String(identity.device ?? "")) &&
    /^(?:0|[1-9][0-9]{0,29})$/.test(String(identity.inode ?? "")) &&
    identity.mode === 0o600 &&
    Number.isSafeInteger(identity.size) &&
    identity.size >= 1 &&
    SHA256_PATTERN.test(String(identity.sha256 ?? ""))
  );
}

function validLedgerIdentity(identity) {
  return (
    exactObjectKeys(identity, LEDGER_IDENTITY_KEYS) &&
    Number.isSafeInteger(identity.pid) &&
    identity.pid > 1 &&
    LSTART_PATTERN.test(String(identity.lstartToken ?? "")) &&
    Number.isSafeInteger(identity.firstSeenPpid) &&
    identity.firstSeenPpid >= 0 &&
    Number.isSafeInteger(identity.firstSeenPgid) &&
    identity.firstSeenPgid > 1 &&
    Number.isSafeInteger(identity.lastPpid) &&
    identity.lastPpid >= 0 &&
    Number.isSafeInteger(identity.lastPgid) &&
    identity.lastPgid > 1 &&
    STATE_PATTERN.test(String(identity.state ?? "")) &&
    SHA256_PATTERN.test(String(identity.executableSha256 ?? "")) &&
    ((identity.discoveredFromPid === null &&
      identity.discoveredFromLstartToken === null) ||
      (Number.isSafeInteger(identity.discoveredFromPid) &&
        identity.discoveredFromPid > 1 &&
        LSTART_PATTERN.test(String(identity.discoveredFromLstartToken ?? ""))))
  );
}

function parseMonotonicNanoseconds(value) {
  if (!/^(?:0|[1-9][0-9]{0,29})$/.test(String(value ?? ""))) return null;
  try {
    return BigInt(value);
  } catch {
    return null;
  }
}

function approximatelyEqualMilliseconds(actual, expected) {
  return (
    typeof actual === "number" &&
    Number.isFinite(actual) &&
    actual >= 0 &&
    Math.abs(actual - expected) <= 0.000_001
  );
}

function validateCleanupTimingEvidence(timing, deadlineEpochMs, issues) {
  const keys = [
    "clock",
    "outerGraceMs",
    "postCleanupReserveMs",
    "maxBudgetMs",
    "absoluteOuterDeadlineEpochMs",
    "plannedBudgetMs",
    "startedMonotonicNs",
    "deadlineMonotonicNs",
    "completedMonotonicNs",
    "elapsedMs",
    "remainingMs",
    "expired",
    "expiryPhase",
    "sampleCount",
    "minimumSampleTimeoutMs",
    "maximumSampleTimeoutMs",
  ];
  if (!exactObjectKeys(timing, keys)) {
    issues.push("cleanupTiming-key-set-drift");
    return;
  }
  if (timing.clock !== HK_VISUALIZATION_OWNED_PROCESS_LEDGER_MONOTONIC_CLOCK)
    issues.push("cleanupTiming-clock-drift");
  if (
    timing.outerGraceMs !== HK_VISUALIZATION_WORKLOAD_CLEANUP_OUTER_GRACE_MS ||
    timing.postCleanupReserveMs !==
      HK_VISUALIZATION_WORKLOAD_CLEANUP_POST_RESERVE_MS ||
    timing.maxBudgetMs !== HK_VISUALIZATION_WORKLOAD_CLEANUP_MAX_BUDGET_MS
  ) {
    issues.push("cleanupTiming-policy-drift");
  }
  if (
    !Number.isSafeInteger(deadlineEpochMs) ||
    timing.absoluteOuterDeadlineEpochMs !==
      deadlineEpochMs + HK_VISUALIZATION_WORKLOAD_CLEANUP_OUTER_GRACE_MS
  ) {
    issues.push("cleanupTiming-outer-deadline-drift");
  }
  const plannedBudgetIsValid =
    Number.isSafeInteger(timing.plannedBudgetMs) &&
    timing.plannedBudgetMs >= 0 &&
    timing.plannedBudgetMs <=
      HK_VISUALIZATION_WORKLOAD_CLEANUP_MAX_BUDGET_MS;
  if (
    !plannedBudgetIsValid
  ) {
    issues.push("cleanupTiming-planned-budget-invalid");
  }
  const startedNs = parseMonotonicNanoseconds(timing.startedMonotonicNs);
  const deadlineNs = parseMonotonicNanoseconds(timing.deadlineMonotonicNs);
  const completedNs = parseMonotonicNanoseconds(timing.completedMonotonicNs);
  if (startedNs === null || deadlineNs === null || completedNs === null) {
    issues.push("cleanupTiming-monotonic-value-invalid");
    return;
  }
  if (
    deadlineNs < startedNs ||
    (plannedBudgetIsValid &&
      deadlineNs - startedNs !==
        BigInt(timing.plannedBudgetMs) * 1_000_000n)
  ) {
    issues.push("cleanupTiming-deadline-plan-drift");
  }
  if (completedNs < startedNs) issues.push("cleanupTiming-completion-order");
  const elapsedMs = Number(completedNs - startedNs) / 1_000_000;
  const remainingMs =
    completedNs < deadlineNs ? Number(deadlineNs - completedNs) / 1_000_000 : 0;
  if (!approximatelyEqualMilliseconds(timing.elapsedMs, elapsedMs))
    issues.push("cleanupTiming-elapsed-drift");
  if (!approximatelyEqualMilliseconds(timing.remainingMs, remainingMs))
    issues.push("cleanupTiming-remaining-drift");
  const expectedExpired = completedNs >= deadlineNs;
  if (timing.expired !== expectedExpired)
    issues.push("cleanupTiming-expired-drift");
  if (
    (expectedExpired &&
      (typeof timing.expiryPhase !== "string" ||
        !/^[a-z0-9-]{1,96}$/.test(timing.expiryPhase))) ||
    (!expectedExpired && timing.expiryPhase !== null)
  ) {
    issues.push("cleanupTiming-expiry-phase-invalid");
  }
  if (!Number.isSafeInteger(timing.sampleCount) || timing.sampleCount < 0) {
    issues.push("cleanupTiming-sample-count-invalid");
  }
  const timeoutPairIsNull =
    timing.minimumSampleTimeoutMs === null &&
    timing.maximumSampleTimeoutMs === null;
  const timeoutPairIsBounded =
    Number.isSafeInteger(timing.minimumSampleTimeoutMs) &&
    Number.isSafeInteger(timing.maximumSampleTimeoutMs) &&
    timing.minimumSampleTimeoutMs >= 1 &&
    timing.minimumSampleTimeoutMs <= timing.maximumSampleTimeoutMs &&
    timing.maximumSampleTimeoutMs <=
      HK_VISUALIZATION_OWNED_PROCESS_LEDGER_PS_TIMEOUT_MS;
  if (
    (timing.sampleCount === 0 && !timeoutPairIsNull) ||
    (timing.sampleCount > 0 && !timeoutPairIsBounded)
  ) {
    issues.push("cleanupTiming-sample-timeout-invalid");
  }
}

function validateLedgerEvidence(ledger, leaderIdentity, issues) {
  if (ledger === null) return;
  if (
    !exactObjectKeys(ledger, LEDGER_KEYS) ||
    ledger.schemaVersion !== HK_VISUALIZATION_OWNED_PROCESS_LEDGER_SCHEMA ||
    !Number.isSafeInteger(ledger.revision) ||
    ledger.revision < 0 ||
    !exactObjectKeys(ledger.leader, ["pid", "ppid", "pgid", "lstartToken"]) ||
    !Array.isArray(ledger.identities) ||
    ledger.boundedPollingLimitation !==
      HK_VISUALIZATION_OWNED_PROCESS_LEDGER_BOUNDED_POLLING_LIMITATION
  ) {
    issues.push("ledger-invalid");
    return;
  }
  if (
    !leaderIdentity ||
    ledger.leader.pid !== leaderIdentity.pid ||
    ledger.leader.ppid !== leaderIdentity.ppid ||
    ledger.leader.pgid !== leaderIdentity.pgid ||
    ledger.leader.lstartToken !== leaderIdentity.lstartToken
  ) {
    issues.push("ledger-leader-drift");
  }
  const identityKeys = new Set();
  for (const [index, identity] of ledger.identities.entries()) {
    if (!validLedgerIdentity(identity)) {
      issues.push(`ledger-identity[${index}]-invalid`);
      continue;
    }
    const key = processIdentityKey(identity);
    if (identityKeys.has(key)) issues.push(`ledger-identity[${index}]-duplicate`);
    identityKeys.add(key);
  }
  if (!identityKeys.has(processIdentityKey(ledger.leader)))
    issues.push("ledger-leader-missing");
}

function strictIsoUtc(value) {
  if (typeof value !== "string") return false;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) && new Date(parsed).toISOString() === value;
}

function expectedCommonEvidence(receipt) {
  return {
    schemaVersion: receipt.schemaVersion,
    runId: receipt.runId,
    manifestHash: receipt.manifestHash,
    runnerPid: receipt.runnerPid,
    supervisorPid: receipt.supervisorPid,
    commandHash: receipt.commandHash,
    deadlineEpochMs: receipt.deadlineEpochMs,
    lockNonceHash: receipt.lockNonceHash,
    sourceHashes: receipt.sourceHashes,
    nextTsconfigSha256: receipt?.nextTsconfigEvidence?.expectedSha256,
  };
}

export function validateHkVisualizationWorkloadSupervisorReceipt(
  receipt,
  {
    manifest,
    commandHash,
    expectedDeadlineEpochMs = null,
    expectedNextTsconfigSha256 = null,
    expectedRunnerPid = null,
    expectedSourceHashes = null,
    artifactEvidence = null,
  },
) {
  const issues = [];
  const receiptKeys = [
    "schemaVersion",
    "runId",
    "manifestHash",
    "runnerPid",
    "supervisorPid",
    "commandHash",
    "deadlineEpochMs",
    "lockNonceHash",
    "sourceHashes",
    "observerIdentity",
    "leaderIdentity",
    "leaderPid",
    "pgid",
    "startedAtUtc",
    "completedAtUtc",
    "stopReason",
    "workloadExitCode",
    "workloadSignal",
    "processTable",
    "cleanupTiming",
    "boundedPollingLimitation",
    "polling",
    "ledger",
    "termSentAtUtc",
    "killSentAtUtc",
    "observations",
    "signalEvidence",
    "signalErrors",
    "confirmedEmpty",
    "finalConfirmationGapMs",
    "finalLiveEntries",
    "finalGroupMemberPids",
    "ownedPgids",
    "nextEnvBeforeSha256",
    "nextEnvAfterSha256",
    "nextEnvRestored",
    "nextTsconfigEvidence",
    "errors",
    "status",
  ];
  if (!exactObjectKeys(receipt, receiptKeys)) issues.push("key-set-drift");
  if (receipt?.schemaVersion !== HK_VISUALIZATION_WORKLOAD_SUPERVISOR_SCHEMA)
    issues.push("schemaVersion-drift");
  if (receipt?.runId !== manifest.runId) issues.push("runId-drift");
  if (receipt?.manifestHash !== manifest.manifestHash)
    issues.push("manifestHash-drift");
  if (receipt?.commandHash !== commandHash) issues.push("commandHash-drift");
  if (
    !Number.isSafeInteger(receipt?.deadlineEpochMs) ||
    (strictIsoUtc(receipt?.startedAtUtc) &&
      receipt.deadlineEpochMs <= Date.parse(receipt.startedAtUtc))
  ) {
    issues.push("deadlineEpochMs-invalid");
  }
  if (
    expectedDeadlineEpochMs !== null &&
    receipt?.deadlineEpochMs !== expectedDeadlineEpochMs
  ) {
    issues.push("deadlineEpochMs-drift");
  }
  for (const key of ["runnerPid", "supervisorPid"]) {
    if (!Number.isSafeInteger(receipt?.[key]) || receipt[key] <= 1)
      issues.push(`${key}-invalid`);
  }
  if (expectedRunnerPid !== null && receipt?.runnerPid !== expectedRunnerPid)
    issues.push("runnerPid-drift");
  if (!SHA256_PATTERN.test(String(receipt?.lockNonceHash ?? "")))
    issues.push("lockNonceHash-invalid");
  if (
    !exactObjectKeys(receipt?.sourceHashes, SOURCE_HASH_KEYS) ||
    SOURCE_HASH_KEYS.some(
      (key) => !SHA256_PATTERN.test(String(receipt?.sourceHashes?.[key] ?? "")),
    )
  ) {
    issues.push("sourceHashes-invalid");
  }
  if (
    expectedSourceHashes !== null &&
    !isDeepStrictEqual(receipt?.sourceHashes, expectedSourceHashes)
  ) {
    issues.push("sourceHashes-drift");
  }
  if (
    !exactObjectKeys(receipt?.observerIdentity, ["pid", "lstartToken"]) ||
    receipt.observerIdentity.pid !== receipt?.supervisorPid ||
    !LSTART_PATTERN.test(String(receipt.observerIdentity.lstartToken ?? ""))
  ) {
    issues.push("observerIdentity-invalid");
  }
  const hasLeader =
    Number.isSafeInteger(receipt?.leaderPid) && receipt.leaderPid > 1;
  const hasPgid = Number.isSafeInteger(receipt?.pgid) && receipt.pgid > 1;
  if (hasLeader !== hasPgid) issues.push("leader-pgid-presence-drift");
  if (hasLeader && receipt.leaderPid !== receipt.pgid)
    issues.push("leader-pgid-drift");
  if (receipt?.leaderIdentity !== null) {
    if (
      !validProcessEntry(receipt.leaderIdentity) ||
      receipt.leaderIdentity.pid !== receipt.leaderPid ||
      receipt.leaderIdentity.ppid !== receipt.supervisorPid ||
      receipt.leaderIdentity.pgid !== receipt.pgid
    ) {
      issues.push("leaderIdentity-invalid");
    }
  } else if (receipt?.status === "complete") {
    issues.push("complete-receipt-missing-leader-identity");
  }
  if (
    !isDeepStrictEqual(receipt?.processTable, {
      command: "/bin/ps",
      args: [...HK_VISUALIZATION_OWNED_PROCESS_LEDGER_PS_ARGS],
      timeoutMs: HK_VISUALIZATION_OWNED_PROCESS_LEDGER_PS_TIMEOUT_MS,
      maxBufferBytes: HK_VISUALIZATION_OWNED_PROCESS_LEDGER_PS_MAX_BUFFER,
      readsProcessEnvironment: false,
    })
  ) {
    issues.push("processTable-policy-drift");
  }
  validateCleanupTimingEvidence(
    receipt?.cleanupTiming,
    receipt?.deadlineEpochMs,
    issues,
  );
  if (
    receipt?.boundedPollingLimitation !==
    HK_VISUALIZATION_OWNED_PROCESS_LEDGER_BOUNDED_POLLING_LIMITATION
  ) {
    issues.push("boundedPollingLimitation-drift");
  }
  if (receipt?.polling !== null) {
    if (
      !exactObjectKeys(receipt.polling, [
        "configuredPollMs",
        "sampleCount",
        "startedAtUtc",
        "completedAtUtc",
        "maxSampleStartGapMs",
        "samplesDigestSha256",
      ]) ||
      !Number.isSafeInteger(receipt.polling.configuredPollMs) ||
      receipt.polling.configuredPollMs < 1 ||
      receipt.polling.configuredPollMs > 50 ||
      !Number.isSafeInteger(receipt.polling.sampleCount) ||
      receipt.polling.sampleCount < 1 ||
      !Number.isSafeInteger(receipt.polling.maxSampleStartGapMs) ||
      receipt.polling.maxSampleStartGapMs < 0 ||
      !strictIsoUtc(receipt.polling.startedAtUtc) ||
      !strictIsoUtc(receipt.polling.completedAtUtc) ||
      Date.parse(receipt.polling.completedAtUtc) <
        Date.parse(receipt.polling.startedAtUtc) ||
      !SHA256_PATTERN.test(String(receipt.polling.samplesDigestSha256 ?? ""))
    ) {
      issues.push("polling-invalid");
    }
  } else if (receipt?.status === "complete") {
    issues.push("complete-receipt-missing-polling");
  }
  validateLedgerEvidence(receipt?.ledger, receipt?.leaderIdentity, issues);
  if (!Array.isArray(receipt?.observations)) {
    issues.push("observations-invalid");
  } else {
    for (const [observationIndex, observation] of receipt.observations.entries()) {
      if (
        !exactObjectKeys(observation, ["phase", "members"]) ||
        typeof observation.phase !== "string" ||
        !/^(?:seed|poll-change|before-cleanup|sigterm-candidates|sigterm-before-pid|sigterm-before-group|after-term|sigkill-candidates|sigkill-before-pid|sigkill-before-group|after-kill|final-confirmation|final|deadline-expired)$/.test(
          observation.phase,
        ) ||
        !Array.isArray(observation.members)
      ) {
        issues.push(`observation[${observationIndex}]-invalid`);
        continue;
      }
      for (const [memberIndex, member] of observation.members.entries()) {
        if (!validProcessEntry(member))
          issues.push(
            `observation[${observationIndex}].member[${memberIndex}]-invalid`,
          );
      }
    }
    if (
      receipt.observations.length > 0 &&
      receipt.observations.at(-1)?.phase !== "final" &&
      receipt?.confirmedEmpty === true
    )
      issues.push("final-observation-missing");
  }
  if (!Array.isArray(receipt?.signalEvidence)) {
    issues.push("signalEvidence-invalid");
  } else {
    for (const [index, signal] of receipt.signalEvidence.entries()) {
      if (
        !exactObjectKeys(signal, [
          "scope",
          "target",
          "signal",
          "pid",
          "pgid",
          "lstartToken",
        ]) ||
        !["pid", "group"].includes(signal.scope) ||
        !["SIGTERM", "SIGKILL"].includes(signal.signal) ||
        !Number.isSafeInteger(signal.target) ||
        signal.target === 0 ||
        !Number.isSafeInteger(signal.pgid) ||
        signal.pgid <= 1 ||
        (signal.scope === "pid" &&
          (!Number.isSafeInteger(signal.pid) ||
            signal.pid <= 1 ||
            !LSTART_PATTERN.test(String(signal.lstartToken ?? "")) ||
            signal.target !== signal.pid)) ||
        (signal.scope === "group" &&
          (signal.pid !== null ||
            signal.lstartToken !== null ||
            signal.target !== -signal.pgid))
      ) {
        issues.push(`signalEvidence[${index}]-invalid`);
      }
    }
  }
  if (!Array.isArray(receipt?.signalErrors)) {
    issues.push("signalErrors-invalid");
  } else {
    for (const [index, signal] of receipt.signalErrors.entries()) {
      if (
        !exactObjectKeys(signal, [
          "scope",
          "target",
          "signal",
          "code",
          "pid",
          "pgid",
          "lstartToken",
        ]) ||
        !["pid", "group"].includes(signal.scope) ||
        !["SIGTERM", "SIGKILL"].includes(signal.signal) ||
        !/^[A-Za-z0-9_-]{1,64}$/.test(String(signal.code ?? "")) ||
        !Number.isSafeInteger(signal.target) ||
        signal.target === 0 ||
        !Number.isSafeInteger(signal.pgid) ||
        signal.pgid <= 1 ||
        (signal.scope === "pid" &&
          (!Number.isSafeInteger(signal.pid) ||
            signal.pid <= 1 ||
            !LSTART_PATTERN.test(String(signal.lstartToken ?? "")) ||
            signal.target !== signal.pid)) ||
        (signal.scope === "group" &&
          (signal.pid !== null ||
            signal.lstartToken !== null ||
            signal.target !== -signal.pgid))
      ) {
        issues.push(`signalErrors[${index}]-invalid`);
      }
    }
  }
  if (typeof receipt?.confirmedEmpty !== "boolean")
    issues.push("cleanup-confirmedEmpty-invalid");
  if (receipt?.confirmedEmpty === true && receipt?.signalErrors?.length !== 0)
    issues.push("cleanup-confirmed-empty-with-signal-errors");
  if (receipt?.confirmedEmpty === true && receipt?.cleanupTiming?.expired === true)
    issues.push("cleanup-confirmed-empty-after-deadline");
  if (
    typeof receipt?.finalConfirmationGapMs !== "number" ||
    !Number.isFinite(receipt.finalConfirmationGapMs) ||
    receipt.finalConfirmationGapMs < 0 ||
    (receipt.confirmedEmpty === true &&
      receipt.finalConfirmationGapMs <
        HK_VISUALIZATION_OWNED_PROCESS_LEDGER_POLL_MS)
  ) {
    issues.push("final-confirmation-gap-invalid");
  }
  if (!Array.isArray(receipt?.finalLiveEntries)) {
    issues.push("finalLiveEntries-invalid");
  } else {
    for (const [index, entry] of receipt.finalLiveEntries.entries()) {
      if (!validProcessEntry(entry)) issues.push(`finalLiveEntries[${index}]-invalid`);
    }
  }
  const finalObservationMembers = Array.isArray(receipt?.observations)
    ? receipt.observations.at(-1)?.members
    : null;
  if (
    receipt?.confirmedEmpty === true &&
    receipt?.signalErrors?.length === 0 &&
    receipt?.cleanupTiming?.expired === false &&
    (!Array.isArray(finalObservationMembers) ||
      !isDeepStrictEqual(finalObservationMembers, receipt?.finalLiveEntries))
  ) {
    issues.push("final-observation-summary-drift");
  }
  if (
    !Array.isArray(receipt?.finalGroupMemberPids) ||
    !isDeepStrictEqual(
      receipt.finalGroupMemberPids,
      (receipt?.finalLiveEntries ?? []).map(({ pid }) => pid),
    )
  ) {
    issues.push("final-group-summary-drift");
  }
  if (
    !Array.isArray(receipt?.ownedPgids) ||
    receipt.ownedPgids.some((pgid) => !Number.isSafeInteger(pgid) || pgid <= 1) ||
    !isDeepStrictEqual(
      receipt.ownedPgids,
      [...new Set(receipt.ownedPgids)].sort((left, right) => left - right),
    )
  ) {
    issues.push("ownedPgids-invalid");
  }
  if (
    hasPgid &&
    Array.isArray(receipt?.ownedPgids) &&
    !receipt.ownedPgids.includes(receipt.pgid)
  ) {
    issues.push("ownedPgids-missing-leader-pgid");
  }
  for (const key of ["nextEnvBeforeSha256", "nextEnvAfterSha256"]) {
    if (!SHA256_PATTERN.test(String(receipt?.[key] ?? "")))
      issues.push(`${key}-invalid`);
  }
  if (
    receipt?.nextEnvRestored !== true ||
    receipt?.nextEnvBeforeSha256 !== receipt?.nextEnvAfterSha256
  ) {
    issues.push("next-env-not-restored");
  }
  if (
    !exactObjectKeys(
      receipt?.nextTsconfigEvidence,
      NEXT_TSCONFIG_EVIDENCE_KEYS,
    ) ||
    !SHA256_PATTERN.test(
      String(receipt?.nextTsconfigEvidence?.expectedSha256 ?? ""),
    ) ||
    !validNextTsconfigIdentity(receipt?.nextTsconfigEvidence?.preimage) ||
    receipt?.nextTsconfigEvidence?.preimage?.device !==
      String(manifest.volumeIdentity.starshipRoot.device) ||
    receipt?.nextTsconfigEvidence?.expectedSha256 !==
      receipt?.nextTsconfigEvidence?.preimage?.sha256 ||
    ![
      "removed-by-workload",
      "removed-by-supervisor",
      "identity-drift",
      "remove-failed",
    ].includes(receipt?.nextTsconfigEvidence?.disposition) ||
    typeof receipt?.nextTsconfigEvidence?.removed !== "boolean" ||
    (receipt?.nextTsconfigEvidence?.removed === true) !==
      ["removed-by-workload", "removed-by-supervisor"].includes(
        receipt?.nextTsconfigEvidence?.disposition,
      )
  ) {
    issues.push("next-tsconfig-evidence-invalid");
  }
  if (
    expectedNextTsconfigSha256 !== null &&
    receipt?.nextTsconfigEvidence?.expectedSha256 !==
      expectedNextTsconfigSha256
  ) {
    issues.push("next-tsconfig-expected-hash-drift");
  }
  if (
    !Array.isArray(receipt?.errors) ||
    receipt.errors.some((error) => typeof error !== "string" || !error)
  ) {
    issues.push("errors-invalid");
  }
  if (!strictIsoUtc(receipt?.startedAtUtc)) issues.push("startedAtUtc-invalid");
  if (!strictIsoUtc(receipt?.completedAtUtc)) issues.push("completedAtUtc-invalid");
  if (
    strictIsoUtc(receipt?.startedAtUtc) &&
    strictIsoUtc(receipt?.completedAtUtc) &&
    Date.parse(receipt.completedAtUtc) < Date.parse(receipt.startedAtUtc)
  ) {
    issues.push("receipt-time-order");
  }
  for (const key of ["termSentAtUtc", "killSentAtUtc"]) {
    if (receipt?.[key] !== null && !strictIsoUtc(receipt?.[key]))
      issues.push(`${key}-invalid`);
  }
  if (
    strictIsoUtc(receipt?.termSentAtUtc) &&
    strictIsoUtc(receipt?.killSentAtUtc) &&
    Date.parse(receipt.killSentAtUtc) < Date.parse(receipt.termSentAtUtc)
  ) {
    issues.push("cleanup-time-order");
  }
  if (receipt?.termSentAtUtc === null && receipt?.killSentAtUtc !== null)
    issues.push("kill-without-term");
  if (
    !new Set([
      "workload-exit",
      "workload-error",
      "parent-exit",
      "workload-timeout",
      "supervisor-sigterm",
      "supervisor-sigint",
      "supervisor-sighup",
    ]).has(receipt?.stopReason)
  ) {
    issues.push("stopReason-invalid");
  }
  if (
    receipt?.workloadExitCode !== null &&
    (!Number.isSafeInteger(receipt.workloadExitCode) || receipt.workloadExitCode < 0)
  ) {
    issues.push("workloadExitCode-invalid");
  }
  if (
    receipt?.workloadSignal !== null &&
    (typeof receipt.workloadSignal !== "string" || !receipt.workloadSignal)
  ) {
    issues.push("workloadSignal-invalid");
  }
  if (artifactEvidence !== null) {
    if (
      !exactObjectKeys(artifactEvidence, ["pid", "ready", "leader", "lockNonceHash"])
    ) {
      issues.push("artifact-evidence-invalid");
    } else {
      if (artifactEvidence.pid !== receipt?.supervisorPid)
        issues.push("pid-artifact-drift");
      if (artifactEvidence.lockNonceHash !== receipt?.lockNonceHash)
        issues.push("lock-artifact-drift");
      const commonEvidence = expectedCommonEvidence(receipt);
      if (!isDeepStrictEqual(artifactEvidence.ready, commonEvidence))
        issues.push("ready-artifact-drift");
      const expectedLeader = receipt?.leaderIdentity
        ? {
            ...commonEvidence,
            leaderPid: receipt.leaderPid,
            pgid: receipt.pgid,
            leaderIdentity: receipt.leaderIdentity,
          }
        : null;
      if (!isDeepStrictEqual(artifactEvidence.leader, expectedLeader))
        issues.push("leader-artifact-drift");
    }
  }
  const structurallyComplete =
    receipt?.stopReason === "workload-exit" &&
    receipt?.workloadExitCode === 0 &&
    receipt?.workloadSignal === null &&
    receipt?.errors?.length === 0 &&
    receipt?.observerIdentity !== null &&
    receipt?.leaderIdentity !== null &&
    receipt?.ledger !== null &&
    receipt?.polling !== null &&
    receipt.polling.sampleCount >= 1 &&
    receipt?.signalErrors?.length === 0 &&
    receipt?.confirmedEmpty === true &&
    receipt?.finalConfirmationGapMs >=
      HK_VISUALIZATION_OWNED_PROCESS_LEDGER_POLL_MS &&
    receipt?.finalLiveEntries?.length === 0 &&
    receipt?.nextEnvRestored === true &&
    receipt?.nextTsconfigEvidence?.removed === true &&
    receipt?.nextTsconfigEvidence?.expectedSha256 ===
      receipt?.nextTsconfigEvidence?.preimage?.sha256 &&
    ["removed-by-workload", "removed-by-supervisor"].includes(
      receipt?.nextTsconfigEvidence?.disposition,
    );
  if (receipt?.status !== (structurallyComplete ? "complete" : "failed"))
    issues.push("status-drift");
  if (issues.length > 0) {
    throw new Error(
      `HK Visualization workload supervisor receipt is invalid: ${issues.join("; ")}.`,
    );
  }
  return Object.freeze({
    commandHash: receipt.commandHash,
    cleanupTiming: Object.freeze({ ...receipt.cleanupTiming }),
    deadlineEpochMs: receipt.deadlineEpochMs,
    finalGroupMemberPids: Object.freeze([...receipt.finalGroupMemberPids]),
    killSentAtUtc: receipt.killSentAtUtc,
    leaderIdentity: receipt.leaderIdentity
      ? Object.freeze({ ...receipt.leaderIdentity })
      : null,
    observerIdentity: Object.freeze({ ...receipt.observerIdentity }),
    leaderPid: receipt.leaderPid,
    ownedPgids: Object.freeze([...receipt.ownedPgids]),
    nextTsconfigEvidence: Object.freeze({
      ...receipt.nextTsconfigEvidence,
      preimage: Object.freeze({ ...receipt.nextTsconfigEvidence.preimage }),
    }),
    pgid: receipt.pgid,
    sourceHashes: Object.freeze({ ...receipt.sourceHashes }),
    status: receipt.status,
    stopReason: receipt.stopReason,
    termSentAtUtc: receipt.termSentAtUtc,
  });
}

function expectedWorkloadMutableEnvironment(manifest) {
  return Object.freeze({
    HOME: manifest.runtimeTmpDir,
    PLAYWRIGHT_RUN_ID: manifest.runId,
    PLAYWRIGHT_BASE_URL: "http://127.0.0.1:3020",
    PLAYWRIGHT_BROWSER_CHANNEL: "chrome",
    PLAYWRIGHT_PORT: "3020",
    PLAYWRIGHT_E2E_ROOT: manifest.artifactRoot,
    PLAYWRIGHT_NEXT_DIST_DIR: manifest.nextDistDir,
    PLAYWRIGHT_NEXT_TSCONFIG_PATH: manifest.nextTsconfigPath,
    PLAYWRIGHT_OUTPUT_DIR: manifest.outputDir,
    PLAYWRIGHT_REPORT_DIR: manifest.reportDir,
    PLAYWRIGHT_JSON_OUTPUT_FILE: manifest.jsonReport,
    PLAYWRIGHT_RUNTIME_TMPDIR: manifest.runtimeTmpDir,
    PLAYWRIGHT_BROWSER_PROFILE_ROOT: manifest.browserProfileParent,
    PLAYWRIGHT_SERVICE_LOG_DIR: manifest.serviceLogDir,
    PLAYWRIGHT_SERVICE_PID_DIR: manifest.servicePidDir,
    PLAYWRIGHT_PATH_MANIFEST_FILE: manifest.pathManifestFile,
    HK_MATH_DB_PATH: manifest.databasePath,
    HK_MATH_STORAGE_PROVIDER: "sqlite",
    TMPDIR: manifest.runtimeTmpDir,
    TMP: manifest.runtimeTmpDir,
    TEMP: manifest.runtimeTmpDir,
    XDG_CACHE_HOME: manifest.xdgCacheDir,
    XDG_CONFIG_HOME: manifest.xdgConfigDir,
    XDG_STATE_HOME: manifest.xdgStateDir,
    CHROME_LOG_FILE: manifest.chromeLogPath,
    NODE_COMPILE_CACHE: manifest.nodeCompileCacheDir,
    NPM_CONFIG_CACHE: manifest.npmCacheDir,
    npm_config_cache: manifest.npmCacheDir,
    NPM_CONFIG_LOGS_DIR: manifest.npmLogsDir,
    npm_config_logs_dir: manifest.npmLogsDir,
    SQLITE_TMPDIR: manifest.sqliteTmpDir,
    NEXT_TELEMETRY_DISABLED: "1",
  });
}

function validateWorkloadMutableEnvironment(environment, manifest) {
  const expected = expectedWorkloadMutableEnvironment(manifest);
  const drift = Object.entries(expected).flatMap(([key, value]) =>
    environment[key] === value ? [] : [key],
  );
  if (drift.length > 0) {
    throw new Error(
      `Workload supervisor mutable environment drifted for keys: ${drift.join(", ")}.`,
    );
  }
  for (const [key, value] of Object.entries(expected)) {
    if (
      key === "HK_MATH_STORAGE_PROVIDER" ||
      key === "NEXT_TELEMETRY_DISABLED" ||
      key === "PLAYWRIGHT_RUN_ID" ||
      key === "PLAYWRIGHT_BASE_URL" ||
      key === "PLAYWRIGHT_BROWSER_CHANNEL" ||
      key === "PLAYWRIGHT_PORT"
    ) {
      continue;
    }
    assertHkVisualizationStarshipPath(
      `workload supervisor environment ${key}`,
      value,
    );
  }
}

function safeWorkloadEnvironment(environment, manifest) {
  const safeKeys = [
    "PATH",
    "HOME",
    "USER",
    "LOGNAME",
    "SHELL",
    "LANG",
    "LC_ALL",
    "LC_CTYPE",
    "TERM",
    "TZ",
    "CI",
    "CODEX_CI",
    "NO_COLOR",
    "FORCE_COLOR",
    "MallocNanoZone",
    "__CF_USER_TEXT_ENCODING",
    "COMMAND_MODE",
    "XPC_FLAGS",
    "XPC_SERVICE_NAME",
  ];
  const safe = {};
  for (const key of safeKeys) {
    if (typeof environment[key] === "string") safe[key] = environment[key];
  }
  for (const [key, value] of Object.entries(environment)) {
    if (key.startsWith("NEXT_PUBLIC_") && typeof value === "string") safe[key] = value;
  }
  return {
    ...safe,
    ...expectedWorkloadMutableEnvironment(manifest),
    PWD: manifest.workspace,
  };
}

function assertRegularOwnedNextEnv(nextEnvPath) {
  assertHkVisualizationStarshipPath(
    "workload supervisor next-env.d.ts",
    nextEnvPath,
  );
  const metadata = lstatSync(nextEnvPath);
  if (!metadata.isFile() || metadata.isSymbolicLink()) {
    throw new Error(
      `Workload supervisor requires a regular non-symlink next-env.d.ts at ${nextEnvPath}.`,
    );
  }
  if (realpathSync(nextEnvPath) !== nextEnvPath) {
    throw new Error(
      `Workload supervisor next-env.d.ts real path drifted from ${nextEnvPath}.`,
    );
  }
  return Object.freeze({ mode: metadata.mode & 0o777 });
}

async function seedStoppedWorkloadLeader({
  child,
  supervisorPid,
  sampleProcesses,
  ownershipReadyMs,
  childSettled,
  deadlineEpochMs,
}) {
  const deadline = Math.min(Date.now() + ownershipReadyMs, deadlineEpochMs);
  let lastProcesses = null;
  while (
    !childSettled() &&
    Date.now() < deadline
  ) {
    const processes = sampleProcesses();
    lastProcesses = processes;
    const candidate = processes.find(({ pid }) => pid === child.pid);
    if (
      candidate &&
      candidate.ppid === supervisorPid &&
      candidate.pgid === child.pid &&
      candidate.state.startsWith("T")
    ) {
      const ledger = seedHkVisualizationOwnedProcessLedger({
        expectedLeader: {
          pid: child.pid,
          ppid: supervisorPid,
          pgid: child.pid,
        },
        processes,
      });
      return Object.freeze({
        ledger,
        processes,
        leaderIdentity: copyProcessEntry(candidate),
      });
    }
    if (
      candidate &&
      (candidate.ppid !== supervisorPid || candidate.pgid !== child.pid)
    ) {
      throw new Error("Workload supervisor direct leader identity drifted before barrier release.");
    }
    await waitMilliseconds(
      Math.min(HK_VISUALIZATION_OWNED_PROCESS_LEDGER_POLL_MS, Math.max(0, deadline - Date.now())),
    );
  }
  if (lastProcesses === null)
    throw new Error("Workload supervisor could not sample the direct leader.");
  if (Date.now() >= deadlineEpochMs)
    throw new Error("Absolute supervised workload deadline elapsed before barrier release.");
  throw new Error("Workload supervisor could not prove a stopped direct leader before barrier release.");
}

export async function runHkVisualizationWorkloadSupervisor({
  argv = process.argv.slice(2),
  environment = process.env,
  spawnWorkload = spawn,
  sampleProcesses = ({ timeoutMs } = {}) =>
    sampleHkVisualizationOwnedProcessTable({ timeoutMs }),
  signalProcess = process.kill.bind(process),
  ownershipReadyMs = HK_VISUALIZATION_WORKLOAD_OWNERSHIP_READY_MS,
} = {}) {
  if (
    !Number.isSafeInteger(ownershipReadyMs) ||
    ownershipReadyMs < 1 ||
    ownershipReadyMs > HK_VISUALIZATION_WORKLOAD_OWNERSHIP_READY_MS
  ) {
    throw new Error(
      `Workload supervisor ownership-ready timeout must be an integer from 1 through ${HK_VISUALIZATION_WORKLOAD_OWNERSHIP_READY_MS}.`,
    );
  }
  if (typeof sampleProcesses !== "function" || typeof signalProcess !== "function")
    throw new Error("Workload supervisor requires process sample and signal functions.");
  const parsed = parseHkVisualizationWorkloadSupervisorArgs(argv);
  const actualSourceHashes = hashHkVisualizationWorkloadSupervisorSources();
  if (!isDeepStrictEqual(parsed.sourceHashes, actualSourceHashes))
    throw new Error("Workload supervisor source hashes drifted before execution.");
  assertHkVisualizationStarshipPath(
    "workload supervisor manifest",
    parsed.manifestPath,
  );
  const manifest = JSON.parse(readFileSync(parsed.manifestPath, "utf8"));
  const paths = resolveHkVisualizationWorkloadSupervisorPaths({
    manifest,
    ...parsed,
  });
  validateWorkloadMutableEnvironment(environment, manifest);
  if (process.ppid !== parsed.runnerPid || !runnerStillAlive(parsed.runnerPid))
    throw new Error("Workload supervisor runner identity is unavailable.");
  if (readFileSync(paths.startPath, "utf8") !== "start\n")
    throw new Error("Workload supervisor start signal is invalid.");
  mkdirSync(manifest.workloadSupervisorDir, { recursive: true, mode: 0o700 });
  mkdirSync(manifest.workloadSupervisorTmpDir, { recursive: true, mode: 0o700 });
  const lockNonce = randomBytes(32).toString("hex");
  writeFileSync(manifest.workloadSupervisorLockPath, `${lockNonce}\n`, {
    encoding: "utf8",
    flag: "wx",
    mode: 0o600,
  });
  const lockFileDescriptor = openSync(manifest.workloadSupervisorLockPath, "r");
  try {
    fsyncSync(lockFileDescriptor);
  } finally {
    closeSync(lockFileDescriptor);
  }
  const lockNonceHash = sha256(lockNonce);
  for (const [label, artifactPath] of [
    ["receipt", paths.receiptPath],
    ["ready", paths.readyPath],
    ["pid", paths.pidPath],
    ["leader", paths.leaderPath],
    ["next-env snapshot", paths.nextEnvSnapshotPath],
  ]) {
    if (pathEntryExists(artifactPath))
      throw new Error(`Workload supervisor refuses stale ${label} artifact.`);
  }
  assertExactManagedPlaywrightCommand(parsed, manifest);
  const nextTsconfigPreimage = captureStableRegularFileIdentity(
    manifest.nextTsconfigPath,
    {
      label: "workload supervisor precreated run-specific tsconfig",
      expectedSha256: parsed.nextTsconfigSha256,
      expectedMode: 0o600,
      expectedDevice: manifest.volumeIdentity.starshipRoot.device,
    },
  );
  const nextEnvPath = resolve(manifest.workspace, "next-env.d.ts");
  const startedAtUtc = new Date().toISOString();
  let signalReason = null;
  let resolveSignal;
  const signalPromise = new Promise((resolvePromise) => {
    resolveSignal = resolvePromise;
  });
  const onSigterm = () => {
    signalReason ??= "supervisor-sigterm";
    resolveSignal({ kind: "signal", reason: signalReason });
  };
  const onSigint = () => {
    signalReason ??= "supervisor-sigint";
    resolveSignal({ kind: "signal", reason: signalReason });
  };
  const onSighup = () => {
    signalReason ??= "supervisor-sighup";
    resolveSignal({ kind: "signal", reason: signalReason });
  };
  process.on("SIGTERM", onSigterm);
  process.on("SIGINT", onSigint);
  process.on("SIGHUP", onSighup);

  const commonEvidence = Object.freeze({
    schemaVersion: HK_VISUALIZATION_WORKLOAD_SUPERVISOR_SCHEMA,
    runId: manifest.runId,
    manifestHash: manifest.manifestHash,
    runnerPid: parsed.runnerPid,
    supervisorPid: process.pid,
    commandHash: parsed.commandHash,
    deadlineEpochMs: parsed.deadlineEpochMs,
    lockNonceHash,
    sourceHashes: actualSourceHashes,
    nextTsconfigSha256: parsed.nextTsconfigSha256,
  });
  let nextEnvBefore = null;
  let nextEnvMode = 0o644;
  let nextEnvBeforeSha256 = "0".repeat(64);
  let nextEnvAfterSha256 = "0".repeat(64);
  let nextEnvRestored = false;
  let snapshotWritten = false;
  let nextTsconfigEvidence = null;
  let child = null;
  let leaderPid = null;
  let pgid = null;
  let leaderIdentity = null;
  let observerIdentity = null;
  let ledger = null;
  let polling = null;
  let pollingObservations = [];
  let continuousSampler = null;
  let childSettled = false;
  let barrierReleased = false;
  let childExitPromise = new Promise(() => {});
  let lifecycleFinished = false;
  let outcome = null;
  const errors = [];
  let cleanup = null;
  let cleanupPlan = null;
  let cleanupAttempted = false;
  let cleanupFallbackExpiryPhase = null;
  let verifiedSampleProcesses = sampleProcesses;
  const ensureCleanupPlan = () => {
    cleanupPlan ??= deriveHkVisualizationWorkloadCleanupPlan({
      deadlineEpochMs: parsed.deadlineEpochMs,
    });
    return cleanupPlan;
  };
  const recordCleanupDeadlineExpiry = () => {
    if (
      !errors.includes("aggregate monotonic owned-process cleanup deadline elapsed")
    ) {
      errors.push("aggregate monotonic owned-process cleanup deadline elapsed");
    }
  };
  const executeLedgerCleanup = async () => {
    if (cleanupAttempted) {
      throw new Error("Owned-process ledger cleanup may run only once per supervisor.");
    }
    cleanupAttempted = true;
    const plan = ensureCleanupPlan();
    const result = await cleanupHkVisualizationOwnedProcessLedger({
      ledger,
      observerIdentity,
      sampleProcesses: verifiedSampleProcesses,
      signalProcess,
      signalProcessGroup: signalProcess,
      cleanupBudgetMs: plan.plannedBudgetMs,
      cleanupStartedMonotonicNs: plan.startedMonotonicNs,
      cleanupDeadlineMonotonicNs: plan.deadlineMonotonicNs,
    });
    if (result.cleanupTiming.expired) recordCleanupDeadlineExpiry();
    return result;
  };
  const parentExitPromise = (async () => {
    while (!lifecycleFinished) {
      await waitMilliseconds(HK_VISUALIZATION_PARENT_POLL_MS);
      if (!runnerStillAlive(parsed.runnerPid))
        return { kind: "parent-exit", reason: "parent-exit" };
    }
    return new Promise(() => {});
  })();
  const deadlinePromise = (async () => {
    while (!lifecycleFinished) {
      const remainingMs = parsed.deadlineEpochMs - Date.now();
      if (remainingMs <= 0)
        return { kind: "deadline", reason: "workload-timeout" };
      await waitMilliseconds(Math.min(100, remainingMs));
    }
    return new Promise(() => {});
  })();

  try {
    const nextEnvMetadata = assertRegularOwnedNextEnv(nextEnvPath);
    nextEnvMode = nextEnvMetadata.mode;
    nextEnvBefore = readFileSync(nextEnvPath);
    nextEnvBeforeSha256 = sha256(nextEnvBefore);
    atomicWrite(paths.nextEnvSnapshotPath, nextEnvBefore);
    snapshotWritten = true;
    atomicWrite(paths.pidPath, `${process.pid}\n`);
    atomicWrite(paths.readyPath, `${JSON.stringify(commonEvidence)}\n`);
    if (signalReason) throw new Error(signalReason);
    if (!runnerStillAlive(parsed.runnerPid))
      throw new Error("Workload supervisor runner exited before workload spawn.");

    const observerProcesses = sampleProcesses();
    const observer = verifyHkVisualizationProcessObserver({
      observerPid: process.pid,
      processes: observerProcesses,
    });
    observerIdentity = Object.freeze({
      pid: observer.pid,
      lstartToken: observer.lstartToken,
    });
    verifiedSampleProcesses = (options) => {
      const processes = sampleProcesses(options);
      verifyHkVisualizationProcessObserver({
        observerIdentity,
        observerPid: observerIdentity.pid,
        processes,
      });
      return processes;
    };

    child = spawnWorkload(
      HK_VISUALIZATION_WORKLOAD_START_BARRIER_SHELL,
      [
        "-c",
        HK_VISUALIZATION_WORKLOAD_START_BARRIER_PROGRAM,
        "hk-viz-workload",
        parsed.command,
        ...parsed.args,
      ],
      {
        cwd: manifest.workspace,
        detached: true,
        env: safeWorkloadEnvironment(environment, manifest),
        stdio: "inherit",
      },
    );
    childExitPromise = new Promise((resolvePromise) => {
      child.once("error", (error) => {
        childSettled = true;
        resolvePromise({ kind: "child-error", error });
      });
      child.once("exit", (code, signal) => {
        childSettled = true;
        resolvePromise({ kind: "child-exit", code, signal });
      });
    });
    if (!Number.isSafeInteger(child?.pid) || child.pid <= 1)
      throw new Error("Workload supervisor did not receive a valid leader pid.");
    leaderPid = child.pid;
    pgid = child.pid;

    const seeded = await seedStoppedWorkloadLeader({
      child,
      supervisorPid: process.pid,
      sampleProcesses: verifiedSampleProcesses,
      ownershipReadyMs,
      childSettled: () => childSettled,
      deadlineEpochMs: parsed.deadlineEpochMs,
    });
    ledger = seeded.ledger;
    leaderIdentity = seeded.leaderIdentity;
    continuousSampler = createContinuousLedgerSampler({
      initialLedger: ledger,
      initialProcesses: seeded.processes,
      sampleProcesses: verifiedSampleProcesses,
    });
    atomicWrite(
      paths.leaderPath,
      `${JSON.stringify({
        ...commonEvidence,
        leaderPid,
        pgid,
        leaderIdentity,
      })}\n`,
    );
    if (signalReason) throw new Error(signalReason);
    if (!runnerStillAlive(parsed.runnerPid))
      throw new Error("Workload supervisor runner exited before barrier release.");
    if (Date.now() >= parsed.deadlineEpochMs) {
      outcome = { kind: "deadline", reason: "workload-timeout" };
      throw new Error("Absolute supervised workload deadline elapsed before barrier release.");
    }
    const releaseProcesses = verifiedSampleProcesses();
    const releaseLiveEntries = computeHkVisualizationLiveOwnedProcessEntries({
      ledger,
      processes: releaseProcesses,
    });
    const exactReleaseLeader = releaseLiveEntries.find(
      (entry) =>
        entry.pid === leaderIdentity.pid &&
        entry.lstartToken === leaderIdentity.lstartToken,
    );
    if (
      !exactReleaseLeader ||
      exactReleaseLeader.ppid !== process.pid ||
      exactReleaseLeader.pgid !== pgid ||
      !exactReleaseLeader.state.startsWith("T")
    ) {
      throw new Error(
        "Workload supervisor refused barrier release after exact leader identity drift.",
      );
    }
    signalProcess(leaderPid, "SIGCONT");
    barrierReleased = true;

    outcome = await Promise.race([
      childExitPromise,
      parentExitPromise,
      signalPromise,
      deadlinePromise,
    ]);
    if (outcome.kind === "child-error") errors.push(safeError(outcome.error));
    if (outcome.kind === "parent-exit")
      errors.push(`expected runner ${parsed.runnerPid} disappeared`);
    if (outcome.kind === "signal") errors.push(outcome.reason);
    if (outcome.kind === "deadline")
      errors.push("absolute supervised workload deadline elapsed");
    if (!runnerStillAlive(parsed.runnerPid)) {
      outcome = { kind: "parent-exit", reason: "parent-exit" };
      if (!errors.some((error) => error.includes("expected runner")))
        errors.push(`expected runner ${parsed.runnerPid} disappeared`);
    }

    const samplingResult = await continuousSampler.stop();
    continuousSampler = null;
    ledger = samplingResult.ledger;
    polling = samplingResult.polling;
    pollingObservations = samplingResult.observations;
    if (samplingResult.failure)
      errors.push(`continuous owned-process sampling failed: ${safeError(samplingResult.failure)}`);
    cleanup = await executeLedgerCleanup();
    ledger = cleanup.ledger;
    const beforeCleanupMembers = cleanup.observations.find(
      ({ phase }) => phase === "before-cleanup",
    )?.members;
    if (
      outcome.kind === "child-exit" &&
      Array.isArray(beforeCleanupMembers) &&
      beforeCleanupMembers.length > 0
    ) {
      errors.push("workload leader exited while observed owned processes remained");
    }
  } catch (error) {
    if (Date.now() >= parsed.deadlineEpochMs && outcome === null)
      outcome = { kind: "deadline", reason: "workload-timeout" };
    errors.push(safeError(error));
    if (continuousSampler) {
      try {
        const samplingResult = await continuousSampler.stop();
        continuousSampler = null;
        ledger = samplingResult.ledger;
        polling = samplingResult.polling;
        pollingObservations = samplingResult.observations;
        if (samplingResult.failure)
          errors.push(`continuous owned-process sampling failed: ${safeError(samplingResult.failure)}`);
      } catch (samplingStopError) {
        errors.push(`continuous owned-process sampler stop failed: ${safeError(samplingStopError)}`);
      }
    }
    if (ledger) {
      if (!cleanupAttempted) {
        try {
          cleanup = await executeLedgerCleanup();
          ledger = cleanup.ledger;
        } catch (cleanupError) {
          errors.push(`owned-process ledger cleanup failed: ${safeError(cleanupError)}`);
        }
      }
    } else if (child && !childSettled) {
      if (barrierReleased) {
        errors.push(
          "owned-process ledger unavailable after barrier release; safe complete process-tree cleanup is impossible",
        );
      }
      try {
        const plan = ensureCleanupPlan();
        const requireFallbackBudget = (phase, maximumMs) => {
          const timeoutMs = remainingCleanupTimeoutMs(plan, maximumMs);
          if (timeoutMs === 0) {
            cleanupFallbackExpiryPhase ??= phase;
            recordCleanupDeadlineExpiry();
            throw new Error(
              "aggregate monotonic owned-process cleanup deadline elapsed",
            );
          }
          return timeoutMs;
        };
        requireFallbackBudget("direct-child-before-sigkill", 1);
        if (typeof child.kill !== "function") {
          throw new Error("direct child handle has no kill method");
        }
        const accepted = child.kill("SIGKILL");
        if (!accepted && !childSettled) {
          throw new Error("direct child rejected SIGKILL before exit was observed");
        }
        const fallbackWaitMs = requireFallbackBudget(
          "direct-child-before-wait",
          HK_VISUALIZATION_OWNED_PROCESS_LEDGER_PS_TIMEOUT_MS,
        );
        const directLeaderExit = await Promise.race([
          childExitPromise,
          waitMilliseconds(fallbackWaitMs).then(() => ({ kind: "cleanup-timeout" })),
        ]);
        requireFallbackBudget("direct-child-wait-complete", 1);
        if (directLeaderExit?.kind === "cleanup-timeout" || !childSettled) {
          throw new Error(
            `direct leader ${String(leaderPid)} did not exit within the bounded fallback cleanup window`,
          );
        }
        errors.push(
          barrierReleased
            ? "owned-process ledger unavailable; exact direct leader was killed but descendant cleanup was not provable"
            : "owned-process ledger unavailable; unreleased stopped direct leader was killed before it could create descendants",
        );
      } catch (directCleanupError) {
        errors.push(
          `owned-process ledger unavailable; exact direct-leader fallback cleanup failed: ${safeError(directCleanupError)}`,
        );
      }
    }
  } finally {
    lifecycleFinished = true;
  }

  if (snapshotWritten && nextEnvBefore) {
    try {
      const snapshot = readFileSync(paths.nextEnvSnapshotPath);
      if (sha256(snapshot) !== nextEnvBeforeSha256)
        throw new Error("next-env snapshot hash drifted");
      atomicReplace(nextEnvPath, snapshot, nextEnvMode);
      assertRegularOwnedNextEnv(nextEnvPath);
      const restored = readFileSync(nextEnvPath);
      nextEnvAfterSha256 = sha256(restored);
      nextEnvRestored = restored.equals(snapshot);
      if (!nextEnvRestored) errors.push("next-env restoration mismatch");
    } catch (error) {
      errors.push(`next-env restoration failed: ${safeError(error)}`);
    }
  }
  try {
    nextTsconfigEvidence = removeOwnedNextTsconfig(
      manifest.nextTsconfigPath,
      nextTsconfigPreimage,
    );
    if (!nextTsconfigEvidence.removed) {
      errors.push(
        `run-specific tsconfig cleanup failed: ${nextTsconfigEvidence.disposition}`,
      );
    }
  } catch (error) {
    errors.push(`run-specific tsconfig cleanup failed: ${safeError(error)}`);
    nextTsconfigEvidence = Object.freeze({
      expectedSha256: parsed.nextTsconfigSha256,
      preimage: { ...nextTsconfigPreimage },
      disposition: "remove-failed",
      removed: false,
    });
  }

  await waitMilliseconds(0);
  if (signalReason && !errors.includes(signalReason)) errors.push(signalReason);
  if (!runnerStillAlive(parsed.runnerPid)) {
    outcome = { kind: "parent-exit", reason: "parent-exit" };
    if (!errors.some((error) => error.includes("expected runner")))
      errors.push(`expected runner ${parsed.runnerPid} disappeared`);
  }
  const postRunSourceHashes = hashHkVisualizationWorkloadSupervisorSources();
  if (!isDeepStrictEqual(postRunSourceHashes, actualSourceHashes))
    errors.push("workload supervisor source hashes changed during execution");

  const stopReason =
    outcome?.kind === "parent-exit"
      ? "parent-exit"
      : outcome?.kind === "deadline"
        ? "workload-timeout"
      : outcome?.kind === "signal"
        ? outcome.reason
        : signalReason
          ? signalReason
          : outcome?.kind === "child-exit"
            ? "workload-exit"
            : "workload-error";
  const workloadExitCode =
    outcome?.kind === "child-exit" && Number.isInteger(outcome.code)
      ? outcome.code
      : null;
  const workloadSignal =
    outcome?.kind === "child-exit" && typeof outcome.signal === "string"
      ? outcome.signal
      : null;
  cleanupPlan ??= deriveHkVisualizationWorkloadCleanupPlan({
    deadlineEpochMs: parsed.deadlineEpochMs,
  });
  if (
    process.hrtime.bigint() >= cleanupPlan.deadlineMonotonicNs &&
    cleanup?.cleanupTiming == null
  ) {
    cleanupFallbackExpiryPhase ??= "supervisor-cleanup-complete";
    recordCleanupDeadlineExpiry();
  }
  const receipt = buildReceipt({
    manifest,
    runnerPid: parsed.runnerPid,
    commandHash: parsed.commandHash,
    deadlineEpochMs: parsed.deadlineEpochMs,
    observerIdentity,
    leaderIdentity,
    leaderPid,
    pgid,
    startedAtUtc,
    completedAtUtc: new Date().toISOString(),
    stopReason,
    workloadExitCode,
    workloadSignal,
    polling,
    pollingObservations,
    cleanup,
    cleanupPlan,
    cleanupFallbackExpiryPhase,
    ledgerFallback: ledger,
    lockNonceHash,
    nextEnvBeforeSha256,
    nextEnvAfterSha256,
    nextEnvRestored,
    nextTsconfigEvidence,
    sourceHashes: actualSourceHashes,
    errors,
  });
  try {
    if (snapshotWritten)
      atomicWrite(paths.receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);
    return receipt;
  } finally {
    process.off("SIGTERM", onSigterm);
    process.off("SIGINT", onSigint);
    process.off("SIGHUP", onSighup);
  }
}

export { cleanupHkVisualizationOwnedProcessLedger };

function isDirectInvocation() {
  return Boolean(
    process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url),
  );
}

if (isDirectInvocation()) {
  runHkVisualizationWorkloadSupervisor()
    .then((receipt) => {
      process.exitCode = receipt.status === "complete" ? 0 : 1;
    })
    .catch((error) => {
      process.stderr.write(`${safeError(error)}\n`);
      process.exitCode = 1;
    });
}
