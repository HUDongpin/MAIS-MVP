#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const root = git(["rev-parse", "--show-toplevel"], process.cwd());
const outputPath = path.join(root, "coordination", "release-intake", "latest-A25-wave02-shared-contract-readiness-current-gate.json");
const json = process.argv.includes("--json");

const paths = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  executionSequence: "coordination/release-intake/latest-A25-dirty-worktree-closure-execution-sequence.json",
  readiness: "coordination/release-intake/latest-A25-wave02-shared-contract-readiness.json",
  readinessMarkdown: "coordination/release-intake/latest-A25-wave02-shared-contract-readiness.md",
  a08Pathspec: "coordination/release-intake/latest-A25-owner-a08-state-and-analytics-lead.pathspec",
  a12Pathspec: "coordination/release-intake/latest-A25-owner-a12-backend-api-platform.pathspec"
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
  const files = [paths.a08Pathspec, paths.a12Pathspec];
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

function sameJson(left, right) {
  return JSON.stringify(left ?? null) === JSON.stringify(right ?? null);
}

function wave02(sequence) {
  return (sequence.waves ?? []).find((wave) => wave.waveId === "wave-02-shared-contracts");
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
  const sequenceWave = wave02(sequence);
  const pathspec = pathspecInfo();
  const entries = statusEntries(readiness.worktree?.path);
  const currentCoverage = coverage(entries, pathspec.allowedPaths);
  const currentStatusSignature = sha256(entries.slice().sort().join("\0"));

  if (!sequenceWave) failures.push("Wave 02 is missing from the closure execution sequence");
  if (readiness.dirtyMapStatusSignature !== dirtyMap.statusSignature) failures.push("readiness dirty-map signature is stale");
  if (readiness.expandedStatusEntries !== dirtyMap.statusCounts.expandedStatusEntries) {
    failures.push("readiness expanded dirty entry count is stale");
  }
  if (readiness.executionSequenceGeneratedAt !== sequence.generatedAt) failures.push("readiness sequence timestamp is stale");
  if (readiness.wave?.waveId !== "wave-02-shared-contracts") failures.push("readiness wave id is stale");
  if (sequenceWave && !sameJson(readiness.wave?.ownerApprovals, sequenceWave.ownerApprovals.map((row) => row.approvalId))) {
    failures.push("readiness owner approval list is stale");
  }
  if (sequenceWave && !sameJson(readiness.wave?.physicalLifecycleApprovals, sequenceWave.physicalLifecycleApprovals.map((row) => row.approvalId))) {
    failures.push("readiness physical lifecycle approval list is stale");
  }
  if (readiness.worktree?.branch !== git(["branch", "--show-current"], readiness.worktree.path)) failures.push("readiness worktree branch is stale");
  if (readiness.worktree?.head !== git(["rev-parse", "--short", "HEAD"], readiness.worktree.path)) failures.push("readiness worktree head is stale");
  if (readiness.worktree?.statusSignature !== currentStatusSignature) failures.push("readiness worktree status signature is stale");
  if (readiness.worktree?.nodeModulesPresent !== fs.existsSync(path.join(readiness.worktree.path, "node_modules"))) {
    failures.push("readiness node_modules presence is stale");
  }
  if (readiness.pathspecs?.checksum !== pathspec.checksum) failures.push("readiness pathspec checksum is stale");
  if (readiness.pathspecs?.allowedPaths !== pathspec.allowedPaths.size) failures.push("readiness pathspec allowed path count is stale");
  if (!sameJson(readiness.pathspecCoverage, currentCoverage)) failures.push("readiness pathspec coverage is stale");
  if (readiness.cleanupAuthorized !== false) failures.push("readiness cleanupAuthorized must be false");
  if (readiness.executableNow !== false) failures.push("readiness executableNow must be false");

  const checks = readiness.checks ?? {};
  for (const name of ["testAnalytics", "testBackend", "typeCheck", "build"]) {
    if (!checks[name]) failures.push(`missing readiness check: ${name}`);
    if (typeof checks[name]?.passed !== "boolean") failures.push(`${name}: passed must be boolean`);
    if (typeof checks[name]?.status !== "number") failures.push(`${name}: status must be numeric`);
  }
  if (readiness.typeCheck?.passed !== checks.typeCheck?.passed) failures.push("typeCheck passed mirror is stale");
  if (readiness.typeCheck?.status !== checks.typeCheck?.status) failures.push("typeCheck status mirror is stale");
  if (typeof readiness.typeCheck?.summary?.errorLines !== "number") failures.push("typeCheck summary errorLines must be numeric");

  const expectedReasons = [];
  if (currentCoverage.uncoveredEntries > 0) expectedReasons.push(`${currentCoverage.uncoveredEntries} dirty entries are outside the A08/A12 pathspec union`);
  for (const name of ["testAnalytics", "testBackend", "typeCheck", "build"]) {
    if (checks[name]?.passed === false) expectedReasons.push(`${name} failed`);
  }
  if (!sameJson(readiness.blockingReasons, expectedReasons)) failures.push("readiness blocking reasons are stale");
  if (readiness.commitReady !== (expectedReasons.length === 0)) failures.push("readiness commitReady is stale");

  const markdown = readText(paths.readinessMarkdown);
  if (markdown.includes("undefined")) failures.push("readiness markdown contains undefined");
  if (!markdown.includes("readiness evidence only")) failures.push("readiness markdown missing non-authorization boundary");

  finish({
    checkedAt: new Date().toISOString(),
    dirtyMapStatusSignature: dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMap.statusCounts.expandedStatusEntries,
    commitReady: readiness.commitReady,
    statusEntries: currentCoverage.statusEntries,
    coveredEntries: currentCoverage.coveredEntries,
    uncoveredEntries: currentCoverage.uncoveredEntries,
    testAnalyticsPassed: checks.testAnalytics?.passed ?? false,
    testBackendPassed: checks.testBackend?.passed ?? false,
    typeCheckPassed: checks.typeCheck?.passed ?? false,
    buildPassed: checks.build?.passed ?? false,
    typeCheckErrors: readiness.typeCheck?.summary?.errorLines ?? null,
    failures
  });
}

function finish(payload) {
  fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`);
  if (json) {
    console.log(JSON.stringify(payload, null, 2));
  } else {
    console.log("A25 Wave 02 shared contract readiness gate");
    console.log(`Commit ready: ${payload.commitReady ? "yes" : "no"}`);
    console.log(`Failures: ${payload.failures.length}`);
  }
  if (payload.failures.length > 0) {
    console.error("A25 Wave 02 shared contract readiness gate failed.");
    for (const failure of payload.failures) console.error(`- ${failure}`);
    process.exit(1);
  }
}

main();
