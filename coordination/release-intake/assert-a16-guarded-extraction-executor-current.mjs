#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  A16_GUARDED_EXTRACTION_EXECUTOR_PATHS,
  buildA16GuardedExtractionExecutorState,
  stableA16GuardedExtractionExecutorProjection
} from "./run-a16-guarded-extraction.mjs";

const root = git(["rev-parse", "--show-toplevel"]);
const outputPath = path.join(root, "coordination", "release-intake", "latest-A25-a16-guarded-extraction-executor-current-gate.json");
const json = process.argv.includes("--json");

const expectedCommands = [
  "git add --pathspec-from-file=coordination/release-intake/latest-A25-effective-owner-a16-research-and-learning-science.pathspec",
  "git commit -m \"Add A16 research evidence package\""
];

function git(args, cwd = process.cwd()) {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    maxBuffer: 128 * 1024 * 1024,
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

function sameJson(left, right) {
  return JSON.stringify(left ?? null) === JSON.stringify(right ?? null);
}

function main() {
  const failures = [];
  for (const requiredPath of [
    A16_GUARDED_EXTRACTION_EXECUTOR_PATHS.dirtyMap,
    A16_GUARDED_EXTRACTION_EXECUTOR_PATHS.plan,
    A16_GUARDED_EXTRACTION_EXECUTOR_PATHS.planGate,
    A16_GUARDED_EXTRACTION_EXECUTOR_PATHS.ownerInput,
    A16_GUARDED_EXTRACTION_EXECUTOR_PATHS.ownerInputGate,
    A16_GUARDED_EXTRACTION_EXECUTOR_PATHS.preExecutionReport,
    A16_GUARDED_EXTRACTION_EXECUTOR_PATHS.pathspec,
    A16_GUARDED_EXTRACTION_EXECUTOR_PATHS.latestDryRunJson,
    A16_GUARDED_EXTRACTION_EXECUTOR_PATHS.latestDryRunMarkdown
  ]) {
    if (!exists(requiredPath)) failures.push(`missing required file: ${requiredPath}`);
  }
  if (failures.length > 0) return finish({ failures });

  const dirtyMap = readJson(A16_GUARDED_EXTRACTION_EXECUTOR_PATHS.dirtyMap);
  const recorded = readJson(A16_GUARDED_EXTRACTION_EXECUTOR_PATHS.latestDryRunJson);
  const current = buildA16GuardedExtractionExecutorState({ mode: "dry-run" });
  const expectedSignature = dirtyMap.statusSignature;
  const expectedEntries = dirtyMap.statusCounts?.expandedStatusEntries ?? null;

  if (!sameJson(
    stableA16GuardedExtractionExecutorProjection(recorded),
    stableA16GuardedExtractionExecutorProjection(current)
  )) {
    failures.push("A16 guarded extraction executor dry-run evidence is stale");
  }
  if (recorded.mode !== "dry-run") failures.push("executor current gate only accepts dry-run evidence");
  if (recorded.dirtyMapStatusSignature !== expectedSignature) failures.push("executor dirty-map signature is stale");
  if (recorded.expandedStatusEntries !== expectedEntries) failures.push("executor expanded dirty entry count is stale");
  if ((recorded.sourceCurrentnessFailures ?? []).length !== 0) failures.push("executor has source currentness failures");
  if (![
    "dry-run-blocked-missing-owner-execution-instruction",
    "dry-run-ready-requires-explicit-apply",
    "already-extracted-and-verified"
  ].includes(recorded.executorStatus)) {
    failures.push(`unexpected executorStatus: ${recorded.executorStatus}`);
  }

  const summary = recorded.summary ?? {};
  if ((summary.packageFileRows ?? 0) !== 6) failures.push("packageFileRows must be 6");
  if ((summary.pathspecRows ?? 0) !== 6) failures.push("pathspecRows must be 6");
  if ((summary.stagedRows ?? -1) !== 0) failures.push("stagedRows must be 0");
  if ((summary.packageStagedRows ?? -1) !== 0) failures.push("packageStagedRows must be 0");
  if ((summary.guardedCommandRows ?? 0) !== 2) failures.push("guardedCommandRows must be 2");
  if ((summary.failedPreflightChecks ?? -1) !== 0) failures.push("failedPreflightChecks must be 0");
  if ((summary.passingPreflightChecks ?? 0) !== (summary.preflightChecks ?? -1)) failures.push("all executor preflight checks must pass");
  if (summary.applyRequested !== false) failures.push("dry-run summary.applyRequested must be false");
  if (summary.mutationsPerformed !== false) failures.push("dry-run summary.mutationsPerformed must be false");
  if ((summary.cleanupAuthorizedRows ?? -1) !== 0) failures.push("cleanupAuthorizedRows must be 0");
  if ((summary.executableRows ?? -1) !== 0) failures.push("executableRows must be 0");

  if (recorded.executorStatus === "dry-run-blocked-missing-owner-execution-instruction") {
    if ((summary.ownerInstructionRows ?? -1) !== 0) failures.push("blocked dry-run must have 0 owner instruction rows");
    if ((summary.validOwnerInstructionRows ?? -1) !== 0) failures.push("blocked dry-run must have 0 valid owner instruction rows");
    if ((summary.packageDirtyRows ?? -1) !== 6) failures.push("blocked dry-run must still have 6 package dirty rows");
    if (summary.applyPermitted !== false) failures.push("blocked dry-run must not permit apply");
  }
  if (recorded.executorStatus === "dry-run-ready-requires-explicit-apply") {
    if ((summary.ownerInstructionRows ?? -1) !== 1) failures.push("ready dry-run must have 1 owner instruction row");
    if ((summary.validOwnerInstructionRows ?? -1) !== 1) failures.push("ready dry-run must have 1 valid owner instruction row");
    if ((summary.packageDirtyRows ?? -1) !== 6) failures.push("ready dry-run must still have 6 package dirty rows before extraction");
    if (summary.applyPermitted !== false) failures.push("dry-run must not permit apply without explicit --apply mode");
  }
  if (recorded.executorStatus === "already-extracted-and-verified") {
    if ((summary.packageDirtyRows ?? -1) !== 0) failures.push("verified state must have 0 package dirty rows");
    if (summary.applyPermitted !== false) failures.push("verified state must not permit apply");
  }

  const commands = recorded.guardedCommandSequence ?? [];
  for (const [index, expectedCommand] of expectedCommands.entries()) {
    if (commands[index] !== expectedCommand) failures.push(`guarded command ${index + 1} does not match expected exact command`);
  }
  for (const filePath of recorded.packageFiles ?? []) {
    if (!filePath.startsWith("coordination/research/")) failures.push(`${filePath}: package file must stay under coordination/research/`);
  }
  for (const check of recorded.preflightChecks ?? []) {
    if (check.status !== "pass") failures.push(`executor preflight check failed: ${check.id}`);
  }

  const boundary = recorded.boundary ?? {};
  if (boundary.evidenceOnly !== true) failures.push("boundary.evidenceOnly must be true for dry-run");
  if (boundary.dryRunOnly !== true) failures.push("boundary.dryRunOnly must be true for dry-run");
  if (boundary.applyModeRequested !== false) failures.push("boundary.applyModeRequested must be false for dry-run");
  if (boundary.recordsOwnerApproval !== false) failures.push("boundary.recordsOwnerApproval must be false");
  if (boundary.recordsExecutionInstruction !== false) failures.push("boundary.recordsExecutionInstruction must be false");
  if (boundary.broadStagingAuthorized !== false) failures.push("boundary.broadStagingAuthorized must be false");
  if (boundary.stageAuthorizedByExecutor !== false) failures.push("boundary.stageAuthorizedByExecutor must be false in dry-run");
  if (boundary.commitAuthorizedByExecutor !== false) failures.push("boundary.commitAuthorizedByExecutor must be false in dry-run");
  if (boundary.mergeAuthorized !== false) failures.push("boundary.mergeAuthorized must be false");
  if (boundary.cleanupAuthorized !== false) failures.push("boundary.cleanupAuthorized must be false");
  if (boundary.destructiveGitAuthorized !== false) failures.push("boundary.destructiveGitAuthorized must be false");
  if (boundary.deployAuthorized !== false) failures.push("boundary.deployAuthorized must be false");
  if (boundary.requiresExplicitApplyFlag !== true) failures.push("boundary.requiresExplicitApplyFlag must be true");

  const markdown = readText(A16_GUARDED_EXTRACTION_EXECUTOR_PATHS.latestDryRunMarkdown);
  for (const needle of [
    "A25 A16 Guarded Extraction Executor Dry Run",
    "fail-closed",
    "Dry-run mode writes evidence only",
    "Guarded Command Sequence",
    "Apply requested: false",
    "Mutations performed: false",
    "Broad staging authorized: false",
    "Deploy authorized: false"
  ]) {
    if (!markdown.includes(needle)) failures.push(`executor markdown missing text: ${needle}`);
  }
  if (markdown.includes("undefined")) failures.push("executor markdown contains undefined");

  finish({
    checkedAt: new Date().toISOString(),
    root,
    dirtyMapStatusSignature: recorded.dirtyMapStatusSignature,
    expandedStatusEntries: recorded.expandedStatusEntries,
    mode: recorded.mode,
    executorStatus: recorded.executorStatus,
    packageFileRows: summary.packageFileRows ?? 0,
    pathspecRows: summary.pathspecRows ?? 0,
    packageDirtyRows: summary.packageDirtyRows ?? 0,
    stagedRows: summary.stagedRows ?? 0,
    ownerInstructionRows: summary.ownerInstructionRows ?? 0,
    validOwnerInstructionRows: summary.validOwnerInstructionRows ?? 0,
    applyPermitted: summary.applyPermitted === true,
    mutationsPerformed: summary.mutationsPerformed === true,
    passingPreflightChecks: summary.passingPreflightChecks ?? 0,
    preflightChecks: summary.preflightChecks ?? 0,
    cleanupAuthorizedRows: summary.cleanupAuthorizedRows ?? 0,
    executableRows: summary.executableRows ?? 0,
    failures
  });
}

function finish(payload) {
  fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`);
  if (json) {
    console.log(JSON.stringify(payload, null, 2));
  } else {
    console.log("A25 A16 guarded extraction executor gate");
    console.log(`Executor status: ${payload.executorStatus ?? "unknown"}`);
    console.log(`Apply permitted: ${payload.applyPermitted === true ? "yes" : "no"}`);
    console.log(`Failures: ${payload.failures.length}`);
  }
  if (payload.failures.length > 0) {
    console.error("A25 A16 guarded extraction executor gate failed.");
    for (const failure of payload.failures) console.error(`- ${failure}`);
    process.exit(1);
  }
}

main();
