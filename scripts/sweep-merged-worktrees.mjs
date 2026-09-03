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
import { createHash } from "node:crypto";
import {
  accessSync, closeSync, constants as fsConstants, existsSync, fstatSync, lstatSync, openSync,
  readFileSync, realpathSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";

export const MAX_APPLY_TARGETS = 5;
const OPEN_PR_QUERY_LIMIT = 1000;
const APPLY_MANIFEST_SCHEMA = "sweep-merged-worktrees.apply-manifest.v1";
const OBJECT_ID_PATTERN = /^[0-9a-f]{40}(?:[0-9a-f]{24})?$/i;
const SHA256_PATTERN = /^[0-9a-f]{64}$/i;
const CONTAMINATING_GIT_ENV_KEYS = Object.freeze([
  "GIT_DIR",
  "GIT_WORK_TREE",
  "GIT_COMMON_DIR",
  "GIT_INDEX_FILE",
  "GIT_OBJECT_DIRECTORY",
  "GIT_ALTERNATE_OBJECT_DIRECTORIES",
]);

export function sha256Text(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function sanitizedGitEnvironment(source = process.env) {
  const environment = { ...source };
  for (const key of CONTAMINATING_GIT_ENV_KEYS) delete environment[key];
  environment.GIT_OPTIONAL_LOCKS = "0";
  return environment;
}

function noOptionalLocks(args) {
  return args[0] === "--no-optional-locks" ? args : ["--no-optional-locks", ...args];
}

function executeGit(execFile, args, options = {}) {
  return execFile("git", noOptionalLocks(args), {
    ...options,
    env: sanitizedGitEnvironment(options.env ?? process.env),
  });
}

function decodeImmutableManifest(manifestBytes) {
  if (!(manifestBytes instanceof Uint8Array)) {
    throw new TypeError("immutable manifest must be supplied as raw bytes");
  }
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(manifestBytes);
  } catch {
    throw new TypeError("immutable manifest is not valid UTF-8");
  }
}

function isCanonicalIsoDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const timestamp = Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === value;
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

export function parseOpenPrEvidence(raw, { queryLimit = null } = {}) {
  let records;
  try { records = JSON.parse(raw); }
  catch {
    return {
      available: false,
      complete: false,
      reason: "GitHub PR evidence is malformed",
      openByBranch: new Map(),
      openByHead: new Map(),
    };
  }
  if (
    !Array.isArray(records)
    || records.some((record) => (
      !Number.isInteger(record?.number)
      || record.number < 1
      || typeof record.headRefName !== "string"
      || !record.headRefName
      || !OBJECT_ID_PATTERN.test(record.headRefOid ?? "")
    ))
  ) return {
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

function readManifestByBoundDescriptor(path, { afterBoundary } = {}) {
  const admission = readExternalPathEvidence(path, { kind: "manifest" });
  if (!admission.available || admission.absent !== false) throw new Error(admission.reason);
  afterBoundary?.();
  let fd;
  try {
    fd = openSync(path, fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW);
    const beforeRead = nodeIdentity(fstatSync(fd));
    if (!sameNodeIdentity(beforeRead, admission.identity)) {
      throw new Error("manifest identity changed after boundary admission");
    }
    const bytes = readFileSync(fd);
    const afterRead = nodeIdentity(fstatSync(fd));
    if (!sameNodeIdentity(afterRead, admission.identity)) {
      throw new Error("manifest identity changed during read");
    }
    return bytes;
  } finally {
    if (fd !== undefined) closeSync(fd);
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

function reserveReceiptByBoundParent(path, { afterBoundary, spawn = spawnSync } = {}) {
  const admission = readExternalPathEvidence(path, { kind: "receipt" });
  if (!admission.available || admission.absent !== true) throw new Error(admission.reason);
  afterBoundary?.();
  const child = spawn(
    process.execPath,
    ["--input-type=module", "-e", RECEIPT_RESERVATION_CHILD_SOURCE, admission.parentIdentity.dev, admission.parentIdentity.ino, basename(path)],
    {
      cwd: dirname(path),
      env: { PATH: process.env.PATH ?? "" },
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  if (child.error || child.status !== 0 || String(child.stderr ?? "") !== "") {
    throw new Error("receipt reservation child failed closed");
  }
  let created;
  try { created = JSON.parse(String(child.stdout ?? "")); }
  catch { throw new Error("receipt reservation child output was malformed"); }
  if (
    !created
    || typeof created.dev !== "string"
    || typeof created.ino !== "string"
    || !/^\d+$/.test(created.dev)
    || !/^\d+$/.test(created.ino)
  ) throw new Error("receipt reservation child output was invalid");

  let fd;
  try {
    fd = openSync(path, fsConstants.O_WRONLY | fsConstants.O_NOFOLLOW);
    const opened = nodeIdentity(fstatSync(fd));
    if (!sameNodeIdentity(opened, created)) throw new Error("receipt identity changed after reservation");
    return fd;
  } catch (error) {
    if (fd !== undefined) closeSync(fd);
    throw error;
  }
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
  return { ok: true, reason: decision.reason };
}

export function buildWorktreeRemoveCommand(path) {
  return { file: "git", args: ["worktree", "remove", "--", path] };
}

/** The sweep has exactly one permitted mutation: local, non-force removal. */
export function isAllowedSweepMutation(file, args) {
  return file === "git"
    && Array.isArray(args)
    && args.length === 4
    && args[0] === "worktree"
    && args[1] === "remove"
    && args[2] === "--"
    && typeof args[3] === "string"
    && args[3].startsWith("/")
    && !args.some((arg) => /force/i.test(arg));
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
    ...(result.expectedCloseoutDate ? { expectedCloseoutDate: result.expectedCloseoutDate } : {}),
    ...(result.allowedAction ? { allowedAction: result.allowedAction } : {}),
    status: result.status,
    reason: redactSecretLikePath(result.reason),
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
    invariants: { forceUsed: false, remoteDeletionAttempted: false },
    batchOutcome: {
      status: batchOutcome.status,
      reason: redactSecretLikePath(batchOutcome.reason),
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

/**
 * Execute an already-authorized batch through injected evidence providers.
 * Every target gets a batch preflight and a second complete revalidation in the
 * same synchronous turn immediately before the only permitted mutation.
 */
export function runAuthorizedApply({
  authorization,
  expectedLiveMainSha,
  primaryRoot,
  upstream,
  defaultBranch,
  minAgeDays,
  startedAt,
}, deps) {
  const targets = authorization.manifest.targets;
  let expectedFleet = null;
  let preTopologyFingerprint = null;
  let batchStopReason = null;
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
    try { decodeImmutableManifest(manifestBytes); }
    catch { return { ok: false, reason: "immutable manifest is not valid UTF-8" }; }
    if (sha256Text(manifestBytes) !== authorization.manifestSha256) {
      return { ok: false, reason: "immutable manifest digest drift" };
    }

    let liveMainEvidence;
    try { liveMainEvidence = deps.readLiveMainEvidence(); }
    catch { liveMainEvidence = { available: false, sha: null, source: null }; }
    if (
      !liveMainEvidence?.available
      || liveMainEvidence.source !== "git-ls-remote"
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
      current = deps.inspectWorktree(registered, target, { liveMainEvidence, prEvidence });
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
      try { removal = deps.removeWorktree(command); }
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
      results.push({
        path: target.path,
        branch: target.branch ?? "(detached)",
        status: removedAndProved ? "removed" : "failed",
        reason: removedAndProved
          ? null
          : postRemovalReason ?? removal?.reason ?? "git worktree remove failed",
        ...(postRemovalEvidence ? { postRemovalEvidence } : {}),
      });
      if (!removedAndProved || postRemovalFleetDrift) {
        stopRemaining(
          postRemovalFleetDrift
          ?? postRemovalReason
          ?? removal?.reason
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
        expectedCloseoutDate: target.expectedCloseoutDate,
        allowedAction: target.allowedAction,
      } : {}),
      ...result,
    };
  });
  const postflightCurrent = observedLiveMain?.available
    && observedLiveMain.source === "git-ls-remote"
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
  try { completedAt = deps.now(); }
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
    !liveMainEvidence?.available
    || liveMainEvidence.source !== "git-ls-remote"
    || !OBJECT_ID_PATTERN.test(liveMainEvidence.sha ?? "")
  ) return { ok: false, reason: "live remote-main evidence unavailable" };

  let manifestText;
  try { manifestText = decodeImmutableManifest(manifestBytes); }
  catch { return { ok: false, reason: "immutable manifest is not valid UTF-8" }; }
  let manifest;
  try { manifest = JSON.parse(manifestText); }
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
  return { ok: true, manifest, manifestSha256 };
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

function git(args, opts = {}) {
  return String(executeGit(execFileSync, args, { encoding: "utf8", ...opts })).trim();
}
function gitQuiet(args, opts = {}) {
  try { return git(args, opts); } catch { return null; }
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

function readBoundWorktreeGitContext(
  worktreePath,
  {
    execFile = execFileSync,
    realpath = realpathSync,
    expectedCommonGitDir = null,
  } = {},
) {
  const physicalWorktreePath = realpath(worktreePath);
  if (!isAbsolute(physicalWorktreePath) || physicalWorktreePath.includes("\0")) {
    throw new Error("physical worktree evidence is unavailable");
  }
  const raw = executeGit(
    execFile,
    ["-C", physicalWorktreePath, "rev-parse", "--absolute-git-dir"],
    { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
  );
  const gitDir = parseSingleGitPath(raw);
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
    expectedCommonGitDir = null,
  } = {},
) {
  try {
    const binding = readBoundWorktreeGitContext(worktreePath, {
      execFile,
      realpath,
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

/** Parse `git worktree list --porcelain` into records. */
export function parseWorktreeList(porcelain) {
  const out = [];
  let cur = null;
  for (const line of porcelain.split("\n")) {
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
      maxBuffer: 16 * 1024 * 1024,
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
export function decide(wt, ctx) {
  if (wt.bare) return { action: "skip", reason: "bare repository" };
  if (wt.locked) return { action: "skip", reason: "worktree registration is locked" };
  if (wt.prunable) return { action: "skip", reason: "worktree registration is prunable" };
  if (wt.path === ctx.primaryRoot) return { action: "skip", reason: "primary checkout" };
  // A checkout of the integration branch is a standing reference, and it is
  // merged-by-definition, so every other rule would happily delete it.
  if (wt.branch && wt.branch === ctx.defaultBranch)
    return { action: "skip", reason: `checkout of the default branch (${ctx.defaultBranch})` };
  if (
    !ctx.liveMainEvidence?.available
    || ctx.liveMainEvidence.source !== "git-ls-remote"
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
  if (wt.ageDays !== null && ctx.minAgeDays > 0 && wt.ageDays < ctx.minAgeDays)
    return { action: "skip", reason: `younger than --min-age-days ${ctx.minAgeDays}` };
  if (wt.prEvidence.openPr) return { action: "skip", reason: `open PR #${wt.prEvidence.openPr}` };
  if (wt.mergedIntoUpstream) return { action: "retire", reason: `commits already on ${ctx.upstream}` };
  return { action: "skip", reason: "HEAD is not anchored to live remote main" };
}

/** Query the remote directly; a cached tracking ref is never evidence here. */
export function readLiveMainEvidence(
  cwd,
  branch = "main",
  { execFile = execFileSync } = {},
) {
  try {
    const raw = executeGit(
      execFile,
      ["ls-remote", "--heads", "origin", `refs/heads/${branch}`],
      { encoding: "utf8", cwd, stdio: ["ignore", "pipe", "ignore"] },
    );
    return parseLiveRemoteHead(raw, branch);
  } catch {
    return { available: false, sha: null, source: null };
  }
}

/** Live map of branch -> open PR number, fail-closed when GitHub cannot answer. */
export function readOpenPrEvidence(
  cwd,
  { execFile = execFileSync, queryLimit = OPEN_PR_QUERY_LIMIT } = {},
) {
  try {
    const raw = execFile(
      "gh",
      ["pr", "list", "--state", "open", "--limit", String(queryLimit), "--json", "number,headRefName,headRefOid"],
      {
        encoding: "utf8",
        cwd,
        stdio: ["ignore", "pipe", "ignore"],
        env: sanitizedGitEnvironment(),
      },
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
      "lsof",
      ["-n", "-P", "+D", path, "-Fp"],
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
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

function readDetachedAnchorEvidence(target, wt, cwd) {
  if (!wt.detached) return null;
  const anchor = target?.detachedAnchor;
  if (!anchor) return { available: false, ref: null, sha: null, immutable: false };
  const objectType = gitQuiet(["cat-file", "-t", anchor.ref], { cwd });
  const resolvedSha = gitQuiet(["rev-parse", `${anchor.ref}^{commit}`], { cwd });
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
    expectedCommonGitDir = null,
  } = {},
) {
  if (!hits.length) return [];
  const rel = hits.map((h) => h.path.slice(dir.length + 1));
  let binding;
  try {
    binding = readBoundWorktreeGitContext(dir, { execFile, realpath, expectedCommonGitDir });
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
  { primaryRoot, expectedCommonGitDir, liveMainEvidence, prEvidence },
) {
  const current = { ...wt };
  current.exists = existsSync(current.path);
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
    && gitQuiet(["merge-base", "--is-ancestor", current.head, liveMainEvidence.sha], { cwd: primaryRoot }) !== null
  );
  current.containedIn = [];
  const iso = current.head ? gitQuiet(["log", "-1", "--format=%cI", current.head], { cwd: primaryRoot }) : null;
  current.ageDays = iso ? Math.floor((Date.now() - Date.parse(iso)) / 86400000) : null;
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
  current.detachedAnchorEvidence = readDetachedAnchorEvidence(target, current, primaryRoot);
  return current;
}

function pathContains(parent, child) {
  const rel = relative(resolve(parent), resolve(child));
  return rel === "" || (rel !== ".." && !rel.startsWith(`..${sep}`));
}

export function createRuntimeProviders() {
  return {
    resolvePrimaryRoot: () => (
      git(["rev-parse", "--path-format=absolute", "--git-common-dir"]).replace(/\/\.git$/, "")
    ),
    resolveCommonGitDir: (primaryRoot) => (
      git(["rev-parse", "--path-format=absolute", "--git-common-dir"], { cwd: primaryRoot })
    ),
    readLiveMainEvidence: (primaryRoot, branch) => readLiveMainEvidence(primaryRoot, branch),
    readOpenPrEvidence: (primaryRoot) => readOpenPrEvidence(primaryRoot),
    readExternalPathEvidence: (path, kind) => readExternalPathEvidence(path, { kind }),
    readImmutableManifest: (path, options) => readManifestByBoundDescriptor(path, options),
    readPathAbsenceEvidence: (path) => readPathAbsenceEvidence(path),
    readWorktrees: (primaryRoot) => (
      parseWorktreeList(git(["worktree", "list", "--porcelain"], { cwd: primaryRoot }))
    ),
    inspectWorktree: (wt, target, evidence, context) => inspectRuntimeWorktree(wt, target, {
      primaryRoot: context.primaryRoot,
      expectedCommonGitDir: context.expectedCommonGitDir,
      liveMainEvidence: evidence.liveMainEvidence,
      prEvidence: evidence.prEvidence,
    }),
    reserveReceipt: (path, options) => reserveReceiptByBoundParent(path, options),
    writeReceipt: (handle, text) => writeFileSync(handle, text, { encoding: "utf8" }),
    closeReceipt: (handle) => closeSync(handle),
    removeWorktree(command, primaryRoot) {
      try {
        executeGit(execFileSync, command.args, {
          cwd: primaryRoot,
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
  try {
    expectedCommonGitDir = runtime.resolveCommonGitDir
      ? runtime.resolveCommonGitDir(primaryRoot)
      : join(primaryRoot, ".git");
    if (!isAbsolute(expectedCommonGitDir) || expectedCommonGitDir.includes("\0")) {
      throw new Error("invalid common repository path");
    }
  } catch {
    runtime.error("sweep refused: cannot resolve the expected common repository");
    return 1;
  }
  const defaultBranch = "main";
  const upstream = "origin/main";
  let liveMainEvidence;
  try { liveMainEvidence = runtime.readLiveMainEvidence(primaryRoot, defaultBranch); }
  catch { liveMainEvidence = { available: false, sha: null, source: null }; }
  let prEvidence;
  try { prEvidence = runtime.readOpenPrEvidence(primaryRoot); }
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
  try { worktrees = runtime.readWorktrees(primaryRoot); }
  catch {
    runtime.error("sweep refused: worktree topology is unavailable");
    return 1;
  }
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
      { primaryRoot, expectedCommonGitDir },
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
      githubPrEvidenceAvailable: prEvidence.available,
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
    if (!liveMainEvidence.available) runtime.log("BLOCKED: live remote-main evidence unavailable.");
    if (!prEvidence.available || prEvidence.complete !== true) {
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
      liveMainEvidence.available
      && prEvidence.available
      && prEvidence.complete === true
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

  let execution;
  try {
    execution = runAuthorizedApply({
      authorization,
      expectedLiveMainSha: args.expectedLiveMainSha,
      primaryRoot,
      upstream,
      defaultBranch,
      minAgeDays: args.minAgeDays,
      startedAt,
    }, {
      readManifestBytes: readLockedManifest,
      readLiveMainEvidence: () => runtime.readLiveMainEvidence(primaryRoot, defaultBranch),
      readOpenPrEvidence: () => runtime.readOpenPrEvidence(primaryRoot),
      readWorktrees: () => runtime.readWorktrees(primaryRoot),
      readPathAbsenceEvidence: (path) => runtime.readPathAbsenceEvidence(path),
      inspectWorktree: (wt, target, evidence) => runtime.inspectWorktree(
        wt,
        target,
        evidence,
        { primaryRoot, expectedCommonGitDir },
      ),
      removeWorktree: (command) => runtime.removeWorktree(command, primaryRoot),
      now: () => runtime.now(),
      beforeMutation: () => runtime.beforeMutation?.(),
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
  try {
    runtime.writeReceipt(receiptFd, `${JSON.stringify(execution.receipt, null, 2)}\n`);
  } finally {
    runtime.closeReceipt(receiptFd);
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
