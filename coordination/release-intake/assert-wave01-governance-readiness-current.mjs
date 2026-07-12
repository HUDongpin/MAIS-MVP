#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const root = git(["rev-parse", "--show-toplevel"], process.cwd());
const outputPath = path.join(root, "coordination", "release-intake", "latest-A25-wave01-governance-readiness-current-gate.json");
const json = process.argv.includes("--json");

const paths = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  executionSequence: "coordination/release-intake/latest-A25-dirty-worktree-closure-execution-sequence.json",
  readiness: "coordination/release-intake/latest-A25-wave01-governance-readiness.json",
  readinessMarkdown: "coordination/release-intake/latest-A25-wave01-governance-readiness.md",
  a25Pathspec: "coordination/release-intake/latest-A25-owner-a25-git-hygiene-and-release-intake.pathspec",
  a10Pathspec: "coordination/release-intake/latest-A25-owner-a10-tooling-docs-and-report.pathspec",
  a22Pathspec: "coordination/release-intake/latest-A25-owner-a22-production-reliability-and-release-engineering.pathspec"
};

function git(args, cwd) {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    maxBuffer: 512 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"]
  }).trim();
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

function readText(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function statusEntries(cwd) {
  const output = execFileSync("git", ["status", "--porcelain=v1", "-uall"], {
    cwd,
    encoding: "utf8",
    maxBuffer: 512 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"]
  });
  return output.split("\n").filter(Boolean);
}

function statusPath(line) {
  return line.includes(" -> ") ? line.split(" -> ").pop() : line.slice(3);
}

function pathspecInfo() {
  const files = [paths.a25Pathspec, paths.a10Pathspec, paths.a22Pathspec];
  const contents = files.map((file) => `${file}\n${readText(file)}`).join("\n---\n");
  const allowedPaths = new Set(
    files.flatMap((file) => readText(file).split("\n").map((line) => line.trim()).filter(Boolean))
  );
  return {
    files,
    checksum: sha256(contents),
    allowedPaths
  };
}

function coverage(entries, allowedPaths) {
  const uncovered = entries
    .map((line) => ({ line, path: statusPath(line) }))
    .filter((entry) => !allowedPaths.has(entry.path));
  return {
    statusEntries: entries.length,
    coveredEntries: entries.length - uncovered.length,
    uncoveredEntries: uncovered.length,
    uncovered
  };
}

function packageResyncRecommendations(uncovered, dirtyMap, worktreePath) {
  const rootEntriesByPath = new Map((dirtyMap.entries ?? []).map((entry) => [entry.path, entry]));
  return uncovered.map((entry) => {
    const rootEntry = rootEntriesByPath.get(entry.path);
    const rootPath = path.join(root, entry.path);
    const worktreeFilePath = path.join(worktreePath, entry.path);
    const isUntracked = entry.line.startsWith("??");
    const packageOnly = !rootEntry;
    const actionKind = packageOnly
      ? isUntracked
        ? "owner-approved-package-untracked-clean"
        : "owner-approved-package-restore"
      : "refresh-owner-pathspec-or-recopy-current-root-entry";
    const commandHint = packageOnly
      ? isUntracked
        ? `git clean -f -- ${entry.path}`
        : `git restore --source=HEAD -- ${entry.path}`
      : `rsync -R ${entry.path} /Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A25-dirty-closure-governance/`;

    return {
      path: entry.path,
      worktreeStatus: entry.line.slice(0, 2),
      rootStatus: rootEntry?.status ?? null,
      rootOwner: rootEntry?.owner ?? null,
      rootSlice: rootEntry?.slice ?? null,
      rootPathExists: fs.existsSync(rootPath),
      worktreePathExists: fs.existsSync(worktreeFilePath),
      packageOnly,
      actionKind,
      commandHint,
      executableNow: false,
      cleanupAuthorized: false,
      approvalNeeded: packageOnly
        ? "Owner must explicitly approve this exact package-worktree resync/discard before any restore, clean, or file deletion."
        : "Refresh owner pathspecs or recopy the current root entry before package review."
    };
  });
}

function packageResyncCoverage(recommendations) {
  const packageOnlyRows = recommendations.filter((entry) => entry.packageOnly);
  const rootMappedRows = recommendations.filter((entry) => !entry.packageOnly);
  return {
    packageOnlyRows: packageOnlyRows.length,
    rootMappedRows: rootMappedRows.length,
    ownerAuthorizationRequiredRows: packageOnlyRows.length,
    rootPathspecOrRecopyRequiredRows: rootMappedRows.length,
    packageOnlyPaths: packageOnlyRows.map((entry) => entry.path),
    rootMappedPaths: rootMappedRows.map((entry) => entry.path),
    cleanupAuthorizedRows: recommendations.filter((entry) => entry.cleanupAuthorized).length,
    executableRows: recommendations.filter((entry) => entry.executableNow).length
  };
}

function sameJson(left, right) {
  return JSON.stringify(left ?? null) === JSON.stringify(right ?? null);
}

function main() {
  const failures = [];
  for (const requiredPath of Object.values(paths)) {
    if (!exists(requiredPath)) failures.push(`missing required file: ${requiredPath}`);
  }
  if (failures.length > 0) return finish({ failures, commitReady: false });

  const dirtyMap = readJson(paths.dirtyMap);
  const sequence = readJson(paths.executionSequence);
  const readiness = readJson(paths.readiness);
  const pathspec = pathspecInfo();
  const entries = statusEntries(readiness.worktree?.path);
  const currentCoverage = coverage(entries, pathspec.allowedPaths);
  const currentRecommendations = packageResyncRecommendations(currentCoverage.uncovered, dirtyMap, readiness.worktree?.path);
  const currentResyncCoverage = packageResyncCoverage(currentRecommendations);
  const currentStatusSignature = sha256(entries.slice().sort().join("\0"));

  if (readiness.dirtyMapStatusSignature !== dirtyMap.statusSignature) failures.push("readiness dirty-map signature is stale");
  if (readiness.expandedStatusEntries !== dirtyMap.statusCounts.expandedStatusEntries) {
    failures.push("readiness expanded dirty entry count is stale");
  }
  if (readiness.executionSequenceGeneratedAt !== sequence.generatedAt) failures.push("readiness sequence timestamp is stale");
  if (readiness.worktree?.branch !== git(["branch", "--show-current"], readiness.worktree.path)) failures.push("readiness worktree branch is stale");
  if (readiness.worktree?.head !== git(["rev-parse", "--short", "HEAD"], readiness.worktree.path)) failures.push("readiness worktree head is stale");
  if (readiness.worktree?.statusSignature !== currentStatusSignature) failures.push("readiness worktree status signature is stale");
  if (readiness.pathspecs?.checksum !== pathspec.checksum) failures.push("readiness pathspec checksum is stale");
  if (readiness.pathspecs?.allowedPaths !== pathspec.allowedPaths.size) failures.push("readiness pathspec allowed path count is stale");
  if (!sameJson(readiness.pathspecCoverage, currentCoverage)) failures.push("readiness pathspec coverage is stale");
  if (!sameJson(readiness.packageResyncRecommendations ?? [], currentRecommendations)) {
    failures.push("readiness package resync recommendations are stale");
  }
  if (!sameJson(readiness.packageResyncCoverage ?? null, currentResyncCoverage)) {
    failures.push("readiness package resync coverage is stale");
  }
  if (readiness.cleanupAuthorized !== false) failures.push("readiness cleanupAuthorized must be false");
  if (readiness.executableNow !== false) failures.push("readiness executableNow must be false");

  const checks = readiness.checks ?? {};
  for (const name of ["highAudit", "releaseHelperTests", "typeCheck"]) {
    if (!checks[name]) failures.push(`missing readiness check: ${name}`);
    if (typeof checks[name]?.passed !== "boolean") failures.push(`${name}: passed must be boolean`);
    if (typeof checks[name]?.status !== "number") failures.push(`${name}: status must be numeric`);
  }

  const expectedReasons = [];
  if (currentResyncCoverage.rootPathspecOrRecopyRequiredRows > 0) {
    expectedReasons.push(`${currentResyncCoverage.rootPathspecOrRecopyRequiredRows} dirty entries are outside the A25/A10/A22 pathspec union and require pathspec refresh or root recopy`);
  }
  if (currentResyncCoverage.ownerAuthorizationRequiredRows > 0) {
    expectedReasons.push(`${currentResyncCoverage.ownerAuthorizationRequiredRows} package-only dirty entries need owner-approved package resync authorization`);
  }
  if (checks.highAudit?.passed === false) expectedReasons.push("npm audit --audit-level=high failed");
  if (checks.releaseHelperTests?.passed === false) expectedReasons.push("release helper tests failed");
  if (checks.typeCheck?.passed === false) expectedReasons.push("npm run type-check failed");
  if (!sameJson(readiness.blockingReasons, expectedReasons)) failures.push("readiness blocking reasons are stale");
  if (readiness.commitReady !== (expectedReasons.length === 0)) failures.push("readiness commitReady is stale");

  const markdown = readText(paths.readinessMarkdown);
  if (markdown.includes("undefined")) failures.push("readiness markdown contains undefined");
  if (!markdown.includes("readiness evidence only")) failures.push("readiness markdown missing non-authorization boundary");
  if (!markdown.includes("These recommendations are non-executable")) {
    failures.push("readiness markdown missing package-resync non-executable boundary");
  }

  finish({
    checkedAt: new Date().toISOString(),
    dirtyMapStatusSignature: dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMap.statusCounts.expandedStatusEntries,
    commitReady: readiness.commitReady,
    statusEntries: currentCoverage.statusEntries,
    uncoveredEntries: currentCoverage.uncoveredEntries,
    packageOnlyResyncRows: currentResyncCoverage.ownerAuthorizationRequiredRows,
    truePathspecUncoveredRows: currentResyncCoverage.rootPathspecOrRecopyRequiredRows,
    highAuditPassed: checks.highAudit?.passed ?? false,
    releaseHelperTestsPassed: checks.releaseHelperTests?.passed ?? false,
    typeCheckPassed: checks.typeCheck?.passed ?? false,
    typeCheckErrors: readiness.typeCheck?.summary?.errorLines ?? null,
    failures
  });
}

function finish(payload) {
  fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`);
  if (json) {
    console.log(JSON.stringify(payload, null, 2));
  } else {
    console.log("A25 Wave 01 governance readiness gate");
    console.log(`Commit ready: ${payload.commitReady ? "yes" : "no"}`);
    console.log(`Failures: ${payload.failures.length}`);
  }
  if (payload.failures.length > 0) {
    console.error("A25 Wave 01 governance readiness gate failed.");
    for (const failure of payload.failures) console.error(`- ${failure}`);
    process.exit(1);
  }
}

main();
