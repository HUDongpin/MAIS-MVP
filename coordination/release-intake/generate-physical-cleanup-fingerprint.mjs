#!/usr/bin/env node

import crypto from "node:crypto";
import { isUtf8 } from "node:buffer";
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  listWorktrees,
  scanFile,
  scanReviewedLegacyUntrackedExactTextFile
} from "./evidence-archive-lib.mjs";

const DEFAULT_CANONICAL_ROOT = "/Users/dongpinhu/Desktop/MAIS-MVP";
const DEFAULT_SNAPSHOT_REF = "c0ec06760";
const FILE_HASH_CHUNK_BYTES = 1024 * 1024;
const PUBLICATION_VERIFIER = Symbol("publicationVerifier");

function compareUtf8(left, right) {
  return Buffer.compare(Buffer.from(left), Buffer.from(right));
}

function sha256Buffer(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function collectAvailableGarbage() {
  if (typeof globalThis.gc === "function") globalThis.gc();
}

function canonicalRelativePath(relativePath) {
  if (typeof relativePath !== "string" || relativePath.length === 0 || relativePath.includes("\0")) {
    throw new Error("dirty relative path must be a non-empty NUL-free string");
  }
  const normalized = relativePath;
  if (normalized.startsWith("/") || normalized === ".." || normalized.startsWith("../")
    || normalized.includes("/../") || normalized.endsWith("/..")) {
    throw new Error(`dirty relative path escapes its worktree: ${JSON.stringify(relativePath)}`);
  }
  return normalized;
}

function absoluteDirtyPath(worktreePath, relativePath) {
  const normalized = canonicalRelativePath(relativePath);
  const absolutePath = path.resolve(worktreePath, ...normalized.split("/"));
  const relative = path.relative(path.resolve(worktreePath), absolutePath);
  if (relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new Error(`dirty relative path escapes its worktree: ${JSON.stringify(relativePath)}`);
  }
  return absolutePath;
}

export function parsePorcelainZ(buffer) {
  if (!Buffer.isBuffer(buffer)) throw new TypeError("porcelain inventory must be a Buffer");
  if (buffer.length === 0) return [];
  if (buffer[buffer.length - 1] !== 0) {
    throw new Error("porcelain v1 -z inventory is missing its final NUL delimiter");
  }
  const fields = [];
  let start = 0;
  for (let index = 0; index < buffer.length; index += 1) {
    if (buffer[index] !== 0) continue;
    const field = buffer.subarray(start, index);
    if (!isUtf8(field)) throw new Error("porcelain status path is not valid UTF-8");
    fields.push(field.toString("utf8"));
    start = index + 1;
  }
  const entries = [];
  for (let index = 0; index < fields.length; index += 1) {
    const field = fields[index];
    if (field.length < 4 || field[2] !== " ") {
      throw new Error("invalid porcelain v1 -z status record");
    }
    const status = field.slice(0, 2);
    if (!/^[ MADRCU?!]{2}$/u.test(status)) throw new Error("invalid porcelain v1 -z XY status");
    const relativePath = field.slice(3);
    if (relativePath.length === 0) throw new Error("porcelain status path must not be empty");
    canonicalRelativePath(relativePath);
    const entry = { status, relativePath };
    if (/[RC]/u.test(status)) {
      index += 1;
      const historicalPath = fields[index];
      if (historicalPath === undefined || historicalPath.length === 0) {
        throw new Error("rename/copy porcelain status is missing its historical path");
      }
      canonicalRelativePath(historicalPath);
      entry.historicalPath = historicalPath;
    }
    entries.push(entry);
  }
  return entries;
}

export function isSecretLikePath(relativePath) {
  if (typeof relativePath !== "string" || relativePath.length === 0) return false;
  const normalized = relativePath.replaceAll("\\", "/");
  const lower = normalized.toLowerCase();
  const segments = lower.split("/");
  const basename = segments.at(-1) ?? "";
  if (normalized === ".env.example" || normalized === ".env.local.example") return false;
  if (segments.some((segment) => segment.startsWith(".env"))) return true;
  if (basename === "all api keys.docx") return true;
  if (segments.some((segment) => /^(?:credentials?|secrets?|private-keys?|private_keys?)$/u.test(segment))) {
    return true;
  }
  if (/^(?:credentials|secrets)(?:[._-]|$)/u.test(basename)) return true;
  if (/^(?:id_rsa|id_dsa|id_ecdsa|id_ed25519)(?:\..*)?$/u.test(basename)) return true;
  if (/(?:^|[._-])(?:client[_-]?secret|api[_-]?key|private[_-]?key|service[_-]?account)(?:[._-]|$)/u.test(basename)) {
    return true;
  }
  if (/\.(?:key|p12|pfx|jks|keystore)$/u.test(basename)) return true;
  return false;
}

function modeString(stat) {
  return (Number(stat.mode) & 0o177777).toString(8).padStart(6, "0");
}

function statKind(stat) {
  if (stat.isFile()) return "file";
  if (stat.isSymbolicLink()) return "symlink";
  if (stat.isDirectory()) return "directory";
  return "other";
}

function exactStatSize(value) {
  const size = typeof value === "bigint" ? value : BigInt(value);
  return size <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(size) : size.toString(10);
}

function sameFileIdentity(left, right) {
  return left.dev === right.dev
    && left.ino === right.ino
    && left.mode === right.mode
    && left.size === right.size
    && left.mtimeNs === right.mtimeNs
    && left.ctimeNs === right.ctimeNs;
}

function sameLstatIdentity(left, right) {
  return left.dev === right.dev
    && left.ino === right.ino
    && left.mode === right.mode
    && left.size === right.size
    && (left.mtimeNs ?? left.mtimeMs) === (right.mtimeNs ?? right.mtimeMs)
    && (left.ctimeNs ?? left.ctimeMs) === (right.ctimeNs ?? right.ctimeMs);
}

function hashRegularFileNoFollow(absolutePath) {
  const flags = fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW ?? 0);
  const descriptor = fs.openSync(absolutePath, flags);
  try {
    const before = fs.fstatSync(descriptor, { bigint: true });
    if (!before.isFile()) throw new Error(`dirty hash target is no longer a regular file: ${absolutePath}`);
    const hash = crypto.createHash("sha256");
    const chunk = Buffer.allocUnsafe(FILE_HASH_CHUNK_BYTES);
    let position = 0;
    while (true) {
      const bytesRead = fs.readSync(descriptor, chunk, 0, chunk.length, position);
      if (bytesRead === 0) break;
      hash.update(chunk.subarray(0, bytesRead));
      position += bytesRead;
    }
    const after = fs.fstatSync(descriptor, { bigint: true });
    if (!sameFileIdentity(before, after)) {
      throw new Error(`dirty file drifted while hashing: ${absolutePath}`);
    }
    return hash.digest("hex");
  } finally {
    fs.closeSync(descriptor);
  }
}

export function inspectDirtyEntry(worktreePath, entry, io = {}) {
  if (!entry || typeof entry.status !== "string" || typeof entry.relativePath !== "string") {
    throw new TypeError("dirty entry must include status and relativePath");
  }
  const absolutePath = absoluteDirtyPath(worktreePath, entry.relativePath);
  const lstatSync = io.lstatSync ?? ((candidate) => fs.lstatSync(candidate, { bigint: true }));
  const hashFile = io.hashFile ?? hashRegularFileNoFollow;
  const readlinkSync = io.readlinkSync ?? fs.readlinkSync;
  const secretRedacted = isSecretLikePath(entry.relativePath)
    || (entry.historicalPath !== undefined && isSecretLikePath(entry.historicalPath));
  const base = {
    status: entry.status,
    relativePath: entry.relativePath,
    ...(entry.historicalPath === undefined ? {} : { historicalPath: entry.historicalPath })
  };
  let stat;
  try {
    stat = lstatSync(absolutePath);
  } catch (error) {
    if (error?.code !== "ENOENT" && error?.code !== "ENOTDIR") throw error;
    return {
      ...base,
      exists: false,
      kind: "missing",
      mode: null,
      size: null,
      sha256: null,
      secretRedacted
    };
  }
  const kind = statKind(stat);
  let sha256 = null;
  if (!secretRedacted && kind === "file") {
    sha256 = hashFile(absolutePath);
  } else if (!secretRedacted && kind === "symlink") {
    const target = readlinkSync(absolutePath, { encoding: "buffer" });
    sha256 = sha256Buffer(Buffer.isBuffer(target) ? target : Buffer.from(target));
  }
  const finalStat = lstatSync(absolutePath);
  if (!sameLstatIdentity(stat, finalStat)) {
    throw new Error(`dirty path drifted while inspecting metadata/content: ${entry.relativePath}`);
  }
  return {
    ...base,
    exists: true,
    kind,
    mode: modeString(stat),
    size: exactStatSize(stat.size),
    sha256,
    secretRedacted
  };
}

function classification(category, owner) {
  return { category, owner, manualReview: owner === "A10/A25" };
}

function inferredAgentFromCoordinationPath(relativePath) {
  const matches = relativePath.match(/(?:^|[-_/])(A(?:0[1-9]|1[0-9]|2[0-5]))(?:[-_.\/]|$)/gu) ?? [];
  if (matches.length === 0) return null;
  const normalized = matches.map((value) => value.match(/A(?:0[1-9]|1[0-9]|2[0-5])/u)?.[0]).filter(Boolean);
  return new Set(normalized).size === 1 ? normalized[0] : null;
}

export function classifyPath(relativePath) {
  const normalized = canonicalRelativePath(relativePath);
  const lower = normalized.toLowerCase();
  if (isSecretLikePath(normalized)) return classification("secret/manual", "A19");
  if (/^(?:\.local|\.next|\.tmp|node_modules|test-results|playwright-report|coverage)(?:\/|$)/u.test(lower)
    || /(?:^|\/)(?:\.ds_store|tsconfig\.tsbuildinfo)$/u.test(lower)) {
    return classification("local-generated", "A22");
  }
  if (lower.startsWith("coordination/")) {
    if (lower.startsWith("coordination/release-intake/")) return classification("coordination-evidence", "A25");
    if (lower.startsWith("coordination/integration/")) return classification("coordination-evidence", "A23");
    if (lower.startsWith("coordination/content-qa/")) {
      if (/exact|overlay|svg/u.test(lower)) return classification("coordination-evidence", "A24");
      if (/candidate|rag|generation|pipeline/u.test(lower)) return classification("coordination-evidence", "A21");
      return classification("coordination-evidence", "A18");
    }
    return classification("coordination-evidence", inferredAgentFromCoordinationPath(normalized) ?? "A10");
  }
  if (lower.startsWith("public/")) {
    if (lower.startsWith("public/question-illustrations/") && /\.(?:svg|json)$/u.test(lower)) {
      return classification("public/generated-assets", "A24");
    }
    return classification("public/generated-assets", "A21");
  }
  if (lower.startsWith("app/")) {
    if (lower === "app/globals.css") return classification("app", "A10");
    if (/^app\/practice\/(?:fishing-game|quadratic-bonus)(?:\/|$)/u.test(lower)) return classification("app", "A20");
    if (/^app\/api\/gamification\/(?:fishing-game|bonus-games\/quadratic)(?:\/|$)/u.test(lower)) return classification("app", "A20");
    if (/^app\/(?:dashboard|progress)(?:\/|$)/u.test(lower)) return classification("app", "A02");
    if (/^app\/(?:learning-path|secondary-roadmap)(?:\/|$)/u.test(lower)) return classification("app", "A03");
    if (/^app\/(?:practice|mistake-book)(?:\/|$)/u.test(lower)) return classification("app", "A04");
    if (/^app\/lesson(?:\/|$)/u.test(lower)) return classification("app", "A05");
    if (/^app\/(?:visualization-lab|student\/tools\/visualizations)(?:\/|$)/u.test(lower)) return classification("app", "A06");
    if (/^app\/api\/ai-tutor(?:\/|$)/u.test(lower)) return classification("app", "A07");
    if (/^app\/api\/adaptive-learning(?:\/|$)/u.test(lower)) return classification("app", "A15");
    if (/^app\/api(?:\/|$)/u.test(lower)) return classification("app", "A12");
    if (/^app\/teacher(?:\/|$)/u.test(lower)) return classification("app", "A13");
    if (/^app\/parent(?:\/|$)/u.test(lower)) return classification("app", "A14");
    if (/^app\/(?:games|student\/practice\/games)(?:\/|$)/u.test(lower)) return classification("app", "A20");
    if (/^app\/(?:layout\.tsx|page\.tsx)$/u.test(lower)) return classification("app", "A01");
    return classification("app", "A10/A25");
  }
  if (lower.startsWith("components/")) {
    if (lower === "components/visualizations/roadmapvisualizationsuite.tsx") return classification("components", "A03");
    if (/^components\/gamification\/(?:fishinggame|adventureislandgame|quadraticbonusgame)\.tsx$/u.test(lower)) {
      return classification("components", "A20");
    }
    if (/^components\/(?:layout|home|background)(?:\/|$)/u.test(lower)) return classification("components", "A01");
    if (/^components\/(?:dashboard|cards)(?:\/|$)/u.test(lower)) return classification("components", "A02");
    if (/^components\/learning(?:\/|$)/u.test(lower)) return classification("components", "A03");
    if (/^components\/practice(?:\/|$)/u.test(lower)) return classification("components", "A04");
    if (/^components\/lesson(?:\/|$)/u.test(lower)) return classification("components", "A05");
    if (/^components\/visualizations(?:\/|$)/u.test(lower)) return classification("components", "A06");
    if (/^components\/ai(?:\/|$)/u.test(lower)) return classification("components", "A07");
    if (/^components\/providers(?:\/|$)/u.test(lower)) return classification("components", "A08");
    if (/^components\/teacher(?:\/|$)/u.test(lower)) return classification("components", "A13");
    if (/^components\/parent(?:\/|$)/u.test(lower)) return classification("components", "A14");
    if (/^components\/gamification(?:\/|$)/u.test(lower)) return classification("components", "A17");
    if (/^components\/games(?:\/|$)/u.test(lower)) return classification("components", "A20");
    return classification("components", "A10/A25");
  }
  if (lower.startsWith("lib/")) {
    if (lower === "lib/i18n.ts") return classification("lib", "A09");
    if (/^lib\/(?:learninganalytics|utils|difficulty)(?:\.|$)/u.test(lower)) return classification("lib", "A08");
    if (/^lib\/server\/(?:auth|sessioncookie|userstore)(?:\.|$)/u.test(lower)) return classification("lib", "A12");
    if (/^lib\/server\/llmprovider(?:\.|$)/u.test(lower)) return classification("lib", "A07");
    if (/^lib\/adaptivelearning(?:\.|$)/u.test(lower)) return classification("lib", "A15");
    if (/^lib\/gamification(?:\.|$)/u.test(lower)) return classification("lib", "A17");
    if (/^lib\/gamebasedlearning(?:\.|$)/u.test(lower)) return classification("lib", "A20");
    if (/^lib\/rag(?:\/|\.|$)/u.test(lower)) return classification("lib", "A21");
    if (/^lib\/math(?:\.|$)/u.test(lower)) return classification("lib", "A06");
    return classification("lib", "A10/A25");
  }
  if (lower.startsWith("types/")) return classification("types", "A08");
  if (lower.startsWith("data/")) {
    if (/^data\/(?:progress|learninganalytics)(?:\.|$)/u.test(lower)) return classification("data", "A02");
    if (/^data\/(?:grades|topics)(?:\.|$)/u.test(lower)) return classification("data", "A03");
    if (/^data\/questions(?:\.|$)/u.test(lower)) return classification("data", "A04");
    if (/^data\/lessons(?:\.|$)/u.test(lower)) return classification("data", "A05");
    if (/^data\/visualizationlabs(?:\.|$)/u.test(lower)) return classification("data", "A06");
    if (/^data\/gamification(?:\.|$)/u.test(lower)) return classification("data", "A17");
    if (/^data\/gamebasedlearning(?:\.|$)/u.test(lower)) return classification("data", "A20");
    if (/^data\/(?:generated-content|rag)(?:\/|$)/u.test(lower)) return classification("data", "A21");
    return classification("data", "A10/A25");
  }
  if (lower.startsWith("tests/")) return classification("tests", "A11");
  if (lower.startsWith("scripts/")) {
    if (/cleanup-generated-artifacts/u.test(lower)) return classification("scripts", "A22");
    if (/(?:rag|content|question|illustration)/u.test(lower)) return classification("scripts", "A21");
    if (/(?:release|dirty|worktree|archive|fingerprint)/u.test(lower)) return classification("scripts", "A25");
    return classification("scripts", "A10");
  }
  if (/^(?:package\.json|package-lock\.json|npm-shrinkwrap\.json)$/u.test(lower)) {
    return classification("package", "A10");
  }
  if (/^(?:next\.config\.[^/]+|tsconfig(?:\.[^/]+)?\.json|tailwind\.config\.[^/]+|postcss\.config\.[^/]+|eslint\.config\.[^/]+|\.gitignore)$/u.test(lower)) {
    return classification("config", "A10");
  }
  if (/^(?:playwright\.config\.[^/]+|\.vercelignore)$/u.test(lower)) return classification("config", "A22");
  return classification("manual", "A10/A25");
}

export function buildDuplicateGroups(entries) {
  if (!Array.isArray(entries)) throw new TypeError("duplicate candidates must be an array");
  const groups = new Map();
  for (const entry of entries) {
    if (!entry || entry.exists !== true || entry.secretRedacted === true
      || !["file", "symlink"].includes(entry.kind)
      || typeof entry.sha256 !== "string" || !/^[0-9a-f]{64}$/u.test(entry.sha256)
      || typeof entry.worktreePath !== "string" || entry.worktreePath.length === 0) {
      continue;
    }
    const basis = {
      relativePath: entry.relativePath,
      kind: entry.kind,
      mode: entry.mode,
      size: entry.size,
      sha256: entry.sha256
    };
    const key = JSON.stringify(basis);
    const group = groups.get(key) ?? { basis, occurrences: new Map() };
    if (!group.occurrences.has(entry.worktreePath)) {
      group.occurrences.set(entry.worktreePath, {
        worktreePath: entry.worktreePath,
        branch: entry.branch,
        status: entry.status
      });
    }
    groups.set(key, group);
  }
  return [...groups.values()]
    .filter((group) => group.occurrences.size > 1)
    .map(({ basis, occurrences }) => ({
      groupId: sha256Buffer(Buffer.from(JSON.stringify(basis))),
      ...basis,
      occurrences: [...occurrences.values()].sort((left, right) => (
        compareUtf8(left.worktreePath, right.worktreePath) || compareUtf8(left.branch ?? "", right.branch ?? "")
      ))
    }))
    .sort((left, right) => compareUtf8(left.relativePath, right.relativePath) || compareUtf8(left.groupId, right.groupId));
}

export function evaluateRemovalGate({
  access,
  dirtyCount,
  branchMergedIntoMain,
  uniqueCommitCount,
  dirtyPathsPreserved
} = {}) {
  const checks = {
    access: access === true,
    cleanWorktree: Number.isSafeInteger(dirtyCount) && dirtyCount === 0,
    branchSafe: branchMergedIntoMain === true || uniqueCommitCount === 0,
    dirtyPathsPreserved: dirtyPathsPreserved === true
  };
  const passedBy = checks.branchSafe
    ? branchMergedIntoMain === true
      ? "merged-into-main"
      : "no-branch-unique-commits"
    : null;
  const blockers = [];
  if (!checks.access) blockers.push("worktree access is not explicitly confirmed");
  if (!checks.cleanWorktree) blockers.push("dirty entry count is not exactly zero");
  if (!checks.branchSafe) blockers.push("branch is unmerged and has branch-unique commits");
  if (!checks.dirtyPathsPreserved) blockers.push("prior dirty paths are not all in main or a verified archive");
  return { checks, branchSafetyPassedBy: passedBy, eligibleForRemoval: blockers.length === 0, blockers };
}

function requireValue(argv, index, option) {
  const value = argv[index + 1];
  if (value === undefined || value.startsWith("--")) throw new Error(`${option} requires a value`);
  return value;
}

export function parseCliArgs(argv) {
  if (!Array.isArray(argv)) throw new TypeError("CLI arguments must be an array");
  const options = {
    dryRun: false,
    repoRoot: process.cwd(),
    mainRef: "main",
    canonicalRoot: DEFAULT_CANONICAL_ROOT,
    snapshotRef: DEFAULT_SNAPSHOT_REF,
    outputJson: null,
    outputMarkdown: null,
    worktreePath: null,
    help: false
  };
  const seen = new Set();
  for (let index = 0; index < argv.length; index += 1) {
    const option = argv[index];
    if (option === "--dry-run" || option === "--help") {
      if (seen.has(option)) throw new Error(`duplicate CLI option: ${option}`);
      seen.add(option);
      options[option === "--dry-run" ? "dryRun" : "help"] = true;
      continue;
    }
    const key = new Map([
      ["--repo-root", "repoRoot"],
      ["--main-ref", "mainRef"],
      ["--canonical-root", "canonicalRoot"],
      ["--snapshot-ref", "snapshotRef"],
      ["--output-json", "outputJson"],
      ["--output-markdown", "outputMarkdown"],
      ["--worktree-path", "worktreePath"]
    ]).get(option);
    if (!key) throw new Error(`unknown CLI option: ${option}`);
    if (seen.has(option)) throw new Error(`duplicate CLI option: ${option}`);
    seen.add(option);
    options[key] = requireValue(argv, index, option);
    index += 1;
  }
  if (options.help) return options;
  if ((options.outputJson === null) !== (options.outputMarkdown === null)) {
    throw new Error("--output-json and --output-markdown must be provided together");
  }
  if (options.dryRun && options.outputJson !== null) {
    throw new Error("--dry-run cannot be combined with output paths");
  }
  if (!options.dryRun && options.outputJson === null) {
    throw new Error("without output paths the command requires --dry-run");
  }
  if (options.worktreePath !== null && !options.dryRun) {
    throw new Error("--worktree-path is only valid with --dry-run");
  }
  options.repoRoot = path.resolve(options.repoRoot);
  options.canonicalRoot = path.resolve(options.canonicalRoot);
  if (options.outputJson !== null) options.outputJson = path.resolve(options.outputJson);
  if (options.outputMarkdown !== null) options.outputMarkdown = path.resolve(options.outputMarkdown);
  if (options.worktreePath !== null) options.worktreePath = path.resolve(options.worktreePath);
  if (options.outputJson !== null && options.outputJson === options.outputMarkdown) {
    throw new Error("JSON and Markdown output paths must be distinct");
  }
  return options;
}

function markdownCode(value) {
  return `\`${JSON.stringify(String(value))}\``;
}

function markdownCell(value) {
  return String(value ?? "").replaceAll("|", "\\|").replaceAll("\n", "\\n").replaceAll("\r", "\\r");
}

export function renderFingerprintMarkdown(plan) {
  const uniqueCommits = plan.uniqueCommits?.commits ?? [];
  const duplicatePatches = plan.uniqueCommits?.duplicatePatchGroups ?? [];
  const dirtyRows = plan.worktrees
    .flatMap((worktree) => worktree.dirtyEntries.map((entry) => ({ worktree, entry })))
    .sort((left, right) => compareUtf8(left.worktree.path, right.worktree.path)
      || compareUtf8(left.entry.relativePath, right.entry.relativePath))
    .slice(0, 100);
  const lines = [
    "# MAIS-MVP Physical Cleanup Fingerprint Plan",
    "",
    `- Schema version: ${plan.schemaVersion}`,
    `- Generated at HKT: ${markdownCode(plan.generatedAtHkt)}`,
    `- Repository: ${markdownCode(plan.repo.root)}`,
    `- Canonical root: ${markdownCode(plan.repo.canonicalRoot)}`,
    `- Topology fingerprint: ${markdownCode(plan.topology.fingerprint)}`,
    `- Registered worktrees: ${plan.topology.worktreeCount}`,
    `- Topology stable before output: ${plan.topology.stable === true ? "YES" : "NO"}`,
    "",
    "## Fixed repository references",
    "",
    "| Ref | Resolved full SHA |",
    "| --- | --- |",
    `| ${markdownCell(plan.repo.mainRef)} | ${markdownCode(plan.repo.mainSha)} |`,
    `| ${markdownCell(plan.repo.snapshotRef)} | ${markdownCode(plan.repo.snapshotSha)} |`,
    "",
    "## Unmerged local branch fixed SHAs",
    "",
    "| Branch | Tip SHA | Behind | Ahead | Checkout path |",
    "| --- | --- | ---: | ---: | --- |",
    ...(plan.branchInventory.length === 0
      ? ["| _(none)_ |  | 0 | 0 |  |"]
      : plan.branchInventory.map((branch) => `| ${markdownCell(markdownCode(branch.branch))} | ${markdownCode(branch.tipSha)} | ${branch.behind} | ${branch.ahead} | ${branch.checkoutPath === null ? "" : markdownCell(markdownCode(branch.checkoutPath))} |`)),
    "",
    "## Unique commit inventory",
    "",
    `- Unique commits outside fixed main: ${plan.uniqueCommits?.count ?? uniqueCommits.length}`,
    `- Snapshot-risk commits (>1000 changed files): ${uniqueCommits.filter((commit) => commit.snapshotRisk === true).length}`,
    `- Duplicate stable patch-id groups: ${duplicatePatches.length}`,
    "",
    "| Commit SHA | Parent SHAs | Changed files | Stable patch-id | Snapshot risk |",
    "| --- | --- | ---: | --- | --- |",
    ...(uniqueCommits.length === 0
      ? ["| _(none)_ |  | 0 |  | NO |"]
      : uniqueCommits.map((commit) => `| ${markdownCode(commit.sha)} | ${markdownCell(commit.parents.map(markdownCode).join(" "))} | ${commit.changedFileCount} | ${commit.stablePatchId === null ? "" : markdownCode(commit.stablePatchId)} | ${commit.snapshotRisk ? "YES" : "NO"} |`)),
    "",
    "### Duplicate stable patch-id groups (detection only; never auto-delete)",
    "",
    "| Stable patch-id | Commit SHAs |",
    "| --- | --- |",
    ...(duplicatePatches.length === 0
      ? ["| _(none)_ |  |"]
      : duplicatePatches.map((group) => `| ${markdownCode(group.stablePatchId)} | ${markdownCell(group.commitShas.map(markdownCode).join(" "))} |`)),
    "",
    "## Top dirty entries",
    "",
    "| Worktree path | Branch | Status | Relative path | Kind | Bytes | SHA-256 | Secret redacted |",
    "| --- | --- | --- | --- | --- | ---: | --- | --- |",
    ...(dirtyRows.length === 0
      ? ["| _(none)_ |  |  |  |  | 0 |  | NO |"]
      : dirtyRows.map(({ worktree, entry }) => `| ${markdownCell(markdownCode(worktree.path))} | ${markdownCell(markdownCode(worktree.branch))} | ${markdownCell(markdownCode(entry.status))} | ${markdownCell(markdownCode(entry.relativePath))} | ${markdownCell(entry.kind)} | ${entry.size ?? ""} | ${entry.sha256 === null ? "" : markdownCode(entry.sha256)} | ${entry.secretRedacted ? "YES" : "NO"} |`)),
    "",
    "## Per-worktree deletion gates",
    "",
    "| Worktree path | Branch | Fixed HEAD | Access | Dirty | eligibleForRemoval | Blockers |",
    "| --- | --- | --- | --- | ---: | --- | --- |",
    ...plan.worktrees.map((worktree) => `| ${markdownCell(markdownCode(worktree.path))} | ${markdownCell(markdownCode(worktree.branch))} | ${markdownCode(worktree.head)} | ${worktree.access ? "YES" : "NO"} | ${worktree.dirtyCount ?? "unknown"} | ${worktree.removalGate.eligibleForRemoval ? "YES" : "NO"} | ${markdownCell(worktree.removalGate.blockers.join("; "))} |`),
    "",
    "## Cross-worktree duplicate groups",
    "",
    "| Group | Relative path | Kind | Mode | Bytes | SHA-256 | Occurrences |",
    "| --- | --- | --- | --- | ---: | --- | ---: |",
    ...(plan.duplicateGroups.length === 0
      ? ["| _(none)_ |  |  |  | 0 |  | 0 |"]
      : plan.duplicateGroups.map((group) => `| ${markdownCode(group.groupId)} | ${markdownCell(markdownCode(group.relativePath))} | ${group.kind} | ${group.mode} | ${group.size} | ${markdownCode(group.sha256)} | ${group.occurrences.length} |`)),
    "",
    "## Exact owner package path counts",
    "",
    "| Owner | Category | Relative path | Worktree entry count |",
    "| --- | --- | --- | ---: |",
    ...(plan.ownerPackages.length === 0
      ? ["| _(none)_ |  |  | 0 |"]
      : plan.ownerPackages.flatMap((ownerPackage) => ownerPackage.paths.map((entry) => `| ${markdownCell(ownerPackage.owner)} | ${markdownCell(ownerPackage.category)} | ${markdownCell(markdownCode(entry.relativePath))} | ${entry.count} |`))),
    "",
    "## Safety gate summary",
    "",
    `- Eligible worktrees: ${plan.safetyGates.eligibleWorktreeCount}`,
    `- Ineligible worktrees: ${plan.safetyGates.ineligibleWorktreeCount}`,
    "- Duplicate patch-id detection is advisory only and never authorizes deletion.",
    "- A worktree remains ineligible unless every per-worktree predicate is explicitly true.",
    ""
  ];
  return lines.join("\n");
}

const MAX_GIT_BUFFER_BYTES = 1024 * 1024 * 1024;

function gitBuffer(repoRoot, args, input = undefined) {
  return execFileSync("git", args, {
    cwd: repoRoot,
    encoding: null,
    env: { ...process.env, GIT_OPTIONAL_LOCKS: "0" },
    input,
    maxBuffer: MAX_GIT_BUFFER_BYTES,
    stdio: [input === undefined ? "ignore" : "pipe", "pipe", "pipe"],
    timeout: 120_000
  });
}

function gitText(repoRoot, args) {
  return gitBuffer(repoRoot, args).toString("utf8").trim();
}

function resolveCommit(repoRoot, requestedRef) {
  if (typeof requestedRef !== "string" || requestedRef.length === 0 || requestedRef.includes("\0")) {
    throw new Error("Git reference must be a non-empty NUL-free string");
  }
  const resolved = gitText(repoRoot, [
    "rev-parse",
    "--verify",
    "--end-of-options",
    `${requestedRef}^{commit}`
  ]);
  if (!/^[0-9a-f]{40,64}$/u.test(resolved)) throw new Error(`Git reference did not resolve to a full commit: ${requestedRef}`);
  return resolved;
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function fingerprint(value) {
  return sha256Buffer(Buffer.from(stableJson(value)));
}

function documentFingerprint(plan) {
  const { documentFingerprint: ignored, ...basis } = plan;
  return fingerprint(basis);
}

function normalizedTopology(worktrees) {
  return worktrees.map((entry) => ({
    path: entry.path,
    branch: entry.branch,
    head: entry.head,
    detached: entry.detached === true,
    prunable: entry.prunable === true,
    locked: entry.locked === true,
    lockReasonPresent: entry.lockReasonPresent === true,
    lockReasonSha256: entry.lockReasonSha256 ?? null
  })).sort((left, right) => compareUtf8(left.path, right.path));
}

function topologyFingerprint(worktrees) {
  return fingerprint(normalizedTopology(worktrees));
}

function assertDistinctWorktreeRealPaths(worktrees) {
  const seen = new Map();
  for (const worktree of worktrees) {
    if (!worktree.path || worktree.prunable || !fs.existsSync(worktree.path)) continue;
    let stat;
    try {
      stat = fs.lstatSync(worktree.path);
    } catch {
      continue;
    }
    if (stat.isSymbolicLink() || !stat.isDirectory()) continue;
    const realPath = fs.realpathSync(worktree.path);
    const prior = seen.get(realPath);
    if (prior !== undefined) {
      throw new Error(`duplicate worktree realpath identity: ${prior} and ${worktree.path}`);
    }
    seen.set(realPath, worktree.path);
  }
}

function parseDirectWorktreeTopology(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0 || buffer.at(-1) !== 0) {
    throw new Error("direct worktree topology must be a nonempty NUL-delimited buffer");
  }
  const fields = [];
  let start = 0;
  for (let index = 0; index < buffer.length; index += 1) {
    if (buffer[index] !== 0) continue;
    const rawField = buffer.subarray(start, index);
    if (!isUtf8(rawField)) throw new Error("direct worktree topology contains non-UTF-8 metadata");
    fields.push(rawField.toString("utf8"));
    start = index + 1;
  }
  const blocks = [];
  let block = [];
  for (const field of fields) {
    if (field === "") {
      if (block.length > 0) blocks.push(block);
      block = [];
    } else {
      block.push(field);
    }
  }
  if (block.length > 0) blocks.push(block);
  return blocks.map((blockFields) => {
    const entry = {
      path: "",
      branch: "",
      head: "",
      detached: false,
      prunable: false,
      locked: false,
      lockReasonPresent: false,
      lockReasonSha256: null
    };
    for (const field of blockFields) {
      if (field.startsWith("worktree ")) entry.path = field.slice(9);
      else if (field.startsWith("HEAD ")) entry.head = field.slice(5);
      else if (field.startsWith("branch refs/heads/")) entry.branch = field.slice(18);
      else if (field === "detached") entry.detached = true;
      else if (field === "prunable" || field.startsWith("prunable ")) entry.prunable = true;
      else if (field === "locked" || field.startsWith("locked ")) {
        if (entry.locked) throw new Error("direct worktree topology contains duplicate lock metadata");
        entry.locked = true;
        const reason = field === "locked" ? "" : field.slice(7);
        entry.lockReasonPresent = reason.length > 0;
        entry.lockReasonSha256 = reason.length > 0 ? sha256Buffer(Buffer.from(reason)) : null;
      }
    }
    if (!entry.branch && entry.detached) entry.branch = "(detached)";
    if (!entry.path || !entry.head) throw new Error("direct worktree topology entry is incomplete");
    return entry;
  });
}

function listWorktreeTopology(repoRoot) {
  const libraryInventory = listWorktrees(repoRoot);
  const directInventory = parseDirectWorktreeTopology(gitBuffer(
    repoRoot,
    ["worktree", "list", "--porcelain", "-z"]
  ));
  const directByPath = new Map(directInventory.map((entry) => [entry.path, entry]));
  if (directByPath.size !== directInventory.length || directInventory.length !== libraryInventory.length) {
    throw new Error("library and direct worktree topology inventories differ");
  }
  return libraryInventory.map((entry) => {
    const direct = directByPath.get(entry.path);
    if (!direct
      || direct.branch !== entry.branch
      || direct.head !== entry.head
      || direct.detached !== entry.detached
      || direct.prunable !== entry.prunable) {
      throw new Error("library and direct worktree topology entry mismatch");
    }
    return {
      ...entry,
      locked: direct.locked,
      lockReasonPresent: direct.lockReasonPresent,
      lockReasonSha256: direct.lockReasonSha256
    };
  });
}

function localBranchRefs(repoRoot) {
  const raw = gitBuffer(repoRoot, [
    "for-each-ref",
    "--format=%(refname:strip=2)%00%(objectname)",
    "refs/heads"
  ]).toString("utf8");
  return raw.split("\n").filter((line) => line.length > 0).map((line) => {
    const delimiter = line.indexOf("\0");
    if (delimiter <= 0 || line.indexOf("\0", delimiter + 1) !== -1) {
      throw new Error("invalid local branch reference inventory");
    }
    const branch = line.slice(0, delimiter);
    const tipSha = line.slice(delimiter + 1);
    if (!/^[0-9a-f]{40,64}$/u.test(tipSha)) throw new Error(`invalid local branch tip for ${branch}`);
    return { branch, tipSha };
  }).sort((left, right) => compareUtf8(left.branch, right.branch));
}

function refsFingerprint(refs) {
  return fingerprint(refs);
}

function gitExitStatus(repoRoot, args) {
  const result = spawnSync("git", args, {
    cwd: repoRoot,
    encoding: "utf8",
    env: { ...process.env, GIT_OPTIONAL_LOCKS: "0" },
    maxBuffer: 4 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 120_000
  });
  if (result.error) throw result.error;
  return result;
}

function isAncestor(repoRoot, ancestor, descendant) {
  const result = gitExitStatus(repoRoot, ["merge-base", "--is-ancestor", ancestor, descendant]);
  if (result.status === 0) return true;
  if (result.status === 1) return false;
  throw new Error(`git merge-base --is-ancestor failed: ${result.stderr.trim()}`);
}

function mergeBase(repoRoot, left, right) {
  const result = gitExitStatus(repoRoot, ["merge-base", left, right]);
  if (result.status === 0) {
    const value = result.stdout.trim();
    return /^[0-9a-f]{40,64}$/u.test(value) ? value : null;
  }
  if (result.status === 1) return null;
  throw new Error(`git merge-base failed: ${result.stderr.trim()}`);
}

function divergence(repoRoot, mainSha, tipSha) {
  const values = gitText(repoRoot, ["rev-list", "--left-right", "--count", `${mainSha}...${tipSha}`])
    .split(/\s+/u).map(Number);
  if (values.length !== 2 || values.some((value) => !Number.isSafeInteger(value) || value < 0)) {
    throw new Error(`invalid branch divergence for ${tipSha}`);
  }
  return { behind: values[0], ahead: values[1] };
}

function commitIdsOutsideMain(repoRoot, tipSha, mainSha) {
  const output = gitText(repoRoot, ["rev-list", tipSha, "--not", mainSha]);
  if (output.length === 0) return [];
  const values = output.split("\n");
  if (values.some((value) => !/^[0-9a-f]{40,64}$/u.test(value))) {
    throw new Error(`invalid unique commit inventory for ${tipSha}`);
  }
  return values.sort(compareUtf8);
}

function parseCommitIdentity(repoRoot, commitSha) {
  let raw = gitBuffer(repoRoot, ["show", "-s", "--format=%H%x00%P%x00", commitSha]);
  if (raw.at(-1) === 10) raw = raw.subarray(0, -1);
  if (raw.at(-1) !== 0) throw new Error(`commit identity is missing its final delimiter: ${commitSha}`);
  const fields = [];
  let start = 0;
  for (let index = 0; index < raw.length; index += 1) {
    if (raw[index] !== 0) continue;
    fields.push(raw.subarray(start, index).toString("utf8"));
    start = index + 1;
  }
  if (fields.length !== 2 || fields[0] !== commitSha) throw new Error(`invalid commit identity: ${commitSha}`);
  return {
    parents: fields[1] === "" ? [] : fields[1].split(" ")
  };
}

function parseNulPathCount(buffer) {
  if (buffer.length === 0) return 0;
  if (buffer.at(-1) !== 0) throw new Error("Git path inventory is missing its final NUL delimiter");
  let count = 0;
  for (const byte of buffer) if (byte === 0) count += 1;
  return count;
}

function parseNulPaths(buffer) {
  if (buffer.length === 0) return [];
  if (buffer.at(-1) !== 0) throw new Error("Git path inventory is missing its final NUL delimiter");
  const paths = [];
  let start = 0;
  for (let index = 0; index < buffer.length; index += 1) {
    if (buffer[index] !== 0) continue;
    const rawPath = buffer.subarray(start, index);
    if (!isUtf8(rawPath)) throw new Error("Git path inventory contains a non-UTF-8 path");
    const relativePath = rawPath.toString("utf8");
    canonicalRelativePath(relativePath);
    paths.push(relativePath);
    start = index + 1;
  }
  return paths;
}

function commitDiffMetadata(repoRoot, commitSha, parents) {
  if (parents.length > 0) {
    const base = parents[0];
    return {
      names: gitBuffer(repoRoot, ["diff", "--name-only", "-z", "--no-renames", base, commitSha, "--"]),
      shortstat: gitText(repoRoot, ["diff", "--shortstat", "--no-renames", base, commitSha, "--"]),
      patchArgs: [
        "diff", "--binary", "--full-index", "--no-ext-diff", "--no-renames", base, commitSha, "--"
      ]
    };
  }
  return {
    names: gitBuffer(repoRoot, [
      "diff-tree", "--root", "--no-commit-id", "--name-only", "-r", "-z", "--no-renames", commitSha
    ]),
    shortstat: gitText(repoRoot, [
      "diff-tree", "--root", "--no-commit-id", "--shortstat", "-r", "--no-renames", commitSha
    ]),
    patchArgs: [
      "diff-tree", "--root", "--no-commit-id", "-p", "--binary", "--full-index", "-r", "--no-renames", commitSha
    ]
  };
}

function stablePatchId(repoRoot, patch) {
  if (patch.length === 0) return null;
  const result = spawnSync("git", ["patch-id", "--stable"], {
    cwd: repoRoot,
    input: patch,
    encoding: "utf8",
    env: { ...process.env, GIT_OPTIONAL_LOCKS: "0" },
    maxBuffer: MAX_GIT_BUFFER_BYTES,
    stdio: ["pipe", "pipe", "pipe"],
    timeout: 120_000
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`git patch-id --stable failed: ${result.stderr.trim()}`);
  const match = /^([0-9a-f]{40,64})(?:\s|$)/u.exec(result.stdout.trim());
  return match?.[1] ?? null;
}

function buildBranchAndCommitInventory(repoRoot, mainSha, worktrees, branchFilter = null) {
  const checkoutByBranch = new Map();
  for (const worktree of worktrees) {
    if (!worktree.branch || worktree.branch === "(detached)") continue;
    const paths = checkoutByBranch.get(worktree.branch) ?? [];
    paths.push(worktree.path);
    checkoutByBranch.set(worktree.branch, paths);
  }
  const membership = new Map();
  const branchInventory = [];
  for (const ref of localBranchRefs(repoRoot)) {
    if (branchFilter !== null && !branchFilter.has(ref.branch)) continue;
    if (isAncestor(repoRoot, ref.tipSha, mainSha)) continue;
    const counts = divergence(repoRoot, mainSha, ref.tipSha);
    const uniqueCommitShas = commitIdsOutsideMain(repoRoot, ref.tipSha, mainSha);
    for (const commitSha of uniqueCommitShas) {
      const branches = membership.get(commitSha) ?? new Set();
      branches.add(ref.branch);
      membership.set(commitSha, branches);
    }
    const checkoutPaths = (checkoutByBranch.get(ref.branch) ?? []).sort(compareUtf8);
    branchInventory.push({
      ref: `refs/heads/${ref.branch}`,
      branch: ref.branch,
      tipSha: ref.tipSha,
      checkoutPath: checkoutPaths[0] ?? null,
      checkoutPaths,
      mergeBase: mergeBase(repoRoot, mainSha, ref.tipSha),
      mergedIntoMain: false,
      ...counts,
      uniqueCommitCount: uniqueCommitShas.length,
      uniqueCommitShas
    });
  }
  branchInventory.sort((left, right) => compareUtf8(left.branch, right.branch));
  const commits = [...membership.entries()].map(([commitSha, branches]) => {
    const identity = parseCommitIdentity(repoRoot, commitSha);
    const diff = commitDiffMetadata(repoRoot, commitSha, identity.parents);
    const changedFileCount = parseNulPathCount(diff.names);
    const changedPaths = parseNulPaths(diff.names);
    const secretBearingPatch = changedPaths.some(isSecretLikePath);
    const snapshotRisk = changedFileCount > 1000;
    const patchId = secretBearingPatch || snapshotRisk
      ? null
      : stablePatchId(repoRoot, gitBuffer(repoRoot, diff.patchArgs));
    return {
      sha: commitSha,
      parents: identity.parents,
      reachableFromBranches: [...branches].sort(compareUtf8),
      changedFileCount,
      shortstat: diff.shortstat,
      stablePatchId: patchId,
      patchIdUnavailableReason: secretBearingPatch
        ? "secret-like changed path; patch content not read"
        : snapshotRisk
          ? "snapshot-risk commit; patch-id buffering intentionally skipped"
          : patchId === null
            ? "empty or non-patch commit"
            : null,
      snapshotRiskThreshold: 1000,
      snapshotRisk
    };
  }).sort((left, right) => compareUtf8(left.sha, right.sha));
  const byPatch = new Map();
  for (const commit of commits) {
    if (commit.stablePatchId === null) continue;
    const shas = byPatch.get(commit.stablePatchId) ?? [];
    shas.push(commit.sha);
    byPatch.set(commit.stablePatchId, shas);
  }
  const duplicatePatchGroups = [...byPatch.entries()]
    .filter(([, shas]) => shas.length > 1)
    .map(([patchId, shas]) => ({
      stablePatchId: patchId,
      commitShas: shas.sort(compareUtf8),
      advisoryOnly: true,
      automaticDeletionAuthorized: false
    }))
    .sort((left, right) => compareUtf8(left.stablePatchId, right.stablePatchId));
  return {
    branchInventory,
    uniqueCommits: { count: commits.length, commits, duplicatePatchGroups }
  };
}

function commonGitDirectory(repoRoot) {
  const value = gitText(repoRoot, ["rev-parse", "--git-common-dir"]);
  return fs.realpathSync(path.resolve(repoRoot, value));
}

function accessWorktree(entry, expectedCommonDir) {
  if (!entry.path || !path.isAbsolute(entry.path)) {
    return { access: false, realPath: null, validationErrors: ["worktree path is missing or not absolute"] };
  }
  if (entry.prunable) {
    return { access: false, realPath: null, validationErrors: ["worktree is marked prunable; inventory only"] };
  }
  if (!/^[0-9a-f]{40,64}$/u.test(entry.head)) {
    return { access: false, realPath: null, validationErrors: ["worktree HEAD is not a full object ID"] };
  }
  try {
    const stat = fs.lstatSync(entry.path);
    if (stat.isSymbolicLink() || !stat.isDirectory()) {
      return { access: false, realPath: null, validationErrors: ["worktree path is not a direct directory"] };
    }
    fs.accessSync(entry.path, fs.constants.R_OK | fs.constants.X_OK);
    const actualCommonDir = commonGitDirectory(entry.path);
    if (actualCommonDir !== expectedCommonDir) {
      return { access: false, realPath: null, validationErrors: ["worktree Git common directory identity mismatch"] };
    }
    return { access: true, realPath: fs.realpathSync(entry.path), validationErrors: [] };
  } catch (error) {
    return {
      access: false,
      realPath: null,
      validationErrors: [`worktree is inaccessible: ${error.code ?? error.message}`]
    };
  }
}

function selfGeneratedPathsInWorktree(worktreePath, selfGeneratedPaths) {
  const root = path.resolve(worktreePath);
  return selfGeneratedPaths.filter((candidate) => {
    const relative = path.relative(root, candidate);
    return relative !== "" && relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
  }).map((candidate) => path.relative(root, candidate).split(path.sep).join("/"));
}

function filterSelfGeneratedEntries(worktreePath, entries, selfGeneratedPaths) {
  const exclusions = new Set(selfGeneratedPathsInWorktree(worktreePath, selfGeneratedPaths));
  return {
    entries: entries.filter((entry) => !exclusions.has(entry.relativePath)),
    excludedEntries: entries.filter((entry) => exclusions.has(entry.relativePath)),
    exclusions: [...exclusions].sort(compareUtf8)
  };
}

function metadataOnlyDirtyEntry(worktreePath, entry) {
  const absolutePath = absoluteDirtyPath(worktreePath, entry.relativePath);
  const secretRedacted = isSecretLikePath(entry.relativePath)
    || (entry.historicalPath !== undefined && isSecretLikePath(entry.historicalPath));
  const base = {
    status: entry.status,
    relativePath: entry.relativePath,
    ...(entry.historicalPath === undefined ? {} : { historicalPath: entry.historicalPath })
  };
  try {
    const stat = fs.lstatSync(absolutePath, { bigint: true });
    const finalStat = fs.lstatSync(absolutePath, { bigint: true });
    if (!sameLstatIdentity(stat, finalStat)) {
      throw new Error(`dirty path drifted during metadata-only inspection: ${entry.relativePath}`);
    }
    return {
      ...base,
      exists: true,
      kind: statKind(stat),
      mode: modeString(stat),
      size: exactStatSize(stat.size),
      sha256: null,
      secretRedacted,
      contentReadBlocked: true
    };
  } catch (error) {
    if (error.code !== "ENOENT" && error.code !== "ENOTDIR") throw error;
    return {
      ...base,
      exists: false,
      kind: "missing",
      mode: null,
      size: null,
      sha256: null,
      secretRedacted,
      contentReadBlocked: true
    };
  }
}

function descriptorFromDirty(entry) {
  return {
    exists: entry.exists,
    kind: entry.kind,
    mode: entry.mode,
    size: entry.size,
    sha256: entry.sha256
  };
}

function sameDescriptor(left, right) {
  return left.exists === right.exists
    && left.kind === right.kind
    && left.mode === right.mode
    && left.size === right.size
    && left.sha256 === right.sha256;
}

function createComparisonReaders(repoRoot, canonicalRoot) {
  const treeCache = new Map();
  const blobCache = new Map();
  const canonicalCache = new Map();
  const canonicalKeys = new Set();

  const readBlob = (objectId) => {
    if (!blobCache.has(objectId)) {
      const buffer = gitBuffer(repoRoot, ["cat-file", "blob", objectId]);
      blobCache.set(objectId, { size: buffer.length, sha256: sha256Buffer(buffer) });
    }
    return blobCache.get(objectId);
  };

  const readTree = (commitSha, relativePath) => {
    const cacheKey = `${commitSha}\0${relativePath}`;
    if (treeCache.has(cacheKey)) return treeCache.get(cacheKey);
    const raw = gitBuffer(repoRoot, [
      "--literal-pathspecs",
      "ls-tree",
      "-z",
      "--full-tree",
      commitSha,
      "--",
      relativePath
    ]);
    let descriptor;
    if (raw.length === 0) {
      descriptor = { exists: false, kind: "missing", mode: null, size: null, sha256: null };
    } else {
      if (raw.at(-1) !== 0) throw new Error("git ls-tree output is missing its final NUL delimiter");
      const record = raw.subarray(0, raw.length - 1);
      if (record.includes(0)) throw new Error(`git ls-tree returned multiple entries for ${relativePath}`);
      const tab = record.indexOf(9);
      if (tab < 0) throw new Error(`invalid git ls-tree record for ${relativePath}`);
      const metadata = record.subarray(0, tab).toString("utf8").split(" ");
      if (metadata.length !== 3) throw new Error(`invalid git ls-tree metadata for ${relativePath}`);
      const [mode, type, objectId] = metadata;
      if (type === "blob") {
        const blob = readBlob(objectId);
        descriptor = {
          exists: true,
          kind: mode === "120000" ? "symlink" : "file",
          mode,
          size: blob.size,
          sha256: blob.sha256
        };
      } else {
        descriptor = {
          exists: true,
          kind: type === "tree" ? "directory" : type === "commit" ? "gitlink" : "other",
          mode,
          size: null,
          sha256: null
        };
      }
    }
    treeCache.set(cacheKey, descriptor);
    return descriptor;
  };

  const readCanonicalUncached = (relativePath) => descriptorFromDirty(inspectDirtyEntry(
    canonicalRoot,
    { status: "  ", relativePath }
  ));
  const readCanonical = (relativePath) => {
    canonicalKeys.add(relativePath);
    if (!canonicalCache.has(relativePath)) canonicalCache.set(relativePath, readCanonicalUncached(relativePath));
    return canonicalCache.get(relativePath);
  };
  const verifyCanonical = () => {
    for (const relativePath of canonicalKeys) {
      if (!sameDescriptor(canonicalCache.get(relativePath), readCanonicalUncached(relativePath))) {
        throw new Error(`canonical root drift detected for ${relativePath}`);
      }
    }
  };
  return { readTree, readCanonical, verifyCanonical };
}

function compareDirtyEntry(entry, { mainSha, snapshotSha, readers, blocked }) {
  if (entry.secretRedacted) {
    const skipped = { checked: false, match: null, reason: "secret-redacted; no content read" };
    return {
      mainTree: skipped,
      snapshotTree: skipped,
      canonicalRoot: skipped,
      matchesMainTree: null,
      matchesSnapshotTree: null,
      matchesCanonicalRoot: null
    };
  }
  if (blocked || entry.contentReadBlocked) {
    const skipped = { checked: false, match: null, reason: "worktree content snapshot blocked by secret preflight" };
    return {
      mainTree: skipped,
      snapshotTree: skipped,
      canonicalRoot: skipped,
      matchesMainTree: null,
      matchesSnapshotTree: null,
      matchesCanonicalRoot: null
    };
  }
  const current = descriptorFromDirty(entry);
  const targets = {
    mainTree: readers.readTree(mainSha, entry.relativePath),
    snapshotTree: readers.readTree(snapshotSha, entry.relativePath),
    canonicalRoot: readers.readCanonical(entry.relativePath)
  };
  const comparisons = {};
  for (const [label, descriptor] of Object.entries(targets)) {
    comparisons[label] = { checked: true, match: sameDescriptor(current, descriptor), descriptor };
  }
  return {
    ...comparisons,
    matchesMainTree: comparisons.mainTree.match,
    matchesSnapshotTree: comparisons.snapshotTree.match,
    matchesCanonicalRoot: comparisons.canonicalRoot.match
  };
}

function assertNoSymlinkAncestors(worktreePath, relativePath) {
  let current = path.resolve(worktreePath);
  const segments = canonicalRelativePath(relativePath).split("/");
  for (const segment of segments.slice(0, -1)) {
    current = path.join(current, segment);
    let stat;
    try {
      stat = fs.lstatSync(current);
    } catch (error) {
      if (error?.code === "ENOENT" || error?.code === "ENOTDIR") return;
      throw error;
    }
    if (stat.isSymbolicLink()) throw new Error(`${worktreePath}: dirty path has a symlink ancestor: ${relativePath}`);
    if (!stat.isDirectory()) throw new Error(`${worktreePath}: dirty path has a non-directory ancestor: ${relativePath}`);
  }
}

function assertCleanupStatusSupported(worktreePath, entries) {
  for (const entry of entries) {
    if (entry.status === "??" || /^ [MAD]$/u.test(entry.status)) continue;
    throw new Error(`${worktreePath}: staged, conflicted, or unsupported dirty status: ${JSON.stringify(entry.status)}`);
  }
}

function scanDirtyEntryContents(worktreePath, dirtyEntries, collectGarbage) {
  let scannedPathCount = 0;
  let reviewedBinaryPathCount = 0;
  let reviewedLegacyExactTextPathCount = 0;
  for (const [index, entry] of dirtyEntries.entries()) {
    if (entry.kind !== "file") continue;
    assertNoSymlinkAncestors(worktreePath, entry.relativePath);
    const scan = scanReviewedLegacyUntrackedExactTextFile(worktreePath, entry.relativePath)
      ?? scanFile(absoluteDirtyPath(worktreePath, entry.relativePath), entry.relativePath);
    if (scan.sha256 !== entry.sha256) {
      throw new Error(`${worktreePath}: dirty content drifted during secret scanning: ${entry.relativePath}`);
    }
    scannedPathCount += 1;
    if (scan.kind === "reviewed-binary") reviewedBinaryPathCount += 1;
    if (scan.reviewedLegacyExactText === true) reviewedLegacyExactTextPathCount += 1;
    if ((index + 1) % 4 === 0) collectGarbage();
  }
  collectGarbage();
  return { scannedPathCount, reviewedBinaryPathCount, reviewedLegacyExactTextPathCount };
}

function pathSummarySnapshot({
  worktree,
  mainSha,
  rawStatusEntries,
  filteredStatusEntries,
  dirtyEntries,
  scanner
}) {
  const currentStateBasis = {
    archiveKind: rawStatusEntries > 0 ? "dirty-worktree" : "clean-diverged-branch",
    baseHead: mainSha,
    branch: worktree.branch,
    dirtyEntries: dirtyEntries.map(dirtyEntryVerificationBasis),
    divergence: divergence(worktree.path, mainSha, worktree.head),
    head: worktree.head,
    scanner,
    statusInventorySha256: fingerprint(filteredStatusEntries)
  };
  return {
    ...currentStateBasis,
    captureMode: "path-content-summary",
    currentStateFingerprint: fingerprint(currentStateBasis),
    indexPatchSha256: null,
    rawStatusEntries,
    secretScannerStatus: "passed",
    selfGeneratedStatusEntries: rawStatusEntries - filteredStatusEntries.length,
    trackedPatchSha256: null,
    worktreePatchSha256: null,
    branchPatchSha256: null
  };
}

function addGateBlocker(gate, blocker) {
  if (!gate.blockers.includes(blocker)) gate.blockers.push(blocker);
  gate.eligibleForRemoval = false;
  return gate;
}

function ownerPackagesForEntries(entries) {
  const packages = new Map();
  for (const entry of entries) {
    const { owner, category, manualReview } = entry.classification;
    const key = `${owner}\0${category}`;
    const ownerPackage = packages.get(key) ?? {
      owner,
      category,
      manualReview,
      entryCount: 0,
      pathCounts: new Map()
    };
    ownerPackage.entryCount += 1;
    ownerPackage.pathCounts.set(entry.relativePath, (ownerPackage.pathCounts.get(entry.relativePath) ?? 0) + 1);
    packages.set(key, ownerPackage);
  }
  return [...packages.values()].map((ownerPackage) => {
    const paths = [...ownerPackage.pathCounts.entries()]
      .map(([relativePath, count]) => ({ relativePath, count }))
      .sort((left, right) => compareUtf8(left.relativePath, right.relativePath));
    return {
      owner: ownerPackage.owner,
      category: ownerPackage.category,
      manualReview: ownerPackage.manualReview,
      entryCount: ownerPackage.entryCount,
      uniquePathCount: paths.length,
      paths
    };
  }).sort((left, right) => compareUtf8(left.owner, right.owner) || compareUtf8(left.category, right.category));
}

function hktTimestamp(date = new Date()) {
  return new Date(date.getTime() + 8 * 60 * 60 * 1000).toISOString().replace(/Z$/u, "+08:00");
}

function assertDirectDirectory(candidate, label) {
  const stat = fs.lstatSync(candidate);
  if (stat.isSymbolicLink() || !stat.isDirectory()) throw new Error(`${label} must be a direct directory`);
}

function dirtyEntryVerificationBasis(entry) {
  return {
    status: entry.status,
    relativePath: entry.relativePath,
    historicalPath: entry.historicalPath ?? null,
    exists: entry.exists,
    kind: entry.kind,
    mode: entry.mode,
    size: entry.size,
    sha256: entry.sha256,
    secretRedacted: entry.secretRedacted,
    contentReadBlocked: entry.contentReadBlocked === true
  };
}

function createPublicationVerifier(verificationRows, selfGeneratedPaths, readers) {
  return (additionalSelfGeneratedPaths = []) => {
    const activeSelfGeneratedPaths = [...selfGeneratedPaths, ...additionalSelfGeneratedPaths];
    for (const row of verificationRows) {
      const currentStatus = filterSelfGeneratedEntries(
        row.worktree.path,
        parsePorcelainZ(gitBuffer(row.worktree.path, ["status", "--porcelain=v1", "-z", "-uall"])),
        activeSelfGeneratedPaths
      ).entries;
      if (stableJson(currentStatus) !== stableJson(row.statusBasis)) {
        throw new Error(`${row.worktree.path}: worktree status drift detected after fingerprint collection`);
      }
      const currentDirty = currentStatus.map((entry) => (
        row.secretBlocked ? metadataOnlyDirtyEntry(row.worktree.path, entry) : inspectDirtyEntry(row.worktree.path, entry)
      )).map(dirtyEntryVerificationBasis);
      if (stableJson(currentDirty) !== stableJson(row.dirtyBasis)) {
        throw new Error(`${row.worktree.path}: dirty content drift detected after fingerprint collection`);
      }
    }
    readers.verifyCanonical();
  };
}

function worktreeBranchState(repoRoot, worktree, mainSha) {
  if (!/^[0-9a-f]{40,64}$/u.test(worktree.head)) {
    return { branchMergedIntoMain: false, uniqueCommitCount: null, uniqueCommitShas: [] };
  }
  const branchMergedIntoMain = isAncestor(repoRoot, worktree.head, mainSha);
  const uniqueCommitShas = branchMergedIntoMain ? [] : commitIdsOutsideMain(repoRoot, worktree.head, mainSha);
  return { branchMergedIntoMain, uniqueCommitCount: uniqueCommitShas.length, uniqueCommitShas };
}

function branchTreeSecretPaths(repoRoot, mainSha, headSha) {
  if (mainSha === headSha) return [];
  return parseNulPaths(gitBuffer(repoRoot, [
    "diff", "--name-only", "-z", "--no-renames", mainSha, headSha, "--"
  ])).filter(isSecretLikePath).sort(compareUtf8);
}

export function generateFingerprintPlan({
  repoRoot,
  mainRef = "main",
  canonicalRoot = DEFAULT_CANONICAL_ROOT,
  snapshotRef = DEFAULT_SNAPSHOT_REF,
  outputJson = null,
  outputMarkdown = null,
  worktreePath = null,
  dryRun = false,
  clock = () => new Date(),
  collectGarbage = collectAvailableGarbage
}) {
  if (typeof collectGarbage !== "function") throw new TypeError("collectGarbage must be a function");
  const absoluteRepoRoot = path.resolve(repoRoot);
  const absoluteCanonicalRoot = path.resolve(canonicalRoot);
  assertDirectDirectory(absoluteRepoRoot, "repository root");
  assertDirectDirectory(absoluteCanonicalRoot, "canonical root");
  const repositoryCommonDir = commonGitDirectory(absoluteRepoRoot);
  if (commonGitDirectory(absoluteCanonicalRoot) !== repositoryCommonDir) {
    throw new Error("canonical root does not belong to the target repository Git common directory");
  }
  const selfGeneratedPaths = [outputJson, outputMarkdown]
    .filter((value) => value !== null)
    .map((value) => path.resolve(value))
    .sort(compareUtf8);
  const mainSha = resolveCommit(absoluteRepoRoot, mainRef);
  const snapshotSha = resolveCommit(absoluteRepoRoot, snapshotRef);
  const initialRefs = localBranchRefs(absoluteRepoRoot);
  const initialRefsFingerprint = refsFingerprint(initialRefs);
  const initialWorktrees = listWorktreeTopology(absoluteRepoRoot);
  assertDistinctWorktreeRealPaths(initialWorktrees);
  const initialTopologyFingerprint = topologyFingerprint(initialWorktrees);
  let selectedWorktrees = initialWorktrees;
  if (worktreePath !== null) {
    const requested = path.resolve(worktreePath);
    selectedWorktrees = initialWorktrees.filter((entry) => path.resolve(entry.path) === requested);
    if (selectedWorktrees.length !== 1) throw new Error(`--worktree-path did not match exactly one registered worktree: ${requested}`);
  }
  const partialScope = worktreePath !== null;
  const branchFilter = partialScope
    ? new Set(selectedWorktrees.map((entry) => entry.branch).filter((branch) => branch && branch !== "(detached)"))
    : null;
  const { branchInventory, uniqueCommits } = buildBranchAndCommitInventory(
    absoluteRepoRoot,
    mainSha,
    initialWorktrees,
    branchFilter
  );
  const readers = createComparisonReaders(absoluteRepoRoot, absoluteCanonicalRoot);
  const verificationRows = [];
  const worktreeRecords = [];
  for (const worktree of selectedWorktrees) {
    const accessState = accessWorktree(worktree, repositoryCommonDir);
    const branchState = worktreeBranchState(absoluteRepoRoot, worktree, mainSha);
    const baseRecord = {
      id: fingerprint({ path: worktree.path, branch: worktree.branch, head: worktree.head }),
      path: worktree.path,
      realPath: accessState.realPath,
      branch: worktree.branch,
      head: worktree.head,
      detached: worktree.detached === true,
      prunable: worktree.prunable === true,
      locked: worktree.locked === true,
      lockReasonPresent: worktree.lockReasonPresent === true,
      lockReasonSha256: worktree.lockReasonSha256 ?? null,
      access: accessState.access,
      valid: false,
      validationErrors: [...accessState.validationErrors],
      snapshot: null,
      dirtyCount: null,
      dirtyEntries: [],
      ...branchState
    };
    if (!accessState.access) {
      const removalGate = evaluateRemovalGate({
        access: false,
        dirtyCount: null,
        branchMergedIntoMain: branchState.branchMergedIntoMain,
        uniqueCommitCount: branchState.uniqueCommitCount,
        dirtyPathsPreserved: false
      });
      if (worktree.locked) addGateBlocker(removalGate, "worktree is locked");
      worktreeRecords.push({ ...baseRecord, dirtyPathsPreserved: false, removalGate });
      continue;
    }

    if (resolveCommit(worktree.path, "HEAD") !== worktree.head || resolveCommit(worktree.path, mainRef) !== mainSha) {
      throw new Error(`${worktree.path}: worktree HEAD or main reference drifted before fingerprint collection`);
    }
    const preflightRaw = gitBuffer(worktree.path, ["status", "--porcelain=v1", "-z", "-uall"]);
    const preflightEntries = parsePorcelainZ(preflightRaw);
    const preflightFiltered = filterSelfGeneratedEntries(
      worktree.path,
      preflightEntries,
      selfGeneratedPaths
    );
    assertCleanupStatusSupported(worktree.path, preflightFiltered.entries);
    const dirtySecretBlocked = preflightFiltered.entries.some((entry) => (
      isSecretLikePath(entry.relativePath)
      || (entry.historicalPath !== undefined && isSecretLikePath(entry.historicalPath))
    ));
    const committedSecretPaths = branchTreeSecretPaths(absoluteRepoRoot, mainSha, worktree.head);
    const secretBlocked = dirtySecretBlocked || committedSecretPaths.length > 0;
    let dirtyEntries;
    if (secretBlocked) {
      dirtyEntries = preflightFiltered.entries.map((entry) => metadataOnlyDirtyEntry(worktree.path, entry));
      baseRecord.validationErrors.push(
        dirtySecretBlocked
          ? "secret-like dirty path blocked collectWorktreeSnapshot content reads"
          : "secret-like committed branch path blocked collectWorktreeSnapshot branch patch reads"
      );
      if (committedSecretPaths.length > 0) {
        baseRecord.secretRedactedBranchPaths = committedSecretPaths;
      }
    } else {
      dirtyEntries = preflightFiltered.entries.map((entry) => inspectDirtyEntry(worktree.path, entry));
      const scanner = scanDirtyEntryContents(worktree.path, dirtyEntries, collectGarbage);
      baseRecord.snapshot = pathSummarySnapshot({
        worktree,
        mainSha,
        rawStatusEntries: preflightEntries.length,
        filteredStatusEntries: preflightFiltered.entries,
        dirtyEntries,
        scanner
      });
      baseRecord.valid = true;
    }
    dirtyEntries = dirtyEntries.map((entry) => {
      const comparisons = compareDirtyEntry(entry, {
        mainSha,
        snapshotSha,
        readers,
        blocked: secretBlocked
      });
      return {
        ...entry,
        classification: classifyPath(entry.relativePath),
        comparisons: {
          mainTree: comparisons.mainTree,
          snapshotTree: comparisons.snapshotTree,
          canonicalRoot: comparisons.canonicalRoot
        },
        matchesMainTree: comparisons.matchesMainTree,
        matchesSnapshotTree: comparisons.matchesSnapshotTree,
        matchesCanonicalRoot: comparisons.matchesCanonicalRoot,
        verifiedArchive: false
      };
    });
    const dirtyPathsPreserved = dirtyEntries.every((entry) => (
      entry.matchesMainTree === true || entry.verifiedArchive === true
    ));
    const removalGate = evaluateRemovalGate({
      access: true,
      dirtyCount: dirtyEntries.length,
      branchMergedIntoMain: branchState.branchMergedIntoMain,
      uniqueCommitCount: branchState.uniqueCommitCount,
      dirtyPathsPreserved
    });
    if (secretBlocked) addGateBlocker(removalGate, "secret-like path blocked the content snapshot");
    if (worktree.locked) addGateBlocker(removalGate, "worktree is locked");
    if (dirtyEntries.some((entry) => entry.classification.manualReview)) {
      addGateBlocker(removalGate, "one or more dirty paths require A10/A25 manual ownership review");
    }
    if (path.resolve(worktree.path) === absoluteCanonicalRoot) {
      addGateBlocker(removalGate, "canonical root is retained and never eligible for worktree removal");
    }
    if (preflightFiltered.exclusions.length > 0) {
      addGateBlocker(removalGate, "worktree contains a self-generated output target and publication changes its raw dirty state");
    }
    if (partialScope) addGateBlocker(removalGate, "partial dry-run scope cannot authorize removal");
    const record = {
      ...baseRecord,
      valid: baseRecord.valid && !secretBlocked,
      dirtyCount: dirtyEntries.length,
      dirtyEntries,
      dirtyPathsPreserved,
      selfGeneratedPathExclusions: preflightFiltered.exclusions,
      removalGate
    };
    worktreeRecords.push(record);
    verificationRows.push({
      worktree,
      statusBasis: preflightFiltered.entries,
      dirtyBasis: dirtyEntries.map(dirtyEntryVerificationBasis),
      secretBlocked
    });
  }

  const publicationVerifier = createPublicationVerifier(verificationRows, selfGeneratedPaths, readers);
  publicationVerifier();
  const finalWorktrees = listWorktreeTopology(absoluteRepoRoot);
  const finalTopologyFingerprint = topologyFingerprint(finalWorktrees);
  if (finalTopologyFingerprint !== initialTopologyFingerprint) {
    throw new Error("worktree topology drift detected; fingerprint publication failed closed");
  }
  const finalRefs = localBranchRefs(absoluteRepoRoot);
  const finalRefsFingerprint = refsFingerprint(finalRefs);
  if (finalRefsFingerprint !== initialRefsFingerprint) {
    throw new Error("local branch reference drift detected; fingerprint publication failed closed");
  }
  if (resolveCommit(absoluteRepoRoot, mainRef) !== mainSha || resolveCommit(absoluteRepoRoot, snapshotRef) !== snapshotSha) {
    throw new Error("main or snapshot reference drift detected; fingerprint publication failed closed");
  }

  worktreeRecords.sort((left, right) => compareUtf8(left.path, right.path));
  const flatEntries = worktreeRecords.flatMap((worktree) => worktree.dirtyEntries.map((entry) => ({
    ...entry,
    worktreeId: worktree.id,
    worktreePath: worktree.path,
    branch: worktree.branch
  })));
  const duplicateGroups = buildDuplicateGroups(flatEntries);
  const ownerPackages = ownerPackagesForEntries(flatEntries);
  const eligibleWorktreeCount = worktreeRecords.filter((worktree) => worktree.removalGate.eligibleForRemoval).length;
  const plan = {
    schemaVersion: 1,
    generatedAtHkt: hktTimestamp(clock()),
    generationId: crypto.randomUUID(),
    repo: {
      root: absoluteRepoRoot,
      canonicalRoot: absoluteCanonicalRoot,
      gitCommonDir: repositoryCommonDir,
      mainRef,
      mainSha,
      snapshotRef,
      snapshotSha,
      selfGeneratedPaths,
      scope: {
        dryRun: dryRun === true,
        worktreeFilter: worktreePath === null ? null : path.resolve(worktreePath),
        complete: !partialScope
      }
    },
    topology: {
      worktreeCount: initialWorktrees.length,
      selectedWorktreeCount: selectedWorktrees.length,
      initialFingerprint: initialTopologyFingerprint,
      finalFingerprint: finalTopologyFingerprint,
      fingerprint: finalTopologyFingerprint,
      stable: true,
      initialRefsFingerprint,
      finalRefsFingerprint,
      refsStable: true
    },
    branchInventory,
    uniqueCommits,
    worktrees: worktreeRecords,
    duplicateGroups,
    ownerPackages,
    safetyGates: {
      topologyStable: true,
      refsStable: true,
      completeScope: !partialScope,
      allSnapshotsComplete: worktreeRecords.every((worktree) => worktree.access && worktree.valid),
      noSecretContentReads: true,
      secretBlockedWorktreeCount: worktreeRecords.filter((worktree) => (
        worktree.validationErrors.some((error) => error.includes("secret-like"))
      )).length,
      noManualReviewPaths: !flatEntries.some((entry) => entry.classification.manualReview),
      duplicatePatchIdsAdvisoryOnly: true,
      automaticDeletionFromPatchIds: false,
      pointInTimeFingerprint: true,
      immediatePreRemovalRecheckRequired: true,
      eligibleWorktreeCount,
      ineligibleWorktreeCount: worktreeRecords.length - eligibleWorktreeCount,
      overallSafeForRemoval: !partialScope
        && eligibleWorktreeCount === worktreeRecords.length
        && worktreeRecords.length === initialWorktrees.length
    }
  };
  plan.documentFingerprint = documentFingerprint(plan);
  Object.defineProperty(plan, PUBLICATION_VERIFIER, {
    value: publicationVerifier,
    enumerable: false,
    configurable: false,
    writable: false
  });
  return plan;
}

export function assertPublicationInputsCurrent(plan, { additionalSelfGeneratedPaths = [] } = {}) {
  const currentTopology = topologyFingerprint(listWorktreeTopology(plan.repo.root));
  if (currentTopology !== plan.topology.fingerprint) {
    throw new Error("worktree topology drift detected immediately before output write");
  }
  const currentRefs = refsFingerprint(localBranchRefs(plan.repo.root));
  if (currentRefs !== plan.topology.finalRefsFingerprint) {
    throw new Error("local branch reference drift detected immediately before output write");
  }
  if (resolveCommit(plan.repo.root, plan.repo.mainRef) !== plan.repo.mainSha
    || resolveCommit(plan.repo.root, plan.repo.snapshotRef) !== plan.repo.snapshotSha) {
    throw new Error("fixed repository reference drift detected immediately before output write");
  }
  const publicationVerifier = plan?.[PUBLICATION_VERIFIER];
  if (typeof publicationVerifier !== "function") {
    throw new Error("publication verifier is missing from the in-memory fingerprint plan");
  }
  publicationVerifier(additionalSelfGeneratedPaths);
}

function assertSafeOutputTarget(target, label) {
  if (!path.isAbsolute(target)) throw new Error(`${label} must be absolute`);
  const parent = path.dirname(target);
  assertDirectDirectory(parent, `${label} parent`);
  if (!fs.existsSync(target)) return;
  const stat = fs.lstatSync(target);
  if (stat.isSymbolicLink() || !stat.isFile()) throw new Error(`${label} must be absent or a direct regular file`);
}

function prepareAtomicOutput(target, buffer) {
  const temporaryPath = path.join(
    path.dirname(target),
    `.tmp-${path.basename(target)}-${process.pid}-${crypto.randomUUID()}`
  );
  const flags = fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL
    | (fs.constants.O_NOFOLLOW ?? 0);
  const descriptor = fs.openSync(temporaryPath, flags, 0o600);
  try {
    fs.writeFileSync(descriptor, buffer);
    fs.fsyncSync(descriptor);
  } finally {
    fs.closeSync(descriptor);
  }
  return temporaryPath;
}

function fsyncDirectory(directory) {
  const descriptor = fs.openSync(directory, fs.constants.O_RDONLY);
  try {
    fs.fsyncSync(descriptor);
  } finally {
    fs.closeSync(descriptor);
  }
}

export function publishAtomicOutputs({
  outputJson,
  outputMarkdown,
  jsonBuffer,
  markdownBuffer,
  verifyBeforeRename
}) {
  if (typeof verifyBeforeRename !== "function") {
    throw new Error("atomic output publication requires a pre-rename verifier");
  }
  assertSafeOutputTarget(outputJson, "JSON output");
  assertSafeOutputTarget(outputMarkdown, "Markdown output");
  if (outputJson === outputMarkdown) throw new Error("JSON and Markdown output paths must be distinct");
  if (fs.existsSync(outputJson) && fs.existsSync(outputMarkdown)) {
    const jsonStat = fs.statSync(outputJson);
    const markdownStat = fs.statSync(outputMarkdown);
    if (jsonStat.dev === markdownStat.dev && jsonStat.ino === markdownStat.ino) {
      throw new Error("JSON and Markdown output paths must not be hard links to the same file");
    }
  }
  let markdownTemporary = null;
  let jsonTemporary = null;
  try {
    markdownTemporary = prepareAtomicOutput(outputMarkdown, markdownBuffer);
    jsonTemporary = prepareAtomicOutput(outputJson, jsonBuffer);
    verifyBeforeRename([markdownTemporary, jsonTemporary]);
    fs.renameSync(markdownTemporary, outputMarkdown);
    markdownTemporary = null;
    fsyncDirectory(path.dirname(outputMarkdown));
    fs.renameSync(jsonTemporary, outputJson);
    jsonTemporary = null;
    fsyncDirectory(path.dirname(outputJson));
  } finally {
    if (markdownTemporary !== null) fs.rmSync(markdownTemporary, { force: true });
    if (jsonTemporary !== null) fs.rmSync(jsonTemporary, { force: true });
  }
}

function usage() {
  return [
    "Usage:",
    "  node generate-physical-cleanup-fingerprint.mjs --dry-run [options]",
    "  node generate-physical-cleanup-fingerprint.mjs --output-json <path> --output-markdown <path> [options]",
    "",
    "Options:",
    "  --repo-root <path>",
    "  --main-ref <ref>                 default: main",
    `  --canonical-root <path>          default: ${DEFAULT_CANONICAL_ROOT}`,
    `  --snapshot-ref <ref>             default: ${DEFAULT_SNAPSHOT_REF}`,
    "  --worktree-path <path>           dry-run only; limits collection scope",
    "  --dry-run",
    "  --help",
    ""
  ].join("\n");
}

function summaryLine(plan, mode) {
  const dirtyEntries = plan.worktrees.reduce((sum, worktree) => sum + (worktree.dirtyCount ?? 0), 0);
  return `fingerprint summary: mode=${mode} topologyWorktrees=${plan.topology.worktreeCount} selectedWorktrees=${plan.worktrees.length} dirtyEntries=${dirtyEntries} unmergedBranches=${plan.branchInventory.length} uniqueCommits=${plan.uniqueCommits.count} duplicateContentGroups=${plan.duplicateGroups.length} duplicatePatchGroups=${plan.uniqueCommits.duplicatePatchGroups.length} eligibleForRemoval=${plan.safetyGates.eligibleWorktreeCount}`;
}

async function main(argv) {
  const options = parseCliArgs(argv);
  if (options.help) {
    process.stdout.write(usage());
    return;
  }
  const plan = generateFingerprintPlan(options);
  if (options.dryRun) {
    process.stdout.write(`${summaryLine(plan, "dry-run")}\n`);
    return;
  }
  assertPublicationInputsCurrent(plan);
  let markdown = renderFingerprintMarkdown(plan);
  const markdownBuffer = Buffer.from(markdown);
  plan.documents = {
    markdownSha256: sha256Buffer(markdownBuffer),
    jsonPublishedLastAsCommitMarker: true
  };
  plan.documentFingerprint = documentFingerprint(plan);
  const jsonBuffer = Buffer.from(`${JSON.stringify(plan, null, 2)}\n`);
  publishAtomicOutputs({
    outputJson: options.outputJson,
    outputMarkdown: options.outputMarkdown,
    jsonBuffer,
    markdownBuffer,
    verifyBeforeRename: (temporaryPaths) => assertPublicationInputsCurrent(plan, {
      additionalSelfGeneratedPaths: temporaryPaths
    })
  });
  process.stdout.write(`${summaryLine(plan, "written")}\n`);
}

const isDirectInvocation = process.argv[1] !== undefined
  && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isDirectInvocation) {
  main(process.argv.slice(2)).catch((error) => {
    process.stderr.write(`physical cleanup fingerprint failed closed: ${error.message}\n`);
    process.exitCode = 1;
  });
}
