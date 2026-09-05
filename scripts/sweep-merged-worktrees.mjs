#!/usr/bin/env node
// Retire linked worktrees whose work is already preserved elsewhere.
//
// CLAUDE.md requires a landed branch's worktree to be removed the same day. In
// practice the branch is tidied and the tree is left behind, so harness-created
// worktrees accumulate: a 2026-08-27 sweep found 122 registered worktrees, 74 of
// them retirable with zero commit loss and 177 GiB of disk attached.
//
// DRY RUN BY DEFAULT. --apply additionally requires an immutable manifest,
// its expected SHA-256 digest, an expected live-main SHA, and a new receipt path.
//
// A worktree is retired only when ALL of these hold:
//   1. it is a linked worktree (never the primary checkout, never bare)
//   2. its directory exists and `git status --porcelain` is empty
//   3. it holds no protected ignored content (see PROTECTED_IGNORED)
//   4. its HEAD is an ancestor of live remote main (never cached origin/main)
//   5. live GitHub evidence proves its branch has no open PR
//   6. immutable owner/task custody and active-process evidence are available
//   7. path, branch, HEAD, and topology match the authorized manifest lock
//
// `git worktree remove` is never called with --force.
//
// Usage:
//   node scripts/sweep-merged-worktrees.mjs                 # plan only
//   node scripts/sweep-merged-worktrees.mjs --json          # machine-readable plan
//   node scripts/sweep-merged-worktrees.mjs --min-age-days 3
//   node scripts/sweep-merged-worktrees.mjs --json \
//     --manifest /absolute/sweep-manifest.json \
//     --manifest-sha256 <sha256> \
//     --expected-live-main-sha <git-object-id>
//   node scripts/sweep-merged-worktrees.mjs --apply \
//     --manifest /absolute/sweep-manifest.json \
//     --manifest-sha256 <sha256> \
//     --expected-live-main-sha <git-object-id> \
//     --receipt /absolute/new-postflight-receipt.json
import { execFileSync, spawnSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import {
  accessSync, closeSync, constants as fsConstants, existsSync, fstatSync, fsyncSync, ftruncateSync, lstatSync, openSync,
  readSync, realpathSync,
  unlinkSync, writeFileSync, writeSync,
} from "node:fs";
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";
import {
  PROMOTION_WORKFLOW_JSON_LIMITS,
  parsePromotionWorkflowJsonBytes,
} from "./promotion-workflow-json-guard.mjs";

export const MAX_APPLY_TARGETS = 5;
const OPEN_PR_QUERY_LIMIT = 1000;
const APPLY_MANIFEST_SCHEMA = "sweep-merged-worktrees.apply-manifest.v1";
const OBJECT_ID_PATTERN = /^[0-9a-f]{40}(?:[0-9a-f]{24})?$/i;
const SHA256_PATTERN = /^[0-9a-f]{64}$/i;
export const TRUSTED_GIT_EXECUTABLE = "/usr/bin/git";
export const TRUSTED_GH_EXECUTABLE = "/opt/homebrew/bin/gh";
export const TRUSTED_LSOF_EXECUTABLE = "/usr/sbin/lsof";
export const APPROVED_REPOSITORY_IDENTITY = "HUDongpin/MAIS-MVP";
export const APPROVED_REPOSITORY_URL = "https://github.com/HUDongpin/MAIS-MVP.git";
export const LIVE_REMOTE_HEAD_SOURCES = Object.freeze(["gh-api-git-ref"]);
export const GITHUB_JSON_LIMITS = PROMOTION_WORKFLOW_JSON_LIMITS;
export const GITHUB_JSON_WORK_LIMIT = 1024 * 1024;
export const MAX_MANIFEST_BYTES = PROMOTION_WORKFLOW_JSON_LIMITS.maxBytes;
export const COMMAND_TIMEOUT_MS = 60_000;
export const COMMAND_MAX_BUFFER_BYTES = 8 * 1024 * 1024;
export const COMMAND_KILL_SIGNAL = "SIGKILL";
export function isSupportedSweepPlatform(platform = process.platform) { return platform === "darwin"; }
const MAX_GITDIR_FILE_BYTES = 4096;
const MAX_FLEET_LEASE_BYTES = 64 * 1024;
export function sha256Text(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function sanitizedGitEnvironment(source = process.env) {
  const environment = { ...source };
  for (const key of Object.keys(environment)) {
    if (/^GIT_/u.test(key)) delete environment[key];
  }
  environment.GIT_CONFIG_NOSYSTEM = "1";
  environment.GIT_CONFIG_GLOBAL = "/dev/null";
  environment.GIT_CONFIG_SYSTEM = "/dev/null";
  environment.GIT_OPTIONAL_LOCKS = "0";
  environment.GIT_TERMINAL_PROMPT = "0";
  environment.GIT_ASKPASS = "/usr/bin/false";
  environment.SSH_ASKPASS = "/usr/bin/false";
  environment.GCM_INTERACTIVE = "never";
  environment.GIT_SSH_COMMAND = "/usr/bin/ssh -F /dev/null -oBatchMode=yes -oStrictHostKeyChecking=yes -oUpdateHostKeys=no -oControlMaster=no -oControlPath=none -oPermitLocalCommand=no -oProxyCommand=none -oClearAllForwardings=yes";
  environment.GIT_SSH_VARIANT = "ssh";
  environment.GH_PROMPT_DISABLED = "1";
  return environment;
}

function noOptionalLocks(args) {
  return args[0] === "--no-optional-locks" ? args : ["--no-optional-locks", ...args];
}

function executeGit(execFile, args, options = {}) {
  return execFile(TRUSTED_GIT_EXECUTABLE, noOptionalLocks(args), {
    ...options,
    env: sanitizedGitEnvironment(options.env ?? process.env),
    timeout: COMMAND_TIMEOUT_MS,
    maxBuffer: COMMAND_MAX_BUFFER_BYTES,
    killSignal: COMMAND_KILL_SIGNAL,
  });
}

function sanitizedGitHubEnvironment(source = process.env) {
  const environment = sanitizedGitEnvironment(source);
  delete environment.GH_REPO;
  delete environment.GH_HOST;
  return environment;
}

function executeGitHub(execFile, args, options = {}) {
  return execFile(TRUSTED_GH_EXECUTABLE, args, {
    ...options,
    env: sanitizedGitHubEnvironment(options.env ?? process.env),
    timeout: COMMAND_TIMEOUT_MS,
    maxBuffer: COMMAND_MAX_BUFFER_BYTES,
    killSignal: COMMAND_KILL_SIGNAL,
  });
}

function isCanonicalIsoDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const timestamp = Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === value;
}

function isCanonicalCreationDate(value) {
  if (isCanonicalIsoDate(value)) return true;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value)) {
    return false;
  }
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString() === value;
}

function parseFrozenRuntimeTimestamp(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(value)) return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString() === value ? timestamp : null;
}

/** Stable fingerprint of the registration facts that identify one worktree. */
export function fingerprintTopology(wt) {
  return sha256Text(JSON.stringify({
    path: wt.path,
    branch: wt.branch ?? null,
    head: wt.head ?? null,
    bare: Boolean(wt.bare),
    detached: Boolean(wt.detached),
    locked: Boolean(wt.locked),
    lockReason: wt.lockReason ?? null,
    prunable: Boolean(wt.prunable),
    prunableReason: wt.prunableReason ?? null,
  }));
}

export function fingerprintFleet(worktrees) {
  return sha256Text(JSON.stringify(
    worktrees
      .map((wt) => ({
        path: wt.path,
        branch: wt.branch ?? null,
        head: wt.head ?? null,
        bare: Boolean(wt.bare),
        detached: Boolean(wt.detached),
        locked: Boolean(wt.locked),
        lockReason: wt.lockReason ?? null,
        prunable: Boolean(wt.prunable),
        prunableReason: wt.prunableReason ?? null,
      }))
      .sort((left, right) => left.path < right.path ? -1 : left.path > right.path ? 1 : 0),
  ));
}

export function parseSweepArgs(argv) {
  const parsed = {
    ok: true,
    apply: false,
    manifestPreview: false,
    asJson: false,
    minAgeDays: 0,
    manifestPath: null,
    manifestSha256: null,
    expectedLiveMainSha: null,
    receiptPath: null,
  };
  const valued = new Map([
    ["--manifest", "manifestPath"],
    ["--manifest-sha256", "manifestSha256"],
    ["--expected-live-main-sha", "expectedLiveMainSha"],
    ["--receipt", "receiptPath"],
  ]);
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    if (arg === "--apply") parsed.apply = true;
    else if (arg === "--json") parsed.asJson = true;
    else if (arg === "--no-pr-check") {
      return { ok: false, reason: "the GitHub PR evidence gate cannot be disabled" };
    } else if (arg === "--min-age-days") {
      const raw = argv[++index];
      if (!/^\d+$/.test(raw ?? "")) return { ok: false, reason: "--min-age-days requires a non-negative integer" };
      parsed.minAgeDays = Number(raw);
    } else if (valued.has(arg)) {
      const value = argv[++index];
      if (!value || value.startsWith("--")) return { ok: false, reason: `${arg} requires a value` };
      parsed[valued.get(arg)] = value;
    } else return { ok: false, reason: `unknown argument: ${arg}` };
  }
  if (parsed.apply) {
    const missing = [
      ["--manifest", parsed.manifestPath],
      ["--manifest-sha256", parsed.manifestSha256],
      ["--expected-live-main-sha", parsed.expectedLiveMainSha],
      ["--receipt", parsed.receiptPath],
    ].filter(([, value]) => !value).map(([flag]) => flag);
    if (missing.length) return { ok: false, reason: `--apply requires ${missing.join(", ")}` };
  } else {
    if (parsed.receiptPath) {
      return { ok: false, reason: "--receipt is only valid with --apply" };
    }
    const previewInputs = [
      ["--manifest", parsed.manifestPath],
      ["--manifest-sha256", parsed.manifestSha256],
      ["--expected-live-main-sha", parsed.expectedLiveMainSha],
    ];
    const supplied = previewInputs.filter(([, value]) => Boolean(value));
    if (supplied.length > 0 && supplied.length !== previewInputs.length) {
      const missing = previewInputs.filter(([, value]) => !value).map(([flag]) => flag);
      return { ok: false, reason: `manifest preview requires ${missing.join(", ")}` };
    }
    parsed.manifestPreview = supplied.length === previewInputs.length;
  }
  return parsed;
}

export function parseLiveRemoteHead(stdout, branch) {
  const expectedRef = `refs/heads/${branch}`;
  const records = String(stdout ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.split(/\s+/));
  if (
    records.length !== 1
    || records[0].length !== 2
    || !OBJECT_ID_PATTERN.test(records[0][0])
    || records[0][1] !== expectedRef
  ) return { available: false, sha: null, source: null };
  return { available: true, sha: records[0][0], source: "git-ls-remote" };
}

function parseStrictGitHubJson(raw) {
  const bytes = raw instanceof Uint8Array
    ? raw
    : Buffer.from(String(raw ?? ""), "utf8");
  let work = bytes.byteLength;
  for (const byte of bytes) {
    if (byte === 0x5c || byte === 0x7b || byte === 0x7d || byte === 0x5b || byte === 0x5d) work += 4;
    if (work > GITHUB_JSON_WORK_LIMIT) throw new Error("GitHub JSON work budget exceeded");
  }
  return parsePromotionWorkflowJsonBytes(bytes);
}

export function parseGitHubExactRef(stdout, branch) {
  const expectedRef = `refs/heads/${branch}`;
  let record;
  try { record = parseStrictGitHubJson(stdout); }
  catch {
    return { available: false, sha: null, source: null };
  }
  if (
    record === null
    || typeof record !== "object"
    || Array.isArray(record)
    || record.ref !== expectedRef
    || record.object?.type !== "commit"
    || !OBJECT_ID_PATTERN.test(record.object?.sha ?? "")
  ) {
    return { available: false, sha: null, source: null };
  }
  return { available: true, sha: record.object.sha, source: "gh-api-git-ref" };
}

export function isAcceptedLiveMainEvidence(evidence) {
  return Boolean(
    evidence?.available
    && typeof evidence?.sha === "string"
    && OBJECT_ID_PATTERN.test(evidence.sha)
    && LIVE_REMOTE_HEAD_SOURCES.includes(evidence.source),
  );
}

export function isTrustedOpenPrEvidence(evidence) {
  return Boolean(
    evidence?.available === true
    && evidence.complete === true
    && evidence.openByBranch instanceof Map
    && evidence.openByHead instanceof Map,
  );
}

export function parseOpenPrEvidence(raw, { queryLimit = null } = {}) {
  let payload;
  try { payload = parseStrictGitHubJson(raw); }
  catch {
    return {
      available: false,
      complete: false,
      reason: "GitHub PR evidence is malformed",
      openByBranch: new Map(),
      openByHead: new Map(),
    };
  }
  if (!Array.isArray(payload)) return {
    available: false,
    complete: false,
    reason: "GitHub PR evidence is malformed",
    openByBranch: new Map(),
    openByHead: new Map(),
  };
  const paginated = payload.length > 0 && payload.every((page) => Array.isArray(page));
  if (payload.some((page) => Array.isArray(page)) && !paginated) return {
    available: false,
    complete: false,
    reason: "GitHub PR evidence is malformed",
    openByBranch: new Map(),
    openByHead: new Map(),
  };
  const records = (paginated ? payload.flat() : payload).map((record) => ({
    number: record?.number,
    headRefName: record?.headRefName ?? record?.head?.ref,
    headRefOid: record?.headRefOid ?? record?.head?.sha,
  }));
  if (records.some((record) => (
    !Number.isInteger(record.number)
    || record.number < 1
    || typeof record.headRefName !== "string"
    || !record.headRefName
    || !OBJECT_ID_PATTERN.test(record.headRefOid ?? "")
  ))) return {
    available: false,
    complete: false,
    reason: "GitHub PR evidence is malformed",
    openByBranch: new Map(),
    openByHead: new Map(),
  };
  if (Number.isInteger(queryLimit) && queryLimit > 0 && records.length >= queryLimit) {
    return {
      available: false,
      complete: false,
      reason: `GitHub PR evidence reached query cap ${queryLimit}`,
      openByBranch: new Map(),
      openByHead: new Map(),
    };
  }
  return {
    available: true,
    complete: true,
    reason: null,
    openByBranch: new Map(records.map((record) => [record.headRefName, record.number])),
    openByHead: new Map(records.map((record) => [record.headRefOid, record.number])),
  };
}

export function parseActiveProcessEvidence({ status, stdout, stderr, error }) {
  const output = String(stdout ?? "").trim();
  const diagnostic = String(stderr ?? "").trim();
  if (error || diagnostic) return { available: false, active: null };
  if (status === 0 && output) return { available: true, active: true };
  if (status === 1 && !output) return { available: true, active: false };
  return { available: false, active: null };
}

/** `lstat`-based tri-state evidence: dangling symlinks are present entries. */
export function readPathAbsenceEvidence(path, { lstat = lstatSync } = {}) {
  try {
    lstat(path);
    return { available: true, absent: false };
  } catch (error) {
    if (error?.code === "ENOENT" || error?.code === "ENOTDIR") {
      return { available: true, absent: true };
    }
    return { available: false, absent: null };
  }
}

/** Capture a bounded, no-follow identity for the exact target directory. */
export function readTargetBoundaryEvidence(path, { lstat = lstatSync, realpath = realpathSync } = {}) {
  try {
    if (realpath(path) !== resolve(path)) {
      return { available: false, isDirectory: false, identity: null };
    }
    const metadata = lstat(path);
    if (
      typeof metadata?.isSymbolicLink !== "function"
      || metadata.isSymbolicLink()
      || typeof metadata.isDirectory !== "function"
      || !metadata.isDirectory()
    ) return { available: false, isDirectory: false, identity: null };
    return { available: true, isDirectory: true, identity: nodeIdentity(metadata) };
  } catch {
    return { available: false, isDirectory: false, identity: null };
  }
}

/**
 * Verify an external manifest/receipt path without following any parent
 * symlink. Every parent must be a readable directory; leaf semantics are
 * intentionally different for the immutable manifest and new receipt.
 */
export function readExternalPathEvidence(
  path,
  { kind = "manifest", lstat = lstatSync, access = accessSync } = {},
) {
  if (
    (kind !== "manifest" && kind !== "receipt")
    || typeof path !== "string"
    || !isAbsolute(path)
    || path.includes("\0")
  ) return { available: false, absent: null, reason: "external path boundary is invalid" };

  const absolutePath = resolve(path);
  const segments = absolutePath.slice(absolutePath.startsWith(sep) ? 1 : 0).split(sep).filter(Boolean);
  const parents = [sep];
  let current = sep;
  for (const segment of segments.slice(0, -1)) {
    current = join(current, segment);
    parents.push(current);
  }

  let parentIdentity;
  for (const parent of parents) {
    let metadata;
    try { metadata = lstat(parent); }
    catch { return { available: false, absent: null, reason: "external path boundary unavailable" }; }
    if (typeof metadata?.isSymbolicLink !== "function" || metadata.isSymbolicLink()) {
      return { available: false, absent: null, reason: "external path boundary contains a symlink" };
    }
    if (typeof metadata.isDirectory !== "function" || !metadata.isDirectory()) {
      return { available: false, absent: null, reason: "external path boundary is not a directory" };
    }
    try { access(parent, fsConstants.R_OK | fsConstants.X_OK); }
    catch { return { available: false, absent: null, reason: "external path boundary unavailable" }; }
    if (parent === parents.at(-1)) {
      parentIdentity = nodeIdentity(metadata);
    }
  }

  let leaf;
  try { leaf = lstat(absolutePath); }
  catch (error) {
    if (kind === "receipt" && error?.code === "ENOENT") {
      return { available: true, absent: true, reason: null, parentIdentity };
    }
    return { available: false, absent: null, reason: "external path leaf unavailable" };
  }
  if (kind === "receipt") return { available: true, absent: false, reason: null, parentIdentity };
  if (
    typeof leaf?.isSymbolicLink !== "function"
    || leaf.isSymbolicLink()
    || typeof leaf.isFile !== "function"
    || !leaf.isFile()
  ) return { available: false, absent: null, reason: "manifest is not a regular file" };
  return { available: true, absent: false, reason: null, identity: nodeIdentity(leaf) };
}

function nodeIdentity(metadata) {
  return { dev: String(metadata.dev), ino: String(metadata.ino) };
}

function sameNodeIdentity(left, right) {
  return left?.dev === right?.dev && left?.ino === right?.ino;
}

function sameFileSnapshot(left, right) {
  return sameNodeIdentity(nodeIdentity(left), nodeIdentity(right))
    && left?.size === right?.size
    && left?.mtimeMs === right?.mtimeMs
    && left?.ctimeMs === right?.ctimeMs;
}

function readBoundedDescriptor(fd, maxBytes) {
  const chunks = [];
  const chunkSize = 64 * 1024;
  let total = 0;
  while (total <= maxBytes) {
    const remaining = maxBytes + 1 - total;
    const chunk = Buffer.allocUnsafe(Math.min(chunkSize, remaining));
    const bytesRead = readSync(fd, chunk, 0, chunk.byteLength, null);
    if (bytesRead === 0) break;
    chunks.push(bytesRead === chunk.byteLength ? chunk : chunk.subarray(0, bytesRead));
    total += bytesRead;
    if (total > maxBytes) throw new Error("descriptor exceeds frozen safety size limit");
  }
  return Buffer.concat(chunks, total);
}

function readManifestByBoundDescriptor(path, { afterBoundary, afterOpen } = {}) {
  const admission = readExternalPathEvidence(path, { kind: "manifest" });
  if (!admission.available || admission.absent !== false) throw new Error(admission.reason);
  afterBoundary?.();
  let fd;
  try {
    fd = openSync(path, fsConstants.O_RDONLY | fsConstants.O_NONBLOCK | fsConstants.O_NOFOLLOW);
    const metadata = fstatSync(fd);
    if (typeof metadata.isFile !== "function" || !metadata.isFile()) {
      throw new Error("manifest is not a regular file");
    }
    const beforeRead = nodeIdentity(metadata);
    if (!sameNodeIdentity(beforeRead, admission.identity)) {
      throw new Error("manifest identity changed after boundary admission");
    }
    if (metadata.size > MAX_MANIFEST_BYTES) {
      throw new Error("manifest exceeds frozen safety size limit");
    }
    afterOpen?.(path);
    const bytes = readBoundedDescriptor(fd, MAX_MANIFEST_BYTES);
    if (bytes.byteLength > MAX_MANIFEST_BYTES) {
      throw new Error("manifest exceeds frozen safety size limit");
    }
    const afterMetadata = fstatSync(fd);
    const afterRead = nodeIdentity(afterMetadata);
    if (
      typeof afterMetadata.isFile !== "function"
      || !afterMetadata.isFile()
      || afterMetadata.size > MAX_MANIFEST_BYTES
      || !sameNodeIdentity(afterRead, admission.identity)
      || !sameFileSnapshot(metadata, afterMetadata)
    ) {
      throw new Error("manifest identity changed during read");
    }
    return bytes;
  } finally {
    if (fd !== undefined) closeSync(fd);
  }
}

function parseStrictManifestBytes(bytes, { revalidation = false } = {}) {
  try {
    return parsePromotionWorkflowJsonBytes(bytes);
  } catch {
    throw new Error(revalidation
      ? "immutable manifest revalidation failed"
      : "immutable manifest is not valid JSON");
  }
}

const RECEIPT_RESERVATION_CHILD_SOURCE = `
import { constants, fstatSync, openSync, statSync, closeSync } from "node:fs";
try {
  const expectedDev = process.argv[1];
  const expectedIno = process.argv[2];
  const leaf = process.argv[3];
  const parent = statSync(".");
  if (String(parent.dev) !== expectedDev || String(parent.ino) !== expectedIno) throw new Error();
  const fd = openSync(leaf, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o600);
  const created = fstatSync(fd);
  closeSync(fd);
  if (String(created.dev) === "undefined" || String(created.ino) === "undefined") throw new Error();
  process.stdout.write(JSON.stringify({ dev: String(created.dev), ino: String(created.ino) }));
} catch {
  process.exitCode = 1;
}
`;
const RECEIPT_STATES = new Map();
export const MAX_RECEIPT_BYTES = 16 * 1024 * 1024;

function readReceiptPrefix(handle, size) {
  if (!Number.isInteger(size) || size < 0 || size > MAX_RECEIPT_BYTES) throw new Error("receipt size limit exceeded");
  const bytes = Buffer.alloc(size);
  let offset = 0;
  while (offset < size) {
    const count = readSync(handle, bytes, offset, size - offset, offset);
    if (!Number.isInteger(count) || count < 1) throw new Error("receipt prefix unavailable");
    offset += count;
  }
  return bytes;
}

export function createReceiptDurabilityState(path, handle, parentFd) {
  const file = fstatSync(handle);
  const parent = fstatSync(parentFd);
  const visible = lstatSync(path);
  const parentPath = dirname(path);
  const visibleParent = lstatSync(parentPath);
  if (
    !file.isFile() || !visible.isFile() || visible.isSymbolicLink()
    || !parent.isDirectory() || !visibleParent.isDirectory() || visibleParent.isSymbolicLink()
    || file.size !== 0 || visible.size !== 0
    || (file.mode & 0o7777) !== 0o600 || (visible.mode & 0o7777) !== 0o600
    || !sameNodeIdentity(nodeIdentity(file), nodeIdentity(visible))
    || !sameNodeIdentity(nodeIdentity(parent), nodeIdentity(visibleParent))
  ) throw new Error("receipt binding unavailable");
  return {
    path,
    parentPath,
    parentFd,
    parentIdentity: nodeIdentity(parent),
    fileIdentity: nodeIdentity(file),
    mode: file.mode & 0o7777,
    lastDurableOffset: 0,
    durableDigest: sha256Text(Buffer.alloc(0)),
    recoveryRequired: false,
    appendAllowed: true,
  };
}

function validateReceiptState(handle, state, {
  fstat = fstatSync,
  lstat = lstatSync,
  expectedOffset = state?.lastDurableOffset,
  expectedDigest = state?.durableDigest,
  checkPrefix = true,
} = {}) {
  if (!state?.appendAllowed) throw new Error("receipt durability unavailable");
  const parent = fstat(state.parentFd);
  const file = fstat(handle);
  const path = lstat(state.path);
  const visibleParent = lstat(state.parentPath);
  if (
    !parent.isDirectory()
    || !visibleParent.isDirectory()
    || visibleParent.isSymbolicLink()
    || !file.isFile()
    || !path.isFile()
    || path.isSymbolicLink()
    || !sameNodeIdentity(nodeIdentity(parent), state.parentIdentity)
    || !sameNodeIdentity(nodeIdentity(visibleParent), state.parentIdentity)
    || !sameNodeIdentity(nodeIdentity(file), state.fileIdentity)
    || !sameNodeIdentity(nodeIdentity(path), state.fileIdentity)
    || (file.mode & 0o7777) !== state.mode
    || (path.mode & 0o7777) !== state.mode
    || (checkPrefix && file.size !== expectedOffset)
    || (checkPrefix && path.size !== expectedOffset)
    || (checkPrefix && expectedOffset > MAX_RECEIPT_BYTES)
  ) throw new Error("receipt binding changed");
  if (!checkPrefix) return Buffer.alloc(0);
  const prefix = readReceiptPrefix(handle, expectedOffset);
  if (sha256Text(prefix) !== expectedDigest) throw new Error("receipt durable prefix changed");
  return prefix;
}

export function validateReceiptDurability(handle, { receiptStates = RECEIPT_STATES } = {}) {
  const state = receiptStates.get(handle);
  if (!state || typeof state !== "object") throw new Error("receipt binding unavailable");
  return validateReceiptState(handle, state);
}

export function writeReceiptDurably(
  handle,
  text,
  {
    parentFds = RECEIPT_STATES,
    receiptStates = parentFds,
    write = writeSync,
    fsync = fsyncSync,
    truncate = ftruncateSync,
    afterWrite,
  } = {},
) {
  const state = receiptStates.get(handle);
  if (typeof state === "number") {
    write(handle, text, { encoding: "utf8" });
    fsync(handle);
    fsync(state);
    return;
  }
  if (!state) throw new Error("receipt parent is not owned");
  try {
    let durablePrefix;
    if (state.recoveryRequired) {
      try {
        validateReceiptState(handle, state, { checkPrefix: false });
        truncate(handle, state.lastDurableOffset);
        fsync(handle);
        fsync(state.parentFd);
        durablePrefix = validateReceiptState(handle, state);
        state.recoveryRequired = false;
      } catch {
        state.appendAllowed = false;
        throw new Error("receipt recovery failed");
      }
    } else durablePrefix = validateReceiptState(handle, state);
    const bytes = Buffer.from(text, "utf8");
    const nextOffset = state.lastDurableOffset + bytes.byteLength;
    if (nextOffset > MAX_RECEIPT_BYTES) throw new Error("receipt size limit exceeded");
    const nextDigest = sha256Text(Buffer.concat([durablePrefix, bytes]));
    let written = 0;
    while (written < bytes.byteLength) {
      const count = write(handle, bytes, written, bytes.byteLength - written, state.lastDurableOffset + written);
      if (!Number.isInteger(count) || count < 1) throw new Error("short write");
      written += count;
    }
    afterWrite?.();
    fsync(handle);
    fsync(state.parentFd);
    validateReceiptState(handle, state, { expectedOffset: nextOffset, expectedDigest: nextDigest });
    state.lastDurableOffset = nextOffset;
    state.durableDigest = nextDigest;
  } catch {
    state.recoveryRequired = true;
    try {
      validateReceiptState(handle, state, { checkPrefix: false });
    } catch {
      state.appendAllowed = false;
    }
    throw new Error("receipt durability failed");
  }
}

export function closeReceiptDurably(
  handle,
  {
    parentFds = RECEIPT_STATES,
    close = closeSync,
    fsync = fsyncSync,
    closeParent = closeSync,
  } = {},
) {
  const owned = parentFds.get(handle);
  parentFds.delete(handle);
  if (owned === undefined) throw new Error("receipt parent is not owned");
  const parentFd = typeof owned === "number" ? owned : owned.parentFd;
  let firstError = null;
  try { close(handle); }
  catch (error) { firstError = error; }
  try { fsync(parentFd); }
  catch (error) { firstError ??= error; }
  try { closeParent(parentFd); }
  catch (error) { firstError ??= error; }
  if (firstError) throw new Error("receipt close failed");
}

function reserveReceiptByBoundParent(path, { afterBoundary, afterLeafOpen, spawn = spawnSync, close = closeSync } = {}) {
  const admission = readExternalPathEvidence(path, { kind: "receipt" });
  if (!admission.available || admission.absent !== true) throw new Error(admission.reason);
  afterBoundary?.();
  let parentFd;
  const closeAdmittedParent = () => {
    if (parentFd === undefined) return;
    const admittedParentFd = parentFd;
    parentFd = undefined;
    try { close(admittedParentFd); } catch { /* fail closed; descriptor cleanup was attempted */ }
  };
  try {
    parentFd = openSync(dirname(path), fsConstants.O_RDONLY | fsConstants.O_DIRECTORY | fsConstants.O_NOFOLLOW);
    if (!sameNodeIdentity(nodeIdentity(fstatSync(parentFd)), admission.parentIdentity)) {
      throw new Error("receipt parent identity changed after admission");
    }
  } catch (error) {
    closeAdmittedParent();
    throw error;
  }
  let child;
  try {
    child = spawn(
      process.execPath,
      ["--input-type=module", "-e", RECEIPT_RESERVATION_CHILD_SOURCE, admission.parentIdentity.dev, admission.parentIdentity.ino, basename(path)],
      {
        cwd: dirname(path),
        env: { PATH: process.env.PATH ?? "" },
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
        timeout: COMMAND_TIMEOUT_MS,
        maxBuffer: COMMAND_MAX_BUFFER_BYTES,
        killSignal: COMMAND_KILL_SIGNAL,
      },
    );
  } catch {
    closeAdmittedParent();
    throw new Error("receipt reservation child failed closed");
  }
  if (child.error || child.status !== 0 || String(child.stderr ?? "") !== "") {
    closeAdmittedParent();
    throw new Error("receipt reservation child failed closed");
  }
  let created;
  try { created = JSON.parse(String(child.stdout ?? "")); }
  catch { closeAdmittedParent(); throw new Error("receipt reservation child output was malformed"); }
  if (
    !created
    || typeof created.dev !== "string"
    || typeof created.ino !== "string"
    || !/^\d+$/.test(created.dev)
    || !/^\d+$/.test(created.ino)
  ) { closeAdmittedParent(); throw new Error("receipt reservation child output was invalid"); }

  let fd;
  try {
    fd = openSync(path, fsConstants.O_RDWR | fsConstants.O_NOFOLLOW);
    const opened = nodeIdentity(fstatSync(fd));
    if (!sameNodeIdentity(opened, created)) throw new Error("receipt identity changed after reservation");
    afterLeafOpen?.();
    const state = createReceiptDurabilityState(path, fd, parentFd);
    RECEIPT_STATES.set(fd, state);
    parentFd = undefined;
    return fd;
  } catch (error) {
    if (fd !== undefined) {
      try { close(fd); } catch { /* exact leaf descriptor close attempted once */ }
      fd = undefined;
    }
    closeAdmittedParent();
    throw error;
  }
}

const ACTIVE_FLEET_LEASES = new WeakSet();

export function createFleetLeaseIdentity({ repositoryTuple, manifestSha256, targets }) {
  return sha256Text(JSON.stringify({
    repository: {
      primaryRoot: repositoryTuple?.primaryRoot ?? null,
      commonGitDir: repositoryTuple?.commonGitDir ?? null,
      gitDir: repositoryTuple?.gitDir ?? null,
      remoteIdentity: repositoryTuple?.remoteIdentity ?? null,
      remoteUrl: repositoryTuple?.remoteUrl ?? null,
    },
    manifestSha256,
    targets,
  }));
}

function fleetMutationLeasePath(repositoryTuple) {
  if (!isAbsolute(repositoryTuple?.commonGitDir ?? "") || repositoryTuple.commonGitDir.includes("\0")) {
    throw new Error("fleet mutation lease unavailable");
  }
  return join(repositoryTuple.commonGitDir, "sweep-merged-worktrees.mutation-lease.json");
}

function readBoundedDescriptorFromStart(fd, maxBytes) {
  const chunks = [];
  let total = 0;
  while (total <= maxBytes) {
    const chunk = Buffer.allocUnsafe(Math.min(4096, maxBytes + 1 - total));
    const bytesRead = readSync(fd, chunk, 0, chunk.byteLength, total);
    if (bytesRead === 0) break;
    chunks.push(chunk.subarray(0, bytesRead));
    total += bytesRead;
    if (total > maxBytes) throw new Error("fleet lease exceeds safety limit");
  }
  return Buffer.concat(chunks, total);
}

export function createFleetLeaseAcquisitionError(phase, leaseMayRemain) {
  const error = new Error("fleet mutation lease unavailable");
  error.code = "SWEEP_FLEET_LEASE_ACQUISITION";
  error.phase = phase;
  error.leaseMayRemain = leaseMayRemain;
  return error;
}

function normalizeFleetLeaseAcquisitionFailure(error) {
  if (
    error?.code === "SWEEP_FLEET_LEASE_ACQUISITION"
    && ((error.phase === "not-acquired" && error.leaseMayRemain === false)
      || (error.phase === "acquire-uncertain" && error.leaseMayRemain === true))
  ) {
    return { released: false, phase: error.phase, leaseMayRemain: error.leaseMayRemain };
  }
  return { released: false, phase: "acquire-uncertain", leaseMayRemain: true };
}

export function acquireFleetMutationLease(path, identity, { holderToken = randomUUID(), afterParentOpen } = {}) {
  if (
    !isAbsolute(path)
    || !SHA256_PATTERN.test(identity ?? "")
    || typeof holderToken !== "string"
    || !holderToken
    || holderToken.includes("\0")
  ) throw createFleetLeaseAcquisitionError("not-acquired", false);
  let parentFd;
  let fd;
  try {
    const parentPath = dirname(path);
    if (realpathSync(parentPath) !== resolve(parentPath)) throw new Error();
    const parentMetadata = lstatSync(parentPath);
    if (parentMetadata.isSymbolicLink() || !parentMetadata.isDirectory()) throw new Error();
    parentFd = openSync(parentPath, fsConstants.O_RDONLY | fsConstants.O_DIRECTORY | fsConstants.O_NOFOLLOW);
    const parentIdentity = nodeIdentity(fstatSync(parentFd));
    if (!sameNodeIdentity(parentIdentity, nodeIdentity(parentMetadata))) throw new Error();
    afterParentOpen?.();
    const parentAfterOpen = lstatSync(parentPath);
    if (parentAfterOpen.isSymbolicLink() || !parentAfterOpen.isDirectory() || !sameNodeIdentity(parentIdentity, nodeIdentity(parentAfterOpen))) throw new Error();
    fd = openSync(
      path,
      fsConstants.O_RDWR | fsConstants.O_CREAT | fsConstants.O_EXCL | fsConstants.O_NOFOLLOW,
      0o600,
    );
    const body = Buffer.from(`${JSON.stringify({
      schemaVersion: "sweep-merged-worktrees.fleet-mutation-lease.v1",
      identity,
      holderToken,
    })}\n`, "utf8");
    if (body.byteLength > MAX_FLEET_LEASE_BYTES) throw new Error();
    writeFileSync(fd, body);
    fsyncSync(fd);
    fsyncSync(parentFd);
    const metadata = fstatSync(fd);
    const visible = lstatSync(path);
    const currentParent = lstatSync(parentPath);
    if (
      !metadata.isFile() || !visible.isFile() || visible.isSymbolicLink()
      || !currentParent.isDirectory() || currentParent.isSymbolicLink()
      || !sameNodeIdentity(nodeIdentity(metadata), nodeIdentity(visible))
      || !sameNodeIdentity(parentIdentity, nodeIdentity(currentParent))
      || (metadata.mode & 0o7777) !== 0o600 || (visible.mode & 0o7777) !== 0o600
      || metadata.size !== body.byteLength || visible.size !== body.byteLength
      || metadata.nlink !== 1 || visible.nlink !== 1
      || !readBoundedDescriptorFromStart(fd, MAX_FLEET_LEASE_BYTES).equals(body)
    ) throw new Error();
    const lease = {
      path,
      parentPath,
      identity,
      holderToken,
      bytes: body,
      fd,
      parentFd,
      fileIdentity: nodeIdentity(metadata),
      parentIdentity,
      mode: 0o600,
      size: body.byteLength,
      digest: sha256Text(body),
    };
    ACTIVE_FLEET_LEASES.add(lease);
    return lease;
  } catch (error) {
    const leaseMayRemain = fd !== undefined || error?.code === "EEXIST";
    if (fd !== undefined) try { closeSync(fd); } catch { /* best-effort descriptor close */ }
    if (parentFd !== undefined) try { closeSync(parentFd); } catch { /* best-effort descriptor close */ }
    throw createFleetLeaseAcquisitionError(
      leaseMayRemain ? "acquire-uncertain" : "not-acquired",
      leaseMayRemain,
    );
  }
}

export function revalidateFleetMutationLease(lease, identity) {
  try {
    if (!ACTIVE_FLEET_LEASES.has(lease) || lease.identity !== identity) return false;
    const parentMetadata = fstatSync(lease.parentFd);
    const descriptorMetadata = fstatSync(lease.fd);
    const pathMetadata = lstatSync(lease.path);
    const visibleParent = lstatSync(lease.parentPath);
    if (
      !parentMetadata.isDirectory()
      || !visibleParent.isDirectory()
      || visibleParent.isSymbolicLink()
      || !descriptorMetadata.isFile()
      || pathMetadata.isSymbolicLink()
      || !pathMetadata.isFile()
      || !sameNodeIdentity(nodeIdentity(parentMetadata), lease.parentIdentity)
      || !sameNodeIdentity(nodeIdentity(visibleParent), lease.parentIdentity)
      || !sameNodeIdentity(nodeIdentity(descriptorMetadata), lease.fileIdentity)
      || !sameNodeIdentity(nodeIdentity(pathMetadata), lease.fileIdentity)
      || (descriptorMetadata.mode & 0o7777) !== 0o600
      || (pathMetadata.mode & 0o7777) !== 0o600
      || descriptorMetadata.size !== lease.size
      || pathMetadata.size !== lease.size
      || descriptorMetadata.nlink !== 1
      || pathMetadata.nlink !== 1
    ) return false;
    const bytes = readBoundedDescriptorFromStart(lease.fd, MAX_FLEET_LEASE_BYTES);
    return bytes.equals(lease.bytes) && sha256Text(bytes) === lease.digest;
  } catch {
    return false;
  }
}

export function releaseFleetMutationLease(
  lease,
  identity,
  { unlink = unlinkSync, fsync = fsyncSync, close = closeSync, beforeFinalUnlink } = {},
) {
  const owned = revalidateFleetMutationLease(lease, identity);
  let phase = owned ? "released" : "identity-revalidation";
  if (owned) {
    try {
      beforeFinalUnlink?.();
      if (!revalidateFleetMutationLease(lease, identity)) throw new Error("final validation");
    } catch {
      phase = "bounded-pre-unlink-validation";
    }
    if (phase === "released") {
      try { unlink(lease.path); }
      catch { phase = "unlink"; }
    }
    if (phase === "released") {
      try { fsync(lease.parentFd); }
      catch { phase = "parent-fsync"; }
    }
  }
  ACTIVE_FLEET_LEASES.delete(lease);
  try { close(lease.fd); }
  catch { if (phase === "released") phase = "lease-fd-close"; }
  try { close(lease.parentFd); }
  catch { if (phase === "released") phase = "parent-fd-close"; }
  return { released: phase === "released", phase };
}

const LEASE_RELEASE_FAILURE_PHASES = new Set([
  "identity-revalidation", "bounded-pre-unlink-validation", "unlink", "parent-fsync",
  "lease-fd-close", "parent-fd-close", "not-acquired",
]);

function normalizeLeaseReleaseResult(value) {
  if (
    value?.released === true
    && value.phase === "released"
    && Object.keys(value).length === 2
  ) return { released: true, phase: "released" };
  if (
    value?.released === false
    && LEASE_RELEASE_FAILURE_PHASES.has(value.phase)
    && Object.keys(value).length === 2
  ) return { released: false, phase: value.phase };
  return { released: false, phase: "invalid-provider-result" };
}

/** Compare a fresh candidate snapshot against its immutable manifest lock. */
export function revalidateCandidate(lock, current, ctx) {
  if (
    current.path !== lock.path
    || (current.branch ?? null) !== (lock.branch ?? null)
    || current.head !== lock.head
    || fingerprintTopology(current) !== lock.topologyFingerprint
  ) return { ok: false, reason: "candidate lock drift (path, branch, HEAD, or topology)" };
  if (ctx.liveMainEvidence?.sha !== ctx.expectedLiveMainSha) {
    return { ok: false, reason: "live-main SHA drift immediately before action" };
  }
  const decision = decide(current, ctx);
  if (decision.action !== "retire") return { ok: false, reason: decision.reason };
  return {
    ok: true,
    reason: decision.reason,
    targetIdentity: current.targetBoundaryEvidence?.identity ?? null,
  };
}

export function buildWorktreeRemoveCommand(path) {
  return { file: TRUSTED_GIT_EXECUTABLE, args: ["worktree", "remove", "--", path] };
}

/** The sweep has exactly one permitted mutation: local, non-force removal. */
export function isAllowedSweepMutation(file, args) {
  return file === TRUSTED_GIT_EXECUTABLE
    && Array.isArray(args)
    && args.length === 4
    && args[0] === "worktree"
    && args[1] === "remove"
    && args[2] === "--"
    && typeof args[3] === "string"
    && args[3].startsWith("/")
    && !args.slice(0, 3).some((arg) => /^--?force(?:=|$)/iu.test(arg));
}

const SECRET_PATH_SEGMENT = /(?:^\.env(?:\.|$)|(?:^|[\s._-])(?:all[\s._-]+api[\s._-]+keys?|api[\s._-]*keys?|secrets?|credentials?|passwords?|tokens?)(?:[\s._-]|$))/i;

export function redactSecretLikePath(path) {
  if (typeof path !== "string") return path;
  return path
    .split("/")
    .map((segment) => SECRET_PATH_SEGMENT.test(segment) ? "[REDACTED_SECRET_PATH]" : segment)
    .join("/");
}

export function createPostflightReceipt({
  manifestSha256,
  expectedLiveMainSha,
  observedLiveMainSha,
  startedAt,
  completedAt,
  preTopologyFingerprint,
  postTopologyFingerprint,
  finalTopologyEvidence,
  batchOutcome: suppliedBatchOutcome = null,
  results,
}) {
  const safeResults = results.map((result) => ({
    path: redactSecretLikePath(result.path),
    branch: redactSecretLikePath(result.branch),
    ...(result.head ? { head: result.head } : {}),
    ...(result.topologyFingerprint ? { topologyFingerprint: result.topologyFingerprint } : {}),
    ...(result.owner ? { owner: redactSecretLikePath(result.owner) } : {}),
    ...(result.task ? { task: redactSecretLikePath(result.task) } : {}),
    ...(result.creationDate ? { creationDate: result.creationDate } : {}),
    ...(result.expectedCloseoutDate ? { expectedCloseoutDate: result.expectedCloseoutDate } : {}),
    ...(result.allowedAction ? { allowedAction: result.allowedAction } : {}),
    status: result.status,
    reason: receiptReasonForJournal(result.reason),
    ...(result.providerFailure
      ? { providerFailure: { ...result.providerFailure } }
      : {}),
    ...(result.postRemovalEvidence
      ? { postRemovalEvidence: { ...result.postRemovalEvidence } }
      : {}),
  }));
  const batchOutcome = suppliedBatchOutcome ?? {
    status: safeResults.every((result) => result.status === "removed") ? "success" : "blocked",
    reason: safeResults.every((result) => result.status === "removed")
      ? null
      : "one or more batch targets were not removed",
  };
  return {
    schemaVersion: "sweep-merged-worktrees.postflight-receipt.v1",
    manifestSha256,
    expectedLiveMainSha,
    observedLiveMainSha,
    startedAt,
    completedAt,
    preTopologyFingerprint,
    postTopologyFingerprint,
    finalTopologyEvidence: finalTopologyEvidence ?? {
      available: typeof postTopologyFingerprint === "string",
      fingerprint: postTopologyFingerprint ?? null,
    },
    claimCeiling: {
      absoluteRaceFree: false,
      writerFree: false,
      postflight: "bounded path, process, live-main, and topology observations only",
    },
    invariants: { forceUsed: false, remoteDeletionAttempted: false },
    batchOutcome: {
      status: batchOutcome.status,
      reason: receiptReasonForJournal(batchOutcome.reason),
    },
    summary: {
      attempted: safeResults.length,
      removed: safeResults.filter((result) => result.status === "removed").length,
      skipped: safeResults.filter((result) => result.status === "skipped").length,
      failed: safeResults.filter((result) => result.status === "failed").length,
    },
    results: safeResults,
  };
}

const RECEIPT_BUDGET_TIMESTAMP = "2000-01-01T00:00:00.000Z";
const RECEIPT_BUDGET_FINGERPRINT = "f".repeat(64);
export const MAX_RECEIPT_REASON_JSON_BYTES = 512;
export const MAX_RECEIPT_BUDGET_ENTRY_BYTES = MAX_MANIFEST_BYTES + (1024 * 1024);
export const REMOVAL_PROVIDER_RESULT_FAILURE_CODE = "REMOVAL_PROVIDER_RESULT_REJECTED";
const RECEIPT_BUDGET_REASON = "R".repeat(MAX_RECEIPT_REASON_JSON_BYTES);
const NON_CANONICAL_REMOVAL_PROVIDER_RESULT = Buffer.from(
  JSON.stringify({ canonicalJsonUnavailable: true }),
  "utf8",
);

function canonicalJsonStringPayloadBytes(value) {
  const encoded = JSON.stringify(value);
  if (typeof encoded !== "string" || encoded.length < 2) {
    throw new Error("receipt reason is not a canonical JSON string");
  }
  return Buffer.byteLength(encoded, "utf8") - 2;
}

function assertReceiptReasonContract(reason) {
  if (reason === null || reason === undefined) return;
  if (
    typeof reason !== "string"
    || canonicalJsonStringPayloadBytes(reason) > MAX_RECEIPT_REASON_JSON_BYTES
  ) throw new Error("receipt reason exceeds canonical JSON budget");
}

function receiptReasonForJournal(reason) {
  const redacted = redactSecretLikePath(reason);
  assertReceiptReasonContract(redacted);
  return redacted;
}

function rejectedRemovalProviderResult(value) {
  let canonicalBytes;
  try {
    const encoded = JSON.stringify(value);
    canonicalBytes = typeof encoded === "string"
      ? Buffer.from(encoded, "utf8")
      : NON_CANONICAL_REMOVAL_PROVIDER_RESULT;
  } catch {
    canonicalBytes = NON_CANONICAL_REMOVAL_PROVIDER_RESULT;
  }
  return {
    ok: false,
    reason: "git worktree remove failed",
    providerFailure: {
      code: REMOVAL_PROVIDER_RESULT_FAILURE_CODE,
      canonicalByteLength: canonicalBytes.byteLength,
      canonicalSha256: sha256Text(canonicalBytes),
    },
  };
}

/** Admit only the two closed JSON-like results understood by the mutation boundary. */
export function normalizeRemovalProviderResult(value) {
  let keys;
  let prototype;
  let descriptors;
  try {
    keys = Reflect.ownKeys(value);
    prototype = Object.getPrototypeOf(value);
    descriptors = Object.getOwnPropertyDescriptors(value);
  } catch {
    return rejectedRemovalProviderResult(value);
  }
  const plainObject = value !== null
    && typeof value === "object"
    && (prototype === Object.prototype || prototype === null)
    && keys.every((key) => (
      typeof key === "string"
      && descriptors[key]
      && Object.hasOwn(descriptors[key], "value")
    ));
  if (!plainObject) return rejectedRemovalProviderResult(value);
  if (keys.length === 1 && keys[0] === "ok" && descriptors.ok.value === true) {
    return { ok: true };
  }
  if (
    keys.length === 2
    && keys.includes("ok")
    && keys.includes("reason")
    && descriptors.ok.value === false
    && typeof descriptors.reason.value === "string"
  ) {
    try {
      return { ok: false, reason: receiptReasonForJournal(descriptors.reason.value) };
    } catch {
      return rejectedRemovalProviderResult(value);
    }
  }
  return rejectedRemovalProviderResult(value);
}

function assertRemovalProviderFailureContract(value) {
  if (
    !value
    || typeof value !== "object"
    || Object.getPrototypeOf(value) !== Object.prototype
    || Reflect.ownKeys(value).length !== 3
    || value.code !== REMOVAL_PROVIDER_RESULT_FAILURE_CODE
    || !Number.isSafeInteger(value.canonicalByteLength)
    || value.canonicalByteLength < 0
    || !SHA256_PATTERN.test(value.canonicalSha256 ?? "")
  ) throw new Error("removal provider failure evidence is invalid");
}

export function assertReceiptJournalEntryContract(entry) {
  const ancestors = new Set();
  const visit = (value) => {
    if (value === null || typeof value !== "object") return;
    if (ancestors.has(value)) throw new Error("receipt journal entry is cyclic");
    ancestors.add(value);
    for (const [key, child] of Object.entries(value)) {
      if (key === "reason") assertReceiptReasonContract(child);
      if (key === "providerFailure") assertRemovalProviderFailureContract(child);
      visit(child);
    }
    ancestors.delete(value);
  };
  visit(entry);
  return true;
}

function canonicalReceiptEntryBytes(entry) {
  assertReceiptJournalEntryContract(entry);
  const encoded = `${JSON.stringify(entry)}\n`;
  const bytes = Buffer.byteLength(encoded, "utf8");
  if (bytes > MAX_RECEIPT_BUDGET_ENTRY_BYTES) {
    throw new Error("receipt budget entry exceeds bounded planning allocation");
  }
  return bytes;
}

/**
 * Compute a conservative whole-journal bound before any apply mutation.
 *
 * The bound serializes the same canonical one-line JSON records as the runtime.
 * Its maximum lifecycle deliberately combines every target checkpoint with a
 * superset terminal: all optional result metadata, bounded internal reasons,
 * postflight fingerprints, and the largest lease-release shape. Failure paths
 * emit fewer checkpoints, so each is also enumerated below as an audit aid.
 */
export function calculateReceiptJournalBudget({
  manifest,
  manifestSha256,
  expectedLiveMainSha,
  repositoryIdentity,
}) {
  if (!manifest || !Array.isArray(manifest.targets)) {
    throw new Error("receipt journal budget requires manifest targets");
  }
  if (repositoryIdentity !== APPROVED_REPOSITORY_IDENTITY) {
    throw new Error("receipt journal budget requires the approved repository identity");
  }
  const leaseIdentity = RECEIPT_BUDGET_FINGERPRINT;
  const commonCheckpoint = {
    manifestSha256,
    expectedLiveMainSha,
    leaseIdentity,
    repositoryIdentity,
  };
  const started = {
    schemaVersion: "sweep-merged-worktrees.mutation-progress.v1",
    phase: "started",
    manifestSha256,
    expectedLiveMainSha,
    startedAt: RECEIPT_BUDGET_TIMESTAMP,
    leaseIdentity,
    repositoryIdentity,
    targets: manifest.targets.map((target) => ({
      path: redactSecretLikePath(target.path),
      branch: redactSecretLikePath(target.branch ?? "(detached)"),
      head: target.head,
      topologyFingerprint: target.topologyFingerprint,
    })),
  };
  const worstPostRemovalEvidence = {
    topologyAvailable: false,
    registrationAbsent: false,
    pathEvidenceAvailable: false,
    pathAbsent: false,
  };
  const worstProviderFailure = {
    code: REMOVAL_PROVIDER_RESULT_FAILURE_CODE,
    canonicalByteLength: Number.MAX_SAFE_INTEGER,
    canonicalSha256: RECEIPT_BUDGET_FINGERPRINT,
  };
  const worstResults = manifest.targets.map((target) => ({
    ...target,
    path: target.path,
    branch: target.branch ?? "(detached)",
    status: "skipped",
    reason: RECEIPT_BUDGET_REASON,
    providerFailure: worstProviderFailure,
    postRemovalEvidence: worstPostRemovalEvidence,
  }));
  const successResults = manifest.targets.map((target) => ({
    ...target,
    path: target.path,
    branch: target.branch ?? "(detached)",
    status: "removed",
    reason: null,
    postRemovalEvidence: {
      topologyAvailable: true,
      registrationAbsent: true,
      pathEvidenceAvailable: true,
      pathAbsent: true,
    },
  }));
  const terminal = (results, batchOutcome, leaseRelease) => ({
    ...createPostflightReceipt({
      manifestSha256,
      expectedLiveMainSha,
      observedLiveMainSha: expectedLiveMainSha,
      startedAt: RECEIPT_BUDGET_TIMESTAMP,
      completedAt: RECEIPT_BUDGET_TIMESTAMP,
      preTopologyFingerprint: manifest.fleetFingerprint,
      postTopologyFingerprint: RECEIPT_BUDGET_FINGERPRINT,
      finalTopologyEvidence: {
        available: true,
        fingerprint: RECEIPT_BUDGET_FINGERPRINT,
      },
      batchOutcome,
      results,
    }),
    phase: "terminal",
    leaseIdentity,
    leaseRelease,
    repositoryIdentity,
  });
  const targetCheckpoints = manifest.targets.map((target, targetIndex) => ({
    started: canonicalReceiptEntryBytes({
      schemaVersion: "sweep-merged-worktrees.mutation-progress.v1",
      phase: "target-started",
      targetIndex,
      target: {
        path: redactSecretLikePath(target.path),
        branch: redactSecretLikePath(target.branch ?? "(detached)"),
        head: target.head,
        topologyFingerprint: target.topologyFingerprint,
      },
      ...commonCheckpoint,
    }),
    completed: canonicalReceiptEntryBytes({
      schemaVersion: "sweep-merged-worktrees.mutation-progress.v1",
      phase: "target-completed",
      targetIndex,
      result: {
        path: redactSecretLikePath(target.path),
        branch: redactSecretLikePath(target.branch ?? "(detached)"),
        status: "skipped",
        reason: RECEIPT_BUDGET_REASON,
        providerFailure: worstProviderFailure,
        postRemovalEvidence: worstPostRemovalEvidence,
      },
      ...commonCheckpoint,
    }),
  }));
  const startedBytes = canonicalReceiptEntryBytes(started);
  const allCheckpointBytes = targetCheckpoints.reduce(
    (total, checkpoint) => total + checkpoint.started + checkpoint.completed,
    0,
  );
  const successTerminalBytes = canonicalReceiptEntryBytes(terminal(
    successResults,
    { status: "success", reason: null },
    { released: true, phase: "released" },
  ));
  const worstTerminalBytes = canonicalReceiptEntryBytes(terminal(
    worstResults,
    { status: "blocked", reason: RECEIPT_BUDGET_REASON },
    {
      released: false,
      phase: "bounded-pre-unlink-validation",
      leaseMayRemain: true,
    },
  ));
  const scenarioBytes = Object.freeze({
    leaseAcquisitionFailure: worstTerminalBytes,
    startedFailure: worstTerminalBytes,
    preflightBlocked: startedBytes + worstTerminalBytes,
    targetFailureAfterStarted: startedBytes + allCheckpointBytes + worstTerminalBytes,
    allTargetsSuccess: startedBytes + allCheckpointBytes + successTerminalBytes,
    allTargetsLeaseReleaseFailure: startedBytes + allCheckpointBytes + worstTerminalBytes,
  });
  const requiredBytes = Math.max(...Object.values(scenarioBytes));
  return Object.freeze({
    ok: requiredBytes <= MAX_RECEIPT_BYTES,
    repositoryIdentity,
    targetCount: manifest.targets.length,
    requiredBytes,
    limitBytes: MAX_RECEIPT_BYTES,
    scenarioBytes,
  });
}

/**
 * Execute an already-authorized batch through injected evidence providers.
 * Every target gets a batch preflight and a second complete revalidation in the
 * same synchronous turn immediately before the only permitted mutation.
 */
export function runAuthorizedApply({
  authorization,
  expectedLiveMainSha,
  repositoryIdentity = authorization?.receiptBudget?.repositoryIdentity,
  primaryRoot,
  upstream,
  defaultBranch,
  minAgeDays,
  startedAt,
  frozenNow = startedAt,
  expectedCommonGitDir = null,
}, deps) {
  const targets = authorization.manifest.targets;
  const receiptBudget = calculateReceiptJournalBudget({
    manifest: authorization.manifest,
    manifestSha256: authorization.manifestSha256,
    expectedLiveMainSha,
    repositoryIdentity,
  });
  let expectedFleet = null;
  let preTopologyFingerprint = null;
  let batchStopReason = receiptBudget.ok ? null : "receipt journal budget exceeds maximum capacity";
  if (parseFrozenRuntimeTimestamp(frozenNow) === null) {
    batchStopReason = "frozen runtime clock unavailable";
  }
  try {
    expectedFleet = deps.readWorktrees();
    preTopologyFingerprint = fingerprintFleet(expectedFleet);
    if (preTopologyFingerprint !== authorization.manifest.fleetFingerprint) {
      batchStopReason = "fleet topology fingerprint drift before batch preflight";
    }
  } catch {
    batchStopReason = "fleet topology evidence unavailable before batch preflight";
  }

  const inspectFresh = (target) => {
    let manifestBytes;
    try { manifestBytes = deps.readManifestBytes(); }
    catch { return { ok: false, reason: "immutable manifest became unreadable" }; }
    try { parseStrictManifestBytes(manifestBytes, { revalidation: true }); }
    catch { return { ok: false, reason: "immutable manifest revalidation failed" }; }
    if (sha256Text(manifestBytes) !== authorization.manifestSha256) {
      return { ok: false, reason: "immutable manifest digest drift" };
    }

    let liveMainEvidence;
    try { liveMainEvidence = deps.readLiveMainEvidence(); }
    catch { liveMainEvidence = { available: false, sha: null, source: null }; }
    if (
      !isAcceptedLiveMainEvidence(liveMainEvidence)
      || liveMainEvidence.sha !== expectedLiveMainSha
    ) return { ok: false, reason: "live-main SHA drift or evidence unavailable" };

    let prEvidence;
    try { prEvidence = deps.readOpenPrEvidence(); }
    catch { prEvidence = { available: false, openByBranch: new Map(), openByHead: new Map() }; }
    if (!prEvidence?.available) return { ok: false, reason: "GitHub PR evidence unavailable" };
    if (prEvidence.complete !== true) {
      return { ok: false, reason: "GitHub PR evidence is not exhaustive" };
    }

    let freshFleet;
    try { freshFleet = deps.readWorktrees(); }
    catch { return { ok: false, reason: "fleet topology evidence unavailable" }; }
    if (fingerprintFleet(freshFleet) !== fingerprintFleet(expectedFleet ?? [])) {
      return { ok: false, reason: "fleet topology fingerprint drift" };
    }
    const registered = freshFleet.find((wt) => wt.path === target.path);
    if (!registered) return { ok: false, reason: "candidate is no longer registered" };

    let current;
    try {
      current = deps.inspectWorktree(
        registered,
        target,
        { liveMainEvidence, prEvidence },
        { primaryRoot, expectedCommonGitDir, frozenNow },
      );
    } catch {
      return { ok: false, reason: "candidate evidence inspection failed" };
    }
    current.prEvidence = {
      available: prEvidence.available,
      complete: prEvidence.complete,
      openPr: (
        (current.branch ? prEvidence.openByBranch.get(current.branch) : null)
        ?? (current.head ? prEvidence.openByHead.get(current.head) : null)
        ?? null
      ),
    };
    current.ownerEvidence = {
      available: Boolean(target.owner && target.task),
      owner: target.owner ?? null,
      task: target.task ?? null,
    };
    return revalidateCandidate(target, current, {
      primaryRoot,
      upstream,
      defaultBranch,
      minAgeDays,
      liveMainEvidence,
      expectedLiveMainSha,
      frozenNow,
    });
  };

  const preflight = targets.map((target) => ({
    target,
    validation: batchStopReason
      ? { ok: false, reason: batchStopReason }
      : inspectFresh(target),
  }));
  const preflightFailed = preflight.some(({ validation }) => !validation.ok);
  const results = [];
  if (preflightFailed) {
    for (const { target, validation } of preflight) {
      results.push({
        path: target.path,
        branch: target.branch ?? "(detached)",
        status: "skipped",
        reason: validation.ok ? "batch preflight failed for another target" : validation.reason,
      });
    }
  } else {
    deps.beforeMutation?.();
    for (let index = 0; index < targets.length; index++) {
      const target = targets[index];
      const stopRemaining = (reason) => {
        batchStopReason = reason;
        for (const remaining of targets.slice(index + 1)) {
          results.push({
            path: remaining.path,
            branch: remaining.branch ?? "(detached)",
            status: "skipped",
            reason: `batch stopped after prior target: ${reason}`,
          });
        }
      };
      const validation = inspectFresh(target);
      if (!validation.ok) {
        results.push({
          path: target.path,
          branch: target.branch ?? "(detached)",
          status: "skipped",
          reason: validation.reason,
        });
        stopRemaining(validation.reason);
        break;
      }
      let barrier;
      try {
        if (typeof deps.readTargetBoundaryEvidence !== "function") throw new Error("missing target barrier");
        barrier = deps.readTargetBoundaryEvidence(target.path);
      } catch { barrier = { available: false, identity: null }; }
      if (
        barrier?.available !== true
        || barrier.isDirectory !== true
        || !sameNodeIdentity(barrier.identity, validation.targetIdentity)
      ) {
        const reason = "target path identity barrier unavailable or changed";
        results.push({
          path: target.path,
          branch: target.branch ?? "(detached)",
          status: "skipped",
          reason,
        });
        stopRemaining(reason);
        break;
      }
      let writerEvidence;
      try {
        if (typeof deps.readActiveProcessEvidence !== "function") throw new Error("missing process barrier");
        writerEvidence = deps.readActiveProcessEvidence(target.path);
      } catch { writerEvidence = { available: false, active: null }; }
      if (writerEvidence?.available !== true || writerEvidence.active !== false) {
        const reason = writerEvidence?.active === true
          ? "active process is using the worktree"
          : "writer-free evidence unavailable";
        results.push({
          path: target.path,
          branch: target.branch ?? "(detached)",
          status: "skipped",
          reason,
        });
        stopRemaining(reason);
        break;
      }
      let leaseCurrent = false;
      try {
        if (typeof deps.revalidateFleetLease !== "function") throw new Error("missing fleet lease");
        leaseCurrent = deps.revalidateFleetLease() === true;
      } catch { leaseCurrent = false; }
      if (!leaseCurrent) {
        const reason = "fleet mutation lease unavailable or changed";
        results.push({
          path: target.path,
          branch: target.branch ?? "(detached)",
          status: "skipped",
          reason,
        });
        stopRemaining(reason);
        break;
      }
      try {
        if (typeof deps.writeCheckpoint !== "function") throw new Error("missing checkpoint writer");
        deps.writeCheckpoint({
          schemaVersion: "sweep-merged-worktrees.mutation-progress.v1",
          phase: "target-started",
          targetIndex: index,
          target: {
            path: redactSecretLikePath(target.path),
            branch: redactSecretLikePath(target.branch ?? "(detached)"),
            head: target.head,
            topologyFingerprint: target.topologyFingerprint,
          },
        });
      } catch {
        const reason = "durable target-started receipt failed";
        results.push({
          path: target.path,
          branch: target.branch ?? "(detached)",
          status: "failed",
          reason,
        });
        stopRemaining(reason);
        break;
      }
      const blockAfterStarted = (reason) => {
        const blocked = {
          path: target.path,
          branch: target.branch ?? "(detached)",
          status: "skipped",
          reason,
        };
        results.push(blocked);
        try {
          deps.writeCheckpoint({
            schemaVersion: "sweep-merged-worktrees.mutation-progress.v1",
            phase: "target-completed",
            targetIndex: index,
            result: {
              ...blocked,
              path: redactSecretLikePath(blocked.path),
              branch: redactSecretLikePath(blocked.branch),
            },
          });
        } catch {
          batchStopReason = "durable target-completed receipt failed";
        }
        stopRemaining(batchStopReason ?? reason);
      };
      const finalValidation = inspectFresh(target);
      if (!finalValidation.ok) {
        blockAfterStarted(finalValidation.reason);
        break;
      }
      let finalBarrier;
      try { finalBarrier = deps.readTargetBoundaryEvidence(target.path); }
      catch { finalBarrier = { available: false, identity: null }; }
      if (
        finalBarrier?.available !== true
        || finalBarrier.isDirectory !== true
        || !sameNodeIdentity(finalBarrier.identity, finalValidation.targetIdentity)
      ) {
        blockAfterStarted("target path identity barrier unavailable or changed after target-started");
        break;
      }
      let finalWriterEvidence;
      try { finalWriterEvidence = deps.readActiveProcessEvidence(target.path); }
      catch { finalWriterEvidence = { available: false, active: null }; }
      if (finalWriterEvidence?.available !== true || finalWriterEvidence.active !== false) {
        blockAfterStarted(finalWriterEvidence?.active === true
          ? "active process is using the worktree after target-started"
          : "writer-free evidence unavailable after target-started");
        break;
      }
      let finalLeaseCurrent = false;
      try { finalLeaseCurrent = deps.revalidateFleetLease() === true; }
      catch { finalLeaseCurrent = false; }
      if (!finalLeaseCurrent) {
        blockAfterStarted("fleet mutation lease unavailable or changed after target-started");
        break;
      }
      let receiptCurrent = false;
      try { receiptCurrent = deps.validateReceiptBinding() === true; }
      catch { receiptCurrent = false; }
      if (!receiptCurrent) {
        blockAfterStarted("receipt binding unavailable or changed after target-started");
        break;
      }
      const command = buildWorktreeRemoveCommand(target.path);
      if (!isAllowedSweepMutation(command.file, command.args)) {
        results.push({
          path: target.path,
          branch: target.branch ?? "(detached)",
          status: "failed",
          reason: "mutation invariant rejected the command",
        });
        stopRemaining("mutation invariant rejected the command");
        break;
      }
      let removal;
      try { removal = normalizeRemovalProviderResult(deps.removeWorktree(command)); }
      catch { removal = { ok: false, reason: "git worktree remove failed" }; }
      let postRemovalEvidence = null;
      let postRemovalReason = null;
      let postRemovalFleetDrift = null;
      if (removal?.ok) {
        postRemovalEvidence = {
          topologyAvailable: false,
          registrationAbsent: null,
          pathEvidenceAvailable: false,
          pathAbsent: null,
        };
        try {
          const postRemovalTopology = deps.readWorktrees();
          postRemovalEvidence.topologyAvailable = true;
          postRemovalEvidence.registrationAbsent = !postRemovalTopology.some(
            (wt) => wt.path === target.path,
          );
          if (postRemovalEvidence.registrationAbsent) {
            const expectedPostRemovalFleet = (expectedFleet ?? []).filter(
              (wt) => wt.path !== target.path,
            );
            if (fingerprintFleet(postRemovalTopology) !== fingerprintFleet(expectedPostRemovalFleet)) {
              postRemovalFleetDrift = "fleet topology fingerprint drift after removal";
            } else {
              expectedFleet = expectedPostRemovalFleet;
            }
          }
        } catch {
          postRemovalReason = "post-removal topology evidence unavailable";
        }
        try {
          const pathEvidence = deps.readPathAbsenceEvidence(target.path);
          if (
            pathEvidence?.available === true
            && typeof pathEvidence.absent === "boolean"
          ) {
            postRemovalEvidence.pathEvidenceAvailable = true;
            postRemovalEvidence.pathAbsent = pathEvidence.absent;
          } else if (!postRemovalReason) {
            postRemovalReason = "post-removal path evidence unavailable";
          }
        } catch {
          if (!postRemovalReason) postRemovalReason = "post-removal path evidence unavailable";
        }
        if (!postRemovalReason && !postRemovalEvidence.registrationAbsent) {
          postRemovalReason = "target is still registered after reported removal";
        }
        if (!postRemovalReason && !postRemovalEvidence.pathAbsent) {
          postRemovalReason = "target path still exists after reported removal";
        }
      }
      const removedAndProved = Boolean(removal?.ok && !postRemovalReason);
      const targetResult = {
        path: target.path,
        branch: target.branch ?? "(detached)",
        status: removedAndProved ? "removed" : "failed",
        reason: removedAndProved
          ? null
          : postRemovalReason ?? removal.reason ?? "git worktree remove failed",
        ...(removal.providerFailure ? { providerFailure: removal.providerFailure } : {}),
        ...(postRemovalEvidence ? { postRemovalEvidence } : {}),
      };
      results.push(targetResult);
      let checkpointFailed = false;
      try {
        deps.writeCheckpoint({
          schemaVersion: "sweep-merged-worktrees.mutation-progress.v1",
          phase: "target-completed",
          targetIndex: index,
          result: {
            ...targetResult,
            path: redactSecretLikePath(targetResult.path),
            branch: redactSecretLikePath(targetResult.branch),
            reason: redactSecretLikePath(targetResult.reason),
          },
        });
      } catch {
        checkpointFailed = true;
      }
      if (checkpointFailed || !removedAndProved || postRemovalFleetDrift) {
        stopRemaining(
          checkpointFailed
          ? "durable target-completed receipt failed"
          : postRemovalFleetDrift
          ?? postRemovalReason
          ?? "git worktree remove failed",
        );
        break;
      }
    }
  }

  let observedLiveMain;
  try { observedLiveMain = deps.readLiveMainEvidence(); }
  catch { observedLiveMain = { available: false, sha: null, source: null }; }
  let finalTopologyEvidence;
  let finalTopologyReason = null;
  try {
    const finalTopology = deps.readWorktrees();
    finalTopologyEvidence = {
      available: true,
      fingerprint: fingerprintFleet(finalTopology),
    };
    if (finalTopologyEvidence.fingerprint !== fingerprintFleet(expectedFleet ?? [])) {
      finalTopologyReason = "final topology fingerprint drift (fleet topology fingerprint drift after removal)";
    }
  } catch {
    finalTopologyEvidence = { available: false, fingerprint: null };
  }
  const targetsByPath = new Map(targets.map((target) => [target.path, target]));
  const receiptResults = results.map((result) => {
    const target = targetsByPath.get(result.path);
    return {
      ...(target ? {
        head: target.head,
        topologyFingerprint: target.topologyFingerprint,
        owner: target.owner,
        task: target.task,
        creationDate: target.creationDate,
        expectedCloseoutDate: target.expectedCloseoutDate,
        allowedAction: target.allowedAction,
      } : {}),
      ...result,
    };
  });
  const postflightCurrent = isAcceptedLiveMainEvidence(observedLiveMain)
    && observedLiveMain.sha === expectedLiveMainSha;
  let postflightReason = !postflightCurrent
    ? "postflight live-main evidence unavailable or drifted"
    : !finalTopologyEvidence.available
      ? "final topology evidence unavailable"
      : finalTopologyReason ?? batchStopReason
        ?? (results.every((result) => result.status === "removed")
          ? null
          : "one or more batch targets were not removed");
  const batchOutcome = {
    status: postflightReason ? "blocked" : "success",
    reason: postflightReason,
  };
  let completedAt;
  try {
    completedAt = deps.now();
    if (parseFrozenRuntimeTimestamp(completedAt) === null) {
      throw new Error("completion timestamp unavailable");
    }
  }
  catch {
    batchStopReason ??= "completion timestamp unavailable";
    completedAt = startedAt ?? null;
  }
  if (!postflightReason && batchStopReason) {
    postflightReason = batchStopReason;
    batchOutcome.status = "blocked";
    batchOutcome.reason = batchStopReason;
  }
  const durableReceipt = createPostflightReceipt({
    manifestSha256: authorization.manifestSha256,
    expectedLiveMainSha,
    observedLiveMainSha: observedLiveMain?.available ? observedLiveMain.sha : null,
    startedAt,
    completedAt,
    preTopologyFingerprint,
    postTopologyFingerprint: finalTopologyEvidence.fingerprint,
    finalTopologyEvidence,
    batchOutcome,
    results: receiptResults,
  });
  return {
    ok: batchOutcome.status === "success",
    receipt: durableReceipt,
    postflightReason,
  };
}

/** Validate the independent, byte-locked authorization used by preview/apply. */
export function validateApplyAuthorization({
  apply,
  manifestPreview = false,
  manifestBytes,
  expectedManifestSha256,
  expectedLiveMainSha,
  liveMainEvidence,
  repositoryIdentity,
}) {
  const authorizationMode = apply ? "--apply" : manifestPreview ? "manifest preview" : null;
  if (!authorizationMode) return { ok: true, manifest: null, manifestSha256: null };
  if (!manifestBytes || !SHA256_PATTERN.test(expectedManifestSha256 ?? "")) {
    return { ok: false, reason: `${authorizationMode} requires an immutable manifest and its expected SHA-256 digest` };
  }
  const manifestSha256 = sha256Text(manifestBytes);
  if (manifestSha256 !== expectedManifestSha256.toLowerCase()) {
    return { ok: false, reason: "immutable manifest digest mismatch" };
  }
  if (!OBJECT_ID_PATTERN.test(expectedLiveMainSha ?? "")) {
    return { ok: false, reason: `${authorizationMode} requires an independently supplied expected live-main SHA` };
  }
  if (
    !isAcceptedLiveMainEvidence(liveMainEvidence)
    || !OBJECT_ID_PATTERN.test(liveMainEvidence.sha ?? "")
  ) return { ok: false, reason: "live remote-main evidence unavailable" };
  if (repositoryIdentity !== APPROVED_REPOSITORY_IDENTITY) {
    return { ok: false, reason: "apply authorization requires the approved repository identity" };
  }

  let manifest;
  try { manifest = parseStrictManifestBytes(manifestBytes); }
  catch { return { ok: false, reason: "immutable manifest is not valid JSON" }; }
  if (manifest?.schemaVersion !== APPLY_MANIFEST_SCHEMA || !Array.isArray(manifest.targets)) {
    return { ok: false, reason: `immutable manifest must use ${APPLY_MANIFEST_SCHEMA}` };
  }
  if (
    manifest.expectedLiveMainSha !== expectedLiveMainSha
    || liveMainEvidence.sha !== expectedLiveMainSha
  ) return { ok: false, reason: "expected, manifest, and observed live-main SHA mismatch" };
  if (!SHA256_PATTERN.test(manifest.fleetFingerprint ?? "")) {
    return { ok: false, reason: "immutable manifest requires a fleet fingerprint" };
  }
  if (manifest.targets.length < 1 || manifest.targets.length > MAX_APPLY_TARGETS) {
    return { ok: false, reason: `${authorizationMode} accepts at most ${MAX_APPLY_TARGETS} exact targets` };
  }

  const seenPaths = new Set();
  for (const target of manifest.targets) {
    if (
      typeof target?.owner !== "string"
      || !target.owner.trim()
      || typeof target.task !== "string"
      || !target.task.trim()
    ) {
      return { ok: false, reason: "every manifest target requires owner and task custody" };
    }
    if (
      !isCanonicalIsoDate(target.expectedCloseoutDate)
    ) return { ok: false, reason: "every manifest target requires a valid expected closeout date" };
    if (!isCanonicalCreationDate(target.creationDate)) {
      return { ok: false, reason: "every manifest target requires a valid creation date" };
    }
    if (target.allowedAction !== "remove-worktree") {
      return { ok: false, reason: "every manifest target must lock the allowed action to remove-worktree" };
    }
    if (
      typeof target.path !== "string"
      || !target.path.startsWith("/")
      || !OBJECT_ID_PATTERN.test(target.head ?? "")
      || !SHA256_PATTERN.test(target.topologyFingerprint ?? "")
      || !(target.branch === null || typeof target.branch === "string")
    ) return { ok: false, reason: "manifest target lock is incomplete" };
    if (
      target.branch === null
      && (
        target.detachedAnchor?.immutable !== true
        || typeof target.detachedAnchor.ref !== "string"
        || !target.detachedAnchor.ref.startsWith("refs/tags/")
        || target.detachedAnchor.sha !== target.head
      )
    ) return { ok: false, reason: "detached target requires an exact immutable detached anchor" };
    if (seenPaths.has(target.path)) return { ok: false, reason: "manifest target paths must be unique" };
    seenPaths.add(target.path);
  }
  let receiptBudget;
  try {
    receiptBudget = calculateReceiptJournalBudget({
      manifest,
      manifestSha256,
      expectedLiveMainSha,
      repositoryIdentity,
    });
  } catch {
    return { ok: false, reason: "receipt journal planning failed" };
  }
  if (apply && !receiptBudget.ok) {
    return { ok: false, reason: "receipt journal budget exceeds maximum capacity" };
  }
  return { ok: true, manifest, manifestSha256, receiptBudget };
}

// Candidate names for content that is expensive or impossible to rebuild.
// A candidate only counts once `git check-ignore` confirms git actually ignores
// it — a tracked `.env.local.example` is documentation, not a secret.
export const PROTECTED_IGNORED = [
  { label: "env file", match: (n) => /^\.env(\..+)?$/.test(n) && !/\.(example|sample|template)$/.test(n) },
  { label: "local database", match: (n) => /\.sqlite(3)?$/.test(n) },
  {
    label: "secret-like file",
    match: (n) => !(
      /^\.env(?:\.|$)/.test(n)
      && /\.(example|sample|template)$/.test(n)
    ) && SECRET_PATH_SEGMENT.test(n),
  },
];

export const REBUILDABLE = new Set([
  "node_modules", ".next", ".turbo", ".vercel",
  "coverage", "test-results", "playwright-report", "dist", "build",
]);

function gitBoundQuiet(tuple, args, opts = {}) {
  try {
    return String(executeGit(
      execFileSync,
      repositoryGitArgs(tuple.primaryRoot, tuple.gitDir, args),
      { encoding: "utf8", cwd: tuple.primaryRoot, ...opts },
    )).trim();
  } catch { return null; }
}

function expectedCommonGitDirFor(registeredGitDir) {
  const parent = dirname(registeredGitDir);
  return basename(parent) === "worktrees" ? dirname(parent) : registeredGitDir;
}

function parseSingleGitPath(raw) {
  const value = String(raw ?? "");
  const withoutTerminator = value.endsWith("\r\n")
    ? value.slice(0, -2)
    : value.endsWith("\n")
      ? value.slice(0, -1)
      : value;
  if (!withoutTerminator || !isAbsolute(withoutTerminator) || withoutTerminator.includes("\0")) {
    throw new Error("Git path evidence is unavailable");
  }
  return withoutTerminator;
}

function readGitDirFromFilesystem(worktreePath, { lstat = lstatSync, realpath = realpathSync } = {}) {
  const gitEntry = join(worktreePath, ".git");
  let metadata;
  try { metadata = lstat(gitEntry); }
  catch { throw new Error("worktree .git metadata unavailable"); }
  if (typeof metadata.isSymbolicLink !== "function" || metadata.isSymbolicLink()) {
    throw new Error("worktree .git metadata is a symlink");
  }
  if (typeof metadata.isDirectory === "function" && metadata.isDirectory()) {
    let fd;
    try {
      fd = openSync(gitEntry, fsConstants.O_RDONLY | fsConstants.O_DIRECTORY | fsConstants.O_NOFOLLOW);
      const opened = fstatSync(fd);
      if (!sameNodeIdentity(nodeIdentity(opened), nodeIdentity(metadata))) {
        throw new Error("worktree .git directory changed after admission");
      }
      const canonical = realpath(gitEntry);
      const canonicalMetadata = lstat(canonical);
      if (
        typeof canonicalMetadata.isSymbolicLink !== "function"
        || canonicalMetadata.isSymbolicLink()
        || typeof canonicalMetadata.isDirectory !== "function"
        || !canonicalMetadata.isDirectory()
        || !sameNodeIdentity(nodeIdentity(canonicalMetadata), nodeIdentity(opened))
      ) throw new Error("worktree .git directory changed during admission");
      return canonical;
    } finally {
      if (fd !== undefined) closeSync(fd);
    }
  }
  if (typeof metadata.isFile !== "function" || !metadata.isFile()) {
    throw new Error("worktree .git metadata is not a directory or gitdir file");
  }
  if (!Number.isSafeInteger(metadata.size) || metadata.size < 1 || metadata.size > MAX_GITDIR_FILE_BYTES) {
    throw new Error("worktree gitdir file exceeds frozen size limit");
  }
  let fd;
  try {
    fd = openSync(gitEntry, fsConstants.O_RDONLY | fsConstants.O_NONBLOCK | fsConstants.O_NOFOLLOW);
    const opened = fstatSync(fd);
    if (
      !sameNodeIdentity(nodeIdentity(opened), nodeIdentity(metadata))
      || typeof opened.isFile !== "function"
      || !opened.isFile()
      || opened.size > MAX_GITDIR_FILE_BYTES
    ) {
      throw new Error("worktree gitdir file is not a bounded regular file");
    }
    const snapshot = {
      ...opened,
      dev: opened.dev,
      ino: opened.ino,
    };
    const bytes = readBoundedDescriptor(fd, MAX_GITDIR_FILE_BYTES);
    const afterRead = fstatSync(fd);
    if (
      !sameFileSnapshot(snapshot, afterRead)
      || afterRead.size > MAX_GITDIR_FILE_BYTES
    ) throw new Error("worktree gitdir file changed during read");
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    const match = /^gitdir:\s*(\S.*?)\s*$/u.exec(text.replace(/\r?\n$/u, ""));
    if (!match || match[1].includes("\0")) throw new Error("worktree gitdir file is malformed");
    const candidate = isAbsolute(match[1]) ? match[1] : resolve(worktreePath, match[1]);
    return realpath(candidate);
  } catch (error) {
    if (error?.message?.includes("worktree gitdir")) throw error;
    throw new Error("worktree gitdir file is unavailable");
  } finally {
    if (fd !== undefined) closeSync(fd);
  }
}

function repositoryGitArgs(repositoryRoot, gitDir, args) {
  return [
    "--no-optional-locks",
    `--git-dir=${gitDir}`,
    `--work-tree=${repositoryRoot}`,
    "-c",
    `core.worktree=${repositoryRoot}`,
    ...args,
  ];
}

export function parseRemoteIdentity(raw) {
  const value = String(raw ?? "").trim();
  const match = /^(?:https:\/\/(?:www\.)?github\.com\/|git@github\.com:|ssh:\/\/git@github\.com\/)([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+?)(?:\.git)?$/u.exec(value);
  return match ? `${match[1]}/${match[2]}` : null;
}

export function parseStrictGitHubRemoteUrl(raw) {
  if (typeof raw !== "string" || raw.length === 0 || raw.length > 512 || raw !== raw.trim()) return null;
  if (/[\u0000-\u001f\u007f]/u.test(raw)) return null;
  let url;
  try { url = new URL(raw); } catch { return null; }
  if (
    url.protocol !== "https:"
    || url.hostname !== "github.com"
    || url.port
    || url.username
    || url.password
    || url.search
    || url.hash
  ) return null;
  const pathname = url.pathname.endsWith(".git") ? url.pathname.slice(0, -4) : url.pathname;
  const match = /^\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)$/u.exec(pathname);
  return match ? `https://github.com/${match[1]}/${match[2]}.git` : null;
}

/** Resolve and freeze the primary checkout/common Git directory tuple. */
export function readRepositoryTuple(
  repositoryRoot,
  { execFile = execFileSync, realpath = realpathSync, expectedCommonGitDir = null } = {},
) {
  const physicalRoot = realpath(repositoryRoot);
  if (!isAbsolute(physicalRoot) || physicalRoot.includes("\0")) {
    throw new Error("repository root evidence is unavailable");
  }
  const gitDir = readGitDirFromFilesystem(physicalRoot);
  const expectedCommon = resolve(expectedCommonGitDir ?? expectedCommonGitDirFor(gitDir));
  const readBound = (flag) => parseSingleGitPath(executeGit(
    execFile,
    repositoryGitArgs(physicalRoot, gitDir, ["rev-parse", "--path-format=absolute", flag]),
    { cwd: physicalRoot, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
  ));
  const topLevel = readBound("--show-toplevel");
  const commonGitDir = readBound("--git-common-dir");
  const observedGitDir = readBound("--absolute-git-dir");
  if (
    resolve(topLevel) !== resolve(physicalRoot)
    || resolve(commonGitDir) !== expectedCommon
    || resolve(observedGitDir) !== resolve(gitDir)
  ) throw new Error("repository Git binding mismatch");
  let remoteUrl = null;
  try {
      remoteUrl = parseStrictGitHubRemoteUrl(String(executeGit(
        execFile,
        repositoryGitArgs(physicalRoot, gitDir, ["remote", "get-url", "origin"]),
        { cwd: physicalRoot, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
    )).trim());
  } catch { /* a caller that needs PR evidence must fail closed below */ }
  if (remoteUrl && remoteUrl !== APPROVED_REPOSITORY_URL) {
    throw new Error("origin remote is not the approved repository");
  }
  const remoteIdentity = remoteUrl ? parseRemoteIdentity(remoteUrl) : null;
  return Object.freeze({
    primaryRoot: physicalRoot,
    commonGitDir: expectedCommon,
    gitDir: resolve(gitDir),
    remoteIdentity,
    remoteUrl,
  });
}

export function repositoryTupleMatches(left, right) {
  return Boolean(
    left && right
    && typeof left.primaryRoot === "string"
    && typeof left.commonGitDir === "string"
    && typeof left.gitDir === "string"
    && typeof right.primaryRoot === "string"
    && typeof right.commonGitDir === "string"
    && typeof right.gitDir === "string",
  )
    && resolve(left.primaryRoot) === resolve(right.primaryRoot)
    && resolve(left.commonGitDir) === resolve(right.commonGitDir)
    && resolve(left.gitDir) === resolve(right.gitDir)
    && (left.remoteIdentity ?? null) === (right.remoteIdentity ?? null)
    && (left.remoteUrl ?? null) === (right.remoteUrl ?? null);
}

function readBoundWorktreeGitContext(
  worktreePath,
  {
    execFile = execFileSync,
    realpath = realpathSync,
    lstat = lstatSync,
    gitDir: gitDirOverride = null,
    expectedCommonGitDir = null,
  } = {},
) {
  const physicalWorktreePath = realpath(worktreePath);
  if (!isAbsolute(physicalWorktreePath) || physicalWorktreePath.includes("\0")) {
    throw new Error("physical worktree evidence is unavailable");
  }
  const gitDir = gitDirOverride ?? readGitDirFromFilesystem(physicalWorktreePath, { lstat, realpath });
  const expectedCommon = resolve(expectedCommonGitDir ?? expectedCommonGitDirFor(gitDir));
  const readBoundPath = (flag) => parseSingleGitPath(executeGit(
    execFile,
    boundWorktreeGitArgs(physicalWorktreePath, gitDir, [
      "rev-parse",
      "--path-format=absolute",
      flag,
    ]),
    { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
  ));
  const topLevel = readBoundPath("--show-toplevel");
  const commonGitDir = readBoundPath("--git-common-dir");
  const observedGitDir = readBoundPath("--absolute-git-dir");
  if (
    resolve(topLevel) !== resolve(physicalWorktreePath)
    || resolve(commonGitDir) !== expectedCommon
    || resolve(observedGitDir) !== resolve(gitDir)
  ) throw new Error("target worktree Git binding mismatch");
  return { physicalWorktreePath, gitDir, commonGitDir: expectedCommon };
}

function boundWorktreeGitArgs(worktreePath, gitDir, args) {
  return [
    "--no-optional-locks",
    `--git-dir=${gitDir}`,
    `--work-tree=${worktreePath}`,
    "-c",
    `core.worktree=${worktreePath}`,
    ...args,
  ];
}

function countPorcelainV1Z(raw) {
  const records = String(raw ?? "").split("\0");
  let dirty = 0;
  for (let index = 0; index < records.length; index++) {
    const record = records[index];
    if (!record) continue;
    dirty++;
    const status = record.slice(0, 2);
    if (status.includes("R") || status.includes("C")) index++;
  }
  return dirty;
}

export function readBoundWorktreeStatusEvidence(
  worktreePath,
  {
    execFile = execFileSync,
    realpath = realpathSync,
    gitDir = null,
    expectedCommonGitDir = null,
  } = {},
) {
  try {
    const binding = readBoundWorktreeGitContext(worktreePath, {
      execFile,
      realpath,
      gitDir,
      expectedCommonGitDir,
    });
    const raw = executeGit(
      execFile,
      boundWorktreeGitArgs(binding.physicalWorktreePath, binding.gitDir, [
        "status",
        "--porcelain=v1",
        "-z",
        "--untracked-files=all",
      ]),
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
    );
    return { available: true, dirty: countPorcelainV1Z(raw) };
  } catch {
    return { available: false, dirty: null };
  }
}

/** Parse `git worktree list --porcelain -z` into records without path quoting. */
export function parseWorktreeList(porcelain) {
  const out = [];
  let cur = null;
  const separator = porcelain.includes("\0") ? "\0" : "\n";
  for (const line of porcelain.split(separator)) {
    if (line.startsWith("worktree ")) {
      if (cur) out.push(cur);
      cur = {
        path: line.slice(9),
        head: null,
        branch: null,
        bare: false,
        detached: false,
        locked: false,
        lockReason: null,
        prunable: false,
        prunableReason: null,
      };
    } else if (!cur) continue;
    else if (line.startsWith("HEAD ")) cur.head = line.slice(5);
    else if (line.startsWith("branch ")) cur.branch = line.slice(7).replace(/^refs\/heads\//, "");
    else if (line === "bare") cur.bare = true;
    else if (line === "detached") cur.detached = true;
    else if (line === "locked" || line.startsWith("locked ")) {
      cur.locked = true;
      cur.lockReason = line.length > 6 ? line.slice(7) : null;
    } else if (line === "prunable" || line.startsWith("prunable ")) {
      cur.prunable = true;
      cur.prunableReason = line.length > 8 ? line.slice(9) : null;
    }
  }
  if (cur) out.push(cur);
  return out;
}

/**
 * Strip the decoration `git branch --contains` puts on each line. Current branch
 * is `* `, but a branch checked out in ANOTHER worktree is `+ `. Missing the `+`
 * makes every branch appear to contain itself, which silently turns "unique work"
 * into "safe to delete".
 */
export function parseContainingRefs(stdout, selfBranch) {
  return stdout
    .split("\n")
    .map((l) => l.replace(/^[*+ ]+/, "").trim())
    .filter(Boolean)
    .filter((r) => r !== selfBranch && r !== `remotes/origin/${selfBranch}`)
    .filter((r) => !r.startsWith("(HEAD detached"));
}

const PROTECTED_WALK_DESCRIPTOR_CHILD_SOURCE = String.raw`
import json, os, re, stat, sys

try:
    expected_dev, expected_ino = sys.argv[1], sys.argv[2]
    rebuildable = set(json.loads(sys.argv[3]))
    secret_pattern = re.compile(sys.argv[4], re.IGNORECASE)
    flags = os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW
    hits = []

    def safe_name(name):
        if not isinstance(name, str) or not name or name in (".", "..") or "/" in name or "\\x00" in name:
            raise ValueError()
        if any(0xD800 <= ord(char) <= 0xDFFF for char in name):
            raise ValueError()
        return name

    def add(parts, label, size=0):
        hits.append({"parts": parts, "label": label, "size": size if isinstance(size, int) and size >= 0 else 0})

    def walk(directory_fd, parts):
        for entry in os.scandir(directory_fd):
            name = safe_name(entry.name)
            if name == ".git":
                continue
            child_parts = parts + [name]
            try:
                metadata = entry.stat(follow_symlinks=False)
            except OSError:
                add(child_parts, "unknown node type")
                continue
            mode = metadata.st_mode
            if stat.S_ISLNK(mode):
                add(child_parts, "symlink")
                continue
            if stat.S_ISDIR(mode):
                if name == ".tmp":
                    add(child_parts, "local evidence directory")
                    continue
                if name in rebuildable:
                    continue
                try:
                    child_fd = os.open(name, flags, dir_fd=directory_fd)
                except OSError:
                    add(child_parts, "directory boundary unavailable")
                    continue
                try:
                    opened = os.fstat(child_fd)
                    if opened.st_dev != metadata.st_dev or opened.st_ino != metadata.st_ino:
                        add(child_parts, "directory boundary changed")
                        continue
                    walk(child_fd, child_parts)
                finally:
                    os.close(child_fd)
                continue
            if not stat.S_ISREG(mode):
                add(child_parts, "unknown node type")
                continue
            env_file = re.search(r"^\.env(?:\..+)?$", name) and not re.search(r"\.(?:example|sample|template)$", name)
            local_database = re.search(r"\.sqlite(?:3)?$", name)
            env_template = re.search(r"^\.env(?:\.|$)", name) and re.search(r"\.(?:example|sample|template)$", name)
            secret_like = not env_template and secret_pattern.search(name)
            if env_file:
                add(child_parts, "env file", metadata.st_size)
            elif local_database:
                add(child_parts, "local database", metadata.st_size)
            elif secret_like:
                add(child_parts, "secret-like file", metadata.st_size)

    root_fd = os.open(".", flags)
    try:
        root = os.fstat(root_fd)
        if str(root.st_dev) != expected_dev or str(root.st_ino) != expected_ino:
            raise ValueError()
        walk(root_fd, [])
    finally:
        os.close(root_fd)
    sys.stdout.write(json.dumps({"hits": hits}, ensure_ascii=True, separators=(",", ":")))
except BaseException:
    sys.exit(1)
`;

export function readProtectedTreeByDescriptor(path, expectedIdentity, { spawn = spawnSync } = {}) {
  if (
    !expectedIdentity
    || typeof expectedIdentity.dev !== "string"
    || typeof expectedIdentity.ino !== "string"
    || !/^\d+$/.test(expectedIdentity.dev)
    || !/^\d+$/.test(expectedIdentity.ino)
  ) throw new Error("directory identity unavailable");
  const child = spawn(
    "/usr/bin/python3",
    [
      "-I",
      "-c",
      PROTECTED_WALK_DESCRIPTOR_CHILD_SOURCE,
      expectedIdentity.dev,
      expectedIdentity.ino,
      JSON.stringify([...REBUILDABLE]),
      SECRET_PATH_SEGMENT.source,
    ],
    {
      cwd: path,
      env: {},
      encoding: "utf8",
      timeout: COMMAND_TIMEOUT_MS,
      maxBuffer: COMMAND_MAX_BUFFER_BYTES,
      killSignal: COMMAND_KILL_SIGNAL,
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  if (child.error || child.status !== 0 || String(child.stderr ?? "") !== "") {
    throw new Error("directory binding child failed closed");
  }
  let result;
  try { result = JSON.parse(String(child.stdout ?? "")); }
  catch { throw new Error("directory binding child output was malformed"); }
  if (
    !result
    || typeof result !== "object"
    || !Array.isArray(result.hits)
    || result.hits.length > 100_000
    || Object.keys(result).some((key) => key !== "hits")
  ) {
    throw new Error("directory binding child output was invalid");
  }
  for (const hit of result.hits) {
    if (
      !hit
      || typeof hit !== "object"
      || !Array.isArray(hit.parts)
      || hit.parts.length === 0
      || hit.parts.some((part) => (
        typeof part !== "string"
        || part.length === 0
        || part === "."
        || part === ".."
        || part.includes("/")
        || part.includes("\0")
      ))
      || ![
        "env file",
        "local database",
        "secret-like file",
        "local evidence directory",
        "symlink",
        "unknown node type",
        "directory boundary changed",
        "directory boundary unavailable",
      ].includes(hit.label)
      || !Number.isSafeInteger(hit.size)
      || hit.size < 0
      || Object.keys(hit).some((key) => !["parts", "label", "size"].includes(key))
    ) throw new Error("directory binding child output was invalid");
  }
  return result.hits
    .map((hit) => ({
      path: join(path, ...hit.parts),
      label: hit.label,
      size: hit.size,
    }))
    .sort((left, right) => (
      left.path.localeCompare(right.path)
      || left.label.localeCompare(right.label)
    ));
}

/** Ignored-but-precious content that `git status` cannot see. */
export function scanProtectedIgnored(
  dir,
  { lstat = lstatSync, scanTree = readProtectedTreeByDescriptor } = {},
) {
  let rootMetadata;
  try { rootMetadata = lstat(dir); }
  catch { return [{ path: dir, label: "directory boundary unavailable", size: 0 }]; }
  if (
    typeof rootMetadata?.isSymbolicLink !== "function"
    || rootMetadata.isSymbolicLink()
    || typeof rootMetadata.isDirectory !== "function"
    || !rootMetadata.isDirectory()
  ) return [{
    path: dir,
    label: rootMetadata?.isSymbolicLink?.() ? "symlink" : "unknown node type",
    size: 0,
  }];

  try { return scanTree(dir, nodeIdentity(rootMetadata)); }
  catch { return [{ path: dir, label: "directory boundary unavailable", size: 0 }]; }
}

/** Pure policy decision. All filesystem and git state is resolved by the caller. */
function sameCanonicalPath(left, right) {
  try {
    return realpathSync(left) === realpathSync(right);
  } catch {
    return resolve(left) === resolve(right);
  }
}

export function decide(wt, ctx) {
  if (wt.bare) return { action: "skip", reason: "bare repository" };
  if (wt.locked) return { action: "skip", reason: "worktree registration is locked" };
  if (wt.prunable) return { action: "skip", reason: "worktree registration is prunable" };
  if (sameCanonicalPath(wt.path, ctx.primaryRoot)) return { action: "skip", reason: "primary checkout" };
  // A checkout of the integration branch is a standing reference, and it is
  // merged-by-definition, so every other rule would happily delete it.
  if (wt.branch && wt.branch === ctx.defaultBranch)
    return { action: "skip", reason: `checkout of the default branch (${ctx.defaultBranch})` };
  if (
    !isAcceptedLiveMainEvidence(ctx.liveMainEvidence)
    || !ctx.liveMainEvidence.sha
  ) return { action: "skip", reason: "live remote-main evidence unavailable" };
  if (!wt.prEvidence?.available)
    return { action: "skip", reason: "GitHub PR evidence unavailable" };
  if (wt.prEvidence.complete !== true)
    return { action: "skip", reason: "GitHub PR evidence is not exhaustive" };
  if (
    !wt.ownerEvidence?.available
    || typeof wt.ownerEvidence.owner !== "string"
    || !wt.ownerEvidence.owner.trim()
    || typeof wt.ownerEvidence.task !== "string"
    || !wt.ownerEvidence.task.trim()
  ) return {
    action: "skip",
    reason: "owner evidence unavailable: owner and task custody unavailable",
  };
  if (!wt.processEvidence?.available)
    return { action: "skip", reason: "active-process evidence unavailable" };
  if (wt.processEvidence.active)
    return { action: "skip", reason: "active process is using the worktree" };
  if (
    wt.detached
    && (
      !wt.detachedAnchorEvidence?.available
      || !wt.detachedAnchorEvidence.immutable
      || !wt.detachedAnchorEvidence.ref
      || wt.detachedAnchorEvidence.sha !== wt.head
    )
  ) return { action: "skip", reason: "unanchored detached worktree" };
  if (!wt.exists) return { action: "skip", reason: "directory missing (run `git worktree prune`)" };
  if (!wt.statusEvidence?.available)
    return { action: "skip", reason: "clean-status evidence unavailable" };
  if (wt.dirty > 0) return { action: "skip", reason: `dirty (${wt.dirty} entries)` };
  if (wt.protectedHits.length) {
    const l = wt.protectedHits.map((h) => h.label);
    return { action: "skip", reason: `holds ${[...new Set(l)].join(", ")} that git ignores` };
  }
  if (ctx.minAgeDays > 0 && (wt.ageDays === null || !Number.isFinite(wt.ageDays))) {
    return { action: "skip", reason: "age evidence unavailable for --min-age-days" };
  }
  if (ctx.minAgeDays > 0 && wt.ageDays < ctx.minAgeDays)
    return { action: "skip", reason: `younger than --min-age-days ${ctx.minAgeDays}` };
  if (wt.prEvidence.openPr) return { action: "skip", reason: `open PR #${wt.prEvidence.openPr}` };
  if (wt.mergedIntoUpstream) return { action: "retire", reason: `commits already on ${ctx.upstream}` };
  return { action: "skip", reason: "HEAD is not anchored to live remote main" };
}

/** Query the remote directly; a cached tracking ref is never evidence here. */
export function readLiveMainEvidence(
  cwd,
  branch = "main",
  { execFile = execFileSync, repositoryTuple = null } = {},
) {
  try {
    if (
      !repositoryTuple
      || repositoryTuple.remoteIdentity !== APPROVED_REPOSITORY_IDENTITY
      || repositoryTuple.remoteUrl !== APPROVED_REPOSITORY_URL
    ) throw new Error("repository tuple unavailable");
    const raw = executeGitHub(
      execFile,
      [
        "api",
        "--hostname",
        "github.com",
        `repos/${APPROVED_REPOSITORY_IDENTITY}/git/ref/heads/${branch}`,
      ],
      { encoding: null, cwd: "/", stdio: ["ignore", "pipe", "ignore"] },
    );
    return parseGitHubExactRef(raw, branch);
  } catch {
    return { available: false, sha: null, source: null };
  }
}

/** Live map of branch -> open PR number, fail-closed when GitHub cannot answer. */
export function readOpenPrEvidence(
  cwd,
  { execFile = execFileSync, queryLimit = OPEN_PR_QUERY_LIMIT, repositoryIdentity = null } = {},
) {
  try {
    if (repositoryIdentity !== APPROVED_REPOSITORY_IDENTITY) {
      throw new Error("repository identity unavailable");
    }
    const raw = executeGitHub(
      execFile,
      [
        "api", "--hostname", "github.com", "--paginate", "--slurp",
        `repos/${APPROVED_REPOSITORY_IDENTITY}/pulls?state=open&per_page=100`,
      ],
      { encoding: null, cwd: "/", stdio: ["ignore", "pipe", "ignore"] },
    );
    return parseOpenPrEvidence(raw, { queryLimit });
  } catch {
    return {
      available: false,
      complete: false,
      reason: "GitHub PR evidence query failed",
      openByBranch: new Map(),
      openByHead: new Map(),
    };
  }
}

export function readActiveProcessEvidence(path, { spawn = spawnSync } = {}) {
  let probe;
  try {
    probe = spawn(
    TRUSTED_LSOF_EXECUTABLE,
    ["-n", "-P", "+D", path, "-Fp"],
      {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
        env: {},
        timeout: COMMAND_TIMEOUT_MS,
        maxBuffer: COMMAND_MAX_BUFFER_BYTES,
        killSignal: COMMAND_KILL_SIGNAL,
      },
    );
  } catch {
    return { available: false, active: null };
  }
  return parseActiveProcessEvidence({
    status: probe.status,
    stdout: probe.stdout,
    stderr: probe.stderr,
    error: probe.error ?? null,
  });
}

function readDetachedAnchorEvidence(target, wt, repositoryTuple) {
  if (!wt.detached) return null;
  if (!repositoryTuple) return { available: false, ref: null, sha: null, immutable: false };
  const anchor = target?.detachedAnchor;
  if (!anchor) return { available: false, ref: null, sha: null, immutable: false };
  const objectType = gitBoundQuiet(repositoryTuple, ["cat-file", "-t", anchor.ref]);
  const resolvedSha = gitBoundQuiet(repositoryTuple, ["rev-parse", `${anchor.ref}^{commit}`]);
  return {
    available: objectType === "tag" && resolvedSha === wt.head && anchor.sha === wt.head,
    ref: anchor.ref,
    sha: resolvedSha,
    immutable: objectType === "tag" && anchor.immutable === true,
  };
}

/** Keep only the candidates git actually ignores. */
export function retainGitIgnored(
  dir,
  hits,
  {
    execFile = execFileSync,
    realpath = realpathSync,
    gitDir = null,
    expectedCommonGitDir = null,
  } = {},
) {
  if (!hits.length) return [];
  const rel = hits.map((h) => h.path.slice(dir.length + 1));
  let binding;
  try {
    binding = readBoundWorktreeGitContext(dir, { execFile, realpath, gitDir, expectedCommonGitDir });
  }
  catch { return hits; }
  let out;
  try {
    out = executeGit(
      execFile,
      boundWorktreeGitArgs(binding.physicalWorktreePath, binding.gitDir, [
        "check-ignore",
        "-z",
        "--stdin",
      ]),
      { encoding: "utf8", input: `${rel.join("\0")}\0`, stdio: ["pipe", "pipe", "ignore"] },
    );
  } catch (e) {
    // exit 1 simply means "none of them are ignored"
    out = e.status === 1 ? String(e.stdout ?? "") : null;
    if (out === null) return hits; // check-ignore unusable: fail safe, keep them
  }
  const ignored = new Set(out.split("\0").filter(Boolean));
  return hits.filter((h) => (
    h.label === "symlink"
    || h.label === "unknown node type"
    || h.label === "directory boundary changed"
    || h.label === "directory boundary unavailable"
    || ignored.has(h.path.slice(dir.length + 1))
  ));
}

function inspectRuntimeWorktree(
  wt,
  target,
  { primaryRoot, expectedCommonGitDir, liveMainEvidence, prEvidence, frozenNow, repositoryTuple },
) {
  if (!repositoryTuple) throw new Error("repository tuple unavailable during worktree inspection");
  const currentTuple = readRepositoryTuple(primaryRoot, {
    expectedCommonGitDir,
  });
  if (!repositoryTupleMatches(repositoryTuple, currentTuple)) {
    throw new Error("repository tuple drift during worktree inspection");
  }
  const current = { ...wt };
  current.exists = existsSync(current.path);
  current.targetBoundaryEvidence = current.exists
    ? readTargetBoundaryEvidence(current.path)
    : { available: false, isDirectory: false, identity: null };
  const status = current.exists
    ? readBoundWorktreeStatusEvidence(current.path, { expectedCommonGitDir })
    : { available: false, dirty: null };
  current.statusEvidence = { available: status.available };
  current.dirty = status.dirty ?? 0;
  current.protectedHits = current.exists && current.statusEvidence.available && current.dirty === 0
    ? retainGitIgnored(current.path, scanProtectedIgnored(current.path), { expectedCommonGitDir })
    : [];
  current.mergedIntoUpstream = Boolean(
    current.head
    && liveMainEvidence.available
    && repositoryTuple
    && gitBoundQuiet(repositoryTuple, ["merge-base", "--is-ancestor", current.head, liveMainEvidence.sha]) !== null
  );
  current.containedIn = [];
  const iso = current.head && repositoryTuple
    ? gitBoundQuiet(repositoryTuple, ["log", "-1", "--format=%cI", current.head])
    : null;
  const creation = target?.creationDate ?? iso;
  const frozenTimestamp = typeof frozenNow === "number" ? frozenNow : Date.parse(frozenNow ?? "");
  current.ageDays = creation && Number.isFinite(frozenTimestamp)
    ? Math.floor((frozenTimestamp - Date.parse(creation)) / 86400000)
    : null;
  current.prEvidence = {
    available: prEvidence.available,
    complete: prEvidence.complete,
    openPr: (
      (current.branch ? prEvidence.openByBranch.get(current.branch) : null)
      ?? (current.head ? prEvidence.openByHead.get(current.head) : null)
      ?? null
    ),
  };
  current.ownerEvidence = {
    available: Boolean(target?.owner && target?.task),
    owner: target?.owner ?? null,
    task: target?.task ?? null,
  };
  current.processEvidence = target && current.exists
    ? readActiveProcessEvidence(current.path)
    : { available: false, active: null };
  current.detachedAnchorEvidence = readDetachedAnchorEvidence(target, current, repositoryTuple);
  return current;
}

function pathContains(parent, child) {
  const rel = relative(resolve(parent), resolve(child));
  return rel === "" || (rel !== ".." && !rel.startsWith(`..${sep}`));
}

export function createRuntimeProviders() {
  return {
    resolveRepositoryTuple: (repositoryRoot = process.cwd()) => readRepositoryTuple(repositoryRoot),
    resolvePrimaryRoot: (repositoryRoot = process.cwd()) => {
      const tuple = readRepositoryTuple(repositoryRoot);
      return dirname(tuple.commonGitDir);
    },
    resolveCommonGitDir: (primaryRoot) => (
      readRepositoryTuple(primaryRoot).commonGitDir
    ),
    readLiveMainEvidence: (primaryRoot, branch, { repositoryTuple = null } = {}) => {
      try {
        if (!repositoryTuple) throw new Error("repository tuple unavailable");
        const current = readRepositoryTuple(primaryRoot, {
          expectedCommonGitDir: repositoryTuple.commonGitDir,
        });
        if (!repositoryTupleMatches(repositoryTuple, current)) throw new Error("repository tuple drift");
        return readLiveMainEvidence(primaryRoot, branch, { repositoryTuple });
      } catch {
        return { available: false, sha: null, source: null };
      }
    },
    readOpenPrEvidence: (primaryRoot, {
      repositoryIdentity = null,
      repositoryTuple = null,
    } = {}) => {
      try {
        if (!repositoryTuple) throw new Error("repository tuple unavailable");
        const current = readRepositoryTuple(primaryRoot, {
          expectedCommonGitDir: repositoryTuple.commonGitDir,
        });
        if (!repositoryTupleMatches(repositoryTuple, current)) throw new Error("repository tuple drift");
        return readOpenPrEvidence(primaryRoot, { repositoryIdentity });
      } catch {
        return {
          available: false,
          complete: false,
          reason: "GitHub PR evidence query failed",
          openByBranch: new Map(),
          openByHead: new Map(),
        };
      }
    },
    readExternalPathEvidence: (path, kind) => readExternalPathEvidence(path, { kind }),
    readImmutableManifest: (path, options) => readManifestByBoundDescriptor(path, options),
    readPathAbsenceEvidence: (path) => readPathAbsenceEvidence(path),
    readTargetBoundaryEvidence: (path) => readTargetBoundaryEvidence(path),
    readActiveProcessEvidence: (path) => readActiveProcessEvidence(path),
    readWorktrees: (primaryRoot, { repositoryTuple = null } = {}) => {
      if (!repositoryTuple) throw new Error("repository tuple unavailable");
      const tuple = repositoryTuple;
      const current = readRepositoryTuple(primaryRoot, { expectedCommonGitDir: tuple.commonGitDir });
      if (!repositoryTupleMatches(tuple, current)) throw new Error("repository tuple drift");
      return parseWorktreeList(String(executeGit(
        execFileSync,
        repositoryGitArgs(tuple.primaryRoot, tuple.gitDir, ["worktree", "list", "--porcelain", "-z"]),
        { encoding: "utf8", cwd: tuple.primaryRoot },
      )));
    },
    inspectWorktree: (wt, target, evidence, context) => inspectRuntimeWorktree(wt, target, {
      primaryRoot: context.primaryRoot,
      expectedCommonGitDir: context.expectedCommonGitDir,
      liveMainEvidence: evidence.liveMainEvidence,
      prEvidence: evidence.prEvidence,
      frozenNow: context.frozenNow,
      repositoryTuple: context.repositoryTuple,
    }),
    reserveReceipt: (path, options) => reserveReceiptByBoundParent(path, options),
    writeReceipt: (handle, text) => writeReceiptDurably(handle, text),
    validateReceiptDurability: (handle) => validateReceiptDurability(handle),
    closeReceipt: (handle, path) => {
      closeReceiptDurably(handle);
    },
    acquireFleetMutationLease: ({ repositoryTuple, identity }) => (
      acquireFleetMutationLease(fleetMutationLeasePath(repositoryTuple), identity)
    ),
    revalidateFleetMutationLease: (lease, identity) => revalidateFleetMutationLease(lease, identity),
    releaseFleetMutationLease: (lease, identity) => releaseFleetMutationLease(lease, identity),
    removeWorktree(command, primaryRoot, repositoryTuple = null) {
      try {
        if (!repositoryTuple) throw new Error("repository tuple unavailable");
        const tuple = repositoryTuple;
        const current = readRepositoryTuple(primaryRoot, { expectedCommonGitDir: tuple.commonGitDir });
        if (!repositoryTupleMatches(tuple, current)) throw new Error("repository tuple drift");
        executeGit(execFileSync, repositoryGitArgs(tuple.primaryRoot, tuple.gitDir, command.args), {
          cwd: tuple.primaryRoot,
          encoding: "utf8",
          stdio: ["ignore", "pipe", "ignore"],
        });
        return { ok: true };
      } catch {
        return { ok: false, reason: "git worktree remove failed" };
      }
    },
    now: () => new Date().toISOString(),
    log: (...parts) => console.log(...parts),
    error: (...parts) => console.error(...parts),
  };
}

export function main(argv, providers) {
  const runtime = providers ?? createRuntimeProviders();
  if (!isSupportedSweepPlatform()) {
    runtime.error("sweep refused: this bounded local-tool implementation requires macOS");
    return 1;
  }
  const args = parseSweepArgs(argv);
  if (!args.ok) {
    runtime.error(`sweep refused: ${redactSecretLikePath(args.reason)}`);
    return 1;
  }

  let primaryRoot;
  try {
    primaryRoot = runtime.resolvePrimaryRoot();
  } catch {
    runtime.error("sweep refused: cannot resolve the primary checkout");
    return 1;
  }
  let expectedCommonGitDir;
  let repositoryTuple;
  try {
    expectedCommonGitDir = runtime.resolveCommonGitDir
      ? runtime.resolveCommonGitDir(primaryRoot)
      : join(primaryRoot, ".git");
    if (!isAbsolute(expectedCommonGitDir) || expectedCommonGitDir.includes("\0")) {
      throw new Error("invalid common repository path");
    }
    repositoryTuple = runtime.resolveRepositoryTuple
      ? runtime.resolveRepositoryTuple(primaryRoot)
      : { primaryRoot, commonGitDir: expectedCommonGitDir, gitDir: join(expectedCommonGitDir) };
    if (
      !repositoryTupleMatches(
        {
          primaryRoot,
          commonGitDir: expectedCommonGitDir,
          gitDir: repositoryTuple.gitDir,
          remoteIdentity: repositoryTuple.remoteIdentity,
          remoteUrl: repositoryTuple.remoteUrl,
        },
        repositoryTuple,
      )
    ) throw new Error("repository tuple does not match primary checkout");
  } catch {
    runtime.error("sweep refused: cannot resolve the expected common repository");
    return 1;
  }
  if (
    repositoryTuple.remoteIdentity !== APPROVED_REPOSITORY_IDENTITY
    || repositoryTuple.remoteUrl !== APPROVED_REPOSITORY_URL
  ) {
    runtime.error("sweep refused: approved repository identity is unavailable");
    return 1;
  }
  const repositoryIdentity = repositoryTuple.remoteIdentity;
  const defaultBranch = "main";
  const upstream = "origin/main";
  let liveMainEvidence;
  try {
    liveMainEvidence = runtime.readLiveMainEvidence(primaryRoot, defaultBranch, { repositoryTuple });
  }
  catch { liveMainEvidence = { available: false, sha: null, source: null }; }
  let prEvidence;
  try {
    prEvidence = runtime.readOpenPrEvidence(primaryRoot, {
      repositoryIdentity: repositoryTuple.remoteIdentity,
      repositoryTuple,
    });
  }
  catch {
    prEvidence = {
      available: false,
      complete: false,
      openByBranch: new Map(),
      openByHead: new Map(),
    };
  }
  let startedAt;
  try { startedAt = runtime.now(); }
  catch {
    runtime.error("sweep refused: initial timestamp unavailable");
    return 1;
  }
  if (parseFrozenRuntimeTimestamp(startedAt) === null) {
    runtime.error("sweep refused: initial timestamp unavailable");
    return 1;
  }

  let manifestBytes = null;
  let authorization = { ok: true, manifest: null, manifestSha256: null };
  const readLockedManifest = () => runtime.readImmutableManifest(args.manifestPath);
  if (args.apply || args.manifestPreview) {
    if (!isAbsolute(args.manifestPath) || (args.apply && !isAbsolute(args.receiptPath))) {
      runtime.error(args.apply
        ? "sweep refused: --manifest and --receipt must be absolute paths"
        : "sweep refused: --manifest must be an absolute path");
      return 1;
    }
    if (args.apply && resolve(args.manifestPath) === resolve(args.receiptPath)) {
      runtime.error("sweep refused: receipt path must differ from the immutable manifest path");
      return 1;
    }
    let manifestBoundaryEvidence;
    try {
      manifestBoundaryEvidence = runtime.readExternalPathEvidence?.(args.manifestPath, "manifest");
    } catch { manifestBoundaryEvidence = { available: false, absent: null }; }
    if (!manifestBoundaryEvidence?.available || manifestBoundaryEvidence.absent !== false) {
      runtime.error("sweep refused: external manifest path boundary unavailable");
      return 1;
    }
    if (args.apply) {
      let receiptAbsenceEvidence;
      try {
        receiptAbsenceEvidence = runtime.readExternalPathEvidence?.(args.receiptPath, "receipt");
      }
      catch { receiptAbsenceEvidence = { available: false, absent: null }; }
      if (!receiptAbsenceEvidence?.available || receiptAbsenceEvidence.absent !== true) {
        runtime.error("sweep refused: external receipt path boundary unavailable");
        return 1;
      }
    }
    try { manifestBytes = readLockedManifest(); }
    catch {
      runtime.error(`sweep refused: immutable manifest is unreadable at ${redactSecretLikePath(args.manifestPath)}`);
      return 1;
    }
    authorization = validateApplyAuthorization({
      apply: args.apply,
      manifestPreview: args.manifestPreview,
      manifestBytes,
      expectedManifestSha256: args.manifestSha256,
      expectedLiveMainSha: args.expectedLiveMainSha,
      liveMainEvidence,
      repositoryIdentity,
    });
    if (!authorization.ok) {
      runtime.error(`sweep refused: ${authorization.reason}`);
      return 1;
    }
    for (const target of authorization.manifest.targets) {
      if (
        pathContains(target.path, args.manifestPath)
        || (args.apply && pathContains(target.path, args.receiptPath))
      ) {
        runtime.error(args.apply
          ? "sweep refused: manifest and receipt must live outside every target worktree"
          : "sweep refused: immutable manifest must live outside every target worktree");
        return 1;
      }
    }
  }

  let worktrees;
  try { worktrees = runtime.readWorktrees(primaryRoot, { repositoryTuple }); }
  catch {
    runtime.error("sweep refused: worktree topology is unavailable");
    return 1;
  }
  const readPostfailureTopologyEvidence = () => {
    try {
      const topology = runtime.readWorktrees(primaryRoot, { repositoryTuple });
      return { available: true, fingerprint: fingerprintFleet(topology) };
    } catch {
      return { available: false, fingerprint: null };
    }
  };
  if (args.manifestPreview) {
    if (fingerprintFleet(worktrees) !== authorization.manifest.fleetFingerprint) {
      runtime.error("sweep refused: fleet topology fingerprint drift during manifest preview");
      return 1;
    }
    const worktreesByPath = new Map(worktrees.map((worktree) => [worktree.path, worktree]));
    for (const target of authorization.manifest.targets) {
      const current = worktreesByPath.get(target.path);
      if (
        !current
        || (current.branch ?? null) !== (target.branch ?? null)
        || current.head !== target.head
        || fingerprintTopology(current) !== target.topologyFingerprint
      ) {
        runtime.error("sweep refused: candidate lock drift during manifest preview");
        return 1;
      }
    }
  }
  const targetsByPath = new Map(
    (authorization.manifest?.targets ?? []).map((target) => [target.path, target]),
  );
  const plan = worktrees.map((wt) => {
    const target = targetsByPath.get(wt.path) ?? null;
    const current = runtime.inspectWorktree(
      wt,
      target,
      { liveMainEvidence, prEvidence },
      { primaryRoot, expectedCommonGitDir, frozenNow: startedAt, repositoryTuple },
    );
    const decision = decide(current, {
      primaryRoot,
      upstream,
      defaultBranch,
      minAgeDays: args.minAgeDays,
      liveMainEvidence,
    });
    return {
      ...decision,
      path: redactSecretLikePath(wt.path),
      branch: redactSecretLikePath(wt.branch ?? "(detached)"),
      head: wt.head,
      topologyFingerprint: fingerprintTopology(wt),
      manifestTarget: Boolean(target),
    };
  });
  const retire = plan.filter((entry) => entry.action === "retire");
  const manifestPlan = plan.filter((entry) => entry.manifestTarget);
  const previewReady = args.manifestPreview
    ? (
      manifestPlan.length === authorization.manifest.targets.length
      && manifestPlan.every((entry) => entry.action === "retire")
    )
    : null;
  if (args.asJson) {
    runtime.log(JSON.stringify({
      upstream,
      liveMainEvidence,
      liveMainEvidenceTrusted: isAcceptedLiveMainEvidence(liveMainEvidence),
      githubPrEvidenceAvailable: isTrustedOpenPrEvidence(prEvidence),
      apply: args.apply,
      authorizationMode: args.apply ? "apply" : args.manifestPreview ? "manifest-preview" : "none",
      previewReady,
      maxApplyTargets: MAX_APPLY_TARGETS,
      plan,
    }, null, 2));
  } else {
    for (const entry of plan.filter((item) => item.action === "skip")) {
      runtime.log(`  keep    ${entry.branch}  — ${redactSecretLikePath(entry.reason)}`);
    }
    for (const entry of retire) {
      runtime.log(`  RETIRE  ${entry.branch}  — ${redactSecretLikePath(entry.reason)}`);
    }
    runtime.log(`\n${worktrees.length} worktrees; ${retire.length} authorized and retirable.`);
    if (!isAcceptedLiveMainEvidence(liveMainEvidence)) {
      runtime.log("BLOCKED: live remote-main evidence unavailable.");
    }
    if (!isTrustedOpenPrEvidence(prEvidence)) {
      runtime.log("BLOCKED: live GitHub PR evidence unavailable or incomplete.");
    }
  }

  if (!args.apply) {
    if (!args.asJson) {
      runtime.log(args.manifestPreview
        ? `\nmanifest preview ${previewReady ? "ready" : "blocked"} — no receipt was reserved and no worktree was removed.`
        : "\ndry run only — --apply requires a byte-locked manifest and receipt path.");
    }
    return (
      isAcceptedLiveMainEvidence(liveMainEvidence)
      && isTrustedOpenPrEvidence(prEvidence)
      && (!args.manifestPreview || previewReady)
    ) ? 0 : 1;
  }

  let receiptFd;
  try {
    receiptFd = runtime.reserveReceipt(args.receiptPath);
  } catch {
    runtime.error(`sweep refused: cannot reserve new receipt at ${redactSecretLikePath(args.receiptPath)}`);
    return 1;
  }
  let receiptBytesWritten = 0;
  const writeReceiptEntry = (entry) => {
    if (
      entry?.repositoryIdentity !== undefined
      && entry.repositoryIdentity !== repositoryIdentity
    ) throw new Error("receipt repository identity mismatch");
    const boundEntry = { ...entry, repositoryIdentity };
    assertReceiptJournalEntryContract(boundEntry);
    const encoded = `${JSON.stringify(boundEntry)}\n`;
    const nextReceiptBytes = receiptBytesWritten + Buffer.byteLength(encoded, "utf8");
    if (nextReceiptBytes > MAX_RECEIPT_BYTES) {
      throw new Error("receipt size limit exceeded");
    }
    runtime.writeReceipt(receiptFd, encoded);
    receiptBytesWritten = nextReceiptBytes;
  };

  const leaseIdentity = createFleetLeaseIdentity({
    repositoryTuple,
    manifestSha256: authorization.manifestSha256,
    targets: authorization.manifest.targets,
  });
  let fleetLease;
  try {
    if (typeof runtime.acquireFleetMutationLease !== "function") {
      throw new Error("fleet lease provider unavailable");
    }
    fleetLease = runtime.acquireFleetMutationLease({
      repositoryTuple,
      identity: leaseIdentity,
      manifestSha256: authorization.manifestSha256,
      targets: authorization.manifest.targets,
      startedAt,
    });
  } catch (error) {
    const acquisitionOutcome = normalizeFleetLeaseAcquisitionFailure(error);
    const preTopologyFingerprint = fingerprintFleet(worktrees);
    const finalTopologyEvidence = readPostfailureTopologyEvidence();
    const leaseUnavailableReason = [
      acquisitionOutcome.leaseMayRemain
        ? "fleet mutation lease unavailable; possible residual lease"
        : "fleet mutation lease unavailable",
      ...(!finalTopologyEvidence.available
        ? ["postfailure topology evidence unavailable"]
        : []),
    ].join("; ");
    let terminalAvailable = true;
    try {
      writeReceiptEntry({
        ...createPostflightReceipt({
          manifestSha256: authorization.manifestSha256,
          expectedLiveMainSha: args.expectedLiveMainSha,
          observedLiveMainSha: isAcceptedLiveMainEvidence(liveMainEvidence) ? liveMainEvidence.sha : null,
          startedAt,
          completedAt: startedAt,
          preTopologyFingerprint,
          postTopologyFingerprint: finalTopologyEvidence.fingerprint,
          finalTopologyEvidence,
          batchOutcome: {
            status: "blocked",
            reason: leaseUnavailableReason,
          },
          results: authorization.manifest.targets.map((target) => ({
            ...target,
            path: target.path,
            branch: target.branch ?? "(detached)",
            status: "skipped",
            reason: leaseUnavailableReason,
          })),
        }),
        phase: "terminal",
        leaseIdentity,
        leaseRelease: acquisitionOutcome,
      });
    } catch { terminalAvailable = false; }
    try { runtime.closeReceipt(receiptFd, args.receiptPath); }
    catch { runtime.error("sweep cleanup warning: receipt descriptor close failed after authoritative terminal"); }
    if (!terminalAvailable) {
      runtime.error(`sweep refused: terminal unavailable; lease may remain=${acquisitionOutcome.leaseMayRemain}`);
    }
    runtime.error("sweep refused: cooperative fleet mutation lease unavailable");
    return 1;
  }
  try {
    writeReceiptEntry({
      schemaVersion: "sweep-merged-worktrees.mutation-progress.v1",
      phase: "started",
      manifestSha256: authorization.manifestSha256,
      expectedLiveMainSha: args.expectedLiveMainSha,
      startedAt,
      leaseIdentity,
      repositoryIdentity: repositoryTuple.remoteIdentity ?? null,
      targets: authorization.manifest.targets.map((target) => ({
        path: redactSecretLikePath(target.path),
        branch: redactSecretLikePath(target.branch ?? "(detached)"),
        head: target.head,
        topologyFingerprint: target.topologyFingerprint,
      })),
    });
  } catch {
    let release;
    try { release = normalizeLeaseReleaseResult(runtime.releaseFleetMutationLease(fleetLease, leaseIdentity)); }
    catch { release = { released: false, phase: "exception" }; }
    const preTopologyFingerprint = fingerprintFleet(worktrees);
    const finalTopologyEvidence = readPostfailureTopologyEvidence();
    const startedFailureReason = [
      "durable started receipt write failed",
      ...(!finalTopologyEvidence.available
        ? ["postfailure topology evidence unavailable"]
        : []),
    ].join("; ");
    let terminalAvailable = true;
    try {
      writeReceiptEntry({
        ...createPostflightReceipt({
          manifestSha256: authorization.manifestSha256,
          expectedLiveMainSha: args.expectedLiveMainSha,
          observedLiveMainSha: isAcceptedLiveMainEvidence(liveMainEvidence) ? liveMainEvidence.sha : null,
          startedAt,
          completedAt: startedAt,
          preTopologyFingerprint,
          postTopologyFingerprint: finalTopologyEvidence.fingerprint,
          finalTopologyEvidence,
          batchOutcome: { status: "blocked", reason: startedFailureReason },
          results: authorization.manifest.targets.map((target) => ({
            ...target,
            path: target.path,
            branch: target.branch ?? "(detached)",
            status: "skipped",
            reason: startedFailureReason,
          })),
        }),
        phase: "terminal",
        leaseIdentity,
        leaseRelease: release,
      });
    } catch { terminalAvailable = false; }
    try { runtime.closeReceipt(receiptFd, args.receiptPath); }
    catch { runtime.error("sweep warning: receipt descriptor close failed after durability decision"); }
    runtime.error(terminalAvailable
      ? "sweep refused: durable started receipt write failed"
      : `sweep refused: terminal unavailable; lease may remain=${release.released !== true}`);
    return 1;
  }

  let execution;
  try {
    execution = runAuthorizedApply({
      authorization,
      expectedLiveMainSha: args.expectedLiveMainSha,
      repositoryIdentity,
      primaryRoot,
      expectedCommonGitDir,
      upstream,
      defaultBranch,
      minAgeDays: args.minAgeDays,
      startedAt,
      frozenNow: startedAt,
    }, {
      readManifestBytes: readLockedManifest,
      readLiveMainEvidence: () => runtime.readLiveMainEvidence(primaryRoot, defaultBranch, { repositoryTuple }),
      readOpenPrEvidence: () => runtime.readOpenPrEvidence(primaryRoot, {
        repositoryIdentity: repositoryTuple.remoteIdentity,
        repositoryTuple,
      }),
      readWorktrees: () => runtime.readWorktrees(primaryRoot, { repositoryTuple }),
      readPathAbsenceEvidence: (path) => runtime.readPathAbsenceEvidence(path),
      readTargetBoundaryEvidence: (path) => runtime.readTargetBoundaryEvidence(path),
      readActiveProcessEvidence: (path) => runtime.readActiveProcessEvidence(path),
      inspectWorktree: (wt, target, evidence) => runtime.inspectWorktree(
        wt,
        target,
        evidence,
        { primaryRoot, expectedCommonGitDir, frozenNow: startedAt, repositoryTuple },
      ),
      removeWorktree: (command) => runtime.removeWorktree(command, primaryRoot, repositoryTuple),
      now: () => runtime.now(),
      beforeMutation: () => runtime.beforeMutation?.(),
      revalidateFleetLease: () => runtime.revalidateFleetMutationLease?.(fleetLease, leaseIdentity) === true,
      validateReceiptBinding: () => runtime.validateReceiptDurability?.(receiptFd) === true,
      writeCheckpoint: (checkpoint) => writeReceiptEntry({
        ...checkpoint,
        manifestSha256: authorization.manifestSha256,
        expectedLiveMainSha: args.expectedLiveMainSha,
        leaseIdentity,
      }),
    });
  } catch {
    const batchOutcome = { status: "blocked", reason: "apply engine failed closed" };
    execution = {
      ok: false,
      postflightReason: batchOutcome.reason,
      receipt: createPostflightReceipt({
        manifestSha256: authorization.manifestSha256,
        expectedLiveMainSha: args.expectedLiveMainSha,
        observedLiveMainSha: null,
        startedAt,
        completedAt: startedAt,
        preTopologyFingerprint: fingerprintFleet(worktrees),
        postTopologyFingerprint: null,
        finalTopologyEvidence: { available: false, fingerprint: null },
        batchOutcome,
        results: authorization.manifest.targets.map((target) => ({
          path: target.path,
          branch: target.branch ?? "(detached)",
          status: "failed",
          reason: "apply engine failed closed",
        })),
      }),
    };
  }
  let leaseRelease;
  try {
    leaseRelease = normalizeLeaseReleaseResult(runtime.releaseFleetMutationLease?.(fleetLease, leaseIdentity));
  } catch {
    leaseRelease = { released: false, phase: "exception" };
  }
  if (!leaseRelease.released) {
    const reason = `lease release failed at ${leaseRelease.phase}`;
    execution.ok = false;
    execution.postflightReason = reason;
    execution.receipt.batchOutcome = { status: "blocked", reason };
  }
  let receiptDurabilityFailed = false;
  try {
    writeReceiptEntry({ ...execution.receipt, phase: "terminal", leaseIdentity, leaseRelease });
  } catch {
    receiptDurabilityFailed = true;
  } finally {
    try { runtime.closeReceipt(receiptFd, args.receiptPath); }
    catch { runtime.error("sweep warning: receipt descriptor close failed after authoritative terminal"); }
  }
  if (receiptDurabilityFailed) {
    runtime.error("sweep refused: durable receipt write failed");
    return 1;
  }

  for (const result of execution.receipt.results) {
    runtime.log(`  ${result.status.padEnd(7)} ${result.branch} — ${result.reason ?? "authorized removal complete"}`);
  }
  runtime.log(`postflight receipt: ${redactSecretLikePath(args.receiptPath)}`);
  if (execution.postflightReason) runtime.log(`BLOCKED: ${execution.postflightReason}`);
  return execution.ok ? 0 : 1;
}

if (
  process.argv[1]
  && import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) process.exit(main(process.argv.slice(2)));
