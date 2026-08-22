#!/usr/bin/env node

import { execFileSync, spawn } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import {
  closeSync,
  constants as fsConstants,
  fstatSync,
  fsyncSync,
  fchmodSync,
  lstatSync,
  linkSync,
  mkdirSync,
  openSync,
  readFileSync,
  readSync,
  readdirSync,
  realpathSync,
  writeFileSync,
  writeSync
} from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const STARSHIP_ROOT = "/Volumes/Starship";
const SUPERVISOR_CONTRACT = "starship-playwright-supervisor-v2";
const SUPERVISOR_SCHEMA_VERSION = 2;
const PROCESS_SCAN_INTERVAL_MS = 25;
const ZERO_SCAN_TARGET = 2;

const OPTIONAL_INHERITED_MUTABLE_PATHS = Object.freeze([
  "CHROME_LOG_FILE",
  "DEBUG_FILE",
  "NODE_V8_COVERAGE",
  "NPM_CONFIG_LOGS_DIR",
  "NPM_CONFIG_TMP",
  "PLAYWRIGHT_BROWSERS_PATH",
  "XDG_CACHE_HOME",
  "XDG_CONFIG_HOME",
  "XDG_DATA_HOME",
  "XDG_RUNTIME_DIR",
  "XDG_STATE_HOME",
  "npm_config_globalconfig",
  "npm_config_local_prefix",
  "npm_config_logs_dir",
  "npm_config_prefix",
  "npm_config_store_dir",
  "npm_config_tmp",
  "npm_config_userconfig"
]);

const INNER_RUNNER_OWNED_ENVIRONMENT = Object.freeze([
  "HK_MATH_DB_PATH",
  "MAIS_FOCUSED_PLAYWRIGHT_ARGS_JSON",
  "PLAYWRIGHT_BROWSER_PROFILE_EVIDENCE_PATH",
  "PLAYWRIGHT_BROWSER_PROCESS_EVIDENCE_PATH",
  "PLAYWRIGHT_BROWSER_TEMP_DIR",
  "PLAYWRIGHT_CRASH_DUMP_DIR",
  "PLAYWRIGHT_E2E_ROOT",
  "PLAYWRIGHT_JSON_OUTPUT_FILE",
  "PLAYWRIGHT_NEXT_DIST_DIR",
  "PLAYWRIGHT_NEXT_TSCONFIG_PATH",
  "PLAYWRIGHT_OUTPUT_DIR",
  "PLAYWRIGHT_PATH_MANIFEST_PATH",
  "PLAYWRIGHT_REPORT_DIR",
  "PLAYWRIGHT_RUN_ID",
  "PLAYWRIGHT_SERVER_COMMAND_OWNER_PID_PATH",
  "PLAYWRIGHT_SERVER_LOG_PATH",
  "PLAYWRIGHT_STARSHIP_PRELAUNCH"
]);

const PRELOAD_ENVIRONMENT_NAMES = Object.freeze({
  nonce: "STARSHIP_SUPERVISOR_RUN_NONCE",
  preloadPath: "STARSHIP_SUPERVISOR_PRELOAD_PATH",
  preloadSha256: "STARSHIP_SUPERVISOR_PRELOAD_SHA256",
  registryDevice: "STARSHIP_SUPERVISOR_REGISTRY_DEVICE",
  registryFd: "STARSHIP_SUPERVISOR_REGISTRY_FD",
  registryInode: "STARSHIP_SUPERVISOR_REGISTRY_INODE",
  runLockPath: "STARSHIP_SUPERVISOR_RUN_LOCK_PATH",
  runnerPath: "STARSHIP_SUPERVISOR_RUNNER_PATH",
  runnerSha256: "STARSHIP_SUPERVISOR_RUNNER_SHA256",
  runToken: "STARSHIP_SUPERVISOR_RUN_TOKEN",
  runTokenSha256: "STARSHIP_SUPERVISOR_RUN_TOKEN_SHA256",
  tsconfigPath: "STARSHIP_SUPERVISOR_TSCONFIG_PATH"
});

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function errorText(error) {
  return error instanceof Error ? error.message : String(error);
}

function isInside(candidate, root) {
  const relative = path.relative(root, candidate);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function validateRunId(value) {
  if (
    typeof value !== "string" ||
    !/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/u.test(value) ||
    value === "." ||
    value === ".."
  ) {
    throw new Error(
      "runId must be a fresh canonical 1-128 character path segment using letters, digits, dot, underscore, or hyphen."
    );
  }
  return value;
}

function validateBoundedDuration(value, label, fallback) {
  const actual = value ?? fallback;
  if (!Number.isInteger(actual) || actual < 1 || actual > 60_000) {
    throw new Error(`${label} must be an integer from 1 through 60000 milliseconds.`);
  }
  return actual;
}

function lstatMaybe(filePath) {
  try {
    return lstatSync(filePath);
  } catch (error) {
    if (error?.code === "ENOENT" || error?.code === "ENOTDIR") return null;
    throw error;
  }
}

function lstatBigintMaybe(filePath) {
  try {
    return lstatSync(filePath, { bigint: true });
  } catch (error) {
    if (error?.code === "ENOENT" || error?.code === "ENOTDIR") return null;
    throw error;
  }
}

function assertStarshipLexicalPath(label, value) {
  if (typeof value !== "string" || value.trim().length === 0 || !path.isAbsolute(value)) {
    throw new Error(`${label} must be an absolute path under ${STARSHIP_ROOT}/.`);
  }
  const lexical = path.resolve(value);
  if (!isInside(lexical, STARSHIP_ROOT) || lexical === STARSHIP_ROOT) {
    throw new Error(`${label} must resolve under ${STARSHIP_ROOT}/; received ${value}.`);
  }
  return lexical;
}

function existingPathPrefixes(absolutePath) {
  const parsed = path.parse(absolutePath);
  const segments = absolutePath.slice(parsed.root.length).split(path.sep).filter(Boolean);
  const prefixes = [];
  let cursor = parsed.root;
  for (const segment of segments) {
    cursor = path.join(cursor, segment);
    prefixes.push(cursor);
  }
  return prefixes;
}

function assertNoSymlinkComponents(label, absolutePath) {
  for (const prefix of existingPathPrefixes(absolutePath)) {
    const stat = lstatMaybe(prefix);
    if (!stat) break;
    if (stat.isSymbolicLink()) {
      throw new Error(`${label} contains a symbolic-link component: ${prefix}.`);
    }
  }
  return absolutePath;
}

function assertSafePath(label, value, { containmentRoot } = {}) {
  const lexical = assertStarshipLexicalPath(label, value);
  if (containmentRoot && !isInside(lexical, containmentRoot)) {
    throw new Error(`${label} escapes its containment root; path=${lexical}, root=${containmentRoot}.`);
  }
  assertNoSymlinkComponents(label, lexical);
  return lexical;
}

function pathEntryExists(filePath) {
  return lstatMaybe(filePath) !== null;
}

function requireFreshPath(label, value) {
  if (pathEntryExists(value)) {
    throw new Error(`Supervisor requires a fresh run; ${label} already exists: ${value}.`);
  }
}

function ensureSafeDirectory(label, directoryPath, containmentRoot) {
  const canonical = assertSafePath(label, directoryPath, { containmentRoot });
  const root = containmentRoot ?? STARSHIP_ROOT;
  if (!isInside(canonical, root)) {
    throw new Error(`${label} escapes directory creation root ${root}: ${canonical}.`);
  }
  const relative = path.relative(root, canonical);
  let cursor = root;
  for (const segment of relative.split(path.sep).filter(Boolean)) {
    cursor = path.join(cursor, segment);
    let stat = lstatMaybe(cursor);
    if (!stat) {
      try {
        mkdirSync(cursor, { mode: 0o700 });
      } catch (error) {
        if (error?.code !== "EEXIST") throw error;
      }
      stat = lstatMaybe(cursor);
    }
    if (!stat || stat.isSymbolicLink() || !stat.isDirectory()) {
      throw new Error(`${label} requires regular directory components; invalid component ${cursor}.`);
    }
  }
  return canonical;
}

function fsyncDirectory(directoryPath) {
  const descriptor = openSync(
    directoryPath,
    fsConstants.O_RDONLY | fsConstants.O_DIRECTORY | fsConstants.O_NOFOLLOW
  );
  try {
    fsyncSync(descriptor);
  } finally {
    closeSync(descriptor);
  }
}

function openDirectoryIdentityAnchor(label, directoryPath, containmentRoot) {
  const canonical = assertSafePath(label, directoryPath, { containmentRoot });
  const lexicalStat = lstatBigintMaybe(canonical);
  if (!lexicalStat || lexicalStat.isSymbolicLink() || !lexicalStat.isDirectory()) {
    throw new Error(`${label} must be a regular non-symlink directory: ${canonical}.`);
  }
  if (realpathSync.native(canonical) !== canonical) {
    throw new Error(`${label} canonical identity differs from its lexical path: ${canonical}.`);
  }
  const descriptor = openSync(
    canonical,
    fsConstants.O_RDONLY | fsConstants.O_DIRECTORY | fsConstants.O_NOFOLLOW
  );
  try {
    const held = fstatSync(descriptor, { bigint: true });
    if (!held.isDirectory() || held.dev !== lexicalStat.dev || held.ino !== lexicalStat.ino) {
      throw new Error(`${label} changed identity between lstat and descriptor open: ${canonical}.`);
    }
    return Object.freeze({
      descriptor,
      label,
      path: canonical,
      receipt: descriptorReceipt(held)
    });
  } catch (error) {
    closeSync(descriptor);
    throw error;
  }
}

function validateDirectoryIdentityAnchor(anchor) {
  const held = fstatSync(anchor.descriptor, { bigint: true });
  const current = lstatBigintMaybe(anchor.path);
  return held.isDirectory() &&
    current?.isDirectory() === true &&
    !current.isSymbolicLink() &&
    held.dev.toString(10) === anchor.receipt.device &&
    held.ino.toString(10) === anchor.receipt.inode &&
    current.dev.toString(10) === anchor.receipt.device &&
    current.ino.toString(10) === anchor.receipt.inode &&
    realpathSync.native(anchor.path) === anchor.path;
}

function descriptorReceipt(stat) {
  const numeric = (value) => typeof value === "bigint" ? Number(value) : value;
  const decimal = (value, label) => {
    if (typeof value !== "bigint") {
      throw new Error(`${label} must remain an exact BigInt until receipt serialization.`);
    }
    return value.toString(10);
  };
  const nanoseconds = (name, millisecondsName) => {
    const exact = stat[name];
    if (typeof exact === "bigint") return exact.toString();
    const milliseconds = stat[millisecondsName];
    return Number.isFinite(milliseconds)
      ? BigInt(Math.round(milliseconds * 1_000_000)).toString()
      : null;
  };
  const mode = numeric(stat.mode);
  return Object.freeze({
    ctimeNs: nanoseconds("ctimeNs", "ctimeMs"),
    device: decimal(stat.dev, "device"),
    inode: decimal(stat.ino, "inode"),
    mode: (mode & 0o777).toString(8).padStart(3, "0"),
    mtimeNs: nanoseconds("mtimeNs", "mtimeMs"),
    size: numeric(stat.size)
  });
}

function safeReadFile(label, filePath, { containmentRoot, required = true } = {}) {
  const canonical = assertSafePath(label, filePath, { containmentRoot });
  const lexicalStat = lstatBigintMaybe(canonical);
  if (!lexicalStat) {
    if (required) throw new Error(`${label} is missing: ${canonical}.`);
    return Object.freeze({ bytes: null, receipt: Object.freeze({ exists: false, path: canonical }) });
  }
  if (lexicalStat.isSymbolicLink() || !lexicalStat.isFile()) {
    throw new Error(`${label} must be a regular non-symlink file: ${canonical}.`);
  }
  const descriptor = openSync(canonical, fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW);
  try {
    const before = fstatSync(descriptor, { bigint: true });
    if (!before.isFile() || before.dev !== lexicalStat.dev || before.ino !== lexicalStat.ino) {
      throw new Error(`${label} changed identity between lstat and O_NOFOLLOW open: ${canonical}.`);
    }
    const bytes = readFileSync(descriptor);
    const after = fstatSync(descriptor, { bigint: true });
    if (
      before.dev !== after.dev ||
      before.ino !== after.ino ||
      before.size !== after.size ||
      before.mtimeMs !== after.mtimeMs ||
      BigInt(bytes.length) !== after.size
    ) {
      throw new Error(`${label} changed while its exact bytes were being read: ${canonical}.`);
    }
    return Object.freeze({
      bytes,
      receipt: Object.freeze({
        ...descriptorReceipt(fstatSync(descriptor, { bigint: true })),
        exists: true,
        path: canonical,
        pathSha256: sha256(Buffer.from(canonical, "utf8")),
        sha256: sha256(bytes)
      })
    });
  } finally {
    closeSync(descriptor);
  }
}

function fileReceipt(label, filePath, options = {}) {
  return safeReadFile(label, filePath, options).receipt;
}

function captureRawInnerFullRunRuntimeSourceHold(paths, repositoryRoot) {
  const receiptPath = assertSafePath(
    "inner full-run runtime source hold receipt",
    path.join(paths.e2eRunRoot, "evidence", "full-run-runtime-source-hold.json"),
    { containmentRoot: repositoryRoot }
  );
  try {
    const observed = safeReadFile(
      "inner full-run runtime source hold receipt",
      receiptPath,
      { containmentRoot: repositoryRoot, required: false }
    );
    return Object.freeze({
      path: receiptPath,
      rawBase64: observed.bytes ? observed.bytes.toString("base64") : null,
      rawUtf8: observed.bytes ? observed.bytes.toString("utf8") : null,
      receipt: observed.receipt
    });
  } catch (error) {
    return Object.freeze({
      error: errorText(error),
      path: receiptPath,
      rawBase64: null,
      rawUtf8: null,
      receipt: null
    });
  }
}

function sameIdentity(left, right) {
  return left?.exists === true &&
    right?.exists === true &&
    left.device === right.device &&
    left.inode === right.inode;
}

function receiptsEqual(left, right) {
  return left?.exists === right?.exists &&
    left?.mode === right?.mode &&
    left?.sha256 === right?.sha256 &&
    left?.size === right?.size;
}

function stableReceiptsEqual(left, right) {
  return receiptsEqual(left, right) &&
    left?.ctimeNs === right?.ctimeNs &&
    left?.mtimeNs === right?.mtimeNs;
}

function writeAll(descriptor, bytes) {
  const buffer = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);
  let offset = 0;
  while (offset < buffer.length) {
    offset += writeSync(descriptor, buffer, offset, buffer.length - offset);
  }
}

function writeExclusiveFile(label, filePath, bytes, { containmentRoot, mode = 0o600 } = {}) {
  const canonical = assertSafePath(label, filePath, { containmentRoot });
  ensureSafeDirectory(`${label} parent`, path.dirname(canonical), containmentRoot);
  const parentAnchor = openDirectoryIdentityAnchor(
    `${label} parent`, path.dirname(canonical), containmentRoot
  );
  let descriptor = null;
  try {
    if (!validateDirectoryIdentityAnchor(parentAnchor)) {
      throw new Error(`${label} parent identity changed before exclusive creation.`);
    }
    descriptor = openSync(
      canonical,
      fsConstants.O_WRONLY |
        fsConstants.O_CREAT |
        fsConstants.O_EXCL |
        fsConstants.O_NOFOLLOW,
      mode
    );
    fchmodSync(descriptor, mode);
    writeAll(descriptor, bytes);
    fsyncSync(descriptor);
    fsyncSync(parentAnchor.descriptor);
    if (!validateDirectoryIdentityAnchor(parentAnchor)) {
      throw new Error(`${label} parent identity changed during exclusive creation.`);
    }
  } finally {
    if (descriptor !== null) closeSync(descriptor);
    closeSync(parentAnchor.descriptor);
  }
  return fileReceipt(label, canonical, { containmentRoot });
}

function reserveExclusiveFile(label, filePath, containmentRoot) {
  const canonical = assertSafePath(label, filePath, { containmentRoot });
  ensureSafeDirectory(`${label} parent`, path.dirname(canonical), containmentRoot);
  const parentAnchor = openDirectoryIdentityAnchor(
    `${label} parent`, path.dirname(canonical), containmentRoot
  );
  let descriptor = null;
  try {
    if (!validateDirectoryIdentityAnchor(parentAnchor)) {
      throw new Error(`${label} parent identity changed before reservation.`);
    }
    descriptor = openSync(
      canonical,
      fsConstants.O_WRONLY |
        fsConstants.O_CREAT |
        fsConstants.O_EXCL |
        fsConstants.O_NOFOLLOW,
      0o600
    );
    const stat = fstatSync(descriptor, { bigint: true });
    fsyncSync(parentAnchor.descriptor);
    if (!validateDirectoryIdentityAnchor(parentAnchor)) {
      closeSync(descriptor);
      descriptor = null;
      throw new Error(`${label} parent identity changed during reservation.`);
    }
    const reservation = Object.freeze({ descriptor, initial: descriptorReceipt(stat), path: canonical });
    descriptor = null;
    return reservation;
  } finally {
    if (descriptor !== null) closeSync(descriptor);
    closeSync(parentAnchor.descriptor);
  }
}

function reserveAppendJournal(label, filePath, containmentRoot) {
  const canonical = assertSafePath(label, filePath, { containmentRoot });
  ensureSafeDirectory(`${label} parent`, path.dirname(canonical), containmentRoot);
  const parentAnchor = openDirectoryIdentityAnchor(
    `${label} parent`, path.dirname(canonical), containmentRoot
  );
  let descriptor = null;
  try {
    if (!validateDirectoryIdentityAnchor(parentAnchor)) {
      throw new Error(`${label} parent identity changed before journal reservation.`);
    }
    descriptor = openSync(
      canonical,
      fsConstants.O_RDWR |
        fsConstants.O_APPEND |
        fsConstants.O_CREAT |
        fsConstants.O_EXCL |
        fsConstants.O_NOFOLLOW,
      0o600
    );
    const stat = fstatSync(descriptor, { bigint: true });
    fsyncSync(parentAnchor.descriptor);
    if (!validateDirectoryIdentityAnchor(parentAnchor)) {
      closeSync(descriptor);
      descriptor = null;
      throw new Error(`${label} parent identity changed during journal reservation.`);
    }
    const reservation = Object.freeze({ descriptor, initial: descriptorReceipt(stat), path: canonical });
    descriptor = null;
    return reservation;
  } finally {
    if (descriptor !== null) closeSync(descriptor);
    closeSync(parentAnchor.descriptor);
  }
}

function exactEnvironmentReceipt(environment) {
  const entries = Object.entries(environment)
    .map(([name, value]) => [name, String(value)])
    .sort(([left], [right]) => left.localeCompare(right));
  return Object.freeze({
    names: Object.freeze(entries.map(([name]) => name)),
    sha256: sha256(Buffer.from(JSON.stringify(entries), "utf8")),
    valueCount: entries.length
  });
}

function snapshotTrackedFile(filePath, repositoryRoot) {
  const snapshot = safeReadFile("tracked Next environment file", filePath, {
    containmentRoot: repositoryRoot,
    required: false
  });
  return Object.freeze(snapshot);
}

function validateRepositoryRoot(value) {
  const lexical = assertSafePath("repositoryRoot", value);
  const stat = lstatMaybe(lexical);
  if (!stat || stat.isSymbolicLink() || !stat.isDirectory()) {
    throw new Error(`repositoryRoot must be a real directory, not a symlink: ${lexical}.`);
  }
  const canonical = realpathSync.native(lexical);
  if (canonical !== lexical) {
    throw new Error(`repositoryRoot canonical identity differs from its lexical path: ${lexical}.`);
  }
  return canonical;
}

function validateInnerRunner(value, repositoryRoot) {
  const canonical = assertSafePath("inner Playwright runner", value, {
    containmentRoot: repositoryRoot
  });
  fileReceipt("inner Playwright runner", canonical, { containmentRoot: repositoryRoot });
  return canonical;
}

function buildPreloadSource() {
  return `'use strict';
const childProcess = require('node:child_process');
const crypto = require('node:crypto');
const fs = require('node:fs');
const moduleBuiltin = require('node:module');
const path = require('node:path');
const util = require('node:util');

const ENV = ${JSON.stringify(PRELOAD_ENVIRONMENT_NAMES)};
const registryFd = Number(process.env[ENV.registryFd]);
const expectedRegistryDevice = process.env[ENV.registryDevice];
const expectedRegistryInode = process.env[ENV.registryInode];
const runNonce = process.env[ENV.nonce];
const runToken = process.env[ENV.runToken];
const expectedPreloadPath = process.env[ENV.preloadPath];
const expectedPreloadSha256 = process.env[ENV.preloadSha256];
const expectedRunnerPath = process.env[ENV.runnerPath];
const expectedRunnerSha256 = process.env[ENV.runnerSha256];
const expectedRunLockPath = process.env[ENV.runLockPath];
const expectedTokenSha256 = process.env[ENV.runTokenSha256];
const expectedTsconfigPath = process.env[ENV.tsconfigPath];
const starshipRoot = ${JSON.stringify(STARSHIP_ROOT)};
const original = Object.freeze({
  exec: childProcess.exec,
  execFile: childProcess.execFile,
  execFileSync: childProcess.execFileSync,
  execSync: childProcess.execSync,
  fork: childProcess.fork,
  spawn: childProcess.spawn,
  spawnSync: childProcess.spawnSync
});
let sequence = 0;

function hash(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function fail(message) {
  throw new Error('Starship supervisor preload: ' + message);
}

if (!Number.isInteger(registryFd) || registryFd < 3 ||
    !/^\\d+$/u.test(expectedRegistryDevice || '') || !/^\\d+$/u.test(expectedRegistryInode || '') ||
    !runNonce || !runToken || !expectedPreloadPath || !expectedPreloadSha256 ||
    !expectedRunnerPath || !expectedRunnerSha256 || !expectedRunLockPath ||
    !expectedTsconfigPath) {
  fail('missing exact supervisor environment');
}
const registryDescriptorStat = fs.fstatSync(registryFd, { bigint: true });
if (!registryDescriptorStat.isFile() ||
    registryDescriptorStat.dev.toString(10) !== expectedRegistryDevice ||
    registryDescriptorStat.ino.toString(10) !== expectedRegistryInode) {
  fail('registry descriptor identity mismatch');
}
if (path.resolve(__filename) !== path.resolve(expectedPreloadPath)) {
  fail('preload path identity mismatch');
}
const preloadLexicalPath = path.resolve(__filename);
const preloadCanonicalPath = fs.realpathSync.native(preloadLexicalPath);
const preloadRelative = path.relative(starshipRoot, preloadCanonicalPath);
if (preloadCanonicalPath !== preloadLexicalPath ||
    preloadRelative === '' || preloadRelative.startsWith('..') || path.isAbsolute(preloadRelative)) {
  fail('preload path is not a canonical non-symlink Starship path');
}
const preloadLstat = fs.lstatSync(preloadLexicalPath, { bigint: true });
if (!preloadLstat.isFile() || preloadLstat.isSymbolicLink()) {
  fail('preload path is not a regular non-symlink file');
}
const preloadFd = fs.openSync(
  preloadLexicalPath,
  fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW
);
let preloadBytes;
try {
  const preloadFstat = fs.fstatSync(preloadFd, { bigint: true });
  if (!preloadFstat.isFile() ||
      preloadFstat.dev !== preloadLstat.dev || preloadFstat.ino !== preloadLstat.ino) {
    fail('preload descriptor identity mismatch');
  }
  preloadBytes = fs.readFileSync(preloadFd);
} finally {
  fs.closeSync(preloadFd);
}
if (hash(preloadBytes) !== expectedPreloadSha256) {
  fail('preload source SHA-256 mismatch');
}
const runnerLexicalPath = path.resolve(expectedRunnerPath);
const runnerCanonicalPath = fs.realpathSync.native(runnerLexicalPath);
const runnerRelative = path.relative(starshipRoot, runnerCanonicalPath);
if (runnerCanonicalPath !== runnerLexicalPath || runnerRelative === '' ||
    runnerRelative.startsWith('..') || path.isAbsolute(runnerRelative)) {
  fail('inner runner path is not a canonical non-symlink Starship path');
}
const runnerLstat = fs.lstatSync(runnerLexicalPath, { bigint: true });
if (!runnerLstat.isFile() || runnerLstat.isSymbolicLink()) {
  fail('inner runner path is not a regular non-symlink file');
}
const runnerFd = fs.openSync(runnerLexicalPath, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW);
let runnerBytes;
try {
  const runnerFstat = fs.fstatSync(runnerFd, { bigint: true });
  if (!runnerFstat.isFile() || runnerFstat.dev !== runnerLstat.dev ||
      runnerFstat.ino !== runnerLstat.ino) {
    fail('inner runner descriptor identity mismatch');
  }
  runnerBytes = fs.readFileSync(runnerFd);
} finally {
  fs.closeSync(runnerFd);
}
if (hash(runnerBytes) !== expectedRunnerSha256) {
  fail('inner runner source SHA-256 mismatch');
}
if (hash(runToken) !== expectedTokenSha256) {
  fail('run token SHA-256 mismatch');
}
const capturedSupervisorEnvironment = Object.freeze({
  [ENV.nonce]: runNonce,
  [ENV.preloadPath]: expectedPreloadPath,
  [ENV.preloadSha256]: expectedPreloadSha256,
  [ENV.registryDevice]: expectedRegistryDevice,
  [ENV.registryInode]: expectedRegistryInode,
  [ENV.runnerPath]: runnerLexicalPath,
  [ENV.runnerSha256]: expectedRunnerSha256,
  [ENV.runLockPath]: expectedRunLockPath,
  [ENV.runToken]: runToken,
  [ENV.runTokenSha256]: expectedTokenSha256,
  [ENV.tsconfigPath]: expectedTsconfigPath
});

function writeRegistryFile(fileName, value) {
  const bytes = Buffer.from(JSON.stringify({ fileName, value }) + '\\n', 'utf8');
  if (bytes.length > 16 * 1024) fail('registry record exceeds the bounded journal line size');
  const written = fs.writeSync(registryFd, bytes, 0, bytes.length, null);
  if (written !== bytes.length) fail('registry journal write was partial');
  fs.fsyncSync(registryFd);
}

function processIdentity(pid) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      const output = original.execFileSync(
        '/bin/ps',
        ['-p', String(pid), '-o', 'pid=,pgid=,lstart=,command='],
        { encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 }
      ).trim();
      const match = output.match(/^\\s*(\\d+)\\s+(\\d+)\\s+(\\S+\\s+\\S+\\s+\\d+\\s+\\d\\d:\\d\\d:\\d\\d\\s+\\d{4})\\s+(.*)$/u);
      if (match && Number(match[1]) === pid) {
        return {
          pgid: Number(match[2]),
          processCommandSha256: hash(Buffer.from(match[4], 'utf8')),
          startToken: match[3].trim()
        };
      }
    } catch {}
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 2);
  }
  return null;
}

const preloadIdentity = processIdentity(process.pid);
if (!preloadIdentity) fail('could not bind preload process identity');
const preloadAckEventId = 'preload-' + process.pid + '-' + crypto.randomBytes(8).toString('hex');
writeRegistryFile(preloadAckEventId + '.ack.json', {
  createdAt: new Date().toISOString(),
  eventId: preloadAckEventId,
  pgid: preloadIdentity.pgid,
  pid: process.pid,
  preloadPathSha256: hash(Buffer.from(preloadLexicalPath, 'utf8')),
  preloadSha256: expectedPreloadSha256,
  processCommandSha256: preloadIdentity.processCommandSha256,
  runNonceSha256: hash(runNonce),
  runnerPathSha256: hash(Buffer.from(runnerLexicalPath, 'utf8')),
  runnerSha256: expectedRunnerSha256,
  runTokenSha256: hash(runToken),
  schemaVersion: 1,
  startToken: preloadIdentity.startToken
});

const canonicalExpectedTsconfigPath = path.resolve(expectedTsconfigPath);
const canonicalTsconfigParent = fs.realpathSync.native(path.dirname(canonicalExpectedTsconfigPath));
const tsconfigParentRelative = path.relative(starshipRoot, canonicalTsconfigParent);
if (canonicalTsconfigParent !== path.dirname(canonicalExpectedTsconfigPath) ||
    tsconfigParentRelative === '' || tsconfigParentRelative.startsWith('..') ||
    path.isAbsolute(tsconfigParentRelative)) {
  fail('tsconfig parent is not a canonical non-symlink Starship directory');
}
const canonicalExpectedRunLockPath = path.resolve(expectedRunLockPath);
const canonicalRunLockParent = fs.realpathSync.native(path.dirname(canonicalExpectedRunLockPath));
const runLockParentRelative = path.relative(starshipRoot, canonicalRunLockParent);
if (canonicalRunLockParent !== path.dirname(canonicalExpectedRunLockPath) ||
    runLockParentRelative === '' || runLockParentRelative.startsWith('..') ||
    path.isAbsolute(runLockParentRelative)) {
  fail('run-lock parent is not a canonical non-symlink Starship directory');
}
const originalOpenSync = fs.openSync.bind(fs);
const originalWriteFileSync = fs.writeFileSync.bind(fs);
const pendingRunLockDescriptors = new Map();
const pendingTsconfigDescriptors = new Map();
const recordedRunLockIdentities = new Set();
const recordedTsconfigIdentities = new Set();
let legacyTsconfigPathWriteInProgress = false;

function recordRunLockCreation() {
  const afterLstat = fs.lstatSync(canonicalExpectedRunLockPath, { bigint: true });
  if (!afterLstat.isFile() || afterLstat.isSymbolicLink()) {
    fail('created inner run lock is not a regular non-symlink file');
  }
  const createdFd = originalOpenSync(
    canonicalExpectedRunLockPath,
    fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW
  );
  let createdBytes;
  let createdStat;
  try {
    createdStat = fs.fstatSync(createdFd, { bigint: true });
    if (!createdStat.isFile() || createdStat.dev !== afterLstat.dev ||
        createdStat.ino !== afterLstat.ino) {
      fail('created inner run-lock descriptor identity mismatch');
    }
    createdBytes = fs.readFileSync(createdFd);
  } finally {
    fs.closeSync(createdFd);
  }
  const identityKey = String(createdStat.dev) + ':' + String(createdStat.ino);
  if (recordedRunLockIdentities.has(identityKey)) return;
  recordedRunLockIdentities.add(identityKey);
  const creator = processIdentity(process.pid);
  if (!creator) fail('could not bind inner run-lock creator identity');
  const eventId = 'runlock-' + process.pid + '-' + crypto.randomBytes(8).toString('hex');
  writeRegistryFile(eventId + '.runlock.json', {
    createdAt: new Date().toISOString(),
    device: createdStat.dev.toString(10),
    eventId,
    inode: createdStat.ino.toString(10),
    mode: Number(createdStat.mode & 0o777n).toString(8),
    pathSha256: hash(Buffer.from(canonicalExpectedRunLockPath, 'utf8')),
    pgid: creator.pgid,
    pid: process.pid,
    processCommandSha256: creator.processCommandSha256,
    runNonceSha256: hash(runNonce),
    runTokenSha256: hash(runToken),
    schemaVersion: 1,
    sha256: hash(createdBytes),
    size: createdBytes.length,
    startToken: creator.startToken
  });
}

function readCreatedDescriptorBytes(descriptor, createdStat, label) {
  if (createdStat.size > BigInt(Number.MAX_SAFE_INTEGER)) {
    fail(label + ' is too large to receipt safely');
  }
  const bytes = Buffer.alloc(Number(createdStat.size));
  let offset = 0;
  while (offset < bytes.length) {
    const count = fs.readSync(descriptor, bytes, offset, bytes.length - offset, offset);
    if (count === 0) fail(label + ' reached EOF before its captured size');
    offset += count;
  }
  const after = fs.fstatSync(descriptor, { bigint: true });
  if (!after.isFile() || after.dev !== createdStat.dev || after.ino !== createdStat.ino ||
      after.size !== createdStat.size || after.mode !== createdStat.mode ||
      after.mtimeNs !== createdStat.mtimeNs || after.ctimeNs !== createdStat.ctimeNs) {
    fail(label + ' changed while reading its creation descriptor');
  }
  return bytes;
}

function recordTsconfigCreationFromDescriptor(descriptor, beforeExists) {
  const createdStat = fs.fstatSync(descriptor, { bigint: true });
  if (!createdStat.isFile()) fail('created run-specific tsconfig descriptor is not regular');
  const afterLstat = fs.lstatSync(canonicalExpectedTsconfigPath, { bigint: true });
  if (!afterLstat.isFile() || afterLstat.isSymbolicLink() ||
      createdStat.dev !== afterLstat.dev || createdStat.ino !== afterLstat.ino) {
    fail('created run-specific tsconfig descriptor identity mismatch');
  }
  const createdBytes = readCreatedDescriptorBytes(
    descriptor,
    createdStat,
    'created run-specific tsconfig'
  );
  const identityKey = String(createdStat.dev) + ':' + String(createdStat.ino);
  if (recordedTsconfigIdentities.has(identityKey)) return;
  recordedTsconfigIdentities.add(identityKey);
  const creator = processIdentity(process.pid);
  if (!creator) fail('could not bind run-specific tsconfig creator identity');
  const eventId = 'tsconfig-' + process.pid + '-' + crypto.randomBytes(8).toString('hex');
  writeRegistryFile(eventId + '.tsconfig.json', {
    beforeExists,
    createdAt: new Date().toISOString(),
    device: createdStat.dev.toString(10),
    eventId,
    inode: createdStat.ino.toString(10),
    mode: Number(createdStat.mode & 0o777n).toString(8),
    pathSha256: hash(Buffer.from(canonicalExpectedTsconfigPath, 'utf8')),
    pgid: creator.pgid,
    pid: process.pid,
    processCommandSha256: creator.processCommandSha256,
    runNonceSha256: hash(runNonce),
    runTokenSha256: hash(runToken),
    schemaVersion: 1,
    sha256: hash(createdBytes),
    size: createdBytes.length,
    startToken: creator.startToken
  });
}

function recordTsconfigCreationFromPath(beforeExists) {
  const createdFd = originalOpenSync(
    canonicalExpectedTsconfigPath,
    fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW
  );
  try {
    recordTsconfigCreationFromDescriptor(createdFd, beforeExists);
  } finally {
    fs.closeSync(createdFd);
  }
}

fs.openSync = function supervisedOpenSync(target, flags, ...args) {
  const targetPath = typeof target === 'string' ? path.resolve(target) : null;
  let beforeExists = false;
  if (targetPath === canonicalExpectedRunLockPath ||
      targetPath === canonicalExpectedTsconfigPath) {
    try {
      fs.lstatSync(targetPath);
      beforeExists = true;
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
    }
  }
  const descriptor = originalOpenSync(target, flags, ...args);
  if (targetPath === canonicalExpectedRunLockPath) {
    if (beforeExists) fail('inner run lock must be created from an absent path');
    const stat = fs.fstatSync(descriptor, { bigint: true });
    if (!stat.isFile()) fail('inner run-lock descriptor is not regular');
    pendingRunLockDescriptors.set(descriptor, {
      device: stat.dev.toString(10),
      inode: stat.ino.toString(10)
    });
  }
  if (targetPath === canonicalExpectedTsconfigPath) {
    if (legacyTsconfigPathWriteInProgress) return descriptor;
    if (beforeExists) fail('run-specific tsconfig must be created from an absent path');
    if (!Number.isInteger(flags) ||
        (flags & fs.constants.O_CREAT) === 0 ||
        (flags & fs.constants.O_EXCL) === 0 ||
        (flags & fs.constants.O_NOFOLLOW) === 0 ||
        (flags & (fs.constants.O_WRONLY | fs.constants.O_RDWR)) === 0) {
      fail('run-specific tsconfig descriptor creation requires writable O_CREAT|O_EXCL|O_NOFOLLOW');
    }
    const stat = fs.fstatSync(descriptor, { bigint: true });
    if (!stat.isFile()) fail('run-specific tsconfig descriptor is not regular');
    pendingTsconfigDescriptors.set(descriptor, {
      device: stat.dev.toString(10),
      inode: stat.ino.toString(10)
    });
  }
  return descriptor;
};

fs.writeFileSync = function supervisedWriteFileSync(target, ...args) {
  const targetPath = typeof target === 'string' ? path.resolve(target) : null;
  const pendingRunLock = Number.isInteger(target)
    ? pendingRunLockDescriptors.get(target)
    : null;
  const pendingTsconfig = Number.isInteger(target)
    ? pendingTsconfigDescriptors.get(target)
    : null;
  if (targetPath === canonicalExpectedRunLockPath || pendingRunLock) {
    let beforeExists = false;
    if (targetPath === canonicalExpectedRunLockPath) {
      try {
        fs.lstatSync(targetPath);
        beforeExists = true;
      } catch (error) {
        if (error?.code !== 'ENOENT') throw error;
      }
      if (beforeExists) fail('inner run lock must be created exactly once from an absent path');
    }
    const result = originalWriteFileSync(target, ...args);
    if (pendingRunLock) {
      const after = fs.fstatSync(target, { bigint: true });
      if (after.dev.toString(10) !== pendingRunLock.device ||
          after.ino.toString(10) !== pendingRunLock.inode) {
        fail('inner run-lock descriptor changed while writing');
      }
      pendingRunLockDescriptors.delete(target);
    }
    recordRunLockCreation();
    return result;
  }
  if (targetPath !== canonicalExpectedTsconfigPath && !pendingTsconfig) {
    return originalWriteFileSync(target, ...args);
  }
  let beforeExists = false;
  if (targetPath === canonicalExpectedTsconfigPath) {
    try {
      const before = fs.lstatSync(targetPath);
      beforeExists = true;
      if (before.isSymbolicLink()) fail('refusing to write run-specific tsconfig through a symlink');
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
    }
  }
  if (targetPath === canonicalExpectedTsconfigPath && beforeExists) {
    fail('run-specific tsconfig must be created exactly once from an absent path');
  }
  let result;
  if (targetPath === canonicalExpectedTsconfigPath) {
    legacyTsconfigPathWriteInProgress = true;
    try {
      result = originalWriteFileSync(target, ...args);
    } finally {
      legacyTsconfigPathWriteInProgress = false;
    }
  } else {
    result = originalWriteFileSync(target, ...args);
  }
  if (pendingTsconfig) {
    const after = fs.fstatSync(target, { bigint: true });
    if (after.dev.toString(10) !== pendingTsconfig.device ||
        after.ino.toString(10) !== pendingTsconfig.inode) {
      fail('run-specific tsconfig descriptor changed while writing');
    }
    pendingTsconfigDescriptors.delete(target);
    recordTsconfigCreationFromDescriptor(target, false);
  } else {
    recordTsconfigCreationFromPath(beforeExists);
  }
  return result;
};

function injectEnvironment(options, kind = 'spawn') {
  const next = { ...(options || {}) };
  const environment = { ...(next.env || process.env) };
  for (const [name, value] of Object.entries(capturedSupervisorEnvironment)) {
    environment[name] = value;
  }
  const requiredOption = '--require=' + JSON.stringify(expectedPreloadPath);
  environment.NODE_OPTIONS = requiredOption;
  environment[ENV.tsconfigPath] = canonicalExpectedTsconfigPath;
  let stdio;
  if (Array.isArray(next.stdio)) {
    stdio = [...next.stdio];
  } else if (typeof next.stdio === 'string') {
    stdio = [next.stdio, next.stdio, next.stdio];
  } else if (kind === 'fork') {
    const inherited = next.silent === true ? 'pipe' : 'inherit';
    stdio = [inherited, inherited, inherited, 'ipc'];
  } else {
    stdio = ['pipe', 'pipe', 'pipe'];
  }
  const childRegistryFd = stdio.length;
  stdio.push(registryFd);
  environment[ENV.registryFd] = String(childRegistryFd);
  next.env = environment;
  next.stdio = stdio;
  return next;
}

function beginIntent(kind, command, args, options) {
  sequence += 1;
  const eventId = String(process.pid) + '-' + Date.now().toString(36) + '-' + sequence.toString(36) + '-' + crypto.randomBytes(8).toString('hex');
  const identity = processIdentity(process.pid);
  if (!identity) fail('could not bind spawning parent identity');
  const value = {
    argvSha256: hash(Buffer.from(JSON.stringify(Array.isArray(args) ? args.map(String) : []), 'utf8')),
    commandSha256: hash(Buffer.from(String(command), 'utf8')),
    createdAt: new Date().toISOString(),
    detachedRequested: options?.detached === true,
    eventId,
    kind,
    parentPgid: identity.pgid,
    parentPid: process.pid,
    parentProcessCommandSha256: identity.processCommandSha256,
    parentStartToken: identity.startToken,
    runNonceSha256: hash(runNonce),
    runTokenSha256: hash(runToken),
    schemaVersion: 1
  };
  writeRegistryFile(eventId + '.intent.json', value);
  return value;
}

function finishResult(intent, child, error, classification) {
  const emit = () => {
    let identity = null;
    if (Number.isInteger(child?.pid)) identity = processIdentity(child.pid);
    try {
      writeRegistryFile(intent.eventId + '.result.json', {
        createdAt: new Date().toISOString(),
        argvSha256: intent.argvSha256,
        classification,
        commandSha256: intent.commandSha256,
        errorSha256: error ? hash(Buffer.from(String(error?.message || error), 'utf8')) : null,
        eventId: intent.eventId,
        pgid: identity?.pgid ?? null,
        pid: Number.isInteger(child?.pid) ? child.pid : null,
        processCommandSha256: identity?.processCommandSha256 ?? null,
        runNonceSha256: intent.runNonceSha256,
        runTokenSha256: intent.runTokenSha256,
        schemaVersion: 1,
        startToken: identity?.startToken ?? null
      });
    } catch (registryError) {
      try { process.stderr.write('Starship supervisor registry result failure: ' + String(registryError?.message || registryError) + '\\n'); } catch {}
    }
  };
  if (Number.isInteger(child?.pid)) {
    emit();
    return;
  }
  if (error || !child || typeof child.once !== 'function') {
    queueMicrotask(emit);
    return;
  }
  child.once('spawn', emit);
  child.once('error', (spawnError) => finishResult(intent, null, spawnError, 'spawn-error'));
}

function normalizeSpawn(command, args, options) {
  if (Array.isArray(args)) return { args, options: injectEnvironment(options) };
  return { args: [], options: injectEnvironment(args) };
}

childProcess.spawn = function supervisedSpawn(command, args, options) {
  const normalized = normalizeSpawn(command, args, options);
  const intent = beginIntent('spawn', command, normalized.args, normalized.options);
  let child;
  try {
    child = original.spawn.call(childProcess, command, normalized.args, normalized.options);
  } catch (error) {
    finishResult(intent, null, error, 'spawn-error');
    throw error;
  }
  finishResult(intent, child, null, 'spawned');
  return child;
};

childProcess.fork = function supervisedFork(modulePath, args, options) {
  const actualArgs = Array.isArray(args) ? args : [];
  const actualOptions = injectEnvironment(Array.isArray(args) ? options : args, 'fork');
  const intent = beginIntent('fork', modulePath, actualArgs, actualOptions);
  let child;
  try {
    child = original.fork.call(childProcess, modulePath, actualArgs, actualOptions);
  } catch (error) {
    finishResult(intent, null, error, 'spawn-error');
    throw error;
  }
  finishResult(intent, child, null, 'spawned');
  return child;
};

childProcess.execFile = function supervisedExecFile(file, args, options, callback) {
  let actualArgs = [];
  let actualOptions = {};
  let actualCallback = callback;
  if (Array.isArray(args)) {
    actualArgs = args;
    if (typeof options === 'function') actualCallback = options;
    else actualOptions = options || {};
  } else {
    if (typeof args === 'function') actualCallback = args;
    else {
      actualOptions = args || {};
      if (typeof options === 'function') actualCallback = options;
    }
  }
  actualOptions = injectEnvironment(actualOptions);
  const intent = beginIntent('execFile', file, actualArgs, actualOptions);
  let child;
  try {
    child = original.execFile.call(childProcess, file, actualArgs, actualOptions, actualCallback);
  } catch (error) {
    finishResult(intent, null, error, 'spawn-error');
    throw error;
  }
  finishResult(intent, child, null, 'spawned');
  return child;
};

Object.defineProperty(childProcess.execFile, util.promisify.custom, {
  configurable: false,
  enumerable: false,
  value: function supervisedPromisifiedExecFile(...args) {
    let rejectPromise;
    let resolvePromise;
    const promise = new Promise((resolve, reject) => {
      rejectPromise = reject;
      resolvePromise = resolve;
    });
    promise.child = childProcess.execFile(...args, (error, stdout, stderr) => {
      if (error !== null) {
        error.stdout = stdout;
        error.stderr = stderr;
        rejectPromise(error);
      } else {
        resolvePromise({ stdout, stderr });
      }
    });
    return promise;
  },
  writable: false
});

childProcess.exec = function supervisedExec(command, options, callback) {
  let actualOptions = options;
  let actualCallback = callback;
  if (typeof options === 'function') {
    actualCallback = options;
    actualOptions = {};
  }
  actualOptions = injectEnvironment(actualOptions || {});
  const intent = beginIntent('exec', command, [], actualOptions);
  let child;
  try {
    child = original.exec.call(childProcess, command, actualOptions, actualCallback);
  } catch (error) {
    finishResult(intent, null, error, 'spawn-error');
    throw error;
  }
  finishResult(intent, child, null, 'spawned');
  return child;
};

childProcess.spawnSync = function supervisedSpawnSync(command, args, options) {
  const normalized = normalizeSpawn(command, args, options);
  const intent = beginIntent('spawnSync', command, normalized.args, normalized.options);
  let result;
  try {
    result = original.spawnSync.call(childProcess, command, normalized.args, normalized.options);
  } catch (error) {
    finishResult(intent, null, error, 'spawn-error');
    throw error;
  }
  finishResult(intent, null, result?.error || null, 'completed-synchronously');
  return result;
};

childProcess.execFileSync = function supervisedExecFileSync(file, args, options) {
  const actualArgs = Array.isArray(args) ? args : [];
  const actualOptions = injectEnvironment(Array.isArray(args) ? options : args);
  const intent = beginIntent('execFileSync', file, actualArgs, actualOptions);
  try {
    const result = original.execFileSync.call(childProcess, file, actualArgs, actualOptions);
    finishResult(intent, null, null, 'completed-synchronously');
    return result;
  } catch (error) {
    finishResult(intent, null, error, 'completed-synchronously');
    throw error;
  }
};

childProcess.execSync = function supervisedExecSync(command, options) {
  const actualOptions = injectEnvironment(options || {});
  const intent = beginIntent('execSync', command, [], actualOptions);
  try {
    const result = original.execSync.call(childProcess, command, actualOptions);
    finishResult(intent, null, null, 'completed-synchronously');
    return result;
  } catch (error) {
    finishResult(intent, null, error, 'completed-synchronously');
    throw error;
  }
};

moduleBuiltin.syncBuiltinESMExports();
`;
}

function appendPreloadNodeOptions(environment, preloadPath) {
  const requiredOption = `--require=${JSON.stringify(preloadPath)}`;
  return requiredOption;
}

function parsePsRows(output) {
  const rows = [];
  for (const line of output.split("\n")) {
    const match = line.match(
      /^\s*(\d+)\s+(\d+)\s+(\d+)\s+(\S+)\s+(\S+\s+\S+\s+\d+\s+\d\d:\d\d:\d\d\s+\d{4})\s+(.*)$/u
    );
    if (!match) continue;
    rows.push({
      command: match[6],
      pgid: Number(match[2]),
      pid: Number(match[1]),
      ppid: Number(match[3]),
      startToken: match[5].trim(),
      stat: match[4]
    });
  }
  return rows;
}

export function joinExactProcessSnapshotRows(stableOutput, environmentOutput) {
  const stableRows = parsePsRows(stableOutput);
  const environmentRows = parsePsRows(environmentOutput);
  return stableRows.flatMap((stable) => {
    const environment = environmentRows.find((candidate) =>
      candidate.pid === stable.pid &&
      candidate.pgid === stable.pgid &&
      candidate.ppid === stable.ppid &&
      candidate.stat === stable.stat &&
      candidate.startToken === stable.startToken &&
      (
        candidate.command === stable.command ||
        candidate.command.startsWith(`${stable.command} `)
      )
    );
    return environment ? [{ ...stable, environmentCommand: environment.command }] : [];
  });
}

function allProcessRows() {
  const stableOutput = execFileSync(
    "/bin/ps",
    ["-axo", "pid=,pgid=,ppid=,stat=,lstart=,command="],
    { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }
  );
  const environmentOutput = execFileSync(
    "/bin/ps",
    ["eww", "-axo", "pid=,pgid=,ppid=,stat=,lstart=,command="],
    { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }
  );
  return joinExactProcessSnapshotRows(stableOutput, environmentOutput);
}

function stableProcessRows() {
  return parsePsRows(execFileSync(
    "/bin/ps",
    ["-axo", "pid=,pgid=,ppid=,stat=,lstart=,command="],
    { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }
  ));
}

function sanitizeProcessRow(row) {
  return Object.freeze({
    commandSha256: sha256(Buffer.from(row.command, "utf8")),
    pgid: row.pgid,
    pid: row.pid,
    ppid: row.ppid,
    startToken: row.startToken,
    stat: row.stat
  });
}

function processGroupRows(processGroupId) {
  return stableProcessRows()
    .filter((row) => row.pgid === processGroupId)
    .map(sanitizeProcessRow);
}

function commandHasExactEnvironmentToken(command, name, value) {
  const marker = `${name}=${value}`;
  return command === marker ||
    command.startsWith(`${marker} `) ||
    command.endsWith(` ${marker}`) ||
    command.includes(` ${marker} `);
}

function ownedProcessRows(runToken, runNonce, processRows = allProcessRows()) {
  return processRows
    .filter((row) =>
      commandHasExactEnvironmentToken(
        row.environmentCommand,
        PRELOAD_ENVIRONMENT_NAMES.runToken,
        runToken
      ) &&
      commandHasExactEnvironmentToken(
        row.environmentCommand,
        PRELOAD_ENVIRONMENT_NAMES.nonce,
        runNonce
      )
    )
    .map(sanitizeProcessRow);
}

function readRegistrySnapshot(
  registryDescriptor,
  nonceSha256,
  runTokenSha256,
  {
    expectedPreloadPathSha256,
    expectedPreloadSha256,
    expectedRunnerPathSha256,
    expectedRunnerSha256,
    tolerateTrailingRecord = false
  } = {}
) {
  const before = fstatSync(registryDescriptor);
  if (!before.isFile() || before.size > 64 * 1024 * 1024) {
    throw new Error("Child registry journal must be a bounded regular file.");
  }
  const bytes = Buffer.alloc(before.size);
  let offset = 0;
  while (offset < bytes.length) {
    const count = readSync(registryDescriptor, bytes, offset, bytes.length - offset, offset);
    if (count === 0) break;
    offset += count;
  }
  const observed = bytes.subarray(0, offset);
  const complete = observed.length === 0 || observed.at(-1) === 0x0a;
  const text = observed.toString("utf8");
  const lines = text.split("\n");
  if (lines.at(-1) === "") lines.pop();
  const intents = new Map();
  const results = new Map();
  const acks = new Map();
  const tsconfigCreations = new Map();
  const runLockCreations = new Map();
  const issues = [];
  if (!complete && !tolerateTrailingRecord) {
    issues.push("Child registry journal has an unterminated final record.");
  }
  if (!complete && tolerateTrailingRecord) lines.pop();
  const isHash = (value) => typeof value === "string" && /^[a-f0-9]{64}$/u.test(value);
  const isExactIdentity = (value) => typeof value === "string" && /^(?:0|[1-9]\d*)$/u.test(value);
  const isTimestamp = (value) => typeof value === "string" &&
    Number.isFinite(Date.parse(value));
  for (const [index, line] of lines.entries()) {
    if (Buffer.byteLength(line, "utf8") > 16 * 1024) {
      issues.push(`Registry journal record ${index + 1} exceeds the bounded line size.`);
      continue;
    }
    try {
      const record = JSON.parse(line);
      const name = record?.fileName;
      const value = record?.value;
      const match = typeof name === "string"
        ? name.match(/^([a-zA-Z0-9-]+)\.(intent|result|ack|runlock|tsconfig)\.json$/u)
        : null;
      if (!match || !value || typeof value !== "object") {
        issues.push(`Registry journal record ${index + 1} has an invalid envelope.`);
        continue;
      }
      const [, fileEventId, recordType] = match;
      if (
        value?.runNonceSha256 !== nonceSha256 ||
        value?.runTokenSha256 !== runTokenSha256 ||
        value?.eventId !== fileEventId ||
        value?.schemaVersion !== 1 ||
        !isTimestamp(value?.createdAt)
      ) {
        issues.push(`Registry ownership mismatch in ${name}.`);
        continue;
      }
      if (recordType === "intent") {
        if (
          intents.has(value.eventId) ||
          !["exec", "execFile", "execFileSync", "execSync", "fork", "spawn", "spawnSync"].includes(value?.kind) ||
          typeof value?.detachedRequested !== "boolean" ||
          !isHash(value?.commandSha256) ||
          !isHash(value?.argvSha256) ||
          !Number.isInteger(value?.parentPid) ||
          !Number.isInteger(value?.parentPgid) ||
          typeof value?.parentStartToken !== "string" ||
          !isHash(value?.parentProcessCommandSha256)
        ) {
          issues.push(`Registry intent schema is invalid in ${name}.`);
          continue;
        }
        intents.set(value.eventId, value);
      } else if (recordType === "result") {
        const spawned = value?.classification === "spawned";
        const completed = value?.classification === "completed-synchronously";
        const spawnError = value?.classification === "spawn-error";
        const terminalIdentityIsNull = value?.pid === null &&
          value?.pgid === null &&
          value?.startToken === null &&
          value?.processCommandSha256 === null;
        if (
          results.has(value.eventId) ||
          !isHash(value?.commandSha256) ||
          !isHash(value?.argvSha256) ||
          (
            spawned &&
            (
              !Number.isInteger(value?.pid) ||
              !Number.isInteger(value?.pgid) ||
              typeof value?.startToken !== "string" ||
              !isHash(value?.processCommandSha256)
            )
          ) ||
          (spawned && value?.errorSha256 !== null) ||
          (!spawned && (!completed && !spawnError || !terminalIdentityIsNull)) ||
          (spawnError && !isHash(value?.errorSha256)) ||
          (value?.errorSha256 !== null && !isHash(value?.errorSha256))
        ) {
          issues.push(`Registry result schema is invalid in ${name}.`);
          continue;
        }
        results.set(value.eventId, value);
      } else if (recordType === "ack") {
        if (
          acks.has(value.eventId) ||
          !Number.isInteger(value?.pid) ||
          !Number.isInteger(value?.pgid) ||
          typeof value?.startToken !== "string" ||
          !isHash(value?.processCommandSha256) ||
          !isHash(value?.preloadPathSha256) ||
          !isHash(value?.preloadSha256) ||
          !isHash(value?.runnerPathSha256) ||
          !isHash(value?.runnerSha256) ||
          (expectedPreloadPathSha256 && value.preloadPathSha256 !== expectedPreloadPathSha256) ||
          (expectedPreloadSha256 && value.preloadSha256 !== expectedPreloadSha256) ||
          (expectedRunnerPathSha256 && value.runnerPathSha256 !== expectedRunnerPathSha256) ||
          (expectedRunnerSha256 && value.runnerSha256 !== expectedRunnerSha256)
        ) {
          issues.push(`Registry preload ACK schema is invalid in ${name}.`);
          continue;
        }
        acks.set(value.eventId, value);
      } else if (recordType === "tsconfig") {
        if (
          tsconfigCreations.has(value.eventId) ||
          value?.beforeExists !== false ||
          !isExactIdentity(value?.device) ||
          !isExactIdentity(value?.inode) ||
          !Number.isInteger(value?.pid) ||
          !Number.isInteger(value?.pgid) ||
          !Number.isInteger(value?.size) || value.size < 0 ||
          typeof value?.mode !== "string" || !/^[0-7]{3}$/u.test(value.mode) ||
          typeof value?.startToken !== "string" ||
          !isHash(value?.pathSha256) ||
          !isHash(value?.processCommandSha256) ||
          !isHash(value?.sha256)
        ) {
          issues.push(`Registry tsconfig creation schema is invalid in ${name}.`);
          continue;
        }
        tsconfigCreations.set(value.eventId, value);
      } else {
        if (
          runLockCreations.has(value.eventId) ||
          !isExactIdentity(value?.device) ||
          !isExactIdentity(value?.inode) ||
          !Number.isInteger(value?.pid) ||
          !Number.isInteger(value?.pgid) ||
          !Number.isInteger(value?.size) || value.size < 0 ||
          typeof value?.mode !== "string" || !/^[0-7]{3}$/u.test(value.mode) ||
          typeof value?.startToken !== "string" ||
          !isHash(value?.pathSha256) ||
          !isHash(value?.processCommandSha256) ||
          !isHash(value?.sha256)
        ) {
          issues.push(`Registry run-lock creation schema is invalid in ${name}.`);
          continue;
        }
        runLockCreations.set(value.eventId, value);
      }
    } catch (error) {
      issues.push(`Registry journal record ${index + 1} is invalid: ${errorText(error)}.`);
    }
  }
  for (const [eventId, result] of results) {
    const intent = intents.get(eventId);
    if (!intent) {
      issues.push(`Registry result ${eventId} has no intent.`);
    } else if (
      intent.commandSha256 !== result.commandSha256 ||
      intent.argvSha256 !== result.argvSha256
    ) {
      issues.push(`Registry result ${eventId} does not bind its intent hashes.`);
    }
  }
  return Object.freeze({
    acks,
    bytesRead: observed.length,
    intents,
    issues,
    journalSha256: sha256(observed),
    results,
    runLockCreations,
    tsconfigCreations,
    unmatchedIntents: Object.freeze(
      [...intents.keys()].filter((eventId) => !results.has(eventId))
    )
  });
}

function createOwnershipTracker({
  nonceSha256,
  preloadPathSha256,
  preloadSha256,
  registryDescriptor,
  runnerPathSha256,
  runnerSha256,
  runNonce,
  runToken,
  runTokenSha256
}) {
  const seenIdentities = new Map();
  const validatedProcessGroups = new Set();
  const validatedDetachedProcessGroups = new Set();
  const recordedProcessGroups = new Set();
  const commandTransitions = [];
  const identityMismatches = [];
  const scanErrors = [];
  const registryIssues = new Set();
  let latestRows = [];
  let latestRegistry = {
    acks: new Map(),
    intents: new Map(),
    issues: [],
    results: new Map(),
    runLockCreations: new Map(),
    tsconfigCreations: new Map(),
    unmatchedIntents: []
  };
  let scanCount = 0;
  let scanInProgress = false;
  let interval = null;
  let innerProcessGroupId = null;

  const recordMismatch = (value) => {
    const key = JSON.stringify(value);
    if (!identityMismatches.some((entry) => JSON.stringify(entry) === key)) {
      identityMismatches.push(value);
    }
  };

  const recordCommandTransition = (value) => {
    const key = JSON.stringify(value);
    if (!commandTransitions.some((entry) => JSON.stringify(entry) === key)) {
      commandTransitions.push(value);
    }
  };

  const scan = () => {
    if (scanInProgress) return Object.freeze({ registry: latestRegistry, rows: latestRows });
    scanInProgress = true;
    try {
      scanCount += 1;
      const scannedAt = new Date().toISOString();
      const processRows = allProcessRows();
      const tokenRows = ownedProcessRows(runToken, runNonce, processRows);
      latestRegistry = readRegistrySnapshot(
        registryDescriptor,
        nonceSha256,
        runTokenSha256,
        {
          expectedPreloadPathSha256: preloadPathSha256,
          expectedPreloadSha256: preloadSha256,
          expectedRunnerPathSha256: runnerPathSha256,
          expectedRunnerSha256: runnerSha256,
          tolerateTrailingRecord: true
        }
      );
      for (const issue of latestRegistry.issues) registryIssues.add(issue);
      for (const ack of latestRegistry.acks.values()) {
        if (Number.isInteger(ack?.pgid)) recordedProcessGroups.add(ack.pgid);
      }
      for (const result of latestRegistry.results.values()) {
        if (result?.classification === "spawned" && Number.isInteger(result?.pgid)) {
          recordedProcessGroups.add(result.pgid);
        }
      }
      const registryRows = [];
      const registryIdentities = [
        ...[...latestRegistry.results].map(([eventId, value]) => ({ eventId, value })),
        ...[...latestRegistry.acks].map(([eventId, value]) => ({ eventId, value }))
      ];
      for (const { eventId, value: registered } of registryIdentities) {
        if (!Number.isInteger(registered?.pid) || !Number.isInteger(registered?.pgid) ||
            typeof registered?.startToken !== "string" ||
            typeof registered?.processCommandSha256 !== "string") continue;
        const currentCandidate = processRows.find((row) => row.pid === registered.pid);
        const currentRaw = currentCandidate &&
          !currentCandidate.stat.includes("Z") &&
          !/^\([^()\s]+\)$/u.test(currentCandidate.command)
          ? currentCandidate
          : null;
        const current = currentRaw ? sanitizeProcessRow(currentRaw) : null;
        if (current) {
          const strongIdentityMatches = current.pgid === registered.pgid &&
            current.startToken === registered.startToken;
          if (!strongIdentityMatches) {
            recordMismatch({
              eventId,
              expectedCommandSha256: registered.processCommandSha256,
              expectedPgid: registered.pgid,
              expectedStartToken: registered.startToken,
              observedCommandSha256: current.commandSha256,
              observedPgid: current.pgid,
              observedStartToken: current.startToken,
              observedStat: current.stat,
              pid: registered.pid,
              reason: "live-registry-identity-mismatch"
            });
          } else {
            if (current.commandSha256 !== registered.processCommandSha256) {
              recordCommandTransition({
                eventId,
                observedCommandSha256: current.commandSha256,
                observedStat: current.stat,
                pgid: current.pgid,
                pid: current.pid,
                reason: "live-registry-command-transition",
                registeredCommandSha256: registered.processCommandSha256,
                startToken: current.startToken
              });
            }
            registryRows.push({ ...current, ownershipSource: "registry" });
          }
        } else {
          const historical = seenIdentities.get(`${registered.pid}:${registered.startToken}`);
          if (historical && historical.pgid !== registered.pgid) {
            recordMismatch({
              eventId,
              expectedPgid: registered.pgid,
              expectedStartToken: registered.startToken,
              observedPgid: historical.pgid,
              pid: registered.pid,
              reason: "historical-identity-mismatch"
            });
          }
        }
      }
      const union = new Map();
      for (const row of tokenRows) union.set(`${row.pid}:${row.startToken}`, row);
      for (const row of registryRows) {
        const key = `${row.pid}:${row.startToken}`;
        if (!union.has(key)) union.set(key, row);
      }
      const rows = [...union.values()];
      latestRows = rows;
      for (const row of rows) {
        const key = `${row.pid}:${row.startToken}`;
        const prior = seenIdentities.get(key);
        seenIdentities.set(key, {
          ...row,
          firstSeenAt: prior?.firstSeenAt ?? scannedAt,
          lastSeenAt: scannedAt,
          source: prior?.source ?? row.ownershipSource ?? "nonce-token-scan"
        });
        validatedProcessGroups.add(row.pgid);
        if (Number.isInteger(innerProcessGroupId) && row.pgid !== innerProcessGroupId) {
          validatedDetachedProcessGroups.add(row.pgid);
        }
      }
      return Object.freeze({ registry: latestRegistry, rows });
    } catch (error) {
      scanErrors.push({ at: new Date().toISOString(), error: errorText(error) });
      return Object.freeze({ registry: latestRegistry, rows: latestRows });
    } finally {
      scanInProgress = false;
    }
  };

  return Object.freeze({
    receipt() {
      return Object.freeze({
        commandTransitions: Object.freeze([...commandTransitions]),
        identityMismatches: Object.freeze([...identityMismatches]),
        registryIssues: Object.freeze([...registryIssues]),
        recordedProcessGroups: Object.freeze(
          [...recordedProcessGroups].sort((left, right) => left - right)
        ),
        scanCount,
        scanErrors: Object.freeze([...scanErrors]),
        seenIdentities: Object.freeze([...seenIdentities.values()]),
        validatedDetachedProcessGroups: Object.freeze(
          [...validatedDetachedProcessGroups].sort((left, right) => left - right)
        ),
        validatedProcessGroups: Object.freeze(
          [...validatedProcessGroups].sort((left, right) => left - right)
        )
      });
    },
    scan,
    setInnerProcessGroupId(value) {
      innerProcessGroupId = value;
      if (Number.isInteger(value)) validatedProcessGroups.add(value);
    },
    start() {
      scan();
      interval = setInterval(scan, PROCESS_SCAN_INTERVAL_MS);
      interval.unref?.();
    },
    stop() {
      if (interval) clearInterval(interval);
      interval = null;
      scan();
    }
  });
}

function sendValidatedGroupSignal({ groupRows, processGroupId, runNonce, runToken, signal }) {
  const markerSha256 = sha256(runToken);
  const receipt = {
    attemptedAt: new Date().toISOString(),
    processGroupId,
    sent: false,
    signal,
    nonceSha256: sha256(runNonce),
    tokenSha256: markerSha256,
    witnesses: groupRows
  };
  if (groupRows.length === 0) {
    receipt.error = "No freshly token-validated process-group witness.";
    return receipt;
  }
  try {
    process.kill(-processGroupId, signal);
    receipt.sent = true;
  } catch (error) {
    if (error?.code !== "ESRCH") receipt.error = errorText(error);
    else receipt.absentAtSignal = true;
  }
  return receipt;
}

async function terminateOwnedUniverse({
  innerProcessGroupId,
  killGraceMs,
  runNonce,
  runToken,
  termGraceMs,
  tracker
}) {
  const startedAtMs = Date.now();
  const hardDeadline = startedAtMs + termGraceMs + killGraceMs + 1_000;
  const groupStates = new Map();
  const actions = [];
  let consecutiveZeroScans = 0;
  let consecutiveUnsignalableScans = 0;
  let firstRows = null;
  let finalRows = [];
  let finalGroupObservations = [];

  const observeUniverse = () => {
    const scan = tracker.scan();
    const tracked = tracker.receipt();
    const validatedGroups = new Set(tracked.validatedProcessGroups);
    for (const processGroupId of tracked.recordedProcessGroups) {
      validatedGroups.add(processGroupId);
    }
    if (Number.isInteger(innerProcessGroupId)) validatedGroups.add(innerProcessGroupId);
    const terminalRows = new Map(
      scan.rows.map((row) => [`${row.pid}:${row.startToken}`, row])
    );
    const groupObservations = [];
    for (const processGroupId of [...validatedGroups].sort((left, right) => left - right)) {
      const members = processGroupRows(processGroupId);
      const prior = tracked.seenIdentities.filter((row) => row.pgid === processGroupId);
      const ownershipWitnesses = members.filter((member) => prior.some((seen) =>
        seen.pid === member.pid &&
        seen.pgid === member.pgid &&
        seen.startToken === member.startToken
      ));
      for (const member of members) {
        terminalRows.set(`${member.pid}:${member.startToken}`, member);
      }
      groupObservations.push(Object.freeze({
        members: Object.freeze(members),
        ownershipWitnesses: Object.freeze(ownershipWitnesses),
        processGroupId,
        provenEmpty: members.length === 0
      }));
    }
    return Object.freeze({
      groupObservations: Object.freeze(groupObservations),
      rows: Object.freeze([...terminalRows.values()]),
      tracked
    });
  };

  while (Date.now() <= hardDeadline && consecutiveZeroScans < ZERO_SCAN_TARGET) {
    const observation = observeUniverse();
    const { rows } = observation;
    finalGroupObservations = observation.groupObservations;
    if (firstRows === null) firstRows = rows;
    finalRows = rows;
    if (rows.length === 0) {
      consecutiveUnsignalableScans = 0;
      consecutiveZeroScans += 1;
      if (consecutiveZeroScans < ZERO_SCAN_TARGET) {
        await new Promise((resolve) => setTimeout(resolve, PROCESS_SCAN_INTERVAL_MS));
      }
      continue;
    }
    consecutiveZeroScans = 0;
    const liveGroups = observation.groupObservations.filter(({ members }) => members.length > 0);
    const hasSignalableGroup = liveGroups.some(
      ({ ownershipWitnesses }) => ownershipWitnesses.length > 0
    );
    consecutiveUnsignalableScans = hasSignalableGroup
      ? 0
      : consecutiveUnsignalableScans + 1;
    if (consecutiveUnsignalableScans >= ZERO_SCAN_TARGET + 1) break;
    const now = Date.now();
    for (const group of observation.groupObservations) {
      const { members: groupRows, ownershipWitnesses, processGroupId } = group;
      if (groupRows.length === 0) continue;
      if (ownershipWitnesses.length === 0) continue;
      const state = groupStates.get(processGroupId) ?? {
        killAt: null,
        termAt: null
      };
      if (state.termAt === null) {
        const receipt = sendValidatedGroupSignal({
          groupRows: ownershipWitnesses,
          processGroupId,
          runNonce,
          runToken,
          signal: "SIGTERM"
        });
        receipt.ownershipProof = "previously-validated-pid-start-group";
        receipt.membersAtSignal = groupRows;
        actions.push(receipt);
        if (receipt.sent || receipt.absentAtSignal) state.termAt = now;
      } else if (state.killAt === null && now - state.termAt >= termGraceMs) {
        const receipt = sendValidatedGroupSignal({
          groupRows: ownershipWitnesses,
          processGroupId,
          runNonce,
          runToken,
          signal: "SIGKILL"
        });
        receipt.ownershipProof = "previously-validated-pid-start-group";
        receipt.membersAtSignal = groupRows;
        actions.push(receipt);
        if (receipt.sent || receipt.absentAtSignal) state.killAt = now;
      }
      groupStates.set(processGroupId, state);
    }
    await new Promise((resolve) => setTimeout(resolve, PROCESS_SCAN_INTERVAL_MS));
  }
  const finalScan = observeUniverse();
  finalRows = finalScan.rows;
  finalGroupObservations = finalScan.groupObservations;
  if (finalRows.length === 0 && consecutiveZeroScans < ZERO_SCAN_TARGET) {
    await new Promise((resolve) => setTimeout(resolve, PROCESS_SCAN_INTERVAL_MS));
    const second = observeUniverse();
    finalRows = second.rows;
    finalGroupObservations = second.groupObservations;
    consecutiveZeroScans = finalRows.length === 0 ? consecutiveZeroScans + 1 : 0;
  }
  const tracked = tracker.receipt();
  const terminalGroups = finalGroupObservations.map((group) => Object.freeze({
    actions: Object.freeze(actions.filter((entry) => entry.processGroupId === group.processGroupId)),
    finalMembers: group.members,
    processGroupId: group.processGroupId,
    provenEmpty: group.members.length === 0
  }));
  const recordedProcessGroupTermination = terminalGroups.filter((group) =>
    tracked.recordedProcessGroups.includes(group.processGroupId)
  );
  const innerTerminal = terminalGroups.find(
    (group) => group.processGroupId === innerProcessGroupId
  ) ?? Object.freeze({ actions: [], finalMembers: [], processGroupId: innerProcessGroupId, provenEmpty: true });
  const finalInnerGroupMembers = innerTerminal.finalMembers;
  const innerActions = actions.filter((entry) => entry.processGroupId === innerProcessGroupId);
  const innerTerm = innerActions.find((entry) => entry.signal === "SIGTERM");
  const innerKill = innerActions.find((entry) => entry.signal === "SIGKILL");
  return Object.freeze({
    actions: Object.freeze(actions),
    consecutiveZeroScans,
    elapsedMs: Date.now() - startedAtMs,
    recordedProcessGroupTermination: Object.freeze(recordedProcessGroupTermination),
    detachedProcessGroupTermination: Object.freeze(
      terminalGroups.filter((group) => group.processGroupId !== innerProcessGroupId)
    ),
    finalRows,
    firstRows: firstRows ?? [],
    processGroupTermination: Object.freeze({
      finalMembers: finalInnerGroupMembers,
      initialMembers: (firstRows ?? []).filter((row) => row.pgid === innerProcessGroupId),
      kill: Object.freeze({
        attempted: Boolean(innerKill),
        membersAfterGrace: finalInnerGroupMembers,
        sent: innerKill?.sent === true,
        signal: "SIGKILL"
      }),
      provenEmpty: innerTerminal.provenEmpty,
      term: Object.freeze({
        attempted: Boolean(innerTerm),
        membersAfterGrace: innerKill
          ? innerKill.witnesses
          : finalInnerGroupMembers,
        sent: innerTerm?.sent === true,
        signal: "SIGTERM"
      })
    }),
    provenEmpty: finalRows.length === 0 &&
      consecutiveZeroScans >= ZERO_SCAN_TARGET &&
      terminalGroups.every((group) => group.provenEmpty),
    tracker: tracked
  });
}

function waitForChildExit(child) {
  return new Promise((resolve) => {
    let spawnError = null;
    let settled = false;
    const settle = (outcome) => {
      if (settled) return;
      settled = true;
      resolve({ ...outcome, spawnError });
    };
    child.once("error", (error) => {
      spawnError = errorText(error);
      if (!Number.isInteger(child.pid)) settle({ code: null, signal: null });
    });
    child.once("exit", (code, signal) => settle({ code, signal }));
  });
}

async function waitForStreamEnd(stream, timeoutMs = 2_000) {
  const startedAtMs = Date.now();
  if (!stream) {
    return Object.freeze({
      closeObserved: false,
      elapsedMs: 0,
      ended: true,
      endObserved: false,
      error: null,
      expected: false,
      timedOut: false
    });
  }
  if (stream.readableEnded) {
    return Object.freeze({
      closeObserved: stream.closed === true,
      elapsedMs: 0,
      ended: true,
      endObserved: true,
      error: null,
      expected: true,
      timedOut: false
    });
  }
  let closeObserved = false;
  let endObserved = false;
  let streamError = null;
  let timedOut = false;
  await new Promise((resolve) => {
    const onClose = () => {
      closeObserved = true;
      if (!stream.readableEnded && !endObserved) resolve();
    };
    const onEnd = () => {
      endObserved = true;
      resolve();
    };
    const onError = (error) => {
      streamError = errorText(error);
      resolve();
    };
    const timer = setTimeout(() => {
      timedOut = true;
      resolve();
    }, timeoutMs);
    const cleanup = () => {
      clearTimeout(timer);
      stream.removeListener("close", onClose);
      stream.removeListener("end", onEnd);
      stream.removeListener("error", onError);
    };
    stream.once("close", onClose);
    stream.once("end", onEnd);
    stream.once("error", onError);
    Promise.resolve().then(async () => {
      while (!timedOut && !endObserved && !streamError &&
          !(closeObserved && !stream.readableEnded)) {
        await new Promise((next) => setTimeout(next, 5));
      }
      cleanup();
    });
  });
  return Object.freeze({
    closeObserved,
    elapsedMs: Date.now() - startedAtMs,
    ended: endObserved || stream.readableEnded,
    endObserved,
    error: streamError,
    expected: true,
    timedOut
  });
}

function createLogWriter(label, reserved, sink, containmentRoot) {
  const hasher = createHash("sha256");
  const errors = [];
  const pendingSinkWrites = new Set();
  let bytesWritten = 0;
  let closed = false;
  const recordSinkError = (error) => {
    errors.push({ at: new Date().toISOString(), destination: "sink", error: errorText(error) });
  };
  const sinkErrorListener = (error) => recordSinkError(error);
  sink?.on?.("error", sinkErrorListener);
  const handler = (chunk) => {
    const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    try {
      writeAll(reserved.descriptor, bytes);
      hasher.update(bytes);
      bytesWritten += bytes.length;
    } catch (error) {
      errors.push({ at: new Date().toISOString(), destination: "file", error: errorText(error) });
    }
    let pendingCompletion = null;
    let settlePending = null;
    try {
      if (typeof sink?.write === "function" && sink.write.length >= 2) {
        const completion = new Promise((resolve) => {
          settlePending = resolve;
        });
        pendingCompletion = completion;
        pendingSinkWrites.add(completion);
        sink.write(bytes, (error) => {
          if (error) recordSinkError(error);
          pendingSinkWrites.delete(completion);
          settlePending();
        });
      } else {
        sink?.write?.(bytes);
      }
    } catch (error) {
      if (pendingCompletion) pendingSinkWrites.delete(pendingCompletion);
      settlePending?.();
      recordSinkError(error);
    }
  };
  return Object.freeze({
    finalize() {
      if (closed) throw new Error(`${label} log writer finalized twice.`);
      closed = true;
      let descriptorAfter = null;
      try {
        fsyncSync(reserved.descriptor);
        descriptorAfter = descriptorReceipt(fstatSync(reserved.descriptor, { bigint: true }));
      } catch (error) {
        errors.push({ at: new Date().toISOString(), destination: "fsync", error: errorText(error) });
      } finally {
        sink?.removeListener?.("error", sinkErrorListener);
        try {
          closeSync(reserved.descriptor);
        } catch (error) {
          errors.push({ at: new Date().toISOString(), destination: "close", error: errorText(error) });
        }
      }
      const streamedSha256 = hasher.digest("hex");
      let final = null;
      try {
        final = fileReceipt(label, reserved.path, { containmentRoot });
      } catch (error) {
        errors.push({ at: new Date().toISOString(), destination: "final-path", error: errorText(error) });
      }
      const exact = errors.length === 0 &&
        descriptorAfter !== null &&
        final !== null &&
        reserved.initial.device === descriptorAfter.device &&
        reserved.initial.inode === descriptorAfter.inode &&
        descriptorAfter.device === final.device &&
        descriptorAfter.inode === final.inode &&
        bytesWritten === final.size &&
        streamedSha256 === final.sha256;
      return Object.freeze({
        bytesWritten,
        descriptorAfter,
        errors: Object.freeze([...errors]),
        exact,
        final,
        initial: reserved.initial,
        path: reserved.path,
        streamedSha256
      });
    },
    handler,
    async settle(timeoutMs = 2_000) {
      const startedAt = Date.now();
      while (pendingSinkWrites.size > 0 && Date.now() - startedAt < timeoutMs) {
        await Promise.race([
          Promise.all([...pendingSinkWrites]),
          new Promise((resolve) => setTimeout(resolve, 10))
        ]);
      }
      await new Promise((resolve) => setImmediate(resolve));
      if (pendingSinkWrites.size > 0) {
        errors.push({
          at: new Date().toISOString(),
          destination: "sink",
          error: `Asynchronous sink writes did not settle within ${timeoutMs}ms.`
        });
      }
    }
  });
}

function finalizeAppendJournal(label, reserved, containmentRoot) {
  const errors = [];
  let descriptorAfter = null;
  try {
    fsyncSync(reserved.descriptor);
    descriptorAfter = descriptorReceipt(fstatSync(reserved.descriptor, { bigint: true }));
  } catch (error) {
    errors.push({ at: new Date().toISOString(), destination: "fsync", error: errorText(error) });
  } finally {
    try {
      closeSync(reserved.descriptor);
    } catch (error) {
      errors.push({ at: new Date().toISOString(), destination: "close", error: errorText(error) });
    }
  }
  let final = null;
  try {
    final = fileReceipt(label, reserved.path, { containmentRoot });
  } catch (error) {
    errors.push({ at: new Date().toISOString(), destination: "final-path", error: errorText(error) });
  }
  const exact = errors.length === 0 &&
    descriptorAfter !== null &&
    final !== null &&
    reserved.initial.device === descriptorAfter.device &&
    reserved.initial.inode === descriptorAfter.inode &&
    descriptorAfter.device === final.device &&
    descriptorAfter.inode === final.inode &&
    descriptorAfter.size === final.size;
  return Object.freeze({
    descriptorAfter,
    errors: Object.freeze(errors),
    exact,
    final,
    initial: reserved.initial,
    path: reserved.path
  });
}

const DARWIN_RENAME_EXCLUSIVE_SOURCE = String.raw`
import ctypes
import errno
import os
import sys

libc = ctypes.CDLL(None, use_errno=True)
renameatx_np = libc.renameatx_np
renameatx_np.argtypes = [ctypes.c_int, ctypes.c_char_p, ctypes.c_int, ctypes.c_char_p, ctypes.c_uint]
renameatx_np.restype = ctypes.c_int
result = renameatx_np(3, os.fsencode(sys.argv[1]), 4, os.fsencode(sys.argv[2]), 0x00000004)
if result == 0:
    sys.stdout.write("renamed")
elif ctypes.get_errno() == errno.EEXIST:
    sys.stdout.write("destination-exists")
else:
    sys.stdout.write("errno:" + str(ctypes.get_errno()))
`;

function renameNoReplaceAnchored({
  destinationAnchor,
  destinationName,
  sourceAnchor,
  sourceName
}) {
  for (const [label, value] of [
    ["source basename", sourceName],
    ["destination basename", destinationName]
  ]) {
    if (typeof value !== "string" || value.length === 0 || value === "." || value === ".." ||
        value.includes(path.sep)) {
      throw new Error(`Anchored exclusive rename has an invalid ${label}: ${String(value)}.`);
    }
  }
  const outcome = execFileSync(
    "/usr/bin/python3",
    ["-I", "-S", "-B", "-c", DARWIN_RENAME_EXCLUSIVE_SOURCE, sourceName, destinationName],
    {
      encoding: "utf8",
      env: Object.freeze({
        PATH: "/usr/bin:/bin",
        PYTHONDONTWRITEBYTECODE: "1"
      }),
      maxBuffer: 1_024,
      stdio: [
        "ignore",
        "pipe",
        "pipe",
        sourceAnchor.descriptor,
        destinationAnchor.descriptor
      ]
    }
  ).trim();
  if (outcome === "renamed") return Object.freeze({ renamed: true, status: "renamed" });
  if (outcome === "destination-exists") {
    return Object.freeze({ renamed: false, status: "destination-exists" });
  }
  return Object.freeze({
    error: `renameatx_np failed with ${outcome || "an empty helper result"}`,
    renamed: false,
    status: "rename-error"
  });
}

export function disposeExactRegularFileNoReplace({
  containmentRoot,
  destinationPath,
  expected,
  interposition = {},
  label,
  removeSource,
  sourcePath
}) {
  if (typeof label !== "string" || label.length === 0) {
    throw new Error("Exact file disposition requires a non-empty label.");
  }
  if (typeof removeSource !== "boolean") {
    throw new Error("Exact file disposition requires an explicit removeSource boolean.");
  }
  const canonicalSource = assertSafePath(`${label} source`, sourcePath, { containmentRoot });
  const canonicalDestination = assertSafePath(`${label} destination`, destinationPath, {
    containmentRoot
  });
  ensureSafeDirectory(`${label} destination parent`, path.dirname(canonicalDestination), containmentRoot);
  const sourceAnchor = openDirectoryIdentityAnchor(
    `${label} source parent`,
    path.dirname(canonicalSource),
    containmentRoot
  );
  const destinationAnchor = openDirectoryIdentityAnchor(
    `${label} destination parent`,
    path.dirname(canonicalDestination),
    containmentRoot
  );
  const base = {
    destinationPath: canonicalDestination,
    removed: false,
    sourcePath: canonicalSource
  };
  try {
    if (!validateDirectoryIdentityAnchor(sourceAnchor) ||
        !validateDirectoryIdentityAnchor(destinationAnchor)) {
      return Object.freeze({
        ...base,
        foreignPreserved: true,
        status: "parent-replacement-preserved"
      });
    }
    interposition?.afterParentValidation?.(Object.freeze({
      destinationPath: canonicalDestination,
      sourcePath: canonicalSource
    }));
    if (!validateDirectoryIdentityAnchor(sourceAnchor) ||
        !validateDirectoryIdentityAnchor(destinationAnchor)) {
      return Object.freeze({
        ...base,
        foreignPreserved: true,
        status: "parent-replacement-preserved"
      });
    }
    let source;
    try {
      source = fileReceipt(`${label} source before no-replace link`, canonicalSource, {
        containmentRoot
      });
    } catch (error) {
      return Object.freeze({
        ...base,
        error: errorText(error),
        foreignPreserved: pathEntryExists(canonicalSource),
        status: "unsafe-source-preserved"
      });
    }
    if (!sameIdentity(expected, source) || !receiptsEqual(expected, source)) {
      return Object.freeze({
        ...base,
        foreignPreserved: true,
        source,
        status: "foreign-source-preserved"
      });
    }
    if (removeSource) {
      interposition?.afterFinalParentValidationBeforeLink?.(Object.freeze({
        destinationPath: canonicalDestination,
        sourcePath: canonicalSource
      }));
      if (!validateDirectoryIdentityAnchor(sourceAnchor) ||
          !validateDirectoryIdentityAnchor(destinationAnchor)) {
        return Object.freeze({
          ...base,
          foreignPreserved: true,
          source,
          status: "parent-replacement-preserved"
        });
      }
      interposition?.afterFinalParentValidationBeforeUnlink?.(Object.freeze({
        destinationPath: canonicalDestination,
        sourcePath: canonicalSource
      }));
      if (!validateDirectoryIdentityAnchor(sourceAnchor) ||
          !validateDirectoryIdentityAnchor(destinationAnchor)) {
        return Object.freeze({
          ...base,
          foreignPreserved: true,
          source,
          status: "parent-replacement-preserved"
        });
      }
      interposition?.afterFinalSourceRevalidationBeforeUnlink?.(Object.freeze({
        destinationPath: canonicalDestination,
        sourcePath: canonicalSource
      }));
      if (!validateDirectoryIdentityAnchor(sourceAnchor) ||
          !validateDirectoryIdentityAnchor(destinationAnchor)) {
        return Object.freeze({
          ...base,
          foreignPreserved: true,
          source,
          status: "parent-replacement-preserved"
        });
      }
      let sourceAtDisposition;
      try {
        sourceAtDisposition = fileReceipt(
          `${label} source at atomic disposition`,
          canonicalSource,
          { containmentRoot }
        );
      } catch (error) {
        return Object.freeze({
          ...base,
          error: errorText(error),
          foreignPreserved: pathEntryExists(canonicalSource),
          source,
          status: "foreign-source-preserved"
        });
      }
      if (!sameIdentity(expected, sourceAtDisposition) ||
          !receiptsEqual(expected, sourceAtDisposition)) {
        return Object.freeze({
          ...base,
          foreignPreserved: true,
          source,
          sourceAtDisposition,
          status: "foreign-source-preserved"
        });
      }
      interposition?.afterAtomicSourceRevalidationBeforeRename?.(Object.freeze({
        destinationPath: canonicalDestination,
        sourcePath: canonicalSource
      }));
      const movement = renameNoReplaceAnchored({
        destinationAnchor,
        destinationName: path.basename(canonicalDestination),
        sourceAnchor,
        sourceName: path.basename(canonicalSource)
      });
      if (!movement.renamed) {
        return Object.freeze({
          ...base,
          error: movement.error,
          foreignPreserved: true,
          movement,
          source,
          sourceAtDisposition,
          status: movement.status === "destination-exists"
            ? "destination-collision-preserved"
            : "rename-error-preserved"
        });
      }
      fsyncSync(sourceAnchor.descriptor);
      if (sourceAnchor.descriptor !== destinationAnchor.descriptor) {
        fsyncSync(destinationAnchor.descriptor);
      }
      if (!validateDirectoryIdentityAnchor(sourceAnchor) ||
          !validateDirectoryIdentityAnchor(destinationAnchor)) {
        return Object.freeze({
          ...base,
          foreignPreserved: pathEntryExists(canonicalSource) ||
            pathEntryExists(canonicalDestination),
          movement,
          source,
          sourceAtDisposition,
          status: "parent-replacement-preserved"
        });
      }
      let destination;
      try {
        destination = fileReceipt(`${label} atomic no-replace destination`, canonicalDestination, {
          containmentRoot
        });
      } catch (error) {
        const restoration = renameNoReplaceAnchored({
          destinationAnchor: sourceAnchor,
          destinationName: path.basename(canonicalSource),
          sourceAnchor: destinationAnchor,
          sourceName: path.basename(canonicalDestination)
        });
        fsyncSync(sourceAnchor.descriptor);
        fsyncSync(destinationAnchor.descriptor);
        return Object.freeze({
          ...base,
          error: errorText(error),
          foreignPreserved: pathEntryExists(canonicalSource) ||
            pathEntryExists(canonicalDestination),
          movement,
          restoration,
          source,
          sourceAtDisposition,
          status: "destination-identity-mismatch-preserved"
        });
      }
      if (!sameIdentity(expected, destination) || !receiptsEqual(expected, destination)) {
        const restoration = renameNoReplaceAnchored({
          destinationAnchor: sourceAnchor,
          destinationName: path.basename(canonicalSource),
          sourceAnchor: destinationAnchor,
          sourceName: path.basename(canonicalDestination)
        });
        fsyncSync(sourceAnchor.descriptor);
        fsyncSync(destinationAnchor.descriptor);
        return Object.freeze({
          ...base,
          destination,
          foreignPreserved: pathEntryExists(canonicalSource) ||
            pathEntryExists(canonicalDestination),
          movement,
          restoration,
          source,
          sourceAtDisposition,
          status: "foreign-source-preserved"
        });
      }
      const successorPresent = pathEntryExists(canonicalSource);
      return Object.freeze({
        ...base,
        destination,
        exact: !successorPresent,
        foreignPreserved: successorPresent,
        movement,
        removed: !successorPresent,
        source,
        sourceAbsent: !successorPresent,
        sourceAtDisposition,
        status: successorPresent ? "foreign-successor-preserved" : "removed-owned"
      });
    }
    interposition?.afterFinalParentValidationBeforeLink?.(Object.freeze({
      destinationPath: canonicalDestination,
      sourcePath: canonicalSource
    }));
    if (!validateDirectoryIdentityAnchor(sourceAnchor) ||
        !validateDirectoryIdentityAnchor(destinationAnchor)) {
      return Object.freeze({
        ...base,
        foreignPreserved: true,
        source,
        status: "parent-replacement-preserved"
      });
    }
    try {
      linkSync(canonicalSource, canonicalDestination);
    } catch (error) {
      return Object.freeze({
        ...base,
        error: errorText(error),
        foreignPreserved: true,
        source,
        status: error?.code === "EEXIST"
          ? "destination-collision-preserved"
          : "link-error-preserved"
      });
    }
    fsyncSync(destinationAnchor.descriptor);
    if (!validateDirectoryIdentityAnchor(sourceAnchor) ||
        !validateDirectoryIdentityAnchor(destinationAnchor)) {
      return Object.freeze({
        ...base,
        foreignPreserved: true,
        source,
        status: "parent-replacement-preserved"
      });
    }
    const destination = fileReceipt(`${label} no-replace destination`, canonicalDestination, {
      containmentRoot
    });
    if (!sameIdentity(expected, destination) || !receiptsEqual(expected, destination)) {
      return Object.freeze({
        ...base,
        destination,
        foreignPreserved: true,
        source,
        status: "destination-identity-mismatch-preserved"
      });
    }
    return Object.freeze({
      ...base,
      destination,
      exact: true,
      removed: false,
      source,
      sourceAbsent: false,
      status: "linked-exact"
    });
  } catch (error) {
    return Object.freeze({
      ...base,
      error: errorText(error),
      foreignPreserved: pathEntryExists(canonicalSource) || pathEntryExists(canonicalDestination),
      status: "disposition-error-preserved"
    });
  } finally {
    closeSync(destinationAnchor.descriptor);
    closeSync(sourceAnchor.descriptor);
  }
}

function quarantineExactRegularFile({
  containmentRoot,
  expected,
  label,
  quarantinePath,
  sourcePath
}) {
  const disposition = disposeExactRegularFileNoReplace({
    containmentRoot,
    destinationPath: quarantinePath,
    expected,
    label,
    removeSource: true,
    sourcePath
  });
  const status = disposition.status === "removed-owned"
    ? "removed-owned"
    : disposition.status === "foreign-successor-preserved"
      ? "owned-quarantined-foreign-successor-preserved"
      : disposition.status === "destination-collision-preserved"
        ? "quarantine-collision-preserved"
        : disposition.status === "foreign-source-preserved"
          ? "foreign-replacement-preserved"
          : disposition.status === "link-error-preserved"
            ? "quarantine-error-preserved"
            : "quarantine-race-preserved";
  return Object.freeze({
    disposition,
    error: disposition.error,
    exact: disposition.exact === true,
    foreignPreserved: disposition.foreignPreserved === true,
    immediatelyBefore: disposition.source,
    quarantined: disposition.destination ?? false,
    quarantinedPath: quarantinePath,
    sourceAbsent: disposition.sourceAbsent === true,
    status
  });
}

function acquireSupervisorLock(paths, invocation, nonce, runTokenSha256) {
  const metadata = Object.freeze({
    createdAt: new Date().toISOString(),
    nonce,
    ownerPid: process.pid,
    repositoryRoot: invocation.cwd,
    runId: invocation.runId,
    runTokenSha256
  });
  const bytes = Buffer.from(`${JSON.stringify(metadata)}\n`, "utf8");
  const receipt = writeExclusiveFile(
    "outer Starship supervisor lock",
    paths.supervisorLockPath,
    bytes,
    { containmentRoot: invocation.cwd, mode: 0o600 }
  );
  const descriptor = openSync(
    paths.supervisorLockPath,
    fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW
  );
  const held = descriptorReceipt(fstatSync(descriptor, { bigint: true }));
  if (!sameIdentity(receipt, { ...held, exists: true })) {
    closeSync(descriptor);
    throw new Error("Outer supervisor lock changed identity immediately after acquisition.");
  }
  return Object.freeze({ descriptor, held, metadata, receipt });
}

function releaseSupervisorLock(paths, invocation, ownedLock) {
  if (!ownedLock) {
    return Object.freeze({
      ownerValidated: false,
      path: paths.supervisorLockPath,
      removed: false,
      status: "not-acquired"
    });
  }
  let heldAfter = null;
  let heldDescriptorError = null;
  try {
    heldAfter = descriptorReceipt(fstatSync(ownedLock.descriptor, { bigint: true }));
  } catch (error) {
    heldDescriptorError = errorText(error);
  } finally {
    try {
      closeSync(ownedLock.descriptor);
    } catch (error) {
      heldDescriptorError = heldDescriptorError
        ? `${heldDescriptorError} | close: ${errorText(error)}`
        : `close: ${errorText(error)}`;
    }
  }
  if (heldDescriptorError) {
    return Object.freeze({
      error: heldDescriptorError,
      ownerValidated: false,
      path: paths.supervisorLockPath,
      removed: false,
      status: "held-descriptor-invalid"
    });
  }
  let observed;
  try {
    observed = safeReadFile("outer Starship supervisor lock at release", paths.supervisorLockPath, {
      containmentRoot: invocation.cwd
    });
  } catch (error) {
    return Object.freeze({
      error: errorText(error),
      foreignPreserved: pathEntryExists(paths.supervisorLockPath),
      heldAfter,
      ownerValidated: false,
      path: paths.supervisorLockPath,
      removed: false,
      status: "foreign-replacement-preserved"
    });
  }
  let metadata = null;
  try {
    metadata = JSON.parse(observed.bytes.toString("utf8"));
  } catch (error) {
    return Object.freeze({
      error: `Outer lock JSON is invalid: ${errorText(error)}`,
      foreignPreserved: true,
      heldAfter,
      observed: observed.receipt,
      ownerValidated: false,
      path: paths.supervisorLockPath,
      removed: false,
      status: "foreign-replacement-preserved"
    });
  }
  const ownerValidated = sameIdentity(ownedLock.receipt, observed.receipt) &&
    ownedLock.held.device === heldAfter.device &&
    ownedLock.held.inode === heldAfter.inode &&
    metadata?.nonce === ownedLock.metadata.nonce &&
    metadata?.ownerPid === process.pid &&
    metadata?.repositoryRoot === invocation.cwd &&
    metadata?.runId === invocation.runId &&
    metadata?.runTokenSha256 === ownedLock.metadata.runTokenSha256;
  if (!ownerValidated) {
    return Object.freeze({
      foreignPreserved: true,
      heldAfter,
      metadataSha256: sha256(observed.bytes),
      observed: observed.receipt,
      ownerValidated: false,
      path: paths.supervisorLockPath,
      removed: false,
      status: "foreign-replacement-preserved"
    });
  }
  let quarantine;
  try {
    quarantine = quarantineExactRegularFile({
      containmentRoot: invocation.cwd,
      expected: observed.receipt,
      label: "outer Starship supervisor lock",
      quarantinePath: paths.supervisorLockQuarantinePath,
      sourcePath: paths.supervisorLockPath
    });
  } catch (error) {
    return Object.freeze({
      error: errorText(error),
      foreignPreserved: pathEntryExists(paths.supervisorLockPath),
      heldAfter,
      observed: observed.receipt,
      ownerValidated: true,
      path: paths.supervisorLockPath,
      removed: false,
      status: "quarantine-error-preserved"
    });
  }
  return Object.freeze({
    heldAfter,
    metadataSha256: sha256(observed.bytes),
    observed: observed.receipt,
    ownerValidated: true,
    path: paths.supervisorLockPath,
    quarantine,
    removed: quarantine.status === "removed-owned",
    status: quarantine.status
  });
}

function cleanInnerRunLock(
  paths,
  invocation,
  processGroupId,
  creationRecords,
  preloadAcks,
  { expectedPreloadPathSha256, expectedPreloadSha256, expectedRunnerPathSha256, expectedRunnerSha256 }
) {
  if (!pathEntryExists(paths.runLockPath)) {
    return Object.freeze({
      ownerValidated: false,
      path: paths.runLockPath,
      removed: false,
      status: "already-absent"
    });
  }
  let source;
  try {
    source = safeReadFile("inner Starship Playwright run lock", paths.runLockPath, {
      containmentRoot: invocation.cwd
    });
  } catch (error) {
    return Object.freeze({
      error: errorText(error),
      foreignPreserved: pathEntryExists(paths.runLockPath),
      ownerValidated: false,
      path: paths.runLockPath,
      removed: false,
      status: "unsafe-unremoved"
    });
  }
  let metadata;
  try {
    metadata = JSON.parse(source.bytes.toString("utf8"));
  } catch (error) {
    return Object.freeze({
      error: `Run lock JSON is invalid: ${errorText(error)}`,
      foreignPreserved: true,
      ownerValidated: false,
      path: paths.runLockPath,
      removed: false,
      source: source.receipt,
      status: "invalid-unremoved"
    });
  }
  const ownerValidated = metadata?.runId === invocation.runId &&
    metadata?.repositoryRoot === invocation.cwd &&
    metadata?.ownerPid === processGroupId;
  if (!ownerValidated) {
    return Object.freeze({
      foreignPreserved: true,
      metadata,
      ownerValidated: false,
      path: paths.runLockPath,
      removed: false,
      source: source.receipt,
      status: "foreign-unremoved"
    });
  }
  const matchingCreations = creationRecords.filter((creation) =>
    creation.pathSha256 === sha256(Buffer.from(paths.runLockPath, "utf8")) &&
    creation.device === source.receipt.device &&
    creation.inode === source.receipt.inode &&
    creation.mode === source.receipt.mode &&
    creation.sha256 === source.receipt.sha256 &&
    creation.size === source.receipt.size &&
    creation.pid === metadata.ownerPid &&
    creation.pgid === processGroupId
  );
  const creation = matchingCreations.length === 1 ? matchingCreations[0] : null;
  const creatorSeen = creation !== null && preloadAcks.some((ack) =>
    ack.pid === creation.pid &&
    ack.pgid === creation.pgid &&
    ack.startToken === creation.startToken &&
    ack.processCommandSha256 === creation.processCommandSha256 &&
    ack.preloadPathSha256 === expectedPreloadPathSha256 &&
    ack.preloadSha256 === expectedPreloadSha256 &&
    ack.runnerPathSha256 === expectedRunnerPathSha256 &&
    ack.runnerSha256 === expectedRunnerSha256
  );
  if (!creation || !creatorSeen || creationRecords.length !== 1) {
    return Object.freeze({
      creationRecordCount: creationRecords.length,
      error: "Inner run lock lacks one exact nonce/token/start/inode-bound creation receipt.",
      foreignPreserved: true,
      metadata,
      ownerValidated: false,
      path: paths.runLockPath,
      removed: false,
      source: source.receipt,
      status: "unproven-creation-preserved"
    });
  }
  const revalidated = fileReceipt("inner Starship Playwright run lock before unlink", paths.runLockPath, {
    containmentRoot: invocation.cwd
  });
  if (!sameIdentity(source.receipt, revalidated)) {
    return Object.freeze({
      foreignPreserved: true,
      ownerValidated: false,
      path: paths.runLockPath,
      removed: false,
      source: source.receipt,
      status: "foreign-replacement-preserved"
    });
  }
  const quarantine = quarantineExactRegularFile({
    containmentRoot: invocation.cwd,
    expected: source.receipt,
    label: "inner Starship Playwright run lock",
    quarantinePath: paths.runLockQuarantinePath,
    sourcePath: paths.runLockPath
  });
  return Object.freeze({
    creation,
    metadata,
    ownerValidated: true,
    path: paths.runLockPath,
    quarantine,
    removed: quarantine.status === "removed-owned",
    source: source.receipt,
    status: quarantine.status
  });
}

function restoreTrackedFileAtomically(paths, snapshot, repositoryRoot) {
  let observed;
  try {
    observed = safeReadFile("tracked Next environment file before restore", paths.nextEnvPath, {
      containmentRoot: repositoryRoot,
      required: false
    });
  } catch (error) {
    return Object.freeze({
      atomic: false,
      before: snapshot.receipt,
      error: errorText(error),
      exact: false,
      foreignPreserved: pathEntryExists(paths.nextEnvPath),
      restored: false,
      status: "unsafe-foreign-preserved"
    });
  }
  if (
    stableReceiptsEqual(snapshot.receipt, observed.receipt) &&
    (
      snapshot.receipt.exists === false ||
      sameIdentity(snapshot.receipt, observed.receipt)
    )
  ) {
    return Object.freeze({
      after: observed.receipt,
      atomic: false,
      before: snapshot.receipt,
      exact: true,
      observedBeforeRestore: observed.receipt,
      restored: false,
      status: "unchanged"
    });
  }
  if (snapshot.bytes === null) {
    return Object.freeze({
      atomic: false,
      before: snapshot.receipt,
      error: "Tracked next-env preimage was absent; refusing to delete an unproven newly present path.",
      exact: false,
      foreignPreserved: observed.receipt.exists,
      observedBeforeRestore: observed.receipt,
      restored: false,
      status: "unproven-created-path-preserved"
    });
  }
  if (!sameIdentity(snapshot.receipt, observed.receipt)) {
    return Object.freeze({
      atomic: false,
      before: snapshot.receipt,
      error: "Tracked next-env inode/device identity changed; preserving the foreign replacement.",
      exact: false,
      foreignPreserved: true,
      observedBeforeRestore: observed.receipt,
      restored: false,
      status: "foreign-replacement-preserved"
    });
  }
  if (pathEntryExists(paths.nextEnvRestoreTempPath)) {
    return Object.freeze({
      atomic: false,
      before: snapshot.receipt,
      error: `Atomic restore temp already exists: ${paths.nextEnvRestoreTempPath}.`,
      exact: false,
      foreignPreserved: true,
      observedBeforeRestore: observed.receipt,
      restored: false,
      status: "restore-temp-collision"
    });
  }
  writeExclusiveFile(
    "tracked Next environment atomic restore temp",
    paths.nextEnvRestoreTempPath,
    snapshot.bytes,
    {
      containmentRoot: repositoryRoot,
      mode: Number.parseInt(snapshot.receipt.mode, 8)
    }
  );
  const restoreTemp = fileReceipt(
    "tracked Next environment atomic restore temp after descriptor chmod",
    paths.nextEnvRestoreTempPath,
    { containmentRoot: repositoryRoot }
  );
  const displaced = quarantineExactRegularFile({
    containmentRoot: repositoryRoot,
    expected: observed.receipt,
    label: "tracked Next environment mutated file",
    quarantinePath: paths.nextEnvDisplacedPath,
    sourcePath: paths.nextEnvPath
  });
  if (displaced.status !== "removed-owned") {
    return Object.freeze({
      atomic: false,
      before: snapshot.receipt,
      displaced,
      error: "Tracked next-env identity changed during quarantine; foreign replacement preserved.",
      exact: false,
      foreignPreserved: true,
      observedBeforeRestore: observed.receipt,
      restoreTemp,
      restored: false,
      status: "restore-race-preserved"
    });
  }
  const install = disposeExactRegularFileNoReplace({
    containmentRoot: repositoryRoot,
    destinationPath: paths.nextEnvPath,
    expected: restoreTemp,
    label: "tracked Next environment no-replace install",
    removeSource: false,
    sourcePath: paths.nextEnvRestoreTempPath
  });
  if (install.status !== "linked-exact") {
    return Object.freeze({
      atomic: false,
      before: snapshot.receipt,
      displaced,
      error: `Tracked next-env no-replace install failed: ${install.status}.`,
      exact: false,
      foreignPreserved: install.foreignPreserved === true || pathEntryExists(paths.nextEnvPath),
      install,
      observedBeforeRestore: observed.receipt,
      restoreTemp,
      restored: false,
      status: "restore-successor-preserved"
    });
  }
  const after = install.destination;
  return Object.freeze({
    after,
    atomic: true,
    before: snapshot.receipt,
    displaced,
    exact: receiptsEqual(snapshot.receipt, after) && sameIdentity(restoreTemp, after),
    install,
    observedBeforeRestore: observed.receipt,
    restoreTemp,
    restored: true,
    status: receiptsEqual(snapshot.receipt, after) && sameIdentity(restoreTemp, after)
      ? "restored-exact"
      : "restore-mismatch"
  });
}

function archiveRunSpecificTsconfig(
  paths,
  repositoryRoot,
  creationRecords,
  preloadAcks,
  expectedPreloadSha256
) {
  if (!pathEntryExists(paths.nextTsconfigPath)) {
    return Object.freeze({
      path: paths.nextTsconfigPath,
      sourceAbsent: true,
      status: "already-absent"
    });
  }
  let source;
  try {
    source = fileReceipt("run-specific temporary tsconfig", paths.nextTsconfigPath, {
      containmentRoot: repositoryRoot
    });
  } catch (error) {
    return Object.freeze({
      error: errorText(error),
      foreignPreserved: pathEntryExists(paths.nextTsconfigPath),
      path: paths.nextTsconfigPath,
      sourceAbsent: false,
      status: "unsafe-foreign-preserved"
    });
  }
  const matchingCreations = creationRecords.filter((creation) =>
    creation.pathSha256 === sha256(Buffer.from(paths.nextTsconfigPath, "utf8")) &&
    creation.device === source.device &&
    creation.inode === source.inode &&
    creation.mode === source.mode &&
    creation.sha256 === source.sha256 &&
    creation.size === source.size
  );
  const creation = matchingCreations.length === 1 ? matchingCreations[0] : null;
  const creatorSeen = creation !== null && preloadAcks.some((ack) =>
    ack.pid === creation.pid &&
    ack.pgid === creation.pgid &&
    ack.startToken === creation.startToken &&
    ack.processCommandSha256 === creation.processCommandSha256 &&
    ack.preloadSha256 === expectedPreloadSha256
  );
  if (!creation || !creatorSeen || creationRecords.length !== 1) {
    return Object.freeze({
      creationRecordCount: creationRecords.length,
      error: "Run-specific tsconfig lacks one exact nonce/token/start-bound creation receipt.",
      foreignPreserved: true,
      path: paths.nextTsconfigPath,
      source,
      sourceAbsent: false,
      status: "unproven-creation-preserved"
    });
  }
  const disposition = disposeExactRegularFileNoReplace({
    containmentRoot: repositoryRoot,
    destinationPath: paths.tsconfigArchivePath,
    expected: source,
    label: "run-specific temporary tsconfig archive",
    removeSource: true,
    sourcePath: paths.nextTsconfigPath
  });
  const status = disposition.status === "removed-owned"
    ? "archived"
    : disposition.status === "foreign-successor-preserved"
      ? "archived-owned-foreign-successor-preserved"
      : disposition.status === "destination-collision-preserved"
        ? "archive-collision-preserved"
        : disposition.status === "foreign-source-preserved"
          ? "foreign-replacement-preserved"
          : disposition.status === "link-error-preserved"
            ? "archive-error-preserved"
            : "archive-race-preserved";
  return Object.freeze({
    archive: disposition.destination,
    creation,
    disposition,
    error: disposition.error,
    foreignPreserved: disposition.foreignPreserved === true,
    path: paths.nextTsconfigPath,
    sameFile: disposition.exact === true,
    source: disposition.source ?? source,
    sourceAbsent: disposition.sourceAbsent === true,
    status
  });
}

function serializeTerminalReceipt(receipt) {
  return Buffer.from(`${JSON.stringify(receipt, null, 2)}\n`, "utf8");
}

async function drainDeliveredSignalCallbacks() {
  await new Promise((resolve) => setImmediate(resolve));
  await new Promise((resolve) => setTimeout(resolve, 0));
  await new Promise((resolve) => setImmediate(resolve));
}

function finalizeReservedReceipt(reserved, receipt, repositoryRoot, serializedBytes = null) {
  const bytes = serializedBytes ?? serializeTerminalReceipt(receipt);
  writeAll(reserved.descriptor, bytes);
  fsyncSync(reserved.descriptor);
  const descriptorAfter = descriptorReceipt(fstatSync(reserved.descriptor, { bigint: true }));
  closeSync(reserved.descriptor);
  fsyncDirectory(path.dirname(reserved.path));
  const final = fileReceipt("supervisor terminal receipt", reserved.path, {
    containmentRoot: repositoryRoot
  });
  if (
    reserved.initial.device !== descriptorAfter.device ||
    reserved.initial.inode !== descriptorAfter.inode ||
    descriptorAfter.device !== final.device ||
    descriptorAfter.inode !== final.inode ||
    final.sha256 !== sha256(bytes)
  ) {
    throw new Error("Supervisor terminal receipt path identity or exact bytes changed before seal.");
  }
  return final;
}

export function buildSupervisedStarshipPlaywrightInvocation({
  baseEnvironment = process.env,
  innerArgs,
  innerRunnerPath,
  repositoryRoot,
  runId
} = {}) {
  const canonicalRepositoryRoot = validateRepositoryRoot(repositoryRoot);
  const canonicalRunId = validateRunId(runId);
  const canonicalRunner = validateInnerRunner(innerRunnerPath, canonicalRepositoryRoot);
  if (!Array.isArray(innerArgs) || innerArgs.length === 0 || innerArgs[0] !== "test") {
    throw new Error("Supervised Playwright arguments must begin with the exact `test` command.");
  }
  for (const name of ["TEMP", "TMP", "TMPDIR"]) {
    assertSafePath(`baseEnvironment.${name}`, baseEnvironment?.[name]);
  }
  for (const name of OPTIONAL_INHERITED_MUTABLE_PATHS) {
    const value = baseEnvironment?.[name];
    if (typeof value === "string" && value.trim().length > 0) {
      assertSafePath(`baseEnvironment.${name}`, value);
    }
  }
  const inheritedRunnerOwned = INNER_RUNNER_OWNED_ENVIRONMENT.filter((name) =>
    typeof baseEnvironment?.[name] === "string" && baseEnvironment[name].trim().length > 0
  );
  if (inheritedRunnerOwned.length > 0) {
    throw new Error(
      `Supervisor rejects inherited inner-runner-owned environment: ${inheritedRunnerOwned.join(", ")}.`
    );
  }
  if (typeof baseEnvironment?.NODE_OPTIONS === "string" &&
      baseEnvironment.NODE_OPTIONS.trim().length > 0) {
    throw new Error("Supervisor rejects inherited NODE_OPTIONS and installs one exact Starship preload.");
  }
  const supervisorRoot = assertSafePath(
    "supervisorRoot",
    path.join(canonicalRepositoryRoot, ".tmp", `starship-playwright-supervisor-${canonicalRunId}`),
    { containmentRoot: canonicalRepositoryRoot }
  );
  const e2eRunRoot = assertSafePath(
    "e2eRunRoot",
    path.join(canonicalRepositoryRoot, ".tmp", `e2e-run-${canonicalRunId}`),
    { containmentRoot: canonicalRepositoryRoot }
  );
  const paths = Object.freeze({
    e2eRunRoot,
    nextEnvPath: path.join(canonicalRepositoryRoot, "next-env.d.ts"),
    nextEnvDisplacedPath: path.join(supervisorRoot, "displaced-next-env.d.ts"),
    nextEnvRestoreTempPath: path.join(supervisorRoot, "next-env.d.ts.atomic-restore.tmp"),
    nextTsconfigPath: path.join(
      e2eRunRoot,
      `tsconfig.playwright-${canonicalRunId}.tmp.json`
    ),
    preloadPath: path.join(supervisorRoot, "starship-child-registry-preload.cjs"),
    receiptPath: path.join(supervisorRoot, "supervisor-terminal-receipt.json"),
    registryDir: path.join(supervisorRoot, "child-registry"),
    registryJournalPath: path.join(supervisorRoot, "child-registry", "registry.jsonl"),
    signalJournalPath: path.join(supervisorRoot, "delivered-signals.jsonl"),
    runLockPath: path.join(canonicalRepositoryRoot, ".tmp", "starship-playwright-run.lock"),
    runLockQuarantinePath: path.join(supervisorRoot, "removed-owned-inner-run.lock"),
    runtimeTempDir: path.join(supervisorRoot, "runtime-temp"),
    stderrPath: path.join(supervisorRoot, "inner.stderr.log"),
    stdoutPath: path.join(supervisorRoot, "inner.stdout.log"),
    supervisorLockPath: path.join(
      canonicalRepositoryRoot,
      ".tmp",
      "starship-playwright-supervisor-run.lock"
    ),
    supervisorLockQuarantinePath: path.join(supervisorRoot, "removed-owned-supervisor-run.lock"),
    supervisorRoot,
    tsconfigArchivePath: path.join(
      supervisorRoot,
      "archived-run-specific-tsconfig",
      `tsconfig.playwright-${canonicalRunId}.tmp.json`
    )
  });
  for (const [name, value] of Object.entries(paths)) {
    if (name === "nextEnvPath") {
      const lexical = assertStarshipLexicalPath(`paths.${name}`, value);
      if (!isInside(lexical, canonicalRepositoryRoot)) {
        throw new Error(`paths.${name} escapes repositoryRoot: ${lexical}.`);
      }
      continue;
    }
    assertSafePath(`paths.${name}`, value, { containmentRoot: canonicalRepositoryRoot });
  }
  requireFreshPath("supervisorRoot", paths.supervisorRoot);
  requireFreshPath("e2eRunRoot", paths.e2eRunRoot);
  requireFreshPath("runLockPath", paths.runLockPath);
  requireFreshPath("nextTsconfigPath", paths.nextTsconfigPath);
  const environment = { ...baseEnvironment };
  const strippedEnvironmentNames = [
    "NODE_COMPILE_CACHE",
    "npm_config_cache",
    "NPM_CONFIG_CACHE"
  ].filter((name) => typeof environment[name] === "string");
  for (const name of ["NODE_COMPILE_CACHE", "npm_config_cache", "NPM_CONFIG_CACHE"]) {
    delete environment[name];
  }
  environment.TEMP = paths.runtimeTempDir;
  environment.TMP = paths.runtimeTempDir;
  environment.TMPDIR = paths.runtimeTempDir;
  return Object.freeze({
    args: Object.freeze([
      canonicalRunner,
      "--run-id",
      canonicalRunId,
      "--",
      ...innerArgs
    ]),
    command: process.execPath,
    cwd: canonicalRepositoryRoot,
    environment: Object.freeze(environment),
    environmentContract: Object.freeze({
      reboundToSupervisorRuntimeTemp: Object.freeze(["TEMP", "TMP", "TMPDIR"]),
      strippedInheritedNames: Object.freeze(strippedEnvironmentNames)
    }),
    innerRunnerPath: canonicalRunner,
    paths,
    runId: canonicalRunId
  });
}

export async function executeSupervisedStarshipPlaywright({
  baseEnvironment = process.env,
  innerArgs,
  innerRunnerPath,
  killGraceMs,
  processTarget = process,
  repositoryRoot,
  runId,
  stderrSink = process.stderr,
  stdoutSink = process.stdout,
  termGraceMs
} = {}) {
  const canonicalTermGraceMs = validateBoundedDuration(termGraceMs, "termGraceMs", 1_500);
  const canonicalKillGraceMs = validateBoundedDuration(killGraceMs, "killGraceMs", 5_000);
  const startedAt = new Date().toISOString();
  const invocation = buildSupervisedStarshipPlaywrightInvocation({
    baseEnvironment,
    innerArgs,
    innerRunnerPath,
    repositoryRoot,
    runId
  });
  const { paths } = invocation;
  const supervisorSourcePath = fileURLToPath(import.meta.url);
  const supervisorSourceContainmentRoot = realpathSync.native(
    path.resolve(path.dirname(supervisorSourcePath), "..")
  );
  const signalAcceptanceOpenedAt = new Date().toISOString();
  const earlySignals = [];
  let activeSignalReceiver = null;
  let signalAcceptanceOpen = true;
  let signalAcceptanceClosedAt = null;
  let signalAcceptanceClosedSequence = null;
  let terminalEvidenceClosedAt = null;
  let terminalEvidenceClosedSequence = null;
  let signalHandlersInstalled = false;
  const signalHandlers = Object.freeze({
    SIGINT: () => {
      const observedAt = new Date().toISOString();
      if (activeSignalReceiver) activeSignalReceiver("SIGINT", observedAt);
      else earlySignals.push({ observedAt, signal: "SIGINT" });
    },
    SIGTERM: () => {
      const observedAt = new Date().toISOString();
      if (activeSignalReceiver) activeSignalReceiver("SIGTERM", observedAt);
      else earlySignals.push({ observedAt, signal: "SIGTERM" });
    }
  });
  const removeSignalHandlers = () => {
    if (!signalHandlersInstalled) return;
    processTarget.removeListener("SIGINT", signalHandlers.SIGINT);
    processTarget.removeListener("SIGTERM", signalHandlers.SIGTERM);
    signalHandlersInstalled = false;
  };
  const nonce = randomBytes(32).toString("hex");
  const runToken = randomBytes(32).toString("hex");
  const nonceSha256 = sha256(nonce);
  const runTokenSha256 = sha256(runToken);
  let supervisorLock = null;
  let signalJournal = null;
  const deliveredSignalRecords = [];
  const signalJournalErrors = [];
  const appendDeliveredSignalRecord = (entry) => {
    const record = Object.freeze({
      acceptance: entry.acceptance,
      at: entry.at,
      parentDeathRelevant: entry.parentDeathRelevant,
      phase: entry.phase ?? null,
      sequence: entry.sequence,
      signal: entry.signal
    });
    try {
      const bytes = Buffer.from(`${JSON.stringify(record)}\n`, "utf8");
      writeAll(signalJournal.descriptor, bytes);
      fsyncSync(signalJournal.descriptor);
      deliveredSignalRecords.push(record);
    } catch (error) {
      const journalError = Object.freeze({
        at: new Date().toISOString(),
        error: errorText(error),
        sequence: entry.sequence,
        signal: entry.signal
      });
      signalJournalErrors.push(journalError);
      entry.journalError = journalError.error;
    }
  };
  processTarget.on("SIGINT", signalHandlers.SIGINT);
  processTarget.on("SIGTERM", signalHandlers.SIGTERM);
  signalHandlersInstalled = true;
  let reservedReceipt;
  try {
    ensureSafeDirectory("supervisor root", paths.supervisorRoot, invocation.cwd);
    ensureSafeDirectory("supervisor runtime temp", paths.runtimeTempDir, invocation.cwd);
    ensureSafeDirectory("child registry", paths.registryDir, invocation.cwd);
    ensureSafeDirectory("inner E2E run root", paths.e2eRunRoot, invocation.cwd);
    reservedReceipt = reserveExclusiveFile(
      "supervisor terminal receipt",
      paths.receiptPath,
      invocation.cwd
    );
    signalJournal = reserveAppendJournal(
      "delivered signal journal",
      paths.signalJournalPath,
      invocation.cwd
    );
  } catch (error) {
    removeSignalHandlers();
    throw error;
  }
  const sealPrelaunchFailure = async (failure, supervisorLockCleanup, partialLogs = {}) => {
    const violation = `Supervisor prelaunch failed: ${errorText(failure)}.`;
    const violations = [violation];
    const forwarded = [];
    let auditedSignalCount = 0;
    const auditReceivedSignals = () => {
      while (auditedSignalCount < forwarded.length) {
        const entry = forwarded[auditedSignalCount];
        violations.push(`Supervisor received ${entry.signal}.`);
        auditedSignalCount += 1;
      }
    };
    const receivePrelaunchSignal = (signal, observedAt = new Date().toISOString()) => {
      const entry = {
        acceptance: signalAcceptanceOpen ? "accepted" : "after-acceptance-close",
        actions: [],
        at: observedAt,
        parentDeathRelevant: false,
        phase: signalAcceptanceOpen ? "prelaunch" : "post-acceptance-close",
        processGroupId: null,
        sequence: forwarded.length + 1,
        sent: false,
        signal
      };
      forwarded.push(entry);
      appendDeliveredSignalRecord(entry);
    };
    activeSignalReceiver = receivePrelaunchSignal;
    for (const { observedAt, signal } of earlySignals.splice(0)) {
      receivePrelaunchSignal(signal, observedAt);
    }
    await drainDeliveredSignalCallbacks();
    signalAcceptanceOpen = false;
    signalAcceptanceClosedSequence = forwarded.length;
    signalAcceptanceClosedAt = new Date().toISOString();
    auditReceivedSignals();
    const candidateDeliveredCount = deliveredSignalRecords.length;
    const candidateSerializedAt = new Date().toISOString();
    await drainDeliveredSignalCallbacks();
    terminalEvidenceClosedSequence = forwarded.length;
    terminalEvidenceClosedAt = new Date().toISOString();
    auditReceivedSignals();
    if (signalJournalErrors.length > 0) {
      violations.push(`Delivered signal journal writes failed (${signalJournalErrors.length}).`);
    }
    const signalJournalReceipt = finalizeAppendJournal(
      "delivered signal journal",
      signalJournal,
      invocation.cwd
    );
    if (!signalJournalReceipt.exact) {
      violations.push("Delivered signal journal path/inode/bytes receipt is incomplete.");
    }
    const expectedSignalJournalBytes = Buffer.from(
      deliveredSignalRecords.map((record) => `${JSON.stringify(record)}\n`).join(""),
      "utf8"
    );
    const signalJournalExpectedSha256 = sha256(expectedSignalJournalBytes);
    const signalJournalSnapshotExact = signalJournalReceipt.exact === true &&
      signalJournalReceipt.final?.size === expectedSignalJournalBytes.length &&
      signalJournalReceipt.final?.sha256 === signalJournalExpectedSha256;
    if (!signalJournalSnapshotExact) {
      violations.push("Delivered signal journal bytes do not exactly bind the delivered record snapshot.");
    }
    const receipt = {
      child: {
        argv: [invocation.command, ...invocation.args],
        cwd: invocation.cwd,
        outcome: { code: null, signal: null, spawnError: errorText(failure) },
        processGroupId: null
      },
      cleanup: {
        complete: false,
        ownedUniverse: {
          consecutiveZeroScans: 2,
          finalRows: [],
          firstRows: [],
          provenEmpty: true
        },
        supervisorLock: supervisorLockCleanup
      },
      contract: SUPERVISOR_CONTRACT,
      finishedAt: new Date().toISOString(),
      innerEvidence: {
        fullRunRuntimeSourceHold: captureRawInnerFullRunRuntimeSourceHold(
          paths,
          invocation.cwd
        )
      },
      logs: partialLogs,
      paths,
      releaseReady: false,
      schemaVersion: SUPERVISOR_SCHEMA_VERSION,
      signals: {
        finalization: {
          acceptanceClosedAt: signalAcceptanceClosedAt,
          acceptanceClosedSequence: signalAcceptanceClosedSequence,
          acceptanceOpenedAt: signalAcceptanceOpenedAt,
          acceptanceOpenedSequence: 0,
          candidateDeliveredCount,
          candidateReceiptSha256: null,
          candidateSerializedAt,
          guarantee: "Node callback delivered before terminalEvidenceClosed; not wall-clock signal arrival or file-seal atomicity.",
          outerExitEvidenceRequired: true,
          postCandidateDrainCompletedAt: terminalEvidenceClosedAt,
          protocol: "signal-acceptance-drain-and-terminal-evidence-v1",
          releaseGreenRequires: {
            liveSignalJournalMatchesReceipt: true,
            outerExitCode: 0,
            outerExitSignal: null,
            validatorRunsAfterOuterProcessExit: true
          },
          terminalEvidenceClosedAt,
          terminalEvidenceClosedSequence
        },
        forwarded: [...forwarded],
        journal: {
          deliveredCount: deliveredSignalRecords.length,
          deliveredRecords: [...deliveredSignalRecords],
          deliveredRecordsSha256: sha256(
            Buffer.from(JSON.stringify(deliveredSignalRecords), "utf8")
          ),
          errors: [...signalJournalErrors],
          expectedSha256: signalJournalExpectedSha256,
          path: paths.signalJournalPath,
          receipt: signalJournalReceipt,
          snapshotExact: signalJournalSnapshotExact
        }
      },
      startedAt,
      status: "failed",
      supervisor: { nonceSha256 },
      violations: [...violations]
    };
    try {
      finalizeReservedReceipt(reservedReceipt, receipt, invocation.cwd);
    } finally {
      activeSignalReceiver = null;
      removeSignalHandlers();
    }
    const terminalError = new Error(`${violation} Receipt=${paths.receiptPath}`);
    terminalError.receiptPath = paths.receiptPath;
    throw terminalError;
  };
  try {
    supervisorLock = acquireSupervisorLock(paths, invocation, nonce, runTokenSha256);
  } catch (error) {
    const supervisorLockCleanup = supervisorLock
      ? releaseSupervisorLock(paths, invocation, supervisorLock)
      : {
          error: errorText(error),
          ownerValidated: false,
          path: paths.supervisorLockPath,
          removed: false,
          status: "not-acquired"
        };
    await sealPrelaunchFailure(error, supervisorLockCleanup);
  }

  const violations = [];
  let nextEnvSnapshot;
  let runnerBefore;
  let supervisorSourceBefore;
  let preloadBefore;
  let effectiveEnvironment;
  let registryJournal = null;
  let stdoutReserved = null;
  let stderrReserved = null;
  try {
    nextEnvSnapshot = snapshotTrackedFile(paths.nextEnvPath, invocation.cwd);
    runnerBefore = fileReceipt("inner Playwright runner", invocation.innerRunnerPath, {
      containmentRoot: invocation.cwd
    });
    supervisorSourceBefore = fileReceipt("Starship supervisor source", supervisorSourcePath, {
      containmentRoot: supervisorSourceContainmentRoot
    });
    const preloadSource = Buffer.from(buildPreloadSource(), "utf8");
    preloadBefore = writeExclusiveFile(
      "Starship child registry preload",
      paths.preloadPath,
      preloadSource,
      { containmentRoot: invocation.cwd, mode: 0o600 }
    );
    registryJournal = reserveAppendJournal(
      "child registry journal",
      paths.registryJournalPath,
      invocation.cwd
    );
    effectiveEnvironment = {
      ...invocation.environment,
      [PRELOAD_ENVIRONMENT_NAMES.nonce]: nonce,
      [PRELOAD_ENVIRONMENT_NAMES.preloadPath]: paths.preloadPath,
      [PRELOAD_ENVIRONMENT_NAMES.preloadSha256]: preloadBefore.sha256,
      [PRELOAD_ENVIRONMENT_NAMES.registryDevice]: String(registryJournal.initial.device),
      [PRELOAD_ENVIRONMENT_NAMES.registryFd]: "3",
      [PRELOAD_ENVIRONMENT_NAMES.registryInode]: String(registryJournal.initial.inode),
      [PRELOAD_ENVIRONMENT_NAMES.runnerPath]: invocation.innerRunnerPath,
      [PRELOAD_ENVIRONMENT_NAMES.runnerSha256]: runnerBefore.sha256,
      [PRELOAD_ENVIRONMENT_NAMES.runLockPath]: paths.runLockPath,
      [PRELOAD_ENVIRONMENT_NAMES.runToken]: runToken,
      [PRELOAD_ENVIRONMENT_NAMES.runTokenSha256]: runTokenSha256,
      [PRELOAD_ENVIRONMENT_NAMES.tsconfigPath]: paths.nextTsconfigPath
    };
    effectiveEnvironment.NODE_OPTIONS = appendPreloadNodeOptions(
      effectiveEnvironment,
      paths.preloadPath
    );
    stdoutReserved = reserveExclusiveFile("inner stdout log", paths.stdoutPath, invocation.cwd);
    stderrReserved = reserveExclusiveFile("inner stderr log", paths.stderrPath, invocation.cwd);
  } catch (error) {
    const partialLogs = {};
    for (const [name, reserved] of [
      ["registryJournal", registryJournal],
      ["stdout", stdoutReserved],
      ["stderr", stderrReserved]
    ]) {
      if (!reserved) continue;
      try {
        fsyncSync(reserved.descriptor);
        closeSync(reserved.descriptor);
        partialLogs[name] = fileReceipt(`partial inner ${name} log`, reserved.path, {
          containmentRoot: invocation.cwd
        });
      } catch (closeError) {
        partialLogs[name] = { error: errorText(closeError), path: reserved.path };
      }
    }
    const supervisorLockCleanup = releaseSupervisorLock(paths, invocation, supervisorLock);
    await sealPrelaunchFailure(error, supervisorLockCleanup, partialLogs);
  }

  const stdoutLog = createLogWriter("inner stdout log", stdoutReserved, stdoutSink, invocation.cwd);
  const stderrLog = createLogWriter("inner stderr log", stderrReserved, stderrSink, invocation.cwd);
  const tracker = createOwnershipTracker({
    nonceSha256,
    preloadPathSha256: preloadBefore.pathSha256,
    preloadSha256: preloadBefore.sha256,
    registryDescriptor: registryJournal.descriptor,
    runnerPathSha256: runnerBefore.pathSha256,
    runnerSha256: runnerBefore.sha256,
    runNonce: nonce,
    runToken,
    runTokenSha256
  });
  tracker.start();

  let child = null;
  let childOutcome = { code: null, signal: null, spawnError: "inner child was not launched" };
  let processGroupId = null;
  let universeCleanup = null;
  let stdoutReceipt = null;
  let stderrReceipt = null;
  let streamCompletion = {
    stderr: { ended: false, expected: true, timedOut: true },
    stdout: { ended: false, expected: true, timedOut: true }
  };
  const forwarded = [];
  const pendingSignals = [];
  let signalChain = Promise.resolve();
  let childExited = false;
  let resolveFirstInterrupt;
  let firstInterruptResolved = false;
  let terminalCleanupStarted = false;
  let auditedSignalCount = 0;
  const firstInterrupt = new Promise((resolve) => {
    resolveFirstInterrupt = resolve;
  });
  const auditReceivedSignals = () => {
    while (auditedSignalCount < forwarded.length) {
      const entry = forwarded[auditedSignalCount];
      violations.push(`Supervisor received ${entry.signal}.`);
      auditedSignalCount += 1;
    }
  };
  const deliverSignal = async (entry) => {
    const sendToCurrentGroups = (signal) => {
      const scan = tracker.scan();
      const groups = new Map();
      for (const row of scan.rows) {
        const group = groups.get(row.pgid) ?? [];
        group.push(row);
        groups.set(row.pgid, group);
      }
      let sent = false;
      for (const [ownedGroupId, expectedRows] of groups) {
        const freshRows = tracker.scan().rows.filter((row) =>
          row.pgid === ownedGroupId &&
          expectedRows.some((expected) =>
            expected.pid === row.pid &&
            expected.pgid === row.pgid &&
            expected.startToken === row.startToken
          )
        );
        const action = sendValidatedGroupSignal({
          groupRows: freshRows,
          processGroupId: ownedGroupId,
          runNonce: nonce,
          runToken,
          signal
        });
        entry.actions.push(action);
        if (action.sent) sent = true;
      }
      return sent;
    };

    const discoveryDeadline = Date.now() + canonicalTermGraceMs;
    while (!childExited && !entry.sent && Date.now() <= discoveryDeadline) {
      entry.sent = sendToCurrentGroups(entry.signal);
      if (!entry.sent) {
        await new Promise((resolve) => setTimeout(resolve, PROCESS_SCAN_INTERVAL_MS));
      }
    }
    entry.processGroupId = processGroupId;
    if (!entry.sent) {
      entry.error = childExited
        ? "Owned child exited before signal delivery."
        : "No live nonce/token/start-validated owned group before the signal deadline.";
      return;
    }

    const escalationDeadline = Date.now() + canonicalTermGraceMs;
    while (!childExited && Date.now() < escalationDeadline) {
      await new Promise((resolve) => setTimeout(resolve, PROCESS_SCAN_INTERVAL_MS));
    }
    if (!childExited) {
      entry.escalated = sendToCurrentGroups("SIGKILL");
      if (!entry.escalated) {
        entry.escalationError = "No live revalidated group at SIGKILL escalation.";
      }
    } else {
      entry.escalated = false;
    }
  };

  const receiveSignal = (signal, observedAt = new Date().toISOString()) => {
    const entry = {
      acceptance: signalAcceptanceOpen ? "accepted" : "after-acceptance-close",
      actions: [],
      at: observedAt,
      parentDeathRelevant: false,
      processGroupId,
      sequence: forwarded.length + 1,
      sent: false,
      signal
    };
    if (!signalAcceptanceOpen) {
      entry.error = "Signal callback was delivered after the signal-acceptance linearization point.";
      entry.phase = "post-acceptance-close";
    } else if (terminalCleanupStarted) {
      entry.error = "Signal arrived during terminal cleanup or receipt sealing.";
      entry.phase = "terminal-cleanup";
    } else {
      entry.parentDeathRelevant = true;
    }
    forwarded.push(entry);
    appendDeliveredSignalRecord(entry);
    if (!firstInterruptResolved) {
      firstInterruptResolved = true;
      resolveFirstInterrupt(entry);
    }
    if (!signalAcceptanceOpen || terminalCleanupStarted) return;
    if (!child) {
      pendingSignals.push(entry);
      return;
    }
    signalChain = signalChain.then(() => deliverSignal(entry));
  };
  activeSignalReceiver = receiveSignal;
  for (const { observedAt, signal } of earlySignals.splice(0)) {
    receiveSignal(signal, observedAt);
  }

  try {
    await new Promise((resolve) => setImmediate(resolve));
    child = spawn(invocation.command, invocation.args, {
      cwd: invocation.cwd,
      detached: true,
      env: effectiveEnvironment,
      stdio: ["ignore", "pipe", "pipe", registryJournal.descriptor]
    });
    processGroupId = child.pid ?? null;
    tracker.setInnerProcessGroupId(processGroupId);
    child.stdout?.on("data", stdoutLog.handler);
    child.stderr?.on("data", stderrLog.handler);
    const childExitPromise = waitForChildExit(child).then((outcome) => {
      childExited = true;
      return outcome;
    });
    for (const entry of pendingSignals.splice(0)) {
      signalChain = signalChain.then(() => deliverSignal(entry));
    }
    const firstTerminalEvent = await Promise.race([
      childExitPromise.then((outcome) => ({ kind: "exit", outcome })),
      firstInterrupt.then(() => ({ kind: "interrupt" }))
    ]);
    if (firstTerminalEvent.kind === "exit") {
      childOutcome = firstTerminalEvent.outcome;
    } else {
      let observedSignalChain;
      do {
        observedSignalChain = signalChain;
        await observedSignalChain;
      } while (observedSignalChain !== signalChain);
      const boundedExit = await new Promise((resolve) => {
        const timer = setTimeout(
          () => resolve({ outcome: null, timedOut: true }),
          canonicalKillGraceMs
        );
        childExitPromise.then((outcome) => {
          clearTimeout(timer);
          resolve({ outcome, timedOut: false });
        });
      });
      childOutcome = boundedExit.timedOut
        ? {
            code: null,
            signal: null,
            spawnError: "Inner child did not exit within the bounded post-signal deadline."
          }
        : boundedExit.outcome;
    }
  } catch (error) {
    childOutcome = {
      code: null,
      signal: null,
      spawnError: errorText(error)
    };
  } finally {
    terminalCleanupStarted = true;
    try {
      universeCleanup = await terminateOwnedUniverse({
        innerProcessGroupId: processGroupId,
        killGraceMs: canonicalKillGraceMs,
        runNonce: nonce,
        runToken,
        termGraceMs: canonicalTermGraceMs,
        tracker
      });
    } catch (error) {
      violations.push(`Owned-process cleanup failed: ${errorText(error)}.`);
      universeCleanup = {
        actions: [],
        consecutiveZeroScans: 0,
        detachedProcessGroupTermination: [],
        finalRows: tracker.scan().rows,
        firstRows: [],
        processGroupTermination: {
          finalMembers: [],
          initialMembers: [],
          kill: { attempted: false, membersAfterGrace: [], sent: false, signal: "SIGKILL" },
          provenEmpty: false,
          term: { attempted: false, membersAfterGrace: [], sent: false, signal: "SIGTERM" }
        },
        provenEmpty: false,
        recordedProcessGroupTermination: [],
        tracker: tracker.receipt()
      };
    }
    tracker.stop();
    universeCleanup = Object.freeze({
      ...universeCleanup,
      tracker: tracker.receipt()
    });
    const [stdoutStreamCompletion, stderrStreamCompletion] = await Promise.all([
      waitForStreamEnd(child?.stdout),
      waitForStreamEnd(child?.stderr)
    ]);
    streamCompletion = Object.freeze({
      stderr: stderrStreamCompletion,
      stdout: stdoutStreamCompletion
    });
    await Promise.all([stdoutLog.settle(), stderrLog.settle()]);
    child?.stdout?.removeListener("data", stdoutLog.handler);
    child?.stderr?.removeListener("data", stderrLog.handler);
    stdoutReceipt = stdoutLog.finalize();
    stderrReceipt = stderrLog.finalize();
  }

  let nextEnvCleanup;
  try {
    nextEnvCleanup = restoreTrackedFileAtomically(paths, nextEnvSnapshot, invocation.cwd);
    if (!nextEnvCleanup.exact) {
      violations.push(`Tracked next-env.d.ts cleanup failed closed; status=${nextEnvCleanup.status}.`);
    }
  } catch (error) {
    nextEnvCleanup = {
      atomic: false,
      before: nextEnvSnapshot.receipt,
      error: errorText(error),
      exact: false,
      restored: false,
      status: "cleanup-error"
    };
    violations.push(`Tracked next-env.d.ts cleanup failed: ${nextEnvCleanup.error}.`);
  }

  const cleanupRegistry = tracker.scan().registry;
  let runLockCleanup;
  try {
    runLockCleanup = cleanInnerRunLock(
      paths,
      invocation,
      processGroupId,
      [...cleanupRegistry.runLockCreations.values()],
      [...cleanupRegistry.acks.values()],
      {
        expectedPreloadPathSha256: preloadBefore.pathSha256,
        expectedPreloadSha256: preloadBefore.sha256,
        expectedRunnerPathSha256: runnerBefore.pathSha256,
        expectedRunnerSha256: runnerBefore.sha256
      }
    );
    if (!["already-absent", "removed-owned"].includes(runLockCleanup.status)) {
      violations.push(`Run-lock cleanup is incomplete; status=${runLockCleanup.status}.`);
    }
  } catch (error) {
    runLockCleanup = {
      error: errorText(error),
      ownerValidated: false,
      path: paths.runLockPath,
      removed: false,
      status: "cleanup-error"
    };
    violations.push(`Run-lock cleanup failed: ${runLockCleanup.error}.`);
  }

  let nextTsconfigCleanup;
  try {
    nextTsconfigCleanup = archiveRunSpecificTsconfig(
      paths,
      invocation.cwd,
      [...cleanupRegistry.tsconfigCreations.values()],
      [...cleanupRegistry.acks.values()],
      preloadBefore.sha256
    );
    if (!["already-absent", "archived"].includes(nextTsconfigCleanup.status)) {
      violations.push(`Run-specific tsconfig cleanup is incomplete; status=${nextTsconfigCleanup.status}.`);
    }
  } catch (error) {
    nextTsconfigCleanup = {
      error: errorText(error),
      path: paths.nextTsconfigPath,
      sourceAbsent: !pathEntryExists(paths.nextTsconfigPath),
      status: "cleanup-error"
    };
    violations.push(`Run-specific tsconfig cleanup failed: ${nextTsconfigCleanup.error}.`);
  }

  if (childOutcome.spawnError) violations.push(`Inner spawn error: ${childOutcome.spawnError}.`);
  if (childOutcome.signal) violations.push(`Inner child terminated by signal ${childOutcome.signal}.`);
  if (childOutcome.code !== 0) violations.push(`Inner child exit code was ${String(childOutcome.code)}.`);
  auditReceivedSignals();
  if (!universeCleanup.provenEmpty) {
    violations.push(
      `Owned process universe was not proven empty; remaining=${universeCleanup.finalRows.length}.`
    );
  }
  if (!universeCleanup.processGroupTermination.provenEmpty) {
    violations.push("The exact inner process group was not proven empty.");
  }
  if (universeCleanup.detachedProcessGroupTermination.some(({ provenEmpty }) => !provenEmpty)) {
    violations.push("One or more previously validated detached process groups were not proven empty.");
  }
  if (universeCleanup.recordedProcessGroupTermination.some(({ provenEmpty }) => !provenEmpty)) {
    violations.push("One or more schema-recorded process groups were not proven empty.");
  }
  if (childOutcome.code === 0 && universeCleanup.firstRows.length > 0) {
    violations.push(
      `Inner child exited zero with ${universeCleanup.firstRows.length} residual owned process(es).`
    );
  }
  if (universeCleanup.tracker.registryIssues.length > 0) {
    violations.push(`Child registry is invalid: ${universeCleanup.tracker.registryIssues.join(" | ")}.`);
  }
  if (universeCleanup.tracker.identityMismatches.length > 0) {
    violations.push(
      `Child registry identity validation failed (${universeCleanup.tracker.identityMismatches.length}).`
    );
  }
  if (universeCleanup.tracker.scanErrors.length > 0) {
    violations.push(`Owned-process scan errors occurred (${universeCleanup.tracker.scanErrors.length}).`);
  }
  if (!stdoutReceipt.exact || !stderrReceipt.exact) {
    violations.push("Terminal log path/inode/bytes receipts are incomplete.");
  }
  if (
    !streamCompletion.stdout.ended || streamCompletion.stdout.timedOut ||
    !streamCompletion.stderr.ended || streamCompletion.stderr.timedOut ||
    streamCompletion.stdout.error || streamCompletion.stderr.error
  ) {
    violations.push("Inner stdout/stderr streams did not reach exact EOF before terminal log seal.");
  }

  let runnerAfter = null;
  try {
    runnerAfter = fileReceipt("inner Playwright runner after child", invocation.innerRunnerPath, {
      containmentRoot: invocation.cwd
    });
    if (!stableReceiptsEqual(runnerBefore, runnerAfter) || !sameIdentity(runnerBefore, runnerAfter)) {
      violations.push("Inner Playwright runner changed while executing.");
    }
  } catch (error) {
    violations.push(`Inner Playwright runner postflight failed: ${errorText(error)}.`);
  }
  let preloadAfter = null;
  try {
    preloadAfter = fileReceipt("Starship child registry preload after child", paths.preloadPath, {
      containmentRoot: invocation.cwd
    });
    if (!stableReceiptsEqual(preloadBefore, preloadAfter) || !sameIdentity(preloadBefore, preloadAfter)) {
      violations.push("Starship child registry preload changed while executing.");
    }
  } catch (error) {
    violations.push(`Starship child registry preload postflight failed: ${errorText(error)}.`);
  }
  let supervisorSourceAfter = null;
  try {
    supervisorSourceAfter = fileReceipt("Starship supervisor source after child", supervisorSourcePath, {
      containmentRoot: supervisorSourceContainmentRoot
    });
    if (!stableReceiptsEqual(supervisorSourceBefore, supervisorSourceAfter) ||
        !sameIdentity(supervisorSourceBefore, supervisorSourceAfter)) {
      violations.push("Starship supervisor source changed while executing.");
    }
  } catch (error) {
    violations.push(`Starship supervisor source postflight failed: ${errorText(error)}.`);
  }

  let registrySnapshot;
  try {
    registrySnapshot = readRegistrySnapshot(
      registryJournal.descriptor,
      nonceSha256,
      runTokenSha256,
      {
        expectedPreloadPathSha256: preloadBefore.pathSha256,
        expectedPreloadSha256: preloadBefore.sha256,
        expectedRunnerPathSha256: runnerBefore.pathSha256,
        expectedRunnerSha256: runnerBefore.sha256
      }
    );
  } catch (error) {
    registrySnapshot = {
      acks: new Map(),
      bytesRead: 0,
      intents: new Map(),
      issues: [errorText(error)],
      journalSha256: null,
      results: new Map(),
      runLockCreations: new Map(),
      tsconfigCreations: new Map(),
      unmatchedIntents: []
    };
    violations.push(`Final child-registry receipt failed: ${errorText(error)}.`);
  }
  if (registrySnapshot.issues.length > 0) {
    violations.push(`Final child-registry receipt is invalid: ${registrySnapshot.issues.join(" | ")}.`);
  }
  const finalRecordedProcessGroups = Object.freeze(
    [...new Set([
      ...[...registrySnapshot.acks.values()]
        .filter(({ pgid }) => Number.isInteger(pgid))
        .map(({ pgid }) => pgid),
      ...[...registrySnapshot.results.values()]
        .filter(({ classification, pgid }) => classification === "spawned" && Number.isInteger(pgid))
        .map(({ pgid }) => pgid)
    ])].sort((left, right) => left - right)
  );
  const priorRecordedTermination = new Map(
    universeCleanup.recordedProcessGroupTermination.map((entry) => [entry.processGroupId, entry])
  );
  const scanFinalRecordedGroups = () => finalRecordedProcessGroups.map((processGroupId) => {
    try {
      return Object.freeze({
        members: Object.freeze(processGroupRows(processGroupId)),
        processGroupId,
        scanError: null
      });
    } catch (error) {
      return Object.freeze({
        members: Object.freeze([]),
        processGroupId,
        scanError: errorText(error)
      });
    }
  });
  const recordedAuditFirst = scanFinalRecordedGroups();
  await new Promise((resolve) => setTimeout(resolve, PROCESS_SCAN_INTERVAL_MS));
  const recordedAuditSecond = scanFinalRecordedGroups();
  const recordedAuditFirstByGroup = new Map(
    recordedAuditFirst.map((entry) => [entry.processGroupId, entry])
  );
  const finalRecordedProcessGroupTermination = Object.freeze(
    recordedAuditSecond.map((second) => {
      const first = recordedAuditFirstByGroup.get(second.processGroupId);
      const prior = priorRecordedTermination.get(second.processGroupId);
      const scanErrors = Object.freeze(
        [first?.scanError, second.scanError].filter((value) => typeof value === "string")
      );
      return Object.freeze({
        actions: prior?.actions ?? Object.freeze([]),
        finalMembers: second.members,
        firstAuditMembers: first?.members ?? Object.freeze([]),
        processGroupId: second.processGroupId,
        provenEmpty: prior?.provenEmpty !== false &&
          scanErrors.length === 0 &&
          first?.members.length === 0 &&
          second.members.length === 0,
        scanErrors
      });
    })
  );
  const recordedAuditResidualRows = finalRecordedProcessGroupTermination.flatMap(
    ({ finalMembers }) => finalMembers
  );
  const terminalRowsByIdentity = new Map(
    [...universeCleanup.finalRows, ...recordedAuditResidualRows].map((row) => [
      `${row.pid}:${row.startToken}`,
      row
    ])
  );
  universeCleanup = Object.freeze({
    ...universeCleanup,
    finalRows: Object.freeze([...terminalRowsByIdentity.values()]),
    provenEmpty: universeCleanup.provenEmpty === true &&
      finalRecordedProcessGroupTermination.every(({ provenEmpty }) => provenEmpty),
    recordedProcessGroupTermination: finalRecordedProcessGroupTermination
  });
  if (finalRecordedProcessGroupTermination.some(({ scanErrors }) => scanErrors.length > 0)) {
    violations.push("One or more schema-recorded process groups could not be terminally rescanned.");
  }
  if (finalRecordedProcessGroupTermination.some(({ provenEmpty }) => !provenEmpty)) {
    violations.push("One or more final schema-recorded process groups were not proven empty.");
  }
  const seenIdentities = universeCleanup.tracker.seenIdentities;
  const preloadAcks = [...registrySnapshot.acks.values()];
  const abandonedIntents = [];
  for (const eventId of registrySnapshot.unmatchedIntents) {
    const intent = registrySnapshot.intents.get(eventId);
    const parentSeen = seenIdentities.some((identity) =>
      identity.pid === intent?.parentPid &&
      identity.pgid === intent?.parentPgid &&
      identity.startToken === intent?.parentStartToken &&
      identity.commandSha256 === intent?.parentProcessCommandSha256
    ) || preloadAcks.some((ack) =>
      ack.pid === intent?.parentPid &&
      ack.pgid === intent?.parentPgid &&
      ack.startToken === intent?.parentStartToken &&
      ack.processCommandSha256 === intent?.parentProcessCommandSha256 &&
      ack.preloadSha256 === preloadBefore.sha256
    );
    const parentStillLive = allProcessRows().some((row) =>
      row.pid === intent?.parentPid &&
      row.pgid === intent?.parentPgid &&
      row.startToken === intent?.parentStartToken &&
      sha256(Buffer.from(row.command, "utf8")) === intent?.parentProcessCommandSha256
    );
    const abnormalParentDeath = childOutcome.signal !== null ||
      childOutcome.spawnError !== null ||
      childOutcome.code !== 0 ||
      universeCleanup.firstRows.length > 0 ||
      forwarded.some(({ parentDeathRelevant }) => parentDeathRelevant === true);
    if (intent && parentSeen && !parentStillLive && abnormalParentDeath) {
      abandonedIntents.push(Object.freeze({
        classification: "abandoned-parent-death",
        eventId,
        parentPgid: intent.parentPgid,
        parentPid: intent.parentPid,
        parentProcessCommandSha256: intent.parentProcessCommandSha256,
        parentStartToken: intent.parentStartToken
      }));
    } else {
      violations.push(`Registry intent ${eventId} has no exact terminal result or proven parent-death disposition.`);
    }
  }
  const innerPreloadAck = Number.isInteger(processGroupId)
    ? preloadAcks.find((ack) =>
        ack.pid === processGroupId &&
        ack.pgid === processGroupId &&
        ack.preloadPathSha256 === preloadBefore.pathSha256 &&
        ack.preloadSha256 === preloadBefore.sha256 &&
        ack.runnerPathSha256 === runnerBefore.pathSha256 &&
        ack.runnerSha256 === runnerBefore.sha256
      ) ?? null
    : null;
  if (Number.isInteger(processGroupId) && !innerPreloadAck) {
    violations.push("The inner runner did not emit an exact runtime preload initialization ACK.");
  }
  for (const ack of preloadAcks) {
    if (
      ack.preloadPathSha256 !== preloadBefore.pathSha256 ||
      ack.preloadSha256 !== preloadBefore.sha256 ||
      ack.runnerPathSha256 !== runnerBefore.pathSha256 ||
      ack.runnerSha256 !== runnerBefore.sha256
    ) {
      violations.push(`Runtime preload ACK ${ack.eventId} has the wrong source path or SHA-256.`);
    }
  }
  const registryJournalReceipt = finalizeAppendJournal(
    "child registry journal",
    registryJournal,
    invocation.cwd
  );
  if (!registryJournalReceipt.exact) {
    violations.push("Child registry journal path/inode/bytes receipt is incomplete.");
  }
  const registryJournalSnapshotExact = registryJournalReceipt.exact === true &&
    registryJournalReceipt.final?.sha256 === registrySnapshot.journalSha256 &&
    registryJournalReceipt.final?.size === registrySnapshot.bytesRead;
  if (!registryJournalSnapshotExact) {
    violations.push("Child registry final bytes do not exactly bind the validated terminal snapshot.");
  }

  const supervisorLockCleanup = releaseSupervisorLock(paths, invocation, supervisorLock);
  if (supervisorLockCleanup.status !== "removed-owned") {
    violations.push(`Outer supervisor lock cleanup is incomplete; status=${supervisorLockCleanup.status}.`);
  }

  const unexpectedActiveCleanupPaths = [
    paths.runLockPath,
    paths.supervisorLockPath,
    paths.nextTsconfigPath
  ].filter((candidate) => pathEntryExists(candidate));
  if (unexpectedActiveCleanupPaths.length > 0) {
    violations.push(
      `Active cleanup paths still exist and were preserved: ${unexpectedActiveCleanupPaths.join(", ")}.`
    );
  }

  const cleanupComplete = nextEnvCleanup.exact === true &&
    ["already-absent", "removed-owned"].includes(runLockCleanup.status) &&
    ["already-absent", "archived"].includes(nextTsconfigCleanup.status) &&
    supervisorLockCleanup.status === "removed-owned" &&
    universeCleanup.provenEmpty === true &&
    universeCleanup.processGroupTermination.provenEmpty === true &&
    universeCleanup.detachedProcessGroupTermination.every(({ provenEmpty }) => provenEmpty) &&
    universeCleanup.recordedProcessGroupTermination.every(({ provenEmpty }) => provenEmpty) &&
    stdoutReceipt.exact === true &&
    stderrReceipt.exact === true &&
    streamCompletion.stdout.ended === true && !streamCompletion.stdout.timedOut &&
    streamCompletion.stderr.ended === true && !streamCompletion.stderr.timedOut &&
    registryJournalSnapshotExact &&
    unexpectedActiveCleanupPaths.length === 0 &&
    (
      (nextEnvCleanup.status === "unchanged" && !pathEntryExists(paths.nextEnvRestoreTempPath)) ||
      (nextEnvCleanup.status === "restored-exact" &&
        nextEnvCleanup.restoreTemp?.exists === true &&
        sameIdentity(nextEnvCleanup.restoreTemp, nextEnvCleanup.after))
    );
  if (!cleanupComplete) {
    violations.push("Terminal cleanup is not complete.");
  }
  await drainDeliveredSignalCallbacks();
  signalAcceptanceOpen = false;
  signalAcceptanceClosedSequence = forwarded.length;
  signalAcceptanceClosedAt = new Date().toISOString();
  auditReceivedSignals();
  let candidateReceiptSha256 = null;
  let candidateSerializedAt = null;
  let candidateDeliveredCount = null;
  let postCandidateDrainCompletedAt = null;
  let signalJournalReceipt = null;
  let signalJournalExpectedSha256 = null;
  let signalJournalSnapshotExact = null;
  const rawInnerFullRunRuntimeSourceHold = captureRawInnerFullRunRuntimeSourceHold(
    paths,
    invocation.cwd
  );
  const buildReceipt = () => ({
    child: {
      argv: [invocation.command, ...invocation.args],
      argvSha256: sha256(Buffer.from(JSON.stringify([invocation.command, ...invocation.args]), "utf8")),
      cwd: invocation.cwd,
      environment: {
        ...exactEnvironmentReceipt(effectiveEnvironment),
        contract: invocation.environmentContract,
        mutablePaths: {
          TEMP: effectiveEnvironment.TEMP,
          TMP: effectiveEnvironment.TMP,
          TMPDIR: effectiveEnvironment.TMPDIR
        },
        runTokenSha256
      },
      outcome: childOutcome,
      processGroupId
    },
    cleanup: {
      activePathsPreserved: unexpectedActiveCleanupPaths,
      complete: cleanupComplete,
      detachedProcessGroupTermination: universeCleanup.detachedProcessGroupTermination,
      nextEnv: nextEnvCleanup,
      nextTsconfig: nextTsconfigCleanup,
      orphanScan: {
        finalMembers: universeCleanup.finalRows,
        initialMembers: universeCleanup.firstRows,
        processGroupId,
        provenEmpty: universeCleanup.provenEmpty
      },
      ownedUniverse: {
        actions: universeCleanup.actions,
        consecutiveZeroScans: universeCleanup.consecutiveZeroScans,
        finalRows: universeCleanup.finalRows,
        firstRows: universeCleanup.firstRows,
        provenEmpty: universeCleanup.provenEmpty
      },
      processGroupTermination: universeCleanup.processGroupTermination,
      recordedProcessGroupTermination: universeCleanup.recordedProcessGroupTermination,
      runLock: runLockCleanup,
      supervisorLock: supervisorLockCleanup,
      validatedDetachedProcessGroups: universeCleanup.tracker.validatedDetachedProcessGroups,
      validatedProcessGroups: universeCleanup.tracker.validatedProcessGroups
    },
    contract: SUPERVISOR_CONTRACT,
    finishedAt: new Date().toISOString(),
    innerEvidence: {
      fullRunRuntimeSourceHold: rawInnerFullRunRuntimeSourceHold
    },
    logs: {
      stderr: { ...stderrReceipt, stream: streamCompletion.stderr },
      stdout: { ...stdoutReceipt, stream: streamCompletion.stdout }
    },
    paths,
    preload: {
      after: preloadAfter,
      before: preloadBefore,
      sha256: preloadBefore.sha256
    },
    registry: {
      abandonedIntents,
      ackCount: registrySnapshot.acks.size,
      commandTransitions: universeCleanup.tracker.commandTransitions,
      identityMismatches: universeCleanup.tracker.identityMismatches,
      intentCount: registrySnapshot.intents.size,
      issues: [...registrySnapshot.issues],
      journal: registryJournalReceipt,
      journalSnapshotExact: registryJournalSnapshotExact,
      journalSha256: registrySnapshot.journalSha256,
      preloadAckCount: registrySnapshot.acks.size,
      preloadAcks,
      recordedProcessGroups: finalRecordedProcessGroups,
      resultCount: registrySnapshot.results.size,
      runLockCreationCount: registrySnapshot.runLockCreations.size,
      runLockCreations: [...registrySnapshot.runLockCreations.values()],
      scanCount: universeCleanup.tracker.scanCount,
      scanErrors: universeCleanup.tracker.scanErrors,
      seenIdentities: universeCleanup.tracker.seenIdentities,
      tsconfigCreationCount: registrySnapshot.tsconfigCreations.size,
      tsconfigCreations: [...registrySnapshot.tsconfigCreations.values()],
      unmatchedIntentCount: registrySnapshot.unmatchedIntents.length
    },
    runner: { after: runnerAfter, before: runnerBefore },
    releaseReady: false,
    schemaVersion: SUPERVISOR_SCHEMA_VERSION,
    signals: {
      finalization: {
        acceptanceClosedAt: signalAcceptanceClosedAt,
        acceptanceClosedSequence: signalAcceptanceClosedSequence,
        acceptanceOpenedAt: signalAcceptanceOpenedAt,
        acceptanceOpenedSequence: 0,
        candidateDeliveredCount,
        candidateReceiptSha256,
        candidateSerializedAt,
        guarantee: "Node callback delivered before terminalEvidenceClosed; not wall-clock signal arrival or file-seal atomicity.",
        outerExitEvidenceRequired: true,
        postCandidateDrainCompletedAt,
        protocol: "signal-acceptance-drain-and-terminal-evidence-v1",
        releaseGreenRequires: {
          liveSignalJournalMatchesReceipt: true,
          outerExitCode: 0,
          outerExitSignal: null,
          validatorRunsAfterOuterProcessExit: true
        },
        terminalEvidenceClosedAt,
        terminalEvidenceClosedSequence
      },
      forwarded: [...forwarded],
      journal: {
        deliveredCount: deliveredSignalRecords.length,
        deliveredRecords: [...deliveredSignalRecords],
        deliveredRecordsSha256: sha256(Buffer.from(JSON.stringify(deliveredSignalRecords), "utf8")),
        errors: [...signalJournalErrors],
        expectedSha256: signalJournalExpectedSha256,
        path: paths.signalJournalPath,
        receipt: signalJournalReceipt,
        snapshotExact: signalJournalSnapshotExact
      }
    },
    startedAt,
    status: violations.length === 0 ? "passed" : "failed",
    supervisor: {
      after: supervisorSourceAfter,
      before: supervisorSourceBefore,
      nonceSha256
    },
    violations: [...violations]
  });

  const candidateReceipt = buildReceipt();
  const candidateReceiptBytes = serializeTerminalReceipt(candidateReceipt);
  candidateReceiptSha256 = sha256(candidateReceiptBytes);
  candidateSerializedAt = new Date().toISOString();
  candidateDeliveredCount = deliveredSignalRecords.length;

  await drainDeliveredSignalCallbacks();
  terminalEvidenceClosedSequence = forwarded.length;
  terminalEvidenceClosedAt = new Date().toISOString();
  postCandidateDrainCompletedAt = terminalEvidenceClosedAt;
  auditReceivedSignals();
  if (signalJournalErrors.length > 0) {
    violations.push(`Delivered signal journal writes failed (${signalJournalErrors.length}).`);
  }
  signalJournalReceipt = finalizeAppendJournal(
    "delivered signal journal",
    signalJournal,
    invocation.cwd
  );
  if (!signalJournalReceipt.exact) {
    violations.push("Delivered signal journal path/inode/bytes receipt is incomplete.");
  }
  const expectedSignalJournalBytes = Buffer.from(
    deliveredSignalRecords.map((record) => `${JSON.stringify(record)}\n`).join(""),
    "utf8"
  );
  signalJournalExpectedSha256 = sha256(expectedSignalJournalBytes);
  signalJournalSnapshotExact = signalJournalReceipt.exact === true &&
    signalJournalReceipt.final?.size === expectedSignalJournalBytes.length &&
    signalJournalReceipt.final?.sha256 === signalJournalExpectedSha256;
  if (!signalJournalSnapshotExact) {
    violations.push("Delivered signal journal bytes do not exactly bind the delivered record snapshot.");
  }

  const receipt = buildReceipt();
  const receiptBytes = serializeTerminalReceipt(receipt);

  try {
    finalizeReservedReceipt(reservedReceipt, receipt, invocation.cwd, receiptBytes);
  } catch (error) {
    const terminalError = new Error(
      `Starship Playwright supervisor could not seal its terminal receipt: ${errorText(error)}`
    );
    terminalError.receiptPath = paths.receiptPath;
    throw terminalError;
  } finally {
    activeSignalReceiver = null;
    removeSignalHandlers();
  }
  if (violations.length > 0) {
    const error = new Error(
      `Starship Playwright supervisor failed: ${violations.join(" | ")} Receipt=${paths.receiptPath}`
    );
    error.receiptPath = paths.receiptPath;
    throw error;
  }
  return Object.freeze({ receipt: Object.freeze(receipt), receiptPath: paths.receiptPath });
}

export function parseSupervisedStarshipPlaywrightCli(argv) {
  if (!Array.isArray(argv)) throw new Error("CLI argv must be an array.");
  const separatorIndex = argv.indexOf("--");
  if (separatorIndex < 0) {
    throw new Error("Use -- to separate supervisor options from the exact `test` command.");
  }
  const optionArgs = argv.slice(0, separatorIndex);
  const innerArgs = argv.slice(separatorIndex + 1);
  if (innerArgs.length === 0 || innerArgs[0] !== "test") {
    throw new Error("Supervised Playwright arguments must begin with the exact `test` command.");
  }
  const values = new Map();
  const allowed = new Set([
    "--inner-runner",
    "--kill-grace-ms",
    "--repository-root",
    "--run-id",
    "--term-grace-ms"
  ]);
  for (let index = 0; index < optionArgs.length; index += 2) {
    const option = optionArgs[index];
    const value = optionArgs[index + 1];
    if (!allowed.has(option)) throw new Error(`Unknown supervisor option ${String(option)}.`);
    if (values.has(option)) throw new Error(`Duplicate supervisor option ${option}.`);
    if (typeof value !== "string" || value.length === 0 || value.startsWith("--")) {
      throw new Error(`${option} requires one value.`);
    }
    values.set(option, value);
  }
  for (const required of ["--repository-root", "--inner-runner", "--run-id"]) {
    if (!values.has(required)) throw new Error(`${required} is required.`);
  }
  const parsed = {
    innerArgs,
    innerRunnerPath: values.get("--inner-runner"),
    repositoryRoot: values.get("--repository-root"),
    runId: validateRunId(values.get("--run-id"))
  };
  if (values.has("--term-grace-ms")) {
    if (!/^\d+$/u.test(values.get("--term-grace-ms"))) {
      throw new Error("--term-grace-ms must be a decimal integer.");
    }
    parsed.termGraceMs = validateBoundedDuration(
      Number(values.get("--term-grace-ms")),
      "--term-grace-ms"
    );
  }
  if (values.has("--kill-grace-ms")) {
    if (!/^\d+$/u.test(values.get("--kill-grace-ms"))) {
      throw new Error("--kill-grace-ms must be a decimal integer.");
    }
    parsed.killGraceMs = validateBoundedDuration(
      Number(values.get("--kill-grace-ms")),
      "--kill-grace-ms"
    );
  }
  return parsed;
}

function usage() {
  return [
    "Usage:",
    "  node scripts/run-starship-playwright-supervised.mjs \\",
    "    --repository-root /Volumes/Starship/... \\",
    "    --inner-runner /Volumes/Starship/.../scripts/run-starship-playwright.mjs \\",
    "    --run-id UNIQUE_NAME [--term-grace-ms 1500] [--kill-grace-ms 5000] \\",
    "    -- test <specs/options>",
    "",
    "The supervisor owns a token registry, detached POSIX groups, terminal logs/receipt, and crash cleanup."
  ].join("\n");
}

const invokedAsMain = process.argv[1] &&
  pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
if (invokedAsMain) {
  try {
    const parsed = parseSupervisedStarshipPlaywrightCli(process.argv.slice(2));
    const result = await executeSupervisedStarshipPlaywright(parsed);
    console.log(JSON.stringify({
      contract: SUPERVISOR_CONTRACT,
      receiptPath: result.receiptPath,
      status: "passed"
    }));
  } catch (error) {
    console.error(errorText(error));
    console.error(usage());
    process.exitCode = 1;
  }
}
